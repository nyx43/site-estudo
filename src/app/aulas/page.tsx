import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { catalog } from "@/lib/catalog";
import { getStudyService } from "@/lib/study";
import { orderLessons } from "@/lib/study/catalog";
import { levelLabels } from "@/components/study/teaching-content";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aulas completas" };

export default async function LessonsPage() {
  const subjects = await catalog.listSubjects();
  const topicOrder = subjects.flatMap((subject) => subject.modules.flatMap((item) => item.topics.map((topic) => topic.id)));
  const lessons = process.env.CATALOG_STORAGE === "files" ? [] : orderLessons(await getStudyService().availableLessons(), topicOrder);
  return <div className="page-container detail-page"><header className="detail-header"><span className="eyebrow">ENTENDA ANTES DE CONSTRUIR</span><h1>Aulas completas,<br />desde a base.</h1><p>Explicações, comandos, código linha por linha e casos para aprender a investigar erros — inclusive os de uma IA.</p></header><div className="notice"><BookOpen size={18} /><p>Você pode ler o conteúdo completo sem preencher perguntas. O estudo guiado e os exercícios ficam em um percurso separado. As aulas atuais estão em revisão pedagógica.</p></div><div className="section-heading"><div><h2>Comece pelos fundamentos</h2><p>A ordem acompanha o currículo; os pré-requisitos são explicados em cada aula.</p></div><span className="count-label">{lessons.length} aulas disponíveis</span></div><div className="lesson-library-grid">{lessons.map((lesson, index) => <article className="lesson-library-card" key={lesson.id}><span className="eyebrow">{String(index + 1).padStart(2, "0")} · {levelLabels[lesson.level]}</span><h2>{lesson.title}</h2><p>{lesson.description}</p><span className="status-pill">Versão {lesson.version} · Em revisão</span><Link className="button primary" href={`/aulas/${lesson.topicId}`}>Ler aula completa <ArrowRight size={16} /></Link><Link className="text-link" href={`/estudar/${lesson.topicId}`}>Abrir estudo guiado</Link></article>)}</div>{!lessons.length && <div className="empty-state"><h2>Nenhuma aula disponível neste modo.</h2><p>O catálogo curricular continua disponível para consulta.</p><Link href="/" className="button secondary">Explorar disciplinas</Link></div>}</div>;
}
