"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaCorta, moneda, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Contrato = {
  publicId: string;
  tipo?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  salario?: number | string | null;
  activo?: boolean;
  empleado?: {
    publicId?: string;
    nombre?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    codigo?: string;
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

export default function ContratosPage() {
  const { puede } = useAuth();
  const puedeEmpleados = puede("/rh/empleados");

  const empleados = useQuery<EmpleadoOpcion[]>({
    queryKey: ["empleados-select"],
    queryFn: () => apiFetch<EmpleadoOpcion[]>("/rh/empleados"),
    enabled: puedeEmpleados,
    staleTime: 5 * 60_000,
  });

  function nombreEmpleado(empleado: EmpleadoOpcion) {
    return (
      [empleado.nombre, empleado.apellidoPaterno, empleado.apellidoMaterno]
        .filter(Boolean)
        .join(" ") || empleado.codigo || empleado.publicId
    );
  }

  const config = useMemo<CrudConfig<Contrato>>(
    () => ({
      titulo: "Contratos",
      descripcion: "Contratos del personal y su vigencia.",
      recurso: "/rh/contratos",
      permiso: "/rh/contratos",
      singular: "Contrato",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => {
        const empleado = item.empleado;
        return empleado
          ? [empleado.nombre, empleado.apellidoPaterno]
              .filter(Boolean)
              .join(" ") || "Contrato"
          : "Contrato";
      },
      buscarPlaceholder: "Buscar contrato…",
      vacioTitulo: "Todavía no hay contratos",
      vacioDescripcion: "Registra el primer contrato del personal.",
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
          encabezado: "Inicio",
          celda: (item) => fechaCorta(item.fechaInicio),
        },
        { encabezado: "Fin", celda: (item) => fechaCorta(item.fechaFin) },
        {
          encabezado: "Salario",
          celda: (item) => (
            <span className="tabular">{moneda(item.salario)}</span>
          ),
        },
      ],
      campos: [
        {
          nombre: "empleadoId",
          etiqueta: "Empleado",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Contrato",
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
          seccion: "Contrato",
          opciones: [
            { valor: "indeterminado", etiqueta: "Indeterminado" },
            { valor: "temporal", etiqueta: "Temporal" },
            { valor: "obra", etiqueta: "Por obra" },
          ],
        },
        { nombre: "fechaInicio", etiqueta: "Fecha de inicio", tipo: "date", requerido: true, seccion: "Vigencia" },
        { nombre: "fechaFin", etiqueta: "Fecha de fin", tipo: "date", seccion: "Vigencia" },
        { nombre: "salario", etiqueta: "Salario", tipo: "number", sufijo: "MXN", ancho: "full", seccion: "Compensación" },
      ],
      aValores: (item) => ({
        empleadoId: item?.empleado?.publicId ?? item?.empleadoId ?? "",
        tipo: item?.tipo ?? "indeterminado",
        fechaInicio: item?.fechaInicio ?? "",
        fechaFin: item?.fechaFin ?? "",
        salario:
          item?.salario === null || item?.salario === undefined
            ? ""
            : String(item.salario),
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          empleadoId: String(valores.empleadoId ?? ""),
          tipo: String(valores.tipo ?? ""),
          fechaInicio: String(valores.fechaInicio ?? ""),
        };
        if (String(valores.fechaFin ?? "").trim()) {
          payload.fechaFin = String(valores.fechaFin);
        }
        if (String(valores.salario ?? "").trim()) {
          payload.salario = Number(valores.salario);
        }
        return payload;
      },
      validar: (valores) => {
        const inicio = String(valores.fechaInicio ?? "");
        const fin = String(valores.fechaFin ?? "");
        if (inicio && fin && fin < inicio) {
          return { fechaFin: "La fecha fin no puede ser anterior al inicio." };
        }
        return null;
      },
    }),
    [empleados.data],
  );

  return <ResourcePage config={config} />;
}
