"use client";

import { useCallback, useState, useSyncExternalStore } from "react";
import { LoaderCircle } from "lucide-react";

import { useAuth } from "@/providers/auth-provider";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";

import { SidebarContenido } from "./app-sidebar";
import { Topbar } from "./topbar";

const CLAVE_COLAPSADO = "erp.sidebar.colapsado";
const EVENTO_SIDEBAR = "erp:sidebar";

function suscribir(notificar: () => void) {
  window.addEventListener("storage", notificar);
  window.addEventListener(EVENTO_SIDEBAR, notificar);
  return () => {
    window.removeEventListener("storage", notificar);
    window.removeEventListener(EVENTO_SIDEBAR, notificar);
  };
}

function leerColapsado() {
  return window.localStorage.getItem(CLAVE_COLAPSADO) === "1";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { cargando } = useAuth();
  const colapsado = useSyncExternalStore(suscribir, leerColapsado, () => false);
  const [menuMovil, setMenuMovil] = useState(false);

  const alternar = useCallback(() => {
    const siguiente = !leerColapsado();
    window.localStorage.setItem(CLAVE_COLAPSADO, siguiente ? "1" : "0");
    window.dispatchEvent(new Event(EVENTO_SIDEBAR));
  }, []);

  const expandir = useCallback(() => {
    if (!leerColapsado()) return;
    window.localStorage.setItem(CLAVE_COLAPSADO, "0");
    window.dispatchEvent(new Event(EVENTO_SIDEBAR));
  }, []);

  if (cargando) {
    return (
      <div className="grid min-h-dvh place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin" aria-hidden="true" />
          <p className="text-sm">Cargando tu sesión…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-background">
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 border-r border-border transition-[width] duration-200 lg:block ${
          colapsado ? "w-[68px]" : "w-[260px]"
        }`}
      >
        <SidebarContenido colapsado={colapsado} onExpandir={expandir} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          onAbrirMenu={() => setMenuMovil(true)}
          colapsado={colapsado}
          onAlternar={alternar}
        />
        <main id="contenido" className="flex-1 px-3 py-4 md:px-6 md:py-6">
          <div className="mx-auto w-full max-w-[1600px]">{children}</div>
        </main>
      </div>

      <Sheet open={menuMovil} onOpenChange={setMenuMovil}>
        <SheetContent
          side="left"
          className="w-[280px] bg-sidebar p-0 sm:max-w-[280px]"
          showCloseButton={false}
        >
          <SheetTitle className="sr-only">Menú de navegación</SheetTitle>
          <SheetDescription className="sr-only">
            Pantallas disponibles para tu rol.
          </SheetDescription>
          <SidebarContenido
            colapsado={false}
            onNavegar={() => setMenuMovil(false)}
          />
        </SheetContent>
      </Sheet>
    </div>
  );
}
