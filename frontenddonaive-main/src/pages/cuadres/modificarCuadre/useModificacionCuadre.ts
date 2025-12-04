// Hooks para consultar los endpoints de cuadres
import { useState } from 'react';

// Tipos para la forma de cuadre
export interface PuntoVenta {
  banco: string;
  puntoDebito: number;
  puntoCredito: number;
}

export interface Cuadre {
  _id?: string;
  dia: string;
  cajaNumero: number;
  tasa: number;
  turno: string;
  cajero: string;
  cajeroId?: string;
  totalCajaSistemaBs: number;
  devolucionesBs: number;
  recargaBs: number;
  pagomovilBs: number;
  puntosVenta?: PuntoVenta[];
  efectivoBs: number;
  totalBs: number;
  totalBsEnUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  totalGeneralUsd: number;
  diferenciaUsd: number;
  sobranteUsd?: number;
  faltanteUsd?: number;
  delete?: boolean;
  estado?: string;
  nombreFarmacia?: string;
  costoInventario: number;
  fecha?: string;
  hora?: string;
  valesUsd?: number;
  imagenesCuadre?: string[];
}

const API_URL = import.meta.env.VITE_API_BASE_URL || '';

// 1. Consultar resumen de cuadres por fecha
export const useResumenCuadres = () => {
  const [data, setData] = useState<{ fecha: string; cantidad: number; suma_montos: number; cuadres: Cuadre[] } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResumen = async (fecha: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/cuadres/cuadres/lista?fecha=${fecha}`);
      if (!res.ok) throw new Error('Error al obtener resumen');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchResumen };
};

// 2. Consultar detalle de cuadres por fecha o rango
export const useDetalleCuadres = () => {
  const [data, setData] = useState<Cuadre[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetalle = async (params: { id?: string; fecha?: string; fecha_inicio?: string; fecha_fin?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const query = Object.entries(params)
        .filter(([_, v]) => v)
        .map(([k, v]) => `${k}=${v}`)
        .join('&');
      const res = await fetch(`${API_URL}/api/cuadres/cuadres/detalle?${query}`);
      if (!res.ok) throw new Error('Error al obtener detalle');
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { data, loading, error, fetchDetalle };
};

// 3. Modificar cuadre por ID
export const useModificarCuadre = () => {
  const [result, setResult] = useState<{ message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const modificarCuadre = async (id: string, data: Record<string, any>) => {
    setLoading(true);
    setError(null);
    // Excluir el campo _id antes de enviar al backend
    const { _id, ...dataSinId } = data;
    try {
      const res = await fetch(`${API_URL}/api/cuadres/cuadres/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataSinId),
      });
      if (!res.ok) throw new Error('Error al modificar cuadre');
      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { result, loading, error, modificarCuadre };
};
