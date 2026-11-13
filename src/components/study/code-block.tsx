export function CodeBlock({ children, label }: { children: string; label?: string }) {
  return <div className="code-example">{label && <span>{label}</span>}<pre><code>{children}</code></pre></div>;
}
