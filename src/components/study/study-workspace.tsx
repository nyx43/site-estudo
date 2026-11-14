"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Lock, Play, Terminal } from "lucide-react";
import { lessonSteps, type Answer } from "@/lib/study/schema";
import { canCompleteStep } from "@/lib/study/progress";
import { attemptStatusLabels, layerLabels, scopeLabels } from "@/lib/study/labels";
import type { AttemptView, LessonView, ProgressChange } from "@/lib/study/service";
import type { PublicExercise } from "@/lib/study/public";
import { studyRequest } from "@/lib/study/client";
import { toStableTtsId } from "@/lib/study/tts";
import { LessonContent } from "./lesson-content";
import { QuestionCard } from "./question-card";
import { ExercisePanel } from "./exercise-panel";
import { TtsBlock } from "./tts-block";
import { TtsProvider } from "./tts-provider";
import { TtsToolbar } from "./tts-toolbar";

const stepLabels = [
  "Antes de começar",
  "Por que existe",
  "Modelo mental",
  "O conceito",
  "Exemplo resolvido",
  "Equívocos comuns",
  "Usos reais",
  "Uma forma melhor",
  "Resumo e conexões",
  "Explique e recupere",
];
type ExerciseState = { exercise: PublicExercise; attempt: AttemptView | null };

