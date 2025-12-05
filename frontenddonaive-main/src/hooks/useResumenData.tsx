import { useState, useEffect, useMemo, useCallback } from "react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface PagoCPP {
  _id?: string;
  farmaciaId: string;
  montoDePago?: number;
  monedaDePago?: "USD" | "Bs";
  estado?: string; // "pagada", "abonada", etc.
  cuentaPorPagarId?: string;
  estatus?: string; // "activo", "inactivo", etc.
  tasaDePago?: number; // Tasa al momento del pago

  // Agrega otros campos que necesites del pago
}

type VentasFarmacia = {
  totalVentas: number;
  totalBs: number;
  totalUsd: number;
  efectivoUsd: number;
  zelleUsd: number;
  faltantes: number;
  sobrantes: number;
  totalGeneralSinRecargas: number;
  valesUsd: number;
  totalCosto: number;
  // Nuevos campos de ventas del punto de venta
  desgloseBs?: {
    pago_movil: number;
    efectivo: number;
    tarjeta_debit: number;
    tarjeta_credito: number;
    recargas: number;
    devoluciones: number;
  };
};

interface PuntoVenta {
  puntoDebito?: number;
  puntoCredito?: number;
}

interface Cuadre {
  dia: string;
  estado: "verified" | "wait" | "denied";
  recargaBs?: number;
  pagomovilBs?: number;
  efectivoBs?: number;
  puntosVenta?: PuntoVenta[];
  efectivoUsd?: number;
  zelleUsd?: number;
  tasa?: number;
  faltanteUsd?: number;
  sobranteUsd?: number;
  valesUsd?: number;
  devolucionesBs?: number;
  costo?: number | string;
}

interface InventarioItem {
  farmacia: string;
  costo?: number | string;
}

interface Gasto {
  localidad: string; // ID de la farmacia
  estado: "verified" | "pending";
  fecha: string;
  divisa: "Bs" | "USD";
  tasa?: number | string;
  monto: number | string;
}

interface CuentaPorPagar {
  farmacia: string; // ID de la farmacia
  estatus: "activa" | "pagada";
  fechaEmision: string;
  montoUsd: number;
}

