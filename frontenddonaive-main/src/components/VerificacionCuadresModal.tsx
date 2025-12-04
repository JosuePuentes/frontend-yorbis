import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ImageDisplay from "./upfile/ImageDisplay";

interface CuadreCaja {
  _id: string;
  dia: string;
  cajaNumero: number;
  tasa: number;
  turno: string;
  cajero: string;
  totalCajaSistemaBs: number;
  devolucionesBs: number;
  recargaBs: number;
  pagomovilBs: number;
  puntosVenta?: Array<{ banco: string; puntoDebito: number; puntoCredito: number }>;
  efectivoBs: number;
  totalBs: number;
  totalBsEnUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  valesUsd?: number;
  totalGeneralUsd: number;
  diferenciaUsd: number;
  sobranteUsd?: number;
  faltanteUsd?: number;
  delete: boolean;
  estado?: string;
  nombreFarmacia?: string;
  codigoFarmacia?: string;
  costoInventario?: number; // <-- Agregado para soportar nuevos cuadres
  fecha?: string; // <-- Para mostrar la fecha de registro
  hora?: string;  // <-- Para mostrar la hora de registro
  imagenesCuadre?: string[]; // Nombres de los objetos de imagen en R2 (hasta 3)
  // imagenCuadre?: string; // DEPRECATED
}