export function StudyWorkspace({
  initial,
  hasLab = false,
  initialExerciseId,
  initialPractice,
}: {
  initial: LessonView;
  hasLab?: boolean;
  initialExerciseId?: string;
  initialPractice?: boolean;
}) {
  const [view, setView] = useState(initial);
  const firstPending = Math.max(0, lessonSteps.findIndex((step) => !view.progress.completedSteps.includes(step)));
  const [stepIndex, setStepIndex] = useState(firstPending);
  const [practice, setPractice] = useState(initialPractice ?? Boolean(initial.progress.completedAt));
  const [selected, setSelected] = useState<ExerciseState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ stepIndex, practice });
  const pendingSubmission = useRef<{ key: string; requestId: string } | null>(null);
  const selectionRequestRef = useRef(0);
  const selectionControllerRef = useRef<AbortController | null>(null);
  const { lesson, progress } = view;
  const step = lessonSteps[stepIndex];

  function beginSelection() {
    selectionControllerRef.current?.abort();
    const controller = new AbortController();
    selectionControllerRef.current = controller;
    const requestSeq = ++selectionRequestRef.current;
    return { controller, requestSeq };
  }

  function updateAttemptIfCurrent(exerciseId: string, attemptId: string | null, nextAttempt: AttemptView) {
    setSelected((current) => {
      if (!current || current.exercise.id !== exerciseId) return current;
      if (attemptId !== null && current.attempt?.id !== attemptId) return current;
      return { ...current, attempt: nextAttempt };
    });
  }

  useEffect(() => {
    if (!initialExerciseId) return;
    const { controller, requestSeq } = beginSelection();
    void (async () => {
      try {
        const data = await studyRequest<ExerciseState>(`/api/exercises/${initialExerciseId}`, undefined, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted && selectionRequestRef.current === requestSeq) {
          pendingSubmission.current = null;
          setSelected(data);
        }
      } catch (err) {
        if (!controller.signal.aborted && selectionRequestRef.current === requestSeq) {
          setError(err instanceof Error ? err.message : "Não foi possível carregar o exercício.");
        }
      }
    })();
    return () => {
      controller.abort();
      if (selectionControllerRef.current === controller) selectionControllerRef.current = null;
    };
  }, [initialExerciseId]);

  useEffect(() => {
    if (lastPosition.current.stepIndex === stepIndex && lastPosition.current.practice === practice) return;
    lastPosition.current = { stepIndex, practice };
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [stepIndex, practice]);

  async function run(operation: () => Promise<void>) {
    setBusy(true);
    setError("");
    try {
      await operation();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível salvar. Tente novamente.");
    } finally {
      setBusy(false);
    }
  }

  async function update(change: ProgressChange) {
    const result = await studyRequest<Pick<LessonView, "lesson" | "progress">>(`/api/lessons/${lesson.id}/progress`, change);
    if (result.progress.completedAt && !view.progress.completedAt) {
      await refresh();
    } else {
      setView((current) => ({ ...current, ...result }));
    }
    return result;
  }

  async function refresh() {
    setView(await studyRequest<LessonView>(`/api/lessons/${lesson.topicId}?version=${lesson.version}`));
  }

  async function selectExercise(id: string) {
    const { controller, requestSeq } = beginSelection();
    await run(async () => {
      try {
        const data = await studyRequest<ExerciseState>(`/api/exercises/${id}`, undefined, {
          signal: controller.signal,
        });
        if (controller.signal.aborted || selectionRequestRef.current !== requestSeq) return;
        const target = view.exercises.find((item) => item.id === id);
        if (!data.attempt && progress.completedAt && target?.accessible !== false) {
          data.attempt = await studyRequest<AttemptView>("/api/attempts", { exerciseId: id });
          if (controller.signal.aborted || selectionRequestRef.current !== requestSeq) return;
          await refresh();
          if (controller.signal.aborted || selectionRequestRef.current !== requestSeq) return;
        }
        pendingSubmission.current = null;
        setSelected(data);
      } catch (err) {
        if (controller.signal.aborted) return;
        throw err;
      }
    });
  }

  async function startAttempt(exerciseId: string) {
    await run(async () => {
      const created = await studyRequest<AttemptView>("/api/attempts", { exerciseId });
      pendingSubmission.current = null;
      updateAttemptIfCurrent(exerciseId, null, created);
      await refresh();
    });
  }

  async function revealHint(hintNumber: number) {
    if (!selected?.attempt) return;
    const targetExerciseId = selected.exercise.id;
    const attemptId = selected.attempt.id;
    await run(async () => {
      const result = await studyRequest<AttemptView>(`/api/attempts/${attemptId}/hints`, { hintNumber });
      updateAttemptIfCurrent(targetExerciseId, attemptId, result);
    });
  }

  async function saveSelfAssessment(checkedCriterionIds: string[]) {
    if (!selected?.attempt) return;
    const targetExerciseId = selected.exercise.id;
    const attemptId = selected.attempt.id;
    await run(async () => {
      const result = await studyRequest<AttemptView>(
        `/api/attempts/${attemptId}/self-assessment`,
        { checkedCriterionIds },
        { method: "PUT" },
      );
      updateAttemptIfCurrent(targetExerciseId, attemptId, result);
      await refresh();
    });
  }

  async function submit(answer: Answer) {
    if (!selected?.attempt) return;
    const targetExerciseId = selected.exercise.id;
    const attemptId = selected.attempt.id;
    const key = JSON.stringify({ attemptId, answer });
    if (pendingSubmission.current?.key !== key) pendingSubmission.current = { key, requestId: crypto.randomUUID() };
    const requestId = pendingSubmission.current.requestId;
    await run(async () => {
      const result = await studyRequest<AttemptView>(`/api/attempts/${attemptId}/submissions`, { requestId, answer });
      pendingSubmission.current = null;
      updateAttemptIfCurrent(targetExerciseId, attemptId, result);
      await refresh();
    });
  }

  async function giveUp() {
    if (!selected?.attempt) return;
    const targetExerciseId = selected.exercise.id;
    const attemptId = selected.attempt.id;
    await run(async () => {
      const result = await studyRequest<AttemptView>(`/api/attempts/${attemptId}/give-up`, {});
      updateAttemptIfCurrent(targetExerciseId, attemptId, result);
      await refresh();
    });
  }

  async function restart() {
    if (!selected) return;
    const exerciseId = selected.exercise.id;
    await run(async () => {
      const result = await studyRequest<AttemptView>("/api/attempts", { exerciseId });
      pendingSubmission.current = null;
      updateAttemptIfCurrent(exerciseId, null, result);
      await refresh();
    });
  }

  const completedExercises = view.exercises.filter((exercise) => exercise.isCorrect).length;
  const completedPracticeExercises = view.exercises.filter(
    (exercise) => exercise.isCorrect || (exercise.type === "OPEN_RESPONSE" && exercise.status === "SELF_ASSESSED"),
  ).length;
  const openReviewedExercises = view.exercises.filter(
    (exercise) => exercise.status === "SUBMITTED_FOR_REVIEW" || exercise.status === "SELF_ASSESSED",
  ).length;
  const hasDirectPractice = view.exercises.some((exercise) => exercise.allowDirectPractice);
  const selectedMeta = selected ? view.exercises.find((item) => item.id === selected.exercise.id) : undefined;
  const ttsScopeKey = `${lesson.id}:${practice ? `practice:${selected?.exercise.id ?? "none"}` : step}`;

  return (
    <div className="study-layout">
      <aside className="study-outline">
        <span className="eyebrow">SEU PERCURSO</span>
        <h2>{practice ? "Hora de praticar" : "Entenda primeiro"}</h2>
        <p>
          {progress.completedSteps.length} de {lessonSteps.length} partes concluídas
        </p>
        <div className="study-progress-track">
          <span style={{ width: `${(progress.completedSteps.length / lessonSteps.length) * 100}%` }} />
        </div>
        <ol>
          {stepLabels.map((label, index) => (
            <li key={label}>
              <button
                disabled={busy || (!progress.completedAt && index > firstPending)}
                className={!practice && stepIndex === index ? "current-step" : ""}
                aria-current={!practice && stepIndex === index ? "step" : undefined}
                onClick={() => {
                  setPractice(false);
                  setStepIndex(index);
                  setError("");
                }}
              >
                <span>
                  {progress.completedSteps.includes(lessonSteps[index]) ? (
                    <Check size={13} />
                  ) : (
                    String(index + 1).padStart(2, "0")
                  )}
                </span>
                {label}
              </button>
            </li>
          ))}
        </ol>
        <button
          className={`practice-tab ${practice ? "selected" : ""}`}
          disabled={busy || (!progress.completedAt && !hasDirectPractice)}
          onClick={() => setPractice(true)}
        >
          Prática{" "}
          <span>
            {completedExercises}/{view.exercises.length}
          </span>
        </button>
        {hasLab && (
          <Link className="lab-outline-link" href={`/laboratorio/${lesson.topicId}`}>
            <Terminal size={14} aria-hidden="true" /> Laboratório Python
          </Link>
        )}
        <small>Progresso salvo neste ambiente.</small>
      </aside>

      <div className="study-main" ref={mainRef} tabIndex={-1} role="region" aria-label="Aula e prática">
        {error && (
          <div className="study-error" role="alert">
            {error}
          </div>
        )}
        <TtsProvider scopeKey={ttsScopeKey}>
          {practice ? (
            <>
              <div className="practice-intro">
                <span className="eyebrow">AGORA É COM VOCÊ</span>
                <h2>Transforme a ideia em raciocínio.</h2>
                <p>Escolha um exercício. Atividades objetivas têm conferência automática; respostas abertas seguem autoavaliação por rubrica.</p>
                <div className="practice-status-row">
                  <span className="status-pill">
                    {completedExercises} de {view.exercises.length} exercícios resolvidos
                  </span>
                  {openReviewedExercises > 0 && (
                    <span className="status-pill">
                      {openReviewedExercises}{" "}
                      {openReviewedExercises === 1 ? "enviada para autoavaliação" : "enviadas para autoavaliação"}
                    </span>
                  )}
                </div>
              </div>
              <div className="exercise-selector" aria-label="Escolher exercício">
                {view.exercises.map((exercise, index) => {
                  const locked = !exercise.accessible;
                  const statusText = locked ? "bloqueado até concluir a aula" : attemptStatusLabels[exercise.status].toLowerCase();
                  return (
                    <button
                      key={exercise.id}
                      disabled={busy || locked}
                      className={`${selected?.exercise.id === exercise.id ? "selected" : ""} ${locked ? "locked" : ""} ${exercise.status === "SUBMITTED_FOR_REVIEW" || exercise.status === "SELF_ASSESSED" ? "open-reviewed" : ""}`.trim()}
                      aria-label={`Exercício ${index + 1}: ${exercise.title}${exercise.layer ? ` (${exercise.layer})` : ""}, ${statusText}`}
                      aria-pressed={selected?.exercise.id === exercise.id}
                      title={locked ? "Conclua todas as etapas desta versão para liberar esta atividade." : exercise.title}
                      onClick={() => void selectExercise(exercise.id)}
                    >
                      {locked ? (
                        <Lock size={14} aria-hidden="true" />
                      ) : exercise.isCorrect || exercise.status === "SELF_ASSESSED" ? (
                        <Check size={15} />
                      ) : (
                        index + 1
                      )}
                    </button>
                  );
                })}
              </div>
              {!progress.completedAt && hasDirectPractice && (
                <div className="practice-access-note" role="note">
                  <p>
                    Atividades <strong>C1</strong> podem ser praticadas diretamente durante a leitura (sem concluir etapas da aula).{" "}
                    <strong>C2, C3 e demais exercícios</strong> são liberados ao concluir o percurso guiado desta versão — sem exigir acerto prévio em C1.
                  </p>
                </div>
              )}
              {selected?.attempt && <TtsToolbar compact />}
              {selected?.attempt ? (
                <ExercisePanel
                  key={`${selected.exercise.id}:${selected.attempt.id}`}
                  exercise={selected.exercise}
                  attempt={selected.attempt}
                  busy={busy}
                  onSubmit={submit}
                  onGiveUp={giveUp}
                  onRestart={restart}
                  onRevealHint={revealHint}
                  onSaveSelfAssessment={saveSelfAssessment}
                />
              ) : selected ? (
                <div className="practice-preview">
                  <div className="exercise-meta-pills">
                    {selected.exercise.layer && <span className="status-pill">{layerLabels[selected.exercise.layer]}</span>}
                    {selected.exercise.scope && <span className="meta-pill">{scopeLabels[selected.exercise.scope]}</span>}
                  </div>
                  <h3>{selected.exercise.title}</h3>
                  {selected.exercise.objective && (
                    <p className="exercise-objective">
                      <strong>Objetivo:</strong> {selected.exercise.objective}
                    </p>
                  )}
                  {selected.exercise.context && (
                    <p className="exercise-context">
                      <strong>Contexto:</strong> {selected.exercise.context}
                    </p>
                  )}
                  {selected.exercise.prerequisites?.length ? (
                    <div className="exercise-prerequisites">
                      <strong>Pré-requisitos recomendados:</strong>
                      <ul>
                        {selected.exercise.prerequisites.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="exercise-prompt">{selected.exercise.prompt}</p>
                  {selectedMeta?.accessible !== false ? (
                    <button
                      type="button"
                      className="button primary"
                      disabled={busy}
                      onClick={() => void startAttempt(selected.exercise.id)}
                    >
                      <Play size={16} aria-hidden="true" /> Iniciar prática
                    </button>
                  ) : (
                    <div className="study-error" role="status">
                      <p>Conclua todas as etapas do estudo guiado desta versão para iniciar esta atividade.</p>
                      <button
                        type="button"
                        className="button secondary"
                        onClick={() => setPractice(false)}
                      >
                        Voltar ao percurso guiado
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="practice-empty">
                  <CheckCircle2 size={29} />
                  <h3>{progress.completedAt ? "A aula está concluída." : "Prática antecipada de C1"}</h3>
                  <p>
                    {progress.completedAt
                      ? `Escolha um dos ${view.exercises.length} exercícios acima para começar a prática.`
                      : "Selecione o exercício C1 disponível acima para visualizar e iniciar a prática."}
                  </p>
                </div>
              )}
              {completedPracticeExercises === view.exercises.length && (
                <div className="all-complete">
                  <CheckCircle2 size={24} />
                  <div>
                    <strong>Você concluiu a prática desta aula.</strong>
                    <p>Uma sessão é um começo. Revisitar depois ajudará a verificar o que ficou.</p>
                  </div>
                </div>
              )}
            </>
          ) : (
            <article className="lesson-reader">
              <div className="reader-topline">
                <span className="eyebrow">
                  PARTE {stepIndex + 1} DE {lessonSteps.length}
                </span>
                <span>{stepLabels[stepIndex]}</span>
              </div>
              <TtsToolbar compact />
              {step === "prequestions" ? (
                <>
                  <TtsBlock
                    id={toStableTtsId(lesson.id, "prequestions", "intro")}
                    label="Objetivos e introdução"
                    text={`O que você já imagina? Antes da explicação, escreva um palpite para cada pergunta. Não há nota: vamos retomar essas ideias no resumo da aula. Objetivos: ${lesson.objectives.join(" ")}`}
                  >
                    <h2>O que você já imagina?</h2>
                    <p>
                      Antes da explicação, escreva um palpite para cada pergunta. Não há nota: vamos retomar essas
                      ideias no resumo da aula.
                    </p>
                    <ul className="learning-objectives">
                      {lesson.objectives.map((objective) => (
                        <li key={objective}>{objective}</li>
                      ))}
                    </ul>
                  </TtsBlock>
                  {lesson.prequestions.map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      savedAnswer={progress.answers[question.id]}
                      busy={busy}
                      ttsPrefix={toStableTtsId(lesson.id, "prequestions")}
                      onSave={(questionId, answer) =>
                        run(async () => {
                          await update({ action: "ANSWER", questionId, answer });
                        })
                      }
                    />
                  ))}
                </>
              ) : step === "reflection" ? (
                <>
                  <TtsBlock
                    id={toStableTtsId(lesson.id, "reflection", "intro")}
                    label="Instruções de reflexão"
                    text="Explique antes de conferir. Escreva com suas palavras. A resposta-modelo aparece depois do seu envio e serve para comparação, não para dar uma nota."
                  >
                    <h2>Explique antes de conferir</h2>
                    <p>
                      Escreva com suas palavras. A resposta-modelo aparece depois do seu envio e serve para comparação,
                      não para dar uma nota.
                    </p>
                  </TtsBlock>
                  {[...lesson.selfExplain, ...lesson.retrieval].map((question) => (
                    <QuestionCard
                      key={question.id}
                      question={question}
                      savedAnswer={progress.answers[question.id]}
                      busy={busy}
                      ttsPrefix={toStableTtsId(lesson.id, "reflection")}
                      onSave={(questionId, answer) =>
                        run(async () => {
                          await update({ action: "ANSWER", questionId, answer });
                        })
                      }
                    />
                  ))}
                </>
              ) : (
                <LessonContent lesson={lesson} step={step} />
              )}
              <div className="reader-navigation">
                <button
                  className="button secondary"
                  disabled={busy || stepIndex === 0}
                  onClick={() => setStepIndex(stepIndex - 1)}
                >
                  <ArrowLeft size={15} /> Anterior
                </button>
                <button
                  className="button primary"
                  disabled={busy || !canCompleteStep(lesson, step, progress.answers)}
                  onClick={() =>
                    void run(async () => {
                      await update({ action: "COMPLETE_STEP", step });
                      if (stepIndex === lessonSteps.length - 1) setPractice(true);
                      else setStepIndex(stepIndex + 1);
                    })
                  }
                >
                  {busy
                    ? "Salvando…"
                    : stepIndex === lessonSteps.length - 1
                      ? "Concluir aula e praticar"
                      : "Concluir parte e continuar"}
                  <ArrowRight size={15} />
                </button>
              </div>
            </article>
          )}
        </TtsProvider>
      </div>
    </div>
  );
}
