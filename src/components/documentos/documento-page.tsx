"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Ellipsis, LoaderCircle, Plus, Search, ShieldAlert, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, moneda, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type Documento = {
  publicId: string;
  folio?: string | null;
  fechaCompra?: string | null;
  fecha?: string | null;
  fechaVenta?: string | null;
  subtotal?: number | string | null;
  descuento?: number | string | null;
  iva?: number | string | null;
  total?: number | string | null;
  estatus?: string | null;
  observaciones?: string | null;
  proveedor?: { nombre?: string } | null;
  cliente?: { nombre?: string } | null;
};

type Tercero = { publicId: string; nombre?: string; codigo?: string };
type AlmacenOpcion = { publicId: string; nombre?: string };
type Producto = {
  publicId: string;
  nombre?: string;
  codigo?: string;
  precioVenta?: string | number;
};

export type DocumentoConfig = {
  titulo: string;
  descripcion: string;
  recurso: string;
  permiso: string;
  singular: string;
  /** Género gramatical para "Nuevo/Nueva" (por defecto masculino). */
  genero?: "m" | "f";
  fecha: { campo: "fechaCompra" | "fecha" | "fechaVenta"; etiqueta: string };
  tercero: {
    campo: "proveedorId" | "clienteId";
    etiqueta: string;
    recurso: string;
    permiso: string;
    buscarPlaceholder: string;
  };
  almacen?: {
    campo: string;
    etiqueta: string;
    recurso: string;
    permiso: string;
  };
  detalle: {
    conDescuento: boolean;
    conValidez: boolean;
  };
  estatus: {
    transiciones: Record<string, { valor: string; etiqueta: string }[]>;
  };
  nota?: string;
};

type FilaDetalle = {
  productoId: string;
  cantidad: string;
  precioUnitario: string;
  descuento: string;
};

const FILA_VACIA: FilaDetalle = {
  productoId: "",
  cantidad: "1",
  precioUnitario: "",
  descuento: "0",
};

