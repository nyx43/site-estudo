import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Check, CircleHelp, Flag, ListChecks, Route } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { getStudyService } from "@/lib/study";

export const dynamic = "force-dynamic";

const activityLabels = {
  MISCONCEPTION_QUIZ: "Quiz de equívocos", PARSONS: "Ordenação de blocos", ERRONEOUS_EXAMPLE: "Análise de exemplos com erro",
  PRIMM_PREDICT: "Previsão de resultado", TRANSFER_CHALLENGE: "Desafio de transferência",
};

export default async function TopicPage({ params }: { params: Promise<{ slug: string; topic: string }> }) {
  const { slug, topic: topicSlug } = await params;
  const result = await catalog.findTopic(`${slug}.${topicSlug}`);
  if (!result) notFound();
  const { subject, module, topic } = result;
  const studyLesson = process.env.CATALOG_STORAGE === "files" ? null : await getStudyService().lesson(topic.id);
  const prerequisites = await Promise.all(topic.plan.prerequisites.map((id) => catalog.findTopic(id)));
  return <div className={`page-container detail-page accent-${subject.accent}`}>
    <Link href={`/disciplinas/${subject.slug}`} className="back-link"><ArrowLeft size={16} /> {subject.name}</Link>
    <header className="detail-header"><span className="eyebrow">{module.title}</span><h1>{topic.title}</h1><p>{topic.summary}</p><span className="status-pill">Plano da aula · Em preparação</span></header>
    {studyLesson ? <div className="study-banner"><div><span className="eyebrow">AULA PILOTO DISPONÍVEL</span><h2>Do conceito à prática.</h2><p>Explore a aula e os {studyLesson.exercises.length} exercícios. Conteúdo em revisão pedagógica.</p></div><Link className="button primary" href={`/estudar/${topic.id}`}>{studyLesson.progress.completedAt ? "Retomar a prática" : "Abrir aula piloto"}</Link></div> : <div className="notice"><BookOpen size={18} /><p>Você está consultando o planejamento deste tópico. A aula e os exercícios ainda não estão disponíveis para estudo.</p></div>}
    <div className="topic-plan-grid">
      <section className="plan-panel"><h2><Flag size={20} /> Objetivos de aprendizagem</h2><ul className="check-list">{topic.plan.objectives.map((objective) => <li key={objective}><Check size={16} /><span>{objective}</span></li>)}</ul></section>
      <section className="plan-panel"><h2><Route size={20} /> Antes deste tópico</h2>{prerequisites.length ? <ul className="prerequisite-list">{prerequisites.map((item) => item && <li key={item.topic.id}><Link href={`/disciplinas/${item.subject.slug}/${item.topic.slug}`}>{item.topic.title}<span>{item.subject.name}</span></Link></li>)}</ul> : <p>Nenhum pré-requisito cadastrado. Este é um dos pontos de entrada da trilha.</p>}</section>
      <section className="plan-panel"><h2><BookOpen size={20} /> Roteiro previsto</h2><ol className="outline-list">{topic.plan.lessonOutline.map((item) => <li key={item}>{item}</li>)}</ol></section>
      <section className="plan-panel misconception-panel"><h2><CircleHelp size={20} /> Equívocos a investigar</h2><p className="panel-caption">A aula deverá explicar e corrigir estas confusões.</p><ul>{topic.plan.misconceptions.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="plan-panel"><h2><ListChecks size={20} /> Prática planejada</h2>{topic.plan.activities.map((activity, index) => <div className="activity-plan" key={index}><span className="activity-type">{activityLabels[activity.type]}</span><p>{activity.description}</p></div>)}</section>
      <section className="plan-panel"><h2><Check size={20} /> Como verificar a aprendizagem</h2><ul className="check-list">{topic.plan.acceptanceCriteria.map((item) => <li key={item}><Check size={16} /><span>{item}</span></li>)}</ul></section>
    </div>
  </div>;
}
