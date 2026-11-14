"use client";

import type { Teaching, ExplainedExample as Example } from "@/lib/study/teaching-schema";
import { kindLabels } from "@/lib/study/labels";
import { formatCodeForLiteralTts, formatTableForTts, toStableTtsId } from "@/lib/study/tts";
import { CodeBlock } from "./code-block";
import { TtsBlock } from "./tts-block";

export function ExplainedExample({ example, prefix }: { example: Example; prefix?: string }) {
  const baseId = toStableTtsId(prefix ?? "example", example.id);
  const outputValue =
    example.expectedError ?? (example.expectedOutput === "" ? "(sem saída)" : example.expectedOutput ?? "");

  return (
    <section className="explained-example">
      <TtsBlock
        id={`${baseId}.intro`}
        label={`Exemplo: ${example.title}`}
        text={`${example.title}. ${example.purpose}`}
      >
        <h3>{example.title}</h3>
        <p>{example.purpose}</p>
      </TtsBlock>

      <CodeBlock
        label="Código completo"
        ttsId={`${baseId}.code`}
        explanation={example.purpose}
        lineNotes={example.lineNotes}
        expectedOutput={example.expectedOutput}
        expectedError={example.expectedError}
      >
        {example.code}
      </CodeBlock>

      {example.stdin !== undefined && (
        <CodeBlock label="Entrada simulada" ttsId={`${baseId}.stdin`} isOutput>
          {example.stdin.replace(/\n$/, "")}
        </CodeBlock>
      )}

      <CodeBlock
        label={example.expectedError ? "Falha intencional esperada" : "Saída esperada"}
        ttsId={`${baseId}.output`}
        isOutput
      >
        {outputValue}
      </CodeBlock>

      <TtsBlock
        id={`${baseId}.lines`}
        label={`Explicação por linha: ${example.title}`}
        text={`O que cada linha faz. ${example.lineNotes.map((note) => `Linha ${note.line}: ${note.explanation}`).join(" ")}`}
      >
        <h4>O que cada linha faz</h4>
        <ol className="line-explanations">
          {example.lineNotes.map((note) => (
            <li key={note.line}>
              <span>Linha {note.line}</span>
              <p>{note.explanation}</p>
            </li>
          ))}
        </ol>
      </TtsBlock>

      <TtsBlock id={`${baseId}.takeaway`} label={`Conclusão do exemplo: ${example.title}`} text={example.takeaway}>
        <p className="example-takeaway">{example.takeaway}</p>
      </TtsBlock>
    </section>
  );
}

export function CommandReference({ teaching, prefix = "commands" }: { teaching: Teaching; prefix?: string }) {
  return (
    <div className="command-reference">
      <TtsBlock
        id={toStableTtsId(prefix, "intro")}
        label="Comandos e sintaxe, sem pular etapas"
        text="Comandos e sintaxe, sem pular etapas. Primeiro entenda a finalidade e a forma geral. Depois acompanhe um programa completo, sua saída e cada linha."
      >
        <h2>Comandos e sintaxe, sem pular etapas</h2>
        <p>Primeiro entenda a finalidade e a forma geral. Depois acompanhe um programa completo, sua saída e cada linha.</p>
      </TtsBlock>

      {teaching.commands.map((command) => {
        const cmdPrefix = toStableTtsId(prefix, command.name);
        return (
          <section className="command-entry" key={command.name}>
            <TtsBlock
              id={`${cmdPrefix}.overview`}
              label={`Comando: ${command.name}`}
              getText={(mode) => {
                const syntaxPart =
                  mode === "literal"
                    ? formatCodeForLiteralTts(command.syntax, "Forma geral")
                    : `Forma geral: ${command.syntax}.`;
                return `${kindLabels[command.kind]}: ${command.name}. ${syntaxPart} ${command.explanation} Quando usar: ${command.whenToUse}`;
              }}
            >
              <span className="activity-type">{kindLabels[command.kind]}</span>
              <h3>{command.name}</h3>
              <pre className="syntax-reference">
                <code>{command.syntax}</code>
              </pre>
              <p>{command.explanation}</p>
              <p>
                <strong>Quando usar:</strong> {command.whenToUse}
              </p>
            </TtsBlock>

            <TtsBlock
              id={`${cmdPrefix}.pitfalls`}
              label={`Cuidados com ${command.name}`}
              text={`Cuidados com ${command.name}. ${command.pitfalls.join(" ")}`}
            >
              <h4>Cuidados</h4>
              <ul>
                {command.pitfalls.map((pitfall) => (
                  <li key={pitfall}>{pitfall}</li>
                ))}
              </ul>
            </TtsBlock>

            {command.examples.map((example) => (
              <ExplainedExample key={example.id} example={example} prefix={cmdPrefix} />
            ))}
          </section>
        );
      })}
    </div>
  );
}

