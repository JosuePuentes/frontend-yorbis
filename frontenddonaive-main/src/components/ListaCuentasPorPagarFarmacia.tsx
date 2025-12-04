import React, { useEffect, useState } from "react";
import type { CuentaPorPagar } from "@/pages/cuentasPorPagar/visualizarCuentas/FilaCuentaPorPagar";

interface Props {
  farmaciaId: string;
  fechaInicio?: string;
  fechaFin?: string;
}

const ListaCuentasPorPagarFarmacia: React.FC<Props> = ({ farmaciaId, fechaInicio, fechaFin }) => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proveedorFiltro, setProveedorFiltro] = useState("");

  useEffect(() => {
    const fetchCuentas = async () => {
      setLoading(true);
      setError(null);
      try {
        const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
        const token = localStorage.getItem("access_token");
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, { headers });
        if (!res.ok) throw new Error("Error al cargar cuentas por pagar");
        const data = await res.json();
        // Filtrar por farmaciaId si se provee
        let cuentasFiltradas = farmaciaId ? data.filter((c: any) => c.farmacia === farmaciaId) : data;
        setCuentas(cuentasFiltradas);
      } catch (err: any) {
        setError(err.message || "Error desconocido");
      } finally {
        setLoading(false);
      }
    };
    if (farmaciaId) fetchCuentas();
  }, [farmaciaId]);

  // Chip visual para el estado
  const EstadoChip: React.FC<{ estatus: string }> = ({ estatus }) => {
    let color = "bg-gray-200 text-gray-700";
    if (estatus === "wait") color = "bg-yellow-100 text-yellow-700 border border-yellow-400";
    else if (estatus === "activa") color = "bg-blue-100 text-blue-700 border border-blue-400";
    else if (estatus === "pagada") color = "bg-green-100 text-green-700 border border-green-400";
    else if (estatus === "anulada" || estatus === "inactiva") color = "bg-red-100 text-red-700 border border-red-400";
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>{estatus.charAt(0).toUpperCase() + estatus.slice(1)}</span>
    );
  };

  if (loading) return <div>Cargando cuentas por pagar...</div>;
  if (error) return <div className="text-red-600">{error}</div>;

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar proveedor..."
          value={proveedorFiltro}
          onChange={e => setProveedorFiltro(e.target.value)}
          className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
        />
      </div>
      {cuentas && cuentas.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-slate-200 rounded-lg shadow">
            <thead>
              <tr className="bg-blue-50 text-blue-900 text-xs uppercase">
                <th className="px-2 py-2">Factura</th>
                <th className="px-2 py-2">Proveedor</th>
                <th className="px-2 py-2">Monto</th>
                <th className="px-2 py-2">Retención</th>
                <th className="px-2 py-2">Tasa</th>
                <th className="px-2 py-2">Moneda</th>
                <th className="px-2 py-2">F. Emisión</th>
                <th className="px-2 py-2">F. Recepción</th>
                <th className="px-2 py-2">F. Vencimiento</th>
                <th className="px-2 py-2">F. Registro</th>
                <th className="px-2 py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {cuentas
                .filter((cuenta) => {
                  if (fechaInicio && cuenta.fechaRecepcion < fechaInicio) return false;
                  if (fechaFin && cuenta.fechaRecepcion > fechaFin) return false;
                  if (proveedorFiltro && !cuenta.proveedor.toLowerCase().includes(proveedorFiltro.toLowerCase())) return false;
                  return true;
                })
                .map((cuenta) => (
                  <tr key={cuenta._id} className="border-b hover:bg-blue-50 transition">
                    <td className="px-2 py-2 font-mono text-xs">{cuenta.numeroFactura}</td>
                    <td className="px-2 py-2 text-xs">{cuenta.proveedor}</td>
                    <td className="px-2 py-2 font-semibold text-xs">{cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} {cuenta.divisa}</td>
                    <td className="px-2 py-2 font-semibold text-xs">{cuenta.retencion != null ? cuenta.retencion.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : 'N/D'}</td>
                    <td className="px-2 py-2 font-semibold text-xs">{cuenta.tasa != null ? cuenta.tasa.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : 'N/D'}</td>
                    <td className="px-2 py-2 font-semibold text-xs">{cuenta.divisa || 'N/D'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{cuenta.fechaEmision ? new Date(cuenta.fechaEmision).toLocaleDateString('es-VE') : 'N/D'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{cuenta.fechaRecepcion ? new Date(cuenta.fechaRecepcion).toLocaleDateString('es-VE') : 'N/D'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{cuenta.fechaVencimiento ? new Date(cuenta.fechaVencimiento).toLocaleDateString('es-VE') : 'N/D'}</td>
                    <td className="px-2 py-2 font-mono text-xs">{cuenta.fechaRegistro ? new Date(cuenta.fechaRegistro).toLocaleDateString('es-VE') : 'N/D'}</td>
                    <td className="px-2 py-2 text-xs"><EstadoChip estatus={cuenta.estatus} /></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div>No hay cuentas por pagar registradas.</div>
      )}
    </div>
  );
};

export default ListaCuentasPorPagarFarmacia;
