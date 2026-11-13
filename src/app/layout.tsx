import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Disciplinas | Estudo ES", template: "%s | Estudo ES" },
  description: "Um espaço pessoal para construir sua base em Engenharia de Software, com trilhas de estudo e objetivos claros.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-BR" data-scroll-behavior="smooth"><body><Shell>{children}</Shell></body></html>;
}
