"use client";

import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, moneda, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

type Orden = {
  publicId: string;
  folio?: string | null;
  descripcion?: string | null;
  fechaProgramada?: string | null;
  fechaEjecucion?: string | null;
  estatus?: string | null;
  costo?: number | string | null;
  observaciones?: string | null;
  equipo?: { publicId?: string; nombre?: string; codigo?: string } | null;
  planMantenimiento?: { publicId?: string; descripcion?: string } | null;
  atendido?: { publicId?: string; nombre?: string; apellidoPaterno?: string } | null;
  activo?: boolean;
  equipoId?: string | null;
  planMantenimientoId?: string | null;
  atendidoPor?: string | null;
};

type Opcion = { publicId: string; nombre?: string; codigo?: string; descripcion?: string };

const TRANSICIONES: Record<string, { valor: string; etiqueta: string }[]> = {
  pendiente: [
    { valor: "en_progreso", etiqueta: "Iniciar trabajo" },
    { valor: "cancelada", etiqueta: "Cancelar orden" },
  ],
  en_progreso: [
    { valor: "completada", etiqueta: "Completar orden" },
    { valor: "cancelada", etiqueta: "Cancelar orden" },
  ],
};

export default function OrdenesTrabajoPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeEquipos = puede("/mantenimiento/equipos");
  const puedePlanes = puede("/mantenimiento/planes-mantenimiento");
  const puedeEmpleados = puede("/rh/empleados");

  const equipos = useQuery<Opcion[]>({
    queryKey: ["equipos-select"],
    queryFn: () => apiFetch<Opcion[]>("/mantenimiento/equipos"),
    enabled: puedeEquipos,
    staleTime: 5 * 60_000,
  });

  const planes = useQuery<Opcion[]>({
    queryKey: ["planes-select"],
    queryFn: () => apiFetch<Opcion[]>("/mantenimiento/planes-mantenimiento"),
    enabled: puedePlanes,
    staleTime: 5 * 60_000,
  });

  const empleados = useQuery<Opcion[]>({
    queryKey: ["empleados-select"],
    queryFn: () => apiFetch<Opcion[]>("/rh/empleados"),
    enabled: puedeEmpleados,
    staleTime: 5 * 60_000,
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({ publicId, estatus }: { publicId: string; estatus: string }) =>
      apiFetch(`/mantenimiento/ordenes-trabajo/estatus/${publicId}`, {
        method: "PATCH",
        body: JSON.stringify({ estatus }),
      }),
    onSuccess: () => {
      toast.success("Orden actualizada correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["crud", "/mantenimiento/ordenes-trabajo"],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const config = useMemo<CrudConfig<Orden>>(
    () => ({
      titulo: "Órdenes de trabajo",
      descripcion: "Programación, ejecución y cierre de trabajos de mantenimiento.",
      recurso: "/mantenimiento/ordenes-trabajo",
      permiso: "/mantenimiento/ordenes-trabajo",
      singular: "Orden",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.folio ?? "Orden",
      tieneActivo: false,
      soloCrear: true,
      buscarPlaceholder: "Buscar por folio o descripción…",
      vacioTitulo: "Todavía no hay órdenes",
      vacioDescripcion: "Programa la primera orden de trabajo.",
      nota: "Transiciones válidas: pendiente → en progreso / cancelada; en progreso → completada / cancelada.",
      columnas: [
        {
          encabezado: "Folio",
          celda: (item) => (
            <span className="font-mono text-xs font-medium">
              {texto(item.folio)}
            </span>
          ),
        },
        {
          encabezado: "Equipo",
          celda: (item) => item.equipo?.nombre ?? item.equipo?.codigo ?? "—",
        },
        {
          encabezado: "Descripción",
          celda: (item) => (
            <span className="line-clamp-1 text-sm">{texto(item.descripcion)}</span>
          ),
        },
        {
          encabezado: "Programada",
          celda: (item) => fechaCorta(item.fechaProgramada),
        },
        {
          encabezado: "Costo",
          alineacion: "right",
          celda: (item) => (
            <span className="tabular">{moneda(item.costo)}</span>
          ),
        },
        {
          encabezado: "Estatus",
          celda: (item) => <EstadoBadge estado={item.estatus} />,
        },
      ],
      campos: [
        {
          nombre: "equipoId",
          etiqueta: "Equipo",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Orden",
          opciones: (equipos.data ?? []).map((equipo) => ({
            valor: equipo.publicId,
            etiqueta: equipo.nombre ?? equipo.codigo ?? equipo.publicId,
          })),
        },
        {
          nombre: "planMantenimientoId",
          etiqueta: "Plan (opcional)",
          tipo: "select",
          ancho: "full",
          seccion: "Orden",
          opciones: (planes.data ?? []).map((plan) => ({
            valor: plan.publicId,
            etiqueta: plan.descripcion ?? plan.publicId,
          })),
        },
        {
          nombre: "descripcion",
          etiqueta: "Descripción",
          tipo: "textarea",
          requerido: true,
          ancho: "full",
          seccion: "Orden",
        },
        {
          nombre: "fechaProgramada",
          etiqueta: "Fecha programada",
          tipo: "date",
          requerido: true,
          seccion: "Orden",
        },
        { nombre: "costo", etiqueta: "Costo estimado", tipo: "number", sufijo: "MXN", seccion: "Asignación y costo" },
        {
          nombre: "atendidoPor",
          etiqueta: "Atendido por (opcional)",
          tipo: "select",
          ancho: "full",
          seccion: "Asignación y costo",
          opciones: (empleados.data ?? []).map((empleado) => ({
            valor: empleado.publicId,
            etiqueta:
              [empleado.nombre, empleado.codigo].filter(Boolean).join(" ") ||
              empleado.publicId,
          })),
        },
        {
          nombre: "observaciones",
          etiqueta: "Observaciones",
          tipo: "textarea",
          ancho: "full",
          seccion: "Notas",
        },
      ],
      aValores: (item) => ({
        equipoId: item?.equipo?.publicId ?? item?.equipoId ?? "",
        planMantenimientoId:
          item?.planMantenimiento?.publicId ?? item?.planMantenimientoId ?? "",
        descripcion: item?.descripcion ?? "",
        fechaProgramada: item?.fechaProgramada ?? "",
        costo:
          item?.costo === null || item?.costo === undefined
            ? ""
            : String(item.costo),
        atendidoPor: item?.atendido?.publicId ?? item?.atendidoPor ?? "",
        observaciones: item?.observaciones ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          equipoId: String(valores.equipoId ?? ""),
          descripcion: String(valores.descripcion ?? "").trim(),
          fechaProgramada: String(valores.fechaProgramada ?? ""),
        };
        if (String(valores.planMantenimientoId ?? "").trim()) {
          payload.planMantenimientoId = String(valores.planMantenimientoId);
        }
        if (String(valores.costo ?? "").trim()) {
          payload.costo = Number(valores.costo);
        }
        if (String(valores.atendidoPor ?? "").trim()) {
          payload.atendidoPor = String(valores.atendidoPor);
        }
        if (String(valores.observaciones ?? "").trim()) {
          payload.observaciones = String(valores.observaciones).trim();
        }
        return payload;
      },
      estadoFila: (item) => ({ texto: item.estatus ?? "pendiente" }),
      accionesExtra: (item) => {
        const transiciones = TRANSICIONES[item.estatus ?? ""] ?? [];
        if (transiciones.length === 0) {
          return <DropdownMenuItem disabled>Sin acciones</DropdownMenuItem>;
        }
        return (
          <>
            {transiciones.map((transicion) => (
              <DropdownMenuItem
                key={transicion.valor}
                variant={transicion.valor === "cancelada" ? "destructive" : "default"}
                className="cursor-pointer"
                disabled={cambiarEstatus.isPending}
                onClick={() =>
                  cambiarEstatus.mutate({
                    publicId: item.publicId,
                    estatus: transicion.valor,
                  })
                }
              >
                {transicion.etiqueta}
              </DropdownMenuItem>
            ))}
          </>
        );
      },
    }),
    [equipos.data, planes.data, empleados.data, cambiarEstatus],
  );

  return <ResourcePage config={config} />;
}
