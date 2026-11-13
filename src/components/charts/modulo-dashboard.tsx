"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ChartColumn } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaISO } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/shared/error-state";
import { KpiCard, type Kpi } from "@/components/charts/kpi-card";
import {
  ChartRenderer,
  type Grafica,
} from "@/components/charts/chart-renderer";

type RespuestaDashboard = {
  kpis?: Kpi[];
  graficas?: Record<string, Grafica>;
};

const AGRUPACIONES = [
  { valor: "dia", etiqueta: "Día" },
  { valor: "semana", etiqueta: "Semana" },
  { valor: "mes", etiqueta: "Mes" },
];

function haceOnceMeses() {
  const fecha = new Date();
  fecha.setMonth(fecha.getMonth() - 11);
  fecha.setDate(1);
  return fechaISO(fecha);
}

function tituloGrafica(clave: string) {
  const conEspacios = clave
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim();
  return conEspacios.charAt(0).toUpperCase() + conEspacios.slice(1);
}

export function ModuloDashboard({
  titulo,
  recurso,
  permiso,
}: {
  titulo: string;
  recurso: string;
  permiso: string;
}) {
  const { puede } = useAuth();
  const habilitado = puede(permiso);

  const [desde, setDesde] = useState(haceOnceMeses);
  const [hasta, setHasta] = useState(() => fechaISO(new Date()));
  const [agrupacion, setAgrupacion] = useState("mes");

  const sufijoId = recurso.replace(/[^a-z0-9]+/gi, "-");

  const consulta = useQuery<RespuestaDashboard>({
    queryKey: ["dashboard-modulo", recurso, desde, hasta, agrupacion],
    queryFn: () =>
      apiFetch<RespuestaDashboard>(
        `${recurso}?desde=${desde}&hasta=${hasta}&agrupacion=${agrupacion}`,
      ),
    enabled: habilitado,
    staleTime: 2 * 60_000,
  });

  if (!habilitado) return null;

  const kpis = consulta.data?.kpis ?? [];
  const graficas = Object.entries(consulta.data?.graficas ?? {});

  return (
    <section aria-label={`Dashboard de ${titulo}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
          <ChartColumn className="size-3.5" aria-hidden="true" />
        </span>
        <h2 className="text-base font-semibold tracking-tight">{titulo}</h2>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-border bg-card p-2.5">
        <div className="space-y-0.5">
          <Label
            htmlFor={`desde-${sufijoId}`}
            className="text-[11px] text-muted-foreground"
          >
            Desde
          </Label>
          <input
            id={`desde-${sufijoId}`}
            type="date"
            value={desde}
            max={hasta}
            onChange={(evento) => setDesde(evento.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-0.5">
          <Label
            htmlFor={`hasta-${sufijoId}`}
            className="text-[11px] text-muted-foreground"
          >
            Hasta
          </Label>
          <input
            id={`hasta-${sufijoId}`}
            type="date"
            value={hasta}
            min={desde}
            max={fechaISO(new Date())}
            onChange={(evento) => setHasta(evento.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        <div className="space-y-0.5">
          <Label
            htmlFor={`agrupacion-${sufijoId}`}
            className="text-[11px] text-muted-foreground"
          >
            Agrupación
          </Label>
          <select
            id={`agrupacion-${sufijoId}`}
            value={agrupacion}
            onChange={(evento) => setAgrupacion(evento.target.value)}
            className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {AGRUPACIONES.map((opcion) => (
              <option key={opcion.valor} value={opcion.valor}>
                {opcion.etiqueta}
              </option>
            ))}
          </select>
        </div>

        <p className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CalendarDays className="size-3.5" aria-hidden="true" />
          {desde} → {hasta}
        </p>
      </div>

      {consulta.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-[92px] rounded-lg" />
          ))}
        </div>
      ) : consulta.error ? (
        <ErrorState
          error={consulta.error}
          onReintentar={() => void consulta.refetch()}
          titulo={`No se pudo cargar el dashboard de ${titulo}`}
        />
      ) : (
        <>
          {kpis.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi, indice) => (
                <KpiCard key={kpi.clave ?? `${indice}`} kpi={kpi} />
              ))}
            </div>
          )}

          {graficas.length > 0 && (
            <div className="mt-3 grid gap-3 xl:grid-cols-2">
              {graficas.map(([clave, grafica]) => (
                <Card key={clave}>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      {tituloGrafica(clave)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartRenderer
                      grafica={grafica}
                      titulo={tituloGrafica(clave)}
                    />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {kpis.length === 0 && graficas.length === 0 && (
            <p className="rounded-lg border border-dashed border-border bg-muted/30 px-3 py-6 text-center text-sm text-muted-foreground">
              Sin información disponible para este módulo en el periodo
              seleccionado.
            </p>
          )}
        </>
      )}
    </section>
  );
}
