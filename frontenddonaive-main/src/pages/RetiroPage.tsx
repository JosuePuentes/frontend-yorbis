import React, { useEffect, useState } from "react";

// Tipos básicos para gastos y retiros
interface Gasto {
  id: string;
  monto: number;
  divisa: "Bs" | "USD";
  tasa?: number;
  fecha: string;
  estado: string;
}

interface Retiro {
  id: string;
  montoBs: number;
  montoUsd: number;
  fecha: string;
  estado: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const RetiroPage: React.FC = () => {
  const [retiros, setRetiros] = useState<Retiro[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  // Totales
  const [totalBs, setTotalBs] = useState(0);
  const [totalUsd, setTotalUsd] = useState(0);
  const [gastosBs, setGastosBs] = useState(0);
  const [gastosUsd, setGastosUsd] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        // Retiros
        const resRetiros = await fetch(`${API_BASE_URL}/retiros`);
        if (!resRetiros.ok) throw new Error("Error al obtener retiros");
        const dataRetiros = await resRetiros.json();

        // Gastos
        const resGastos = await fetch(`${API_BASE_URL}/gastos`);
        if (!resGastos.ok) throw new Error("Error al obtener gastos");
        const dataGastos = await resGastos.json();

        setRetiros(Array.isArray(dataRetiros) ? dataRetiros : []);
        setGastos(Array.isArray(dataGastos) ? dataGastos : []);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calcular totales según filtros
  useEffect(() => {
    // Filtrar retiros por fecha
    const retirosFiltrados = retiros.filter(r => {
      if (fechaInicio && r.fecha < fechaInicio) return false;
      if (fechaFin && r.fecha > fechaFin) return false;
      return r.estado === "verified";
    });
    // Sumar totales
    setTotalBs(retirosFiltrados.reduce((acc, r) => acc + Number(r.montoBs || 0), 0));
    setTotalUsd(retirosFiltrados.reduce((acc, r) => acc + Number(r.montoUsd || 0), 0));

    // Filtrar gastos por fecha y estado
    const gastosFiltrados = gastos.filter(g => {
      if (fechaInicio && g.fecha < fechaInicio) return false;
      if (fechaFin && g.fecha > fechaFin) return false;
      return g.estado === "verified";
    });
    // Sumar gastos por moneda
    setGastosBs(
      gastosFiltrados
        .filter(g => g.divisa === "Bs")
        .reduce((acc, g) => acc + Number(g.monto || 0), 0)
    );
    setGastosUsd(
      gastosFiltrados
        .filter(g => g.divisa === "USD")
        .reduce((acc, g) => acc + Number(g.monto || 0), 0)
    );
  }, [retiros, gastos, fechaInicio, fechaFin]);

  const formatCurrency = (amount: number, currency: "USD" | "Bs") =>
    currency === "USD"
      ? amount.toLocaleString("es-VE", { style: "currency", currency: "USD", minimumFractionDigits: 2 })
      : amount.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " Bs";

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 md:p-8">
      <h2 className="text-3xl font-bold mb-6 text-center text-blue-800">Resumen de Retiros</h2>
      <div className="flex flex-wrap gap-4 justify-center mb-8">
        <div>
          <label className="block text-sm font-semibold mb-1">Fecha Inicio:</label>
          <input
            type="date"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">Fecha Fin:</label>
          <input
            type="date"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
            className="border rounded px-2 py-1"
          />
        </div>
      </div>
      {loading ? (
        <div className="text-center text-gray-500">Cargando...</div>
      ) : error ? (
        <div className="text-center text-red-500">{error}</div>
      ) : (
        <div className="max-w-xl mx-auto bg-white rounded-xl shadow-lg p-6 flex flex-col gap-4">
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-semibold text-blue-700">Total USD Recibidos:</span>
            <span className="font-bold text-green-700">{formatCurrency(totalUsd, "USD")}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-semibold text-blue-700">Total Bs Recibidos:</span>
            <span className="font-bold text-blue-700">{formatCurrency(totalBs, "Bs")}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-semibold text-red-700">Gastos en USD:</span>
            <span className="font-bold text-red-700">{formatCurrency(gastosUsd, "USD")}</span>
          </div>
          <div className="flex justify-between items-center border-b pb-2">
            <span className="font-semibold text-red-700">Gastos en Bs:</span>
            <span className="font-bold text-red-700">{formatCurrency(gastosBs, "Bs")}</span>
          </div>
          <div className="flex justify-between items-center border-t pt-4 font-bold text-lg">
            <span className="text-purple-700">Total Neto USD:</span>
            <span className="text-purple-700">
              {formatCurrency(totalUsd - gastosUsd, "USD")}
            </span>
          </div>
          <div className="flex justify-between items-center font-bold text-lg">
            <span className="text-purple-700">Total Neto Bs:</span>
            <span className="text-purple-700">
              {formatCurrency(totalBs - gastosBs, "Bs")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default RetiroPage;