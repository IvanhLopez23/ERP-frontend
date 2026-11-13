"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

import { apiFetch } from "@/lib/api-client";
import type { Mensaje } from "@/lib/types/chat";

export type EstadoChatSocket = "conectando" | "conectado" | "desconectado";

type Opciones = {
  conversacionActiva?: string | null;
  onMensaje?: (conversacionPublicId: string, mensaje: Mensaje) => void;
  onTyping?: (conversacionPublicId: string, nombreUsuario?: string) => void;
  onLeido?: (conversacionPublicId: string, mensajePublicId: string) => void;
  onJoined?: (conversacionPublicId: string) => void;
  onError?: (code: string, message: string) => void;
};

const RECONEXION_MS = 3_000;

/**
 * Conexión Socket.IO autenticada con ticket efímero.
 *
 * El navegador nunca ve el access token: pide un ticket de 60 s al BFF y lo
 * usa en `auth.token`. Si el socket se cae, se solicita un ticket nuevo antes
 * de reconectar.
 */
export function useChatSocket(opciones: Opciones) {
  const [estado, setEstado] = useState<EstadoChatSocket>("conectando");
  const socketRef = useRef<Socket | null>(null);
  const activaRef = useRef<string | null>(opciones.conversacionActiva ?? null);
  const callbacksRef = useRef(opciones);
  const canceladoRef = useRef(false);
  const temporizadorRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    callbacksRef.current = opciones;
  });

  useEffect(() => {
    activaRef.current = opciones.conversacionActiva ?? null;

    const socket = socketRef.current;
    if (socket?.connected && activaRef.current) {
      socket.emit("chat:join", { conversacionPublicId: activaRef.current });
    }
  }, [opciones.conversacionActiva]);

  useEffect(() => {
    canceladoRef.current = false;

    function programarReintento() {
      if (canceladoRef.current) return;
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
      temporizadorRef.current = setTimeout(() => {
        void abrir();
      }, RECONEXION_MS);
    }

    async function abrir() {
      if (canceladoRef.current) return;
      setEstado("conectando");

      try {
        const { token } = await apiFetch<{ token: string }>("/chat/ws-ticket", {
          method: "POST",
        });
        if (canceladoRef.current) return;

        const url =
          process.env.NEXT_PUBLIC_SOCKET_URL ?? "http://localhost:9000";

        const socket = io(url, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: false,
          timeout: 10_000,
        });

        socketRef.current = socket;

        socket.on("connect", () => {
          setEstado("conectado");
          if (activaRef.current) {
            socket.emit("chat:join", {
              conversacionPublicId: activaRef.current,
            });
          }
        });

        socket.on("disconnect", () => {
          setEstado("desconectado");
          socketRef.current = null;
          programarReintento();
        });

        socket.on("connect_error", () => {
          setEstado("desconectado");
          socket.disconnect();
          socketRef.current = null;
          programarReintento();
        });

        socket.on(
          "chat:mensaje",
          (data: { conversacionPublicId: string; mensaje: Mensaje }) => {
            callbacksRef.current.onMensaje?.(
              data.conversacionPublicId,
              data.mensaje,
            );
          },
        );

        socket.on(
          "chat:typing",
          (data: {
            conversacionPublicId: string;
            nombreUsuario?: string;
          }) => {
            callbacksRef.current.onTyping?.(
              data.conversacionPublicId,
              data.nombreUsuario,
            );
          },
        );

        socket.on(
          "chat:leido",
          (data: {
            conversacionPublicId: string;
            mensajePublicId: string;
          }) => {
            callbacksRef.current.onLeido?.(
              data.conversacionPublicId,
              data.mensajePublicId,
            );
          },
        );

        socket.on(
          "chat:joined",
          (data: { conversacionPublicId: string }) => {
            callbacksRef.current.onJoined?.(data.conversacionPublicId);
          },
        );

        socket.on(
          "chat:error",
          (data: { code: string; message: string }) => {
            callbacksRef.current.onError?.(data.code, data.message);
          },
        );
      } catch {
        setEstado("desconectado");
        programarReintento();
      }
    }

    void abrir();

    return () => {
      canceladoRef.current = true;
      if (temporizadorRef.current) clearTimeout(temporizadorRef.current);
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, []);

  const unirse = useCallback((conversacionPublicId: string) => {
    socketRef.current?.emit("chat:join", { conversacionPublicId });
  }, []);

  const salir = useCallback((conversacionPublicId: string) => {
    socketRef.current?.emit("chat:leave", { conversacionPublicId });
  }, []);

  const enviar = useCallback(
    (conversacionPublicId: string, contenido: string) => {
      socketRef.current?.emit("chat:send", {
        conversacionPublicId,
        contenido,
      });
    },
    [],
  );

  const escribir = useCallback((conversacionPublicId: string) => {
    socketRef.current?.emit("chat:typing", { conversacionPublicId });
  }, []);

  const marcarLeido = useCallback(
    (conversacionPublicId: string, mensajePublicId: string) => {
      socketRef.current?.emit("chat:read", {
        conversacionPublicId,
        mensajePublicId,
      });
    },
    [],
  );

  return { estado, unirse, salir, enviar, escribir, marcarLeido };
}
