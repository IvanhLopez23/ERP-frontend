"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { fechaCorta, texto } from "@/lib/format";

type Equipo = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  ubicacion?: string | null;
  fechaAdquisicion?: string | null;
  estado?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Equipo> = {
  titulo: "Equipos",
  descripcion: "Activos físicos sujetos a mantenimiento.",
  recurso: "/mantenimiento/equipos",
  permiso: "/mantenimiento/equipos",
  singular: "Equipo",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? item.codigo ?? "Equipo",
  buscarPlaceholder: "Buscar por código, nombre o ubicación…",
  vacioTitulo: "Todavía no hay equipos",
  vacioDescripcion: "Registra el primer equipo para programar mantenimiento.",
  columnas: [
    {
      encabezado: "Código",
      celda: (item) => (
        <span className="font-mono text-xs">{texto(item.codigo)}</span>
      ),
    },
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    { encabezado: "Ubicación", celda: (item) => texto(item.ubicacion) },
    {
      encabezado: "Adquisición",
      celda: (item) => fechaCorta(item.fechaAdquisicion),
    },
  ],
  campos: [
    { nombre: "codigo", etiqueta: "Código", tipo: "text", requerido: true, seccion: "Información general" },
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Información general" },
    { nombre: "ubicacion", etiqueta: "Ubicación", tipo: "text", seccion: "Información general" },
    {
      nombre: "estado",
      etiqueta: "Estado",
      tipo: "select",
      valorInicial: "operativo",
      seccion: "Información general",
      opciones: [
        { valor: "operativo", etiqueta: "Operativo" },
        { valor: "en_reparacion", etiqueta: "En reparación" },
        { valor: "baja", etiqueta: "Baja" },
      ],
    },
    {
      nombre: "fechaAdquisicion",
      etiqueta: "Fecha de adquisición",
      tipo: "date",
      seccion: "Información general",
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
    ubicacion: item?.ubicacion ?? "",
    estado: item?.estado ?? "operativo",
    fechaAdquisicion: item?.fechaAdquisicion ?? "",
    descripcion: item?.descripcion ?? "",
  }),
  aPayload: (valores) => {
    const payload: Record<string, unknown> = {
      codigo: String(valores.codigo ?? "").trim(),
      nombre: String(valores.nombre ?? "").trim(),
    };
    if (String(valores.ubicacion ?? "").trim()) {
      payload.ubicacion = String(valores.ubicacion).trim();
    }
    if (String(valores.estado ?? "").trim()) {
      payload.estado = String(valores.estado);
    }
    if (String(valores.fechaAdquisicion ?? "").trim()) {
      payload.fechaAdquisicion = String(valores.fechaAdquisicion);
    }
    if (String(valores.descripcion ?? "").trim()) {
      payload.descripcion = String(valores.descripcion).trim();
    }
    return payload;
  },
  estadoFila: (item) => ({ texto: item.estado ?? "operativo" }),
};

export default function EquiposPage() {
  return <ResourcePage config={config} />;
}
