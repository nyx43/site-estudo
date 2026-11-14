import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, ShieldCheck, Target } from "lucide-react";
import { PythonLab } from "@/components/lab/python-lab";
import { catalog } from "@/lib/catalog";
import { loadLabByTopic } from "@/lib/content/load-labs";
import { toPublicLab } from "@/lib/lab/public";
import { LAB_LIMITS } from "@/lib/lab/schema";
import { getStudyService } from "@/lib/study";

export const dynamic = "force-dynamic";
export const metadata = { title: "Laboratório Python" };

export default async function LabPage({ params }: { params: Promise<{ topicId: string }> }) {
  const { topicId } = await params;
  const rawLab = await loadLabByTopic(topicId);
  if (!rawLab) notFound();

  const lab = toPublicLab(rawLab);
  const topicLookup = await catalog.findTopic(topicId);
  const studyLesson = process.env.CATALOG_STORAGE === "files" ? null : await getStudyService().lesson(topicId);

  return (
    <div className="page-container lab-page">
      <Link className="back-link" href={studyLesson ? `/aulas/${topicId}` : topicLookup ? `/disciplinas/${topicLookup.subject.slug}/${topicLookup.topic.slug}` : "/aulas"}>
        <ArrowLeft size={16} aria-hidden="true" />{" "}
        {studyLesson ? `Voltar para ${studyLesson.lesson.title}` : "Voltar para o conteúdo"}
      </Link>

      <header className="detail-header">
        <span className="eyebrow">LABORATÓRIO PYTHON REAL · SANDBOX LOCAL</span>
        <h1>{lab.title}</h1>
        <p>{lab.intro}</p>
        <div className="detail-meta">
          <span className="status-pill">
            <ShieldCheck size={13} aria-hidden="true" /> Sem rede · sem acesso ao banco ou repositório
          </span>
          {studyLesson && (
            <>
              <Link className="text-link" href={`/aulas/${topicId}`}>
                <BookOpen size={14} aria-hidden="true" /> Ler aula completa
              </Link>
              <Link className="text-link" href={`/estudar/${topicId}?version=${studyLesson.lesson.version}`}>
                <Target size={14} aria-hidden="true" /> Estudo guiado e exercícios
              </Link>
            </>
          )}
        </div>
      </header>

      <div className="notice lab-limits-notice">
        <ShieldCheck size={18} aria-hidden="true" />
        <p>
          <strong>Ambiente isolado (fail-closed):</strong> o código roda com usuário sem privilégios,{" "}
          {LAB_LIMITS.defaultTimeoutMs / 1000}s de timeout, {LAB_LIMITS.memoryLimitBytes / (1024 * 1024)} MB de RAM e{" "}
          {LAB_LIMITS.maxOutputBytes / 1024} KB por fluxo de saída. Rascunhos são salvos localmente neste navegador e
          não alteram seu histórico de versões da aula.
        </p>
      </div>

      <PythonLab lab={lab} />
    </div>
  );
}
