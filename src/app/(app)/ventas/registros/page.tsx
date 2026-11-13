"use client";

import {
  DocumentoPage,
  type DocumentoConfig,
} from "@/components/documentos/documento-page";

const config: DocumentoConfig = {
  titulo: "Ventas",
  descripcion:
    "Ventas confirmadas. Al completar una venta el backend descuenta inventario.",
  recurso: "/ventas/ventas",
  permiso: "/ventas/ventas",
  singular: "Venta",
  genero: "f",
  fecha: { campo: "fechaVenta", etiqueta: "Fecha de venta" },
  tercero: {
    campo: "clienteId",
    etiqueta: "Cliente",
    recurso: "/ventas/clientes",
    permiso: "/ventas/clientes",
    buscarPlaceholder: "Buscar cliente",
  },
  detalle: { conDescuento: true, conValidez: false },
  estatus: {
    transiciones: {
      pendiente: [
        { valor: "completada", etiqueta: "Completar venta" },
        { valor: "cancelada", etiqueta: "Cancelar venta" },
      ],
    },
  },
  nota: "Completar una venta descuenta inventario. No existe endpoint para editar una venta ya creada.",
};

export default function VentasRegistrosPage() {
  return <DocumentoPage config={config} />;
}
