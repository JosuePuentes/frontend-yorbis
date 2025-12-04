import React from "react";
import FilaCuentaPorPagar from "./FilaCuentaPorPagar";
import type { CuentaPorPagar, Pago } from "./FilaCuentaPorPagar";

interface TablaCuentasPorPagarProps {
  cuentasFiltradas: CuentaPorPagar[];
  pagosAprobadosPorCuenta: Record<string, { loading: boolean; pagos: Pago[] }>;

  cuentasParaPagar: Record<string, any>; // Nuevo: objeto centralizado de cuentas seleccionadas y editadas
  handleToggleCuentaParaPagar: (cuenta: CuentaPorPagar) => void; // Nuevo: función para selección/edición

  handlePagosDropdownOpen: (open: boolean, cuenta: CuentaPorPagar) => void;
  handleEstadoChange: (id: string, value: string) => void;
  ESTATUS_OPCIONES: string[];
  formatFecha: (fecha: string) => string;
  calcularDiasRestantes: (fechaEmision: string, diasCredito: number) => number;
  abrirEdicionCuenta: (cuentaId: string) => void;
}

const TablaCuentasPorPagar: React.FC<TablaCuentasPorPagarProps> = ({
  cuentasFiltradas,
  pagosAprobadosPorCuenta,
  cuentasParaPagar,
  handleToggleCuentaParaPagar,
  handlePagosDropdownOpen,
  handleEstadoChange,
  ESTATUS_OPCIONES,
  formatFecha,
  calcularDiasRestantes,
  abrirEdicionCuenta
}) => (
  <div className="overflow-x-auto max-h-[70vh]">
    <table className="min-w-full divide-y divide-slate-200">
      <thead className="bg-slate-100 sticky top-0 z-10">
        <tr className="text-slate-700 text-xs uppercase">
          <th className="px-2 py-3 text-center">Acciones</th>
          <th className="px-2 py-3 text-center">Imagen</th>
          <th className="px-2 py-3 text-center">Pagos</th>
          <th className="px-2 py-3 text-center">Monto Bs</th>
          <th className="px-2 py-3 text-center">Retención Bs</th>
          <th className="px-2 py-3 text-center">Tasa</th>
          <th className="px-2 py-3 text-center">Divisa</th>
          <th className="px-2 py-3 text-center">Días para Vencer</th>
          <th className="px-2 py-3 text-center">Fecha Emisión</th>
          <th className="px-2 py-3 text-center">Recepción</th>
          <th className="px-2 py-3 text-center">Fecha Vencimiento</th>
          <th className="px-2 py-3 text-center">Proveedor</th>
          <th className="px-2 py-3 text-center">N° Factura</th>
          <th className="px-2 py-3 text-center">N° Control</th>
          <th className="px-2 py-3 text-center">Descripción</th>
          <th className="px-2 py-3 text-center">Usuario</th>
          <th className="px-2 py-3 text-center">Farmacia</th>
          <th className="px-2 py-3 text-center">Estatus</th>
          <th className="px-2 py-3 text-center">Cambiar Estatus</th>
        </tr>
      </thead>
      <tbody className="bg-white divide-y divide-slate-200">
        {cuentasFiltradas
          .slice()
          .sort((a, b) => {
            const diasA = calcularDiasRestantes(a.fechaEmision, a.diasCredito);
            const diasB = calcularDiasRestantes(b.fechaEmision, b.diasCredito);
            return diasA - diasB;
          })
          .map(c => (
            <FilaCuentaPorPagar
              key={c._id}
              cuenta={c}
              pagosAprobadosPorCuenta={pagosAprobadosPorCuenta}
              cuentasParaPagar={cuentasParaPagar}
              handleToggleCuentaParaPagar={handleToggleCuentaParaPagar}
              handlePagosDropdownOpen={handlePagosDropdownOpen}
              handleEstadoChange={handleEstadoChange}
              ESTATUS_OPCIONES={ESTATUS_OPCIONES}
              formatFecha={formatFecha}
              abrirEdicionCuenta={abrirEdicionCuenta}
              calcularDiasRestantes={calcularDiasRestantes}
            />
          ))}
      </tbody>
    </table>
  </div>
);

export default TablaCuentasPorPagar;
