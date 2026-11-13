"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, ShieldAlert, Warehouse } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaISO } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import {
  ChartRenderer,
  type Grafica,
} from "@/components/charts/chart-renderer";
import { KpiCard, type Kpi } from "@/components/charts/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

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

export default function DashboardAlmacenPage() {
  const { puede } = useAuth();

  const [desde, setDesde] = useState(haceOnceMeses);
  const [hasta, setHasta] = useState(() => fechaISO(new Date()));
  const [agrupacion, setAgrupacion] = useState("mes");

  const habilitado = puede("/almacen");

  const { data, isPending, error, refetch, isFetching } =
    useQuery<RespuestaDashboard>({
      queryKey: ["dashboard-almacen", desde, hasta, agrupacion],
      queryFn: () =>
        apiFetch<RespuestaDashboard>(
          `/dashboard/almacen?desde=${desde}&hasta=${hasta}&agrupacion=${agrupacion}`,
        ),
      enabled: habilitado,
    });

  const graficas = useMemo(() => Object.entries(data?.graficas ?? {}), [data]);

  if (!habilitado) {
    return (
      <>
        <PageHeader titulo="Dashboard de almacén" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a este dashboard"
          descripcion="Tu rol no tiene el permiso /almacen. Solicita acceso al administrador."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Dashboard de almacén"
        descripcion="Indicadores de existencias y movimientos en el periodo seleccionado."
        acciones={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void refetch()}
            disabled={isFetching}
          >
            {isFetching ? "Actualizando…" : "Actualizar"}
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-0">
          <div className="space-y-1">
            <Label htmlFor="desde" className="text-xs">
              Desde
            </Label>
            <input
              id="desde"
              type="date"
              value={desde}
              max={hasta}
              onChange={(evento) => setDesde(evento.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="hasta" className="text-xs">
              Hasta
            </Label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              min={desde}
              max={fechaISO(new Date())}
              onChange={(evento) => setHasta(evento.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="agrupacion" className="text-xs">
              Agrupación
            </Label>
            <select
              id="agrupacion"
              value={agrupacion}
              onChange={(evento) => setAgrupacion(evento.target.value)}
              className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {AGRUPACIONES.map((opcion) => (
                <option key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </option>
              ))}
            </select>
          </div>
          <p className="ml-auto flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {desde} → {hasta}
          </p>
        </CardContent>
      </Card>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-[92px] rounded-lg" />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onReintentar={() => void refetch()} />
      ) : (
        <>
          <section
            aria-label="Indicadores"
            className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
          >
            {(data?.kpis ?? []).map((kpi, indice) => (
              <KpiCard
                key={kpi.clave ?? `${indice}`}
                kpi={kpi}
                icono={Warehouse}
              />
            ))}
          </section>

          {graficas.length === 0 ? (
            <EmptyState
              className="mt-4 rounded-lg border border-border bg-card"
              icono={Warehouse}
              titulo="Sin información en el periodo"
              descripcion="Ajusta el rango de fechas o registra movimientos de inventario."
            />
          ) : (
            <section className="mt-4 grid gap-4 xl:grid-cols-2">
              {graficas.map(([clave, grafica]) => (
                <Card key={clave}>
                  <CardHeader>
                    <CardTitle className="text-sm font-semibold">
                      {tituloGrafica(clave)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartRenderer grafica={grafica} titulo={tituloGrafica(clave)} />
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </>
      )}
    </>
  );
}
