"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";
import { Badge } from "@/components/ui/badge";

type Rol = {
  publicId: string;
  descripcion?: string | null;
  esAdministrador?: boolean;
  activo?: boolean;
};

const config: CrudConfig<Rol> = {
  titulo: "Roles",
  descripcion: "Roles del sistema y su nivel de acceso.",
  recurso: "/roles",
  permiso: "/configuraciones/roles",
  singular: "Rol",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.descripcion ?? "Rol",
  buscarPlaceholder: "Buscar rol…",
  vacioTitulo: "Todavía no hay roles",
  vacioDescripcion: "Crea el primer rol del sistema.",
  columnas: [
    { encabezado: "Descripción", celda: (item) => texto(item.descripcion) },
    {
      encabezado: "Tipo",
      celda: (item) =>
        item.esAdministrador ? (
          <Badge variant="secondary">Administrador</Badge>
        ) : (
          <Badge variant="outline">Estándar</Badge>
        ),
    },
  ],
  campos: [
    {
      nombre: "descripcion",
      etiqueta: "Descripción",
      tipo: "text",
      requerido: true,
      ancho: "full",
      seccion: "Rol",
    },
    {
      nombre: "esAdministrador",
      etiqueta: "Acceso total",
      tipo: "checkbox",
      ancho: "full",
      seccion: "Permisos",
      ayuda: "Omite la validación de permisos por pantalla.",
    },
  ],
  aValores: (item) => ({
    descripcion: item?.descripcion ?? "",
    esAdministrador: Boolean(item?.esAdministrador),
  }),
  aPayload: (valores) => ({
    descripcion: String(valores.descripcion ?? "").trim(),
    esAdministrador: Boolean(valores.esAdministrador),
  }),
};

export default function RolesPage() {
  return <ResourcePage config={config} />;
}
