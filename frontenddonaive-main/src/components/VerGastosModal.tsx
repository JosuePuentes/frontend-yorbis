import React, { useEffect, useState } from "react";
import ImageDisplay from "./upfile/ImageDisplay";

interface VerGastosModalProps {
  open: boolean;
  onClose: () => void;
  farmaciaId: string;
  farmaciaNombre: string;
}

interface Gasto {
  _id: string;
  titulo: string;
  descripcion: string;
  monto: number;
  fecha: string | Date;
  fechaRegistro?: string | Date; // <-- Nueva fecha de registro
  estado: string;
  divisa?: string;
  tasa?: number;
  imagenGasto?: string;
  imagenesGasto?: string[];
}

const VerGastosModal: React.FC<VerGastosModalProps> = ({ open, onClose, farmaciaId, farmaciaNombre }) => {
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open) {
      const fetchGastos = async () => {
        setLoading(true);
        try {
          // Traer todos los gastos de la farmacia (sin filtrar por estado en la API)
          const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos?localidad=${farmaciaId}`);
          if (!res.ok) {
            throw new Error("Error al obtener los gastos");
          }
          const data = await res.json();
          // Filtrar en frontend: solo mostrar los que NO son denied NI verified
          const pendientes = data.filter((g: Gasto) => g.estado !== "denied" && g.estado !== "verified");
          setGastos(pendientes);
        } catch (error) {
          console.error("Error al obtener los gastos:", error);
        } finally {
          setLoading(false);
        }
      };
      fetchGastos();
    }
  }, [open, farmaciaId]);

  const handleDeny = async (gastoId: string) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: gastoId, estado: "denied" }) // gastoId ahora es _id
      });

      if (!res.ok) {
        throw new Error("Error al denegar el gasto");
      }

      alert("Gasto denegado exitosamente");
      setGastos(gastos.filter(gasto => gasto._id !== gastoId)); // Usar _id
    } catch (error) {
      console.error("Error al denegar el gasto:", error);
      alert("Hubo un error al denegar el gasto");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-80 flex items-center justify-center z-50 px-2 sm:px-0">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl p-4 sm:p-6 relative max-h-[90vh] flex flex-col">
        <h2 className="text-lg sm:text-xl font-bold mb-4 text-center">Gastos pendientes de {farmaciaNombre}</h2>
        <button
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-2xl sm:text-3xl text-gray-500 hover:text-gray-700"
          onClick={onClose}
        >
          &times;
        </button>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="text-center text-gray-500">Cargando cuadres...</div>
          ) : gastos.length === 0 ? (
            <div className="text-center text-gray-500">No hay cuadres pendientes para esta farmacia.</div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {gastos.map(gasto => {
                // Calcular monto en USD
                let montoUsd = gasto.monto;
                if (gasto.divisa === "Bs" && gasto.tasa && gasto.tasa > 0) {
                  montoUsd = gasto.monto / gasto.tasa;
                }
                // Formatear fecha del usuario
                let fechaStr = "";
                if (gasto.fecha instanceof Date) {
                  fechaStr = gasto.fecha.toLocaleDateString();
                } else if (typeof gasto.fecha === "string") {
                  const d = new Date(gasto.fecha);
                  fechaStr = d.toLocaleDateString();
                }
                // Formatear fecha de registro
                let fechaRegistroStr = "";
                if (gasto.fechaRegistro instanceof Date) {
                  fechaRegistroStr = gasto.fechaRegistro.toLocaleDateString();
                } else if (typeof gasto.fechaRegistro === "string" && gasto.fechaRegistro) {
                  const d = new Date(gasto.fechaRegistro);
                  fechaRegistroStr = d.toLocaleDateString();
                }
                return (
                  <li key={gasto._id} className="py-3 sm:py-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                      <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-800">{gasto.titulo}</h3>
                        <p className="text-xs sm:text-sm text-gray-600">{gasto.descripcion}</p>
                        <p className="text-xs sm:text-sm text-gray-600">Fecha del usuario: {fechaStr}</p>
                        {fechaRegistroStr && (
                          <p className="text-xs sm:text-sm text-gray-600">Fecha de registro: {fechaRegistroStr}</p>
                        )}
                        <p className="text-xs sm:text-sm text-gray-600">Estado: {(() => {
                          switch (gasto.estado) {
                            case 'wait': return 'Pendiente';
                            case 'verified': return 'Verificado';
                            case 'denied': return 'Denegado';
                            default: return gasto.estado;
                          }
                        })()}</p>
                        {gasto.divisa === "Bs" ? (
                          <>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Monto: <span className="font-bold">{gasto.monto.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</span>
                              {gasto.tasa && gasto.tasa > 0 && (
                                <span className="ml-2 text-gray-500">(Tasa: {gasto.tasa})</span>
                              )}
                            </p>
                            <p className="text-xs sm:text-sm text-gray-600">
                              Monto en USD: <span className="font-bold text-green-700">{montoUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                            </p>
                          </>
                        ) : (
                          <p className="text-xs sm:text-sm text-gray-600">
                            Monto: <span className="font-bold text-green-700">{gasto.monto.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD</span>
                          </p>
                        )}
                        {/* Mostrar imágenes si existen */}
                        {Array.isArray(gasto.imagenesGasto) && gasto.imagenesGasto.length > 0 && (
                          <div className="flex gap-2 mt-2 flex-wrap">
                            {gasto.imagenesGasto.map((img, idx) => (
                              <ImageDisplay key={img + idx} imageName={img} style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                            ))}
                          </div>
                        )}
                        {gasto.imagenGasto && (!gasto.imagenesGasto || gasto.imagenesGasto.length === 0) && (
                          <div className="mt-2">
                            <ImageDisplay imageName={gasto.imagenGasto} style={{ maxWidth: 120, maxHeight: 120, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                          </div>
                        )}
                      </div>
                      <div className="text-right mt-2 sm:mt-0">
                        <button
                          className="text-xs sm:text-sm font-medium text-red-600 hover:underline"
                          onClick={() => handleDeny(gasto._id)}
                        >
                          Denegar
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerGastosModal;
