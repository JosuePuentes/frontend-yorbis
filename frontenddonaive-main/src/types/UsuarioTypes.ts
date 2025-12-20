export interface Usuario {
  _id?: string;
  correo: string;
  contraseña: string;
  farmacias: Record<string, string>;
  permisos: string[];
}

export interface UsuarioConNombre extends Usuario {
  nombre?: string;
  cargo?: string;
}

export const PERMISOS_DISPONIBLES = [
  "ver_inicio",
  "ver_about",
  "agregar_cuadre",
  "ver_resumen_mensual",
  "verificar_cuadres",
  "ver_cuadres_dia",
  "ver_resumen_dia",
  "acceso_admin",
  "eliminar_cuadres",
  "ver_ventas_totales",
  "verificar_gastos",
  "punto_venta",
  "gestionar_clientes",
  "gestionar_bancos",
  "compras",
  "resumen_venta_diaria"
] as const;

export const FARMACIAS_DISPONIBLES = [
  { id: "01", nombre: "Santa Elena" },
  { id: "02", nombre: "Sur America" },
  { id: "03", nombre: "Milagro Norte" },
  { id: "04", nombre: "San Martin" },
  { id: "05", nombre: "Las Alicias" },
  { id: "06", nombre: "San Carlos" },
  { id: "07", nombre: "San Ignacio" },
  { id: "08", nombre: "Rapifarma" }
] as const;

export type Permiso = typeof PERMISOS_DISPONIBLES[number];
export type Farmacia = typeof FARMACIAS_DISPONIBLES[number];




