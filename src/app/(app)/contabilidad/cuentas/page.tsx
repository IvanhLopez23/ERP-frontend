"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ChevronRight,
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldAlert,
  Save,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  NATURALEZAS,
  TIPOS_CUENTA,
  type CuentaContable,
} from "@/lib/types/contabilidad";
import { cn } from "@/lib/utils";

type Valores = {
  codigo: string;
  nombre: string;
  descripcion: string;
  tipo: string;
  naturaleza: string;
  padreId: string;
  permiteMovimientos: boolean;
  activo: boolean;
};

export default function CuentasContablesPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/contabilidad/cuentas", "ver");
  const puedeCrear = puede("/contabilidad/cuentas", "crear");
  const puedeEditar = puede("/contabilidad/cuentas", "editar");

  const [vista, setVista] = useState<"arbol" | "lista">("arbol");
  const [buscar, setBuscar] = useState("");
  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [editando, setEditando] = useState<CuentaContable | null>(null);

  const cuentas = useQuery<CuentaContable[]>({
    queryKey: ["contabilidad-cuentas"],
    queryFn: () => apiFetch<CuentaContable[]>("/contabilidad/cuentas"),
    enabled: puedeVer,
  });

  const arbol = useQuery<CuentaContable[]>({
    queryKey: ["contabilidad-cuentas-arbol"],
    queryFn: () => apiFetch<CuentaContable[]>("/contabilidad/cuentas/arbol"),
    enabled: puedeVer,
  });

  const alternar = useMutation({
    mutationFn: (cuenta: CuentaContable) =>
      apiFetch(`/contabilidad/cuentas/activo/${cuenta.publicId}`, {
        method: "PATCH",
      }),
    onSuccess: () => {
      toast.success("Cuenta actualizada correctamente.");
      void queryClient.invalidateQueries({ queryKey: ["contabilidad-cuentas"] });
      void queryClient.invalidateQueries({
        queryKey: ["contabilidad-cuentas-arbol"],
      });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const filtradas = useMemo(() => {
    const termino = buscar.trim().toLowerCase();
    if (!termino) return cuentas.data ?? [];
    return (cuentas.data ?? []).filter((cuenta) =>
      `${cuenta.codigo} ${cuenta.nombre} ${cuenta.tipo}`
        .toLowerCase()
        .includes(termino),
    );
  }, [cuentas.data, buscar]);

  function nuevo() {
    setEditando(null);
    setSheetAbierto(true);
  }

  function editar(cuenta: CuentaContable) {
    setEditando(cuenta);
    setSheetAbierto(true);
  }

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Catálogo de cuentas" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso"
          descripcion="Tu rol no tiene el permiso /contabilidad/cuentas."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Catálogo de cuentas"
        descripcion="Árbol contable. Solo las cuentas que permiten movimientos pueden usarse en pólizas."
        acciones={
          puedeCrear ? (
            <Button size="sm" className="cursor-pointer" onClick={nuevo}>
              <Plus className="size-3.5" aria-hidden="true" />
              Nueva cuenta
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            type="button"
            onClick={() => setVista("arbol")}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium",
              vista === "arbol" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Árbol
          </button>
          <button
            type="button"
            onClick={() => setVista("lista")}
            className={cn(
              "cursor-pointer rounded-md px-2.5 py-1 text-xs font-medium",
              vista === "lista" ? "bg-muted text-foreground" : "text-muted-foreground",
            )}
          >
            Listado
          </button>
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={buscar}
            onChange={(evento) => setBuscar(evento.target.value)}
            placeholder="Buscar por código o nombre…"
            className="h-8 pl-8"
            aria-label="Buscar cuentas"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {cuentas.data?.length ?? 0} cuentas
        </p>
      </div>

      {cuentas.error ? (
        <ErrorState error={cuentas.error} onReintentar={() => void cuentas.refetch()} />
      ) : cuentas.isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, indice) => (
            <Skeleton key={indice} className="h-10 rounded-md" />
          ))}
        </div>
      ) : vista === "arbol" ? (
        <div className="rounded-lg border border-border bg-card p-2">
          {(arbol.data ?? []).length === 0 ? (
            <EmptyState
              icono={ShieldAlert}
              titulo="Sin cuentas"
              descripcion="Crea la primera cuenta contable."
            />
          ) : (
            <ul className="space-y-0.5">
              {(arbol.data ?? []).map((cuenta) => (
                <NodoCuenta
                  key={cuenta.publicId}
                  cuenta={cuenta}
                  puedeEditar={puedeEditar}
                  onEditar={editar}
                  onAlternar={(item) => alternar.mutate(item)}
                />
              ))}
            </ul>
          )}
        </div>
      ) : (
        <div className="overflow-auto rounded-lg border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Código</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Nombre</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Tipo</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Naturaleza</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Movimientos</th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">Estado</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {filtradas.map((cuenta) => (
                <tr key={cuenta.publicId} className="border-t border-border">
                  <td className="px-3 py-1.5 font-mono text-xs">{cuenta.codigo}</td>
                  <td className="px-3 py-1.5">{cuenta.nombre}</td>
                  <td className="px-3 py-1.5 capitalize">{cuenta.tipo}</td>
                  <td className="px-3 py-1.5 capitalize">{cuenta.naturaleza}</td>
                  <td className="px-3 py-1.5">
                    {cuenta.permiteMovimientos ? "Sí" : "No"}
                  </td>
                  <td className="px-3 py-1.5">
                    <EstadoBadge activo={cuenta.activo} />
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        disabled={!puedeEditar}
                        aria-label={`Editar ${cuenta.nombre}`}
                        onClick={() => editar(cuenta)}
                      >
                        <Pencil className="size-3.5" aria-hidden="true" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="cursor-pointer"
                        disabled={!puedeEditar || alternar.isPending}
                        aria-label={`Activar o desactivar ${cuenta.nombre}`}
                        onClick={() => alternar.mutate(cuenta)}
                      >
                        <Power className="size-3.5" aria-hidden="true" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {editando ? "Editar cuenta" : "Nueva cuenta"}
            </SheetTitle>
            <SheetDescription>
              Las cuentas de agrupación deben desactivar “Permite movimientos”.
            </SheetDescription>
          </SheetHeader>

          <FormularioCuenta
            key={editando?.publicId ?? "nueva"}
            cuenta={editando}
            cuentas={cuentas.data ?? []}
            onCancelar={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
            onGuardado={() => {
              setSheetAbierto(false);
              setEditando(null);
              void queryClient.invalidateQueries({ queryKey: ["contabilidad-cuentas"] });
              void queryClient.invalidateQueries({
                queryKey: ["contabilidad-cuentas-arbol"],
              });
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function NodoCuenta({
  cuenta,
  nivel = 0,
  puedeEditar,
  onEditar,
  onAlternar,
}: {
  cuenta: CuentaContable;
  nivel?: number;
  puedeEditar: boolean;
  onEditar: (cuenta: CuentaContable) => void;
  onAlternar: (cuenta: CuentaContable) => void;
}) {
  const hijos = cuenta.hijos ?? [];
  const [abierto, setAbierto] = useState(nivel < 2);

  return (
    <li>
      <Collapsible open={abierto} onOpenChange={setAbierto}>
        <div
          className="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
          style={{ paddingLeft: `${8 + nivel * 18}px` }}
        >
          {hijos.length > 0 ? (
            <CollapsibleTrigger
              className="grid size-5 cursor-pointer place-items-center rounded text-muted-foreground"
              aria-label={abierto ? "Contraer" : "Expandir"}
            >
              <ChevronRight
                className={cn("size-3.5 transition-transform", abierto && "rotate-90")}
                aria-hidden="true"
              />
            </CollapsibleTrigger>
          ) : (
            <span className="size-5" />
          )}

          <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
            {cuenta.codigo}
          </span>
          <span
            className={cn(
              "min-w-0 flex-1 truncate text-sm",
              nivel === 0 && "font-semibold",
            )}
          >
            {cuenta.nombre}
          </span>
          <span className="hidden shrink-0 capitalize text-xs text-muted-foreground sm:inline">
            {cuenta.tipo}
          </span>
          {cuenta.permiteMovimientos && (
            <span className="shrink-0 rounded border border-border px-1 py-0.5 text-[10px] text-muted-foreground">
              movimiento
            </span>
          )}
          {!cuenta.activo && <EstadoBadge activo={false} />}

          <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              disabled={!puedeEditar}
              aria-label={`Editar ${cuenta.nombre}`}
              onClick={() => onEditar(cuenta)}
            >
              <Pencil className="size-3.5" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="cursor-pointer"
              disabled={!puedeEditar}
              aria-label={`Activar o desactivar ${cuenta.nombre}`}
              onClick={() => onAlternar(cuenta)}
            >
              <Power className="size-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>

        <CollapsibleContent>
          {hijos.length > 0 && (
            <ul className="space-y-0.5">
              {hijos.map((hijo) => (
                <NodoCuenta
                  key={hijo.publicId}
                  cuenta={hijo}
                  nivel={nivel + 1}
                  puedeEditar={puedeEditar}
                  onEditar={onEditar}
                  onAlternar={onAlternar}
                />
              ))}
            </ul>
          )}
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

function FormularioCuenta({
  cuenta,
  cuentas,
  onGuardado,
  onCancelar,
}: {
  cuenta: CuentaContable | null;
  cuentas: CuentaContable[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => ({
    codigo: cuenta?.codigo ?? "",
    nombre: cuenta?.nombre ?? "",
    descripcion: cuenta?.descripcion ?? "",
    tipo: cuenta?.tipo ?? "activo",
    naturaleza: cuenta?.naturaleza ?? "",
    padreId: cuenta?.padre?.publicId ?? cuenta?.padreId ?? "",
    permiteMovimientos: cuenta?.permiteMovimientos ?? true,
    activo: cuenta?.activo ?? true,
  }));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Record<string, unknown> = {
        codigo: valores.codigo.trim(),
        nombre: valores.nombre.trim(),
        tipo: valores.tipo,
        permiteMovimientos: valores.permiteMovimientos,
        activo: valores.activo,
      };
      if (valores.descripcion.trim()) payload.descripcion = valores.descripcion.trim();
      if (valores.naturaleza) payload.naturaleza = valores.naturaleza;
      if (valores.padreId) payload.padreId = valores.padreId;

      return apiFetch(
        cuenta
          ? `/contabilidad/cuentas/${cuenta.publicId}`
          : "/contabilidad/cuentas",
        {
          method: cuenta ? "PUT" : "POST",
          body: JSON.stringify(payload),
        },
      );
    },
    onSuccess: () => {
      toast.success(
        cuenta ? "Cuenta actualizada correctamente." : "Cuenta creada correctamente.",
      );
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function actualizar<K extends keyof Valores>(clave: K, valor: Valores[K]) {
    setValores((previos) => ({ ...previos, [clave]: valor }));
  }

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        const nuevos: Record<string, string> = {};
        if (!valores.codigo.trim()) nuevos.codigo = "Requerido.";
        if (!valores.nombre.trim()) nuevos.nombre = "Requerido.";
        setErrores(nuevos);
        if (Object.keys(nuevos).length > 0) return;
        mutation.mutate();
      }}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <SeccionFormulario numero={1} titulo="Identificación">
          <div className="space-y-1.5">
            <Label htmlFor="codigoCuenta" className="font-semibold">Código</Label>
            <Input
              id="codigoCuenta"
              value={valores.codigo}
              onChange={(evento) => actualizar("codigo", evento.target.value)}
              className="h-9 font-mono"
              placeholder="1101"
            />
            {errores.codigo && <p className="text-xs text-destructive">{errores.codigo}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nombreCuenta" className="font-semibold">Nombre</Label>
            <Input
              id="nombreCuenta"
              value={valores.nombre}
              onChange={(evento) => actualizar("nombre", evento.target.value)}
              className="h-9"
            />
            {errores.nombre && <p className="text-xs text-destructive">{errores.nombre}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="descripcionCuenta" className="font-semibold">Descripción</Label>
            <Textarea
              id="descripcionCuenta"
              rows={2}
              value={valores.descripcion}
              onChange={(evento) => actualizar("descripcion", evento.target.value)}
            />
          </div>
        </SeccionFormulario>
        <SeccionFormulario numero={2} titulo="Clasificación">
          <div className="space-y-1.5">
            <Label htmlFor="tipoCuenta" className="font-semibold">Tipo</Label>
            <select
              id="tipoCuenta"
              value={valores.tipo}
              onChange={(evento) => actualizar("tipo", evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {TIPOS_CUENTA.map((tipo) => (
                <option key={tipo} value={tipo} className="capitalize">
                  {tipo}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="naturalezaCuenta" className="font-semibold">Naturaleza</Label>
            <select
              id="naturalezaCuenta"
              value={valores.naturaleza}
              onChange={(evento) => actualizar("naturaleza", evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Derivar del tipo</option>
              {NATURALEZAS.map((naturaleza) => (
                <option key={naturaleza} value={naturaleza} className="capitalize">
                  {naturaleza}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="padreCuenta" className="font-semibold">Cuenta padre</Label>
            <select
              id="padreCuenta"
              value={valores.padreId}
              onChange={(evento) => actualizar("padreId", evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Sin padre (raíz)</option>
              {cuentas
                .filter((item) => item.publicId !== cuenta?.publicId)
                .map((item) => (
                  <option key={item.publicId} value={item.publicId}>
                    {item.codigo} · {item.nombre}
                  </option>
                ))}
            </select>
          </div>
        </SeccionFormulario>
        <SeccionFormulario numero={3} titulo="Operación">
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valores.permiteMovimientos}
              onChange={(evento) =>
                actualizar("permiteMovimientos", evento.target.checked)
              }
              className="size-4 cursor-pointer accent-[var(--primary)]"
            />
            Permite movimientos en pólizas
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={valores.activo}
              onChange={(evento) => actualizar("activo", evento.target.checked)}
              className="size-4 cursor-pointer accent-[var(--primary)]"
            />
            Cuenta activa
          </label>
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
          {cuenta ? "Guardar cuenta" : "Crear cuenta"}
        </Button>
      </div>
    </form>
  );
}
