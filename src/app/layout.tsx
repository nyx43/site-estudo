import type { Metadata } from "next";
import { Shell } from "@/components/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Disciplinas | Estudo ES", template: "%s | Estudo ES" },
  description: "Um espaço pessoal para construir sua base em Engenharia de Software, com trilhas de estudo e objetivos claros.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const themeScript = `(() => {
    const root = document.documentElement;
    const system = window.matchMedia('(prefers-color-scheme: dark)');
    const stored = () => { try { return localStorage.getItem('estudo-theme'); } catch { return null; } };
    const apply = () => {
      const preference = stored();
      root.dataset.theme = preference === 'dark' || preference === 'light' ? preference : (system.matches ? 'dark' : 'light');
    };
    apply();
    system.addEventListener('change', () => { if (!stored()) apply(); });
    window.addEventListener('storage', (event) => { if (event.key === 'estudo-theme' || event.key === null) apply(); });
  })();`;
  return <html lang="pt-BR" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: themeScript }} /></head><body><Shell>{children}</Shell></body></html>;
}
