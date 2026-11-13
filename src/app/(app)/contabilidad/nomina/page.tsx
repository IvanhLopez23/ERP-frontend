"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Eye, LoaderCircle, Plus, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, moneda, texto } from "@/lib/format";
import {
  MESES,
  periodoTexto,
  type Nomina,
  type NominaPreview,
} from "@/lib/types/contabilidad";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function ultimoDia(anio: number, mes: number) {
  return fechaISO(new Date(anio, mes, 0));
}

export default function NominaContablePage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/contabilidad/nomina", "ver");
  const puedeCrear = puede("/contabilidad/nomina", "crear");

  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [anioLista, setAnioLista] = useState(hoy.getFullYear());

  const [contabilizarAbierto, setContabilizarAbierto] = useState(false);
  const [detalle, setDetalle] = useState<Nomina | null>(null);

  const preview = useQuery<NominaPreview>({
    queryKey: ["nomina-preview", anio, mes],
    queryFn: () =>
      apiFetch<NominaPreview>(
        `/contabilidad/nomina/preview?anio=${anio}&mes=${mes}`,
      ),
    enabled: puedeVer,
  });

  const nominas = useQuery<Nomina[]>({
    queryKey: ["nominas", anioLista],
    queryFn: () =>
      apiFetch<Nomina[]>(`/contabilidad/nomina?anio=${anioLista}`),
    enabled: puedeVer,
  });

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Nómina contable" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/nomina."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Nómina contable"
        descripcion="Previsualiza la nómina del periodo y contabilízala con su póliza."
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setContabilizarAbierto(true)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Contabilizar nómina
            </Button>
          ) : null
        }
      />

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Previsualización del periodo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label htmlFor="anioNomina" className="text-xs">Año</Label>
              <Input
                id="anioNomina"
                type="number"
                min={2000}
                max={2100}
                className="h-8 w-24"
                value={anio}
                onChange={(evento) => setAnio(Number(evento.target.value))}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="mesNomina" className="text-xs">Mes</Label>
              <select
                id="mesNomina"
                value={mes}
                onChange={(evento) => setMes(Number(evento.target.value))}
                className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {MESES.map((nombre, indice) => (
                  <option key={nombre} value={indice + 1}>
                    {nombre}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground sm:ml-auto">
              {periodoTexto(anio, mes)}
            </p>
          </div>

          {preview.isPending ? (
            <Skeleton className="h-40 w-full rounded-md" />
          ) : preview.error ? (
            <ErrorState error={preview.error} onReintentar={() => void preview.refetch()} />
          ) : (preview.data?.empleados ?? []).length === 0 ? (
            <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
              No hay empleados activos con salario para este periodo.
            </p>
          ) : (
            <>
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Empleado</th>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Centro</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Percepciones</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">ISR</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">IMSS</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Neto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(preview.data?.empleados ?? []).map((empleado) => (
                      <tr key={empleado.publicId} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          <span className="font-mono text-xs text-muted-foreground">
                            {empleado.codigo}
                          </span>{" "}
                          {empleado.nombre}
                        </td>
                        <td className="px-2 py-1.5">{empleado.centroCosto ?? "Sin centro"}</td>
                        <td className="tabular px-2 py-1.5 text-right">
                          {moneda(empleado.percepciones)}
                        </td>
                        <td className="tabular px-2 py-1.5 text-right">
                          {moneda(empleado.isr)}
                        </td>
                        <td className="tabular px-2 py-1.5 text-right">
                          {moneda(empleado.imss)}
                        </td>
                        <td className="tabular px-2 py-1.5 text-right font-medium">
                          {moneda(empleado.neto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-border bg-muted/30">
                    <tr>
                      <td className="px-2 py-1.5 text-xs font-semibold" colSpan={2}>
                        Totales
                      </td>
                      <td className="tabular px-2 py-1.5 text-right font-semibold">
                        {moneda(preview.data?.totales.percepciones ?? 0)}
                      </td>
                      <td className="tabular px-2 py-1.5 text-right font-semibold">
                        {moneda(preview.data?.totales.isr ?? 0)}
                      </td>
                      <td className="tabular px-2 py-1.5 text-right font-semibold">
                        {moneda(preview.data?.totales.imss ?? 0)}
                      </td>
                      <td className="tabular px-2 py-1.5 text-right font-semibold">
                        {moneda(preview.data?.totales.neto ?? 0)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
              {puedeCrear && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => setContabilizarAbierto(true)}
                  >
                    <Banknote className="size-3.5" aria-hidden="true" />
                    Contabilizar {periodoTexto(anio, mes)}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-semibold">Nóminas contabilizadas</h2>
        <div className="flex items-center gap-1.5">
          <Label htmlFor="anioLista" className="text-xs text-muted-foreground">Año</Label>
          <Input
            id="anioLista"
            type="number"
            min={2000}
            max={2100}
            className="h-8 w-24"
            value={anioLista}
            onChange={(evento) => setAnioLista(Number(evento.target.value))}
          />
        </div>
      </div>

      {nominas.isPending ? (
        <Skeleton className="h-32 w-full rounded-lg" />
      ) : nominas.error ? (
        <ErrorState error={nominas.error} onReintentar={() => void nominas.refetch()} />
      ) : (nominas.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={Banknote}
            titulo="Sin nóminas en el año"
            descripcion="Contabiliza la nómina de un periodo para verla aquí."
          />
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left text-xs text-muted-foreground">Periodo</th>
                <th className="px-3 py-2 text-left text-xs text-muted-foreground">Fecha</th>
                <th className="px-3 py-2 text-right text-xs text-muted-foreground">Percepciones</th>
                <th className="px-3 py-2 text-right text-xs text-muted-foreground">Neto</th>
                <th className="px-3 py-2 text-left text-xs text-muted-foreground">Póliza</th>
                <th className="px-3 py-2 text-left text-xs text-muted-foreground">Estatus</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {(nominas.data ?? []).map((nomina) => (
                <tr key={nomina.publicId} className="border-t border-border">
                  <td className="px-3 py-1.5 font-medium">
                    {periodoTexto(nomina.anio, nomina.mes)}
                  </td>
                  <td className="px-3 py-1.5">{fechaCorta(nomina.fecha)}</td>
                  <td className="tabular px-3 py-1.5 text-right">
                    {moneda(nomina.totalPercepciones)}
                  </td>
                  <td className="tabular px-3 py-1.5 text-right">
                    {moneda(nomina.totalNeto)}
                  </td>
                  <td className="px-3 py-1.5 font-mono text-xs">
                    {texto(nomina.poliza?.folio)}
                  </td>
                  <td className="px-3 py-1.5">
                    <EstadoBadge estado={nomina.estatus} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="cursor-pointer"
                      aria-label={`Ver nómina ${periodoTexto(nomina.anio, nomina.mes)}`}
                      onClick={() => setDetalle(nomina)}
                    >
                      <Eye className="size-3.5" aria-hidden="true" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog
        open={contabilizarAbierto}
        onOpenChange={(abierto) => {
          if (!abierto) setContabilizarAbierto(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Contabilizar nómina</DialogTitle>
            <DialogDescription>
              Se generará la póliza del periodo. Solo puede existir una nómina por mes.
            </DialogDescription>
          </DialogHeader>
          <FormularioContabilizar
            anio={anio}
            mes={mes}
            onCancelar={() => setContabilizarAbierto(false)}
            onGuardado={() => {
              setContabilizarAbierto(false);
              void nominas.refetch();
              void preview.refetch();
              void queryClient.invalidateQueries({ queryKey: ["nominas"] });
            }}
          />
        </DialogContent>
      </Dialog>

      <Sheet
        open={Boolean(detalle)}
        onOpenChange={(abierto) => {
          if (!abierto) setDetalle(null);
        }}
      >
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              Nómina {detalle ? periodoTexto(detalle.anio, detalle.mes) : ""}
            </SheetTitle>
            <SheetDescription>
              Póliza {detalle?.poliza?.folio ?? "—"} · {detalle?.estatus}
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {detalle && <DetalleNomina nomina={detalle} />}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormularioContabilizar({
  anio,
  mes,
  onGuardado,
  onCancelar,
}: {
  anio: number;
  mes: number;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [fecha, setFecha] = useState(() => ultimoDia(anio, mes));
  const [imssPatronal, setImssPatronal] = useState("0");
  const [provisionPrestaciones, setProvisionPrestaciones] = useState("0");

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/contabilidad/nomina", {
        method: "POST",
        body: JSON.stringify({
          anio,
          mes,
          fecha,
          imssPatronal: Number(imssPatronal || 0),
          provisionPrestaciones: Number(provisionPrestaciones || 0),
        }),
      }),
    onSuccess: () => {
      toast.success("Nómina contabilizada correctamente.");
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        mutation.mutate();
      }}
      className="space-y-3"
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="fechaNomina" className="font-semibold">
          Fecha de pago/provisión
        </Label>
        <Input
          id="fechaNomina"
          type="date"
          className="h-9"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="imssPatronal" className="font-semibold">
            IMSS patronal
          </Label>
          <Input
            id="imssPatronal"
            type="number"
            min={0}
            step="0.01"
            className="h-9"
            value={imssPatronal}
            onChange={(evento) => setImssPatronal(evento.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="provisionPrestaciones" className="font-semibold">
            Provisión prestaciones
          </Label>
          <Input
            id="provisionPrestaciones"
            type="number"
            min={0}
            step="0.01"
            className="h-9"
            value={provisionPrestaciones}
            onChange={(evento) => setProvisionPrestaciones(evento.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Se usarán todos los empleados activos con salario. El periodo debe estar abierto.
      </p>
      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          className="cursor-pointer"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button type="submit" className="cursor-pointer" disabled={mutation.isPending}>
          {mutation.isPending && (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          )}
          Contabilizar
        </Button>
      </div>
    </form>
  );
}

function DetalleNomina({ nomina }: { nomina: Nomina }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Total etiqueta="Percepciones" valor={nomina.totalPercepciones} />
        <Total etiqueta="ISR" valor={nomina.totalIsr} />
        <Total etiqueta="IMSS" valor={nomina.totalImss} />
        <Total etiqueta="Otras deducciones" valor={nomina.totalOtrasDeducciones} />
        <Total etiqueta="IMSS patronal" valor={nomina.imssPatronal} />
        <Total etiqueta="Provisión prestaciones" valor={nomina.provisionPrestaciones} />
        <Total etiqueta="Neto pagado" valor={nomina.totalNeto} destacado />
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Empleados</p>
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Empleado</th>
                <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Centro</th>
                <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Neto</th>
              </tr>
            </thead>
            <tbody>
              {(nomina.detalles ?? []).map((item) => (
                <tr key={item.publicId} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.codigo}
                    </span>{" "}
                    {item.nombre}
                  </td>
                  <td className="px-2 py-1.5">{item.centroCosto ?? "Sin centro"}</td>
                  <td className="tabular px-2 py-1.5 text-right">{moneda(item.neto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <p className="mb-2 text-sm font-semibold">Por centro de costo</p>
        <div className="overflow-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Centro</th>
                <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Empleados</th>
                <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Percepciones</th>
                <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Neto</th>
              </tr>
            </thead>
            <tbody>
              {(nomina.porCentro ?? []).map((centro, indice) => (
                <tr key={centro.codigo ?? indice} className="border-t border-border">
                  <td className="px-2 py-1.5">
                    {centro.codigo ? `${centro.codigo} · ` : ""}
                    {centro.nombre ?? "Sin centro"}
                  </td>
                  <td className="tabular px-2 py-1.5 text-right">{centro.empleados}</td>
                  <td className="tabular px-2 py-1.5 text-right">
                    {moneda(centro.percepciones)}
                  </td>
                  <td className="tabular px-2 py-1.5 text-right">
                    {moneda(centro.neto)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Total({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{etiqueta}</p>
      <p className={destacado ? "tabular text-base font-semibold" : "tabular"}>
        {moneda(valor)}
      </p>
    </div>
  );
}