export function Glossary({ teaching, prefix = "glossary" }: { teaching: Teaching; prefix?: string }) {
  return (
    <section className="lesson-glossary">
      <h2>Vocabulário da aula</h2>
      <dl>
        {teaching.glossary.map((item) => (
          <div key={item.term}>
            <dt>{item.term}</dt>
            <dd>
              <TtsBlock
                id={toStableTtsId(prefix, item.term)}
                label={`Termo: ${item.term}`}
                text={`${item.term}. ${item.meaning} Exemplo: ${item.example}`}
              >
                <p>{item.meaning}</p>
                <p className="glossary-example">{item.example}</p>
              </TtsBlock>
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function EdgeCases({ teaching, prefix = "edge-cases" }: { teaching: Teaching; prefix?: string }) {
  return (
    <section>
      <h2>Casos de fronteira e situações específicas</h2>
      {teaching.edgeCases.map((item) => {
        const itemPrefix = toStableTtsId(prefix, item.title);
        return (
          <section key={item.title}>
            <TtsBlock
              id={`${itemPrefix}.explanation`}
              label={`Caso específico: ${item.title}`}
              text={`${item.title}. ${item.explanation}`}
            >
              <h3>{item.title}</h3>
              <p>{item.explanation}</p>
            </TtsBlock>
            <ExplainedExample example={item.example} prefix={itemPrefix} />
          </section>
        );
      })}
    </section>
  );
}

export function AiReview({ teaching, prefix = "ai-review" }: { teaching: Teaching; prefix?: string }) {
  return (
    <section>
      <TtsBlock
        id={toStableTtsId(prefix, "intro")}
        label="Como revisar uma solução de IA"
        text="Como revisar uma solução de IA. Este é um exemplo autoral de falha plausível. A explicação da IA não substitui a comparação com o requisito e os testes."
      >
        <h2>Como revisar uma solução de IA</h2>
        <p>Este é um exemplo autoral de falha plausível. A explicação da IA não substitui a comparação com o requisito e os testes.</p>
      </TtsBlock>

      {teaching.aiReview.map((item) => {
        const itemPrefix = toStableTtsId(prefix, item.title);
        return (
          <section className="ai-review-case" key={item.title}>
            <TtsBlock
              id={`${itemPrefix}.request`}
              label={`Caso de revisão: ${item.title}`}
              text={`${item.title}. O pedido: ${item.request}`}
            >
              <h3>{item.title}</h3>
              <p className="requirement-callout">
                <strong>O pedido:</strong> {item.request}
              </p>
            </TtsBlock>

            <h4>O código que precisa ser investigado</h4>
            <ExplainedExample example={item.generated} prefix={`${itemPrefix}.generated`} />

            <TtsBlock
              id={`${itemPrefix}.diagnosis`}
              label={`Diagnóstico: ${item.title}`}
              text={`Diagnóstico. ${item.diagnosis.join(" ")}`}
            >
              <h4>Diagnóstico</h4>
              <ul>
                {item.diagnosis.map((finding) => (
                  <li key={finding}>{finding}</li>
                ))}
              </ul>
            </TtsBlock>

            <h4>Uma correção explicada</h4>
            <ExplainedExample example={item.correction} prefix={`${itemPrefix}.correction`} />

            <TtsBlock
              id={`${itemPrefix}.checks`}
              label={`Tabela de verificação: ${item.title}`}
              text={formatTableForTts(
                "Como conferir a correção",
                ["Cenário", "Esperado", "O que verifica"],
                item.acceptanceChecks.map((check) => [check.scenario, check.expected, check.why]),
              )}
            >
              <h4>Como conferir a correção</h4>
              <div className="table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Cenário</th>
                      <th scope="col">Esperado</th>
                      <th scope="col">O que verifica</th>
                    </tr>
                  </thead>
                  <tbody>
                    {item.acceptanceChecks.map((check) => (
                      <tr key={check.scenario}>
                        <td>{check.scenario}</td>
                        <td>{check.expected}</td>
                        <td>{check.why}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TtsBlock>
          </section>
        );
      })}

      <TtsBlock
        id={toStableTtsId(prefix, "checklist")}
        label="Checklist para acompanhar um projeto"
        text={`Checklist para acompanhar um projeto. ${teaching.reviewChecklist.join(" ")}`}
      >
        <h3>Checklist para acompanhar um projeto</h3>
        <ul>
          {teaching.reviewChecklist.map((check) => (
            <li key={check}>{check}</li>
          ))}
        </ul>
      </TtsBlock>
    </section>
  );
}
