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
  KeyRound,
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
import { mediaUrl, texto } from "@/lib/format";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { EstadoBadge } from "@/components/shared/estado-badge";
import { DataTable } from "@/components/data-table/data-table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SeccionFormulario } from "@/components/crud/seccion-formulario";
import { CampoImagen } from "@/components/crud/campo-imagen";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type Usuario = {
  publicId: string;
  nombreUsuario?: string | null;
  correo?: string | null;
  activo?: boolean;
  rol?: { publicId?: string; descripcion?: string } | null;
  perfil?: {
    nombre?: string | null;
    apellidoPaterno?: string | null;
    apellidoMaterno?: string | null;
    genero?: string | null;
    fechaNacimiento?: string | null;
    foto?: string | null;
  } | null;
};

type Rol = { publicId: string; descripcion?: string };

type Valores = {
  nombreUsuario: string;
  correo: string;
  contrasena: string;
  rolPublicId: string;
  nombre: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  genero: string;
  fechaNacimiento: string;
  archivo: File | null;
};

const VACIOS: Valores = {
  nombreUsuario: "",
  correo: "",
  contrasena: "",
  rolPublicId: "",
  nombre: "",
  apellidoPaterno: "",
  apellidoMaterno: "",
  genero: "",
  fechaNacimiento: "",
  archivo: null,
};

function nombres(usuario: Usuario) {
  const perfil = usuario.perfil;
  return (
    [perfil?.nombre, perfil?.apellidoPaterno, perfil?.apellidoMaterno]
      .filter(Boolean)
      .join(" ") || "—"
  );
}

function iniciales(usuario: Usuario) {
  return (
    `${usuario.perfil?.nombre?.[0] ?? ""}${usuario.perfil?.apellidoPaterno?.[0] ?? ""}`.toUpperCase() ||
    usuario.nombreUsuario?.slice(0, 2).toUpperCase() ||
    "US"
  );
}

