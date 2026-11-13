"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { cantidad, fechaISO, horaCorta, minutos, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Input } from "@/components/ui/input";

type Asistencia = {
  publicId: string;
  asistenciaId?: string | null;
  fecha?: string | null;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  estatus?: string | null;
  retardoMinutos?: number | null;
  salidaAnticipadaMinutos?: number | null;
  horasTrabajadas?: number | string | null;
  observaciones?: string | null;
  empleado?: {
    publicId?: string;
    codigo?: string;
    nombre?: string;
    apellidoPaterno?: string;
    apellidoMaterno?: string;
    departamento?: { nombre?: string } | null;
    puesto?: { nombre?: string } | null;
  } | null;
  empleadoId?: string | null;
};

type TurnoOpcion = {
  nombre?: string | null;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  horaComidaInicio?: string | null;
  horaComidaFin?: string | null;
  toleranciaMinutos?: number | string | null;
  diasLaborables?: string | null;
};

type EmpleadoOpcion = {
  publicId: string;
  nombre?: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  codigo?: string;
  activo?: boolean;
  turno?: TurnoOpcion | null;
};

type DepartamentoOpcion = { publicId: string; nombre?: string };

function horarioTurno(empleado?: EmpleadoOpcion | null) {
  const turno = empleado?.turno;
  if (!turno?.horaEntrada || !turno?.horaSalida) return "";
  const comida =
    turno.horaComidaInicio && turno.horaComidaFin
      ? ` · comida ${horaCorta(turno.horaComidaInicio)}–${horaCorta(turno.horaComidaFin)}`
      : "";
  return `Turno ${turno.nombre ?? ""}: ${horaCorta(turno.horaEntrada)}–${horaCorta(turno.horaSalida)}${comida} · tolerancia ${turno.toleranciaMinutos ?? 0} min`;
}

