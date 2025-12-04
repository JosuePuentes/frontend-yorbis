// Tipado para un pago en la colección de MongoDB
export interface ImagenCuentaPorPagar {
  url: string;
  descripcion?: string;
}

export interface Pago {
  _id?: string; // Si usas MongoDB, normalmente hay un _id
  fecha: string; // "2025-07-08"
  referencia: string; // "efectivo"
  usuario: string; // "admin@gmail.com"
  bancoEmisor: string; // "efectivo"
  bancoReceptor: string; // "EFECTIVO"
  imagenPago: string; // ""
  farmaciaId: string; // "01"
  estado: string; // "abonada"
  cuentaPorPagarId: string; // "6861c195ebace2630076e007"
  fechaEmision: string; // "2025-05-29"
  fechaRecepcion: string; // "2025-05-29"
  fechaVencimiento: string; // "2025-05-29T00:00:00"
  fechaRegistro: string; // "2025-07-08"
  diasCredito: number; // 0
  numeroFactura: string; // "17465 - 18868"
  numeroControl: string; // "17465 - 18868"
  proveedor: string; // "DROCOLVEN"
  descripcion: string; // "COMPRA DE MEDICAMENTOS..."
  montoOriginal: number; // 27221.86
  retencion: number; // 0
  monedaOriginal: string; // "USD"
  tasaOriginal: number; // 107.6245
  tasaDePago: number; // 107.6245
  estatus: string; // "activa"
  usuarioCorreoCuenta: string; // "supervisorsantaelena@gmail.com"
  imagenesCuentaPorPagar: ImagenCuentaPorPagar[]; // Array de imágenes
  montoDePago: number; // 120
  monedaDePago: string; // "USD"
  abono: boolean; // true
  horaRegistro: string; // "09:37:51"
}