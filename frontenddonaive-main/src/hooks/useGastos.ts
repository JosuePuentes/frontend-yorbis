import { useEffect, useState, useCallback } from "react";

interface Gasto {
  _id: string;
  monto: number;
  titulo: string;
  descripcion: string;
  localidad: string; // Este campo es el ID de la localidad
  fecha: string;
  fechaRegistro?: string; // <-- Nueva fecha de registro
  estado: string;
  divisa?: string;
  tasa?: number;
}

interface Localidad {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useGastos(localidadId?: string) {
  const [localidades, setLocalidades] = useState<Localidad[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [gastosPorLocalidad, setGastosPorLocalidad] = useState<Record<string, Gasto[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch de localidades (farmacias)
  const fetchLocalidades = useCallback(async () => {
    try {
      const resLocalidades = await fetch(`${API_BASE_URL}/farmacias`);
      if (!resLocalidades.ok) throw new Error("Error al obtener localidades.");
      const dataLocalidades = await resLocalidades.json();
      const listaLocalidades = dataLocalidades.farmacias
        ? Object.entries(dataLocalidades.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
        : Object.entries(dataLocalidades).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
      setLocalidades(listaLocalidades);
    } catch (err: any) {
      setLocalidades([]);
    }
  }, []);

  // Fetch de gastos, filtrando por localidad si se pasa localidadId
  const fetchGastos = useCallback(async (id?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/gastos`;
      url += `?estado=wait`;
      if (id) url += `&localidad=${id}`;
      const resGastos = await fetch(url);
      if (!resGastos.ok) throw new Error("Error al obtener gastos.");
      const dataGastos: Gasto[] = await resGastos.json();
      console.log("Raw Gastos data from API (length:", dataGastos.length, "):", dataGastos);
      dataGastos.slice(0, 5).forEach(gasto => console.log(`Gasto ID: ${gasto._id}, Estado: ${gasto.estado}`)); // Log first 5 expenses' status
      setGastos(dataGastos);
      if (!id) {
        // Agrupar por localidad solo si no se filtra
        const agrupados = dataGastos.reduce((acc: Record<string, Gasto[]>, gasto: Gasto) => {
          if (!acc[gasto.localidad]) acc[gasto.localidad] = [];
          acc[gasto.localidad].push(gasto);
          return acc;
        }, {});
        setGastosPorLocalidad(agrupados);
      }
    } catch (err: any) {
      setError(err.message || "Error desconocido al cargar los datos.");
      setGastos([]);
      setGastosPorLocalidad({});
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar farmacias y gastos al montar (solo si no se filtra por localidad)
  useEffect(() => {
    fetchLocalidades();
    if (!localidadId) fetchGastos();
  }, [fetchLocalidades, fetchGastos, localidadId]);

  // Si cambia la localidadId, cargar gastos de esa farmacia
  useEffect(() => {
    if (localidadId) fetchGastos(localidadId);
  }, [localidadId, fetchGastos]);

  return {
    localidades,
    gastos: localidadId ? gastos : undefined,
    gastosPorLocalidad: localidadId ? undefined : gastosPorLocalidad,
    loading,
    error,
    fetchGastos,
    refreshGastos: fetchGastos, // Alias para compatibilidad
  };
}