export type Accion =
  | "ver"
  | "crear"
  | "editar"
  | "eliminar"
  | "adjuntos"
  | "reportes";

export type PermisoNodo = {
  pantallaId: string;
  nombre: string;
  icono: string;
  ruta: string;
  modulo?: string;
  ver: boolean;
  crear: boolean;
  editar: boolean;
  eliminar: boolean;
  adjuntos: boolean;
  reportes: boolean;
  /** Ojo: el backend lo llama `childrens`, no `children`. */
  childrens?: PermisoNodo[];
};

export type Perfil = {
  nombre: string;
  apellidoPaterno?: string;
  apellidoMaterno?: string;
  genero?: string;
  fechaNacimiento?: string;
  foto?: string | null;
};

export type Sesion = {
  /** publicId del usuario autenticado (claim `sub` del JWT). */
  publicId?: string;
  rolId: string;
  esAdministrador: boolean;
  perfil: Perfil | null;
  permisos: PermisoNodo[];
  nombreUsuario?: string;
  correo?: string;
};

export type SesionPublica = Omit<Sesion, "permisos"> & {
  permisos: PermisoNodo[];
};
