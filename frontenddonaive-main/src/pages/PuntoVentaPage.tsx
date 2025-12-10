import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { fetchWithAuth } from "@/lib/api";
import AgregarCuadreModal from "@/components/AgregarCuadreModal";
import { TicketFactura } from "@/components/TicketFactura";
import ModalDevolucionCompra from "@/components/ModalDevolucionCompra";
import { Smartphone, Wallet, CreditCard, Receipt, Banknote } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Sucursal {
  id: string;
  nombre: string;
}

interface Cajero {
  _id: string;
  ID?: string;
  NOMBRE: string;
  FARMACIAS?: Record<string, string>;
}

interface Lote {
  lote: string;
  fecha_vencimiento?: string;
  cantidad?: number;
}

interface StockPorSucursal {
  sucursal_id: string;
  sucursal_nombre: string;
  cantidad: number;
  stock?: number; // Alias para compatibilidad
}

interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  codigo_producto?: string; // Alternativa del backend
  descripcion?: string; // Alternativa del backend
  descripcion_producto?: string; // Alternativa del backend
  marca?: string; // Alternativa del backend
  marca_producto?: string; // Alternativa del backend
  precio: number;
  precio_usd?: number;
  precio_unitario?: number; // Alternativa del backend
  precio_venta?: number; // Alternativa del backend
  stock?: number;
  cantidad?: number; // Stock total en la sucursal actual (suma de lotes)
  lotes?: Lote[]; // Array de lotes con fechas de vencimiento
  sucursal?: string;
  stock_por_sucursal?: StockPorSucursal[]; // Stock en todas las sucursales
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number; // Precio en Bs (con descuento aplicado si hay cliente)
  precio_unitario_usd: number; // Precio en USD (con descuento aplicado si hay cliente)
  precio_unitario_original: number; // Precio original en Bs (sin descuento)
  precio_unitario_original_usd: number; // Precio original en USD (sin descuento)
  subtotal: number; // Subtotal en Bs (con descuento)
  subtotal_usd: number; // Subtotal en USD (con descuento)
  descuento_aplicado?: number; // Porcentaje de descuento aplicado
}

interface Banco {
  _id?: string;
  id?: string;
  numero_cuenta: string;
  nombre_banco: string;
  nombre_titular: string;
  saldo: number;
  divisa: "USD" | "BS"; // Backend espera "BS" en mayúsculas
  tipo_metodo?: "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "tarjeta_credito" | "vales";
  activo?: boolean;
}

interface MetodoPago {
  tipo: "efectivo" | "tarjeta" | "transferencia" | "zelle" | "banco";
  monto: number;
  divisa: "Bs" | "USD";
  banco_id?: string; // ID del banco si el método es "banco"
}

interface Cliente {
  _id?: string;
  id?: string;
  cedula: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  porcentaje_descuento?: number;
}

