"use client";

import { useState } from "react";
import { toStableTtsId } from "@/lib/study/tts";
import { TtsBlock } from "./tts-block";

export function QuestionCard({
  question,
  savedAnswer,
  busy,
  ttsPrefix,
  onSave,
}: {
  question: { id: string; prompt: string; modelAnswer?: string };
  savedAnswer?: string;
  busy: boolean;
  ttsPrefix?: string;
  onSave: (id: string, answer: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(savedAnswer ?? "");
  const idBase = toStableTtsId(ttsPrefix ?? "question", question.id);

  return (
    <section className="question-card">
      <TtsBlock id={`${idBase}.prompt`} label="Pergunta" text={question.prompt}>
        <label htmlFor={question.id}>{question.prompt}</label>
      </TtsBlock>
      <textarea
        id={question.id}
        value={answer}
        onChange={(event) => setAnswer(event.target.value)}
        maxLength={2000}
        rows={3}
        disabled={busy}
        placeholder="Escreva com suas palavras…"
      />
      <div className="question-actions">
        <button
          className="button secondary"
          disabled={busy || !answer.trim() || savedAnswer === answer.trim()}
          onClick={() => void onSave(question.id, answer)}
        >
          {savedAnswer === answer.trim() ? "Resposta salva" : "Salvar resposta"}
        </button>
        <span>{answer.length}/2000</span>
      </div>
      {question.modelAnswer && (
        <TtsBlock
          className="model-answer"
          id={`${idBase}.model-answer`}
          label="Resposta modelo"
          text={`Uma resposta possível. ${question.modelAnswer}`}
        >
          <strong>Uma resposta possível</strong>
          <p>{question.modelAnswer}</p>
        </TtsBlock>
      )}
    </section>
  );
}
