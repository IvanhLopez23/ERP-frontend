"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type Unidad = {
  publicId: string;
  nombre?: string | null;
  abreviatura?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Unidad> = {
  titulo: "Unidades de medida",
  descripcion: "Unidades con las que se cuantifica el inventario.",
  recurso: "/almacen/unidades-medida",
  permiso: "/almacen/unidades-medida",
  singular: "Unidad",
  genero: "f",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? "Unidad",
  buscarPlaceholder: "Buscar unidad…",
  vacioTitulo: "Todavía no hay unidades",
  vacioDescripcion: "Crea la primera unidad de medida.",
  columnas: [
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Abreviatura",
      celda: (item) => (
        <span className="font-mono text-xs">{texto(item.abreviatura)}</span>
      ),
    },
  ],
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true },
    {
      nombre: "abreviatura",
      etiqueta: "Abreviatura",
      tipo: "text",
      requerido: true,
      ayuda: "Ej. pz, kg, lt.",
    },
  ],
  aValores: (item) => ({
    nombre: item?.nombre ?? "",
    abreviatura: item?.abreviatura ?? "",
  }),
  aPayload: (valores) => ({
    nombre: String(valores.nombre ?? "").trim(),
    abreviatura: String(valores.abreviatura ?? "").trim(),
  }),
};

export default function UnidadesMedidaPage() {
  return <ResourcePage config={config} />;
}
