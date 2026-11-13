"use client";

import Image from "next/image";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Palette, Save, ShieldAlert, Upload } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { mediaUrl } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type Colores = {
  headerBg: string;
  headerText: string;
  primary: string;
  secondary: string;
  tertiary: string;
  quaternary: string;
};

type Branding = {
  publicId: string;
  appName: string;
  sidebarIcon: string;
  logoUrl: string | null;
  loginLogoUrl: string | null;
  faviconUrl: string;
  radio: number;
  fuente: string;
  colors: Colores;
  updatedAt?: string;
};

const COLORES_POR_DEFECTO: Colores = {
  headerBg: "#0f172a",
  headerText: "#f6f7f8",
  primary: "#1e3a5f",
  secondary: "#f1f5f9",
  tertiary: "#0ea5e9",
  quaternary: "#0f172a",
};

const ETIQUETAS_COLOR: Record<keyof Colores, string> = {
  primary: "Primario",
  secondary: "Secundario",
  tertiary: "Terciario",
  quaternary: "Cuaternario",
  headerBg: "Fondo del encabezado",
  headerText: "Texto del encabezado",
};

const LOGOS: { tipo: "logo" | "login-logo" | "favicon"; etiqueta: string }[] = [
  { tipo: "logo", etiqueta: "Logo del sistema" },
  { tipo: "login-logo", etiqueta: "Logo del login" },
  { tipo: "favicon", etiqueta: "Favicon" },
];

export default function AparienciaPage() {
  const { puede } = useAuth();

  const puedeVer = puede("/configuraciones/apariencia", "ver");
  const puedeEditar = puede("/configuraciones/apariencia", "editar");

  const branding = useQuery<{ data: Branding }>({
    queryKey: ["branding-admin"],
    queryFn: () => apiFetch<{ data: Branding }>("/branding"),
    enabled: puedeVer,
  });

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Apariencia" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a Apariencia"
          descripcion="Tu rol no tiene el permiso /configuraciones/apariencia."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Apariencia"
        descripcion="Nombre, colores, tipografía y logos de la aplicación."
      />

      {branding.isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-64 w-full rounded-lg" />
        </div>
      ) : branding.error ? (
        <ErrorState
          error={branding.error}
          onReintentar={() => void branding.refetch()}
        />
      ) : branding.data?.data ? (
        <FormularioApariencia
          key={branding.data.data.updatedAt ?? "inicial"}
          branding={branding.data.data}
          puedeEditar={puedeEditar}
        />
      ) : (
        <EmptyState
          icono={Palette}
          titulo="Sin configuración de apariencia"
          descripcion="El backend no devolvió configuración de branding."
        />
      )}
    </>
  );
}

