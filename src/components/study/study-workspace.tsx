"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Check, CheckCircle2 } from "lucide-react";
import { lessonSteps, type Answer } from "@/lib/study/schema";
import { canCompleteStep } from "@/lib/study/progress";
import type { AttemptView, LessonView, ProgressChange } from "@/lib/study/service";
import type { PublicExercise } from "@/lib/study/public";
import { studyRequest } from "@/lib/study/client";
import { LessonContent } from "./lesson-content";
import { QuestionCard } from "./question-card";
import { ExercisePanel } from "./exercise-panel";

const stepLabels = ["Antes de começar", "Por que existe", "Modelo mental", "O conceito", "Exemplo resolvido", "Equívocos comuns", "Usos reais", "Uma forma melhor", "Resumo e conexões", "Explique e recupere"];
type ExerciseState = { exercise: PublicExercise; attempt: AttemptView | null };

export function StudyWorkspace({ initial }: { initial: LessonView }) {
  const [view, setView] = useState(initial);
  const firstPending = Math.max(0, lessonSteps.findIndex((step) => !view.progress.completedSteps.includes(step)));
  const [stepIndex, setStepIndex] = useState(firstPending);
  const [practice, setPractice] = useState(Boolean(initial.progress.completedAt));
  const [selected, setSelected] = useState<ExerciseState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mainRef = useRef<HTMLDivElement>(null);
  const lastPosition = useRef({ stepIndex, practice });
  const pendingSubmission = useRef<{ key: string; requestId: string } | null>(null);
  const { lesson, progress } = view;
  const step = lessonSteps[stepIndex];

  useEffect(() => {
    if (lastPosition.current.stepIndex === stepIndex && lastPosition.current.practice === practice) return;
    lastPosition.current = { stepIndex, practice };
    mainRef.current?.focus({ preventScroll: true });
    mainRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [stepIndex, practice]);

  async function run(operation: () => Promise<void>) {
    setBusy(true); setError("");
    try { await operation(); } catch (error) { setError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
    finally { setBusy(false); }
  }
  async function update(change: ProgressChange) {
    const result = await studyRequest<Pick<LessonView, "lesson" | "progress">>(`/api/lessons/${lesson.id}/progress`, change);
    setView((current) => ({ ...current, ...result }));
    return result;
  }
  async function refresh() { setView(await studyRequest<LessonView>(`/api/lessons/${lesson.topicId}?version=${lesson.version}`)); }
  async function selectExercise(id: string) {
    await run(async () => {
      const data = await studyRequest<ExerciseState>(`/api/exercises/${id}`);
      if (!data.attempt) data.attempt = await studyRequest<AttemptView>("/api/attempts", { exerciseId: id });
      pendingSubmission.current = null;
      setSelected(data);
    });
  }
  async function submit(answer: Answer) {
    if (!selected?.attempt) return;
    const attemptId = selected.attempt.id;
    const key = JSON.stringify({ attemptId, answer });
    if (pendingSubmission.current?.key !== key) pendingSubmission.current = { key, requestId: crypto.randomUUID() };
    const requestId = pendingSubmission.current.requestId;
    await run(async () => {
      const result = await studyRequest<AttemptView>(`/api/attempts/${attemptId}/submissions`, { requestId, answer });
      pendingSubmission.current = null;
      setSelected((current) => current ? { ...current, attempt: result } : null);
      await refresh();
    });
  }
  async function giveUp() {
    if (!selected?.attempt) return;
    const attemptId = selected.attempt.id;
    await run(async () => { const result = await studyRequest<AttemptView>(`/api/attempts/${attemptId}/give-up`, {}); setSelected((current) => current ? { ...current, attempt: result } : null); await refresh(); });
  }
  async function restart() {
    if (!selected) return;
    const exerciseId = selected.exercise.id;
    await run(async () => { const result = await studyRequest<AttemptView>("/api/attempts", { exerciseId }); setSelected((current) => current ? { ...current, attempt: result } : null); });
  }
  const completedExercises = view.exercises.filter((exercise) => exercise.isCorrect).length;
  return <div className="study-layout"><aside className="study-outline"><span className="eyebrow">SEU PERCURSO</span><h2>{practice ? "Hora de praticar" : "Entenda primeiro"}</h2><p>{progress.completedSteps.length} de {lessonSteps.length} partes concluídas</p><div className="study-progress-track"><span style={{ width: `${progress.completedSteps.length / lessonSteps.length * 100}%` }} /></div><ol>{stepLabels.map((label, index) => <li key={label}><button disabled={busy || (!progress.completedAt && index > firstPending)} className={!practice && stepIndex === index ? "current-step" : ""} aria-current={!practice && stepIndex === index ? "step" : undefined} onClick={() => { setPractice(false); setStepIndex(index); setError(""); }}><span>{progress.completedSteps.includes(lessonSteps[index]) ? <Check size={13} /> : String(index + 1).padStart(2, "0")}</span>{label}</button></li>)}</ol><button className={`practice-tab ${practice ? "selected" : ""}`} disabled={!progress.completedAt || busy} onClick={() => setPractice(true)}>Prática <span>{completedExercises}/{view.exercises.length}</span></button><small>Progresso salvo neste ambiente.</small></aside>
    <div className="study-main" ref={mainRef} tabIndex={-1} role="region" aria-label="Aula e prática">{error && <div className="study-error" role="alert">{error}</div>}
      {practice ? <><div className="practice-intro"><span className="eyebrow">AGORA É COM VOCÊ</span><h2>Transforme a ideia em raciocínio.</h2><p>Escolha um exercício. As respostas são conferidas por regras objetivas, sem executar o seu código.</p><span className="status-pill">{completedExercises} de {view.exercises.length} exercícios resolvidos</span></div><div className="exercise-selector" aria-label="Escolher exercício">{view.exercises.map((exercise, index) => <button key={exercise.id} disabled={busy} className={selected?.exercise.id === exercise.id ? "selected" : ""} aria-label={`Exercício ${index + 1}: ${exercise.title}${exercise.isCorrect ? ", resolvido" : ""}`} aria-pressed={selected?.exercise.id === exercise.id} onClick={() => void selectExercise(exercise.id)}>{exercise.isCorrect ? <Check size={15} /> : index + 1}</button>)}</div>{selected?.attempt ? <ExercisePanel key={`${selected.exercise.id}:${selected.attempt.id}`} exercise={selected.exercise} attempt={selected.attempt} busy={busy} onSubmit={submit} onGiveUp={giveUp} onRestart={restart} /> : <div className="practice-empty"><CheckCircle2 size={29} /><h3>A aula está concluída.</h3><p>Escolha um dos {view.exercises.length} exercícios acima para começar a prática.</p></div>}{completedExercises === view.exercises.length && <div className="all-complete"><CheckCircle2 size={24} /><div><strong>Você concluiu a prática desta aula.</strong><p>Uma sessão é um começo. Revisitar depois ajudará a verificar o que ficou.</p></div></div>}</> : <article className="lesson-reader"><div className="reader-topline"><span className="eyebrow">PARTE {stepIndex + 1} DE {lessonSteps.length}</span><span>{stepLabels[stepIndex]}</span></div>
        {step === "prequestions" ? <><h2>O que você já imagina?</h2><p>Antes da explicação, escreva um palpite para cada pergunta. Não há nota: vamos retomar essas ideias no resumo da aula.</p><ul className="learning-objectives">{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul>{lesson.prequestions.map((question) => <QuestionCard key={question.id} question={question} savedAnswer={progress.answers[question.id]} busy={busy} onSave={(questionId, answer) => run(async () => { await update({ action: "ANSWER", questionId, answer }); })} />)}</> : step === "reflection" ? <><h2>Explique antes de conferir</h2><p>Escreva com suas palavras. A resposta-modelo aparece depois do seu envio e serve para comparação, não para dar uma nota.</p>{[...lesson.selfExplain, ...lesson.retrieval].map((question) => <QuestionCard key={question.id} question={question} savedAnswer={progress.answers[question.id]} busy={busy} onSave={(questionId, answer) => run(async () => { await update({ action: "ANSWER", questionId, answer }); })} />)}</> : <LessonContent lesson={lesson} step={step} />}
        <div className="reader-navigation"><button className="button secondary" disabled={busy || stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}><ArrowLeft size={15} /> Anterior</button><button className="button primary" disabled={busy || !canCompleteStep(lesson, step, progress.answers)} onClick={() => void run(async () => { await update({ action: "COMPLETE_STEP", step }); if (stepIndex === lessonSteps.length - 1) setPractice(true); else setStepIndex(stepIndex + 1); })}>{busy ? "Salvando…" : stepIndex === lessonSteps.length - 1 ? "Concluir aula e praticar" : "Concluir parte e continuar"}<ArrowRight size={15} /></button></div>
      </article>}
    </div>
  </div>;
}
