import React, { useEffect, useState } from "react";
import { animate, stagger } from 'animejs';
import AbonoModal from "@/components/AbonoModal";
import FiltrosCuentasPorPagar from "./FiltrosCuentasPorPagar";
import TablaCuentasPorPagar from "./TablaCuentasPorPagar";
import { useCuentasPorPagar } from "./useCuentasPorPagar";
import EdicionCuentaModal from "./EdicionCuentaModal";
import { ReportButton } from "@/components/reports/ReportButton";
import { useReports } from "@/hooks/useReports";
import { generateReportConfigs } from '@/config/reportConfigs';

// Importa el tipo Pago para tipar correctamente pagosAprobadosPorCuenta
import type { Pago } from "./FilaCuentaPorPagar";
import PagoMasivoModal from "./PagoMasivoModal";

// 1. Unifica el tipo CuentaPorPagar para que divisa sea string en todos los archivos
export interface CuentaPorPagar {
  _id: string;
  monto: number;
  divisa: string; // <-- string, no 'USD' | 'Bs'
  tasa: number;
  retencion?: number;
  fechaEmision: string;
  diasCredito: number;
  fechaRecepcion: string;
  proveedor: string;
  numeroFactura: string;
  numeroControl: string;
  descripcion: string;
  usuarioCorreo: string;
  farmacia: string;
  estatus: string;
  [key: string]: any;
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ESTATUS_OPCIONES = ["wait", "activa", "inactiva", "pagada", "abonada", "anulada", "finalizada"];

function calcularDiasRestantes(fechaEmision: string, diasCredito: number) {
  const fechaEmi = new Date(fechaEmision);
  const fechaVenc = new Date(fechaEmi);
  fechaVenc.setDate(fechaVenc.getDate() + diasCredito);
  const hoy = new Date();
  const diff = Math.ceil((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

const formatFecha = (fechaISO: string) => {
  if (!fechaISO) return "-";
  const date = new Date(fechaISO);
  if (isNaN(date.getTime())) return "-";
  const userTimezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() + userTimezoneOffset).toLocaleDateString('es-VE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

const VisualizarCuentasPorPagarPage: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; id: string | null; nuevoEstatus: string }>({ open: false, id: null, nuevoEstatus: "" });
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [abonoModalOpen, setAbonoModalOpen] = useState<string | null>(null); // id de la cuenta
  const [abonoCuenta, setAbonoCuenta] = useState<any>(null);
  const [pagosAprobadosPorCuenta, setPagosAprobadosPorCuenta] = useState<Record<string, { loading: boolean; pagos: Pago[] }>>({});
  const [selectedCuentas, setSelectedCuentas] = useState<string[]>([]);
  const [pagoMasivoModalOpen, setPagoMasivoModalOpen] = useState(false);
  const [pagoMasivoLoading] = useState(false);
  const [pagoMasivoError] = useState<string | null>(null);
  // Moneda seleccionada para conversión masiva (sincronizada con el modal)
  const [monedaConversion] = useState<'USD' | 'Bs'>('USD');
  const { generateReport } = useReports();

  // Reemplaza selectedCuentas y edicionCuentas por un solo state
  const [cuentasParaPagar, setCuentasParaPagar] = useState<any[]>(() => {
    // Leer del localStorage al inicializar
    try {
      const stored = localStorage.getItem('cuentasParaPagar');
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : Object.values(parsed);
    } catch {
      return [];
    }
  });

  // Sincronizar con localStorage cada vez que cambie
  useEffect(() => {
    try {
      localStorage.setItem('cuentasParaPagar', JSON.stringify(cuentasParaPagar));
    } catch {}
  }, [cuentasParaPagar]);

  // 2. Función para abrir el modal de edición individual
  const [cuentaEditando, setCuentaEditando] = useState<string | null>(null);
  const abrirEdicionCuenta = (cuentaId: string) => {
    if (cuentasParaPagar.find(c => c.cuentaPorPagarId === cuentaId)) setCuentaEditando(cuentaId);
  };

  const fetchCuentas = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Error al obtener cuentas por pagar");
      const data = await res.json();
      setCuentas(data);
    } catch (err: any) {
      setError(err.message || "Error al obtener cuentas por pagar");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCuentas();
  }, []);

  useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(farmaciasArr);
        if (farmaciasArr.length === 1) setSelectedFarmacia(farmaciasArr[0].id);
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  // Al seleccionar/deseleccionar una cuenta
  const handleSelectCuenta = (id: string) => {
    setCuentasParaPagar(prev => {
      // Leer la lista actual desde localStorage para asegurar que no se pierdan ediciones
      let listaActual: any[] = [];
      try {
        const stored = localStorage.getItem('cuentasParaPagar');
        const parsed = stored ? JSON.parse(stored) : [];
        listaActual = Array.isArray(parsed) ? parsed : Object.values(parsed);
      } catch {
        listaActual = Array.isArray(prev) ? prev : [];
      }
      // Si ya está seleccionada, quitarla
      if (listaActual.some(c => c.cuentaPorPagarId === id || c._id === id)) {
        const nuevo = listaActual.filter(c => c.cuentaPorPagarId !== id && c._id !== id);
        setSelectedCuentas(nuevo.map(c => c.cuentaPorPagarId));
        localStorage.setItem('cuentasParaPagar', JSON.stringify(nuevo));
        return nuevo;
      }
      // Seleccionar: agregar solo los datos originales de la cuenta (sin campos de edición)
      const cuenta = cuentasFiltradas.find(c => c._id === id);
      if (!cuenta || !cuenta._id) return listaActual; // Validar que exista y tenga _id
      // Evitar duplicados: si ya existe por _id o cuentaPorPagarId, no agregar
      if (listaActual.some(c => c.cuentaPorPagarId === cuenta._id || c._id === cuenta._id)) return listaActual;
      const {
        _id,
        fechaEmision,
        fechaRecepcion,
        fechaVencimiento,
        fechaRegistro,
        diasCredito,
        numeroFactura,
        numeroControl,
        proveedor,
        descripcion,
        monto,
        retencion,
        divisa,
        tasa,
        estatus,
        usuarioCorreo,
        farmacia,
        imagenesCuentaPorPagar
      } = cuenta;
      // Lógica para montoDePago y monedaDePago
      let montoDePago = 0;
      let monedaDePago = 'Bs';
      if (divisa === 'USD') {
        montoDePago = Number((monto * tasa).toFixed(2));
      } else {
        montoDePago = Number(monto);
      }
      // Restar la retención si existe
      const retencionNum = Number(retencion) || 0;
      montoDePago = Math.max(montoDePago - retencionNum, 0);
      const nuevo = [
        ...listaActual,
        {
          cuentaPorPagarId: _id,
          fechaEmision,
          fechaRecepcion,
          fechaVencimiento,
          fechaRegistro,
          diasCredito,
          numeroFactura,
          numeroControl,
          proveedor,
          descripcion,
          montoOriginal: monto,
          retencion,
          monedaOriginal: divisa,
          tasaOriginal: tasa,
          tasaDePago: tasa, // Inicializar tasaDePago con tasaOriginal
          estatus,
          usuarioCorreo,
          farmacia,
          imagenesCuentaPorPagar,
          montoDePago,
          monedaDePago
        }
      ];
      setSelectedCuentas(nuevo.map(c => c.cuentaPorPagarId));
      localStorage.setItem('cuentasParaPagar', JSON.stringify(nuevo));
      return nuevo;
    });
  };

  // Extraer hooks y lógica de selección/filtrado
  const {
    proveedorFiltro,
    setProveedorFiltro,
    estatusFiltro,
    setEstatusFiltro,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    selectedFarmacia,
    setSelectedFarmacia,
    cuentasFiltradas,
  } = useCuentasPorPagar({ cuentas, pagosAprobadosPorCuenta, estatusInicial: 'wait' });

  const handleEstadoChange = (id: string, nuevoEstatus: string) => {
    setConfirmDialog({ open: true, id, nuevoEstatus });
  };

  const handleConfirmChange = async () => {
    if (!confirmDialog.id) return;
    setError(null);
    setSuccess(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const res = await fetch(`${API_BASE_URL}/cuentas-por-pagar/${confirmDialog.id}/estatus`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ estatus: confirmDialog.nuevoEstatus })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || "Error al actualizar estatus");
      }
      setSuccess("Estatus actualizado correctamente");
      setCuentas(prev => prev.map(c => c._id === confirmDialog.id ? { ...c, estatus: confirmDialog.nuevoEstatus } : c));
      // Alerta visual inmediata
      alert(`El estatus de la cuenta fue cambiado a: ${confirmDialog.nuevoEstatus.toUpperCase()}`);
    } catch (err: any) {
      setError(err.message || "Error al actualizar estatus");
    } finally {
      setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
    }
  };

  const handleCancelChange = () => {
    setConfirmDialog({ open: false, id: null, nuevoEstatus: "" });
  };

  const handleGenerateReport = async (params: any) => {
    try {
      // Preparar los datos del reporte basados en las cuentas filtradas
      const reportData = {
        headers: [
          'Farmacia',
          'Proveedor',
          'N° Factura',
          'Fecha Emisión',
          'Fecha Vencimiento',
          'Monto',
          'Estado'
        ],
        rows: cuentasFiltradas.map(cuenta => [
          farmacias.find(f => f.id === cuenta.farmacia)?.nombre || cuenta.farmacia,
          cuenta.proveedor,
          cuenta.numeroFactura,
          formatFecha(cuenta.fechaEmision),
          formatFecha(cuenta.fechaEmision), // Aquí podrías calcular la fecha de vencimiento
          `${cuenta.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} ${cuenta.divisa}`,
          cuenta.estatus
        ]),
        summary: {
          totalRows: cuentasFiltradas.length,
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

  const handlePagosDropdownOpen = (open: boolean, cuenta: CuentaPorPagar) => {
    if (open && !pagosAprobadosPorCuenta[cuenta._id]?.pagos) {
      setPagosAprobadosPorCuenta(prev => ({
        ...prev,
        [cuenta._id]: { loading: true, pagos: [] }
      }));
      fetch(`${API_BASE_URL}/pagoscpp?cuentaPorPagarId=${cuenta._id}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("access_token")}`
        }
      })
        .then(res => {
          if (!res.ok) throw new Error("Error al obtener pagos");
          return res.json();
        })
        .then(data => {
          setPagosAprobadosPorCuenta(prev => ({
            ...prev,
            [cuenta._id]: { loading: false, pagos: data }
          }));
          setTimeout(() => {
            animate(`.pagos-dropdown-item-${cuenta._id}`, {
              opacity: [0, 1],
              y: [20, 0],
              duration: 400,
              delay: stagger(60),
              ease: 'outCubic'
            });
          }, 10);
        })
        .catch(err => {
          setPagosAprobadosPorCuenta(prev => ({
            ...prev,
            [cuenta._id]: { loading: false, pagos: [], error: err.message || "Error al obtener pagos" }
          }));
        });
    }
  };

  // Filtrar solo pagos aprobados antes de pasar a PagosDropdown
  const pagosAprobadosPorCuentaFiltrados: Record<string, { loading: boolean; pagos: Pago[]; error?: string }> = {};
  Object.entries(pagosAprobadosPorCuenta).forEach(([cuentaId, info]) => {
    pagosAprobadosPorCuentaFiltrados[cuentaId] = {
      ...info,
      pagos: Array.isArray(info.pagos)
        ? (info.pagos.filter((p: Pago) => p.estado === 'aprobado') as Pago[])
        : []
    };
  });

  const [showMonedaAlert, setShowMonedaAlert] = React.useState(true);
  React.useEffect(() => { setShowMonedaAlert(true); }, [pagoMasivoModalOpen]);

  // Calcular totales globales en USD y Bs para cuentas por pagar
  const totalUSD = cuentasFiltradas.reduce((acc, c) => {
    if (c.divisa === 'Bs' && c.tasa) {
      return acc + (c.monto / c.tasa);
    }
    return acc + c.monto;
  }, 0);
  const totalBs = cuentasFiltradas.reduce((acc, c) => {
    if (c.divisa === 'Bs') {
      return acc + c.monto;
    }
    if (c.divisa === 'USD' && c.tasa) {
      return acc + (c.monto * c.tasa);
    }
    return acc;
  }, 0);

  const handleAbonoSubmit = () => {
    setAbonoModalOpen(null);
    setAbonoCuenta(null);
    // Aquí puedes agregar la lógica real de registro de abono si es necesario
  };

  return (
    // Contenedor principal con un fondo sutil para la página
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-slate-800 text-center flex-1">Cuentas por Pagar</h1>
          <ReportButton
            module="Cuentas por Pagar"
            reports={generateReportConfigs(farmacias).cuentasPorPagarReports}
            onGenerateReport={handleGenerateReport}
            farmacias={farmacias}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          />
        </div>


        {/* Mensajes de error/éxito con mejor estilo */}
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

        {/* Sección de Filtros con un card y mejor layout */}
        <FiltrosCuentasPorPagar
          farmacias={farmacias}
          selectedFarmacia={selectedFarmacia}
          setSelectedFarmacia={setSelectedFarmacia}
          proveedorFiltro={proveedorFiltro}
          setProveedorFiltro={setProveedorFiltro}
          estatusFiltro={estatusFiltro}
          setEstatusFiltro={setEstatusFiltro}
          fechaInicio={fechaInicio}
          setFechaInicio={setFechaInicio}
          fechaFin={fechaFin}
          setFechaFin={setFechaFin}
          ESTATUS_OPCIONES={ESTATUS_OPCIONES}
        />

        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando cuentas...
          </div>
        ) : cuentasFiltradas.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay cuentas por pagar</h3>
            <p className="mt-1 text-sm text-slate-500">No se encontraron cuentas que coincidan con los filtros aplicados.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                {/* Cuadro para deseleccionar cuentas seleccionadas */}
                {selectedCuentas.length > 0 && (
                  <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow">
                    <div className="flex flex-wrap gap-2 items-center">
                      <span className="font-semibold text-blue-700">Cuentas seleccionadas:</span>
                      {selectedCuentas.map(id => {
                        const cuenta = cuentasParaPagar.find(c => c.cuentaPorPagarId === id || c._id === id);
                        return (
                          <span key={id} className="bg-blue-200 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                            {cuenta?.numeroFactura || id}
                          </span>
                        );
                      })}
                    </div>
                    <button
                      className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold shadow hover:bg-red-700 transition"
                      onClick={() => {
                        setCuentasParaPagar([]);
                        setSelectedCuentas([]);
                        localStorage.setItem('cuentasParaPagar', JSON.stringify([]));
                      }}
                    >
                      Deseleccionar todas
                    </button>
                  </div>
                )}
            <div className="overflow-x-auto w-full">
              {/* Botón para pago masivo */}
              <div className="flex items-center gap-4 p-4">
                <button
                  className={`px-5 py-2 rounded-lg font-semibold shadow transition-all duration-200
                    ${selectedCuentas.length === 0 ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    disabled={selectedCuentas.length === 0}
                    onClick={() => setPagoMasivoModalOpen(true)}
                    >
                  Registrar Pago para Seleccionadas
                </button>
              </div>
              <TablaCuentasPorPagar
                cuentasFiltradas={cuentasFiltradas}
                pagosAprobadosPorCuenta={pagosAprobadosPorCuentaFiltrados}
                cuentasParaPagar={cuentasParaPagar}
                handleToggleCuentaParaPagar={cuenta => handleSelectCuenta(cuenta._id)}
                handlePagosDropdownOpen={handlePagosDropdownOpen}
                handleEstadoChange={handleEstadoChange}
                ESTATUS_OPCIONES={ESTATUS_OPCIONES}
                formatFecha={formatFecha}
                calcularDiasRestantes={calcularDiasRestantes}
                abrirEdicionCuenta={abrirEdicionCuenta}
              />
            </div>
            {/* Totales globales de cuentas por pagar */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2 bg-blue-50 border-t border-blue-200 px-5 py-4 mt-2 rounded-lg">
              <span className="text-lg font-bold text-blue-700">Total Bs: {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-lg font-bold text-green-700">Total $: {totalUSD.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          </div>
        )}

        {/* Diálogo de confirmación con mejor estilo */}
        {confirmDialog.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-50 backdrop-blur-sm p-4">
            <div className="bg-white p-6 sm:p-8 rounded-lg shadow-2xl max-w-md w-full">
              <h2 className="text-xl font-semibold text-slate-800 mb-2">Confirmar Cambio de Estatus</h2>
              <p className="text-slate-600 mb-4">
                ¿Está seguro que desea cambiar el estatus de la cuenta a
                <span className={`font-bold ml-1 ${confirmDialog.nuevoEstatus === 'anulada' ? 'text-red-600' : confirmDialog.nuevoEstatus === 'pagada' ? 'text-green-600' : 'text-yellow-600'}`}>{confirmDialog.nuevoEstatus}</span>?
              </p>
              {confirmDialog.nuevoEstatus === 'anulada' && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mb-4 rounded-md text-sm">
                  <strong>Advertencia:</strong> Esta acción es irreversible. La cuenta será marcada como anulada.
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
                  className={`px-5 py-2.5 rounded-md font-medium transition-colors duration-150 ease-in-out shadow-sm hover:shadow-md ${confirmDialog.nuevoEstatus === 'anulada' ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  Aceptar
                </button>
              </div>
            </div>
          </div>
        )}

        {abonoModalOpen && abonoCuenta && (
          <AbonoModal
            open={!!abonoModalOpen}
            onClose={() => { setAbonoModalOpen(null); setAbonoCuenta(null); }}
            onSubmit={handleAbonoSubmit}
            usuario={(JSON.parse(localStorage.getItem("usuario") || '{}').correo) || ''}
            cuentaPorPagarId={abonoCuenta._id}
            farmaciaId={abonoCuenta.farmacia}
          />
        )}

        {/* Modal para mostrar pagos */}
        <PagoMasivoModal
          open={pagoMasivoModalOpen}
          onClose={() => setPagoMasivoModalOpen(false)}
          loading={pagoMasivoLoading}
          error={pagoMasivoError}
          monedaConversion={monedaConversion}
        />
        {/* Alerta si las cuentas seleccionadas tienen monedas distintas */}
        {pagoMasivoModalOpen && Object.values(cuentasParaPagar).length > 1 && (() => {
          const monedas = Object.values(cuentasParaPagar).map((c: any) => c.moneda).filter(Boolean);
          const distintas = new Set(monedas).size > 1;
          if (distintas && showMonedaAlert) {
            return (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-opacity-30">
                <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded shadow-xl max-w-md mx-auto relative">
                  <button
                    className="absolute top-2 right-2 text-yellow-700 hover:text-yellow-900 text-lg font-bold px-2"
                    onClick={() => setShowMonedaAlert(false)}
                    aria-label="Cerrar aviso"
                  >
                    ×
                  </button>
                  <strong>Atención:</strong> Las cuentas seleccionadas tienen monedas distintas. El pago masivo puede requerir revisión manual de tasas y montos.
                </div>
              </div>
            );
          }
          return null;
        })()}

        {/* Render del modal de edición de cuenta */}
        {cuentaEditando && (
          <EdicionCuentaModal
            isOpen={!!cuentaEditando}
            cuentaId={cuentaEditando}
            onClose={() => setCuentaEditando(null)}
            pagosPrevios={
              (pagosAprobadosPorCuenta[cuentaEditando]?.pagos || []).map((p: any) => ({
                _id: p._id,
                monto: p.monto,
                moneda: p.moneda,
                tasa: p.tasa,
                fecha: p.fecha,
                referencia: p.referencia ?? ""
              }))
            }
          />
        )}
      </div>
    </div>
  );
};

export default VisualizarCuentasPorPagarPage;