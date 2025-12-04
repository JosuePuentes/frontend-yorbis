import React from "react";
import type { CuadreCaja } from "../data";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useDataFarmaciaContext } from "@/context/DataFarmaciaContext";
import { useUserContext } from "@/context/UserContext";

interface Props {
    farmacia: string;
    cuadreCajas: CuadreCaja[];
    onClose: () => void;
}

const ResumenCuadreFarmacia: React.FC<Props> = ({ farmacia, cuadreCajas, onClose }) => {
    const { deleteCuadreCaja } = useDataFarmaciaContext();
    const { usuario } = useUserContext();

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-blue-100 to-blue-300 bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="absolute top-2 right-2 text-xl"
                    aria-label="Cerrar"
                >
                    ×
                </Button>
                <h2 className="text-2xl font-bold mb-6 text-blue-800 text-center">
                    Detalle Cuadre de Caja - {farmacia}
                </h2>
                {cuadreCajas.length === 0 ? (
                    <p className="text-center text-gray-500">No hay datos para esta fecha.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {[...cuadreCajas]
                            .sort((a, b) => Number(a.delete) - Number(b.delete))
                            .map((c, idx) => (
                                <Card
                                    key={idx}
                                    className={`border-blue-200 flex flex-col justify-between h-full relative ${c.delete ? "opacity-50" : "bg-blue-50"}`}
                                >
                                    {/* Indicador visual de eliminado */}
                                    {c.delete && (
                                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded z-10 shadow">
                                            Eliminado
                                        </span>
                                    )}
                                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                                        <CardTitle className="text-blue-700 text-lg">
                                            Caja #{c.cajaNumero}
                                        </CardTitle>
                                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                                            {c.turno}
                                        </span>
                                    </CardHeader>
                                    <CardContent className="flex flex-col gap-2 flex-1">
                                        <div className="text-sm text-gray-700 mb-2">
                                            <span className="font-medium">Cajero:</span> {c.cajero}
                                        </div>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            {/* Bs */}
                                            <div>
                                                <div className="font-semibold text-blue-900 mb-1">Bolívares (Bs)</div>
                                                <div><span className="font-medium">Total Caja Sistema:</span> {c.totalCajaSistemaBs.toLocaleString()}</div>
                                                <div><span className="font-medium">Efectivo:</span> {c.efectivoBs.toLocaleString()}</div>
                                                <div><span className="font-medium">Pago Móvil:</span> {c.pagomovilBs.toLocaleString()}</div>
                                                <div><span className="font-medium">Punto Débito:</span> {c.puntoDebitoBs?.toLocaleString() || 'N/A'}</div>
                                                <div><span className="font-medium">Punto Crédito:</span> {c.puntoCreditoBs?.toLocaleString() || 'N/A'}</div>
                                                <div><span className="font-medium">Recarga:</span> {c.recargaBs.toLocaleString()}</div>
                                                <div><span className="font-medium">Devoluciones:</span> {c.devolucionesBs.toLocaleString()}</div>
                                            </div>
                                            {/* USD */}
                                            <div>
                                                <div className="font-semibold text-green-700 mb-1">Dólares (USD)</div>
                                                <div><span className="font-medium">Efectivo:</span> {c.efectivoUsd}</div>
                                                <div><span className="font-medium">Zelle:</span> {c.zelleUsd}</div>
                                                <div><span className="font-medium">Total Bs en USD:</span> {c.totalBsEnUsd}</div>
                                                <div><span className="font-medium">Tasa:</span> {c.tasa}</div>
                                            </div>
                                        </div>
                                        {/* Puntos de Venta */}
                                        {c.puntosVenta && c.puntosVenta.length > 0 && (
                                            <div className="mt-2">
                                                <div className="font-semibold text-blue-700">Puntos de Venta:</div>
                                                {c.puntosVenta.map((pv, i) => (
                                                    <div key={i} className="flex gap-2 text-xs ml-2">
                                                        <span className="font-medium">{pv.banco}:</span>
                                                        <span>Débito Bs: {pv.puntoDebito}</span>
                                                        <span>Crédito Bs: {pv.puntoCredito}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {/* Estado */}
                                        {c.estado && (
                                            <div className="mt-1 text-xs text-gray-500">Estado: <span className="font-bold">{c.estado}</span></div>
                                        )}
                                        {/* Totales abajo */}
                                        <div className="mt-4 border-t pt-2 flex flex-col gap-1">
                                            <div className="flex justify-between">
                                                <span className="font-bold text-blue-900">Total Bs:</span>
                                                <span className="font-bold">{c.totalBs.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="font-bold text-green-700">Total General USD:</span>
                                                <span className="font-bold">{c.totalGeneralUsd}</span>
                                            </div>
                                            <div className="flex justify-between"><span className="font-medium">Diferencia USD:</span> {c.diferenciaUsd}</div>
                                            {(c.faltanteUsd ?? 0) > 0 && (
                                                <div className="flex justify-between"><span className="font-medium text-red-600">Faltante USD:</span> <span className="text-red-600">{c.faltanteUsd}</span></div>
                                            )}
                                            {(c.sobranteUsd ?? 0) > 0 && (
                                                <div className="flex justify-between"><span className="font-medium text-green-600">Sobrante USD:</span> <span className="text-green-600">{c.sobranteUsd}</span></div>
                                            )}
                                        </div>
                                        <Button
                                            variant="destructive"
                                            className="mt-2"
                                            disabled={c.delete || !usuario?.permisos.includes("eliminar_cuadres")}
                                            onClick={() => deleteCuadreCaja(farmacia, c.dia, c.cajaNumero)}
                                        >
                                            {c.delete ? "Eliminado" : "Eliminar"}
                                        </Button>
                                    </CardContent>
                                </Card>
                            ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResumenCuadreFarmacia;