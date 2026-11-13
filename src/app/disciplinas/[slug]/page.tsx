import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Flag, Layers3 } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { SUBJECT_LIFECYCLE_LABELS } from "@/lib/catalog/filter";
import type { CatalogSubject, SubjectLifecycleStatus } from "@/lib/catalog/types";
import { getStudyService } from "@/lib/study";
import { levelLabels } from "@/components/study/teaching-content";

export const dynamic = "force-dynamic";

const lifecycleClassNames: Record<SubjectLifecycleStatus, string> = {
  IN_PROGRESS: "lifecycle-in-progress",
  PAUSED: "lifecycle-paused",
  UPCOMING: "lifecycle-upcoming",
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const subject = await catalog.findSubject((await params).slug);
  return { title: subject?.name ?? "Disciplina não encontrada" };
}

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const subject = await catalog.findSubject((await params).slug);
  if (!subject) notFound();
  const allSubjects = await catalog.listSubjects();
  const subjectBySlug = new Map(allSubjects.map((item) => [item.slug, item]));
  const available = new Set(process.env.CATALOG_STORAGE === "files" ? [] : (await getStudyService().availableLessons()).map((lesson) => lesson.topicId));
  const totalTopics = subject.modules.flatMap((module) => module.topics);
  const availableInSubject = totalTopics.filter((topic) => available.has(topic.id)).length;
  const relatedSubjects = (subject.academicTrack?.relatedSubjects ?? [])
    .map((relatedSlug) => subjectBySlug.get(relatedSlug))
    .filter((item): item is CatalogSubject => Boolean(item));
  return <div className={`page-container detail-page accent-${subject.accent}`}>
    <Link href="/" className="back-link"><ArrowLeft size={16} /> Todas as disciplinas</Link>
    <header className="detail-header"><div className="subject-icon"><BookOpen size={28} /></div><span className="eyebrow">TRILHA DE APRENDIZAGEM</span><h1>{subject.name}</h1><p>{subject.description}</p><div className="detail-meta"><span>{subject.modules.length} módulos</span><span>{totalTopics.length} tópicos</span><span className={`lifecycle-pill ${lifecycleClassNames[subject.lifecycleStatus]}`}>{SUBJECT_LIFECYCLE_LABELS[subject.lifecycleStatus]}</span><span className="status-pill">{availableInSubject > 0 ? `${availableInSubject} ${availableInSubject === 1 ? "aula disponível" : "aulas disponíveis"}` : "Conteúdo planejado"}</span></div></header>
    {subject.academicTrack && <section className="academic-track-banner" aria-label="Enquadramento no período acadêmico">
      <span className="eyebrow"><Layers3 size={14} /> PERÍODO {subject.academicTrack.period} · NÍVEL 1</span>
      <h2>{subject.academicTrack.courseName}</h2>
      {subject.academicTrack.scopeNote && <p>{subject.academicTrack.scopeNote}</p>}
      <p className="academic-track-disclaimer">Esta disciplina está <strong>{SUBJECT_LIFECYCLE_LABELS[subject.lifecycleStatus]}</strong> no planejamento do período {subject.academicTrack.period}. Os tópicos permanecem como <strong>Planejado</strong> até que cada aula e bateria de exercícios sejam redigidas.</p>
      {relatedSubjects.length > 0 && <div className="period-support"><span>Trilhas correlatas no catálogo:</span>{relatedSubjects.map((related) => <Link key={related.slug} href={`/disciplinas/${related.slug}`}>{related.name}</Link>)}</div>}
    </section>}
    <div className="notice"><BookOpen size={18} /><p>Este é o plano curricular da disciplina. Abra um tópico para explorar os objetivos e acessar a aula quando houver uma versão disponível.</p></div>
    {subject.overview && <section className="subject-overview"><h2>Entenda a disciplina desde a base</h2>{subject.overview.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</section>}
    <section className="outcomes"><span className="eyebrow">O QUE ESTA TRILHA VAI DESENVOLVER</span><ul>{subject.learningOutcomes.map((outcome) => <li key={outcome}><Check size={17} /><span>{outcome}</span></li>)}</ul></section>
    <div className="section-heading"><div><span className="eyebrow">UM PASSO DE CADA VEZ</span><h2>O caminho da disciplina</h2></div><span className="count-label">{subject.modules.length} módulos</span></div>
    <div className="module-list">{subject.modules.map((module, index) => <section key={module.id} className="module-card"><header className="module-header"><span className="module-index">{(index + 1).toString().padStart(2, "0")}</span><div><h3>{module.title}</h3><p>{module.description}</p></div></header>{module.guide && <div className="module-guide"><span className="status-pill">{levelLabels[module.guide.level]}</span>{module.guide.introduction.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{module.guide.assumedKnowledge.length > 0 && <p><strong>Base necessária:</strong> {module.guide.assumedKnowledge.join("; ")}.</p>}<details><summary>O que revisar numa solução de IA</summary><ul>{module.guide.aiReviewChecklist.map((check) => <li key={check}>{check}</li>)}</ul></details></div>}<ol className="topic-list">{module.topics.map((topic) => <li key={topic.id}><Link href={`/disciplinas/${subject.slug}/${topic.slug}`}><span className="topic-bullet" /><div><strong>{topic.title}</strong><p>{topic.summary}</p></div><span className="topic-status">{available.has(topic.id) ? "Aula disponível" : "Planejado"}</span><ArrowRight size={17} /></Link></li>)}</ol><details className="module-project"><summary><Flag size={15} /> Projeto futuro do módulo</summary><div><p>{module.project.brief}</p><h4>Entregáveis previstos</h4><ul>{module.project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul><h4>Critérios de aceitação</h4><ul>{module.project.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul></div></details></section>)}</div>
  </div>;
}
