"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { PublicLesson } from "@/lib/study/public";
import type { LessonView } from "@/lib/study/service";
import { articleSections, layerLabels } from "@/lib/study/labels";
import { toStableTtsId } from "@/lib/study/tts";
import { getExampleIntroText, getLessonEntryIntroText } from "@/lib/study/verification";
import { LessonContent } from "./lesson-content";
import { Glossary } from "./teaching-content";
import { TtsBlock } from "./tts-block";
import { TtsProvider } from "./tts-provider";
import { TtsToolbar } from "./tts-toolbar";

export interface CitedSourceItem {
  key: string;
  title: string;
  url?: string;
  locator: string;
  use: string;
  author?: string;
  edition?: string;
}

export interface TopicLinkItem {
  title: string;
  href: string;
}

export function LessonArticleReader({
  lesson,
  citedSources,
  topicLinks,
  exercises = [],
}: {
  lesson: PublicLesson;
  citedSources: CitedSourceItem[];
  topicLinks: Record<string, TopicLinkItem>;
  exercises?: LessonView["exercises"];
}) {
  const teaching = lesson.teaching;
  const lessonPrefix = toStableTtsId(lesson.id);

  const entryIntro = getLessonEntryIntroText(lesson);
  const exampleIntro = getExampleIntroText(lesson);

  const prerequisitesText = teaching?.prerequisites.length
    ? `O que vem antes. ${teaching.prerequisites
        .map((item) => `${topicLinks[item.topicId]?.title ?? item.topicId}: ${item.reason}`)
        .join(" ")}`
    : `O que vem antes. ${entryIntro}`;

  const sourcesText = teaching
    ? `Fontes e referências. A explicação é autoral. As referências abaixo permitem conferir os conceitos e aprofundar os detalhes. ${citedSources
        .map((source) => `${source.title}, ${source.locator}: ${source.use}.`)
        .join(" ")}`
    : "Fontes e referências. Esta versão anterior não possui referências registradas no formato atual.";

  return (
    <TtsProvider scopeKey={`${lesson.id}:article`}>
      <article className="lesson-reader full-article-content">
        <div className="tts-toolbar-wrap">
          <TtsToolbar />
        </div>

        <section id="objetivos">
          <h2>O que você vai conseguir explicar</h2>
          <TtsBlock
            id={`${lessonPrefix}.objetivos`}
            label="Objetivos da aula"
            text={`O que você vai conseguir explicar. ${exampleIntro} ${lesson.objectives.join(" ")}`}
          >
            <p>{exampleIntro}</p>
            <ul>
              {lesson.objectives.map((objective) => (
                <li key={objective}>{objective}</li>
              ))}
            </ul>
          </TtsBlock>

          <TtsBlock
            id={`${lessonPrefix}.prerequisitos`}
            label="O que vem antes"
            text={prerequisitesText}
          >
            <h3>O que vem antes</h3>
            {teaching?.prerequisites.length ? (
              <ul>
                {teaching.prerequisites.map((item) => (
                  <li key={item.topicId}>
                    <Link href={topicLinks[item.topicId]?.href ?? "/"}>
                      {topicLinks[item.topicId]?.title ?? item.topicId}
                    </Link>{" "}
                    — {item.reason}
                  </li>
                ))}
              </ul>
            ) : (
              <p>{entryIntro}</p>
            )}
          </TtsBlock>
        </section>

        {Boolean(lesson.layerSections?.length) && (
          <section id="camadas">
            <h2>Camadas de aprofundamento (C1–C3)</h2>
            <p className="layer-intro">
              Cada camada pode ser estudada independentemente. Nos pilotos, a atividade C1 pode ser aberta diretamente
              durante a leitura (sem marcar etapas do estudo guiado), enquanto C2 e C3 ficam disponíveis após concluir
              esta versão da aula.
            </p>
            <div className="layer-section-list">
              {lesson.layerSections?.map((layerSection) => {
                const directExercise = exercises.find(
                  (ex) => ex.allowDirectPractice && ex.layer === layerSection.layer,
                );
                const speechText = [
                  layerSection.title,
                  layerSection.summary,
                  ...layerSection.explanation,
                  ...(layerSection.callout ? [`${layerSection.callout.label}: ${layerSection.callout.text}`] : []),
                ].join(" ");
                return (
                  <TtsBlock
                    key={layerSection.id}
                    className={`layer-section-card ${layerSection.isComplementary ? "complementary" : ""}`}
                    id={toStableTtsId(lessonPrefix, "camada", layerSection.id)}
                    label={layerSection.title}
                    text={speechText}
                  >
                    <div className="layer-section-header">
                      <span className="status-pill">{layerLabels[layerSection.layer]}</span>
                      {layerSection.isComplementary && (
                        <span className="layer-badge-complementary">Explicação complementar</span>
                      )}
                    </div>
                    <h3>{layerSection.title}</h3>
                    <p className="layer-summary">{layerSection.summary}</p>
                    {layerSection.explanation.map((paragraph, idx) => (
                      <p key={idx}>{paragraph}</p>
                    ))}
                    {layerSection.callout && (
                      <div className="layer-callout">
                        <strong>{layerSection.callout.label}: </strong>
                        <span>{layerSection.callout.text}</span>
                      </div>
                    )}
                    <div className="layer-section-action">
                      {directExercise ? (
                        <Link
                          className="button primary"
                          href={`/estudar/${lesson.topicId}?version=${lesson.version}&mode=practice&exercise=${directExercise.id}`}
                        >
                          Praticar {layerSection.layer}: {directExercise.title} <ArrowRight size={16} />
                        </Link>
                      ) : (
                        <small>
                          Atividades desta camada abrem no Estudo Guiado após concluir esta versão da aula (sem exigir
                          acerto prévio em C1).
                        </small>
                      )}
                    </div>
                  </TtsBlock>
                );
              })}
            </div>
          </section>
        )}

        {teaching && (
          <section id="vocabulario">
            <Glossary teaching={teaching} prefix={`${lessonPrefix}.vocabulario`} />
          </section>
        )}

        {articleSections.map((section) => (
          <section id={section.id} key={section.id}>
            <LessonContent lesson={lesson} step={section.id} />
          </section>
        ))}

        <section id="conexoes">
          <h2>Do básico ao que vem depois</h2>
          <TtsBlock id={`${lessonPrefix}.conexoes.resumo`} label="Resumo final" text={lesson.summary}>
            <p>{lesson.summary}</p>
          </TtsBlock>
          {teaching?.advancedConnections.map((connection) => (
            <TtsBlock
              className="advanced-connection"
              key={connection.title}
              id={toStableTtsId(lessonPrefix, "conexao", connection.title)}
              label={`Próximos passos: ${connection.title}`}
              text={`${connection.title}. ${connection.explanation} Cuidado: ${connection.caution}`}
            >
              <h3>{connection.title}</h3>
              <p>{connection.explanation}</p>
              <p className="connection-caution">{connection.caution}</p>
              <ul>
                {connection.topicIds.map((id) => (
                  <li key={id}>
                    <Link href={topicLinks[id]?.href ?? "/"}>{topicLinks[id]?.title ?? id}</Link>
                  </li>
                ))}
              </ul>
            </TtsBlock>
          ))}
        </section>

        <section id="fontes">
          <h2>Fontes e referências</h2>
          <TtsBlock id={`${lessonPrefix}.fontes`} label="Fontes e referências" text={sourcesText}>
            <p>
              A explicação é autoral. As referências abaixo permitem conferir os conceitos e aprofundar os detalhes.
            </p>
            <ul className="source-list">
              {citedSources.map((source) => (
                <li key={source.key}>
                  <strong>
                    {source.url ? (
                      <a href={source.url} target="_blank" rel="noreferrer">
                        {source.title}
                      </a>
                    ) : (
                      source.title
                    )}
                  </strong>
                  <p>
                    {source.locator} — {source.use}
                  </p>
                  {source.author && (
                    <small>
                      {source.author} · {source.edition}
                    </small>
                  )}
                </li>
              ))}
            </ul>
            {!teaching && <p>Esta versão anterior não possui referências registradas no formato atual.</p>}
          </TtsBlock>
        </section>

        <div className="article-practice-cta">
          <h2>Agora explique e pratique.</h2>
          <p>O percurso guiado registra suas respostas e permite retomar o estudo depois.</p>
          <Link className="button primary" href={`/estudar/${lesson.topicId}?version=${lesson.version}`}>
            Abrir estudo guiado <ArrowRight size={16} />
          </Link>
        </div>
      </article>
    </TtsProvider>
  );
}
