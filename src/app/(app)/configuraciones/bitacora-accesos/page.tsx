"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { fechaHora, texto } from "@/lib/format";

type Acceso = {
  publicId: string;
  acceso?: boolean;
  descripcion?: string | null;
  fechaCreacion?: string | null;
  usuario?: { nombreUsuario?: string; correo?: string } | null;
};

const config: CrudConfig<Acceso> = {
  titulo: "Bitácora de accesos",
  descripcion: "Intentos de inicio de sesión autorizados y rechazados.",
  recurso: "/bitacora-accesos",
  permiso: "/configuraciones/bitacora-accesos",
  singular: "Acceso",
  filaId: (item) => item.publicId,
  etiquetaFila: () => "Acceso",
  soloLectura: true,
  tieneActivo: false,
  urls: { listar: "/bitacora-accesos/paginacion" },
  vacioTitulo: "Sin registros de acceso",
  vacioDescripcion: "Aquí aparecerán los intentos de inicio de sesión.",
  columnas: [
    {
      encabezado: "Fecha",
      celda: (item) => (
        <span className="whitespace-nowrap">{fechaHora(item.fechaCreacion)}</span>
      ),
    },
    {
      encabezado: "Usuario",
      celda: (item) => (
        <div className="min-w-0">
          <p className="truncate font-medium">
            {texto(item.usuario?.nombreUsuario)}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {texto(item.usuario?.correo, "")}
          </p>
        </div>
      ),
    },
    {
      encabezado: "Resultado",
      celda: (item) => (
        <EstadoBadge
          estado={item.acceso ? "autorizado" : "rechazado"}
          activo={item.acceso}
        />
      ),
    },
    {
      encabezado: "Descripción",
      celda: (item) => (
        <span className="text-muted-foreground">{texto(item.descripcion)}</span>
      ),
    },
  ],
  campos: [],
  aValores: () => ({}),
  aPayload: () => ({}),
};

export default function BitacoraAccesosPage() {
  return <ResourcePage config={config} />;
}
