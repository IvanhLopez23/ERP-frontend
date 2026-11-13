"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaHora, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";

type Movimiento = {
  publicId: string;
  cantidad?: number | string | null;
  tipo?: string | null;
  observaciones?: string | null;
  fechaCreacion?: string | null;
  refaccion?: { publicId?: string; nombre?: string; codigo?: string } | null;
  ordenTrabajo?: { publicId?: string; folio?: string } | null;
  refaccionId?: string | null;
  ordenTrabajoId?: string | null;
};

type Opcion = { publicId: string; nombre?: string; codigo?: string; folio?: string };

export default function MovimientosRefaccionPage() {
  const { puede } = useAuth();
  const puedeRefacciones = puede("/mantenimiento/refacciones");
  const puedeOrdenes = puede("/mantenimiento/ordenes-trabajo");

  const refacciones = useQuery<Opcion[]>({
    queryKey: ["refacciones-select"],
    queryFn: () => apiFetch<Opcion[]>("/mantenimiento/refacciones"),
    enabled: puedeRefacciones,
    staleTime: 5 * 60_000,
  });

  const ordenes = useQuery<Opcion[]>({
    queryKey: ["ordenes-select"],
    queryFn: () => apiFetch<Opcion[]>("/mantenimiento/ordenes-trabajo"),
    enabled: puedeOrdenes,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Movimiento>>(
    () => ({
      titulo: "Movimientos de refacción",
      descripcion: "Entradas, salidas y ajustes del inventario de refacciones.",
      recurso: "/mantenimiento/movimientos-refaccion",
      permiso: "/mantenimiento/refacciones",
      singular: "Movimiento",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.refaccion?.nombre ?? "Movimiento",
      tieneActivo: false,
      soloCrear: true,
      urls: { listar: "/mantenimiento/movimientos-refaccion" },
      buscarPlaceholder: "Buscar movimiento…",
      vacioTitulo: "Todavía no hay movimientos",
      vacioDescripcion: "Registra la primera entrada o salida de refacciones.",
      columnas: [
        {
          encabezado: "Refacción",
          celda: (item) =>
            item.refaccion?.nombre ?? item.refaccion?.codigo ?? "—",
        },
        {
          encabezado: "Tipo",
          celda: (item) => <EstadoBadge estado={item.tipo} />,
        },
        {
          encabezado: "Cantidad",
          alineacion: "right",
          celda: (item) => (
            <span className="tabular">{texto(item.cantidad)}</span>
          ),
        },
        {
          encabezado: "Orden",
          celda: (item) => texto(item.ordenTrabajo?.folio),
        },
        {
          encabezado: "Fecha",
          celda: (item) => fechaHora(item.fechaCreacion),
        },
      ],
      campos: [
        {
          nombre: "refaccionId",
          etiqueta: "Refacción",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Movimiento",
          opciones: (refacciones.data ?? []).map((refaccion) => ({
            valor: refaccion.publicId,
            etiqueta: refaccion.nombre ?? refaccion.codigo ?? refaccion.publicId,
          })),
        },
        {
          nombre: "ordenTrabajoId",
          etiqueta: "Orden de trabajo (opcional)",
          tipo: "select",
          ancho: "full",
          seccion: "Movimiento",
          opciones: (ordenes.data ?? []).map((orden) => ({
            valor: orden.publicId,
            etiqueta: orden.folio ?? orden.publicId,
          })),
        },
        {
          nombre: "cantidad",
          etiqueta: "Cantidad",
          tipo: "number",
          requerido: true,
          sufijo: "unidades",
          seccion: "Movimiento",
        },
        {
          nombre: "tipo",
          etiqueta: "Tipo",
          tipo: "select",
          requerido: true,
          seccion: "Movimiento",
          opciones: [
            { valor: "entrada", etiqueta: "Entrada" },
            { valor: "salida", etiqueta: "Salida" },
            { valor: "ajuste", etiqueta: "Ajuste" },
          ],
        },
        {
          nombre: "observaciones",
          etiqueta: "Observaciones",
          tipo: "textarea",
          ancho: "full",
          seccion: "Notas",
        },
      ],
      aValores: () => ({
        refaccionId: "",
        ordenTrabajoId: "",
        cantidad: "",
        tipo: "entrada",
        observaciones: "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          refaccionId: String(valores.refaccionId ?? ""),
          cantidad: Number(valores.cantidad ?? 0),
          tipo: String(valores.tipo ?? "entrada"),
        };
        if (String(valores.ordenTrabajoId ?? "").trim()) {
          payload.ordenTrabajoId = String(valores.ordenTrabajoId);
        }
        if (String(valores.observaciones ?? "").trim()) {
          payload.observaciones = String(valores.observaciones).trim();
        }
        return payload;
      },
    }),
    [refacciones.data, ordenes.data],
  );

  return <ResourcePage config={config} />;
}
