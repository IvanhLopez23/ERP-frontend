"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Categoria = {
  publicId: string;
  nombre?: string | null;
  descripcion?: string | null;
  activo?: boolean;
  padre?: { publicId?: string; nombre?: string } | null;
  padreId?: string | null;
};

export default function CategoriasPage() {
  const { puede } = useAuth();
  const puedeCategorias = puede("/almacen/categorias");

  const categorias = useQuery<Categoria[]>({
    queryKey: ["categorias-select"],
    queryFn: () => apiFetch<Categoria[]>("/almacen/categorias"),
    enabled: puedeCategorias,
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Categoria>>(
    () => ({
      titulo: "Categorías",
      descripcion: "Categorías y subcategorías para clasificar productos.",
      recurso: "/almacen/categorias",
      permiso: "/almacen/categorias",
      singular: "Categoría",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.nombre ?? "Categoría",
      buscarPlaceholder: "Buscar categoría…",
      vacioTitulo: "Todavía no hay categorías",
      vacioDescripcion: "Crea la primera categoría de productos.",
      columnas: [
        { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
        {
          encabezado: "Categoría padre",
          celda: (item) => texto(item.padre?.nombre),
        },
        {
          encabezado: "Descripción",
          celda: (item) => (
            <span className="text-muted-foreground">{texto(item.descripcion)}</span>
          ),
        },
      ],
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, ancho: "full", seccion: "Información general" },
        {
          nombre: "padreId",
          etiqueta: "Categoría padre (opcional)",
          tipo: "select",
          ancho: "full",
          seccion: "Información general",
          opciones: (categorias.data ?? []).map((categoria) => ({
            valor: categoria.publicId,
            etiqueta: categoria.nombre ?? categoria.publicId,
          })),
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
        nombre: item?.nombre ?? "",
        padreId: item?.padre?.publicId ?? item?.padreId ?? "",
        descripcion: item?.descripcion ?? "",
      }),
      aPayload: (valores, original) => {
        const payload: Record<string, unknown> = {
          nombre: String(valores.nombre ?? "").trim(),
        };
        const padreId = String(valores.padreId ?? "").trim();
        if (padreId && padreId !== original?.publicId) {
          payload.padreId = padreId;
        }
        const descripcion = String(valores.descripcion ?? "").trim();
        if (descripcion) payload.descripcion = descripcion;
        return payload;
      },
      validar: (valores) => {
        const nombre = String(valores.nombre ?? "").trim();
        if (!nombre) return { nombre: "El nombre es obligatorio." };
        if (nombre.length > 120) return { nombre: "Máximo 120 caracteres." };
        return null;
      },
    }),
    [categorias.data],
  );

  return <ResourcePage config={config} />;
}
