"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch } from "@/lib/api-client";
import { fechaCorta, fechaISO, mediaUrl, moneda, texto } from "@/lib/format";
import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Empleado = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  genero?: string | null;
  fechaNacimiento?: string | null;
  rfc?: string | null;
  curp?: string | null;
  nss?: string | null;
  telefono?: string | null;
  correo?: string | null;
  direccion?: string | null;
  foto?: string | null;
  fechaIngreso?: string | null;
  salario?: number | string | null;
  activo?: boolean;
  departamento?: { publicId?: string; nombre?: string } | null;
  puesto?: { publicId?: string; nombre?: string } | null;
  turno?: { publicId?: string; nombre?: string } | null;
  departamentoId?: string | null;
  puestoId?: string | null;
  turnoId?: string | null;
};

type Opcion = { publicId: string; nombre?: string };
type PuestoOpcion = Opcion & {
  departamento?: { publicId?: string; nombre?: string } | null;
};

function nombreEmpleado(empleado: Empleado) {
  return [empleado.nombre, empleado.apellidoPaterno, empleado.apellidoMaterno]
    .filter(Boolean)
    .join(" ");
}

function iniciales(empleado: Empleado) {
  return `${empleado.nombre?.[0] ?? ""}${empleado.apellidoPaterno?.[0] ?? ""}`.toUpperCase() || "EM";
}

