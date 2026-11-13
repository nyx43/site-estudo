"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, BookOpen, Compass, Layers3, Map, Moon, Sprout, Sun } from "lucide-react";

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const lessonsActive = pathname.startsWith("/aulas") || pathname.startsWith("/estudar");
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
        <Link href="/aulas" className={`nav-item ${lessonsActive ? "active" : ""}`} aria-current={lessonsActive ? "page" : undefined}><BookOpen size={19} /> Aulas completas</Link>
        <Link href="/projeto" className={`nav-item ${pathname === "/projeto" ? "active" : ""}`} aria-current={pathname === "/projeto" ? "page" : undefined}><Map size={19} /> O caminho do projeto</Link>
      </nav>
      <div className="sidebar-note"><span className="note-icon"><Sprout size={21} /></span><strong>Uma base de cada vez.</strong><p>Entender o conceito.<br />Praticar com intenção.<br />Voltar para consolidar.</p><Link href="/projeto">Conheça a proposta <ArrowUpRight size={15} /></Link></div>
      <div className="sidebar-footer"><Compass size={16} /><span>Um projeto em evolução<small>Feito para aprender de verdade.</small></span></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><span>Seu espaço de estudos</span><div className="topbar-actions"><span className="version-pill"><span /> Primeira versão</span><button className="theme-toggle" type="button" onClick={() => {
        const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        document.documentElement.dataset.theme = theme;
        try { localStorage.setItem("estudo-theme", theme); } catch { /* O tema ainda funciona nesta página se o armazenamento estiver indisponível. */ }
      }}><span className="theme-to-dark"><Moon size={15} /> Modo escuro</span><span className="theme-to-light"><Sun size={15} /> Modo claro</span></button></div></header>
      <main id="conteudo" tabIndex={-1}>{children}</main>
      <footer className="page-footer"><span>estudo. <span>Aprendizado que se constrói.</span></span><span>Engenharia de Software</span></footer>
    </div>
  </div>;
}
