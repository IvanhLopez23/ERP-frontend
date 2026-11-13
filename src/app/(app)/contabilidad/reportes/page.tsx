"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download,
  LoaderCircle,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import {
  apiBlob,
  apiFetch,
  mensajeDeError,
} from "@/lib/api-client";
import {
  descargarArchivo,
  fechaCorta,
  fechaISO,
  moneda,
  numero,
  texto,
} from "@/lib/format";
import {
  MESES,
  periodoTexto,
  type CentroCosto,
  type CuentaContable,
  type PeriodoContable,
} from "@/lib/types/contabilidad";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
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

const REPORTES = [
  { valor: "balanza", etiqueta: "Balanza de comprobación" },
  { valor: "estado", etiqueta: "Estado de resultados" },
  { valor: "balance", etiqueta: "Balance general" },
  { valor: "mayor", etiqueta: "Mayor por cuenta" },
  { valor: "iva", etiqueta: "IVA del periodo" },
  { valor: "iva-mensual", etiqueta: "IVA mensual" },
  { valor: "centros", etiqueta: "Centros de costo" },
  { valor: "presupuesto", etiqueta: "Presupuesto vs real" },
  { valor: "aux-clientes", etiqueta: "Auxiliar de clientes" },
  { valor: "aux-proveedores", etiqueta: "Auxiliar de proveedores" },
];

const RUTAS: Record<string, string> = {
  balanza: "balanza",
  estado: "estado-resultados",
  balance: "balance-general",
  mayor: "mayor",
  iva: "iva",
  "iva-mensual": "iva/mensual",
  centros: "centros-costo",
  presupuesto: "presupuesto-centros-costo",
  "aux-clientes": "auxiliar-clientes",
  "aux-proveedores": "auxiliar-proveedores",
};

const CLAVES_EXPORTACION: Record<string, string> = {
  balanza: "balanza",
  estado: "estado-resultados",
  balance: "balance-general",
  mayor: "mayor",
  iva: "iva",
  "iva-mensual": "iva-mensual",
  "aux-clientes": "auxiliar-clientes",
  "aux-proveedores": "auxiliar-proveedores",
};

type CuentaReporte = {
  codigo?: string;
  nombre?: string;
  tipo?: string;
  naturaleza?: string;
  debe?: number;
  haber?: number;
  saldo?: number;
  saldoDeudor?: number;
  saldoAcreedor?: number;
};

type DeclaracionIva = {
  publicId: string;
  anio: number;
  mes: number;
  fecha: string;
  estatus: string;
  trasladado: number;
  acreditable: number;
  neto: number;
  porPagar: number;
  saldoFavor: number;
  poliza?: { folio?: string } | null;
};

