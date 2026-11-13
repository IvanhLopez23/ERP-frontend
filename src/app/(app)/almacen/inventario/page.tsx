"use client";

import { useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Archive,
  Download,
  Eye,
  FileSpreadsheet,
  LoaderCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiBlob, apiFetch, mensajeDeError } from "@/lib/api-client";
import {
  cantidad,
  descargarArchivo,
  fechaHora,
  moneda,
  numero,
  texto,
} from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type Almacen = {
  publicId: string;
  nombre?: string;
  ubicacion?: string | null;
};

type StockRow = {
  productoId: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  unidadMedida?: string | null;
  existencia: number;
  precioCosto: number;
  precioVenta: number;
  valorCosto: number;
  valorVenta: number;
};

type Corte = {
  publicId: string;
  anio: number;
  mes: number;
  fechaCorte: string;
  totalProductos: number;
  totalUnidades: number | string;
  totalValorCosto: number | string;
  totalValorVenta: number | string;
  almacen?: Almacen | null;
};

type CorteDetalle = {
  publicId: string;
  codigo: string;
  nombre: string;
  categoria?: string | null;
  unidadMedida?: string | null;
  existencia: number | string;
  precioCosto: number | string;
  precioVenta: number | string;
  valorCosto: number | string;
  valorVenta: number | string;
};

type CorteConDetalles = Corte & { detalles: CorteDetalle[] };

type Pagina<T> = {
  total: number;
  pagina: number;
  registros: number;
  data: T[];
};

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const columnasStock: ColumnDef<StockRow>[] = [
  {
    id: "codigo",
    header: "Código",
    cell: ({ row }) => (
      <span className="font-mono text-xs">{texto(row.original.codigo)}</span>
    ),
  },
  {
    id: "producto",
    header: "Producto",
    cell: ({ row }) => (
      <span className="font-medium">{texto(row.original.nombre)}</span>
    ),
  },
  {
    id: "categoria",
    header: "Categoría",
    cell: ({ row }) => texto(row.original.categoria),
  },
  {
    id: "unidad",
    header: "Unidad",
    cell: ({ row }) => texto(row.original.unidadMedida),
  },
  {
    id: "existencia",
    header: "Existencia",
    cell: ({ row }) => (
      <span className="tabular font-medium">
        {cantidad(row.original.existencia, 2)}
      </span>
    ),
  },
  {
    id: "costo",
    header: "Costo unitario",
    cell: ({ row }) => (
      <span className="tabular">{moneda(row.original.precioCosto)}</span>
    ),
  },
  {
    id: "valor",
    header: "Valor costo",
    cell: ({ row }) => (
      <span className="tabular">{moneda(row.original.valorCosto)}</span>
    ),
  },
];

const columnasCortes = (
  onVer: (corte: Corte) => void,
  onCsv: (corte: Corte) => void,
  descargandoId: string | null,
): ColumnDef<Corte>[] => [
  {
    id: "periodo",
    header: "Periodo",
    cell: ({ row }) => (
      <span className="font-medium">
        {MESES[row.original.mes - 1]} {row.original.anio}
      </span>
    ),
  },
  {
    id: "almacen",
    header: "Almacén",
    cell: ({ row }) => texto(row.original.almacen?.nombre),
  },
  {
    id: "fecha",
    header: "Fecha de corte",
    cell: ({ row }) => fechaHora(row.original.fechaCorte),
  },
  {
    id: "productos",
    header: "Productos",
    cell: ({ row }) => cantidad(row.original.totalProductos, 0),
  },
  {
    id: "unidades",
    header: "Unidades",
    cell: ({ row }) => cantidad(row.original.totalUnidades, 2),
  },
  {
    id: "valor",
    header: "Valor costo",
    cell: ({ row }) => (
      <span className="tabular">{moneda(row.original.totalValorCosto)}</span>
    ),
  },
  {
    id: "acciones",
    header: "Acciones",
    cell: ({ row }) => {
      const corte = row.original;
      return (
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => onVer(corte)}
          >
            <Eye className="size-3.5" aria-hidden="true" />
            Ver
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer"
            disabled={descargandoId === corte.publicId}
            onClick={() => onCsv(corte)}
          >
            {descargandoId === corte.publicId ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-3.5" aria-hidden="true" />
            )}
            CSV
          </Button>
        </div>
      );
    },
  },
];

