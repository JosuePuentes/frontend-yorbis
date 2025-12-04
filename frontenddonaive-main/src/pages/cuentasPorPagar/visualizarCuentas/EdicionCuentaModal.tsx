import React from "react";
import { FaTimes } from "react-icons/fa";
import { animate, stagger } from "animejs";

interface PagoPrevio {
  _id: string;
  monto: number;
  moneda: string;
  tasa?: number;
  fecha: string;
  referencia: string;
}

interface EdicionCuentaModalProps {
  isOpen: boolean;
  onClose: () => void;
  cuentaId: string | undefined;
  pagosPrevios?: PagoPrevio[];
}

// Helper para obtener la cuenta editada desde localStorage si existe
function getCuentaEditadaFromLocalStorageById(
  cuentaId: string | undefined
): any | null {
  if (!cuentaId) return null;
  try {
    const stored = localStorage.getItem("cuentasParaPagar");
    if (stored) {
      const cuentas = JSON.parse(stored);
      // Nuevo formato: array de objetos (buscar por cuentaPorPagarId)
      if (Array.isArray(cuentas)) {
        const editada = cuentas.find(
          (c: any) => c.cuentaPorPagarId === cuentaId
        );
        if (editada) {
          return { ...editada };
        }
      } else if (typeof cuentas === "object" && cuentas !== null) {
        // Compatibilidad con formato anterior (objeto)
        const editada = cuentas[cuentaId];
        if (editada) {
          return { ...editada };
        }
      }
    }
  } catch {}
  return null;
}

function getInitialCuentaEditadaById(cuentaId: string | undefined): any | null {
  return getCuentaEditadaFromLocalStorageById(cuentaId);
}

