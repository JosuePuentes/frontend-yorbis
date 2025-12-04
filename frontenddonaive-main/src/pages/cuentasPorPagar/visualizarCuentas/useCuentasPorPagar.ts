import { useState, useMemo } from "react";
import type { CuentaPorPagar, Pago } from "./FilaCuentaPorPagar";

interface UseCuentasPorPagarProps {
  cuentas: CuentaPorPagar[];
  pagosAprobadosPorCuenta: Record<string, { loading: boolean; pagos: Pago[] }>;
  estatusInicial?: string; // <-- add optional estatusInicial
}

export function useCuentasPorPagar({ cuentas, estatusInicial }: UseCuentasPorPagarProps) {
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("");
  // Use estatusInicial if provided, else default to ""
  const [estatusFiltro, setEstatusFiltro] = useState<string>(estatusInicial || "");
  const [fechaInicio, setFechaInicio] = useState<string>("");
  const [fechaFin, setFechaFin] = useState<string>("");
  const [selectedFarmacia, setSelectedFarmacia] = useState<string>("");

  const cuentasFiltradas = useMemo<CuentaPorPagar[]>(() => {
    let filtradas = cuentas;
    if (proveedorFiltro) {
      filtradas = filtradas.filter((c: CuentaPorPagar) => c.proveedor?.toLowerCase().includes(proveedorFiltro.toLowerCase()));
    }
    if (estatusFiltro) {
      filtradas = filtradas.filter((c: CuentaPorPagar) => c.estatus === estatusFiltro);
    }
    if (fechaInicio) {
      filtradas = filtradas.filter((c: CuentaPorPagar) => new Date(c.fechaRecepcion) >= new Date(fechaInicio));
    }
    if (fechaFin) {
      filtradas = filtradas.filter((c: CuentaPorPagar) => new Date(c.fechaRecepcion) <= new Date(fechaFin));
    }
    if (selectedFarmacia) {
      filtradas = filtradas.filter((c: CuentaPorPagar) => c.farmacia === selectedFarmacia);
    }
    return filtradas;
  }, [cuentas, proveedorFiltro, estatusFiltro, fechaInicio, fechaFin, selectedFarmacia]);

  return {
    proveedorFiltro,
    setProveedorFiltro,
    estatusFiltro,
    setEstatusFiltro,
    fechaInicio,
    setFechaInicio,
    fechaFin,
    setFechaFin,
    selectedFarmacia,
    setSelectedFarmacia,
    cuentasFiltradas,
  };
}
