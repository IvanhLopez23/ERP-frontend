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
  LoaderCircle,
  Pencil,
  Plus,
  Power,
  Save,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { mediaUrl } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
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
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { CampoImagen } from "@/components/crud/campo-imagen";
import { CampoArchivo } from "@/components/crud/campo-archivo";

export type ValorCampo = string | boolean | File | null;
export type ValoresFormulario = Record<string, ValorCampo>;

export type TipoCampo =
  | "text"
  | "textarea"
  | "number"
  | "date"
  | "time"
  | "email"
  | "tel"
  | "select"
  | "checkbox"
  | "dias"
  | "file"
  | "archivo";

export type OpcionCampo = { valor: string; etiqueta: string };

export type Campo = {
  nombre: string;
  etiqueta: string;
  tipo: TipoCampo;
  requerido?: boolean;
  opciones?:
    | OpcionCampo[]
    | ((valores: ValoresFormulario) => OpcionCampo[]);
  ayuda?: string | ((valores: ValoresFormulario) => string);
  ancho?: "full" | "half";
  soloCrear?: boolean;
  deshabilitado?: boolean;
  valorInicial?: string | boolean;
  /** Agrupa el campo dentro de una sección numerada del formulario. */
  seccion?: string;
  /** Texto fijo a la derecha del input (p. ej. "unidades"). */
  sufijo?: string;
  /** Tipos aceptados en campos de archivo (atributo accept). */
  aceptar?: string;
  /** Se limpia cuando cambia el campo indicado (selects dependientes). */
  dependeDe?: string;
};

export type Columna<T> = {
  encabezado: string;
  celda: (item: T) => React.ReactNode;
  alineacion?: "right";
};

export type CrudConfig<T> = {
  titulo: string;
  descripcion?: string;
  recurso: string;
  permiso: string;
  singular: string;
  /** Género gramatical para "Nuevo/Nueva" (por defecto masculino). */
  genero?: "m" | "f";
  columnas: Columna<T>[];
  campos: Campo[];
  filaId: (item: T) => string;
  etiquetaFila: (item: T) => string;
  aValores: (item: T | null) => ValoresFormulario;
  aPayload: (
    valores: ValoresFormulario,
    original: T | null,
  ) => Record<string, unknown> | FormData;
  validar?: (valores: ValoresFormulario) => Record<string, string> | null;
  /** `false` para recursos sin activar/desactivar. */
  tieneActivo?: boolean;
  /** `true` si el backend no permite editar (solo crear y listar). */
  soloCrear?: boolean;
  /** `true` para bitácoras y auditoría: sin alta, edición ni búsqueda. */
  soloLectura?: boolean;
  /** `false` para recursos que solo exponen `GET /recurso` (sin paginación). */
  paginado?: boolean;
  /** Rutas alternativas cuando el backend no sigue el patrón REST habitual. */
  urls?: {
    listar?: string;
    crear?: string;
    editar?: (item: T) => string;
    activo?: (item: T) => string;
  };
  buscarPlaceholder?: string;
  /** Controles adicionales que se muestran junto al buscador. */
  filtros?: React.ReactNode;
  /** Parámetros extra para la consulta paginada (por ejemplo, un filtro). */
  parametros?: Record<string, string | undefined>;
  estadoFila?: (item: T) => { texto: string; activo?: boolean } | null;
  accionesExtra?: (item: T) => React.ReactNode;
  puedeEditarFila?: (item: T) => boolean;
  vacioTitulo?: string;
  vacioDescripcion?: string;
  nota?: string;
};

