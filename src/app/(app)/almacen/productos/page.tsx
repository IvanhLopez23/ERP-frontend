"use client";

import Image from "next/image";
import { useCallback, useMemo, useState } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Ellipsis,
  Package,
  Pencil,
  Plus,
  Power,
  Search,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { useDebounce } from "@/hooks/use-debounce";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import {
  imagenProducto as obtenerImagen,
  type Categoria,
  type Paginado,
  type Producto,
  type UnidadMedida,
} from "@/lib/types/almacen";
import { mediaUrl, moneda, numero, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable } from "@/components/data-table/data-table";
import { ProductoFormulario } from "@/components/almacen/producto-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

export default function ProductosPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/almacen/productos", "ver");
  const puedeCrear = puede("/almacen/productos", "crear");
  const puedeEditar = puede("/almacen/productos", "editar");
  const puedeUnidades = puede("/almacen/unidades-medida");

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 400);

  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);

  const productos = useQuery<Paginado<Producto>>({
    queryKey: ["productos", pagina, registros, buscarDebounced],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (buscarDebounced.trim()) parametros.set("buscar", buscarDebounced.trim());
      return apiFetch<Paginado<Producto>>(
        `/almacen/productos/paginacion?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const categorias = useQuery<Categoria[]>({
    queryKey: ["categorias-producto"],
    queryFn: () =>
      apiFetch<Categoria[]>("/almacen/productos/categorias"),
    enabled: puedeVer,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const unidades = useQuery<UnidadMedida[]>({
    queryKey: ["unidades-medida"],
    queryFn: () => apiFetch<UnidadMedida[]>("/almacen/unidades-medida"),
    enabled: puedeUnidades,
    staleTime: 5 * 60_000,
  });

  const alternarEstado = useMutation({
    mutationFn: (producto: Producto) =>
      apiFetch(`/almacen/productos/activo/${producto.publicId}`, {
        method: "PATCH",
      }),
    onSuccess: (_data, producto) => {
      toast.success(
        producto.activo
          ? `"${producto.nombre ?? "Producto"}" se desactivó.`
          : `"${producto.nombre ?? "Producto"}" se activó.`,
      );
      void queryClient.invalidateQueries({ queryKey: ["productos"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const abrirNuevo = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["categorias-producto"] });
    setEditando(null);
    setSheetAbierto(true);
  }, [queryClient]);

  const abrirEdicion = useCallback(
    (producto: Producto) => {
      void queryClient.invalidateQueries({ queryKey: ["categorias-producto"] });
      setEditando(producto);
      setSheetAbierto(true);
    },
    [queryClient],
  );

  const columnas = useMemo<ColumnDef<Producto, unknown>[]>(
    () => [
      {
        id: "producto",
        header: "Producto",
        cell: ({ row }) => {
          const producto = row.original;
          const imagen = mediaUrl(obtenerImagen(producto));
          return (
            <div className="flex items-center gap-2.5">
              <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                {imagen ? (
                  <Image
                    src={imagen}
                    alt=""
                    width={36}
                    height={36}
                    className="size-9 object-cover"
                    unoptimized
                  />
                ) : (
                  <Package
                    className="size-4 text-muted-foreground"
                    aria-hidden="true"
                  />
                )}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {texto(producto.nombre, "Sin nombre")}
                </p>
                <p className="truncate font-mono text-xs text-muted-foreground">
                  {texto(producto.codigo, "—")}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        id: "categoria",
        header: "Categoría",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.categoria?.nombre ?? "Sin categoría"}
          </span>
        ),
      },
      {
        id: "unidad",
        header: "Unidad",
        cell: ({ row }) => (
          <span className="text-sm">
            {row.original.unidadMedida?.abreviatura ??
              row.original.unidadMedida?.nombre ??
              "—"}
          </span>
        ),
      },
      {
        id: "precioVenta",
        header: () => <span className="block text-right">Precio venta</span>,
        cell: ({ row }) => (
          <span className="tabular block text-right font-medium">
            {moneda(row.original.precioVenta)}
          </span>
        ),
      },
      {
        id: "existencia",
        header: () => <span className="block text-right">Existencia</span>,
        cell: ({ row }) => {
          const existencia = row.original.existencias ?? row.original.stock;
          return (
            <span className="tabular block text-right text-sm">
              {existencia === undefined || existencia === null
                ? "—"
                : numero(existencia).toLocaleString("es-MX")}
            </span>
          );
        },
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => (
          <Badge
            variant="outline"
            className={cn(
              "gap-1.5 font-medium",
              row.original.activo
                ? "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400"
                : "border-border bg-muted text-muted-foreground",
            )}
          >
            <span
              className={cn(
                "size-1.5 rounded-full",
                row.original.activo ? "bg-emerald-600" : "bg-muted-foreground",
              )}
              aria-hidden="true"
            />
            {row.original.activo ? "Activo" : "Inactivo"}
          </Badge>
        ),
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const producto = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Acciones de ${producto.nombre ?? "producto"}`}
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar}
                    onClick={() => abrirEdicion(producto)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar || alternarEstado.isPending}
                    onClick={() => alternarEstado.mutate(producto)}
                  >
                    <Power className="size-4" aria-hidden="true" />
                    {producto.activo ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [puedeEditar, alternarEstado, abrirEdicion],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Productos" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a Productos"
          descripcion="Tu rol no tiene el permiso /almacen/productos. Solicita acceso al administrador."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Productos"
        descripcion="Catálogo de productos con precios, unidad de medida y estado."
        acciones={
          puedeCrear ? (
            <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
              <Plus className="size-3.5" aria-hidden="true" />
              Nuevo producto
            </Button>
          ) : null
        }
      />

      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
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
            placeholder="Buscar por código o nombre…"
            className="h-8 pl-8"
            aria-label="Buscar productos"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {productos.data
            ? `${productos.data.total.toLocaleString("es-MX")} productos`
            : " "}
        </p>
      </div>

      {productos.error ? (
        <ErrorState
          error={productos.error}
          onReintentar={() => void productos.refetch()}
        />
      ) : (
        <DataTable
          columns={columnas}
          data={productos.data?.data ?? []}
          total={productos.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={productos.isPending || productos.isFetching}
          onPaginaChange={setPagina}
          onRegistrosChange={(valor) => {
            setRegistros(valor);
            setPagina(1);
          }}
          vacio={
            <EmptyState
              icono={Package}
              titulo={
                buscarDebounced
                  ? "Sin resultados para tu búsqueda"
                  : "Todavía no hay productos"
              }
              descripcion={
                buscarDebounced
                  ? "Prueba con otro código o nombre."
                  : "Crea el primer producto para comenzar a operar el almacén."
              }
              accion={
                puedeCrear && !buscarDebounced ? (
                  <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Nuevo producto
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
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">
              {editando ? "Editar producto" : "Nuevo producto"}
            </SheetTitle>
            <SheetDescription>
              {editando
                ? "Actualiza los datos del producto. Los cambios se guardan en el servidor."
                : "Captura los datos básicos. Podrás editar el producto después."}
            </SheetDescription>
          </SheetHeader>

          <ProductoFormulario
            key={editando?.publicId ?? "nuevo"}
            producto={editando}
            categorias={categorias.data ?? []}
            unidades={unidades.data ?? []}
            puedeUnidades={puedeUnidades}
            onGuardado={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
            onCancelar={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}
