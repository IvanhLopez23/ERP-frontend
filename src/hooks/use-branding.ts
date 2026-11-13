import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

export type Branding = {
  appName: string;
  sidebarIcon?: string | null;
  logoUrl?: string | null;
  loginLogoUrl?: string | null;
  faviconUrl?: string | null;
  radio?: string | number | null;
  fuente?: string | null;
  colors?: Record<string, string> | null;
};

export const BRANDING_POR_DEFECTO: Branding = {
  appName: "ERP",
  logoUrl: null,
  loginLogoUrl: null,
  faviconUrl: null,
  radio: 8,
  fuente: null,
  colors: null,
};

function normalizar(data: unknown): Branding {
  if (!data || typeof data !== "object") return BRANDING_POR_DEFECTO;

  const crudo = data as Record<string, unknown>;
  const colors =
    crudo.colors && typeof crudo.colors === "object"
      ? (crudo.colors as Record<string, string>)
      : null;

  return {
    appName:
      typeof crudo.appName === "string" && crudo.appName.trim()
        ? crudo.appName
        : BRANDING_POR_DEFECTO.appName,
    sidebarIcon:
      typeof crudo.sidebarIcon === "string" ? crudo.sidebarIcon : null,
    logoUrl: typeof crudo.logoUrl === "string" ? crudo.logoUrl : null,
    loginLogoUrl:
      typeof crudo.loginLogoUrl === "string" ? crudo.loginLogoUrl : null,
    faviconUrl: typeof crudo.faviconUrl === "string" ? crudo.faviconUrl : null,
    radio: typeof crudo.radio === "number" || typeof crudo.radio === "string"
      ? crudo.radio
      : null,
    fuente: typeof crudo.fuente === "string" ? crudo.fuente : null,
    colors,
  };
}

async function fetchBranding(): Promise<Branding> {
  try {
    const response = await fetch("/api/public/branding", {
      credentials: "same-origin",
    });
    if (!response.ok) return BRANDING_POR_DEFECTO;
    const json = (await response.json()) as { data?: unknown };
    return normalizar(json?.data);
  } catch {
    return BRANDING_POR_DEFECTO;
  }
}

export function useBranding() {
  const query = useQuery({
    queryKey: ["branding"],
    queryFn: fetchBranding,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const branding = query.data ?? BRANDING_POR_DEFECTO;
  useAplicarBranding(branding);
  return branding;
}

/**
 * El branding del backend es una personalización opcional: si viene vacío o
 * falla, la aplicación conserva los tokens por defecto.
 */
export function useAplicarBranding(branding: Branding) {
  useEffect(() => {
    const raiz = document.documentElement;
    const colores = branding.colors ?? {};

    const primary =
      buscarColor(colores, ["primary", "primario", "colorPrimary", "main"]) ??
      null;

    if (primary) {
      raiz.style.setProperty("--primary", primary);
      raiz.style.setProperty("--ring", primary);
      raiz.style.setProperty("--sidebar-primary", primary);
    }

    let enlaceFuente: HTMLLinkElement | null = null;
    if (branding.fuente) {
      const familia = branding.fuente.trim();
      raiz.style.setProperty(
        "--font-fira-sans",
        `"${familia}", ui-sans-serif, system-ui, sans-serif`,
      );
      enlaceFuente = document.createElement("link");
      enlaceFuente.rel = "stylesheet";
      enlaceFuente.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(
        familia,
      ).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
      document.head.appendChild(enlaceFuente);
    }

    return () => {
      raiz.style.removeProperty("--primary");
      raiz.style.removeProperty("--ring");
      raiz.style.removeProperty("--sidebar-primary");
      raiz.style.removeProperty("--font-fira-sans");
      enlaceFuente?.remove();
    };
  }, [branding]);
}

function buscarColor(
  colores: Record<string, string>,
  claves: string[],
): string | undefined {
  const entradas = Object.entries(colores);
  for (const clave of claves) {
    const encontrada = entradas.find(
      ([k]) => k.toLowerCase() === clave.toLowerCase(),
    );
    if (encontrada?.[1]) return encontrada[1];
  }
  const primera = entradas.find(([, v]) => typeof v === "string" && v.trim());
  return primera?.[1];
}
