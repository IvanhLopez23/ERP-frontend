"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  LoaderCircle,
  MessageSquare,
  Plus,
  Send,
  Users,
} from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/providers/auth-provider";
import { apiFetch, mensajeDeError } from "@/lib/api-client";
import { useChatSocket, type EstadoChatSocket } from "@/hooks/use-chat-socket";
import {
  inicialesChat,
  nombreUsuarioChat,
  type Conversacion,
  type Mensaje,
  type PaginadoMensajes,
  type UsuarioChat,
} from "@/lib/types/chat";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

function nombreConversacion(
  conversacion: Conversacion,
  usuarioActual?: string | null,
) {
  if (conversacion.esGrupo && conversacion.nombre) return conversacion.nombre;

  const otro = (conversacion.participantes ?? []).find(
    (participante) => participante.usuario?.publicId !== usuarioActual,
  );
  return nombreUsuarioChat(otro?.usuario ?? conversacion.participantes?.[0]?.usuario);
}

function horaCorta(valor?: string | null) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function fechaSeparador(valor?: string | null) {
  if (!valor) return "";
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  const hoy = new Date();
  const ayer = new Date();
  ayer.setDate(hoy.getDate() - 1);

  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  if (mismoDia(fecha, hoy)) return "Hoy";
  if (mismoDia(fecha, ayer)) return "Ayer";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(fecha);
}

const ETIQUETA_ESTADO: Record<EstadoChatSocket, string> = {
  conectado: "En línea",
  conectando: "Conectando…",
  desconectado: "Sin conexión",
};

