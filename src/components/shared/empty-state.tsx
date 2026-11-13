import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion?: string;
  accion?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icono className="size-5" aria-hidden="true" />
      </span>
      <p className="mt-1 text-sm font-semibold text-foreground">{titulo}</p>
      {descripcion && (
        <p className="max-w-sm text-sm text-muted-foreground">{descripcion}</p>
      )}
      {accion && <div className="mt-2">{accion}</div>}
    </div>
  );
}
