import React from "react";
import InventarioInfoChip from "./InventarioInfoChip";

interface ResumeCardFarmaciaProps {
  nombre: string;
  localidadId: string;
  totalVentas?: number;
  totalBs?: number;
  efectivoUsd?: number;
  zelleUsd?: number;
  totalUsd?: number;
  faltantes?: number;
  sobrantes?: number;
  top?: boolean;
  totalGeneralSinRecargas?: number;
  valesUsd?: number;
  pendienteVerificar?: number;
  fechaInicio?: string;
  fechaFin?: string;
  totalCosto?: number;
  totalInventario?: number;
  gastos?: number;
  cuentasPorPagarActivas?: number;
  cuentasPagadas?: number;
  pagosEnUsd?: number;
  pagosEnBs?: number;
  totalPagosGeneral?: number;
  montoOriginalFacturas?: number;
  diferencialPagos?: number;
  abonosNoLiquidadosEnUsd?: number; // <-- NUEVO
  abonosNoLiquidadosEnBs?: number; // <-- NUEVO
}

// Ya no necesitamos la variable API_BASE_URL aquí
const ResumeCardFarmacia: React.FC<ResumeCardFarmaciaProps> = ({
  nombre,
  totalVentas = 0,
  totalBs = 0,
  efectivoUsd = 0,
  zelleUsd = 0,
  totalUsd = 0,
  faltantes = 0,
  sobrantes = 0,
  totalGeneralSinRecargas = 0,
  valesUsd = 0,
  top,
  pendienteVerificar = 0,
  totalCosto = 0,
  totalInventario = 0,
  gastos = 0,
  cuentasPorPagarActivas = 0,
  cuentasPagadas = 0,
  pagosEnUsd = 0,
  pagosEnBs = 0,
  totalPagosGeneral = 0,
  montoOriginalFacturas = 0,
  diferencialPagos = 0,
  abonosNoLiquidadosEnUsd = 0,
  abonosNoLiquidadosEnBs = 0,
}) => {
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-VE", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const totalConGastos = totalVentas - gastos - cuentasPagadas;
  const showMissing = faltantes > 0 && faltantes !== null;
  const showSurplus = sobrantes > 0 && sobrantes !== null;
  return (
    <div
      className={`
        bg-white rounded-2xl shadow-xl p-6 border-2 flex flex-col items-center
        transition-all duration-300 transform hover:scale-[1.02] hover:shadow-2xl relative
        ${top ? "border-yellow-500 ring-4 ring-yellow-200" : "border-blue-200"}
      `}
    >
      {/* Indicador TOP (si aplica) */}
      {top && (
        <div className="absolute -top-3 -left-3 bg-yellow-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg transform rotate-[-5deg] z-10">
          🏆 TOP VENTAS
        </div>
      )}

      {/* Chip de Pendiente de Verificar (si aplica) */}
      {pendienteVerificar > 0 && (
        <div className="absolute top-4 right-4 flex flex-col items-end gap-1 z-10">
          <div className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full shadow border border-yellow-300">
            ⏳ Pendiente: {formatCurrency(pendienteVerificar)}
          </div>
        </div>
      )}

      {/* Nombre de la Farmacia */}
      <h3
        className={`text-2xl font-extrabold mb-3 text-center ${
          top ? "text-yellow-800" : "text-gray-900"
        } leading-tight`}
      >
        {nombre}
      </h3>

      {/* Total de Ventas Principal - Mostrar siempre */}
      <div
        className={`text-4xl font-extrabold mb-2 ${
          totalVentas > 0
            ? top
              ? "text-yellow-600"
              : "text-green-600"
            : "text-gray-400"
        } text-center`}
      >
        {totalVentas > 0 ? formatCurrency(totalVentas) : "$0.00"}
      </div>
      {totalVentas === 0 && (
        <div className="text-xs text-gray-500 text-center mb-2 italic">
          Sin ventas en este período
        </div>
      )}
      {/* Total Inventario visual */}
      <div className="flex items-center gap-2 mb-4 text-base text-blue-700 font-semibold relative">
        <i className="fas fa-boxes-stacked text-blue-500"></i>
        <span>Costo Inventario:</span>
        <span className="font-bold">{formatCurrency(totalInventario)}</span>
        <InventarioInfoChip
          totalInventario={totalInventario}
          totalCosto={totalCosto}
          formatCurrency={formatCurrency}
        />
      </div>

      {/* Sección de Métricas Detalladas */}
      <div className="flex flex-col gap-2 text-base text-gray-700 w-full mt-3">
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-dollar-sign text-green-500"></i> Total sin
            Recargas:
          </span>
          <span className="font-semibold">
            {formatCurrency(totalGeneralSinRecargas)}
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-money-bill-wave text-blue-500"></i> Solo USD
            Efectivo:
          </span>
          <span className="font-semibold">{formatCurrency(efectivoUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-university text-blue-500"></i> Solo USD Zelle:
          </span>
          <span className="font-semibold">{formatCurrency(zelleUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-money-check-alt text-blue-500"></i> Total USD
            (Recibido):
          </span>
          <span className="font-semibold">{formatCurrency(totalUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-receipt text-indigo-500"></i> Vales USD:
          </span>
          <span className="font-semibold">{formatCurrency(valesUsd)}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-coins text-yellow-600"></i> Solo Bs:
          </span>
          <span className="font-semibold">
            {totalBs.toLocaleString("es-VE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            Bs
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-cash-register text-pink-500"></i> Costo de
            Cuadres:
          </span>
          <span className="font-semibold text-pink-700">
            {formatCurrency(totalCosto)}
          </span>{" "}
        </div>

        <>
        <div className="flex justify-between items-center py-1 border-b border-gray-100">
          <span className="flex items-center gap-2">
            <i className="fas fa-minus-circle text-red-600"></i> Gastos
            Verificados:
          </span>
          <span className="font-semibold text-red-600">
            {formatCurrency(gastos)}
          </span>
        </div>
        
        {/* Sección: Inventario - SIEMPRE VISIBLE */}
        <div className="mt-3 pt-3 border-t-2 border-purple-200">
          <div className={`flex justify-between items-center py-2 rounded-lg px-3 mb-2 ${
            totalInventario > 0 ? 'bg-purple-50' : 'bg-gray-50'
          }`}>
            <span className={`flex items-center gap-2 font-bold ${
              totalInventario > 0 ? 'text-purple-800' : 'text-gray-600'
            }`}>
              <i className={`fas fa-boxes ${
                totalInventario > 0 ? 'text-purple-600' : 'text-gray-400'
              }`}></i>
              Inventario Costo Venta:
            </span>
            <span className={`font-extrabold text-lg ${
              totalInventario > 0 ? 'text-purple-700' : 'text-gray-500'
            }`}>
              {formatCurrency(totalInventario)}
            </span>
          </div>
          <div className={`text-xs italic px-3 ${
            totalInventario > 0 ? 'text-purple-600' : 'text-gray-500'
          }`}>
            {totalInventario > 0 
              ? 'Costo total del inventario (cantidad × costo unitario)' 
              : 'No hay inventario registrado'}
          </div>
        </div>
        
        {/* Sección: Cuentas por Pagar - Separada visualmente - SIEMPRE VISIBLE */}
          <div className="mt-3 pt-3 border-t-2 border-orange-200">
            <div className={`flex justify-between items-center py-2 rounded-lg px-3 mb-2 ${
              cuentasPorPagarActivas > 0 ? 'bg-orange-50' : 'bg-gray-50'
            }`}>
              <span className={`flex items-center gap-2 font-bold ${
                cuentasPorPagarActivas > 0 ? 'text-orange-800' : 'text-gray-600'
              }`}>
                <i className={`fas fa-hand-holding-usd ${
                  cuentasPorPagarActivas > 0 ? 'text-orange-600' : 'text-gray-400'
                }`}></i>
                Cuentas por Pagar (Activas):
              </span>
              <span className={`font-extrabold text-lg ${
                cuentasPorPagarActivas > 0 ? 'text-orange-700' : 'text-gray-500'
              }`}>
                {formatCurrency(cuentasPorPagarActivas)}
              </span>
            </div>
            <div className={`text-xs italic px-3 ${
              cuentasPorPagarActivas > 0 ? 'text-orange-600' : 'text-gray-500'
            }`}>
              {cuentasPorPagarActivas > 0 
                ? 'Deudas pendientes de pago' 
                : 'No hay cuentas por pagar activas'}
            </div>
          </div>

          {/* Sección: Cuentas Pagadas - Separada visualmente - SIEMPRE VISIBLE */}
          <div className="mt-3 pt-3 border-t-2 border-green-200">
            <div className={`flex justify-between items-center py-2 rounded-lg px-3 mb-2 ${
              cuentasPagadas > 0 ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <span className={`flex items-center gap-2 font-bold ${
                cuentasPagadas > 0 ? 'text-green-800' : 'text-gray-600'
              }`}>
                <i className={`fas fa-check-circle ${
                  cuentasPagadas > 0 ? 'text-green-600' : 'text-gray-400'
                }`}></i>
                Cuentas Pagadas (Monto Facturado):
              </span>
              <span className={`font-extrabold text-lg ${
                cuentasPagadas > 0 ? 'text-green-700' : 'text-gray-500'
              }`}>
                {formatCurrency(cuentasPagadas)}
              </span>
            </div>
            <div className={`text-xs italic px-3 ${
              cuentasPagadas > 0 ? 'text-green-600' : 'text-gray-500'
            }`}>
              {cuentasPagadas > 0 
                ? 'Facturas pagadas en el período (incluye abonos)' 
                : 'No hay facturas pagadas en el período'}
            </div>
          </div>
          
          {/* Sección: Abonos No Liquidados - SIEMPRE VISIBLE */}
          {(abonosNoLiquidadosEnUsd > 0 || abonosNoLiquidadosEnBs > 0) && (
            <div className="mt-3 pt-3 border-t-2 border-yellow-200">
              <div className="flex justify-between items-center py-2 bg-yellow-50 rounded-lg px-3 mb-2">
                <span className="flex items-center gap-2 font-bold text-yellow-800">
                  <i className="fas fa-hourglass-half text-yellow-600"></i>
                  Abonos No Liquidados:
                </span>
                <div className="flex flex-col items-end">
                  {abonosNoLiquidadosEnUsd > 0 && (
                    <span className="font-extrabold text-lg text-yellow-700">
                      {formatCurrency(abonosNoLiquidadosEnUsd)} USD
                    </span>
                  )}
                  {abonosNoLiquidadosEnBs > 0 && (
                    <span className="font-extrabold text-sm text-yellow-700">
                      {abonosNoLiquidadosEnBs.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })} Bs
                    </span>
                  )}
                </div>
              </div>
              <div className="text-xs text-yellow-600 italic px-3">
                Pagos parciales pendientes de liquidación
              </div>
            </div>
          )}
          <div className="mt-2 pt-2 border-t border-dashed">
            <p className="font-bold text-center text-blue-800 mb-2">
              Análisis de Pagos del Período
            </p>
            <div className="w-full rounded-lg p-3 mt-2">
              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 text-slate-600">
                  <i className="fas fa-file-invoice-dollar fa-fw"></i>
                  Monto Original Facturas:
                </span>
                <span className="font-semibold text-slate-800">
                  {formatCurrency(montoOriginalFacturas)}
                </span>
              </div>

              <div className="flex justify-between items-center mb-2">
                <span className="flex items-center gap-2 font-bold text-blue-800">
                  <i className="fas fa-money-bill-wave fa-fw"></i>
                  Total Pagado (USD):
                </span>
                <span className="font-extrabold text-lg text-blue-700">
                  {formatCurrency(totalPagosGeneral)}
                </span>
              </div>

              <hr className="my-2" />

              <div className="flex justify-between items-center mt-2">
                <span
                  className={`flex items-center gap-2 font-bold ${
                    diferencialPagos >= 0 ? "text-red-800" : "text-green-800"
                  }`}
                >
                  {/* Íconos más intuitivos para indicar ganancia, pérdida o neutralidad */}
                  <i
                    className={`fas fa-fw ${
                      diferencialPagos > 0
                        ? "fa-arrow-trend-up"
                        : diferencialPagos < 0
                        ? "fa-arrow-trend-down"
                        : "fa-equals"
                    }`}
                  ></i>
                  Diferencial por Pago:
                </span>
                <span
                  className={`font-extrabold text-lg ${
                    diferencialPagos >= 0 ? "text-red-700" :"text-green-700"
                  }`}
                >
                  {formatCurrency(diferencialPagos)}
                </span>
              </div>
            </div>

            {/* Desglose de cómo se pagó */}
            <div className="mt-2 pt-2 border-t border-dotted">
              <div className="flex justify-between items-center py-1 text-xs text-gray-600">
                <span className="flex items-center gap-2 pl-4">
                  <i className="fas fa-dollar-sign text-blue-500"></i> Pagos en
                  USD:
                </span>
                <span className="font-semibold">
                  {formatCurrency(pagosEnUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-xs text-gray-600">
                <span className="flex items-center gap-2 pl-4">
                  <i className="fas fa-coins text-yellow-600"></i> Pagos en Bs:
                </span>
                <span className="font-semibold">
                  {pagosEnBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  Bs
                </span>
              </div>
            </div>

            {/* Información adicional */}
            <div className="mt-2 pt-2 border-t border-dotted">
              <div className="flex justify-between items-center py-1 text-xs text-gray-600">
                <span className="flex items-center gap-2 pl-4">
                  <i className="fas fa-hourglass-half text-yellow-500"></i>{" "}
                  Abonos no liquidados (USD):
                </span>
                <span className="font-semibold text-yellow-700">
                  {formatCurrency(abonosNoLiquidadosEnUsd)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 text-xs text-gray-600">
                <span className="flex items-center gap-2 pl-4">
                  <i className="fas fa-hourglass-half text-yellow-600"></i>{" "}
                  Abonos no liquidados (Bs):
                </span>
                <span className="font-semibold text-yellow-700">
                  {abonosNoLiquidadosEnBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{" "}
                  Bs
                </span>
              </div>
            </div>
          </div>
        </>

        {/* Sección de Resumen final con Totales Ajustados */}
        <div className="flex justify-between items-center py-2 mt-2 border-t-2 border-gray-300 font-bold text-lg">
          <span className="flex items-center gap-2">
            <i className="fas fa-balance-scale text-purple-600"></i> Venta Neta:
          </span>
          <span className="text-purple-700">
            {formatCurrency(totalConGastos)}
          </span>
        </div>

        {/* Faltantes y Sobrantes (condicionales) */}
        {showMissing && (
          <div className="flex justify-between items-center py-1 bg-red-50 rounded-md px-3">
            <span className="flex items-center gap-2 text-red-700">
              <i className="fas fa-exclamation-triangle"></i> Faltantes:
            </span>
            <span className="font-bold text-red-700">
              {formatCurrency(faltantes)}
            </span>
          </div>
        )}
        {showSurplus && (
          <div className="flex justify-between items-center py-1 bg-green-50 rounded-md px-3">
            <span className="flex items-center gap-2 text-green-700">
              <i className="fas fa-check-circle"></i> Sobrante:
            </span>
            <span className="font-bold text-green-700">
              {formatCurrency(sobrantes)}
            </span>
          </div>
        )}
      </div>

      <span className="text-xs text-gray-500 mt-4 italic">
        Resumen de ventas del período
      </span>
    </div>
  );
};

export default ResumeCardFarmacia;
