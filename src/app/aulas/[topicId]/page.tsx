import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
import { getStudyService } from "@/lib/study";
import { catalog } from "@/lib/catalog";
import { loadSources } from "@/lib/content/load-sources";
import { LessonContent } from "@/components/study/lesson-content";
import { Glossary, levelLabels } from "@/components/study/teaching-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Leitura completa" };
const sections = [
  { id: "why", label: "Por que aprender" }, { id: "mental-model", label: "Modelo mental" },
  { id: "concept", label: "Comandos e sintaxe" }, { id: "worked-example", label: "Exemplos por linha" },
  { id: "misconceptions", label: "Erros e casos específicos" }, { id: "uses", label: "Onde aplicar" },
  { id: "efficiency", label: "Revisar código de IA" },
] as const;

export default async function LessonArticle({ params }: { params: Promise<{ topicId: string }> }) {
  const result = await getStudyService().lesson((await params).topicId);
  if (!result) notFound();
  const { lesson, exercises } = result;
  const teaching = lesson.teaching;
  const sources = await loadSources();
  const subjects = await catalog.listSubjects();
  const available = new Set((await getStudyService().availableLessons()).map((item) => item.topicId));
  const topics = new Map(subjects.flatMap((subject) => subject.modules.flatMap((item) => item.topics.map((topic) => [topic.id, { title: topic.title, href: available.has(topic.id) ? `/aulas/${topic.id}` : `/disciplinas/${subject.slug}/${topic.slug}` }] as const))));
  return <div className="page-container full-lesson-page"><Link className="back-link" href="/aulas"><ArrowLeft size={16} /> Todas as aulas</Link><header className="detail-header"><span className="eyebrow">{teaching ? levelLabels[teaching.level] : "Aula de estudo"} · LEITURA COMPLETA</span><h1>{lesson.title}</h1><p>Leia o conteúdo, acompanhe os exemplos e confira o que cada linha faz.</p><div className="detail-meta"><span className="status-pill">Versão {lesson.version} · Em revisão</span><Link className="text-link" href={`/estudar/${lesson.topicId}?version=${lesson.version}`}>Estudo guiado e {exercises.length} exercícios <ArrowRight size={16} /></Link></div></header><div className="notice"><BookOpen size={18} /><p>Os exemplos foram verificados automaticamente. A avaliação pedagógica humana ainda está pendente. Ler esta página não marca a aula como concluída.</p></div><div className="full-lesson-layout"><nav className="article-nav" aria-label="Nesta aula"><span className="eyebrow">NESTA AULA</span><ul><li><a href="#objetivos">Objetivos e pré-requisitos</a></li>{teaching && <li><a href="#vocabulario">Vocabulário</a></li>}{sections.map((section) => <li key={section.id}><a href={`#${section.id}`}>{section.label}</a></li>)}<li><a href="#conexoes">Próximos passos</a></li><li><a href="#fontes">Fontes da aula</a></li></ul></nav><article className="lesson-reader full-article-content"><section id="objetivos"><h2>O que você vai conseguir explicar</h2><p>Os exemplos atuais são programas independentes em Python 3. Acompanhe a entrada, o estado de cada linha e a saída esperada. A página não executa seu código.</p><ul>{lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}</ul><h3>O que vem antes</h3>{teaching?.prerequisites.length ? <ul>{teaching.prerequisites.map((item) => <li key={item.topicId}><Link href={topics.get(item.topicId)?.href ?? "/"}>{topics.get(item.topicId)?.title ?? item.topicId}</Link> — {item.reason}</li>)}</ul> : <p>Esta é uma aula de entrada. Não pressupõe experiência anterior com programação.</p>}</section>{teaching && <section id="vocabulario"><Glossary teaching={teaching} /></section>}{sections.map((section) => <section id={section.id} key={section.id}><LessonContent lesson={lesson} step={section.id} /></section>)}<section id="conexoes"><h2>Do básico ao que vem depois</h2><p>{lesson.summary}</p>{teaching?.advancedConnections.map((connection) => <div className="advanced-connection" key={connection.title}><h3>{connection.title}</h3><p>{connection.explanation}</p><p className="connection-caution">{connection.caution}</p><ul>{connection.topicIds.map((id) => <li key={id}><Link href={topics.get(id)?.href ?? "/"}>{topics.get(id)?.title ?? id}</Link></li>)}</ul></div>)}</section><section id="fontes"><h2>Fontes e referências</h2><p>A explicação é autoral. As referências abaixo permitem conferir os conceitos e aprofundar os detalhes.</p><ul className="source-list">{teaching?.sources.map((citation) => {
      const source = sources.find((item) => item.id === citation.sourceId);
      return <li key={`${citation.sourceId}:${citation.locator}`}><strong>{source?.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title}</a> : source?.title ?? citation.sourceId}</strong><p>{citation.locator} — {citation.use}</p>{source && <small>{source.author} · {source.edition}</small>}</li>;
    })}</ul>{!teaching && <p>Esta versão anterior não possui referências registradas no formato atual.</p>}</section><div className="article-practice-cta"><h2>Agora explique e pratique.</h2><p>O percurso guiado registra suas respostas e permite retomar o estudo depois.</p><Link className="button primary" href={`/estudar/${lesson.topicId}?version=${lesson.version}`}>Abrir estudo guiado <ArrowRight size={16} /></Link></div></article></div></div>;
}
