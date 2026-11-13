"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Code2, Layers3, Search, SlidersHorizontal, X } from "lucide-react";
import type { CatalogSubject, SubjectCategory, SubjectLifecycleStatus } from "@/lib/catalog/types";
import {
  SUBJECT_LIFECYCLE_LABELS,
  filterSubjects,
  getAcademicPeriodGroups,
  groupSubjectsByLifecycle,
} from "@/lib/catalog/filter";

const categories: { value: SubjectCategory | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todas as disciplinas" },
  { value: "PROGRAMMING", label: "Programação" },
  { value: "THEORETICAL", label: "Conceituais" },
];

const lifecycleFilters: { value: SubjectLifecycleStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos os estados" },
  { value: "IN_PROGRESS", label: SUBJECT_LIFECYCLE_LABELS.IN_PROGRESS },
  { value: "PAUSED", label: SUBJECT_LIFECYCLE_LABELS.PAUSED },
  { value: "UPCOMING", label: SUBJECT_LIFECYCLE_LABELS.UPCOMING },
];

const lifecycleClassNames: Record<SubjectLifecycleStatus, string> = {
  IN_PROGRESS: "lifecycle-in-progress",
  PAUSED: "lifecycle-paused",
  UPCOMING: "lifecycle-upcoming",
};

