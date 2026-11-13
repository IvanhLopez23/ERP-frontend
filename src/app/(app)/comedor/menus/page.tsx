"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CalendarDays,
  ChevronDown,
  LoaderCircle,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { fechaCorta, fechaISO, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type ItemMenu = {
  publicId?: string;
  fecha?: string | null;
  tipoComida?: string | null;
  descripcion?: string | null;
  activo?: boolean;
};

type Menu = {
  publicId: string;
  nombre?: string | null;
  periodicidad?: string | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  activo?: boolean;
  items?: ItemMenu[];
};

type ItemFormulario = {
  fecha: string;
  tipoComida: string;
  descripcion: string;
};

const ITEM_VACIO = (fecha: string): ItemFormulario => ({
  fecha,
  tipoComida: "comida",
  descripcion: "",
});

export default function MenusComedorPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/comedor", "ver");
  const puedeCrear = puede("/comedor", "crear");

  const [sheetAbierto, setSheetAbierto] = useState(false);

  const menus = useQuery<Menu[]>({
    queryKey: ["comedor-menus"],
    queryFn: () => apiFetch<Menu[]>("/comedor/menus"),
    enabled: puedeVer,
  });

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Menús de comedor" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso al comedor"
          descripcion="Tu rol no tiene el permiso /comedor."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Menús de comedor"
        descripcion="Menús publicados por periodo. El backend valida que la periodicidad coincida con el turno del empleado."
        acciones={
          puedeCrear ? (
            <Button
              size="sm"
              className="cursor-pointer"
              onClick={() => setSheetAbierto(true)}
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Nuevo menú
            </Button>
          ) : null
        }
      />

      {menus.isPending ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, indice) => (
            <Skeleton key={indice} className="h-52 rounded-lg" />
          ))}
        </div>
      ) : menus.error ? (
        <ErrorState error={menus.error} onReintentar={() => void menus.refetch()} />
      ) : (menus.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icono={UtensilsCrossed}
            titulo="Todavía no hay menús publicados"
            descripcion="Publica el primer menú para que el personal pueda separar sus comidas."
            accion={
              puedeCrear ? (
                <Button
                  size="sm"
                  className="cursor-pointer"
                  onClick={() => setSheetAbierto(true)}
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  Nuevo menú
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {(menus.data ?? []).map((menu) => (
            <TarjetaMenu key={menu.publicId} menu={menu} />
          ))}
        </div>
      )}

      <Sheet open={sheetAbierto} onOpenChange={setSheetAbierto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
        >
          <SheetHeader className="border-b border-border px-4 py-3">
            <SheetTitle className="text-base">Nuevo menú</SheetTitle>
            <SheetDescription>
              Define el periodo y las comidas por día. Debe corresponder a la
              siguiente semana, quincena o mes del turno del empleado.
            </SheetDescription>
          </SheetHeader>

          <FormularioMenu
            onCancelar={() => setSheetAbierto(false)}
            onGuardado={() => {
              setSheetAbierto(false);
              void queryClient.invalidateQueries({ queryKey: ["comedor-menus"] });
            }}
          />
        </SheetContent>
      </Sheet>
    </>
  );
}

