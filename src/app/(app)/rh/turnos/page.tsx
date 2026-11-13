"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { horaCorta } from "@/lib/format";

type Turno = {
  publicId: string;
  nombre?: string | null;
  periodicidad?: string | null;
  horaEntrada?: string | null;
  horaSalida?: string | null;
  horaComidaInicio?: string | null;
  horaComidaFin?: string | null;
  toleranciaMinutos?: number | string | null;
  diasLaborables?: string | null;
  activo?: boolean;
};

const PERIODICIDADES = [
  { valor: "semanal", etiqueta: "Semanal" },
  { valor: "quincenal", etiqueta: "Quincenal" },
  { valor: "mensual", etiqueta: "Mensual" },
];

const DIAS = [
  { valor: "L", etiqueta: "Lunes" },
  { valor: "M", etiqueta: "Martes" },
  { valor: "X", etiqueta: "Miércoles" },
  { valor: "J", etiqueta: "Jueves" },
  { valor: "V", etiqueta: "Viernes" },
  { valor: "S", etiqueta: "Sábado" },
  { valor: "D", etiqueta: "Domingo" },
];

const NOMBRE_DIA: Record<string, string> = Object.fromEntries(
  DIAS.map((dia) => [dia.valor, dia.etiqueta.slice(0, 3)]),
);

function horaFormulario(valor?: string | null) {
  return valor ? horaCorta(valor) : "";
}

function textoDias(valor?: string | null) {
  if (!valor) return "—";
  return valor
    .split(",")
    .map((dia) => NOMBRE_DIA[dia.trim()] ?? dia.trim())
    .filter(Boolean)
    .join(" · ");
}

const config: CrudConfig<Turno> = {
  titulo: "Turnos",
  descripcion: "Turnos de trabajo, su horario y días laborables.",
  recurso: "/rh/turnos",
  permiso: "/rh/turnos",
  singular: "Turno",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? "Turno",
  buscarPlaceholder: "Buscar turno…",
  vacioTitulo: "Todavía no hay turnos",
  vacioDescripcion: "Crea el primer turno de trabajo con su horario.",
  columnas: [
    {
      encabezado: "Nombre",
      celda: (item) => (
        <span className="font-medium">{item.nombre ?? "—"}</span>
      ),
    },
    {
      encabezado: "Horario",
      celda: (item) => (
        <span className="tabular-nums">
          {horaCorta(item.horaEntrada)} – {horaCorta(item.horaSalida)}
        </span>
      ),
    },
    {
      encabezado: "Comida",
      celda: (item) =>
        item.horaComidaInicio && item.horaComidaFin
          ? `${horaCorta(item.horaComidaInicio)} – ${horaCorta(item.horaComidaFin)}`
          : "—",
    },
    {
      encabezado: "Días",
      celda: (item) => textoDias(item.diasLaborables),
    },
    {
      encabezado: "Periodicidad",
      celda: (item) => (
        <span className="capitalize">{item.periodicidad ?? "—"}</span>
      ),
    },
  ],
  campos: [
    {
      nombre: "nombre",
      etiqueta: "Nombre",
      tipo: "text",
      requerido: true,
      ancho: "full",
      seccion: "Información general",
    },
    {
      nombre: "periodicidad",
      etiqueta: "Periodicidad",
      tipo: "select",
      requerido: true,
      ancho: "full",
      opciones: PERIODICIDADES,
      seccion: "Información general",
    },
    {
      nombre: "horaEntrada",
      etiqueta: "Hora de entrada",
      tipo: "time",
      requerido: true,
      ancho: "full",
      ayuda: "Se usa para calcular retardos en Asistencias.",
      seccion: "Horario",
    },
    {
      nombre: "horaSalida",
      etiqueta: "Hora de salida",
      tipo: "time",
      requerido: true,
      ancho: "full",
      ayuda: "Si la salida es menor a la entrada se considera turno nocturno.",
      seccion: "Horario",
    },
    {
      nombre: "horaComidaInicio",
      etiqueta: "Inicio de comida",
      tipo: "time",
      ancho: "full",
      seccion: "Horario",
    },
    {
      nombre: "horaComidaFin",
      etiqueta: "Fin de comida",
      tipo: "time",
      ancho: "full",
      ayuda: "El tiempo de comida se descuenta de las horas trabajadas.",
      seccion: "Horario",
    },
    {
      nombre: "toleranciaMinutos",
      etiqueta: "Tolerancia",
      tipo: "number",
      requerido: true,
      ancho: "full",
      valorInicial: "10",
      sufijo: "min",
      ayuda: "Minutos de gracia antes de contar un retardo.",
      seccion: "Horario",
    },
    {
      nombre: "diasLaborables",
      etiqueta: "Días laborables",
      tipo: "dias",
      requerido: true,
      ancho: "full",
      opciones: DIAS,
      ayuda: "Selecciona los días en que aplica el horario.",
      seccion: "Horario",
    },
  ],
  aValores: (item) => ({
    nombre: item?.nombre ?? "",
    periodicidad: item?.periodicidad ?? "",
    horaEntrada: horaFormulario(item?.horaEntrada),
    horaSalida: horaFormulario(item?.horaSalida),
    horaComidaInicio: horaFormulario(item?.horaComidaInicio),
    horaComidaFin: horaFormulario(item?.horaComidaFin),
    toleranciaMinutos:
      item?.toleranciaMinutos === null || item?.toleranciaMinutos === undefined
        ? "10"
        : String(item.toleranciaMinutos),
    diasLaborables: item?.diasLaborables ?? "L,M,X,J,V",
  }),
  aPayload: (valores) => {
    const comidaInicio = String(valores.horaComidaInicio ?? "").trim();
    const comidaFin = String(valores.horaComidaFin ?? "").trim();
    return {
      nombre: String(valores.nombre ?? "").trim(),
      periodicidad: String(valores.periodicidad ?? ""),
      horaEntrada: String(valores.horaEntrada ?? ""),
      horaSalida: String(valores.horaSalida ?? ""),
      horaComidaInicio: comidaInicio || null,
      horaComidaFin: comidaFin || null,
      toleranciaMinutos: Number(valores.toleranciaMinutos ?? 0),
      diasLaborables: String(valores.diasLaborables ?? ""),
    };
  },
  validar: (valores) => {
    const errores: Record<string, string> = {};
    const entrada = String(valores.horaEntrada ?? "");
    const salida = String(valores.horaSalida ?? "");
    const comidaInicio = String(valores.horaComidaInicio ?? "").trim();
    const comidaFin = String(valores.horaComidaFin ?? "").trim();
    const tolerancia = Number(valores.toleranciaMinutos);

    if (!String(valores.diasLaborables ?? "").trim()) {
      errores.diasLaborables = "Selecciona al menos un día laborable.";
    }
    if (entrada && salida && entrada === salida) {
      errores.horaSalida = "La salida no puede ser igual a la entrada.";
    }
    if (Boolean(comidaInicio) !== Boolean(comidaFin)) {
      errores.horaComidaFin = "Captura el inicio y el fin de comida.";
    }
    if (!Number.isFinite(tolerancia) || tolerancia < 0 || tolerancia > 120) {
      errores.toleranciaMinutos = "La tolerancia debe estar entre 0 y 120.";
    }
    return Object.keys(errores).length > 0 ? errores : null;
  },
};

export default function TurnosPage() {
  return <ResourcePage config={config} />;
}