export function CatalogBrowser({
  subjects,
  availableTopicIds = [],
}: {
  subjects: CatalogSubject[];
  availableTopicIds?: string[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SubjectCategory | "ALL">("ALL");
  const [lifecycle, setLifecycle] = useState<SubjectLifecycleStatus | "ALL">("ALL");

  const availableSet = new Set(availableTopicIds);
  const subjectBySlug = new Map(subjects.map((subject) => [subject.slug, subject]));
  const periodGroups = getAcademicPeriodGroups(subjects, "26.2");
  const byLifecycle = groupSubjectsByLifecycle(subjects);
  const filtered = filterSubjects(subjects, query, category, lifecycle);

  function countAvailableInSubject(subject: CatalogSubject) {
    return subject.modules.reduce(
      (total, module) => total + module.topics.filter((topic) => availableSet.has(topic.id)).length,
      0,
    );
  }

  return <section id="disciplinas" className="catalog-section" aria-labelledby="catalog-title">
    {periodGroups.length > 0 && <div className="period-section" aria-labelledby="period-26-2-title">
      <div className="section-heading">
        <div>
          <span className="eyebrow"><Layers3 size={14} /> PERÍODO 26.2 · NÍVEL 1</span>
          <h2 id="period-26-2-title">Disciplinas do semestre (26.2)</h2>
          <p>As cinco matérias do período 26.2 estão <strong>Em desenvolvimento</strong> na profundidade de nível 1. O rótulo indica foco de organização curricular — tópicos sem aula produzida continuam marcados como <strong>Planejado</strong>.</p>
        </div>
        <span className="count-label">{periodGroups.length} disciplinas em 26.2</span>
      </div>
      <div className="period-grid">
        {periodGroups.map((group) => {
          const primarySlugs = new Set(group.subjects.map((item) => item.slug));
          const supportSubjects = group.relatedSubjectSlugs
            .filter((slug) => !primarySlugs.has(slug))
            .map((slug) => subjectBySlug.get(slug))
            .filter((item): item is CatalogSubject => Boolean(item));
          const totalModules = group.subjects.reduce((sum, item) => sum + item.modules.length, 0);
          const totalTopics = group.subjects.reduce(
            (sum, item) => sum + item.modules.reduce((count, mod) => count + mod.topics.length, 0),
            0,
          );
          return <article key={`${group.period}-${group.orderIndex}-${group.courseName}`} className="period-card">
            <div className="period-card-top">
              <span className="period-index">26.2 · 0{group.orderIndex}</span>
              <span className="lifecycle-pill lifecycle-in-progress">{SUBJECT_LIFECYCLE_LABELS.IN_PROGRESS} · Nível 1</span>
            </div>
            <h3>{group.courseName}</h3>
            {group.scopeNotes[0] && <p className="period-scope-note">{group.scopeNotes[0]}</p>}
            <div className="period-meta">
              <span>{totalModules} módulos</span>
              <span>{totalTopics} tópicos planejados</span>
            </div>
            <div className="period-links">
              {group.subjects.map((item) => <Link key={item.slug} href={`/disciplinas/${item.slug}`} className="period-track-link">
                <span>Trilha: {item.name}</span>
                <ArrowRight size={14} />
              </Link>)}
            </div>
            {supportSubjects.length > 0 && <div className="period-support">
              <span>Apoio correlato:</span>
              {supportSubjects.map((support) => <Link key={support.slug} href={`/disciplinas/${support.slug}`}>{support.name}</Link>)}
            </div>}
          </article>;
        })}
      </div>
    </div>}

    <div className="section-heading">
      <div>
        <span className="eyebrow">CONSTRUA SUA BASE</span>
        <h2 id="catalog-title">Explore as disciplinas</h2>
        <p>Escolha uma trilha e conheça o caminho de aprendizagem. O catálogo preserva todas as áreas ({byLifecycle.IN_PROGRESS.length} em desenvolvimento, {byLifecycle.PAUSED.length} pausada e {byLifecycle.UPCOMING.length} em breve).</p>
      </div>
      <span className="count-label" role="status">{filtered.length} {filtered.length === 1 ? "disciplina" : "disciplinas"}</span>
    </div>
    <div className="catalog-toolbar">
      <div className="filter-tabs" aria-label="Filtrar disciplinas">
        {categories.map((item) => <button key={item.value} type="button" aria-pressed={category === item.value} className={category === item.value ? "selected" : ""} onClick={() => setCategory(item.value)}>{item.label}</button>)}
      </div>
      <div className="filter-tabs lifecycle-filter-tabs" aria-label="Filtrar por andamento">
        {lifecycleFilters.map((item) => <button key={item.value} type="button" aria-pressed={lifecycle === item.value} className={lifecycle === item.value ? "selected" : ""} onClick={() => setLifecycle(item.value)}>{item.label}</button>)}
      </div>
      <div className="search-field">
        <Search size={17} />
        <input aria-label="Buscar disciplinas ou tópicos" placeholder="Buscar disciplina ou tópico..." value={query} onChange={(event) => setQuery(event.target.value)} />
        {query && <button aria-label="Limpar busca" type="button" onClick={() => setQuery("")}><X size={16} /></button>}
      </div>
    </div>
    {filtered.length ? <div className="subject-grid">{filtered.map((subject) => {
      const availableCount = countAvailableInSubject(subject);
      return <Link href={`/disciplinas/${subject.slug}`} key={subject.id} className={`subject-card accent-${subject.accent}`}>
        <div className="card-top">
          <span className="subject-icon">{subject.category === "THEORETICAL" ? <BookOpen size={26} strokeWidth={1.6} /> : <Code2 size={27} strokeWidth={1.6} />}</span>
          <div className="card-badges">
            <span className={`lifecycle-pill ${lifecycleClassNames[subject.lifecycleStatus]}`}>{SUBJECT_LIFECYCLE_LABELS[subject.lifecycleStatus]}</span>
            <span className="subject-category">{subject.category === "THEORETICAL" ? "CONCEITUAL" : "PROGRAMAÇÃO"}</span>
          </div>
        </div>
        <h3>{subject.name}</h3>
        {subject.academicTrack && <span className="subject-track-tag">Período {subject.academicTrack.period} · {subject.academicTrack.courseName} (Nível 1)</span>}
        <p>{subject.description}</p>
        <div className="card-meta">
          <span><BookOpen size={14} /> {subject.modules.length} módulos</span>
          <span>{subject.modules.reduce((count, module) => count + module.topics.length, 0)} tópicos</span>
          <span className="card-lesson-availability">{availableCount > 0 ? `${availableCount} aulas disponíveis` : "Currículo planejado"}</span>
        </div>
        <div className="card-bottom"><span>Explorar trilha</span><ArrowRight size={18} /></div>
      </Link>;
    })}</div> : <div className="empty-state"><Search size={30} /><h3>{subjects.length ? "Nenhuma disciplina encontrada" : "O catálogo ainda está vazio"}</h3><p>{subjects.length ? "Tente outro termo ou remova o filtro para explorar as trilhas." : "As disciplinas aparecerão aqui quando o currículo for cadastrado."}</p>{subjects.length > 0 && <button className="button secondary" onClick={() => { setQuery(""); setCategory("ALL"); setLifecycle("ALL"); }}>Limpar filtros</button>}</div>}
    <div className="catalog-footnote"><SlidersHorizontal size={16} /><p>O catálogo diferencia o andamento da disciplina (Em desenvolvimento, Pausada ou Em breve) da disponibilidade real de aulas completas. Nenhuma disciplina planejada é tratada como aula pronta.</p></div>
  </section>;
}
