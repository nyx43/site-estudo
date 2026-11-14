import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { loadLabByTopic } from "@/lib/content/load-labs";
import { getStudyService } from "@/lib/study";
import { StudyWorkspace } from "@/components/study/study-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estudo guiado" };

export default async function StudyPage({ params, searchParams }: { params: Promise<{ topicId: string }>; searchParams: Promise<{ version?: string }> }) {
  const requested = (await searchParams).version;
  if (requested !== undefined && (!/^[1-9]\d*$/.test(requested) || Number(requested) > 1000000)) notFound();
  const initial = await getStudyService().lesson((await params).topicId, requested === undefined ? undefined : Number(requested));
  if (!initial) notFound();
  const hasLab = Boolean(await loadLabByTopic(initial.lesson.topicId));
  return <div className="page-container study-page"><Link className="back-link" href="/aulas"><ArrowLeft size={16} /> Todas as aulas</Link><header className="study-header"><span className="eyebrow">AULA + PRÁTICA GUIADA · VERSÃO {initial.lesson.version}</span><h1>{initial.lesson.title}</h1><p>Leia, explique com suas palavras e pratique no seu ritmo.</p><Link className="text-link" href={`/aulas/${initial.lesson.topicId}`}>Prefere ler primeiro? Abrir aula completa.</Link></header>{initial.versions.some((item) => item.version !== initial.lesson.version && item.hasProgress) && <div className="version-notice"><p>Há progresso salvo em outra versão. Seu histórico foi preservado.</p>{initial.versions.filter((item) => item.version !== initial.lesson.version && item.hasProgress).map((item) => <Link key={item.id} href={`/estudar/${initial.lesson.topicId}?version=${item.version}`}>Retomar versão {item.version}</Link>)}</div>}{initial.lesson.status !== "VERIFIED" && <div className="notice"><BookOpen size={18} /><p><strong>Conteúdo em revisão.</strong> Os exemplos passaram por verificação automática; a revisão pedagógica humana ainda está pendente.</p></div>}<StudyWorkspace key={initial.lesson.id} initial={initial} hasLab={hasLab} /></div>;
}
