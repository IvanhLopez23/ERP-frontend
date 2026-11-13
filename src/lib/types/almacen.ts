export type Paginado<T> = {
  total: number;
  data: T[];
};

export type Categoria = {
  publicId: string;
  nombre: string;
  activo?: boolean;
};

export type UnidadMedida = {
  publicId: string;
  nombre: string;
  abreviatura?: string | null;
  activo?: boolean;
};

export type Producto = {
  publicId: string;
  codigo?: string | null;
  nombre?: string | null;
  descripcion?: string | null;
  precioCosto?: string | number | null;
  precioVenta?: string | number | null;
  activo?: boolean;
  categoria?: { publicId?: string; nombre?: string } | null;
  unidadMedida?: {
    publicId?: string;
    nombre?: string;
    abreviatura?: string | null;
  } | null;
  categoriaId?: string | null;
  unidadMedidaId?: string | null;
  imagen?: string | null;
  foto?: string | null;
  archivo?: string | null;
  imagenUrl?: string | null;
  existencias?: string | number | null;
  stock?: string | number | null;
  [clave: string]: unknown;
};

export function imagenProducto(producto: Producto): string | null {
  const candidatos = [
    producto.imagenUrl,
    producto.imagen,
    producto.foto,
    producto.archivo,
  ];
  const encontrado = candidatos.find(
    (valor): valor is string => typeof valor === "string" && valor.length > 0,
  );
  return encontrado ?? null;
}
