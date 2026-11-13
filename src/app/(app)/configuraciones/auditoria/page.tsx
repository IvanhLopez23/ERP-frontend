"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { fechaHora, texto } from "@/lib/format";

type Accion = {
  publicId: string;
  metodo?: string | null;
  endpoint?: string | null;
  statusCode?: number | null;
  duracionMs?: number | null;
  exitoso?: boolean;
  fechaCreacion?: string | null;
  usuario?: { nombreUsuario?: string } | null;
};

const config: CrudConfig<Accion> = {
  titulo: "Auditoría",
  descripcion: "Acciones registradas sobre la API: método, ruta, resultado y duración.",
  recurso: "/auditoria/acciones",
  permiso: "/configuraciones/auditoria",
  singular: "Acción",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.endpoint ?? "Acción",
  soloLectura: true,
  tieneActivo: false,
  urls: { listar: "/auditoria/acciones/paginacion" },
  vacioTitulo: "Sin acciones auditadas",
  vacioDescripcion: "Aquí aparecerán las peticiones registradas por el backend.",
  columnas: [
    {
      encabezado: "Fecha",
      celda: (item) => (
        <span className="whitespace-nowrap">{fechaHora(item.fechaCreacion)}</span>
      ),
    },
    {
      encabezado: "Usuario",
      celda: (item) => texto(item.usuario?.nombreUsuario),
    },
    {
      encabezado: "Método",
      celda: (item) => (
        <span className="font-mono text-xs font-semibold">
          {texto(item.metodo)}
        </span>
      ),
    },
    {
      encabezado: "Endpoint",
      celda: (item) => (
        <span
          className="block max-w-[320px] truncate font-mono text-xs"
          title={item.endpoint ?? undefined}
        >
          {texto(item.endpoint)}
        </span>
      ),
    },
    {
      encabezado: "Estatus",
      alineacion: "right",
      celda: (item) => (
        <span className="tabular font-mono text-xs">{texto(item.statusCode)}</span>
      ),
    },
    {
      encabezado: "Duración",
      alineacion: "right",
      celda: (item) => (
        <span className="tabular text-xs">{texto(item.duracionMs)} ms</span>
      ),
    },
    {
      encabezado: "Resultado",
      celda: (item) => (
        <EstadoBadge
          estado={item.exitoso ? "exitoso" : "fallido"}
          activo={item.exitoso}
        />
      ),
    },
  ],
  campos: [],
  aValores: () => ({}),
  aPayload: () => ({}),
};

export default function AuditoriaPage() {
  return <ResourcePage config={config} />;
}
