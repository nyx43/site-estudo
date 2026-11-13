import type { Teaching, ExplainedExample as Example } from "@/lib/study/teaching-schema";
import { CodeBlock } from "./code-block";

export function ExplainedExample({ example }: { example: Example }) {
  return <section className="explained-example"><h3>{example.title}</h3><p>{example.purpose}</p><CodeBlock label="Código completo">{example.code}</CodeBlock>{example.stdin !== undefined && <CodeBlock label="Entrada simulada">{example.stdin.replace(/\n$/, "")}</CodeBlock>}<CodeBlock label={example.expectedError ? "Falha intencional esperada" : "Saída esperada"}>{example.expectedError ?? (example.expectedOutput === "" ? "(sem saída)" : example.expectedOutput ?? "")}</CodeBlock><h4>O que cada linha faz</h4><ol className="line-explanations">{example.lineNotes.map((note) => <li key={note.line}><span>Linha {note.line}</span><p>{note.explanation}</p></li>)}</ol><p className="example-takeaway">{example.takeaway}</p></section>;
}
const kindLabels = { FUNCTION: "Função", TYPE: "Tipo / construtor", KEYWORD: "Palavra-chave", OPERATOR: "Operador", SYNTAX: "Sintaxe", CONCEPT: "Conceito", TOOL: "Ferramenta" };
export const levelLabels = { FOUNDATION: "Fundamentos", INTERMEDIATE: "Intermediário", ADVANCED: "Avançado", SPECIALIZED: "Casos específicos" };

export function CommandReference({ teaching }: { teaching: Teaching }) {
  return <div className="command-reference"><h2>Comandos e sintaxe, sem pular etapas</h2><p>Primeiro entenda a finalidade e a forma geral. Depois acompanhe um programa completo, sua saída e cada linha.</p>{teaching.commands.map((command) => <section className="command-entry" key={command.name}><span className="activity-type">{kindLabels[command.kind]}</span><h3>{command.name}</h3><pre className="syntax-reference"><code>{command.syntax}</code></pre><p>{command.explanation}</p><p><strong>Quando usar:</strong> {command.whenToUse}</p><h4>Cuidados</h4><ul>{command.pitfalls.map((pitfall) => <li key={pitfall}>{pitfall}</li>)}</ul>{command.examples.map((example) => <ExplainedExample key={example.id} example={example} />)}</section>)}</div>;
}
export function Glossary({ teaching }: { teaching: Teaching }) {
  return <section className="lesson-glossary"><h2>Vocabulário da aula</h2><dl>{teaching.glossary.map((item) => <div key={item.term}><dt>{item.term}</dt><dd><p>{item.meaning}</p><p className="glossary-example">{item.example}</p></dd></div>)}</dl></section>;
}
export function EdgeCases({ teaching }: { teaching: Teaching }) {
  return <section><h2>Casos de fronteira e situações específicas</h2>{teaching.edgeCases.map((item) => <section key={item.title}><h3>{item.title}</h3><p>{item.explanation}</p><ExplainedExample example={item.example} /></section>)}</section>;
}
export function AiReview({ teaching }: { teaching: Teaching }) {
  return <section><h2>Como revisar uma solução de IA</h2><p>Este é um exemplo autoral de falha plausível. A explicação da IA não substitui a comparação com o requisito e os testes.</p>{teaching.aiReview.map((item) => <section className="ai-review-case" key={item.title}><h3>{item.title}</h3><p className="requirement-callout"><strong>O pedido:</strong> {item.request}</p><h4>O código que precisa ser investigado</h4><ExplainedExample example={item.generated} /><h4>Diagnóstico</h4><ul>{item.diagnosis.map((finding) => <li key={finding}>{finding}</li>)}</ul><h4>Uma correção explicada</h4><ExplainedExample example={item.correction} /><h4>Como conferir a correção</h4><div className="table-scroll"><table><thead><tr><th scope="col">Cenário</th><th scope="col">Esperado</th><th scope="col">O que verifica</th></tr></thead><tbody>{item.acceptanceChecks.map((check) => <tr key={check.scenario}><td>{check.scenario}</td><td>{check.expected}</td><td>{check.why}</td></tr>)}</tbody></table></div></section>)}<h3>Checklist para acompanhar um projeto</h3><ul>{teaching.reviewChecklist.map((check) => <li key={check}>{check}</li>)}</ul></section>;
}