const PuntoVentaPage: React.FC = () => {
  // Estados de configuración inicial
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [showSucursalModal, setShowSucursalModal] = useState(true);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<Sucursal | null>(null);
  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  const [cajeroSeleccionado, setCajeroSeleccionado] = useState<Cajero | null>(null);
  const [showCajeroModal, setShowCajeroModal] = useState(false);
  const [loadingCajeros, setLoadingCajeros] = useState(false);

  // Estados del POS
  const [tasaDelDia, setTasaDelDia] = useState<number>(0);
  const [tasaInput, setTasaInput] = useState<string>("");
  const [busquedaItem, setBusquedaItem] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [showCantidadModal, setShowCantidadModal] = useState(false);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadInput, setCantidadInput] = useState("1");
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [showPagoModal, setShowPagoModal] = useState(false);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [metodoPagoActual, setMetodoPagoActual] = useState<{ tipo: string; divisa: string }>({ 
    tipo: "efectivo", 
    divisa: "USD" 
  });
  const [montoPago, setMontoPago] = useState("");
  const [productoConStockAbierto, setProductoConStockAbierto] = useState<string | null>(null);
  const [mostrarDarVuelto, setMostrarDarVuelto] = useState(false);
  const [metodoVuelto, setMetodoVuelto] = useState<{ tipo: string; divisa: string; monto: string }>({ 
    tipo: "efectivo", 
    divisa: "USD",
    monto: ""
  });
  
  // Estados de clientes
  const [showClienteModal, setShowClienteModal] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [busquedaCliente, setBusquedaCliente] = useState("");
  const [clientesEncontrados, setClientesEncontrados] = useState<Cliente[]>([]);
  const [buscandoClientes, setBuscandoClientes] = useState(false);
  const [creandoCliente, setCreandoCliente] = useState(false);
  
  // Formulario de cliente
  const [cedulaCliente, setCedulaCliente] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [direccionCliente, setDireccionCliente] = useState("");
  const [telefonoCliente, setTelefonoCliente] = useState("");
  const [porcentajeDescuentoCliente, setPorcentajeDescuentoCliente] = useState("");
  
  // Estados para descuento por divisa
  const [descuentoPorDivisaActivo, setDescuentoPorDivisaActivo] = useState(false);
  const [porcentajeDescuentoDivisa, setPorcentajeDescuentoDivisa] = useState("");
  
  // Estados para cerrar caja
  const [showCerrarCajaModal, setShowCerrarCajaModal] = useState(false);
  
  // Estados para apertura de caja (fondo)
  const [showFondoModal, setShowFondoModal] = useState(false);
  const [fondoCaja, setFondoCaja] = useState<{
    efectivoBs: number;
    efectivoUsd: number;
    metodoPagoBs?: string; // banco_id para Bs
    metodoPagoUsd?: string; // banco_id para USD
  } | null>(null);
  const [totalCajaSistemaUsd, setTotalCajaSistemaUsd] = useState<number>(0);
  const [costoInventarioTotal, setCostoInventarioTotal] = useState<number>(0);
  
  // Estados para facturas procesadas
  const [mostrarFacturasProcesadas, setMostrarFacturasProcesadas] = useState(false);
  const [facturasProcesadas, setFacturasProcesadas] = useState<any[]>([]);
  const [cargandoFacturas, setCargandoFacturas] = useState(false);
  const [busquedaFactura, setBusquedaFactura] = useState("");
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<any | null>(null);
  const [showFacturaModal, setShowFacturaModal] = useState(false);
  const [facturaParaDevolucion, setFacturaParaDevolucion] = useState<any | null>(null);
  const [showModalDevolucion, setShowModalDevolucion] = useState(false);
  
  // Estados para bancos
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoSeleccionadoPago, setBancoSeleccionadoPago] = useState<string>("");
  const [bancoSeleccionadoVuelto, setBancoSeleccionadoVuelto] = useState<string>("");
  
  // Estado para el ticket de factura
  const [ticketData, setTicketData] = useState<{
    numeroFactura: string;
    fecha: string;
    hora: string;
    sucursal: string;
    cajero: string;
    cliente?: { nombre: string; cedula?: string };
    items: Array<{
      nombre: string;
      codigo?: string;
      cantidad: number;
      precio_unitario: number;
      precio_unitario_usd: number;
      subtotal: number;
      subtotal_usd: number;
      descuento_aplicado?: number;
    }>;
    metodosPago: Array<{ tipo: string; monto: number; divisa: "USD" | "Bs" }>;
    totalBs: number;
    totalUsd: number;
    tasaDia: number;
    porcentajeDescuento?: number;
    vuelto?: { monto: number; divisa: "USD" | "Bs" };
  } | null>(null);

  // Obtener usuario actual
  const getUsuarioActual = () => {
    try {
      const usuarioRaw = localStorage.getItem("usuario");
      if (usuarioRaw) {
        return JSON.parse(usuarioRaw);
      }
    } catch (error) {
      console.error("Error al obtener usuario:", error);
    }
    return null;
  };

  // Función para obtener el ícono según el tipo de método
  const getIconoMetodo = (tipoMetodo?: string) => {
    switch (tipoMetodo) {
      case "pago_movil":
        return <Smartphone className="w-4 h-4 inline-block mr-1" />;
      case "efectivo":
        return <Banknote className="w-4 h-4 inline-block mr-1" />;
      case "zelle":
        return <Wallet className="w-4 h-4 inline-block mr-1" />;
      case "tarjeta_debit":
        return <CreditCard className="w-4 h-4 inline-block mr-1" />;
      case "tarjeta_credito":
        return <CreditCard className="w-4 h-4 inline-block mr-1" />;
      case "vales":
        return <Receipt className="w-4 h-4 inline-block mr-1" />;
      default:
        return <Smartphone className="w-4 h-4 inline-block mr-1" />;
    }
  };

  // Función para obtener el nombre del tipo de método
  const getNombreMetodo = (tipoMetodo?: string) => {
    switch (tipoMetodo) {
      case "pago_movil":
        return "Pago Móvil";
      case "efectivo":
        return "Efectivo";
      case "zelle":
        return "Zelle";
      case "tarjeta_debit":
        return "Tarjeta Débit";
      case "tarjeta_credito":
        return "Tarjeta de Crédito";
      case "vales":
        return "Vales";
      default:
        return "Pago Móvil";
    }
  };

  // Cargar bancos
  const fetchBancos = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos`);
      if (res.ok) {
        const data = await res.json();
        // Normalizar divisa a mayúsculas (backend puede enviar "BS" o "Bs")
        const bancosNormalizados = (data.bancos || data || []).map((banco: any) => ({
          ...banco,
          divisa: banco.divisa?.toUpperCase() || "USD" // Normalizar a "USD" o "BS"
        }));
        setBancos(bancosNormalizados);
      } else {
        console.error("Error al obtener bancos");
        setBancos([]);
      }
    } catch (error) {
      console.error("Error al obtener bancos:", error);
      setBancos([]);
    }
  };

  // Cargar sucursales y tasa del día
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Cargar bancos
        await fetchBancos();
        
        // Cargar sucursales (farmacias) usando fetchWithAuth
        const resSucursales = await fetchWithAuth(`${API_BASE_URL}/farmacias`);
        if (resSucursales.ok) {
          const dataSucursales = await resSucursales.json();
          const listaSucursales = dataSucursales.farmacias
            ? Object.entries(dataSucursales.farmacias).map(([id, nombre]) => ({
                id,
                nombre: String(nombre),
              }))
            : Object.entries(dataSucursales).map(([id, nombre]) => ({
                id,
                nombre: String(nombre),
              }));
          setSucursales(listaSucursales);
        }

        // Cargar tasa del día usando fetchWithAuth
        const hoy = new Date().toISOString().split('T')[0];
        const resTasa = await fetchWithAuth(`${API_BASE_URL}/punto-venta/tasa-del-dia?fecha=${hoy}`);
        if (resTasa.ok) {
          const dataTasa = await resTasa.json();
          setTasaDelDia(dataTasa.tasa || 0);
          setTasaInput(dataTasa.tasa?.toString() || "");
        }
      } catch (error) {
        console.error("Error al cargar datos:", error);
      }
    };
    fetchData();
  }, []);

  // Caché simple para búsquedas recientes
  const cacheBusquedas = React.useRef<Map<string, { productos: any[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Búsqueda de productos en tiempo real optimizada
  useEffect(() => {
    let abortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    const busqueda = busquedaItem.trim();
    
    if (busqueda.length >= 1 && sucursalSeleccionada) {
      // Verificar caché primero
      const cacheKey = `${sucursalSeleccionada.id}_${busqueda.toLowerCase()}`;
      const cached = cacheBusquedas.current.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
        console.log(`✅ [PUNTO_VENTA] Usando caché para: "${busqueda}"`);
        setProductosEncontrados(cached.productos);
        setBuscandoProductos(false);
        return;
      }

      // Detectar si es un código de barras (solo números y longitud >= 8)
      const esCodigoBarras = /^\d{8,}$/.test(busqueda);
      
      // Para códigos de barras, búsqueda más rápida (150ms)
      // Para búsquedas cortas (1-2 caracteres), debounce de 300ms
      // Para búsquedas más largas, debounce de 400ms
      const debounceTime = esCodigoBarras ? 150 : (busqueda.length <= 2 ? 300 : 400);
      
      timeoutId = setTimeout(async () => {
        // Crear nuevo AbortController para esta búsqueda
        abortController = new AbortController();
        setBuscandoProductos(true);
        
        try {
          const url = `${API_BASE_URL}/punto-venta/productos/buscar?q=${encodeURIComponent(busqueda)}&sucursal=${sucursalSeleccionada.id}`;
          console.log(`🔍 [PUNTO_VENTA] Buscando productos en: ${url}`);
          
          const res = await fetchWithAuth(url, { signal: abortController.signal });
          
          if (res.ok && !abortController.signal.aborted) {
            const data = await res.json();
            console.log(`🔍 [PUNTO_VENTA] Respuesta completa:`, JSON.stringify(data, null, 2));
            console.log(`🔍 [PUNTO_VENTA] Tipo de dato:`, typeof data);
            console.log(`🔍 [PUNTO_VENTA] Es array?:`, Array.isArray(data));
            
            // Normalizar la respuesta - puede venir como array directo o dentro de un objeto
            let productosArray: any[] = [];
            if (Array.isArray(data)) {
              productosArray = data;
              console.log(`✅ [PUNTO_VENTA] Formato: Array directo`);
            } else if (data && Array.isArray(data.productos)) {
              productosArray = data.productos;
              console.log(`✅ [PUNTO_VENTA] Formato: data.productos`);
            } else if (data && Array.isArray(data.items)) {
              productosArray = data.items;
              console.log(`✅ [PUNTO_VENTA] Formato: data.items`);
            } else if (data && Array.isArray(data.resultados)) {
              productosArray = data.resultados;
              console.log(`✅ [PUNTO_VENTA] Formato: data.resultados`);
            } else if (data && typeof data === 'object') {
              // Si es un objeto, intentar extraer arrays
              const valores = Object.values(data);
              const arrays = valores.filter(Array.isArray);
              if (arrays.length > 0) {
                productosArray = arrays.flat() as any[];
                console.log(`✅ [PUNTO_VENTA] Formato: Objeto con arrays`);
              } else {
                console.warn(`⚠️ [PUNTO_VENTA] No se encontró array en la respuesta`);
              }
            }
            
            // NOTA: Los precios deben venir del backend. 
            // Si un producto no tiene precio, el backend debe calcularlo desde costo + utilidad.
            // Eliminamos la búsqueda de precios desde compras para mejorar el rendimiento.
            
            console.log(`✅ [PUNTO_VENTA] Productos encontrados: ${productosArray.length}`);
            if (productosArray.length > 0) {
              console.log(`📦 [PUNTO_VENTA] Primer producto:`, productosArray[0]);
              console.log(`📦 [PUNTO_VENTA] Campos del primer producto:`, Object.keys(productosArray[0]));
              console.log(`💰 [PUNTO_VENTA] Precio del primer producto:`, productosArray[0].precio || productosArray[0].precio_usd || productosArray[0].precio_unitario);
            } else {
              console.warn(`⚠️ [PUNTO_VENTA] No se encontraron productos para la búsqueda: "${busqueda}"`);
            }
            
            // Guardar en caché
            cacheBusquedas.current.set(cacheKey, {
              productos: productosArray,
              timestamp: Date.now()
            });
            
            // Limpiar caché antiguo (más de 10 minutos)
            const ahora = Date.now();
            for (const [key, value] of cacheBusquedas.current.entries()) {
              if (ahora - value.timestamp > CACHE_DURATION * 2) {
                cacheBusquedas.current.delete(key);
              }
            }
            
            setProductosEncontrados(productosArray);
          } else if (res.status === 404 && !abortController.signal.aborted) {
            // Si el endpoint no existe, intentar cargar desde inventarios
            console.warn(`⚠️ [PUNTO_VENTA] Endpoint de búsqueda no encontrado, intentando cargar desde inventarios...`);
            await cargarProductosDesdeInventarios(busqueda, abortController);
          } else if (!abortController.signal.aborted) {
            const errorText = await res.text().catch(() => '');
            console.warn(`⚠️ [PUNTO_VENTA] Error en búsqueda, status: ${res.status}, error: ${errorText}`);
            // Intentar cargar desde inventarios como fallback
            await cargarProductosDesdeInventarios(busqueda, abortController);
          }
        } catch (error: any) {
          // Ignorar errores de cancelación
          if (error.name !== 'AbortError' && !abortController?.signal.aborted) {
            console.error("Error al buscar productos:", error);
            setProductosEncontrados([]);
          }
        } finally {
          // Solo actualizar el estado si la petición no fue cancelada
          if (!abortController?.signal.aborted) {
            setBuscandoProductos(false);
          }
        }
      }, debounceTime);

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (abortController) {
          abortController.abort();
        }
        setBuscandoProductos(false);
      };
    } else {
      setProductosEncontrados([]);
      setBuscandoProductos(false);
    }
  }, [busquedaItem, sucursalSeleccionada]);

  // Función para cargar productos desde inventarios como fallback
  const cargarProductosDesdeInventarios = async (busqueda: string, abortController: AbortController) => {
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // Obtener todos los inventarios de la sucursal
      const resInventarios = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: { "Authorization": `Bearer ${token}` },
        signal: abortController.signal
      });

      if (!resInventarios.ok || abortController.signal.aborted) return;

      const inventariosData = await resInventarios.json();
      const inventariosArray = Array.isArray(inventariosData) ? inventariosData : [];
      
      // Filtrar inventarios de la sucursal actual
      const inventariosSucursal = inventariosArray.filter((inv: any) => 
        inv.farmacia === sucursalSeleccionada?.id || inv.sucursal_id === sucursalSeleccionada?.id
      );

      console.log(`🔍 [PUNTO_VENTA] Inventarios encontrados para sucursal: ${inventariosSucursal.length}`);

      // Cargar items de todos los inventarios en paralelo
      const promesasItems = inventariosSucursal.map(async (inventario: any) => {
        try {
          const resItems = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
            headers: { "Authorization": `Bearer ${token}` },
            signal: abortController.signal
          });

          if (resItems.ok && !abortController.signal.aborted) {
            const items = await resItems.json();
            const itemsArray = Array.isArray(items) ? items : [];
            
            // Filtrar items que coincidan con la búsqueda
            const busquedaLower = busqueda.toLowerCase();
            return itemsArray.filter((item: any) => {
              const codigo = (item.codigo || item.codigo_producto || "").toLowerCase();
              const descripcion = (item.descripcion || item.nombre || item.descripcion_producto || "").toLowerCase();
              const marca = (item.marca || item.marca_producto || "").toLowerCase();
              return codigo.includes(busquedaLower) || descripcion.includes(busquedaLower) || marca.includes(busquedaLower);
            });
          } else if (resItems.status === 404) {
            // Intentar endpoint alternativo
            try {
              const resAlt = await fetch(`${API_BASE_URL}/productos?inventario_id=${inventario._id}`, {
                headers: { "Authorization": `Bearer ${token}` },
                signal: abortController.signal
              });
              if (resAlt.ok && !abortController.signal.aborted) {
                const data = await resAlt.json();
                const productos = Array.isArray(data) ? data : (data.productos || data.items || []);
                const busquedaLower = busqueda.toLowerCase();
                return productos.filter((item: any) => {
                  const codigo = (item.codigo || item.codigo_producto || "").toLowerCase();
                  const descripcion = (item.descripcion || item.nombre || item.descripcion_producto || "").toLowerCase();
                  const marca = (item.marca || item.marca_producto || "").toLowerCase();
                  return codigo.includes(busquedaLower) || descripcion.includes(busquedaLower) || marca.includes(busquedaLower);
                });
              }
            } catch (err) {
              if (err instanceof Error && err.name !== 'AbortError') {
                console.warn(`⚠️ [PUNTO_VENTA] Error al obtener productos alternativos:`, err);
              }
            }
          }
          return [];
        } catch (err) {
          if (err instanceof Error && err.name !== 'AbortError') {
            console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
          }
          return [];
        }
      });

      const resultados = await Promise.all(promesasItems);
      const productosPlanaos = resultados.flat();
      
      // NOTA: Los precios deben venir del backend directamente.
      // Eliminamos la búsqueda de precios desde compras para mejorar el rendimiento.
      // El backend debe calcular los precios desde costo + utilidad si no están definidos.

      // Normalizar productos
      const productosNormalizados = productosPlanaos.map((item: any) => {
        const costo = Number(item.costo_unitario || item.costo || 0);
        const precioInventario = Number(item.precio_unitario || item.precio || item.precio_venta || 0);
        
        // Usar precio del inventario directamente
        let precioFinal = precioInventario;
        
        // Si aún no hay precio, intentar calcular desde costo y utilidad
        if (precioFinal === 0 && costo > 0) {
          const utilidadPorcentaje = Number(item.utilidad || item.utilidad_contable || item.porcentaje_ganancia || 0);
          if (utilidadPorcentaje > 0) {
            if (utilidadPorcentaje <= 100) {
              precioFinal = costo * (1 + utilidadPorcentaje / 100);
            } else {
              precioFinal = costo + utilidadPorcentaje;
            }
          }
        }
        
        return {
          id: item._id || item.id || `${item.codigo}_${Math.random()}`,
          nombre: item.descripcion || item.nombre || item.descripcion_producto || "",
          codigo: item.codigo || item.codigo_producto || "",
          descripcion: item.descripcion || item.nombre || item.descripcion_producto || "",
          marca: item.marca || item.marca_producto || "",
          precio: precioFinal,
          precio_usd: precioFinal,
          precio_unitario: precioFinal,
          cantidad: item.cantidad || item.existencia || item.stock || 0,
          stock: item.cantidad || item.existencia || item.stock || 0,
          lotes: item.lotes || [],
          sucursal: sucursalSeleccionada?.id || ""
        };
      });

      console.log(`✅ [PUNTO_VENTA] Productos cargados desde inventarios: ${productosNormalizados.length}`);
      if (!abortController.signal.aborted) {
        setProductosEncontrados(productosNormalizados);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError' && !abortController.signal.aborted) {
        console.error("Error al cargar productos desde inventarios:", error);
        setProductosEncontrados([]);
      }
    }
  };

  // Cerrar dropdown de stock al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.stock-dropdown-container')) {
        setProductoConStockAbierto(null);
      }
    };

    if (productoConStockAbierto) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [productoConStockAbierto]);

  // Búsqueda de clientes en tiempo real optimizada
  useEffect(() => {
    let abortController: AbortController | null = null;
    let timeoutId: NodeJS.Timeout | null = null;
    
    if (busquedaCliente.trim().length >= 1) {
      timeoutId = setTimeout(async () => {
        // Crear nuevo AbortController para esta búsqueda
        abortController = new AbortController();
        setBuscandoClientes(true);
        
        try {
          const res = await fetchWithAuth(
            `${API_BASE_URL}/clientes/buscar?q=${encodeURIComponent(busquedaCliente.trim())}`,
            { signal: abortController.signal }
          );
          
          if (res.ok) {
            const data = await res.json();
            console.log("🔍 [CLIENTES] Respuesta del backend:", data);
            
            // Manejar diferentes formatos de respuesta
            let clientesArray: any[] = [];
            if (Array.isArray(data)) {
              clientesArray = data;
            } else if (data && Array.isArray(data.clientes)) {
              clientesArray = data.clientes;
            } else if (data && Array.isArray(data.data)) {
              clientesArray = data.data;
            } else if (data && Array.isArray(data.items)) {
              clientesArray = data.items;
            } else if (data && typeof data === 'object') {
              // Intentar extraer cualquier array del objeto
              const keys = Object.keys(data);
              for (const key of keys) {
                if (Array.isArray(data[key])) {
                  clientesArray = data[key];
                  break;
                }
              }
            }
            
            console.log(`✅ [CLIENTES] Clientes encontrados: ${clientesArray.length}`);
            setClientesEncontrados(clientesArray);
          } else {
            const errorData = await res.json().catch(() => null);
            console.error("❌ [CLIENTES] Error en respuesta:", res.status, errorData);
            setClientesEncontrados([]);
          }
        } catch (error: any) {
          // Ignorar errores de cancelación
          if (error.name !== 'AbortError') {
            console.error("❌ [CLIENTES] Error al buscar clientes:", error);
            setClientesEncontrados([]);
          }
        } finally {
          // Solo actualizar el estado si la petición no fue cancelada
          if (!abortController?.signal.aborted) {
            setBuscandoClientes(false);
          }
        }
      }, 150); // Debounce reducido a 150ms para respuesta más rápida

      return () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        if (abortController) {
          abortController.abort();
        }
        setBuscandoClientes(false);
      };
    } else {
      setClientesEncontrados([]);
      setBuscandoClientes(false);
    }
  }, [busquedaCliente]);

  // Cargar cajeros cuando se selecciona una sucursal
  useEffect(() => {
    if (sucursalSeleccionada && !showSucursalModal) {
      const fetchCajeros = async () => {
        setLoadingCajeros(true);
        try {
          const res = await fetchWithAuth(`${API_BASE_URL}/cajeros`);
          if (res.ok) {
            const data = await res.json();
            // Transformar los datos al formato esperado
            const cajerosTransformados: Cajero[] = Array.isArray(data)
              ? data.map((cajero: any) => ({
                  _id: cajero._id || cajero.id,
                  ID: cajero.ID || cajero.id,
                  NOMBRE: cajero.NOMBRE || cajero.nombre,
                  FARMACIAS: cajero.FARMACIAS || cajero.farmacias || {},
                }))
              : [];
            setCajeros(cajerosTransformados);
            setShowCajeroModal(true);
          }
        } catch (error) {
          console.error("Error al cargar cajeros:", error);
          setCajeros([]);
        } finally {
          setLoadingCajeros(false);
        }
      };
      fetchCajeros();
    }
  }, [sucursalSeleccionada, showSucursalModal]);

  // Debug: Monitorear cambios en showFondoModal
  useEffect(() => {
    console.log("showFondoModal cambió a:", showFondoModal);
    console.log("fondoCaja actual:", fondoCaja);
  }, [showFondoModal, fondoCaja]);

  // Abrir modal de fondo automáticamente cuando se selecciona un cajero sin fondo
  useEffect(() => {
    console.log("useEffect fondo modal - cajeroSeleccionado:", cajeroSeleccionado?.NOMBRE);
    console.log("useEffect fondo modal - showCajeroModal:", showCajeroModal);
    console.log("useEffect fondo modal - fondoCaja:", fondoCaja);
    console.log("useEffect fondo modal - showFondoModal:", showFondoModal);
    
    if (cajeroSeleccionado && !showCajeroModal) {
      // Verificar si hay fondo configurado - CORREGIR: verificar correctamente null/undefined
      const tieneFondo = fondoCaja !== null && fondoCaja !== undefined && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
      
      console.log("Condiciones: tieneFondo =", tieneFondo, "(fondoCaja:", fondoCaja, "), showFondoModal =", showFondoModal);
      
      if (!tieneFondo && !showFondoModal) {
        console.log("✅ Condiciones cumplidas, abriendo modal de fondo en 500ms");
        const timer = setTimeout(() => {
          console.log("🚀 Abriendo modal de fondo AHORA - setShowFondoModal(true)");
          setShowFondoModal(true);
          // Verificar después de un momento
          setTimeout(() => {
            console.log("Verificación: showFondoModal debería ser true ahora");
          }, 100);
        }, 500);
        
        return () => {
          console.log("Limpiando timer del modal de fondo");
          clearTimeout(timer);
        };
      } else {
        console.log("❌ No se abre modal - tieneFondo:", tieneFondo, "showFondoModal:", showFondoModal);
      }
    }
  }, [cajeroSeleccionado, showCajeroModal, fondoCaja, showFondoModal]);

  const handleSeleccionarSucursal = (sucursal: Sucursal) => {
    setSucursalSeleccionada(sucursal);
    setShowSucursalModal(false);
    // Abrir modal de cajero después de seleccionar sucursal
    setTimeout(() => {
      setShowCajeroModal(true);
    }, 100);
  };

  const handleSeleccionarCajero = (cajero: Cajero) => {
    console.log("Cajero seleccionado:", cajero.NOMBRE);
    
    // Si se cambia de cajero, limpiar TODO del cajero anterior
    if (cajeroSeleccionado && cajeroSeleccionado._id !== cajero._id) {
      console.log("Cambiando de cajero, limpiando TODO del cajero anterior:", cajeroSeleccionado.NOMBRE);
      setFondoCaja(null);
      setFondoEfectivoBs("");
      setFondoEfectivoUsd("");
      setFondoBancoBs("");
      setFondoBancoUsd("");
      // Limpiar ventas del cajero anterior
      setTotalCajaSistemaUsd(0);
      setCostoInventarioTotal(0);
      // Limpiar facturas procesadas
      setFacturasProcesadas([]);
    }
    
    setCajeroSeleccionado(cajero);
    // Cerrar el modal de cajero
    setShowCajeroModal(false);
    
    // Intentar cargar fondo desde localStorage
    if (sucursalSeleccionada && sucursalSeleccionada.id) {
      const cajeroId = cajero._id || cajero.ID;
      if (cajeroId) {
        const fondoGuardado = cargarFondoCajaDesdeStorage(cajeroId, sucursalSeleccionada.id);
        if (fondoGuardado) {
          console.log("Fondo de caja encontrado en localStorage, restaurando...");
          setFondoCaja(fondoGuardado);
          // No pedir fondo si ya existe
          return;
        }
      }
    }
    
    // Solo pedir fondo si NO hay fondo configurado para este cajero
    // Si es el mismo cajero y ya tiene fondo, no pedirlo de nuevo
    const tieneFondo = fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
    const esMismoCajero = cajeroSeleccionado && cajeroSeleccionado._id === cajero._id;
    
    if (!tieneFondo || !esMismoCajero) {
      // Si no hay fondo o es un cajero diferente, limpiar y pedir fondo
      if (!esMismoCajero) {
        setFondoCaja(null);
      }
      
      // Forzar apertura del modal de fondo después de un delay
      console.log("Abriendo modal de fondo para cajero:", cajero.NOMBRE);
      setTimeout(() => {
        console.log("FORZANDO apertura del modal de fondo - setShowFondoModal(true)");
        setShowFondoModal(true);
        // Verificar inmediatamente después
        setTimeout(() => {
          console.log("Verificación inmediata: showFondoModal debería ser true");
        }, 50);
      }, 600);
    } else {
      console.log("Cajero ya tiene fondo configurado, no se pide de nuevo");
    }
  };
  
  // Estados para el modal de fondo
  const [fondoEfectivoBs, setFondoEfectivoBs] = useState<string>("");
  const [fondoEfectivoUsd, setFondoEfectivoUsd] = useState<string>("");
  const [fondoBancoBs, setFondoBancoBs] = useState<string>("");
  const [fondoBancoUsd, setFondoBancoUsd] = useState<string>("");
  
  // Función para obtener la clave de localStorage para el fondo de caja
  const getFondoCajaKey = (cajeroId: string, sucursalId: string) => {
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return `fondoCaja_${cajeroId}_${sucursalId}_${hoy}`;
  };
  
  // Función para cargar fondo de caja desde localStorage
  const cargarFondoCajaDesdeStorage = (cajeroId: string, sucursalId: string) => {
    try {
      const key = getFondoCajaKey(cajeroId, sucursalId);
      const fondoGuardado = localStorage.getItem(key);
      if (fondoGuardado) {
        const fondo = JSON.parse(fondoGuardado);
        if (fondo && (fondo.efectivoBs > 0 || fondo.efectivoUsd > 0)) {
          console.log("Fondo de caja cargado desde localStorage:", fondo);
          return fondo;
        }
      }
    } catch (error) {
      console.error("Error al cargar fondo de caja desde localStorage:", error);
    }
    return null;
  };
  
  // Función para guardar fondo de caja en localStorage
  const guardarFondoCajaEnStorage = (cajeroId: string, sucursalId: string, fondo: any) => {
    try {
      const key = getFondoCajaKey(cajeroId, sucursalId);
      localStorage.setItem(key, JSON.stringify(fondo));
      console.log("Fondo de caja guardado en localStorage con clave:", key);
    } catch (error) {
      console.error("Error al guardar fondo de caja en localStorage:", error);
    }
  };
  
  // Función para limpiar fondo de caja de localStorage
  const limpiarFondoCajaDeStorage = (cajeroId: string, sucursalId: string) => {
    try {
      const key = getFondoCajaKey(cajeroId, sucursalId);
      localStorage.removeItem(key);
      console.log("Fondo de caja eliminado de localStorage con clave:", key);
    } catch (error) {
      console.error("Error al limpiar fondo de caja de localStorage:", error);
    }
  };
  
  const handleConfirmarFondo = () => {
    if (!fondoEfectivoBs && !fondoEfectivoUsd) {
      alert("Debe ingresar al menos un monto de fondo (Bs o USD)");
      return;
    }
    
    const fondoBs = parseFloat(fondoEfectivoBs) || 0;
    const fondoUsd = parseFloat(fondoEfectivoUsd) || 0;
    
    if (fondoBs <= 0 && fondoUsd <= 0) {
      alert("Debe ingresar al menos un monto de fondo (Bs o USD) mayor a 0");
      return;
    }
    
    if (!cajeroSeleccionado || !sucursalSeleccionada) {
      alert("Error: No hay cajero o sucursal seleccionada");
      return;
    }
    
    const fondo = {
      efectivoBs: fondoBs,
      efectivoUsd: fondoUsd,
      metodoPagoBs: fondoBancoBs || undefined,
      metodoPagoUsd: fondoBancoUsd || undefined,
    };
    
    setFondoCaja(fondo);
    
    // Guardar en localStorage para que persista entre recargas
    const cajeroId = cajeroSeleccionado._id || cajeroSeleccionado.ID;
    if (cajeroId && sucursalSeleccionada && sucursalSeleccionada.id) {
      guardarFondoCajaEnStorage(cajeroId, sucursalSeleccionada.id, fondo);
    }
    
    setShowFondoModal(false);
  };
  
  // Limpiar todo cuando se cierra la caja
  const handleCerrarCajaCompleto = () => {
    console.log("Limpiando estado de caja...");
    
    // Limpiar fondo de localStorage antes de limpiar el estado
    if (cajeroSeleccionado && sucursalSeleccionada && sucursalSeleccionada.id) {
      const cajeroId = cajeroSeleccionado._id || cajeroSeleccionado.ID;
      if (cajeroId) {
        limpiarFondoCajaDeStorage(cajeroId, sucursalSeleccionada.id);
      }
    }
    
    // Limpiar estado del cajero y fondo
    setCajeroSeleccionado(null);
    setFondoCaja(null);
    setFondoEfectivoBs("");
    setFondoEfectivoUsd("");
    setFondoBancoBs("");
    setFondoBancoUsd("");
    // Limpiar totales de ventas del día - IMPORTANTE: limpiar antes de cerrar modales
    setTotalCajaSistemaUsd(0);
    setCostoInventarioTotal(0);
    // Cerrar cualquier modal abierto
    setShowFondoModal(false);
    setShowCajeroModal(false);
    setShowCerrarCajaModal(false);
    // Limpiar carrito y otros estados
    setCarrito([]);
    setClienteSeleccionado(null);
    setMetodosPago([]);
    // Limpiar facturas procesadas
    setFacturasProcesadas([]);
    setMostrarFacturasProcesadas(false);
    // Abrir modal de selección de sucursal
    setShowSucursalModal(true);
    console.log("Estado de caja limpiado completamente");
  };
  
  // Función para manejar el cierre completo de caja (después de guardar el cuadre)
  const handleCerrarCajaFinal = () => {
    handleCerrarCajaCompleto();
    setShowCerrarCajaModal(false);
  };

  const handleSeleccionarProducto = (producto: Producto) => {
    // Verificar que el producto tenga stock antes de seleccionarlo
    const stock = producto.cantidad ?? producto.stock ?? 0;
    if (stock <= 0) {
      alert("Este producto no tiene stock disponible");
      return;
    }
    setProductoSeleccionado(producto);
    setCantidadInput("1");
    setShowCantidadModal(true);
    setBusquedaItem("");
    setProductosEncontrados([]);
  };

  // Función para calcular precio con descuento
  const calcularPrecioConDescuento = (precioOriginal: number, porcentajeDescuento?: number, porcentajeDescuentoDivisa?: number): number => {
    let precioFinal = precioOriginal;
    
    // Aplicar descuento del cliente si existe
    if (porcentajeDescuento && porcentajeDescuento > 0) {
      const descuento = precioFinal * (porcentajeDescuento / 100);
      precioFinal = precioFinal - descuento;
    }
    
    // Aplicar descuento por divisa si está activo y el pago es en USD
    if (descuentoPorDivisaActivo && porcentajeDescuentoDivisa && porcentajeDescuentoDivisa > 0) {
      const descuentoDivisa = precioFinal * (porcentajeDescuentoDivisa / 100);
      precioFinal = precioFinal - descuentoDivisa;
    }
    
    return precioFinal;
  };

  const handleAgregarAlCarrito = () => {
    if (!productoSeleccionado || !cantidadInput || parseFloat(cantidadInput) <= 0) {
      return;
    }

    const cantidad = parseFloat(cantidadInput);
    
    // Verificar stock disponible
    const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
    
    // Verificar si el producto ya está en el carrito
    const itemExistente = carrito.find(
      (item) => item.producto.id === productoSeleccionado.id
    );
    
    // Calcular cantidad total que se intenta agregar
    const cantidadTotal = itemExistente ? itemExistente.cantidad + cantidad : cantidad;
    
    if (cantidadTotal > stockDisponible) {
      const cantidadDisponible = stockDisponible - (itemExistente?.cantidad || 0);
      alert(`No hay suficiente stock disponible. Stock disponible: ${stockDisponible}, ya en carrito: ${itemExistente?.cantidad || 0}, puedes agregar: ${cantidadDisponible > 0 ? cantidadDisponible : 0}`);
      return;
    }
    
    // Validación adicional: cantidad individual no puede exceder stock
    if (cantidad > stockDisponible) {
      alert(`No hay suficiente stock disponible. Stock disponible: ${stockDisponible}`);
      return;
    }
    // El precio del producto viene en USD, calcular precio en Bs
    const precioUnitarioOriginalUSD = productoSeleccionado.precio_usd || productoSeleccionado.precio;
    const precioUnitarioOriginalBs = precioUnitarioOriginalUSD * tasaDelDia;
    
    // Aplicar descuentos (cliente y divisa)
    const porcentajeDescuento = clienteSeleccionado?.porcentaje_descuento || 0;
    const porcentajeDescuentoDivisaValor = descuentoPorDivisaActivo ? (parseFloat(porcentajeDescuentoDivisa) || 0) : 0;
    const precioUnitarioUSD = calcularPrecioConDescuento(precioUnitarioOriginalUSD, porcentajeDescuento, porcentajeDescuentoDivisaValor);
    const precioUnitarioBs = calcularPrecioConDescuento(precioUnitarioOriginalBs, porcentajeDescuento, porcentajeDescuentoDivisaValor);
    
    // Calcular el descuento total aplicado para mostrar
    const descuentoTotal = porcentajeDescuento > 0 || porcentajeDescuentoDivisaValor > 0 
      ? porcentajeDescuento + porcentajeDescuentoDivisaValor 
      : undefined;
    
    const subtotalUSD = precioUnitarioUSD * cantidad;
    const subtotalBs = precioUnitarioBs * cantidad;

    const nuevoItem: ItemCarrito = {
      producto: productoSeleccionado,
      cantidad,
      precio_unitario: precioUnitarioBs,
      precio_unitario_usd: precioUnitarioUSD,
      precio_unitario_original: precioUnitarioOriginalBs,
      precio_unitario_original_usd: precioUnitarioOriginalUSD,
      subtotal: subtotalBs,
      subtotal_usd: subtotalUSD,
      descuento_aplicado: descuentoTotal,
    };

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.producto.id === productoSeleccionado.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                precio_unitario: precioUnitarioBs,
                precio_unitario_usd: precioUnitarioUSD,
                precio_unitario_original: precioUnitarioOriginalBs,
                precio_unitario_original_usd: precioUnitarioOriginalUSD,
                subtotal: (item.cantidad + cantidad) * precioUnitarioBs,
                subtotal_usd: (item.cantidad + cantidad) * precioUnitarioUSD,
                descuento_aplicado: descuentoTotal,
              }
            : item
        )
      );
    } else {
      setCarrito([...carrito, nuevoItem]);
    }

    setShowCantidadModal(false);
    setProductoSeleccionado(null);
    setCantidadInput("1");
  };

  const handleEliminarItem = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const handleActualizarCantidad = (index: number, nuevaCantidad: number) => {
    if (nuevaCantidad <= 0) {
      handleEliminarItem(index);
      return;
    }
    
    // Validar que la nueva cantidad no exceda el stock disponible
    const item = carrito[index];
    const stockDisponible = item.producto.cantidad ?? item.producto.stock ?? 0;
    
    if (nuevaCantidad > stockDisponible) {
      alert(`No hay suficiente stock disponible. Stock disponible: ${stockDisponible}`);
      // Limitar al stock disponible
      nuevaCantidad = stockDisponible;
    }
    
    setCarrito(
      carrito.map((it, i) =>
        i === index
          ? {
              ...it,
              cantidad: nuevaCantidad,
              subtotal: nuevaCantidad * it.precio_unitario,
              subtotal_usd: nuevaCantidad * it.precio_unitario_usd,
            }
          : it
      )
    );
  };

  // Recalcular precios del carrito cuando se selecciona o cambia un cliente o el descuento por divisa
  useEffect(() => {
    if (carrito.length === 0) return;
    
    const porcentajeDescuento = clienteSeleccionado?.porcentaje_descuento || 0;
    const porcentajeDescuentoDivisaValor = descuentoPorDivisaActivo ? (parseFloat(porcentajeDescuentoDivisa) || 0) : 0;
    
    setCarrito(
      carrito.map((item) => {
        const precioOriginalUSD = item.precio_unitario_original_usd || item.precio_unitario_usd;
        const precioOriginalBs = item.precio_unitario_original || (precioOriginalUSD * tasaDelDia);
        
        const precioConDescuentoUSD = calcularPrecioConDescuento(precioOriginalUSD, porcentajeDescuento, porcentajeDescuentoDivisaValor);
        const precioConDescuentoBs = calcularPrecioConDescuento(precioOriginalBs, porcentajeDescuento, porcentajeDescuentoDivisaValor);
        
        const descuentoTotal = porcentajeDescuento > 0 || porcentajeDescuentoDivisaValor > 0 
          ? porcentajeDescuento + porcentajeDescuentoDivisaValor 
          : undefined;
        
        return {
          ...item,
          precio_unitario: precioConDescuentoBs,
          precio_unitario_usd: precioConDescuentoUSD,
          precio_unitario_original: precioOriginalBs,
          precio_unitario_original_usd: precioOriginalUSD,
          subtotal: item.cantidad * precioConDescuentoBs,
          subtotal_usd: item.cantidad * precioConDescuentoUSD,
          descuento_aplicado: descuentoTotal,
        };
      })
    );
  }, [clienteSeleccionado?.porcentaje_descuento, descuentoPorDivisaActivo, porcentajeDescuentoDivisa]);

  const calcularTotalBs = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal, 0);
  };

  const calcularTotalUsd = () => {
    return carrito.reduce((sum, item) => sum + item.subtotal_usd, 0);
  };

  const handleTotalizar = () => {
    if (carrito.length === 0) {
      alert("El carrito está vacío");
      return;
    }
    setMetodosPago([]);
    setMetodoPagoActual({ tipo: "efectivo", divisa: "USD" });
    setMontoPago("");
    setShowPagoModal(true);
  };

  const handleAgregarMetodoPago = () => {
    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      alert("Ingrese un monto válido");
      return;
    }

    // Validar que se haya seleccionado un banco (ahora solo se usan bancos)
    if (!bancoSeleccionadoPago) {
      alert("Seleccione un banco");
      return;
    }

    const nuevoMetodo: MetodoPago = {
      tipo: "banco", // Siempre es banco ahora
      monto,
      divisa: metodoPagoActual.divisa as "Bs" | "USD",
      banco_id: bancoSeleccionadoPago,
    };

    setMetodosPago([...metodosPago, nuevoMetodo]);
    setMontoPago("");
    setBancoSeleccionadoPago("");
    setMetodoPagoActual({ tipo: "banco", divisa: "USD" }); // Resetear para siguiente pago
  };

  // Calcular total pagado en USD (convertir Bs a USD si es necesario)
  const calcularTotalPagadoUsd = () => {
    return metodosPago.reduce((sum, metodo) => {
      if (metodo.divisa === "USD") {
        return sum + metodo.monto;
      } else {
        // Convertir Bs a USD
        return sum + metodo.monto / tasaDelDia;
      }
    }, 0);
  };

  // Calcular total pagado en Bs
  const calcularTotalPagadoBs = () => {
    return metodosPago.reduce((sum, metodo) => {
      if (metodo.divisa === "Bs") {
        return sum + metodo.monto;
      } else {
        // Convertir USD a Bs
        return sum + metodo.monto * tasaDelDia;
      }
    }, 0);
  };

  const calcularVuelto = () => {
    const totalUsd = calcularTotalUsd();
    const pagadoUsd = calcularTotalPagadoUsd();
    return Math.max(0, pagadoUsd - totalUsd);
  };

  const puedeConfirmar = () => {
    const totalUsd = calcularTotalUsd();
    const pagadoUsd = calcularTotalPagadoUsd();
    const vuelto = calcularVuelto();
    // Solo se puede confirmar si el monto pagado es exactamente igual al total (sin vuelto)
    return Math.abs(pagadoUsd - totalUsd) < 0.01 && pagadoUsd > 0 && vuelto < 0.01;
  };

  const handleDarVuelto = () => {
    // Calcular el vuelto pendiente ANTES de agregar el nuevo método
    const vueltoPendiente = calcularVuelto();
    if (vueltoPendiente <= 0) {
      alert("No hay vuelto pendiente");
      return;
    }

    // Obtener el monto ingresado
    const montoIngresado = parseFloat(metodoVuelto.monto) || 0;
    if (montoIngresado <= 0) {
      alert("Debe ingresar un monto mayor a 0");
      return;
    }

    // Calcular el vuelto restante después de este pago
    let montoVueltoUSD = 0;
    let montoVueltoBs = 0;

    if (metodoVuelto.divisa === "USD") {
      // Si el método es en USD, el monto debe ser en USD
      // Usar tolerancia para errores de redondeo
      if (montoIngresado > vueltoPendiente + 0.01) {
        alert(`El monto no puede ser mayor al vuelto pendiente ($${vueltoPendiente.toFixed(2)} USD)`);
        return;
      }
      montoVueltoUSD = montoIngresado;
      montoVueltoBs = montoIngresado * tasaDelDia;
    } else {
      // Si el método es en Bs, convertir a USD para validar
      if (tasaDelDia <= 0) {
        alert("La tasa del día no está configurada");
        return;
      }
      const montoEnUSD = montoIngresado / tasaDelDia;
      // Usar tolerancia para errores de redondeo
      if (montoEnUSD > vueltoPendiente + 0.01) {
        const maxBs = vueltoPendiente * tasaDelDia;
        alert(`El monto no puede ser mayor al vuelto pendiente ($${vueltoPendiente.toFixed(2)} USD = ${maxBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs)`);
        return;
      }
      montoVueltoBs = montoIngresado;
      montoVueltoUSD = montoEnUSD;
    }

    // Validar banco si el tipo es "banco"
    if (metodoVuelto.tipo === "banco" && !bancoSeleccionadoVuelto) {
      alert("Seleccione un banco para el vuelto");
      return;
    }

    // Agregar un método de pago negativo para representar el vuelto dado
    const vueltoNegativo: MetodoPago = {
      tipo: metodoVuelto.tipo as any,
      monto: metodoVuelto.divisa === "USD" ? -montoVueltoUSD : -montoVueltoBs,
      divisa: metodoVuelto.divisa as "Bs" | "USD",
      banco_id: metodoVuelto.tipo === "banco" ? bancoSeleccionadoVuelto : undefined,
    };

    // Actualizar el estado con el nuevo método de pago
    const nuevosMetodosPago = [...metodosPago, vueltoNegativo];
    setMetodosPago(nuevosMetodosPago);
    
    // Calcular el nuevo vuelto después de agregar este método
    // Necesitamos calcular manualmente porque el estado aún no se ha actualizado
    const totalPagadoUsd = nuevosMetodosPago.reduce((sum, metodo) => {
      if (metodo.divisa === "USD") {
        return sum + metodo.monto;
      } else {
        return sum + (metodo.monto / tasaDelDia);
      }
    }, 0);
    const nuevoVuelto = totalPagadoUsd - calcularTotalUsd();
    
    // Limpiar el monto pero mantener el método y divisa para facilitar agregar más
    setMetodoVuelto({ ...metodoVuelto, monto: "" });
    
    // Si aún hay vuelto pendiente, mantener el modal abierto; si no, cerrarlo
    if (nuevoVuelto <= 0.01) { // Tolerancia para errores de redondeo
      setMostrarDarVuelto(false);
    }
  };

  const handleActualizarTasa = () => {
    const nuevaTasa = parseFloat(tasaInput);
    if (nuevaTasa > 0) {
      setTasaDelDia(nuevaTasa);
      const porcentajeDescuento = clienteSeleccionado?.porcentaje_descuento || 0;
      
      // Recalcular subtotales en Bs con descuento aplicado
      const porcentajeDescuentoDivisaValor = descuentoPorDivisaActivo ? (parseFloat(porcentajeDescuentoDivisa) || 0) : 0;
      setCarrito(
        carrito.map((item) => {
          const precioOriginalUSD = item.precio_unitario_original_usd || item.precio_unitario_usd;
          const precioOriginalBs = precioOriginalUSD * nuevaTasa;
          const precioConDescuentoUSD = calcularPrecioConDescuento(precioOriginalUSD, porcentajeDescuento, porcentajeDescuentoDivisaValor);
          const precioConDescuentoBs = calcularPrecioConDescuento(precioOriginalBs, porcentajeDescuento, porcentajeDescuentoDivisaValor);
          
          const descuentoTotal = porcentajeDescuento > 0 || porcentajeDescuentoDivisaValor > 0 
            ? porcentajeDescuento + porcentajeDescuentoDivisaValor 
            : undefined;
          
          return {
            ...item,
            precio_unitario: precioConDescuentoBs,
            precio_unitario_usd: precioConDescuentoUSD,
            precio_unitario_original: precioOriginalBs,
            precio_unitario_original_usd: precioOriginalUSD,
            subtotal: item.cantidad * precioConDescuentoBs,
            subtotal_usd: item.cantidad * precioConDescuentoUSD,
            descuento_aplicado: descuentoTotal,
          };
        })
      );
    } else {
      alert("Ingrese una tasa válida mayor a 0");
    }
  };

  const handleCrearCliente = async () => {
    if (!cedulaCliente.trim() || !nombreCliente.trim()) {
      alert("La cédula y el nombre son requeridos");
      return;
    }

    setCreandoCliente(true);
    try {
      const clienteData = {
        cedula: cedulaCliente.trim(),
        nombre: nombreCliente.trim(),
        direccion: direccionCliente.trim() || undefined,
        telefono: telefonoCliente.trim() || undefined,
        porcentaje_descuento: porcentajeDescuentoCliente ? parseFloat(porcentajeDescuentoCliente) : 0,
      };

      const res = await fetchWithAuth(`${API_BASE_URL}/clientes`, {
        method: "POST",
        body: JSON.stringify(clienteData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al crear cliente" }));
        throw new Error(errorData.detail || "Error al crear cliente");
      }

      const nuevoCliente = await res.json();
      setClienteSeleccionado(nuevoCliente);
      setShowClienteModal(false);
      setCedulaCliente("");
      setNombreCliente("");
      setDireccionCliente("");
      setTelefonoCliente("");
      setPorcentajeDescuentoCliente("");
      alert("Cliente creado exitosamente");
    } catch (error: any) {
      console.error("Error al crear cliente:", error);
      alert(error.message || "Error al crear cliente. Por favor, intente nuevamente.");
    } finally {
      setCreandoCliente(false);
    }
  };

  const handleSeleccionarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setBusquedaCliente("");
    setClientesEncontrados([]);
  };

  const handleLimpiarCliente = () => {
    setClienteSeleccionado(null);
    setBusquedaCliente("");
    setClientesEncontrados([]);
  };

  // Función para obtener ventas del día y calcular totales
  const obtenerVentasDelDia = async () => {
    if (!sucursalSeleccionada || !cajeroSeleccionado) {
      console.log("No se pueden obtener ventas: falta sucursal o cajero");
      return;
    }

    // Solo obtener ventas si hay fondo configurado para este cajero
    if (!fondoCaja || (fondoCaja.efectivoBs === 0 && fondoCaja.efectivoUsd === 0)) {
      console.log("No hay fondo configurado, no se obtienen ventas");
      setTotalCajaSistemaUsd(0);
      setCostoInventarioTotal(0);
      return;
    }

    try {
      const hoy = new Date().toISOString().split('T')[0];
      const usuario = getUsuarioActual();
      // Usar el nombre del cajero seleccionado como identificador principal
      const cajeroNombre = cajeroSeleccionado.NOMBRE;
      const cajeroCorreo = usuario?.correo;
      
      console.log("Obteniendo ventas para cajero:", cajeroNombre, "correo:", cajeroCorreo, "sucursal:", sucursalSeleccionada.id);
      
      // Obtener ventas del día para la sucursal Y el cajero específico
      const resVentas = await fetchWithAuth(
        `${API_BASE_URL}/punto-venta/ventas/usuario?fecha=${hoy}&sucursal=${sucursalSeleccionada.id}&cajero=${encodeURIComponent(cajeroNombre)}&limit=1000`
      );
      
      if (resVentas.ok) {
        const data = await resVentas.json();
        const ventasArray = Array.isArray(data.facturas) ? data.facturas : (Array.isArray(data) ? data : []);
        
        console.log("Ventas recibidas del backend:", ventasArray.length);
        
        // Filtrar solo las ventas del día actual y del cajero actual (filtro estricto)
        const ventasDelDia = ventasArray.filter((venta: any) => {
          const fechaVenta = new Date(venta.fecha);
          const hoyDate = new Date(hoy);
          const esMismoDia = fechaVenta.toDateString() === hoyDate.toDateString();
          
          // Verificar que el cajero coincida exactamente (nombre o correo)
          const cajeroVenta = venta.cajero || venta.cajero_nombre || "";
          const esMismoCajero = cajeroVenta === cajeroNombre || 
                               cajeroVenta === cajeroCorreo ||
                               (venta.usuario && venta.usuario === cajeroCorreo);
          
          const resultado = esMismoDia && esMismoCajero;
          if (!resultado && esMismoDia) {
            console.log("Venta filtrada (cajero diferente):", {
              cajeroVenta,
              cajeroNombre,
              cajeroCorreo,
              venta: venta.numero_factura || venta._id
            });
          }
          return resultado;
        });
        
        console.log("Ventas filtradas para el cajero actual:", ventasDelDia.length);
        
        // Calcular total de caja en USD (suma de todas las ventas del cajero)
        const totalUsd = ventasDelDia.reduce((sum: number, venta: any) => {
          return sum + (venta.total_usd || 0);
        }, 0);
        setTotalCajaSistemaUsd(totalUsd);
        
        // Calcular costo total del inventario desde el inventario de la sucursal
        // Primero obtener todos los items del inventario de la sucursal
        let itemsInventario: any[] = [];
        try {
          // Obtener inventario de la sucursal
          const resInventario = await fetchWithAuth(
            `${API_BASE_URL}/inventarios?sucursal=${sucursalSeleccionada.id}`
          );
          if (resInventario.ok) {
            const inventarios = await resInventario.json();
            const inventarioSucursal = Array.isArray(inventarios) 
              ? inventarios.find((inv: any) => inv.farmacia === sucursalSeleccionada.id || inv.sucursal === sucursalSeleccionada.id)
              : null;
            
            if (inventarioSucursal) {
              // Obtener items del inventario
              const inventarioId = inventarioSucursal._id || inventarioSucursal.id;
              const resItems = await fetchWithAuth(
                `${API_BASE_URL}/inventarios/${inventarioId}/items`
              );
              
              if (resItems.ok) {
                itemsInventario = await resItems.json();
                if (!Array.isArray(itemsInventario)) {
                  itemsInventario = [];
                }
              } else if (resItems.status === 404) {
                // Si el endpoint no existe, intentar endpoint alternativo
                console.warn(`⚠️ [PuntoVenta] Endpoint /inventarios/${inventarioId}/items no encontrado, intentando alternativas...`);
                try {
                  const resAlt = await fetchWithAuth(
                    `${API_BASE_URL}/productos?inventario_id=${inventarioId}`
                  );
                  if (resAlt.ok) {
                    const data = await resAlt.json();
                    itemsInventario = Array.isArray(data) ? data : (data.productos || data.items || []);
                    console.log(`✅ [PuntoVenta] Items obtenidos desde endpoint alternativo: ${itemsInventario.length} items`);
                  }
                } catch (err) {
                  console.warn("⚠️ [PuntoVenta] Endpoint alternativo falló:", err);
                  itemsInventario = [];
                }
              }
            }
          }
        } catch (error) {
          console.error("Error al obtener inventario:", error);
        }
        
        // Crear un mapa de costos por producto_id
        const costosPorProducto = new Map<string, number>();
        itemsInventario.forEach((item: any) => {
          const productoId = item._id || item.id || item.producto_id;
          const costo = item.costo_unitario || item.costo || 0;
          if (productoId && costo > 0) {
            costosPorProducto.set(productoId, costo);
          }
        });
        
        // Calcular costo total usando los costos del inventario
        let costoTotal = 0;
        let itemsSinCosto = 0;
        
        ventasDelDia.forEach((venta: any) => {
          if (Array.isArray(venta.items)) {
            venta.items.forEach((item: any) => {
              const productoId = item.producto_id || item._id || item.id;
              // Buscar el costo en el inventario
              const costoItem = costosPorProducto.get(productoId);
              
              if (costoItem && costoItem > 0) {
                costoTotal += costoItem * (item.cantidad || 0);
              } else {
                // Si no se encuentra en el inventario, intentar usar costo_unitario del item
                const costoItemFallback = item.costo_unitario || 0;
                if (costoItemFallback > 0) {
                  costoTotal += costoItemFallback * (item.cantidad || 0);
                } else {
                  itemsSinCosto++;
                  console.warn(`Item sin costo encontrado: producto_id=${productoId}, nombre=${item.nombre || 'N/A'}`);
                }
              }
            });
          }
        });
        
        if (itemsSinCosto > 0) {
          console.warn(`Advertencia: ${itemsSinCosto} items no tienen costo asignado en el inventario`);
        }
        
        console.log("Costo total calculado desde inventario:", costoTotal);
        console.log("Total de items en inventario cargados:", costosPorProducto.size);
        setCostoInventarioTotal(costoTotal);
      } else {
        // Si no hay endpoint específico, usar valores por defecto
        console.warn("No se pudo obtener ventas del día, usando valores por defecto");
        setTotalCajaSistemaUsd(0);
        setCostoInventarioTotal(0);
      }
    } catch (error) {
      console.error("Error al obtener ventas del día:", error);
      setTotalCajaSistemaUsd(0);
      setCostoInventarioTotal(0);
    }
  };

  // Función para abrir modal de cerrar caja
  const handleCerrarCaja = async () => {
    if (!sucursalSeleccionada || !cajeroSeleccionado) {
      alert("Debe seleccionar una sucursal y un cajero");
      return;
    }
    
    // Verificar que haya fondo configurado
    if (!fondoCaja || (fondoCaja.efectivoBs === 0 && fondoCaja.efectivoUsd === 0)) {
      // Si no hay fondo, abrir el modal de fondo en lugar de mostrar alert
      console.log("No hay fondo configurado, abriendo modal de fondo");
      setShowFondoModal(true);
      // Forzar renderizado del modal
      setTimeout(() => {
        console.log("Forzando apertura del modal de fondo desde handleCerrarCaja");
        setShowFondoModal(true);
      }, 100);
      return;
    }
    
    // Obtener facturas procesadas para calcular totales
    await obtenerFacturasProcesadas();
    
    // Siempre obtener ventas del día para asegurar que son del cajero actual
    console.log("Obteniendo ventas para cerrar caja del cajero:", cajeroSeleccionado.NOMBRE);
    await obtenerVentasDelDia();
    setShowCerrarCajaModal(true);
  };

  // Función para obtener facturas procesadas del usuario/cajero
  const obtenerFacturasProcesadas = async () => {
    if (!cajeroSeleccionado || !sucursalSeleccionada) return;
    
    setCargandoFacturas(true);
    try {
      const usuario = getUsuarioActual();
      const cajero = usuario?.correo || cajeroSeleccionado.NOMBRE;
      
      const res = await fetchWithAuth(
        `${API_BASE_URL}/punto-venta/ventas/usuario?cajero=${encodeURIComponent(cajero)}&sucursal=${sucursalSeleccionada.id}&limit=100`
      );
      
      if (res.ok) {
        const data = await res.json();
        const facturas = data.facturas || [];
        // Debug: verificar estructura de clientes
        if (facturas.length > 0) {
          console.log("Ejemplo de factura recibida:", facturas[0]);
          console.log("Cliente en factura:", facturas[0].cliente);
        }
        setFacturasProcesadas(facturas);
      } else {
        console.error("Error al obtener facturas procesadas");
        setFacturasProcesadas([]);
      }
    } catch (error) {
      console.error("Error al obtener facturas procesadas:", error);
      setFacturasProcesadas([]);
    } finally {
      setCargandoFacturas(false);
    }
  };

  // Función para manejar el click en "Facturas Procesadas"
  const handleToggleFacturasProcesadas = () => {
    if (!mostrarFacturasProcesadas) {
      // Si se va a mostrar, cargar las facturas
      obtenerFacturasProcesadas();
    }
    setMostrarFacturasProcesadas(!mostrarFacturasProcesadas);
  };

  // Función para ver el preliminar de una factura
  const handleVerFactura = (factura: any) => {
    setFacturaSeleccionada(factura);
    setShowFacturaModal(true);
  };

  // Función para manejar devolución de compra
  const handleDevolucionCompra = (factura: any) => {
    setFacturaParaDevolucion(factura);
    setShowModalDevolucion(true);
  };

  // Función para cerrar modal de devolución y refrescar facturas
  const handleCerrarModalDevolucion = () => {
    setShowModalDevolucion(false);
    setFacturaParaDevolucion(null);
    // Refrescar facturas procesadas
    obtenerFacturasProcesadas();
  };

  // Función para imprimir una factura
  const handleImprimirFactura = (factura: any) => {
    // Preparar datos del ticket
    const ahora = new Date(factura.fecha || new Date());
    const fecha = ahora.toLocaleDateString('es-VE', { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    });
    const hora = ahora.toLocaleTimeString('es-VE', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    // Calcular vuelto si existe (buscar métodos de pago negativos)
    let vueltoTicket: { monto: number; divisa: "USD" | "Bs" } | undefined;
    const totalPagado = factura.metodos_pago?.reduce((sum: number, mp: any) => {
      return sum + (mp.divisa === "USD" ? mp.monto : mp.monto / factura.tasa_dia);
    }, 0) || 0;
    const vueltoPendiente = totalPagado - factura.total_usd;
    if (vueltoPendiente > 0.01) {
      // Buscar método de vuelto negativo
      const vueltoNegativo = factura.metodos_pago?.find((mp: any) => mp.monto < 0);
      if (vueltoNegativo) {
        vueltoTicket = {
          monto: Math.abs(vueltoNegativo.monto),
          divisa: vueltoNegativo.divisa
        };
      }
    }
    
    const ticketItems = factura.items?.map((item: any) => ({
      nombre: item.nombre,
      codigo: item.codigo,
      cantidad: item.cantidad,
      precio_unitario: item.precio_unitario,
      precio_unitario_usd: item.precio_unitario_usd,
      subtotal: item.subtotal,
      subtotal_usd: item.subtotal_usd,
      descuento_aplicado: item.descuento_aplicado
    })) || [];
    
    const metodosPagoTicket = factura.metodos_pago?.filter((mp: any) => mp.monto > 0).map((mp: any) => ({
      tipo: mp.tipo,
      monto: mp.monto,
      divisa: mp.divisa
    })) || [];
    
    setTicketData({
      numeroFactura: factura.numero_factura || factura._id || "N/A",
      fecha,
      hora,
      sucursal: factura.sucursal?.nombre || sucursalSeleccionada?.nombre || "",
      cajero: factura.cajero || cajeroSeleccionado?.NOMBRE || "",
      cliente: factura.cliente ? {
        nombre: factura.cliente.nombre,
        cedula: factura.cliente.cedula
      } : undefined,
      items: ticketItems,
      metodosPago: metodosPagoTicket,
      totalBs: factura.total_bs || 0,
      totalUsd: factura.total_usd || 0,
      tasaDia: factura.tasa_dia || tasaDelDia,
      porcentajeDescuento: factura.porcentaje_descuento,
      vuelto: vueltoTicket
    });
  };

  const handleConfirmarVenta = async () => {
    if (!puedeConfirmar()) {
      const totalUsd = calcularTotalUsd();
      const pagadoUsd = calcularTotalPagadoUsd();
      if (pagadoUsd < totalUsd) {
        alert(`Falta por pagar: $${(totalUsd - pagadoUsd).toFixed(2)} USD`);
      } else if (pagadoUsd > totalUsd) {
        alert(`Hay vuelto pendiente: $${(pagadoUsd - totalUsd).toFixed(2)} USD. El monto pagado debe ser exactamente igual al total.`);
      } else {
        alert("Debe agregar métodos de pago que sumen exactamente el total a pagar");
      }
      return;
    }

    if (!sucursalSeleccionada || !cajeroSeleccionado) {
      alert("Debe seleccionar una sucursal y un cajero");
      return;
    }

    try {
      const usuario = getUsuarioActual();

      const totalUsd = calcularTotalUsd();
      const totalBs = calcularTotalBs();

      // Formatear items según el backend
      const items = carrito.map((item) => ({
        producto_id: item.producto.id,
        nombre: item.producto.nombre,
        codigo: item.producto.codigo || "",
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_unitario_usd: item.precio_unitario_usd,
        precio_unitario_original: item.precio_unitario_original || item.precio_unitario,
        precio_unitario_original_usd: item.precio_unitario_original_usd || item.precio_unitario_usd,
        subtotal: item.subtotal,
        subtotal_usd: item.subtotal_usd,
        descuento_aplicado: item.descuento_aplicado || 0,
      }));

      // Validar que cada método tenga divisa antes de formatear
      for (const metodo of metodosPago) {
        if (!metodo.divisa || (metodo.divisa !== "USD" && metodo.divisa !== "Bs")) {
          throw new Error(`Método de pago ${metodo.tipo} debe tener divisa válida (USD o Bs)`);
        }
      }
      
      // Validación: Verificar que la suma neta (pagos positivos - vuelto negativo) coincida con el total
      let sumaNetaUsd = 0;
      for (const metodo of metodosPago) {
        let montoEnUsd = 0;
        if (metodo.divisa === "USD") {
          montoEnUsd = metodo.monto;
        } else if (metodo.divisa === "Bs") {
          montoEnUsd = metodo.monto / tasaDelDia; // Convertir Bs a USD
        }
        sumaNetaUsd += montoEnUsd; // Sumar todos (positivos y negativos)
      }
      
      // Verificar que la suma neta coincida con total_usd (tolerancia de 0.01 para errores de redondeo)
      if (Math.abs(sumaNetaUsd - totalUsd) > 0.01) {
        throw new Error(
          `La suma neta de métodos de pago ($${sumaNetaUsd.toFixed(2)} USD) no coincide con el total ($${totalUsd.toFixed(2)} USD). Diferencia: $${Math.abs(sumaNetaUsd - totalUsd).toFixed(2)} USD`
        );
      }
      
      // Separar métodos de pago y vuelto
      const metodosPagoPositivos = metodosPago.filter((metodo) => metodo.monto > 0);
      const metodosVuelto = metodosPago.filter((metodo) => metodo.monto < 0);
      
      // Formatear métodos de pago según el backend
      const metodosPagoFormateados = metodosPagoPositivos.map((metodo) => {
        const metodoFormateado: any = {
          tipo: metodo.tipo,
          monto: metodo.monto,
          divisa: metodo.divisa, // ✅ CRÍTICO: Especificar divisa
        };
        // Si tiene banco_id, incluirlo
        if (metodo.banco_id) {
          metodoFormateado.banco_id = metodo.banco_id;
        }
        return metodoFormateado;
      });
      
      // Formatear vuelto
      const vueltoFormateado = metodosVuelto.map((metodo) => {
        const vueltoItem: any = {
          tipo: metodo.tipo,
          monto: Math.abs(metodo.monto), // Convertir a positivo
          divisa: metodo.divisa,
        };
        // Si tiene banco_id, incluirlo
        if (metodo.banco_id) {
          vueltoItem.banco_id = metodo.banco_id;
        }
        return vueltoItem;
      });

      const ventaData: any = {
        items,
        metodos_pago: metodosPagoFormateados,
        total_bs: totalBs,
        total_usd: totalUsd,
        tasa_dia: tasaDelDia,
        sucursal: sucursalSeleccionada.id,
        cajero: usuario?.correo || cajeroSeleccionado.NOMBRE,
        cliente: clienteSeleccionado?._id || clienteSeleccionado?.id || "",
        porcentaje_descuento: clienteSeleccionado?.porcentaje_descuento || 0,
        descuento_por_divisa: descuentoPorDivisaActivo ? (parseFloat(porcentajeDescuentoDivisa) || 0) : 0,
        notas: "",
      };
      
      // Agregar vuelto si existe
      if (vueltoFormateado.length > 0) {
        ventaData.vuelto = vueltoFormateado;
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/punto-venta/ventas`, {
        method: "POST",
        body: JSON.stringify(ventaData),
      });

      if (!res.ok) {
        // Manejo de errores del backend
        const errorData = await res.json().catch(() => ({ 
          detail: "Error al registrar la venta" 
        }));
        
        // Mostrar mensaje de error claro al usuario
        const mensajeError = errorData.detail || errorData.message || "Error al registrar la venta";
        alert(`Error: ${mensajeError}`);
        throw new Error(mensajeError);
      }

      const data = await res.json();
      alert(`Venta registrada exitosamente. Número de factura: ${data.numero_factura || data._id}`);
      
      // Calcular vuelto si existe
      const vueltoPendiente = calcularTotalPagadoUsd() - totalUsd;
      let vueltoTicket: { monto: number; divisa: "USD" | "Bs" } | undefined;
      if (vueltoPendiente > 0.01) {
        // Buscar el método de vuelto en metodosPago (debe ser negativo)
        const vueltoNegativo = metodosPago.find(m => m.monto < 0);
        if (vueltoNegativo) {
          vueltoTicket = {
            monto: Math.abs(vueltoNegativo.monto),
            divisa: vueltoNegativo.divisa
          };
        }
      }
      
      // Obtener fecha y hora actual
      const ahora = new Date();
      const fecha = ahora.toLocaleDateString('es-VE', { 
        year: 'numeric', 
        month: '2-digit', 
        day: '2-digit' 
      });
      const hora = ahora.toLocaleTimeString('es-VE', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      // Preparar datos del ticket
      const ticketItems = carrito.map(item => ({
        nombre: item.producto.nombre,
        codigo: item.producto.codigo,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_unitario_usd: item.precio_unitario_usd,
        subtotal: item.subtotal,
        subtotal_usd: item.subtotal_usd,
        descuento_aplicado: item.descuento_aplicado
      }));
      
      // Filtrar métodos de pago positivos para el ticket
      const metodosPagoTicket = metodosPago
        .filter(m => m.monto > 0)
        .map(m => ({
          tipo: m.tipo,
          monto: m.monto,
          divisa: m.divisa
        }));
      
      // Establecer datos del ticket para imprimir
      setTicketData({
        numeroFactura: data.numero_factura || data._id || "N/A",
        fecha,
        hora,
        sucursal: sucursalSeleccionada.nombre,
        cajero: usuario?.correo || cajeroSeleccionado.NOMBRE,
        cliente: clienteSeleccionado ? {
          nombre: clienteSeleccionado.nombre,
          cedula: clienteSeleccionado.cedula
        } : undefined,
        items: ticketItems,
        metodosPago: metodosPagoTicket,
        totalBs,
        totalUsd,
        tasaDia: tasaDelDia,
        porcentajeDescuento: clienteSeleccionado?.porcentaje_descuento,
        vuelto: vueltoTicket
      });
      
      // Limpiar carrito y reiniciar
      setCarrito([]);
      setMetodosPago([]);
      setShowPagoModal(false);
    } catch (error: any) {
      console.error("Error al confirmar venta:", error);
      // El error ya fue mostrado en el alert anterior si viene del backend
      // Solo mostrar si es un error de validación del frontend
      if (error.message && !error.message.includes("Error al registrar")) {
        alert(error.message);
      } else if (!error.message || error.message.includes("Error al registrar")) {
        alert("Error al registrar la venta. Por favor, intente nuevamente.");
      }
    }
  };

  // Si no hay sucursal o cajero seleccionado, mostrar modales
  if (!sucursalSeleccionada || !cajeroSeleccionado) {
    return (
      <>
        {/* Modal de selección de sucursal */}
        <Dialog 
          open={showSucursalModal} 
          onOpenChange={(open) => {
            // No permitir cerrar el modal sin seleccionar una sucursal
            if (!open && !sucursalSeleccionada) {
              return;
            }
            setShowSucursalModal(open);
          }}
        >
          <DialogContent 
            onInteractOutside={(e) => {
              // Prevenir cerrar al hacer clic fuera
              e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              // Prevenir cerrar con ESC
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Seleccionar Sucursal</DialogTitle>
              <DialogDescription>
                Seleccione la sucursal donde realizará las ventas
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {sucursales.map((sucursal) => (
                <button
                  key={sucursal.id}
                  onClick={() => handleSeleccionarSucursal(sucursal)}
                  className="w-full text-left p-4 rounded-lg border hover:bg-blue-50 transition-colors"
                >
                  <div className="font-semibold">{sucursal.nombre}</div>
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de Fondo de Caja - Renderizado cuando hay cajero pero no fondo */}
        <Dialog 
          open={showFondoModal}
          onOpenChange={(open) => {
            // No permitir cerrar el modal sin configurar el fondo
            if (!open) {
              const tieneFondo = fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
              const tieneValoresIngresados = (fondoEfectivoBs && parseFloat(fondoEfectivoBs) > 0) || 
                                            (fondoEfectivoUsd && parseFloat(fondoEfectivoUsd) > 0);
              
              if (!tieneFondo && !tieneValoresIngresados) {
                alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
                setShowFondoModal(true);
                return;
              }
            }
            setShowFondoModal(open);
          }}
        >
          <DialogContent
            onInteractOutside={(e) => {
              const tieneFondo = fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
              const tieneValoresIngresados = (fondoEfectivoBs && parseFloat(fondoEfectivoBs) > 0) || 
                                            (fondoEfectivoUsd && parseFloat(fondoEfectivoUsd) > 0);
              
              if (!tieneFondo && !tieneValoresIngresados) {
                e.preventDefault();
                alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
              }
            }}
            onEscapeKeyDown={(e) => {
              const tieneFondo = fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
              const tieneValoresIngresados = (fondoEfectivoBs && parseFloat(fondoEfectivoBs) > 0) || 
                                            (fondoEfectivoUsd && parseFloat(fondoEfectivoUsd) > 0);
              
              if (!tieneFondo && !tieneValoresIngresados) {
                e.preventDefault();
                alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
              }
            }}
            className="max-w-md z-[9999]"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Fondo de Caja - Requerido</DialogTitle>
              <DialogDescription>
                Debe ingresar el fondo de caja antes de continuar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Efectivo en Bs *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoEfectivoBs}
                  onChange={(e) => setFondoEfectivoBs(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Método de Pago para Bs</label>
                <select
                  value={fondoBancoBs}
                  onChange={(e) => setFondoBancoBs(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccione un banco (opcional)</option>
                  {bancos
                    .filter(b => b.divisa === "BS")
                    .map((banco) => (
                      <option key={banco._id || banco.id} value={banco._id || banco.id}>
                        {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Efectivo en USD *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoEfectivoUsd}
                  onChange={(e) => setFondoEfectivoUsd(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Método de Pago para USD</label>
                <select
                  value={fondoBancoUsd}
                  onChange={(e) => setFondoBancoUsd(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccione un banco (opcional)</option>
                  {bancos
                    .filter(b => b.divisa === "USD")
                    .map((banco) => (
                      <option key={banco._id || banco.id} value={banco._id || banco.id}>
                        {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco}
                      </option>
                    ))}
                </select>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Debe ingresar al menos un monto de fondo (Bs o USD) para continuar.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  onClick={handleConfirmarFondo} 
                  className="flex-1"
                  disabled={!fondoEfectivoBs && !fondoEfectivoUsd}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal de selección de cajero */}
        <Dialog 
          open={showCajeroModal} 
          onOpenChange={(open) => {
            // No permitir cerrar el modal sin seleccionar un cajero
            if (!open && !cajeroSeleccionado) {
              return;
            }
            setShowCajeroModal(open);
          }}
        >
          <DialogContent
            onInteractOutside={(e) => {
              // Prevenir cerrar al hacer clic fuera
              e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              // Prevenir cerrar con ESC
              e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>Seleccionar Cajero</DialogTitle>
            </DialogHeader>
            {loadingCajeros ? (
              <div className="flex justify-center items-center py-8">
                <div className="text-gray-600">Cargando cajeros...</div>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {cajeros.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    No hay cajeros disponibles
                  </div>
                ) : (
                  cajeros.map((cajero) => (
                    <button
                      key={cajero._id}
                      onClick={() => handleSeleccionarCajero(cajero)}
                      className="w-full text-left p-4 rounded-lg border hover:bg-blue-50 transition-colors"
                    >
                      <div className="font-semibold">{cajero.NOMBRE}</div>
                      {cajero.ID && (
                        <div className="text-sm text-gray-500">ID: {cajero.ID}</div>
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <Button
                onClick={() => {
                  setShowCajeroModal(false);
                  setShowSucursalModal(true);
                  setSucursalSeleccionada(null);
                  setCajeroSeleccionado(null);
                }}
                variant="outline"
                className="flex-1"
              >
                Volver
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Si hay sucursal y cajero pero NO hay fondo, bloquear el acceso al POS
  if (!fondoCaja || (fondoCaja.efectivoBs === 0 && fondoCaja.efectivoUsd === 0)) {
    return (
      <>
        {/* Modal de Fondo de Caja - Bloquea el acceso hasta que se configure */}
        <Dialog 
          open={true}
          onOpenChange={(open) => {
            // No permitir cerrar el modal sin configurar el fondo
            if (!open) {
              const tieneFondo = fondoCaja && (fondoCaja.efectivoBs > 0 || fondoCaja.efectivoUsd > 0);
              const tieneValoresIngresados = (fondoEfectivoBs && parseFloat(fondoEfectivoBs) > 0) || 
                                            (fondoEfectivoUsd && parseFloat(fondoEfectivoUsd) > 0);
              
              if (!tieneFondo && !tieneValoresIngresados) {
                alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
                return;
              }
            }
            setShowFondoModal(open);
          }}
        >
          <DialogContent
            onInteractOutside={(e) => {
              e.preventDefault();
              alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
            }}
            onEscapeKeyDown={(e) => {
              e.preventDefault();
              alert("Debe ingresar al menos un monto de fondo de caja (Bs o USD) antes de continuar");
            }}
            className="max-w-md z-[9999]"
            showCloseButton={false}
          >
            <DialogHeader>
              <DialogTitle>Fondo de Caja - Requerido</DialogTitle>
              <DialogDescription>
                Debe ingresar el fondo de caja antes de continuar
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Efectivo en Bs *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoEfectivoBs}
                  onChange={(e) => setFondoEfectivoBs(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Método de Pago para Bs</label>
                <select
                  value={fondoBancoBs}
                  onChange={(e) => setFondoBancoBs(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccione un banco (opcional)</option>
                  {bancos
                    .filter(b => b.divisa === "BS")
                    .map((banco) => (
                      <option key={banco._id || banco.id} value={banco._id || banco.id}>
                        {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Efectivo en USD *</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={fondoEfectivoUsd}
                  onChange={(e) => setFondoEfectivoUsd(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Método de Pago para USD</label>
                <select
                  value={fondoBancoUsd}
                  onChange={(e) => setFondoBancoUsd(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccione un banco (opcional)</option>
                  {bancos
                    .filter(b => b.divisa === "USD")
                    .map((banco) => (
                      <option key={banco._id || banco.id} value={banco._id || banco.id}>
                        {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco}
                      </option>
                    ))}
                </select>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-yellow-800">
                  <strong>Importante:</strong> Debe ingresar al menos un monto de fondo (Bs o USD) para continuar.
                </p>
              </div>
              <div className="flex gap-2 justify-end">
                <Button 
                  onClick={handleConfirmarFondo} 
                  className="flex-1"
                  disabled={!fondoEfectivoBs && !fondoEfectivoUsd}
                >
                  Confirmar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden p-2">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-2 mb-2 flex-shrink-0">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Punto de Venta</h1>
            <div className="text-xs text-gray-600">
              <span className="font-semibold">Sucursal:</span> {sucursalSeleccionada.nombre} | <span className="font-semibold">Cajero:</span> {cajeroSeleccionado.NOMBRE}
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">Tasa del día:</span>{" "}
              {(tasaDelDia || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs/USD
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="Tasa Bs/USD"
                value={tasaInput}
                onChange={(e) => setTasaInput(e.target.value)}
                className="w-32"
                step="0.01"
                min="0"
              />
              <Button onClick={handleActualizarTasa} size="sm">
                Actualizar
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Botón de Facturas Procesadas */}
            <Button
              onClick={handleToggleFacturasProcesadas}
              variant="outline"
              className="flex items-center gap-2"
            >
              <span>Facturas Procesadas</span>
              <span className={`transform transition-transform ${mostrarFacturasProcesadas ? 'rotate-180' : ''}`}>
                ▼
              </span>
            </Button>
          </div>
        </div>
        
        {/* Sección de Facturas Procesadas (Desplegable) */}
        {mostrarFacturasProcesadas && (
          <div className="mt-2 border-t pt-2">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-semibold text-gray-800">
                Facturas Procesadas ({facturasProcesadas.length})
              </h2>
              <Button
                onClick={obtenerFacturasProcesadas}
                variant="outline"
                size="sm"
                disabled={cargandoFacturas}
                className="h-7 text-xs px-2"
              >
                {cargandoFacturas ? "Cargando..." : "Actualizar"}
              </Button>
            </div>
            
            {/* Buscador de facturas por nombre de cliente */}
            <div className="mb-2">
              <Input
                type="text"
                placeholder="Buscar por nombre de cliente..."
                value={busquedaFactura}
                onChange={(e) => setBusquedaFactura(e.target.value)}
                className="w-full h-7 text-xs"
              />
            </div>
            
            {cargandoFacturas ? (
              <div className="text-center py-2 text-gray-600 text-xs">
                Cargando facturas...
              </div>
            ) : facturasProcesadas.length === 0 ? (
              <div className="text-center py-2 text-gray-500 text-xs">
                No hay facturas procesadas
              </div>
            ) : (() => {
              // Filtrar facturas por nombre de cliente
              const facturasFiltradas = facturasProcesadas.filter((factura) => {
                if (!busquedaFactura.trim()) return true;
                // Obtener nombre del cliente manejando diferentes estructuras
                let nombreCliente = "";
                if (factura.cliente) {
                  if (typeof factura.cliente === 'object') {
                    nombreCliente = (factura.cliente.nombre || factura.cliente.NOMBRE || "").toLowerCase();
                  }
                }
                const busqueda = busquedaFactura.toLowerCase().trim();
                return nombreCliente.includes(busqueda);
              });

              if (facturasFiltradas.length === 0) {
                return (
                  <div className="text-center py-2 text-gray-500 text-xs">
                    No se encontraron facturas con ese cliente
                  </div>
                );
              }

              return (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {facturasFiltradas.map((factura) => (
                  <div
                    key={factura._id}
                    className="bg-gray-50 rounded p-2 border border-gray-200 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-gray-800 text-xs">
                          Factura #{factura.numero_factura || factura._id}
                        </div>
                        <div className="text-xs text-gray-600">
                          {new Date(factura.fecha).toLocaleString('es-VE', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <div className="text-xs text-gray-700 font-medium">
                          Cliente: {(() => {
                            // Manejar diferentes estructuras de cliente
                            if (!factura.cliente) return 'Sin cliente';
                            if (typeof factura.cliente === 'string') return 'Sin cliente';
                            if (factura.cliente.nombre) return factura.cliente.nombre;
                            // Si el cliente es un objeto pero no tiene nombre, intentar otras propiedades
                            if (factura.cliente.NOMBRE) return factura.cliente.NOMBRE;
                            return 'Sin cliente';
                          })()}
                        </div>
                        <div className="text-xs font-semibold text-green-600">
                          ${factura.total_usd?.toFixed(2) || '0.00'} USD
                        </div>
                      </div>
                      <div className="flex gap-1 ml-2">
                        <Button
                          onClick={() => handleVerFactura(factura)}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                        >
                          Ver
                        </Button>
                        <Button
                          onClick={() => handleImprimirFactura(factura)}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2"
                        >
                          Imprimir
                        </Button>
                        <Button
                          onClick={() => handleDevolucionCompra(factura)}
                          variant="outline"
                          size="sm"
                          className="h-6 text-xs px-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-300"
                        >
                          Devolución
                        </Button>
                      </div>
                    </div>
                  </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}
        
        {/* Botón Cerrar Caja */}
        <div className="mt-2 pt-2 border-t border-gray-200 flex justify-center">
          <Button
            onClick={handleCerrarCaja}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 text-sm shadow-lg"
            size="sm"
          >
            🏪 Cerrar Caja
          </Button>
        </div>
        
        {/* Sección de Cliente - Parte superior central */}
        <div className="mt-2 pt-2 border-t border-gray-200">
          <div className="flex items-center gap-4 justify-center">
            <Button
              onClick={() => setShowClienteModal(true)}
              className="flex items-center gap-2"
            >
              <span>+</span> Crear Cliente
            </Button>
            
            <div className="flex-1 max-w-md relative">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar cliente por cédula o nombre..."
                  value={busquedaCliente}
                  onChange={(e) => setBusquedaCliente(e.target.value)}
                  className="w-full"
                />
                {buscandoClientes && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  </div>
                )}
              </div>
              {buscandoClientes && busquedaCliente.trim().length >= 1 && (
                <div className="mt-1 text-sm text-gray-500 text-center py-1">
                  Buscando clientes...
                </div>
              )}
              {!buscandoClientes && busquedaCliente.trim().length >= 1 && clientesEncontrados.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                  <div className="text-sm text-gray-500 text-center">
                    No se encontraron clientes
                  </div>
                </div>
              )}
              {!buscandoClientes && clientesEncontrados.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {clientesEncontrados.map((cliente) => (
                    <button
                      key={cliente._id || cliente.id}
                      onClick={() => handleSeleccionarCliente(cliente)}
                      className="w-full text-left p-3 hover:bg-blue-50 transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold">{cliente.nombre}</div>
                          <div className="text-sm text-gray-600">
                            Cédula: {cliente.cedula}
                            {cliente.telefono && ` | Tel: ${cliente.telefono}`}
                          </div>
                        </div>
                        {cliente.porcentaje_descuento && cliente.porcentaje_descuento > 0 && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                            {cliente.porcentaje_descuento}% desc.
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {clienteSeleccionado && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex-1">
                  <div className="text-sm font-semibold text-blue-900">{clienteSeleccionado.nombre}</div>
                  <div className="text-xs text-blue-700">Cédula: {clienteSeleccionado.cedula}</div>
                  {clienteSeleccionado.porcentaje_descuento && clienteSeleccionado.porcentaje_descuento > 0 && (
                    <div className="mt-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 border border-green-300">
                        Descuento: {clienteSeleccionado.porcentaje_descuento}% ACTIVO
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  onClick={handleLimpiarCliente}
                  variant="outline"
                  size="sm"
                  className="ml-2"
                >
                  ×
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 flex gap-2 overflow-hidden min-h-0">
        {/* Panel izquierdo: Búsqueda y carrito */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden min-h-0">
          {/* Búsqueda de productos */}
          <Card className="p-2 flex-shrink-0">
            <h2 className="text-sm font-semibold mb-2">Buscar Producto</h2>
            <div className="relative">
              <Input
                type="text"
                placeholder="Buscar por nombre, código o código de barras..."
                value={busquedaItem}
                onChange={(e) => setBusquedaItem(e.target.value)}
                className="w-full"
                autoFocus
              />
              {buscandoProductos && (
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                </div>
              )}
            </div>
            {buscandoProductos && busquedaItem.trim().length >= 1 && (
              <div className="mt-2 text-sm text-gray-500 text-center py-2">
                Buscando productos...
              </div>
            )}
            {!buscandoProductos && productosEncontrados.length > 0 && (
              <div className="mt-2 space-y-1 max-h-96 overflow-y-auto border rounded-lg p-2">
                {[...productosEncontrados]
                  .sort((a, b) => {
                    // Ordenar: primero los que tienen stock, luego los que no tienen
                    const stockA = a.cantidad ?? a.stock ?? 0;
                    const stockB = b.cantidad ?? b.stock ?? 0;
                    // Si ambos tienen stock o ambos no tienen, mantener orden original
                    if ((stockA > 0 && stockB > 0) || (stockA === 0 && stockB === 0)) {
                      return 0;
                    }
                    // Los que tienen stock van primero
                    return stockB > stockA ? 1 : -1;
                  })
                  .map((producto) => {
                  const stock = producto.cantidad ?? producto.stock ?? 0;
                  const tieneStock = stock > 0;
                  const mostrarStock = productoConStockAbierto === producto.id;
                  
                  // Obtener el primer lote para mostrar al lado de la descripción
                  const primerLote = producto.lotes && producto.lotes.length > 0 ? producto.lotes[0] : null;
                  const fechaVencPrimerLote = primerLote?.fecha_vencimiento 
                    ? new Date(primerLote.fecha_vencimiento).toLocaleDateString('es-VE')
                    : null;
                  const hoy = new Date();
                  const fechaVencDate = primerLote?.fecha_vencimiento 
                    ? new Date(primerLote.fecha_vencimiento)
                    : null;
                  const estaVencido = fechaVencDate && fechaVencDate < hoy;
                  const estaPorVencer = fechaVencDate && fechaVencDate >= hoy && fechaVencDate <= new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
                  
                  // Normalizar datos del producto
                  const codigo = producto.codigo || producto.codigo_producto || "";
                  const descripcion = producto.descripcion || producto.nombre || producto.descripcion_producto || "";
                  const marca = producto.marca || producto.marca_producto || "";
                  const precioVenta = producto.precio_usd || producto.precio || producto.precio_unitario || producto.precio_venta || 0;
                  
                  return (
                    <div
                      key={producto.id}
                      className="w-full p-3 rounded border hover:bg-blue-50 transition-colors bg-white"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          onClick={() => handleSeleccionarProducto(producto)}
                          disabled={!tieneStock}
                          className={`flex-1 text-left min-w-0 ${
                            tieneStock 
                              ? 'cursor-pointer hover:bg-blue-50' 
                              : 'cursor-not-allowed opacity-50'
                          }`}
                        >
                          {/* Código */}
                          {codigo && (
                            <div className="font-bold text-sm text-blue-600 mb-1">Código: {codigo}</div>
                          )}
                          {/* Descripción */}
                          <div className="font-semibold text-sm text-slate-800 mb-1">{descripcion}</div>
                          {/* Marca */}
                          {marca && (
                            <div className="text-xs text-slate-600 mb-1">Marca: {marca}</div>
                          )}
                          {/* Precio de Venta */}
                          <div className="text-sm font-bold text-green-600 mb-1">
                            Precio: ${precioVenta.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs">
                            {primerLote && (
                              <>
                                <div className="text-xs text-gray-600">
                                  Lote: <span className="font-medium">{primerLote.lote || '-'}</span>
                                </div>
                                {fechaVencPrimerLote && (
                                  <div className={`text-xs font-medium ${
                                    estaVencido 
                                      ? 'text-red-600' 
                                      : estaPorVencer 
                                      ? 'text-orange-600' 
                                      : 'text-gray-600'
                                  }`}>
                                    Vence: {fechaVencPrimerLote}
                                    {estaVencido && ' (VENCIDO)'}
                                    {estaPorVencer && !estaVencido && ' (Por vencer)'}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </button>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Stock con dropdown */}
                          <div className="relative stock-dropdown-container">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setProductoConStockAbierto(
                                  productoConStockAbierto === producto.id ? null : producto.id
                                );
                              }}
                              className={`px-2 py-1 rounded text-sm font-medium ${
                                tieneStock 
                                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                  : 'bg-red-100 text-red-700 hover:bg-red-200'
                              }`}
                            >
                              Stock: {stock}
                            </button>
                            {/* Dropdown de stock por sucursal */}
                            {mostrarStock && (
                              <div className="absolute right-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-64 overflow-y-auto">
                                <div className="p-3">
                                  <div className="text-sm font-semibold text-gray-700 mb-3">
                                    Stock por Sucursal:
                                  </div>
                                  {producto.stock_por_sucursal && producto.stock_por_sucursal.length > 0 ? (
                                    <div className="space-y-2">
                                      {producto.stock_por_sucursal.map((stockSucursal, index) => {
                                        const stockSuc = stockSucursal.cantidad ?? stockSucursal.stock ?? 0;
                                        const esSucursalActual = stockSucursal.sucursal_id === sucursalSeleccionada?.id;
                                        
                                        // Obtener el nombre de la sucursal: primero del objeto, si no existe buscar en la lista de sucursales
                                        let nombreSucursal = stockSucursal.sucursal_nombre;
                                        
                                        // Si no hay nombre o el nombre es igual al ID (solo números como "01", "02"), buscar en la lista
                                        if (!nombreSucursal || nombreSucursal.trim() === '' || nombreSucursal === stockSucursal.sucursal_id || /^\d+$/.test(nombreSucursal)) {
                                          // Debug: ver qué datos tenemos
                                          if (index === 0) {
                                            console.log("Stock por sucursal recibido:", stockSucursal);
                                            console.log("Lista de sucursales disponibles:", sucursales);
                                          }
                                          
                                          // Buscar por ID exacto
                                          let sucursalEncontrada = sucursales.find(s => s.id === stockSucursal.sucursal_id);
                                          
                                          // Si no se encuentra, intentar buscar convirtiendo a string
                                          if (!sucursalEncontrada) {
                                            sucursalEncontrada = sucursales.find(s => String(s.id) === String(stockSucursal.sucursal_id));
                                          }
                                          
                                          // Si aún no se encuentra, buscar por nombre que contenga el ID
                                          if (!sucursalEncontrada && stockSucursal.sucursal_id) {
                                            // Intentar buscar por ID como parte del nombre o ID
                                            sucursalEncontrada = sucursales.find(s => 
                                              String(s.id).includes(String(stockSucursal.sucursal_id)) || 
                                              String(stockSucursal.sucursal_id).includes(String(s.id))
                                            );
                                          }
                                          
                                          nombreSucursal = sucursalEncontrada?.nombre || stockSucursal.sucursal_id || 'Sucursal desconocida';
                                          
                                          if (index === 0) {
                                            console.log("Nombre de sucursal encontrado:", nombreSucursal);
                                          }
                                        }
                                        
                                        return (
                                          <div
                                            key={index}
                                            className={`p-2 rounded text-sm border ${
                                              esSucursalActual
                                                ? 'bg-blue-50 border-blue-200'
                                                : stockSuc > 0
                                                ? 'bg-green-50 border-green-200'
                                                : 'bg-red-50 border-red-200'
                                            }`}
                                          >
                                            <div className="flex justify-between items-center">
                                              <div className="font-medium text-gray-800">
                                                {nombreSucursal}
                                                {esSucursalActual && (
                                                  <span className="ml-2 text-xs text-blue-600 font-semibold">
                                                    (Actual)
                                                  </span>
                                                )}
                                              </div>
                                              <div className={`font-semibold ${
                                                stockSuc > 0 ? 'text-green-700' : 'text-red-700'
                                              }`}>
                                                {stockSuc}
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 py-2">
                                      No hay información de stock en otras sucursales
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Carrito */}
          <Card className="p-2 flex-1 flex flex-col overflow-hidden min-h-0">
            <h2 className="text-sm font-semibold mb-2">Carrito de Compras</h2>
            {carrito.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">El carrito está vacío</div>
            ) : (
              <div className="space-y-1 flex-1 overflow-y-auto min-h-0">
                {carrito.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-xs truncate">{item.producto.nombre}</div>
                      <div className="text-xs text-gray-600">
                        {item.descuento_aplicado ? (
                          <>
                            <span className="line-through text-gray-400">
                              ${item.precio_unitario_original_usd?.toFixed(2) || item.precio_unitario_usd.toFixed(2)} USD
                            </span>
                            {" "}
                            <span className="text-green-600 font-semibold">
                              ${item.precio_unitario_usd.toFixed(2)} USD
                            </span>
                            {" "}
                            <span className="text-xs bg-green-100 text-green-700 px-1 rounded">
                              -{item.descuento_aplicado}%
                            </span>
                          </>
                        ) : (
                          <>${item.precio_unitario_usd.toFixed(2)} USD</>
                        )}
                        {" x "}{item.cantidad}
                        {tasaDelDia > 0 && !descuentoPorDivisaActivo && (
                          <>
                            {" = "}
                            {item.descuento_aplicado ? (
                              <>
                                <span className="line-through text-gray-400">
                                  {(item.precio_unitario_original || 0).toLocaleString("es-VE", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })} Bs
                                </span>
                                {" "}
                                <span className="text-green-600 font-semibold">
                                  {(item.precio_unitario || 0).toLocaleString("es-VE", {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })} Bs
                                </span>
                              </>
                            ) : (
                              <>
                                {item.precio_unitario.toLocaleString("es-VE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })} Bs
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <input
                        type="number"
                        min="1"
                        value={item.cantidad}
                        onChange={(e) =>
                          handleActualizarCantidad(index, parseFloat(e.target.value) || 1)
                        }
                        className="w-16 px-1 py-0.5 border rounded text-xs"
                      />
                      <div className="text-right min-w-[100px]">
                        <div className="font-semibold text-xs">${(item.subtotal_usd || 0).toFixed(2)}</div>
                        {tasaDelDia > 0 && !descuentoPorDivisaActivo && (
                          <div className="text-xs text-gray-600">
                            {(item.subtotal || 0).toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            Bs
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleEliminarItem(index)}
                        variant="destructive"
                        size="sm"
                        className="h-6 px-2 text-xs"
                      >
                        ×
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Panel derecho: Resumen y totalizar */}
        <div className="w-80 flex-shrink-0">
          <Card className="p-2 h-full flex flex-col">
            <h2 className="text-sm font-semibold mb-2">Resumen</h2>
            {clienteSeleccionado?.porcentaje_descuento && clienteSeleccionado.porcentaje_descuento > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-2 mb-3">
                <div className="text-sm text-green-700 font-semibold">
                  Descuento aplicado: {clienteSeleccionado.porcentaje_descuento}%
                </div>
                <div className="text-xs text-green-600">
                  Cliente: {clienteSeleccionado.nombre}
                </div>
              </div>
            )}
            
            {/* Descuento por divisa */}
            <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-3">
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  id="descuentoDivisa"
                  checked={descuentoPorDivisaActivo}
                  onChange={(e) => {
                    setDescuentoPorDivisaActivo(e.target.checked);
                    if (!e.target.checked) {
                      setPorcentajeDescuentoDivisa("");
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor="descuentoDivisa" className="text-sm font-semibold text-blue-700 cursor-pointer">
                  Descuento por pago en divisas (USD)
                </label>
              </div>
              {descuentoPorDivisaActivo && (
                <div className="mt-2">
                  <Input
                    type="number"
                    placeholder="% Descuento"
                    value={porcentajeDescuentoDivisa}
                    onChange={(e) => {
                      const valor = e.target.value;
                      if (valor === "" || (parseFloat(valor) >= 0 && parseFloat(valor) <= 100)) {
                        setPorcentajeDescuentoDivisa(valor);
                      }
                    }}
                    className="w-full"
                    min="0"
                    max="100"
                    step="0.01"
                  />
                  <div className="text-xs text-blue-600 mt-1">
                    Se aplicará a todos los productos cuando el pago sea en USD
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2 mb-2 flex-shrink-0">
              <div className="flex justify-between text-sm">
                <span>Total (USD):</span>
                <span className="font-semibold">${calcularTotalUsd().toFixed(2)}</span>
              </div>
              {tasaDelDia > 0 && !descuentoPorDivisaActivo && (
                <div className="flex justify-between text-sm">
                  <span>Total (Bs):</span>
                  <span className="font-semibold">
                    {(calcularTotalBs() || 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    Bs
                  </span>
                </div>
              )}
            </div>
            <Button onClick={handleTotalizar} className="w-full" size="sm" disabled={carrito.length === 0}>
              Totalizar
            </Button>
          </Card>
        </div>
      </div>

      {/* Modal de cantidad */}
      <Dialog open={showCantidadModal} onOpenChange={setShowCantidadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ingresar Cantidad</DialogTitle>
          </DialogHeader>
          {productoSeleccionado && (
            <div className="space-y-4">
              <div>
                <div className="font-semibold">{productoSeleccionado.nombre}</div>
                <div className="text-sm text-gray-600">
                  Precio: ${((productoSeleccionado.precio_usd || productoSeleccionado.precio || 0)).toFixed(2)} USD
                  {tasaDelDia > 0 && (
                    <> = {(((productoSeleccionado.precio_usd || productoSeleccionado.precio || 0) * (tasaDelDia || 0)) || 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })} Bs</>
                  )}
                </div>
                {(() => {
                  const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
                  return (
                    <div className="text-sm text-gray-500">
                      Stock disponible: {stockDisponible}
                    </div>
                  );
                })()}
              </div>
              <Input
                type="number"
                min="1"
                max={(() => {
                  const stock = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
                  return stock;
                })()}
                value={cantidadInput}
                onChange={(e) => {
                  const valor = e.target.value;
                  const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
                  
                  // Si el campo está vacío, permitir que se borre
                  if (valor === "" || valor === "0") {
                    setCantidadInput(valor);
                    return;
                  }
                  
                  const cantidadIngresada = parseFloat(valor);
                  
                  // Si el valor ingresado es mayor al stock, limitar al stock disponible
                  if (!isNaN(cantidadIngresada)) {
                    if (cantidadIngresada > stockDisponible) {
                      setCantidadInput(stockDisponible.toString());
                      alert(`La cantidad máxima disponible es ${stockDisponible}`);
                    } else if (cantidadIngresada < 1) {
                      setCantidadInput("1");
                    } else {
                      setCantidadInput(valor);
                    }
                  } else {
                    setCantidadInput(valor);
                  }
                }}
                onBlur={(e) => {
                  const valor = parseFloat(e.target.value) || 1;
                  const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
                  
                  if (valor > stockDisponible) {
                    setCantidadInput(stockDisponible.toString());
                    alert(`La cantidad máxima disponible es ${stockDisponible}`);
                  } else if (valor < 1) {
                    setCantidadInput("1");
                  }
                }}
                placeholder="Cantidad"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAgregarAlCarrito();
                  }
                }}
              />
              {(() => {
                const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
                const cantidadIngresada = parseFloat(cantidadInput) || 0;
                if (cantidadIngresada > stockDisponible) {
                  return (
                    <p className="text-sm text-red-600 mt-1">
                      La cantidad no puede ser mayor al stock disponible ({stockDisponible})
                    </p>
                  );
                }
                return null;
              })()}
              <div className="flex gap-2">
                <Button onClick={handleAgregarAlCarrito} className="flex-1">
                  Agregar
                </Button>
                <Button onClick={() => setShowCantidadModal(false)} variant="outline" className="flex-1">
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de pago */}
      <Dialog open={showPagoModal} onOpenChange={setShowPagoModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Métodos de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {clienteSeleccionado?.porcentaje_descuento && clienteSeleccionado.porcentaje_descuento > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-1 rounded text-sm font-semibold bg-green-100 text-green-800 border border-green-300">
                    Descuento: {clienteSeleccionado.porcentaje_descuento}% ACTIVO
                  </span>
                  <span className="text-sm text-green-700">
                    Cliente: {clienteSeleccionado.nombre}
                  </span>
                </div>
              </div>
            )}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Total a pagar (USD):</span>
                <span className="font-bold text-lg">${calcularTotalUsd().toFixed(2)}</span>
              </div>
              {tasaDelDia > 0 && (
                <div className="flex justify-between">
                  <span>Total a pagar (Bs):</span>
                  <span className="font-bold">
                    {(calcularTotalBs() || 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    Bs
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Seleccionar Banco *</label>
              <select
                value={bancoSeleccionadoPago}
                onChange={(e) => {
                  setBancoSeleccionadoPago(e.target.value);
                  // Actualizar tipo y divisa según el banco seleccionado
                  const banco = bancos.find(b => (b._id || b.id) === e.target.value);
                  if (banco) {
                    // Convertir "BS" del backend a "Bs" para el método de pago (compatibilidad)
                    const divisaParaMetodo = banco.divisa === "BS" ? "Bs" : banco.divisa;
                    setMetodoPagoActual({ 
                      tipo: "banco", 
                      divisa: divisaParaMetodo as "Bs" | "USD" 
                    });
                  } else {
                    setMetodoPagoActual({ tipo: "banco", divisa: "USD" });
                  }
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccione un banco</option>
                {bancos.map((banco) => (
                  <option key={banco._id || banco.id} value={banco._id || banco.id}>
                    {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco} ({banco.divisa === "USD" ? "$" : "Bs"})
                  </option>
                ))}
              </select>
              {bancoSeleccionadoPago && (() => {
                const bancoSeleccionado = bancos.find(b => (b._id || b.id) === bancoSeleccionadoPago);
                if (bancoSeleccionado) {
                  return (
                    <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                      {getIconoMetodo(bancoSeleccionado.tipo_metodo)}
                      <span>{getNombreMetodo(bancoSeleccionado.tipo_metodo)}</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Monto</label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={montoPago}
                onChange={(e) => setMontoPago(e.target.value)}
                placeholder="Ingrese el monto"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAgregarMetodoPago();
                  }
                }}
              />
            </div>

            <Button onClick={handleAgregarMetodoPago} className="w-full">
              Agregar Método de Pago
            </Button>

            {metodosPago.length > 0 && (
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-2">Métodos de Pago Agregados:</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {metodosPago.map((metodo, index) => {
                    const esVuelto = metodo.monto < 0;
                    const banco = metodo.banco_id ? bancos.find(b => (b._id || b.id) === metodo.banco_id) : null;
                    return (
                      <div 
                        key={index} 
                        className={`flex justify-between items-center p-2 rounded ${
                          esVuelto ? 'bg-yellow-50 border border-yellow-200' : 'bg-gray-50'
                        }`}
                      >
                        <span className={esVuelto ? 'text-yellow-800 font-semibold' : ''}>
                          {esVuelto ? '🔄 ' : ''}
                          {banco ? (
                            <>
                              {getIconoMetodo(banco.tipo_metodo)}
                              {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco} (${metodo.divisa === "USD" ? "$" : "Bs"})
                            </>
                          ) : (
                            `${metodo.tipo.toUpperCase()} (${metodo.divisa})`
                          )}:{" "}
                          {metodo.divisa === "USD" ? "$" : ""}
                          {Math.abs(metodo.monto || 0).toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {metodo.divisa === "Bs" ? "Bs" : ""}
                          {esVuelto ? ' (Vuelto dado)' : ''}
                        </span>
                        <Button
                          onClick={() =>
                            setMetodosPago(metodosPago.filter((_, i) => i !== index))
                          }
                          variant="destructive"
                          size="sm"
                        >
                          Eliminar
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex justify-between mb-2">
                <span>Total pagado (USD):</span>
                <span className="font-semibold">${calcularTotalPagadoUsd().toFixed(2)}</span>
              </div>
              {tasaDelDia > 0 && (
                <div className="flex justify-between mb-2">
                  <span>Total pagado (Bs):</span>
                  <span className="font-semibold">
                    {(calcularTotalPagadoBs() || 0).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    Bs
                  </span>
                </div>
              )}
              {calcularVuelto() > 0 && (
                <>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-semibold text-yellow-800">Vuelto pendiente:</span>
                      <span className="font-bold text-yellow-900">${calcularVuelto().toFixed(2)} USD</span>
                    </div>
                    {tasaDelDia > 0 && (
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-sm text-yellow-700">Vuelto (Bs):</span>
                        <span className="font-semibold text-yellow-800">
                          {((calcularVuelto() || 0) * (tasaDelDia || 0)).toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          Bs
                        </span>
                      </div>
                    )}
                    {!mostrarDarVuelto ? (
                      <Button
                        onClick={() => {
                          setMostrarDarVuelto(true);
                          // Inicializar el monto con el vuelto pendiente en USD
                          const vueltoPendiente = calcularVuelto();
                          setMetodoVuelto({ 
                            tipo: "efectivo", 
                            divisa: "USD",
                            monto: vueltoPendiente > 0 ? vueltoPendiente.toFixed(2) : ""
                          });
                        }}
                        className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
                      >
                        Dar Vuelto
                      </Button>
                    ) : (
                      <div className="space-y-2">
                        <div className="bg-yellow-50 border border-yellow-200 rounded p-2 mb-2">
                          <div className="text-xs text-yellow-800">
                            <strong>Vuelto pendiente:</strong> ${calcularVuelto().toFixed(2)} USD
                            {tasaDelDia > 0 && (
                              <span className="ml-2">
                                ({(calcularVuelto() * tasaDelDia).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs)
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-xs font-medium mb-1 text-yellow-800">Método</label>
                            <select
                              value={metodoVuelto.tipo}
                              onChange={(e) => {
                                setMetodoVuelto({ ...metodoVuelto, tipo: e.target.value });
                                setBancoSeleccionadoVuelto(""); // Limpiar banco al cambiar tipo
                              }}
                              className="w-full border rounded px-2 py-1 text-sm"
                            >
                              <option value="efectivo">Efectivo</option>
                              <option value="banco">Banco</option>
                              <option value="tarjeta">Tarjeta</option>
                              <option value="transferencia">Transferencia</option>
                              <option value="zelle">Zelle</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1 text-yellow-800">Divisa</label>
                            <select
                              value={metodoVuelto.divisa}
                              onChange={(e) => setMetodoVuelto({ ...metodoVuelto, divisa: e.target.value })}
                              className="w-full border rounded px-2 py-1 text-sm"
                            >
                              <option value="USD">USD</option>
                              <option value="Bs">Bs</option>
                            </select>
                          </div>
                        </div>
                        {metodoVuelto.tipo === "banco" && (
                          <div>
                            <label className="block text-xs font-medium mb-1 text-yellow-800">Seleccionar Banco *</label>
                            <select
                              value={bancoSeleccionadoVuelto}
                              onChange={(e) => {
                                setBancoSeleccionadoVuelto(e.target.value);
                                // Actualizar divisa según el banco seleccionado
                                const banco = bancos.find(b => (b._id || b.id) === e.target.value);
                                if (banco) {
                                  // Convertir "BS" del backend a "Bs" para el método de pago (compatibilidad)
                                  const divisaParaMetodo = banco.divisa === "BS" ? "Bs" : banco.divisa;
                                  setMetodoVuelto({ ...metodoVuelto, divisa: divisaParaMetodo as "Bs" | "USD" });
                                }
                              }}
                              className="w-full border rounded px-2 py-1 text-sm"
                            >
                              <option value="">Seleccione un banco</option>
                              {bancos
                                .filter(b => {
                                  // Normalizar divisa para comparar (backend usa "BS", frontend puede usar "Bs")
                                  const bancoDivisa = b.divisa?.toUpperCase() || "USD";
                                  const metodoDivisa = metodoVuelto.divisa?.toUpperCase() || "USD";
                                  return bancoDivisa === metodoDivisa;
                                })
                                .map((banco) => (
                                  <option key={banco._id || banco.id} value={banco._id || banco.id}>
                                    {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco} ({banco.divisa === "USD" ? "$" : "Bs"})
                                  </option>
                                ))}
                            </select>
                            {bancoSeleccionadoVuelto && (() => {
                              const bancoSeleccionado = bancos.find(b => (b._id || b.id) === bancoSeleccionadoVuelto);
                              if (bancoSeleccionado) {
                                return (
                                  <div className="mt-1 flex items-center gap-1 text-xs text-yellow-700">
                                    {getIconoMetodo(bancoSeleccionado.tipo_metodo)}
                                    <span>{getNombreMetodo(bancoSeleccionado.tipo_metodo)}</span>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        )}
                        <div>
                          <label className="block text-xs font-medium mb-1 text-yellow-800">Monto del Vuelto</label>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={metodoVuelto.monto}
                            onChange={(e) => {
                              const valor = e.target.value;
                              const vueltoPendiente = calcularVuelto();
                              
                              // Permitir borrar el campo
                              if (valor === "" || valor === "0") {
                                setMetodoVuelto({ ...metodoVuelto, monto: valor });
                                return;
                              }
                              
                              if (metodoVuelto.divisa === "USD") {
                                const montoIngresado = parseFloat(valor) || 0;
                                // Usar tolerancia para errores de redondeo
                                if (montoIngresado > vueltoPendiente + 0.01) {
                                  setMetodoVuelto({ ...metodoVuelto, monto: vueltoPendiente.toFixed(2) });
                                  alert(`El monto no puede ser mayor al vuelto pendiente ($${vueltoPendiente.toFixed(2)} USD)`);
                                } else {
                                  setMetodoVuelto({ ...metodoVuelto, monto: valor });
                                }
                              } else {
                                if (tasaDelDia <= 0) {
                                  setMetodoVuelto({ ...metodoVuelto, monto: valor });
                                  return;
                                }
                                const montoIngresado = parseFloat(valor) || 0;
                                const montoEnUSD = montoIngresado / tasaDelDia;
                                // Usar tolerancia para errores de redondeo
                                if (montoEnUSD > vueltoPendiente + 0.01) {
                                  const maxBs = vueltoPendiente * tasaDelDia;
                                  setMetodoVuelto({ ...metodoVuelto, monto: maxBs.toFixed(2) });
                                  alert(`El monto no puede ser mayor al vuelto pendiente (${(maxBs || 0).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs)`);
                                } else {
                                  setMetodoVuelto({ ...metodoVuelto, monto: valor });
                                }
                              }
                            }}
                            placeholder={metodoVuelto.divisa === "USD" ? "Monto en USD" : "Monto en Bs"}
                            className="w-full text-sm"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleDarVuelto();
                              }
                            }}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            Máximo: {metodoVuelto.divisa === "USD" 
                              ? `$${(calcularVuelto() || 0).toFixed(2)} USD`
                              : `${((calcularVuelto() || 0) * (tasaDelDia || 0)).toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
                            }
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            onClick={handleDarVuelto}
                            className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white text-sm"
                            size="sm"
                          >
                            Agregar Vuelto
                          </Button>
                          <Button
                            onClick={() => {
                              setMostrarDarVuelto(false);
                              setMetodoVuelto({ tipo: "efectivo", divisa: "USD", monto: "" });
                            }}
                            variant="outline"
                            className="flex-1 text-sm"
                            size="sm"
                          >
                            Cerrar
                          </Button>
                        </div>
                        {calcularVuelto() > 0.01 && (
                          <p className="text-xs text-yellow-700 text-center">
                            Puede agregar más métodos de pago para completar el vuelto
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </>
              )}
              {(() => {
                const totalUsd = calcularTotalUsd();
                const pagadoUsd = calcularTotalPagadoUsd();
                const faltaUsd = totalUsd - pagadoUsd;
                const faltaBs = tasaDelDia > 0 ? faltaUsd * tasaDelDia : 0;
                
                if (faltaUsd > 0.01) {
                  return (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-semibold text-red-800">Falta por pagar:</span>
                        <span className="font-bold text-red-900">${faltaUsd.toFixed(2)} USD</span>
                      </div>
                      {tasaDelDia > 0 && (
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-red-700">Falta por pagar (Bs):</span>
                          <span className="font-semibold text-red-800">
                            {faltaBs.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            Bs
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleConfirmarVenta}
                className="flex-1"
                disabled={!puedeConfirmar()}
              >
                Confirmar e Imprimir Factura
              </Button>
              <Button
                onClick={() => setShowPagoModal(false)}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Cerrar Caja */}
      {showCerrarCajaModal && sucursalSeleccionada && cajeroSeleccionado && (
        <AgregarCuadreModal
          farmacia={sucursalSeleccionada.id}
          dia={new Date().toISOString().split('T')[0]}
          onClose={() => {
            setShowCerrarCajaModal(false);
            setTotalCajaSistemaUsd(0);
            setCostoInventarioTotal(0);
          }}
          cajeroPrellenado={cajeroSeleccionado.NOMBRE}
          tasaPrellenada={tasaDelDia}
          totalCajaSistemaUsd={totalCajaSistemaUsd}
          costoInventarioPrellenado={costoInventarioTotal}
          deshabilitarCajero={true}
          fondoCaja={fondoCaja}
          facturasProcesadas={facturasProcesadas}
          onCerrarCajaCompleto={handleCerrarCajaFinal}
        />
      )}

      {/* Modal de Crear Cliente */}
      <Dialog open={showClienteModal} onOpenChange={setShowClienteModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <Input
                type="text"
                value={cedulaCliente}
                onChange={(e) => setCedulaCliente(e.target.value)}
                placeholder="Ingrese la cédula"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <Input
                type="text"
                value={nombreCliente}
                onChange={(e) => setNombreCliente(e.target.value)}
                placeholder="Ingrese el nombre completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <Input
                type="text"
                value={direccionCliente}
                onChange={(e) => setDireccionCliente(e.target.value)}
                placeholder="Ingrese la dirección"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número de Teléfono</label>
              <Input
                type="text"
                value={telefonoCliente}
                onChange={(e) => setTelefonoCliente(e.target.value)}
                placeholder="Ingrese el número de teléfono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Porcentaje de Descuento (%)</label>
              <Input
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={porcentajeDescuentoCliente}
                onChange={(e) => setPorcentajeDescuentoCliente(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingrese el porcentaje de descuento que aplicará a este cliente (0-100)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCrearCliente}
                className="flex-1"
                disabled={creandoCliente || !cedulaCliente.trim() || !nombreCliente.trim()}
              >
                {creandoCliente ? "Creando..." : "Crear Cliente"}
              </Button>
              <Button
                onClick={() => {
                  setShowClienteModal(false);
                  setCedulaCliente("");
                  setNombreCliente("");
                  setDireccionCliente("");
                  setTelefonoCliente("");
                  setPorcentajeDescuentoCliente("");
                }}
                variant="outline"
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Preliminar de Factura */}
      <Dialog open={showFacturaModal} onOpenChange={setShowFacturaModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Factura #{facturaSeleccionada?.numero_factura || facturaSeleccionada?._id || "N/A"}
            </DialogTitle>
          </DialogHeader>
          
          {facturaSeleccionada && (
            <div className="space-y-4">
              {/* Información General */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">Fecha:</div>
                  <div className="font-semibold">
                    {new Date(facturaSeleccionada.fecha).toLocaleString('es-VE')}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Sucursal:</div>
                  <div className="font-semibold">
                    {facturaSeleccionada.sucursal?.nombre || sucursalSeleccionada.nombre}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cajero:</div>
                  <div className="font-semibold">{facturaSeleccionada.cajero}</div>
                </div>
                {facturaSeleccionada.cliente && (
                  <div>
                    <div className="text-sm text-gray-600">Cliente:</div>
                    <div className="font-semibold">
                      {facturaSeleccionada.cliente.nombre}
                      {facturaSeleccionada.cliente.cedula && ` (C.I.: ${facturaSeleccionada.cliente.cedula})`}
                    </div>
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-2">Items:</h3>
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-sm font-semibold">Descripción</th>
                        <th className="px-4 py-2 text-center text-sm font-semibold">Cantidad</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Precio Unit.</th>
                        <th className="px-4 py-2 text-right text-sm font-semibold">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {facturaSeleccionada.items?.map((item: any, index: number) => (
                        <tr key={index} className="border-t">
                          <td className="px-4 py-2">
                            <div className="font-medium">{item.nombre}</div>
                            {item.codigo && (
                              <div className="text-sm text-gray-500">Código: {item.codigo}</div>
                            )}
                            {item.descuento_aplicado && item.descuento_aplicado > 0 && (
                              <div className="text-sm text-red-600">
                                Descuento: {item.descuento_aplicado}%
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">{item.cantidad}</td>
                          <td className="px-4 py-2 text-right">
                            ${item.precio_unitario_usd?.toFixed(2) || '0.00'} USD
                          </td>
                          <td className="px-4 py-2 text-right">
                            ${item.subtotal_usd?.toFixed(2) || '0.00'} USD
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Totales */}
              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    {facturaSeleccionada.porcentaje_descuento && facturaSeleccionada.porcentaje_descuento > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Descuento ({facturaSeleccionada.porcentaje_descuento}%):</span>
                        <span className="text-red-600">
                          -${(facturaSeleccionada.total_usd * facturaSeleccionada.porcentaje_descuento / 100).toFixed(2)} USD
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between font-semibold text-lg">
                      <span>Total:</span>
                      <span>${facturaSeleccionada.total_usd?.toFixed(2) || '0.00'} USD</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Total:</span>
                      <span>{facturaSeleccionada.total_bs?.toFixed(2) || '0.00'} Bs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Métodos de Pago */}
              <div>
                <h3 className="font-semibold mb-2">Métodos de Pago:</h3>
                <div className="space-y-1">
                  {facturaSeleccionada.metodos_pago?.map((metodo: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span>{metodo.tipo.toUpperCase()} ({metodo.divisa}):</span>
                      <span>
                        {metodo.divisa === "USD" ? "$" : ""}
                        {metodo.monto.toFixed(2)} {metodo.divisa === "Bs" ? "Bs" : ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botones de Acción */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button
                  onClick={() => handleDevolucionCompra(facturaSeleccionada)}
                  variant="default"
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Devolución de Compra
                </Button>
                <Button
                  onClick={() => handleImprimirFactura(facturaSeleccionada)}
                  variant="default"
                >
                  Imprimir Factura
                </Button>
                <Button
                  onClick={() => setShowFacturaModal(false)}
                  variant="outline"
                >
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Componente de Ticket de Factura - Se renderiza cuando hay datos del ticket */}
      {ticketData && (
        <TicketFactura
          numeroFactura={ticketData.numeroFactura}
          fecha={ticketData.fecha}
          hora={ticketData.hora}
          sucursal={ticketData.sucursal}
          cajero={ticketData.cajero}
          cliente={ticketData.cliente}
          items={ticketData.items}
          metodosPago={ticketData.metodosPago}
          totalBs={ticketData.totalBs}
          totalUsd={ticketData.totalUsd}
          tasaDia={ticketData.tasaDia}
          porcentajeDescuento={ticketData.porcentajeDescuento}
          vuelto={ticketData.vuelto}
          onImpreso={() => setTicketData(null)}
        />
      )}

      {/* Modal de Devolución de Compra */}
      {showModalDevolucion && facturaParaDevolucion && (
        <ModalDevolucionCompra
          factura={facturaParaDevolucion}
          onClose={handleCerrarModalDevolucion}
          onSuccess={handleCerrarModalDevolucion}
        />
      )}
    </div>
  );
};

export default PuntoVentaPage;
