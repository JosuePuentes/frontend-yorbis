import React, { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, Plus, X } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Producto {
  _id?: string;
  id?: string;
  codigo: string;
  nombre?: string;
  descripcion?: string;
  marca?: string;
  existencia?: number;
  cantidad?: number;
  costo_unitario?: number;
  costo?: number;
  precio_unitario?: number;
  precio?: number;
}

interface DatosCarga {
  cantidad: string;
  costo?: string;
  utilidad?: string;
  porcentaje_utilidad?: string;
}

interface CargarExistenciasMasivaModalProps {
  open: boolean;
  onClose: () => void;
  sucursalId: string;
  onSuccess?: (productosActualizados?: any[]) => void; // ✅ Recibe productos actualizados
}

const CargarExistenciasMasivaModal: React.FC<CargarExistenciasMasivaModalProps> = ({
  open,
  onClose,
  sucursalId,
  onSuccess,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState<Set<string>>(new Set());
  const [datosCarga, setDatosCarga] = useState<{ [key: string]: DatosCarga }>({});
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [resultadoCarga, setResultadoCarga] = useState<any>(null);
  
  // Estados para crear producto nuevo
  const [mostrarFormularioCrear, setMostrarFormularioCrear] = useState(false);
  const [creandoProducto, setCreandoProducto] = useState(false);
  const [codigoNuevo, setCodigoNuevo] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [descripcionNuevo, setDescripcionNuevo] = useState("");
  const [marcaNuevo, setMarcaNuevo] = useState("");
  const [costoNuevo, setCostoNuevo] = useState("");
  const [utilidadNuevo, setUtilidadNuevo] = useState("");
  const [porcentajeUtilidadNuevo, setPorcentajeUtilidadNuevo] = useState("40");

  // Caché de búsquedas para mejorar rendimiento
  const cacheBusquedas = useRef<Map<string, { productos: Producto[]; timestamp: number }>>(new Map());
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Buscar productos cuando cambia la búsqueda - OPTIMIZADO
  useEffect(() => {
    // ✅ No limpiar productos si la búsqueda está vacía - mantener productos creados/actualizados
    if (!busqueda.trim() || busqueda.length < 2) {
      // Solo limpiar si no hay productos en el estado (para evitar perder productos creados)
      // setProductos([]);
      return;
    }

    // Verificar caché primero
    const cacheKey = `${sucursalId}_${busqueda.toLowerCase()}`;
    const cached = cacheBusquedas.current.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log(`✅ [CARGA_MASIVA] Usando caché para: "${busqueda}"`);
      setProductos(cached.productos);
      return;
    }

    // AbortController para cancelar peticiones anteriores
    const abortController = new AbortController();

    const timeoutId = setTimeout(async () => {
      setBuscando(true);
      setError(null);
      
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("No se encontró el token de autenticación");
          return;
        }

        // ✅ OPTIMIZACIÓN 1: Usar endpoint ultra optimizado /inventarios/buscar
        try {
          const resOptimizado = await fetch(
            `${API_BASE_URL}/inventarios/buscar?q=${encodeURIComponent(busqueda)}&farmacia=${sucursalId}&limit=50`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              signal: abortController.signal,
            }
          );

          if (resOptimizado.ok) {
            const productosOptimizados = await resOptimizado.json();
            const productosArray = Array.isArray(productosOptimizados) ? productosOptimizados : [];
            
            // Mapear productos del endpoint optimizado según la estructura del backend
            const productosEncontrados: Producto[] = productosArray.map((item: any) => ({
              _id: item.id || item._id || item.codigo,
              id: item.id || item._id || item.codigo,
              codigo: item.codigo || "",
              nombre: item.nombre || item.descripcion || "",
              descripcion: item.descripcion || item.nombre || "",
              marca: item.marca || "",
              existencia: item.cantidad || 0,
              cantidad: item.cantidad || 0,
              costo_unitario: item.costo || 0,
              costo: item.costo || 0,
              precio_unitario: item.precio_venta || item.precio || 0,
              precio: item.precio_venta || item.precio || 0,
            }));

            // Guardar en caché
            cacheBusquedas.current.set(cacheKey, {
              productos: productosEncontrados,
              timestamp: Date.now(),
            });

            // Limpiar caché antiguo (más de 10 minutos)
            const ahora = Date.now();
            for (const [key, value] of cacheBusquedas.current.entries()) {
              if (ahora - value.timestamp > CACHE_DURATION * 2) {
                cacheBusquedas.current.delete(key);
              }
            }

            console.log(`✅ [CARGA_MASIVA] Productos encontrados con endpoint optimizado: ${productosEncontrados.length}`);
            setProductos(productosEncontrados);
            setBuscando(false);
            return;
          } else {
            console.warn(`⚠️ [CARGA_MASIVA] Endpoint optimizado retornó ${resOptimizado.status}, usando método alternativo`);
          }
        } catch (err: any) {
          if (err.name === 'AbortError') return;
          console.warn("⚠️ [CARGA_MASIVA] Endpoint optimizado no disponible, usando método alternativo:", err);
        }

        // ✅ OPTIMIZACIÓN 2: Si el endpoint optimizado no está disponible, usar método paralelo
        // Obtener inventarios
        const resInventarios = await fetch(
          `${API_BASE_URL}/inventarios?farmacia=${sucursalId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: abortController.signal,
          }
        );

        if (!resInventarios.ok) {
          throw new Error("Error al buscar inventarios");
        }

        const inventarios = await resInventarios.json();
        const inventariosActivos = Array.isArray(inventarios) 
          ? inventarios.filter((inv: any) => inv.estado === "activo")
          : [];

        // ✅ OPTIMIZACIÓN 3: Cargar items en paralelo con Promise.all
        const busquedaLower = busqueda.toLowerCase();
        const promesasItems = inventariosActivos.map(async (inventario: any) => {
          try {
            const resItems = await fetch(
              `${API_BASE_URL}/inventarios/${inventario._id}/items`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
                signal: abortController.signal,
              }
            );

            if (resItems.ok) {
              const items = await resItems.json();
              const itemsArray = Array.isArray(items) ? items : [];
              
              // Filtrar items que coincidan con la búsqueda
              return itemsArray.filter((item: any) => {
                const codigo = (item.codigo || "").toLowerCase();
                const descripcion = (item.descripcion || item.nombre || "").toLowerCase();
                const marca = (item.marca || item.marca_producto || "").toLowerCase();
                return (
                  codigo.includes(busquedaLower) ||
                  descripcion.includes(busquedaLower) ||
                  marca.includes(busquedaLower)
                );
              });
            }
            return [];
          } catch (err: any) {
            if (err.name === 'AbortError') return [];
            console.error(`Error al cargar items del inventario ${inventario._id}:`, err);
            return [];
          }
        });

        // Esperar todas las promesas en paralelo
        const resultadosItems = await Promise.all(promesasItems);
        
        // Combinar y normalizar productos
        const productosEncontrados: Producto[] = [];
        const productosIdsVistos = new Set<string>();

        resultadosItems.flat().forEach((item: any) => {
          const productoId = item._id || item.id || item.item_id || item.codigo;
          
          // Evitar duplicados
          if (!productosIdsVistos.has(productoId)) {
            productosIdsVistos.add(productoId);
            productosEncontrados.push({
              _id: productoId,
              id: productoId,
              codigo: item.codigo || "",
              nombre: item.descripcion || item.nombre || "",
              descripcion: item.descripcion || item.nombre || "",
              marca: item.marca || item.marca_producto || "",
              existencia: item.cantidad || item.existencia || 0,
              cantidad: item.cantidad || item.existencia || 0,
              costo_unitario: item.costo_unitario || item.costo || 0,
              costo: item.costo_unitario || item.costo || 0,
              precio_unitario: item.precio_unitario || item.precio || 0,
              precio: item.precio_unitario || item.precio || 0,
            });
          }
        });

        // Guardar en caché
        cacheBusquedas.current.set(cacheKey, {
          productos: productosEncontrados,
          timestamp: Date.now(),
        });

        setProductos(productosEncontrados);
      } catch (err: any) {
        if (err.name === 'AbortError') return;
        setError(err.message || "Error al buscar productos");
        setProductos([]);
      } finally {
        setBuscando(false);
      }
    }, 500); // ✅ OPTIMIZACIÓN 4: Debounce aumentado a 500ms

    return () => {
      clearTimeout(timeoutId);
      abortController.abort();
    };
  }, [busqueda, sucursalId]);

  // Limpiar cuando se cierra el modal
  useEffect(() => {
    if (!open) {
      setBusqueda("");
      setProductos([]);
      setProductosSeleccionados(new Set());
      setDatosCarga({});
      setError(null);
      setSuccess(null);
      setResultadoCarga(null);
    }
  }, [open]);

  const toggleSeleccionarProducto = (productoId: string) => {
    const nuevosSeleccionados = new Set(productosSeleccionados);
    if (nuevosSeleccionados.has(productoId)) {
      nuevosSeleccionados.delete(productoId);
      // Limpiar datos de carga del producto deseleccionado
      const nuevosDatos = { ...datosCarga };
      delete nuevosDatos[productoId];
      setDatosCarga(nuevosDatos);
    } else {
      nuevosSeleccionados.add(productoId);
      // Inicializar datos de carga con valores por defecto
      if (!datosCarga[productoId]) {
        setDatosCarga({
          ...datosCarga,
          [productoId]: {
            cantidad: "",
            costo: "",
            utilidad: "",
            porcentaje_utilidad: "40", // Por defecto 40%
          },
        });
      }
    }
    setProductosSeleccionados(nuevosSeleccionados);
  };

  const actualizarDatoCarga = (productoId: string, campo: keyof DatosCarga, valor: string) => {
    setDatosCarga({
      ...datosCarga,
      [productoId]: {
        ...datosCarga[productoId],
        [campo]: valor,
      },
    });
  };

  const seleccionarTodos = () => {
    if (productosSeleccionados.size === productos.length) {
      // Deseleccionar todos
      setProductosSeleccionados(new Set());
      setDatosCarga({});
    } else {
      // Seleccionar todos
      const nuevosSeleccionados = new Set<string>();
      const nuevosDatos: { [key: string]: DatosCarga } = {};
      productos.forEach((producto) => {
        const productoId = producto._id || producto.id || producto.codigo;
        nuevosSeleccionados.add(productoId);
        nuevosDatos[productoId] = {
          cantidad: "",
          costo: "",
          utilidad: "",
          porcentaje_utilidad: "40",
        };
      });
      setProductosSeleccionados(nuevosSeleccionados);
      setDatosCarga(nuevosDatos);
    }
  };

  const handleCrearProducto = async () => {
    if (!nombreNuevo.trim() || !costoNuevo) {
      setError("Nombre y costo son obligatorios");
      return;
    }

    const costo = parseFloat(costoNuevo);
    if (isNaN(costo) || costo <= 0) {
      setError("El costo debe ser un número mayor a 0");
      return;
    }

    setCreandoProducto(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      // Calcular precio según utilidad o porcentaje
      let precio = 0;
      let utilidad = 0;
      let porcentajeUtilidad = 40;

      if (utilidadNuevo && parseFloat(utilidadNuevo) > 0) {
        // Si se proporciona utilidad en dinero
        utilidad = parseFloat(utilidadNuevo);
        precio = costo + utilidad;
        porcentajeUtilidad = costo > 0 ? (utilidad / costo) * 100 : 0;
      } else if (porcentajeUtilidadNuevo && parseFloat(porcentajeUtilidadNuevo) > 0) {
        // Si se proporciona porcentaje de utilidad
        porcentajeUtilidad = parseFloat(porcentajeUtilidadNuevo);
        utilidad = (costo * porcentajeUtilidad) / 100;
        precio = costo + utilidad;
      } else {
        // Por defecto 40%
        porcentajeUtilidad = 40;
        utilidad = (costo * porcentajeUtilidad) / 100;
        precio = costo + utilidad;
      }

      // Preparar body según la estructura del backend
      const bodyRequest: any = {
        farmacia: sucursalId,
        nombre: nombreNuevo.trim(),
        costo: costo,
      };

      // Campos opcionales
      if (codigoNuevo.trim()) {
        bodyRequest.codigo = codigoNuevo.trim();
      }
      if (descripcionNuevo.trim()) {
        bodyRequest.descripcion = descripcionNuevo.trim();
      }
      if (marcaNuevo.trim()) {
        bodyRequest.marca = marcaNuevo.trim();
      }
      if (utilidad > 0) {
        bodyRequest.utilidad = utilidad;
      }
      if (porcentajeUtilidad > 0) {
        bodyRequest.porcentaje_utilidad = porcentajeUtilidad;
      }
      if (precio > 0) {
        bodyRequest.precio_venta = precio;
      }

      const res = await fetch(`${API_BASE_URL}/inventarios/crear-producto`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyRequest),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Error al crear el producto"
        );
      }

      const respuesta = await res.json();
      
      // El backend retorna { message, producto }
      const productoCreado = respuesta.producto || respuesta;
      
      // Agregar el producto a la lista de productos disponibles
      const nuevoProducto: Producto = {
        _id: productoCreado.id || productoCreado._id || productoCreado.codigo,
        id: productoCreado.id || productoCreado._id || productoCreado.codigo,
        codigo: productoCreado.codigo || "",
        nombre: productoCreado.nombre || productoCreado.descripcion || "",
        descripcion: productoCreado.descripcion || productoCreado.nombre || "",
        marca: productoCreado.marca || "",
        existencia: productoCreado.cantidad || 0,
        cantidad: productoCreado.cantidad || 0,
        costo_unitario: productoCreado.costo || 0,
        costo: productoCreado.costo || 0,
        precio_unitario: productoCreado.precio_venta || precio,
        precio: productoCreado.precio_venta || precio,
      };

      // ✅ Agregar a la lista de productos (al inicio para que sea visible)
      setProductos((prev) => {
        // Verificar que no esté duplicado
        const existe = prev.find(p => 
          (p._id || p.id || p.codigo) === (nuevoProducto._id || nuevoProducto.id || nuevoProducto.codigo) ||
          p.codigo === nuevoProducto.codigo
        );
        if (existe) {
          // Si existe, actualizarlo en lugar de agregarlo
          return prev.map(p => 
            (p._id || p.id || p.codigo) === (nuevoProducto._id || nuevoProducto.id || nuevoProducto.codigo) ||
            p.codigo === nuevoProducto.codigo
              ? nuevoProducto
              : p
          );
        }
        // Si no existe, agregarlo al inicio
        return [nuevoProducto, ...prev];
      });

      // Seleccionar automáticamente el producto recién creado
      const productoId = nuevoProducto._id || nuevoProducto.id || nuevoProducto.codigo;
      setProductosSeleccionados((prev) => new Set([...prev, productoId]));
      
      // ✅ Limpiar la búsqueda para que el producto nuevo sea visible
      setBusqueda("");

      // Inicializar datos de carga para el nuevo producto
      setDatosCarga((prev) => ({
        ...prev,
        [productoId]: {
          cantidad: "",
          costo: "",
          utilidad: "",
          porcentaje_utilidad: porcentajeUtilidad.toString(),
        },
      }));

      // Limpiar formulario y cerrar
      setMostrarFormularioCrear(false);
      setCodigoNuevo("");
      setNombreNuevo("");
      setDescripcionNuevo("");
      setMarcaNuevo("");
      setCostoNuevo("");
      setUtilidadNuevo("");
      setPorcentajeUtilidadNuevo("40");
      setError(null);
      setSuccess("Producto creado exitosamente y seleccionado");
      
      // ✅ Notificar a la página principal que se creó un producto nuevo
      if (onSuccess) {
        // Pasar el producto nuevo para que se agregue a la lista principal
        onSuccess([{
          ...nuevoProducto,
          producto_id: productoId,
          cantidad_nueva: nuevoProducto.cantidad,
          esNuevo: true, // Marcar como nuevo para que se agregue en lugar de actualizar
        }]);
      }
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al crear el producto");
    } finally {
      setCreandoProducto(false);
    }
  };

  const handleCargarExistenciaMasiva = async () => {
    if (productosSeleccionados.size === 0) {
      setError("Debe seleccionar al menos un producto");
      return;
    }

    // Validar que todos los productos seleccionados tengan cantidad
    const productosInvalidos: string[] = [];
    productosSeleccionados.forEach((productoId) => {
      const datos = datosCarga[productoId];
      if (!datos || !datos.cantidad || parseFloat(datos.cantidad) <= 0) {
        const producto = productos.find(
          (p) => (p._id || p.id || p.codigo) === productoId
        );
        productosInvalidos.push(producto?.codigo || productoId);
      }
    });

    if (productosInvalidos.length > 0) {
      setError(
        `Los siguientes productos no tienen cantidad válida: ${productosInvalidos.join(", ")}`
      );
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);
    setResultadoCarga(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      // Preparar datos para enviar
      const productosParaEnviar = Array.from(productosSeleccionados)
        .map((productoId) => {
          const datos = datosCarga[productoId];

          return {
            producto_id: productoId,
            cantidad: parseFloat(datos.cantidad || "0"),
            costo: datos.costo ? parseFloat(datos.costo) : undefined,
            utilidad: datos.utilidad ? parseFloat(datos.utilidad) : undefined,
            porcentaje_utilidad: datos.porcentaje_utilidad
              ? parseFloat(datos.porcentaje_utilidad)
              : 40.0,
          };
        })
        .filter((p) => p.cantidad > 0);

      if (productosParaEnviar.length === 0) {
        throw new Error("No hay productos válidos para cargar");
      }

      // Enviar al endpoint de carga masiva
      const res = await fetch(`${API_BASE_URL}/inventarios/cargar-existencia`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          farmacia: sucursalId,
          productos: productosParaEnviar,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.detail || errorData.message || "Error al cargar existencias"
        );
      }

      const resultado = await res.json();
      setResultadoCarga(resultado);

      // ✅ Preparar productos actualizados para pasar al callback
      const productosActualizados: any[] = [];

      // Actualizar productos en el estado local y preparar para callback
      if (resultado.detalle?.exitosos) {
        resultado.detalle.exitosos.forEach((productoActualizado: any) => {
          // ✅ Actualizar en el estado local del modal
          // Buscar el producto por producto_id, _id, id o codigo
          setProductos((prevProductos) =>
            prevProductos.map((p) => {
              const productoId = p._id || p.id || p.codigo;
              const productoIdBackend = productoActualizado.producto_id || productoActualizado._id || productoActualizado.id || productoActualizado.codigo;
              
              // ✅ Comparar por múltiples campos para asegurar que encontramos el producto correcto
              if (productoId === productoIdBackend || 
                  p.codigo === productoActualizado.codigo ||
                  (productoActualizado.codigo && p.codigo === productoActualizado.codigo)) {
                const productoActualizadoLocal = {
                  ...p,
                  cantidad: productoActualizado.cantidad_nueva,
                  existencia: productoActualizado.cantidad_nueva,
                  costo_unitario: productoActualizado.costo || p.costo_unitario,
                  costo: productoActualizado.costo || p.costo,
                  precio_unitario: productoActualizado.precio_venta || p.precio_unitario,
                  precio: productoActualizado.precio_venta || p.precio,
                };
                
                // Agregar a la lista de productos actualizados para el callback
                productosActualizados.push({
                  ...productoActualizadoLocal,
                  _id: productoId,
                  id: productoId,
                  codigo: p.codigo, // ✅ Asegurar que el código esté presente
                  // Incluir campos adicionales que la página principal pueda necesitar
                  producto_id: productoActualizado.producto_id || productoId,
                  cantidad_nueva: productoActualizado.cantidad_nueva,
                });
                
                return productoActualizadoLocal;
              }
              return p;
            })
          );
        });
      }

      setSuccess(
        `Carga masiva completada: ${resultado.detalle?.exitosos?.length || 0} productos actualizados`
      );

      // ✅ Llamar onSuccess con los productos actualizados (sin recargar toda la página)
      if (onSuccess) {
        // Pasar los productos actualizados para que la página principal los actualice selectivamente
        onSuccess(productosActualizados);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar existencias");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Carga Masiva de Existencias</DialogTitle>
          <DialogDescription>
            Selecciona múltiples productos y carga existencias, costos y utilidades de forma masiva.
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md text-sm flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        {/* Búsqueda y Botón Crear Producto */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar productos por código o descripción..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            onClick={() => setMostrarFormularioCrear(true)}
            variant="outline"
            className="flex items-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-green-300"
          >
            <Plus className="w-4 h-4" />
            Crear Producto Nuevo
          </Button>
        </div>

        {/* Formulario para crear producto nuevo */}
        {mostrarFormularioCrear && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg border-2 border-green-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-slate-800">Crear Producto Nuevo</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMostrarFormularioCrear(false);
                  setCodigoNuevo("");
                  setNombreNuevo("");
                  setDescripcionNuevo("");
                  setMarcaNuevo("");
                  setCostoNuevo("");
                  setUtilidadNuevo("");
                  setPorcentajeUtilidadNuevo("40");
                  setError(null);
                }}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Código del producto"
                  value={codigoNuevo}
                  onChange={(e) => setCodigoNuevo(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre <span className="text-red-500">*</span>
                </label>
                <Input
                  type="text"
                  placeholder="Nombre del producto"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Descripción del producto"
                  value={descripcionNuevo}
                  onChange={(e) => setDescripcionNuevo(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Marca (opcional)
                </label>
                <Input
                  type="text"
                  placeholder="Marca del producto"
                  value={marcaNuevo}
                  onChange={(e) => setMarcaNuevo(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Costo <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costoNuevo}
                  onChange={(e) => setCostoNuevo(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Utilidad (opcional)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Utilidad en dinero"
                  value={utilidadNuevo}
                  onChange={(e) => setUtilidadNuevo(e.target.value)}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  % Utilidad (opcional, default: 40%)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  placeholder="40"
                  value={porcentajeUtilidadNuevo}
                  onChange={(e) => setPorcentajeUtilidadNuevo(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setMostrarFormularioCrear(false);
                  setCodigoNuevo("");
                  setNombreNuevo("");
                  setDescripcionNuevo("");
                  setMarcaNuevo("");
                  setCostoNuevo("");
                  setUtilidadNuevo("");
                  setPorcentajeUtilidadNuevo("40");
                  setError(null);
                }}
                disabled={creandoProducto}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleCrearProducto}
                disabled={creandoProducto || !nombreNuevo.trim() || !costoNuevo}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {creandoProducto ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  "Crear Producto"
                )}
              </Button>
            </div>
          </div>
        )}

        {buscando && (
          <div className="text-center py-4 text-slate-500 text-sm flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Buscando productos...
          </div>
        )}

        {/* Lista de productos con checkboxes */}
        {productos.length > 0 && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold text-slate-700">
                Productos encontrados ({productos.length})
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={seleccionarTodos}
                className="text-xs"
              >
                {productosSeleccionados.size === productos.length
                  ? "Deseleccionar todos"
                  : "Seleccionar todos"}
              </Button>
            </div>

            <div className="border rounded-lg max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left w-10">
                      <CheckSquare className="w-4 h-4" />
                    </th>
                    <th className="px-3 py-2 text-left">Código</th>
                    <th className="px-3 py-2 text-left">Descripción</th>
                    <th className="px-3 py-2 text-left">Marca</th>
                    <th className="px-3 py-2 text-right">Existencia</th>
                    <th className="px-3 py-2 text-right">Cantidad a Sumar</th>
                    <th className="px-3 py-2 text-right">Costo (opcional)</th>
                    <th className="px-3 py-2 text-right">Utilidad (opcional)</th>
                    <th className="px-3 py-2 text-right">% Utilidad</th>
                  </tr>
                </thead>
                <tbody>
                  {productos.map((producto) => {
                    const productoId = producto._id || producto.id || producto.codigo;
                    const estaSeleccionado = productosSeleccionados.has(productoId);
                    const datos = datosCarga[productoId] || {
                      cantidad: "",
                      costo: "",
                      utilidad: "",
                      porcentaje_utilidad: "40",
                    };

                    return (
                      <tr
                        key={productoId}
                        className={`border-b hover:bg-slate-50 ${
                          estaSeleccionado ? "bg-blue-50" : ""
                        }`}
                      >
                        <td className="px-3 py-2">
                          <button
                            onClick={() => toggleSeleccionarProducto(productoId)}
                            className="flex items-center justify-center"
                          >
                            {estaSeleccionado ? (
                              <CheckSquare className="w-5 h-5 text-blue-600" />
                            ) : (
                              <Square className="w-5 h-5 text-slate-400" />
                            )}
                          </button>
                        </td>
                        <td className="px-3 py-2 font-medium">{producto.codigo}</td>
                        <td className="px-3 py-2">{producto.descripcion || producto.nombre}</td>
                        <td className="px-3 py-2 text-slate-600">
                          {producto.marca || (
                            <span className="text-slate-400 italic">Sin marca</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {producto.cantidad || producto.existencia || 0}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="0"
                            value={datos.cantidad}
                            onChange={(e) =>
                              actualizarDatoCarga(productoId, "cantidad", e.target.value)
                            }
                            disabled={!estaSeleccionado}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Opcional"
                            value={datos.costo}
                            onChange={(e) =>
                              actualizarDatoCarga(productoId, "costo", e.target.value)
                            }
                            disabled={!estaSeleccionado}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            placeholder="Opcional"
                            value={datos.utilidad}
                            onChange={(e) =>
                              actualizarDatoCarga(productoId, "utilidad", e.target.value)
                            }
                            disabled={!estaSeleccionado}
                            className="w-24 text-right"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min="0"
                            max="100"
                            step="0.1"
                            placeholder="40"
                            value={datos.porcentaje_utilidad}
                            onChange={(e) =>
                              actualizarDatoCarga(
                                productoId,
                                "porcentaje_utilidad",
                                e.target.value
                              )
                            }
                            disabled={!estaSeleccionado}
                            className="w-20 text-right"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-slate-600">
                {productosSeleccionados.size > 0 && (
                  <span>
                    {productosSeleccionados.size} producto(s) seleccionado(s)
                  </span>
                )}
              </div>
              <Button
                onClick={handleCargarExistenciaMasiva}
                disabled={loading || productosSeleccionados.size === 0}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Cargando...
                  </>
                ) : (
                  `Cargar ${productosSeleccionados.size} Producto(s)`
                )}
              </Button>
            </div>
          </div>
        )}

        {productos.length === 0 && !buscando && busqueda.length >= 2 && (
          <div className="text-center py-8 text-slate-500 text-sm">
            No se encontraron productos. Intenta con otro término de búsqueda.
          </div>
        )}

        {/* Resultado de la carga */}
        {resultadoCarga && resultadoCarga.detalle && (
          <div className="mt-4 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-700 mb-2">Resultado de la carga:</h4>
            <div className="text-sm space-y-1">
              <div className="text-green-600">
                ✓ Exitosos: {resultadoCarga.detalle.exitosos?.length || 0}
              </div>
              {resultadoCarga.detalle.fallidos &&
                resultadoCarga.detalle.fallidos.length > 0 && (
                  <div className="text-red-600">
                    ✗ Fallidos: {resultadoCarga.detalle.fallidos.length}
                  </div>
                )}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CargarExistenciasMasivaModal;