export function ResourcePage<T extends { publicId: string }>({
  config,
}: {
  config: CrudConfig<T>;
}) {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede(config.permiso, "ver");
  const soloLectura = config.soloLectura === true;
  const puedeCrear = !soloLectura && puede(config.permiso, "crear");
  const puedeEditar = !soloLectura && puede(config.permiso, "editar");
  const etiquetaNuevo = config.genero === "f" ? "Nueva" : "Nuevo";
  const tieneActivo = config.tieneActivo !== false;

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 400);

  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);

  const parametrosExtra = config.parametros;
  const parametrosExtraClave = JSON.stringify(parametrosExtra ?? {});

  const query = useQuery<{ total: number; data: T[] } | T[]>({
    queryKey: [
      "crud",
      config.recurso,
      pagina,
      registros,
      buscarDebounced,
      parametrosExtraClave,
    ],
    queryFn: () => {
      if (config.paginado === false) {
        return apiFetch<T[]>(config.urls?.listar ?? config.recurso);
      }
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (buscarDebounced.trim()) parametros.set("buscar", buscarDebounced.trim());
      for (const [clave, valor] of Object.entries(parametrosExtra ?? {})) {
        if (valor) parametros.set(clave, valor);
      }
      const base = config.urls?.listar ?? `${config.recurso}/paginacion`;
      return apiFetch<{ total: number; data: T[] }>(
        `${base}?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const { filas, total } = useMemo(() => {
    const crudo = query.data;
    if (!crudo) return { filas: [] as T[], total: 0 };

    if (Array.isArray(crudo)) {
      const termino = buscarDebounced.trim().toLowerCase();
      const filtradas = termino
        ? crudo.filter((item) =>
            JSON.stringify(item).toLowerCase().includes(termino),
          )
        : crudo;
      const visibles =
        config.paginado === false
          ? filtradas.slice((pagina - 1) * registros, pagina * registros)
          : filtradas;
      return { filas: visibles, total: filtradas.length };
    }

    return { filas: crudo.data ?? [], total: crudo.total ?? 0 };
  }, [query.data, buscarDebounced, pagina, registros, config.paginado]);

  const alternarEstado = useMutation({
    mutationFn: (item: T) =>
      apiFetch(
        config.urls?.activo?.(item) ??
          `${config.recurso}/activo/${config.filaId(item)}`,
        { method: "PATCH" },
      ),
    onSuccess: (_data, item) => {
      toast.success(
        `${config.etiquetaFila(item)}: estado actualizado correctamente.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["crud", config.recurso] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function abrirNuevo() {
    setEditando(null);
    setSheetAbierto(true);
  }

  function abrirEdicion(item: T) {
    setEditando(item);
    setSheetAbierto(true);
  }

  const columnas = useMemo<ColumnDef<T, unknown>[]>(() => {
    const base: ColumnDef<T, unknown>[] = config.columnas.map((columna, indice) => ({
      id: `col-${indice}`,
      header: columna.encabezado,
      cell: ({ row }) => (
        <div className={cn(columna.alineacion === "right" && "text-right")}>
          {columna.celda(row.original)}
        </div>
      ),
    }));

    if (tieneActivo || config.estadoFila) {
      base.push({
        id: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const estado = config.estadoFila?.(row.original);
          if (estado) {
            return (
              <EstadoBadge estado={estado.texto} activo={estado.activo} />
            );
          }
          const activo = (row.original as { activo?: boolean }).activo;
          return <EstadoBadge activo={activo} />;
        },
      });
    }

    if (!soloLectura)
      base.push({
        id: "acciones",
      header: () => <span className="sr-only">Acciones</span>,
      cell: ({ row }) => {
        const item = row.original;
        const permitido = config.puedeEditarFila?.(item) ?? true;
        if (config.soloCrear && !config.accionesExtra) {
          return <span className="sr-only">Sin acciones</span>;
        }
        return (
          <div className="flex justify-end">
            <DropdownMenu>
              <DropdownMenuTrigger
                className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={`Acciones de ${config.etiquetaFila(item)}`}
              >
                <Ellipsis className="size-4" aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {!config.soloCrear && (
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar || !permitido}
                    onClick={() => abrirEdicion(item)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                )}
                {tieneActivo && !config.soloCrear && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer"
                      disabled={!puedeEditar || !permitido || alternarEstado.isPending}
                      onClick={() => alternarEstado.mutate(item)}
                    >
                      <Power className="size-4" aria-hidden="true" />
                      Activar / desactivar
                    </DropdownMenuItem>
                  </>
                )}
                {config.accionesExtra && (
                  <>
                    {!config.soloCrear && <DropdownMenuSeparator />}
                    {config.accionesExtra(item)}
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    });

    return base;
    // `alternarEstado` y `puedeEditar` se recalculan con cada render; las
    // columnas dependen de ellos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, puedeEditar, tieneActivo, soloLectura, alternarEstado.isPending]);

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo={config.titulo} />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a esta pantalla"
          descripcion={`Tu rol no tiene el permiso ${config.permiso}. Solicita acceso al administrador.`}
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
            <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
              <Plus className="size-3.5" aria-hidden="true" />
              {etiquetaNuevo} {config.singular.toLowerCase()}
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        {!soloLectura && (
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
              placeholder={config.buscarPlaceholder ?? "Buscar…"}
              className="h-8 pl-8"
              aria-label={`Buscar ${config.titulo.toLowerCase()}`}
            />
          </div>
        )}
        {config.filtros}
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {total.toLocaleString("es-MX")} registros
        </p>
      </div>

      {config.nota && (
        <p className="mb-3 rounded-md border border-dashed border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
          {config.nota}
        </p>
      )}

      {query.error ? (
        <ErrorState error={query.error} onReintentar={() => void query.refetch()} />
      ) : (
        <DataTable
          columns={columnas}
          data={filas}
          total={total}
          pagina={pagina}
          registros={registros}
          cargando={query.isPending || query.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={ShieldAlert}
              titulo={
                buscarDebounced
                  ? "Sin resultados para tu búsqueda"
                  : (config.vacioTitulo ?? "Todavía no hay registros")
              }
              descripcion={
                buscarDebounced
                  ? "Prueba con otro término."
                  : config.vacioDescripcion
              }
              accion={
                puedeCrear && !buscarDebounced ? (
                  <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    {etiquetaNuevo} {config.singular.toLowerCase()}
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
          className="flex w-full flex-col gap-0 p-0 sm:max-w-lg"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {editando
                ? `Editar ${config.singular.toLowerCase()}`
                : `${etiquetaNuevo} ${config.singular.toLowerCase()}`}
            </SheetTitle>
            <SheetDescription>
              {editando
                ? "Actualiza la información y guarda los cambios."
                : "Captura la información requerida para crear el registro."}
            </SheetDescription>
          </SheetHeader>

          <FormularioGenerico
            key={editando ? config.filaId(editando) : "nuevo"}
            config={config}
            original={editando}
            onCancelar={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
            onGuardado={() => {
              setSheetAbierto(false);
              setEditando(null);
              void queryClient.invalidateQueries({
                queryKey: ["crud", config.recurso],
              });
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function FormularioGenerico<T extends { publicId: string }>({
  config,
  original,
  onGuardado,
  onCancelar,
}: {
  config: CrudConfig<T>;
  original: T | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<ValoresFormulario>(() => {
    const iniciales = config.aValores(original);
    for (const campo of config.campos) {
      if (valoresVacios(iniciales[campo.nombre]) && campo.valorInicial !== undefined) {
        iniciales[campo.nombre] = campo.valorInicial;
      }
    }
    return iniciales;
  });
  const [errores, setErrores] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = config.aPayload(valores, original);
      const esEdicion = Boolean(original?.publicId);
      const url = esEdicion
        ? (config.urls?.editar?.(original as T) ??
          `${config.recurso}/${config.filaId(original as T)}`)
        : (config.urls?.crear ?? config.recurso);

      if (payload instanceof FormData) {
        return apiFetch(url, {
          method: esEdicion ? "PUT" : "POST",
          body: payload,
        });
      }

      return apiFetch(url, {
        method: esEdicion ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
    },
    onSuccess: () => {
      toast.success(
        original
          ? `${config.singular} actualizado correctamente.`
          : `${config.singular} creado correctamente.`,
      );
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevosErrores: Record<string, string> = {};

    for (const campo of config.campos) {
      if (campo.soloCrear && original) continue;
      const valor = valores[campo.nombre];
      if (campo.requerido && valoresVacios(valor)) {
        nuevosErrores[campo.nombre] = "Este campo es obligatorio.";
      }
    }

    const extra = config.validar?.(valores);
    if (extra) Object.assign(nuevosErrores, extra);

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    mutation.mutate();
  }

  function actualizar(nombre: string, valor: ValorCampo) {
    setValores((previos) => {
      const siguientes = { ...previos, [nombre]: valor };
      for (const campo of config.campos) {
        if (campo.dependeDe === nombre) {
          siguientes[campo.nombre] = "";
        }
      }
      return siguientes;
    });
  }

  const camposVisibles = config.campos.filter(
    (campo) => !(campo.soloCrear && original),
  );

  const secciones = new Map<string, Campo[]>();
  for (const campo of camposVisibles) {
    const titulo = campo.seccion ?? "Información general";
    const lista = secciones.get(titulo) ?? [];
    lista.push(campo);
    secciones.set(titulo, lista);
  }

  const imagenActual = imagenDeOriginal(original);

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {[...secciones.entries()].map(([titulo, campos], indice) => (
          <SeccionFormulario key={titulo} numero={indice + 1} titulo={titulo}>
            {campos.map((campo) => {
              const valor = valores[campo.nombre];
              const error = errores[campo.nombre];
              const esImagen = campo.tipo === "file";
              const esArchivo = campo.tipo === "archivo";
              const opcionesCampo =
                typeof campo.opciones === "function"
                  ? campo.opciones(valores)
                  : (campo.opciones ?? []);
              const ayudaCampo =
                typeof campo.ayuda === "function"
                  ? campo.ayuda(valores)
                  : campo.ayuda;

              return (
                <div key={campo.nombre} className="space-y-1.5">
                  {!esImagen && !esArchivo && (
                    <div>
                      <Label htmlFor={campo.nombre} className="font-semibold">
                        {campo.etiqueta}
                      </Label>
                      {ayudaCampo && campo.tipo !== "checkbox" && (
                        <p className="text-xs text-muted-foreground">
                          {ayudaCampo}
                        </p>
                      )}
                    </div>
                  )}

                  {esImagen ? (
                    <CampoImagen
                      id={campo.nombre}
                      etiqueta={campo.etiqueta}
                      ayuda={ayudaCampo}
                      srcActual={imagenActual}
                      nombreArchivo={
                        valor instanceof File ? valor.name : null
                      }
                      deshabilitado={campo.deshabilitado}
                      onSeleccionar={(archivo) =>
                        actualizar(campo.nombre, archivo)
                      }
                      onQuitar={() => actualizar(campo.nombre, null)}
                    />
                  ) : esArchivo ? (
                    <CampoArchivo
                      id={campo.nombre}
                      etiqueta={campo.etiqueta}
                      ayuda={ayudaCampo}
                      aceptar={campo.aceptar}
                      nombreArchivo={
                        valor instanceof File ? valor.name : null
                      }
                      deshabilitado={campo.deshabilitado}
                      onSeleccionar={(archivo) =>
                        actualizar(campo.nombre, archivo)
                      }
                      onQuitar={() => actualizar(campo.nombre, null)}
                    />
                  ) : campo.tipo === "textarea" ? (
                    <Textarea
                      id={campo.nombre}
                      value={typeof valor === "string" ? valor : ""}
                      onChange={(evento) =>
                        actualizar(campo.nombre, evento.target.value)
                      }
                      rows={3}
                      aria-invalid={Boolean(error) || undefined}
                    />
                  ) : campo.tipo === "select" ? (
                    <select
                      id={campo.nombre}
                      value={typeof valor === "string" ? valor : ""}
                      onChange={(evento) =>
                        actualizar(campo.nombre, evento.target.value)
                      }
                      disabled={campo.deshabilitado}
                      aria-invalid={Boolean(error) || undefined}
                      className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="">Selecciona…</option>
                      {opcionesCampo.map((opcion) => (
                        <option key={opcion.valor} value={opcion.valor}>
                          {opcion.etiqueta}
                        </option>
                      ))}
                    </select>
                  ) : campo.tipo === "checkbox" ? (
                    <label className="flex h-9 cursor-pointer items-center gap-2 text-sm">
                      <input
                        id={campo.nombre}
                        type="checkbox"
                        checked={Boolean(valor)}
                        onChange={(evento) =>
                          actualizar(campo.nombre, evento.target.checked)
                        }
                        className="size-4 cursor-pointer accent-[var(--primary)]"
                      />
                      <span className="text-muted-foreground">
                        {ayudaCampo ?? "Sí"}
                      </span>
                    </label>
                  ) : campo.tipo === "dias" ? (
                    <div
                      id={campo.nombre}
                      role="group"
                      aria-label={campo.etiqueta}
                      className="flex flex-wrap gap-1.5"
                    >
                      {opcionesCampo.map((opcion) => {
                        const seleccionados = (
                          typeof valor === "string" ? valor : ""
                        )
                          .split(",")
                          .map((item) => item.trim())
                          .filter(Boolean);
                        const activo = seleccionados.includes(opcion.valor);
                        return (
                          <Button
                            key={opcion.valor}
                            type="button"
                            size="sm"
                            variant={activo ? "default" : "outline"}
                            aria-pressed={activo}
                            title={opcion.etiqueta}
                            className="h-8 w-10 cursor-pointer px-0 text-xs font-semibold"
                            onClick={() => {
                              const conjunto = new Set(seleccionados);
                              if (activo) conjunto.delete(opcion.valor);
                              else conjunto.add(opcion.valor);
                              const siguientes = opcionesCampo
                                .filter((item) => conjunto.has(item.valor))
                                .map((item) => item.valor)
                                .join(",");
                              actualizar(campo.nombre, siguientes);
                            }}
                          >
                            {opcion.valor}
                          </Button>
                        );
                      })}
                    </div>
                  ) : campo.sufijo ? (
                    <div className="relative">
                      <Input
                        id={campo.nombre}
                        type={campo.tipo}
                        inputMode={campo.tipo === "number" ? "decimal" : undefined}
                        value={typeof valor === "string" ? valor : ""}
                        onChange={(evento) =>
                          actualizar(campo.nombre, evento.target.value)
                        }
                        disabled={campo.deshabilitado}
                        aria-invalid={Boolean(error) || undefined}
                        autoComplete="off"
                        className="h-9 pr-20"
                      />
                      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        {campo.sufijo}
                      </span>
                    </div>
                  ) : (
                    <Input
                      id={campo.nombre}
                      type={campo.tipo}
                      inputMode={campo.tipo === "number" ? "decimal" : undefined}
                      value={typeof valor === "string" ? valor : ""}
                      onChange={(evento) =>
                        actualizar(campo.nombre, evento.target.value)
                      }
                      disabled={campo.deshabilitado}
                      aria-invalid={Boolean(error) || undefined}
                      autoComplete="off"
                      className="h-9"
                    />
                  )}

                  {error && <p className="text-xs text-destructive">{error}</p>}
                </div>
              );
            })}
          </SeccionFormulario>
        ))}
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
        <Button
          type="submit"
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-4" aria-hidden="true" />
          )}
          {original
            ? `Guardar ${config.singular.toLowerCase()}`
            : `Crear ${config.singular.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
}

function imagenDeOriginal(original: unknown): string | null {
  if (!original || typeof original !== "object") return null;

  const datos = original as Record<string, unknown>;
  for (const clave of ["foto", "imagen", "imagenUrl", "logoUrl", "archivo"]) {
    const valor = datos[clave];
    if (typeof valor === "string" && valor.length > 0) {
      return mediaUrl(valor);
    }
  }
  return null;
}

function valoresVacios(valor: ValorCampo | undefined) {
  return valor === undefined || valor === null || valor === "";
}
