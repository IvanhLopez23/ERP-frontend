"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type Departamento = {
  publicId: string;
  nombre?: string | null;
  descripcion?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Departamento> = {
  titulo: "Departamentos",
  descripcion: "Áreas que conforman la estructura de la organización.",
  recurso: "/rh/departamentos",
  permiso: "/rh/departamentos",
  singular: "Departamento",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? "Departamento",
  buscarPlaceholder: "Buscar departamento…",
  vacioTitulo: "Todavía no hay departamentos",
  vacioDescripcion: "Crea el primer departamento para organizar al personal.",
  columnas: [
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Descripción",
      celda: (item) => (
        <span className="text-muted-foreground">{texto(item.descripcion)}</span>
      ),
    },
  ],
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, ancho: "full" },
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "textarea",
      ancho: "full",
    },
  ],
  aValores: (item) => ({
    nombre: item?.nombre ?? "",
    descripcion: item?.descripcion ?? "",
  }),
  aPayload: (valores) => {
    const payload: Record<string, unknown> = {
      nombre: String(valores.nombre ?? "").trim(),
    };
    const descripcion = String(valores.descripcion ?? "").trim();
    if (descripcion) payload.descripcion = descripcion;
    return payload;
  },
};

export default function DepartamentosPage() {
  return <ResourcePage config={config} />;
}
