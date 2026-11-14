import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getStudyService } from "@/lib/study";
import { catalog } from "@/lib/catalog";
import { loadSources } from "@/lib/content/load-sources";
import { articleSections, levelLabels } from "@/lib/study/labels";
import {
  LessonArticleReader,
  type CitedSourceItem,
  type TopicLinkItem,
} from "@/components/study/lesson-article-reader";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leitura completa" };

export default async function LessonArticle({ params }: { params: Promise<{ topicId: string }> }) {
  const result = await getStudyService().lesson((await params).topicId);
  if (!result) notFound();
  const { lesson, exercises } = result;
  const teaching = lesson.teaching;
  const sources = await loadSources();
  const subjects = await catalog.listSubjects();
  const available = new Set((await getStudyService().availableLessons()).map((item) => item.topicId));

  const topicLinks: Record<string, TopicLinkItem> = Object.fromEntries(
    subjects.flatMap((subject) =>
      subject.modules.flatMap((item) =>
        item.topics.map((topic) => [
          topic.id,
          {
            title: topic.title,
            href: available.has(topic.id) ? `/aulas/${topic.id}` : `/disciplinas/${subject.slug}/${topic.slug}`,
          },
        ]),
      ),
    ),
  );

  const citedSources: CitedSourceItem[] = (teaching?.sources ?? []).map((citation) => {
    const source = sources.find((item) => item.id === citation.sourceId);
    return {
      key: `${citation.sourceId}:${citation.locator}`,
      title: source?.title ?? citation.sourceId,
      url: source?.url,
      locator: citation.locator,
      use: citation.use,
      author: source?.author,
      edition: source?.edition,
    };
  });

  return (
    <div className="page-container full-lesson-page">
      <Link className="back-link" href="/aulas">
        <ArrowLeft size={16} /> Todas as aulas
      </Link>
      <header className="detail-header">
        <span className="eyebrow">{teaching ? levelLabels[teaching.level] : "Aula de estudo"} · LEITURA COMPLETA</span>
        <h1>{lesson.title}</h1>
        <p>Leia o conteúdo, acompanhe os exemplos e confira o que cada linha faz.</p>
        <div className="detail-meta">
          <span className="status-pill">Versão {lesson.version} · Em revisão</span>
          <Link className="text-link" href={`/estudar/${lesson.topicId}?version=${lesson.version}`}>
            Estudo guiado e {exercises.length} exercícios <ArrowRight size={16} />
          </Link>
        </div>
      </header>
      <div className="notice">
        <BookOpen size={18} />
        <p>
          Os exemplos foram verificados automaticamente. A avaliação pedagógica humana ainda está pendente. Ler esta
          página não marca a aula como concluída.
        </p>
      </div>
      <div className="full-lesson-layout">
        <nav className="article-nav" aria-label="Nesta aula">
          <span className="eyebrow">NESTA AULA</span>
          <ul>
            <li>
              <a href="#objetivos">Objetivos e pré-requisitos</a>
            </li>
            {teaching && (
              <li>
                <a href="#vocabulario">Vocabulário</a>
              </li>
            )}
            {articleSections.map((section) => (
              <li key={section.id}>
                <a href={`#${section.id}`}>{section.label}</a>
              </li>
            ))}
            <li>
              <a href="#conexoes">Próximos passos</a>
            </li>
            <li>
              <a href="#fontes">Fontes da aula</a>
            </li>
          </ul>
        </nav>
        <LessonArticleReader lesson={lesson} citedSources={citedSources} topicLinks={topicLinks} />
      </div>
    </div>
  );
}
