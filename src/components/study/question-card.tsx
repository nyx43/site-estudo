"use client";

import { useState } from "react";

export function QuestionCard({ question, savedAnswer, busy, onSave }: {
  question: { id: string; prompt: string; modelAnswer?: string };
  savedAnswer?: string; busy: boolean; onSave: (id: string, answer: string) => Promise<void>;
}) {
  const [answer, setAnswer] = useState(savedAnswer ?? "");
  return <section className="question-card"><label htmlFor={question.id}>{question.prompt}</label><textarea id={question.id} value={answer} onChange={(event) => setAnswer(event.target.value)} maxLength={2000} rows={3} disabled={busy} placeholder="Escreva com suas palavras…" /><div className="question-actions"><button className="button secondary" disabled={busy || !answer.trim() || savedAnswer === answer.trim()} onClick={() => void onSave(question.id, answer)}>{savedAnswer === answer.trim() ? "Resposta salva" : "Salvar resposta"}</button><span>{answer.length}/2000</span></div>{question.modelAnswer && <div className="model-answer"><strong>Uma resposta possível</strong><p>{question.modelAnswer}</p></div>}</section>;
}
