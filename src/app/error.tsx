"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <div className="page-container empty-state"><span className="eyebrow">NÃO FOI POSSÍVEL CARREGAR</span><h1>O catálogo está indisponível.</h1><p>Tente novamente em instantes.</p><div className="error-actions"><button className="button primary" onClick={reset}>Tentar novamente</button><Link className="button secondary" href="/">Voltar ao início</Link></div></div>;
}
