import React from "react";

export interface Farmacia {
  id: string;
  nombre: string;
  [key: string]: any;
}

interface FiltrosCuentasPorPagarProps {
  farmacias: Farmacia[];
  selectedFarmacia: string;
  setSelectedFarmacia: (id: string) => void;
  proveedorFiltro: string;
  setProveedorFiltro: (v: string) => void;
  estatusFiltro: string;
  setEstatusFiltro: (v: string) => void;
  fechaInicio: string;
  setFechaInicio: (v: string) => void;
  fechaFin: string;
  setFechaFin: (v: string) => void;
  ESTATUS_OPCIONES: string[];
}

const FiltrosCuentasPorPagar: React.FC<FiltrosCuentasPorPagarProps> = ({
  farmacias,
  selectedFarmacia,
  setSelectedFarmacia,
  proveedorFiltro,
  setProveedorFiltro,
  estatusFiltro,
  setEstatusFiltro,
  fechaInicio,
  setFechaInicio,
  fechaFin,
  setFechaFin,
  ESTATUS_OPCIONES
}) => (
  <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
    <h2 className="text-xl font-semibold text-slate-700 mb-4">Filtros</h2>
    {farmacias.length > 1 && (
      <div className="mb-6">
        <span className="font-medium text-slate-700 mr-3">Negocios:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {farmacias.map(f => (
            <button
              key={f.id}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out ${selectedFarmacia === f.id ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-300' : 'bg-slate-100 text-slate-700 hover:bg-indigo-100 hover:text-indigo-700 border border-slate-300'}`}
              onClick={() => setSelectedFarmacia(f.id === selectedFarmacia ? "" : f.id)}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      </div>
    )}
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
      <div>
        <label htmlFor="proveedorFiltro" className="block text-sm font-medium text-slate-600 mb-1">Proveedor</label>
        <input
          type="text"
          id="proveedorFiltro"
          value={proveedorFiltro}
          onChange={e => setProveedorFiltro(e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
          placeholder="Buscar proveedor..." />
      </div>
      <div>
        <label htmlFor="estatusFiltro" className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
        <select
          id="estatusFiltro"
          value={estatusFiltro}
          onChange={e => setEstatusFiltro(e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm"
        >
          <option value="">Todos</option>
          {ESTATUS_OPCIONES.map(opt => (
            <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="fechaInicio" className="block text-sm font-medium text-slate-600 mb-1">Fecha desde</label>
        <input
          type="date"
          id="fechaInicio"
          value={fechaInicio}
          onChange={e => setFechaInicio(e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
      </div>
      <div>
        <label htmlFor="fechaFin" className="block text-sm font-medium text-slate-600 mb-1">Fecha hasta</label>
        <input
          type="date"
          id="fechaFin"
          value={fechaFin}
          onChange={e => setFechaFin(e.target.value)}
          className="w-full border-slate-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
      </div>
    </div>
  </div>
);

export default FiltrosCuentasPorPagar;
