"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Landmark,
  LoaderCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldAlert,
  Unlink,
  Upload,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, moneda, numero } from "@/lib/format";
import {
  type Banco,
  type CuentaContable,
  type MovimientoBancario,
} from "@/lib/types/contabilidad";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Regla = {
  publicId: string;
  nombre: string;
  cuentaBancariaId?: string | null;
  prioridad: number;
  tipoMovimiento: string;
  referenciaContiene?: string | null;
  descripcionContiene?: string | null;
  toleranciaMonto?: number | string | null;
  toleranciaDias?: number | null;
  activo: boolean;
};

type Conciliacion = {
  saldoContable: number;
  saldoBanco: number;
  diferencia: number;
  partidasContables: Record<string, unknown>[];
  movimientosBanco: MovimientoBancario[];
};

export default function BancosPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/contabilidad/bancos", "ver");
  const puedeCrear = puede("/contabilidad/bancos", "crear");
  const puedeEditar = puede("/contabilidad/bancos", "editar");

  const hoy = new Date();
  const [desde, setDesde] = useState(
    fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
  );
  const [hasta, setHasta] = useState(fechaISO(hoy));

  const [bancoAbierto, setBancoAbierto] = useState(false);
  const [editando, setEditando] = useState<Banco | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [movimientoAbierto, setMovimientoAbierto] = useState(false);
  const [reglaAbierta, setReglaAbierta] = useState(false);
  const inputImportar = useRef<HTMLInputElement>(null);

  const bancos = useQuery<Banco[]>({
    queryKey: ["bancos"],
    queryFn: () => apiFetch<Banco[]>("/contabilidad/bancos"),
    enabled: puedeVer,
  });

  const cuentas = useQuery<CuentaContable[]>({
    queryKey: ["contabilidad-cuentas"],
    queryFn: () => apiFetch<CuentaContable[]>("/contabilidad/cuentas"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const detalle = bancos.data?.find((banco) => banco.publicId === detalleId) ?? null;

  const movimientos = useQuery<MovimientoBancario[]>({
    queryKey: ["banco-movimientos", detalleId, desde, hasta],
    queryFn: () =>
      apiFetch<MovimientoBancario[]>(
        `/contabilidad/bancos/${detalleId}/movimientos?desde=${desde}&hasta=${hasta}`,
      ),
    enabled: Boolean(detalleId),
  });

  const conciliacion = useQuery<Conciliacion>({
    queryKey: ["banco-conciliacion", detalleId, desde, hasta],
    queryFn: () =>
      apiFetch<Conciliacion>(
        `/contabilidad/bancos/${detalleId}/conciliacion?desde=${desde}&hasta=${hasta}`,
      ),
    enabled: Boolean(detalleId),
  });

  const reglas = useQuery<Regla[]>({
    queryKey: ["reglas-conciliacion", detalleId],
    queryFn: () =>
      apiFetch<Regla[]>(
        `/contabilidad/reglas-conciliacion?cuentaBancariaId=${detalleId}`,
      ),
    enabled: Boolean(detalleId),
  });

  const crearMovimiento = useMutation({
    mutationFn: (datos: Record<string, unknown>) =>
      apiFetch(`/contabilidad/bancos/${detalleId}/movimientos`, {
        method: "POST",
        body: JSON.stringify(datos),
      }),
    onSuccess: () => {
      toast.success("Movimiento registrado.");
      setMovimientoAbierto(false);
      void queryClient.invalidateQueries({ queryKey: ["banco-movimientos"] });
      void queryClient.invalidateQueries({ queryKey: ["banco-conciliacion"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const conciliarAutomatico = useMutation({
    mutationFn: () =>
      apiFetch(`/contabilidad/bancos/${detalleId}/conciliar-automatico`, {
        method: "POST",
        body: JSON.stringify({ desde, hasta, toleranciaDias: 3 }),
      }),
    onSuccess: (resultado) => {
      const data = resultado as { conciliados?: number; sinConciliar?: number };
      toast.success(
        `Conciliación automática: ${data.conciliados ?? 0} movimientos conciliados, ${data.sinConciliar ?? 0} pendientes.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["banco-movimientos"] });
      void queryClient.invalidateQueries({ queryKey: ["banco-conciliacion"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const importar = useMutation({
    mutationFn: (archivo: File) => {
      const form = new FormData();
      form.append("archivo", archivo);
      return apiFetch<{ importados?: number; duplicados?: number; errores?: unknown[] }>(
        `/contabilidad/bancos/${detalleId}/movimientos/importar?formato=auto`,
        { method: "POST", body: form },
      );
    },
    onSuccess: (data) => {
      toast.success(
        `Importados: ${data.importados ?? 0}. Duplicados: ${data.duplicados ?? 0}.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["banco-movimientos"] });
      void queryClient.invalidateQueries({ queryKey: ["banco-conciliacion"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const desconciliar = useMutation({
    mutationFn: (movimiento: MovimientoBancario) =>
      apiFetch(
        `/contabilidad/bancos/${detalleId}/movimientos/${movimiento.publicId}/desconciliar`,
        { method: "PATCH" },
      ),
    onSuccess: () => {
      toast.success("Movimiento desconciliado.");
      void queryClient.invalidateQueries({ queryKey: ["banco-movimientos"] });
      void queryClient.invalidateQueries({ queryKey: ["banco-conciliacion"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const alternarRegla = useMutation({    mutationFn: (regla: Regla) =>
      apiFetch(`/contabilidad/reglas-conciliacion/activo/${regla.publicId}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Regla actualizada.");
      void queryClient.invalidateQueries({ queryKey: ["reglas-conciliacion"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const totales = useMemo(() => {
    const lista = movimientos.data ?? [];
    return {
      cargos: lista.reduce((suma, item) => suma + numero(item.cargo), 0),
      abonos: lista.reduce((suma, item) => suma + numero(item.abono), 0),
      conciliados: lista.filter((item) => item.conciliado).length,
    };
  }, [movimientos.data]);

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Bancos" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/bancos."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Bancos"
        descripcion="Cuentas bancarias, movimientos y conciliación contable."
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => {
                setEditando(null);
                setBancoAbierto(true);
              }}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Nuevo banco
            </Button>
          ) : null
        }
      />

      {bancos.isPending ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, indice) => (
            <Skeleton key={indice} className="h-36 rounded-lg" />
          ))}
        </div>
      ) : bancos.error ? (
        <ErrorState error={bancos.error} onReintentar={() => void bancos.refetch()} />
      ) : (bancos.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={Landmark}
            titulo="Todavía no hay cuentas bancarias"
            descripcion="Registra la primera cuenta para conciliar movimientos."
          />
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(bancos.data ?? []).map((banco) => (
            <Card key={banco.publicId}>
              <CardContent className="pt-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{banco.nombre}</p>
                    <p className="text-xs text-muted-foreground">{banco.banco}</p>
                  </div>
                  <EstadoBadge activo={banco.activo} />
                </div>
                <p className="mt-2 font-mono text-xs text-muted-foreground">
                  {banco.clabe ?? banco.numeroCuenta ?? "Sin CLABE"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {banco.cuentaContable
                    ? `${banco.cuentaContable.codigo} · ${banco.cuentaContable.nombre}`
                    : "Sin cuenta contable"}
                </p>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="tabular text-sm font-medium">
                    {moneda(banco.saldoInicial)}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setDetalleId(banco.publicId)}
                  >
                    Abrir
                  </Button>
                </div>
                {puedeEditar && (
                  <Button
                    variant="ghost"
                    size="xs"
                    className="mt-1 cursor-pointer"
                    onClick={() => {
                      setEditando(banco);
                      setBancoAbierto(true);
                    }}
                  >
                    Editar datos
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Sheet open={bancoAbierto} onOpenChange={setBancoAbierto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {editando ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}
            </SheetTitle>
            <SheetDescription>
              La cuenta contable predeterminada es 1102 Bancos.
            </SheetDescription>
          </SheetHeader>
          <FormularioBanco
            key={editando?.publicId ?? "nuevo"}
            banco={editando}
            cuentas={cuentas.data ?? []}
            onCancelar={() => setBancoAbierto(false)}
            onGuardado={() => {
              setBancoAbierto(false);
              void queryClient.invalidateQueries({ queryKey: ["bancos"] });
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
          className="flex w-full flex-col gap-0 p-0 sm:max-w-3xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {detalle?.nombre ?? "Cuenta bancaria"}
            </SheetTitle>
            <SheetDescription>
              {detalle?.banco ?? ""} · {detalle?.clabe ?? detalle?.numeroCuenta ?? ""}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="desdeBanco" className="text-xs">Desde</Label>
                <Input
                  id="desdeBanco"
                  type="date"
                  className="h-8"
                  value={desde}
                  max={hasta}
                  onChange={(evento) => setDesde(evento.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="hastaBanco" className="text-xs">Hasta</Label>
                <Input
                  id="hastaBanco"
                  type="date"
                  className="h-8"
                  value={hasta}
                  min={desde}
                  onChange={(evento) => setHasta(evento.target.value)}
                />
              </div>
              {puedeEditar && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setMovimientoAbierto(true)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Movimiento
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => inputImportar.current?.click()}
                    disabled={importar.isPending}
                  >
                    {importar.isPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Upload className="size-3.5" aria-hidden="true" />
                    )}
                    Importar
                  </Button>
                  <input
                    ref={inputImportar}
                    type="file"
                    accept=".csv,.ofx,text/csv"
                    className="sr-only"
                    onChange={(evento) => {
                      const archivo = evento.target.files?.[0];
                      if (archivo) importar.mutate(archivo);
                      evento.target.value = "";
                    }}
                  />
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => conciliarAutomatico.mutate()}
                    disabled={conciliarAutomatico.isPending}
                  >
                    {conciliarAutomatico.isPending ? (
                      <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <RefreshCw className="size-3.5" aria-hidden="true" />
                    )}
                    Conciliar automático
                  </Button>
                </>
              )}
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <Resumen etiqueta="Saldo contable" valor={conciliacion.data?.saldoContable ?? 0} />
              <Resumen etiqueta="Saldo banco" valor={conciliacion.data?.saldoBanco ?? 0} />
              <Resumen
                etiqueta="Diferencia"
                valor={conciliacion.data?.diferencia ?? 0}
                alerta={Math.abs(numero(conciliacion.data?.diferencia)) > 0.009}
              />
            </div>

            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Cargos: <strong className="tabular">{moneda(totales.cargos)}</strong></span>
              <span>Abonos: <strong className="tabular">{moneda(totales.abonos)}</strong></span>
              <span>Conciliados: <strong>{totales.conciliados}</strong> de {(movimientos.data ?? []).length}</span>
            </div>

            <section>
              <h3 className="mb-2 text-sm font-semibold">Movimientos</h3>
              {movimientos.isPending ? (
                <Skeleton className="h-40 w-full rounded-md" />
              ) : movimientos.error ? (
                <ErrorState error={movimientos.error} onReintentar={() => void movimientos.refetch()} />
              ) : (movimientos.data ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Sin movimientos en el periodo.
                </p>
              ) : (
                <div className="overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Fecha</th>
                        <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Descripción</th>
                        <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Cargo</th>
                        <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Abono</th>
                        <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Póliza</th>
                        <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Conciliado</th>
                        <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(movimientos.data ?? []).map((movimiento) => (
                        <tr key={movimiento.publicId} className="border-t border-border">
                          <td className="px-2 py-1.5">{fechaCorta(movimiento.fecha)}</td>
                          <td className="px-2 py-1.5">
                            <p className="truncate">{movimiento.descripcion}</p>
                            <p className="font-mono text-[10px] text-muted-foreground">
                              {movimiento.referencia ?? ""}
                            </p>
                          </td>
                          <td className="tabular px-2 py-1.5 text-right">
                            {numero(movimiento.cargo) ? moneda(movimiento.cargo) : "—"}
                          </td>
                          <td className="tabular px-2 py-1.5 text-right">
                            {numero(movimiento.abono) ? moneda(movimiento.abono) : "—"}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-xs">
                            {movimiento.polizaFolio ?? "—"}
                          </td>
                          <td className="px-2 py-1.5">
                            {movimiento.conciliado ? (
                              <EstadoBadge activo />
                            ) : (
                              <EstadoBadge estado="pendiente" />
                            )}
                          </td>
                          <td className="px-2 py-1.5 text-right">
                            {movimiento.conciliado && puedeEditar ? (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="cursor-pointer"
                                disabled={desconciliar.isPending}
                                onClick={() => desconciliar.mutate(movimiento)}
                              >
                                <Unlink className="size-3.5" aria-hidden="true" />
                                Desconciliar
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section>
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Reglas de conciliación</h3>
                {puedeEditar && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setReglaAbierta(true)}
                  >
                    <Plus className="size-3.5" aria-hidden="true" />
                    Nueva regla
                  </Button>
                )}
              </div>
              {reglas.isPending ? (
                <Skeleton className="h-24 w-full rounded-md" />
              ) : (reglas.data ?? []).length === 0 ? (
                <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                  Sin reglas para esta cuenta. Se usará la conciliación por monto y fecha.
                </p>
              ) : (
                <div className="divide-y divide-border rounded-md border border-border">
                  {(reglas.data ?? []).map((regla) => (
                    <div key={regla.publicId} className="flex items-center gap-2 px-2.5 py-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{regla.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          Prioridad {regla.prioridad} · {regla.tipoMovimiento} · ref{" "}
                          {regla.referenciaContiene ?? "—"} · desc{" "}
                          {regla.descripcionContiene ?? "—"}
                        </p>
                      </div>
                      <EstadoBadge activo={regla.activo} />
                      {puedeEditar && (
                        <Button
                          variant="ghost"
                          size="xs"
                          className="cursor-pointer"
                          disabled={alternarRegla.isPending}
                          onClick={() => alternarRegla.mutate(regla)}
                        >
                          {regla.activo ? "Desactivar" : "Activar"}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={movimientoAbierto} onOpenChange={setMovimientoAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar movimiento bancario</DialogTitle>
            <DialogDescription>
              Cargo = entrada de efectivo; abono = salida.
            </DialogDescription>
          </DialogHeader>
          <FormularioMovimiento
            enviando={crearMovimiento.isPending}
            onCancelar={() => setMovimientoAbierto(false)}
            onGuardar={(datos) => crearMovimiento.mutate(datos)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={reglaAbierta} onOpenChange={setReglaAbierta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva regla de conciliación</DialogTitle>
            <DialogDescription>
              Se evalúan por prioridad ascendente. Sin regla se usa monto exacto.
            </DialogDescription>
          </DialogHeader>
          <FormularioRegla
            cuentaBancariaId={detalleId ?? ""}
            onCancelar={() => setReglaAbierta(false)}
            onGuardado={() => {
              setReglaAbierta(false);
              void queryClient.invalidateQueries({ queryKey: ["reglas-conciliacion"] });
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Resumen({
  etiqueta,
  valor,
  alerta,
}: {
  etiqueta: string;
  valor: number;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{etiqueta}</p>
      <p className={alerta ? "tabular text-lg font-semibold text-destructive" : "tabular text-lg font-semibold"}>
        {moneda(valor)}
      </p>
    </div>
  );
}

function FormularioBanco({
  banco,
  cuentas,
  onGuardado,
  onCancelar,
}: {
  banco: Banco | null;
  cuentas: CuentaContable[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState(banco?.nombre ?? "");
  const [institucion, setInstitucion] = useState(banco?.banco ?? "");
  const [numeroCuenta, setNumeroCuenta] = useState(banco?.numeroCuenta ?? "");
  const [clabe, setClabe] = useState(banco?.clabe ?? "");
  const [monedaCodigo, setMonedaCodigo] = useState(banco?.moneda ?? "MXN");
  const [saldoInicial, setSaldoInicial] = useState(
    banco ? String(numero(banco.saldoInicial)) : "0",
  );
  const [cuentaContableId, setCuentaContableId] = useState(
    banco?.cuentaContable?.publicId ?? "",
  );
  const [activo, setActivo] = useState(banco?.activo ?? true);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        nombre: nombre.trim(),
        banco: institucion.trim(),
        moneda: monedaCodigo,
        saldoInicial: Number(saldoInicial || 0),
        activo,
      };
      if (numeroCuenta.trim()) payload.numeroCuenta = numeroCuenta.trim();
      if (clabe.trim()) payload.clabe = clabe.trim();
      if (cuentaContableId) payload.cuentaContableId = cuentaContableId;

      return apiFetch(
        banco ? `/contabilidad/bancos/${banco.publicId}` : "/contabilidad/bancos",
        {
          method: banco ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      toast.success(banco ? "Banco actualizado." : "Banco creado.");
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        setError(null);
        if (!nombre.trim()) return setError("El nombre es obligatorio.");
        if (!institucion.trim()) return setError("El banco es obligatorio.");
        if (clabe && clabe.length !== 18) return setError("La CLABE debe tener 18 dígitos.");
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
        <SeccionFormulario numero={1} titulo="Cuenta">
          <div className="space-y-1.5">
            <Label htmlFor="nombreBanco" className="font-semibold">Nombre</Label>
            <Input id="nombreBanco" className="h-9" value={nombre} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="institucionBanco" className="font-semibold">Banco</Label>
            <Input id="institucionBanco" className="h-9" value={institucion} onChange={(e) => setInstitucion(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="clabeBanco" className="font-semibold">CLABE</Label>
            <Input id="clabeBanco" className="h-9 font-mono" maxLength={18} value={clabe} onChange={(e) => setClabe(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="numeroBanco" className="font-semibold">Número de cuenta</Label>
            <Input id="numeroBanco" className="h-9 font-mono" value={numeroCuenta} onChange={(e) => setNumeroCuenta(e.target.value)} />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Contabilidad">
          <div className="space-y-1.5">
            <Label htmlFor="cuentaBanco" className="font-semibold">Cuenta contable</Label>
            <select
              id="cuentaBanco"
              value={cuentaContableId}
              onChange={(e) => setCuentaContableId(e.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">1102 Bancos (predeterminada)</option>
              {cuentas
                .filter((cuenta) => cuenta.activo && cuenta.permiteMovimientos && cuenta.tipo === "activo")
                .map((cuenta) => (
                  <option key={cuenta.publicId} value={cuenta.publicId}>
                    {cuenta.codigo} · {cuenta.nombre}
                  </option>
                ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <Label htmlFor="monedaBanco" className="font-semibold">Moneda</Label>
              <Input id="monedaBanco" className="h-9" maxLength={3} value={monedaCodigo} onChange={(e) => setMonedaCodigo(e.target.value.toUpperCase())} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="saldoBanco" className="font-semibold">Saldo inicial</Label>
              <Input id="saldoBanco" type="number" step="0.01" className="h-9" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 cursor-pointer accent-[var(--primary)]" />
            Cuenta activa
          </label>
        </SeccionFormulario>
      </div>
      <div className="flex justify-end gap-2 border-t border-border px-4 py-3">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onCancelar} disabled={mutation.isPending}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {banco ? "Guardar banco" : "Crear banco"}
        </Button>
      </div>
    </form>
  );
}

function FormularioMovimiento({
  enviando,
  onGuardar,
  onCancelar,
}: {
  enviando: boolean;
  onGuardar: (datos: Record<string, unknown>) => void;
  onCancelar: () => void;
}) {
  const [fecha, setFecha] = useState(fechaISO(new Date()));
  const [descripcion, setDescripcion] = useState("");
  const [referencia, setReferencia] = useState("");
  const [tipo, setTipo] = useState("cargo");
  const [monto, setMonto] = useState("");
  const [saldo, setSaldo] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        setError(null);
        if (!descripcion.trim()) return setError("La descripción es obligatoria.");
        if (!descripcion.trim() || Number(monto) <= 0) return setError("El monto debe ser mayor a 0.");
        onGuardar({
          fecha,
          descripcion: descripcion.trim(),
          ...(referencia.trim() ? { referencia: referencia.trim() } : {}),
          cargo: tipo === "cargo" ? Number(monto) : 0,
          abono: tipo === "abono" ? Number(monto) : 0,
          ...(saldo.trim() ? { saldo: Number(saldo) } : {}),
        });
      }}
      className="space-y-3"
      noValidate
    >
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="fechaMov" className="font-semibold">Fecha</Label>
          <Input id="fechaMov" type="date" className="h-9" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipoMov" className="font-semibold">Tipo</Label>
          <select id="tipoMov" value={tipo} onChange={(e) => setTipo(e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="cargo">Cargo (entrada)</option>
            <option value="abono">Abono (salida)</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descMov" className="font-semibold">Descripción</Label>
        <Input id="descMov" className="h-9" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="montoMov" className="font-semibold">Monto</Label>
          <Input id="montoMov" type="number" step="0.01" min={0} className="h-9" value={monto} onChange={(e) => setMonto(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="saldoMov" className="font-semibold">Saldo (opcional)</Label>
          <Input id="saldoMov" type="number" step="0.01" className="h-9" value={saldo} onChange={(e) => setSaldo(e.target.value)} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refMov" className="font-semibold">Referencia</Label>
        <Input id="refMov" className="h-9" value={referencia} onChange={(e) => setReferencia(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={enviando}>
          {enviando && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          Guardar movimiento
        </Button>
      </div>
    </form>
  );
}

function FormularioRegla({
  cuentaBancariaId,
  onGuardado,
  onCancelar,
}: {
  cuentaBancariaId: string;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [nombre, setNombre] = useState("");
  const [prioridad, setPrioridad] = useState("1");
  const [tipoMovimiento, setTipoMovimiento] = useState("ambos");
  const [referenciaContiene, setReferenciaContiene] = useState("");
  const [descripcionContiene, setDescripcionContiene] = useState("");
  const [toleranciaMonto, setToleranciaMonto] = useState("0");
  const [toleranciaDias, setToleranciaDias] = useState("3");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/contabilidad/reglas-conciliacion", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          ...(cuentaBancariaId ? { cuentaBancariaId } : {}),
          prioridad: Number(prioridad || 1),
          tipoMovimiento,
          ...(referenciaContiene.trim() ? { referenciaContiene: referenciaContiene.trim() } : {}),
          ...(descripcionContiene.trim() ? { descripcionContiene: descripcionContiene.trim() } : {}),
          toleranciaMonto: Number(toleranciaMonto || 0),
          toleranciaDias: Number(toleranciaDias || 0),
        }),
      }),
    onSuccess: () => {
      toast.success("Regla creada.");
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!nombre.trim()) {
          toast.error("El nombre es obligatorio.");
          return;
        }
        mutation.mutate();
      }}
      className="space-y-3"
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="nombreRegla" className="font-semibold">Nombre</Label>
        <Input id="nombreRegla" className="h-9" value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="prioridadRegla" className="font-semibold">Prioridad</Label>
          <Input id="prioridadRegla" type="number" min={1} className="h-9" value={prioridad} onChange={(e) => setPrioridad(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tipoRegla" className="font-semibold">Tipo</Label>
          <select id="tipoRegla" value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <option value="ambos">Ambos</option>
            <option value="cargo">Cargo</option>
            <option value="abono">Abono</option>
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="refRegla" className="font-semibold">Referencia contiene</Label>
        <Input id="refRegla" className="h-9" value={referenciaContiene} onChange={(e) => setReferenciaContiene(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="descRegla" className="font-semibold">Descripción contiene</Label>
        <Input id="descRegla" className="h-9" value={descripcionContiene} onChange={(e) => setDescripcionContiene(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="tolMonto" className="font-semibold">Tolerancia monto</Label>
          <Input id="tolMonto" type="number" step="0.01" className="h-9" value={toleranciaMonto} onChange={(e) => setToleranciaMonto(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tolDias" className="font-semibold">Tolerancia días</Label>
          <Input id="tolDias" type="number" className="h-9" value={toleranciaDias} onChange={(e) => setToleranciaDias(e.target.value)} />
        </div>
      </div>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" className="cursor-pointer" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
          Crear regla
        </Button>
      </div>
    </form>
  );
}
