import React, { useState, useEffect } from "react";
import UpFile from "./upfile/UpFile";
import ImageDisplay from "./upfile/ImageDisplay";

interface Props {
  farmacia: string;
  dia: string;
  onClose: () => void;
  // Props opcionales para prellenar desde punto de venta
  cajeroPrellenado?: string;
  tasaPrellenada?: number;
  totalCajaSistemaUsd?: number;
  costoInventarioPrellenado?: number;
  deshabilitarCajero?: boolean;
  fondoCaja?: {
    efectivoBs: number;
    efectivoUsd: number;
    metodoPagoBs?: string;
    metodoPagoUsd?: string;
  } | null;
  facturasProcesadas?: any[]; // Facturas para calcular totales
  onCerrarCajaCompleto?: () => void;
}

interface Cajero {
  _id: string;
  NOMBRE: string;
  ID: string;
  FARMACIAS: Record<string, string>;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AgregarCuadreModal: React.FC<Props> = ({ 
  farmacia, 
  dia, 
  onClose,
  cajeroPrellenado,
  tasaPrellenada,
  totalCajaSistemaUsd,
  costoInventarioPrellenado,
  deshabilitarCajero = false,
  fondoCaja,
  facturasProcesadas = [],
  onCerrarCajaCompleto
}) => {
  // Estados para los campos del cuadre
  const [cajaNumero, setCajaNumero] = useState<number>(1);
  const [turno, setTurno] = useState<string>("Mañana");
  const [cajero, setCajero] = useState<string>(cajeroPrellenado || "");
  const [tasa, setTasa] = useState<number | undefined>(tasaPrellenada);
  
  // Estado para almacenar costos del inventario
  const [costosInventario, setCostosInventario] = useState<Map<string, number>>(new Map());
  
  // Cargar costos del inventario de la sucursal
  useEffect(() => {
    const cargarCostosInventario = async () => {
      if (!farmacia || !deshabilitarCajero) return;
      
      try {
        const token = localStorage.getItem("access_token");
        if (!token) return;
        
        // Obtener inventario de la sucursal
        const resInventario = await fetch(`${API_BASE_URL}/inventarios?sucursal=${farmacia}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        
        if (resInventario.ok) {
          const inventarios = await resInventario.json();
          const inventarioSucursal = Array.isArray(inventarios) 
            ? inventarios.find((inv: any) => inv.farmacia === farmacia || inv.sucursal === farmacia)
            : null;
          
          if (inventarioSucursal) {
            // Obtener items del inventario
            const resItems = await fetch(`${API_BASE_URL}/inventarios/${inventarioSucursal._id || inventarioSucursal.id}/items`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });
            
            if (resItems.ok) {
              const itemsInventario = await resItems.json();
              const itemsArray = Array.isArray(itemsInventario) ? itemsInventario : [];
              
              // Crear mapa de costos por producto_id
              const costosMap = new Map<string, number>();
              itemsArray.forEach((item: any) => {
                const productoId = item._id || item.id || item.producto_id;
                const costo = item.costo_unitario || item.costo || 0;
                if (productoId && costo > 0) {
                  costosMap.set(productoId, costo);
                }
              });
              
              setCostosInventario(costosMap);
            }
          }
        }
      } catch (error) {
        console.error("Error al cargar costos del inventario:", error);
      }
    };
    
    cargarCostosInventario();
  }, [farmacia, deshabilitarCajero]);
  
  // Calcular totales desde facturas procesadas
  const calcularTotalesDesdeFacturas = () => {
    if (!facturasProcesadas || facturasProcesadas.length === 0) {
      return {
        totalCajaSistemaUsd: totalCajaSistemaUsd || 0,
        devolucionesBs: 0,
        recargaBs: 0,
        pagomovilBs: 0,
        costoInventario: costoInventarioPrellenado || 0,
        efectivoBs: 0,
        efectivoUsd: 0,
        zelleUsd: 0,
        valesUsd: 0,
        tarjetaDebitoBs: 0,
        tarjetaCreditoBs: 0,
      };
    }
    
    let totalCajaUsd = 0;
    let devolucionesBs = 0;
    let recargaBs = 0;
    let pagomovilBs = 0;
    let costoInventario = 0;
    let efectivoBs = 0;
    let efectivoUsd = 0;
    let zelleUsd = 0;
    let valesUsd = 0;
    let tarjetaDebitoBs = 0;
    let tarjetaCreditoBs = 0;
    
    facturasProcesadas.forEach((factura: any) => {
      // Total Caja Sistema USD
      totalCajaUsd += factura.total_usd || 0;
      
      // Devoluciones (si existe el campo)
      devolucionesBs += factura.devoluciones_bs || 0;
      
      // Items: Recarga y Costo Inventario
      if (factura.items && Array.isArray(factura.items)) {
        factura.items.forEach((item: any) => {
          // Recarga: buscar items con nombre que contenga "recarga"
          if (item.nombre && item.nombre.toLowerCase().includes("recarga")) {
            recargaBs += (item.subtotal || 0);
          }
          
          // Costo Inventario: obtener costo desde el inventario de la sucursal
          const productoId = item.producto_id || item._id || item.id;
          // Priorizar costo del inventario, luego costo_unitario del item, luego 0
          const costoItem = costosInventario.get(productoId) || item.costo_unitario || 0;
          costoInventario += costoItem * (item.cantidad || 0);
        });
      }
      
      // Métodos de pago
      if (factura.metodos_pago && Array.isArray(factura.metodos_pago)) {
        factura.metodos_pago.forEach((metodo: any) => {
          const monto = metodo.monto || 0;
          const tipo = metodo.tipo || "";
          const divisa = metodo.divisa || "";
          
          if (tipo === "pago_movil" && divisa === "Bs") {
            pagomovilBs += monto;
          } else if (tipo === "efectivo" && divisa === "Bs") {
            efectivoBs += monto;
          } else if (tipo === "efectivo" && divisa === "USD") {
            efectivoUsd += monto;
          } else if (tipo === "zelle" && divisa === "USD") {
            zelleUsd += monto;
          } else if (tipo === "vales" && divisa === "USD") {
            valesUsd += monto;
          } else if (tipo === "tarjeta_debit" && divisa === "Bs") {
            tarjetaDebitoBs += monto;
          } else if (tipo === "tarjeta_credito" && divisa === "Bs") {
            tarjetaCreditoBs += monto;
          }
        });
      }
    });
    
    return {
      totalCajaSistemaUsd: totalCajaUsd,
      devolucionesBs,
      recargaBs,
      pagomovilBs,
      // Priorizar costoInventarioPrellenado (calculado en PuntoVentaPage) sobre el cálculo local
      costoInventario: costoInventarioPrellenado || costoInventario || 0,
      efectivoBs,
      efectivoUsd,
      zelleUsd,
      valesUsd,
      tarjetaDebitoBs,
      tarjetaCreditoBs,
    };
  };
  
  const totalesFacturas = calcularTotalesDesdeFacturas();

  // Estados inicializados con valores calculados desde facturas (si vienen desde punto de venta)
  const [devolucionesBs, setDevolucionesBs] = useState<number | undefined>(
    deshabilitarCajero ? totalesFacturas.devolucionesBs : undefined
  );
  const recargaBsCalculado = totalesFacturas.recargaBs;
  const [recargaBsIngresado, setRecargaBsIngresado] = useState<number | undefined>(undefined);
  const pagomovilBsCalculado = totalesFacturas.pagomovilBs;
  const [pagomovilBsIngresado, setPagomovilBsIngresado] = useState<number | undefined>(undefined);
  const efectivoBsCalculado = totalesFacturas.efectivoBs;
  const [efectivoBsIngresado, setEfectivoBsIngresado] = useState<number | undefined>(undefined);
  const efectivoUsdCalculado = totalesFacturas.efectivoUsd;
  const [efectivoUsdIngresado, setEfectivoUsdIngresado] = useState<number | undefined>(undefined);
  const zelleUsdCalculado = totalesFacturas.zelleUsd;
  const zelleUsd = deshabilitarCajero ? totalesFacturas.zelleUsd : undefined;
  const valesUsdCalculado = totalesFacturas.valesUsd;
  const valesUsd = deshabilitarCajero ? totalesFacturas.valesUsd : undefined;
  // Priorizar costoInventarioPrellenado sobre el cálculo desde facturas
  const [costoInventario, setCostoInventario] = useState<number | undefined>(
    costoInventarioPrellenado || totalesFacturas.costoInventario
  );
  
  // Actualizar costoInventario cuando cambia costoInventarioPrellenado
  useEffect(() => {
    if (costoInventarioPrellenado && costoInventarioPrellenado > 0) {
      setCostoInventario(costoInventarioPrellenado);
    }
  }, [costoInventarioPrellenado]);
  
  // Valores calculados para tarjetas (puntos de venta)
  const tarjetaDebitoBsCalculado = totalesFacturas.tarjetaDebitoBs;
  const tarjetaCreditoBsCalculado = totalesFacturas.tarjetaCreditoBs;

  // Estado local para el fondo de caja (solo lectura cuando viene desde punto de venta)
  const [fondoCajaLocal] = useState<{
    efectivoBs: number;
    efectivoUsd: number;
    metodoPagoBs?: string;
    metodoPagoUsd?: string;
  } | null>(fondoCaja || null);

  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false); // Nuevo estado para controlar el loading
  const [showConfirm, setShowConfirm] = useState(false);

  // Nuevo estado para puntos de venta (con totales calculados)
  const [puntosVenta, setPuntosVenta] = useState<
    Array<{
      banco: string;
      puntoDebito: number | string | undefined;
      puntoDebitoIngresado?: number | undefined;
      puntoCredito: number | string | undefined;
      puntoCreditoIngresado?: number | undefined;
    }>
  >([{ banco: "", puntoDebito: "", puntoCredito: "" }]);
  
  // Inicializar puntos de venta con totales calculados si vienen desde punto de venta
  useEffect(() => {
    if (deshabilitarCajero && totalesFacturas.tarjetaDebitoBs > 0 || totalesFacturas.tarjetaCreditoBs > 0) {
      setPuntosVenta([{
        banco: "",
        puntoDebito: totalesFacturas.tarjetaDebitoBs,
        puntoCredito: totalesFacturas.tarjetaCreditoBs,
      }]);
    }
  }, [deshabilitarCajero]);

  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  // Para guardar hasta 3 objectNames, inicializado con 3 nulos
  const [imagenesCuadre, setImagenesCuadre] = useState<Array<string | null>>([
    null,
    null,
    null,
    null,
  ]);

  // Fondo actual (solo visible, no afecta cálculos)
  const fondoActual = fondoCajaLocal || fondoCaja;
  
  // Cálculos automáticos
  // Usar valores ingresados si existen, sino usar calculados
  const recargaBsFinal = recargaBsIngresado ?? recargaBsCalculado;
  const pagomovilBsFinal = pagomovilBsIngresado ?? pagomovilBsCalculado;
  const efectivoBsFinal = efectivoBsIngresado ?? efectivoBsCalculado;
  const efectivoUsdFinal = efectivoUsdIngresado ?? efectivoUsdCalculado;
  const zelleUsdFinal = zelleUsd ?? zelleUsdCalculado;
  const valesUsdFinal = valesUsd ?? valesUsdCalculado;
  
  // Total Bs: efectivo Bs + tarjetas débito/crédito + pago móvil
  const totalBsIngresados =
    efectivoBsFinal +
    puntosVenta.reduce((acc, pv) => {
      const debito = pv.puntoDebitoIngresado ?? Number(pv.puntoDebito || tarjetaDebitoBsCalculado);
      const credito = pv.puntoCreditoIngresado ?? Number(pv.puntoCredito || tarjetaCreditoBsCalculado);
      return acc + debito + credito;
    }, 0) +
    pagomovilBsFinal;
  
  // Total Caja Sistema USD (desde facturas)
  const totalCajaSistemaUsdFinal = totalesFacturas.totalCajaSistemaUsd;
  
  // Total Caja - Vales (en USD)
  const totalCajaMenosValesUsd = totalCajaSistemaUsdFinal - valesUsdFinal;
  
  // Total Bs en USD
  const totalBsEnUsd = (tasa ?? 0) > 0 ? totalBsIngresados / (tasa ?? 0) : 0;
  
  // NO restar el fondo de caja (solo visible)
  // Cálculo de diferenciaUsd, sobranteUsd y faltanteUsd con 4 decimales
  const totalIngresadoUsd = totalBsEnUsd + efectivoUsdFinal + zelleUsdFinal;
  const diferenciaUsd =
    (tasa ?? 0) > 0
      ? Number(
          (totalIngresadoUsd - totalCajaMenosValesUsd).toFixed(4)
        )
      : 0;

  // Recalcular costo cuando costosInventario se carga (después de todas las declaraciones)
  useEffect(() => {
    if (deshabilitarCajero && costosInventario.size > 0 && facturasProcesadas.length > 0) {
      let nuevoCosto = 0;
      let itemsConCosto = 0;
      let itemsSinCosto = 0;
      
      facturasProcesadas.forEach((factura: any) => {
        if (factura.items && Array.isArray(factura.items)) {
          factura.items.forEach((item: any) => {
            const productoId = item.producto_id || item._id || item.id;
            const costoItem = costosInventario.get(productoId);
            
            if (costoItem && costoItem > 0) {
              nuevoCosto += costoItem * (item.cantidad || 0);
              itemsConCosto++;
            } else {
              // Intentar usar costo_unitario del item como fallback
              const costoFallback = item.costo_unitario || 0;
              if (costoFallback > 0) {
                nuevoCosto += costoFallback * (item.cantidad || 0);
                itemsConCosto++;
              } else {
                itemsSinCosto++;
                console.warn(`Item sin costo en modal: producto_id=${productoId}, nombre=${item.nombre || 'N/A'}`);
              }
            }
          });
        }
      });
      
      console.log(`Recálculo de costo: nuevoCosto=${nuevoCosto}, itemsConCosto=${itemsConCosto}, itemsSinCosto=${itemsSinCosto}`);
      
      // Actualizar si el nuevo costo es mayor que 0
      if (nuevoCosto > 0) {
        // Priorizar el nuevo costo si es mayor que el actual o si el actual es 0
        setCostoInventario((current) => {
          if (current === undefined || current === 0 || nuevoCosto > current) {
            console.log("✅ Actualizando costoInventario desde inventario:", nuevoCosto);
            return nuevoCosto;
          } else {
            console.log("Manteniendo costoInventario actual (mayor o igual):", current);
            return current;
          }
        });
      } else if (itemsSinCosto > 0) {
        console.warn(`⚠️ No se pudo calcular costo: ${itemsSinCosto} items sin costo en inventario`);
      }
    }
  }, [costosInventario, facturasProcesadas, deshabilitarCajero]);

  const validar = () => {
    if (!cajero.trim()) return "El campo 'Cajero' es obligatorio.";
    if (!turno.trim()) return "El campo 'Turno' es obligatorio.";
    if (cajaNumero <= 0) return "El número de caja debe ser mayor a 0.";
    if ((tasa ?? 0) <= 0) return "La tasa debe ser mayor a 0.";
    if (
      costoInventario === undefined ||
      isNaN(costoInventario) ||
      costoInventario <= 0
    )
      return "El campo 'Costo Inventario' es obligatorio y debe ser mayor a 0.";
    if (
      (devolucionesBs ?? 0) < 0 ||
      recargaBsFinal < 0 ||
      pagomovilBsFinal < 0 ||
      efectivoBsFinal < 0 ||
      efectivoUsdFinal < 0 ||
      zelleUsdFinal < 0 ||
      valesUsdFinal < 0
    )
      return "Los montos no pueden ser negativos.";
    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError("");
    setSuccess("");
    const errorMsg = validar();
    if (errorMsg) {
      setError(errorMsg);
      return;
    }
    // Validar imágenes: debe haber al menos una
    const imagenesValidas = imagenesCuadre.filter(
      (img): img is string => !!img
    );
    if (imagenesValidas.length === 0) {
      setError("Debe adjuntar al menos una imagen (máx. 3).");
      return;
    }
    // Mostrar confirmación siempre
    setShowConfirm(true);
  };

  const doSubmit = async () => {
    setLoading(true);
    // Detectar si viene desde punto de venta (tiene datos prellenados)
    const desdePuntoVenta = !!(
      cajeroPrellenado || 
      tasaPrellenada || 
      totalCajaSistemaUsd || 
      costoInventarioPrellenado
    );
    
    // Preparar puntos de venta con valores ingresados o calculados
    const puntosVentaFormateados = puntosVenta.map((pv) => ({
      banco: pv.banco,
      puntoDebito: pv.puntoDebitoIngresado ?? Number(pv.puntoDebito || 0),
      puntoCredito: pv.puntoCreditoIngresado ?? Number(pv.puntoCredito || 0),
    }));
    
    const cuadre = {
      dia,
      cajaNumero,
      tasa,
      turno,
      cajero,
      cajeroId: cajeros.find((c) => c.NOMBRE === cajero)?.ID || "",
      totalCajaSistemaBs: totalCajaSistemaUsdFinal * (tasa ?? 0), // Convertir USD a Bs para compatibilidad
      devolucionesBs: devolucionesBs ?? 0,
      recargaBs: recargaBsFinal,
      pagomovilBs: pagomovilBsFinal,
      puntosVenta: puntosVentaFormateados,
      efectivoBs: efectivoBsFinal,
      valesUsd: valesUsdFinal,
      totalBs: Number(totalBsIngresados.toFixed(4)),
      totalBsEnUsd: Number(totalBsEnUsd.toFixed(4)),
      totalCajaSistemaMenosVales: Number(totalCajaMenosValesUsd.toFixed(4)),
      efectivoUsd: efectivoUsdFinal,
      zelleUsd: zelleUsdFinal,
      diferenciaUsd,
      sobranteUsd: diferenciaUsd > 0 ? Number(diferenciaUsd.toFixed(4)) : 0,
      faltanteUsd:
        diferenciaUsd < 0 ? Number(Math.abs(diferenciaUsd).toFixed(4)) : 0,
      delete: false,
      estado: "wait",
      fondoCaja: fondoActual ? {
        efectivoBs: fondoActual.efectivoBs,
        efectivoUsd: fondoActual.efectivoUsd,
        metodoPagoBs: fondoActual.metodoPagoBs,
        metodoPagoUsd: fondoActual.metodoPagoUsd,
      } : undefined,
      nombreFarmacia: (() => {
        const usuario = (() => {
          try {
            const raw = localStorage.getItem("usuario");
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        })();
        const farmacias = usuario?.farmacias || {};
        return farmacias[farmacia] || "";
      })(),
      costoInventario: costoInventario && costoInventario > 0 ? costoInventario : (costoInventarioPrellenado && costoInventarioPrellenado > 0 ? costoInventarioPrellenado : 0),
      imagenesCuadre: imagenesCuadre
        .filter((img): img is string => img !== null)
        .slice(0, 4),
      desde_punto_venta: desdePuntoVenta, // CRÍTICO: indica que NO se debe sumar al pendiente
    };
    
    // Validar y loggear costoInventario antes de enviar
    console.log("=== VALIDACIÓN DE COSTO INVENTARIO ===");
    console.log("costoInventario (estado):", costoInventario);
    console.log("costoInventarioPrellenado:", costoInventarioPrellenado);
    console.log("totalesFacturas.costoInventario:", totalesFacturas.costoInventario);
    console.log("costoInventario final a enviar:", cuadre.costoInventario);
    console.log("costosInventario.size:", costosInventario.size);
    console.log("facturasProcesadas.length:", facturasProcesadas.length);
    
    if (!cuadre.costoInventario || cuadre.costoInventario <= 0) {
      console.error("⚠️ ADVERTENCIA: costoInventario es 0 o inválido. El backend usará 0.0 por defecto.");
      console.error("Esto puede indicar que:");
      console.error("1. No hay facturas procesadas");
      console.error("2. Los costos del inventario no se cargaron correctamente");
      console.error("3. Los producto_id no coinciden entre facturas e inventario");
    } else {
      console.log("✅ costoInventario válido:", cuadre.costoInventario);
    }

    console.log("Cuadre object being sent:", cuadre); // Log the cuadre object
    console.log("Valor de valesUsd antes de enviar:", valesUsd); // Log adicional para depuración

    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      const response = await fetch(`${API_BASE_URL}/agg/cuadre/${farmacia}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(cuadre),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || "Error al guardar el cuadre");
      }
      setSuccess("¡Cuadre guardado exitosamente!");
      setError("");
      setTimeout(() => {
        // Si viene desde punto de venta, llamar a onCerrarCajaCompleto para limpiar todo
        if (onCerrarCajaCompleto) {
          onCerrarCajaCompleto();
        }
        onClose();
      }, 300);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    await doSubmit();
  };

  const handleCancelConfirm = () => {
    setShowConfirm(false);
  };

  // Limpia mensajes al cerrar el modal
  const handleClose = () => {
    setSuccess("");
    setError("");
    onClose();
  };

  useEffect(() => {
    // Obtener cajeros asociados a la farmacia seleccionada
    fetch(`${API_BASE_URL}/cajeros`)
      .then((res) => res.json())
      .then((data) => {
        const filtrados = data.filter(
          (c: Cajero) => c.FARMACIAS && c.FARMACIAS[farmacia]
        );
        setCajeros(filtrados);
      })
      .catch(() => setCajeros([]));
  }, [farmacia]);


  return (
    <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="overflow-auto max-h-[95vh] w-full max-w-lg sm:max-w-xl md:max-w-2xl p-0 relative rounded-2xl shadow-2xl bg-white border border-blue-200 animate-fade-in">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-red-500 transition-colors z-10"
          aria-label="Cerrar"
        >
          ×
        </button>
        <form
          onSubmit={handleSubmit}
          className="p-2 xs:p-4 sm:p-8 w-full relative"
        >
          <h2 className="text-2xl font-extrabold mb-6 text-blue-700 text-center tracking-tight drop-shadow-sm">
            Agregar Cuadre
          </h2>
          {error && (
            <div className="mb-3 text-red-600 text-sm font-semibold text-center bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
          {success && (
            <div className="mb-3 text-green-600 text-sm font-semibold text-center bg-green-50 border border-green-200 rounded p-2">
              {success}
            </div>
          )}
          
          {/* Sección de Fondo de Caja - Solo lectura cuando viene desde punto de venta (al cerrar caja) */}
          {deshabilitarCajero && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-blue-800 mb-3">Fondo de Caja</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Efectivo en Bs
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={fondoCajaLocal?.efectivoBs || 0}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Efectivo en USD
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={fondoCajaLocal?.efectivoUsd || 0}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700 cursor-not-allowed"
                    placeholder="0.00"
                  />
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                El fondo de caja es solo visible y no afecta los cálculos. El fondo no se puede modificar al cerrar caja.
              </p>
            </div>
          )}
          
          {/* Mostrar Fondo de Caja en modo solo lectura si NO viene desde punto de venta */}
          {!deshabilitarCajero && fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-blue-800 mb-2">Fondo de Caja</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Efectivo Bs:</span>
                  <span className="font-semibold ml-2">
                    {fondoCaja.efectivoBs.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} Bs
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Efectivo USD:</span>
                  <span className="font-semibold ml-2">
                    ${fondoCaja.efectivoUsd.toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                El fondo se restará del total para no afectar las ventas
              </p>
            </div>
          )}
          
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Día
              </label>
              <input
                type="text"
                value={dia}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Caja #
              </label>
              <input
                type="number"
                step="any"
                value={cajaNumero}
                onChange={(e) => setCajaNumero(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={1}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Tasa
              </label>
              <input
                type="number"
                step="any"
                value={tasa}
                onChange={(e) => setTasa(Number(e.target.value))}
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                required
                min={0.01}
                readOnly={deshabilitarCajero}
                disabled={deshabilitarCajero}
                onWheel={(e) => e.currentTarget.blur()}
              />
              {deshabilitarCajero && (
                <p className="text-xs text-gray-500 mt-1">
                  Tasa desde punto de venta
                </p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Turno
              </label>
              <select
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
                className="w-full border rounded-lg p-2"
              >
                <option value="Mañana">Mañana</option>
                <option value="Tarde">Tarde</option>
                <option value="De Turno">De Turno</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Cajero
              </label>
              <select
                value={cajero}
                onChange={(e) => setCajero(e.target.value)}
                className={`w-full border rounded-lg p-2 ${deshabilitarCajero ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                required
                disabled={deshabilitarCajero}
              >
                <option value="">Seleccionar cajero</option>
                {cajeros.map((cj) => (
                  <option key={cj._id} value={cj.NOMBRE}>
                    {cj.NOMBRE} ({cj.ID})
                  </option>
                ))}
              </select>
              {deshabilitarCajero && (
                <p className="text-xs text-gray-500 mt-1">
                  Cajero seleccionado desde punto de venta
                </p>
              )}
            </div>
          </div>
          <hr className="my-5 border-blue-100" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Caja Sistema $
              </label>
              <input
                type="number"
                step="any"
                value={totalCajaSistemaUsdFinal.toFixed(2)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total en USD de todas las facturas
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Devoluciones Bs
              </label>
              <input
                type="number"
                step="any"
                value={devolucionesBs ?? 0}
                onChange={(e) => setDevolucionesBs(Number(e.target.value))}
                className="w-full border rounded-lg p-2"
                required
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total de devoluciones en Bs
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Recarga Bs
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={recargaBsCalculado.toFixed(2)}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculado desde facturas</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={recargaBsIngresado ?? ""}
                    onChange={(e) => setRecargaBsIngresado(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="Indique monto obtenido"
                    className="w-full border rounded-lg p-2"
                    min={0}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Indique monto obtenido</p>
                </div>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Pago Móvil Bs
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={pagomovilBsCalculado.toFixed(2)}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculado desde facturas</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={pagomovilBsIngresado ?? ""}
                    onChange={(e) => setPagomovilBsIngresado(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="Indique monto obtenido"
                    className="w-full border rounded-lg p-2"
                    min={0}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Indique monto obtenido</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Costo Inventario
              </label>
              <input
                type="number"
                step="any"
                value={costoInventario ?? ""}
                onChange={(e) =>
                  setCostoInventario(
                    e.target.value === "" ? undefined : Number(e.target.value)
                  )
                }
                className="w-full border rounded-lg p-2"
                required
                min={0.01}
                onWheel={(e) => e.currentTarget.blur()}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Puntos de Venta
              </label>
              <div className="flex flex-col gap-3">
                {puntosVenta.map((pv, idx) => (
                  <div
                    key={idx}
                    className="relative bg-blue-50 border border-blue-200 rounded-xl shadow-sm p-3 flex flex-col md:flex-row md:items-end gap-2 md:gap-4"
                  >
                    <button
                      type="button"
                      className="absolute top-2 right-2 text-red-500 text-lg font-bold hover:bg-red-100 rounded-full w-7 h-7 flex items-center justify-center transition-colors"
                      style={{
                        display: puntosVenta.length > 1 ? "block" : "none",
                      }}
                      onClick={() =>
                        setPuntosVenta(puntosVenta.filter((_, i) => i !== idx))
                      }
                      aria-label="Eliminar punto de venta"
                    >
                      ×
                    </button>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Banco
                      </label>
                      <input
                        type="text"
                        placeholder="Banco"
                        value={pv.banco}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].banco = e.target.value;
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        required
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Débito Bs (Calculado)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={tarjetaDebitoBsCalculado.toFixed(2)}
                        readOnly
                        className="border rounded-lg p-2 w-full bg-gray-100 text-gray-700"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">Desde facturas</p>
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Débito Bs (Indique monto)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Indique monto obtenido"
                        value={pv.puntoDebitoIngresado ?? ""}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].puntoDebitoIngresado = e.target.value === "" ? undefined : Number(e.target.value);
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Crédito Bs (Calculado)
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={tarjetaCreditoBsCalculado.toFixed(2)}
                        readOnly
                        className="border rounded-lg p-2 w-full bg-gray-100 text-gray-700"
                      />
                      <p className="text-xs text-gray-500 mt-0.5">Desde facturas</p>
                    </div>
                    <div className="flex-1 flex flex-col min-w-[120px]">
                      <label className="text-xs text-gray-500 mb-0.5">
                        Crédito Bs (Indique monto)
                      </label>
                      <input
                        type="number"
                        step="any"
                        placeholder="Indique monto obtenido"
                        value={pv.puntoCreditoIngresado ?? ""}
                        onChange={(e) => {
                          const arr = [...puntosVenta];
                          arr[idx].puntoCreditoIngresado = e.target.value === "" ? undefined : Number(e.target.value);
                          setPuntosVenta(arr);
                        }}
                        className="border rounded-lg p-2 w-full"
                        min={0}
                        onWheel={(e) => e.currentTarget.blur()}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="mt-3 text-blue-700 font-semibold underline text-sm hover:text-blue-900 transition-colors"
                onClick={() =>
                  setPuntosVenta([
                    ...puntosVenta,
                    { banco: "", puntoDebito: 0, puntoCredito: 0 },
                  ])
                }
              >
                + Agregar punto de venta
              </button>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Efectivo Bs
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={efectivoBsCalculado.toFixed(2)}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculado desde facturas</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={efectivoBsIngresado ?? ""}
                    onChange={(e) => setEfectivoBsIngresado(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="Indique monto obtenido"
                    className="w-full border rounded-lg p-2"
                    min={0}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Indique monto obtenido</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Vales $
              </label>
              <input
                type="number"
                step="any"
                value={valesUsdFinal.toFixed(2)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total de ventas con método de pago vales
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Bs
              </label>
              <input
                type="number"
                value={totalBsIngresados.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Efectivo Bs + Tarjetas Débito/Crédito + Pago Móvil
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Caja - Vales
              </label>
              <input
                type="number"
                value={totalCajaMenosValesUsd.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
              <p className="text-xs text-gray-500 mt-1">
                Total Caja Sistema $ menos Vales
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Total Bs en $ (calculado)
              </label>
              <input
                type="number"
                value={totalBsEnUsd.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Efectivo $
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <input
                    type="number"
                    step="any"
                    value={efectivoUsdCalculado.toFixed(2)}
                    readOnly
                    className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                  />
                  <p className="text-xs text-gray-500 mt-1">Calculado desde facturas</p>
                </div>
                <div>
                  <input
                    type="number"
                    step="any"
                    value={efectivoUsdIngresado ?? ""}
                    onChange={(e) => setEfectivoUsdIngresado(e.target.value === "" ? undefined : Number(e.target.value))}
                    placeholder="Indique monto obtenido"
                    className="w-full border rounded-lg p-2"
                    min={0}
                    onWheel={(e) => e.currentTarget.blur()}
                  />
                  <p className="text-xs text-gray-500 mt-1">Indique monto obtenido</p>
                </div>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Zelle $
              </label>
              <input
                type="number"
                step="any"
                value={zelleUsdFinal.toFixed(2)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
                min={0}
                onWheel={(e) => e.currentTarget.blur()}
              />
              <p className="text-xs text-gray-500 mt-1">
                Total de ventas con método de pago Zelle
              </p>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Diferencia $ (calculado)
              </label>
              <input
                type="number"
                value={diferenciaUsd.toFixed(4)}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-gray-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Sobrante $ (calculado)
              </label>
              <input
                type="number"
                value={diferenciaUsd > 0 ? diferenciaUsd.toFixed(4) : "0.0000"}
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-green-700"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Faltante $ (calculado)
              </label>
              <input
                type="number"
                value={
                  diferenciaUsd < 0
                    ? Math.abs(diferenciaUsd).toFixed(4)
                    : "0.0000"
                }
                readOnly
                className="w-full border rounded-lg p-2 bg-gray-100 text-red-700"
              />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-1 md:gap-4">
              {[0, 1, 2, 3].map((idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-start relative group"
                >
                  <UpFile
                    onUploadSuccess={(objectName: string) => {
                      setImagenesCuadre((prev) => {
                        const newArr = [...prev];
                        newArr[idx] = objectName;
                        return newArr;
                      });
                    }}
                    label={`Adjuntar imagen ${idx + 1}`}
                    maxSizeMB={4}
                    initialFileUrl={imagenesCuadre[idx] || undefined}
                  />
                  {imagenesCuadre[idx] && (
                    <div className="mt-1 relative inline-block">
                      <ImageDisplay
                        imageName={imagenesCuadre[idx]!}
                        style={{
                          maxWidth: 200,
                          maxHeight: 200,
                          borderRadius: 8,
                          marginTop: 8,
                          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                        }}
                      />
                      <button
                        type="button"
                        className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow-md text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors z-20 opacity-80 group-hover:opacity-100"
                        title="Eliminar imagen"
                        onClick={() => {
                          setImagenesCuadre((prev) => {
                            const newArr = [...prev];
                            newArr[idx] = null;
                            return newArr;
                          });
                        }}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
          <button
            type="submit"
            className={`mt-6 w-full py-2 px-4 font-semibold rounded-lg shadow-md text-white transition-colors duration-200 ${
              loading
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            disabled={loading}
            aria-disabled={loading}
          >
            {loading ? "Guardando..." : "Guardar"}
          </button>
        </form>
        {showConfirm && (
          <div className="fixed inset-0 bg-white bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full border border-blue-200">
              <h3 className="text-lg font-bold text-blue-700 mb-2">
                Confirmar cuadre
              </h3>
              {Math.abs(diferenciaUsd) > 0.009 ? (
                <>
                  <p className="mb-2 text-gray-700">
                    Hay un {diferenciaUsd > 0 ? "sobrante" : "faltante"} en el
                    cuadre.
                  </p>
                  <div className="mb-4 text-center">
                    {diferenciaUsd > 0 && (
                      <span className="text-green-700 font-semibold">
                        Sobrante: ${diferenciaUsd.toFixed(4)}
                      </span>
                    )}
                    {diferenciaUsd < 0 && (
                      <span className="text-red-700 font-semibold">
                        Faltante: ${Math.abs(diferenciaUsd).toFixed(4)}
                      </span>
                    )}
                  </div>
                </>
              ) : (
                <p className="mb-4 text-gray-700">¿Desea guardar el cuadre?</p>
              )}
              <p className="mb-4 text-sm text-gray-500">
                ¿Desea continuar y guardar el cuadre?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={handleConfirm}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg"
                  disabled={loading}
                >
                  Sí, guardar
                </button>
                <button
                  onClick={handleCancelConfirm}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded-lg"
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AgregarCuadreModal;
