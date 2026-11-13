import type { ReactNode } from "react";

export function PageHeader({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: string;
  descripcion?: string;
  acciones?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-balance text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
          {titulo}
        </h1>
        {descripcion && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {descripcion}
          </p>
        )}
      </div>
      {acciones && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{acciones}</div>
      )}
    </div>
  );
}
