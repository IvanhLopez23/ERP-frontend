"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Refaccion = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  stockMinimo?: number | string | null;
  activo?: boolean;
  producto?: { publicId?: string; nombre?: string } | null;
  productoId?: string | null;
};

type Opcion = { publicId: string; nombre?: string; codigo?: string };

export default function RefaccionesPage() {
  const { puede } = useAuth();
  const puedeProductos = puede("/almacen/productos");

  const productos = useQuery<Opcion[]>({
    queryKey: ["productos-select-refacciones"],
    queryFn: () => apiFetch<Opcion[]>("/almacen/productos"),
    enabled: puedeProductos,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Refaccion>>(
    () => ({
      titulo: "Refacciones",
      descripcion: "Inventario de refacciones y su stock mínimo de alerta.",
      recurso: "/mantenimiento/refacciones",
      permiso: "/mantenimiento/refacciones",
      singular: "Refacción",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.nombre ?? item.codigo ?? "Refacción",
      buscarPlaceholder: "Buscar por código o nombre…",
      vacioTitulo: "Todavía no hay refacciones",
      vacioDescripcion: "Registra la primera refacción del almacén técnico.",
      columnas: [
        {
          encabezado: "Código",
          celda: (item) => (
            <span className="font-mono text-xs">{texto(item.codigo)}</span>
          ),
        },
        { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
        {
          encabezado: "Producto vinculado",
          celda: (item) => texto(item.producto?.nombre),
        },
        {
          encabezado: "Stock mínimo",
          alineacion: "right",
          celda: (item) => (
            <span className="tabular">{texto(item.stockMinimo, "0")}</span>
          ),
        },
      ],
      campos: [
        { nombre: "codigo", etiqueta: "Código", tipo: "text", requerido: true, seccion: "Información general" },
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Información general" },
        {
          nombre: "productoId",
          etiqueta: "Producto vinculado (opcional)",
          tipo: "select",
          ancho: "full",
          seccion: "Información general",
          opciones: (productos.data ?? []).map((producto) => ({
            valor: producto.publicId,
            etiqueta: producto.nombre ?? producto.codigo ?? producto.publicId,
          })),
        },
        {
          nombre: "stockMinimo",
          etiqueta: "Stock mínimo",
          tipo: "number",
          sufijo: "unidades",
          ancho: "full",
          seccion: "Inventario",
        },
        {
          nombre: "descripcion",
          etiqueta: "Descripción",
          tipo: "textarea",
          ancho: "full",
          seccion: "Detalles",
        },
      ],
      aValores: (item) => ({
        codigo: item?.codigo ?? "",
        nombre: item?.nombre ?? "",
        productoId: item?.producto?.publicId ?? item?.productoId ?? "",
        stockMinimo:
          item?.stockMinimo === null || item?.stockMinimo === undefined
            ? ""
            : String(item.stockMinimo),
        descripcion: item?.descripcion ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          codigo: String(valores.codigo ?? "").trim(),
          nombre: String(valores.nombre ?? "").trim(),
        };
        if (String(valores.productoId ?? "").trim()) {
          payload.productoId = String(valores.productoId);
        }
        if (String(valores.stockMinimo ?? "").trim()) {
          payload.stockMinimo = Number(valores.stockMinimo);
        }
        if (String(valores.descripcion ?? "").trim()) {
          payload.descripcion = String(valores.descripcion).trim();
        }
        return payload;
      },
    }),
    [productos.data],
  );

  return <ResourcePage config={config} />;
}