export function useResumenData() {
  const [pagos, setPagos] = useState<PagoCPP[]>([]); // <-- NUEVO ESTADO PARA PAGOS
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>(
    []
  );
  const [ventas, setVentas] = useState<{ [key: string]: VentasFarmacia }>({});
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<{
    [key: string]: Cuadre[];
  }>({});
  const [inventariosFarmacia, setInventariosFarmacia] = useState<{
    [key: string]: number;
  }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [detallesVisibles, setDetallesVisibles] = useState<{
    [key: string]: boolean;
  }>({});
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [cuentasPorPagar, setCuentasPorPagar] = useState<CuentaPorPagar[]>([]);
  const [ventasPuntoVenta, setVentasPuntoVenta] = useState<{
    [key: string]: {
      total_efectivo_usd: number;
      total_zelle_usd: number;
      total_usd_recibido: number;
      total_vales_usd: number;
      total_bs: number;
      desglose_bs: {
        pago_movil: number;
        efectivo: number;
        tarjeta_debit: number;
        tarjeta_credito: number;
        recargas: number;
        devoluciones: number;
      };
      total_costo_inventario: number;
      total_ventas: number;
    };
  }>({});

  const setDateRange = useCallback((start: Date, end: Date) => {
    const formatDate = (date: Date) => date.toISOString().split("T")[0];
    setFechaInicio(formatDate(start));
    setFechaFin(formatDate(end));
  }, []);

  const setHoy = useCallback(() => {
    const hoy = new Date();
    setDateRange(hoy, hoy);
  }, [setDateRange]);

  const setAyer = useCallback(() => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    setDateRange(ayer, ayer);
  }, [setDateRange]);

  const setSemanaActual = useCallback(() => {
    const today = new Date();
    const day = today.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(new Date().setDate(today.getDate() + diffToMonday));
    const sunday = new Date(new Date().setDate(monday.getDate() + 6));
    setDateRange(monday, sunday);
  }, [setDateRange]);

  const setQuincenaActual = useCallback(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth();
    let startDay: Date, endDay: Date;
    if (today.getDate() < 16) {
      startDay = new Date(year, month, 1);
      endDay = new Date(year, month, 15);
    } else {
      startDay = new Date(year, month, 16);
      endDay = new Date(year, month + 1, 0);
    }
    setDateRange(startDay, endDay);
  }, [setDateRange]);

  const setMesActual = useCallback(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateRange(firstDay, lastDay);
  }, [setDateRange]);

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = localStorage.getItem("access_token");
        const headers: HeadersInit = {};
        if (token) {
          // Y añadimos la propiedad solo si el token existe
          headers.Authorization = `Bearer ${token}`;
        }

        const resFarmacias = await fetch(`${API_BASE_URL}/farmacias`, {
          headers,
        });
        if (!resFarmacias.ok) throw new Error("Error al obtener farmacias.");
        const dataFarmacias = await resFarmacias.json();
        const listaFarmacias = dataFarmacias.farmacias
          ? Object.entries(dataFarmacias.farmacias).map(([id, nombre]) => ({
              id,
              nombre: String(nombre),
            }))
          : Object.entries(dataFarmacias).map(([id, nombre]) => ({
              id,
              nombre: String(nombre),
            }));
        setFarmacias(listaFarmacias);

        const resultCuadres: { [key: string]: Cuadre[] } = {};
        const cuadrePromises = listaFarmacias.map(async (farm) => {
          try {
            const resCuadres = await fetch(
              `${API_BASE_URL}/cuadres/${farm.id}`,
              { headers }
            );
            if (!resCuadres.ok) return { farmId: farm.id, data: [] };
            const data = await resCuadres.json();
            return { farmId: farm.id, data };
          } catch (err) {
            return { farmId: farm.id, data: [] };
          }
        });
        const settledResults = await Promise.allSettled(cuadrePromises);
        settledResults.forEach((settledResult) => {
          if (settledResult.status === "fulfilled") {
            resultCuadres[settledResult.value.farmId] =
              settledResult.value.data;
          }
        });
        setCuadresPorFarmacia(resultCuadres);

        let inventariosPorFarmacia: { [key: string]: number } = {};
        const resInventarios = await fetch(`${API_BASE_URL}/inventarios`, {
          headers,
        });
        if (resInventarios.ok) {
          const dataInventarios: InventarioItem[] = await resInventarios.json();
          dataInventarios.forEach((inv) => {
            if (!inv.farmacia) return;
            if (!inventariosPorFarmacia[inv.farmacia])
              inventariosPorFarmacia[inv.farmacia] = 0;
            inventariosPorFarmacia[inv.farmacia] += Number(inv.costo || 0);
          });
        }
        setInventariosFarmacia(inventariosPorFarmacia);

        const resGastos = await fetch(`${API_BASE_URL}/gastos`, { headers });
        if (resGastos.ok) setGastos(await resGastos.json());

        const resCuentas = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
          headers,
        });
        if (resCuentas.ok) setCuentasPorPagar(await resCuentas.json());
      } catch (err: any) {
        setError(err.message || "Error desconocido al cargar datos iniciales.");
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
    setMesActual();
  }, [setMesActual]);

  // Obtener ventas del punto de venta cuando cambien las fechas
  useEffect(() => {
    const fetchVentasPuntoVenta = async () => {
      if (!fechaInicio || !fechaFin) {
        setVentasPuntoVenta({});
        return;
      }
      try {
        const token = localStorage.getItem("access_token");
        const headers: HeadersInit = {};
        if (token) {
          headers.Authorization = `Bearer ${token}`;
        }
        const url = `${API_BASE_URL}/punto-venta/ventas/resumen?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
        const res = await fetch(url, { headers });
        if (res.ok) {
          const data = await res.json();
          setVentasPuntoVenta(data.ventas_por_sucursal || {});
        } else {
          console.error("Error al obtener ventas del punto de venta");
          setVentasPuntoVenta({});
        }
      } catch (error) {
        console.error("Error al obtener ventas del punto de venta:", error);
        setVentasPuntoVenta({});
      }
    };
    fetchVentasPuntoVenta();
  }, [fechaInicio, fechaFin]);

  useEffect(() => {
    const ventasPorFarmacia: { [key: string]: VentasFarmacia } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalBs = 0,
        totalUsd = 0,
        totalGeneral = 0,
        efectivoUsd = 0,
        zelleUsd = 0,
        faltantes = 0,
        sobrantes = 0,
        totalGeneralSinRecargas = 0,
        valesUsd = 0,
        totalCosto = 0;
      data.forEach((c) => {
        if (c.estado !== "verified") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        let sumaBs =
          Number(c.recargaBs || 0) +
          Number(c.pagomovilBs || 0) +
          Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce(
            (acc, pv) =>
              acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0),
            0
          );
        }
        totalBs += sumaBs;
        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        totalUsd += sumaUsd;
        efectivoUsd += Number(c.efectivoUsd || 0);
        zelleUsd += Number(c.zelleUsd || 0);
        const tasa = Number(c.tasa || 0);
        if (tasa > 0) {
          totalGeneral += sumaUsd + sumaBs / tasa;
          totalGeneralSinRecargas +=
            sumaUsd + (sumaBs - Number(c.recargaBs || 0)) / tasa;
        } else {
          totalGeneral += sumaUsd;
          totalGeneralSinRecargas += sumaUsd;
        }
        faltantes += Number(c.faltanteUsd || 0);
        sobrantes += Number(c.sobranteUsd || 0);
        valesUsd += Number(c.valesUsd || 0);
        if (typeof c.costo === "number") {
          totalCosto += c.costo;
        } else if (typeof c.costo === "string" && c.costo !== "") {
          totalCosto += Number(c.costo);
        }
      });
      // Sumar datos de ventas del punto de venta
      const ventasPV = ventasPuntoVenta[farm.id] || {
        total_efectivo_usd: 0,
        total_zelle_usd: 0,
        total_usd_recibido: 0,
        total_vales_usd: 0,
        total_bs: 0,
        desglose_bs: {
          pago_movil: 0,
          efectivo: 0,
          tarjeta_debit: 0,
          tarjeta_credito: 0,
          recargas: 0,
          devoluciones: 0,
        },
        total_costo_inventario: 0,
        total_ventas: 0,
      };

      // Sumar efectivo USD y zelle USD de las ventas del punto de venta
      efectivoUsd += ventasPV.total_efectivo_usd;
      zelleUsd += ventasPV.total_zelle_usd;
      totalUsd += ventasPV.total_usd_recibido;
      valesUsd += ventasPV.total_vales_usd;
      totalBs += ventasPV.total_bs;
      totalCosto += ventasPV.total_costo_inventario;

      // Recalcular totalGeneral y totalGeneralSinRecargas con los nuevos totales
      const tasaPromedio = data.length > 0 
        ? data.reduce((acc, c) => acc + Number(c.tasa || 0), 0) / data.length 
        : 0;
      if (tasaPromedio > 0) {
        totalGeneral = totalUsd + totalBs / tasaPromedio;
        totalGeneralSinRecargas = totalUsd + (totalBs - ventasPV.desglose_bs.recargas) / tasaPromedio;
      } else {
        totalGeneral = totalUsd;
        totalGeneralSinRecargas = totalUsd;
      }

      ventasPorFarmacia[farm.id] = {
        totalVentas: Number(totalGeneral.toFixed(2)),
        totalBs: Number(totalBs.toFixed(2)),
        totalUsd: Number(totalUsd.toFixed(2)),
        efectivoUsd: Number(efectivoUsd.toFixed(2)),
        zelleUsd: Number(zelleUsd.toFixed(2)),
        faltantes: Number(faltantes.toFixed(2)),
        sobrantes: Number(sobrantes.toFixed(2)),
        totalGeneralSinRecargas: Number(totalGeneralSinRecargas.toFixed(2)),
        valesUsd: Number(valesUsd.toFixed(2)),
        totalCosto: Number(totalCosto.toFixed(2)),
        desgloseBs: ventasPV.desglose_bs,
      };
    });
    setVentas(ventasPorFarmacia);
  }, [cuadresPorFarmacia, farmacias, fechaInicio, fechaFin, ventasPuntoVenta]);
  useEffect(() => {
    const fetchPagosPorRango = async () => {
      if (!fechaInicio || !fechaFin) {
        setPagos([]); // Limpia los pagos si no hay fecha
        return;
      }
      try {
        const token = localStorage.getItem("access_token");
        const headers: HeadersInit = {};
        if (token) {
          // Y añadimos la propiedad solo si el token existe
          headers.Authorization = `Bearer ${token}`;
        }
        const url = `${API_BASE_URL}/pagoscpp/rango-fechas?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        const resPagos = await fetch(url, { headers });
        if (resPagos.ok) {
          setPagos(await resPagos.json()); // <-- Actualiza el estado 'pagos'
        } else {
          console.error("Error al obtener los pagos por rango de fecha.");
          setPagos([]);
        }
      } catch (error) {
        console.error("Error en la petición de pagos:", error);
        setPagos([]);
      }
    };

    fetchPagosPorRango();
  }, [fechaInicio, fechaFin]);

  const pendientesPorFarmacia = useMemo(() => {
    const pendientes: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const data = cuadresPorFarmacia[farm.id] || [];
      let totalPendiente = 0;
      
      // Sumar cuadres con estado "wait"
      data.forEach((c) => {
        if (c.estado !== "wait") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        let sumaBs =
          Number(c.recargaBs || 0) +
          Number(c.pagomovilBs || 0) +
          Number(c.efectivoBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaBs += c.puntosVenta.reduce(
            (acc, pv) =>
              acc + Number(pv.puntoDebito || 0) + Number(pv.puntoCredito || 0),
            0
          );
        }
        sumaBs -= Number(c.devolucionesBs || 0);
        const sumaUsd = Number(c.efectivoUsd || 0) + Number(c.zelleUsd || 0);
        const tasa = Number(c.tasa || 0);
        totalPendiente += tasa > 0 ? sumaUsd + sumaBs / tasa : sumaUsd;
      });
      
      // Sumar ventas del punto de venta que no están en cuadres verificados
      // Estas son todas las ventas del período que aún no se han incluido en un cuadre "verified"
      const ventasPV = ventasPuntoVenta[farm.id];
      if (ventasPV) {
        // Obtener el total de ventas verificadas (ya incluidas en cuadres)
        const ventasVerificadas = ventas[farm.id]?.totalVentas || 0;
        
        // Calcular el total de ventas del punto de venta en USD
        const tasaPromedio = data.length > 0 
          ? data.reduce((acc, c) => acc + Number(c.tasa || 0), 0) / data.length 
          : 0;
        const totalVentasPVUsd = tasaPromedio > 0
          ? ventasPV.total_usd_recibido + (ventasPV.total_bs / tasaPromedio)
          : ventasPV.total_usd_recibido;
        
        // El pendiente son las ventas del punto de venta que aún no están verificadas
        // Si hay ventas verificadas, restamos esa parte
        // Si no hay ventas verificadas, todo el total de ventas PV va al pendiente
        if (ventasVerificadas > 0) {
          // Si ya hay ventas verificadas, el pendiente es la diferencia
          // (esto significa que algunas ventas ya están en cuadres verificados)
          totalPendiente += Math.max(0, totalVentasPVUsd - ventasVerificadas);
        } else {
          // Si no hay ventas verificadas, todo el total de ventas PV va al pendiente
          totalPendiente += totalVentasPVUsd;
        }
      }
      
      pendientes[farm.id] = Number(totalPendiente.toFixed(2));
    });
    return pendientes;
  }, [farmacias, cuadresPorFarmacia, fechaInicio, fechaFin, ventasPuntoVenta, ventas]);

  const sortedFarmacias = useMemo(() => {
    if (!farmacias || !Array.isArray(farmacias)) {
      return [];
    }
    return [...farmacias].sort((a, b) => {
      const ventasA = ventas[a.id]?.totalVentas || 0;
      const ventasB = ventas[b.id]?.totalVentas || 0;
      return ventasB - ventasA;
    });
  }, [farmacias, ventas]);

  const calcularDetalles = useCallback(
    (farmId: string) => {
      const cuadresFarmacia = cuadresPorFarmacia[farmId] || [];
      let sumaRecargaBs = 0,
        sumaPagomovilBs = 0,
        sumaEfectivoBs = 0,
        sumaPuntoDebito = 0,
        sumaPuntoCredito = 0,
        sumaDevolucionesBs = 0;
      cuadresFarmacia.forEach((c) => {
        if (c.estado !== "verified") return;
        if (
          (fechaInicio && c.dia < fechaInicio) ||
          (fechaFin && c.dia > fechaFin)
        )
          return;
        sumaRecargaBs += Number(c.recargaBs || 0);
        sumaPagomovilBs += Number(c.pagomovilBs || 0);
        sumaEfectivoBs += Number(c.efectivoBs || 0);
        sumaDevolucionesBs += Number(c.devolucionesBs || 0);
        if (Array.isArray(c.puntosVenta)) {
          sumaPuntoDebito += c.puntosVenta.reduce(
            (acc, pv) => acc + Number(pv.puntoDebito || 0),
            0
          );
          sumaPuntoCredito += c.puntosVenta.reduce(
            (acc, pv) => acc + Number(pv.puntoCredito || 0),
            0
          );
        }
      });
      
      // Sumar datos de ventas del punto de venta
      const ventasPV = ventasPuntoVenta[farmId] || {
        desglose_bs: {
          pago_movil: 0,
          efectivo: 0,
          tarjeta_debit: 0,
          tarjeta_credito: 0,
          recargas: 0,
          devoluciones: 0,
        },
      };
      
      sumaRecargaBs += ventasPV.desglose_bs.recargas;
      sumaPagomovilBs += ventasPV.desglose_bs.pago_movil;
      sumaEfectivoBs += ventasPV.desglose_bs.efectivo;
      sumaPuntoDebito += ventasPV.desglose_bs.tarjeta_debit;
      sumaPuntoCredito += ventasPV.desglose_bs.tarjeta_credito;
      sumaDevolucionesBs += ventasPV.desglose_bs.devoluciones;
      const formatBs = (amount: number) =>
        amount.toLocaleString("es-VE", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " Bs";
      return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mt-4 text-sm shadow-inner animate-fade-in">
          <h4 className="text-md font-bold text-gray-800 mb-3 border-b pb-2">
            Detalles Adicionales del Cuadre
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex justify-between">
              <span>Recarga Bs:</span>
              <span className="font-medium">{formatBs(sumaRecargaBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Pago Móvil Bs:</span>
              <span className="font-medium">{formatBs(sumaPagomovilBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Efectivo Bs:</span>
              <span className="font-medium">{formatBs(sumaEfectivoBs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Punto Débito Bs:</span>
              <span className="font-medium">{formatBs(sumaPuntoDebito)}</span>
            </div>
            <div className="flex justify-between">
              <span>Punto Crédito Bs:</span>
              <span className="font-medium">{formatBs(sumaPuntoCredito)}</span>
            </div>
            <div className="flex justify-between">
              <span>Devoluciones Bs:</span>
              <span className="font-medium text-red-600">
                {formatBs(sumaDevolucionesBs)}
              </span>
            </div>
          </div>
        </div>
      );
    },
    [cuadresPorFarmacia, fechaInicio, fechaFin, ventasPuntoVenta]
  );

  const gastosPorFarmacia = useMemo(() => {
    const resultado: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const gastosFiltrados = gastos.filter(
        (g) =>
          g.localidad === farm.id &&
          g.estado === "verified" &&
          (!fechaInicio || new Date(g.fecha) >= new Date(fechaInicio)) &&
          (!fechaFin || new Date(g.fecha) <= new Date(fechaFin))
      );
      const total = gastosFiltrados.reduce((acc, g) => {
        if (g.divisa === "Bs" && g.tasa && Number(g.tasa) > 0) {
          return acc + Number(g.monto || 0) / Number(g.tasa);
        }
        return acc + Number(g.monto || 0);
      }, 0);
      resultado[farm.id] = Math.max(0, total);
    });
    return resultado;
  }, [gastos, farmacias, fechaInicio, fechaFin]);

  const cuentasActivasPorFarmacia = useMemo(() => {
    const resultado: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const total = cuentasPorPagar
        .filter((c) => c.farmacia === farm.id && c.estatus === "activa")
        .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
      resultado[farm.id] = Math.max(0, total);
    });
    return resultado;
  }, [cuentasPorPagar, farmacias]);

  const MontoFacturadoCuentasPagadasPorFarmacia = useMemo(() => {
    const resultado: { [key: string]: number } = {};
    farmacias.forEach((farm) => {
      const total = cuentasPorPagar
        .filter(
          (c) =>
            c.farmacia === farm.id &&
            c.estatus === "pagada" &&
            (!fechaInicio ||
              new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
            (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
        )
        .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
      resultado[farm.id] = Math.max(0, total);
    });
    return resultado;
  }, [cuentasPorPagar, farmacias, fechaInicio, fechaFin]);

  const totalPagosPorFarmacia = useMemo(() => {
    const resultado: {
      [key: string]: {
        pagosUsd: number;
        pagosBs: number;
        pagosGeneralUsd: number;
        abonosNoLiquidadosEnUsd: number; // <-- CAMBIO DE NOMBRE Y LÓGICA
        abonosNoLiquidadosEnBs: number;
        montoOriginalFacturasUsd: number;
        diferencialPagosUsd: number;
      };
    } = {};

    farmacias.forEach((farm) => {
      let abonosEnUsd = 0;
      let abonosEnBs = 0;
      let pagosUsd = 0;
      let pagosBs = 0;
      let pagosGeneralUsd = 0;
      let montoOriginalFacturasUsd = 0;

      const pagosDeLaFarmacia = pagos.filter((p) => p.farmaciaId === farm.id);
      const cuentasProcesadas = new Set<string>();

      pagosDeLaFarmacia.forEach((pago) => {
        if (pago.estado === "abonada") {
          const montoAbono = Number(pago.montoDePago || 0);
          // Separamos el monto en su respectivo acumulador sin convertir
          if (pago.monedaDePago === "USD") {
            abonosEnUsd += montoAbono;
          } else if (pago.monedaDePago === "Bs") {
            abonosEnBs += montoAbono;
          }
          return;
        }

        if (
          pago.cuentaPorPagarId &&
          cuentasProcesadas.has(pago.cuentaPorPagarId)
        ) {
          return;
        }

        if (pago.estado === "pagada") {
          // CORRECCIÓN: Lógica para sumar el monto original una sola vez por factura y con conversión
          const agregarMontoOriginal = (pagoInfo: any) => {
            const montoOrig = Number(pagoInfo.montoOriginal || 0);
            if (pagoInfo.monedaOriginal === "Bs") {
              const tasaOrig =
                Number(pagoInfo.tasaOriginal) > 0
                  ? Number(pagoInfo.tasaOriginal)
                  : 1;
              montoOriginalFacturasUsd += montoOrig / tasaOrig;
            } else {
              // Asumimos USD si no es Bs
              montoOriginalFacturasUsd += montoOrig;
            }
          };

          if (pago.estatus === "abonado" && pago.cuentaPorPagarId) {
            const abonosRelacionados = pagosDeLaFarmacia.filter(
              (abono) => abono.cuentaPorPagarId === pago.cuentaPorPagarId
            );

            // Añadimos el monto original de la factura UNA SOLA VEZ
            agregarMontoOriginal(pago);

            abonosRelacionados.forEach((abono) => {
              const monto = Number(abono.montoDePago || 0);
              const tasa =
                Number(abono.tasaDePago) > 0 ? Number(abono.tasaDePago) : 1;

              if (abono.monedaDePago === "USD") {
                pagosUsd += monto;
                pagosGeneralUsd += monto;
              } else if (abono.monedaDePago === "Bs") {
                pagosBs += monto;
                pagosGeneralUsd += monto / tasa;
              }
            });
            cuentasProcesadas.add(pago.cuentaPorPagarId);
          } else {
            // Añadimos el monto original de la factura
            agregarMontoOriginal(pago);

            const monto = Number(pago.montoDePago || 0);
            const tasa =
              Number(pago.tasaDePago) > 0 ? Number(pago.tasaDePago) : 1;

            if (pago.monedaDePago === "USD") {
              pagosUsd += monto;
              pagosGeneralUsd += monto;
            } else if (pago.monedaDePago === "Bs") {
              pagosBs += monto;
              pagosGeneralUsd += monto / tasa;
            }
          }
        }
      });

      const diferencialPagosUsd = pagosGeneralUsd - montoOriginalFacturasUsd;

      resultado[farm.id] = {
        pagosUsd: parseFloat(pagosUsd.toFixed(2)),
        pagosBs: parseFloat(pagosBs.toFixed(2)),
        pagosGeneralUsd: parseFloat(pagosGeneralUsd.toFixed(2)),
        abonosNoLiquidadosEnUsd: parseFloat(abonosEnUsd.toFixed(2)), // <-- NUEVO
        abonosNoLiquidadosEnBs: parseFloat(abonosEnBs.toFixed(2)), // <-- NUEVO
        montoOriginalFacturasUsd: parseFloat(
          montoOriginalFacturasUsd.toFixed(2)
        ),
        diferencialPagosUsd: parseFloat(diferencialPagosUsd.toFixed(2)),
      };
    });

    return resultado;
  }, [pagos, farmacias]);

  return {
    loading,
    error,
    ventas,
    sortedFarmacias,
    pendientesPorFarmacia,
    inventariosFarmacia,
    fechaInicio,
    fechaFin,
    setFechaInicio,
    setFechaFin,
    setHoy,
    setAyer,
    setSemanaActual,
    setQuincenaActual,
    setMesActual,
    detallesVisibles,
    setDetallesVisibles,
    calcularDetalles,
    gastosPorFarmacia,
    cuentasActivasPorFarmacia,
    cuentasPagadasPorFarmacia: MontoFacturadoCuentasPagadasPorFarmacia,
    totalPagosPorFarmacia,
    cuadresPorFarmacia, // Agregar acceso a los datos de cuadres
  };
}
