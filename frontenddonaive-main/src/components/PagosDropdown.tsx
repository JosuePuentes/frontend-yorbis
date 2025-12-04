import React from "react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent } from "@/components/ui/dropdown-menu";
import { animate } from 'animejs';
import ImageDisplay from "./upfile/ImageDisplay";

interface PagosDropdownProps {
  cuentaId: string;
  onOpenChange: (open: boolean) => void;
  montoTotal: number;
  monedaCuenta: string;
  tasaCuenta: number;
}

const PagosDropdown: React.FC<PagosDropdownProps> = ({ cuentaId, onOpenChange, montoTotal, monedaCuenta, tasaCuenta }) => {
  const [pagos, setPagos] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(false);
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // Consulta explícita al abrir el dropdown
  const handleOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (open) {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      fetch(`${API_BASE_URL}/pagoscpp?cuentaPorPagarId=${cuentaId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : Promise.reject())
        .then(data => setPagos(Array.isArray(data) ? data : []))
        .catch(() => setPagos([]))
        .finally(() => setLoading(false));
    } else {
      setPagos([]); // Opcional: limpiar pagos al cerrar
    }
  };

  // Siempre trabajar en Bs como moneda principal
  let montoTotalBs = monedaCuenta === 'USD' && tasaCuenta && tasaCuenta > 0
    ? montoTotal * tasaCuenta
    : montoTotal;
  let montoTotalUSD = tasaCuenta && tasaCuenta > 0
    ? montoTotalBs / tasaCuenta
    : null;

  // Calcular total pagado y total retención en Bs y USD considerando moneda y tasa de cada pago
  let totalPagadoBs = 0;
  let totalPagadoUSD = 0;
  let totalRetencionBs = 0;
  let totalRetencionUSD = 0;
  const pagosArray = Array.isArray(pagos) ? pagos : [];
  pagosArray.forEach(pago => {
    const monto = typeof (pago.monto ?? pago.montoDePago) === 'number' && !isNaN(pago.monto ?? pago.montoDePago)
      ? (pago.monto ?? pago.montoDePago)
      : 0;
    const retencion = typeof (pago.retencion) === 'number' && !isNaN(pago.retencion) ? pago.retencion : 0;
    const moneda = pago.moneda ?? pago.monedaDePago;
    const tasa = typeof (pago.tasa ?? pago.tasaDePago) === 'number' && !isNaN(pago.tasa ?? pago.tasaDePago)
      ? (pago.tasa ?? pago.tasaDePago)
      : 0;
    if (moneda === 'USD' && tasa > 0) {
      totalPagadoBs += monto * tasa;
      totalPagadoUSD += monto;
      totalRetencionBs += retencion * tasa;
      totalRetencionUSD += retencion;
    } else if (moneda === 'Bs') {
      totalPagadoBs += monto;
      totalRetencionBs += retencion;
      if (tasa > 0) {
        totalPagadoUSD += monto / tasa;
        totalRetencionUSD += retencion / tasa;
      }
    }
  });
  let pendienteBs = montoTotalBs - totalPagadoBs - totalRetencionBs;
  let pendienteUSD = tasaCuenta && tasaCuenta > 0 ? pendienteBs / tasaCuenta : null;
  let diferenciaTasaBs = 0;
  if (pendienteBs < 0) {
    diferenciaTasaBs = Math.abs(pendienteBs);
    pendienteBs = 0;
    pendienteUSD = 0;
  }

  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (dropdownRef.current) {
      animate(dropdownRef.current, {
        opacity: [0, 1],
        translateY: [-16, 0],
        duration: 350,
        ease: 'outCubic'
      });
    }
  }, [pagos]);

  return (
    <DropdownMenu onOpenChange={handleOpenChange}>
      <DropdownMenuTrigger asChild>
        <button className="px-3 py-2 rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition text-2xl font-semibold border border-indigo-200">
          Ver pagos
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-96 p-4" ref={dropdownRef} role="listbox" aria-label="Pagos registrados">
        <div className="mb-4 p-3 border-b border-slate-200">
          <div className="text-xl text-slate-700 mb-2">
            <span className="font-semibold">Tasa original de la cuenta:</span> {tasaCuenta ? Number(tasaCuenta).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '--'}
          </div>
          <div className="text-xl text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Monto cuenta:</span> {montoTotalBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {montoTotalUSD != null ? montoTotalUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}
          </div>
          <div className="text-xl text-slate-500 mb-2">
            <span className="font-semibold text-slate-700">Total pagado:</span> {totalPagadoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {totalPagadoUSD ? totalPagadoUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}
          </div>
          <div className={`text-xl font-semibold mb-2 text-slate-700`}>Deuda pendiente: {pendienteBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: {pendienteUSD != null ? pendienteUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }) + ' USD' : '--'}</div>
          {/* Visualización especial si hay diferencia por tasa */}
          {diferenciaTasaBs > 0 && (
            <div className="text-xl text-red-700 bg-red-50 border border-red-200 rounded px-4 py-3 mt-3">
              El monto pagado supera la deuda original debido a diferencias de tasa.<br />
              <span className="font-semibold">Monto por diferencia de tasa:</span> {diferenciaTasaBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs
            </div>
          )}
        </div>
        <div className="divide-y divide-slate-200">
          {loading ? (
            <div className="p-6 text-center text-slate-500 text-lg animate-pulse" aria-busy="true">
              <div className="h-5 bg-slate-200 rounded w-2/3 mx-auto mb-3"></div>
              <div className="h-5 bg-slate-200 rounded w-1/2 mx-auto"></div>
            </div>
          ) : pagosArray && pagosArray.length ? (
            pagosArray.map((pago, idx) => {
              // Compatibilidad: soporta pagos de MongoDB y del frontend
              let montoOriginal = typeof (pago.monto ?? pago.montoDePago) === 'number' && !isNaN(pago.monto ?? pago.montoDePago)
                ? (pago.monto ?? pago.montoDePago)
                : 0;
              let labelOriginal = (pago.moneda ?? pago.monedaDePago) === 'USD' ? 'USD' : 'Bs';
              let tasa = typeof (pago.tasa ?? pago.tasaDePago) === 'number' && !isNaN(pago.tasa ?? pago.tasaDePago)
                ? (pago.tasa ?? pago.tasaDePago)
                : 0;
              let montoBs = (pago.moneda ?? pago.monedaDePago) === 'USD' && tasa > 0
                ? montoOriginal * tasa
                : montoOriginal;
              let montoUSD = (pago.moneda ?? pago.monedaDePago) === 'Bs' && tasa > 0
                ? montoOriginal / tasa
                : (pago.moneda ?? pago.monedaDePago) === 'USD' ? montoOriginal : null;
              let retencion = typeof (pago.retencion) === 'number' && !isNaN(pago.retencion) ? pago.retencion : 0;
              let referencia = pago.referencia ?? pago.numeroControl ?? '-';
              let fecha = pago.fecha ?? pago.fechaRegistro ?? '-';
              let usuario = pago.usuario ?? pago.usuarioCorreoCuenta ?? '--';
              return (
                <div key={pago._id || idx} className={`pagos-dropdown-item-${cuentaId} px-4 py-3 text-lg text-slate-700 relative bg-white`} role="option" aria-selected="false">
                  <div className="flex flex-col gap-1">
                    <span className="font-semibold text-green-700 text-xl">
                      {`${montoOriginal.toLocaleString(labelOriginal === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: labelOriginal === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })} ${labelOriginal}`}
                    </span>
                    <span className="text-xs text-slate-500 italic">
                      {(pago.moneda ?? pago.monedaDePago) === 'USD' && tasa > 0
                        ? `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${montoOriginal.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                        : (pago.moneda ?? pago.monedaDePago) === 'Bs' && tasa > 0 && montoUSD != null
                          ? `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${montoUSD.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                          : `${montoBs.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs`}
                    </span>
                  </div>
                  <div className="text-slate-600 text-base mt-1">Referencia: {referencia}</div>
                  <div className="text-slate-400 text-xs">Moneda: <span className="font-semibold">{pago.moneda ?? pago.monedaDePago ?? '--'}</span> | Tasa: <span className="font-semibold">{tasa ? Number(tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 }) : '--'}</span></div>
                  {pago.retencion !== undefined && (
                    <div className="flex flex-col gap-0.5 mt-1">
                      <span className="text-slate-500 text-base">
                        {`Retención: ${retencion.toLocaleString(labelOriginal === 'USD' ? 'en-US' : 'es-VE', { style: 'currency', currency: labelOriginal === 'USD' ? 'USD' : 'VES', minimumFractionDigits: 2 })} ${labelOriginal}`}
                      </span>
                      <span className="text-xs text-slate-400 italic">
                        {(pago.moneda ?? pago.monedaDePago) === 'USD' && tasa > 0
                          ? `${(retencion * tasa).toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${retencion.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                          : (pago.moneda ?? pago.monedaDePago) === 'Bs' && tasa > 0 && retencion != null
                            ? `${retencion.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs / Ref: ${(retencion / tasa).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 })} USD (Tasa: ${Number(tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })})`
                            : `${retencion.toLocaleString('es-VE', { style: 'currency', currency: 'VES', minimumFractionDigits: 2 })} Bs`}
                      </span>
                    </div>
                  )}
                  <div className="text-slate-500 text-sm mt-1">Banco Emisor: {pago.bancoEmisor} | Banco Receptor: {pago.bancoReceptor}</div>
                  <div className="text-slate-400 text-sm">Fecha: {fecha}</div>
                  {pago.imagenPago && (
                    <div className="mt-3 flex items-center gap-3">
                      <div className="border border-slate-200 rounded shadow-sm overflow-hidden bg-slate-50 p-2">
                        <ImageDisplay
                          imageName={pago.imagenPago}
                          alt="Comprobante de pago"
                          style={{
                            maxWidth: 150,
                            maxHeight: 80,
                            borderRadius: 6,
                            objectFit: 'cover',
                            cursor: 'pointer',
                            transition: 'transform 0.2s',
                          }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">Comprobante</span>
                    </div>
                  )}
                  <div className="text-slate-400 text-xs mt-1">Usuario: {usuario}</div>
                </div>
              );
            })
          ) : (
            <div className="p-6 text-center text-slate-400 text-xl">Sin pagos registrados</div>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default PagosDropdown;