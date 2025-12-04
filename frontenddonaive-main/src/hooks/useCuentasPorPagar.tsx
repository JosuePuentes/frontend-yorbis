import { useState, useEffect } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Farmacia {
  id: string;
  nombre: string;
}

// CAMBIO: La interfaz ahora refleja mejor lo que devuelve la API
interface CuentaPorPagarItem {
  farmacia: string; 
  montoUsd: number; // Usaremos este campo que ya viene calculado en USD
  // Se pueden añadir otros campos opcionales para un tipado más completo
  divisa?: "USD" | "Bs";
  monto?: number;
}

export function useCuentasPorPagar() {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [totalesPorFarmacia, setTotalesPorFarmacia] = useState<{ [key: string]: number }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCuentasData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token"); // Obtenemos el token
        if (!token) {
          throw new Error("No se encontró el token de autenticación.");
        }

        // CAMBIO: Se añaden los headers de autenticación
        const headers = {
          'Authorization': `Bearer ${token}`
        };

        const resFarmacias = await fetch(`${API_BASE_URL}/farmacias`, { headers });
        if (!resFarmacias.ok) throw new Error("Error al obtener farmacias.");
        const dataFarmacias = await resFarmacias.json();
        const listaFarmacias: Farmacia[] = Object.entries(dataFarmacias).map(([id, nombre]) => ({
          id,
          nombre: String(nombre),
        }));
        setFarmacias(listaFarmacias);

        const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, { headers });
        if (!resCuentas.ok) throw new Error("Error al obtener las cuentas por pagar.");
        const dataCuentas: CuentaPorPagarItem[] = await resCuentas.json();

        const totales: { [key: string]: number } = {};
        dataCuentas.forEach(cuenta => {
          if (!totales[cuenta.farmacia]) {
            totales[cuenta.farmacia] = 0;
          }
          // CAMBIO: Se suma el campo 'montoUsd' en lugar de 'monto'
          totales[cuenta.farmacia] += Number(cuenta.montoUsd || 0);
        });
        
        setTotalesPorFarmacia(totales);

      } catch (err: any) {
        setError(err.message || "Error desconocido al cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    fetchCuentasData();
  }, []);

  return { loading, error, farmacias, totalesPorFarmacia };
}