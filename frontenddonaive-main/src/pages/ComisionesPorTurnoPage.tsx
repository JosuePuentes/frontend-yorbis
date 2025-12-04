import React, { useState } from "react";
import { animate } from 'animejs';
import { ReportButton } from "@/components/reports/ReportButton";
import { useReports } from "@/hooks/useReports";
import { generateReportConfigs } from '@/config/reportConfigs';

type Comision = {
  cajero: string;
  turno: string;
  comision: number;
  totalVentas?: number;
  sobrante?: number;
  faltante?: number;
  farmacias?: Record<string, string> | string[];
  comisionPorcentaje?: number;
  dia?: string; // <-- Agregado para la fecha
  estado?: string; // Estado del cajero
};

const ComisionesPorTurnoPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");
  const [openCajero, setOpenCajero] = useState<string | null>(null);
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const { generateReport } = useReports();

  // Cargar farmacias del usuario
  React.useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(
          ([id, nombre]) => ({ id, nombre: String(nombre) })
        );
        setFarmacias(farmaciasArr);
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  const handleGenerateReport = async (params: any) => {
    try {
      const reportData = {
        headers: [
          'Fecha',
          'Farmacia',
          'Cajero',
          'Turno',
          'Ventas',
          '% Comisión',
          'Comisión'
        ],
        rows: comisiones.map(comision => [
          comision.dia || '',
          farmacias.find(f => f.id === farmaciaFiltro)?.nombre || 'Todas',
          comision.cajero,
          comision.turno,
          (comision.totalVentas || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `${(comision.comisionPorcentaje || 0)}%`,
          (comision.comision || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })
        ]),
        summary: {
          totalRows: comisiones.length,
          totals: {
            'Total Ventas': comisiones.reduce((acc, c) => acc + (c.totalVentas || 0), 0),
            'Total Comisiones': comisiones.reduce((acc, c) => acc + (c.comision || 0), 0)
          }
        }
      };

      return await generateReport(params, reportData);
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  };

  // Adjusted to handle updated backend response structure
  const handleFetchComisiones = async () => {
    if (!startDate || !endDate) {
      alert("Por favor selecciona ambas fechas");
      return;
    }

    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/comisiones?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Error al obtener las comisiones");
      const data = await res.json();

      // Updated to handle new backend response structure
      setComisiones(
        Array.isArray(data)
          ? data.map((item) => ({
              cajero: item.NOMBRE || "Sin nombre", // Ajuste para manejar valores vacíos
              turno: item.turno || "Sin turno",
              comision: item.comision || 0,
              totalVentas: item.totalVentas || 0,
              sobrante: item.sobrante || 0,
              faltante: item.faltante || 0,
              farmacias: item.farmacias || [],
              comisionPorcentaje: item.comisionPorcentaje || 0,
              dia: item.dia || undefined, // <-- Mapear el campo dia
              estado: item.estado || undefined, // <-- Mapear el campo estado
            }))
          : []
      );
      console.log("Comisiones obtenidas:", data);
    } catch (error) {
      console.error("Error al obtener las comisiones:", error);
      alert("Hubo un error al obtener las comisiones");
    } finally {
      setLoading(false);
    }
  };

  // Chips de farmacias únicas para filtrar
  const farmaciasUnicas = Array.from(
    new Set(
      comisiones
        .flatMap((c) =>
          Array.isArray(c.farmacias)
            ? c.farmacias
            : c.farmacias
            ? Object.values(c.farmacias)
            : []
        )
        .filter(Boolean)
    )
  );

  // Chips de estados únicos para filtrar
  const estadosUnicos = ['activo', 'inactivo'].filter(e =>
    comisiones.some(c => c.estado === e)
  );

  // Agrupar por cajero con filtro de farmacia
  const comisionesFiltradas = comisiones.filter((comision) => {
    const coincideBusqueda =
      comision.turno.toLowerCase().includes(search.toLowerCase()) ||
      comision.cajero.toLowerCase().includes(search.toLowerCase());
    const farmaciasArr = Array.isArray(comision.farmacias)
      ? comision.farmacias
      : comision.farmacias
      ? Object.values(comision.farmacias)
      : [];
    const coincideFarmacia =
      !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
    const coincideEstado =
      !estadoFiltro || comision.estado === estadoFiltro;
    return coincideBusqueda && coincideFarmacia && coincideEstado;
  });
  const comisionesPorCajero = comisionesFiltradas.reduce<Record<string, Comision[]>>((acc, comision) => {
    if (!acc[comision.cajero]) acc[comision.cajero] = [];
    acc[comision.cajero].push(comision);
    return acc;
  }, {});

  // Calcular el total de comisiones filtradas
  const totalComisionesFiltradas = comisionesFiltradas.reduce((acc, c) => acc + (Number(c.comision) || 0), 0);

  // Obtener farmacias del usuario autenticado desde localStorage
  const usuarioRaw = localStorage.getItem("usuario");
  let farmaciasUsuario: { [id: string]: string } = {};
  if (usuarioRaw) {
    try {
      const usuario = JSON.parse(usuarioRaw);
      farmaciasUsuario = usuario.farmacias || {};
    } catch {
      farmaciasUsuario = {};
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-4 px-2 sm:px-4 md:px-6 lg:px-8">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-blue-800 text-center flex-1">
          Comisiones por Turno
        </h1>
        <ReportButton
          module="Comisiones"
          reports={generateReportConfigs(farmacias).comisionesReports}
          onGenerateReport={handleGenerateReport}
          farmacias={farmacias}
          className="bg-purple-600 hover:bg-purple-700 text-white"
        />
      </div>
      {Object.keys(farmaciasUsuario).length > 0 && (
        <div className="text-center text-sm text-gray-600 mb-4">
          Farmacia asignada: <span className="font-semibold text-blue-700">{Object.values(farmaciasUsuario).join(", ")}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha de Fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
          />
        </div>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por descripción de turno o cajero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
        />
      </div>

      <button
        onClick={handleFetchComisiones}
        disabled={loading}
        className="w-full sm:w-auto bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition mb-6 disabled:opacity-50"
      >
        {loading ? "Cargando..." : "Obtener Comisiones"}
      </button>

      {/* Chips de filtro por farmacia */}
      <div className="mb-4 flex flex-wrap gap-2 overflow-x-auto">
        {farmaciasUnicas.map((f) => (
          <button
            key={f}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
              farmaciaFiltro === f
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
            onClick={() => setFarmaciaFiltro(farmaciaFiltro === f ? "" : f)}
          >
            {f}
          </button>
        ))}
        {farmaciaFiltro && (
          <button
            className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-200 text-gray-700 border-gray-300 ml-2"
            onClick={() => setFarmaciaFiltro("")}
          >
            Limpiar filtro
          </button>
        )}
        {/* Chips de filtro por estado */}
        {estadosUnicos.map((estado) => (
          <button
            key={estado}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
              estadoFiltro === estado
                ? "bg-purple-500 text-white border-purple-600"
                : "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
            }`}
            onClick={() => setEstadoFiltro(estadoFiltro === (estado ?? "") ? "" : (estado ?? ""))}
          >
            {estado}
          </button>
        ))}
        {estadoFiltro && (
          <button
            className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-200 text-gray-700 border-gray-300 ml-2"
            onClick={() => setEstadoFiltro("")}
          >
            Limpiar estado
          </button>
        )}
      </div>
      {/* Total de comisiones filtradas */}
      <div className="mb-4 text-right text-base font-semibold text-blue-800">
        Total comisión filtrada: ${Number(totalComisionesFiltradas).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>

      {Object.keys(comisionesPorCajero).length > 0 ? (
        <div className="space-y-6">
          {Object.entries(comisionesPorCajero).map(([cajero, lista]) => {
            // Calcular totales por cajero
            const totalComision = lista.reduce((acc, item) => acc + (Number(item.comision) || 0), 0);
            const totalVentas = lista.reduce((acc, item) => acc + (Number(item.totalVentas) || 0), 0);
            const totalSobrante = lista.reduce((acc, item) => acc + (Number(item.sobrante) || 0), 0);
            const totalFaltante = lista.reduce((acc, item) => acc + (Number(item.faltante) || 0), 0);
            const isOpen = openCajero === cajero;
            return (
              <div key={cajero} className="border rounded-lg shadow bg-white overflow-x-auto">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 text-lg font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-400 transition bg-blue-50 hover:bg-blue-100 rounded-t-lg"
                  onClick={() => {
                    setOpenCajero(isOpen ? null : cajero);
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`panel-${cajero}`}
                  ref={el => {
                    if (el && !isOpen) {
                      animate(el, {
                        opacity: [0, 1],
                        translateY: [-24, 0],
                        duration: 400,
                        easing: 'outCubic'
                      });
                    }
                  }}
                >
                  <span>{cajero}</span>
                  {lista[0].estado && (
                    <span className="ml-2 text-xs text-purple-700 font-normal">Estado: {lista[0].estado}</span>
                  )}
                  <span className="ml-2 text-xs text-blue-700 font-normal">
                    {lista[0].farmacias && (
                      <>Farmacia(s): {Array.isArray(lista[0].farmacias) ? lista[0].farmacias.join(", ") : Object.values(lista[0].farmacias).join(", ")}</>
                    )}
                  </span>
                  <span className="ml-2 text-xs text-green-700 font-normal">
                    % Comisión: {lista[0].comisionPorcentaje ?? 0}
                  </span>
                  <svg className={`ml-4 w-5 h-5 transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                </button>
                {/* Totales SIEMPRE visibles */}
                <div className="flex flex-col xs:flex-row xs:flex-wrap sm:flex-row sm:justify-between text-sm font-bold text-blue-900 bg-blue-50 rounded-b px-4 py-2 gap-2 sm:gap-0 border-t">
                  <span className="block min-w-[80px]">Total</span>
                  <span className="block min-w-[120px]">Comisión: ${Number(totalComision).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="block min-w-[140px]">Total vendido: ${Number(totalVentas).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="block min-w-[110px]">Sobrante: ${Number(totalSobrante).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="block min-w-[110px] text-red-600">Faltante: ${Number(totalFaltante).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {/* Lista de turnos desplegable */}
                {isOpen && (
                  <ul id={`panel-${cajero}`} className="divide-y divide-gray-200 min-w-[340px] sm:min-w-0 px-2 pb-2"
                    ref={el => {
                      if (el) {
                        animate(el, {
                          opacity: [0, 1],
                          translateY: [-24, 0],
                          duration: 400,
                          easing: 'outCubic'
                        });
                      }
                    }}
                  >
                    {lista.map((item, index) => (
                      <li key={index} className="py-2 flex flex-col xs:flex-row xs:flex-wrap sm:flex-row sm:justify-between text-sm text-gray-700 gap-2 sm:gap-0">
                        <span className="block min-w-[120px]">Nombre: <strong>{item.cajero}</strong></span>
                        <span className="block min-w-[100px]">Turno: <strong>{item.turno}</strong></span>
                        {item.dia && typeof item.dia === 'string' && (
                          <span className="block min-w-[110px]">Día: <strong>{item.dia.slice(0, 10)}</strong></span>
                        )}
                        <span className="block min-w-[140px]">Total vendido: <strong>${Number(item.totalVentas ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span className="block min-w-[110px]">Sobrante: <strong className="text-green-700">${Number(item.sobrante ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span className="block min-w-[110px]">Faltante: <strong className="text-red-700">${Number(item.faltante ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                        <span className="block min-w-[120px]">Comisión: <strong>${Number(item.comision ?? 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center text-gray-500">No hay comisiones disponibles.</div>
        )
      )}
    </div>
  );
};

export default ComisionesPorTurnoPage;