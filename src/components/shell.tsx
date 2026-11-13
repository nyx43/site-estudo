"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, Compass, Layers3, Map, Sprout } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return <div className="app-shell">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <aside className="sidebar" aria-label="Navegação principal">
      <Link href="/" className="brand" aria-label="Estudo ES — início">
        <span className="brand-icon"><Layers3 size={23} strokeWidth={1.7} /></span>
        <span>estudo<span className="brand-dot">.</span><small>ENGENHARIA DE SOFTWARE</small></span>
      </Link>
      <div className="nav-label">SEU ESPAÇO DE APRENDIZADO</div>
      <nav>
        <Link href="/" className={`nav-item ${pathname === "/" || pathname.startsWith("/disciplinas") ? "active" : ""}`} aria-current={pathname === "/" || pathname.startsWith("/disciplinas") ? "page" : undefined}><BookOpen size={19} /> Disciplinas <span className="nav-active-dot" /></Link>
        <Link href="/projeto" className={`nav-item ${pathname === "/projeto" ? "active" : ""}`} aria-current={pathname === "/projeto" ? "page" : undefined}><Map size={19} /> O caminho do projeto</Link>
      </nav>
      <div className="sidebar-note"><span className="note-icon"><Sprout size={21} /></span><strong>Uma base de cada vez.</strong><p>Entender o conceito.<br />Praticar com intenção.<br />Voltar para consolidar.</p><Link href="/projeto">Conheça a proposta <ArrowUpRight size={15} /></Link></div>
      <div className="sidebar-footer"><Compass size={16} /><span>Um projeto em evolução<small>Feito para aprender de verdade.</small></span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><span>Seu espaço de estudos</span><span className="version-pill"><span /> Primeira versão</span></header>
      <main id="conteudo" tabIndex={-1}>{children}</main>
      <footer className="page-footer"><span>estudo. <span>Aprendizado que se constrói.</span></span><span>Engenharia de Software</span></footer>
    </div>
  </div>;
}
