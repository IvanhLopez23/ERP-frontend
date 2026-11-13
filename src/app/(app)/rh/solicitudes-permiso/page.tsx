"use client";

import { useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderUp, LoaderCircle, Paperclip } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, mediaUrl, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Solicitud = {
  publicId: string;
  tipo?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  motivo?: string | null;
  comprobante?: string | null;
  estatus?: string | null;
  diasSolicitados?: number | string | null;
  empleado?: {
    publicId?: string;
    nombre?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
  } | null;
  empleadoId?: string | null;
};

type EmpleadoOpcion = {
  publicId: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codigo?: string;
};

const ACEPTAR_COMPROBANTE =
  "application/pdf,image/png,image/jpeg,image/webp";

function BotonAdjuntarComprobante({ solicitud }: { solicitud: Solicitud }) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);

  const adjuntar = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append("archivo", archivo);
      return apiFetch(
        `/rh/solicitudes-permiso/comprobante/${solicitud.publicId}`,
        { method: "PATCH", body: form },
      );
    },
    onSuccess: () => {
      toast.success("Comprobante actualizado correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["crud", "/rh/solicitudes-permiso"],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const etiqueta = solicitud.comprobante
    ? "Reemplazar comprobante"
    : "Adjuntar comprobante";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACEPTAR_COMPROBANTE}
        className="sr-only"
        onChange={(evento) => {
          const archivo = evento.target.files?.[0];
          if (archivo) adjuntar.mutate(archivo);
          evento.target.value = "";
        }}
      />
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="cursor-pointer"
        aria-label={etiqueta}
        title={etiqueta}
        disabled={adjuntar.isPending}
        onClick={() => inputRef.current?.click()}
      >
        {adjuntar.isPending ? (
          <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <FolderUp className="size-3.5" aria-hidden="true" />
        )}
      </Button>
    </>
  );
}

