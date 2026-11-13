export type PerfilChat = {
  publicId?: string;
  nombre?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  foto?: string | null;
};

export type UsuarioChat = {
  publicId: string;
  nombreUsuario?: string | null;
  correo?: string | null;
  perfil?: PerfilChat | null;
};

export type Mensaje = {
  publicId: string;
  contenido?: string | null;
  fechaCreacion?: string | null;
  usuario?: UsuarioChat | null;
};

export type Participante = {
  publicId: string;
  ultimaLectura?: string | null;
  usuario?: UsuarioChat | null;
};

export type Conversacion = {
  publicId: string;
  esGrupo?: boolean;
  nombre?: string | null;
  ultimoMensaje?: Mensaje | null;
  noLeidos?: number;
  participantes?: Participante[];
  fechaCreacion?: string | null;
};

export type PaginadoMensajes = {
  total: number;
  data: Mensaje[];
};

export function nombreUsuarioChat(usuario?: UsuarioChat | null) {
  if (!usuario) return "Usuario";
  const nombre = [
    usuario.perfil?.nombre,
    usuario.perfil?.apellidoPaterno,
    usuario.perfil?.apellidoMaterno,
  ]
    .filter(Boolean)
    .join(" ")
    .trim();
  return nombre || usuario.nombreUsuario || "Usuario";
}

export function inicialesChat(usuario?: UsuarioChat | null) {
  const nombre = nombreUsuarioChat(usuario);
  const partes = nombre.split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "US";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0]}${partes[1][0]}`.toUpperCase();
}
