"use client";

import {
  DocumentoPage,
  type DocumentoConfig,
} from "@/components/documentos/documento-page";

const config: DocumentoConfig = {
  titulo: "Compras",
  descripcion:
    "Órdenes de compra a proveedores. Al recibir una compra se actualiza el inventario.",
  recurso: "/compras/compras",
  permiso: "/compras/compras",
  singular: "Compra",
  genero: "f",
  fecha: { campo: "fechaCompra", etiqueta: "Fecha de compra" },
  almacen: {
    campo: "almacenId",
    etiqueta: "Almacén de destino",
    recurso: "/compras/compras/almacenes",
    permiso: "/compras/compras",
  },
  tercero: {
    campo: "proveedorId",
    etiqueta: "Proveedor",
    recurso: "/compras/proveedores",
    permiso: "/compras/proveedores",
    buscarPlaceholder: "Buscar proveedor",
  },
  detalle: { conDescuento: false, conValidez: false },
  estatus: {
    transiciones: {
      pendiente: [
        { valor: "recibida", etiqueta: "Marcar como recibida" },
        { valor: "cancelada", etiqueta: "Cancelar compra" },
      ],
    },
  },
  nota: "Recibir una compra ingresa la existencia en el almacén de destino seleccionado. La cancelación revierte el movimiento.",
};

export default function ComprasRegistrosPage() {
  return <DocumentoPage config={config} />;
}
