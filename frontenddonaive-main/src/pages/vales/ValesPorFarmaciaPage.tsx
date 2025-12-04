import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import CuadreDetalleModal from "@/components/CuadreDetalleModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Cuadre {
  _id?: string;
  dia: string;
  cajaNumero: number;
  turno: string;
  estado?: string;
  totalCajaSistemaBs?: number;
  totalGeneralUsd?: number;
  faltanteUsd?: number;
  sobranteUsd?: number;
  cajero?: string;
  farmacia?: string;
  nombreFarmacia?: string;
  codigoFarmacia?: string;
  tasa?: number;
  devolucionesBs?: number;
  recargaBs?: number;
  pagomovilBs?: number;
  puntosVenta?: { banco: string; puntoDebito: string; puntoCredito: string }[];
  efectivoBs?: number;
  efectivoUsd?: number;
  zelleUsd?: number;
  diferenciaUsd?: number;
  cajeroId?: string;
  valesUsd?: number;
  valesBs?: number;
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const ValesPorFarmaciaPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [cuadres, setCuadres] = useState<Cuadre[]>([] );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detalleModalOpen, setDetalleModalOpen] = useState(false);
  const [cuadreSeleccionado, setCuadreSeleccionado] = useState<Cuadre | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");

  useEffect(() => {
    const fetchFarmacias = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
        if (lista.length === 1) setSelectedFarmacia(lista[0].id);
      } catch (err: any) {
        setError("Error al obtener farmacias");
      }
    };
    fetchFarmacias();
  }, []);

  useEffect(() => {
    const fetchCuadres = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/cuadres/all`);
        const data = await res.json();
        const cuadresVales = Array.isArray(data)
          ? data.filter((c: Cuadre) => Number(c.valesUsd) > 0)
          : [];
        setCuadres(cuadresVales);
      } catch (err) {
        setCuadres([]);
        setError("Error al obtener cuadres");
      } finally {
        setLoading(false);
      }
    };
    fetchCuadres();
  }, []);

  const cuadresFiltrados = cuadres.filter(c => {
    const cumpleFarmacia = !selectedFarmacia || c.codigoFarmacia === selectedFarmacia;
    const cumpleEstado = !estadoFiltro || c.estado === estadoFiltro;
    const cumpleFecha = (() => {
      if (!fechaInicio && !fechaFin) return true;
      const fecha = c.dia?.slice(0, 10);
      if (fechaInicio && fecha < fechaInicio) return false;
      if (fechaFin && fecha > fechaFin) return false;
      return true;
    })();
    return cumpleFarmacia && cumpleEstado && cumpleFecha;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-blue-900 tracking-tight drop-shadow-lg text-center sm:text-left">
            Cuadres con Vales por Negocio
          </h1>
          <div className="flex flex-wrap gap-3 justify-center items-center">
            {farmacias.map(f => (
              <Button
                key={f.id}
                variant={selectedFarmacia === f.id ? "default" : "outline"}
                className={`rounded-full px-5 py-2.5 font-bold border-2 transition-all duration-300 transform hover:scale-105 shadow-md
                  ${selectedFarmacia === f.id
                    ? "bg-blue-600 text-white border-blue-700 hover:bg-blue-700"
                    : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                  }`}
                onClick={() => setSelectedFarmacia(f.id === selectedFarmacia ? "" : f.id)}
              >
                {f.nombre}
              </Button>
            ))}
            <select
              value={estadoFiltro}
              onChange={e => setEstadoFiltro(e.target.value)}
              className="ml-0 sm:ml-4 px-4 py-2.5 rounded-full border-2 border-blue-300 text-blue-800 bg-white font-semibold shadow-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 cursor-pointer"
            >
              <option value="">Todos los estados</option>
              <option value="wait">Pendiente</option>
              <option value="verified">Verificado</option>
              <option value="denied">Denegado</option>
            </select>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="ml-0 sm:ml-2 px-4 py-2.5 rounded-full border-2 border-blue-300 text-blue-800 bg-white font-semibold shadow-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="Desde"
            />
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="ml-0 sm:ml-2 px-4 py-2.5 rounded-full border-2 border-blue-300 text-blue-800 bg-white font-semibold shadow-md
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
              placeholder="Hasta"
            />
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-8 rounded-lg shadow-lg font-semibold animate-fadeIn">
            {error}
          </div>
        )}

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-blue-100 transform transition-all duration-300 hover:shadow-3xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 animate-pulse">
              <svg className="animate-spin h-12 w-12 text-blue-600 mb-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-xl text-slate-600 font-medium">Cargando cuadres...</span>
            </div>
          ) : cuadresFiltrados.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="mx-auto h-16 w-16 text-slate-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="mt-2 text-2xl font-bold text-slate-800">No hay cuadres con vales</h3>
              <p className="mt-1 text-lg text-slate-500">No se encontraron cuadres con vales para los filtros aplicados.</p>
            </div>
          ) : (
            <div className="overflow-x-auto max-h-[70vh] rounded-2xl">
              <table className="min-w-full divide-y divide-blue-200">
                <thead className="bg-blue-100 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Acciones</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Día</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Caja</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Turno</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Cajero</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Vales USD</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Total USD</th>
                    <th className="px-4 py-3 text-left text-xs font-bold text-blue-900 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-blue-50">
                  {cuadresFiltrados.map((c, idx) => (
                    <tr
                      key={c._id || idx}
                      className="even:bg-blue-50 hover:bg-blue-100 transition-colors duration-200 group"
                    >
                      <td className="px-4 py-2 whitespace-nowrap">
                        <Button
                          size="sm"
                          variant="secondary"
                          className="bg-blue-500 hover:bg-blue-700 text-white rounded-md shadow-md font-bold px-3.5 py-1.5 text-sm
                            group-hover:scale-105 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                          onClick={() => { setCuadreSeleccionado(c); setDetalleModalOpen(true); }}
                        >
                          Ver Detalle
                        </Button>
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap font-semibold text-blue-900">
                        {c.dia ? new Date(c.dia).toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' }) : '-'}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{c.cajaNumero}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{c.turno}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-700">{c.cajero}</td>
                      <td className="px-4 py-2 whitespace-nowrap font-bold text-green-700 text-lg">
                        ${(c.valesUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap text-slate-800 text-lg">
                        ${(c.totalGeneralUsd ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold
                          ${c.estado === 'verified' ? 'bg-green-200 text-green-800' :
                            c.estado === 'wait' ? 'bg-yellow-200 text-yellow-800' :
                            c.estado === 'denied' ? 'bg-red-200 text-red-800' : 'bg-gray-200 text-gray-800'
                          }`}>
                          {c.estado ? c.estado.charAt(0).toUpperCase() + c.estado.slice(1) : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {cuadresFiltrados.length > 0 && (
            <div className="flex justify-end p-6 bg-blue-50 border-t border-blue-200">
              <div className="bg-gradient-to-r from-blue-500 to-blue-700 text-white rounded-full px-8 py-4 shadow-lg flex items-center gap-3 animate-fadeInUp">
                <span className="text-xl font-semibold">Total Vales USD:</span>
                <span className="text-3xl font-extrabold">
                  ${cuadresFiltrados.reduce((acc, c) => acc + (Number(c.valesUsd) || 0), 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
          )}
        </div>

        {cuadreSeleccionado && detalleModalOpen && (
          <CuadreDetalleModal
            open={detalleModalOpen}
            onClose={() => { setDetalleModalOpen(false); setCuadreSeleccionado(null); }}
            cuadre={cuadreSeleccionado}
          />
        )}
      </div>
    </div>
  );
};

export default ValesPorFarmaciaPage;