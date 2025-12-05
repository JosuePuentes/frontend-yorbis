import React, { useEffect, useState, useMemo } from "react";
import UploadInventarioExcel from "../components/UploadInventarioExcel";
import ModificarItemInventarioModal from "../components/ModificarItemInventarioModal";
import VerItemsInventarioModal from "../components/VerItemsInventarioModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Download, Trash2, Edit, Eye, Search } from "lucide-react";

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
  const [totalesExistencias, setTotalesExistencias] = useState<{ [key: string]: number }>({});
  const [totalesCostoInventario, setTotalesCostoInventario] = useState<{ [key: string]: number }>({});
  const [descuentosPorInventario, setDescuentosPorInventario] = useState<{ [key: string]: number }>({});
  const [guardandoDescuento, setGuardandoDescuento] = useState<{ [key: string]: boolean }>({});
  
  // Estados para la vista de productos
  const [todosLosProductos, setTodosLosProductos] = useState<any[]>([]);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [vistaTabla, setVistaTabla] = useState(false); // false = vista inventarios, true = vista tabla productos

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

  // Cargar todos los productos de todos los inventarios
  const cargarTodosLosProductos = async () => {
    setCargandoProductos(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) return;

      // Obtener todos los inventarios
      const resInventarios = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!resInventarios.ok) {
        throw new Error("Error al obtener inventarios");
      }

      const inventariosData = await resInventarios.json();
      const inventariosArray = Array.isArray(inventariosData) ? inventariosData : [];

      // Cargar items de todos los inventarios en paralelo
      const promesasItems = inventariosArray.map(async (inventario: any) => {
        try {
          const resItems = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
            headers: { "Authorization": `Bearer ${token}` }
          });

          if (resItems.ok) {
            const items = await resItems.json();
            const itemsArray = Array.isArray(items) ? items : [];
            
            // Agregar información del inventario a cada item
            return itemsArray.map((item: any) => ({
              ...item,
              inventario_id: inventario._id,
              fecha_carga: inventario.fecha,
              sucursal_id: inventario.farmacia,
              sucursal_nombre: farmacias.find(f => f.id === inventario.farmacia || f.nombre === inventario.farmacia)?.nombre || inventario.farmacia
            }));
          } else if (resItems.status === 404) {
            // Intentar endpoint alternativo
            try {
              const resAlt = await fetch(`${API_BASE_URL}/productos?inventario_id=${inventario._id}`, {
                headers: { "Authorization": `Bearer ${token}` }
              });
              if (resAlt.ok) {
                const data = await resAlt.json();
                const productos = Array.isArray(data) ? data : (data.productos || data.items || []);
                return productos.map((item: any) => ({
                  ...item,
                  inventario_id: inventario._id,
                  fecha_carga: inventario.fecha,
                  sucursal_id: inventario.farmacia,
                  sucursal_nombre: farmacias.find(f => f.id === inventario.farmacia || f.nombre === inventario.farmacia)?.nombre || inventario.farmacia
                }));
              }
            } catch (err) {
              console.warn(`Error al obtener productos alternativos para inventario ${inventario._id}:`, err);
            }
          }
          return [];
        } catch (err) {
          console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
          return [];
        }
      });

      const resultados = await Promise.all(promesasItems);
      const productosPlanaos = resultados.flat();
      
      // Normalizar productos
      const productosNormalizados = productosPlanaos.map((item: any) => ({
        ...item,
        codigo: item.codigo || item.codigo_producto || "",
        descripcion: item.descripcion || item.nombre || item.descripcion_producto || "",
        marca: item.marca || item.marca_producto || "",
        costo: item.costo_unitario || item.costo || 0,
        costo_unitario: item.costo_unitario || item.costo || 0,
        precio: item.precio_unitario || item.precio || 0,
        precio_unitario: item.precio_unitario || item.precio || 0,
        cantidad: item.cantidad || item.existencia || item.stock || 0,
        existencia: item.cantidad || item.existencia || item.stock || 0,
        utilidad: item.utilidad_contable ?? (item.precio_unitario || item.precio || 0) - (item.costo_unitario || item.costo || 0),
        porcentaje_ganancia: item.porcentaje_ganancia ?? (((item.precio_unitario || item.precio || 0) - (item.costo_unitario || item.costo || 0)) / (item.costo_unitario || item.costo || 1)) * 100
      }));

      setTodosLosProductos(productosNormalizados);
      console.log(`✅ [INVENTARIOS] Productos cargados: ${productosNormalizados.length}`);
    } catch (err: any) {
      console.error("Error al cargar todos los productos:", err);
      setError(err.message || "Error al cargar productos");
    } finally {
      setCargandoProductos(false);
    }
  };

  // Cargar productos cuando se cambia a vista tabla
  useEffect(() => {
    if (vistaTabla && todosLosProductos.length === 0 && !cargandoProductos) {
      console.log("🔄 [INVENTARIOS] Cambiando a vista tabla, cargando productos...");
      cargarTodosLosProductos();
    }
  }, [vistaTabla, todosLosProductos.length, cargandoProductos]);

  // Filtrar productos según búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busquedaProducto.trim()) {
      return todosLosProductos;
    }

    const busquedaLower = busquedaProducto.toLowerCase().trim();
    return todosLosProductos.filter((producto: any) => {
      const codigo = (producto.codigo || "").toLowerCase();
      const descripcion = (producto.descripcion || "").toLowerCase();
      const marca = (producto.marca || "").toLowerCase();
      const sucursal = (producto.sucursal_nombre || "").toLowerCase();
      
      return codigo.includes(busquedaLower) ||
             descripcion.includes(busquedaLower) ||
             marca.includes(busquedaLower) ||
             sucursal.includes(busquedaLower);
    });
  }, [todosLosProductos, busquedaProducto]);

  // Calcular totales
  const totales = useMemo(() => {
    const totalItems = productosFiltrados.length;
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

  // Cargar totales de existencias y costo total para cada inventario
  useEffect(() => {
    let cancelado = false; // Flag para cancelar si el componente se desmonta
    
    const cargarTotalesInventario = async () => {
      if (inventarios.length === 0) {
        // Si no hay inventarios, limpiar totales
        if (!cancelado) {
          setTotalesExistencias({});
          setTotalesCostoInventario({});
        }
        return;
      }
      
      const token = localStorage.getItem("access_token");
      if (!token) return;

      const nuevosTotalesExistencias: { [key: string]: number } = {};
      const nuevosTotalesCosto: { [key: string]: number } = {};
      
      // Cargar totales en paralelo para todos los inventarios
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
              // Calcular total de existencias - el backend usa 'cantidad'
              const totalExistencias = items.reduce((sum, item: any) => {
                const cantidad = item.cantidad ?? item.existencia ?? 0;
                const cantidadNum = cantidad !== null && cantidad !== undefined ? Number(cantidad) : 0;
                if (isNaN(cantidadNum)) return sum;
                return sum + cantidadNum;
              }, 0);
              nuevosTotalesExistencias[inventario._id] = totalExistencias;
              
              // Calcular costo total del inventario: suma de (cantidad × costo_unitario) de todos los items
              // El backend usa 'cantidad' para existencia y 'costo_unitario' para costo
              const costoTotal = items.reduce((sum, item: any) => {
                const cantidad = item.cantidad ?? item.existencia ?? 0;
                const costo = item.costo_unitario ?? item.costo ?? 0;
                const cantidadNum = cantidad !== null && cantidad !== undefined ? Number(cantidad) : 0;
                const costoNum = costo !== null && costo !== undefined ? Number(costo) : 0;
                if (isNaN(cantidadNum) || isNaN(costoNum)) return sum;
                const subtotal = cantidadNum * costoNum;
                return sum + subtotal;
              }, 0);
              nuevosTotalesCosto[inventario._id] = costoTotal;
            } else {
              nuevosTotalesExistencias[inventario._id] = 0;
              nuevosTotalesCosto[inventario._id] = 0;
            }
          }
        } catch (err) {
          console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
          nuevosTotalesExistencias[inventario._id] = 0;
          nuevosTotalesCosto[inventario._id] = 0;
        }
      });

      await Promise.all(promesas);
      
      // Solo actualizar si el componente aún está montado
      if (!cancelado) {
        setTotalesExistencias(nuevosTotalesExistencias);
        setTotalesCostoInventario(nuevosTotalesCosto);
      }
    };

    cargarTotalesInventario();
    
    // Cleanup: marcar como cancelado si el componente se desmonta
    return () => {
      cancelado = true;
    };
  }, [inventarios]);

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

  const handleEliminarClick = (inventario: Inventario) => {
    setInventarioAEliminar(inventario);
    setShowDeleteModal(true);
  };

  const handleModificarItems = (inventario: Inventario) => {
    setInventarioSeleccionado(inventario);
    setShowModificarModal(true);
  };

  const handleVerItems = (inventario: Inventario) => {
    setInventarioParaVer(inventario);
    setShowVerItemsModal(true);
  };

  const handleCerrarVerItems = () => {
    setShowVerItemsModal(false);
    setInventarioParaVer(null);
  };

  const handleCambiarDescuento = async (inventarioId: string, porcentaje: number) => {
    // Validar que el porcentaje esté entre 0 y 100
    if (porcentaje < 0 || porcentaje > 100) {
      setError("El porcentaje de descuento debe estar entre 0 y 100");
      return;
    }

    // Actualizar el estado local inmediatamente
    setDescuentosPorInventario(prev => ({
      ...prev,
      [inventarioId]: porcentaje
    }));

    // Marcar como guardando
    setGuardandoDescuento(prev => ({
      ...prev,
      [inventarioId]: true
    }));

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // Intentar actualizar el inventario en el backend
      const res = await fetch(`${API_BASE_URL}/inventarios/${inventarioId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          porcentaje_descuento: porcentaje,
        }),
      });

      if (!res.ok) {
        // Si el endpoint no existe, solo guardar localmente
        if (res.status === 404 || res.status === 405) {
          console.warn("El endpoint PATCH /inventarios/{id} no está disponible. El descuento se guardará solo localmente.");
        } else {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.detail || errorData?.message || "Error al guardar el descuento");
        }
      }

      // Actualizar el inventario en el estado local
      setInventarios(prev => prev.map(inv => 
        inv._id === inventarioId 
          ? { ...inv, porcentaje_descuento: porcentaje }
          : inv
      ));
    } catch (err: any) {
      console.error("Error al guardar descuento:", err);
      // Revertir el cambio local si falla
      setDescuentosPorInventario(prev => {
        const inventario = inventarios.find(inv => inv._id === inventarioId);
        return {
          ...prev,
          [inventarioId]: inventario?.porcentaje_descuento ?? 0
        };
      });
      setError(err.message || "Error al guardar el descuento");
    } finally {
      setGuardandoDescuento(prev => ({
        ...prev,
        [inventarioId]: false
      }));
    }
  };

  const handleCerrarModal = async () => {
    console.log('[handleCerrarModal] Iniciando actualización después de modificar item...');
    // NO cerrar el modal todavía, primero actualizar los datos
    // Refrescar la lista después de modificar y obtener los inventarios actualizados
    const inventariosActualizados = await fetchInventarios();
    console.log('[handleCerrarModal] Inventarios actualizados:', inventariosActualizados.length);
    // Recalcular totales después de modificar usando los inventarios actualizados
    await recalcularTotales(inventariosActualizados);
    console.log('[handleCerrarModal] Totales recalculados');
    // Si el modal de ver items está abierto, refrescar también esos datos
    if (showVerItemsModal && inventarioParaVer) {
      console.log('[handleCerrarModal] Refrescando modal de ver items');
      setRefreshItemsTrigger(prev => prev + 1);
    }
    // Ahora sí cerrar el modal después de actualizar todo
    setShowModificarModal(false);
    setInventarioSeleccionado(null);
    console.log('[handleCerrarModal] Modal cerrado');
  };

  // Función para recalcular totales manualmente (útil después de modificar items)
  const recalcularTotales = async (inventariosParaCalcular?: Inventario[]) => {
    const inventariosACalcular = inventariosParaCalcular || inventarios;
    if (inventariosACalcular.length === 0) return;
    
    const token = localStorage.getItem("token");
    if (!token) return;

    const nuevosTotalesExistencias: { [key: string]: number } = {};
    const nuevosTotalesCosto: { [key: string]: number } = {};
    
    // Cargar totales en paralelo para todos los inventarios
    const promesas = inventariosACalcular.map(async (inventario) => {
      try {
        const res = await fetch(`${API_BASE_URL}/inventarios/${inventario._id}/items`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const items = await res.json();
          if (Array.isArray(items)) {
            // Debug: ver la estructura del primer item
            if (items.length > 0) {
              console.log(`[Recalcular Totales] Estructura del primer item del inventario ${inventario._id}:`, items[0]);
              console.log(`[Recalcular Totales] Campos disponibles:`, Object.keys(items[0]));
              // Ver valores específicos del primer item
              const primerItem = items[0] as any;
              console.log(`[Recalcular Totales] Primer item - cantidad: ${primerItem.cantidad}, existencia: ${primerItem.existencia}, costo_unitario: ${primerItem.costo_unitario}, costo: ${primerItem.costo}`);
            }
            
            // Calcular total de existencias - el backend usa 'cantidad'
            const totalExistencias = items.reduce((sum, item: any) => {
              const cantidad = item.cantidad ?? item.existencia ?? 0;
              const cantidadNum = cantidad !== null && cantidad !== undefined ? Number(cantidad) : 0;
              if (isNaN(cantidadNum)) {
                console.warn(`[Recalcular Totales] Cantidad inválida para item ${item.codigo}:`, cantidad);
                return sum;
              }
              return sum + cantidadNum;
            }, 0);
            nuevosTotalesExistencias[inventario._id] = totalExistencias;
            
            // Calcular costo total del inventario: suma de (cantidad × costo_unitario) de todos los items
            // El backend usa 'cantidad' para existencia y 'costo_unitario' para costo
            const costoTotal = items.reduce((sum, item: any) => {
              const cantidad = item.cantidad ?? item.existencia ?? 0;
              const costo = item.costo_unitario ?? item.costo ?? 0;
              const cantidadNum = cantidad !== null && cantidad !== undefined ? Number(cantidad) : 0;
              const costoNum = costo !== null && costo !== undefined ? Number(costo) : 0;
              if (isNaN(cantidadNum) || isNaN(costoNum)) {
                console.warn(`[Recalcular Totales] Valores inválidos para item ${item.codigo}: cantidad=${cantidad}, costo=${costo}`);
                return sum;
              }
              const subtotal = cantidadNum * costoNum;
              return sum + subtotal;
            }, 0);
            nuevosTotalesCosto[inventario._id] = costoTotal;
            
            console.log(`[Recalcular Totales] Inventario ${inventario._id}: ${items.length} items, Total Existencias: ${totalExistencias}, Total Costo: ${costoTotal}`);
          } else {
            nuevosTotalesExistencias[inventario._id] = 0;
            nuevosTotalesCosto[inventario._id] = 0;
          }
        } else {
          console.error(`[Recalcular Totales] Error al obtener items del inventario ${inventario._id}: ${res.status} ${res.statusText}`);
          nuevosTotalesExistencias[inventario._id] = 0;
          nuevosTotalesCosto[inventario._id] = 0;
        }
      } catch (err) {
        console.error(`[Recalcular Totales] Error al obtener items del inventario ${inventario._id}:`, err);
        nuevosTotalesExistencias[inventario._id] = 0;
        nuevosTotalesCosto[inventario._id] = 0;
      }
    });

    await Promise.all(promesas);
    console.log('[Recalcular Totales] Nuevos totales calculados:', { nuevosTotalesExistencias, nuevosTotalesCosto });
    setTotalesExistencias(nuevosTotalesExistencias);
    setTotalesCostoInventario(nuevosTotalesCosto);
  };

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

      // Refrescar la lista y recalcular totales
      const inventariosActualizados = await fetchInventarios();
      await recalcularTotales(inventariosActualizados);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-sm font-medium opacity-90 mb-1">Total de Items</div>
                  <div className="text-3xl font-bold">{totales.totalItems.toLocaleString('es-VE')}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
                  <div className="text-sm font-medium opacity-90 mb-1">Total Costo Inventario</div>
                  <div className="text-3xl font-bold">
                    ${totales.totalCostoInventario.toLocaleString('es-VE', { 
                      minimumFractionDigits: 2, 
                      maximumFractionDigits: 2 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Buscador */}
            <div className="p-4 border-b bg-slate-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Buscar por código, descripción, marca o sucursal..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="pl-10 w-full"
                />
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
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Código</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Descripción</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Marca</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Costo</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Utilidad</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Precio</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">Existencia</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Sucursal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Fecha Carga</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200">
                    {productosFiltrados.map((producto: any, index: number) => {
                      const costo = Number(producto.costo_unitario || producto.costo || 0);
                      const precio = Number(producto.precio_unitario || producto.precio || 0);
                      const cantidad = Number(producto.cantidad || producto.existencia || 0);
                      const utilidad = Number(producto.utilidad || (precio - costo));
                      const porcentajeGanancia = Number(producto.porcentaje_ganancia || ((precio - costo) / (costo || 1)) * 100);
                      
                      return (
                        <tr key={producto._id || producto.id || index} className="hover:bg-slate-50">
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-900">{producto.codigo || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{producto.descripcion || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{producto.marca || "-"}</td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700">
                            ${costo.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-green-600 font-medium">
                            ${utilidad.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            <div className="text-xs text-slate-500">({porcentajeGanancia.toFixed(2)}%)</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-slate-900">
                            ${precio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-sm text-right text-slate-700">{cantidad.toLocaleString('es-VE')}</td>
                          <td className="px-4 py-3 text-sm text-slate-700">{producto.sucursal_nombre || producto.sucursal_id || "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {producto.fecha_carga ? new Date(producto.fecha_carga).toLocaleDateString('es-VE') : "-"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 sticky bottom-0">
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-sm font-bold text-slate-900">TOTALES</td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        ${productosFiltrados.reduce((sum, p: any) => sum + Number(p.costo_unitario || p.costo || 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-green-600">
                        ${productosFiltrados.reduce((sum, p: any) => {
                          const costo = Number(p.costo_unitario || p.costo || 0);
                          const precio = Number(p.precio_unitario || p.precio || 0);
                          return sum + (precio - costo);
                        }, 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        ${productosFiltrados.reduce((sum, p: any) => sum + Number(p.precio_unitario || p.precio || 0), 0).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-sm text-right font-bold text-slate-900">
                        {productosFiltrados.reduce((sum, p: any) => sum + Number(p.cantidad || p.existencia || 0), 0).toLocaleString('es-VE')}
                      </td>
                      <td colSpan={2}></td>
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
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Total Costo Inventario
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Total Existencias
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      % Descuento
                    </th>
                    <th scope="col" className="px-5 py-3.5 text-center text-xs font-semibold text-slate-600 uppercase tracking-wider whitespace-nowrap">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {inventariosFiltrados.map(i => {
                    // Obtener el nombre de la farmacia desde el ID
                    const farmaciaNombre = farmacias.find(f => f.id === i.farmacia || f.nombre === i.farmacia)?.nombre || i.farmacia;
                    const fechaCarga = i.fecha ? new Date(i.fecha).toLocaleDateString('es-VE') : 'N/A';
                    // Calcular costo total: suma de (existencia × costo) de todos los items
                    const costoTotalInventario = totalesCostoInventario[i._id] ?? 0;
                    const totalExist = totalesExistencias[i._id] ?? 0;
                    const descuentoActual = descuentosPorInventario[i._id] ?? i.porcentaje_descuento ?? 0;
                    const estaGuardando = guardandoDescuento[i._id] ?? false;
                    
                    return (
                      <tr key={i._id} className="hover:bg-slate-50 transition-colors duration-150 ease-in-out">
                        <td className="px-5 py-4 whitespace-nowrap text-sm font-medium text-slate-700">
                          {farmaciaNombre}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700">
                          {fechaCarga}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right font-semibold">
                          ${costoTotalInventario.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-slate-700 text-right font-semibold">
                          {totalExist.toLocaleString('es-VE')}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={descuentoActual}
                              onChange={(e) => {
                                const nuevoValor = parseFloat(e.target.value) || 0;
                                handleCambiarDescuento(i._id, nuevoValor);
                              }}
                              onBlur={(e) => {
                                const nuevoValor = parseFloat(e.target.value) || 0;
                                if (nuevoValor < 0) {
                                  handleCambiarDescuento(i._id, 0);
                                } else if (nuevoValor > 100) {
                                  handleCambiarDescuento(i._id, 100);
                                }
                              }}
                              disabled={estaGuardando}
                              className="w-20 text-center"
                              placeholder="0"
                            />
                            <span className="text-xs text-slate-500">%</span>
                            {estaGuardando && (
                              <svg className="animate-spin h-4 w-4 text-indigo-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleVerItems(i)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              Ver Items
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleModificarItems(i)}
                              className="flex items-center gap-1"
                            >
                              <Edit className="w-4 h-4" />
                              Modificar Items
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleEliminarClick(i)}
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
            onClose={handleCerrarModal}
            inventarioId={inventarioSeleccionado._id}
            sucursalId={farmacias.find(f => f.id === inventarioSeleccionado.farmacia || f.nombre === inventarioSeleccionado.farmacia)?.id || inventarioSeleccionado.farmacia}
            onSuccess={handleCerrarModal}
          />
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
      </div>
    </div>
  );
};

export default VisualizarInventariosPage;
