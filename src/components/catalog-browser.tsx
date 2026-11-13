"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogSubject, SubjectCategory } from "@/lib/catalog/types";
import { filterSubjects } from "@/lib/catalog/filter";

const categories: { value: SubjectCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas as disciplinas" },
  { value: "PROGRAMMING", label: "Programação" },
  { value: "THEORETICAL", label: "Conceituais" },
];

export function CatalogBrowser({ subjects }: { subjects: CatalogSubject[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SubjectCategory | "ALL">("ALL");
  const filtered = filterSubjects(subjects, query, category);
  return <section id="disciplinas" className="catalog-section" aria-labelledby="catalog-title">
    <div className="section-heading"><div><span className="eyebrow">CONSTRUA SUA BASE</span><h2 id="catalog-title">Explore as disciplinas</h2><p>Escolha uma trilha e conheça o caminho de aprendizagem.</p></div><span className="count-label" role="status">{filtered.length} {filtered.length === 1 ? "disciplina" : "disciplinas"}</span></div>
    <div className="catalog-toolbar"><div className="filter-tabs" aria-label="Filtrar disciplinas">{categories.map((item) => <button key={item.value} type="button" aria-pressed={category === item.value} className={category === item.value ? "selected" : ""} onClick={() => setCategory(item.value)}>{item.label}</button>)}</div><div className="search-field"><Search size={17} /><input aria-label="Buscar disciplinas ou tópicos" placeholder="Buscar disciplina ou tópico..." value={query} onChange={(event) => setQuery(event.target.value)} />{query && <button aria-label="Limpar busca" type="button" onClick={() => setQuery("")}><X size={16} /></button>}</div></div>
    {filtered.length ? <div className="subject-grid">{filtered.map((subject) => <Link href={`/disciplinas/${subject.slug}`} key={subject.id} className={`subject-card accent-${subject.accent}`}>
      <div className="card-top"><span className="subject-icon">{subject.category === "THEORETICAL" ? <BookOpen size={26} strokeWidth={1.6} /> : <Code2 size={27} strokeWidth={1.6} />}</span><span className="subject-category">{subject.category === "THEORETICAL" ? "CONCEITUAL" : "PROGRAMAÇÃO"}</span></div>
      <h3>{subject.name}</h3><p>{subject.description}</p>
      <div className="card-meta"><span><BookOpen size={14} /> {subject.modules.length} módulos</span><span>{subject.modules.reduce((count, module) => count + module.topics.length, 0)} tópicos</span></div>
      <div className="card-bottom"><span>Explorar trilha</span><ArrowRight size={18} /></div>
    </Link>)}</div> : <div className="empty-state"><Search size={30} /><h3>{subjects.length ? "Nenhuma disciplina encontrada" : "O catálogo ainda está vazio"}</h3><p>{subjects.length ? "Tente outro termo ou remova o filtro para explorar as trilhas." : "As disciplinas aparecerão aqui quando o currículo for cadastrado."}</p>{subjects.length > 0 && <button className="button secondary" onClick={() => { setQuery(""); setCategory("ALL"); }}>Limpar filtros</button>}</div>}
    <div className="catalog-footnote"><SlidersHorizontal size={16} /><p>O catálogo é só o começo. Novas disciplinas serão organizadas em trilhas, com objetivos e pré-requisitos claros.</p></div>
  </section>;
}
