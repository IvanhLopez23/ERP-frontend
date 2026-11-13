"use client";

import { useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ellipsis,
  Eye,
  FileText,
  LoaderCircle,
  Lock,
  Pencil,
  Plus,
  Save,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, moneda, numero, texto } from "@/lib/format";
import {
  ESTATUS_POLIZA,
  TIPOS_POLIZA,
  periodoTexto,
  type CentroCosto,
  type CuentaContable,
  type PeriodoContable,
  type Poliza,
} from "@/lib/types/contabilidad";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

type FilaDetalle = {
  cuentaId: string;
  concepto: string;
  debe: string;
  haber: string;
  referencia: string;
};

const FILA_VACIA: FilaDetalle = {
  cuentaId: "",
  concepto: "",
  debe: "",
  haber: "",
  referencia: "",
};

export default function PolizasPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/contabilidad/polizas", "ver");
  const puedeCrear = puede("/contabilidad/polizas", "crear");
  const puedeEditar = puede("/contabilidad/polizas", "editar");

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 400);
  const [estatus, setEstatus] = useState("");
  const [tipo, setTipo] = useState("");
  const [periodoId, setPeriodoId] = useState("");

  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [editando, setEditando] = useState<Poliza | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cancelando, setCancelando] = useState<Poliza | null>(null);

  const polizas = useQuery<{ total: number; data: Poliza[] }>({
    queryKey: ["polizas", pagina, registros, buscarDebounced, estatus, tipo, periodoId],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (buscarDebounced.trim()) parametros.set("buscar", buscarDebounced.trim());
      if (estatus) parametros.set("estatus", estatus);
      if (tipo) parametros.set("tipo", tipo);
      if (periodoId) parametros.set("periodoId", periodoId);
      return apiFetch<{ total: number; data: Poliza[] }>(
        `/contabilidad/polizas/paginacion?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const periodos = useQuery<PeriodoContable[]>({
    queryKey: ["contabilidad-periodos"],
    queryFn: () => apiFetch<PeriodoContable[]>("/contabilidad/periodos"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const cuentas = useQuery<CuentaContable[]>({
    queryKey: ["contabilidad-cuentas"],
    queryFn: () => apiFetch<CuentaContable[]>("/contabilidad/cuentas"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const centros = useQuery<CentroCosto[]>({
    queryKey: ["contabilidad-centros"],
    queryFn: () => apiFetch<CentroCosto[]>("/contabilidad/centros-costo"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const detalle = useQuery<Poliza>({
    queryKey: ["poliza-detalle", detalleId],
    queryFn: () => apiFetch<Poliza>(`/contabilidad/polizas/${detalleId}`),
    enabled: Boolean(detalleId),
  });

  const cambiarEstatus = useMutation({
    mutationFn: ({
      publicId,
      accion,
    }: {
      publicId: string;
      accion: "contabilizar" | "cancelar";
    }) =>
      apiFetch(`/contabilidad/polizas/${accion}/${publicId}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Póliza actualizada correctamente.");
      setCancelando(null);
      void queryClient.invalidateQueries({ queryKey: ["polizas"] });
      void queryClient.invalidateQueries({ queryKey: ["poliza-detalle"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  async function abrirEdicion(poliza: Poliza) {
    try {
      const completa = await apiFetch<Poliza>(
        `/contabilidad/polizas/${poliza.publicId}`,
      );
      setEditando(completa);
      setSheetAbierto(true);
    } catch (error) {
      toast.error(mensajeDeError(error));
    }
  }

  const columnas = useMemo<ColumnDef<Poliza, unknown>[]>(
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
        id: "fecha",
        header: "Fecha",
        cell: ({ row }) => fechaCorta(row.original.fecha),
      },
      {
        id: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <span className="capitalize">{texto(row.original.tipo)}</span>
        ),
      },
      {
        id: "concepto",
        header: "Concepto",
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[260px] text-sm">
            {texto(row.original.concepto)}
          </span>
        ),
      },
      {
        id: "total",
        header: () => <span className="block text-right">Total</span>,
        cell: ({ row }) => (
          <span className="tabular block text-right">
            {moneda(row.original.totalDebe)}
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
          const poliza = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Acciones de ${poliza.folio}`}
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setDetalleId(poliza.publicId)}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    Ver detalle
                  </DropdownMenuItem>
                  {poliza.estatus === "borrador" && (
                    <>
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={!puedeEditar}
                        onClick={() => void abrirEdicion(poliza)}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="cursor-pointer"
                        disabled={!puedeEditar}
                        onClick={() =>
                          cambiarEstatus.mutate({
                            publicId: poliza.publicId,
                            accion: "contabilizar",
                          })
                        }
                      >
                        <Lock className="size-4" aria-hidden="true" />
                        Contabilizar
                      </DropdownMenuItem>
                    </>
                  )}
                  {poliza.estatus === "contabilizada" && (
                    <DropdownMenuItem
                      variant="destructive"
                      className="cursor-pointer"
                      disabled={!puedeEditar}
                      onClick={() => setCancelando(poliza)}
                    >
                      <Unlock className="size-4" aria-hidden="true" />
                      Cancelar póliza
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeEditar, cambiarEstatus],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Pólizas" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/polizas."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Pólizas"
        descripcion="Pólizas contables. Solo las contabilizadas aparecen en los reportes."
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setEditando(null);
                setSheetAbierto(true);
              }}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Nueva póliza
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
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
            placeholder="Buscar folio…"
            className="h-8 pl-8"
            aria-label="Buscar pólizas por folio"
          />
        </div>

        <select
          value={estatus}
          onChange={(evento) => {
            setEstatus(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por estatus"
          className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los estatus</option>
          {ESTATUS_POLIZA.map((valor) => (
            <option key={valor} value={valor} className="capitalize">
              {valor}
            </option>
          ))}
        </select>

        <select
          value={tipo}
          onChange={(evento) => {
            setTipo(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por tipo"
          className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los tipos</option>
          {TIPOS_POLIZA.map((valor) => (
            <option key={valor} value={valor} className="capitalize">
              {valor}
            </option>
          ))}
        </select>

        <select
          value={periodoId}
          onChange={(evento) => {
            setPeriodoId(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por periodo"
          className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los periodos</option>
          {(periodos.data ?? []).map((periodo) => (
            <option key={periodo.publicId} value={periodo.publicId}>
              {periodoTexto(periodo.anio, periodo.mes)}
            </option>
          ))}
        </select>

        <p className="text-xs text-muted-foreground sm:ml-auto">
          {polizas.data?.total ?? 0} pólizas
        </p>
      </div>

      {polizas.error ? (
        <ErrorState error={polizas.error} onReintentar={() => void polizas.refetch()} />
      ) : (
        <DataTable
          columns={columnas}
          data={polizas.data?.data ?? []}
          total={polizas.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={polizas.isPending || polizas.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={FileText}
              titulo="Todavía no hay pólizas"
              descripcion="Crea la primera póliza contable."
              accion={
                puedeCrear ? (
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      setEditando(null);
                      setSheetAbierto(true);
                    }}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Nueva póliza
                  </Button>
                ) : null
              }
            />
          }
        />
      )}

      <Sheet
        open={sheetAbierto}
        onOpenChange={(abierto) => {
          setSheetAbierto(abierto);
          if (!abierto) setEditando(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {editando ? "Editar póliza" : "Nueva póliza"}
            </SheetTitle>
            <SheetDescription>
              Debe y haber deben sumar lo mismo. La fecha debe caer en un periodo abierto.
            </SheetDescription>
          </SheetHeader>

          <FormularioPoliza
            key={editando?.publicId ?? "nueva"}
            poliza={editando}
            cuentas={cuentas.data ?? []}
            centros={centros.data ?? []}
            onCancelar={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
            onGuardado={() => {
              setSheetAbierto(false);
              setEditando(null);
              void queryClient.invalidateQueries({ queryKey: ["polizas"] });
            }}
          />
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(detalleId)}
        onOpenChange={(abierto) => {
          if (!abierto) setDetalleId(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              Póliza {detalle.data?.folio ?? ""}
            </SheetTitle>
            <SheetDescription>
              {detalle.data
                ? `${fechaCorta(detalle.data.fecha)} · ${detalle.data.concepto}`
                : "Cargando…"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {detalle.isPending ? (
              <p className="text-sm text-muted-foreground">Cargando póliza…</p>
            ) : detalle.error ? (
              <ErrorState error={detalle.error} onReintentar={() => void detalle.refetch()} />
            ) : detalle.data ? (
              <DetallePoliza poliza={detalle.data} />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(cancelando)}
        onOpenChange={(abierto) => {
          if (!abierto) setCancelando(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar póliza</DialogTitle>
            <DialogDescription>
              Se generará un reverso contable. La póliza original se conserva.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setCancelando(null)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              className="cursor-pointer"
              disabled={cambiarEstatus.isPending}
              onClick={() =>
                cancelando &&
                cambiarEstatus.mutate({
                  publicId: cancelando.publicId,
                  accion: "cancelar",
                })
              }
            >
              {cambiarEstatus.isPending && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              Cancelar póliza
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetallePoliza({ poliza }: { poliza: Poliza }) {
  const detalles = poliza.detalles ?? [];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Estatus</p>
          <EstadoBadge estado={poliza.estatus} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="capitalize">{poliza.tipo}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Periodo</p>
          <p>
            {poliza.periodo
              ? periodoTexto(poliza.periodo.anio, poliza.periodo.mes)
              : "—"}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Centro de costo</p>
          <p>{poliza.centroCosto?.nombre ?? "Sin centro"}</p>
        </div>
      </div>

      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Cuenta</th>
              <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Concepto</th>
              <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Debe</th>
              <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Haber</th>
            </tr>
          </thead>
          <tbody>
            {detalles.map((item) => (
              <tr key={item.publicId} className="border-t border-border">
                <td className="px-2 py-1.5">
                  <span className="font-mono text-xs">{item.cuenta?.codigo}</span>{" "}
                  {item.cuenta?.nombre}
                </td>
                <td className="px-2 py-1.5 text-muted-foreground">
                  {item.concepto ?? "—"}
                </td>
                <td className="tabular px-2 py-1.5 text-right">{moneda(item.debe)}</td>
                <td className="tabular px-2 py-1.5 text-right">{moneda(item.haber)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-border bg-muted/30">
            <tr>
              <td className="px-2 py-1.5 text-xs font-semibold" colSpan={2}>
                Totales
              </td>
              <td className="tabular px-2 py-1.5 text-right font-semibold">
                {moneda(poliza.totalDebe)}
              </td>
              <td className="tabular px-2 py-1.5 text-right font-semibold">
                {moneda(poliza.totalHaber)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function FormularioPoliza({
  poliza,
  cuentas,
  centros,
  onGuardado,
  onCancelar,
}: {
  poliza: Poliza | null;
  cuentas: CuentaContable[];
  centros: CentroCosto[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [fecha, setFecha] = useState(poliza?.fecha ?? fechaISO(new Date()));
  const [tipo, setTipo] = useState(poliza?.tipo ?? "diario");
  const [concepto, setConcepto] = useState(poliza?.concepto ?? "");
  const [centroCostoId, setCentroCostoId] = useState(
    poliza?.centroCosto?.publicId ?? "",
  );
  const [detalles, setDetalles] = useState<FilaDetalle[]>(() => {
    if (poliza?.detalles?.length) {
      return poliza.detalles.map((item) => ({
        cuentaId: item.cuenta?.publicId ?? "",
        concepto: item.concepto ?? "",
        debe: numero(item.debe) ? String(numero(item.debe)) : "",
        haber: numero(item.haber) ? String(numero(item.haber)) : "",
        referencia: item.referencia ?? "",
      }));
    }
    return [{ ...FILA_VACIA }, { ...FILA_VACIA }];
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload = {
        fecha,
        tipo,
        concepto: concepto.trim(),
        ...(centroCostoId ? { centroCostoId } : {}),
        detalles: detalles.map((fila) => ({
          cuentaId: fila.cuentaId,
          debe: numero(fila.debe),
          haber: numero(fila.haber),
          ...(fila.concepto.trim() ? { concepto: fila.concepto.trim() } : {}),
          ...(fila.referencia.trim() ? { referencia: fila.referencia.trim() } : {}),
        })),
      };

      return apiFetch(
        poliza ? `/contabilidad/polizas/${poliza.publicId}` : "/contabilidad/polizas",
        {
          method: poliza ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      toast.success(poliza ? "Póliza actualizada." : "Póliza creada en borrador.");
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  const totalDebe = detalles.reduce((suma, fila) => suma + numero(fila.debe), 0);
  const totalHaber = detalles.reduce((suma, fila) => suma + numero(fila.haber), 0);
  const cuentasMovimiento = cuentas.filter(
    (cuenta) => cuenta.permiteMovimientos && cuenta.activo,
  );

  function actualizarFila(indice: number, cambios: Partial<FilaDetalle>) {
    setDetalles((previas) =>
      previas.map((fila, posicion) =>
        posicion === indice ? { ...fila, ...cambios } : fila,
      ),
    );
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        setError(null);
        if (!concepto.trim()) {
          setError("El concepto es obligatorio.");
          return;
        }
        if (detalles.length < 2) {
          setError("Agrega al menos dos partidas.");
          return;
        }
        if (detalles.some((fila) => !fila.cuentaId)) {
          setError("Selecciona una cuenta en todas las partidas.");
          return;
        }
        if (detalles.some((fila) => numero(fila.debe) <= 0 && numero(fila.haber) <= 0)) {
          setError("Cada partida necesita debe o haber mayor a 0.");
          return;
        }
        if (detalles.some((fila) => numero(fila.debe) > 0 && numero(fila.haber) > 0)) {
          setError("Cada partida debe tener debe o haber, no ambos.");
          return;
        }
        if (Math.abs(totalDebe - totalHaber) > 0.009) {
          setError("La suma del debe debe ser igual a la del haber.");
          return;
        }
        mutation.mutate();
      }}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <SeccionFormulario numero={1} titulo="Datos generales">
          <div className="space-y-1.5">
            <Label htmlFor="conceptoPoliza" className="font-semibold">Concepto</Label>
            <Input
              id="conceptoPoliza"
              value={concepto}
              onChange={(evento) => setConcepto(evento.target.value)}
              className="h-9"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="fechaPoliza" className="font-semibold">Fecha</Label>
              <Input
                id="fechaPoliza"
                type="date"
                value={fecha}
                onChange={(evento) => setFecha(evento.target.value)}
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tipoPoliza" className="font-semibold">Tipo</Label>
              <select
                id="tipoPoliza"
                value={tipo}
                onChange={(evento) => setTipo(evento.target.value)}
                className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {TIPOS_POLIZA.map((valor) => (
                  <option key={valor} value={valor} className="capitalize">
                    {valor}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centroPoliza" className="font-semibold">
              Centro de costo (opcional)
            </Label>
            <select
              id="centroPoliza"
              value={centroCostoId}
              onChange={(evento) => setCentroCostoId(evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Sin centro</option>
              {centros.map((centro) => (
                <option key={centro.publicId} value={centro.publicId}>
                  {centro.codigo} · {centro.nombre}
                </option>
              ))}
            </select>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Partidas">
          <div className="flex justify-end">
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
              <div key={indice} className="rounded-md border border-border p-2.5">
                <div className="flex items-end gap-2">
                  <div className="min-w-0 flex-1 space-y-1">
                    <Label className="text-xs" htmlFor={`cuenta-${indice}`}>
                      Cuenta
                    </Label>
                    <select
                      id={`cuenta-${indice}`}
                      value={fila.cuentaId}
                      onChange={(evento) =>
                        actualizarFila(indice, { cuentaId: evento.target.value })
                      }
                      className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">Selecciona…</option>
                      {cuentasMovimiento.map((cuenta) => (
                        <option key={cuenta.publicId} value={cuenta.publicId}>
                          {cuenta.codigo} · {cuenta.nombre}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="mb-0.5 cursor-pointer text-muted-foreground"
                    aria-label="Quitar partida"
                    disabled={detalles.length <= 2}
                    onClick={() =>
                      setDetalles((previas) =>
                        previas.filter((_, posicion) => posicion !== indice),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`debe-${indice}`}>Debe</Label>
                    <Input
                      id={`debe-${indice}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9"
                      value={fila.debe}
                      onChange={(evento) =>
                        actualizarFila(indice, {
                          debe: evento.target.value,
                          haber: "",
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`haber-${indice}`}>Haber</Label>
                    <Input
                      id={`haber-${indice}`}
                      type="number"
                      min={0}
                      step="0.01"
                      className="h-9"
                      value={fila.haber}
                      onChange={(evento) =>
                        actualizarFila(indice, {
                          haber: evento.target.value,
                          debe: "",
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`concepto-${indice}`}>Concepto</Label>
                    <Input
                      id={`concepto-${indice}`}
                      className="h-9"
                      value={fila.concepto}
                      onChange={(evento) =>
                        actualizarFila(indice, { concepto: evento.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs" htmlFor={`referencia-${indice}`}>Referencia</Label>
                    <Input
                      id={`referencia-${indice}`}
                      className="h-9"
                      value={fila.referencia}
                      onChange={(evento) =>
                        actualizarFila(indice, { referencia: evento.target.value })
                      }
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div
            className={cn(
              "flex justify-end gap-4 rounded-md border p-2.5 text-sm",
              Math.abs(totalDebe - totalHaber) < 0.009
                ? "border-border bg-muted/40"
                : "border-destructive/40 bg-destructive/5",
            )}
          >
            <span>
              Debe: <strong className="tabular">{moneda(totalDebe)}</strong>
            </span>
            <span>
              Haber: <strong className="tabular">{moneda(totalHaber)}</strong>
            </span>
            <span>
              Diferencia:{" "}
              <strong className="tabular">
                {moneda(Math.abs(totalDebe - totalHaber))}
              </strong>
            </span>
          </div>
        </SeccionFormulario>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancelar}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {poliza ? "Guardar póliza" : "Crear póliza"}
        </Button>
      </div>
    </form>
  );
}
