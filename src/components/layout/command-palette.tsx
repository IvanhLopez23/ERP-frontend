"use client";

import { useRouter } from "next/navigation";
import { useMemo } from "react";

import { useAuth } from "@/providers/auth-provider";
import { aplanar } from "@/lib/permisos";
import { PANTALLAS_UI } from "@/lib/navegacion";
import { iconoPorNombre } from "@/lib/iconos";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const { sesion, puede } = useAuth();
  const router = useRouter();

  const pantallas = useMemo(() => {
    const base = aplanar(sesion?.permisos ?? [])
      .filter((nodo) => nodo.ver && nodo.ruta && nodo.ruta !== "#")
      .map((nodo) => ({
        id: nodo.pantallaId || nodo.ruta,
        nombre: nodo.nombre,
        ruta: nodo.ruta,
        modulo: nodo.modulo ?? "General",
        icono: nodo.icono,
      }));

    const rutas = new Set(base.map((pantalla) => pantalla.ruta));
    const extra = PANTALLAS_UI.filter(
      (pantalla) => !rutas.has(pantalla.ruta) && puede(pantalla.ruta),
    ).map((pantalla) => ({ id: pantalla.ruta, ...pantalla }));

    return [...base, ...extra].sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es"),
    );
  }, [sesion, puede]);

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Buscar pantalla"
      description="Escribe el nombre de la pantalla a la que quieres ir."
    >
      <CommandInput placeholder="Buscar pantalla, módulo o ruta…" />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>
        <CommandGroup heading="Pantallas">
          {pantallas.map((pantalla) => {
            const Icono = iconoPorNombre(pantalla.icono);
            return (
              <CommandItem
                key={pantalla.id}
                value={`${pantalla.nombre} ${pantalla.modulo} ${pantalla.ruta}`}
                onSelect={() => {
                  onOpenChange(false);
                  router.push(pantalla.ruta);
                }}
              >
                <Icono className="size-4" aria-hidden="true" />
                <span>{pantalla.nombre}</span>
                <span className="ml-auto truncate text-xs text-muted-foreground">
                  {pantalla.modulo}
                </span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
