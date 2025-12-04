import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageDisplay from "./upfile/ImageDisplay";

interface CuentaPorPagar {
  _id: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  divisa: string;
  tasa: number;
  numeroFactura: string;
  numeroControl: string;
  fechaEmision: string;
  diasCredito: number;
  estatus: string;
  farmacia: string;
  retencion: number;
  fechaRecepcion: string;
  fechaVencimiento?: string; // Nuevo campo
  fechaRegistro?: string; // Nuevo campo
  imagenesCuentaPorPagar?: string[]; // <-- Añadido para las imágenes
}

interface ModalCuentasPorPagarProps {
  cuentas: CuentaPorPagar[];
  farmaciaNombre: string;
  onConfirm: (cuentaId: string, nuevoEstatus: string) => void;
  onClose: () => void;
  loading: boolean;
  error: string | null;
}

const ModalCuentasPorPagar: React.FC<ModalCuentasPorPagarProps> = ({ cuentas, farmaciaNombre, onConfirm, onClose, loading, error }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 relative border-4 border-blue-700 mx-2">
        <button className="absolute top-2 right-3 text-2xl text-gray-500 hover:text-red-600 font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-2xl font-extrabold text-blue-800 mb-4 text-center tracking-wide drop-shadow">Cuentas por Pagar - {farmaciaNombre}</h2>
        {loading ? (
          <div className="text-center py-8 text-base">Cargando...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8 text-base">{error}</div>
        ) : cuentas.length === 0 ? (
          <div className="text-center text-gray-500 py-8 text-base">No hay cuentas por pagar pendientes para esta farmacia.</div>
        ) : (
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-y-auto">
            {cuentas.map((c) => (
              <Card key={c._id} className="p-4 border-2 border-blue-300 rounded-xl shadow-lg bg-blue-50 flex flex-col gap-2">
                <div className="text-lg font-bold text-blue-900">{c.proveedor}</div>
                <div className="text-base text-gray-700">Factura: <span className="font-semibold">{c.numeroFactura}</span></div>
                <div className="text-base text-gray-700">Control: <span className="font-semibold">{c.numeroControl}</span></div>
                <div className="text-base text-gray-700">Descripción: {c.descripcion}</div>
                <div className="text-base text-gray-700 mb-1">Monto: <span className="font-semibold text-green-700">{c.divisa === 'Bs' && c.tasa ? `Bs ${c.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / Tasa: ${c.tasa} | $${(c.monto / c.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : `$${c.monto.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}</span></div>
                <div className="text-base text-gray-700 mb-1">Retención: <span className="font-semibold text-blue-700">{c.divisa === 'Bs' && c.tasa ? `Bs ${c.retencion?.toLocaleString('es-VE', { minimumFractionDigits: 2 })} / Tasa: ${c.tasa} | $${(c.retencion / c.tasa).toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : `$${c.retencion?.toLocaleString('es-VE', { minimumFractionDigits: 2 })}`}</span></div>
                <div className="text-base text-gray-700 mb-1">Fecha Emisión: {c.fechaEmision}</div>
                <div className="text-base text-gray-700 mb-1">Fecha Recepción: {c.fechaRecepcion}</div>
                <div className="text-base text-gray-700 mb-1">Fecha Vencimiento: {c.fechaVencimiento}</div>
                <div className="text-base text-gray-700 mb-1">Días Crédito: {c.diasCredito}</div>
                {/* Mostrar imágenes si existen */}
                {Array.isArray(c.imagenesCuentaPorPagar) && c.imagenesCuentaPorPagar.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {c.imagenesCuentaPorPagar.map((img: string, idx: number) => (
                      <ImageDisplay
                        key={img + idx}
                        imageName={img}
                        alt={`Comprobante ${idx + 1}`}
                        style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #ccc', boxShadow: '0 1px 4px #0002', cursor: 'pointer' }}
                      />
                    ))}
                  </div>
                )}
                <div className="flex gap-3 mt-2">
                  <Button
                    onClick={() => onConfirm(c._id, "verified")}
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105"
                  >
                    validar
                  </Button>
                </div>
                
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModalCuentasPorPagar;
