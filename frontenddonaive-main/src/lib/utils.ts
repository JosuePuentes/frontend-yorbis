import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utilidad para obtener el código de moneda a partir de un string
export function getCurrencyCode(moneda: string): string {
  if (!moneda) return "VES";
  if (
    moneda.toUpperCase() === "USD" ||
    moneda.toUpperCase() === "DOLAR" ||
    moneda.toUpperCase() === "DÓLAR"
  )
    return "USD";
  if (
    moneda.toUpperCase() === "VES" ||
    moneda.toUpperCase() === "BS" ||
    moneda.toUpperCase() === "BOLIVAR" ||
    moneda.toUpperCase() === "BOLÍVAR"
  )
    return "VES";
  return "VES";
}
