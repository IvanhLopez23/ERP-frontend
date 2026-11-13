"use client";

import {
  DocumentoPage,
  type DocumentoConfig,
} from "@/components/documentos/documento-page";

const config: DocumentoConfig = {
  titulo: "Cotizaciones",
  descripcion:
    "Propuestas enviadas al cliente con vigencia y seguimiento de estatus.",
  recurso: "/ventas/cotizaciones",
  permiso: "/ventas/cotizaciones",
  singular: "Cotización",
  genero: "f",
  fecha: { campo: "fecha", etiqueta: "Fecha" },
  tercero: {
    campo: "clienteId",
    etiqueta: "Cliente",
    recurso: "/ventas/clientes",
    permiso: "/ventas/clientes",
    buscarPlaceholder: "Buscar cliente",
  },
  detalle: { conDescuento: true, conValidez: true },
  estatus: {
    transiciones: {
      pendiente: [
        { valor: "aprobada", etiqueta: "Aprobar cotización" },
        { valor: "rechazada", etiqueta: "Rechazar cotización" },
      ],
    },
  },
};

export default function CotizacionesPage() {
  return <DocumentoPage config={config} />;
}