function TarjetaMenu({ menu }: { menu: Menu }) {
  const items = menu.items ?? [];
  const [abierto, setAbierto] = useState(true);

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold">
            {texto(menu.nombre)}
          </h2>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {fechaCorta(menu.fechaInicio)} → {fechaCorta(menu.fechaFin)}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-xs capitalize text-muted-foreground">
            {texto(menu.periodicidad)}
          </span>
          <EstadoBadge activo={menu.activo} />
        </div>
      </div>

      <Collapsible open={abierto} onOpenChange={setAbierto} className="mt-3">
        <CollapsibleTrigger className="flex w-full cursor-pointer items-center justify-between rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted">
          {items.length} comidas publicadas
          <ChevronDown
            className={`size-3.5 transition-transform ${abierto ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <ul className="mt-2 divide-y divide-border">
            {items.length === 0 && (
              <li className="py-2 text-xs text-muted-foreground">
                Este menú no tiene comidas.
              </li>
            )}
            {items.map((item) => (
              <li
                key={item.publicId ?? `${item.fecha}-${item.tipoComida}`}
                className="flex items-start gap-2 py-1.5"
              >
                <span className="mt-0.5 w-[86px] shrink-0 text-xs font-medium">
                  {fechaCorta(item.fecha)}
                </span>
                <span className="w-[70px] shrink-0 text-xs capitalize text-muted-foreground">
                  {texto(item.tipoComida)}
                </span>
                <span className="min-w-0 flex-1 text-xs">
                  {texto(item.descripcion)}
                </span>
              </li>
            ))}
          </ul>
        </CollapsibleContent>
      </Collapsible>
    </article>
  );
}

function FormularioMenu({
  onGuardado,
  onCancelar,
}: {
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const hoy = fechaISO(new Date());

  const [nombre, setNombre] = useState("");
  const [periodicidad, setPeriodicidad] = useState("semanal");
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [activo, setActivo] = useState(true);
  const [items, setItems] = useState<ItemFormulario[]>([ITEM_VACIO(hoy)]);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch("/comedor/menus", {
        method: "POST",
        body: JSON.stringify({
          nombre: nombre.trim(),
          periodicidad,
          fechaInicio,
          fechaFin,
          activo,
          items: items.map((item) => ({
            fecha: item.fecha,
            tipoComida: item.tipoComida,
            descripcion: item.descripcion.trim(),
          })),
        }),
      }),
    onSuccess: () => {
      toast.success("Menú publicado correctamente.");
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError("El nombre del menú es obligatorio.");
      return;
    }
    if (!fechaInicio || !fechaFin) {
      setError("Define el periodo del menú.");
      return;
    }
    if (fechaFin < fechaInicio) {
      setError("La fecha fin no puede ser anterior al inicio.");
      return;
    }
    if (items.length === 0) {
      setError("Agrega al menos una comida.");
      return;
    }
    if (items.some((item) => !item.fecha || !item.descripcion.trim())) {
      setError("Cada comida necesita fecha y descripción.");
      return;
    }

    mutation.mutate();
  }

  function actualizarItem(indice: number, cambios: Partial<ItemFormulario>) {
    setItems((previos) =>
      previos.map((item, posicion) =>
        posicion === indice ? { ...item, ...cambios } : item,
      ),
    );
  }

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {error && (
          <p className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <SeccionFormulario numero={1} titulo="Periodo">
          <div className="space-y-3">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="nombreMenu">Nombre</Label>
            <Input
              id="nombreMenu"
              value={nombre}
              onChange={(evento) => setNombre(evento.target.value)}
              placeholder="Menú semanal 2026-11-09"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="periodicidadMenu">Periodicidad</Label>
            <select
              id="periodicidadMenu"
              value={periodicidad}
              onChange={(evento) => setPeriodicidad(evento.target.value)}
              className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="semanal">Semanal</option>
              <option value="quincenal">Quincenal</option>
              <option value="mensual">Mensual</option>
            </select>
          </div>

          <div className="flex items-end">
            <label className="flex h-8 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={activo}
                onChange={(evento) => setActivo(evento.target.checked)}
                className="size-4 cursor-pointer accent-[var(--primary)]"
              />
              <span className="text-muted-foreground">Publicar como activo</span>
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fechaInicioMenu">Inicio</Label>
            <Input
              id="fechaInicioMenu"
              type="date"
              value={fechaInicio}
              onChange={(evento) => {
                setFechaInicio(evento.target.value);
                setItems((previos) =>
                  previos.map((item, indice) =>
                    indice === 0 ? { ...item, fecha: evento.target.value } : item,
                  ),
                );
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fechaFinMenu">Fin</Label>
            <Input
              id="fechaFinMenu"
              type="date"
              value={fechaFin}
              min={fechaInicio}
              onChange={(evento) => setFechaFin(evento.target.value)}
            />
          </div>
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Comidas">
          <div className="flex items-center justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="cursor-pointer"
              onClick={() =>
                setItems((previos) => [...previos, ITEM_VACIO(fechaInicio)])
              }
            >
              <Plus className="size-3.5" aria-hidden="true" />
              Agregar comida
            </Button>
          </div>

          <div className="space-y-2">
            {items.map((item, indice) => (
              <div
                key={indice}
                className="grid grid-cols-12 items-end gap-2 rounded-md border border-border p-2"
              >
                <div className="col-span-5 space-y-1 sm:col-span-3">
                  <Label className="text-xs" htmlFor={`item-fecha-${indice}`}>
                    Fecha
                  </Label>
                  <Input
                    id={`item-fecha-${indice}`}
                    type="date"
                    className="h-8"
                    value={item.fecha}
                    onChange={(evento) =>
                      actualizarItem(indice, { fecha: evento.target.value })
                    }
                  />
                </div>
                <div className="col-span-4 space-y-1 sm:col-span-2">
                  <Label className="text-xs" htmlFor={`item-tipo-${indice}`}>
                    Comida
                  </Label>
                  <select
                    id={`item-tipo-${indice}`}
                    value={item.tipoComida}
                    onChange={(evento) =>
                      actualizarItem(indice, { tipoComida: evento.target.value })
                    }
                    className="h-8 w-full cursor-pointer rounded-lg border border-input bg-background px-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="desayuno">Desayuno</option>
                    <option value="comida">Comida</option>
                    <option value="cena">Cena</option>
                  </select>
                </div>
                <div className="col-span-12 space-y-1 sm:col-span-6">
                  <Label className="text-xs" htmlFor={`item-desc-${indice}`}>
                    Descripción
                  </Label>
                  <Textarea
                    id={`item-desc-${indice}`}
                    rows={1}
                    value={item.descripcion}
                    onChange={(evento) =>
                      actualizarItem(indice, { descripcion: evento.target.value })
                    }
                  />
                </div>
                <div className="col-span-12 flex justify-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer text-muted-foreground"
                    aria-label="Quitar comida"
                    disabled={items.length === 1}
                    onClick={() =>
                      setItems((previos) =>
                        previos.filter((_, posicion) => posicion !== indice),
                      )
                    }
                  >
                    <Trash2 className="size-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </SeccionFormulario>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-4 py-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onCancelar}
          disabled={mutation.isPending}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-3.5" aria-hidden="true" />
          )}
          Publicar menú
        </Button>
      </div>
    </form>
  );
}
