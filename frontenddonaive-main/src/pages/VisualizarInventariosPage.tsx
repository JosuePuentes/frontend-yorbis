import React, { useEffect, useState, useMemo } from "react";
import UploadInventarioExcel from "../components/UploadInventarioExcel";
import ModificarItemInventarioModal from "../components/ModificarItemInventarioModal";
import VerItemsInventarioModal from "../components/VerItemsInventarioModal";
import CargarExistenciasModal from "../components/CargarExistenciasModal";
import CargarExistenciasMasivaModal from "../components/CargarExistenciasMasivaModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Edit, Eye, Search, Plus, Package } from "lucide-react";

interface Inventario {
  _id: string;
  fecha: string;
  farmacia: string;
  costo: number;
  usuarioCorreo: string;
  totalExistencias?: number; // Total de existencias de todos los items
  porcentaje_descuento?: number; // Porcentaje de descuento aplicado al inventario
}

interface FarmaciaChip {
  id: string;
  nombre: string;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VisualizarInventariosPage: React.FC = () => {
  const [inventarios, setInventarios] = useState<Inventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [farmacias, setFarmacias] = useState<FarmaciaChip[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventarioAEliminar, setInventarioAEliminar] = useState<Inventario | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [showModificarModal, setShowModificarModal] = useState(false);
  const [inventarioSeleccionado, setInventarioSeleccionado] = useState<Inventario | null>(null);
  const [showVerItemsModal, setShowVerItemsModal] = useState(false);
  const [inventarioParaVer, setInventarioParaVer] = useState<Inventario | null>(null);
  const [refreshItemsTrigger, setRefreshItemsTrigger] = useState(0);
  const [descuentosPorInventario, setDescuentosPorInventario] = useState<{ [key: string]: number }>({});
  const [itemsInventarios, setItemsInventarios] = useState<any[]>([]); // Items individuales de todos los inventarios
  const [itemAModificar, setItemAModificar] = useState<any | null>(null); // Item específico a modificar
  
  // Estados para la vista de productos
  const [todosLosProductos, setTodosLosProductos] = useState<any[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [vistaTabla, setVistaTabla] = useState(true); // true = vista tabla productos (PREDETERMINADA), false = vista inventarios
  const [productoAEditar, setProductoAEditar] = useState<any | null>(null);
  const [productoAEliminar, setProductoAEliminar] = useState<any | null>(null);
  const [showEliminarProductoModal, setShowEliminarProductoModal] = useState(false);
  const [eliminandoProducto, setEliminandoProducto] = useState(false);
  const [showCargarExistenciasModal, setShowCargarExistenciasModal] = useState(false);
  const [sucursalSeleccionadaParaCargar, setSucursalSeleccionadaParaCargar] = useState<string>("");
  const [showCargarExistenciasMasivaModal, setShowCargarExistenciasMasivaModal] = useState(false);
  const [sucursalSeleccionadaParaCargarMasiva, setSucursalSeleccionadaParaCargarMasiva] = useState<string>("");

  const fetchInventarios = async (): Promise<Inventario[]> => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        console.warn("No se encontró token de autenticación. Redirigiendo a login...");
        // Redirigir a login si no hay token
        window.location.href = "/login";
        return [];
      }
      
      const res = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      
      if (res.status === 401 || res.status === 403) {
        // Token inválido o expirado
        console.warn("Token inválido o expirado. Limpiando y redirigiendo a login...");
        localStorage.removeItem("access_token");
        localStorage.removeItem("usuario");
        window.location.href = "/login";
        return [];
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || `Error al obtener inventarios: ${res.status} ${res.statusText}`);
      }
      
      const data = await res.json();
      const inventariosArray = Array.isArray(data) ? data : [];
      setInventarios(inventariosArray);
      
      // Inicializar descuentos desde los inventarios
      const descuentosIniciales: { [key: string]: number } = {};
      inventariosArray.forEach((inv: Inventario) => {
        if (inv.porcentaje_descuento !== undefined && inv.porcentaje_descuento !== null) {
          descuentosIniciales[inv._id] = inv.porcentaje_descuento;
        }
      });
      setDescuentosPorInventario(descuentosIniciales);
      
