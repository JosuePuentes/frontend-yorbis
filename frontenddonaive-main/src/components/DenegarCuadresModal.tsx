import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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
}

interface Props {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const DenegarCuadresModal: React.FC<Props> = ({ open, onClose, farmaciaId, farmaciaNombre }) => {
  const [cuadres, setCuadres] = useState<CuadreCaja[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmarId, setConfirmarId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !farmaciaId) return;
    setLoading(true);
    setError(null);
    fetch(`${API_BASE_URL}/cuadres/${farmaciaId}`)
      .then(res => res.json())
      .then(data => {
        // Mostrar todos los cuadres pendientes, sin importar la fecha
        setCuadres(
          data.filter((c: CuadreCaja) => c.estado !== "verified" && c.estado !== "denied")
        );
      })
      .catch(() => setError("Error al cargar cuadres"))
      .finally(() => setLoading(false));
  }, [open, farmaciaId]);

  const denegarCuadre = async (cuadre: CuadreCaja) => {
    setConfirmarId(cuadre._id);
  };

  const confirmarDenegar = async (cuadre: CuadreCaja) => {
    if (!farmaciaId || !cuadre._id) return;
    try {
      const res = await fetch(`${API_BASE_URL}/cuadres/${farmaciaId}/${cuadre._id}/estado`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: "denied" }),
      });
      if (!res.ok) throw new Error();
      setCuadres(prev => prev.filter(c => c._id !== cuadre._id));
    } catch {
      alert("No se pudo denegar el cuadre");
    } finally {
      setConfirmarId(null);
    }
  };

  const cancelarDenegar = () => setConfirmarId(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-2 sm:p-4 md:p-8 relative border-4 border-blue-700 mx-1 sm:mx-2 md:mx-0">
        <button className="absolute top-2 right-3 sm:top-3 sm:right-5 text-2xl sm:text-3xl text-gray-500 hover:text-red-600 font-bold" onClick={onClose}>&times;</button>
        <h2 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-blue-800 mb-3 sm:mb-4 md:mb-6 text-center tracking-wide drop-shadow">Cuadres - {farmaciaNombre}</h2>
        {loading ? (
          <div className="text-center py-8 sm:py-10 text-base sm:text-lg">Cargando...</div>
        ) : error ? (
          <div className="text-center text-red-600 py-8 sm:py-10 text-base sm:text-lg">{error}</div>
        ) : cuadres.length === 0 ? (
          <div className="text-center text-gray-500 py-8 sm:py-10 text-base sm:text-lg">No hay cuadres pendientes.</div>
        ) : (
          <div className="flex flex-col gap-4 sm:gap-6 md:gap-8 max-h-[70vh] overflow-y-auto pr-1">
            {cuadres.map((c) => (
              <Card key={c._id} className="p-3 sm:p-4 md:p-6 flex flex-col gap-2 sm:gap-3 border-2 border-blue-300 rounded-xl shadow-lg bg-blue-50">
                <div className="flex flex-wrap gap-2 sm:gap-4 mb-2">
                  <div className="text-sm sm:text-base md:text-lg font-bold text-blue-900">Día: <span className="font-extrabold">{c.dia}</span></div>
                  <div className="text-sm sm:text-base md:text-lg font-bold text-blue-900">Caja: <span className="font-extrabold">{c.cajaNumero}</span></div>
                  <div className="text-sm sm:text-base md:text-lg font-bold text-blue-900">Turno: <span className="font-extrabold">{c.turno}</span></div>
                  <div className="text-sm sm:text-base md:text-lg font-bold text-blue-900">Cajero: <span className="font-extrabold">{c.cajero}</span></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 sm:gap-x-8 gap-y-1 text-xs sm:text-sm md:text-base">
                  <div><b>Tasa:</b> {c.tasa}</div>
                  <div><b>Total Caja Sistema Bs:</b> {c.totalCajaSistemaBs}</div>
                  <div><b>Devoluciones Bs:</b> {c.devolucionesBs}</div>
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
                  <div><b>Estado actual:</b> <span className="font-bold">{c.estado}</span></div>
                  <div><b>Eliminado:</b> <span className="font-semibold">{c.delete ? 'Sí' : 'No'}</span></div>
                </div>
                {c.puntosVenta && c.puntosVenta.length > 0 && (
                  <div className="text-xs sm:text-sm md:text-base mt-2">
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
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mt-4 justify-end">
                  <Button variant="destructive" size="lg" className="w-full sm:w-auto px-6 py-2 text-xs sm:text-base md:text-lg font-bold" onClick={() => denegarCuadre(c)}>Denegar</Button>
                </div>
              </Card>
            ))}
          </div>
        )}
        {confirmarId && (
          <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-xs sm:max-w-sm w-full border border-blue-200">
              <h3 className="text-base sm:text-lg font-bold text-red-700 mb-2">Confirmar denegación</h3>
              <p className="mb-4 text-gray-700 text-xs sm:text-sm">¿Estás seguro que deseas denegar este cuadre? Esta acción no se puede deshacer.</p>
              <div className="flex gap-2 sm:gap-3 justify-center">
                <Button
                  variant="destructive"
                  onClick={() => confirmarDenegar(cuadres.find(c => c._id === confirmarId)!)}
                  className="px-3 sm:px-4 py-2 font-semibold rounded-lg text-xs sm:text-base"
                >
                  Sí, denegar
                </Button>
                <Button
                  variant="secondary"
                  onClick={cancelarDenegar}
                  className="px-3 sm:px-4 py-2 font-semibold rounded-lg text-xs sm:text-base"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DenegarCuadresModal;
