"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { moneda, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Puesto = {
  publicId: string;
  nombre?: string | null;
  descripcion?: string | null;
  salarioMinimo?: number | string | null;
  salarioMaximo?: number | string | null;
  activo?: boolean;
  departamento?: { publicId?: string; nombre?: string } | null;
  departamentoId?: string | null;
};

type Departamento = { publicId: string; nombre?: string };

export default function PuestosPage() {
  const { puede } = useAuth();
  const puedePuestos = puede("/rh/puestos");
  const [departamentoFiltro, setDepartamentoFiltro] = useState("");

  const departamentos = useQuery<Departamento[]>({
    queryKey: ["puestos-departamentos-select"],
    queryFn: () => apiFetch<Departamento[]>("/rh/puestos/departamentos"),
    enabled: puedePuestos,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const config = useMemo<CrudConfig<Puesto>>(
    () => ({
      titulo: "Puestos",
      descripcion: "Puestos de trabajo y rangos salariales.",
      recurso: "/rh/puestos",
      permiso: "/rh/puestos",
      singular: "Puesto",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => item.nombre ?? "Puesto",
      buscarPlaceholder: "Buscar puesto…",
      parametros: departamentoFiltro
        ? { departamentoId: departamentoFiltro }
        : undefined,
      filtros: (
        <select
          value={departamentoFiltro}
          onChange={(evento) => setDepartamentoFiltro(evento.target.value)}
          aria-label="Filtrar puestos por departamento"
          className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-56"
        >
          <option value="">Todos los departamentos</option>
          {(departamentos.data ?? []).map((departamento) => (
            <option key={departamento.publicId} value={departamento.publicId}>
              {departamento.nombre ?? departamento.publicId}
            </option>
          ))}
        </select>
      ),
      vacioTitulo: "Todavía no hay puestos",
      vacioDescripcion: "Crea el primer puesto para asignarlo al personal.",
      columnas: [
        { encabezado: "Puesto", celda: (item) => texto(item.nombre) },
        {
          encabezado: "Departamento",
          celda: (item) => texto(item.departamento?.nombre),
        },
        {
          encabezado: "Salario mínimo",
          celda: (item) => (
            <span className="tabular">{moneda(item.salarioMinimo)}</span>
          ),
        },
        {
          encabezado: "Salario máximo",
          celda: (item) => (
            <span className="tabular">{moneda(item.salarioMaximo)}</span>
          ),
        },
      ],
      campos: [
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, ancho: "full", seccion: "Información general" },
        {
          nombre: "departamentoId",
          etiqueta: "Departamento",
          tipo: "select",
          ancho: "full",
          seccion: "Información general",
          opciones: (departamentos.data ?? []).map((departamento) => ({
            valor: departamento.publicId,
            etiqueta: departamento.nombre ?? departamento.publicId,
          })),
        },
        {
          nombre: "descripcion",
          etiqueta: "Descripción",
          tipo: "textarea",
          ancho: "full",
          seccion: "Información general",
        },
        {
          nombre: "salarioMinimo",
          etiqueta: "Salario mínimo",
          tipo: "number",
          sufijo: "MXN",
          seccion: "Salario",
        },
        {
          nombre: "salarioMaximo",
          etiqueta: "Salario máximo",
          tipo: "number",
          sufijo: "MXN",
          seccion: "Salario",
        },
      ],
      aValores: (item) => ({
        nombre: item?.nombre ?? "",
        departamentoId:
          item?.departamento?.publicId ?? item?.departamentoId ?? "",
        salarioMinimo:
          item?.salarioMinimo === null || item?.salarioMinimo === undefined
            ? ""
            : String(item.salarioMinimo),
        salarioMaximo:
          item?.salarioMaximo === null || item?.salarioMaximo === undefined
            ? ""
            : String(item.salarioMaximo),
        descripcion: item?.descripcion ?? "",
      }),
      aPayload: (valores) => {
        const payload: Record<string, unknown> = {
          nombre: String(valores.nombre ?? "").trim(),
        };
        const departamentoId = String(valores.departamentoId ?? "");
        if (departamentoId) payload.departamentoId = departamentoId;
        for (const clave of ["salarioMinimo", "salarioMaximo"] as const) {
          const valor = String(valores[clave] ?? "").trim();
          if (valor) payload[clave] = Number(valor);
        }
        const descripcion = String(valores.descripcion ?? "").trim();
        if (descripcion) payload.descripcion = descripcion;
        return payload;
      },
      validar: (valores) => {
        const minimo = Number(valores.salarioMinimo || 0);
        const maximo = Number(valores.salarioMaximo || 0);
        if (minimo && maximo && minimo > maximo) {
          return { salarioMaximo: "El máximo debe ser mayor o igual al mínimo." };
        }
        return null;
      },
    }),
    [departamentos.data, departamentoFiltro],
  );

  return (
    <ResourcePage key={departamentoFiltro || "todos"} config={config} />
  );
}
