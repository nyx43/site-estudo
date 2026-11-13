import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return <div className="page-container empty-state"><Compass size={36} /><span className="eyebrow">CONTEÚDO NÃO ENCONTRADO</span><h1>Este caminho ainda não existe.</h1><p>Volte ao catálogo para encontrar uma disciplina e explorar os tópicos planejados.</p><Link className="button primary" href="/">Voltar às disciplinas</Link></div>;
}
