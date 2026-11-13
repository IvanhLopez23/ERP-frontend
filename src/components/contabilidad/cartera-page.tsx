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
  Banknote,
  Ellipsis,
  Eye,
  LoaderCircle,
  Plus,
  ShieldAlert,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, moneda, numero, texto } from "@/lib/format";
import {
  METODOS_PAGO,
  type CentroCosto,
  type Cobro,
  type CuentaCartera,
  type CuentaContable,
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
import { Textarea } from "@/components/ui/textarea";
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

const ESTATUS = ["pendiente", "parcial", "pagada", "cancelada"];

type Tercero = { publicId: string; nombre?: string; codigo?: string };

export function CarteraPage({ tipo }: { tipo: "cxc" | "cxp" }) {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const esCxc = tipo === "cxc";
  const recurso = `/contabilidad/${tipo}`;
  const permiso = `/contabilidad/${tipo}`;
  const singular = esCxc ? "cuenta por cobrar" : "cuenta por pagar";
  const terceroEtiqueta = esCxc ? "Cliente" : "Proveedor";

  const puedeVer = puede(permiso, "ver");
  const puedeCrear = puede(permiso, "crear");
  const puedeEditar = puede(permiso, "editar");

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [estatus, setEstatus] = useState("");
  const [vencidas, setVencidas] = useState(false);

  const [crearAbierto, setCrearAbierto] = useState(false);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [cobrando, setCobrando] = useState<CuentaCartera | null>(null);
  const [cancelando, setCancelando] = useState<CuentaCartera | null>(null);

  const cuentas = useQuery<{ total: number; data: CuentaCartera[] }>({
    queryKey: ["cartera", tipo, pagina, registros, estatus, vencidas],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (estatus) parametros.set("estatus", estatus);
      if (vencidas) parametros.set("vencidas", "true");
      return apiFetch<{ total: number; data: CuentaCartera[] }>(
        `${recurso}/paginacion?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const detalle = useQuery<CuentaCartera>({
    queryKey: ["cartera-detalle", tipo, detalleId],
    queryFn: () => apiFetch<CuentaCartera>(`${recurso}/${detalleId}`),
    enabled: Boolean(detalleId),
  });

  const cobros = useQuery<Tercero[]>({
    queryKey: esCxc ? ["clientes-select"] : ["proveedores-select"],
    queryFn: () =>
      apiFetch<Tercero[]>(esCxc ? "/ventas/clientes" : "/compras/proveedores"),
    enabled: puedeCrear,
    staleTime: 5 * 60_000,
  });

  const catalogoCuentas = useQuery<CuentaContable[]>({
    queryKey: ["contabilidad-cuentas"],
    queryFn: () => apiFetch<CuentaContable[]>("/contabilidad/cuentas"),
    enabled: puedeCrear,
    staleTime: 5 * 60_000,
  });

  const centros = useQuery<CentroCosto[]>({
    queryKey: ["contabilidad-centros"],
    queryFn: () => apiFetch<CentroCosto[]>("/contabilidad/centros-costo"),
    enabled: puedeCrear,
    staleTime: 5 * 60_000,
  });

  const registrarCobro = useMutation({
    mutationFn: ({ cuenta, datos }: { cuenta: CuentaCartera; datos: Record<string, unknown> }) =>
      apiFetch(`${recurso}/${cuenta.publicId}/${esCxc ? "cobros" : "pagos"}`, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      toast.success(esCxc ? "Cobro registrado." : "Pago registrado.");
      setCobrando(null);
      void queryClient.invalidateQueries({ queryKey: ["cartera", tipo] });
      void queryClient.invalidateQueries({ queryKey: ["cartera-detalle", tipo] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const cancelar = useMutation({
    mutationFn: (cuenta: CuentaCartera) =>
      apiFetch(`${recurso}/${cuenta.publicId}/cancelar`, { method: "PATCH" }),
    onSuccess: () => {
      toast.success("Cuenta cancelada y reverso generado.");
      setCancelando(null);
      void queryClient.invalidateQueries({ queryKey: ["cartera", tipo] });
      void queryClient.invalidateQueries({ queryKey: ["cartera-detalle", tipo] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const columnas = useMemo<ColumnDef<CuentaCartera, unknown>[]>(
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
        header: terceroEtiqueta,
        cell: ({ row }) =>
          (esCxc ? row.original.cliente?.nombre : row.original.proveedor?.nombre) ??
          "—",
      },
      {
        id: "emision",
        header: "Emisión",
        cell: ({ row }) => fechaCorta(row.original.fechaEmision),
      },
      {
        id: "vencimiento",
        header: "Vencimiento",
        cell: ({ row }) => fechaCorta(row.original.fechaVencimiento),
      },
      {
        id: "monto",
        header: () => <span className="block text-right">Total</span>,
        cell: ({ row }) => (
          <span className="tabular block text-right">
            {moneda(row.original.monto)}
          </span>
        ),
      },
      {
        id: "saldo",
        header: () => <span className="block text-right">Saldo</span>,
        cell: ({ row }) => (
          <span className="tabular block text-right font-medium">
            {moneda(row.original.saldo)}
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
          const cuenta = row.original;
          const conSaldo = numero(cuenta.saldo) > 0 && cuenta.estatus !== "cancelada";
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Acciones de ${cuenta.folio}`}
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onClick={() => setDetalleId(cuenta.publicId)}
                  >
                    <Eye className="size-4" aria-hidden="true" />
                    Ver detalle
                  </DropdownMenuItem>
                  {conSaldo && (
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={!puedeEditar}
                      onClick={() => setCobrando(cuenta)}
                    >
                      <Banknote className="size-4" aria-hidden="true" />
                      {esCxc ? "Registrar cobro" : "Registrar pago"}
                    </DropdownMenuItem>
                  )}
                  {cuenta.estatus !== "cancelada" && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        variant="destructive"
                        className="cursor-pointer"
                        disabled={!puedeEditar}
                        onClick={() => setCancelando(cuenta)}
                      >
                        <X className="size-4" aria-hidden="true" />
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [esCxc, puedeEditar, terceroEtiqueta],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo={esCxc ? "Cuentas por cobrar" : "Cuentas por pagar"} />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion={`Tu rol no tiene el permiso ${permiso}.`}
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo={esCxc ? "Cuentas por cobrar" : "Cuentas por pagar"}
        descripcion={
          esCxc
            ? "Cartera de clientes, cobros y cancelaciones con nota de crédito."
            : "Cartera de proveedores, pagos y cancelaciones con reverso."
        }
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setCrearAbierto(true)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              {esCxc ? "Nueva CxC" : "Nueva CxP"}
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          value={estatus}
          onChange={(evento) => {
            setEstatus(evento.target.value);
            setPagina(1);
          }}
          aria-label="Filtrar por estatus"
          className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">Todos los estatus</option>
          {ESTATUS.map((valor) => (
            <option key={valor} value={valor} className="capitalize">
              {valor}
            </option>
          ))}
        </select>

        <label className="flex h-8 cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={vencidas}
            onChange={(evento) => {
              setVencidas(evento.target.checked);
              setPagina(1);
            }}
            className="size-4 cursor-pointer accent-[var(--primary)]"
          />
          Solo vencidas
        </label>

        <p className="text-xs text-muted-foreground sm:ml-auto">
          {cuentas.data?.total ?? 0} registros
        </p>
      </div>

      {cuentas.error ? (
        <ErrorState error={cuentas.error} onReintentar={() => void cuentas.refetch()} />
      ) : (
        <DataTable
          columns={columnas}
          data={cuentas.data?.data ?? []}
          total={cuentas.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={cuentas.isPending || cuentas.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={Banknote}
              titulo={`Todavía no hay ${esCxc ? "cuentas por cobrar" : "cuentas por pagar"}`}
              descripcion="Las ventas y compras generan cartera automáticamente."
              accion={
                puedeCrear ? (
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setCrearAbierto(true)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    {esCxc ? "Nueva CxC" : "Nueva CxP"}
                  </Button>
                ) : null
              }
            />
          }
        />
      )}

      <Sheet
        open={crearAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) setCrearAbierto(false);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {esCxc ? "Nueva cuenta por cobrar" : "Nueva cuenta por pagar"}
            </SheetTitle>
            <SheetDescription>
              Registra un documento manual. Se generará su póliza contable.
            </SheetDescription>
          </SheetHeader>

          <FormularioCartera
            tipo={tipo}
            terceros={cobros.data ?? []}
            cuentas={catalogoCuentas.data ?? []}
            centros={centros.data ?? []}
            onCancelar={() => setCrearAbierto(false)}
            onGuardado={() => {
              setCrearAbierto(false);
              void queryClient.invalidateQueries({ queryKey: ["cartera", tipo] });
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
              {detalle.data?.folio ?? "Detalle"}
            </SheetTitle>
            <SheetDescription>
              {detalle.data
                ? (esCxc
                    ? detalle.data.cliente?.nombre
                    : detalle.data.proveedor?.nombre) ?? ""
                : "Cargando…"}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-4 py-4">
            {detalle.isPending ? (
              <p className="text-sm text-muted-foreground">Cargando…</p>
            ) : detalle.error ? (
              <ErrorState error={detalle.error} onReintentar={() => void detalle.refetch()} />
            ) : detalle.data ? (
              <DetalleCartera
                tipo={tipo}
                cuenta={detalle.data}
                onCobrar={() => setCobrando(detalle.data ?? null)}
              />
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(cobrando)}
        onOpenChange={(abierto) => {
          if (!abierto) setCobrando(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{esCxc ? "Registrar cobro" : "Registrar pago"}</DialogTitle>
            <DialogDescription>
              {cobrando?.folio} · Saldo {moneda(cobrando?.saldo)}
            </DialogDescription>
          </DialogHeader>
          {cobrando && (
            <FormularioCobro
              tipo={tipo}
              saldo={numero(cobrando.saldo)}
              enviando={registrarCobro.isPending}
              onCancelar={() => setCobrando(null)}
              onGuardar={(datos) =>
                registrarCobro.mutate({ cuenta: cobrando, datos })
              }
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(cancelando)}
        onOpenChange={(abierto) => {
          if (!abierto) setCancelando(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar {singular}</DialogTitle>
            <DialogDescription>
              Se generará un reverso contable y se cancelará la cuenta. Los
              cobros/pagos aplicados se reembolsan.
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
              disabled={cancelar.isPending}
              onClick={() => cancelando && cancelar.mutate(cancelando)}
            >
              {cancelar.isPending && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              Cancelar cuenta
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetalleCartera({
  tipo,
  cuenta,
  onCobrar,
}: {
  tipo: "cxc" | "cxp";
  cuenta: CuentaCartera;
  onCobrar: () => void;
}) {
  const movimientos = (tipo === "cxc" ? cuenta.cobros : cuenta.pagos) ?? [];
  const conSaldo = numero(cuenta.saldo) > 0 && cuenta.estatus !== "cancelada";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Estatus</p>
          <EstadoBadge estado={cuenta.estatus} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Vencimiento</p>
          <p>{fechaCorta(cuenta.fechaVencimiento)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total</p>
          <p className="tabular font-medium">{moneda(cuenta.monto)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Saldo</p>
          <p className="tabular font-semibold">{moneda(cuenta.saldo)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Póliza</p>
          <p className="font-mono text-xs">{cuenta.poliza?.folio ?? "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Póliza de cancelación</p>
          <p className="font-mono text-xs">
            {cuenta.polizaCancelacion?.folio ?? "—"}
          </p>
        </div>
        <div className="col-span-2">
          <p className="text-xs text-muted-foreground">Cuenta contable</p>
          <p>
            {cuenta.cuentaContable
              ? `${cuenta.cuentaContable.codigo} · ${cuenta.cuentaContable.nombre}`
              : "—"}
          </p>
        </div>
      </div>

      {conSaldo && (
        <Button size="sm" className="cursor-pointer" onClick={onCobrar}>
          <Banknote className="size-3.5" aria-hidden="true" />
          {tipo === "cxc" ? "Registrar cobro" : "Registrar pago"}
        </Button>
      )}

      <div>
        <p className="mb-2 text-sm font-semibold">
          {tipo === "cxc" ? "Cobros" : "Pagos"}
        </p>
        {movimientos.length === 0 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
            Sin movimientos registrados.
          </p>
        ) : (
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Fecha</th>
                  <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Método</th>
                  <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Referencia</th>
                  <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Monto</th>
                  <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Póliza</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento: Cobro) => (
                  <tr key={movimiento.publicId} className="border-t border-border">
                    <td className="px-2 py-1.5">{fechaCorta(movimiento.fecha)}</td>
                    <td className="px-2 py-1.5 capitalize">{movimiento.metodoPago}</td>
                    <td className="px-2 py-1.5 text-muted-foreground">
                      {movimiento.referencia ?? "—"}
                    </td>
                    <td className="tabular px-2 py-1.5 text-right">
                      {moneda(movimiento.monto)}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-xs">
                      {movimiento.poliza?.folio ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function FormularioCobro({
  tipo,
  saldo,
  enviando,
  onGuardar,
  onCancelar,
}: {
  tipo: "cxc" | "cxp";
  saldo: number;
  enviando: boolean;
  onGuardar: (datos: Record<string, unknown>) => void;
  onCancelar: () => void;
}) {
  const [fecha, setFecha] = useState(fechaISO(new Date()));
  const [monto, setMonto] = useState(String(saldo));
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [referencia, setReferencia] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const valor = Number(monto);
        if (!fecha) return setError("Selecciona la fecha.");
        if (!Number.isFinite(valor) || valor <= 0) {
          return setError("El monto debe ser mayor a 0.");
        }
        if (valor > saldo + 0.009) {
          return setError("El monto no puede superar el saldo.");
        }
        setError(null);
        onGuardar({
          fecha,
          monto: valor,
          metodoPago,
          ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
          ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        });
      }}
      className="space-y-3"
      noValidate
    >
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="fechaLiq" className="font-semibold">Fecha</Label>
          <Input
            id="fechaLiq"
            type="date"
            className="h-9"
            value={fecha}
            onChange={(evento) => setFecha(evento.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="montoLiq" className="font-semibold">Monto</Label>
          <Input
            id="montoLiq"
            type="number"
            step="0.01"
            min={0}
            className="h-9"
            value={monto}
            onChange={(evento) => setMonto(evento.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="metodoLiq" className="font-semibold">Método de pago</Label>
        <select
          id="metodoLiq"
          value={metodoPago}
          onChange={(evento) => setMetodoPago(evento.target.value)}
          className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {METODOS_PAGO.map((metodo) => (
            <option key={metodo} value={metodo} className="capitalize">
              {metodo}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="referenciaLiq" className="font-semibold">Referencia</Label>
        <Input
          id="referenciaLiq"
          className="h-9"
          value={referencia}
          onChange={(evento) => setReferencia(evento.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="observacionesLiq" className="font-semibold">Observaciones</Label>
        <Textarea
          id="observacionesLiq"
          rows={2}
          value={observaciones}
          onChange={(evento) => setObservaciones(evento.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={enviando}>
          {enviando && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          {tipo === "cxc" ? "Registrar cobro" : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}

function FormularioCartera({
  tipo,
  terceros,
  cuentas,
  centros,
  onGuardado,
  onCancelar,
}: {
  tipo: "cxc" | "cxp";
  terceros: Tercero[];
  cuentas: CuentaContable[];
  centros: CentroCosto[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const esCxc = tipo === "cxc";
  const [terceroId, setTerceroId] = useState("");
  const [fechaEmision, setFechaEmision] = useState(fechaISO(new Date()));
  const [fechaVencimiento, setFechaVencimiento] = useState("");
  const [monto, setMonto] = useState("");
  const [iva, setIva] = useState("0");
  const [cuentaId, setCuentaId] = useState("");
  const [concepto, setConcepto] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [centroCostoId, setCentroCostoId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        [esCxc ? "clienteId" : "proveedorId"]: terceroId,
        fechaEmision,
        monto: Number(monto),
        iva: Number(iva || 0),
        concepto: concepto.trim(),
      };
      if (fechaVencimiento) payload.fechaVencimiento = fechaVencimiento;
      if (cuentaId) {
        payload[esCxc ? "cuentaIngresoId" : "cuentaCargoId"] = cuentaId;
      }
      if (observaciones.trim()) payload.observaciones = observaciones.trim();
      if (centroCostoId) payload.centroCostoId = centroCostoId;

      return apiFetch(`/contabilidad/${tipo}`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(esCxc ? "CxC creada correctamente." : "CxP creada correctamente.");
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  const cuentasFiltradas = cuentas.filter(
    (cuenta) =>
      cuenta.permiteMovimientos &&
      cuenta.activo &&
      (esCxc
        ? cuenta.tipo === "ingreso"
        : cuenta.tipo === "gasto" || cuenta.tipo === "activo"),
  );

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        setError(null);
        if (!terceroId) return setError(`Selecciona un ${esCxc ? "cliente" : "proveedor"}.`);
        if (!concepto.trim()) return setError("El concepto es obligatorio.");
        if (!Number.isFinite(Number(monto)) || Number(monto) <= 0) {
          return setError("El monto debe ser mayor a 0.");
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

        <SeccionFormulario numero={1} titulo="Documento">
          <div className="space-y-1.5">
            <Label htmlFor="terceroCartera" className="font-semibold">
              {esCxc ? "Cliente" : "Proveedor"}
            </Label>
            <select
              id="terceroCartera"
              value={terceroId}
              onChange={(evento) => setTerceroId(evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecciona…</option>
              {terceros.map((tercero) => (
                <option key={tercero.publicId} value={tercero.publicId}>
                  {tercero.nombre ?? tercero.codigo ?? tercero.publicId}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="conceptoCartera" className="font-semibold">Concepto</Label>
            <Input
              id="conceptoCartera"
              className="h-9"
              value={concepto}
              onChange={(evento) => setConcepto(evento.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="emisionCartera" className="font-semibold">Emisión</Label>
              <Input
                id="emisionCartera"
                type="date"
                className="h-9"
                value={fechaEmision}
                onChange={(evento) => setFechaEmision(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vencimientoCartera" className="font-semibold">
                Vencimiento
              </Label>
              <Input
                id="vencimientoCartera"
                type="date"
                className="h-9"
                value={fechaVencimiento}
                onChange={(evento) => setFechaVencimiento(evento.target.value)}
              />
            </div>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Importes">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="montoCartera" className="font-semibold">
                Monto total (con IVA)
              </Label>
              <Input
                id="montoCartera"
                type="number"
                step="0.01"
                className="h-9"
                value={monto}
                onChange={(evento) => setMonto(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ivaCartera" className="font-semibold">IVA incluido</Label>
              <Input
                id="ivaCartera"
                type="number"
                step="0.01"
                className="h-9"
                value={iva}
                onChange={(evento) => setIva(evento.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cuentaCartera" className="font-semibold">
              {esCxc ? "Cuenta de ingreso" : "Cuenta de cargo"}
            </Label>
            <select
              id="cuentaCartera"
              value={cuentaId}
              onChange={(evento) => setCuentaId(evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Usar cuenta predeterminada</option>
              {cuentasFiltradas.map((cuenta) => (
                <option key={cuenta.publicId} value={cuenta.publicId}>
                  {cuenta.codigo} · {cuenta.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="centroCartera" className="font-semibold">
              Centro de costo (opcional)
            </Label>
            <select
              id="centroCartera"
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
          <div className="space-y-1.5">
            <Label htmlFor="observacionesCartera" className="font-semibold">
              Observaciones
            </Label>
            <Textarea
              id="observacionesCartera"
              rows={2}
              value={observaciones}
              onChange={(evento) => setObservaciones(evento.target.value)}
            />
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
            <Plus className="size-4" aria-hidden="true" />
          )}
          {esCxc ? "Crear CxC" : "Crear CxP"}
        </Button>
      </div>
    </form>
  );
}