export default function UsuariosPage() {
  const { puede } = useAuth();
  const queryClient = useQueryClient();

  const puedeVer = puede("/configuraciones/usuarios", "ver");
  const puedeCrear = puede("/configuraciones/usuarios", "crear");
  const puedeEditar = puede("/configuraciones/usuarios", "editar");
  const puedeRoles = puede("/configuraciones/roles");

  const [pagina, setPagina] = useState(1);
  const [registros, setRegistros] = useState(10);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 400);

  const [sheetAbierto, setSheetAbierto] = useState(false);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [claveUsuario, setClaveUsuario] = useState<Usuario | null>(null);

  const usuarios = useQuery<{ total: number; data: Usuario[] }>({
    queryKey: ["usuarios", pagina, registros, buscarDebounced],
    queryFn: () => {
      const parametros = new URLSearchParams({
        pagina: String(pagina),
        registros: String(registros),
      });
      if (buscarDebounced.trim()) parametros.set("buscar", buscarDebounced.trim());
      return apiFetch<{ total: number; data: Usuario[] }>(
        `/usuarios/paginacion?${parametros.toString()}`,
      );
    },
    enabled: puedeVer,
    placeholderData: keepPreviousData,
  });

  const roles = useQuery<Rol[]>({
    queryKey: ["roles-select"],
    queryFn: () => apiFetch<Rol[]>("/roles"),
    enabled: puedeRoles,
    staleTime: 5 * 60_000,
  });

  const alternarEstado = useMutation({
    mutationFn: (usuario: Usuario) =>
      apiFetch(`/usuarios/activo/${usuario.publicId}`, { method: "PATCH" }),
    onSuccess: (_data, usuario) => {
      toast.success(
        usuario.activo
          ? "Usuario desactivado correctamente."
          : "Usuario activado correctamente.",
      );
      void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function abrirNuevo() {
    setEditando(null);
    setSheetAbierto(true);
  }

  function abrirEdicion(usuario: Usuario) {
    setEditando(usuario);
    setSheetAbierto(true);
  }

  const columnas = useMemo<ColumnDef<Usuario, unknown>[]>(
    () => [
      {
        id: "usuario",
        header: "Usuario",
        cell: ({ row }) => {
          const usuario = row.original;
          const foto = mediaUrl(usuario.perfil?.foto);
          return (
            <div className="flex items-center gap-2.5">
              <Avatar className="size-8">
                {foto && <AvatarImage src={foto} alt="" />}
                <AvatarFallback className="text-[10px] font-semibold">
                  {iniciales(usuario)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {texto(usuario.nombreUsuario)}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {texto(usuario.correo)}
                </p>
              </div>
            </div>
          );
        },
      },
      { id: "perfil", header: "Perfil", cell: ({ row }) => nombres(row.original) },
      {
        id: "rol",
        header: "Rol",
        cell: ({ row }) => texto(row.original.rol?.descripcion),
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => <EstadoBadge activo={row.original.activo} />,
      },
      {
        id: "acciones",
        header: () => <span className="sr-only">Acciones</span>,
        cell: ({ row }) => {
          const usuario = row.original;
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={`Acciones de ${usuario.nombreUsuario ?? "usuario"}`}
                >
                  <Ellipsis className="size-4" aria-hidden="true" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar}
                    onClick={() => abrirEdicion(usuario)}
                  >
                    <Pencil className="size-4" aria-hidden="true" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar}
                    onClick={() => setClaveUsuario(usuario)}
                  >
                    <KeyRound className="size-4" aria-hidden="true" />
                    Cambiar contraseña
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="cursor-pointer"
                    disabled={!puedeEditar || alternarEstado.isPending}
                    onClick={() => alternarEstado.mutate(usuario)}
                  >
                    <Power className="size-4" aria-hidden="true" />
                    {usuario.activo ? "Desactivar" : "Activar"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [puedeEditar, alternarEstado.isPending],
  );

  if (!puedeVer) {
    return (
      <>
        <PageHeader titulo="Usuarios" />
        <EmptyState
          icono={ShieldAlert}
          titulo="Sin acceso a Usuarios"
          descripcion="Tu rol no tiene el permiso /configuraciones/usuarios."
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        titulo="Usuarios"
        descripcion="Cuentas del sistema, rol asignado y estado de acceso."
        acciones={
          puedeCrear ? (
            <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
              <Plus className="size-3.5" aria-hidden="true" />
              Nuevo usuario
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
            placeholder="Buscar por usuario o correo…"
            className="h-8 pl-8"
            aria-label="Buscar usuarios"
          />
        </div>
        <p className="text-xs text-muted-foreground sm:ml-auto">
          {(usuarios.data?.total ?? 0).toLocaleString("es-MX")} usuarios
        </p>
      </div>

      {usuarios.error ? (
        <ErrorState error={usuarios.error} onReintentar={() => void usuarios.refetch()} />
      ) : (
        <DataTable
          columns={columnas}
          data={usuarios.data?.data ?? []}
          total={usuarios.data?.total ?? 0}
          pagina={pagina}
          registros={registros}
          cargando={usuarios.isPending || usuarios.isFetching}
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
                  : "Todavía no hay usuarios"
              }
              descripcion={
                buscarDebounced
                  ? "Prueba con otro usuario o correo."
                  : "Crea la primera cuenta del sistema."
              }
              accion={
                puedeCrear && !buscarDebounced ? (
                  <Button size="sm" className="cursor-pointer" onClick={abrirNuevo}>
                    <Plus className="size-3.5" aria-hidden="true" />
                    Nuevo usuario
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
              {editando ? "Editar usuario" : "Nuevo usuario"}
            </SheetTitle>
            <SheetDescription>
              {editando
                ? "Actualiza la cuenta y el perfil. La contraseña se cambia desde el menú de acciones."
                : "La contraseña inicial la defines aquí; el usuario podrá cambiarla después."}
            </SheetDescription>
          </SheetHeader>

          <FormularioUsuario
            key={editando?.publicId ?? "nuevo"}
            usuario={editando}
            roles={roles.data ?? []}
            onCancelar={() => {
              setSheetAbierto(false);
              setEditando(null);
            }}
            onGuardado={() => {
              setSheetAbierto(false);
              setEditando(null);
              void queryClient.invalidateQueries({ queryKey: ["usuarios"] });
            }}
          />
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(claveUsuario)}
        onOpenChange={(abierto) => {
          if (!abierto) setClaveUsuario(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar contraseña</DialogTitle>
            <DialogDescription>
              Nueva contraseña para {claveUsuario?.nombreUsuario ?? "el usuario"}.
            </DialogDescription>
          </DialogHeader>
          <FormularioClave
            usuario={claveUsuario}
            onCancelar={() => setClaveUsuario(null)}
            onGuardado={() => setClaveUsuario(null)}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormularioUsuario({
  usuario,
  roles,
  onGuardado,
  onCancelar,
}: {
  usuario: Usuario | null;
  roles: Rol[];
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [valores, setValores] = useState<Valores>(() => ({
    ...VACIOS,
    nombreUsuario: usuario?.nombreUsuario ?? "",
    correo: usuario?.correo ?? "",
    rolPublicId: usuario?.rol?.publicId ?? "",
    nombre: usuario?.perfil?.nombre ?? "",
    apellidoPaterno: usuario?.perfil?.apellidoPaterno ?? "",
    apellidoMaterno: usuario?.perfil?.apellidoMaterno ?? "",
    genero: usuario?.perfil?.genero ?? "",
    fechaNacimiento: usuario?.perfil?.fechaNacimiento ?? "",
  }));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: async () => {
      if (!usuario) {
        const form = new FormData();
        form.append("nombreUsuario", valores.nombreUsuario.trim());
        form.append("correo", valores.correo.trim());
        form.append("contrasena", valores.contrasena);
        form.append("rolPublicId", valores.rolPublicId);
        form.append("nombre", valores.nombre.trim());
        form.append("apellidoPaterno", valores.apellidoPaterno.trim());
        form.append("apellidoMaterno", valores.apellidoMaterno.trim());
        if (valores.genero) form.append("genero", valores.genero);
        if (valores.fechaNacimiento) {
          form.append("fechaNacimiento", valores.fechaNacimiento);
        }
        if (valores.archivo) form.append("archivo", valores.archivo);

        return apiFetch("/usuarios", { method: "POST", body: form });
      }

      await apiFetch(`/usuarios/${usuario.publicId}`, {
        method: "PUT",
        body: JSON.stringify({
          nombreUsuario: valores.nombreUsuario.trim(),
          correo: valores.correo.trim(),
          rolPublicId: valores.rolPublicId,
        }),
      });

      const perfil = new FormData();
      perfil.append("nombre", valores.nombre.trim());
      perfil.append("apellidoPaterno", valores.apellidoPaterno.trim());
      perfil.append("apellidoMaterno", valores.apellidoMaterno.trim());
      if (valores.genero) perfil.append("genero", valores.genero);
      if (valores.fechaNacimiento) {
        perfil.append("fechaNacimiento", valores.fechaNacimiento);
      }
      if (valores.archivo) perfil.append("archivo", valores.archivo);

      return apiFetch(`/usuarios/perfil/${usuario.publicId}`, {
        method: "PATCH",
        body: perfil,
      });
    },
    onSuccess: () => {
      toast.success(
        usuario
          ? "Usuario actualizado correctamente."
          : "Usuario creado correctamente.",
      );
      onGuardado();
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  function actualizar<K extends keyof Valores>(clave: K, valor: Valores[K]) {
    setValores((previos) => ({ ...previos, [clave]: valor }));
  }

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const nuevos: Record<string, string> = {};

    if (!valores.nombreUsuario.trim()) nuevos.nombreUsuario = "Requerido.";
    if (!valores.correo.trim()) nuevos.correo = "Requerido.";
    else if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(valores.correo.trim())) {
      nuevos.correo = "Correo inválido.";
    }
    if (!valores.rolPublicId) nuevos.rolPublicId = "Selecciona un rol.";
    if (!valores.nombre.trim()) nuevos.nombre = "Requerido.";
    if (!valores.apellidoPaterno.trim()) nuevos.apellidoPaterno = "Requerido.";
    if (!valores.apellidoMaterno.trim()) nuevos.apellidoMaterno = "Requerido.";
    if (!usuario && valores.contrasena.length < 8) {
      nuevos.contrasena = "Mínimo 8 caracteres.";
    }

    setErrores(nuevos);
    if (Object.keys(nuevos).length > 0) return;
    mutation.mutate();
  }

  const error = (clave: string) =>
    errores[clave] ? (
      <p className="text-xs text-destructive">{errores[clave]}</p>
    ) : null;

  const imagenActual = mediaUrl(usuario?.perfil?.foto);

  return (
    <form onSubmit={enviar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        <SeccionFormulario numero={1} titulo="Cuenta">
          <div className="space-y-1.5">
            <Label htmlFor="nombreUsuario" className="font-semibold">
              Usuario
            </Label>
            <Input
              id="nombreUsuario"
              value={valores.nombreUsuario}
              onChange={(evento) => actualizar("nombreUsuario", evento.target.value)}
              autoComplete="off"
              className="h-9"
            />
            {error("nombreUsuario")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="correo" className="font-semibold">
              Correo
            </Label>
            <Input
              id="correo"
              type="email"
              value={valores.correo}
              onChange={(evento) => actualizar("correo", evento.target.value)}
              autoComplete="off"
              className="h-9"
            />
            {error("correo")}
          </div>

          {!usuario && (
            <div className="space-y-1.5">
              <Label htmlFor="contrasena" className="font-semibold">
                Contraseña inicial
              </Label>
              <p className="text-xs text-muted-foreground">
                Mínimo 8 caracteres.
              </p>
              <Input
                id="contrasena"
                type="password"
                value={valores.contrasena}
                onChange={(evento) => actualizar("contrasena", evento.target.value)}
                autoComplete="new-password"
                className="h-9"
              />
              {error("contrasena")}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="rolPublicId" className="font-semibold">
              Rol
            </Label>
            <select
              id="rolPublicId"
              value={valores.rolPublicId}
              onChange={(evento) => actualizar("rolPublicId", evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Selecciona…</option>
              {roles.map((rol) => (
                <option key={rol.publicId} value={rol.publicId}>
                  {rol.descripcion ?? rol.publicId}
                </option>
              ))}
            </select>
            {error("rolPublicId")}
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={2} titulo="Perfil">
          <div className="space-y-1.5">
            <Label htmlFor="nombre" className="font-semibold">
              Nombre
            </Label>
            <Input
              id="nombre"
              value={valores.nombre}
              onChange={(evento) => actualizar("nombre", evento.target.value)}
              className="h-9"
            />
            {error("nombre")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apellidoPaterno" className="font-semibold">
              Apellido paterno
            </Label>
            <Input
              id="apellidoPaterno"
              value={valores.apellidoPaterno}
              onChange={(evento) => actualizar("apellidoPaterno", evento.target.value)}
              className="h-9"
            />
            {error("apellidoPaterno")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="apellidoMaterno" className="font-semibold">
              Apellido materno
            </Label>
            <Input
              id="apellidoMaterno"
              value={valores.apellidoMaterno}
              onChange={(evento) => actualizar("apellidoMaterno", evento.target.value)}
              className="h-9"
            />
            {error("apellidoMaterno")}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="genero" className="font-semibold">
              Género
            </Label>
            <select
              id="genero"
              value={valores.genero}
              onChange={(evento) => actualizar("genero", evento.target.value)}
              className="h-9 w-full cursor-pointer rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">Sin especificar</option>
              <option value="M">Masculino</option>
              <option value="F">Femenino</option>
              <option value="O">Otro</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fechaNacimiento" className="font-semibold">
              Fecha de nacimiento
            </Label>
            <Input
              id="fechaNacimiento"
              type="date"
              value={valores.fechaNacimiento}
              onChange={(evento) => actualizar("fechaNacimiento", evento.target.value)}
              className="h-9"
            />
          </div>
        </SeccionFormulario>

        <SeccionFormulario numero={3} titulo="Fotografía">
          <CampoImagen
            id="archivo"
            etiqueta="Foto de perfil"
            ayuda="JPG, PNG o WebP. Máximo 5 MB."
            srcActual={imagenActual}
            nombreArchivo={valores.archivo?.name ?? null}
            onSeleccionar={(archivo) => actualizar("archivo", archivo)}
            onQuitar={() => actualizar("archivo", null)}
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
          {usuario ? "Guardar usuario" : "Crear usuario"}
        </Button>
      </div>
    </form>
  );
}

function FormularioClave({
  usuario,
  onGuardado,
  onCancelar,
}: {
  usuario: Usuario | null;
  onGuardado: () => void;
  onCancelar: () => void;
}) {
  const [contrasena, setContrasena] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch(`/usuarios/contrasena/${usuario?.publicId}`, {
        method: "PATCH",
        body: JSON.stringify({ contrasena }),
      }),
    onSuccess: () => {
      toast.success("Contraseña actualizada correctamente.");
      onGuardado();
    },
    onError: (err) => toast.error(mensajeDeError(err)),
  });

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (contrasena.length < 8) {
          setError("Mínimo 8 caracteres.");
          return;
        }
        setError(null);
        mutation.mutate();
      }}
      className="space-y-3"
      noValidate
    >
      <div className="space-y-1.5">
        <Label htmlFor="nuevaClave">Nueva contraseña</Label>
        <Input
          id="nuevaClave"
          type="password"
          autoComplete="new-password"
          value={contrasena}
          onChange={(evento) => setContrasena(evento.target.value)}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="cursor-pointer"
          onClick={onCancelar}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          size="sm"
          className="cursor-pointer"
          disabled={mutation.isPending}
        >
          {mutation.isPending && (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          )}
          Guardar contraseña
        </Button>
      </div>
    </form>
  );
}