      return inventariosArray;
    } catch (err: any) {
      // No mostrar error si es una redirección
      if (err.message?.includes("login") || window.location.pathname === "/login") {
        return [];
      }
      setError(err.message || "Error al obtener inventarios");
      console.error("Error al obtener inventarios:", err);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventarios();
  }, []);

  // Cargar todos los productos desde las compras (para obtener utilidad de la compra)
  const cargarTodosLosProductos = async () => {
    setCargandoProductos(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // ✅ NUEVO: Cargar productos desde inventarios directamente (para productos nuevos y existencias actualizadas)
      const productosDesdeInventarios: any[] = [];
      try {
        // Usar los inventarios que ya están cargados en el estado
        for (const inventario of inventarios) {
          const inventarioAny = inventario as any;
          if (inventarioAny.estado && inventarioAny.estado !== "activo") continue;
          
          const inventarioId = inventarioAny._id || inventarioAny.id;
          const resItems = await fetch(
            `${API_BASE_URL}/inventarios/${inventarioId}/items`,
            {
              headers: { "Authorization": `Bearer ${token}` }
            }
          );
          
          if (resItems.ok) {
            const items = await resItems.json();
            const itemsArray = Array.isArray(items) ? items : [];
            
            itemsArray.forEach((item: any) => {
              const productoId = item._id || item.id || item.codigo;
              const costo = Number(item.costo_unitario || item.costo || 0);
              const precio = Number(item.precio_unitario || item.precio || 0);
              const utilidad = precio - costo;
              const farmaciaId = inventarioAny.farmacia || inventarioAny.sucursal_id || "";
              const farmaciaNombre = farmacias.find(f => f.id === farmaciaId)?.nombre || farmaciaId;
              
              productosDesdeInventarios.push({
                _id: productoId,
                codigo: item.codigo || "",
                descripcion: item.descripcion || item.nombre || "",
                marca: item.marca || item.marca_producto || "",
                costo: costo,
                costo_unitario: costo,
                utilidad: utilidad,
                utilidad_porcentaje: costo > 0 ? (utilidad / costo) * 100 : 0,
                precio: precio,
                precio_unitario: precio,
                cantidad: Number(item.cantidad || item.existencia || 0),
                existencia: Number(item.cantidad || item.existencia || 0),
                fecha_carga: inventarioAny.fecha || new Date().toISOString().split('T')[0],
                sucursal_id: farmaciaId,
                sucursal_nombre: farmaciaNombre,
                inventario_id: inventarioId,
                desdeInventario: true, // Marcar que viene de inventario
              });
            });
          }
        }
        console.log(`✅ [INVENTARIOS] Productos cargados desde inventarios: ${productosDesdeInventarios.length}`);
      } catch (err) {
        console.warn("⚠️ [INVENTARIOS] Error al cargar productos desde inventarios:", err);
      }

      // Obtener todas las compras (para productos históricos)
      const resCompras = await fetch(`${API_BASE_URL}/compras`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!resCompras.ok) {
        throw new Error("Error al obtener compras");
      }

      const comprasData = await resCompras.json();
      const comprasArray = Array.isArray(comprasData) ? comprasData : [];

      console.log(`🔍 [INVENTARIOS] Compras obtenidas: ${comprasArray.length}`);

      // Extraer productos de todas las compras
      const todosLosProductos: any[] = [];
      
      // ✅ CRÍTICO: Crear mapa de productos desde inventarios (tienen datos más actualizados)
      // Usar código como clave principal, pero también mapear por _id para evitar duplicados
      const productosInventarioMap = new Map<string, any>();
      const productosPorIdMap = new Map<string, any>();
      
      productosDesdeInventarios.forEach((p: any) => {
        const codigo = p.codigo || "";
        const id = p._id || "";
        
        // Mapear por código (normalizar a mayúsculas para evitar duplicados por mayúsculas/minúsculas)
        if (codigo) {
          const codigoKey = codigo.trim().toUpperCase();
          if (!productosInventarioMap.has(codigoKey)) {
            productosInventarioMap.set(codigoKey, p);
          }
        }
        
        // También mapear por ID para referencia
        if (id) {
          productosPorIdMap.set(String(id), p);
        }
      });
      
      console.log(`✅ [INVENTARIOS] Productos únicos desde inventarios: ${productosInventarioMap.size}`);

      comprasArray.forEach((compra: any) => {
        // Normalizar items/productos - el backend puede enviar "productos" o "items"
        const items = compra.items || compra.productos || [];
        const fechaCompra = compra.fecha || compra.fecha_compra || compra.fecha_creacion;
        const sucursalId = compra.sucursal_id || compra.farmacia || "";
        const sucursalNombre = farmacias.find(f => f.id === sucursalId || f.nombre === sucursalId)?.nombre || sucursalId;

        items.forEach((item: any) => {
          // Obtener utilidad de la compra (puede venir como utilidad, utilidad_contable, o porcentaje)
          const utilidadPorcentaje = Number(item.utilidad || item.utilidad_contable || item.porcentaje_ganancia || 0);
          const costo = Number(item.precioUnitario || item.precio_unitario || item.costo || item.costo_unitario || 0);
          
          // Calcular utilidad en dinero si viene como porcentaje
          let utilidadEnDinero = 0;
          if (utilidadPorcentaje > 0 && utilidadPorcentaje <= 100) {
            // Es porcentaje, calcular utilidad en dinero
            utilidadEnDinero = (costo * utilidadPorcentaje) / 100;
          } else if (utilidadPorcentaje > 100) {
            // Es utilidad en dinero directamente
            utilidadEnDinero = utilidadPorcentaje;
          } else {
            // Intentar obtener de precio_venta - costo
            const precioVenta = Number(item.precio_venta || item.precioVenta || 0);
            if (precioVenta > 0) {
              utilidadEnDinero = precioVenta - costo;
            }
          }

          // Calcular precio = costo + utilidad
          const precio = costo + utilidadEnDinero;

          // Buscar el inventario correspondiente a esta compra/sucursal
          // Necesitamos encontrar el inventario_id para poder editar el producto
          let inventarioId = "";
          if (compra.inventario_id) {
            inventarioId = compra.inventario_id;
          } else {
            // Intentar encontrar el inventario por fecha y sucursal
            const inventarioEncontrado = inventarios.find((inv: any) => 
              inv.farmacia === sucursalId && inv.fecha === fechaCompra
            );
            if (inventarioEncontrado) {
              inventarioId = inventarioEncontrado._id;
            }
          }

          const codigoProducto = item.codigo || item.codigo_producto || "";
          // ✅ CRÍTICO: Normalizar código a mayúsculas para coincidencia
          const codigoKey = codigoProducto.trim().toUpperCase();
          const productoDesdeInventario = codigoKey ? productosInventarioMap.get(codigoKey) : null;
          
          // ✅ Si el producto existe en inventario, usar esos datos (más actualizados)
          // Si no, usar los datos de la compra
          if (productoDesdeInventario) {
            // Actualizar con datos de inventario pero mantener referencia a compra
            todosLosProductos.push({
              ...productoDesdeInventario,
              compra_id: compra._id,
              fecha_carga: fechaCompra,
            });
            // ✅ NO eliminar del mapa aquí - puede haber múltiples compras con el mismo producto
            // Solo marcar que ya se agregó desde compra
          } else {
            // Producto solo en compras (histórico)
            const producto = {
              _id: item._id || item.id || `${compra._id}_${codigoProducto || Math.random()}`,
              codigo: codigoProducto,
              descripcion: item.nombre || item.descripcion || item.descripcion_producto || "",
              marca: item.marca || item.marca_producto || "",
              costo: costo,
              costo_unitario: costo,
              utilidad: utilidadEnDinero,
              utilidad_porcentaje: utilidadPorcentaje > 0 && utilidadPorcentaje <= 100 ? utilidadPorcentaje : ((utilidadEnDinero / (costo || 1)) * 100),
              precio: precio,
              precio_unitario: precio,
              cantidad: Number(item.cantidad || item.existencia || item.stock || 0),
              existencia: Number(item.cantidad || item.existencia || item.stock || 0),
              fecha_carga: fechaCompra,
              sucursal_id: sucursalId,
              sucursal_nombre: sucursalNombre,
              compra_id: compra._id,
              inventario_id: inventarioId
            };
            todosLosProductos.push(producto);
          }
        });
      });
      
      // ✅ CRÍTICO: Agregar productos que solo están en inventarios (productos nuevos creados directamente)
      // Estos son productos que NO están en compras, solo en inventarios activos
      const productosAgregadosDesdeCompras = new Set<string>();
      todosLosProductos.forEach((p: any) => {
        const codigo = (p.codigo || "").trim().toUpperCase();
        if (codigo) productosAgregadosDesdeCompras.add(codigo);
      });
      
      productosInventarioMap.forEach((producto: any, codigoKey: string) => {
        // Solo agregar si NO fue agregado desde compras
        if (!productosAgregadosDesdeCompras.has(codigoKey)) {
          todosLosProductos.push(producto);
        }
      });
      
      // ✅ CRÍTICO: Eliminar duplicados finales por código (por si acaso)
      const productosUnicos = new Map<string, any>();
      todosLosProductos.forEach((producto: any) => {
        const codigo = (producto.codigo || "").trim().toUpperCase();
        const id = String(producto._id || "");
        
        // Prioridad: si ya existe por código, usar el que tiene más datos (inventario > compra)
        if (codigo) {
          const existente = productosUnicos.get(codigo);
          if (!existente || (producto.desdeInventario && !existente.desdeInventario)) {
            productosUnicos.set(codigo, producto);
          }
        } else if (id) {
          // Si no tiene código, usar ID
          if (!productosUnicos.has(id)) {
            productosUnicos.set(id, producto);
          }
        }
      });
      
      const productosFinales = Array.from(productosUnicos.values());
      console.log(`✅ [INVENTARIOS] Productos finales únicos: ${productosFinales.length} (después de eliminar duplicados)`);
      
      if (productosFinales.length > 0) {
        console.log(`📦 [INVENTARIOS] Primer producto:`, {
          codigo: productosFinales[0].codigo,
          descripcion: productosFinales[0].descripcion,
          costo: productosFinales[0].costo,
          utilidad: productosFinales[0].utilidad,
          precio: productosFinales[0].precio,
          existencia: productosFinales[0].existencia
        });
      }
      
      setTodosLosProductos(productosFinales);
    } catch (err: any) {
      console.error("Error al cargar productos desde compras:", err);
      setError(err.message || "Error al cargar productos");
    } finally {
      setCargandoProductos(false);
    }
  };

  // Cargar productos al montar el componente (vista tabla es predeterminada)
  useEffect(() => {
    if (vistaTabla && todosLosProductos.length === 0 && !cargandoProductos) {
      console.log("🔄 [INVENTARIOS] Cargando productos iniciales...");
      cargarTodosLosProductos();
    }
  }, [vistaTabla, todosLosProductos.length, cargandoProductos]);
  
  // Cargar productos cuando se cambia a vista tabla
  useEffect(() => {
    if (vistaTabla && todosLosProductos.length === 0 && !cargandoProductos) {
      console.log("🔄 [INVENTARIOS] Cambiando a vista tabla, cargando productos...");
      cargarTodosLosProductos();
    }
  }, [vistaTabla]);

  // Filtrar productos según búsqueda (solo por código y descripción)
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) {
      return todosLosProductos;
    }

    const busquedaLower = busquedaProducto.toLowerCase().trim();
    return todosLosProductos.filter((producto: any) => {
      const codigo = (producto.codigo || "").toLowerCase();
      const descripcion = (producto.descripcion || "").toLowerCase();
      
      return codigo.includes(busquedaLower) ||
             descripcion.includes(busquedaLower);
    });
  }, [todosLosProductos, busquedaProducto]);

  // Calcular totales
  const totales = useMemo(() => {
    const totalItems = productosFiltrados.length;
    // Total Costo Inventario = suma de (costo * existencia) de todos los productos
    const totalCostoInventario = productosFiltrados.reduce((sum, producto: any) => {
      const cantidad = Number(producto.cantidad || producto.existencia || 0);
      const costo = Number(producto.costo_unitario || producto.costo || 0);
      return sum + (cantidad * costo);
    }, 0);

    return {
      totalItems,
      totalCostoInventario
    };
  }, [productosFiltrados]);

  // Cargar productos al montar el componente
  useEffect(() => {
    if (todosLosProductos.length === 0 && !cargandoProductos) {
      console.log("🔄 [INVENTARIOS] Cargando productos iniciales...");
      cargarTodosLosProductos();
    }
  }, []);

  // Este useEffect ya no es necesario porque ahora mostramos items individuales
  // Se mantiene comentado por si se necesita en el futuro

  // Cargar todos los items de todos los inventarios para mostrar en la tabla
  useEffect(() => {
    let cancelado = false;
    
    const cargarItemsInventarios = async () => {
      if (inventarios.length === 0) {
        if (!cancelado) {
          setItemsInventarios([]);
        }
        return;
      }
      
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const todosLosItems: any[] = [];
      
      // Cargar items en paralelo para todos los inventarios
      const promesas = inventarios.map(async (inventario) => {
        try {
          const res = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items)) {
              const farmaciaNombre = farmacias.find(f => f.id === inventario.farmacia || f.nombre === inventario.farmacia)?.nombre || inventario.farmacia;
              const fechaCarga = inventario.fecha ? new Date(inventario.fecha).toLocaleDateString('es-VE') : 'N/A';
              
              items.forEach((item: any) => {
                todosLosItems.push({
                  ...item,
                  inventario_id: inventario._id,
                  sucursal_nombre: farmaciaNombre,
                  sucursal_id: inventario.farmacia,
                  fecha_carga: fechaCarga,
                });
              });
            }
          }
        } catch (err) {
          console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
        }
      });

      await Promise.all(promesas);
      
      if (!cancelado) {
        setItemsInventarios(todosLosItems);
      }
    };

    cargarItemsInventarios();
    
    return () => {
      cancelado = true;
    };
  }, [inventarios, farmacias]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/farmacias`)
      .then(res => res.json())
      .then(data => {
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      });
  }, []);

  const handleCerrarVerItems = () => {
    setShowVerItemsModal(false);
    setInventarioParaVer(null);
  };

  const handleCerrarModal = async () => {
    console.log('[handleCerrarModal] Iniciando actualización después de modificar item...');
    // Refrescar la lista después de modificar
    await fetchInventarios();
    console.log('[handleCerrarModal] Inventarios actualizados');
    // Si el modal de ver items está abierto, refrescar también esos datos
    if (showVerItemsModal && inventarioParaVer) {
      console.log('[handleCerrarModal] Refrescando modal de ver items');
      setRefreshItemsTrigger(prev => prev + 1);
    }
    // Recargar items después de modificar
    const token = localStorage.getItem("access_token");
    if (token) {
      const todosLosItems: any[] = [];
      const promesas = inventarios.map(async (inventario) => {
        try {
          const res = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const items = await res.json();
            if (Array.isArray(items)) {
              const farmaciaNombre = farmacias.find(f => f.id === inventario.farmacia || f.nombre === inventario.farmacia)?.nombre || inventario.farmacia;
              const fechaCarga = inventario.fecha ? new Date(inventario.fecha).toLocaleDateString('es-VE') : 'N/A';
              items.forEach((item: any) => {
                todosLosItems.push({
                  ...item,
                  inventario_id: inventario._id,
                  sucursal_nombre: farmaciaNombre,
                  sucursal_id: inventario.farmacia,
                  fecha_carga: fechaCarga,
                });
              });
            }
          }
        } catch (err) {
          console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
        }
      });
      await Promise.all(promesas);
      setItemsInventarios(todosLosItems);
    }
    // Cerrar el modal después de actualizar todo
    setShowModificarModal(false);
    setInventarioSeleccionado(null);
    console.log('[handleCerrarModal] Modal cerrado');
  };

  // Función recalcularTotales eliminada - ya no se necesita porque mostramos items individuales

  const handleCancelarEliminar = () => {
    setShowDeleteModal(false);
    setInventarioAEliminar(null);
  };

  const handleConfirmarEliminar = async () => {
    if (!inventarioAEliminar) return;

    setEliminando(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const response = await fetch(
        `${API_BASE_URL}/inventarios/${inventarioAEliminar._id}`,
        {
          method: "DELETE",
          headers: {
            "Authorization": `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || "Error al eliminar inventario");
      }

      // Refrescar la lista
      await fetchInventarios();
      setShowDeleteModal(false);
      setInventarioAEliminar(null);
    } catch (err: any) {
      setError(err.message || "Error al eliminar el inventario");
      console.error("Error al eliminar inventario:", err);
    } finally {
      setEliminando(false);
    }
  };




  const handleExportarTodos = async () => {
    try {
      setLoading(true);
      setError(null);

      // Importar xlsx dinámicamente
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule.default || XLSXModule) as any;

      // Preparar datos para Excel
      const data = [
        ["Fecha de Cargo", "Sucursal", "Costo Inventario", "Usuario"],
        ...inventariosFiltrados.map(i => [
          i.fecha?.slice(0, 10) || "",
          i.farmacia || "",
          i.costo || 0,
          i.usuarioCorreo || "",
        ]),
      ];

      // Crear workbook
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Inventarios");

      // Generar nombre de archivo
      const fecha = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const nombreArchivo = `Inventarios_${fecha}.xlsx`;

      // Descargar
      XLSX.writeFile(wb, nombreArchivo);
    } catch (err: any) {
      setError(`Error al exportar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Ordenar inventarios por fecha más reciente primero
  const inventariosFiltrados = inventarios
    .sort((a, b) => {
      const fechaA = a.fecha || "";
      const fechaB = b.fecha || "";
      return fechaB.localeCompare(fechaA);
    });

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">
            {vistaTabla ? "📊 Tabla de Productos" : "📦 Inventarios Registrados"}
          </h1>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                console.log("🔄 [INVENTARIOS] Cambiando vista, vistaTabla actual:", vistaTabla);
                const nuevaVista = !vistaTabla;
                setVistaTabla(nuevaVista);
                if (nuevaVista && todosLosProductos.length === 0 && !cargandoProductos) {
                  console.log("🔄 [INVENTARIOS] Cargando productos desde botón...");
                  cargarTodosLosProductos();
                }
              }}
              variant={vistaTabla ? "outline" : "default"}
              className={`flex items-center gap-2 ${
                vistaTabla 
                  ? "border-2 border-blue-600 text-blue-600 hover:bg-blue-50" 
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              } font-semibold px-6 py-2 shadow-md`}
            >
              {vistaTabla ? (
                <>
                  <Eye className="w-4 h-4" />
                  Vista Inventarios
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Vista Productos
                </>
              )}
            </Button>
            {inventariosFiltrados.length > 0 && !vistaTabla && (
            <Button
              onClick={handleExportarTodos}
              disabled={loading}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Todos a Excel
            </Button>
          )}
          </div>
        </div>
        
        {/* Componente para subir inventario desde Excel - Solo mostrar si no está en vista tabla */}
        {!vistaTabla && (
        <UploadInventarioExcel
          sucursales={farmacias}
          onSuccess={fetchInventarios}
        />
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {/* Vista de Tabla de Productos */}
        {vistaTabla ? (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            {/* Navbar con totales */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-sm font-medium opacity-90 mb-1">Total Inventario (Costo × Cantidad)</div>
                  <div className="text-3xl font-bold">
                    ${totales.totalCostoInventario.toLocaleString('es-VE', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                  <div className="text-xs opacity-75 mt-1">
                    {totales.totalItems.toLocaleString('es-VE')} productos únicos
                  </div>
                </div>
              </div>
            </div>

            {/* Buscador y Botón de Cargar Existencias */}
            <div className="p-4 border-b bg-slate-50">
              <div className="flex gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                  <Input
                    type="text"
                    placeholder="Buscar por código o descripción..."
                    value={busquedaProducto}
                    onChange={(e) => setBusquedaProducto(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
                <Button
                  onClick={() => {
                    // Obtener la primera sucursal disponible o permitir selección
                    if (farmacias.length > 0) {
                      setSucursalSeleccionadaParaCargar(farmacias[0].id);
                      setShowCargarExistenciasModal(true);
                    } else {
                      alert("No hay sucursales disponibles");
                    }
                  }}
                  className="flex items-center gap-2"
                  variant="outline"
                >
                  <Plus className="w-4 h-4" />
                  Cargar Existencias
                </Button>
                <Button
                  onClick={() => {
                    // Obtener la primera sucursal disponible o permitir selección
                    if (farmacias.length > 0) {
                      setSucursalSeleccionadaParaCargarMasiva(farmacias[0].id);
                      setShowCargarExistenciasMasivaModal(true);
                    } else {
                      alert("No hay sucursales disponibles");
                    }
                  }}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Package className="w-4 h-4" />
                  Carga Masiva
                </Button>
              </div>
              <div className="mt-2 text-sm text-slate-600">
                Mostrando {productosFiltrados.length} de {todosLosProductos.length} productos
              </div>
            </div>

            {/* Tabla de productos */}
            {cargandoProductos ? (
              <div className="text-center py-10 text-slate-500">
                <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Cargando productos...
              </div>
            ) : productosFiltrados.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <p>No se encontraron productos</p>
              </div>
            ) : (
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sucursal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha de Carga</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Marca</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                        Utilidad (%)
                        <div className="text-xs font-normal text-green-600 mt-1">Meta: 40%</div>
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Existencia</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Total $</th>
                      <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {productosFiltrados.map((producto: any, index: number) => {
                      const costo = Number(producto.costo_unitario || producto.costo || 0);
                      const cantidad = Number(producto.cantidad || producto.existencia || 0);
                      
                      // ✅ SIEMPRE usar 40% de utilidad por defecto
                      const porcentajeGanancia = 40.0;
                      
                      // ✅ Calcular precio de venta: costo + (costo * 40%)
                      // Si hay precio_unitario, recalcular el porcentaje real, pero mostrar 40% como meta
                      let precio = Number(producto.precio_unitario || producto.precio || 0);
                      if (precio === 0 && costo > 0) {
                        // Calcular precio desde costo + 40% de utilidad
                        precio = costo * (1 + porcentajeGanancia / 100);
                      } else if (precio > 0 && costo > 0) {
                        // Si ya hay precio, recalcular el porcentaje real para comparación
                        const porcentajeReal = ((precio - costo) / costo) * 100;
                        // Si el porcentaje real es muy diferente de 40%, ajustar el precio a 40%
                        if (Math.abs(porcentajeReal - porcentajeGanancia) > 0.1) {
                          precio = costo * (1 + porcentajeGanancia / 100);
                        }
                      }
                      
                      const total = costo * cantidad; // Total = Costo × Cantidad
                      
                      return (
                        <tr key={producto._id || producto.id || index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm text-slate-700">{producto.sucursal_nombre || producto.sucursal_id || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600 whitespace-nowrap">
                            {producto.fecha_carga ? new Date(producto.fecha_carga).toLocaleDateString('es-VE') : "-"}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{producto.codigo || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{producto.descripcion || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {producto.marca || producto.marca_producto || (
                              <span className="text-slate-400 italic">Sin marca</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700">
                            ${costo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right">
                            <span className={`text-base font-bold ${
                              Math.abs(porcentajeGanancia - 40.0) < 0.01 
                                ? 'text-green-700 bg-green-100 px-3 py-1 rounded' 
                                : porcentajeGanancia > 40.0 
                                  ? 'text-blue-600' 
                                  : 'text-orange-600'
                            }`}>
                              {porcentajeGanancia.toFixed(2)}%
                              {Math.abs(porcentajeGanancia - 40.0) < 0.01 && ' ✓'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                            ${precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700">{cantidad.toLocaleString('es-VE')}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                            ${total.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-center">
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setProductoAEditar(producto)}
                                className="flex items-center gap-1"
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => {
                                  setProductoAEliminar(producto);
                                  setShowEliminarProductoModal(true);
                                }}
                                className="flex items-center gap-1"
                              >
                                <Trash2 className="w-4 h-4" />
                                Eliminar
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 sticky bottom-0">
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-sm font-bold text-slate-900">TOTALES</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        ${productosFiltrados.reduce((sum, p: any) => sum + Number(p.costo_unitario || p.costo || 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-700 bg-green-100 px-3 py-1 rounded">
                        40.00% ✓
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        ${productosFiltrados.reduce((sum, p: any) => sum + Number(p.precio_unitario || p.precio || 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        {productosFiltrados.reduce((sum, p: any) => sum + Number(p.cantidad || p.existencia || 0), 0).toLocaleString('es-VE')}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-blue-600">
                        ${productosFiltrados.reduce((sum, p: any) => {
                          const cantidad = Number(p.cantidad || p.existencia || 0);
                          const costo = Number(p.costo_unitario || p.costo || 0);
                          return sum + (cantidad * costo);
                        }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ) : loading ? (
          <div className="text-center py-10 text-slate-500 text-lg">
            <svg className="animate-spin h-8 w-8 text-indigo-600 mx-auto mb-3" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Cargando inventarios...
          </div>
        ) : inventariosFiltrados.length === 0 ? (
          <div className="text-center text-slate-500 py-10 bg-white p-6 rounded-lg shadow-lg">
            <svg className="mx-auto h-12 w-12 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
            </svg>
            <h3 className="mt-2 text-lg font-medium text-slate-800">No hay inventarios registrados</h3>
            <p className="mt-1 text-sm text-slate-500">Aún no se han cargado inventarios desde Excel.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-100">
                  <tr>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Sucursal
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Fecha de Carga
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Código
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Descripción
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Marca
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Costo del Producto
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Utilidad (%)
                      <div className="text-xs font-normal text-green-600 mt-1">Meta: 40%</div>
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Existencia
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {itemsInventarios.map((item: any, index: number) => {
                    const costo = Number(item.costo_unitario || item.costo || 0);
                    const utilidadPorcentaje = Number(item.utilidad_porcentaje || item.porcentaje_ganancia || item.porcentaje_utilidad || 0);
                    const cantidad = Number(item.cantidad || item.existencia || 0);
                    
                    // ✅ Calcular porcentaje de ganancia - SIEMPRE usar 40% por defecto si no viene
                    let porcentajeGanancia = utilidadPorcentaje;
                    if (porcentajeGanancia === 0 || porcentajeGanancia === null || porcentajeGanancia === undefined) {
                      // Si no hay porcentaje definido, usar 40% por defecto
                      porcentajeGanancia = 40.0;
                    }
                    
                    // ✅ Calcular precio de venta: costo + (costo * porcentajeGanancia / 100)
                    // Si no hay precio_unitario, calcularlo desde costo + utilidad
                    let precio = Number(item.precio_unitario || item.precio || 0);
                    if (precio === 0 && costo > 0) {
                      // Calcular precio desde costo + porcentaje de utilidad
                      precio = costo * (1 + porcentajeGanancia / 100);
                    }
                    
                    return (
                      <tr key={item._id || item.id || index} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                          {item.sucursal_nombre || item.sucursal_id || "-"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">
                          {item.fecha_carga || "-"}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {item.codigo || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-700">
                          {item.descripcion || item.nombre || "-"}
                        </td>
                        <td className="px-5 py-4 text-sm text-slate-600">
                          {item.marca || item.marca_producto || (
                            <span className="text-slate-400 italic">Sin marca</span>
                          )}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right font-semibold">
                          ${costo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-right">
                          <span className={`text-base font-bold ${
                            Math.abs(porcentajeGanancia - 40.0) < 0.01 
                              ? 'text-green-700 bg-green-100 px-3 py-1 rounded' 
                              : porcentajeGanancia > 40.0 
                                ? 'text-blue-600' 
                                : 'text-orange-600'
                          }`}>
                            {porcentajeGanancia.toFixed(2)}%
                            {Math.abs(porcentajeGanancia - 40.0) < 0.01 && ' ✓'}
                          </span>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right font-semibold">
                          {cantidad.toLocaleString('es-VE')}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => {
                                setItemAModificar(item);
                                setInventarioSeleccionado(inventarios.find(inv => inv._id === item.inventario_id) || null);
                                setShowModificarModal(true);
                              }}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Modificar Item
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal de ver items */}
        {showVerItemsModal && inventarioParaVer && (
          <VerItemsInventarioModal
            open={showVerItemsModal}
            onClose={handleCerrarVerItems}
            inventarioId={inventarioParaVer._id}
            inventarioNombre={farmacias.find(f => f.id === inventarioParaVer.farmacia || f.nombre === inventarioParaVer.farmacia)?.nombre || inventarioParaVer.farmacia}
            refreshTrigger={refreshItemsTrigger}
            porcentajeDescuento={descuentosPorInventario[inventarioParaVer._id] ?? inventarioParaVer.porcentaje_descuento ?? 0}
          />
        )}

        {/* Modal de modificar items */}
        {showModificarModal && inventarioSeleccionado && (
          <ModificarItemInventarioModal
            open={showModificarModal}
            onClose={() => {
              handleCerrarModal();
              setItemAModificar(null);
            }}
            inventarioId={inventarioSeleccionado._id}
            sucursalId={farmacias.find(f => f.id === inventarioSeleccionado.farmacia || f.nombre === inventarioSeleccionado.farmacia)?.id || inventarioSeleccionado.farmacia}
            onSuccess={() => {
              handleCerrarModal();
              setItemAModificar(null);
              // Recargar items después de modificar
              const cargarItems = async () => {
                const token = localStorage.getItem("access_token");
                if (!token) return;
                const todosLosItems: any[] = [];
                const promesas = inventarios.map(async (inventario) => {
                  try {
                    const res = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
                      headers: { Authorization: `Bearer ${token}` },
                    });
                    if (res.ok) {
                      const items = await res.json();
                      if (Array.isArray(items)) {
                        const farmaciaNombre = farmacias.find(f => f.id === inventario.farmacia || f.nombre === inventario.farmacia)?.nombre || inventario.farmacia;
                        const fechaCarga = inventario.fecha ? new Date(inventario.fecha).toLocaleDateString('es-VE') : 'N/A';
                        items.forEach((item: any) => {
                          todosLosItems.push({
                            ...item,
                            inventario_id: inventario._id,
                            sucursal_nombre: farmaciaNombre,
                            sucursal_id: inventario.farmacia,
                            fecha_carga: fechaCarga,
                          });
                        });
                      }
                    }
                  } catch (err) {
                    console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
                  }
                });
                await Promise.all(promesas);
                setItemsInventarios(todosLosItems);
              };
              cargarItems();
            }}
            itemId={itemAModificar?.codigo || itemAModificar?._id || undefined}
          />
        )}

        {/* Modal de editar producto - Abre directamente el item seleccionado */}
        {productoAEditar && (
          <ModificarItemInventarioModal
            open={!!productoAEditar}
            onClose={() => {
              setProductoAEditar(null);
              // Recargar productos después de editar
              cargarTodosLosProductos();
            }}
            inventarioId={productoAEditar.inventario_id || ""}
            sucursalId={productoAEditar.sucursal_id || ""}
            itemId={productoAEditar.codigo || productoAEditar._id || undefined} // ✅ CRÍTICO: Pasar itemId para abrir directamente
            onSuccess={() => {
              setProductoAEditar(null);
              cargarTodosLosProductos();
            }}
          />
        )}

        {/* Modal de confirmación de eliminación de producto */}
        {showEliminarProductoModal && productoAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-3 text-slate-800">Confirmar eliminación</h3>
              <p className="mb-5 text-slate-600 text-sm">
                ¿Está seguro que desea eliminar el producto{" "}
                <span className="font-bold text-red-600">
                  {productoAEliminar.codigo || productoAEliminar.descripcion}
                </span>?
              </p>
              <p className="mb-5 text-red-600 text-sm font-medium">
                ⚠️ Esta acción eliminará el producto del inventario. Esta acción no se puede deshacer.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowEliminarProductoModal(false);
                    setProductoAEliminar(null);
                  }}
                  disabled={eliminandoProducto}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={async () => {
                    if (!productoAEliminar) return;
                    setEliminandoProducto(true);
                    try {
                      const token = localStorage.getItem("access_token");
                      if (!token) throw new Error("No se encontró el token de autenticación");

                      // Intentar eliminar desde el inventario
                      if (productoAEliminar.inventario_id) {
                        const res = await fetch(
                          `${API_BASE_URL}/inventarios/${productoAEliminar.inventario_id}/items/${productoAEliminar._id}`,
                          {
                            method: "DELETE",
                            headers: {
                              "Authorization": `Bearer ${token}`,
                            },
                          }
                        );

                        if (!res.ok && res.status !== 404) {
                          const errorData = await res.json().catch(() => null);
                          throw new Error(errorData?.detail || errorData?.message || "Error al eliminar producto");
                        }
                      }

                      // Recargar productos
                      await cargarTodosLosProductos();
                      setShowEliminarProductoModal(false);
                      setProductoAEliminar(null);
                    } catch (err: any) {
                      setError(err.message || "Error al eliminar el producto");
                      console.error("Error al eliminar producto:", err);
                    } finally {
                      setEliminandoProducto(false);
                    }
                  }}
                  disabled={eliminandoProducto}
                >
                  {eliminandoProducto ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de confirmación de eliminación */}
        {showDeleteModal && inventarioAEliminar && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg shadow-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-3 text-slate-800">Confirmar eliminación</h3>
              <p className="mb-5 text-slate-600 text-sm">
                ¿Está seguro que desea eliminar el inventario del{" "}
                <span className="font-bold text-red-600">
                  {inventarioAEliminar.fecha ? new Date(inventarioAEliminar.fecha).toLocaleDateString('es-VE') : 'N/A'}
                </span> de la sucursal{" "}
                <span className="font-bold text-red-600">
                  {farmacias.find(f => f.id === inventarioAEliminar.farmacia || f.nombre === inventarioAEliminar.farmacia)?.nombre || inventarioAEliminar.farmacia}
                </span>?
              </p>
              <p className="mb-5 text-red-600 text-sm font-medium">
                ⚠️ Esta acción no se puede deshacer. Se eliminarán todos los items asociados a este inventario.
              </p>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelarEliminar}
                  disabled={eliminando}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleConfirmarEliminar}
                  disabled={eliminando}
                >
                  {eliminando ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Cargar Existencias */}
        {showCargarExistenciasModal && sucursalSeleccionadaParaCargar && (
          <CargarExistenciasModal
            open={showCargarExistenciasModal}
            onClose={() => {
              setShowCargarExistenciasModal(false);
              setSucursalSeleccionadaParaCargar("");
            }}
            sucursalId={sucursalSeleccionadaParaCargar}
            onSuccess={() => {
              // Refrescar productos después de cargar existencia
              cargarTodosLosProductos();
            }}
          />
        )}

        {/* Modal de Carga Masiva de Existencias */}
        {showCargarExistenciasMasivaModal && sucursalSeleccionadaParaCargarMasiva && (
          <CargarExistenciasMasivaModal
            open={showCargarExistenciasMasivaModal}
            onClose={() => {
              setShowCargarExistenciasMasivaModal(false);
              setSucursalSeleccionadaParaCargarMasiva("");
            }}
            sucursalId={sucursalSeleccionadaParaCargarMasiva}
            onSuccess={async (productosActualizados) => {
              // ✅ Actualizar productos modificados y agregar productos nuevos
              if (productosActualizados && productosActualizados.length > 0) {
                console.log(`🔄 [INVENTARIOS] Actualizando ${productosActualizados.length} productos sin recargar página`);
                console.log(`📦 [INVENTARIOS] Productos recibidos:`, productosActualizados);
                
                // ✅ Forzar actualización del estado
                await new Promise<void>((resolve) => {
                  setTodosLosProductos((prevProductos) => {
                    console.log(`📋 [INVENTARIOS] Productos actuales en lista: ${prevProductos.length}`);
                    
                    const productosActualizadosMap = new Map<string, any>();
                    const productosNuevos: any[] = [];
                    
                    // Crear mapa con múltiples claves (código, id, _id) para facilitar la búsqueda
                    productosActualizados.forEach((p: any) => {
                      const codigo = (p.codigo || "").trim();
                      const id = p._id || p.id || p.producto_id || codigo;
                      
                      // Agregar al mapa con código como clave principal (normalizado)
                      if (codigo) {
                        productosActualizadosMap.set(codigo.toLowerCase(), p);
                        productosActualizadosMap.set(codigo, p); // También con el código original
                      }
                      // También agregar con ID
                      if (id) {
                        productosActualizadosMap.set(String(id), p);
                      }
                      
                      // Si es un producto nuevo, agregarlo a la lista de nuevos
                      if (p.esNuevo) {
                        productosNuevos.push(p);
                        console.log(`✨ [INVENTARIOS] Producto nuevo detectado:`, { codigo: p.codigo, nombre: p.descripcion || p.nombre });
                      }
                    });

                    // Primero actualizar productos existentes
                    let productosActualizadosLista = prevProductos.map((producto: any) => {
                      const productoCodigo = String(producto.codigo || "").trim();
                      const productoCodigoLower = productoCodigo.toLowerCase();
                      const productoId = producto._id || producto.id || productoCodigo;
                      
                      // ✅ Buscar por código primero (más confiable) - probar múltiples variantes
                      let productoActualizado = null;
                      let encontradoPor = "";
                      
                      // Intentar 1: Por código normalizado (lowercase)
                      if (productoCodigoLower) {
                        productoActualizado = productosActualizadosMap.get(productoCodigoLower);
                        if (productoActualizado) encontradoPor = "codigo_lowercase";
                      }
                      
                      // Intentar 2: Por código original (con espacios, mayúsculas, etc.)
                      if (!productoActualizado && productoCodigo) {
                        productoActualizado = productosActualizadosMap.get(productoCodigo);
                        if (productoActualizado) encontradoPor = "codigo_original";
                      }
                      
                      // Intentar 3: Por ID
                      if (!productoActualizado && productoId) {
                        productoActualizado = productosActualizadosMap.get(String(productoId));
                        if (productoActualizado) encontradoPor = "id";
                      }
                      
                      // Intentar 4: Buscar en el array directamente por código (comparación flexible)
                      if (!productoActualizado && productoCodigo) {
                        productoActualizado = productosActualizados.find((p: any) => {
                          const codigoP = String(p.codigo || "").trim();
                          const codigoPLower = codigoP.toLowerCase();
                          // Comparación exacta o normalizada
                          return codigoPLower === productoCodigoLower || 
                                 codigoP === productoCodigo ||
                                 codigoP.replace(/\s+/g, '') === productoCodigo.replace(/\s+/g, '');
                        });
                        if (productoActualizado) encontradoPor = "array_directo";
                      }
                      
                      if (productoActualizado && !productoActualizado.esNuevo) {
                        const cantidadAnterior = Number(producto.cantidad || producto.existencia || 0);
                        const cantidadNueva = productoActualizado.cantidad_nueva !== undefined 
                          ? Number(productoActualizado.cantidad_nueva)
                          : Number(productoActualizado.cantidad || productoActualizado.existencia || cantidadAnterior);
                        
                        console.log(`✅ [INVENTARIOS] Actualizando producto:`, {
                          codigo_lista: productoCodigo,
                          codigo_modal: productoActualizado.codigo,
                          cantidad_anterior: cantidadAnterior,
                          cantidad_nueva: cantidadNueva,
                          encontrado_por: encontradoPor,
                          producto_id_backend: productoActualizado.producto_id,
                          cantidad_nueva_valor: productoActualizado.cantidad_nueva
                        });
                        
                        // ✅ Actualizar con los nuevos datos - PRIORIZAR cantidad_nueva que viene del backend
                        return {
                          ...producto,
                          cantidad: cantidadNueva,
                          existencia: cantidadNueva,
                          costo_unitario: productoActualizado.costo_unitario || productoActualizado.costo || producto.costo_unitario,
                          costo: productoActualizado.costo || producto.costo_unitario || producto.costo,
                          precio_unitario: productoActualizado.precio_unitario || productoActualizado.precio_venta || producto.precio_unitario,
                          precio: productoActualizado.precio || productoActualizado.precio_venta || producto.precio,
                          marca: productoActualizado.marca || producto.marca, // ✅ Actualizar marca también
                        };
                      } else if (productoCodigo) {
                        // Log para productos que NO se encontraron (para debugging)
                        const codigosEnMapa = Array.from(productosActualizadosMap.keys());
                        console.log(`⚠️ [INVENTARIOS] Producto NO encontrado para actualizar:`, {
                          codigo_buscado: productoCodigo,
                          codigo_lowercase: productoCodigoLower,
                          codigos_disponibles_en_mapa: codigosEnMapa.slice(0, 5), // Mostrar primeros 5
                          productos_recibidos: productosActualizados.map((p: any) => ({
                            codigo: p.codigo,
                            producto_id: p.producto_id,
                            cantidad_nueva: p.cantidad_nueva
                          }))
                        });
                      }
                      return producto;
                    });
                    
                    // Agregar productos nuevos al inicio de la lista
                    productosNuevos.forEach((productoNuevo: any) => {
                      const codigoNuevo = (productoNuevo.codigo || "").trim();
                      const codigoNuevoLower = codigoNuevo.toLowerCase();
                      const productoIdNuevo = productoNuevo._id || productoNuevo.id || codigoNuevo;
                      
                      // ✅ Verificar que no exista ya en la lista (por código o ID) - comparación más robusta
                      const existe = productosActualizadosLista.find((p: any) => {
                        const codigoP = (p.codigo || "").trim();
                        const codigoPLower = codigoP.toLowerCase();
                        const idP = p._id || p.id || codigoP;
                        return codigoPLower === codigoNuevoLower || 
                               codigoP === codigoNuevo || 
                               String(idP) === String(productoIdNuevo);
                      });
                      
                      if (!existe) {
                        console.log(`➕ [INVENTARIOS] Agregando producto nuevo a la lista:`, { 
                          codigo: codigoNuevo, 
                          nombre: productoNuevo.descripcion || productoNuevo.nombre,
                          cantidad: productoNuevo.cantidad || productoNuevo.cantidad_nueva || 0
                        });
                        
                        // Mapear el producto nuevo al formato de la lista principal
                        const productoMapeado = {
                          _id: productoNuevo._id || productoNuevo.id || productoNuevo.codigo,
                          id: productoNuevo._id || productoNuevo.id || productoNuevo.codigo,
                          codigo: codigoNuevo,
                          descripcion: productoNuevo.descripcion || productoNuevo.nombre || "",
                          marca: productoNuevo.marca || "",
                          costo: productoNuevo.costo || productoNuevo.costo_unitario || 0,
                          costo_unitario: productoNuevo.costo_unitario || productoNuevo.costo || 0,
                          utilidad: productoNuevo.utilidad || 0,
                          utilidad_porcentaje: productoNuevo.porcentaje_utilidad || 0,
                          precio: productoNuevo.precio || productoNuevo.precio_unitario || 0,
                          precio_unitario: productoNuevo.precio_unitario || productoNuevo.precio || 0,
                          cantidad: productoNuevo.cantidad || productoNuevo.cantidad_nueva || 0,
                          existencia: productoNuevo.existencia || productoNuevo.cantidad_nueva || 0,
                          fecha_carga: new Date().toISOString().split('T')[0],
                          sucursal_id: sucursalSeleccionadaParaCargarMasiva,
                          sucursal_nombre: farmacias.find(f => f.id === sucursalSeleccionadaParaCargarMasiva)?.nombre || "",
                          desdeInventario: true, // Marcar que viene de inventario
                        };
                        productosActualizadosLista = [productoMapeado, ...productosActualizadosLista];
                      } else {
                        console.log(`⚠️ [INVENTARIOS] Producto nuevo ya existe en la lista, no se agregará:`, codigoNuevo);
                      }
                    });
                    
                    console.log(`✅ [INVENTARIOS] Lista actualizada: ${productosActualizadosLista.length} productos (antes: ${prevProductos.length})`);
                    resolve();
                    return productosActualizadosLista;
                  });
                });
                
                // ✅ Forzar re-renderizado limpiando y restaurando la búsqueda si existe
                if (busquedaProducto.trim()) {
                  const busquedaTemp = busquedaProducto;
                  setBusquedaProducto("");
                  setTimeout(() => {
                    setBusquedaProducto(busquedaTemp);
                  }, 100);
                }
              } else {
                // Si no hay productos actualizados, recargar toda la lista como fallback
                console.log(`🔄 [INVENTARIOS] No hay productos actualizados, recargando toda la lista`);
                cargarTodosLosProductos();
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default VisualizarInventariosPage;
