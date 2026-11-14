"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowRight, ArrowUp, Check, HelpCircle, Plus, X } from "lucide-react";
import { attemptStatusLabels, layerLabels, scopeLabels } from "@/lib/study/labels";
import type { PublicExercise } from "@/lib/study/public";
import { MAX_OPEN_FIELD_LENGTH, type Answer } from "@/lib/study/schema";
import type { AttemptView } from "@/lib/study/service";
import { toStableTtsId } from "@/lib/study/tts";
import { CodeBlock } from "./code-block";
import { TtsBlock } from "./tts-block";

function parseStructuredInteger(raw: string | undefined, min?: number, max?: number): number | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^-?\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed)) return null;
  if (min !== undefined && parsed < min) return null;
  if (max !== undefined && parsed > max) return null;
  return parsed;
}

export function ExercisePanel({
  exercise,
  attempt,
  busy,
  onSubmit,
  onGiveUp,
  onRestart,
  onRevealHint,
  onSaveSelfAssessment,
}: {
  exercise: PublicExercise;
  attempt: AttemptView;
  busy: boolean;
  onSubmit: (answer: Answer) => Promise<void>;
  onGiveUp: () => Promise<void>;
  onRestart: () => Promise<void>;
  onRevealHint?: (hintNumber: number) => Promise<void>;
  onSaveSelfAssessment?: (checkedCriterionIds: string[]) => Promise<void>;
}) {
  const [optionId, setOptionId] = useState(
    attempt.lastAnswer?.type === "MISCONCEPTION_QUIZ" ? attempt.lastAnswer.optionId : "",
  );
  const [itemIds, setItemIds] = useState<string[]>(
    attempt.lastAnswer?.type === "ERRONEOUS_EXAMPLE" ? attempt.lastAnswer.itemIds : [],
  );
  const [output, setOutput] = useState(
    attempt.lastAnswer?.type === "PRIMM_PREDICT" ? attempt.lastAnswer.output : "",
  );
  const [order, setOrder] = useState<{ id: string; indent: number }[]>(
    attempt.lastAnswer?.type === "PARSONS" ? attempt.lastAnswer.order : [],
  );
  const [structuredValues, setStructuredValues] = useState<Record<string, string>>(
    attempt.lastAnswer?.type === "STRUCTURED_RESPONSE"
      ? Object.fromEntries(Object.entries(attempt.lastAnswer.values).map(([key, value]) => [key, String(value)]))
      : {},
  );
  const [structuredNotes, setStructuredNotes] = useState<Record<string, string>>(
    attempt.lastAnswer?.type === "STRUCTURED_RESPONSE" ? (attempt.lastAnswer.notes ?? {}) : {},
  );
  const [openFields, setOpenFields] = useState<Record<string, string>>(
    attempt.lastAnswer?.type === "OPEN_RESPONSE" ? attempt.lastAnswer.fields : {},
  );
  const [checkedRubric, setCheckedRubric] = useState<string[]>(
    attempt.selfAssessment?.checkedCriterionIds ?? [],
  );

  const closed = Boolean(attempt.closedAt);
  const ready = (() => {
    switch (exercise.type) {
      case "MISCONCEPTION_QUIZ":
        return Boolean(optionId);
      case "ERRONEOUS_EXAMPLE":
        return itemIds.length > 0;
      case "PARSONS":
        return order.length > 0;
      case "PRIMM_PREDICT":
        return output.length > 0;
      case "STRUCTURED_RESPONSE":
        return exercise.groups.every((group) =>
          group.fields.every((field) => {
            const val = structuredValues[`${group.id}.${field.id}`];
            if (field.kind === "integer") {
              return parseStructuredInteger(val, field.min, field.max) !== null;
            }
            return typeof val === "string" && field.options.some((opt) => opt.value === val);
          }),
        );
      case "OPEN_RESPONSE":
        return exercise.fields.every((field) => (openFields[field.id]?.trim().length ?? 0) >= (field.minLength ?? 1));
    }
  })();

  const exPrefix = toStableTtsId("exercise", exercise.id);

  function move(index: number, direction: number) {
    setOrder((current) => {
      const next = [...current];
      const other = index + direction;
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  function setStructuredField(key: string, value: string) {
    setStructuredValues((prev) => {
      if (value === "") {
        const next = { ...prev };
        delete next[key];
        return next;
      }
      return { ...prev, [key]: value };
    });
  }

  function submit() {
    let answer: Answer;
    switch (exercise.type) {
      case "MISCONCEPTION_QUIZ":
        answer = { type: exercise.type, optionId };
        break;
      case "ERRONEOUS_EXAMPLE":
        answer = { type: exercise.type, itemIds };
        break;
      case "PARSONS":
        answer = { type: exercise.type, order };
        break;
      case "PRIMM_PREDICT":
        answer = { type: exercise.type, output };
        break;
      case "STRUCTURED_RESPONSE": {
        const parsedValues: Record<string, string | number> = {};
        for (const group of exercise.groups) {
          for (const field of group.fields) {
            const key = `${group.id}.${field.id}`;
            const raw = structuredValues[key];
            if (field.kind === "integer") {
              const parsed = parseStructuredInteger(raw, field.min, field.max);
              if (parsed === null) return;
              parsedValues[key] = parsed;
            } else if (typeof raw === "string") {
              parsedValues[key] = raw;
            }
          }
        }
        const cleanedNotes = Object.fromEntries(
          Object.entries(structuredNotes).filter(([, value]) => value.trim().length > 0),
        );
        answer = {
          type: exercise.type,
          values: parsedValues,
          ...(Object.keys(cleanedNotes).length > 0 ? { notes: cleanedNotes } : {}),
        };
        break;
      }
      case "OPEN_RESPONSE":
        answer = { type: exercise.type, fields: openFields };
        break;
    }
    void onSubmit(answer);
  }

  const promptSpeechParts = [
    ...(exercise.objective ? [`Objetivo: ${exercise.objective}.`] : []),
    ...(exercise.context ? [`Contexto: ${exercise.context}.`] : []),
    `${exercise.title}. ${exercise.prompt}`,
  ];
  if (exercise.type === "MISCONCEPTION_QUIZ") {
    promptSpeechParts.push(
      exercise.options.map((opt, idx) => `Alternativa ${String.fromCharCode(65 + idx)}: ${opt.text}`).join(" "),
    );
  } else if (exercise.type === "ERRONEOUS_EXAMPLE") {
    promptSpeechParts.push(exercise.items.map((item, idx) => `Item ${idx + 1}: ${item.text}`).join(" "));
  } else if (exercise.type === "STRUCTURED_RESPONSE" || exercise.type === "OPEN_RESPONSE") {
    if (exercise.generalCriteria?.length) {
      promptSpeechParts.push(`Critérios gerais: ${exercise.generalCriteria.join(" ")}`);
    }
  }

  const tabularGroups =
    exercise.type === "STRUCTURED_RESPONSE" && exercise.layout === "TABLE" && exercise.groups.length > 1
      ? exercise.groups.filter(
          (g) => g.fields.map((f) => f.id).join("|") === exercise.groups[0].fields.map((f) => f.id).join("|"),
        )
      : [];
  const cardGroups =
    exercise.type === "STRUCTURED_RESPONSE"
      ? tabularGroups.length > 1
        ? exercise.groups.filter((g) => !tabularGroups.includes(g))
        : exercise.groups
      : [];

  const totalHints = exercise.hintCount ?? 0;
  const revealedCount = attempt.revealedHintCount ?? 0;
  const isOpenSubmitted = exercise.type === "OPEN_RESPONSE" && closed && !attempt.gaveUp && attempt.attemptsCount > 0;

  return (
    <div className="exercise-panel">
      <div className="exercise-heading">
        <div className="exercise-meta-pills">
          <span className="eyebrow">PRÁTICA ATIVA</span>
          {exercise.layer && <span className="status-pill">{layerLabels[exercise.layer]}</span>}
          {exercise.scope && <span className="meta-pill">{scopeLabels[exercise.scope]}</span>}
          <span className={`attempt-status-pill status-${attempt.attemptStatus.toLowerCase()}`}>
            {attemptStatusLabels[attempt.attemptStatus]}
          </span>
        </div>
        <span>
          {attempt.attemptsCount} {attempt.attemptsCount === 1 ? "envio" : "envios"}
        </span>
      </div>

      <TtsBlock id={`${exPrefix}.prompt`} label={`Enunciado: ${exercise.title}`} text={promptSpeechParts.join(" ")}>
        <h2>{exercise.title}</h2>
        {exercise.objective && (
          <p className="exercise-objective">
            <strong>Objetivo:</strong> {exercise.objective}
          </p>
        )}
        {exercise.context && (
          <p className="exercise-context">
            <strong>Contexto:</strong> {exercise.context}
          </p>
        )}
        {exercise.prerequisites?.length ? (
          <div className="exercise-prerequisites">
            <strong>Pré-requisitos recomendados:</strong>
            <ul>
              {exercise.prerequisites.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <p className="exercise-prompt">{exercise.prompt}</p>
        {(exercise.type === "STRUCTURED_RESPONSE" || exercise.type === "OPEN_RESPONSE") &&
          exercise.generalCriteria?.length ? (
            <div className="exercise-criteria">
              <strong>Critérios gerais</strong>
              <ul>
                {exercise.generalCriteria.map((criterion) => (
                  <li key={criterion}>{criterion}</li>
                ))}
              </ul>
            </div>
          ) : null}
      </TtsBlock>

      {exercise.type === "PRIMM_PREDICT" && (
        <CodeBlock
          label="Leia sem executar"
          ttsId={`${exPrefix}.code`}
          explanation={`Código do exercício ${exercise.title}. Analise o programa e preveja sua saída sem executar.`}
        >
          {exercise.code}
        </CodeBlock>
      )}

      {exercise.type === "OPEN_RESPONSE" && exercise.code && (
        <div className="open-code-reference">
          <CodeBlock
            label={exercise.codeLanguage ? `Código de referência (${exercise.codeLanguage})` : "Código do chamado"}
            ttsId={`${exPrefix}.code`}
            explanation={`Trecho de código apresentado para investigação no exercício ${exercise.title}.`}
          >
            {exercise.code}
          </CodeBlock>
          {exercise.labTopicId && (
            <div className="lab-bridge-note">
              <Link className="text-link" href={`/laboratorio/${exercise.labTopicId}`}>
                Abrir laboratório Python separado para experimentar <ArrowRight size={14} aria-hidden="true" />
              </Link>
              <small>A execução no laboratório fica apenas no navegador e não substitui a entrega escrita abaixo.</small>
            </div>
          )}
        </div>
      )}

      {totalHints > 0 && (
        <div className="hints-box" aria-label="Dicas progressivas">
          <div className="hints-header">
            <span>
              <HelpCircle size={15} aria-hidden="true" /> Dicas ({revealedCount} de {totalHints} usadas)
            </span>
            {!closed && revealedCount < totalHints && onRevealHint && (
              <button
                type="button"
                className="button secondary small-button"
                disabled={busy}
                onClick={() => void onRevealHint(revealedCount + 1)}
              >
                Revelar dica {revealedCount + 1}
              </button>
            )}
          </div>
          {attempt.revealedHints.length > 0 ? (
            <ol className="hints-list">
              {attempt.revealedHints.map((hint, idx) => (
                <li key={idx}>
                  <TtsBlock id={`${exPrefix}.hint.${idx + 1}`} label={`Dica ${idx + 1}`} text={hint}>
                    <p>{hint}</p>
                  </TtsBlock>
                </li>
              ))}
            </ol>
          ) : (
            <p className="hints-empty">
              {closed ? "Nenhuma dica foi usada nesta tentativa." : "Revele uma dica somente se precisar de apoio."}
            </p>
          )}
        </div>
      )}

      <fieldset disabled={busy || closed} className="exercise-inputs">
        <legend className="sr-only">Sua resposta</legend>
        {exercise.type === "MISCONCEPTION_QUIZ" && (
          <div className="choice-list">
            {exercise.options.map((option, index) => (
              <label key={option.id} className={optionId === option.id ? "selected-choice" : ""}>
                <input
                  type="radio"
                  name={exercise.id}
                  value={option.id}
                  checked={optionId === option.id}
                  onChange={() => setOptionId(option.id)}
                />
                <span className="choice-letter">{String.fromCharCode(65 + index)}</span>
                <span>{option.text}</span>
              </label>
            ))}
          </div>
        )}

        {exercise.type === "ERRONEOUS_EXAMPLE" && (
          <div className="choice-list">
            {exercise.items.map((item) => (
              <label key={item.id} className={itemIds.includes(item.id) ? "selected-choice" : ""}>
                <input
                  type="checkbox"
                  checked={itemIds.includes(item.id)}
                  onChange={(event) =>
                    setItemIds(event.target.checked ? [...itemIds, item.id] : itemIds.filter((id) => id !== item.id))
                  }
                />
                <span>{item.text}</span>
              </label>
            ))}
          </div>
        )}

        {exercise.type === "PRIMM_PREDICT" && (
          <>
            <label htmlFor="predicted-output">Sua previsão de saída</label>
            <textarea
              id="predicted-output"
              className="output-input"
              rows={4}
              maxLength={2000}
              value={output}
              onChange={(event) => setOutput(event.target.value)}
              placeholder="Uma linha por impressão"
            />
          </>
        )}

        {exercise.type === "PARSONS" && (
          <div className="parsons-editor">
            <div>
              <h3>Blocos disponíveis</h3>
              <p>Adicione os que fazem parte da solução.</p>
              {exercise.blocks
                .filter((block) => !order.some((item) => item.id === block.id))
                .map((block) => (
                  <button
                    type="button"
                    className="available-block"
                    key={block.id}
                    onClick={() => setOrder([...order, { id: block.id, indent: 0 }])}
                    aria-label={`Adicionar bloco: ${block.code}`}
                  >
                    <code>{block.code}</code>
                    <Plus size={15} />
                  </button>
                ))}
            </div>
            <div>
              <h3>Sua sequência</h3>
              {!order.length && <p className="empty-order">Escolha um bloco para começar.</p>}
              <ol>
                {order.map((block, index) => (
                  <li key={block.id}>
                    <div className="ordered-code" style={{ paddingLeft: `${12 + block.indent * 16}px` }}>
                      <code>{exercise.blocks.find((item) => item.id === block.id)?.code}</code>
                    </div>
                    <div className="block-tools">
                      <span>Linha {index + 1}</span>
                      <button
                        type="button"
                        aria-label={`Subir linha ${index + 1}`}
                        disabled={index === 0}
                        onClick={() => move(index, -1)}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Descer linha ${index + 1}`}
                        disabled={index === order.length - 1}
                        onClick={() => move(index, 1)}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <label>
                        Recuo{" "}
                        <select
                          aria-label={`Recuo da linha ${index + 1}`}
                          value={block.indent}
                          onChange={(event) =>
                            setOrder(
                              order.map((item) =>
                                item.id === block.id ? { ...item, indent: Number(event.target.value) } : item,
                              ),
                            )
                          }
                        >
                          {[0, 1, 2, 3].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        aria-label={`Remover linha ${index + 1}`}
                        onClick={() => setOrder(order.filter((item) => item.id !== block.id))}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}

        {exercise.type === "STRUCTURED_RESPONSE" && (
          <div className="structured-response">
            {tabularGroups.length > 1 && (
              <div className="trace-table-responsive">
                <table className="structured-table">
                  <thead>
                    <tr>
                      <th scope="col">Operação</th>
                      {tabularGroups[0].fields.map((field) => (
                        <th scope="col" key={field.id}>
                          {field.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tabularGroups.map((group) => (
                      <tr key={group.id}>
                        <th scope="row">{group.label}</th>
                        {group.fields.map((field) => {
                          const key = `${group.id}.${field.id}`;
                          const inputId = `${exPrefix}-${key}`;
                          const current = structuredValues[key] ?? "";
                          return (
                            <td key={field.id} data-label={field.label}>
                              {field.kind === "integer" ? (
                                <input
                                  id={inputId}
                                  name={key}
                                  type="text"
                                  inputMode="numeric"
                                  aria-label={`${group.label} — ${field.label}`}
                                  value={current}
                                  onChange={(event) => setStructuredField(key, event.target.value)}
                                />
                              ) : (
                                <select
                                  id={inputId}
                                  name={key}
                                  aria-label={`${group.label} — ${field.label}`}
                                  value={current}
                                  onChange={(event) => setStructuredField(key, event.target.value)}
                                >
                                  <option value="">Escolha…</option>
                                  {field.options.map((opt) => (
                                    <option key={opt.value} value={opt.value}>
                                      {opt.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {cardGroups.map((group) => (
              <div className="structured-card" key={group.id}>
                <h4>{group.label}</h4>
                {group.prompt && <p className="structured-card-prompt">{group.prompt}</p>}
                <div className="structured-card-fields">
                  {group.fields.map((field) => {
                    const key = `${group.id}.${field.id}`;
                    const inputId = `${exPrefix}-${key}`;
                    const current = structuredValues[key] ?? "";
                    return (
                      <div className="structured-field" key={field.id}>
                        <label htmlFor={inputId}>{field.label}</label>
                        {field.kind === "integer" ? (
                          <input
                            id={inputId}
                            name={key}
                            type="text"
                            inputMode="numeric"
                            value={current}
                            onChange={(event) => setStructuredField(key, event.target.value)}
                          />
                        ) : (
                          <select
                            id={inputId}
                            name={key}
                            value={current}
                            onChange={(event) => setStructuredField(key, event.target.value)}
                          >
                            <option value="">Escolha uma opção…</option>
                            {field.options.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {exercise.notes?.map((note) => (
              <div className="structured-note-field" key={note.id}>
                <label htmlFor={`${exPrefix}-note-${note.id}`}>{note.label}</label>
                <textarea
                  id={`${exPrefix}-note-${note.id}`}
                  name={`note-${note.id}`}
                  rows={3}
                  maxLength={1500}
                  placeholder={note.placeholder}
                  value={structuredNotes[note.id] ?? ""}
                  onChange={(event) =>
                    setStructuredNotes((prev) => ({ ...prev, [note.id]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
        )}

        {exercise.type === "OPEN_RESPONSE" && (
          <div className="open-response-fields">
            {exercise.fields.map((field) => {
              const inputId = `${exPrefix}-open-${field.id}`;
              const val = openFields[field.id] ?? "";
              const min = field.minLength ?? 1;
              return (
                <div className="open-field" key={field.id}>
                  <label htmlFor={inputId}>{field.label}</label>
                  {field.prompt && <p className="open-field-prompt">{field.prompt}</p>}
                  <textarea
                    id={inputId}
                    name={field.id}
                    className={field.isCode ? "output-input code-textarea" : "output-input"}
                    rows={field.isCode ? 7 : 4}
                    maxLength={field.maxLength ?? MAX_OPEN_FIELD_LENGTH}
                    placeholder={field.placeholder}
                    value={val}
                    onChange={(event) =>
                      setOpenFields((prev) => ({ ...prev, [field.id]: event.target.value }))
                    }
                  />
                  <small>
                    {val.trim().length} caracteres (mínimo recomendado: {min})
                  </small>
                </div>
              );
            })}
          </div>
        )}
      </fieldset>

      {attempt.feedback && (
        <TtsBlock id={`${exPrefix}.feedback`} label="Resultado do envio" text={attempt.feedback}>
          <div
            className={`exercise-feedback ${
              exercise.type === "OPEN_RESPONSE" ? "open-submitted" : attempt.isCorrect ? "correct" : "retry"
            }`}
            role="status"
          >
            {(attempt.isCorrect || isOpenSubmitted) && <Check size={18} />}
            <p>{attempt.feedback}</p>
          </div>
        </TtsBlock>
      )}

      {closed && (
        <div className="solution-panel">
          <h3>
            {attempt.gaveUp
              ? "Solução consultada"
              : isOpenSubmitted
                ? attempt.selfAssessment
                  ? "Autoavaliação registrada"
                  : "Enviado para autoavaliação"
                : "Raciocínio confirmado"}
          </h3>

          {exercise.type === "OPEN_RESPONSE" && attempt.openSolution ? (
            <div className="open-solution-sections">
              {attempt.openSolution.referenceSections.map((sec, idx) =>
                sec.isCode ? (
                  <CodeBlock
                    key={sec.label}
                    label={sec.label}
                    ttsId={`${exPrefix}.solution.${idx}`}
                    explanation={sec.label}
                  >
                    {sec.content}
                  </CodeBlock>
                ) : (
                  <TtsBlock
                    key={sec.label}
                    className="open-reference-card"
                    id={`${exPrefix}.solution.${idx}`}
                    label={sec.label}
                    text={`${sec.label}. ${sec.content}`}
                  >
                    <h4>{sec.label}</h4>
                    <p>{sec.content}</p>
                  </TtsBlock>
                ),
              )}
              {attempt.openSolution.criticalFailureNote && (
                <div className="critical-failure-note" role="note">
                  <strong>Ponto crítico na revisão:</strong> {attempt.openSolution.criticalFailureNote}
                </div>
              )}
            </div>
          ) : (
            <CodeBlock
              label={attempt.gaveUp ? "Solução esperada" : "Resposta esperada"}
              ttsId={`${exPrefix}.solution`}
              explanation={attempt.explanation ?? undefined}
            >
              {attempt.solutionText ?? ""}
            </CodeBlock>
          )}

          <TtsBlock
            id={`${exPrefix}.explanation`}
            label="Explicação da resposta"
            text={attempt.explanation ?? "Sem explicação adicional."}
          >
            <p>{attempt.explanation}</p>
          </TtsBlock>

          {isOpenSubmitted && attempt.rubric && (
            <div className="rubric-box">
              <h4>Autoavaliação pela rubrica</h4>
              <p>Marque os critérios atendidos pela sua resposta enviada. A marcação fica salva nesta tentativa e não atribui nota automática.</p>
              <div className="rubric-checklist">
                {attempt.rubric.map((item) => {
                  const checked = checkedRubric.includes(item.id);
                  return (
                    <label key={item.id} className={checked ? "selected-choice" : ""}>
                      <input
                        type="checkbox"
                        disabled={busy}
                        checked={checked}
                        onChange={(event) =>
                          setCheckedRubric((prev) =>
                            event.target.checked
                              ? [...prev, item.id]
                              : prev.filter((id) => id !== item.id),
                          )
                        }
                      />
                      <span>
                        <strong>{item.label}:</strong> {item.description}
                      </span>
                    </label>
                  );
                })}
              </div>
              {onSaveSelfAssessment && (
                <div className="rubric-actions">
                  <button
                    type="button"
                    className="button primary"
                    disabled={busy}
                    onClick={() => void onSaveSelfAssessment(checkedRubric)}
                  >
                    {busy ? "Salvando…" : attempt.selfAssessment ? "Atualizar autoavaliação" : "Registrar autoavaliação"}
                  </button>
                  {attempt.selfAssessment && (
                    <small>
                      Autoavaliação registrada ({attempt.selfAssessment.checkedCriterionIds.length} de{" "}
                      {attempt.rubric.length} critérios marcados).
                    </small>
                  )}
                </div>
              )}
            </div>
          )}

          {attempt.gaveUp && exercise.type === "OPEN_RESPONSE" && (
            <p className="rubric-disabled-note">
              Solução consultada sem envio aberto: a autoavaliação por rubrica exige uma entrega própria enviada antes.
            </p>
          )}

          {attempt.solvedWithoutHelp && <span className="status-pill">Resolvido no primeiro envio e sem dicas</span>}
        </div>
      )}

      <div className="exercise-actions">
        {closed ? (
          <button className="button secondary" disabled={busy} onClick={() => void onRestart()}>
            Praticar novamente
          </button>
        ) : (
          <>
            <button className="button primary" disabled={busy || !ready} onClick={submit}>
              {busy
                ? "Salvando…"
                : exercise.type === "OPEN_RESPONSE"
                  ? "Enviar para autoavaliação"
                  : "Conferir resposta"}
            </button>
            <button className="quiet-button" disabled={busy} onClick={() => void onGiveUp()}>
              Ver solução e encerrar tentativa
            </button>
          </>
        )}
      </div>
    </div>
  );
}
