"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaCorta, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Plan = {
  publicId: string;
  descripcion?: string | null;
  tipo?: string | null;
  periodicidad?: string | null;
  intervalo?: number | string | null;
  fechaProximaEjecucion?: string | null;
  activo?: boolean;
  equipo?: { publicId?: string; nombre?: string; codigo?: string } | null;
  equipoId?: string | null;
};

type EquipoOpcion = { publicId: string; nombre?: string; codigo?: string };

export default function PlanesMantenimientoPage() {
  const { puede } = useAuth();
  const puedeEquipos = puede("/mantenimiento/equipos");

  const equipos = useQuery<EquipoOpcion[]>({
    queryKey: ["equipos-select"],
    queryFn: () => apiFetch<EquipoOpcion[]>("/mantenimiento/equipos"),
    enabled: puedeEquipos,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Plan>>(
    () => ({
      titulo: "Planes de mantenimiento",
      descripcion: "Planes preventivos y predictivos por equipo.",
      recurso: "/mantenimiento/planes-mantenimiento",
      permiso: "/mantenimiento/planes-mantenimiento",
      singular: "Plan",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.descripcion ?? "Plan",
      buscarPlaceholder: "Buscar plan…",
      vacioTitulo: "Todavía no hay planes",
      vacioDescripcion: "Crea el primer plan de mantenimiento.",
      columnas: [
        {
          encabezado: "Equipo",
          celda: (item) =>
            item.equipo?.nombre ?? item.equipo?.codigo ?? "—",
        },
        {
          encabezado: "Descripción",
          celda: (item) => <span className="text-sm">{texto(item.descripcion)}</span>,
        },
        {
          encabezado: "Tipo",
          celda: (item) => (
            <span className="capitalize">{texto(item.tipo)}</span>
          ),
        },
        {
          encabezado: "Periodicidad",
          celda: (item) => (
            <span className="capitalize">{texto(item.periodicidad)}</span>
          ),
        },
        {
          encabezado: "Próxima ejecución",
          celda: (item) => fechaCorta(item.fechaProximaEjecucion),
        },
      ],
      campos: [
        {
          nombre: "equipoId",
          etiqueta: "Equipo",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Plan",
          opciones: (equipos.data ?? []).map((equipo) => ({
            valor: equipo.publicId,
            etiqueta: equipo.nombre ?? equipo.codigo ?? equipo.publicId,
          })),
        },
        {
          nombre: "descripcion",
          etiqueta: "Descripción",
          tipo: "textarea",
          requerido: true,
          ancho: "full",
          seccion: "Plan",
        },
        {
          nombre: "tipo",
          etiqueta: "Tipo",
          tipo: "select",
          requerido: true,
          seccion: "Plan",
          opciones: [
            { valor: "preventivo", etiqueta: "Preventivo" },
            { valor: "predictivo", etiqueta: "Predictivo" },
          ],
        },
        {
          nombre: "periodicidad",
          etiqueta: "Periodicidad",
          tipo: "select",
          requerido: true,
          seccion: "Plan",
          opciones: [
            { valor: "diario", etiqueta: "Diario" },
            { valor: "semanal", etiqueta: "Semanal" },
            { valor: "mensual", etiqueta: "Mensual" },
            { valor: "trimestral", etiqueta: "Trimestral" },
            { valor: "semestral", etiqueta: "Semestral" },
            { valor: "anual", etiqueta: "Anual" },
          ],
        },
        { nombre: "intervalo", etiqueta: "Intervalo", tipo: "number", seccion: "Programación" },
        {
          nombre: "fechaProximaEjecucion",
          etiqueta: "Próxima ejecución",
          tipo: "date",
          seccion: "Programación",
        },
      ],
      aValores: (item) => ({
        equipoId: item?.equipo?.publicId ?? item?.equipoId ?? "",
        descripcion: item?.descripcion ?? "",
        tipo: item?.tipo ?? "preventivo",
        periodicidad: item?.periodicidad ?? "mensual",
        intervalo:
          item?.intervalo === null || item?.intervalo === undefined
            ? ""
            : String(item.intervalo),
        fechaProximaEjecucion: item?.fechaProximaEjecucion ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          equipoId: String(valores.equipoId ?? ""),
          descripcion: String(valores.descripcion ?? "").trim(),
          tipo: String(valores.tipo ?? ""),
          periodicidad: String(valores.periodicidad ?? ""),
        };
        if (String(valores.intervalo ?? "").trim()) {
          payload.intervalo = Number(valores.intervalo);
        }
        if (String(valores.fechaProximaEjecucion ?? "").trim()) {
          payload.fechaProximaEjecucion = String(valores.fechaProximaEjecucion);
        }
        return payload;
      },
    }),
    [equipos.data],
  );

  return <ResourcePage config={config} />;
}