export default function EmpleadosPage() {
  const { puede } = useAuth();
  const puedeDepartamentos = puede("/rh/departamentos");
  const puedePuestos = puede("/rh/puestos");

  const departamentos = useQuery<Opcion[]>({
    queryKey: ["departamentos-select"],
    queryFn: () => apiFetch<Opcion[]>("/rh/departamentos"),
    enabled: puedeDepartamentos,
    staleTime: 5 * 60_000,
  });

  const puestos = useQuery<PuestoOpcion[]>({
    queryKey: ["puestos-select"],
    queryFn: () => apiFetch<PuestoOpcion[]>("/rh/puestos"),
    enabled: puedePuestos,
    staleTime: 5 * 60_000,
  });

  const turnos = useQuery<Opcion[]>({
    queryKey: ["turnos-select"],
    queryFn: () => apiFetch<Opcion[]>("/comedor/turnos"),
    staleTime: 5 * 60_000,
  });

  const config = useMemo<CrudConfig<Empleado>>(
    () => ({
      titulo: "Empleados",
      descripcion: "Expediente del personal, asignación y datos de contacto.",
      recurso: "/rh/empleados",
      permiso: "/rh/empleados",
      singular: "Empleado",
      filaId: (item) => item.publicId,
      etiquetaFila: (item) => nombreEmpleado(item) || item.codigo || "Empleado",
      buscarPlaceholder: "Buscar por nombre, código o correo…",
      vacioTitulo: "Todavía no hay empleados",
      vacioDescripcion: "Registra al primer empleado para comenzar.",
      columnas: [
        {
          encabezado: "Empleado",
          celda: (item) => {
            const foto = mediaUrl(item.foto);
            return (
              <div className="flex items-center gap-2.5">
                <Avatar className="size-8">
                  {foto && <AvatarImage src={foto} alt="" />}
                  <AvatarFallback className="text-[10px] font-semibold">
                    {iniciales(item)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {nombreEmpleado(item) || "—"}
                  </p>
                  <p className="truncate font-mono text-xs text-muted-foreground">
                    {texto(item.codigo)}
                  </p>
                </div>
              </div>
            );
          },
        },
        {
          encabezado: "Departamento",
          celda: (item) => texto(item.departamento?.nombre),
        },
        { encabezado: "Puesto", celda: (item) => texto(item.puesto?.nombre) },
        {
          encabezado: "Ingreso",
          celda: (item) => fechaCorta(item.fechaIngreso),
        },
        {
          encabezado: "Salario",
          celda: (item) => (
            <span className="tabular">{moneda(item.salario)}</span>
          ),
        },
      ],
      campos: [
        { nombre: "codigo", etiqueta: "Código", tipo: "text", requerido: true, seccion: "Información general" },
        { nombre: "fechaIngreso", etiqueta: "Fecha de ingreso", tipo: "date", requerido: true, seccion: "Información general" },
        { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Información general" },
        { nombre: "apellidoPaterno", etiqueta: "Apellido paterno", tipo: "text", requerido: true, seccion: "Información general" },
        { nombre: "apellidoMaterno", etiqueta: "Apellido materno", tipo: "text", seccion: "Información general" },
        {
          nombre: "genero",
          etiqueta: "Género",
          tipo: "select",
          seccion: "Información general",
          opciones: [
            { valor: "M", etiqueta: "Masculino" },
            { valor: "F", etiqueta: "Femenino" },
            { valor: "O", etiqueta: "Otro" },
          ],
        },
        { nombre: "fechaNacimiento", etiqueta: "Fecha de nacimiento", tipo: "date", seccion: "Información general" },
        {
          nombre: "departamentoId",
          etiqueta: "Departamento",
          tipo: "select",
          requerido: true,
          seccion: "Asignación",
          opciones: (departamentos.data ?? []).map((item) => ({
            valor: item.publicId,
            etiqueta: item.nombre ?? item.publicId,
          })),
        },
        {
          nombre: "puestoId",
          etiqueta: "Puesto",
          tipo: "select",
          requerido: true,
          seccion: "Asignación",
          dependeDe: "departamentoId",
          opciones: (valores) => {
            const departamentoId = String(valores.departamentoId ?? "");
            return (puestos.data ?? [])
              .filter(
                (item) =>
                  !departamentoId ||
                  item.departamento?.publicId === departamentoId,
              )
              .map((item) => ({
                valor: item.publicId,
                etiqueta: item.nombre ?? item.publicId,
              }));
          },
        },
        {
          nombre: "turnoId",
          etiqueta: "Turno",
          tipo: "select",
          seccion: "Asignación",
          opciones: (turnos.data ?? []).map((item) => ({
            valor: item.publicId,
            etiqueta: item.nombre ?? item.publicId,
          })),
        },
        {
          nombre: "tipoContrato",
          etiqueta: "Tipo de contrato",
          tipo: "select",
          requerido: true,
          seccion: "Contrato",
          soloCrear: true,
          valorInicial: "indeterminado",
          opciones: [
            { valor: "indeterminado", etiqueta: "Indeterminado" },
            { valor: "temporal", etiqueta: "Temporal" },
            { valor: "obra", etiqueta: "Por obra" },
          ],
        },
        {
          nombre: "fechaInicioContrato",
          etiqueta: "Inicio del contrato",
          tipo: "date",
          requerido: true,
          seccion: "Contrato",
          soloCrear: true,
        },
        {
          nombre: "fechaFinContrato",
          etiqueta: "Fin del contrato",
          tipo: "date",
          seccion: "Contrato",
          soloCrear: true,
          ayuda: "Obligatoria para contratos temporal o por obra.",
        },
        {
          nombre: "salarioContrato",
          etiqueta: "Salario del contrato",
          tipo: "number",
          requerido: true,
          sufijo: "MXN",
          seccion: "Contrato",
          soloCrear: true,
          ayuda: "El salario del empleado se toma de este contrato.",
        },
        { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", seccion: "Contacto" },
        { nombre: "correo", etiqueta: "Correo", tipo: "email", seccion: "Contacto" },
        { nombre: "direccion", etiqueta: "Dirección", tipo: "textarea", seccion: "Contacto" },
        { nombre: "rfc", etiqueta: "RFC", tipo: "text", seccion: "Documentos" },
        { nombre: "curp", etiqueta: "CURP", tipo: "text", seccion: "Documentos" },
        { nombre: "nss", etiqueta: "NSS", tipo: "text", seccion: "Documentos" },
        {
          nombre: "archivo",
          etiqueta: "Fotografía (opcional)",
          tipo: "file",
          ayuda: "JPG, PNG o WebP. Máximo 5 MB.",
          seccion: "Fotografía",
        },
      ],
      aValores: (item) => ({
        codigo: item?.codigo ?? "",
        nombre: item?.nombre ?? "",
        apellidoPaterno: item?.apellidoPaterno ?? "",
        apellidoMaterno: item?.apellidoMaterno ?? "",
        genero: item?.genero ?? "",
        fechaNacimiento: item?.fechaNacimiento ?? "",
        rfc: item?.rfc ?? "",
        curp: item?.curp ?? "",
        nss: item?.nss ?? "",
        telefono: item?.telefono ?? "",
        correo: item?.correo ?? "",
        direccion: item?.direccion ?? "",
        departamentoId:
          item?.departamento?.publicId ?? item?.departamentoId ?? "",
        puestoId: item?.puesto?.publicId ?? item?.puestoId ?? "",
        turnoId: item?.turno?.publicId ?? item?.turnoId ?? "",
        fechaIngreso: item?.fechaIngreso ?? "",
        tipoContrato: "indeterminado",
        fechaInicioContrato: item ? "" : fechaISO(new Date()),
        fechaFinContrato: "",
        salarioContrato: "",
        archivo: null,
      }),
      aPayload: (valores, original) => {
        const form = new FormData();
        const agregar = (clave: string, valor: string | boolean | File | null) => {
          if (valor instanceof File) {
            form.append(clave, valor);
          } else if (typeof valor === "string" && valor.trim()) {
            form.append(clave, valor.trim());
          }
        };

        agregar("codigo", valores.codigo);
        agregar("nombre", valores.nombre);
        agregar("apellidoPaterno", valores.apellidoPaterno);
        agregar("apellidoMaterno", valores.apellidoMaterno);
        agregar("genero", valores.genero);
        agregar("fechaNacimiento", valores.fechaNacimiento);
        agregar("rfc", valores.rfc);
        agregar("curp", valores.curp);
        agregar("nss", valores.nss);
        agregar("telefono", valores.telefono);
        agregar("correo", valores.correo);
        agregar("direccion", valores.direccion);
        agregar("departamentoId", valores.departamentoId);
        agregar("puestoId", valores.puestoId);
        agregar("turnoId", valores.turnoId);
        agregar("fechaIngreso", valores.fechaIngreso);
        if (!original) {
          agregar("tipoContrato", valores.tipoContrato);
          agregar("fechaInicioContrato", valores.fechaInicioContrato);
          agregar("fechaFinContrato", valores.fechaFinContrato);
          agregar("salarioContrato", valores.salarioContrato);
        }
        agregar("archivo", valores.archivo);

        return form;
      },
      validar: (valores) => {
        if (!String(valores.fechaInicioContrato ?? "").trim()) return null;

        const errores: Record<string, string> = {};
        const tipo = String(valores.tipoContrato);
        const inicio = String(valores.fechaInicioContrato ?? "");
        const fin = String(valores.fechaFinContrato ?? "");
        const salario = Number(valores.salarioContrato);

        if (!Number.isFinite(salario) || salario <= 0) {
          errores.salarioContrato = "El salario debe ser mayor a cero.";
        }
        if (fin && inicio && fin < inicio) {
          errores.fechaFinContrato =
            "La fecha fin no puede ser anterior al inicio.";
        }
        if ((tipo === "temporal" || tipo === "obra") && !fin) {
          errores.fechaFinContrato =
            "Indica la fecha fin para este tipo de contrato.";
        }

        return Object.keys(errores).length > 0 ? errores : null;
      },
    }),
    [departamentos.data, puestos.data, turnos.data],
  );

  return <ResourcePage config={config} />;
}
