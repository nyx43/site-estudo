import { ArrowRight, Check, Circle, Layers3 } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "O caminho do projeto" };

const milestones = [
  { title: "Organizar o caminho", status: "Disponível", description: "Catálogo com as cinco disciplinas iniciais, módulos, objetivos, pré-requisitos e planos de avaliação.", current: true },
  { title: "Aprender e praticar", status: "Piloto em revisão", description: "Aula de laços de repetição em Python, com 12 exercícios, correção determinística e progresso salvo. A revisão pedagógica humana permanece pendente.", current: true },
  { title: "Voltar para consolidar", status: "Planejado", description: "Revisão espaçada, sessões curtas de estudo, painel de dificuldades e tutor com respostas simuladas." },
  { title: "Receber ajuda com intenção", status: "Planejado", description: "Integração de IA com pistas progressivas e validação de conteúdo, preservando o raciocínio do aluno." },
  { title: "Construir e demonstrar", status: "Futuro", description: "Execução isolada de código, avaliação por competências e projetos práticos com critérios de aceitação." },
  { title: "Levar o estudo com você", status: "Futuro", description: "Mais disciplinas e um aplicativo para celular. Sincronização, acesso e funcionamento offline serão definidos nessa etapa." },
];

export default function ProjectPage() {
  return <div className="page-container detail-page"><header className="detail-header"><span className="eyebrow">UMA PLATAFORMA EM EVOLUÇÃO</span><h1>Uma base hoje.<br />Novas possibilidades amanhã.</h1><p>Um site pessoal de estudos, começando pequeno e com espaço para crescer. O percurso pode mudar conforme aprendemos com o uso.</p></header><div className="roadmap">{milestones.map((milestone, index) => <section key={milestone.title} className={`roadmap-item ${milestone.current ? "current" : ""}`}><span className="roadmap-marker">{milestone.current ? <Check size={18} /> : <Circle size={12} />}</span><div><span className="eyebrow">ETAPA {index + 1} · {milestone.status}</span><h2>{milestone.title}</h2><p>{milestone.description}</p></div></section>)}</div><div className="next-chapter"><Layers3 size={28} /><div><h2>O conteúdo também é parte da construção.</h2><p>Um tópico só vira aula de estudo depois de ser escrito, validado e revisado.</p></div><Link className="text-link" href="/">Explorar as trilhas <ArrowRight size={17} /></Link></div></div>;
}
