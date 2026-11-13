"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { EVENTO_SESION_EXPIRADA } from "@/lib/api-client";
import {
  guardarSesion,
  leerSesion,
  limpiarSesion,
} from "@/lib/auth/storage";
import type { Accion, Sesion } from "@/lib/auth/types";
import { puede as evaluarPermiso } from "@/lib/permisos";

type Credenciales = { nombreUsuario: string; contrasena: string };

type AuthContexto = {
  sesion: Sesion | null;
  cargando: boolean;
  iniciarSesion: (credenciales: Credenciales) => Promise<Sesion>;
  cerrarSesion: () => Promise<void>;
  puede: (ruta: string, accion?: Accion) => boolean;
};

const Contexto = createContext<AuthContexto | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [sesion, setSesion] = useState<Sesion | null>(null);
  const [cargando, setCargando] = useState(true);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  useEffect(() => {
    const cache = leerSesion();

    if (!cache) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- arranque de sesión: no hay datos que mostrar.
      setCargando(false);
      router.replace("/login");
      return;
    }

    setSesion(cache);

    // El token sigue viviendo en una cookie HttpOnly: el cliente solo pide al
    // BFF que confirme que la sesión existe.
    fetch("/api/auth/session", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!montado.current) return;

        if (response.status === 401) {
          limpiarSesion();
          setSesion(null);
          router.replace("/login");
          return;
        }

        if (!response.ok) return;

        const data = (await response.json().catch(() => null)) as {
          usuario?: { sub?: string; nombreUsuario?: string; correo?: string };
        } | null;

        if (data?.usuario) {
          const actualizada: Sesion = {
            ...cache,
            publicId: data.usuario.sub ?? cache.publicId,
            nombreUsuario: data.usuario.nombreUsuario ?? cache.nombreUsuario,
            correo: data.usuario.correo ?? cache.correo,
          };
          guardarSesion(actualizada);
          setSesion(actualizada);
        }
      })
      .catch(() => {
        // Sin red: seguimos con los datos cacheados; las llamadas fallarán y
        // mostrarán su propio estado de error.
      })
      .finally(() => {
        if (montado.current) setCargando(false);
      });
  }, [router]);

  const cerrarSesion = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "same-origin",
      });
    } catch {
      // Ignoramos el error: la sesión local se limpia de todas formas.
    }
    limpiarSesion();
    setSesion(null);
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    const manejar = () => {
      void cerrarSesion();
    };
    window.addEventListener(EVENTO_SESION_EXPIRADA, manejar);
    return () => window.removeEventListener(EVENTO_SESION_EXPIRADA, manejar);
  }, [cerrarSesion]);

  const iniciarSesion = useCallback(async (credenciales: Credenciales) => {
    const respuesta = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credenciales),
      credentials: "same-origin",
    });

    const data = (await respuesta.json().catch(() => null)) as {
      sesion?: Sesion;
      message?: string | string[];
    } | null;

    if (!respuesta.ok || !data?.sesion) {
      const mensaje = Array.isArray(data?.message)
        ? data.message[0]
        : data?.message;
      throw new Error(mensaje ?? "No fue posible iniciar sesión.");
    }

    guardarSesion(data.sesion);
    setSesion(data.sesion);
    return data.sesion;
  }, []);

  const puede = useCallback(
    (ruta: string, accion: Accion = "ver") =>
      sesion
        ? evaluarPermiso(
            sesion.permisos,
            sesion.esAdministrador,
            ruta,
            accion,
          )
        : false,
    [sesion],
  );

  const valor = useMemo<AuthContexto>(
    () => ({ sesion, cargando, iniciarSesion, cerrarSesion, puede }),
    [sesion, cargando, iniciarSesion, cerrarSesion, puede],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAuth() {
  const contexto = useContext(Contexto);
  if (!contexto) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>.");
  }
  return contexto;
}