export default function AsistenciasPage() {
  const { puede } = useAuth();
  const puedeEmpleados = puede("/rh/empleados");
  const puedeDepartamentos = puede("/rh/departamentos");

  const [fechaFiltro, setFechaFiltro] = useState(() => fechaISO(new Date()));
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");

  const empleados = useQuery<EmpleadoOpcion[]>({
    queryKey: ["empleados-select"],
    queryFn: () => apiFetch<EmpleadoOpcion[]>("/rh/empleados"),
    enabled: puedeEmpleados,
    staleTime: 5 * 60_000,
  });

  const departamentos = useQuery<DepartamentoOpcion[]>({
    queryKey: ["departamentos-select"],
    queryFn: () => apiFetch<DepartamentoOpcion[]>("/rh/departamentos"),
    enabled: puedeDepartamentos,
    staleTime: 5 * 60_000,
  });

  function nombreEmpleado(empleado: EmpleadoOpcion) {
    return (
      [empleado.nombre, empleado.apellidoPaterno, empleado.apellidoMaterno]
        .filter(Boolean)
        .join(" ") || empleado.codigo || empleado.publicId
    );
  }

  const config = useMemo<CrudConfig<Asistencia>>(
    () => ({
      titulo: "Asistencias",
      descripcion:
        "Entradas y salidas del personal por día, con retardos y salidas anticipadas.",
      recurso: "/rh/asistencias",
      permiso: "/rh/asistencias",
      singular: "Asistencia",
      genero: "f",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) =>
        [
          item.empleado?.nombre,
          item.empleado?.apellidoPaterno,
          item.empleado?.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(" ") || item.empleado?.codigo || "Asistencia",
      tieneActivo: false,
      soloCrear: true,
      urls: { listar: "/rh/asistencias" },
      parametros: {
        fecha: fechaFiltro,
        departamentoId: departamentoFiltro || undefined,
      },
      buscarPlaceholder: "Buscar por nombre o código…",
      vacioTitulo: "Sin empleados para el día seleccionado",
      vacioDescripcion:
        "Ajusta el día o el departamento para ver al personal activo.",
      filtros: (
        <>
          <Input
            type="date"
            value={fechaFiltro}
            onChange={(evento) => {
              if (evento.target.value) setFechaFiltro(evento.target.value);
            }}
            aria-label="Filtrar por día"
            className="h-8 w-auto"
          />
          <select
            value={departamentoFiltro}
            onChange={(evento) => setDepartamentoFiltro(evento.target.value)}
            aria-label="Filtrar por departamento"
            className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-56"
          >
            <option value="">Todos los departamentos</option>
            {(departamentos.data ?? []).map((departamento) => (
              <option key={departamento.publicId} value={departamento.publicId}>
                {departamento.nombre ?? departamento.publicId}
              </option>
            ))}
          </select>
        </>
      ),
      columnas: [
        {
          encabezado: "Empleado",
          celda: (item) => (
            <div className="min-w-0">
              <p className="truncate font-medium">
                {[
                  item.empleado?.nombre,
                  item.empleado?.apellidoPaterno,
                  item.empleado?.apellidoMaterno,
                ]
                  .filter(Boolean)
                  .join(" ") || "—"}
              </p>
              <p className="truncate font-mono text-xs text-muted-foreground">
                {texto(item.empleado?.codigo)}
              </p>
            </div>
          ),
        },
        {
          encabezado: "Departamento",
          celda: (item) => texto(item.empleado?.departamento?.nombre),
        },
        {
          encabezado: "Puesto",
          celda: (item) => texto(item.empleado?.puesto?.nombre),
        },
        {
          encabezado: "Entrada",
          celda: (item) => horaCorta(item.horaEntrada),
        },
        {
          encabezado: "Salida",
          celda: (item) => horaCorta(item.horaSalida),
        },
        {
          encabezado: "Estatus",
          celda: (item) => <EstadoBadge estado={item.estatus ?? "sin_registro"} />,
        },
        {
          encabezado: "Retardo",
          celda: (item) =>
            Number(item.retardoMinutos ?? 0) > 0 ? (
              <span className="font-medium text-amber-600">
                {minutos(item.retardoMinutos)}
              </span>
            ) : (
              "—"
            ),
        },
        {
          encabezado: "Salida anticipada",
          celda: (item) =>
            Number(item.salidaAnticipadaMinutos ?? 0) > 0 ? (
              <span className="font-medium text-red-600">
                {minutos(item.salidaAnticipadaMinutos)}
              </span>
            ) : (
              "—"
            ),
        },
        {
          encabezado: "Horas",
          celda: (item) =>
            item.horasTrabajadas === null ||
            item.horasTrabajadas === undefined
              ? "—"
              : `${cantidad(item.horasTrabajadas, 2)} h`,
        },
      ],
      campos: [
        {
          nombre: "empleadoId",
          etiqueta: "Empleado",
          tipo: "select",
          requerido: true,
          ancho: "full",
          seccion: "Registro",
          opciones: (empleados.data ?? [])
            .filter((empleado) => empleado.activo !== false)
            .map((empleado) => ({
              valor: empleado.publicId,
              etiqueta: nombreEmpleado(empleado),
            })),
        },
        {
          nombre: "fecha",
          etiqueta: "Fecha",
          tipo: "date",
          requerido: true,
          valorInicial: fechaFiltro,
          seccion: "Registro",
        },
        {
          nombre: "estatus",
          etiqueta: "Estatus",
          tipo: "select",
          requerido: true,
          valorInicial: "presente",
          seccion: "Registro",
          opciones: [
            { valor: "presente", etiqueta: "Presente" },
            { valor: "ausente", etiqueta: "Ausente" },
            { valor: "permiso", etiqueta: "Permiso" },
            { valor: "vacaciones", etiqueta: "Vacaciones" },
          ],
        },
        {
          nombre: "horaEntrada",
          etiqueta: "Hora de entrada",
          tipo: "time",
          seccion: "Registro",
          ayuda: (valores) => {
            const empleado = (empleados.data ?? []).find(
              (item) => item.publicId === valores.empleadoId,
            );
            return (
              horarioTurno(empleado) ||
              "El empleado no tiene un turno con horario asignado."
            );
          },
        },
        { nombre: "horaSalida", etiqueta: "Hora de salida", tipo: "time", seccion: "Registro" },
        {
          nombre: "observaciones",
          etiqueta: "Observaciones",
          tipo: "textarea",
          ancho: "full",
          seccion: "Notas",
        },
      ],
      aValores: (item) => ({
        empleadoId: item?.empleado?.publicId ?? item?.empleadoId ?? "",
        fecha: item?.fecha ?? fechaFiltro,
        horaEntrada: item?.horaEntrada ?? "",
        horaSalida: item?.horaSalida ?? "",
        estatus: item?.estatus === "sin_registro" ? "presente" : item?.estatus ?? "presente",
        observaciones: item?.observaciones ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          empleadoId: String(valores.empleadoId ?? ""),
          fecha: String(valores.fecha ?? ""),
          estatus: String(valores.estatus ?? "presente"),
        };
        for (const clave of ["horaEntrada", "horaSalida", "observaciones"] as const) {
          const valor = String(valores[clave] ?? "").trim();
          if (valor) payload[clave] = valor;
        }
        return payload;
      },
    }),
    [empleados.data, departamentos.data, fechaFiltro, departamentoFiltro],
  );

  return <ResourcePage config={config} />;
}
