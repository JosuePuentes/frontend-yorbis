// Hook y funciones para interactuar con los endpoints de metas
import { useState } from "react";

export type Meta = {
  _id?: string; // ID opcional para metas existentes
  nombre: string;
  descripcion: string;
  fechaInicio: string;
  fechaFin: string;
  monto: number;
  farmaciaId: string;
  usuario: string;
  estado: 'por_lograr' | 'logrado' | 'no_logrado';
};
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

export function useMetas() {
  const [metas, setMetas] = useState<Meta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listar metas (opcional por farmacia)
  const fetchMetas = async (farmaciaId?: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = farmaciaId ? `?farmaciaId=${farmaciaId}` : "";
      const res = await fetch(`${API_BASE_URL}/metas${params}`);
      if (!res.ok) throw new Error("Error al obtener metas");
      const data = await res.json();
      setMetas(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener metas");
    } finally {
      setLoading(false);
    }
  };

  // Crear meta
  const crearMeta = async (meta: Meta) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/metas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!res.ok) throw new Error("Error al crear meta");
      return await res.json();
    } catch (err: any) {
      setError(err.message || "Error al crear meta");
      throw err;
    }
  };

  // Actualizar meta
  const actualizarMeta = async (metaId: string, meta: Partial<Meta>) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/metas/${metaId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(meta),
      });
      if (!res.ok) throw new Error("Error al actualizar meta");
      return await res.json();
    } catch (err: any) {
      setError(err.message || "Error al actualizar meta");
      throw err;
    }
  };

  // Eliminar meta
  const eliminarMeta = async (metaId: string) => {
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/metas/${metaId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar meta");
      return await res.json();
    } catch (err: any) {
      setError(err.message || "Error al eliminar meta");
      throw err;
    }
  };

  return {
    metas,
    loading,
    error,
    fetchMetas,
    crearMeta,
    actualizarMeta,
    eliminarMeta,
    setMetas,
  };
}
