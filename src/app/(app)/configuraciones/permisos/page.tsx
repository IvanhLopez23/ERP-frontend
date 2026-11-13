"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { KeyRound, LoaderCircle, Save, Search, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type Accion = "ver" | "crear" | "editar" | "eliminar" | "adjuntos" | "reportes";
type Acciones = Record<Accion, boolean>;

type Pantalla = {
  publicId: string;
  nombre?: string | null;
  ruta?: string | null;
  modulo?: string | null;
};

type Permiso = Acciones & {
  publicId: string;
  pantalla?: Pantalla | null;
};

type Rol = {
  publicId: string;
  descripcion?: string | null;
  esAdministrador?: boolean;
};

const ACCIONES: { clave: Accion; etiqueta: string }[] = [
  { clave: "ver", etiqueta: "Ver" },
  { clave: "crear", etiqueta: "Crear" },
  { clave: "editar", etiqueta: "Editar" },
  { clave: "eliminar", etiqueta: "Eliminar" },
  { clave: "adjuntos", etiqueta: "Adjuntos" },
  { clave: "reportes", etiqueta: "Reportes" },
];

const SIN_ACCIONES: Acciones = {
  ver: false,
  crear: false,
  editar: false,
  eliminar: false,
  adjuntos: false,
  reportes: false,
};

