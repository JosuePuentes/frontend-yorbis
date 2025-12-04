import React, { useEffect, useState, useRef } from "react";
import { animate } from 'animejs';
import { getCurrencyCode } from "@/lib/utils";

interface PagoCPP {
  _id: string;
  fecha: string;
  hora?: string;
  moneda: string;
  monto: number;
  referencia: string;
  usuario: string;
  bancoEmisor: string;
  bancoReceptor: string;
  tasa?: number;
  imagenPago?: string;
  farmaciaId: string;
  estado: string;
  cuentaPorPagarId: string;
  fechaRegistro?: string;
  horaRegistro?: string;
}

const VisualizarPagosCPPPage: React.FC = () => {
  const [pagos, setPagos] = useState<PagoCPP[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rowRefs = useRef<(HTMLTableRowElement | null)[]>([]);

  // Animación: resalta la fila cuando cambia el estado
  const animateRow = (idx: number) => {
    if (rowRefs.current[idx]) {
      animate(rowRefs.current[idx], {
        backgroundColor: [
          '#fef9c3', // amarillo claro
          '#ffffff'  // blanco
        ],
        duration: 900,
        easing: 'outBounce',
      });
    }
  };

  useEffect(() => {
    const fetchPagos = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No se encontró el token de autenticación");
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/pagoscpp/all`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Error al obtener pagos");
        const data = await res.json();
        setPagos(data);
      } catch (err: any) {
        setError(err.message || "Error al obtener pagos");
      } finally {
        setLoading(false);
      }
    };
    fetchPagos();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-slate-800 mb-8 text-center">Pagos Cuentas por Pagar</h1>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay pagos registrados</h3>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Monto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Moneda</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Referencia</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Usuario</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Banco Emisor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Banco Receptor</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Cuenta por Pagar</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {pagos.map((p, idx) => (
                  <tr
                    key={p._id}
                    ref={el => { rowRefs.current[idx] = el; }}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.fecha}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.hora || '-'}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-bold text-indigo-700">
                      {typeof p.monto === "number"
                        ? p.monto.toLocaleString('es-VE', {
                            style: 'currency',
                            currency: typeof getCurrencyCode(p.moneda) === "string" ? getCurrencyCode(p.moneda) : "USD"
                          })
                        : "-"
                      }
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.moneda}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.referencia}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.usuario}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.bancoEmisor}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.bancoReceptor}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.estado}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">{p.cuentaPorPagarId}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <select
                        className="border rounded px-2 py-1 text-xs"
                        value={p.estado}
                        onChange={async (e) => {
                          const nuevoEstado = e.target.value;
                          try {
                            const token = localStorage.getItem("access_token");
                            if (!token) throw new Error("No se encontró el token de autenticación");
                            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/pagoscpp/${p._id}/estado`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                              },
                              body: JSON.stringify({ estado: nuevoEstado })
                            });
                            if (!res.ok) throw new Error("Error al actualizar estado");
                            setPagos((prev) => prev.map((pg, i) => {
                              if (pg._id === p._id) {
                                animateRow(i);
                                return { ...pg, estado: nuevoEstado };
                              }
                              return pg;
                            }));
                          } catch (err) {
                            alert("Error al actualizar estado del pago");
                          }
                        }}
                      >
                        <option value="pendiente">Pendiente</option>
                        <option value="aprobado">Aprobado</option>
                        <option value="rechazado">Rechazado</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizarPagosCPPPage;
