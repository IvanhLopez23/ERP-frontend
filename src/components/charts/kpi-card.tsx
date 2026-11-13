import type { LucideIcon } from "lucide-react";

import { cantidad, moneda, numero } from "@/lib/format";
import { cn } from "@/lib/utils";

export type Kpi = {
  clave?: string;
  etiqueta?: string;
  label?: string;
  valor?: number | string;
  value?: number | string;
  unidad?: string;
};

export function formatearValor(valor: unknown, unidad?: string) {
  const textoUnidad = (unidad ?? "").toUpperCase();

  if (textoUnidad === "MXN" || textoUnidad === "USD" || textoUnidad === "$") {
    return moneda(valor);
  }
  if (textoUnidad === "%") {
    return `${cantidad(valor, 1)}%`;
  }
  if (textoUnidad) {
    return `${cantidad(valor, 2)} ${unidad}`;
  }
  return cantidad(valor, 2);
}

export function KpiCard({
  kpi,
  icono: Icono,
  className,
}: {
  kpi: Kpi;
  icono?: LucideIcon;
  className?: string;
}) {
  const etiqueta = kpi.etiqueta ?? kpi.label ?? kpi.clave ?? "Indicador";
  const valor = kpi.valor ?? kpi.value ?? 0;
  const negativo = numero(valor) < 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {etiqueta}
        </p>
        {Icono && (
          <span className="grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            <Icono className="size-3.5" aria-hidden="true" />
          </span>
        )}
      </div>
      <p
        className={cn(
          "tabular mt-2 text-2xl font-semibold tracking-tight",
          negativo ? "text-destructive" : "text-foreground",
        )}
      >
        {formatearValor(valor, kpi.unidad)}
      </p>
    </div>
  );
}
