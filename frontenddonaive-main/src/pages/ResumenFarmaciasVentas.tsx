import React, { useState } from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia";
import { useResumenData } from "@/hooks/useResumenData";
import { ReportButton } from "@/components/reports/ReportButton";
import { useReports } from "@/hooks/useReports";
import { generateReportConfigs } from '@/config/reportConfigs';
import { fetchWithAuth } from "@/lib/api";
import { Button } from "@/components/ui/button";
import ModalDevolucionCompra from "@/components/ModalDevolucionCompra";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ResumenFarmaciasVentas: React.FC = () => {
  const {
    loading,
    error,
    sortedFarmacias,
    ventas,
    pendientesPorFarmacia,
    inventariosFarmacia,
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
    setHoy,
    setAyer,
    setSemanaActual,
    setQuincenaActual,
    setMesActual,
    detallesVisibles,
    setDetallesVisibles,
    calcularDetalles,
    gastosPorFarmacia,
    cuentasActivasPorFarmacia,
    cuentasPagadasPorFarmacia,
    totalPagosPorFarmacia, // Este objeto ya contiene los totales por farmacia
    cuadresPorFarmacia // Datos reales de cuadres por farmacia
  } = useResumenData();

  const { generateReport } = useReports();

  // Cargar farmacias del usuario
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  
  // Estados para facturas procesadas
  const [facturasProcesadas, setFacturasProcesadas] = useState<{ [key: string]: any[] }>({});
  const [cargandoFacturas, setCargandoFacturas] = useState<{ [key: string]: boolean }>({});
  const [mostrarFacturasPorFarmacia, setMostrarFacturasPorFarmacia] = useState<{ [key: string]: boolean }>({});
  const [facturaParaDevolucion, setFacturaParaDevolucion] = useState<any | null>(null);
  const [showModalDevolucion, setShowModalDevolucion] = useState(false);

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

  // Función para obtener facturas procesadas por farmacia
  const obtenerFacturasProcesadas = async (farmaciaId: string) => {
    setCargandoFacturas(prev => ({ ...prev, [farmaciaId]: true }));
    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/punto-venta/ventas/usuario?sucursal=${farmaciaId}&limit=100&fecha_inicio=${fechaInicio || ''}&fecha_fin=${fechaFin || ''}`
      );
      
      if (res.ok) {
        const data = await res.json();
        setFacturasProcesadas(prev => ({ ...prev, [farmaciaId]: data.facturas || [] }));
      } else {
        console.error("Error al obtener facturas procesadas");
        setFacturasProcesadas(prev => ({ ...prev, [farmaciaId]: [] }));
      }
    } catch (error) {
      console.error("Error al obtener facturas procesadas:", error);
      setFacturasProcesadas(prev => ({ ...prev, [farmaciaId]: [] }));
    } finally {
      setCargandoFacturas(prev => ({ ...prev, [farmaciaId]: false }));
    }
  };

  // Función para manejar el toggle de facturas procesadas
  const handleToggleFacturasProcesadas = (farmaciaId: string) => {
    const mostrar = !mostrarFacturasPorFarmacia[farmaciaId];
    setMostrarFacturasPorFarmacia(prev => ({ ...prev, [farmaciaId]: mostrar }));
    
    if (mostrar && !facturasProcesadas[farmaciaId]) {
      obtenerFacturasProcesadas(farmaciaId);
    }
  };

  // Función para manejar devolución
  const handleDevolucion = (factura: any) => {
    setFacturaParaDevolucion(factura);
    setShowModalDevolucion(true);
  };

  // Función para cerrar modal de devolución y refrescar facturas
  const handleCerrarModalDevolucion = (farmaciaId?: string) => {
    setShowModalDevolucion(false);
    setFacturaParaDevolucion(null);
    if (farmaciaId) {
      obtenerFacturasProcesadas(farmaciaId);
    }
  };

  const handleGenerateReport = async (params: any) => {
    try {
      // Usar datos reales de cuadres por farmacia
      const obtenerDetallesReales = (farmaciaId: string) => {
        const cuadresFarmacia = cuadresPorFarmacia[farmaciaId] || [];
        let sumaRecargaBs = 0,
          sumaPagomovilBs = 0,
          sumaEfectivoBs = 0,
          sumaPuntoDebito = 0,
          sumaPuntoCredito = 0,
          sumaDevolucionesBs = 0;
        
        cuadresFarmacia.forEach((c) => {
          if (c.estado !== "verified") return;
          if (
            (fechaInicio && c.dia < fechaInicio) ||
            (fechaFin && c.dia > fechaFin)
          )
            return;
          sumaRecargaBs += Number(c.recargaBs || 0);
          sumaPagomovilBs += Number(c.pagomovilBs || 0);
          sumaEfectivoBs += Number(c.efectivoBs || 0);
          sumaDevolucionesBs += Number(c.devolucionesBs || 0);
          if (Array.isArray(c.puntosVenta)) {
            sumaPuntoDebito += c.puntosVenta.reduce(
              (acc, pv) => acc + Number(pv.puntoDebito || 0),
              0
            );
            sumaPuntoCredito += c.puntosVenta.reduce(
              (acc, pv) => acc + Number(pv.puntoCredito || 0),
              0
            );
          }
        });

        return {
          sumaRecargaBs,
          sumaPagomovilBs,
          sumaEfectivoBs,
          sumaDevolucionesBs,
          sumaPuntoDebito,
          sumaPuntoCredito
        };
      };

      const reportData = {
        headers: [
          'Farmacia',
          'Total Ventas',
          'Total Bs',
          'Total USD',
          'Efectivo USD',
          'Zelle USD',
          'Faltantes',
          'Sobrantes',
          'Recarga Bs',
          'Pago Móvil Bs',
          'Efectivo Bs',
          'Punto Débito Bs',
          'Punto Crédito Bs',
          'Devoluciones Bs',
          'Pagos USD',
          'Pagos Bs'
        ],
        rows: sortedFarmacias.map(farmacia => {
          const pagosDelPeriodo = totalPagosPorFarmacia[farmacia.id] || {
            pagosUsd: 0,
            pagosBs: 0,
            pagosGeneralUsd: 0,
            abonosNoLiquidadosUsd: 0,
            abonosNoLiquidadosEnUsd: 0,
            abonosNoLiquidadosEnBs: 0,
            montoOriginalFacturasUsd: 0,
            diferencialPagosUsd: 0,
          };

          const farmaciaData = ventas[farmacia.id] || {};
          const detallesCuadre = obtenerDetallesReales(farmacia.id);

          return [
            farmacia.nombre,
            (farmaciaData.totalVentas || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.totalBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.totalUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.efectivoUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.zelleUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.faltantes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (farmaciaData.sobrantes || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaRecargaBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaPagomovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaEfectivoBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaPuntoDebito.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaPuntoCredito.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            detallesCuadre.sumaDevolucionesBs.toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (pagosDelPeriodo.pagosUsd || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 }),
            (pagosDelPeriodo.pagosBs || 0).toLocaleString('es-VE', { minimumFractionDigits: 2 })
          ];
        }),
        summary: {
          totalRows: sortedFarmacias.length,
          totals: {
            'Total Ventas': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.totalVentas || 0), 0),
            'Total Bs': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.totalBs || 0), 0),
            'Total USD': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.totalUsd || 0), 0),
            'Total Efectivo USD': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.efectivoUsd || 0), 0),
            'Total Zelle USD': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.zelleUsd || 0), 0),
            'Total Faltantes': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.faltantes || 0), 0),
            'Total Sobrantes': sortedFarmacias.reduce((acc, f) => acc + (ventas[f.id]?.sobrantes || 0), 0)
          }
        }
      };

      return await generateReport(params, reportData);
    } catch (error) {
      console.error('Error generando reporte:', error);
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
        <div className="flex items-center text-blue-700 text-lg font-semibold">
          <svg
            className="animate-spin -ml-1 mr-3 h-8 w-8 text-blue-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          Cargando resumen de ventas...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 p-6">
        <div className="bg-white rounded-lg shadow-xl p-8 text-center text-red-700 font-semibold border border-red-300">
          <p className="text-xl mb-4">⚠️ ¡Oops! Algo salió mal.</p>
          <p>{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors duration-300 shadow-md"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 p-4 sm:p-6 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="bg-white rounded-xl shadow-lg p-6 mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 md:gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-blue-800 mb-2">
              <i className="fas fa-chart-bar text-blue-500 mr-3"></i>
              Resumen de Ventas por Negocio
            </h1>
            <p className="text-gray-600 text-md">
              Consulta un desglose detallado de las ventas de cada farmacia.
            </p>
          </div>
          <ReportButton
            module="Ventas"
            reports={generateReportConfigs(farmacias).ventasReports}
            onGenerateReport={handleGenerateReport}
            farmacias={farmacias}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          />
          <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[400px]">
            <label
              htmlFor="fecha-inicio"
              className="block text-sm font-medium text-gray-700"
            >
              Período de Ventas:
            </label>
            <div className="flex flex-wrap gap-3">
              <input
                id="fecha-inicio"
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Fecha de inicio"
              />
              <input
                id="fecha-fin"
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                className="flex-1 min-w-[120px] border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                title="Fecha de fin"
              />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              <button
                type="button"
                onClick={setHoy}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={setAyer}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Dia Anterior
              </button>
              <button
                type="button"
                onClick={setSemanaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Esta Semana
              </button>
              <button
                type="button"
                onClick={setQuincenaActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Quincena Actual
              </button>
              <button
                type="button"
                onClick={setMesActual}
                className="flex-1 min-w-[90px] px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-200"
              >
                Mes Actual
              </button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {(sortedFarmacias && Array.isArray(sortedFarmacias) ? sortedFarmacias : []).map((farm, idx) => {
            // ▼▼▼ CORRECCIÓN AQUÍ ▼▼▼
            // 1. Accede a los datos de pago para esta farmacia desde el objeto que nos da el hook.
            const pagosDelPeriodo = totalPagosPorFarmacia[farm.id] || {
              pagosUsd: 0,
              pagosBs: 0,
              pagosGeneralUsd: 0,
              abonosNoLiquidadosUsd: 0,
              abonosNoLiquidadosEnUsd: 0,
              abonosNoLiquidadosEnBs: 0,
              montoOriginalFacturasUsd: 0,
              diferencialPagosUsd: 0,
            };

            return (
              <div key={farm.id}>
                <ResumeCardFarmacia
                  nombre={farm.nombre}
                  localidadId={farm.id}
                  totalVentas={ventas[farm.id]?.totalVentas || 0}
                  totalBs={ventas[farm.id]?.totalBs || 0}
                  totalUsd={ventas[farm.id]?.totalUsd || 0}
                  efectivoUsd={ventas[farm.id]?.efectivoUsd || 0}
                  zelleUsd={ventas[farm.id]?.zelleUsd || 0}
                  faltantes={ventas[farm.id]?.faltantes || 0}
                  sobrantes={ventas[farm.id]?.sobrantes || 0}
                  totalGeneralSinRecargas={
                    ventas[farm.id]?.totalGeneralSinRecargas || 0
                  }
                  valesUsd={ventas[farm.id]?.valesUsd || 0}
                  top={idx < 3}
                  pendienteVerificar={pendientesPorFarmacia[farm.id] || 0}
                  fechaInicio={fechaInicio}
                  fechaFin={fechaFin}
                  totalCosto={ventas[farm.id]?.totalCosto || 0}
                  totalInventario={inventariosFarmacia[farm.id] || 0}
                  gastos={gastosPorFarmacia[farm.id] || 0}
                  cuentasPorPagarActivas={
                    cuentasActivasPorFarmacia[farm.id] || 0
                  }
                  cuentasPagadas={cuentasPagadasPorFarmacia[farm.id] || 0}
                  // 2. Pasa los datos correctos como props individuales.
                  pagosEnUsd={pagosDelPeriodo.pagosUsd}
                  pagosEnBs={pagosDelPeriodo.pagosBs}
                  totalPagosGeneral={pagosDelPeriodo.pagosGeneralUsd}
                  abonosNoLiquidadosEnUsd={pagosDelPeriodo.abonosNoLiquidadosEnUsd}
                  abonosNoLiquidadosEnBs={pagosDelPeriodo.abonosNoLiquidadosEnBs}
                  montoOriginalFacturas={
                    pagosDelPeriodo.montoOriginalFacturasUsd
                  }
                  diferencialPagos={pagosDelPeriodo.diferencialPagosUsd}
                />
                <button
                  className="mt-2 text-blue-700 underline text-sm"
                  onClick={() =>
                    setDetallesVisibles((v) => ({
                      ...v,
                      [farm.id]: !v[farm.id],
                    }))
                  }
                >
                  {detallesVisibles[farm.id]
                    ? "Ocultar detalles"
                    : "Ver detalles completos"}
                </button>
                {detallesVisibles[farm.id] && calcularDetalles(farm.id)}
                
                {/* Sección de Facturas Procesadas */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <button
                    className="text-blue-700 underline text-sm font-semibold mb-2"
                    onClick={() => handleToggleFacturasProcesadas(farm.id)}
                  >
                    {mostrarFacturasPorFarmacia[farm.id]
                      ? "▼ Ocultar Facturas Procesadas"
                      : "▶ Ver Facturas Procesadas"}
                    {facturasProcesadas[farm.id] && ` (${facturasProcesadas[farm.id].length})`}
                  </button>
                  
                  {mostrarFacturasPorFarmacia[farm.id] && (
                    <div className="mt-2">
                      {cargandoFacturas[farm.id] ? (
                        <div className="text-center py-4 text-gray-600 text-sm">
                          Cargando facturas...
                        </div>
                      ) : facturasProcesadas[farm.id]?.length === 0 ? (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No hay facturas procesadas en este período
                        </div>
                      ) : (
                        <div className="max-h-64 overflow-y-auto space-y-2">
                          {facturasProcesadas[farm.id]?.map((factura) => (
                            <div
                              key={factura._id}
                              className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:bg-gray-100 transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">
                                    Factura #{factura.numero_factura || factura._id}
                                  </div>
                                  <div className="text-xs text-gray-600 mt-1">
                                    {new Date(factura.fecha).toLocaleString('es-VE', {
                                      year: 'numeric',
                                      month: '2-digit',
                                      day: '2-digit',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })}
                                  </div>
                                  {factura.cliente && (
                                    <div className="text-xs text-gray-600">
                                      Cliente: {factura.cliente.nombre}
                                    </div>
                                  )}
                                  <div className="text-xs font-semibold text-green-600 mt-1">
                                    Total: ${factura.total_usd?.toFixed(2) || '0.00'} USD
                                  </div>
                                </div>
                                <Button
                                  onClick={() => handleDevolucion(factura)}
                                  variant="outline"
                                  size="sm"
                                  className="ml-2 text-red-600 border-red-300 hover:bg-red-50"
                                >
                                  Devolución
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Modal de Devolución */}
        {showModalDevolucion && facturaParaDevolucion && (
          <ModalDevolucionCompra
            factura={facturaParaDevolucion}
            onClose={() => handleCerrarModalDevolucion()}
            onSuccess={() => {
              const farmaciaId = facturaParaDevolucion.sucursal?._id || facturaParaDevolucion.sucursal;
              handleCerrarModalDevolucion(farmaciaId);
            }}
          />
        )}
      </div>
    </div>
  );
};

export default ResumenFarmaciasVentas;
