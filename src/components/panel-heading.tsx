export function PanelHeading({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <header className="mb-6 border-b-2 border-dashed border-ink/20 pb-5">
      <h2 className="font-display text-3xl font-extrabold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-prose text-ink-soft">{children}</p>
    </header>
  );
}
