import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, BookOpen, Check, Flag } from "lucide-react";
import { catalog } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const subject = await catalog.findSubject((await params).slug);
  return { title: subject?.name ?? "Disciplina não encontrada" };
}

export default async function SubjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const subject = await catalog.findSubject((await params).slug);
  if (!subject) notFound();
  return <div className={`page-container detail-page accent-${subject.accent}`}>
    <Link href="/" className="back-link"><ArrowLeft size={16} /> Todas as disciplinas</Link>
    <header className="detail-header"><div className="subject-icon"><BookOpen size={28} /></div><span className="eyebrow">TRILHA DE APRENDIZAGEM</span><h1>{subject.name}</h1><p>{subject.description}</p><div className="detail-meta"><span>{subject.modules.length} módulos</span><span>{subject.modules.flatMap((module) => module.topics).length} tópicos</span><span className="status-pill">Conteúdo planejado</span></div></header>
    <div className="notice"><BookOpen size={18} /><p>Este é o plano curricular da disciplina. Abra um tópico para explorar os objetivos e acessar a aula quando houver uma versão disponível.</p></div>
    <section className="outcomes"><span className="eyebrow">O QUE ESTA TRILHA VAI DESENVOLVER</span><ul>{subject.learningOutcomes.map((outcome) => <li key={outcome}><Check size={17} /><span>{outcome}</span></li>)}</ul></section>
    <div className="section-heading"><div><span className="eyebrow">UM PASSO DE CADA VEZ</span><h2>O caminho da disciplina</h2></div><span className="count-label">{subject.modules.length} módulos</span></div>
    <div className="module-list">{subject.modules.map((module, index) => <section key={module.id} className="module-card"><header className="module-header"><span className="module-index">{(index + 1).toString().padStart(2, "0")}</span><div><h3>{module.title}</h3><p>{module.description}</p></div></header><ol className="topic-list">{module.topics.map((topic) => <li key={topic.id}><Link href={`/disciplinas/${subject.slug}/${topic.slug}`}><span className="topic-bullet" /><div><strong>{topic.title}</strong><p>{topic.summary}</p></div><span className="topic-status">Planejado</span><ArrowRight size={17} /></Link></li>)}</ol><details className="module-project"><summary><Flag size={15} /> Projeto futuro do módulo</summary><div><p>{module.project.brief}</p><h4>Entregáveis previstos</h4><ul>{module.project.deliverables.map((item) => <li key={item}>{item}</li>)}</ul><h4>Critérios de aceitação</h4><ul>{module.project.acceptanceCriteria.map((item) => <li key={item}>{item}</li>)}</ul></div></details></section>)}</div>
  </div>;
}
