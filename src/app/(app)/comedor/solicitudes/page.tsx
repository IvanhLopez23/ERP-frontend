"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ClipboardList,
  Info,
  LoaderCircle,
  ShieldAlert,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaHora, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ItemMenu = {
  publicId: string;
  fecha?: string | null;
  tipoComida?: string | null;
  descripcion?: string | null;
};

type Menu = {
  publicId: string;
  nombre?: string | null;
  periodicidad?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  items?: ItemMenu[];
};

type Solicitud = {
  publicId: string;
  estatus?: string | null;
  observaciones?: string | null;
  fechaSolicitud?: string | null;
  menu?: { publicId?: string; nombre?: string } | null;
  detalles?: {
    publicId: string;
    menuItem?: { fecha?: string | null; tipoComida?: string | null; descripcion?: string | null } | null;
  }[];
};

function desenvolver<T>(valor: unknown): T {
  if (valor && typeof valor === "object" && "data" in valor) {
    return (valor as { data: T }).data;
  }
  return valor as T;
}

function estadoDeError(error: unknown) {
  return (error as { status?: number })?.status;
}

export default function SolicitudesComedorPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();
  const puedeVer = puede("/comedor", "ver");

  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [observaciones, setObservaciones] = useState("");
  const [cancelar, setCancelar] = useState<Solicitud | null>(null);

  const siguiente = useQuery<Menu | null>({
    queryKey: ["comedor-siguiente"],
    queryFn: async () => desenvolver<Menu | null>(await apiFetch("/comedor/menus/siguiente")),
    enabled: puedeVer,
    retry: false,
  });

  const mias = useQuery<Solicitud[]>({
    queryKey: ["comedor-solicitudes"],
    queryFn: async () =>
      desenvolver<Solicitud[]>(await apiFetch("/comedor/solicitudes/mias")) ?? [],
    enabled: puedeVer,
    retry: false,
  });

  const menu = siguiente.data ?? null;
  const items = menu?.items ?? [];

  const crear = useMutation({
    mutationFn: () =>
      apiFetch("/comedor/solicitudes", {
        method: "POST",
        body: JSON.stringify({
          menuPublicId: menu?.publicId,
          menuItemPublicIds: seleccion,
          ...(observaciones.trim() ? { observaciones: observaciones.trim() } : {}),
        }),
      }),
    onSuccess: () => {
      toast.success("Solicitud de comida registrada correctamente.");
      setSeleccion([]);
      setObservaciones("");
      void queryClient.invalidateQueries({ queryKey: ["comedor-solicitudes"] });
      void queryClient.invalidateQueries({ queryKey: ["comedor-siguiente"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const eliminar = useMutation({
    mutationFn: (solicitud: Solicitud) =>
      apiFetch(`/comedor/solicitudes/${solicitud.publicId}`, { method: "DELETE" }),
    onSuccess: () => {
      toast.success("Solicitud cancelada correctamente.");
      setCancelar(null);
      void queryClient.invalidateQueries({ queryKey: ["comedor-solicitudes"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const todasSeleccionadas = useMemo(
    () => items.length > 0 && seleccion.length === items.length,
    [items.length, seleccion.length],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Solicitudes de comedor" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso al comedor"
          descripcion="Tu rol no tiene el permiso /comedor."
        />
      </>
    );
  }

  const sinEmpleado =
    estadoDeError(siguiente.error) === 404 || estadoDeError(mias.error) === 404;

  return (
    <>
      <PageHeader
        titulo="Solicitudes de comedor"
        descripcion="Separa tus comidas del siguiente menú publicado y consulta tus solicitudes."
      />

      {sinEmpleado ? (
        <Card>
          <CardContent className="flex items-start gap-3 pt-0">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
              <Info className="size-4" aria-hidden="true" />
            </span>
            <div className="text-sm">
              <p className="font-medium">Tu usuario no tiene un empleado activo asociado</p>
              <p className="mt-1 text-muted-foreground">
                El módulo de comedor requiere que el usuario esté vinculado a un
                empleado con turno asignado. Solicita al administrador que
                complete la vinculación en Recursos Humanos → Empleados.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UtensilsCrossed className="size-4 text-primary" aria-hidden="true" />
                Siguiente menú
              </CardTitle>
            </CardHeader>
            <CardContent>
              {siguiente.isPending ? (
                <Skeleton className="h-40 w-full rounded-md" />
              ) : siguiente.error ? (
                <ErrorState
                  error={siguiente.error}
                  onReintentar={() => void siguiente.refetch()}
                  titulo="No hay un menú disponible"
                />
              ) : !menu ? (
                <p className="text-sm text-muted-foreground">
                  Aún no se ha publicado el menú del siguiente periodo.
                </p>
              ) : (
                <form
                  onSubmit={(evento) => {
                    evento.preventDefault();
                    if (seleccion.length === 0) {
                      toast.error("Selecciona al menos una comida.");
                      return;
                    }
                    crear.mutate();
                  }}
                  className="space-y-3"
                  noValidate
                >
                  <div>
                    <p className="text-sm font-semibold">{texto(menu.nombre)}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      {fechaCorta(menu.fechaInicio)} → {fechaCorta(menu.fechaFin)}
                      <span className="capitalize">· {texto(menu.periodicidad)}</span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground">
                      Selecciona tus comidas ({seleccion.length}/{items.length})
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      className="cursor-pointer"
                      onClick={() =>
                        setSeleccion(
                          todasSeleccionadas ? [] : items.map((item) => item.publicId),
                        )
                      }
                    >
                      {todasSeleccionadas ? "Quitar todas" : "Seleccionar todas"}
                    </Button>
                  </div>

                  <ul className="max-h-[280px] space-y-1 overflow-y-auto rounded-md border border-border p-2">
                    {items.map((item) => {
                      const marcado = seleccion.includes(item.publicId);
                      return (
                        <li key={item.publicId}>
                          <label className="flex cursor-pointer items-start gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted/60">
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() =>
                                setSeleccion((previos) =>
                                  marcado
                                    ? previos.filter((id) => id !== item.publicId)
                                    : [...previos, item.publicId],
                                )
                              }
                              className="mt-0.5 size-4 cursor-pointer accent-[var(--primary)]"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className="text-xs font-medium">
                                  {fechaCorta(item.fecha)}
                                </span>
                                <span className="text-xs capitalize text-muted-foreground">
                                  {texto(item.tipoComida)}
                                </span>
                              </span>
                              <span className="mt-0.5 block text-sm">
                                {texto(item.descripcion)}
                              </span>
                            </span>
                          </label>
                        </li>
                      );
                    })}
                    {items.length === 0 && (
                      <li className="px-2 py-3 text-sm text-muted-foreground">
                        El menú no tiene comidas publicadas.
                      </li>
                    )}
                  </ul>

                  <div className="space-y-1.5">
                    <Label htmlFor="observacionesComedor">Observaciones</Label>
                    <Textarea
                      id="observacionesComedor"
                      rows={2}
                      value={observaciones}
                      onChange={(evento) => setObservaciones(evento.target.value)}
                      placeholder="Sin cebolla, alergias, etc."
                    />
                  </div>

                  <Button
                    type="submit"
                    size="sm"
                    className="w-full cursor-pointer"
                    disabled={crear.isPending || items.length === 0}
                  >
                    {crear.isPending && (
                      <LoaderCircle
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    Separar comidas
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <ClipboardList className="size-4 text-primary" aria-hidden="true" />
                Mis solicitudes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {mias.isPending ? (
                <Skeleton className="h-40 w-full rounded-md" />
              ) : mias.error ? (
                <ErrorState
                  error={mias.error}
                  onReintentar={() => void mias.refetch()}
                  titulo="No se pudieron cargar tus solicitudes"
                />
              ) : (mias.data ?? []).length === 0 ? (
                <EmptyState
                  className="py-6"
                  icono={ClipboardList}
                  titulo="Todavía no tienes solicitudes"
                  descripcion="Selecciona comidas del siguiente menú para crear la primera."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {(mias.data ?? []).map((solicitud) => (
                    <li key={solicitud.publicId} className="py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {texto(solicitud.menu?.nombre)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Solicitada el {fechaHora(solicitud.fechaSolicitud)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1.5">
                          <EstadoBadge estado={solicitud.estatus} />
                          {solicitud.estatus !== "cancelada" && (
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="cursor-pointer text-muted-foreground hover:text-destructive"
                              aria-label="Cancelar solicitud"
                              onClick={() => setCancelar(solicitud)}
                            >
                              <X className="size-3.5" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </div>
                      {(solicitud.detalles ?? []).length > 0 && (
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {(solicitud.detalles ?? []).map((detalle) => (
                            <li
                              key={detalle.publicId}
                              className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] text-muted-foreground"
                            >
                              {fechaCorta(detalle.menuItem?.fecha)} ·{" "}
                              {texto(detalle.menuItem?.tipoComida)}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Dialog
        open={Boolean(cancelar)}
        onOpenChange={(abierto) => {
          if (!abierto) setCancelar(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar solicitud</DialogTitle>
            <DialogDescription>
              Se cancelará tu solicitud de comida. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() => setCancelar(null)}
            >
              Volver
            </Button>
            <Button
              variant="destructive"
              size="sm"
              className="cursor-pointer"
              disabled={eliminar.isPending}
              onClick={() => cancelar && eliminar.mutate(cancelar)}
            >
              {eliminar.isPending && (
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
              )}
              Cancelar solicitud
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
