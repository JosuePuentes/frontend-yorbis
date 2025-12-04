// Utilidad para formatear fecha en zona horaria de Venezuela
export function formatDateVenezuela(dateInput: string | Date): string {
  try {
    // Si es string, parsear a Date
    const date = typeof dateInput === "string" ? new Date(dateInput + "T00:00:00-04:00") : dateInput;
    // Opciones para mostrar en español y zona horaria de Caracas
    return date.toLocaleDateString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      timeZone: "America/Caracas"
    });
  } catch {
    return "-";
  }
}