export function DocumentoPage({ config }: { config: DocumentoConfig }) {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede(config.permiso, "ver");
  const puedeCrear = puede(config.permiso, "crear");
  const puedeEditar = puede(config.permiso, "editar");
  const etiquetaNuevo = config.genero === "f" ? "Nueva" : "Nuevo";

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 400);

  const [sheetAbierto, setSheetAbierto] = useState(false);

  const documentos = useQuery<{ total: number; data: Documento[] }>({
    queryKey: ["documentos", config.recurso, pagina, registros, buscarDebounced],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (buscarDebounced.trim()) parametros.set("buscar", buscarDebounced.trim());
      return apiFetch<{ total: number; data: Documento[] }>(
        `${config.recurso}/paginacion?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({ publicId, estatus }: { publicId: string; estatus: string }) =>
      apiFetch(`${config.recurso}/estatus/${publicId}`, {
        method: "PATCH",
        body: JSON.stringify({ estatus }),
      }),
    onSuccess: () => {
      toast.success("Estatus actualizado correctamente.");
      void queryClient.invalidateQueries({
        queryKey: ["documentos", config.recurso],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const columnas = useMemo<ColumnDef<Documento, unknown>[]>(
    () => [
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
        id: "tercero",
        header: config.tercero.etiqueta,
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.proveedor?.nombre ?? row.original.cliente?.nombre ?? "—"}
          </span>
        ),
      },
      {
        id: "fecha",
        header: "Fecha",
        cell: ({ row }) => (
          <span className="text-sm">
            {fechaCorta(row.original[config.fecha.campo])}
          </span>
        ),
      },
      {
        id: "total",
        header: () => <span className="block text-right">Total</span>,
        cell: ({ row }) => (
          <span className="tabular block text-right font-medium">
            {moneda(row.original.total)}
          </span>
        ),
      },
      {
        id: "estatus",
        header: "Estatus",
        cell: ({ row }) => <EstadoBadge estado={row.original.estatus} />,
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const documento = row.original;
          const transiciones =
            config.estatus.transiciones[documento.estatus ?? ""] ?? [];
          if (!puedeEditar || transiciones.length === 0) {
            return <span className="sr-only">Sin acciones</span>;
          }
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Cambiar estatus de ${documento.folio ?? "documento"}`}
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  {transiciones.map((transicion) => (
                    <DropdownMenuItem
                      key={transicion.valor}
                      className="cursor-pointer"
                      disabled={cambiarEstatus.isPending}
                      onClick={() =>
                        cambiarEstatus.mutate({
                          publicId: documento.publicId,
                          estatus: transicion.valor,
                        })
                      }
                    >
                      {transicion.etiqueta}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, puedeEditar, cambiarEstatus.isPending],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo={config.titulo} />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a esta pantalla"
          descripcion={`Tu rol no tiene el permiso ${config.permiso}.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo={config.titulo}
        descripcion={config.descripcion}
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setSheetAbierto(true)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {etiquetaNuevo} {config.singular.toLowerCase()}
            </Button>
          ) : null
        }
      />

      {config.nota && (
        <p className="mb-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {config.nota}
        </p>
      )}

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={buscar}
            onChange={(evento) => {
              setBuscar(evento.target.value);
              setPagina(1);
            }}
            placeholder="Buscar por folio u observaciones…"
            className="h-8 pl-8"
            aria-label={`Buscar ${config.titulo.toLowerCase()}`}
          />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {(documentos.data?.total ?? 0).toLocaleString("es-MX")} registros
        </p>
      </div>

      {documentos.error ? (
        <ErrorState
          error={documentos.error}
          onReintentar={() => void documentos.refetch()}
        />
      ) : (
        <DataTable
          columns={columnas}
          data={documentos.data?.data ?? []}
          total={documentos.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={documentos.isPending || documentos.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={ShieldAlert}
              titulo={`Todavía no hay ${config.titulo.toLowerCase()}`}
              descripcion={`Registra el primer documento de ${config.singular.toLowerCase()}.`}
              accion={
                puedeCrear ? (
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setSheetAbierto(true)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {etiquetaNuevo} {config.singular.toLowerCase()}
                  </Button>
                ) : null
              }
            />
          }
        />
      )}

      <Sheet open={sheetAbierto} onOpenChange={setSheetAbierto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {etiquetaNuevo} {config.singular.toLowerCase()}
            </SheetTitle>
            <SheetDescription>
              Captura el documento y sus partidas. Los importes los calcula el
              servidor al guardar.
            </SheetDescription>
          </SheetHeader>

          <FormularioDocumento
            config={config}
            onCancelar={() => setSheetAbierto(false)}
            onGuardado={() => {
              setSheetAbierto(false);
              void queryClient.invalidateQueries({
                queryKey: ["documentos", config.recurso],
              });
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormularioDocumento({
  config,
  onGuardado,
  onCancelar,
}: {
  config: DocumentoConfig;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const { puede } = useAuth();
  const puedeTerceros = puede(config.tercero.permiso);
  const puedeProductos = puede("/almacen/productos");
  const puedeAlmacenes = config.almacen
    ? puede(config.almacen.permiso)
    : false;

  const [terceroId, setTerceroId] = useState("");
  const [almacenId, setAlmacenId] = useState("");
  const [fecha, setFecha] = useState(() => fechaISO(new Date()));
  const [diasValidez, setDiasValidez] = useState("15");
  const [observaciones, setObservaciones] = useState("");
  const [detalles, setDetalles] = useState<FilaDetalle[]>([{ ...FILA_VACIA }]);
  const [error, setError] = useState<string | null>(null);

  const terceros = useQuery<Tercero[]>({
    queryKey: ["terceros", config.tercero.recurso],
    queryFn: () => apiFetch<Tercero[]>(config.tercero.recurso),
    enabled: puedeTerceros,
    staleTime: 5 * 60_000,
  });

  const productos = useQuery<Producto[]>({
    queryKey: ["productos-select"],
    queryFn: () => apiFetch<Producto[]>("/almacen/productos"),
    enabled: puedeProductos,
    staleTime: 5 * 60_000,
  });

  const almacenes = useQuery<AlmacenOpcion[]>({
    queryKey: ["almacenes-select", config.almacen?.recurso],
    queryFn: () =>
      apiFetch<AlmacenOpcion[]>(config.almacen?.recurso ?? ""),
    enabled: Boolean(config.almacen) && puedeAlmacenes,
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const partidas = detalles
        .filter((fila) => fila.productoId && Number(fila.cantidad) > 0)
        .map((fila) => ({
          productoId: fila.productoId,
          cantidad: Number(fila.cantidad),
          precioUnitario: Number(fila.precioUnitario || 0),
          ...(config.detalle.conDescuento
            ? { descuento: Number(fila.descuento || 0) }
            : {}),
        }));

      const payload: Record<string, unknown> = {
        [config.tercero.campo]: terceroId,
        [config.fecha.campo]: fecha,
        detalles: partidas,
      };

      if (config.almacen) payload[config.almacen.campo] = almacenId;

      if (config.detalle.conValidez) payload.diasValidez = Number(diasValidez);
      if (observaciones.trim()) payload.observaciones = observaciones.trim();

      return apiFetch(config.recurso, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(`${config.singular} creado correctamente.`);
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  const totales = useMemo(() => {
    let subtotal = 0;
    let descuento = 0;
    for (const fila of detalles) {
      const cantidad = Number(fila.cantidad) || 0;
      const precio = Number(fila.precioUnitario) || 0;
      const desc = config.detalle.conDescuento ? Number(fila.descuento) || 0 : 0;
      const bruto = cantidad * precio;
      subtotal += bruto;
      descuento += (bruto * desc) / 100;
    }
    const base = subtotal - descuento;
    return { subtotal, descuento, iva: base * 0.16, total: base * 1.16 };
  }, [detalles, config.detalle.conDescuento]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!terceroId) {
      setError(`Selecciona ${config.tercero.etiqueta.toLowerCase()}.`);
      return;
    }
    if (config.almacen && !almacenId) {
      setError(`Selecciona ${config.almacen.etiqueta.toLowerCase()}.`);
      return;
    }
    if (!fecha) {
      setError("Selecciona la fecha.");
      return;
    }
    const partidas = detalles.filter(
      (fila) => fila.productoId && Number(fila.cantidad) > 0,
    );
    if (partidas.length === 0) {
      setError("Agrega al menos una partida con producto y cantidad.");
      return;
    }
    mutation.mutate();
  }

  function actualizarFila(indice: number, cambios: Partial<FilaDetalle>) {
    setDetalles((previas) =>
      previas.map((fila, posicion) =>
        posicion === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <SeccionFormulario numero={1} titulo="Datos generales">
          <div className="space-y-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="tercero">{config.tercero.etiqueta}</Label>
            <select
              id="tercero"
              value={terceroId}
              onChange={(evento) => setTerceroId(evento.target.value)}
              disabled={!puedeTerceros}
              className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecciona…</option>
              {(terceros.data ?? []).map((tercero) => (
                <option key={tercero.publicId} value={tercero.publicId}>
                  {tercero.nombre ?? tercero.codigo ?? tercero.publicId}
                </option>
              ))}
            </select>
            {!puedeTerceros && (
              <p className="text-xs text-muted-foreground">
                Necesitas permiso sobre {config.tercero.permiso}.
              </p>
            )}
          </div>

          {config.almacen && (
            <div className="space-y-1.5">
              <Label htmlFor="almacen">{config.almacen.etiqueta}</Label>
              <select
                id="almacen"
                value={almacenId}
                onChange={(evento) => setAlmacenId(evento.target.value)}
                disabled={!puedeAlmacenes}
                className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Selecciona…</option>
                {(almacenes.data ?? []).map((almacen) => (
                  <option key={almacen.publicId} value={almacen.publicId}>
                    {almacen.nombre ?? almacen.publicId}
                  </option>
                ))}
              </select>
              {!puedeAlmacenes && (
                <p className="text-xs text-muted-foreground">
                  Necesitas permiso sobre {config.almacen.permiso}.
                </p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fecha">{config.fecha.etiqueta}</Label>
            <Input
              id="fecha"
              type="date"
              value={fecha}
              onChange={(evento) => setFecha(evento.target.value)}
            />
          </div>

          {config.detalle.conValidez && (
            <div className="space-y-1.5">
              <Label htmlFor="diasValidez">Días de validez</Label>
              <Input
                id="diasValidez"
                type="number"
                min={1}
                value={diasValidez}
                onChange={(evento) => setDiasValidez(evento.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5 sm:col-span-3">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              rows={2}
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
            />
          </div>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Partidas">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                setDetalles((previas) => [...previas, { ...FILA_VACIA }])
              }
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar partida
            </Button>
          </div>

          <div className="space-y-2">
            {detalles.map((fila, indice) => (
              <div
                key={indice}
                className="rounded-md border border-border p-2.5"
              >
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs" htmlFor={`producto-${indice}`}>
                      Producto
                    </Label>
                    <select
                      id={`producto-${indice}`}
                      value={fila.productoId}
                      onChange={(evento) =>
                        actualizarFila(indice, {
                          productoId: evento.target.value,
                        })
                      }
                      disabled={!puedeProductos}
                      className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Selecciona…</option>
                      {(productos.data ?? []).map((producto) => (
                        <option key={producto.publicId} value={producto.publicId}>
                          {producto.nombre ?? producto.codigo ?? producto.publicId}
                        </option>
                      ))}
                    </select>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mb-0.5 shrink-0 cursor-pointer text-muted-foreground"
                    aria-label="Quitar partida"
                    disabled={detalles.length === 1}
                    onClick={() =>
                      setDetalles((previas) =>
                        previas.filter((_, posicion) => posicion !== indice),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`cantidad-${indice}`}>
                      Cantidad
                    </Label>
                    <Input
                      id={`cantidad-${indice}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9"
                      value={fila.cantidad}
                      onChange={(evento) =>
                        actualizarFila(indice, {
                          cantidad: evento.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`precio-${indice}`}>
                      P. unitario
                    </Label>
                    <Input
                      id={`precio-${indice}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9"
                      value={fila.precioUnitario}
                      onChange={(evento) =>
                        actualizarFila(indice, {
                          precioUnitario: evento.target.value,
                        })
                      }
                    />
                  </div>

                  {config.detalle.conDescuento && (
                    <div className="col-span-2 space-y-1 sm:col-span-1">
                      <Label className="text-xs" htmlFor={`descuento-${indice}`}>
                        Desc. %
                      </Label>
                      <Input
                        id={`descuento-${indice}`}
                        type="number"
                        min={0}
                        max={100}
                        className="h-9"
                        value={fila.descuento}
                        onChange={(evento) =>
                          actualizarFila(indice, {
                            descuento: evento.target.value,
                          })
                        }
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SeccionFormulario>

        <div className="ml-auto w-full max-w-xs space-y-1 rounded-md bg-muted/40 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="tabular">{moneda(totales.subtotal)}</span>
          </div>
          {config.detalle.conDescuento && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Descuento</span>
              <span className="tabular">{moneda(totales.descuento)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">IVA (16 %)</span>
            <span className="tabular">{moneda(totales.iva)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-1 font-semibold">
            <span>Total estimado</span>
            <span className="tabular">{moneda(totales.total)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onCancelar}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Plus className="size-3.5" aria-hidden="true" />
          )}
          Crear {config.singular.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}