export default function ChatPage() {
  const { sesion, puede } = useAuth();
  const queryClient = useQueryClient();
  const usuarioActual = sesion?.nombreUsuario ?? null;

  const [seleccionada, setSeleccionada] = useState<string | null>(null);
  const [nuevos, setNuevos] = useState<Mensaje[]>([]);
  const [texto, setTexto] = useState("");
  const [escribiendo, setEscribiendo] = useState<string | null>(null);
  const [verHiloMovil, setVerHiloMovil] = useState(false);
  const [nuevaAbierta, setNuevaAbierta] = useState(false);

  const finRef = useRef<HTMLDivElement | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ultimoTyping = useRef(0);

  const conversaciones = useQuery<Conversacion[]>({
    queryKey: ["chat-conversaciones"],
    queryFn: async () => {
      const data = await apiFetch<Conversacion[] | { data: Conversacion[] }>(
        "/chat/conversaciones",
      );
      return Array.isArray(data) ? data : data.data;
    },
  });

  const activa =
    seleccionada ?? conversaciones.data?.[0]?.publicId ?? null;

  const mensajesQuery = useQuery<PaginadoMensajes>({
    queryKey: ["chat-mensajes", activa],
    queryFn: () =>
      apiFetch<PaginadoMensajes>(
        `/chat/conversaciones/mensajes?conversacionId=${activa}&pagina=1&registros=100`,
      ),
    enabled: Boolean(activa),
  });

  const seleccionar = useCallback(
    (conversacion: Conversacion) => {
      setSeleccionada(conversacion.publicId);
      setNuevos([]);
      setTexto("");
      setVerHiloMovil(true);
    },
    [],
  );

  const socket = useChatSocket({
    conversacionActiva: activa,
    onMensaje: (conversacionPublicId, mensaje) => {
      if (conversacionPublicId === activa) {
        setNuevos((previos) =>
          previos.some((item) => item.publicId === mensaje.publicId)
            ? previos
            : [...previos, mensaje],
        );
      }
      void queryClient.invalidateQueries({ queryKey: ["chat-conversaciones"] });
    },
    onTyping: (conversacionPublicId, nombreUsuario) => {
      if (conversacionPublicId !== activa) return;
      setEscribiendo(nombreUsuario ?? "Alguien");
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setEscribiendo(null), 3500);
    },
    onError: (code, message) => {
      if (code === "rate_limited") {
        toast.warning(message);
        return;
      }
      toast.error(message);
    },
  });

  // Limpieza del temporizador de "escribiendo".
  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  const mensajes = useMemo(() => {
    const servidor = [...(mensajesQuery.data?.data ?? [])].reverse();
    const ids = new Set(servidor.map((mensaje) => mensaje.publicId));
    const extra = nuevos.filter((mensaje) => !ids.has(mensaje.publicId));
    return [...servidor, ...extra];
  }, [mensajesQuery.data, nuevos]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ block: "end" });
  }, [mensajes.length, activa]);

  const conversacionActiva = useMemo(
    () => (conversaciones.data ?? []).find((item) => item.publicId === activa) ?? null,
    [conversaciones.data, activa],
  );

  // Marca como leída la conversación al abrirla.
  const ultimoMarcado = useRef<string | null>(null);
  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    if (!activa || !ultimo || ultimo.usuario?.publicId === sesion?.publicId) return;
    if (ultimoMarcado.current === ultimo.publicId) return;
    ultimoMarcado.current = ultimo.publicId;
    socket.marcarLeido(activa, ultimo.publicId);
  }, [activa, mensajes, socket, sesion?.publicId]);

  function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const contenido = texto.trim();
    if (!contenido || !activa) return;
    if (socket.estado !== "conectado") {
      toast.error("Sin conexión en tiempo real. Espera a que se restablezca.");
      return;
    }
    if (contenido.length > 2000) {
      toast.error("El mensaje no puede exceder 2000 caracteres.");
      return;
    }
    socket.enviar(activa, contenido);
    setTexto("");
  }

  function alEscribir(valor: string) {
    setTexto(valor);
    if (!activa) return;
    const ahora = Date.now();
    if (ahora - ultimoTyping.current > 2000) {
      ultimoTyping.current = ahora;
      socket.escribir(activa);
    }
  }

  return (
    <>
      <PageHeader
        titulo="Chat"
        descripcion="Conversaciones internas en tiempo real."
        acciones={
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium",
                socket.estado === "conectado" &&
                  "border-emerald-600/25 bg-emerald-600/10 text-emerald-700 dark:text-emerald-400",
                socket.estado === "conectando" &&
                  "border-amber-600/25 bg-amber-600/10 text-amber-700 dark:text-amber-400",
                socket.estado === "desconectado" &&
                  "border-red-600/25 bg-red-600/10 text-red-700 dark:text-red-400",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "size-1.5 rounded-full",
                  socket.estado === "conectado" && "bg-emerald-600",
                  socket.estado === "conectando" && "animate-pulse bg-amber-500",
                  socket.estado === "desconectado" && "bg-red-600",
                )}
              />
              {ETIQUETA_ESTADO[socket.estado]}
            </span>
            {puede("/configuraciones/usuarios") && (
              <Button
                size="sm"
                className="cursor-pointer"
                onClick={() => setNuevaAbierta(true)}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Nueva conversación
              </Button>
            )}
          </div>
        }
      />

      {conversaciones.error ? (
        <ErrorState
          error={conversaciones.error}
          onReintentar={() => void conversaciones.refetch()}
        />
      ) : (
        <div className="grid min-h-[calc(100dvh-190px)] overflow-hidden rounded-lg border border-border bg-card lg:grid-cols-[300px_1fr]">
          {/* Lista de conversaciones */}
          <aside
            className={cn(
              "flex-col border-border lg:flex lg:border-r",
              verHiloMovil ? "hidden" : "flex",
            )}
          >
            <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
              <p className="text-sm font-semibold">Conversaciones</p>
              <span className="text-xs text-muted-foreground">
                {conversaciones.data?.length ?? 0}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {conversaciones.isPending ? (
                <div className="space-y-2 p-3">
                  {Array.from({ length: 5 }).map((_, indice) => (
                    <Skeleton key={indice} className="h-14 rounded-md" />
                  ))}
                </div>
              ) : (conversaciones.data ?? []).length === 0 ? (
                <div className="p-3">
                  <EmptyState
                    className="px-2 py-8"
                    icono={MessageSquare}
                    titulo="Sin conversaciones"
                    descripcion="Inicia una conversación con otro usuario."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {(conversaciones.data ?? []).map((conversacion) => {
                    const nombre = nombreConversacion(conversacion, usuarioActual);
                    const noLeidos = conversacion.noLeidos ?? 0;
                    const seleccionada = conversacion.publicId === activa;
                    return (
                      <li key={conversacion.publicId}>
                        <button
                          type="button"
                          onClick={() => seleccionar(conversacion)}
                          className={cn(
                            "flex w-full cursor-pointer items-start gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60",
                            seleccionada && "bg-accent/60",
                          )}
                        >
                          <Avatar className="mt-0.5 size-8 shrink-0">
                            <AvatarFallback className="text-[10px] font-semibold">
                              {inicialesChat(conversacion.participantes?.[0]?.usuario)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between gap-2">
                              <span className="truncate text-sm font-medium">
                                {nombre}
                              </span>
                              <span className="shrink-0 text-[10px] text-muted-foreground">
                                {horaCorta(conversacion.ultimoMensaje?.fechaCreacion)}
                              </span>
                            </span>
                            <span className="mt-0.5 flex items-center justify-between gap-2">
                              <span className="truncate text-xs text-muted-foreground">
                                {conversacion.ultimoMensaje?.contenido ?? "Sin mensajes"}
                              </span>
                              {noLeidos > 0 && (
                                <span className="grid size-4 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                                  {noLeidos > 9 ? "9+" : noLeidos}
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Hilo */}
          <section
            className={cn(
              "min-h-0 flex-col lg:flex",
              verHiloMovil ? "flex" : "hidden",
            )}
          >
            {!activa ? (
              <div className="grid flex-1 place-items-center p-6">
                <EmptyState
                  icono={MessageSquare}
                  titulo="Selecciona una conversación"
                  descripcion="Elige un chat de la lista para ver los mensajes."
                />
              </div>
            ) : (
              <>
                <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border px-3">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="cursor-pointer lg:hidden"
                    onClick={() => setVerHiloMovil(false)}
                    aria-label="Volver a conversaciones"
                  >
                    <ArrowLeft className="size-4" aria-hidden="true" />
                  </Button>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {conversacionActiva
                        ? nombreConversacion(conversacionActiva, usuarioActual)
                        : "Conversación"}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Users className="size-3" aria-hidden="true" />
                      {(conversacionActiva?.participantes ?? []).length} participantes
                    </p>
                  </div>
                </div>

                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-3">
                  {mensajesQuery.isPending ? (
                    <div className="space-y-3">
                      {Array.from({ length: 4 }).map((_, indice) => (
                        <Skeleton
                          key={indice}
                          className={cn(
                            "h-10 w-2/3 rounded-lg",
                            indice % 2 === 0 && "ml-auto",
                          )}
                        />
                      ))}
                    </div>
                  ) : mensajesQuery.error ? (
                    <ErrorState
                      error={mensajesQuery.error}
                      onReintentar={() => void mensajesQuery.refetch()}
                    />
                  ) : mensajes.length === 0 ? (
                    <EmptyState
                      icono={MessageSquare}
                      titulo="Sin mensajes"
                      descripcion="Escribe el primero para iniciar la conversación."
                    />
                  ) : (
                    mensajes.map((mensaje, indice) => {
                      const autor = mensaje.usuario;
                      const mio = autor?.publicId === sesion?.publicId;
                      const fecha = mensaje.fechaCreacion;
                      const anterior = mensajes[indice - 1]?.fechaCreacion;
                      const mostrarFecha =
                        fechaSeparador(fecha) !== fechaSeparador(anterior);
                      return (
                        <div key={mensaje.publicId}>
                          {mostrarFecha && (
                            <p className="my-2 text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                              {fechaSeparador(fecha)}
                            </p>
                          )}
                          <div
                            className={cn(
                              "flex items-end gap-2",
                              mio && "flex-row-reverse",
                            )}
                          >
                            {!mio && (
                              <Avatar className="size-6 shrink-0">
                                <AvatarFallback className="text-[9px] font-semibold">
                                  {inicialesChat(autor)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div
                              className={cn(
                                "max-w-[78%] rounded-lg px-2.5 py-1.5 text-sm",
                                mio
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-muted text-foreground",
                              )}
                            >
                              {!mio && conversacionActiva?.esGrupo && (
                                <p className="mb-0.5 text-[10px] font-semibold text-primary">
                                  {nombreUsuarioChat(autor)}
                                </p>
                              )}
                              <p className="whitespace-pre-wrap break-words">
                                {mensaje.contenido}
                              </p>
                              <p
                                className={cn(
                                  "mt-0.5 text-right text-[9px]",
                                  mio
                                    ? "text-primary-foreground/70"
                                    : "text-muted-foreground",
                                )}
                              >
                                {horaCorta(fecha)}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  {escribiendo && (
                    <p className="pl-8 text-[11px] italic text-muted-foreground">
                      {escribiendo} está escribiendo…
                    </p>
                  )}
                  <div ref={finRef} />
                </div>

                <form
                  onSubmit={enviar}
                  className="flex shrink-0 items-end gap-2 border-t border-border p-2.5"
                >
                  <Textarea
                    value={texto}
                    onChange={(evento) => alEscribir(evento.target.value)}
                    onKeyDown={(evento) => {
                      if (evento.key === "Enter" && !evento.shiftKey) {
                        evento.preventDefault();
                        evento.currentTarget.form?.requestSubmit();
                      }
                    }}
                    rows={1}
                    maxLength={2000}
                    placeholder="Escribe un mensaje… (Enter para enviar)"
                    className="max-h-28 min-h-9 resize-none"
                    aria-label="Mensaje"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    className="shrink-0 cursor-pointer"
                    disabled={!texto.trim() || socket.estado !== "conectado"}
                    aria-label="Enviar mensaje"
                  >
                    <Send className="size-4" aria-hidden="true" />
                  </Button>
                </form>
              </>
            )}
          </section>
        </div>
      )}

      <Dialog open={nuevaAbierta} onOpenChange={setNuevaAbierta}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva conversación</DialogTitle>
            <DialogDescription>
              Selecciona a los participantes. Con más de uno se crea un grupo.
            </DialogDescription>
          </DialogHeader>
          <FormularioNuevaConversacion
            onCancelar={() => setNuevaAbierta(false)}
            onCreada={(conversacion) => {
              setNuevaAbierta(false);
              void queryClient.invalidateQueries({
                queryKey: ["chat-conversaciones"],
              });
              seleccionar(conversacion);
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function FormularioNuevaConversacion({
  onCreada,
  onCancelar,
}: {
  onCreada: (conversacion: Conversacion) => void;
  onCancelar: () => void;
}) {
  const [seleccionados, setSeleccionados] = useState<string[]>([]);
  const [nombreGrupo, setNombreGrupo] = useState("");

  const usuarios = useQuery<UsuarioChat[]>({
    queryKey: ["usuarios-select-chat"],
    queryFn: async () => {
      const data = await apiFetch<UsuarioChat[] | { data: UsuarioChat[] }>(
        "/usuarios",
      );
      return Array.isArray(data) ? data : data.data;
    },
    staleTime: 5 * 60_000,
  });

  const mutation = useMutation({
    mutationFn: () => {
      const esGrupo = seleccionados.length > 1;
      return apiFetch<Conversacion>("/chat/conversaciones", {
        method: "POST",
        body: JSON.stringify({
          participanteIds: seleccionados,
          esGrupo,
          ...(esGrupo ? { nombre: nombreGrupo.trim() } : {}),
        }),
      });
    },
    onSuccess: (conversacion) => {
      toast.success("Conversación creada correctamente.");
      onCreada(conversacion);
    },
    onError: (error) => toast.error(mensajeDeError(error)),
  });

  const esGrupo = seleccionados.length > 1;

  return (
    <form
      onSubmit={(evento) => {
        evento.preventDefault();
        if (seleccionados.length === 0) {
          toast.error("Selecciona al menos un participante.");
          return;
        }
        if (esGrupo && !nombreGrupo.trim()) {
          toast.error("Escribe un nombre para el grupo.");
          return;
        }
        mutation.mutate();
      }}
      className="space-y-3"
      noValidate
    >
      {usuarios.isPending ? (
        <Skeleton className="h-32 w-full rounded-md" />
      ) : usuarios.error ? (
        <ErrorState
          error={usuarios.error}
          onReintentar={() => void usuarios.refetch()}
          titulo="No se pudo cargar la lista de usuarios"
        />
      ) : (
        <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
          {(usuarios.data ?? []).map((usuario) => {
            const marcado = seleccionados.includes(usuario.publicId);
            return (
              <label
                key={usuario.publicId}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60"
              >
                <input
                  type="checkbox"
                  checked={marcado}
                  onChange={() =>
                    setSeleccionados((previos) =>
                      marcado
                        ? previos.filter((id) => id !== usuario.publicId)
                        : [...previos, usuario.publicId],
                    )
                  }
                  className="size-4 cursor-pointer accent-[var(--primary)]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {nombreUsuarioChat(usuario)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {usuario.nombreUsuario}
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      )}

      {esGrupo && (
        <div className="space-y-1.5">
          <Label htmlFor="nombreGrupo">Nombre del grupo</Label>
          <Input
            id="nombreGrupo"
            value={nombreGrupo}
            onChange={(evento) => setNombreGrupo(evento.target.value)}
            placeholder="Equipo de almacén"
          />
        </div>
      )}

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
          disabled={mutation.isPending || seleccionados.length === 0}
        >
          {mutation.isPending && (
            <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
          )}
          Crear conversación
        </Button>
      </div>
    </form>
  );
}
