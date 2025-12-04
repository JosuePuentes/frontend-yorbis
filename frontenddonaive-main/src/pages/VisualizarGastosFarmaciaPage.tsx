import React, { useEffect, useState } from "react";
import ImageDisplay from "../components/upfile/ImageDisplay";
import { ReportButton } from "@/components/reports/ReportButton";
import { useReports } from "@/hooks/useReports";
import { generateReportConfigs } from '@/config/reportConfigs';
import { animate, stagger } from 'animejs';

interface Gasto {
  _id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  fecha: string; // Fecha de gasto (ej: "2025-06-23")
  fechaRegistro?: string | number | { $date: { $numberLong: string } }; // Puede venir como ISO, timestamp o formato Mongo
  estado: string; // "wait", "verified", "denied"
  localidad: string;
  divisa?: string;
  tasa?: number;
  imagenGasto?: string;
  imagenesGasto?: string[];
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const ESTADO_OPCIONES = ["wait", "verified", "denied"];

function formatFecha(fechaISO: string, fechaRegistro?: any) {
  // Si hay fechaRegistro y es un objeto Mongo, usarla para mostrar fecha y hora
  if (fechaRegistro && typeof fechaRegistro === 'object' && fechaRegistro.$date && fechaRegistro.$date.$numberLong) {
    const date = new Date(Number(fechaRegistro.$date.$numberLong));
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  // Si es string o timestamp
  if (fechaRegistro && (typeof fechaRegistro === 'string' || typeof fechaRegistro === 'number')) {
    const date = new Date(fechaRegistro);
    return date.toLocaleString('es-VE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
  // Fallback: solo fecha simple
  const date = new Date(fechaISO);
  return date.toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

// Componente Badge para el estado del gasto
const EstadoGastoBadge: React.FC<{ estado: string }> = ({ estado }) => {
  let colorClasses = "";
  let textoEstado = estado;

  switch (estado?.toLowerCase()) {
    case "wait":
      colorClasses = "bg-yellow-100 text-yellow-800";
      textoEstado = "En Espera";
      break;
    case "verified":
      colorClasses = "bg-green-100 text-green-800";
      textoEstado = "Verificado";
      break;
    case "denied":
      colorClasses = "bg-red-100 text-red-800";
      textoEstado = "Rechazado";
      break;
    default:
      colorClasses = "bg-slate-100 text-slate-800";
      textoEstado = estado?.charAt(0).toUpperCase() + estado?.slice(1);
  }
  return (
    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${colorClasses}`}>
      {textoEstado}
    </span>
  );
};


const VisualizarGastosFarmaciaPage: React.FC = () => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [proveedorFiltro, setProveedorFiltro] = useState<string>(""); // Usado para filtrar por título
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; gastoId: string | null; nuevoEstado: string }>({ open: false, gastoId: null, nuevoEstado: "" });
  const [imagenAmpliada, setImagenAmpliada] = useState<{imagenes: string[], index: number} | null>(null);
  const { generateReport } = useReports();

  const fetchGastos = async () => {
    setLoading(true);
    setError(null);
    try {
      let url = `${API_BASE_URL}/gastos?`;
      if (selectedFarmacia) url += `localidad=${selectedFarmacia}&`;
      if (fechaInicio) url += `fecha_inicio=${fechaInicio}&`;
      if (fechaFin) url += `fecha_fin=${fechaFin}&`;
      
      // Agregamos el token de autenticación si es necesario para esta ruta
      const token = localStorage.getItem("access_token"); // Asumiendo que usas token como en el anterior
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Error desconocido al obtener gastos" }));
        throw new Error(errorData.message || "Error al obtener gastos");
      }
      const data = await res.json();
      setGastos(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener gastos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setFechaInicio(firstDay.toISOString().slice(0, 10));
    setFechaFin(lastDay.toISOString().slice(0, 10));
    
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(farmaciasArr);
         if (farmaciasArr.length === 1) { // Si solo hay una farmacia, seleccionarla por defecto
            setSelectedFarmacia(farmaciasArr[0].id);
        }
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  useEffect(() => {
    // Solo llamar a fetchGastos si las fechas están seteadas (evita llamadas iniciales sin fechas)
    // y si hay farmacias o no se requiere una farmacia seleccionada para la primera carga
    if (fechaInicio && fechaFin && (farmacias.length === 0 || farmacias.length > 1 || selectedFarmacia) ) {
        fetchGastos();
    }
  }, [selectedFarmacia, fechaInicio, fechaFin, farmacias]); // Añadir farmacias a las dependencias

  const handleEstadoSelect = (gastoId: string, nuevoEstado: string) => {
    setConfirmDialog({ open: true, gastoId, nuevoEstado });
  };

  const handleConfirmChange = async () => {
    if (!confirmDialog.gastoId) return;
    setError(null);
    try {
      const token = localStorage.getItem("access_token"); // Asumiendo que usas token
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: headers,
        body: JSON.stringify({ id: confirmDialog.gastoId, estado: confirmDialog.nuevoEstado })
      });
      if (!res.ok) {
         const errorData = await res.json().catch(() => ({ message: "Error desconocido al actualizar estado" }));
        throw new Error(errorData.detail || errorData.message || "Error al actualizar el estado del gasto");
      }
      setGastos(prev => prev.map(g => g._id === confirmDialog.gastoId ? { ...g, estado: confirmDialog.nuevoEstado } : g));
      setSuccess("Estado actualizado correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el estado del gasto");
      setTimeout(() => setError(null), 5000);
    } finally {
      setConfirmDialog({ open: false, gastoId: null, nuevoEstado: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, gastoId: null, nuevoEstado: "" });
  };

  const handleGenerateReport = async (params: any) => {
    try {
      // Preparar los datos del reporte basados en los gastos filtrados
      const reportData = {
        headers: [
          'Fecha',
          'Farmacia',
          'Categoría',
          'Descripción',
          'Monto',
          'Usuario',
          'Estado'
        ],
        rows: gastosFiltrados.map(gasto => [
          formatFecha(gasto.fecha, gasto.fechaRegistro),
          farmacias.find(f => f.id === gasto.localidad)?.nombre || gasto.localidad,
          gasto.titulo,
          gasto.descripcion,
          `${gasto.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${gasto.divisa || ''}`,
          'Usuario', // Aquí podrías agregar el campo de usuario si está disponible
          gasto.estado
        ]),
        summary: {
          totalRows: gastosFiltrados.length,
          totals: {
            'Total Bs': totalBs,
            'Total USD': totalUSD
          }
        }
      };

      return await generateReport(params, reportData);
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  };

  const gastosFiltrados = gastos
    .filter(g => {
      // Si el filtro es "" (Todos), mostrar todos sin filtrar por estado
      if (!estadoFiltro) return true;
      return g.estado && g.estado.trim().toLowerCase() === estadoFiltro.trim().toLowerCase();
    })
    .filter(g =>
      !proveedorFiltro ||
      g.titulo.toLowerCase().includes(proveedorFiltro.toLowerCase()) ||
      g.descripcion.toLowerCase().includes(proveedorFiltro.toLowerCase())
    )
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  // Debug: mostrar valores de filtro y estados para depuración
  // console.log('estadoFiltro:', estadoFiltro, 'gastos:', gastos.map(g => g.estado));

  useEffect(() => {
    // Animar fechas y montos al renderizar la lista filtrada
    animate('.gasto-fecha, .gasto-monto', {
      opacity: [0, 1],
      y: [20, 0],
      duration: 500,
      delay: stagger(60)
    });
  }, [gastosFiltrados]);

  // Calcular totales globales en USD y Bs
  const totalUSD = gastosFiltrados.reduce((acc, g) => {
    if (g.divisa === 'Bs' && g.tasa) {
      return acc + (g.monto / g.tasa);
    }
    return acc + g.monto;
  }, 0);
  const totalBs = gastosFiltrados.reduce((acc, g) => {
    if (g.divisa === 'Bs') {
      return acc + g.monto;
    }
    if (g.divisa === 'USD' && g.tasa) {
      return acc + (g.monto * g.tasa);
    }
    return acc;
  }, 0);

  return (
    <div className="h-1 bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-red-700 text-center flex-1">Gestión de Gastos</h1>
          <ReportButton
            module="Gastos"
            reports={generateReportConfigs(farmacias).gastosReports}
            onGenerateReport={handleGenerateReport}
            farmacias={farmacias}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          />
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Éxito</p>
            <p>{success}</p>
          </div>
        )}

        <div className="bg-white p-6 rounded-lg shadow-lg mb-8">
          <h2 className="text-xl font-semibold text-slate-700 mb-4">Filtros</h2>
          
          {farmacias.length > 1 && ( // Solo mostrar si hay más de una farmacia
            <div className="mb-6">
              <span className="font-medium text-slate-700 mr-3">Farmacias:</span>
              <div className="flex flex-wrap gap-2 mt-2">
                {farmacias.map(f => (
                  <button
                    key={f.id}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 ease-in-out
                                ${selectedFarmacia === f.id 
                                  ? 'bg-red-600 text-white shadow-md ring-2 ring-red-300' 
                                  : 'bg-slate-100 text-slate-700 hover:bg-red-100 hover:text-red-700 border border-slate-300'}`}
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
              <label htmlFor="proveedorFiltro" className="block text-sm font-medium text-slate-600 mb-1">Buscar Título/Descripción</label>
              <input 
                type="text" 
                id="proveedorFiltro"
                value={proveedorFiltro} 
                onChange={e => setProveedorFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-2 px-3 text-sm" 
                placeholder="Ej: Reparación, Papelería..." />
            </div>
            <div>
              <label htmlFor="estadoFiltro" className="block text-sm font-medium text-slate-600 mb-1">Estado</label>
              <select 
                id="estadoFiltro"
                value={estadoFiltro} 
                onChange={e => setEstadoFiltro(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-2 px-3 text-sm"
              >
                <option value="">Todos</option>
                {ESTADO_OPCIONES.map(opt => (
                  <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="fechaInicio" className="block text-sm font-medium text-slate-600 mb-1">Fecha Desde</label>
              <input 
                type="date" 
                id="fechaInicio"
                value={fechaInicio} 
                onChange={e => setFechaInicio(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
            </div>
            <div>
              <label htmlFor="fechaFin" className="block text-sm font-medium text-slate-600 mb-1">Fecha Hasta</label>
              <input 
                type="date" 
                id="fechaFin"
                value={fechaFin} 
                onChange={e => setFechaFin(e.target.value)} 
                className="w-full border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-2 px-3 text-sm" />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-red-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando gastos...
          </div>
        ) : gastosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.25 3.75H6.75C5.7835 3.75 5 4.5335 5 5.5V18.5C5 19.4665 5.7835 20.25 6.75 20.25H17.25C18.2165 20.25 19 19.4665 19 18.5V12.75M10.75 8.75L18.25 1.25M18.25 1.25H13.75M18.25 1.25V5.75" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay gastos registrados</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron gastos que coincidan con los filtros aplicados o para el período seleccionado.</p>
          </div>
        ) : (
          <>
            {/* Vista de tabla para pantallas medianas y grandes */}
            <div className=" max-h-96 hidden sm:block bg-white rounded-lg shadow-xl overflow-auto max-w-full">
              <div className="overflow-x-auto w-full">
                <table className="min-w-full divide-y divide-slate-200 table-fixed" style={{ maxWidth: '100vw' }}>
                  <thead className="bg-red-50">
                    <tr>
                      <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-red-700 uppercase tracking-wider whitespace-nowrap">Imagen</th>
                      {['Fecha','Fecha R.', 'Título', 'Descripción', 'Monto', 'Moneda', 'Tasa', 'Estado', 'Acción'].map(header => (
                        <th key={header} scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-red-700 uppercase tracking-wider whitespace-nowrap">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {gastosFiltrados.map(g => (
                      <tr key={g._id} className="hover:bg-red-50/50 transition-colors duration-150 ease-in-out">
                        <td className="px-5 py-4 whitespace-nowrap">
                          {Array.isArray(g.imagenesGasto) && g.imagenesGasto.length > 0 ? (
                            <ImageDisplay
                              imageName={g.imagenesGasto[0]}
                              alt="Imagen gasto"
                              style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px #0001' }}
                              onClickImage={() => setImagenAmpliada({imagenes: g.imagenesGasto ?? [], index: 0})}
                            />
                          ) : g.imagenGasto ? (
                            <ImageDisplay
                              imageName={g.imagenGasto}
                              alt="Imagen gasto"
                              style={{ height: 48, width: 48, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid #e2e8f0', boxShadow: '0 1px 4px #0001' }}
                              onClickImage={() => setImagenAmpliada({imagenes: g.imagenGasto ? [g.imagenGasto] : [], index: 0})}
                            />
                          ) : (
                            <span className="text-slate-400 text-xs">Sin imagen</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 gasto-fecha">{formatFecha(g.fecha,)}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 gasto-fecha">{formatFecha(g.fecha, g.fechaRegistro)}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-800 font-medium">{g.titulo}</td>
                        <td className="px-5 py-4 text-sm text-slate-600 max-w-md truncate cursor-pointer group relative" title={g.descripcion}
                          onClick={e => {
                            e.stopPropagation();
                            const target = e.currentTarget;
                            // Si ya existe el tooltip, lo quitamos
                            const existing = target.querySelector('.desc-tooltip');
                            if (existing) {
                              existing.remove();
                              return;
                            }
                            // Crear tooltip
                            const tooltip = document.createElement('div');
                            tooltip.className = 'desc-tooltip fixed z-50 bg-white border border-slate-300 shadow-lg rounded-lg p-4 text-slate-800 text-sm max-w-xs w-fit break-words';
                            tooltip.style.top = `${target.getBoundingClientRect().bottom + window.scrollY + 8}px`;
                            tooltip.style.left = `${target.getBoundingClientRect().left + window.scrollX}px`;
                            tooltip.innerText = g.descripcion;
                            // Cerrar al hacer click fuera
                            const closeTooltip = (ev: MouseEvent) => {
                              if (!tooltip.contains(ev.target as Node)) {
                                tooltip.remove();
                                document.removeEventListener('mousedown', closeTooltip);
                              }
                            };
                            document.addEventListener('mousedown', closeTooltip);
                            document.body.appendChild(tooltip);
                            // Responsive: ajustar si se sale de la pantalla
                            setTimeout(() => {
                              const rect = tooltip.getBoundingClientRect();
                              if (rect.right > window.innerWidth) {
                                tooltip.style.left = `${window.innerWidth - rect.width - 16}px`;
                              }
                              if (rect.bottom > window.innerHeight) {
                                tooltip.style.top = `${window.innerHeight - rect.height - 16 + window.scrollY}px`;
                              }
                            }, 10);
                          }}
                        >
                          {g.descripcion}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-800 font-semibold text-right gasto-monto">
                          {g.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-800">{g.divisa || '-'}</td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-800">{g.tasa ? g.tasa : '-'}</td>
                        <td className="px-5 py-4 whitespace-nowrap">
                          <EstadoGastoBadge estado={g.estado} />
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm">
                          <select
                            value={g.estado}
                            onChange={e => handleEstadoSelect(g._id, e.target.value)}
                            className="border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-1.5 px-2 text-xs"
                          >
                            {ESTADO_OPCIONES.map(opt => (
                              <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Total de gastos en tabla, ahora fuera de la tabla */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 bg-red-50 border-t border-red-200 px-5 py-4 mt-2 rounded-lg">
              <span className="text-lg font-bold text-red-700">Total Bs: {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-lg font-bold text-blue-700">Total $: {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            
            {/* Vista tipo tarjeta para móviles */}
            <div className="sm:hidden flex flex-col gap-4">
              {gastosFiltrados.map(g => (
                <div key={g._id} className="bg-white rounded-lg shadow-lg p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold text-base text-red-700">{g.titulo}</div>
                      <div className="text-xs text-slate-500 gasto-fecha">{formatFecha(g.fecha, g.fechaRegistro)}</div>
                    </div>
                    <EstadoGastoBadge estado={g.estado} />
                  </div>
                  <p className="text-sm text-slate-600 line-clamp-3" title={g.descripcion}>{g.descripcion || "Sin descripción"}</p>
                  <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-100">
                    <span className="font-bold text-lg text-slate-800 gasto-monto">
                      {g.divisa === 'Bs' && g.tasa ?
                        `Bs ${(g.monto).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / Tasa: ${g.tasa}\n$${(g.monto / g.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                        :
                        `$${g.monto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                      }
                    </span>
                    <select
                      value={g.estado}
                      onChange={e => handleEstadoSelect(g._id, e.target.value)}
                      className="border-slate-300 rounded-md shadow-sm focus:border-red-500 focus:ring focus:ring-red-200 focus:ring-opacity-50 py-1.5 px-2 text-xs"
                    >
                      {ESTADO_OPCIONES.map(opt => (
                        <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
              {/* Total de gastos en vista móvil, ahora fuera de la lista */}
              <div className="flex flex-col gap-2 bg-red-50 border-t border-red-200 px-4 py-3 mt-2 rounded-lg sm:hidden">
                <span className="text-base font-bold text-red-700">Total Bs: {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-base font-bold text-blue-700">Total $: {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
            </div>
          </>
        )}

        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estado</h2>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea cambiar el estado del gasto a
                <span className={`font-bold ml-1 ${confirmDialog.nuevoEstado === 'denied' ? 'text-red-600' : confirmDialog.nuevoEstado === 'verified' ? 'text-green-600' : 'text-yellow-600'}`}>{confirmDialog.nuevoEstado}</span>?
              </p>
              {confirmDialog.nuevoEstado === 'denied' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                  <strong>Advertencia:</strong> Esta acción es irreversible. El gasto será marcado como rechazado.
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleCancelChange}
                  className="px-5 py-2.5 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium transition-colors duration-150 ease-in-out"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmChange}
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md ${confirmDialog.nuevoEstado === 'denied' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}
        {imagenAmpliada && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
            <button
              className="absolute top-4 right-4 text-white text-2xl bg-black bg-opacity-40 rounded-full px-3 py-1"
              onClick={() => setImagenAmpliada(null)}
              aria-label="Cerrar"
            >×</button>
            <div className="flex flex-col items-center">
              <ImageDisplay
                imageName={imagenAmpliada.imagenes[imagenAmpliada.index]}
                alt={`Imagen ampliada ${imagenAmpliada.index + 1}`}
                style={{ maxHeight: '80vh', maxWidth: '90vw', borderRadius: 12, boxShadow: '0 0 24px #0008', border: '4px solid #fff', marginBottom: 16 }}
              />
              {imagenAmpliada.imagenes.length > 1 && (
                <div className="flex gap-2 justify-center">
                  <button
                    className="px-3 py-1 bg-white bg-opacity-80 rounded shadow text-slate-700 font-bold"
                    disabled={imagenAmpliada.index === 0}
                    onClick={() => setImagenAmpliada(imagenAmpliada => imagenAmpliada ? {...imagenAmpliada, index: imagenAmpliada.index - 1} : null)}
                  >Anterior</button>
                  <span className="text-white font-semibold">{imagenAmpliada.index + 1} / {imagenAmpliada.imagenes.length}</span>
                  <button
                    className="px-3 py-1 bg-white bg-opacity-80 rounded shadow text-slate-700 font-bold"
                    disabled={imagenAmpliada.index === imagenAmpliada.imagenes.length - 1}
                    onClick={() => setImagenAmpliada(imagenAmpliada => imagenAmpliada ? {...imagenAmpliada, index: imagenAmpliada.index + 1} : null)}
                  >Siguiente</button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarGastosFarmaciaPage;
