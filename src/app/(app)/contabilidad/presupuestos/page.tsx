"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { moneda } from "@/lib/format";
import { MESES, periodoTexto, type CentroCosto } from "@/lib/types/contabilidad";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Presupuesto = {
  publicId: string;
  anio: number;
  mes: number;
  ingresosPresupuestados: number | string;
  gastosPresupuestados: number | string;
  notas?: string | null;
  centroCosto?: { publicId?: string; nombre?: string; codigo?: string } | null;
  centroCostoId?: string;
};

export default function PresupuestosPage() {
  const { puede } = useAuth();
  const puedeCentros = puede("/contabilidad/centros-costo");

  const centros = useQuery<CentroCosto[]>({
    queryKey: ["contabilidad-centros"],
    queryFn: () => apiFetch<CentroCosto[]>("/contabilidad/centros-costo"),
    enabled: puedeCentros,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Presupuesto>>(
    () => ({
      titulo: "Presupuestos",
      descripcion: "Presupuesto mensual de ingresos y gastos por centro de costo.",
      recurso: "/contabilidad/presupuestos",
      permiso: "/contabilidad/presupuestos",
      singular: "Presupuesto",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) =>
        `${periodoTexto(item.anio, item.mes)} · ${item.centroCosto?.nombre ?? ""}`,
      paginado: false,
      tieneActivo: false,
      buscarPlaceholder: "Buscar por centro o periodo…",
      vacioTitulo: "Todavía no hay presupuestos",
      vacioDescripcion: "Crea el primer presupuesto mensual.",
      nota: "Solo puede existir un presupuesto por año, mes y centro de costo.",
      columnas: [
        {
          encabezado: "Periodo",
          celda: (item) => (
            <span className="font-medium">
              {periodoTexto(item.anio, item.mes)}
            </span>
          ),
        },
        {
          encabezado: "Centro de costo",
          celda: (item) => item.centroCosto?.nombre ?? "—",
        },
        {
          encabezado: "Ingresos",
          alineacion: "right",
          celda: (item) => (
            <span className="tabular">{moneda(item.ingresosPresupuestados)}</span>
          ),
        },
        {
          encabezado: "Gastos",
          alineacion: "right",
          celda: (item) => (
            <span className="tabular">{moneda(item.gastosPresupuestados)}</span>
          ),
        },
      ],
      campos: [
        {
          nombre: "anio",
          etiqueta: "Año",
          tipo: "number",
          requerido: true,
          valorInicial: String(new Date().getFullYear()),
          seccion: "Periodo",
        },
        {
          nombre: "mes",
          etiqueta: "Mes",
          tipo: "select",
          requerido: true,
          opciones: MESES.map((mes, indice) => ({
            valor: String(indice + 1),
            etiqueta: mes,
          })),
          seccion: "Periodo",
        },
        {
          nombre: "centroCostoId",
          etiqueta: "Centro de costo",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Periodo",
          opciones: (centros.data ?? []).map((centro) => ({
            valor: centro.publicId,
            etiqueta: `${centro.codigo} · ${centro.nombre}`,
          })),
        },
        {
          nombre: "ingresosPresupuestados",
          etiqueta: "Ingresos presupuestados",
          tipo: "number",
          sufijo: "MXN",
          seccion: "Montos",
        },
        {
          nombre: "gastosPresupuestados",
          etiqueta: "Gastos presupuestados",
          tipo: "number",
          sufijo: "MXN",
          seccion: "Montos",
        },
        {
          nombre: "notas",
          etiqueta: "Notas",
          tipo: "textarea",
          seccion: "Detalles",
        },
      ],
      aValores: (item) => ({
        anio: item?.anio ? String(item.anio) : String(new Date().getFullYear()),
        mes: item?.mes ? String(item.mes) : "",
        centroCostoId:
          item?.centroCosto?.publicId ?? item?.centroCostoId ?? "",
        ingresosPresupuestados:
          item?.ingresosPresupuestados === null ||
          item?.ingresosPresupuestados === undefined
            ? ""
            : String(item.ingresosPresupuestados),
        gastosPresupuestados:
          item?.gastosPresupuestados === null ||
          item?.gastosPresupuestados === undefined
            ? ""
            : String(item.gastosPresupuestados),
        notas: item?.notas ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          anio: Number(valores.anio ?? 0),
          mes: Number(valores.mes ?? 0),
          centroCostoId: String(valores.centroCostoId ?? ""),
          ingresosPresupuestados: Number(valores.ingresosPresupuestados ?? 0),
          gastosPresupuestados: Number(valores.gastosPresupuestados ?? 0),
        };
        if (String(valores.notas ?? "").trim()) {
          payload.notas = String(valores.notas).trim();
        }
        return payload;
      },
    }),
    [centros.data],
  );

  return <ResourcePage config={config} />;
}
