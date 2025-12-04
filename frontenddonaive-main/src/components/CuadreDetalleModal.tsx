import React from "react";
import ImageDisplay from "./upfile/ImageDisplay";

interface PuntoVenta {
  banco: string;
  puntoDebito: number;
  puntoCredito: number;
}

interface CuadreDetalleModalProps {
  open: boolean;
  onClose: () => void;
  cuadre: any;
}

const CuadreDetalleModal: React.FC<CuadreDetalleModalProps> = ({ open, onClose, cuadre }) => {
  if (!open || !cuadre) return null;
  return (
    <div className="fixed inset-0 bg-opacity-40 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-xl w-full relative max-h-[90vh] overflow-auto border border-blue-200 animate-fade-in">
        <button
          className="absolute top-3 right-5 text-3xl text-gray-400 hover:text-red-500 transition-colors"
          onClick={onClose}
          aria-label="Cerrar"
        >
          ×
        </button>
        <h2 className="text-2xl font-extrabold mb-6 text-blue-800 text-center tracking-tight drop-shadow">Detalle del Cuadre</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 text-sm">
          <div><b>Fecha Cuadre:</b> {cuadre.dia || <span className="text-gray-400">No registrada</span>}</div>
          <div><b>Hora Registro:</b> {cuadre.hora || <span className="text-gray-400">No registrada</span>}</div>
          <div><b>Fecha Registro:</b> {cuadre.fecha || <span className="text-gray-400">No registrada</span>}</div>
          <div><b>Costo Inventario:</b> {typeof cuadre.costoInventario !== 'undefined' ? cuadre.costoInventario : <span className="text-gray-400">No registrado</span>}</div>
          <div><b>Caja:</b> {cuadre.cajaNumero}</div>
          <div><b>Tasa:</b> {cuadre.tasa}</div>
          <div><b>Turno:</b> {cuadre.turno}</div>
          <div><b>Cajero:</b> {cuadre.cajero}</div>
          <div><b>Cédula Cajero:</b> {cuadre.cajeroId}</div>
          <div><b>Farmacia:</b> {cuadre.nombreFarmacia || cuadre.codigoFarmacia}</div>
          <div><b>Estado:</b> <span className={`font-bold ${cuadre.estado === 'verified' ? 'text-green-600' : cuadre.estado === 'wait' ? 'text-yellow-600' : cuadre.estado === 'denied' ? 'text-red-600' : 'text-gray-700'}`}>{cuadre.estado}</span></div>
          <div><b>Total Caja Sistema Bs:</b> {cuadre.totalCajaSistemaBs}</div>
          <div><b>Devoluciones Bs:</b> {cuadre.devolucionesBs}</div>
          <div><b>Recarga Bs:</b> {cuadre.recargaBs}</div>
          <div><b>Pago Móvil Bs:</b> {cuadre.pagomovilBs}</div>
          <div><b>Efectivo Bs:</b> {cuadre.efectivoBs}</div>
          <div className="col-span-2"><b>Vales USD:</b> <span className="text-green-600 font-extrabold text-lg">{cuadre.valesUsd !== undefined ? cuadre.valesUsd : '-'}</span></div>
          <div><b>Total Bs:</b> {cuadre.totalBs}</div>
          <div><b>Total Bs en USD:</b> {cuadre.totalBsEnUsd}</div>
          <div><b>Efectivo USD:</b> {cuadre.efectivoUsd}</div>
          <div><b>Zelle USD:</b> {cuadre.zelleUsd}</div>
          <div><b>Total General USD:</b> {cuadre.totalGeneralUsd}</div>
          <div><b>Diferencia USD:</b> <span className={Number(cuadre.diferenciaUsd) > 0 ? 'text-green-700 font-bold' : Number(cuadre.diferenciaUsd) < 0 ? 'text-red-700 font-bold' : ''}>{cuadre.diferenciaUsd}</span></div>
          <div><b>Sobrante USD:</b> <span className="text-green-700 font-bold">{cuadre.sobranteUsd}</span></div>
          <div><b>Faltante USD:</b> <span className="text-red-700 font-bold">{cuadre.faltanteUsd}</span></div>
        </div>
        {cuadre.puntosVenta && cuadre.puntosVenta.length > 0 && (
          <div className="mt-4">
            <b>Puntos de Venta:</b>
            <ul className="ml-4 list-disc">
              {cuadre.puntosVenta.map((pv: PuntoVenta, i: number) => (
                <li key={i}>
                  Banco: <b>{pv.banco}</b>, Débito: <b>{pv.puntoDebito}</b>, Crédito: <b>{pv.puntoCredito}</b>
                </li>
              ))}
            </ul>
          </div>
        )}
        {/* Mostrar imágenes del cuadre si existen */}
        {cuadre.imagenesCuadre && cuadre.imagenesCuadre.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-6 border-t pt-4">
            {cuadre.imagenesCuadre.map((img: string, idx: number) => (
              <ImageDisplay
                key={img + idx}
                imageName={img}
                alt={`Comprobante ${idx + 1}`}
                style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, border: '1px solid #ccc', boxShadow: '0 1px 4px #0002', cursor: 'pointer' }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CuadreDetalleModal;
