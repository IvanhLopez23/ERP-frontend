"use client";

import { ResourcePage, type CrudConfig } from "@/components/crud/resource-page";

type Politica = {
  publicId: string;
  aniosDesde?: number | string | null;
  aniosHasta?: number | string | null;
  diasOtorgados?: number | string | null;
  activo?: boolean;
};

const config: CrudConfig<Politica> = {
  titulo: "Políticas vacacionales",
  descripcion: "Días de vacaciones que corresponden según la antigüedad.",
  recurso: "/rh/vacaciones/politicas",
  permiso: "/rh/vacaciones",
  singular: "Política",
  genero: "f",
  filaId: (item) => item.publicId,
  etiquetaFila: (item) =>
    `Política ${item.aniosDesde ?? "?"}–${item.aniosHasta ?? "?"}`,
  paginado: false,
  tieneActivo: false,
  buscarPlaceholder: "Buscar por años de antigüedad…",
  vacioTitulo: "Todavía no hay políticas",
  vacioDescripcion: "Crea la primera política vacacional.",
  urls: {
    crear: "/rh/vacaciones/politicas",
    editar: (item) => `/rh/vacaciones/politicas?publicId=${item.publicId}`,
  },
  columnas: [
    {
      encabezado: "Desde (años)",
      celda: (item) => String(item.aniosDesde ?? "—"),
    },
    {
      encabezado: "Hasta (años)",
      celda: (item) => String(item.aniosHasta ?? "—"),
    },
    {
      encabezado: "Días otorgados",
      celda: (item) => String(item.diasOtorgados ?? "—"),
    },
  ],
  campos: [
    { nombre: "aniosDesde", etiqueta: "Años desde", tipo: "number", requerido: true },
    { nombre: "aniosHasta", etiqueta: "Años hasta", tipo: "number", requerido: true },
    {
      nombre: "diasOtorgados",
      etiqueta: "Días otorgados",
      tipo: "number",
      requerido: true,
      ancho: "full",
    },
  ],
  aValores: (item) => ({
    aniosDesde:
      item?.aniosDesde === null || item?.aniosDesde === undefined
        ? ""
        : String(item.aniosDesde),
    aniosHasta:
      item?.aniosHasta === null || item?.aniosHasta === undefined
        ? ""
        : String(item.aniosHasta),
    diasOtorgados:
      item?.diasOtorgados === null || item?.diasOtorgados === undefined
        ? ""
        : String(item.diasOtorgados),
  }),
  aPayload: (valores) => ({
    aniosDesde: Number(valores.aniosDesde ?? 0),
    aniosHasta: Number(valores.aniosHasta ?? 0),
    diasOtorgados: Number(valores.diasOtorgados ?? 0),
  }),
  validar: (valores) => {
    const desde = Number(valores.aniosDesde ?? 0);
    const hasta = Number(valores.aniosHasta ?? 0);
    if (desde > hasta) {
      return { aniosHasta: "Debe ser mayor o igual a “Años desde”." };
    }
    return null;
  },
};

export default function PoliticasVacacionalesPage() {
  return <ResourcePage config={config} />;
}
