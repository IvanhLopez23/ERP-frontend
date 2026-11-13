"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type Turno = {
  publicId: string;
  nombre?: string | null;
  periodicidad?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Turno> = {
  titulo: "Turnos de comedor",
  descripcion: "Turnos que determinan la periodicidad del menú del empleado.",
  recurso: "/comedor/turnos",
  permiso: "/comedor",
  singular: "Turno",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? "Turno",
  paginado: false,
  tieneActivo: false,
  soloCrear: true,
  buscarPlaceholder: "Buscar turno…",
  vacioTitulo: "Todavía no hay turnos",
  vacioDescripcion: "Crea el primer turno de comedor.",
  columnas: [
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Periodicidad",
      celda: (item) => (
        <span className="capitalize">{texto(item.periodicidad)}</span>
      ),
    },
  ],
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, ancho: "full" },
    {
      nombre: "periodicidad",
      etiqueta: "Periodicidad",
      tipo: "select",
      requerido: true,
      ancho: "full",
      opciones: [
        { valor: "semanal", etiqueta: "Semanal" },
        { valor: "quincenal", etiqueta: "Quincenal" },
        { valor: "mensual", etiqueta: "Mensual" },
      ],
    },
  ],
  aValores: () => ({ nombre: "", periodicidad: "semanal" }),
  aPayload: (valores) => ({
    nombre: String(valores.nombre ?? "").trim(),
    periodicidad: String(valores.periodicidad ?? "semanal"),
  }),
};

export default function TurnosComedorPage() {
  return <ResourcePage config={config} />;
}
