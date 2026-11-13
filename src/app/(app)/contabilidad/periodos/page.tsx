"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Lock, LockOpen } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta } from "@/lib/format";
import {
  MESES,
  periodoTexto,
  type PeriodoContable,
} from "@/lib/types/contabilidad";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";

export default function PeriodosContablesPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const cambiarEstatus = useMutation({
    mutationFn: ({
      publicId,
      accion,
    }: {
      publicId: string;
      accion: "cerrar" | "reabrir";
    }) =>
      apiFetch(`/contabilidad/periodos/${accion}/${publicId}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Periodo actualizado correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["crud", "/contabilidad/periodos"],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const config: CrudConfig<PeriodoContable> = {
    titulo: "Periodos contables",
    descripcion:
      "Periodos mensuales. Las pólizas solo pueden registrarse en un periodo abierto.",
    recurso: "/contabilidad/periodos",
    permiso: "/contabilidad/periodos",
    singular: "Periodo",
    filaId: (item) => item.publicId,
    etiquetaFila: (item) => periodoTexto(item.anio, item.mes),
    tieneActivo: false,
    buscarPlaceholder: "Buscar periodo…",
    vacioTitulo: "Todavía no hay periodos",
    vacioDescripcion: "Crea el primer periodo contable mensual.",
    nota: "El inicio debe ser el día 1 y el fin el último día del mes. Cerrar un periodo impide registrar pólizas en él.",
    columnas: [
      {
        encabezado: "Periodo",
        celda: (item) => (
          <span className="font-medium">{periodoTexto(item.anio, item.mes)}</span>
        ),
      },
      {
        encabezado: "Inicio",
        celda: (item) => fechaCorta(item.fechaInicio),
      },
      { encabezado: "Fin", celda: (item) => fechaCorta(item.fechaFin) },
      {
        encabezado: "Cierre",
        celda: (item) => fechaCorta(item.fechaCierre),
      },
      {
        encabezado: "Estatus",
        celda: (item) => <EstadoBadge estado={item.estatus} />,
      },
    ],
    campos: [
      {
        nombre: "anio",
        etiqueta: "Año",
        tipo: "number",
        requerido: true,
        valorInicial: String(new Date().getFullYear()),
        seccion: "Periodo",
      },
      {
        nombre: "mes",
        etiqueta: "Mes",
        tipo: "select",
        requerido: true,
        opciones: MESES.map((mes, indice) => ({
          valor: String(indice + 1),
          etiqueta: mes,
        })),
        seccion: "Periodo",
      },
      {
        nombre: "fechaInicio",
        etiqueta: "Fecha de inicio",
        tipo: "date",
        requerido: true,
        seccion: "Vigencia",
      },
      {
        nombre: "fechaFin",
        etiqueta: "Fecha de fin",
        tipo: "date",
        requerido: true,
        seccion: "Vigencia",
      },
    ],
    aValores: (item) => ({
      anio: item?.anio ? String(item.anio) : String(new Date().getFullYear()),
      mes: item?.mes ? String(item.mes) : "",
      fechaInicio: item?.fechaInicio ?? "",
      fechaFin: item?.fechaFin ?? "",
    }),
    aPayload: (valores) => ({
      anio: Number(valores.anio ?? 0),
      mes: Number(valores.mes ?? 0),
      fechaInicio: String(valores.fechaInicio ?? ""),
      fechaFin: String(valores.fechaFin ?? ""),
    }),
    estadoFila: (item) => ({ texto: item.estatus }),
    accionesExtra: (item) =>
      item.estatus === "abierto" ? (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!puede("/contabilidad/periodos", "editar") || cambiarEstatus.isPending}
          onClick={() =>
            cambiarEstatus.mutate({ publicId: item.publicId, accion: "cerrar" })
          }
        >
          <Lock className="size-4" aria-hidden="true" />
          Cerrar periodo
        </DropdownMenuItem>
      ) : item.estatus === "cerrado" ? (
        <DropdownMenuItem
          className="cursor-pointer"
          disabled={!puede("/contabilidad/periodos", "editar") || cambiarEstatus.isPending}
          onClick={() =>
            cambiarEstatus.mutate({ publicId: item.publicId, accion: "reabrir" })
          }
        >
          <LockOpen className="size-4" aria-hidden="true" />
          Reabrir periodo
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem disabled>Sin acciones</DropdownMenuItem>
      ),
  };

  return <ResourcePage config={config} />;
}
