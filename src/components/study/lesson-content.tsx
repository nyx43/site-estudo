import type { PublicLesson } from "@/lib/study/public";
import type { LessonStep } from "@/lib/study/schema";

import { CodeBlock } from "./code-block";
import { CommandReference, EdgeCases, AiReview, ExplainedExample } from "./teaching-content";
export { CodeBlock } from "./code-block";

export function LessonContent({ lesson, step }: { lesson: PublicLesson; step: LessonStep }) {
  switch (step) {
    case "why": return <><h2>Por que este conceito existe?</h2>{lesson.teaching?.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}<p>{lesson.why.problem}</p><p>{lesson.why.cost}</p></>;
    case "mental-model": return <><h2>Acompanhe o raciocínio passo a passo</h2><p>{lesson.mentalModel.analogy}</p><div className="table-scroll"><table><caption>Rastreamento do exemplo</caption><thead><tr>{lesson.mentalModel.trace.headers.map((header) => <th key={header} scope="col">{header}</th>)}</tr></thead><tbody>{lesson.mentalModel.trace.rows.map((row, index) => <tr key={index}>{row.map((value, column) => <td key={column}>{value}</td>)}</tr>)}</tbody></table></div><p>{lesson.mentalModel.limits}</p></>;
    case "concept": return <><h2>O conceito e suas partes</h2><p>{lesson.concept.definition}</p><ul>{lesson.concept.parts.map((part) => <li key={part}>{part}</li>)}</ul><CodeBlock label="Código de exemplo">{lesson.concept.code}</CodeBlock><CodeBlock label="Saída">{lesson.concept.expectedOutput}</CodeBlock>{lesson.teaching && <CommandReference teaching={lesson.teaching} />}</>;
    case "worked-example": return <><h2>Exemplos resolvidos e explicados</h2>{lesson.workedExamples.map((example, index) => <div key={index}><p>{example.problem}</p><ol className="worked-steps">{example.subgoals.map((subgoal) => <li key={subgoal.label}><h3>{subgoal.label}</h3><CodeBlock>{subgoal.code}</CodeBlock><p>{subgoal.why}</p></li>)}</ol><CodeBlock label="Saída do programa completo">{example.expectedOutput}</CodeBlock></div>)}{lesson.teaching?.walkthroughs.map((example) => <ExplainedExample key={example.id} example={example} />)}</>;
    case "misconceptions": return <><h2>Onde o raciocínio costuma escapar</h2>{lesson.misconceptions.map((item) => <section className="refutation" key={item.tag}><h3>Uma ideia a revisar</h3><p className="misconception-claim">{item.claim}</p><p>{item.refutation}</p><p><strong>O que levar:</strong> {item.correct}</p></section>)}{lesson.teaching && <EdgeCases teaching={lesson.teaching} />}</>;
    case "uses": return <><h2>Onde isso aparece de verdade</h2>{lesson.uses.map((use) => <section className="lesson-use" key={use.context}><h3>{use.context}</h3><p>{use.description}</p></section>)}</>;
    case "efficiency": return <><h2>Compare formas de resolver</h2><CodeBlock label="Versão de referência">{lesson.efficiency.naive}</CodeBlock><CodeBlock label="Alternativa">{lesson.efficiency.better}</CodeBlock><p>{lesson.efficiency.criterion}</p>{lesson.teaching && <AiReview teaching={lesson.teaching} />}</>;
    case "summary": return <><h2>Conecte as ideias</h2><p>{lesson.summary}</p><h3>Os palpites do começo</h3>{lesson.prequestions.map((question) => <section className="question-recap" key={question.id}><strong>{question.prompt}</strong><p>{question.modelAnswer ?? "Conclua este resumo para consultar a explicação do seu palpite."}</p></section>)}</>;
    default: return null;
  }
}
