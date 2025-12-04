// types.ts (or you can put this directly at the top of EdicionCuentaModal.tsx if you prefer)

// Interfaz para los datos que el componente EdicionCuentaModal necesita para funcionar
// Representa el estado editable de la cuenta.
export interface EdicionCuenta {
  montoOriginal: number; // Monto original de la factura, no se modifica aquí
  montoEditado?: number; // Este será el 'monto a pagar' final, que se edita con los cálculos
  descuento1: number;
  tipoDescuento1: 'monto' | 'porcentaje';
  descuento2: number;
  tipoDescuento2: 'monto' | 'porcentaje';
  observacion: string;
  tasa: number; // Esta es la 'tasa original' de la cuenta
  tasaPago: number; // Esta es la tasa editable del pago
  moneda: 'USD' | 'Bs'; // Moneda del pago (Bs o USD) - Se refiere a la moneda en la que se registra el pago.
  esAbono?: boolean;
  abono?: number; // Nuevo campo para el abono, editable por el usuario
  retencion: number; // Retención aplicada (editable o fija según negocio)
}

// Interfaz para los datos completos de la cuenta tal como vienen de la API
// (Esto es lo que el componente padre pasa como `cuenta` original)
export interface CuentaPorPagarAPI {
  _id: string;
  monto: number; // Monto original de la factura
  divisa: 'USD' | 'Bs'; // Divisa original de la factura (Bs o USD)
  tasa: number; // Tasa de cambio original de la factura (tasaoriginal)
  retencion?: number;
  fechaEmision: string;
  diasCredito: number;
  fechaRecepcion: string;
  proveedor: string;
  numeroFactura: string;
  numeroControl: string;
  descripcion: string;
  usuarioCorreo: string;
  farmacia: string;
  estatus: string;
  montoUsd?: number; // Puede venir o no de la API, se puede recalcular
  // Agrega cualquier otro campo que venga en la respuesta de la API aquí
}

// Tipo combinado para el estado interno del modal, que incluye todos los campos
// necesarios para la visualización y edición, tanto los de la API como los de edición,
// y los campos calculados.
export type CuentaCompletaEdicion = CuentaPorPagarAPI & EdicionCuenta & {
  montoOriginalBs: number; // Calculado
  montoOriginalUsd: number; // Calculado
  nuevoMontoEnBsAPagar: number; // Calculado (base para descuentos)
  totalDescuentos: number; // Calculado
  totalAcreditar: number; // Calculado
  nuevoSaldo: number; // Calculado
  d1: number; // Valor numérico del Descuento 1
  d2: number; // Valor numérico del Descuento 2
};


// --- Función de Cálculos ---

