import type { PublicLesson } from "@/lib/study/public";
import type { LessonStep } from "@/lib/study/schema";

export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return <div className="code-example">{label && <span>{label}</span>}<pre><code>{children}</code></pre></div>;
}

export function LessonContent({ lesson, step }: { lesson: PublicLesson; step: LessonStep }) {
  switch (step) {
    case "why": return <><h2>Por que repetir instruções?</h2><p>{lesson.why.problem}</p><p>{lesson.why.cost}</p></>;
    case "mental-model": return <><h2>Acompanhe uma volta de cada vez</h2><p>{lesson.mentalModel.analogy}</p><div className="table-scroll"><table><caption>Rastreamento de um while com n começando em 3</caption><thead><tr>{lesson.mentalModel.trace.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{lesson.mentalModel.trace.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></div><p>{lesson.mentalModel.limits}</p></>;
    case "concept": return <><h2>As peças de um laço</h2><p>{lesson.concept.definition}</p><ul>{lesson.concept.parts.map((part) => <li key={part}>{part}</li>)}</ul><CodeBlock label="Python">{lesson.concept.code}</CodeBlock><CodeBlock label="Saída">{lesson.concept.expectedOutput}</CodeBlock></>;
    case "worked-example": return <><h2>Uma soma, explicada por partes</h2>{lesson.workedExamples.map((example, index) => <div key={index}><p>{example.problem}</p><ol className="worked-steps">{example.subgoals.map((subgoal) => <li key={subgoal.label}><h3>{subgoal.label}</h3><CodeBlock>{subgoal.code}</CodeBlock><p>{subgoal.why}</p></li>)}</ol><CodeBlock label="Saída do programa completo">{example.expectedOutput}</CodeBlock></div>)}</>;
    case "misconceptions": return <><h2>Onde o raciocínio costuma escapar</h2>{lesson.misconceptions.map((item) => <section className="refutation" key={item.tag}><h3>Uma ideia a revisar</h3><p className="misconception-claim">{item.claim}</p><p>{item.refutation}</p><p><strong>O que levar:</strong> {item.correct}</p></section>)}</>;
    case "uses": return <><h2>Onde isso aparece de verdade</h2>{lesson.uses.map((use) => <section className="lesson-use" key={use.context}><h3>{use.context}</h3><p>{use.description}</p></section>)}</>;
    case "efficiency": return <><h2>Uma intenção, duas formas de escrever</h2><CodeBlock label="Laço explícito">{lesson.efficiency.naive}</CodeBlock><CodeBlock label="Forma direta para somar">{lesson.efficiency.better}</CodeBlock><p>{lesson.efficiency.criterion}</p></>;
    case "summary": return <><h2>Conecte as ideias</h2><p>{lesson.summary}</p><h3>Os palpites do começo</h3>{lesson.prequestions.map((question) => <section className="question-recap" key={question.id}><strong>{question.prompt}</strong><p>{question.modelAnswer ?? "Conclua este resumo para consultar a explicação do seu palpite."}</p></section>)}</>;
    default: return null;
  }
}
