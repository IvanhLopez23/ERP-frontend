"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type Cliente = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  tipo?: string | null;
  rfc?: string | null;
  direccion?: string | null;
  telefono?: string | null;
  correo?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Cliente> = {
  titulo: "Clientes",
  descripcion: "Catálogo de clientes y prospectos para cotizaciones y ventas.",
  recurso: "/ventas/clientes",
  permiso: "/ventas/clientes",
  singular: "Cliente",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? item.codigo ?? "Cliente",
  buscarPlaceholder: "Buscar por código, nombre o RFC…",
  vacioTitulo: "Todavía no hay clientes",
  vacioDescripcion: "Crea el primer cliente para cotizar y vender.",
  columnas: [
    {
      encabezado: "Código",
      celda: (item) => (
        <span className="font-mono text-xs">{texto(item.codigo)}</span>
      ),
    },
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Tipo",
      celda: (item) => (
        <span className="capitalize">{texto(item.tipo, "cliente")}</span>
      ),
    },
    {
      encabezado: "RFC",
      celda: (item) => (
        <span className="font-mono text-xs">{texto(item.rfc)}</span>
      ),
    },
    { encabezado: "Teléfono", celda: (item) => texto(item.telefono) },
    { encabezado: "Correo", celda: (item) => texto(item.correo) },
  ],
  campos: [
    { nombre: "codigo", etiqueta: "Código", tipo: "text", requerido: true, seccion: "Información general" },
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true, seccion: "Información general" },
    {
      nombre: "tipo",
      etiqueta: "Tipo",
      tipo: "select",
      valorInicial: "cliente",
      seccion: "Información general",
      opciones: [
        { valor: "cliente", etiqueta: "Cliente" },
        { valor: "prospecto", etiqueta: "Prospecto" },
      ],
    },
    { nombre: "rfc", etiqueta: "RFC", tipo: "text", seccion: "Información general" },
    { nombre: "telefono", etiqueta: "Teléfono", tipo: "tel", seccion: "Contacto" },
    { nombre: "correo", etiqueta: "Correo", tipo: "email", seccion: "Contacto" },
    { nombre: "direccion", etiqueta: "Dirección", tipo: "textarea", seccion: "Contacto" },
  ],
  aValores: (item) => ({
    codigo: item?.codigo ?? "",
    nombre: item?.nombre ?? "",
    tipo: item?.tipo ?? "cliente",
    rfc: item?.rfc ?? "",
    telefono: item?.telefono ?? "",
    correo: item?.correo ?? "",
    direccion: item?.direccion ?? "",
  }),
  aPayload: (valores) => {
    const payload: Record<string, unknown> = {
      codigo: String(valores.codigo ?? "").trim(),
      nombre: String(valores.nombre ?? "").trim(),
      tipo: String(valores.tipo ?? "cliente"),
    };
    for (const clave of ["rfc", "telefono", "correo", "direccion"] as const) {
      const valor = String(valores[clave] ?? "").trim();
      if (valor) payload[clave] = valor;
    }
    return payload;
  },
};

export default function ClientesPage() {
  return <ResourcePage config={config} />;
}