export default function SolicitudesPermisoPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();
  const puedeEmpleados = puede("/rh/empleados");

  const empleados = useQuery<EmpleadoOpcion[]>({
    queryKey: ["empleados-select"],
    queryFn: () => apiFetch<EmpleadoOpcion[]>("/rh/empleados"),
    enabled: puedeEmpleados,
    staleTime: 5 * 60_000,
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({ publicId, estatus }: { publicId: string; estatus: string }) =>
      apiFetch(`/rh/solicitudes-permiso/estatus/${publicId}`, {
        method: "PATCH",
        body: JSON.stringify({ estatus }),
      }),
    onSuccess: () => {
      toast.success("Solicitud actualizada correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["crud", "/rh/solicitudes-permiso"],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function nombreEmpleado(empleado: EmpleadoOpcion) {
    return (
      [empleado.nombre, empleado.apellidoPaterno, empleado.apellidoMaterno]
        .filter(Boolean)
        .join(" ") || empleado.codigo || empleado.publicId
    );
  }

  const config = useMemo<CrudConfig<Solicitud>>(
    () => ({
      titulo: "Solicitudes de permiso",
      descripcion: "Permisos y vacaciones solicitadas por el personal.",
      recurso: "/rh/solicitudes-permiso",
      permiso: "/rh/solicitudes-permiso",
      singular: "Solicitud",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => `Solicitud de ${item.empleado?.nombre ?? "empleado"}`,
      tieneActivo: false,
      soloCrear: true,
      urls: { listar: "/rh/solicitudes-permiso" },
      buscarPlaceholder: "Buscar solicitud…",
      vacioTitulo: "Todavía no hay solicitudes",
      vacioDescripcion: "Registra la primera solicitud de permiso o vacaciones.",
      nota: "Las solicitudes de tipo “vacaciones” requieren que el empleado tenga un periodo vacacional vigente.",
      columnas: [
        {
          encabezado: "Empleado",
          celda: (item) =>
            [
              item.empleado?.nombre,
              item.empleado?.apellidoPaterno,
              item.empleado?.apellidoMaterno,
            ]
              .filter(Boolean)
              .join(" ") || "—",
        },
        {
          encabezado: "Tipo",
          celda: (item) => (
            <span className="capitalize">{texto(item.tipo)}</span>
          ),
        },
        {
          encabezado: "Periodo",
          celda: (item) =>
            `${fechaCorta(item.fechaInicio)} → ${fechaCorta(item.fechaFin)}`,
        },
        {
          encabezado: "Días",
          celda: (item) => texto(item.diasSolicitados),
        },
        {
          encabezado: "Comprobante",
          celda: (item) => {
            const url = mediaUrl(item.comprobante);
            return (
              <div className="flex items-center gap-2">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
                  >
                    <Paperclip className="size-3.5" aria-hidden="true" />
                    Ver
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Sin archivo
                  </span>
                )}
                <BotonAdjuntarComprobante solicitud={item} />
              </div>
            );
          },
        },
        {
          encabezado: "Estatus",
          celda: (item) => <EstadoBadge estado={item.estatus} />,
        },
      ],
      campos: [
        {
          nombre: "empleadoId",
          etiqueta: "Empleado",
          tipo: "select",
          requerido: true,
          ancho: "full",
          opciones: (empleados.data ?? []).map((empleado) => ({
            valor: empleado.publicId,
            etiqueta: nombreEmpleado(empleado),
          })),
        },
        {
          nombre: "tipo",
          etiqueta: "Tipo",
          tipo: "select",
          requerido: true,
          opciones: [
            { valor: "vacaciones", etiqueta: "Vacaciones" },
            { valor: "enfermedad", etiqueta: "Enfermedad" },
            { valor: "personal", etiqueta: "Personal" },
            { valor: "otro", etiqueta: "Otro" },
          ],
        },
        { nombre: "fechaInicio", etiqueta: "Fecha de inicio", tipo: "date", requerido: true },
        { nombre: "fechaFin", etiqueta: "Fecha de fin", tipo: "date", requerido: true },
        {
          nombre: "motivo",
          etiqueta: "Motivo",
          tipo: "textarea",
          requerido: true,
          ancho: "full",
        },
        {
          nombre: "archivo",
          etiqueta: "Comprobante (opcional)",
          tipo: "archivo",
          ancho: "full",
          aceptar: "application/pdf,image/png,image/jpeg,image/webp",
          seccion: "Comprobante",
          ayuda:
            "Comprobante médico o carta de vacaciones firmada. PDF, JPG, PNG o WebP. Máximo 5 MB.",
        },
      ],
      aValores: (item) => ({
        empleadoId: item?.empleado?.publicId ?? item?.empleadoId ?? "",
        tipo: item?.tipo ?? "",
        fechaInicio: item?.fechaInicio ?? "",
        fechaFin: item?.fechaFin ?? "",
        motivo: item?.motivo ?? "",
        archivo: null,
      }),
      aPayload: (valores) => {
        const form = new FormData();
        const agregar = (
          clave: string,
          valor: string | boolean | File | null,
        ) => {
          if (valor instanceof File) {
            form.append(clave, valor);
          } else if (typeof valor === "string" && valor.trim()) {
            form.append(clave, valor.trim());
          }
        };

        agregar("empleadoId", valores.empleadoId);
        agregar("tipo", valores.tipo);
        agregar("fechaInicio", valores.fechaInicio);
        agregar("fechaFin", valores.fechaFin);
        agregar("motivo", valores.motivo);
        agregar("archivo", valores.archivo);

        return form;
      },
      validar: (valores) => {
        const inicio = String(valores.fechaInicio ?? "");
        const fin = String(valores.fechaFin ?? "");
        if (inicio && fin && fin < inicio) {
          return { fechaFin: "La fecha fin no puede ser anterior al inicio." };
        }
        return null;
      },
      accionesExtra: (item) =>
        item.estatus === "pendiente" ? (
          <>
            <DropdownMenuItem
              className="cursor-pointer"
              disabled={cambiarEstatus.isPending}
              onClick={() =>
                cambiarEstatus.mutate({ publicId: item.publicId, estatus: "aprobada" })
              }
            >
              Aprobar
            </DropdownMenuItem>
            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              disabled={cambiarEstatus.isPending}
              onClick={() =>
                cambiarEstatus.mutate({ publicId: item.publicId, estatus: "rechazada" })
              }
            >
              Rechazar
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem disabled>Sin acciones</DropdownMenuItem>
        ),
      estadoFila: (item) => ({ texto: item.estatus ?? "pendiente" }),
    }),
    [empleados.data, cambiarEstatus],
  );

  return <ResourcePage config={config} />;
}