export default function PermisosPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/configuraciones/permisos", "ver");
  const puedeEditar = puede("/configuraciones/permisos", "editar");

  const [rolId, setRolId] = useState("");

  const roles = useQuery<Rol[]>({
    queryKey: ["roles-select"],
    queryFn: () => apiFetch<Rol[]>("/roles"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const pantallas = useQuery<Pantalla[]>({
    queryKey: ["pantallas-todas"],
    queryFn: () => apiFetch<Pantalla[]>("/pantallas"),
    enabled: puedeVer,
    staleTime: 5 * 60_000,
  });

  const permisos = useQuery<Permiso[]>({
    queryKey: ["permisos-rol", rolId],
    queryFn: () => apiFetch<Permiso[]>(`/permisos/rol?rolId=${rolId}`),
    enabled: puedeVer && Boolean(rolId),
  });

  const rol = useMemo(
    () => (roles.data ?? []).find((item) => item.publicId === rolId) ?? null,
    [roles.data, rolId],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Permisos" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a Permisos"
          descripcion="Tu rol no tiene el permiso /configuraciones/permisos."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Permisos"
        descripcion="Define las acciones permitidas por rol y pantalla."
      />

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
        <div className="min-w-[260px] flex-1 space-y-1">
          <Label htmlFor="rol" className="text-xs">
            Rol
          </Label>
          <select
            id="rol"
            value={rolId}
            onChange={(evento) => setRolId(evento.target.value)}
            className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">Selecciona un rol…</option>
            {(roles.data ?? []).map((item) => (
              <option key={item.publicId} value={item.publicId}>
                {item.descripcion ?? item.publicId}
                {item.esAdministrador ? " (administrador)" : ""}
              </option>
            ))}
          </select>
        </div>

        {rol?.esAdministrador && (
          <p className="rounded-md border border-amber-600/25 bg-amber-600/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
            Este rol es administrador: el backend omite la validación de permisos.
          </p>
        )}
      </div>

      {!rolId ? (
        <EmptyState
          icono={KeyRound}
          titulo="Selecciona un rol"
          descripcion="Elige un rol para ver y editar su matriz de permisos."
        />
      ) : permisos.isPending || pantallas.isPending ? (
        <Skeleton className="h-[420px] w-full rounded-lg" />
      ) : permisos.error ? (
        <ErrorState
          error={permisos.error}
          onReintentar={() => void permisos.refetch()}
        />
      ) : (
        <MatrizPermisos
          key={`${rolId}-${permisos.dataUpdatedAt}`}
          rolId={rolId}
          pantallas={pantallas.data ?? []}
          permisos={permisos.data ?? []}
          puedeEditar={puedeEditar}
          onGuardado={() =>
            void queryClient.invalidateQueries({
              queryKey: ["permisos-rol", rolId],
            })
          }
        />
      )}
    </>
  );
}

function MatrizPermisos({
  rolId,
  pantallas,
  permisos,
  puedeEditar,
  onGuardado,
}: {
  rolId: string;
  pantallas: Pantalla[];
  permisos: Permiso[];
  puedeEditar: boolean;
  onGuardado: () => void;
}) {
  const [filas, setFilas] = useState<Record<string, Acciones>>(() => {
    const porPantalla = new Map(
      permisos
        .filter((permiso) => permiso.pantalla?.publicId)
        .map((permiso) => [permiso.pantalla!.publicId!, permiso]),
    );

    return Object.fromEntries(
      pantallas.map((pantalla) => {
        const permiso = porPantalla.get(pantalla.publicId);
        return [
          pantalla.publicId,
          permiso
            ? {
                ver: permiso.ver,
                crear: permiso.crear,
                editar: permiso.editar,
                eliminar: permiso.eliminar,
                adjuntos: permiso.adjuntos,
                reportes: permiso.reportes,
              }
            : { ...SIN_ACCIONES },
        ];
      }),
    );
  });
  const [filtro, setFiltro] = useState("");

  const visibles = useMemo(() => {
    const termino = filtro.trim().toLowerCase();
    if (!termino) return pantallas;
    return pantallas.filter((pantalla) =>
      `${pantalla.nombre ?? ""} ${pantalla.ruta ?? ""} ${pantalla.modulo ?? ""}`
        .toLowerCase()
        .includes(termino),
    );
  }, [pantallas, filtro]);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/permisos/rol", {
        method: "PUT",
        body: JSON.stringify({
          rolPublicId: rolId,
          pantallas: pantallas.map((pantalla) => ({
            pantallaPublicId: pantalla.publicId,
            ...(filas[pantalla.publicId] ?? SIN_ACCIONES),
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Permisos del rol actualizados correctamente.");
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function alternar(pantallaId: string, accion: Accion) {
    setFilas((previas) => ({
      ...previas,
      [pantallaId]: {
        ...(previas[pantallaId] ?? SIN_ACCIONES),
        [accion]: !(previas[pantallaId] ?? SIN_ACCIONES)[accion],
      },
    }));
  }

  function alternarColumna(accion: Accion) {
    const todasActivas = visibles.every(
      (pantalla) => filas[pantalla.publicId]?.[accion],
    );
    setFilas((previas) => {
      const siguiente = { ...previas };
      for (const pantalla of visibles) {
        siguiente[pantalla.publicId] = {
          ...(siguiente[pantalla.publicId] ?? SIN_ACCIONES),
          [accion]: !todasActivas,
        };
      }
      return siguiente;
    });
  }

  function marcarTodo(valor: boolean) {
    setFilas((previas) => {
      const siguiente = { ...previas };
      for (const pantalla of visibles) {
        siguiente[pantalla.publicId] = valor
          ? { ...SIN_ACCIONES, ver: true, crear: true, editar: true, adjuntos: true, reportes: true }
          : { ...SIN_ACCIONES };
      }
      return siguiente;
    });
  }

  const totalActivos = Object.values(filas).reduce(
    (suma, acciones) => suma + ACCIONES.filter(({ clave }) => acciones[clave]).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-xs">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={filtro}
            onChange={(evento) => setFiltro(evento.target.value)}
            placeholder="Filtrar pantallas…"
            className="h-8 pl-8"
            aria-label="Filtrar pantallas"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
          <p className="text-xs text-muted-foreground">
            {totalActivos} acciones activas · {pantallas.length} pantallas
          </p>
          {puedeEditar && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => marcarTodo(true)}
              >
                Marcar todo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => marcarTodo(false)}
              >
                Limpiar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="sticky top-0 z-10 bg-muted/60 backdrop-blur">
            <tr>
              <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                Pantalla
              </th>
              {ACCIONES.map((accion) => (
                <th key={accion.clave} className="px-2 py-2 text-center">
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                    onClick={() => alternarColumna(accion.clave)}
                    disabled={!puedeEditar}
                    title={`Activar/desactivar ${accion.etiqueta} en las pantallas visibles`}
                  >
                    {accion.etiqueta}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((pantalla) => {
              const acciones = filas[pantalla.publicId] ?? SIN_ACCIONES;
              return (
                <tr
                  key={pantalla.publicId}
                  className="border-t border-border hover:bg-accent/30"
                >
                  <td className="px-3 py-1.5">
                    <p className="text-sm font-medium">
                      {texto(pantalla.nombre)}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {texto(pantalla.ruta)}
                    </p>
                  </td>
                  {ACCIONES.map((accion) => (
                    <td key={accion.clave} className="px-2 py-1.5 text-center">
                      <input
                        type="checkbox"
                        checked={Boolean(acciones[accion.clave])}
                        onChange={() => alternar(pantalla.publicId, accion.clave)}
                        disabled={!puedeEditar}
                        aria-label={`${accion.etiqueta} en ${pantalla.nombre ?? pantalla.ruta}`}
                        className={cn(
                          "size-4 cursor-pointer accent-[var(--primary)]",
                          !puedeEditar && "cursor-not-allowed opacity-60",
                        )}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {puedeEditar && (
        <div className="flex justify-end">
          <Button
            size="sm"
            className="cursor-pointer"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Save className="size-3.5" aria-hidden="true" />
            )}
            Guardar permisos
          </Button>
        </div>
      )}
    </div>
  );
}
