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
  Eye,
  LoaderCircle,
  Plus,
  Search,
  Trash2,
  Truck,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { cantidad, fechaCorta, fechaISO, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/data-table/data-table";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Almacen = { publicId: string; nombre?: string };
type Producto = {
  publicId: string;
  codigo?: string;
  nombre?: string;
  existencias?: number | string | null;
};

type StockProducto = { productoId: string; existencia: number };

type OrdenSalida = {
  publicId: string;
  folio: string;
  fechaSalida: string;
  motivo: string;
  totalProductos: number;
  totalUnidades: number | string;
  almacen?: Almacen | null;
};

type DetalleSalida = {
  publicId: string;
  codigo: string;
  nombre: string;
  unidadMedida?: string | null;
  cantidad: number | string;
  existenciaAnterior: number | string;
  existenciaNueva: number | string;
};

type OrdenConDetalles = OrdenSalida & { detalles: DetalleSalida[] };

type Pagina<T> = { total: number; pagina: number; registros: number; data: T[] };

type FilaSalida = { productoId: string; cantidad: string };

export default function SalidasPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();
  const puedeVer = puede("/almacen/movimientos-inventario");

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const [almacenFiltro, setAlmacenFiltro] = useState("");
  const buscarDebounced = useDebounce(buscar.trim(), 350);

  const [formAbierto, setFormAbierto] = useState(false);
  const [almacenId, setAlmacenId] = useState("");
  const [fecha, setFecha] = useState(() => fechaISO(new Date()));
  const [motivo, setMotivo] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [filas, setFilas] = useState<FilaSalida[]>([
    { productoId: "", cantidad: "1" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  const almacenes = useQuery<Almacen[]>({
    queryKey: ["salidas-almacenes"],
    queryFn: () => apiFetch<Almacen[]>("/almacen/salidas/almacenes"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const productos = useQuery<Producto[]>({
    queryKey: ["productos-select"],
    queryFn: () => apiFetch<Producto[]>("/almacen/productos"),
    enabled: puedeVer && formAbierto,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const stockAlmacen = useQuery<StockProducto[]>({
    queryKey: ["salidas-stock", almacenId],
    queryFn: () =>
      apiFetch<StockProducto[]>(
        `/almacen/salidas/stock?almacenId=${almacenId}`,
      ),
    enabled: puedeVer && formAbierto && Boolean(almacenId),
    staleTime: 0,
  });

  const salidas = useQuery<Pagina<OrdenSalida>>({
    queryKey: [
      "salidas",
      almacenFiltro,
      buscarDebounced,
      pagina,
      registros,
    ],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (almacenFiltro) parametros.set("almacenId", almacenFiltro);
      if (buscarDebounced) parametros.set("buscar", buscarDebounced);
      return apiFetch<Pagina<OrdenSalida>>(
        `/almacen/salidas?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const detalle = useQuery<OrdenConDetalles>({
    queryKey: ["salida", detalleId],
    queryFn: () =>
      apiFetch<OrdenConDetalles>(`/almacen/salidas/${detalleId}`),
    enabled: puedeVer && Boolean(detalleId),
  });

  const crear = useMutation({
    mutationFn: () =>
      apiFetch("/almacen/salidas", {
        method: "POST",
        body: JSON.stringify({
          almacenId,
          fechaSalida: fecha,
          motivo: motivo.trim(),
          ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
          detalles: filas
            .filter((fila) => fila.productoId && Number(fila.cantidad) > 0)
            .map((fila) => ({
              productoId: fila.productoId,
              cantidad: Number(fila.cantidad),
            })),
        }),
      }),
    onSuccess: () => {
      toast.success("Salida de inventario registrada correctamente.");
      void queryClient.invalidateQueries({ queryKey: ["salidas"] });
      void queryClient.invalidateQueries({ queryKey: ["productos"] });
      void queryClient.invalidateQueries({ queryKey: ["inventario-stock"] });
      setFormAbierto(false);
      setAlmacenId("");
      setMotivo("");
      setObservaciones("");
      setFilas([{ productoId: "", cantidad: "1" }]);
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  function abrirNuevo() {
    setError(null);
    setFecha(fechaISO(new Date()));
    setFormAbierto(true);
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);
    if (!almacenId) {
      setError("Selecciona el almacén de origen.");
      return;
    }
    if (!fecha) {
      setError("Selecciona la fecha de salida.");
      return;
    }
    if (!motivo.trim()) {
      setError("Captura el motivo de la salida.");
      return;
    }
    const partidas = filas.filter(
      (fila) => fila.productoId && Number(fila.cantidad) > 0,
    );
    if (partidas.length === 0) {
      setError("Agrega al menos un producto con cantidad.");
      return;
    }
    crear.mutate();
  }

  function actualizarFila(indice: number, cambios: Partial<FilaSalida>) {
    setFilas((previas) =>
      previas.map((fila, posicion) =>
        posicion === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  function productoDe(id: string) {
    return (productos.data ?? []).find((item) => item.publicId === id);
  }

  function existenciaEnAlmacen(id: string) {
    return (
      (stockAlmacen.data ?? []).find((item) => item.productoId === id)
        ?.existencia ?? 0
    );
  }

  const columnas: ColumnDef<OrdenSalida>[] = [
    {
      id: "folio",
      header: "Folio",
      cell: ({ row }) => (
        <span className="font-mono text-xs font-medium">
          {texto(row.original.folio)}
        </span>
      ),
    },
    {
      id: "fecha",
      header: "Fecha",
      cell: ({ row }) => fechaCorta(row.original.fechaSalida),
    },
    {
      id: "almacen",
      header: "Almacén",
      cell: ({ row }) => texto(row.original.almacen?.nombre),
    },
    {
      id: "motivo",
      header: "Motivo",
      cell: ({ row }) => (
        <span className="line-clamp-1 max-w-[240px]">
          {texto(row.original.motivo)}
        </span>
      ),
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
      id: "acciones",
      header: "Acciones",
      cell: ({ row }) => (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={() => setDetalleId(row.original.publicId)}
        >
          <Eye className="size-3.5" aria-hidden="true" />
          Ver
        </Button>
      ),
    },
  ];

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Salidas de inventario" />
        <EmptyState
          icono={Truck}
          titulo="Sin acceso a Salidas"
          descripcion="Tu rol no tiene el permiso /almacen/movimientos-inventario."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Salidas de inventario"
        descripcion="Órdenes de salida de productos por almacén con su trazabilidad."
        acciones={
          <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
            <Plus className="size-3.5" aria-hidden="true" />
            Nueva salida
          </Button>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={almacenFiltro}
          onChange={(evento) => {
            setAlmacenFiltro(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar salidas por almacén"
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
            value={buscar}
            onChange={(evento) => {
              setBuscar(evento.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por folio…"
            aria-label="Buscar salidas"
            className="h-8 pl-8"
          />
        </div>
      </div>

      {salidas.error ? (
        <ErrorState
          error={salidas.error}
          onReintentar={() => void salidas.refetch()}
        />
      ) : (
        <DataTable
          columns={columnas}
          data={salidas.data?.data ?? []}
          total={salidas.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={salidas.isPending || salidas.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={Truck}
              titulo="Todavía no hay salidas"
              descripcion="Registra la primera salida de productos de un almacén."
            />
          }
        />
      )}

      <Sheet open={formAbierto} onOpenChange={setFormAbierto}>
        <SheetContent className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">Nueva salida</SheetTitle>
            <SheetDescription>
              La salida descuenta la existencia del almacén seleccionado.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
              {error && (
                <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <SeccionFormulario numero={1} titulo="Datos generales">
                <div className="space-y-1.5">
                  <Label htmlFor="salidaAlmacen" className="font-semibold">
                    Almacén de origen
                  </Label>
                  <select
                    id="salidaAlmacen"
                    value={almacenId}
                    onChange={(evento) => setAlmacenId(evento.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Selecciona…</option>
                    {(almacenes.data ?? []).map((almacen) => (
                      <option key={almacen.publicId} value={almacen.publicId}>
                        {almacen.nombre ?? almacen.publicId}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="salidaFecha" className="font-semibold">
                    Fecha de salida
                  </Label>
                  <Input
                    id="salidaFecha"
                    type="date"
                    value={fecha}
                    onChange={(evento) => setFecha(evento.target.value)}
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="salidaMotivo" className="font-semibold">
                    Motivo
                  </Label>
                  <Input
                    id="salidaMotivo"
                    value={motivo}
                    onChange={(evento) => setMotivo(evento.target.value)}
                    placeholder="Salida a producción, traslado, merma…"
                    className="h-9"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-3">
                  <Label htmlFor="salidaObservaciones" className="font-semibold">
                    Observaciones
                  </Label>
                  <Textarea
                    id="salidaObservaciones"
                    value={observaciones}
                    onChange={(evento) => setObservaciones(evento.target.value)}
                    rows={2}
                  />
                </div>
              </SeccionFormulario>

              <SeccionFormulario numero={2} titulo="Productos">
                <div className="flex items-center justify-end sm:col-span-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() =>
                      setFilas((previas) => [
                        ...previas,
                        { productoId: "", cantidad: "1" },
                      ])
                    }
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Agregar producto
                  </Button>
                </div>

                <div className="space-y-2 sm:col-span-3">
                  {filas.map((fila, indice) => {
                    const producto = productoDe(fila.productoId);
                    return (
                      <div
                        key={indice}
                        className="rounded-md border border-border p-2.5"
                      >
                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-0 flex-1 space-y-1">
                            <Label
                              className="text-xs"
                              htmlFor={`salidaProducto-${indice}`}
                            >
                              Producto
                            </Label>
                            <select
                              id={`salidaProducto-${indice}`}
                              value={fila.productoId}
                              onChange={(evento) =>
                                actualizarFila(indice, {
                                  productoId: evento.target.value,
                                })
                              }
                              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              <option value="">Selecciona…</option>
                              {(productos.data ?? []).map((item) => (
                                <option
                                  key={item.publicId}
                                  value={item.publicId}
                                >
                                  {item.nombre ?? item.codigo ?? item.publicId}
                                  {item.codigo ? ` · ${item.codigo}` : ""}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="w-28 space-y-1">
                            <Label
                              className="text-xs"
                              htmlFor={`salidaCantidad-${indice}`}
                            >
                              Cantidad
                            </Label>
                            <Input
                              id={`salidaCantidad-${indice}`}
                              type="number"
                              min={0.01}
                              step="0.01"
                              value={fila.cantidad}
                              onChange={(evento) =>
                                actualizarFila(indice, {
                                  cantidad: evento.target.value,
                                })
                              }
                              className="h-9"
                            />
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="cursor-pointer"
                            aria-label="Quitar producto"
                            disabled={filas.length === 1}
                            onClick={() =>
                              setFilas((previas) =>
                                previas.filter(
                                  (_item, posicion) => posicion !== indice,
                                ),
                              )
                            }
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>

                        <p className="mt-1.5 text-xs text-muted-foreground">
                          {producto
                            ? almacenId
                              ? `Disponible en almacén: ${cantidad(
                                  existenciaEnAlmacen(fila.productoId),
                                  2,
                                )}`
                              : "Selecciona un almacén para ver la existencia."
                            : "—"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </SeccionFormulario>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                onClick={() => setFormAbierto(false)}
                disabled={crear.isPending}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="cursor-pointer"
                disabled={crear.isPending}
              >
                {crear.isPending ? (
                  <LoaderCircle
                    className="size-4 animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <Truck className="size-4" aria-hidden="true" />
                )}
                Registrar salida
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(detalleId)}
        onOpenChange={(abierto) => {
          if (!abierto) setDetalleId(null);
        }}
      >
        <SheetContent className="w-full overflow-y-auto sm:max-w-3xl">
          <SheetHeader>
            <SheetTitle>{detalle.data?.folio ?? "Orden de salida"}</SheetTitle>
            <SheetDescription>
              {detalle.data
                ? `${fechaCorta(detalle.data.fechaSalida)} · ${
                    detalle.data.almacen?.nombre ?? "Almacén"
                  } · ${detalle.data.motivo}`
                : "Detalle de la salida"}
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
                      "Unidad",
                      "Cantidad",
                      "Existencia anterior",
                      "Existencia nueva",
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
                      <td className="px-3 py-2">{texto(fila.unidadMedida)}</td>
                      <td className="tabular px-3 py-2">
                        {cantidad(fila.cantidad, 2)}
                      </td>
                      <td className="tabular px-3 py-2">
                        {cantidad(fila.existenciaAnterior, 2)}
                      </td>
                      <td className="tabular px-3 py-2">
                        {cantidad(fila.existenciaNueva, 2)}
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
