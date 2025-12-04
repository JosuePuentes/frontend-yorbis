import React, { useState, useEffect } from "react";

interface Cuadre {
  dia: string;
  cajaNumero: number;
  turno: string;
  cajero: string;
  totalCajaSistemaBs: number;
  recargaBs: number;
  pagomovilBs: number;
  puntosVenta?: Array<{ banco: string; puntoDebito: number; puntoCredito: number }>;
  efectivoBs: number;
  efectivoUsd: number;
  zelleUsd: number;
  valesUsd?: number;
  totalGeneralUsd: number;
  diferenciaUsd: number;
  sobranteUsd?: number;
  faltanteUsd?: number;
  estado?: string;
  tasa?: number;
  devolucionesBs?: number;
}

interface Cajero {
  _id: string;
  NOMBRE: string;
  ID: string;
  FARMACIAS: Record<string, string>;
}

interface CuadresModalProps {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
}

const ESTADOS = ["Todos", "wait", "verified", "denied"];

const CuadresModal: React.FC<CuadresModalProps> = ({ open, onClose, farmaciaId, farmaciaNombre }) => {
  const [cuadres, setCuadres] = useState<Cuadre[]>([]);
  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [estadoSeleccionado, setEstadoSeleccionado] = useState<string>("Todos");

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const fetchCuadres = async (fechaInicioParam?: string, fechaFinParam?: string) => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/cuadres/${farmaciaId}`;
      const params: string[] = [];
      if (fechaInicioParam) params.push(`fecha_inicio=${fechaInicioParam}`);
      if (fechaFinParam) params.push(`fecha_fin=${fechaFinParam}`);
      if (params.length) url += `?${params.join("&")}`;
      const res = await fetch(url);
      let data = await res.json();
      // Filtrado manual por si el backend no filtra
      if (fechaInicioParam && fechaFinParam) {
        data = data.filter((c: any) => c.dia >= fechaInicioParam && c.dia <= fechaFinParam);
      }
      setCuadres(data);
    } catch {
      setError("Error al obtener cuadres");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && farmaciaId) {
      fetchCuadres();
      // Fetch cajeros solo si hay farmacia seleccionada
      fetch(`${API_BASE_URL}/cajeros`)
        .then(res => res.json())
        .then(data => {
          // Filtrar cajeros que tengan la farmacia seleccionada
          const filtrados = data.filter((c: Cajero) => c.FARMACIAS && c.FARMACIAS[farmaciaId]);
          setCajeros(filtrados);
        })
        .catch(() => setCajeros([]));
    }
    // eslint-disable-next-line
  }, [open, farmaciaId]);

  const handleBuscar = () => {
    if (fechaInicio && fechaFin) {
      fetchCuadres(fechaInicio, fechaFin);
    }
  };

  // Filtrar cuadres por estado seleccionado
  const cuadresFiltrados = estadoSeleccionado === "Todos"
    ? cuadres
    : cuadres.filter(c => c.estado === estadoSeleccionado);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-opacity-40 flex items-center justify-center z-50 bg-white">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-2xl w-full relative max-h-[90vh] overflow-auto">
        <button
          className="absolute top-2 right-4 text-2xl text-gray-400 hover:text-red-500"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="text-xl font-bold mb-4 text-blue-800">Cuadres de {farmaciaNombre}</h2>
        <div className="flex flex-col md:flex-row gap-2 mb-4 items-end">
          <div>
            <label className="block text-xs text-gray-600">Desde</label>
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} className="border rounded p-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Hasta</label>
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} className="border rounded p-1" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Estado</label>
            <select
              className="border rounded p-1"
              value={estadoSeleccionado}
              onChange={e => setEstadoSeleccionado(e.target.value)}
            >
              {ESTADOS.map(estado => (
                <option key={estado} value={estado}>
                  {estado === "wait"
                    ? "Pendiente"
                    : estado === "approved"
                      ? "Aprobado"
                      : estado === "rejected"
                        ? "Rechazado"
                        : estado}
                </option>
              ))}
            </select>
          </div>
          <button
            className="bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700"
            onClick={handleBuscar}
            disabled={!fechaInicio || !fechaFin}
          >Buscar</button>
        </div>
        {loading ? (
          <div className="text-center py-8">Cargando...</div>
        ) : error ? (
          <div className="text-center text-red-500">{error}</div>
        ) : cuadresFiltrados.length === 0 ? (
          <div className="text-center text-gray-500">No hay cuadres registrados para esta farmacia.</div>
        ) : (
          <div className="space-y-4 overflow-auto max-h-[60vh]">
            {cuadresFiltrados
              .sort((a, b) => b.dia.localeCompare(a.dia))
              .map((c, idx) => (
                <div key={idx} className="border rounded-lg p-4 bg-blue-50">
                  <div className="font-semibold text-blue-700">Día: {c.dia}</div>
                  <div className="text-sm">Caja: <b>{c.cajaNumero}</b> | Turno: <b>{c.turno}</b></div>
                  <div className="text-sm mb-2">
                    Cajero: <b>{c.cajero}</b> (Cédula: <b>{cajeros.find(cj => cj.NOMBRE === c.cajero)?.ID || 'N/A'}</b>)
                  </div>
                  <div className="text-sm">Total Caja Sistema Bs: <b>{c.totalCajaSistemaBs}</b></div>
                  <div className="text-sm">Devoluciones Bs: <b className="text-blue-700">{c.devolucionesBs ?? '-'}</b></div>
                  <div className="text-sm">Recarga Bs: <b>{c.recargaBs}</b></div>
                  <div className="text-sm">Pago Móvil Bs: <b>{c.pagomovilBs}</b></div>
                  <div className="text-sm">Efectivo Bs: <b>{c.efectivoBs}</b></div>
                  <div className="text-sm">Efectivo USD: <b>{c.efectivoUsd}</b></div>
                  <div className="text-sm">Zelle USD: <b>{c.zelleUsd}</b></div>
                  <div className="text-sm">
                    Vales USD: <b className="text-green-600 font-bold">{c.valesUsd !== undefined ? c.valesUsd : '-'}</b>
                  </div>
                  <div className="text-sm">Total General USD: <b>{c.totalGeneralUsd}</b></div>
                  <div className="text-sm">Diferencia USD: <b>{c.diferenciaUsd}</b></div>
                  <div className="text-sm">Sobrante USD: <b>{c.sobranteUsd}</b></div>
                  <div className="text-sm">Faltante USD: <b>{c.faltanteUsd}</b></div>
                  <div className="text-sm">Estado: <b>{c.estado}</b></div>
                  <div className="text-sm">Tasa: <b>{c.tasa || 'N/A'}</b></div>
                  {c.puntosVenta && c.puntosVenta.length > 0 && (
                    <div className="text-sm mt-2">
                      <b>Puntos de Venta:</b>
                      <ul className="ml-4 list-disc">
                        {c.puntosVenta.map((pv, i) => (
                          <li key={i}>
                            Banco: <b>{pv.banco}</b>, Débito: <b>{pv.puntoDebito}</b>, Crédito: <b>{pv.puntoCredito}</b>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CuadresModal;
