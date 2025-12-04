import React, { useState } from 'react';
import TablaPagos from './TablaPagos';
import type { Pago } from './pagosTypes';
import { fetchPagosPorRangoFechas } from './usePagosPCC';

// La data simulada no cambia
const FARMACIAS_MOCK = [
  { id: '01', nombre: 'Santa Elena' },
  { id: '02', nombre: 'Sur America' },
  { id: '03', nombre: 'Rapifarma' },
  { id: '04', nombre: 'San Carlos' },
  { id: '05', nombre: 'Las Alicias' },
  { id: '06', nombre: 'San Martin' },
  { id: '07', nombre: 'Milagro Norte' },
];

const VisualizarPagos: React.FC = () => {
  // --- TODA LA LÓGICA Y ESTADOS PERMANECEN IGUALES ---
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');
  const [farmaciasSeleccionadas, setFarmaciasSeleccionadas] = useState<string[]>([]);
  const [numeroFactura, setNumeroFactura] = useState('');
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (fechaInicio && fechaFin && new Date(fechaInicio) > new Date(fechaFin)) {
      setError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    setLoading(true);
    setError(null);
    setPagos([]);
    try {
      const pagosRes = await fetchPagosPorRangoFechas(fechaInicio, fechaFin);
      setPagos(pagosRes);
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error al buscar los pagos.');
    } finally {
      setLoading(false);
    }
  };

  const handleSeleccionarFarmacia = (idFarmacia: string) => {
    setFarmaciasSeleccionadas(prev =>
      prev.includes(idFarmacia) ? prev.filter(id => id !== idFarmacia) : [...prev, idFarmacia]
    );
  };

  const pagosFiltrados = (() => {
    let pagosResultantes = [...pagos];
    if (farmaciasSeleccionadas.length > 0) {
      pagosResultantes = pagosResultantes.filter(pago => farmaciasSeleccionadas.includes(pago.farmaciaId));
    }
    if (numeroFactura.trim() !== '') {
      pagosResultantes = pagosResultantes.filter(pago =>
        pago.numeroFactura.toLowerCase().includes(numeroFactura.trim().toLowerCase())
      );
    }
    return pagosResultantes;
  })();

  // --- RENDERIZADO CON CLASES DE TAILWIND CSS ---
  return (
    <div className="bg-slate-50 font-sans p-4 sm:p-6 md:p-8 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-2">Visualizar Pagos</h1>
        <p className="text-slate-600 mb-8">Selecciona los filtros para ver los pagos realizados.</p>

        {/* Formulario de búsqueda principal */}
        <form onSubmit={handleBuscar} className="mb-6 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Fecha inicio:
            <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)} required 
                   className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
            Fecha fin:
            <input type="date" value={fechaFin} onChange={e => setFechaFin(e.target.value)} required 
                   className="p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
          </label>
          <button type="submit" disabled={loading} 
                  className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md shadow-sm hover:bg-blue-700 transition-colors disabled:bg-slate-400 disabled:cursor-not-allowed">
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>

        {/* Contenedor para filtros secundarios */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 mb-8 shadow-sm">
          <h3 className="text-lg font-semibold text-slate-900 mt-0 mb-6">Filtros Adicionales</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Filtro por número de factura */}
            <div>
              <label htmlFor="filtroFactura" className="block mb-2 text-sm font-bold text-slate-700">Buscar por Número de Factura:</label>
              <input
                id="filtroFactura" type="text" placeholder="Escribe el número o parte de él..."
                value={numeroFactura} onChange={e => setNumeroFactura(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"/>
            </div>

            {/* Filtro de farmacias con chips */}
            <div>
              <label className="block mb-2 text-sm font-bold text-slate-700">Filtrar por Farmacia:</label>
              <div className="flex flex-wrap gap-2">
                {FARMACIAS_MOCK.map(farmacia => {
                  const isSelected = farmaciasSeleccionadas.includes(farmacia.id);
                  return (
                    <button
                      key={farmacia.id}
                      onClick={() => handleSeleccionarFarmacia(farmacia.id)}
                      className={`
                        py-2 px-4 rounded-full text-sm font-medium border
                        transition-colors duration-200
                        ${isSelected
                          ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                          : 'bg-slate-100 text-slate-800 border-slate-200 hover:bg-slate-200'
                        }
                      `}
                    >
                      {farmacia.nombre}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resultados */}
        <div>
          {loading && <div className="text-center p-4 text-slate-500">Cargando pagos...</div>}
          {error && <div className="bg-red-100 border border-red-300 text-red-800 p-4 rounded-md text-center">{error}</div>}
          
          {!loading && !error && pagos.length > 0 && pagosFiltrados.length === 0 && (
            <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded-md text-center">No se encontraron pagos que coincidan con todos los filtros aplicados.</div>
          )}
          {!loading && !error && pagos.length === 0 && (
             <div className="text-center p-4 text-slate-500">No se encontraron pagos para el rango de fechas seleccionado.</div>
          )}
          
          {pagosFiltrados.length > 0 && <TablaPagos pagos={pagosFiltrados} />}
        </div>
      </div>
    </div>
  );
};

export default VisualizarPagos;