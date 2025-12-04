import { useEffect, useState } from "react";

interface Abono {
  _id: string;
  monto: number;
  cuentaPorPagarId: string;
  fecha: string;
  usuario: string;
  estado: string;
}

interface Props {
  cuentaPorPagarId: string;
  montoTotal: number;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AbonosPorCuenta: React.FC<Props> = ({ cuentaPorPagarId, montoTotal }) => {
  const [abonos, setAbonos] = useState<Abono[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAbonos = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/pagoscpp?cuentaPorPagarId=${cuentaPorPagarId}`);
        if (!res.ok) throw new Error("Error al obtener abonos");
        const data = await res.json();
        setAbonos(data);
      } catch (err: any) {
        setError(err.message || "Error al obtener abonos");
      } finally {
        setLoading(false);
      }
    };
    if (cuentaPorPagarId) fetchAbonos();
  }, [cuentaPorPagarId]);

  const totalAbonado = abonos.reduce((sum, ab) => sum + (ab.monto || 0), 0);
  const diferencia = montoTotal - totalAbonado;

  return (
    <div className="my-4 p-4 border rounded bg-slate-50">
      <h3 className="font-bold text-slate-700 mb-2">Abonos realizados</h3>
      {loading && <div>Cargando abonos...</div>}
      {error && <div className="text-red-600">{error}</div>}
      <ul className="mb-2">
        {abonos.map((ab) => (
          <li key={ab._id} className="flex justify-between text-sm py-1 border-b last:border-b-0">
            <span>{ab.fecha} - {ab.usuario}</span>
            <span className="font-semibold text-green-700">${ab.monto.toFixed(2)}</span>
            <span className="text-xs text-slate-500">{ab.estado}</span>
          </li>
        ))}
      </ul>
      <div className="flex justify-between font-bold">
        <span>Total abonado:</span>
        <span className="text-green-700">${totalAbonado.toFixed(2)}</span>
      </div>
      <div className="flex justify-between font-bold mt-1">
        <span>Resta por pagar:</span>
        <span className="text-red-700">${diferencia.toFixed(2)}</span>
      </div>
    </div>
  );
};

export default AbonosPorCuenta;
