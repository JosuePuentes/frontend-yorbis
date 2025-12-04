import React, { useEffect, useState } from "react";
import ResumeCardFarmacia from "@/components/ResumeCardFarmacia";

type VentasFarmacia = {
  totalVentas: number;
  totalBs: number;
  totalBsEnUsd: number;
  totalUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  faltantes: number;
  sobrantes: number;
  totalGeneralSinRecargas: number; // Mantener
  valesUsd: number; // Agregar vales en USD
};

function isInRange(dia: string, inicio: string, fin: string) {
  // dia, inicio, fin en formato YYYY-MM-DD
  return (!inicio || dia >= inicio) && (!fin || dia <= fin);
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ResumenFarmaciasPorDia: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [detallesVisibles, setDetallesVisibles] = useState<{ [key: string]: boolean }>({});
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<{ [key: string]: any[] }>({});

  useEffect(() => {
    const fetchFarmacias = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        if (!res.ok) throw new Error("Error al obtener farmacias");
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchFarmacias();
  }, []);

  useEffect(() => {
    const fetchAllCuadres = async () => {
      setLoading(true);
      try {
        const result: { [key: string]: any[] } = {};
        await Promise.all(
          farmacias.map(async (farm) => {
            const res = await fetch(`${API_BASE_URL}/cuadres/${farm.id}`);
            const data = await res.json();
            result[farm.id] = data;
          })
        );
        setCuadresPorFarmacia(result);
      } catch (err) {
        setError("Error al cargar cuadres");
      } finally {
        setLoading(false);
      }
    };
    if (farmacias.length > 0) fetchAllCuadres();
  }, [farmacias]);

  useEffect(() => {
    // Calcular ventas a partir de cuadresPorFarmacia y rango de fechas
    const ventasPorFarmacia: { [key: string]: VentasFarmacia } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalBs = 0;
      let totalUsd = 0;
      let totalGeneral = 0;
      let totalGeneralSinRecargas = 0; // Nuevo campo
      let efectivoUsd = 0;
      let zelleUsd = 0;
      let faltantes = 0;
      let sobrantes = 0;
      let valesUsd = 0; // Inicializar vales en USD
      data.forEach((c: any) => {
        if (!c.dia || c.estado !== "verified") return;
        if (!isInRange(c.dia, fechaInicio, fechaFin)) return;
        let sumaBs = Number(c.recargaBs || 0) + Number(c.pagomovilBs || 0) + Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0), 0);
        }
        sumaBs -= Number(c.devolucionesBs || 0);
        totalBs += sumaBs;
        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        totalUsd += sumaUsd;
        efectivoUsd += Number(c.efectivoUsd || 0);
        zelleUsd += Number(c.zelleUsd || 0);
        valesUsd += Number(c.valesUsd || 0); // Sumar vales en USD
        const tasa = Number(c.tasa || 0);
        if (tasa > 0) {
          totalGeneral += sumaUsd + (sumaBs / tasa);
          totalGeneralSinRecargas += sumaUsd + ((sumaBs - Number(c.recargaBs || 0)) / tasa); // Excluir recargas
        } else {
          totalGeneral += sumaUsd;
          totalGeneralSinRecargas += sumaUsd; // Excluir recargas
        }
        faltantes += Number(c.faltanteUsd || 0);
        sobrantes += Number(c.sobranteUsd || 0);
      });
      ventasPorFarmacia[farm.id] = {
        totalVentas: Number(totalGeneral.toFixed(2)),
        totalBs: Number(totalBs.toFixed(2)),
        totalBsEnUsd: 0,
        totalUsd: Number(totalUsd.toFixed(2)),
        efectivoUsd: Number(efectivoUsd.toFixed(2)),
        zelleUsd: Number(zelleUsd.toFixed(2)),
        faltantes: Number(faltantes.toFixed(2)),
        sobrantes: Number(sobrantes.toFixed(2)),
        totalGeneralSinRecargas: Number(totalGeneralSinRecargas.toFixed(2)), // Añadir al estado
        valesUsd: Number(valesUsd.toFixed(2)), // Agregar vales en USD al objeto de ventas
      };
    });
    setVentas(ventasPorFarmacia);
  }, [cuadresPorFarmacia, farmacias, fechaInicio, fechaFin]); // Actualizar dependencias

  const sortedFarmacias = [...farmacias].sort((a, b) => {
    const ventasA = ventas[a.id]?.totalVentas || 0;
    const ventasB = ventas[b.id]?.totalVentas || 0;
    return ventasB - ventasA;
  });

  const calcularDetalles = (farmId: string) => {
    const ventasFarm = ventas[farmId];
    if (!ventasFarm) return null;
    const cuadresFarmacia = cuadresPorFarmacia[farmId] || [];
    let sumaRecargaBs = 0, sumaPagomovilBs = 0, sumaEfectivoBs = 0, sumaPuntoDebito = 0, sumaPuntoCredito = 0, sumaDevolucionesBs = 0;
    if (cuadresFarmacia.length) {
      cuadresFarmacia.forEach((c: any) => {
        if (!c.dia || c.estado !== "verified") return;
        if (!isInRange(c.dia, fechaInicio, fechaFin)) return;
        sumaRecargaBs += Number(c.recargaBs || 0);
        sumaPagomovilBs += Number(c.pagomovilBs || 0);
        sumaEfectivoBs += Number(c.efectivoBs || 0);
        sumaDevolucionesBs += Number(c.devolucionesBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaPuntoDebito += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoDebito || 0), 0);
          sumaPuntoCredito += c.puntosVenta.reduce((acc: number, pv: any) => acc + Number(pv.puntoCredito || 0), 0);
        }
      });
    }
    return (
      <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2 text-sm">
        <div><b>Total Bs:</b> {ventasFarm.totalBs}</div>
        <div><b>Total USD:</b> {ventasFarm.totalUsd}</div>
        <div><b>Total General sin Recargas:</b> {ventasFarm.totalGeneralSinRecargas}</div> {/* Mostrar nuevo total */}
        <div><b>Efectivo USD:</b> {ventasFarm.efectivoUsd}</div>
        <div><b>Zelle USD:</b> {ventasFarm.zelleUsd}</div>
        <div><b>Faltantes USD:</b> {ventasFarm.faltantes}</div>
        <div><b>Sobrantes USD:</b> {ventasFarm.sobrantes}</div>
        <hr className="my-2" />
        <div><b>Recarga Bs:</b> {sumaRecargaBs}</div>
        <div><b>Pago Móvil Bs:</b> {sumaPagomovilBs}</div>
        <div><b>Efectivo Bs:</b> {sumaEfectivoBs}</div>
        <div><b>Punto de Venta Débito Bs:</b> {sumaPuntoDebito}</div>
        <div><b>Punto de Venta Crédito Bs:</b> {sumaPuntoCredito}</div>
        <div><b>Devoluciones Bs:</b> {sumaDevolucionesBs}</div>
      </div>
    );
  };

  // Helpers para fechas rápidas
  const setHoy = () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    const fecha = `${yyyy}-${mm}-${dd}`;
    setFechaInicio(fecha);
    setFechaFin(fecha);
  };

  const setAyer = () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const yyyy = ayer.getFullYear();
    const mm = String(ayer.getMonth() + 1).padStart(2, "0");
    const dd = String(ayer.getDate()).padStart(2, "0");
    const fecha = `${yyyy}-${mm}-${dd}`;
    setFechaInicio(fecha);
    setFechaFin(fecha);
  };

  const setSemanaActual = () => {
    // Siempre usar la fecha de hoy como referencia para la semana actual
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const yyyyInicio = monday.getFullYear();
    const mmInicio = String(monday.getMonth() + 1).padStart(2, "0");
    const ddInicio = String(monday.getDate()).padStart(2, "0");
    const yyyyFin = sunday.getFullYear();
    const mmFin = String(sunday.getMonth() + 1).padStart(2, "0");
    const ddFin = String(sunday.getDate()).padStart(2, "0");
    setFechaInicio(`${yyyyInicio}-${mmInicio}-${ddInicio}`);
    setFechaFin(`${yyyyFin}-${mmFin}-${ddFin}`);
  };

  if (loading) return <div className="text-center py-10">Cargando...</div>;
  if (error) return <div className="text-center text-red-600 py-10">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-blue-900 mb-2">Resumen de Ventas por dias</h1>
            <p className="text-gray-600">Consulta el resumen de ventas en un rango de días.</p>
          </div>
          <div className="mt-4 md:mt-0 flex gap-2 items-end flex-col">
            <div className="flex flex-col md:flex-row gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fechaInicio">
                  Desde:
                </label>
                <input
                  id="fechaInicio"
                  type="date"
                  value={fechaInicio}
                  onChange={e => setFechaInicio(e.target.value)}
                  className="border rounded p-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="fechaFin">
                  Hasta:
                </label>
                <input
                  id="fechaFin"
                  type="date"
                  value={fechaFin}
                  onChange={e => setFechaFin(e.target.value)}
                  className="border rounded p-2"
                />
              </div>
            </div>
            {/* Botones de fechas rápidas */}
            <div className="flex flex-row gap-1 ml-2">
              <button
                type="button"
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200"
                onClick={setHoy}
              >
                Hoy
              </button>
              <button
                type="button"
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200"
                onClick={setAyer}
              >
                Ayer
              </button>
              <button
                type="button"
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs hover:bg-blue-200"
                onClick={setSemanaActual}
              >
                1 Semana
              </button>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {sortedFarmacias.map((farm, idx) => (
            <div key={farm.id}>
              <ResumeCardFarmacia
                nombre={farm.nombre}
                totalVentas={ventas[farm.id]?.totalVentas || 0}
                totalBs={ventas[farm.id]?.totalBs || 0}
                totalUsd={ventas[farm.id]?.totalUsd || 0}
                efectivoUsd={ventas[farm.id]?.efectivoUsd || 0}
                zelleUsd={ventas[farm.id]?.zelleUsd || 0}
                faltantes={ventas[farm.id]?.faltantes || 0}
                sobrantes={ventas[farm.id]?.sobrantes || 0}
                totalGeneralSinRecargas={ventas[farm.id]?.totalGeneralSinRecargas || 0}
                valesUsd={ventas[farm.id]?.valesUsd || 0}
                top={idx < 3}
                localidadId={farm.id}
                fechaInicio={fechaInicio}
                fechaFin={fechaFin}
              />
              <button
                className="mt-2 text-blue-700 underline text-sm"
                onClick={() => setDetallesVisibles(v => ({ ...v, [farm.id]: !v[farm.id] }))
                }
              >
                {detallesVisibles && detallesVisibles[farm.id] ? "Ocultar detalles" : "Ver detalles"}
              </button>
              {detallesVisibles && detallesVisibles[farm.id] ? calcularDetalles(farm.id) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResumenFarmaciasPorDia;
