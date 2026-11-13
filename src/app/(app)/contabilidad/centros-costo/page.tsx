"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type CentroCosto = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  tipo?: string | null;
  descripcion?: string | null;
  activo?: boolean;
};

const config: CrudConfig<CentroCosto> = {
  titulo: "Centros de costo",
  descripcion: "Centros, áreas y proyectos para etiquetar pólizas y presupuestos.",
  recurso: "/contabilidad/centros-costo",
  permiso: "/contabilidad/centros-costo",
  singular: "Centro de costo",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? item.codigo ?? "Centro",
  paginado: false,
  buscarPlaceholder: "Buscar por código o nombre…",
  vacioTitulo: "Todavía no hay centros de costo",
  vacioDescripcion: "Crea el primer centro, área o proyecto.",
  columnas: [
    {
      encabezado: "Código",
      celda: (item) => (
        <span className="font-mono text-xs">{texto(item.codigo)}</span>
      ),
    },
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Tipo",
      celda: (item) => (
        <span className="capitalize">{texto(item.tipo, "centro_costo").replace(/_/g, " ")}</span>
      ),
    },
    {
      encabezado: "Descripción",
      celda: (item) => (
        <span className="text-muted-foreground">{texto(item.descripcion)}</span>
      ),
    },
  ],
  campos: [
    { nombre: "codigo", etiqueta: "Código", tipo: "text", requerido: true, seccion: "Información general" },
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Información general" },
    {
      nombre: "tipo",
      etiqueta: "Tipo",
      tipo: "select",
      valorInicial: "centro_costo",
      seccion: "Información general",
      opciones: [
        { valor: "centro_costo", etiqueta: "Centro de costo" },
        { valor: "area", etiqueta: "Área" },
        { valor: "proyecto", etiqueta: "Proyecto" },
      ],
    },
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "textarea",
      seccion: "Detalles",
    },
    {
      nombre: "activo",
      etiqueta: "Activo",
      tipo: "checkbox",
      valorInicial: true,
      ayuda: "Disponible para etiquetar movimientos.",
      seccion: "Detalles",
    },
  ],
  aValores: (item) => ({
    codigo: item?.codigo ?? "",
    nombre: item?.nombre ?? "",
    tipo: item?.tipo ?? "centro_costo",
    descripcion: item?.descripcion ?? "",
    activo: item?.activo ?? true,
  }),
  aPayload: (valores) => {
    const payload: Record<string, unknown> = {
      codigo: String(valores.codigo ?? "").trim(),
      nombre: String(valores.nombre ?? "").trim(),
      tipo: String(valores.tipo ?? "centro_costo"),
      activo: Boolean(valores.activo),
    };
    if (String(valores.descripcion ?? "").trim()) {
      payload.descripcion = String(valores.descripcion).trim();
    }
    return payload;
  },
};

export default function CentrosCostoPage() {
  return <ResourcePage config={config} />;
}