export default function ReportesContablesPage() {
  const { puede } = useAuth();

  const puedeVer = puede("/contabilidad/reportes", "ver");
  const puedeDeclarar = puede("/contabilidad/reportes", "editar");

  const hoy = new Date();
  const [reporte, setReporte] = useState("balanza");
  const [periodoId, setPeriodoId] = useState("");
  const [desde, setDesde] = useState(
    fechaISO(new Date(hoy.getFullYear(), hoy.getMonth(), 1)),
  );
  const [hasta, setHasta] = useState(fechaISO(hoy));
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [cuentaId, setCuentaId] = useState("");
  const [auxId, setAuxId] = useState("");
  const [tipoCentro, setTipoCentro] = useState("");
  const [exportando, setExportando] = useState<string | null>(null);
  const [declararAbierto, setDeclararAbierto] = useState(false);

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

  const terceros = useQuery<{ publicId: string; nombre?: string; codigo?: string }[]>({
    queryKey: ["terceros-reportes", reporte],
    queryFn: () =>
      apiFetch(
        reporte === "aux-clientes"
          ? "/ventas/clientes"
          : "/compras/proveedores",
      ),
    enabled:
      puedeVer && (reporte === "aux-clientes" || reporte === "aux-proveedores"),
    staleTime: 5 * 60_000,
  });

  const centros = useQuery<CentroCosto[]>({
    queryKey: ["contabilidad-centros"],
    queryFn: () => apiFetch<CentroCosto[]>("/contabilidad/centros-costo"),
    enabled: puedeVer && (reporte === "centros" || reporte === "presupuesto"),
    staleTime: 5 * 60_000,
  });

  const esMensual = reporte === "iva-mensual" || reporte === "presupuesto";

  function parametros(paraExportar = false) {
    const p = new URLSearchParams();
    if (esMensual) {
      p.set("anio", String(anio));
      if (reporte === "presupuesto" && auxId) p.set("centroCostoId", auxId);
    } else {
      if (periodoId) p.set("periodoId", periodoId);
      else {
        p.set("desde", desde);
        p.set("hasta", hasta);
      }
    }
    if (reporte === "mayor" && cuentaId) p.set("cuentaId", cuentaId);
    if (reporte === "aux-clientes" && auxId) p.set("clienteId", auxId);
    if (reporte === "aux-proveedores" && auxId) p.set("proveedorId", auxId);
    if (reporte === "centros" && tipoCentro) p.set("tipo", tipoCentro);
    if (reporte === "presupuesto" && tipoCentro) p.set("tipo", tipoCentro);
    if (paraExportar) p.set("formato", "xlsx");
    return p;
  }

  const consulta = useQuery<Record<string, unknown>>({
    queryKey: [
      "reporte-contable",
      reporte,
      periodoId,
      desde,
      hasta,
      anio,
      cuentaId,
      auxId,
      tipoCentro,
    ],
    queryFn: () =>
      apiFetch<Record<string, unknown>>(
        `/contabilidad/reportes/${RUTAS[reporte]}?${parametros().toString()}`,
      ),
    enabled:
      puedeVer &&
      (reporte !== "mayor" || Boolean(cuentaId)),
  });

  const declaraciones = useQuery<DeclaracionIva[]>({
    queryKey: ["declaraciones-iva", anio],
    queryFn: () =>
      apiFetch<DeclaracionIva[]>(
        `/contabilidad/impuestos/iva/declaraciones?anio=${anio}`,
      ),
    enabled: puedeVer && reporte === "iva",
  });

  async function exportar() {
    const clave = CLAVES_EXPORTACION[reporte];
    if (!clave) {
      toast.error("Este reporte no tiene exportación.");
      return;
    }
    setExportando("xlsx");
    try {
      const { blob, nombre } = await apiBlob(
        `/contabilidad/reportes/${clave}/exportar?${parametros(true).toString()}`,
      );
      descargarArchivo(blob, nombre ?? `${clave}.xlsx`);
      toast.success("Reporte descargado.");
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setExportando(null);
    }
  }

  const datos = consulta.data;

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Reportes contables" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/reportes."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Reportes contables"
        descripcion="Solo se consideran pólizas contabilizadas. Si no eliges periodo se usa el rango de fechas."
        acciones={
          <Button
            variant="outline"
            size="sm"
            className="cursor-pointer"
            onClick={() => void exportar()}
            disabled={
              exportando !== null ||
              (reporte === "mayor" && !cuentaId) ||
              !CLAVES_EXPORTACION[reporte]
            }
          >
            {exportando ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Download className="size-3.5" aria-hidden="true" />
            )}
            Exportar Excel
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-wrap items-end gap-2 pt-0">
          <div className="space-y-1">
            <Label htmlFor="reporte" className="text-xs">Reporte</Label>
            <select
              id="reporte"
              value={reporte}
              onChange={(evento) => {
                setReporte(evento.target.value);
                setAuxId("");
              }}
              className="h-8 w-56 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {REPORTES.map((item) => (
                <option key={item.valor} value={item.valor}>
                  {item.etiqueta}
                </option>
              ))}
            </select>
          </div>

          {esMensual ? (
            <div className="space-y-1">
              <Label htmlFor="anioReporte" className="text-xs">Año</Label>
              <Input
                id="anioReporte"
                type="number"
                min={2000}
                max={2100}
                className="h-8 w-24"
                value={anio}
                onChange={(evento) => setAnio(Number(evento.target.value))}
              />
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <Label htmlFor="periodoReporte" className="text-xs">Periodo</Label>
                <select
                  id="periodoReporte"
                  value={periodoId}
                  onChange={(evento) => setPeriodoId(evento.target.value)}
                  className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Rango de fechas</option>
                  {(periodos.data ?? []).map((periodo) => (
                    <option key={periodo.publicId} value={periodo.publicId}>
                      {periodoTexto(periodo.anio, periodo.mes)}
                    </option>
                  ))}
                </select>
              </div>
              {!periodoId && (
                <>
                  <div className="space-y-1">
                    <Label htmlFor="desdeReporte" className="text-xs">Desde</Label>
                    <Input
                      id="desdeReporte"
                      type="date"
                      className="h-8 w-36"
                      value={desde}
                      max={hasta}
                      onChange={(evento) => setDesde(evento.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="hastaReporte" className="text-xs">Hasta</Label>
                    <Input
                      id="hastaReporte"
                      type="date"
                      className="h-8 w-36"
                      value={hasta}
                      min={desde}
                      onChange={(evento) => setHasta(evento.target.value)}
                    />
                  </div>
                </>
              )}
            </>
          )}

          {reporte === "mayor" && (
            <div className="space-y-1">
              <Label htmlFor="cuentaReporte" className="text-xs">Cuenta</Label>
              <select
                id="cuentaReporte"
                value={cuentaId}
                onChange={(evento) => setCuentaId(evento.target.value)}
                className="h-8 max-w-64 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecciona cuenta</option>
                {(cuentas.data ?? [])
                  .filter((cuenta) => cuenta.permiteMovimientos)
                  .map((cuenta) => (
                    <option key={cuenta.publicId} value={cuenta.publicId}>
                      {cuenta.codigo} · {cuenta.nombre}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {(reporte === "aux-clientes" || reporte === "aux-proveedores") && (
            <div className="space-y-1">
              <Label htmlFor="auxReporte" className="text-xs">
                {reporte === "aux-clientes" ? "Cliente" : "Proveedor"}
              </Label>
              <select
                id="auxReporte"
                value={auxId}
                onChange={(evento) => setAuxId(evento.target.value)}
                className="h-8 max-w-56 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Resumen general</option>
                {(terceros.data ?? []).map((tercero) => (
                  <option key={tercero.publicId} value={tercero.publicId}>
                    {tercero.nombre ?? tercero.codigo ?? tercero.publicId}
                  </option>
                ))}
              </select>
            </div>
          )}

          {reporte === "presupuesto" && (
            <div className="space-y-1">
              <Label htmlFor="centroReporte" className="text-xs">Centro</Label>
              <select
                id="centroReporte"
                value={auxId}
                onChange={(evento) => setAuxId(evento.target.value)}
                className="h-8 max-w-56 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                {(centros.data ?? []).map((centro) => (
                  <option key={centro.publicId} value={centro.publicId}>
                    {centro.codigo} · {centro.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(reporte === "centros" || reporte === "presupuesto") && (
            <div className="space-y-1">
              <Label htmlFor="tipoCentro" className="text-xs">Tipo</Label>
              <select
                id="tipoCentro"
                value={tipoCentro}
                onChange={(evento) => setTipoCentro(evento.target.value)}
                className="h-8 cursor-pointer rounded-md border border-input bg-background px-2 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Todos</option>
                <option value="centro_costo">Centro de costo</option>
                <option value="area">Área</option>
                <option value="proyecto">Proyecto</option>
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {reporte === "mayor" && !cuentaId ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={ShieldAlert}
            titulo="Selecciona una cuenta"
            descripcion="El reporte de mayor requiere una cuenta contable."
          />
        </div>
      ) : consulta.isPending ? (
        <Skeleton className="h-80 w-full rounded-lg" />
      ) : consulta.error ? (
        <ErrorState
          error={consulta.error}
          onReintentar={() => void consulta.refetch()}
        />
      ) : !datos ? null : reporte === "balanza" ? (
        <ReporteBalanza datos={datos} />
      ) : reporte === "estado" ? (
        <ReporteEstado datos={datos} />
      ) : reporte === "balance" ? (
        <ReporteBalance datos={datos} />
      ) : reporte === "mayor" ? (
        <ReporteMayor datos={datos} />
      ) : reporte === "iva" ? (
        <ReporteIva datos={datos} />
      ) : reporte === "iva-mensual" ? (
        <ReporteIvaMensual datos={datos} />
      ) : reporte === "centros" ? (
        <ReporteCentros datos={datos} />
      ) : reporte === "presupuesto" ? (
        <ReportePresupuesto datos={datos} />
      ) : (
        <ReporteAuxiliar
          datos={datos}
          esClientes={reporte === "aux-clientes"}
        />
      )}

      {reporte === "iva" && (
        <Card className="mt-4">
          <CardContent className="pt-0">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold">Declaraciones de IVA</p>
                <p className="text-xs text-muted-foreground">
                  Complementa el reporte de IVA devengado del periodo.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="anioDeclaraciones" className="text-xs text-muted-foreground">
                  Año
                </Label>
                <Input
                  id="anioDeclaraciones"
                  type="number"
                  min={2000}
                  max={2100}
                  className="h-8 w-24"
                  value={anio}
                  onChange={(evento) => setAnio(Number(evento.target.value))}
                />
                {puedeDeclarar && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={() => setDeclararAbierto(true)}
                  >
                    Declarar IVA
                  </Button>
                )}
              </div>
            </div>

            {declaraciones.isPending ? (
              <Skeleton className="h-24 w-full rounded-md" />
            ) : (declaraciones.data ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-border px-3 py-4 text-center text-sm text-muted-foreground">
                Sin declaraciones para {anio}.
              </p>
            ) : (
              <div className="overflow-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Periodo</th>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Fecha</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Por pagar</th>
                      <th className="px-2 py-1.5 text-right text-xs text-muted-foreground">Saldo a favor</th>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Póliza</th>
                      <th className="px-2 py-1.5 text-left text-xs text-muted-foreground">Estatus</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(declaraciones.data ?? []).map((declaracion) => (
                      <tr key={declaracion.publicId} className="border-t border-border">
                        <td className="px-2 py-1.5">
                          {periodoTexto(declaracion.anio, declaracion.mes)}
                        </td>
                        <td className="px-2 py-1.5">{fechaCorta(declaracion.fecha)}</td>
                        <td className="tabular px-2 py-1.5 text-right">
                          {moneda(declaracion.porPagar)}
                        </td>
                        <td className="tabular px-2 py-1.5 text-right">
                          {moneda(declaracion.saldoFavor)}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-xs">
                          {declaracion.poliza?.folio ?? "—"}
                        </td>
                        <td className="px-2 py-1.5">
                          <EstadoBadge estado={declaracion.estatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={declararAbierto} onOpenChange={setDeclararAbierto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Declarar IVA</DialogTitle>
            <DialogDescription>
              Genera la póliza de declaración/pago del mes. Solo puede declararse una vez.
            </DialogDescription>
          </DialogHeader>
          <FormularioDeclaracion
            anioInicial={anio}
            cuentas={cuentas.data ?? []}
            onCancelar={() => setDeclararAbierto(false)}
            onGuardado={() => {
              setDeclararAbierto(false);
              void declaraciones.refetch();
              void consulta.refetch();
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function Tabla({
  columnas,
  filas,
  pie,
  vacio = "Sin información.",
}: {
  columnas: { titulo: string; alineacion?: "right" }[];
  filas: React.ReactNode[][];
  pie?: React.ReactNode[];
  vacio?: string;
}) {
  return (
    <div className="overflow-auto rounded-lg border border-border bg-card">
      <table className="w-full text-sm">
        <thead className="bg-muted/40">
          <tr>
            {columnas.map((columna) => (
              <th
                key={columna.titulo}
                className={`px-2.5 py-1.5 text-xs font-medium text-muted-foreground ${
                  columna.alineacion === "right" ? "text-right" : "text-left"
                }`}
              >
                {columna.titulo}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td
                colSpan={columnas.length}
                className="px-2 py-6 text-center text-sm text-muted-foreground"
              >
                {vacio}
              </td>
            </tr>
          ) : (
            filas.map((fila, indice) => (
              <tr key={indice} className="border-t border-border">
                {fila.map((celda, posicion) => (
                  <td
                    key={posicion}
                    className={`px-2.5 py-1.5 ${
                      columnas[posicion]?.alineacion === "right" ? "tabular text-right" : ""
                    }`}
                  >
                    {celda}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
        {pie && (
          <tfoot className="border-t border-border bg-muted/30">
            <tr>
              {pie.map((celda, indice) => (
                <td
                  key={indice}
                  className={`px-2.5 py-1.5 font-semibold ${
                    columnas[indice]?.alineacion === "right" ? "tabular text-right" : ""
                  }`}
                >
                  {celda}
                </td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

function ReporteBalanza({ datos }: { datos: Record<string, unknown> }) {
  const cuentas = (datos.cuentas as CuentaReporte[]) ?? [];
  const totales = (datos.totales as Record<string, number>) ?? {};
  return (
    <Tabla
      columnas={[
        { titulo: "Código" },
        { titulo: "Cuenta" },
        { titulo: "Debe", alineacion: "right" },
        { titulo: "Haber", alineacion: "right" },
        { titulo: "Saldo deudor", alineacion: "right" },
        { titulo: "Saldo acreedor", alineacion: "right" },
      ]}
      filas={cuentas.map((cuenta) => [
        <span key="codigo" className="font-mono text-xs">{cuenta.codigo}</span>,
        cuenta.nombre,
        moneda(cuenta.debe),
        moneda(cuenta.haber),
        moneda(cuenta.saldoDeudor),
        moneda(cuenta.saldoAcreedor),
      ])}
      pie={[
        "Totales",
        "",
        moneda(totales.debe),
        moneda(totales.haber),
        moneda(totales.saldoDeudor),
        moneda(totales.saldoAcreedor),
      ]}
    />
  );
}

function ReporteEstado({ datos }: { datos: Record<string, unknown> }) {
  const cuentas = (datos.cuentas as CuentaReporte[]) ?? [];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Resumen etiqueta="Ingresos" valor={numero(datos.ingresos)} />
        <Resumen etiqueta="Gastos" valor={numero(datos.gastos)} />
        <Resumen etiqueta="Utilidad" valor={numero(datos.utilidad)} destacado />
      </div>
      <Tabla
        columnas={[
          { titulo: "Código" },
          { titulo: "Cuenta" },
          { titulo: "Debe", alineacion: "right" },
          { titulo: "Haber", alineacion: "right" },
          { titulo: "Saldo", alineacion: "right" },
        ]}
        filas={cuentas.map((cuenta) => [
          <span key="codigo" className="font-mono text-xs">{cuenta.codigo}</span>,
          cuenta.nombre,
          moneda(cuenta.debe),
          moneda(cuenta.haber),
          moneda(cuenta.saldo),
        ])}
      />
    </div>
  );
}

function ReporteBalance({ datos }: { datos: Record<string, unknown> }) {
  const secciones = [
    { clave: "activo", titulo: "Activo" },
    { clave: "pasivo", titulo: "Pasivo" },
    { clave: "capital", titulo: "Capital" },
  ];
  const resultados = (datos.resultados as {
    ingresos?: number;
    gastos?: number;
    utilidad?: number;
  }) ?? {};
  return (
    <div className="space-y-4">
      {secciones.map((seccion) => {
        const data = datos[seccion.clave] as { cuentas?: CuentaReporte[]; total?: number } | undefined;
        const cuentas = data?.cuentas ?? [];
        if (cuentas.length === 0) return null;
        return (
          <div key={seccion.clave}>
            <div className="mb-1.5 flex items-center justify-between">
              <h3 className="text-sm font-semibold">{seccion.titulo}</h3>
              <p className="tabular text-sm font-medium">{moneda(data?.total ?? 0)}</p>
            </div>
            <Tabla
              columnas={[
                { titulo: "Código" },
                { titulo: "Cuenta" },
                { titulo: "Saldo", alineacion: "right" },
              ]}
              filas={cuentas.map((cuenta) => [
                <span key="codigo" className="font-mono text-xs">{cuenta.codigo}</span>,
                cuenta.nombre,
                moneda(cuenta.saldo),
              ])}
            />
          </div>
        );
      })}

      <div>
        <h3 className="mb-1.5 text-sm font-semibold">Resultados</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Resumen etiqueta="Ingresos" valor={numero(resultados.ingresos)} />
          <Resumen etiqueta="Gastos" valor={numero(resultados.gastos)} />
          <Resumen etiqueta="Utilidad" valor={numero(resultados.utilidad)} destacado />
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-4 rounded-md border border-border bg-card p-2.5 text-sm">
        <span>Activo: <strong className="tabular">{moneda(datos.totalActivo)}</strong></span>
        <span>
          Pasivo + capital:{" "}
          <strong className="tabular">{moneda(datos.totalPasivoCapital)}</strong>
        </span>
        <span>
          Cuadra:{" "}
          <strong>{datos.cuadra ? "Sí" : "No"}</strong>
        </span>
      </div>
    </div>
  );
}

function ReporteMayor({ datos }: { datos: Record<string, unknown> }) {
  const cuenta = (datos.cuenta as CuentaReporte) ?? {};
  const movimientos = (datos.movimientos as Record<string, unknown>[]) ?? [];
  const totales = (datos.totales as Record<string, number>) ?? {};
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5 text-sm">
        <span>
          <strong>{cuenta.codigo} · {cuenta.nombre}</strong>{" "}
          <span className="text-muted-foreground">({cuenta.naturaleza})</span>
        </span>
        <span>Saldo inicial: <strong className="tabular">{moneda(datos.saldoInicial)}</strong></span>
      </div>
      <Tabla
        columnas={[
          { titulo: "Fecha" },
          { titulo: "Folio" },
          { titulo: "Concepto" },
          { titulo: "Debe", alineacion: "right" },
          { titulo: "Haber", alineacion: "right" },
          { titulo: "Saldo", alineacion: "right" },
        ]}
        filas={movimientos.map((movimiento) => [
          fechaCorta(movimiento.fecha),
          <span key="folio" className="font-mono text-xs">{texto(movimiento.folio)}</span>,
          <span key="concepto" className="text-muted-foreground">{texto(movimiento.concepto)}</span>,
          moneda(movimiento.debe),
          moneda(movimiento.haber),
          moneda(movimiento.saldo),
        ])}
        pie={[
          "Totales",
          "",
          "",
          moneda(totales.debe),
          moneda(totales.haber),
          moneda(totales.saldoFinal),
        ]}
      />
    </div>
  );
}

function ReporteIva({ datos }: { datos: Record<string, unknown> }) {
  const movimientos = (datos.movimientos as Record<string, unknown>[]) ?? [];
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Resumen etiqueta="Trasladado" valor={numero(datos.trasladado)} />
        <Resumen etiqueta="Acreditable" valor={numero(datos.acreditable)} />
        <Resumen etiqueta="Neto" valor={numero(datos.neto)} />
        <Resumen etiqueta="Por pagar" valor={numero(datos.porPagar)} destacado />
        <Resumen etiqueta="Saldo a favor" valor={numero(datos.saldoFavor)} />
      </div>
      <Tabla
        columnas={[
          { titulo: "Fecha" },
          { titulo: "Póliza" },
          { titulo: "Tipo" },
          { titulo: "Cuenta" },
          { titulo: "Debe", alineacion: "right" },
          { titulo: "Haber", alineacion: "right" },
          { titulo: "Importe", alineacion: "right" },
        ]}
        filas={movimientos.map((movimiento) => [
          fechaCorta(movimiento.fecha),
          <span key="poliza" className="font-mono text-xs">{texto(movimiento.folio ?? movimiento.polizaFolio)}</span>,
          <span key="tipo" className="capitalize">{texto(movimiento.tipo)}</span>,
          texto(movimiento.cuenta),
          moneda(movimiento.debe),
          moneda(movimiento.haber),
          moneda(movimiento.importe),
        ])}
        vacio="Sin movimientos de IVA en el periodo."
      />
    </div>
  );
}

function ReporteIvaMensual({ datos }: { datos: Record<string, unknown> }) {
  const meses = (datos.meses as Record<string, unknown>[]) ?? [];
  const totales = (datos.totales as Record<string, number>) ?? {};
  return (
    <Tabla
      columnas={[
        { titulo: "Mes" },
        { titulo: "Trasladado", alineacion: "right" },
        { titulo: "Acreditable", alineacion: "right" },
        { titulo: "Neto", alineacion: "right" },
        { titulo: "Por pagar", alineacion: "right" },
        { titulo: "Saldo a favor", alineacion: "right" },
      ]}
      filas={meses.map((mes) => [
        etiquetaMes(mes.mes),
        moneda(mes.trasladado),
        moneda(mes.acreditable),
        moneda(mes.neto),
        moneda(mes.porPagar),
        moneda(mes.saldoFavor),
      ])}
      pie={[
        "Totales",
        moneda(totales.trasladado),
        moneda(totales.acreditable),
        moneda(totales.neto),
        moneda(totales.porPagar),
        moneda(totales.saldoFavor),
      ]}
    />
  );
}

function ReporteCentros({ datos }: { datos: Record<string, unknown> }) {
  const centros = (datos.centros as Record<string, unknown>[]) ?? [];
  const totales = (datos.totales as Record<string, number>) ?? {};
  return (
    <Tabla
      columnas={[
        { titulo: "Código" },
        { titulo: "Centro" },
        { titulo: "Tipo" },
        { titulo: "Ingresos", alineacion: "right" },
        { titulo: "Gastos", alineacion: "right" },
        { titulo: "Utilidad", alineacion: "right" },
        { titulo: "Movimientos", alineacion: "right" },
      ]}
      filas={centros.map((centro) => [
        <span key="codigo" className="font-mono text-xs">{texto(centro.codigo)}</span>,
        texto(centro.nombre),
        <span key="tipo" className="capitalize">{texto(centro.tipo).replace(/_/g, " ")}</span>,
        moneda(centro.ingresos),
        moneda(centro.gastos),
        moneda(centro.utilidad),
        texto(centro.movimientos),
      ])}
      pie={[
        "Totales",
        "",
        "",
        moneda(totales.ingresos),
        moneda(totales.gastos),
        moneda(totales.utilidad),
        "",
      ]}
    />
  );
}

function ReportePresupuesto({ datos }: { datos: Record<string, unknown> }) {
  const centros = (datos.centros as Record<string, unknown>[]) ?? [];
  const totales = (datos.totales as Record<string, number>) ?? {};
  return (
    <Tabla
      columnas={[
        { titulo: "Centro" },
        { titulo: "Presup. ingresos", alineacion: "right" },
        { titulo: "Real ingresos", alineacion: "right" },
        { titulo: "Var. ingresos", alineacion: "right" },
        { titulo: "Presup. gastos", alineacion: "right" },
        { titulo: "Real gastos", alineacion: "right" },
        { titulo: "Var. utilidad", alineacion: "right" },
      ]}
      filas={centros.map((centro) => {
        const t = (centro.totales as Record<string, number>) ?? {};
        return [
          `${texto(centro.codigo)} · ${texto(centro.nombre)}`,
          moneda(t.presupuestoIngresos),
          moneda(t.realIngresos),
          moneda(t.variacionIngresos),
          moneda(t.presupuestoGastos),
          moneda(t.realGastos),
          moneda(t.variacionUtilidad),
        ];
      })}
      pie={[
        "Totales",
        moneda(totales.presupuestoIngresos),
        moneda(totales.realIngresos),
        moneda(totales.variacionIngresos),
        moneda(totales.presupuestoGastos),
        moneda(totales.realGastos),
        moneda(totales.variacionUtilidad),
      ]}
    />
  );
}

function ReporteAuxiliar({
  datos,
  esClientes,
}: {
  datos: Record<string, unknown>;
  esClientes: boolean;
}) {
  const movimientos = (datos.movimientos as Record<string, unknown>[]) ?? [];
  const resumen = (datos[esClientes ? "clientes" : "proveedores"] as Record<string, unknown>[]) ?? [];

  if (movimientos.length > 0 || datos.saldoInicial !== undefined) {
    const tercero = (datos[esClientes ? "cliente" : "proveedor"] as Record<string, unknown>) ?? {};
    const totales = (datos.totales as Record<string, number>) ?? {};
    return (
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-card p-2.5 text-sm">
          <span>
            <strong>{texto(tercero.codigo)} · {texto(tercero.nombre)}</strong>
          </span>
          <span>Saldo inicial: <strong className="tabular">{moneda(datos.saldoInicial)}</strong></span>
        </div>
        <Tabla
          columnas={[
            { titulo: "Fecha" },
            { titulo: "Folio" },
            { titulo: "Concepto" },
            { titulo: "Cargo", alineacion: "right" },
            { titulo: "Abono", alineacion: "right" },
            { titulo: "Saldo", alineacion: "right" },
          ]}
          filas={movimientos.map((movimiento) => {
            const esCargo = movimiento.tipo === "cargo";
            const monto = numero(movimiento.monto);
            return [
              fechaCorta(movimiento.fecha),
              <span key="folio" className="font-mono text-xs">{texto(movimiento.folio)}</span>,
              <span key="concepto" className="text-muted-foreground">{texto(movimiento.concepto)}</span>,
              esCargo ? moneda(monto) : "—",
              esCargo ? "—" : moneda(monto),
              moneda(movimiento.saldo),
            ];
          })}
          pie={[
            "Totales",
            "",
            "",
            moneda(totales.cargos),
            moneda(totales.abonos),
            moneda(totales.saldoFinal),
          ]}
        />
      </div>
    );
  }

  return (
    <Tabla
      columnas={[
        { titulo: esClientes ? "Cliente" : "Proveedor" },
        { titulo: "Cargos", alineacion: "right" },
        { titulo: "Abonos", alineacion: "right" },
        { titulo: "Saldo", alineacion: "right" },
      ]}
      filas={resumen.map((fila) => [
        `${texto(fila.codigo)} · ${texto(fila.nombre)}`,
        moneda(fila.cargos),
        moneda(fila.abonos),
        moneda(fila.saldo),
      ])}
      vacio="Sin movimientos en el periodo."
    />
  );
}

function etiquetaMes(valor: unknown) {
  const crudo = String(valor ?? "");
  const coincidencia = crudo.match(/^(\d{4})-(\d{2})$/);
  if (coincidencia) {
    const nombre = MESES[Number(coincidencia[2]) - 1];
    return nombre ? `${nombre} ${coincidencia[1]}` : crudo;
  }
  const numeroMes = numero(valor);
  return MESES[numeroMes - 1] ?? crudo;
}

function Resumen({
  etiqueta,
  valor,
  destacado,
}: {
  etiqueta: string;
  valor: number;
  destacado?: boolean;
}) {  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {etiqueta}
      </p>
      <p className={destacado ? "tabular mt-1 text-xl font-semibold text-primary" : "tabular mt-1 text-xl font-semibold"}>
        {moneda(valor)}
      </p>
    </div>
  );
}

function FormularioDeclaracion({
  anioInicial,
  cuentas,
  onGuardado,
  onCancelar,
}: {
  anioInicial: number;
  cuentas: CuentaContable[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const hoy = new Date();
  const [anio, setAnio] = useState(anioInicial);
  const [mes, setMes] = useState(hoy.getMonth() + 1);
  const [fecha, setFecha] = useState(fechaISO(hoy));
  const [cuentaPagoId, setCuentaPagoId] = useState("");
  const [enviando, setEnviando] = useState(false);

  return (
    <form
      onSubmit={async (evento) => {
        evento.preventDefault();
        setEnviando(true);
        try {
          await apiFetch("/contabilidad/impuestos/iva/declarar", {
            method: "POST",
            body: JSON.stringify({
              anio,
              mes,
              fecha,
              ...(cuentaPagoId ? { cuentaPagoId } : {}),
            }),
          });
          toast.success("IVA declarado correctamente.");
          onGuardado();
        } catch (error) {
          toast.error(mensajeDeError(error));
        } finally {
          setEnviando(false);
        }
      }}
      className="space-y-3"
      noValidate
    >
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="anioDecl" className="font-semibold">Año</Label>
          <Input
            id="anioDecl"
            type="number"
            className="h-9"
            value={anio}
            onChange={(evento) => setAnio(Number(evento.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="mesDecl" className="font-semibold">Mes</Label>
          <select
            id="mesDecl"
            value={mes}
            onChange={(evento) => setMes(Number(evento.target.value))}
            className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {MESES.map((nombre, indice) => (
              <option key={nombre} value={indice + 1}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="fechaDecl" className="font-semibold">
          Fecha de declaración/pago
        </Label>
        <Input
          id="fechaDecl"
          type="date"
          className="h-9"
          value={fecha}
          onChange={(evento) => setFecha(evento.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="cuentaDecl" className="font-semibold">
          Cuenta de pago (opcional)
        </Label>
        <select
          id="cuentaDecl"
          value={cuentaPagoId}
          onChange={(evento) => setCuentaPagoId(evento.target.value)}
          className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">1102 Bancos (predeterminada)</option>
          {cuentas
            .filter(
              (cuenta) =>
                cuenta.activo &&
                cuenta.permiteMovimientos &&
                cuenta.tipo === "activo",
            )
            .map((cuenta) => (
              <option key={cuenta.publicId} value={cuenta.publicId}>
                {cuenta.codigo} · {cuenta.nombre}
              </option>
            ))}
        </select>
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
          Declarar
        </Button>
      </div>
    </form>
  );
}
