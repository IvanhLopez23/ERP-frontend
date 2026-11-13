export function SeccionFormulario({
  numero,
  titulo,
  descripcion,
  children,
}: {
  numero: number;
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-4 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-xs font-semibold text-primary">
          {numero}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            {titulo}
          </h3>
          {descripcion && (
            <p className="text-xs text-muted-foreground">{descripcion}</p>
          )}
        </div>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
