import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getStudyService } from "@/lib/study";
import { StudyWorkspace } from "@/components/study/study-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Aula piloto" };

export default async function StudyPage({ params }: { params: Promise<{ topicId: string }> }) {
  const initial = await getStudyService().lesson((await params).topicId);
  if (!initial) notFound();
  return <div className="page-container study-page"><Link className="back-link" href="/"><ArrowLeft size={16} /> Voltar às disciplinas</Link><header className="study-header"><span className="eyebrow">AULA + PRÁTICA GUIADA</span><h1>{initial.lesson.title}</h1><p>Leia, explique com suas palavras e pratique no seu ritmo.</p></header>{initial.lesson.status !== "VERIFIED" && <div className="notice"><BookOpen size={18} /><p><strong>Conteúdo piloto em revisão.</strong> Os exemplos passaram por verificação automática; a revisão pedagógica humana ainda está pendente.</p></div>}<StudyWorkspace initial={initial} /></div>;
}
