"use client";

import type { PublicLesson } from "@/lib/study/public";
import type { LessonStep } from "@/lib/study/schema";
import { formatTableForTts, toStableTtsId } from "@/lib/study/tts";

import { CodeBlock } from "./code-block";
import { CommandReference, EdgeCases, AiReview, ExplainedExample } from "./teaching-content";
import { TtsBlock } from "./tts-block";
export { CodeBlock } from "./code-block";

export function LessonContent({ lesson, step }: { lesson: PublicLesson; step: LessonStep }) {
  const stepPrefix = toStableTtsId(lesson.id, step);

  switch (step) {
    case "why":
      return (
        <>
          <h2>Por que este conceito existe?</h2>
          {lesson.teaching?.introduction.map((paragraph, index) => (
            <TtsBlock
              key={paragraph}
              id={`${stepPrefix}.intro-${index + 1}`}
              label={`Introdução ${index + 1}`}
              text={paragraph}
            >
              <p>{paragraph}</p>
            </TtsBlock>
          ))}
          <TtsBlock id={`${stepPrefix}.problem`} label="O problema que motiva o conceito" text={lesson.why.problem}>
            <p>{lesson.why.problem}</p>
          </TtsBlock>
          <TtsBlock id={`${stepPrefix}.cost`} label="O que acontece sem o conceito" text={lesson.why.cost}>
            <p>{lesson.why.cost}</p>
          </TtsBlock>
        </>
      );

    case "mental-model":
      return (
        <>
          <h2>Acompanhe o raciocínio passo a passo</h2>
          <TtsBlock id={`${stepPrefix}.analogy`} label="Analogia e modelo mental" text={lesson.mentalModel.analogy}>
            <p>{lesson.mentalModel.analogy}</p>
          </TtsBlock>
          <TtsBlock
            id={`${stepPrefix}.trace`}
            label="Tabela de rastreamento do exemplo"
            text={formatTableForTts(
              "Rastreamento do exemplo",
              lesson.mentalModel.trace.headers,
              lesson.mentalModel.trace.rows,
            )}
          >
            <div className="table-scroll">
              <table>
                <caption>Rastreamento do exemplo</caption>
                <thead>
                  <tr>
                    {lesson.mentalModel.trace.headers.map((header) => (
                      <th key={header} scope="col">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lesson.mentalModel.trace.rows.map((row, index) => (
                    <tr key={index}>
                      {row.map((value, column) => (
                        <td key={column}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TtsBlock>
          <TtsBlock id={`${stepPrefix}.limits`} label="Limites do modelo mental" text={lesson.mentalModel.limits}>
            <p>{lesson.mentalModel.limits}</p>
          </TtsBlock>
        </>
      );

    case "concept":
      return (
        <>
          <h2>O conceito e suas partes</h2>
          <TtsBlock id={`${stepPrefix}.definition`} label="Definição do conceito" text={lesson.concept.definition}>
            <p>{lesson.concept.definition}</p>
          </TtsBlock>
          <TtsBlock
            id={`${stepPrefix}.parts`}
            label="Partes do conceito"
            text={`Partes do conceito. ${lesson.concept.parts.join(" ")}`}
          >
            <ul>
              {lesson.concept.parts.map((part) => (
                <li key={part}>{part}</li>
              ))}
            </ul>
          </TtsBlock>
          <CodeBlock
            label="Código de exemplo"
            ttsId={`${stepPrefix}.code`}
            explanation={lesson.concept.definition}
            expectedOutput={lesson.concept.expectedOutput}
          >
            {lesson.concept.code}
          </CodeBlock>
          <CodeBlock label="Saída" ttsId={`${stepPrefix}.output`} isOutput>
            {lesson.concept.expectedOutput}
          </CodeBlock>
          {lesson.teaching && <CommandReference teaching={lesson.teaching} prefix={`${stepPrefix}.commands`} />}
        </>
      );

    case "worked-example":
      return (
        <>
          <h2>Exemplos resolvidos e explicados</h2>
          {lesson.workedExamples.map((example, index) => (
            <div key={index}>
              <TtsBlock
                id={`${stepPrefix}.ex-${index + 1}-problem`}
                label={`Enunciado do exemplo ${index + 1}`}
                text={example.problem}
              >
                <p>{example.problem}</p>
              </TtsBlock>
              <ol className="worked-steps">
                {example.subgoals.map((subgoal, subIndex) => (
                  <li key={subgoal.label}>
                    <h3>{subgoal.label}</h3>
                    <CodeBlock
                      label={subgoal.label}
                      ttsId={`${stepPrefix}.ex-${index + 1}-step-${subIndex + 1}-code`}
                      explanation={`${subgoal.label}. ${subgoal.why}`}
                    >
                      {subgoal.code}
                    </CodeBlock>
                    <TtsBlock
                      id={`${stepPrefix}.ex-${index + 1}-step-${subIndex + 1}-why`}
                      label={`Explicação: ${subgoal.label}`}
                      text={subgoal.why}
                    >
                      <p>{subgoal.why}</p>
                    </TtsBlock>
                  </li>
                ))}
              </ol>
              <CodeBlock
                label="Saída do programa completo"
                ttsId={`${stepPrefix}.ex-${index + 1}-output`}
                isOutput
              >
                {example.expectedOutput}
              </CodeBlock>
            </div>
          ))}
          {lesson.teaching?.walkthroughs.map((example) => (
            <ExplainedExample key={example.id} example={example} prefix={`${stepPrefix}.walkthrough`} />
          ))}
        </>
      );

    case "misconceptions":
      return (
        <>
          <h2>Onde o raciocínio costuma escapar</h2>
          {lesson.misconceptions.map((item) => (
            <TtsBlock
              as="section"
              className="refutation"
              key={item.tag}
              id={toStableTtsId(stepPrefix, "misconception", item.tag)}
              label={`Ideia a revisar: ${item.claim}`}
              text={`Uma ideia a revisar. ${item.claim} ${item.refutation} O que levar: ${item.correct}`}
            >
              <h3>Uma ideia a revisar</h3>
              <p className="misconception-claim">{item.claim}</p>
              <p>{item.refutation}</p>
              <p>
                <strong>O que levar:</strong> {item.correct}
              </p>
            </TtsBlock>
          ))}
          {lesson.teaching && <EdgeCases teaching={lesson.teaching} prefix={`${stepPrefix}.edge-cases`} />}
        </>
      );

    case "uses":
      return (
        <>
          <h2>Onde isso aparece de verdade</h2>
          {lesson.uses.map((use, index) => (
            <TtsBlock
              as="section"
              className="lesson-use"
              key={use.context}
              id={toStableTtsId(stepPrefix, "use", index + 1, use.context)}
              label={`Onde usar: ${use.context}`}
              text={`${use.context}. ${use.description}`}
            >
              <h3>{use.context}</h3>
              <p>{use.description}</p>
            </TtsBlock>
          ))}
        </>
      );

    case "efficiency":
      return (
        <>
          <h2>Compare formas de resolver</h2>
          <CodeBlock
            label="Versão de referência"
            ttsId={`${stepPrefix}.naive`}
            explanation={`Versão de referência para comparação. Critério: ${lesson.efficiency.criterion}`}
          >
            {lesson.efficiency.naive}
          </CodeBlock>
          <CodeBlock
            label="Alternativa"
            ttsId={`${stepPrefix}.better`}
            explanation={`Versão alternativa para comparação. Critério: ${lesson.efficiency.criterion}`}
          >
            {lesson.efficiency.better}
          </CodeBlock>
          <TtsBlock id={`${stepPrefix}.criterion`} label="Critério de comparação" text={lesson.efficiency.criterion}>
            <p>{lesson.efficiency.criterion}</p>
          </TtsBlock>
          {lesson.teaching && <AiReview teaching={lesson.teaching} prefix={`${stepPrefix}.ai-review`} />}
        </>
      );

    case "summary":
      return (
        <>
          <h2>Conecte as ideias</h2>
          <TtsBlock id={`${stepPrefix}.text`} label="Síntese da aula" text={lesson.summary}>
            <p>{lesson.summary}</p>
          </TtsBlock>
          <h3>Os palpites do começo</h3>
          {lesson.prequestions.map((question) => {
            const answerText = question.modelAnswer ?? "Conclua este resumo para consultar a explicação do seu palpite.";
            return (
              <TtsBlock
                as="section"
                className="question-recap"
                key={question.id}
                id={toStableTtsId(stepPrefix, "recap", question.id)}
                label={`Palpite: ${question.prompt}`}
                text={`${question.prompt} ${answerText}`}
              >
                <strong>{question.prompt}</strong>
                <p>{answerText}</p>
              </TtsBlock>
            );
          })}
        </>
      );

    default:
      return null;
  }
}