interface Props {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
  soloDenegar?: boolean;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VerificacionCuadresModal: React.FC<Props> = ({ open, onClose, farmaciaId, farmaciaNombre, soloDenegar }) => {
  const [cuadres, setCuadres] = useState<CuadreCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !farmaciaId) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/cuadres/${farmaciaId}`)
      .then(res => res.json())
      .then(data => {
        // Solo pendientes de verificación
        setCuadres(data.filter((c: CuadreCaja) => c.estado !== "verified" && c.estado !== "denied"));
      })
      .catch(() => setError("Error al cargar cuadres"))
      .finally(() => setLoading(false));
  }, [open, farmaciaId]);

  const actualizarEstado = async (cuadre: CuadreCaja, nuevoEstado: "verified" | "denied") => {
    if (!farmaciaId || !cuadre._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cuadres/${farmaciaId}/${cuadre._id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: nuevoEstado }), // Enviar costo
      });
      if (!res.ok) throw new Error();
      setCuadres(prev => prev.filter(c => c._id !== cuadre._id));
    } catch {
      alert("No se pudo actualizar el estado del cuadre");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-4 sm:p-8 relative border-4 border-blue-700 mx-2 sm:mx-0">
        <button className="absolute top-2 right-3 sm:top-3 sm:right-5 text-2xl sm:text-3xl text-gray-500 hover:text-red-600 font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-blue-800 mb-4 sm:mb-6 text-center tracking-wide drop-shadow">Verificar Cuadres - {farmaciaNombre}</h2>
        {loading ? (
          <div className="text-center py-8 sm:py-10 text-base sm:text-lg">Cargando...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8 sm:py-10 text-base sm:text-lg">{error}</div>
        ) : cuadres.length === 0 ? (
          <div className="text-center text-gray-500 py-8 sm:py-10 text-base sm:text-lg">No hay cuadres pendientes de verificación.</div>
        ) : (
          <div className="flex flex-col gap-6 sm:gap-8 max-h-[65vh] overflow-y-auto">
            {cuadres.map((c) => (
              <Card key={c._id} className="p-4 sm:p-6 flex flex-col gap-2 sm:gap-3 border-2 border-blue-300 rounded-xl shadow-lg bg-blue-50">
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-2">
                  <div className="text-base sm:text-lg font-bold text-blue-900">Día: <span className="font-extrabold">{c.dia}</span></div>
                  <div className="text-base sm:text-lg font-bold text-blue-900">Caja: <span className="font-extrabold">{c.cajaNumero}</span></div>
                  <div className="text-base sm:text-lg font-bold text-blue-900">Turno: <span className="font-extrabold">{c.turno}</span></div>
                  <div className="text-base sm:text-lg font-bold text-blue-900">Cajero: <span className="font-extrabold">{c.cajero}</span></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1 text-sm sm:text-base">
                  <div><b>Tasa:</b> {c.tasa}</div>
                  <div><b>Total Caja Sistema Bs:</b> {c.totalCajaSistemaBs}</div>
                  <div><b>Recarga Bs:</b> {c.recargaBs}</div>
                  <div><b>Pago Móvil Bs:</b> {c.pagomovilBs}</div>
                  <div><b>Efectivo Bs:</b> {c.efectivoBs}</div>
                  <div><b>Efectivo USD:</b> {c.efectivoUsd}</div>
                  <div><b>Zelle USD:</b> {c.zelleUsd}</div>
                  <div><b>Vales USD:</b> {typeof c.valesUsd !== 'undefined' ? c.valesUsd : '-'}</div>
                  <div><b>Total Bs en USD:</b> {c.totalBsEnUsd}</div>
                  <div><b>Total General USD:</b> {c.totalGeneralUsd}</div>
                  <div><b>Diferencia USD:</b> {c.diferenciaUsd}</div>
                  <div><b>Sobrante USD:</b> <span className="text-green-700 font-bold">{c.sobranteUsd}</span></div>
                  <div><b>Faltante USD:</b> <span className="text-red-700 font-bold">{c.faltanteUsd}</span></div>
                  <div><b>Devoluciones:</b> <span className="font-bold text-blue-700">{c.devolucionesBs}</span></div>
                  <div><b>Estado actual:</b> <span className="font-bold">{c.estado}</span></div>
                  <div><b>Eliminado:</b> <span className="font-semibold">{c.delete ? 'Sí' : 'No'}</span></div>
                </div>
                {c.puntosVenta && c.puntosVenta.length > 0 && (
                  <div className="text-sm sm:text-base mt-2">
                    <span className="font-semibold">Puntos de Venta:</span>
                    <ul className="ml-4 list-disc">
                      {c.puntosVenta.map((pv, i) => (
                        <li key={i}>
                          Banco: <span className="font-semibold">{pv.banco}</span>, Débito: <span className="font-semibold">{pv.puntoDebito}</span>, Crédito: <span className="font-semibold">{pv.puntoCredito}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1 text-sm sm:text-base">
                  <div>
                    <b>Costo Inventario:</b> {typeof c.costoInventario !== 'undefined' ? c.costoInventario : <span className="text-gray-400">No registrado</span>}
                  </div>
                  <div>
                    <b>Fecha registro:</b> {c.fecha ? c.fecha : <span className="text-gray-400">No registrada</span>}
                  </div>
                  <div>
                    <b>Hora registro:</b> {c.hora ? c.hora : <span className="text-gray-400">No registrada</span>}
                  </div>
                </div>
                {/* Mostrar imágenes adjuntas si existen */}
                {Array.isArray(c.imagenesCuadre) && c.imagenesCuadre.length > 0 && (
                  <div className="mt-2">
                    <span className="text-xs text-gray-700">Imágenes adjuntas:</span>
                    <div className="flex gap-2 mt-1 flex-wrap">
                      {c.imagenesCuadre.map((img, idx) => (
                        <ImageDisplay key={img || idx} imageName={img} style={{ maxWidth: 200, maxHeight: 200, borderRadius: 8, marginTop: 8 }} />
                      ))}
                    </div>
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4 justify-end">
                  {!soloDenegar && (
                    <Button variant="default" size="lg" className="w-full sm:w-auto px-6 py-2 text-base sm:text-lg font-bold" onClick={() => actualizarEstado(c, "verified")}>Verificar</Button>
                  )}
                  <Button variant="destructive" size="lg" className="w-full sm:w-auto px-6 py-2 text-base sm:text-lg font-bold" onClick={() => actualizarEstado(c, "denied")}>Denegar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificacionCuadresModal;
