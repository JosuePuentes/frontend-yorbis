import React, { useState } from "react";
import { ReportButton } from "@/components/reports/ReportButton";
import { useReports } from "@/hooks/useReports";
import { generateReportConfigs } from '@/config/reportConfigs';

type CajeroEspecial = {
  cajero: string;
  cajeroId: string;
  farmacias?: Record<string, string> | string[];
  totalVentas: number;
  comisionPorcentaje?: number;
  estado?: string; // Estado del cajero
};

const ComisionesEspecialesPage: React.FC = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [cajeros, setCajeros] = useState<CajeroEspecial[]>([]);
  const [totalVentasEspecial, setTotalVentasEspecial] = useState(0);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");
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
          'Tipo Comisión',
          'Monto Base',
          '% Comisión',
          'Comisión Total'
        ],
        rows: cajeros.map(cajero => [
          `${startDate} - ${endDate}`,
          farmacias.find(f => f.id === farmaciaFiltro)?.nombre || 'Todas',
          'Comisión Especial',
          (cajero.totalVentas || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
          `${(cajero.comisionPorcentaje || 0)}%`,
          ((cajero.totalVentas || 0) * (cajero.comisionPorcentaje || 0) / 100).toLocaleString('es-VE', { minimumFractionDigits: 2 })
        ]),
        summary: {
          totalRows: cajeros.length,
          totals: {
            'Total Ventas': cajeros.reduce((acc, c) => acc + (c.totalVentas || 0), 0),
            'Total Comisiones': cajeros.reduce((acc, c) => acc + ((c.totalVentas || 0) * (c.comisionPorcentaje || 0) / 100), 0)
          }
        }
      };

      return await generateReport(params, reportData);
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  };

  const handleFetchComisiones = async () => {
    if (!startDate || !endDate) {
      alert("Por favor selecciona ambas fechas");
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE_URL}/comisiones/especial?startDate=${startDate}&endDate=${endDate}`
      );
      if (!res.ok) throw new Error("Error al obtener las comisiones especiales");
      const data = await res.json();
      setCajeros(data.cajeros || []);
      setTotalVentasEspecial(data.totalVentasEspecial || 0);
    } catch (error) {
      alert("Hubo un error al obtener las comisiones especiales");
    } finally {
      setLoading(false);
    }
  };

  // Chips de farmacias únicas para filtrar
  const farmaciasUnicas = Array.from(
    new Set(
      cajeros
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

  // Chips de estados únicos para filtrar (solo activo/inactivo)
  const estadosUnicos = ['activo', 'inactivo'].filter(e =>
    cajeros.some(c => c.estado === e)
  );

  // Filtro por búsqueda y farmacia
  const cajerosFiltrados = cajeros.filter((c) => {
    const coincideBusqueda =
      c.cajero.toLowerCase().includes(search.toLowerCase()) ||
      c.cajeroId.toLowerCase().includes(search.toLowerCase());
    const farmaciasArr = Array.isArray(c.farmacias)
      ? c.farmacias
      : c.farmacias
      ? Object.values(c.farmacias)
      : [];
    const coincideFarmacia =
      !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
    const coincideEstado =
      !estadoFiltro || c.estado === estadoFiltro;
    return coincideBusqueda && coincideFarmacia && coincideEstado;
  });

  // Total de ventas filtradas
  const totalFiltrado = cajerosFiltrados.reduce(
    (acc, c) => acc + (Number(c.totalVentas) || 0),
    0
  );

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
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-blue-800 text-center flex-1">
          Comisiones Especiales
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
          placeholder="Buscar por nombre o ID de cajero..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
        />
      </div>
      <button
        onClick={handleFetchComisiones}
        disabled={loading}
        className="bg-blue-500 text-white py-2 px-4 rounded-lg shadow hover:bg-blue-600 transition mb-6 disabled:opacity-50"
      >
        {loading ? "Cargando..." : "Obtener Comisiones Especiales"}
      </button>
      {/* Chips de filtro por farmacia */}
      <div className="mb-4 flex flex-wrap gap-2">
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
      {/* Total de ventas filtradas */}
      <div className="mb-4 text-right text-base font-semibold text-blue-800">
        Total ventas filtradas: ${Number(totalFiltrado).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {/* Total global */}
      <div className="mb-4 text-right text-base font-semibold text-green-700">
        Total ventas especiales (global): ${Number(totalVentasEspecial).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {cajerosFiltrados.length > 0 ? (
        <div className="space-y-6">
          {cajerosFiltrados.map((c) => {
            // Calcular comisión
            const porcentaje = Number(c.comisionPorcentaje) || 0;
            const comision = (Number(c.totalVentas) * porcentaje) / 100;
            return (
              <div key={c.cajeroId} className="border p-4 rounded-lg shadow">
                <h2 className="text-lg font-semibold text-gray-800 mb-2">{c.cajero}</h2>
                {c.estado && (
                  <span className="text-xs text-purple-700 font-normal">Estado: {c.estado}</span>
                )}
                <ul className="divide-y divide-gray-200">
                  <li className="py-2 flex flex-col sm:flex-row sm:justify-between text-sm text-gray-700 gap-2">
                    <span>ID: <strong>{c.cajeroId}</strong></span>
                    <span>Total vendido: <strong>${Number(c.totalVentas).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    <span>Comisión: <strong>${comision.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({porcentaje}%)</strong></span>
                    {c.farmacias && (
                      <span className="text-xs text-blue-600 mt-1 sm:mt-0">Farmacias: {Array.isArray(c.farmacias) ? c.farmacias.join(", ") : Object.values(c.farmacias).join(", ")}</span>
                    )}
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
      ) : (
        !loading && (
          <div className="text-center text-gray-500">No hay comisiones especiales disponibles.</div>
        )
      )}
    </div>
  );
};

export default ComisionesEspecialesPage;
