import type { Pago } from "./pagosTypes";
import { useState } from "react";

const apiUrl = import.meta.env.VITE_API_BASE_URL;

/**
 * Consulta los pagos en un rango de fechas usando el endpoint /pagoscpp/rango-fechas
 * @param fechaInicio string en formato YYYY-MM-DD
 * @param fechaFin string en formato YYYY-MM-DD
 * @returns Promise<Pago[]>
 */
export async function fetchPagosPorRangoFechas(fechaInicio: string, fechaFin: string): Promise<Pago[]> {
  const params = new URLSearchParams({ fechaInicio, fechaFin });
  const url = `${apiUrl}/pagoscpp/rango-fechas?${params.toString()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error al obtener pagos: ${response.statusText} - ${text}`);
  }
  return await response.json();
}

/**
 * Hook para alternar un valor booleano (open/close)
 * @param initial Valor inicial (por defecto: false)
 * @returns [boolean, () => void]
 */
export function useToggle(initial = false): [boolean, () => void, () => void] {
  const [open, setOpen] = useState(initial);
  const toggle = () => setOpen((prev) => !prev);
  const reset = () => setOpen(initial);
  return [open, toggle, reset];
}