export function calcularMontosCuenta(
  // Recibe un objeto que combina propiedades de CuentaPorPagarAPI y EdicionCuenta
  // Esto permite que la función trabaje con el estado completo de la edición.
  datosEdicion: Partial<CuentaPorPagarAPI & EdicionCuenta>
): {
  montoOriginalBs: number;
  montoOriginalUsd: number;
  nuevoMontoEnBsAPagar: number; // Es la base para aplicar descuentos y abono
  totalDescuentos: number;
  montoEditado: number; // Este es el 'monto a pagar' final
  totalAcreditar: number;
  nuevoSaldo: number;
  d1: number;
  d2: number;
} {
  // Aseguramos que tenemos valores por defecto para evitar errores de undefined
  const montoOriginalFactura = datosEdicion.monto || 0; // Monto original de la factura desde la API
  const divisaOriginalFactura = datosEdicion.divisa || 'Bs'; // Divisa original desde la API
  const tasaOriginalFactura = datosEdicion.tasa || 0; // Tasa de la factura desde la API (tasaoriginal)

  // Campos editables por el usuario para el cálculo del pago
  const tasaDelPago = typeof datosEdicion.tasaPago === 'number' ? datosEdicion.tasaPago : (datosEdicion.tasa || 0); // Usa tasaPago para el cálculo, si existe, si no usa tasa original
  const abono = datosEdicion.abono || 0;
  const descuento1 = datosEdicion.descuento1 || 0;
  const tipoDescuento1 = datosEdicion.tipoDescuento1 || 'monto';
  const descuento2 = datosEdicion.descuento2 || 0;
  const tipoDescuento2 = datosEdicion.tipoDescuento2 || 'monto';
  const retencion = datosEdicion.retencion || 0;

  // 1. Calcular Monto Inicial en Bs y USD (usando divisa y tasa original de la factura)
  let montoOriginalBs: number;
  let montoOriginalUsd: number;

  if (divisaOriginalFactura === 'Bs') {
    montoOriginalBs = montoOriginalFactura;
    montoOriginalUsd = tasaOriginalFactura > 0 ? montoOriginalFactura / tasaOriginalFactura : 0;
  } else { // divisaOriginalFactura === 'USD'
    montoOriginalUsd = montoOriginalFactura;
    montoOriginalBs = tasaOriginalFactura > 0 ? montoOriginalFactura * tasaOriginalFactura : 0;
  }

  // 2. Calcular Nuevo Monto en Bs a Pagar (usando Monto Inicial USD y Tasa del Pago)
  // Este es el monto base en Bs después de la conversión con la nueva tasa de pago
  const nuevoMontoEnBsAPagar = montoOriginalUsd * tasaDelPago;

  // 3. Calcular Descuentos
  let valorDescuento1 = 0;
  // Aplicamos el descuento sobre `nuevoMontoEnBsAPagar`
  if (tipoDescuento1 === 'monto') {
    valorDescuento1 = descuento1;
  } else if (tipoDescuento1 === 'porcentaje') {
    valorDescuento1 = (descuento1 / 100) * nuevoMontoEnBsAPagar;
  }

  // El segundo descuento se aplica sobre el monto restante después del primer descuento
  let valorDescuento2 = 0;
  const montoDespuesD1 = nuevoMontoEnBsAPagar - valorDescuento1;
  if (tipoDescuento2 === 'monto') {
    valorDescuento2 = descuento2;
  } else if (tipoDescuento2 === 'porcentaje') {
    valorDescuento2 = (descuento2 / 100) * montoDespuesD1;
  }

  const totalDescuentos = valorDescuento1 + valorDescuento2;

  // 4. Calcular Monto a Pagar (que actualiza montoEditado)
  // Si es abono, NO recalcular montoEditado, solo usar el valor manual
  let montoEditado: number;
  if (datosEdicion.esAbono && typeof datosEdicion.montoEditado === 'number') {
    montoEditado = datosEdicion.montoEditado;
  } else {
    montoEditado = nuevoMontoEnBsAPagar - totalDescuentos - abono - retencion;
  }

  // 5. Calcular Total a Acreditar y Nuevo Saldo
  // 'totalAcreditar' es el monto final que se aplicará al saldo de la factura.
  // 'nuevoSaldo' es lo que queda de la factura original después de este pago.
  const totalAcreditar = montoEditado;
  const nuevoSaldo = montoOriginalBs - totalAcreditar; // Se reduce del monto original en Bs

  return {
    montoOriginalBs,
    montoOriginalUsd,
    nuevoMontoEnBsAPagar,
    totalDescuentos,
    montoEditado,
    totalAcreditar,
    nuevoSaldo,
    d1: valorDescuento1,
    d2: valorDescuento2,
  };
}

// types.ts (o donde definas tus tipos)

export interface Pago {
  _id: string;
  monto: number;
  moneda: 'USD' | 'Bs'; // ¡Clave! Asegura que la moneda sea estrictamente 'USD' o 'Bs'
  tasa?: number; // Opcional, ya que no todos los pagos tendrán una tasa explícita si la moneda coincide con la factura
  fecha: string; // Formato de fecha (ej. ISO 8601 string)
  usuario: string; // ID o correo del usuario que registró el pago
  referencia?: string; // Número de referencia del pago (ej. número de transferencia, de cheque)
  metodoPago?: string; // Ej. 'transferencia', 'efectivo', 'cheque', 'punto de venta'
  estatus?: 'aprobado' | 'pendiente' | 'rechazado'; // Opcional, para el estatus del pago
  // Puedes añadir cualquier otra propiedad que tu API devuelva para un pago
  [key: string]: any; // Para propiedades adicionales que no estén tipadas explícitamente
}