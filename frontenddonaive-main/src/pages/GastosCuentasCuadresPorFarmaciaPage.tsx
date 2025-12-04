import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ListaCuadresFarmacia from "@/components/ListaCuadresFarmacia";
import { useGastos } from "@/hooks/useGastos";
import ListaCuentasPorPagarFarmacia from "@/components/ListaCuentasPorPagarFarmacia";

const GastosCuentasCuadresPorFarmaciaPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<{ id: string; nombre: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Nuevo uso del hook useGastos
  const { gastos, loading, error: errorGastos, fetchGastos } = useGastos(selectedFarmacia?.id);

  // Filtros locales para cada card
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  // Estado para expandir/colapsar cada card
  const [openCards, setOpenCards] = useState({ gastos: true, cuentas: true, cuadres: true });
  const toggleCard = (key: keyof typeof openCards) => {
    setOpenCards(prev => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    // Obtener farmacias del usuario en localStorage
    try {
      const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
      if (usuario && usuario.farmacias) {
        // Si farmacias es un objeto tipo {id: nombre, ...}
        if (typeof usuario.farmacias === "object" && !Array.isArray(usuario.farmacias)) {
          const farmaciasArr = Object.entries(usuario.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
          setFarmacias(farmaciasArr);
        } else if (Array.isArray(usuario.farmacias) && typeof usuario.farmacias[0] === "string") {
          setFarmacias(usuario.farmacias.map((id: string) => ({ id, nombre: id })));
        } else {
          setFarmacias(usuario.farmacias);
        }
      } else {
        setFarmacias([]);
      }
    } catch (e) {
      setError("No se pudo obtener farmacias del usuario");
    }
  }, []);

  // Cuando selecciona una farmacia, puedes cargar gastos si lo deseas
  useEffect(() => {
    if (selectedFarmacia) {
      fetchGastos && fetchGastos(selectedFarmacia.id);
    }
  }, [selectedFarmacia, fetchGastos]);

  // Chip visual reutilizable para estado
  const EstadoChip: React.FC<{ estado: string }> = ({ estado }) => {
    let color = "bg-gray-200 text-gray-700";
    let label = estado;
    switch (estado) {
      case "wait":
        color = "bg-yellow-100 text-yellow-700 border border-yellow-400";
        label = "Pendiente";
        break;
      case "verified":
        color = "bg-green-100 text-green-700 border border-green-400";
        label = "Verificado";
        break;
      case "denied":
        color = "bg-red-100 text-red-700 border border-red-400";
        label = "Rechazado";
        break;
      default:
        color = "bg-gray-200 text-gray-700";
        label = estado;
    }
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>{label}</span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-200 p-6">
      <div className="max-w-5xl mx-auto">
        {/* Título principal del módulo */}
        <h1 className="text-4xl font-extrabold text-blue-900 mb-10 text-center drop-shadow">
          Resumen de Gestión de Finanzas
        </h1>
        {error && <div className="text-red-600 mb-4 text-center font-semibold">{error}</div>}
        <div className="flex flex-wrap gap-4 justify-center mb-10">
          {farmacias.map(farm => (
            <Button
              key={farm.id}
              onClick={() => setSelectedFarmacia(farm)}
              className={`px-7 py-3 rounded-xl font-bold shadow-lg transition-all duration-200 border-2 ${selectedFarmacia?.id === farm.id ? 'bg-blue-700 text-white border-blue-700 scale-105' : 'bg-white text-blue-800 border-blue-200 hover:bg-blue-100'}`}
            >
              {farm.nombre}
            </Button>
          ))}
        </div>
        {/* Filtros de fecha globales */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8 justify-center items-end">
          <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
            {/* Chips de filtro rápido */}
            <button
              type="button"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 hover:bg-blue-200 text-blue-900 border border-blue-200 transition"
              onClick={() => {
                const today = new Date();
                const prev = new Date(today);
                prev.setDate(today.getDate() - 1);
                setFechaInicio(prev.toISOString().slice(0, 10));
                setFechaFin(prev.toISOString().slice(0, 10));
              }}
            >Día anterior</button>
            <button
              type="button"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 hover:bg-blue-200 text-blue-900 border border-blue-200 transition"
              onClick={() => {
                const today = new Date();
                setFechaInicio(today.toISOString().slice(0, 10));
                setFechaFin(today.toISOString().slice(0, 10));
              }}
            >Hoy</button>
            <button
              type="button"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 hover:bg-blue-200 text-blue-900 border border-blue-200 transition"
              onClick={() => {
                // Semana: lunes de esta semana hasta hoy
                const now = new Date();
                const day = now.getDay(); // 0 (domingo) - 6 (sábado)
                const diff = (day === 0 ? 6 : day - 1); // lunes = 0
                const monday = new Date(now);
                monday.setDate(now.getDate() - diff);
                setFechaInicio(monday.toISOString().slice(0, 10));
                setFechaFin(now.toISOString().slice(0, 10));
              }}
            >Semana</button>
            <button
              type="button"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 hover:bg-blue-200 text-blue-900 border border-blue-200 transition"
              onClick={() => {
                // Quincena: 1-15 o 16-fin de mes según el día actual
                const now = new Date();
                const year = now.getFullYear();
                const month = now.getMonth();
                let start, end;
                if (now.getDate() <= 15) {
                  start = new Date(year, month, 1);
                  end = new Date(year, month, 15);
                } else {
                  start = new Date(year, month, 16);
                  end = new Date(year, month + 1, 0); // último día del mes
                }
                setFechaInicio(start.toISOString().slice(0, 10));
                setFechaFin(end.toISOString().slice(0, 10));
              }}
            >Quincena</button>
            <button
              type="button"
              className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-200 hover:bg-blue-200 text-blue-900 border border-blue-200 transition"
              onClick={() => {
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setFechaInicio(firstDay.toISOString().slice(0, 10));
                setFechaFin(lastDay.toISOString().slice(0, 10));
              }}
            >Este mes</button>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-slate-700 mb-1">Fecha desde</label>
            <input
              type="date"
              className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              max={fechaFin || undefined}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-semibold text-slate-700 mb-1">Fecha hasta</label>
            <input
              type="date"
              className="border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              min={fechaInicio || undefined}
            />
          </div>
        </div>
        {selectedFarmacia && (
          <div className="space-y-10">
            {/* Card Gastos */}
            <Card className="p-0 shadow-2xl border-2 border-blue-200">
              <button
                className="w-full flex items-center justify-between px-8 py-5 bg-blue-100 hover:bg-blue-200 transition rounded-t-lg focus:outline-none"
                onClick={() => toggleCard('gastos')}
                type="button"
              >
                <h2 className="text-2xl font-extrabold text-blue-900 tracking-wide">Gastos</h2>
                <span className="text-xl">{openCards.gastos ? '▲' : '▼'}</span>
              </button>
              <div
                className={
                  openCards.gastos
                    ? "bg-blue-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-100 max-h-[400px] overflow-auto"
                    : "bg-blue-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-0 max-h-0 overflow-hidden"
                }
                style={{ pointerEvents: openCards.gastos ? 'auto' : 'none' }}
              >
                {loading ? (
                  <div className="text-blue-700 font-semibold">Cargando gastos...</div>
                ) : errorGastos ? (
                  <div className="text-red-600 font-semibold">{String(errorGastos)}</div>
                ) : gastos && gastos.length > 0 ? (
                  <ul className="divide-y divide-blue-200">
                    {gastos
                      .filter((g: any) => {
                        if (fechaInicio && g.fecha < fechaInicio) return false;
                        if (fechaFin && g.fecha > fechaFin) return false;
                        return true;
                      })
                      .map((g: any) => {
                        // Usar g.divisa en vez de g.moneda
                        const esUSD = g.divisa === 'USD';
                        const montoBs = esUSD ? (g.monto * (g.tasa || 1)) : g.monto;
                        return (
                          <li key={g._id} className="py-2 flex flex-col sm:flex-row sm:items-center gap-2">
                            <span className="font-semibold text-blue-900">{g.titulo}</span>
                            {esUSD ? (
                              <>
                                <span className="text-blue-700">$ {g.monto.toFixed(2)} USD</span>
                                <span className="text-blue-700">/ Bs {montoBs.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-blue-700">Bs {g.monto}</span>
                            )}
                            <span className="text-xs text-slate-500">{g.fecha}</span>
                            <span className="text-xs text-slate-500">Divisa: {g.divisa || 'Bs'}</span>
                            {g.tasa && (
                              <span className="text-xs text-slate-500">Tasa: {g.tasa}</span>
                            )}
                            <EstadoChip estado={g.estado} />
                          </li>
                        );
                      })}
                  </ul>
                ) : (
                  <div className="text-slate-500 text-center bg-yellow-100 border border-yellow-300 rounded-lg py-4 px-2 font-semibold shadow">No hay gastos registrados para los filtros seleccionados.</div>
                )}
              </div>
            </Card>
            {/* Card Cuentas por Pagar */}
            <Card className="p-0 shadow-2xl border-2 border-green-200">
              <button
                className="w-full flex items-center justify-between px-8 py-5 bg-green-100 hover:bg-green-200 transition rounded-t-lg focus:outline-none"
                onClick={() => toggleCard('cuentas')}
                type="button"
              >
                <h2 className="text-2xl font-extrabold text-green-900 tracking-wide">Cuentas por Pagar</h2>
                <span className="text-xl">{openCards.cuentas ? '▲' : '▼'}</span>
              </button>
              <div
                className={
                  openCards.cuentas
                    ? "bg-green-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-100 max-h-[400px] overflow-auto"
                    : "bg-green-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-0 max-h-0 overflow-hidden"
                }
                style={{ pointerEvents: openCards.cuentas ? 'auto' : 'none' }}
              >
                <ListaCuentasPorPagarFarmacia 
                  farmaciaId={selectedFarmacia.id} 
                  fechaInicio={fechaInicio} 
                  fechaFin={fechaFin} 
                />
              </div>
            </Card>
            {/* Card Cuadres */}
            <Card className="p-0 shadow-2xl border-2 border-indigo-200">
              <button
                className="w-full flex items-center justify-between px-8 py-5 bg-indigo-100 hover:bg-indigo-200 transition rounded-t-lg focus:outline-none"
                onClick={() => toggleCard('cuadres')}
                type="button"
              >
                <h2 className="text-2xl font-extrabold text-indigo-900 tracking-wide">Cuadres</h2>
                <span className="text-xl">{openCards.cuadres ? '▲' : '▼'}</span>
              </button>
              <div
                className={
                  openCards.cuadres
                    ? "bg-indigo-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-100 max-h-[400px] overflow-auto"
                    : "bg-indigo-50 rounded-b-lg p-4 min-h-[60px] transition-all duration-300 opacity-0 max-h-0 overflow-hidden"
                }
                style={{ pointerEvents: openCards.cuadres ? 'auto' : 'none' }}
              >
                <ListaCuadresFarmacia farmaciaId={selectedFarmacia.id} fechaInicio={fechaInicio} fechaFin={fechaFin} />
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default GastosCuentasCuadresPorFarmaciaPage;
