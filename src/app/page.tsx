import { ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check, Layers3, Repeat2 } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { CatalogBrowser } from "@/components/catalog-browser";
import { Suspense } from "react";
import Link from "next/link";
import { getStudyService } from "@/lib/study";

export const dynamic = "force-dynamic";

async function CatalogHome() {
  const subjects = await catalog.listSubjects();
  const [pilot] = process.env.CATALOG_STORAGE === "files" ? [] : await getStudyService().availableLessons();
  const modules = subjects.flatMap((subject) => subject.modules);
  const topicCount = modules.reduce((count, module) => count + module.topics.length, 0);
  return <div className="page-container">
    <div className="page-intro"><div className="breadcrumb"><BookOpen size={15} /> Biblioteca de aprendizado</div><span className="subtle-label">NO SEU RITMO. COM PROPÓSITO.</span></div>
    <section className="hero" aria-labelledby="home-title">
      <div className="hero-copy"><span className="eyebrow"><span className="tiny-line" /> APRENDER É CONSTRUIR</span><h1 id="home-title">Conhecimento que<br />vira <em>base de verdade.</em></h1><p>Um caminho organizado para estudar Engenharia de Software. Entenda os conceitos, conecte as ideias e avance um passo de cada vez.</p><a href="#disciplinas" className="button primary">Encontre sua próxima trilha <ArrowDown size={16} /></a></div>
      <div className="learning-card"><div className="learning-card-top"><span>UM CICLO, NÃO UM ATALHO</span><ArrowUpRight size={17} /></div><div className="learning-step"><span className="step-icon"><BookOpen size={19} /></span><div><strong>Entender</strong><p>O conceito antes do exercício.</p></div><span className="step-number">01</span></div><div className="step-connector" /><div className="learning-step"><span className="step-icon"><Layers3 size={19} /></span><div><strong>Praticar</strong><p>Raciocinar, tentar e aprender com o erro.</p></div><span className="step-number">02</span></div><div className="step-connector" /><div className="learning-step"><span className="step-icon"><Repeat2 size={19} /></span><div><strong>Consolidar</strong><p>Revisitar para não ficar só na memória.</p></div><span className="step-number">03</span></div><div className="learning-card-note"><Check size={13} /> A experiência que estamos construindo.</div></div>
    </section>
    <div className="catalog-summary"><div><strong>{subjects.length.toString().padStart(2, "0")}</strong><span>disciplinas iniciais</span></div><span className="summary-divider" /><div><strong>{modules.length}</strong><span>módulos organizados</span></div><span className="summary-divider" /><div><strong>{topicCount}</strong><span>tópicos planejados</span></div><span className="summary-note">Uma estrutura para crescer<br /><strong>junto com você.</strong></span></div>
    {pilot && <section className="study-banner"><span className="next-chapter-icon"><BookOpen size={23} /></span><div><span className="eyebrow">EXPERIMENTE A AULA PILOTO</span><h2>{pilot.title}</h2><p>Uma aula completa e prática guiada. Conteúdo em revisão.</p></div><Link className="button primary" href={`/estudar/${pilot.topicId}`}>Abrir aula piloto <ArrowRight size={15} /></Link></section>}
    <CatalogBrowser subjects={subjects} />
    <section className="next-chapter"><span className="next-chapter-icon"><Layers3 size={24} /></span><div><span className="eyebrow">PASSO A PASSO</span><h2>Uma plataforma em construção.</h2><p>O primeiro ciclo de aula e prática está tomando forma. Novas aulas e revisão espaçada vêm a seguir.</p></div><a className="text-link" href="/projeto">Veja o que vem a seguir <ArrowRight size={17} /></a></section>
  </div>;
}

export default function HomePage() {
  return <Suspense fallback={<div className="page-container loading-state" role="status"><span className="eyebrow">UM INSTANTE</span><p>Carregando seu espaço de estudos…</p><div className="loading-bar" /></div>}><CatalogHome /></Suspense>;
}
