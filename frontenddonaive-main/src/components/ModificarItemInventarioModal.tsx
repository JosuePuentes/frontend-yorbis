import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, X, Save, Percent } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Lote {
  lote: string;
  fecha_vencimiento: string; // Formato: YYYY-MM-DD
  cantidad?: number;
}

interface Producto {
  id: string;
  _id?: string; // ID alternativo
  codigo: string;
  nombre?: string;
  descripcion?: string;
  marca?: string;
  marca_producto?: string; // Campo alternativo para marca
  precio?: number;
  precio_unitario?: number; // Campo usado por el backend
  costo?: number;
  costo_unitario?: number; // Campo usado por el backend
  existencia?: number;
  cantidad?: number; // Campo usado por el backend
  lotes?: Lote[]; // Array de lotes con fechas de vencimiento
  sucursal?: string;
}

interface ModificarItemInventarioModalProps {
  open: boolean;
  onClose: () => void;
  inventarioId: string;
  sucursalId: string;
  onSuccess?: () => void;
  itemId?: string; // ID o código del item específico a modificar
}

const ModificarItemInventarioModal: React.FC<ModificarItemInventarioModalProps> = ({
  open,
  onClose,
  inventarioId,
  sucursalId,
  onSuccess,
  itemId,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productosTodos, setProductosTodos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(false);
  const [cargandoProductos, setCargandoProductos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Campos editables
  const [codigo, setCodigo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [marca, setMarca] = useState("");
  const [costo, setCosto] = useState<number>(0);
  const [existencia, setExistencia] = useState<number>(0);
  const [precio, setPrecio] = useState<number>(0);
  const [porcentajeGanancia, setPorcentajeGanancia] = useState<number>(40.0); // Default 40%
  const [lotes, setLotes] = useState<Lote[]>([]);

  // Cargar todos los productos de la sucursal al abrir el modal
  useEffect(() => {
    if (open && sucursalId) {
      cargarTodosLosProductos();
    } else if (!open) {
      // Limpiar cuando se cierra el modal
      setProductosTodos([]);
      setProductos([]);
      setSearchTerm("");
      setProductoSeleccionado(null);
    }
  }, [open, sucursalId]);

  // Seleccionar automáticamente el item si se pasa itemId
  useEffect(() => {
    if (open && itemId && productosTodos.length > 0) {
      const itemEncontrado = productosTodos.find(
        (p) => p.codigo === itemId || p.id === itemId || p._id === itemId
      );
      if (itemEncontrado) {
        setProductoSeleccionado(itemEncontrado);
        // Llenar los campos automáticamente
        setCodigo(itemEncontrado.codigo || "");
        setDescripcion(itemEncontrado.descripcion || itemEncontrado.nombre || "");
        setMarca(itemEncontrado.marca || itemEncontrado.marca_producto || "");
        setCosto(itemEncontrado.costo_unitario || itemEncontrado.costo || 0);
        setExistencia(itemEncontrado.cantidad || itemEncontrado.existencia || 0);
        setPrecio(itemEncontrado.precio_unitario || itemEncontrado.precio || 0);
        // Calcular porcentaje de ganancia - usar 40% por defecto si no viene
        const porcentajeExistente = itemEncontrado.porcentaje_ganancia || itemEncontrado.utilidad_porcentaje || itemEncontrado.porcentaje_utilidad || 0;
        if (porcentajeExistente > 0) {
          setPorcentajeGanancia(porcentajeExistente);
        } else {
          // Si no hay porcentaje, calcular desde precio y costo, o usar 40% por defecto
          const costoItem = itemEncontrado.costo_unitario || itemEncontrado.costo || 0;
          const precioItem = itemEncontrado.precio_unitario || itemEncontrado.precio || 0;
          if (costoItem > 0 && precioItem > costoItem) {
            const porcentaje = ((precioItem - costoItem) / costoItem) * 100;
            setPorcentajeGanancia(porcentaje);
          } else {
            // ✅ Usar 40% por defecto si no se puede calcular
            setPorcentajeGanancia(40.0);
          }
        }
        setLotes(itemEncontrado.lotes || []);
      }
    }
  }, [open, itemId, productosTodos]);

  // Filtrar productos localmente cuando cambia el término de búsqueda
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setProductos(productosTodos);
      return;
    }

    const termino = searchTerm.toLowerCase().trim();
    const productosFiltrados = productosTodos.filter((p) => {
      const codigo = (p.codigo || "").toLowerCase();
      const descripcion = (p.descripcion || p.nombre || "").toLowerCase();
      const marca = (p.marca || "").toLowerCase();
      return codigo.includes(termino) || descripcion.includes(termino) || marca.includes(termino);
    });
    setProductos(productosFiltrados);
  }, [searchTerm, productosTodos]);

  const cargarTodosLosProductos = async () => {
    setCargandoProductos(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // Obtener items directamente del inventario (no del punto de venta)
      // Esto asegura que obtenemos los datos actualizados con costo_unitario, cantidad, precio_unitario
      const res = await fetch(
        `${API_BASE_URL}/inventarios/${inventarioId}/items`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        // Si el endpoint no existe (404), intentar endpoints alternativos
        if (res.status === 404) {
          console.warn(`⚠️ [ModificarItemInventarioModal] Endpoint /inventarios/${inventarioId}/items no encontrado, intentando alternativas...`);
          
          // Intentar con endpoint alternativo 1: productos filtrados por inventario
          try {
            const resAlt1 = await fetch(
              `${API_BASE_URL}/productos?inventario_id=${inventarioId}`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (resAlt1.ok) {
              const items = await resAlt1.json();
              // ✅ Cambio: El endpoint ahora retorna array directo, no objeto con productos
              const itemsArray = Array.isArray(items) ? items : [];
              
              // Mapear items del inventario a productos para el modal
              const todosProductos: Producto[] = itemsArray.map((item: any) => {
                const productoId = item._id || item.id || item.item_id || "";
                const codigoProducto = item.codigo || "";
                const descripcionProducto = item.descripcion || item.nombre || "";
                const marcaProducto = item.marca || "";
                const costoUnitario = Number(item.costo_unitario || item.costo || 0);
                const cantidad = Number(item.cantidad || item.stock || 0);
                const precioUnitario = Number(item.precio_unitario || item.precio_venta || 0);
                
                return {
                  id: productoId, // ✅ Agregado campo id requerido
                  _id: productoId,
                  codigo: codigoProducto,
                  descripcion: descripcionProducto,
                  marca: marcaProducto,
                  costo_unitario: costoUnitario,
                  cantidad: cantidad,
                  precio_unitario: precioUnitario,
                };
              });
              
              setProductosTodos(todosProductos);
              setProductos(todosProductos);
              console.log(`✅ [ModificarItemInventarioModal] Productos obtenidos desde endpoint alternativo: ${todosProductos.length} productos`);
              return;
            }
          } catch (err) {
            console.warn("⚠️ [ModificarItemInventarioModal] Endpoint alternativo 1 falló:", err);
          }
          
          // Intentar con endpoint alternativo 2: obtener todos los productos y filtrar
          try {
            const resAlt2 = await fetch(`${API_BASE_URL}/productos`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (resAlt2.ok) {
              const data = await resAlt2.json();
              // ✅ Cambio: El endpoint ahora retorna array directo, no objeto con productos
              const productos = Array.isArray(data) ? data : [];
              // Filtrar productos que pertenezcan a este inventario
              const itemsFiltrados = productos.filter((p: any) => 
                p.inventario_id === inventarioId || 
                p.inventario === inventarioId ||
                p.inventarioId === inventarioId
              );
              
              // Mapear items del inventario a productos para el modal
              const todosProductos: Producto[] = itemsFiltrados.map((item: any) => {
                const productoId = item._id || item.id || item.item_id || "";
                const codigoProducto = item.codigo || "";
                const descripcionProducto = item.descripcion || item.nombre || "";
                const marcaProducto = item.marca || "";
                const costoUnitario = Number(item.costo_unitario || item.costo || 0);
                const cantidad = Number(item.cantidad || item.stock || 0);
                const precioUnitario = Number(item.precio_unitario || item.precio_venta || 0);
                
                return {
                  id: productoId, // ✅ Agregado campo id requerido
                  _id: productoId,
                  codigo: codigoProducto,
                  descripcion: descripcionProducto,
                  marca: marcaProducto,
                  costo_unitario: costoUnitario,
                  cantidad: cantidad,
                  precio_unitario: precioUnitario,
                };
              });
              
              setProductosTodos(todosProductos);
              setProductos(todosProductos);
              console.log(`✅ [ModificarItemInventarioModal] Productos obtenidos desde endpoint alternativo 2: ${todosProductos.length} productos`);
              return;
            }
          } catch (err) {
            console.warn("⚠️ [ModificarItemInventarioModal] Endpoint alternativo 2 falló:", err);
          }
          
          // Si ningún endpoint alternativo funciona, mostrar error
          setError("El endpoint para obtener items del inventario no está disponible. Por favor, contacte al administrador.");
          setProductosTodos([]);
          setProductos([]);
          return;
        }
        
        throw new Error("Error al obtener items del inventario");
      }

      const items = await res.json();
      const itemsArray = Array.isArray(items) ? items : [];
      
      // Mapear items del inventario a productos para el modal
      const todosProductos: Producto[] = itemsArray.map((item: any) => {
        // Priorizar _id sobre id
        const productoId = item._id || item.id || item.item_id || "";
        const codigoProducto = item.codigo || "";
        
        return {
          id: productoId,
          codigo: codigoProducto,
          nombre: item.descripcion || item.nombre || "",
          descripcion: item.descripcion || item.nombre || "",
          marca: item.marca || "",
          // Usar los campos correctos del backend: priorizar costo_unitario, cantidad, precio_unitario
          precio_unitario: item.precio_unitario || item.precio || 0,
          precio: item.precio_unitario || item.precio || 0, // Mantener ambos para compatibilidad
          costo_unitario: item.costo_unitario || item.costo || 0,
          costo: item.costo_unitario || item.costo || 0, // Mantener ambos para compatibilidad
          cantidad: item.cantidad || item.existencia || 0,
          existencia: item.cantidad || item.existencia || 0, // Mantener ambos para compatibilidad
          porcentaje_ganancia: item.porcentaje_ganancia || item.utilidad_porcentaje || item.porcentaje_utilidad || 40.0, // ✅ 40% por defecto
          lotes: item.lotes || [], // Incluir lotes del backend
          sucursal: item.sucursal || sucursalId
        };
      });
      
      setProductosTodos(todosProductos);
      setProductos(todosProductos);
      
      if (todosProductos.length === 0) {
        setError(`No se encontraron items en este inventario.`);
      }
    } catch (err: any) {
      setError(err.message || "Error al cargar items del inventario");
      setProductosTodos([]);
      setProductos([]);
    } finally {
      setCargandoProductos(false);
    }
  };


  const seleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setCodigo(producto.codigo || "");
    setDescripcion(producto.descripcion || producto.nombre || "");
    setMarca(producto.marca || "");
    
    // Usar los campos correctos del backend: costo_unitario, cantidad, precio_unitario
    const costo = producto.costo_unitario || producto.costo || 0;
    const cantidad = producto.cantidad || producto.existencia || 0;
    const precio = producto.precio_unitario || producto.precio || 0;
    
    setCosto(costo);
    setExistencia(cantidad);
    setPrecio(precio);
    
    // Cargar lotes del producto
    setLotes(producto.lotes || []);
    
    // Calcular porcentaje de ganancia inicial - usar 40% por defecto si no viene
    const porcentajeExistente = producto.porcentaje_ganancia || producto.utilidad_porcentaje || producto.porcentaje_utilidad || 0;
    if (porcentajeExistente > 0) {
      setPorcentajeGanancia(porcentajeExistente);
    } else if (costo > 0 && precio > 0 && precio > costo) {
      // Calcular desde precio y costo si no viene porcentaje
      const porcentaje = ((precio - costo) / costo) * 100;
      setPorcentajeGanancia(Number(porcentaje.toFixed(2)));
    } else {
      // ✅ Usar 40% por defecto si no se puede calcular
      setPorcentajeGanancia(40.0);
    }
    
    setSearchTerm("");
    setProductos([]);
  };

  const agregarLote = () => {
    setLotes([...lotes, { lote: "", fecha_vencimiento: "", cantidad: 0 }]);
  };

  const eliminarLote = (index: number) => {
    setLotes(lotes.filter((_, i) => i !== index));
  };

  const actualizarLote = (index: number, campo: keyof Lote, valor: string | number) => {
    const nuevosLotes = [...lotes];
    nuevosLotes[index] = { ...nuevosLotes[index], [campo]: valor };
    setLotes(nuevosLotes);
  };

  // Calcular precio cuando cambia costo o porcentaje de ganancia (utilidad contable)
  // Utilidad contable: el porcentaje se aplica sobre el precio de venta
  // Fórmula: Precio = Costo / (1 - % Ganancia / 100)
  // Ejemplo: Costo = $8, % Ganancia = 40% → Precio = $8 / (1 - 0.40) = $8 / 0.60 = $13.33
  useEffect(() => {
    if (costo > 0 && porcentajeGanancia >= 0 && porcentajeGanancia < 100) {
      const nuevoPrecio = costo / (1 - porcentajeGanancia / 100);
      setPrecio(Number(nuevoPrecio.toFixed(2)));
    } else if (costo > 0 && porcentajeGanancia >= 100) {
      // Si el porcentaje es 100% o más, no se puede calcular (división por cero o negativa)
      setPrecio(costo);
    } else if (costo > 0) {
      setPrecio(costo);
    }
  }, [costo, porcentajeGanancia]);

  const handleGuardar = async () => {
    if (!productoSeleccionado) {
      setError("Debe seleccionar un producto");
      return;
    }

    if (!codigo.trim() || !descripcion.trim()) {
      setError("Código y descripción son obligatorios");
      return;
    }

    if (costo <= 0 || existencia < 0 || precio <= 0) {
      setError("Costo, existencia y precio deben ser valores válidos");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // El backend busca items por código del producto, no por ID
      // Usar el código del producto seleccionado (el código original, no el editado)
      const codigoProducto = productoSeleccionado.codigo || codigo.trim();
      
      // Validar que tenemos un código válido
      if (!codigoProducto || codigoProducto.trim() === "") {
        throw new Error("No se pudo identificar el item. El código del producto es requerido.");
      }

      const res = await fetch(`${API_BASE_URL}/inventarios/${inventarioId}/items/${encodeURIComponent(codigoProducto)}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          codigo: codigo.trim(),
          descripcion: descripcion.trim(),
          marca: marca.trim(),
          costo_unitario: Number(costo), // El backend espera costo_unitario
          cantidad: Number(existencia), // El backend espera cantidad (no existencia)
          precio_unitario: Number(precio), // El backend espera precio_unitario
          porcentaje_ganancia: porcentajeGanancia,
          lotes: lotes.filter(l => l.lote.trim() !== "" && l.fecha_vencimiento !== ""), // Filtrar lotes vacíos
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || data.message || "Error al actualizar el item");
      }

      setSuccess(true);
      // Llamar onSuccess primero para actualizar los datos (esto actualizará los totales y cerrará el modal)
      if (onSuccess) {
        await onSuccess();
      }
      // No necesitamos llamar handleCerrar porque onSuccess ya cerró el modal
      // Solo limpiamos el estado local después de un momento
      setTimeout(() => {
        setProductoSeleccionado(null);
        setSearchTerm("");
        setProductos([]);
        setCodigo("");
        setDescripcion("");
        setMarca("");
        setCosto(0);
        setExistencia(0);
        setPrecio(0);
        setPorcentajeGanancia(0);
        setLotes([]);
        setError(null);
        setSuccess(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || "Error al guardar los cambios");
    } finally {
      setLoading(false);
    }
  };

  const handleCerrar = () => {
    setProductoSeleccionado(null);
    setSearchTerm("");
    setProductos([]);
    setCodigo("");
    setDescripcion("");
    setMarca("");
    setCosto(0);
    setExistencia(0);
    setPrecio(0);
    setPorcentajeGanancia(0);
    setError(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCerrar()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" aria-describedby="modificar-item-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            Modificar Item de Inventario
          </DialogTitle>
          <p id="modificar-item-description" className="sr-only">
            Modal para modificar items del inventario. Busca un producto y edita sus campos.
          </p>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-3 rounded-md text-sm">
            Item actualizado exitosamente
          </div>
        )}

        {/* Búsqueda y lista de productos */}
        {!productoSeleccionado && (
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Buscar producto por código, nombre o descripción..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {cargandoProductos && (
              <div className="text-center py-4 text-slate-500 text-sm">
                Cargando productos del inventario...
              </div>
            )}

            {productos.length > 0 && (
              <div className="border rounded-lg max-h-60 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left">Código</th>
                      <th className="px-3 py-2 text-left">Descripción</th>
                      <th className="px-3 py-2 text-left">Marca</th>
                      <th className="px-3 py-2 text-right">Precio</th>
                      <th className="px-3 py-2 text-right">Existencia</th>
                      <th className="px-3 py-2 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {productos.map((producto) => (
                      <tr
                        key={producto.id}
                        className="border-b hover:bg-slate-50 cursor-pointer"
                        onClick={() => seleccionarProducto(producto)}
                      >
                        <td className="px-3 py-2">{producto.codigo}</td>
                        <td className="px-3 py-2">{producto.descripcion || producto.nombre}</td>
                        <td className="px-3 py-2">
                          {producto.marca || producto.marca_producto || (
                            <span className="text-slate-400 italic">Sin marca</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {producto.precio?.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-3 py-2 text-right">{producto.existencia}</td>
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              seleccionarProducto(producto);
                            }}
                          >
                            Seleccionar
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!cargandoProductos && productosTodos.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No hay productos en este inventario
              </div>
            )}

            {!cargandoProductos && productosTodos.length > 0 && searchTerm.trim() !== "" && productos.length === 0 && (
              <div className="text-center py-4 text-slate-500 text-sm">
                No se encontraron productos que coincidan con "{searchTerm}"
              </div>
            )}

            {!cargandoProductos && productosTodos.length > 0 && searchTerm.trim() === "" && (
              <div className="text-xs text-slate-500 mb-2">
                Mostrando {productosTodos.length} {productosTodos.length === 1 ? 'producto' : 'productos'} del inventario
              </div>
            )}
          </div>
        )}

        {/* Formulario de edición */}
        {productoSeleccionado && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">Editando: {productoSeleccionado.codigo}</h3>
              <Button variant="ghost" size="sm" onClick={() => setProductoSeleccionado(null)}>
                <X className="h-4 w-4 mr-1" />
                Cambiar producto
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Código <span className="text-red-500">*</span>
                </label>
                <Input
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  placeholder="Código del producto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Descripción <span className="text-red-500">*</span>
                </label>
                <Input
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Descripción del producto"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Marca</label>
                <Input
                  value={marca}
                  onChange={(e) => setMarca(e.target.value)}
                  placeholder="Marca del producto"
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
                  value={costo}
                  onChange={(e) => setCosto(Number(e.target.value))}
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Existencia <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={existencia}
                  onChange={(e) => setExistencia(Number(e.target.value))}
                  placeholder="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Porcentaje de Ganancia (%) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="99.99"
                    value={porcentajeGanancia}
                    onChange={(e) => {
                      const valor = Number(e.target.value);
                      // Limitar a máximo 99.99% para evitar división por cero
                      if (valor >= 100) {
                        setPorcentajeGanancia(99.99);
                      } else if (valor >= 0) {
                        setPorcentajeGanancia(valor);
                      }
                    }}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Utilidad contable: el porcentaje se aplica sobre el precio de venta
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Fórmula: Precio = Costo ÷ (1 - % Ganancia ÷ 100)
                </p>
                {porcentajeGanancia >= 100 && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ El porcentaje no puede ser 100% o mayor
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Precio (calculado) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={precio}
                  onChange={(e) => {
                    const nuevoPrecio = Number(e.target.value);
                    setPrecio(nuevoPrecio);
                    // Recalcular porcentaje de ganancia si se modifica el precio manualmente (utilidad contable)
                    if (costo > 0 && nuevoPrecio > costo) {
                      const nuevoPorcentaje = (1 - costo / nuevoPrecio) * 100;
                      setPorcentajeGanancia(Number(nuevoPorcentaje.toFixed(2)));
                    } else if (costo > 0 && nuevoPrecio <= costo) {
                      setPorcentajeGanancia(0);
                    }
                  }}
                  placeholder="0.00"
                  className="bg-slate-50"
                />
                <p className="text-xs text-slate-500 mt-1">
                  Precio = Costo ÷ (1 - % Ganancia ÷ 100)
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  Ejemplo: Costo $8, 40% ganancia → Precio = $8 ÷ 0.60 = $13.33
                </p>
              </div>

              <div className="md:col-span-2">
                <div className="bg-blue-50 p-3 rounded-md">
                  <p className="text-sm font-medium text-blue-800 mb-1">Utilidad Contable:</p>
                  <p className="text-lg font-bold text-blue-900">
                    {(precio - costo).toLocaleString("es-VE", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Utilidad = Precio - Costo
                  </p>
                </div>
              </div>
            </div>

            {/* Sección de Lotes y Fechas de Vencimiento */}
            <div className="mt-6 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-slate-700">Lotes y Fechas de Vencimiento</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={agregarLote}
                  className="flex items-center gap-1"
                >
                  <span>+</span>
                  Agregar Lote
                </Button>
              </div>

              {lotes.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-sm bg-slate-50 rounded-md">
                  No hay lotes agregados. Haz clic en "Agregar Lote" para agregar uno.
                </div>
              ) : (
                <div className="space-y-3">
                  {lotes.map((lote, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-4 gap-3 p-3 bg-slate-50 rounded-md border border-slate-200">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Lote
                        </label>
                        <Input
                          value={lote.lote}
                          onChange={(e) => actualizarLote(index, "lote", e.target.value)}
                          placeholder="Número de lote"
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Fecha de Vencimiento
                        </label>
                        <Input
                          type="date"
                          value={lote.fecha_vencimiento}
                          onChange={(e) => actualizarLote(index, "fecha_vencimiento", e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Cantidad (opcional)
                        </label>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          value={lote.cantidad || ""}
                          onChange={(e) => actualizarLote(index, "cantidad", Number(e.target.value) || 0)}
                          placeholder="Cantidad"
                          className="text-sm"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => eliminarLote(index)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={handleCerrar} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={handleGuardar} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ModificarItemInventarioModal;