function FormularioApariencia({
  branding,
  puedeEditar,
}: {
  branding: Branding;
  puedeEditar: boolean;
}) {
  const queryClient = useQueryClient();

  const [appName, setAppName] = useState(branding.appName ?? "");
  const [sidebarIcon, setSidebarIcon] = useState(branding.sidebarIcon ?? "");
  const [fuente, setFuente] = useState(branding.fuente ?? "");
  const [radio, setRadio] = useState(String(branding.radio ?? 1.5));
  const [colors, setColors] = useState<Colores>({
    ...COLORES_POR_DEFECTO,
    ...(branding.colors ?? {}),
  });
  const [logoUrl, setLogoUrl] = useState(branding.logoUrl ?? "");
  const [loginLogoUrl, setLoginLogoUrl] = useState(branding.loginLogoUrl ?? "");
  const [faviconUrl, setFaviconUrl] = useState(branding.faviconUrl ?? "");
  const [subiendo, setSubiendo] = useState<string | null>(null);

  const guardar = useMutation({
    mutationFn: () =>
      apiFetch("/branding", {
        method: "PUT",
        body: JSON.stringify({
          appName: appName.trim(),
          sidebarIcon: sidebarIcon.trim(),
          fuente: fuente.trim(),
          radio: Number(radio),
          faviconUrl: faviconUrl.trim(),
          logoUrl: logoUrl.trim() || null,
          loginLogoUrl: loginLogoUrl.trim() || null,
          colors,
        }),
      }),
    onSuccess: () => {
      toast.success("Apariencia actualizada correctamente.");
      void queryClient.invalidateQueries({ queryKey: ["branding"] });
      void queryClient.invalidateQueries({ queryKey: ["branding-admin"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  async function subirArchivo(
    tipo: "logo" | "login-logo" | "favicon",
    archivo: File,
  ) {
    setSubiendo(tipo);
    try {
      const form = new FormData();
      form.append("archivo", archivo);
      const data = await apiFetch<{ data?: { url?: string } }>(
        `/branding/archivo?tipo=${tipo}`,
        { method: "POST", body: form },
      );
      const url = data?.data?.url;
      if (!url) throw new Error("El servidor no devolvió la URL del archivo.");

      if (tipo === "logo") setLogoUrl(url);
      if (tipo === "login-logo") setLoginLogoUrl(url);
      if (tipo === "favicon") setFaviconUrl(url);
      toast.success("Archivo subido. Guarda los cambios para aplicarlo.");
    } catch (error) {
      toast.error(mensajeDeError(error));
    } finally {
      setSubiendo(null);
    }
  }

  const logo = mediaUrl(logoUrl);

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (!appName.trim()) {
          toast.error("El nombre de la aplicación es obligatorio.");
          return;
        }
        guardar.mutate();
      }}
      className="grid gap-4 xl:grid-cols-[1fr_320px]"
      noValidate
    >
      <div className="space-y-4">
        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Identidad</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="appName">Nombre de la aplicación</Label>
              <Input
                id="appName"
                value={appName}
                onChange={(evento) => setAppName(evento.target.value)}
                disabled={!puedeEditar}
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fuente">Fuente</Label>
              <Input
                id="fuente"
                value={fuente}
                onChange={(evento) => setFuente(evento.target.value)}
                placeholder="Public Sans"
                disabled={!puedeEditar}
              />
              <p className="text-xs text-muted-foreground">
                Debe existir en Google Fonts; si no, se usa la fuente por defecto.
              </p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="radio">Radio / tamaño de iconos</Label>
              <Input
                id="radio"
                type="number"
                step="0.1"
                min="0"
                value={radio}
                onChange={(evento) => setRadio(evento.target.value)}
                disabled={!puedeEditar}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sidebarIcon">Icono del sidebar</Label>
              <Input
                id="sidebarIcon"
                value={sidebarIcon}
                onChange={(evento) => setSidebarIcon(evento.target.value)}
                placeholder="i-heroicons-cube-transparent"
                disabled={!puedeEditar}
              />
            </div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Colores</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(Object.keys(ETIQUETAS_COLOR) as (keyof Colores)[]).map((clave) => (
              <div key={clave} className="space-y-1.5">
                <Label htmlFor={`color-${clave}`}>{ETIQUETAS_COLOR[clave]}</Label>
                <div className="flex items-center gap-2">
                  <input
                    id={`color-${clave}`}
                    type="color"
                    value={colors[clave] ?? "#000000"}
                    onChange={(evento) =>
                      setColors((previos) => ({
                        ...previos,
                        [clave]: evento.target.value,
                      }))
                    }
                    disabled={!puedeEditar}
                    className="size-8 cursor-pointer rounded-md border border-input bg-background p-0.5 disabled:cursor-not-allowed"
                  />
                  <Input
                    value={colors[clave] ?? ""}
                    onChange={(evento) =>
                      setColors((previos) => ({
                        ...previos,
                        [clave]: evento.target.value,
                      }))
                    }
                    disabled={!puedeEditar}
                    className="h-8 font-mono text-xs"
                    aria-label={`Valor hexadecimal de ${ETIQUETAS_COLOR[clave]}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Logos y favicon</h2>
          <div className="mt-3 space-y-3">
            {LOGOS.map(({ tipo, etiqueta }) => {
              const valor =
                tipo === "logo"
                  ? logoUrl
                  : tipo === "login-logo"
                    ? loginLogoUrl
                    : faviconUrl;
              return (
                <div
                  key={tipo}
                  className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0 last:pb-0"
                >
                  <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-muted">
                    {valor ? (
                      <Image
                        src={mediaUrl(valor) ?? ""}
                        alt=""
                        width={48}
                        height={48}
                        className="size-12 object-contain"
                        unoptimized
                      />
                    ) : (
                      <Palette
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{etiqueta}</p>
                    <p className="truncate font-mono text-xs text-muted-foreground">
                      {valor || "Sin archivo"}
                    </p>
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs font-medium hover:bg-muted">
                    {subiendo === tipo ? (
                      <LoaderCircle
                        className="size-3.5 animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Upload className="size-3.5" aria-hidden="true" />
                    )}
                    Subir
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon"
                      className="sr-only"
                      disabled={!puedeEditar || subiendo !== null}
                      onChange={(evento) => {
                        const archivo = evento.target.files?.[0];
                        if (archivo) void subirArchivo(tipo, archivo);
                        evento.target.value = "";
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <aside className="space-y-3">
        <div className="overflow-hidden rounded-lg border border-border">
          <div
            className="flex h-12 items-center gap-2 px-3 text-sm font-semibold text-white"
            style={{ backgroundColor: colors.headerBg }}
          >
            <span
              className="grid size-6 place-items-center overflow-hidden rounded"
              style={{ backgroundColor: colors.primary }}
            >
              {logo ? (
                <Image
                  src={logo}
                  alt=""
                  width={24}
                  height={24}
                  className="size-6 object-contain"
                  unoptimized
                />
              ) : (
                <span className="text-[9px]">{appName.slice(0, 2)}</span>
              )}
            </span>
            <span className="truncate" style={{ color: colors.headerText }}>
              {appName || "ERP"}
            </span>
          </div>
          <div className="space-y-1 bg-card p-3">
            {["Dashboard", "Almacén", "Compras", "Ventas"].map((item) => (
              <div
                key={item}
                className="rounded px-2 py-1 text-xs"
                style={{ backgroundColor: colors.secondary, color: colors.quaternary }}
              >
                {item}
              </div>
            ))}
          </div>
        </div>

        <Button
          type="submit"
          className="w-full cursor-pointer"
          disabled={!puedeEditar || guardar.isPending}
        >
          {guardar.isPending ? (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Save className="size-3.5" aria-hidden="true" />
          )}
          Guardar apariencia
        </Button>
        {!puedeEditar && (
          <p className="text-xs text-muted-foreground">
            Tu rol solo puede consultar la apariencia.
          </p>
        )}
      </aside>
    </form>
  );
}