const EdicionCuentaModal: React.FC<EdicionCuentaModalProps> = ({
  isOpen,
  onClose,
  cuentaId,
  pagosPrevios: pagosPreviosProp = [],
}) => {
  const [pagosPrevios, setPagosPrevios] =
    React.useState<PagoPrevio[]>(pagosPreviosProp);

  // Consultar pagos previos al abrir el modal usando la misma URL base que PagosDropdown
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
  React.useEffect(() => {
    if (!isOpen || !cuentaId) return;
    let cancelado = false;
    async function fetchPagosPrevios() {
      setPagosPrevios([]); // Limpia antes de cargar
      try {
        const token = localStorage.getItem("access_token");
        if (!token) throw new Error("No se encontró el token de autenticación");
        const res = await fetch(
          `${API_BASE_URL}/pagoscpp?cuentaPorPagarId=${cuentaId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (!res.ok) throw new Error("Error al obtener pagos");
        const data = await res.json();
        if (!cancelado) setPagosPrevios(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelado) setPagosPrevios([]);
      }
    }
    fetchPagosPrevios();
    return () => {
      cancelado = true;
    };
  }, [isOpen, cuentaId]);

  if (!isOpen || !cuentaId) return null;

  const cuentaEditadaLocal = getInitialCuentaEditadaById(cuentaId);

  if (!cuentaEditadaLocal) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50"
        onClick={onClose}
      >
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full text-center">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-lg text-slate-700 mb-6">
            No se encontró la información de la cuenta seleccionada.
            <br />
            Por favor, llame a soporte técnico.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2 rounded bg-slate-600 text-white font-bold hover:bg-slate-700 transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    );
  }

  const [cuentaEditada, setCuentaEditada] = React.useState<any | null>(
    cuentaEditadaLocal
  );

  React.useEffect(() => {
    setCuentaEditada(getInitialCuentaEditadaById(cuentaId));
  }, [cuentaId]);

  // Ref: para forzar focus tras cambio de moneda
  const montoInputRef = React.useRef<HTMLInputElement>(null);
  const monedaAnterior = React.useRef<string>(
    cuentaEditada?.monedaDePago ?? ""
  );

  // Función para convertir montoDePago según moneda
  function convertirMontoDePago(
    monto: number,
    monedaOrigen: string,
    monedaDestino: string,
    tasa: number
  ) {
    if (!monto || !tasa || tasa <= 0) return monto;
    if (monedaOrigen === monedaDestino) return monto;
    if (monedaOrigen === "Bs" && monedaDestino === "Bs") {
      return monto;
    }
    if (monedaOrigen === "USD" && monedaDestino === "Bs") {
      return Number((monto * tasa).toFixed(2));
    }
    if (monedaOrigen === "Bs" && monedaDestino === "USD") {
      return Number((monto / tasa).toFixed(4));
    }
    return monto;
  }

  // Efecto: enfocar input de monto cuando cambia la moneda
  React.useEffect(() => {
    if (!cuentaEditada) return;
    if (monedaAnterior.current !== cuentaEditada.monedaDePago) {
      setTimeout(() => {
        if (montoInputRef.current) montoInputRef.current.focus();
      }, 0);
      monedaAnterior.current = cuentaEditada.monedaDePago;
    }
  }, [cuentaEditada?.monedaDePago]);

  // Calcular total pagado previo en la moneda seleccionada
  const totalPagadoPrevioEnMoneda = React.useMemo(() => {
    if (!cuentaEditada) return 0;
    return pagosPrevios.reduce((acc, pago) => {
      if (cuentaEditada.monedaDePago === "USD") {
        if (pago.moneda === "USD") {
          return acc + pago.monto;
        } else if (pago.moneda === "Bs" && pago.tasa && pago.tasa > 0) {
          // Siempre usar la tasa del pago para convertir a USD
          return acc + pago.monto / pago.tasa;
        } else {
          return acc;
        }
      } else {
        if (pago.moneda === "Bs") {
          return acc + pago.monto;
        } else if (pago.moneda === "USD" && pago.tasa && pago.tasa > 0) {
          // Siempre usar la tasa del pago para convertir a Bs
          return acc + pago.monto * pago.tasa;
        } else {
          return acc;
        }
      }
    }, 0);
  }, [pagosPrevios, cuentaEditada]);

  // Manejar cambios de input
  const handleChange =
    (field: string) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => {
      if (!cuentaEditada) return;
      let value: any = e.target.value;
      if (e.target.type === "number")
        value = e.target.value === "" ? undefined : Number(value);
      if (e.target.type === "checkbox")
        value = (e.target as HTMLInputElement).checked;
      let next = { ...cuentaEditada, [field]: value };

      // Obtener monto base descontando retención
      const retencion = Number(next.retencion) || 0;
      const montoBaseMenosRetencion =
        (Number(cuentaEditada.montoOriginal) || 0) - retencion;

      // Si cambia la moneda, recalcular montoDePago usando la función aparte
      if (field === "monedaDePago") {
        if (
          montoBaseMenosRetencion &&
          cuentaEditada.tasaDePago &&
          cuentaEditada.tasaDePago > 0
        ) {
          next.montoDePago = convertirMontoDePago(
            montoBaseMenosRetencion,
            cuentaEditada.monedaOriginal,
            value,
            cuentaEditada.tasaDePago
          );
        } else if (
          montoBaseMenosRetencion &&
          cuentaEditada.tasaDePago &&
          cuentaEditada.tasaDePago > 0
        ) {
          next.montoDePago = convertirMontoDePago(
            montoBaseMenosRetencion,
            cuentaEditada.monedaOriginal,
            value,
            cuentaEditada.tasaDePago
          );
        }
      }

      // Si cambia la tasaDePago, recalcular montoDePago automáticamente y actualizar el input
      if (field === "tasaDePago") {
        const tasa = Number(value);
        if (
          cuentaEditada.monedaOriginal === "USD" &&
          next.monedaDePago === "Bs" &&
          tasa > 0
        ) {
          next.montoDePago = Number(
            (montoBaseMenosRetencion * tasa).toFixed(4)
          );
        } else if (
          cuentaEditada.monedaOriginal === "Bs" &&
          next.monedaDePago === "USD" &&
          tasa > 0
        ) {
          next.montoDePago = Number(
            (montoBaseMenosRetencion / tasa).toFixed(4)
          );
        } else if (
          cuentaEditada.monedaOriginal === "Bs" &&
          next.monedaDePago === "Bs" &&
          tasa > 0
        ) {
          const montoUSD =
            montoBaseMenosRetencion / (Number(cuentaEditada.tasaOriginal) || 1);
          next.montoDePago = Number((montoUSD * tasa).toFixed(4));
        } else {
          next.montoDePago = montoBaseMenosRetencion;
        }
      }

      // Si cambia descuento1, descuento2, tipoDescuento1 o tipoDescuento2, recalcular montoDePago
      if (
        field === "descuento1" ||
        field === "descuento2" ||
        field === "tipoDescuento1" ||
        field === "tipoDescuento2"
      ) {
        // Calcular el monto base en la moneda de pago SIEMPRE partiendo del monto original y moneda original
        let montoBaseOriginal = Number(cuentaEditada.montoOriginal) || 0;
        let monedaBaseOriginal = cuentaEditada.monedaOriginal;
        let monedaPago = next.monedaDePago;
        let tasa = Number(next.tasaDePago) || 0;

        // Convertir monto base a la moneda de pago si es necesario
        let montoBase = montoBaseOriginal;
        console.log("montoBaseOriginal:", montoBaseOriginal);
        console.log("monedaBaseOriginal:", monedaBaseOriginal);
        console.log("monedaPago:", monedaPago);
        console.log("tasa:", tasa);
        if (monedaBaseOriginal !== monedaPago && tasa > 0) {
          if (monedaBaseOriginal === "Bs" && monedaPago === "Bs") {
            montoBase = montoBaseOriginal;
          } else if (monedaBaseOriginal === "USD" && monedaPago === "USD") {
            montoBase = montoBaseOriginal;
          } else if (monedaBaseOriginal === "USD" && monedaPago === "Bs") {
            montoBase = montoBaseOriginal * tasa;
          } else if (monedaBaseOriginal === "Bs" && monedaPago === "USD") {
            montoBase = montoBaseOriginal / tasa;
          }
        }

        // Descuentos
        const descuento1 =
          Number(field === "descuento1" ? value : next.descuento1) || 0;
        const descuento2 =
          Number(field === "descuento2" ? value : next.descuento2) || 0;
        const tipoDescuento1 =
          field === "tipoDescuento1" ? value : next.tipoDescuento1 || "monto";
        const tipoDescuento2 =
          field === "tipoDescuento2" ? value : next.tipoDescuento2 || "monto";

        let desc1 = 0;
        let desc2 = 0;

        if (tipoDescuento1 === "porcentaje") {
          desc1 = montoBase * (descuento1 / 100);
        } else {
          desc1 = descuento1;
        }
        if (tipoDescuento2 === "porcentaje") {
          desc2 = (montoBase - desc1) * (descuento2 / 100);
        } else {
          desc2 = descuento2;
        }

        const totalDescuentos = desc1 + desc2;
        const retencion = Number(next.retencion) || 0;

        // El monto a pagar es el monto base menos descuentos y retención, nunca menor a 0
        next.montoDePago = Math.max(montoBase - totalDescuentos - retencion, 0);
      }

      // Si se tilda/des-tilda abono, también actualizar el campo 'abono' en el objeto
      if (field === "esAbono") {
        next.abono = value === true;
      }

      setCuentaEditada(next);

      // Guardar automáticamente en localStorage al recalcular montoDePago
      try {
        const stored = localStorage.getItem("cuentasParaPagar");
        let cuentas = stored ? JSON.parse(stored) : [];
        const cuentaParaGuardar = {
          ...next,
          cuentaPorPagarId: next.cuentaPorPagarId || next._id,
        };
        delete cuentaParaGuardar._id;
        if (Array.isArray(cuentas)) {
          let found = false;
          cuentas = cuentas.map((c) => {
            const match =
              (c.cuentaPorPagarId &&
                cuentaParaGuardar.cuentaPorPagarId &&
                c.cuentaPorPagarId === cuentaParaGuardar.cuentaPorPagarId) ||
              (c._id &&
                cuentaParaGuardar.cuentaPorPagarId &&
                c._id === cuentaParaGuardar.cuentaPorPagarId) ||
              (c.cuentaPorPagarId &&
                cuentaParaGuardar._id &&
                c.cuentaPorPagarId === cuentaParaGuardar._id) ||
              (c._id &&
                cuentaParaGuardar._id &&
                c._id === cuentaParaGuardar._id);
            if (match) {
              found = true;
              return {
                ...c,
                ...cuentaParaGuardar,
                cuentaPorPagarId:
                  cuentaParaGuardar.cuentaPorPagarId || cuentaParaGuardar._id,
              };
            }
            return c;
          });
          if (!found) {
            cuentas.push({
              ...cuentaParaGuardar,
              cuentaPorPagarId:
                cuentaParaGuardar.cuentaPorPagarId || cuentaParaGuardar._id,
            });
          }
          const seen = new Set<string>();
          cuentas = cuentas.filter((c: any) => {
            const key = c.cuentaPorPagarId || c._id;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
        } else if (typeof cuentas === "object" && cuentas !== null) {
          const id = next.cuentaPorPagarId || next._id;
          if (id && id !== "undefined" && id !== null && id !== "") {
            cuentas[id] = cuentaParaGuardar;
          }
        }
        localStorage.setItem("cuentasParaPagar", JSON.stringify(cuentas));
      } catch {}
    };

  // Guardar cambios en localStorage
  const handleGuardar = () => {
    if (!cuentaEditada) return;
    try {
      const stored = localStorage.getItem("cuentasParaPagar");
      let cuentas = stored ? JSON.parse(stored) : [];
      // Crear copia con cuentaPorPagarId y sin _id
      const cuentaParaGuardar = {
        ...cuentaEditada,
        cuentaPorPagarId: cuentaEditada.cuentaPorPagarId || cuentaEditada._id,
      };
      delete cuentaParaGuardar._id;
      // Si es array (nuevo formato)
      if (Array.isArray(cuentas)) {
        let found = false;
        cuentas = cuentas.map((c) => {
          // Comparar por ambos campos para evitar duplicados
          const match =
            (c.cuentaPorPagarId &&
              cuentaParaGuardar.cuentaPorPagarId &&
              c.cuentaPorPagarId === cuentaParaGuardar.cuentaPorPagarId) ||
            (c._id &&
              cuentaParaGuardar.cuentaPorPagarId &&
              c._id === cuentaParaGuardar.cuentaPorPagarId) ||
            (c.cuentaPorPagarId &&
              cuentaParaGuardar._id &&
              c.cuentaPorPagarId === cuentaParaGuardar._id) ||
            (c._id && cuentaParaGuardar._id && c._id === cuentaParaGuardar._id);
          if (match) {
            found = true;
            return {
              ...c,
              ...cuentaParaGuardar,
              cuentaPorPagarId:
                cuentaParaGuardar.cuentaPorPagarId || cuentaParaGuardar._id,
            };
          }
          return c;
        });
        // Si no existe, agregarla al array
        if (!found) {
          cuentas.push({
            ...cuentaParaGuardar,
            cuentaPorPagarId:
              cuentaParaGuardar.cuentaPorPagarId || cuentaParaGuardar._id,
          });
        }
        // Eliminar duplicados por cuentaPorPagarId o _id
        const seen = new Set<string>();
        cuentas = cuentas.filter((c: any) => {
          const key = c.cuentaPorPagarId || c._id;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      } else if (typeof cuentas === "object" && cuentas !== null) {
        // Compatibilidad con formato anterior (objeto)
        const id = cuentaEditada.cuentaPorPagarId || cuentaEditada._id;
        if (id && id !== "undefined" && id !== null && id !== "") {
          cuentas[id] = cuentaParaGuardar;
        }
      }
      localStorage.setItem("cuentasParaPagar", JSON.stringify(cuentas));
    } catch {}
    onClose();
  };

  // Checkbox para deducir pagos previos
  const [deducirPagosPrevios, setDeducirPagosPrevios] = React.useState(false);

  // Efecto: actualizar montoDePago automáticamente si el check está activo
  React.useEffect(() => {
    if (!cuentaEditada) return;
    if (deducirPagosPrevios) {
      // Conversiones de montoOriginal a la moneda de pago (repetimos aquí para asegurar el orden)
      let montoOriginalEnMonedaPago = Number(cuentaEditada.montoOriginal) || 0;
      if (cuentaEditada.monedaOriginal !== cuentaEditada.monedaDePago) {
        const tasa = Number(cuentaEditada.tasaDePago) || 0;
        if (
          cuentaEditada.monedaOriginal === "USD" &&
          cuentaEditada.monedaDePago === "Bs" &&
          tasa > 0
        ) {
          montoOriginalEnMonedaPago = montoOriginalEnMonedaPago * tasa;
        } else if (
          cuentaEditada.monedaOriginal === "Bs" &&
          cuentaEditada.monedaDePago === "USD" &&
          tasa > 0
        ) {
          montoOriginalEnMonedaPago = montoOriginalEnMonedaPago / tasa;
        }
      }
      // Calcular descuentos y retención
      const descuento1 = Number(cuentaEditada.descuento1) || 0;
      const descuento2 = Number(cuentaEditada.descuento2) || 0;
      const tipoDescuento1 = cuentaEditada.tipoDescuento1 || "monto";
      const tipoDescuento2 = cuentaEditada.tipoDescuento2 || "monto";
      const retencion = Number(cuentaEditada.retencion) || 0;
      let desc1 =
        tipoDescuento1 === "porcentaje"
          ? montoOriginalEnMonedaPago * (descuento1 / 100)
          : descuento1;
      let desc2 =
        tipoDescuento2 === "porcentaje"
          ? (montoOriginalEnMonedaPago - desc1) * (descuento2 / 100)
          : descuento2;
      const totalDescuentos = desc1 + desc2;
      // El saldo base antes de pagos previos
      const saldoBase = Math.max(
        montoOriginalEnMonedaPago - totalDescuentos - retencion,
        0
      );
      // Sumar pagos previos convertidos
      const totalPagadoPrevioConvertido = pagosPrevios.reduce((acc, pago) => {
        let monto =
          typeof pago.monto === "number" && !isNaN(pago.monto)
            ? pago.monto
            : typeof (pago as any).montoDePago === "number" &&
              !isNaN((pago as any).montoDePago)
            ? (pago as any).montoDePago
            : 0;
        let monedaPagoPrevio = pago.moneda || (pago as any).monedaDePago || "";
        let tasaPagoPrevio =
          typeof pago.tasa === "number" && !isNaN(pago.tasa)
            ? pago.tasa
            : typeof (pago as any).tasaDePago === "number" &&
              !isNaN((pago as any).tasaDePago)
            ? (pago as any).tasaDePago
            : 0;
        if (monedaPagoPrevio === cuentaEditada.monedaDePago) {
          return acc + monto;
        } else if (
          monedaPagoPrevio === "USD" &&
          cuentaEditada.monedaDePago === "Bs" &&
          tasaPagoPrevio > 0
        ) {
          return acc + monto * tasaPagoPrevio;
        } else if (
          monedaPagoPrevio === "Bs" &&
          cuentaEditada.monedaDePago === "USD" &&
          tasaPagoPrevio > 0
        ) {
          return acc + monto / tasaPagoPrevio;
        }
        return acc;
      }, 0);
      setCuentaEditada((prev: any) => ({
        ...prev,
        montoDePago: Math.max(saldoBase - totalPagadoPrevioConvertido, 0),
      }));
    }
  }, [
    deducirPagosPrevios,
    pagosPrevios,
    cuentaEditada?.monedaDePago,
    cuentaEditada?.montoOriginal,
    cuentaEditada?.tasaDePago,
    cuentaEditada?.descuento1,
    cuentaEditada?.descuento2,
    cuentaEditada?.tipoDescuento1,
    cuentaEditada?.tipoDescuento2,
    cuentaEditada?.retencion,
  ]);

  // Animación de fade-in para la lista de pagos previos
  React.useEffect(() => {
    if (isOpen && pagosPrevios.length > 0) {
      animate(".pagos-previos-lista li", {
        opacity: [0, 1],
        y: [20, 0],
        duration: 500,
        delay: stagger(80),
        ease: "outCubic",
      });
    }
  }, [isOpen, pagosPrevios.length]);

  if (!cuentaEditada) return null;

  // Cálculos para el resumen
  const montoOriginal = Number(cuentaEditada.montoOriginal) || 0;
  const descuento1 = Number(cuentaEditada.descuento1) || 0;
  const descuento2 = Number(cuentaEditada.descuento2) || 0;
  const tipoDescuento1 = cuentaEditada.tipoDescuento1 || "monto";
  const tipoDescuento2 = cuentaEditada.tipoDescuento2 || "monto";
  const retencion = Number(cuentaEditada.retencion) || 0;
  const montoDePago = Number(cuentaEditada.montoDePago) || 0;
  const moneda = cuentaEditada.monedaDePago;

  // Conversiones de montoOriginal a la moneda de pago
  let montoOriginalEnMonedaPago = montoOriginal;
  if (cuentaEditada.monedaOriginal !== cuentaEditada.monedaDePago) {
    const tasa = Number(cuentaEditada.tasaDePago) || 0;
    if (
      cuentaEditada.monedaOriginal === "USD" &&
      cuentaEditada.monedaDePago === "Bs" &&
      tasa > 0
    ) {
      montoOriginalEnMonedaPago = montoOriginal * tasa;
    } else if (
      cuentaEditada.monedaOriginal === "Bs" &&
      cuentaEditada.monedaDePago === "USD" &&
      tasa > 0
    ) {
      montoOriginalEnMonedaPago = montoOriginal / tasa;
    }
  }

  // Calcular descuentos
  let desc1 = 0;
  let desc2 = 0;
  if (tipoDescuento1 === "porcentaje") {
    desc1 = montoDePago * (descuento1 / 100);
  } else {
    desc1 = descuento1;
  }
  if (tipoDescuento2 === "porcentaje") {
    desc2 = (montoDePago - desc1) * (descuento2 / 100);
  } else {
    desc2 = descuento2;
  }
  const totalDescuentos = desc1 + desc2;
  const totalAcreditar = Math.max(montoDePago - totalDescuentos, 0);
  // El nuevo saldo debe estar en la moneda de pago
  const nuevoSaldo = Math.max(
    montoOriginalEnMonedaPago - (montoDePago - retencion),
    0
  );

  // Calcular saldo restante en la moneda de pago
  // (El valor ya se usa directamente en el render, no es necesario declarar la variable)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50"
      onClick={onClose}
    >
      <div
        className="bg-slate-50 rounded-lg shadow-xl p-8 w-full max-w-5xl relative"
        onClick={(e) => e.stopPropagation()}
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-slate-800"
        >
          <FaTimes size={20} />
        </button>
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-slate-800">Pagos o Abonos</h2>
          <p className="text-sm text-slate-600">
            Proveedor:{" "}
            <span className="font-semibold">{cuentaEditada.proveedor}</span>
          </p>
        </div>
        {/* Pagos previos en la parte superior */}
        {pagosPrevios.length > 0 && (
          <div className="mb-6 bg-white p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-700 mb-2 text-sm">
              Pagos realizados anteriormente
            </h4>
            <div className="text-xs text-slate-600 mb-1">
              Total pagado previo:{" "}
              <span className="font-semibold">
                {cuentaEditada.monedaDePago === "USD"
                  ? totalPagadoPrevioEnMoneda.toLocaleString("en-US", {
                      style: "currency",
                      currency: "USD",
                      minimumFractionDigits: 2,
                    }) + " USD"
                  : totalPagadoPrevioEnMoneda.toLocaleString("es-VE", {
                      style: "currency",
                      currency: "VES",
                      minimumFractionDigits: 2,
                    }) + " Bs"}
              </span>
            </div>
            <ul className="divide-y divide-slate-200 pagos-previos-lista">
              {pagosPrevios.map((p) => {
                // Compatibilidad: soporta pagos de MongoDB y del frontend
                const montoMostrado =
                  typeof p.monto === "number" && !isNaN(p.monto)
                    ? p.monto
                    : typeof (p as any).montoDePago === "number" &&
                      !isNaN((p as any).montoDePago)
                    ? (p as any).montoDePago
                    : 0;
                const monedaMostrada =
                  p.moneda || (p as any).monedaDePago || "";
                const referenciaMostrada =
                  p.referencia || (p as any).numeroControl || "-";
                const fechaMostrada =
                  p.fecha || (p as any).fechaRegistro || "-";
                const tasaMostrada =
                  typeof p.tasa === "number" && !isNaN(p.tasa)
                    ? p.tasa
                    : typeof (p as any).tasaDePago === "number" &&
                      !isNaN((p as any).tasaDePago)
                    ? (p as any).tasaDePago
                    : null;
                return (
                  <li key={p._id} className="py-1 flex flex-col">
                    <span className="text-slate-700">
                      {montoMostrado.toLocaleString(
                        monedaMostrada === "USD" ? "en-US" : "es-VE",
                        {
                          style: "currency",
                          currency: monedaMostrada === "USD" ? "USD" : "VES",
                          minimumFractionDigits: 2,
                        }
                      )}{" "}
                      {monedaMostrada}
                    </span>
                    <span className="text-slate-400 text-xs">
                      Ref: {referenciaMostrada} | Fecha: {fechaMostrada} | Tasa:{" "}
                      {tasaMostrada !== null
                        ? tasaMostrada.toLocaleString("es-VE", {
                            minimumFractionDigits: 4,
                          })
                        : "N/A"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-2 gap-8">
          {/* Columna de Inputs: Detalles del Pago a la izquierda */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 w-full">
            <h3 className="font-bold text-lg mb-4 text-slate-700">
              Detalles del Pago
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Monto Original
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 bg-slate-100"
                  value={cuentaEditada.montoOriginal}
                  disabled
                />
                <div className="text-xs text-slate-500 mt-1">
                  {cuentaEditada.monedaOriginal === "USD"
                    ? `USD ${
                        cuentaEditada.montoOriginal
                          ? typeof cuentaEditada.montoOriginal === "string"
                            ? parseFloat(cuentaEditada.montoOriginal).toFixed(4)
                            : cuentaEditada.montoOriginal.toFixed(4)
                          : "0.0000"
                      } | Bs ${
                        cuentaEditada.tasaOriginal &&
                        cuentaEditada.montoOriginal
                          ? typeof cuentaEditada.montoOriginal === "string"
                            ? (
                                parseFloat(cuentaEditada.montoOriginal) *
                                (typeof cuentaEditada.tasaOriginal === "string"
                                  ? parseFloat(cuentaEditada.tasaOriginal)
                                  : cuentaEditada.tasaOriginal)
                              ).toFixed(2)
                            : (
                                cuentaEditada.montoOriginal *
                                (typeof cuentaEditada.tasaOriginal === "string"
                                  ? parseFloat(cuentaEditada.tasaOriginal)
                                  : cuentaEditada.tasaOriginal)
                              ).toFixed(2)
                          : "0.00"
                      }`
                    : `Bs ${
                        cuentaEditada.montoOriginal
                          ? typeof cuentaEditada.montoOriginal === "string"
                            ? parseFloat(cuentaEditada.montoOriginal).toFixed(2)
                            : cuentaEditada.montoOriginal.toFixed(2)
                          : "0.00"
                      } | USD ${
                        cuentaEditada.tasaOriginal &&
                        cuentaEditada.montoOriginal
                          ? typeof cuentaEditada.montoOriginal === "string"
                            ? (
                                parseFloat(cuentaEditada.montoOriginal) /
                                (typeof cuentaEditada.tasaOriginal === "string"
                                  ? parseFloat(cuentaEditada.tasaOriginal)
                                  : cuentaEditada.tasaOriginal)
                              ).toFixed(4)
                            : (
                                cuentaEditada.montoOriginal /
                                (typeof cuentaEditada.tasaOriginal === "string"
                                  ? parseFloat(cuentaEditada.tasaOriginal)
                                  : cuentaEditada.tasaOriginal)
                              ).toFixed(4)
                          : "0.0000"
                      }`}
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Divisa Original
                </label>
                <input
                  type="text"
                  className="w-full border rounded px-3 py-2 bg-slate-100"
                  value={cuentaEditada.monedaOriginal}
                  disabled
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tasa Original
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2 bg-slate-100"
                  value={cuentaEditada.tasaOriginal}
                  disabled
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Tasa del Pago
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min={0}
                  step="0.0001"
                  value={cuentaEditada.tasaDePago}
                  onChange={handleChange("tasaDePago")}
                />
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Moneda del Pago
                </label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={cuentaEditada.monedaDePago}
                  onChange={handleChange("monedaDePago")}
                >
                  <option value="Bs">Bs</option>
                  <option value="USD">USD</option>
                </select>
              </div>
              <div className="col-span-2 flex flex-row gap-0.5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descuento 1
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      min={0}
                      value={cuentaEditada.descuento1 ?? ""}
                      onChange={handleChange("descuento1")}
                    />
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={cuentaEditada.tipoDescuento1 ?? "monto"}
                      onChange={handleChange("tipoDescuento1")}
                    >
                      <option value="porcentaje">%</option>
                      <option value="monto">
                        {cuentaEditada.monedaDePago}
                      </option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descuento 2
                  </label>
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
                      min={0}
                      value={cuentaEditada.descuento2 ?? ""}
                      onChange={handleChange("descuento2")}
                    />
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={cuentaEditada.tipoDescuento2 ?? "monto"}
                      onChange={handleChange("tipoDescuento2")}
                    >
                      <option value="porcentaje">%</option>
                      <option value="monto">
                        {cuentaEditada.monedaDePago}
                      </option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="col-span-1">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Retención
                </label>
                <input
                  type="number"
                  className="w-full border rounded px-3 py-2"
                  min={0}
                  step="0.01"
                  value={cuentaEditada.retencion ?? 0}
                  onChange={handleChange("retencion")}
                />
              </div>
              <div className="col-span-2 flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="aplicarPagosPrevios"
                  checked={deducirPagosPrevios}
                  onChange={(e) => setDeducirPagosPrevios(e.target.checked)}
                />
                <label
                  htmlFor="aplicarPagosPrevios"
                  className="text-sm font-medium text-slate-700 select-none cursor-pointer"
                >
                  Aplicar pagos previos
                </label>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="esAbono"
                  checked={!!cuentaEditada.esAbono}
                  onChange={(e) =>
                    handleChange("esAbono")({
                      target: {
                        type: "checkbox",
                        checked: e.target.checked,
                        value: e.target.checked,
                      },
                    } as any)
                  }
                />
                <label
                  htmlFor="esAbono"
                  className="text-sm font-medium text-slate-700 mb-1"
                >
                  ¿Monto a abonar?
                </label>
              </div>
              {cuentaEditada.esAbono && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monto a Abonar
                  </label>
                  <input
                    ref={montoInputRef}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={
                      cuentaEditada.montoDePago === undefined ||
                      cuentaEditada.montoDePago === null
                        ? ""
                        : cuentaEditada.montoDePago
                    }
                    onChange={handleChange("montoDePago")}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    El abono no liquida la cuenta, solo descuenta del saldo.
                  </div>
                </div>
              )}
              {!cuentaEditada.esAbono && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Monto a Pagar
                  </label>
                  <input
                    ref={montoInputRef}
                    type="number"
                    className="w-full border rounded px-3 py-2"
                    min={0}
                    step="0.0001"
                    value={
                      cuentaEditada.montoDePago === undefined ||
                      cuentaEditada.montoDePago === null
                        ? ""
                        : cuentaEditada.montoDePago
                    }
                    onChange={handleChange("montoDePago")}
                  />
                  <div className="text-xs text-slate-500 mt-1">
                    Este monto ya descuenta la retención.
                  </div>
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Observación
                </label>
                <textarea
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                  value={cuentaEditada.observacion ?? ""}
                  onChange={handleChange("observacion")}
                />
              </div>
            </div>
          </div>
          {/* Columna de Resumen: a la derecha */}
          <div className="bg-white p-4 rounded-lg border border-slate-200">
            <h3 className="font-bold text-lg mb-4 text-slate-700">
              Resumen de Cuenta
            </h3>
            <div className="space-y-4 text-sm">
              {/* Grupo 1 */}
              <div className="border border-black rounded-md p-3 mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">No. Factura:</span>{" "}
                  <span className="font-mono">
                    {cuentaEditada.numeroFactura}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Proveedor:</span>{" "}
                  <span className="font-mono">{cuentaEditada.proveedor}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Moneda Original:</span>{" "}
                  <span className="font-mono">
                    {cuentaEditada.monedaOriginal}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Monto Original:</span>{" "}
                  <span className="font-mono">
                    {montoOriginal.toLocaleString(
                      cuentaEditada.monedaOriginal === "USD"
                        ? "en-US"
                        : "es-VE",
                      {
                        style: "currency",
                        currency:
                          cuentaEditada.monedaOriginal === "USD"
                            ? "USD"
                            : "VES",
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tasa Original:</span>{" "}
                  <span className="font-mono">
                    {(cuentaEditada.tasaOriginal ?? 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 4,
                    })}
                  </span>
                </div>
              </div>
              {/* Grupo 2 */}
              <div className="border border-black rounded-md p-3 mb-2">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Moneda de Pago:</span>{" "}
                  <span className="font-mono">
                    {cuentaEditada.monedaDePago}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Tasa del Pago:</span>{" "}
                  <span className="font-mono">
                    {(cuentaEditada.tasaDePago ?? 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 4,
                    })}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Descuento 1:</span>{" "}
                  <span className="font-mono">
                    {descuento1}{" "}
                    {tipoDescuento1 === "porcentaje" ? "%" : moneda}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Descuento 2:</span>{" "}
                  <span className="font-mono">
                    {descuento2}{" "}
                    {tipoDescuento2 === "porcentaje" ? "%" : moneda}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Total Descuentos:</span>{" "}
                  <span className="font-mono">
                    {totalDescuentos.toLocaleString(
                      moneda === "USD" ? "en-US" : "es-VE",
                      {
                        style: "currency",
                        currency: moneda === "USD" ? "USD" : "VES",
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Retención:</span>{" "}
                  <span className="font-mono">
                    {retencion.toLocaleString(
                      moneda === "USD" ? "en-US" : "es-VE",
                      {
                        style: "currency",
                        currency: moneda === "USD" ? "USD" : "VES",
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
              </div>
              {/* Grupo 3 */}
              <div className="border border-black rounded-md p-3">
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Total a Acreditar:</span>{" "}
                  <span className="font-mono">
                    {totalAcreditar.toLocaleString(
                      moneda === "USD" ? "en-US" : "es-VE",
                      {
                        style: "currency",
                        currency: moneda === "USD" ? "USD" : "VES",
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Saldo Final:</span>{" "}
                  <span className="font-mono">
                    {nuevoSaldo.toLocaleString(
                      moneda === "USD" ? "en-US" : "es-VE",
                      {
                        style: "currency",
                        currency: moneda === "USD" ? "USD" : "VES",
                        minimumFractionDigits: 2,
                      }
                    )}
                  </span>
                </div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-600">Total Pagado Previo:</span>{" "}
                  <span className="font-mono">
                    {moneda === "USD"
                      ? totalPagadoPrevioEnMoneda.toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 2,
                        })
                      : totalPagadoPrevioEnMoneda.toLocaleString("es-VE", {
                          style: "currency",
                          currency: "VES",
                          minimumFractionDigits: 2,
                        })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Saldo Restante:</span>{" "}
                  <span className="font-mono">
                    {moneda === "USD"
                      ? Math.max(
                          nuevoSaldo - totalPagadoPrevioEnMoneda,
                          0
                        ).toLocaleString("en-US", {
                          style: "currency",
                          currency: "USD",
                          minimumFractionDigits: 2,
                        })
                      : Math.max(
                          nuevoSaldo - totalPagadoPrevioEnMoneda,
                          0
                        ).toLocaleString("es-VE", {
                          style: "currency",
                          currency: "VES",
                          minimumFractionDigits: 2,
                        })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-6 gap-4">
          <button
            onClick={handleGuardar}
            className="px-6 py-2 rounded bg-green-600 text-white font-bold hover:bg-green-700 transition-all"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
};

export default EdicionCuentaModal;
