"use client";

import { useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { LoaderCircle, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { mediaUrl, numero } from "@/lib/format";
import {
  imagenProducto,
  type Categoria,
  type Producto,
  type UnidadMedida,
} from "@/lib/types/almacen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { CampoImagen } from "@/components/crud/campo-imagen";

const requerido = "Este campo es obligatorio.";

function precioValido(valor: string) {
  const numeroValor = Number(valor);
  return Number.isFinite(numeroValor) && numeroValor >= 0;
}

const esquema = z.object({
  codigo: z.string().trim().min(1, requerido),
  nombre: z.string().trim().min(1, requerido),
  descripcion: z.string().optional(),
  precioCosto: z
    .string()
    .trim()
    .min(1, requerido)
    .refine(precioValido, "Captura un número válido."),
  precioVenta: z
    .string()
    .trim()
    .min(1, requerido)
    .refine(precioValido, "Captura un número válido."),
  categoriaId: z.string().optional(),
  unidadMedidaId: z.string().trim().min(1, "Selecciona una unidad de medida."),
});

type Valores = z.infer<typeof esquema>;

export function ProductoFormulario({
  producto,
  categorias,
  unidades,
  puedeUnidades,
  onGuardado,
  onCancelar,
}: {
  producto: Producto | null;
  categorias: Categoria[];
  unidades: UnidadMedida[];
  puedeUnidades: boolean;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const queryClient = useQueryClient();
  const [archivo, setArchivo] = useState<File | null>(null);

  const valoresIniciales = useMemo<Valores>(
    () => ({
      codigo: producto?.codigo ?? "",
      nombre: producto?.nombre ?? "",
      descripcion: producto?.descripcion ?? "",
      precioCosto:
        producto?.precioCosto === null || producto?.precioCosto === undefined
          ? ""
          : String(numero(producto.precioCosto)),
      precioVenta:
        producto?.precioVenta === null || producto?.precioVenta === undefined
          ? ""
          : String(numero(producto.precioVenta)),
      categoriaId:
        producto?.categoria?.publicId ?? producto?.categoriaId ?? "",
      unidadMedidaId:
        producto?.unidadMedida?.publicId ?? producto?.unidadMedidaId ?? "",
    }),
    [producto],
  );

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Valores>({
    resolver: zodResolver(esquema),
    defaultValues: valoresIniciales,
  });

  const mutation = useMutation({
    mutationFn: async (valores: Valores) => {
      const base: Record<string, unknown> = {
        codigo: valores.codigo.trim(),
        nombre: valores.nombre.trim(),
        precioCosto: Number(valores.precioCosto),
        precioVenta: Number(valores.precioVenta),
        unidadMedidaId: valores.unidadMedidaId,
      };

      if (valores.descripcion?.trim()) {
        base.descripcion = valores.descripcion.trim();
      }
      if (valores.categoriaId) {
        base.categoriaId = valores.categoriaId;
      }

      const esEdicion = Boolean(producto?.publicId);
      const url = esEdicion
        ? `/almacen/productos/${producto?.publicId}`
        : "/almacen/productos";

      if (archivo) {
        const form = new FormData();
        for (const [clave, valor] of Object.entries(base)) {
          if (valor !== undefined && valor !== null) {
            form.append(clave, String(valor));
          }
        }
        form.append("archivo", archivo);
        return apiFetch<Producto>(url, {
          method: esEdicion ? "PUT" : "POST",
          body: form,
        });
      }

      return apiFetch<Producto>(url, {
        method: esEdicion ? "PUT" : "POST",
        body: JSON.stringify(base),
      });
    },
    onSuccess: () => {
      toast.success(
        producto?.publicId
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente.",
      );
      void queryClient.invalidateQueries({ queryKey: ["productos"] });
      onGuardado();
    },
    onError: (error) => {
      toast.error(mensajeDeError(error));
    },
  });

  const imagenActual = mediaUrl(imagenProducto(producto ?? ({} as Producto)));

  return (
    <form
      onSubmit={handleSubmit((valores) => mutation.mutate(valores))}
      className="flex min-h-0 flex-1 flex-col"
      noValidate
    >
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <SeccionFormulario numero={1} titulo="Información general">
          <div className="space-y-1.5">
            <Label htmlFor="codigo" className="font-semibold">
              Código
            </Label>
            <Input
              id="codigo"
              {...register("codigo")}
              placeholder="PROD-001"
              aria-invalid={Boolean(errors.codigo) || undefined}
              autoComplete="off"
              className="h-9"
            />
            {errors.codigo && (
              <p className="text-xs text-destructive">{errors.codigo.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="font-semibold">
              Nombre
            </Label>
            <Input
              id="nombre"
              {...register("nombre")}
              placeholder="Laptop HP ProBook"
              aria-invalid={Boolean(errors.nombre) || undefined}
              className="h-9"
            />
            {errors.nombre && (
              <p className="text-xs text-destructive">{errors.nombre.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="descripcion" className="font-semibold">
              Descripción
            </Label>
            <Textarea
              id="descripcion"
              {...register("descripcion")}
              placeholder="Descripción opcional"
              rows={3}
            />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Precios">
          <div className="space-y-1.5">
            <Label htmlFor="precioCosto" className="font-semibold">
              Precio costo
            </Label>
            <div className="relative">
              <Input
                id="precioCosto"
                inputMode="decimal"
                {...register("precioCosto")}
                placeholder="0.00"
                aria-invalid={Boolean(errors.precioCosto) || undefined}
                className="h-9 pr-16"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                MXN
              </span>
            </div>
            {errors.precioCosto && (
              <p className="text-xs text-destructive">
                {errors.precioCosto.message}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="precioVenta" className="font-semibold">
              Precio venta
            </Label>
            <div className="relative">
              <Input
                id="precioVenta"
                inputMode="decimal"
                {...register("precioVenta")}
                placeholder="0.00"
                aria-invalid={Boolean(errors.precioVenta) || undefined}
                className="h-9 pr-16"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                MXN
              </span>
            </div>
            {errors.precioVenta && (
              <p className="text-xs text-destructive">
                {errors.precioVenta.message}
              </p>
            )}
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={3} titulo="Clasificación">
          <div className="space-y-1.5">
            <Label htmlFor="categoriaId" className="font-semibold">
              Categoría
            </Label>
            <select
              id="categoriaId"
              {...register("categoriaId")}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Sin categoría</option>
              {categorias.map((categoria) => (
                <option key={categoria.publicId} value={categoria.publicId}>
                  {categoria.nombre}
                  {categoria.activo === false ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="unidadMedidaId" className="font-semibold">
              Unidad de medida
            </Label>
            <select
              id="unidadMedidaId"
              {...register("unidadMedidaId")}
              disabled={!puedeUnidades}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
            >
              <option value="">Selecciona una unidad</option>
              {unidades.map((unidad) => (
                <option key={unidad.publicId} value={unidad.publicId}>
                  {unidad.nombre}
                  {unidad.abreviatura ? ` (${unidad.abreviatura})` : ""}
                </option>
              ))}
            </select>
            {errors.unidadMedidaId && (
              <p className="text-xs text-destructive">
                {errors.unidadMedidaId.message}
              </p>
            )}
            {!puedeUnidades && (
              <p className="text-xs text-muted-foreground">
                Necesitas permiso sobre /almacen/unidades-medida para elegir una
                unidad.
              </p>
            )}
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={4} titulo="Imagen">
          <CampoImagen
            id="archivo"
            etiqueta="Fotografía del producto"
            ayuda="JPG, PNG o WebP. Máximo 5 MB."
            srcActual={imagenActual}
            nombreArchivo={archivo?.name ?? null}
            onSeleccionar={setArchivo}
            onQuitar={() => setArchivo(null)}
          />
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
          {producto?.publicId ? "Guardar producto" : "Crear producto"}
        </Button>
      </div>
    </form>
  );
}
