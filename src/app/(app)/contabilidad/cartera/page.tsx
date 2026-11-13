"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { LoaderCircle, RefreshCw, Wallet } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaISO, moneda, numero } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

type Resumen = {
  cxc: { total: number; vencido: number; registros: number };
  cxp: { total: number; vencido: number; registros: number };
};

type Aging = {
  fechaCorte: string;
  cxc: { total: number; buckets: { rango: string; monto: number; registros: number }[] };
  cxp: { total: number; buckets: { rango: string; monto: number; registros: number }[] };
};

export default function CarteraResumenPage() {
  const { puede } = useAuth();
  const puedeVer = puede("/contabilidad/cartera", "ver");
  const puedeEditar = puede("/contabilidad/cartera", "editar");

  const [fechaCorte, setFechaCorte] = useState(() => fechaISO(new Date()));
  const [backfillAbierto, setBackfillAbierto] = useState(false);

  const resumen = useQuery<Resumen>({
    queryKey: ["cartera-resumen"],
    queryFn: () => apiFetch<Resumen>("/contabilidad/cartera/resumen"),
    enabled: puedeVer,
  });

  const aging = useQuery<Aging>({
    queryKey: ["cartera-aging", fechaCorte],
    queryFn: () =>
      apiFetch<Aging>(
        `/contabilidad/cartera/aging?fechaCorte=${fechaCorte}`,
      ),
    enabled: puedeVer,
  });

  const backfill = useMutation({
    mutationFn: () =>
      apiFetch("/contabilidad/cartera/backfill", {
        method: "POST",
        body: JSON.stringify({ crearPeriodos: true }),
      }),
    onSuccess: () => {
      toast.success("Cartera reconstruida. Revisa los registros generados.");
      setBackfillAbierto(false);
      void resumen.refetch();
      void aging.refetch();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Cartera" />
        <EmptyState
          icono={Wallet}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/cartera."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Cartera"
        descripcion="Resumen y antigüedad de saldos de cuentas por cobrar y por pagar."
        acciones={
          puedeEditar ? (
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setBackfillAbierto(true)}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Reconstruir cartera
            </Button>
          ) : null
        }
      />

      {resumen.isPending ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, indice) => (
            <Skeleton key={indice} className="h-[92px] rounded-lg" />
          ))}
        </div>
      ) : resumen.error ? (
        <ErrorState error={resumen.error} onReintentar={() => void resumen.refetch()} />
      ) : (
        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <TarjetaCartera
            titulo="CxC pendiente"
            valor={resumen.data?.cxc.total ?? 0}
            detalle={`${resumen.data?.cxc.registros ?? 0} registros`}
          />
          <TarjetaCartera
            titulo="CxC vencida"
            valor={resumen.data?.cxc.vencido ?? 0}
            detalle="Saldo con vencimiento pasado"
            alerta
          />
          <TarjetaCartera
            titulo="CxP pendiente"
            valor={resumen.data?.cxp.total ?? 0}
            detalle={`${resumen.data?.cxp.registros ?? 0} registros`}
          />
          <TarjetaCartera
            titulo="CxP vencida"
            valor={resumen.data?.cxp.vencido ?? 0}
            detalle="Saldo con vencimiento pasado"
            alerta
          />
        </section>
      )}

      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="text-base">Antigüedad de saldos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="fechaCorte" className="text-xs">Fecha de corte</Label>
              <Input
                id="fechaCorte"
                type="date"
                className="h-8"
                value={fechaCorte}
                onChange={(evento) => setFechaCorte(evento.target.value)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Solo se consideran cuentas pendientes o parciales con saldo.
            </p>
          </div>

          {aging.isPending ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <Skeleton className="h-48 rounded-lg" />
              <Skeleton className="h-48 rounded-lg" />
            </div>
          ) : aging.error ? (
            <ErrorState error={aging.error} onReintentar={() => void aging.refetch()} />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              <TablaAging titulo="Cuentas por cobrar" data={aging.data?.cxc} />
              <TablaAging titulo="Cuentas por pagar" data={aging.data?.cxp} />
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={backfillAbierto} onOpenChange={setBackfillAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reconstruir cartera</DialogTitle>
            <DialogDescription>
              Recorre ventas y compras sin CxC/CxP, genera su cartera y póliza,
              y crea los periodos contables faltantes. Es idempotente.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              className="cursor-pointer"
              onClick={() => setBackfillAbierto(false)}
            >
              Cancelar
            </Button>
            <Button
              className="cursor-pointer"
              disabled={backfill.isPending}
              onClick={() => backfill.mutate()}
            >
              {backfill.isPending && (
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              )}
              Ejecutar reconstrucción
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TarjetaCartera({
  titulo,
  valor,
  detalle,
  alerta,
}: {
  titulo: string;
  valor: number;
  detalle: string;
  alerta?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        <p
          className={
            alerta && numero(valor) > 0
              ? "tabular mt-1 text-2xl font-semibold text-destructive"
              : "tabular mt-1 text-2xl font-semibold"
          }
        >
          {moneda(valor)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{detalle}</p>
      </CardContent>
    </Card>
  );
}

function TablaAging({
  titulo,
  data,
}: {
  titulo: string;
  data?: { total: number; buckets: { rango: string; monto: number; registros: number }[] };
}) {
  const buckets = data?.buckets ?? [];
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{titulo}</p>
        <p className="tabular text-sm font-medium">{moneda(data?.total ?? 0)}</p>
      </div>
      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Rango</th>
              <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Monto</th>
              <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Registros</th>
            </tr>
          </thead>
          <tbody>
            {buckets.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-2 py-4 text-center text-xs text-muted-foreground">
                  Sin saldos.
                </td>
              </tr>
            ) : (
              buckets.map((bucket) => (
                <tr key={bucket.rango} className="border-t border-border">
                  <td className="px-2 py-1.5 capitalize">{bucket.rango}</td>
                  <td className="tabular px-2 py-1.5 text-right">
                    {moneda(bucket.monto)}
                  </td>
                  <td className="tabular px-2 py-1.5 text-right">
                    {bucket.registros}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
