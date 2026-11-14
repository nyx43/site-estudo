"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Plus, X } from "lucide-react";
import type { Answer } from "@/lib/study/schema";
import type { PublicExercise } from "@/lib/study/public";
import type { AttemptView } from "@/lib/study/service";
import { toStableTtsId } from "@/lib/study/tts";
import { CodeBlock } from "./code-block";
import { TtsBlock } from "./tts-block";

export function ExercisePanel({
  exercise,
  attempt,
  busy,
  onSubmit,
  onGiveUp,
  onRestart,
}: {
  exercise: PublicExercise;
  attempt: AttemptView;
  busy: boolean;
  onSubmit: (answer: Answer) => Promise<void>;
  onGiveUp: () => Promise<void>;
  onRestart: () => Promise<void>;
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
  const closed = Boolean(attempt.closedAt);
  const ready =
    exercise.type === "MISCONCEPTION_QUIZ"
      ? Boolean(optionId)
      : exercise.type === "ERRONEOUS_EXAMPLE"
        ? itemIds.length > 0
        : exercise.type === "PARSONS"
          ? order.length > 0
          : output.length > 0;

  const exPrefix = toStableTtsId("exercise", exercise.id);

  function move(index: number, direction: number) {
    setOrder((current) => {
      const next = [...current];
      const other = index + direction;
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
  }

  function submit() {
    const answer: Answer =
      exercise.type === "MISCONCEPTION_QUIZ"
        ? { type: exercise.type, optionId }
        : exercise.type === "ERRONEOUS_EXAMPLE"
          ? { type: exercise.type, itemIds }
          : exercise.type === "PARSONS"
            ? { type: exercise.type, order }
            : { type: exercise.type, output };
    void onSubmit(answer);
  }

  const promptSpeechParts = [`${exercise.title}. ${exercise.prompt}`];
  if (exercise.type === "MISCONCEPTION_QUIZ") {
    promptSpeechParts.push(
      exercise.options.map((opt, idx) => `Alternativa ${String.fromCharCode(65 + idx)}: ${opt.text}`).join(" "),
    );
  } else if (exercise.type === "ERRONEOUS_EXAMPLE") {
    promptSpeechParts.push(exercise.items.map((item, idx) => `Item ${idx + 1}: ${item.text}`).join(" "));
  }

  return (
    <div className="exercise-panel">
      <div className="exercise-heading">
        <span className="eyebrow">PRÁTICA ATIVA</span>
        <span>
          {attempt.attemptsCount} {attempt.attemptsCount === 1 ? "envio" : "envios"}
        </span>
      </div>

      <TtsBlock id={`${exPrefix}.prompt`} label={`Enunciado: ${exercise.title}`} text={promptSpeechParts.join(" ")}>
        <h2>{exercise.title}</h2>
        <p className="exercise-prompt">{exercise.prompt}</p>
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
      </fieldset>

      {attempt.feedback && (
        <TtsBlock id={`${exPrefix}.feedback`} label="Resultado do envio" text={attempt.feedback}>
          <div className={`exercise-feedback ${attempt.isCorrect ? "correct" : "retry"}`} role="status">
            {attempt.isCorrect && <Check size={18} />}
            <p>{attempt.feedback}</p>
          </div>
        </TtsBlock>
      )}

      {closed && (
        <div className="solution-panel">
          <h3>{attempt.gaveUp ? "Solução consultada" : "Raciocínio confirmado"}</h3>
          <CodeBlock
            label={attempt.gaveUp ? "Solução esperada" : "Resposta esperada"}
            ttsId={`${exPrefix}.solution`}
            explanation={attempt.explanation ?? undefined}
          >
            {attempt.solutionText ?? ""}
          </CodeBlock>
          <TtsBlock
            id={`${exPrefix}.explanation`}
            label="Explicação da resposta"
            text={attempt.explanation ?? "Sem explicação adicional."}
          >
            <p>{attempt.explanation}</p>
          </TtsBlock>
          {attempt.solvedWithoutHelp && <span className="status-pill">Resolvido no primeiro envio</span>}
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
              {busy ? "Salvando…" : "Conferir resposta"}
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
