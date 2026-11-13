"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";
import { texto } from "@/lib/format";

type Almacen = {
  publicId: string;
  nombre?: string | null;
  ubicacion?: string | null;
  activo?: boolean;
};

const config: CrudConfig<Almacen> = {
  titulo: "Almacenes",
  descripcion: "Ubicaciones físicas donde se resguarda el inventario.",
  recurso: "/almacen/almacenes",
  permiso: "/almacen/almacenes",
  singular: "Almacén",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) => item.nombre ?? "Almacén",
  buscarPlaceholder: "Buscar almacén…",
  vacioTitulo: "Todavía no hay almacenes",
  vacioDescripcion: "Crea el primer almacén de la empresa.",
  columnas: [
    { encabezado: "Nombre", celda: (item) => texto(item.nombre) },
    {
      encabezado: "Ubicación",
      celda: (item) => texto(item.ubicacion),
    },
  ],
  campos: [
    { nombre: "nombre", etiqueta: "Nombre", tipo: "text", requerido: true },
    { nombre: "ubicacion", etiqueta: "Ubicación", tipo: "text" },
  ],
  aValores: (item) => ({
    nombre: item?.nombre ?? "",
    ubicacion: item?.ubicacion ?? "",
  }),
  aPayload: (valores) => {
    const payload: Record<string, unknown> = {
      nombre: String(valores.nombre ?? "").trim(),
    };
    const ubicacion = String(valores.ubicacion ?? "").trim();
    if (ubicacion) payload.ubicacion = ubicacion;
    return payload;
  },
};

export default function AlmacenesPage() {
  return <ResourcePage config={config} />;
}
