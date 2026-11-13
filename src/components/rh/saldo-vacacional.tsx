"use client";

import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, LoaderCircle, Search } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch } from "@/lib/api-client";
import { fechaCorta, fechaISO, numero, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SaldoVacacionalRegistro = {
  empleadoId: string;
  codigo?: string | null;
  nombre?: string | null;
  antiguedadAnios?: number | null;
  periodoVacacionalId?: string | null;
  descripcionPeriodo?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  fechaLimiteDisfrute?: string | null;
  diasOtorgados?: number | null;
  diasUsados?: number | null;
  diasPendientes?: number | null;
  diasDisponibles?: number | null;
  mensaje?: string | null;
};

type SaldoVacacionalPagina = {
  total: number;
  pagina: number;
  registros: number;
  data: SaldoVacacionalRegistro[];
};

const COLUMNAS: ColumnDef<SaldoVacacionalRegistro>[] = [
  {
    id: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{texto(row.original.codigo)}</span>
    ),
  },
  {
    id: "empleado",
    header: "Empleado",
    cell: ({ row }) => texto(row.original.nombre),
  },
  {
    id: "periodo",
    header: "Periodo vacacional",
    cell: ({ row }) => {
      const fila = row.original;
      return fila.descripcionPeriodo ? (
        <>
          <p className="font-medium">{fila.descripcionPeriodo}</p>
          <p className="text-xs text-muted-foreground">
            {fechaCorta(fila.fechaInicio)} – {fechaCorta(fila.fechaFin)}
          </p>
        </>
      ) : (
        <span className="text-muted-foreground">
          {texto(fila.mensaje, "Sin periodo")}
        </span>
      );
    },
  },
  {
    id: "antiguedad",
    header: "Antigüedad",
    cell: ({ row }) =>
      row.original.antiguedadAnios === null ||
      row.original.antiguedadAnios === undefined
        ? "—"
        : `${numero(row.original.antiguedadAnios)} años`,
  },
  {
    id: "otorgados",
    header: "Otorgados",
    cell: ({ row }) => (
      <span className="tabular">{numero(row.original.diasOtorgados)}</span>
    ),
  },
  {
    id: "usados",
    header: "Usados",
    cell: ({ row }) => (
      <span className="tabular">{numero(row.original.diasUsados)}</span>
    ),
  },
  {
    id: "pendientes",
    header: "Pendientes",
    cell: ({ row }) => (
      <span className="tabular">{numero(row.original.diasPendientes)}</span>
    ),
  },
  {
    id: "disponibles",
    header: "Disponibles",
    cell: ({ row }) => (
      <span className="tabular font-medium">
        {numero(row.original.diasDisponibles)}
      </span>
    ),
  },
  {
    id: "limite",
    header: "Límite de disfrute",
    cell: ({ row }) =>
      row.original.fechaLimiteDisfrute
        ? fechaCorta(row.original.fechaLimiteDisfrute)
        : "—",
  },
];

export function SaldoVacacional() {
  const { puede } = useAuth();

  const [buscar, setBuscar] = useState("");
  const [estatus, setEstatus] = useState("activos");
  const [fechaCorte, setFechaCorte] = useState(() => fechaISO(new Date()));
  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);

  const busqueda = useDebounce(buscar.trim(), 350);

  const saldo = useQuery<SaldoVacacionalPagina>({
    queryKey: ["saldo-vacacional", busqueda, estatus, fechaCorte, pagina, registros],
    queryFn: () => {
      const parametros = new URLSearchParams({
        fechaCorte,
        pagina: String(pagina),
        registros: String(registros),
      });
      if (busqueda) parametros.set("buscar", busqueda);
      if (estatus !== "todos") {
        parametros.set("activo", estatus === "activos" ? "true" : "false");
      }
      return apiFetch<SaldoVacacionalPagina>(
        `/rh/vacaciones/saldo?${parametros.toString()}`,
      );
    },
    enabled: puede("/rh/vacaciones"),
    placeholderData: keepPreviousData,
  });

  const filas = saldo.data?.data ?? [];

  return (
    <>
      <PageHeader
        titulo="Saldo vacacional"
        descripcion="Consulta los días otorgados, usados y disponibles a una fecha de corte."
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-3 pt-0">
          <div className="min-w-[240px] flex-1 space-y-1">
            <Label htmlFor="buscar" className="text-xs">
              Buscar empleado
            </Label>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                id="buscar"
                type="search"
                className="h-8 pl-8"
                placeholder="Nombre, apellidos o código…"
                aria-label="Buscar empleado"
                value={buscar}
                onChange={(evento) => {
                  setBuscar(evento.target.value);
                  setPagina(1);
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="estatus" className="text-xs">
              Estatus del empleado
            </Label>
            <select
              id="estatus"
              value={estatus}
              onChange={(evento) => {
                setEstatus(evento.target.value);
                setPagina(1);
              }}
              aria-label="Filtrar por estatus"
              className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
            >
              <option value="activos">Solo activos</option>
              <option value="inactivos">Solo inactivos</option>
              <option value="todos">Todos</option>
            </select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="fechaCorte" className="text-xs">
              Fecha de corte
            </Label>
            <Input
              id="fechaCorte"
              type="date"
              className="h-8"
              value={fechaCorte}
              onChange={(evento) => {
                setFechaCorte(evento.target.value);
                setPagina(1);
              }}
            />
          </div>

          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void saldo.refetch()}
            disabled={saldo.isFetching}
          >
            {saldo.isFetching && (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            )}
            Consultar
          </Button>
        </CardContent>
      </Card>

      {saldo.error ? (
        <ErrorState error={saldo.error} onReintentar={() => void saldo.refetch()} />
      ) : (
        <DataTable
          columns={COLUMNAS}
          data={filas}
          total={saldo.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={saldo.isPending || saldo.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={CalendarClock}
              titulo="Sin información de saldo"
              descripcion="No se encontraron empleados para los filtros seleccionados."
            />
          }
        />
      )}
    </>
  );
}