export default function InventarioPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();
  const puedeInventario = puede("/almacen/inventario");

  const ahora = new Date();
  const [tab, setTab] = useState("stock");

  const [almacenStock, setAlmacenStock] = useState("");
  const [buscarStock, setBuscarStock] = useState("");
  const [paginaStock, setPaginaStock] = useState(1);
  const [registrosStock, setRegistrosStock] = useState(10);
  const buscarDebounced = useDebounce(buscarStock.trim(), 350);

  const [almacenCortes, setAlmacenCortes] = useState("");
  const [anioCortes, setAnioCortes] = useState("");
  const [paginaCortes, setPaginaCortes] = useState(1);
  const [registrosCortes, setRegistrosCortes] = useState(10);

  const [corteAlmacen, setCorteAlmacen] = useState("");
  const [corteMes, setCorteMes] = useState(String(ahora.getMonth() + 1));
  const [corteAnio, setCorteAnio] = useState(String(ahora.getFullYear()));

  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [descargandoId, setDescargandoId] = useState<string | null>(null);

  const almacenes = useQuery<Almacen[]>({
    queryKey: ["inventario-almacenes"],
    queryFn: () => apiFetch<Almacen[]>("/almacen/inventario/almacenes"),
    enabled: puedeInventario,
    staleTime: 5 * 60_000,
  });

  const stock = useQuery<Pagina<StockRow>>({
    queryKey: [
      "inventario-stock",
      almacenStock,
      buscarDebounced,
      paginaStock,
      registrosStock,
    ],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(paginaStock),
        registros: String(registrosStock),
      });
      if (almacenStock) parametros.set("almacenId", almacenStock);
      if (buscarDebounced) parametros.set("buscar", buscarDebounced);
      return apiFetch<Pagina<StockRow>>(
        `/almacen/inventario/stock?${parametros.toString()}`,
      );
    },
    enabled: puedeInventario,
    placeholderData: keepPreviousData,
  });

  const cortes = useQuery<Pagina<Corte>>({
    queryKey: [
      "inventario-cortes",
      almacenCortes,
      anioCortes,
      paginaCortes,
      registrosCortes,
    ],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(paginaCortes),
        registros: String(registrosCortes),
      });
      if (almacenCortes) parametros.set("almacenId", almacenCortes);
      if (anioCortes) parametros.set("anio", anioCortes);
      return apiFetch<Pagina<Corte>>(
        `/almacen/inventario/cortes?${parametros.toString()}`,
      );
    },
    enabled: puedeInventario,
    placeholderData: keepPreviousData,
  });

  const detalle = useQuery<CorteConDetalles>({
    queryKey: ["inventario-corte", detalleId],
    queryFn: () =>
      apiFetch<CorteConDetalles>(
        `/almacen/inventario/cortes/${detalleId}`,
      ),
    enabled: puedeInventario && Boolean(detalleId),
  });

  const crearCorte = useMutation({
    mutationFn: () =>
      apiFetch("/almacen/inventario/cortes", {
        method: "POST",
        body: JSON.stringify({
          almacenId: corteAlmacen,
          anio: Number(corteAnio),
          mes: Number(corteMes),
        }),
      }),
    onSuccess: () => {
      toast.success("Corte de inventario generado correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["inventario-cortes"],
      });
      setTab("cortes");
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  async function descargarCorte(corte: Corte) {
    setDescargandoId(corte.publicId);
    try {
      const { blob, nombre } = await apiBlob(
        `/almacen/inventario/cortes/${corte.publicId}/csv`,
      );
      descargarArchivo(
        blob,
        nombre ??
          `corte-${corte.almacen?.nombre ?? "almacen"}-${corte.anio}-${String(
            corte.mes,
          ).padStart(2, "0")}.csv`,
      );
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setDescargandoId(null);
    }
  }

  const columnasCorte = columnasCortes(
    (corte) => setDetalleId(corte.publicId),
    descargarCorte,
    descargandoId,
  );

  return (
    <>
      <PageHeader
        titulo="Inventario"
        descripcion="Consulta el stock por almacén, genera cortes al cierre de cada mes y descarga su CSV."
      />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="stock" className="cursor-pointer">
            <Archive className="size-3.5" aria-hidden="true" />
            Stock actual
          </TabsTrigger>
          <TabsTrigger value="cortes" className="cursor-pointer">
            <FileSpreadsheet className="size-3.5" aria-hidden="true" />
            Cortes mensuales
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={almacenStock}
              onChange={(evento) => {
                setAlmacenStock(evento.target.value);
                setPaginaStock(1);
              }}
              aria-label="Filtrar stock por almacén"
              className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-56"
            >
              <option value="">Todos los almacenes</option>
              {(almacenes.data ?? []).map((almacen) => (
                <option key={almacen.publicId} value={almacen.publicId}>
                  {almacen.nombre ?? almacen.publicId}
                </option>
              ))}
            </select>

            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                type="search"
                value={buscarStock}
                onChange={(evento) => {
                  setBuscarStock(evento.target.value);
                  setPaginaStock(1);
                }}
                placeholder="Buscar por nombre o código…"
                aria-label="Buscar producto en inventario"
                className="h-8 pl-8"
              />
            </div>
          </div>

          {stock.error ? (
            <ErrorState
              error={stock.error}
              onReintentar={() => void stock.refetch()}
            />
          ) : (
            <DataTable
              columns={columnasStock}
              data={stock.data?.data ?? []}
              total={stock.data?.total ?? 0}
              pagina={paginaStock}
              registros={registrosStock}
              cargando={stock.isPending || stock.isFetching}
              onPaginaChange={setPaginaStock}
              onRegistrosChange={(valor) => {
                setRegistrosStock(valor);
                setPaginaStock(1);
              }}
              vacio={
                <EmptyState
                  icono={Archive}
                  titulo="Sin productos en inventario"
                  descripcion="No se encontraron productos para los filtros seleccionados."
                />
              }
            />
          )}
        </TabsContent>

        <TabsContent value="cortes" className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-end gap-3 pt-0">
              <div className="min-w-[200px] space-y-1">
                <Label htmlFor="corteAlmacen" className="text-xs">
                  Almacén
                </Label>
                <select
                  id="corteAlmacen"
                  value={corteAlmacen}
                  onChange={(evento) => setCorteAlmacen(evento.target.value)}
                  className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Selecciona un almacén…</option>
                  {(almacenes.data ?? []).map((almacen) => (
                    <option key={almacen.publicId} value={almacen.publicId}>
                      {almacen.nombre ?? almacen.publicId}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="corteMes" className="text-xs">
                  Mes
                </Label>
                <select
                  id="corteMes"
                  value={corteMes}
                  onChange={(evento) => setCorteMes(evento.target.value)}
                  className="h-8 cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {MESES.map((mes, indice) => (
                    <option key={mes} value={indice + 1}>
                      {mes}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="corteAnio" className="text-xs">
                  Año
                </Label>
                <Input
                  id="corteAnio"
                  type="number"
                  min={2000}
                  max={ahora.getFullYear()}
                  value={corteAnio}
                  onChange={(evento) => setCorteAnio(evento.target.value)}
                  className="h-8 w-24"
                />
              </div>

              <Button
                type="button"
                size="sm"
                className="cursor-pointer"
                disabled={!corteAlmacen || crearCorte.isPending}
                onClick={() => crearCorte.mutate()}
              >
                {crearCorte.isPending ? (
                  <LoaderCircle
                    className="size-3.5 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <FileSpreadsheet className="size-3.5" aria-hidden="true" />
                )}
                Generar corte
              </Button>

              <p className="w-full text-xs text-muted-foreground sm:ml-auto sm:w-auto">
                El corte refleja el stock al cierre del mes seleccionado. No se
                genera si no hay movimientos hasta ese periodo.
              </p>
            </CardContent>
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={almacenCortes}
              onChange={(evento) => {
                setAlmacenCortes(evento.target.value);
                setPaginaCortes(1);
              }}
              aria-label="Filtrar cortes por almacén"
              className="h-8 w-full cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto sm:max-w-56"
            >
              <option value="">Todos los almacenes</option>
              {(almacenes.data ?? []).map((almacen) => (
                <option key={almacen.publicId} value={almacen.publicId}>
                  {almacen.nombre ?? almacen.publicId}
                </option>
              ))}
            </select>

            <Input
              type="number"
              min={2000}
              max={ahora.getFullYear()}
              value={anioCortes}
              onChange={(evento) => {
                setAnioCortes(evento.target.value);
                setPaginaCortes(1);
              }}
              placeholder="Año"
              aria-label="Filtrar cortes por año"
              className="h-8 w-28"
            />
          </div>

          {cortes.error ? (
            <ErrorState
              error={cortes.error}
              onReintentar={() => void cortes.refetch()}
            />
          ) : (
            <DataTable
              columns={columnasCorte}
              data={cortes.data?.data ?? []}
              total={cortes.data?.total ?? 0}
              pagina={paginaCortes}
              registros={registrosCortes}
              cargando={cortes.isPending || cortes.isFetching}
              onPaginaChange={setPaginaCortes}
              onRegistrosChange={(valor) => {
                setRegistrosCortes(valor);
                setPaginaCortes(1);
              }}
              vacio={
                <EmptyState
                  icono={FileSpreadsheet}
                  titulo="Todavía no hay cortes"
                  descripcion="Genera el primer corte mensual de inventario."
                />
              }
            />
          )}
        </TabsContent>
      </Tabs>

      <Sheet
        open={Boolean(detalleId)}
        onOpenChange={(abierto) => {
          if (!abierto) setDetalleId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-4xl">
          <SheetHeader>
            <SheetTitle>
              {detalle.data
                ? `${MESES[detalle.data.mes - 1]} ${detalle.data.anio}`
                : "Detalle del corte"}
            </SheetTitle>
            <SheetDescription>
              {detalle.data?.almacen?.nombre ?? "Corte de inventario"}
              {detalle.data
                ? ` · ${numero(detalle.data.totalProductos)} productos · ${cantidad(
                    detalle.data.totalUnidades,
                    2,
                  )} unidades`
                : ""}
            </SheetDescription>
          </SheetHeader>

          {detalle.error ? (
            <ErrorState
              error={detalle.error}
              onReintentar={() => void detalle.refetch()}
            />
          ) : detalle.isPending ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">
              Cargando detalle…
            </p>
          ) : (
            <div className="overflow-auto px-4 pb-6">
              <table className="w-full text-sm">
                <thead className="bg-muted/40">
                  <tr>
                    {[
                      "Código",
                      "Producto",
                      "Categoría",
                      "Unidad",
                      "Existencia",
                      "Costo",
                      "Valor costo",
                    ].map((columna) => (
                      <th
                        key={columna}
                        className="whitespace-nowrap px-3 py-2 text-left font-medium text-muted-foreground"
                      >
                        {columna}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(detalle.data?.detalles ?? []).map((fila) => (
                    <tr key={fila.publicId} className="border-t border-border">
                      <td className="px-3 py-2 font-mono text-xs">
                        {texto(fila.codigo)}
                      </td>
                      <td className="px-3 py-2">{texto(fila.nombre)}</td>
                      <td className="px-3 py-2">{texto(fila.categoria)}</td>
                      <td className="px-3 py-2">{texto(fila.unidadMedida)}</td>
                      <td className="tabular px-3 py-2">
                        {cantidad(fila.existencia, 2)}
                      </td>
                      <td className="tabular px-3 py-2">
                        {moneda(fila.precioCosto)}
                      </td>
                      <td className="tabular px-3 py-2">
                        {moneda(fila.valorCosto)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
