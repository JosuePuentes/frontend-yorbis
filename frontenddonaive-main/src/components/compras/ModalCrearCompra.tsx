import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, Plus, Trash2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Proveedor {
  _id?: string;
  nombre: string;
  rif: string;
  telefono: string;
  dias_credito?: number;
  descuento_comercial?: number;
  descuento_pronto_pago?: number;
}

interface Lote {
  lote: string;
  fecha_vencimiento?: string;
  cantidad?: number;
}

interface ProductoInventario {
  _id?: string;
  codigo: string;
  descripcion: string;
  marca?: string;
  costo_unitario?: number;
  precio_unitario?: number;
  cantidad?: number;
  lotes?: Lote[];
}

interface ItemCompra {
  id: string;
  codigo: string;
  descripcion: string;
  marca: string;
  costo: number;
  costoAjustado: number; // Costo con ajuste de dólar negro si aplica
  llevaIva: boolean; // Si el producto lleva IVA
  iva: number; // Monto del IVA (16% del costo)
  utilidad: number;
  precioVenta: number;
  cantidad: number;
  fechaVencimiento: string;
  lote: string;
  esNuevo: boolean; // Si es un producto nuevo o existente
  productoId?: string; // ID del producto si existe en inventario
  lotesExistentes?: Lote[]; // Lotes existentes del producto en inventario
}

interface ModalCrearCompraProps {
  open: boolean;
  onClose: () => void;
  proveedor: Proveedor;
  sucursalId: string;
  dolarBcv: number;
  dolarNegro: number;
  diferenciaPorcentaje: number;
  onSuccess: () => void;
}

const ModalCrearCompra: React.FC<ModalCrearCompraProps> = ({
  open,
  onClose,
  proveedor,
  sucursalId,
  dolarBcv,
  dolarNegro,
  diferenciaPorcentaje,
  onSuccess,
}) => {
  const [itemsCompra, setItemsCompra] = useState<ItemCompra[]>([]);
  const [pagarEnDolarNegro, setPagarEnDolarNegro] = useState(false);
  const [busquedaProducto, setBusquedaProducto] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<ProductoInventario[]>([]);
  const [buscandoProductos, setBuscandoProductos] = useState(false);
  const [mostrarFormularioNuevo, setMostrarFormularioNuevo] = useState(false);
  
  // Formulario para nuevo producto
  const [codigoNuevo, setCodigoNuevo] = useState("");
  const [descripcionNuevo, setDescripcionNuevo] = useState("");
  const [marcaNuevo, setMarcaNuevo] = useState("");
  const [costoNuevo, setCostoNuevo] = useState("");
  const [utilidadNuevo, setUtilidadNuevo] = useState("");
  const [cantidadNuevo, setCantidadNuevo] = useState("");
  const [fechaVencimientoNuevo, setFechaVencimientoNuevo] = useState("");
  const [loteNuevo, setLoteNuevo] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [compraGuardada, setCompraGuardada] = useState<any>(null);

  // Si se activa dólar negro, activar automáticamente
  useEffect(() => {
    if (dolarNegro > 0 && dolarBcv > 0 && diferenciaPorcentaje > 0) {
      setPagarEnDolarNegro(true);
    }
  }, [dolarNegro, dolarBcv, diferenciaPorcentaje]);

  // Buscar productos en inventario
  const buscarProductos = async () => {
    if (!busquedaProducto.trim()) {
      setProductosEncontrados([]);
      return;
    }

    setBuscandoProductos(true);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // Buscar en todos los inventarios usando el endpoint de items
      // Primero obtener todos los inventarios
      const resInventarios = await fetch(`${API_BASE_URL}/inventarios`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!resInventarios.ok) {
        throw new Error("Error al obtener inventarios");
      }

      const inventarios = await resInventarios.json();
      const inventariosArray = Array.isArray(inventarios) ? inventarios : [];

      // Buscar en todos los inventarios
      const todosLosProductos: ProductoInventario[] = [];
      const busquedaLower = busquedaProducto.toLowerCase().trim();

      for (const inventario of inventariosArray) {
        try {
          const resItems = await fetch(
            `${API_BASE_URL}/inventarios/${inventario._id}/items`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (resItems.ok) {
            const items = await resItems.json();
            const itemsArray = Array.isArray(items) ? items : [];

            // Filtrar items que coincidan con la búsqueda
            const itemsFiltrados = itemsArray.filter((item: any) => {
              const codigo = (item.codigo || "").toLowerCase();
              const descripcion = (item.descripcion || "").toLowerCase();
              const marca = (item.marca || "").toLowerCase();
              return (
                codigo.includes(busquedaLower) ||
                descripcion.includes(busquedaLower) ||
                marca.includes(busquedaLower)
              );
            });

            // Agregar a la lista (evitar duplicados por código)
            itemsFiltrados.forEach((item: any) => {
              const existe = todosLosProductos.some(
                (p) => p.codigo === item.codigo
              );
              if (!existe) {
                todosLosProductos.push({
                  _id: item._id,
                  codigo: item.codigo,
                  descripcion: item.descripcion,
                  marca: item.marca,
                  costo_unitario: item.costo_unitario || item.costo,
                  precio_unitario: item.precio_unitario || item.precio,
                  cantidad: item.cantidad || item.existencia,
                  lotes: item.lotes || [],
                });
              }
            });
          }
        } catch (err) {
          console.error(`Error al obtener items del inventario ${inventario._id}:`, err);
        }
      }

      setProductosEncontrados(todosLosProductos);
    } catch (err) {
      console.error("Error al buscar productos:", err);
      setProductosEncontrados([]);
    } finally {
      setBuscandoProductos(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarProductos();
    }, 300);

    return () => clearTimeout(timer);
  }, [busquedaProducto]);

  // Agregar producto existente
  const agregarProductoExistente = (producto: ProductoInventario) => {
    // Verificar si el producto ya está en la compra
    const yaExiste = itemsCompra.find(item => item.codigo === producto.codigo);
    if (yaExiste) {
      setError("Este producto ya está en la compra. Puedes editar la cantidad directamente.");
      return;
    }

    const costo = producto.costo_unitario || 0;
    const llevaIva = false; // Por defecto no lleva IVA
    const iva = 0; // Se calculará cuando se active
    const costoAjustado = pagarEnDolarNegro && diferenciaPorcentaje > 0
      ? costo * (1 + diferenciaPorcentaje / 100)
      : costo;
    // Calcular utilidad como porcentaje
    const precioUnitario = producto.precio_unitario || 0;
    const utilidad = costo > 0 ? ((precioUnitario - costo) / costo) * 100 : 0;
    const precioVenta = costoAjustado * (1 + utilidad / 100);

    // Mantener los lotes existentes del producto
    const lotesExistentes = producto.lotes || [];

    const nuevoItem: ItemCompra = {
      id: `item-${Date.now()}-${Math.random()}`,
      codigo: producto.codigo,
      descripcion: producto.descripcion,
      marca: producto.marca || "",
      costo: costo,
      costoAjustado: costoAjustado,
      llevaIva: llevaIva,
      iva: iva,
      utilidad: utilidad,
      precioVenta: precioVenta,
      cantidad: 1,
      fechaVencimiento: "",
      lote: "",
      esNuevo: false,
      productoId: producto._id,
      lotesExistentes: lotesExistentes,
    };

    setItemsCompra([...itemsCompra, nuevoItem]);
    setBusquedaProducto("");
    setProductosEncontrados([]);
    setError(null);
  };

  // Agregar nuevo producto
  const agregarNuevoProducto = () => {
    if (!codigoNuevo.trim() || !descripcionNuevo.trim() || !costoNuevo || !utilidadNuevo || !cantidadNuevo) {
      setError("Código, descripción, costo, utilidad y cantidad son obligatorios");
      return;
    }

    const costo = parseFloat(costoNuevo);
    const llevaIva = false; // Por defecto no lleva IVA
    const iva = 0; // Se calculará cuando se active
    const utilidad = parseFloat(utilidadNuevo); // Utilidad como porcentaje
    const costoAjustado = pagarEnDolarNegro && diferenciaPorcentaje > 0
      ? costo * (1 + diferenciaPorcentaje / 100)
      : costo;
    const precioVenta = costoAjustado * (1 + utilidad / 100);

    const nuevoItem: ItemCompra = {
      id: `item-${Date.now()}-${Math.random()}`,
      codigo: codigoNuevo.trim(),
      descripcion: descripcionNuevo.trim(),
      marca: marcaNuevo.trim(),
      costo: costo,
      costoAjustado: costoAjustado,
      llevaIva: llevaIva,
      iva: iva,
      utilidad: utilidad,
      precioVenta: precioVenta,
      cantidad: parseInt(cantidadNuevo),
      fechaVencimiento: fechaVencimientoNuevo,
      lote: loteNuevo.trim(),
      esNuevo: true,
    };

    setItemsCompra([...itemsCompra, nuevoItem]);
    
    // Limpiar formulario
    setCodigoNuevo("");
    setDescripcionNuevo("");
    setMarcaNuevo("");
    setCostoNuevo("");
    setUtilidadNuevo("");
    setCantidadNuevo("");
    setFechaVencimientoNuevo("");
    setLoteNuevo("");
    setMostrarFormularioNuevo(false);
    setError(null);
  };

  // Actualizar items cuando cambia el checkbox de dólar negro
  useEffect(() => {
    setItemsCompra(itemsCompra.map(item => {
      const costoAjustado = pagarEnDolarNegro && diferenciaPorcentaje > 0
        ? item.costo * (1 + diferenciaPorcentaje / 100)
        : item.costo;
      // Recalcular IVA si lleva IVA
      const iva = item.llevaIva ? costoAjustado * 0.16 : 0;
      const costoConIva = costoAjustado + iva;
      const precioVenta = costoConIva * (1 + item.utilidad / 100);
      return {
        ...item,
        costoAjustado,
        iva,
        precioVenta,
      };
    }));
  }, [pagarEnDolarNegro, diferenciaPorcentaje]);

  // Eliminar item
  const eliminarItem = (id: string) => {
    setItemsCompra(itemsCompra.filter(item => item.id !== id));
  };

  // Actualizar cantidad de item
  const actualizarCantidad = (id: string, cantidad: number) => {
    setItemsCompra(itemsCompra.map(item =>
      item.id === id ? { ...item, cantidad: Math.max(1, cantidad) } : item
    ));
  };

  // Actualizar costo de item
  const actualizarCosto = (id: string, costo: number) => {
    setItemsCompra(itemsCompra.map(item => {
      if (item.id === id) {
        const costoAjustado = pagarEnDolarNegro && diferenciaPorcentaje > 0
          ? costo * (1 + diferenciaPorcentaje / 100)
          : costo;
        // Recalcular IVA si lleva IVA
        const iva = item.llevaIva ? costoAjustado * 0.16 : 0;
        const costoConIva = costoAjustado + iva;
        const precioVenta = costoConIva * (1 + item.utilidad / 100);
        return {
          ...item,
          costo: costo,
          costoAjustado: costoAjustado,
          iva: iva,
          precioVenta: precioVenta,
        };
      }
      return item;
    }));
  };

  // Actualizar utilidad de item (utilidad como porcentaje)
  const actualizarUtilidad = (id: string, utilidad: number) => {
    setItemsCompra(itemsCompra.map(item => {
      if (item.id === id) {
        // Recalcular precio de venta considerando IVA
        const costoConIva = item.costoAjustado + item.iva;
        const precioVenta = costoConIva * (1 + utilidad / 100);
        return {
          ...item,
          utilidad: utilidad,
          precioVenta: precioVenta,
        };
      }
      return item;
    }));
  };

  // Actualizar IVA cuando se marca/desmarca
  const actualizarIva = (id: string, llevaIva: boolean) => {
    setItemsCompra(itemsCompra.map(item => {
      if (item.id === id) {
        const iva = llevaIva ? item.costoAjustado * 0.16 : 0;
        // El costo ajustado con IVA se suma al costo base para el cálculo
        const costoConIva = item.costoAjustado + iva;
        const precioVenta = costoConIva * (1 + item.utilidad / 100);
        return {
          ...item,
          llevaIva: llevaIva,
          iva: iva,
          precioVenta: precioVenta,
        };
      }
      return item;
    }));
  };

  // Actualizar lote de item
  const actualizarLote = (id: string, lote: string) => {
    setItemsCompra(itemsCompra.map(item =>
      item.id === id ? { ...item, lote: lote } : item
    ));
  };

  // Actualizar fecha de vencimiento de item
  const actualizarFechaVencimiento = (id: string, fecha: string) => {
    setItemsCompra(itemsCompra.map(item =>
      item.id === id ? { ...item, fechaVencimiento: fecha } : item
    ));
  };

  // Calcular totales
  // Calcular subtotal (sin IVA)
  const subtotal = itemsCompra.reduce((sum, item) => {
    const costoConAjuste = item.costoAjustado * item.cantidad;
    return sum + costoConAjuste;
  }, 0);
  
  // Calcular total IVA
  const totalIva = itemsCompra.reduce((sum, item) => {
    if (item.llevaIva) {
      return sum + (item.iva * item.cantidad);
    }
    return sum;
  }, 0);
  
  // Calcular total (subtotal + IVA)
  const total = subtotal + totalIva;
  
  // Calcular cantidad total de productos
  const cantidadTotalProductos = itemsCompra.reduce((sum, item) => sum + item.cantidad, 0);
  
  const totalCosto = subtotal; // Para compatibilidad
  const totalUtilidad = itemsCompra.reduce((sum, item) => {
    const utilidadEnDinero = (item.costoAjustado * item.utilidad / 100) * item.cantidad;
    return sum + utilidadEnDinero;
  }, 0);
  const totalPrecioVenta = itemsCompra.reduce((sum, item) => sum + (item.precioVenta * item.cantidad), 0);

  // Mostrar modal de confirmación
  const mostrarConfirmacion = () => {
    if (itemsCompra.length === 0) {
      setError("Debe agregar al menos un producto");
      return;
    }
    setShowConfirmModal(true);
  };

  // Guardar compra (llamado después de confirmar)
  const guardarCompra = async () => {
    setShowConfirmModal(false);
    setLoading(true);
    setError(null);

    try {
      // Calcular total de la compra (subtotal + IVA)
      const totalCompra = subtotal + totalIva;
      
      // Obtener fecha actual en formato YYYY-MM-DD
      const fechaActual = new Date().toISOString().split('T')[0];
      
      // Preparar el body según el formato esperado por el backend
      const bodyData = {
        proveedorId: proveedor._id || "",
        proveedorNombre: proveedor.nombre || "",
        fecha: fechaActual,
        farmacia: sucursalId,
        total: totalCompra,
        numeroFactura: "", // Opcional, se puede agregar un campo en el formulario si es necesario
        observaciones: "", // Opcional, se puede agregar un campo en el formulario si es necesario
        productos: itemsCompra.map(item => ({
          nombre: item.descripcion, // Requerido
          cantidad: item.cantidad, // Número
          precioUnitario: item.costoAjustado, // Número (costo ajustado si aplica dólar negro)
          precioTotal: item.costoAjustado * item.cantidad, // Número (precio unitario * cantidad)
          codigo: item.codigo || undefined, // Opcional
          productoId: item.productoId || undefined, // Opcional
          // Campos adicionales para compatibilidad (el backend puede ignorarlos si no los necesita)
          marca: item.marca || undefined,
          lote: item.lote || undefined,
          fechaVencimiento: item.fechaVencimiento || undefined,
          lleva_iva: item.llevaIva || false,
          iva: item.iva || 0,
          utilidad: item.utilidad || 0,
          precio_venta: item.precioVenta || 0,
        })),
      };
      
      console.log("📦 [COMPRAS] Enviando compra al backend:", JSON.stringify(bodyData, null, 2));
      
      const res = await fetchWithAuth(`${API_BASE_URL}/compras`, {
        method: "POST",
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        const errorMessage = errorData?.detail || errorData?.message || `Error al guardar compra (${res.status})`;
        console.error("❌ [COMPRAS] Error del backend:", errorData);
        throw new Error(errorMessage);
      }

      const compraData = await res.json();
      console.log("✅ [COMPRAS] Compra guardada exitosamente:", compraData);
      
      // El backend actualiza el inventario automáticamente, no necesitamos hacer otra petición
      console.log("✅ [COMPRAS] El inventario se actualizó automáticamente en el backend");
      
      setCompraGuardada({
        ...compraData.compra || compraData,
        proveedor: proveedor,
        items: itemsCompra,
        subtotal,
        totalIva,
        total,
        totalCosto,
        totalUtilidad,
        totalPrecioVenta,
        dolarBcv,
        dolarNegro,
        pagarEnDolarNegro,
      });
    } catch (err: any) {
      setError(err.message || "Error al guardar compra");
      console.error("❌ [COMPRAS] Error al guardar compra:", err);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="bg-white w-full h-full flex flex-col overflow-hidden"
        style={{
          maxWidth: '100vw',
          maxHeight: '100vh',
        }}
      >
        {/* Header */}
        <div className="flex-shrink-0 pb-3 border-b px-4 pt-3">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-800">
                Crear Compra - {proveedor.nombre}
              </h2>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-5 gap-3 text-xs">
                <div>
                  <span className="text-slate-600 font-medium">RIF:</span>{" "}
                  <span className="text-slate-800">{proveedor.rif || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Teléfono:</span>{" "}
                  <span className="text-slate-800">{proveedor.telefono || "-"}</span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Días de Crédito:</span>{" "}
                  <span className="text-slate-800">
                    {proveedor.dias_credito !== undefined && proveedor.dias_credito !== null 
                      ? proveedor.dias_credito 
                      : 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Desc. Comercial:</span>{" "}
                  <span className="text-slate-800">
                    {proveedor.descuento_comercial !== undefined && proveedor.descuento_comercial !== null 
                      ? `${proveedor.descuento_comercial}%` 
                      : "0%"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-600 font-medium">Desc. Pronto Pago:</span>{" "}
                  <span className="text-slate-800">
                    {proveedor.descuento_pronto_pago !== undefined && proveedor.descuento_pronto_pago !== null 
                      ? `${proveedor.descuento_pronto_pago}%` 
                      : "0%"}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="ml-4 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm flex-shrink-0 mx-6 mt-4">
            {error}
          </div>
        )}

        <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 overflow-hidden min-h-0 px-4 pb-4">
          {/* Panel izquierdo - Búsqueda y formulario */}
          <div className="lg:col-span-1 space-y-3 overflow-y-auto">
            <Card className="p-3">
              <h3 className="font-medium text-sm text-slate-800 mb-3">Buscar Producto</h3>
              <div className="space-y-2">
                <Input
                  placeholder="Buscar por código o descripción..."
                  value={busquedaProducto}
                  onChange={(e) => setBusquedaProducto(e.target.value)}
                  className="w-full"
                />
                {buscandoProductos && (
                  <p className="text-sm text-slate-500">Buscando...</p>
                )}
                {productosEncontrados.length > 0 && (
                  <div className="max-h-80 overflow-y-auto space-y-2">
                    {productosEncontrados.map((producto) => (
                      <Card
                        key={producto._id || producto.codigo}
                        className="p-3 hover:bg-slate-50 cursor-pointer border-l-4 border-l-blue-500 transition-all"
                        onClick={() => agregarProductoExistente(producto)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-semibold text-sm text-slate-800">{producto.codigo}</p>
                            <p className="text-xs text-slate-600 mt-1">{producto.descripcion}</p>
                            {producto.marca && (
                              <p className="text-xs text-slate-500 mt-1">Marca: {producto.marca}</p>
                            )}
                            <div className="mt-2 flex gap-3 text-xs">
                              <span className="text-slate-600">
                                <strong>Costo:</strong> ${(producto.costo_unitario || 0).toFixed(2)}
                              </span>
                              <span className="text-slate-600">
                                <strong>Existencia:</strong> {producto.cantidad || 0}
                              </span>
                            </div>
                            {producto.lotes && producto.lotes.length > 0 && (
                              <div className="mt-2 text-xs text-blue-600">
                                <strong>Lotes:</strong> {producto.lotes.length} lote(s) existente(s)
                              </div>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
                {!buscandoProductos && busquedaProducto.trim() && productosEncontrados.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">
                    No se encontraron productos. Puedes crear uno nuevo.
                  </p>
                )}
              </div>
            </Card>

            <Card className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium text-sm text-slate-800">Nuevo Producto</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFormularioNuevo(!mostrarFormularioNuevo)}
                >
                  {mostrarFormularioNuevo ? "Ocultar" : "Mostrar"}
                </Button>
              </div>
              {mostrarFormularioNuevo && (
                <div className="space-y-3">
                  <Input
                    placeholder="Código *"
                    value={codigoNuevo}
                    onChange={(e) => setCodigoNuevo(e.target.value)}
                  />
                  <Input
                    placeholder="Descripción *"
                    value={descripcionNuevo}
                    onChange={(e) => setDescripcionNuevo(e.target.value)}
                  />
                  <Input
                    placeholder="Marca"
                    value={marcaNuevo}
                    onChange={(e) => setMarcaNuevo(e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Costo *"
                    value={costoNuevo}
                    onChange={(e) => setCostoNuevo(e.target.value)}
                  />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Utilidad (%) *"
                    value={utilidadNuevo}
                    onChange={(e) => setUtilidadNuevo(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Cantidad *"
                    value={cantidadNuevo}
                    onChange={(e) => setCantidadNuevo(e.target.value)}
                  />
                  <Input
                    type="date"
                    placeholder="Fecha Vencimiento"
                    value={fechaVencimientoNuevo}
                    onChange={(e) => setFechaVencimientoNuevo(e.target.value)}
                  />
                  <Input
                    placeholder="Lote"
                    value={loteNuevo}
                    onChange={(e) => setLoteNuevo(e.target.value)}
                  />
                  <Button
                    onClick={agregarNuevoProducto}
                    className="w-full"
                    variant="outline"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </Button>
                </div>
              )}
            </Card>

            {/* Checkbox para pagar en dólar negro */}
            {dolarNegro > 0 && dolarBcv > 0 && diferenciaPorcentaje > 0 && (
              <Card className="p-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={pagarEnDolarNegro}
                    onCheckedChange={(checked) => setPagarEnDolarNegro(!!checked)}
                  />
                  <label className="text-xs font-medium text-slate-700">
                    Pagar en Dólar Negro
                  </label>
                </div>
                {pagarEnDolarNegro && (
                  <p className="text-xs text-slate-500 mt-1.5">
                    Se sumará {diferenciaPorcentaje.toFixed(2)}% al costo de cada producto
                  </p>
                )}
              </Card>
            )}
          </div>

          {/* Panel derecho - Lista de items y totales */}
          <div className="lg:col-span-3 space-y-3 overflow-hidden flex flex-col">
            <Card className="p-3 flex-1 flex flex-col min-h-0">
              <h3 className="font-medium text-sm text-slate-800 mb-3">Productos en la Compra</h3>
              {itemsCompra.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-6">No hay productos agregados</p>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead className="bg-slate-100 sticky top-0 z-10">
                      <tr>
                        <th className="border border-slate-300 px-2 py-2 text-left font-medium text-slate-700">Código</th>
                        <th className="border border-slate-300 px-2 py-2 text-left font-medium text-slate-700">Descripción</th>
                        <th className="border border-slate-300 px-2 py-2 text-left font-medium text-slate-700">Marca</th>
                        <th className="border border-slate-300 px-2 py-2 text-right font-medium text-slate-700">Costo</th>
                        {pagarEnDolarNegro && (
                          <th className="border border-slate-300 px-2 py-2 text-right font-medium text-slate-700">Costo Ajust.</th>
                        )}
                        <th className="border border-slate-300 px-2 py-2 text-center font-medium text-slate-700">IVA</th>
                        <th className="border border-slate-300 px-2 py-2 text-right font-medium text-slate-700">Utilidad</th>
                        <th className="border border-slate-300 px-2 py-2 text-right font-medium text-slate-700">P. Venta</th>
                        <th className="border border-slate-300 px-2 py-2 text-right font-medium text-slate-700">Cant.</th>
                        <th className="border border-slate-300 px-2 py-2 text-left font-medium text-slate-700">Lote</th>
                        <th className="border border-slate-300 px-2 py-2 text-left font-medium text-slate-700">Venc.</th>
                        <th className="border border-slate-300 px-2 py-2 text-center font-medium text-slate-700">Acc.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsCompra.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="flex items-center gap-1.5">
                              <span className="font-medium text-xs">{item.codigo}</span>
                              {item.esNuevo && (
                                <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                  Nuevo
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-xs">{item.descripcion}</td>
                          <td className="border border-slate-300 px-2 py-2 text-xs">{item.marca || "-"}</td>
                          <td className="border border-slate-300 px-2 py-2">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.costo}
                              onChange={(e) => actualizarCosto(item.id, parseFloat(e.target.value) || 0)}
                              className="w-20 text-right text-xs h-7"
                            />
                          </td>
                          {pagarEnDolarNegro && (
                            <td className="border border-slate-300 px-2 py-2 text-right text-xs font-medium text-orange-600">
                              ${item.costoAjustado.toFixed(2)}
                            </td>
                          )}
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Checkbox
                                checked={item.llevaIva}
                                onCheckedChange={(checked) => actualizarIva(item.id, !!checked)}
                              />
                              {item.llevaIva && (
                                <span className="text-[10px] text-blue-600 font-medium">16%</span>
                              )}
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="flex items-center gap-1">
                              <Input
                                type="number"
                                step="0.01"
                                value={item.utilidad}
                                onChange={(e) => actualizarUtilidad(item.id, parseFloat(e.target.value) || 0)}
                                className="w-16 text-right text-xs h-7"
                              />
                              <span className="text-xs text-slate-500">%</span>
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-right text-xs font-medium text-green-600">
                            ${item.precioVenta.toFixed(2)}
                          </td>
                          <td className="border border-slate-300 px-2 py-2">
                            <Input
                              type="number"
                              min="1"
                              value={item.cantidad}
                              onChange={(e) => actualizarCantidad(item.id, parseInt(e.target.value) || 1)}
                              className="w-16 text-center text-xs h-7"
                            />
                          </td>
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="space-y-1">
                              {item.lotesExistentes && item.lotesExistentes.length > 0 && (
                                <div className="text-[10px] text-slate-600 mb-1">
                                  <div className="font-medium mb-0.5">Existentes:</div>
                                  {item.lotesExistentes.map((lote, idx) => (
                                    <div key={idx} className="text-slate-500">
                                      {lote.lote} ({lote.cantidad || 0})
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Input
                                placeholder="Nuevo lote"
                                value={item.lote}
                                onChange={(e) => actualizarLote(item.id, e.target.value)}
                                className="w-full text-[10px] h-7"
                              />
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2">
                            <div className="space-y-1">
                              {item.lotesExistentes && item.lotesExistentes.length > 0 && (
                                <div className="text-[10px] text-slate-600 mb-1">
                                  {item.lotesExistentes.map((lote, idx) => (
                                    <div key={idx} className="text-slate-500">
                                      {lote.fecha_vencimiento 
                                        ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-VE')
                                        : "-"
                                      }
                                    </div>
                                  ))}
                                </div>
                              )}
                              <Input
                                type="date"
                                value={item.fechaVencimiento}
                                onChange={(e) => actualizarFechaVencimiento(item.id, e.target.value)}
                                className="w-full text-[10px] h-7"
                              />
                            </div>
                          </td>
                          <td className="border border-slate-300 px-2 py-2 text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => eliminarItem(item.id)}
                              className="h-7 w-7 p-0"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Totales */}
            <Card className="p-3 bg-slate-50 flex-shrink-0">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <span className="text-slate-600 text-xs">Subtotal (sin IVA):</span>
                  <p className="text-base font-semibold">${subtotal.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-600 text-xs">Total IVA (16%):</span>
                  <p className="text-base font-semibold text-blue-600">${totalIva.toFixed(2)}</p>
                </div>
                <div>
                  <span className="text-slate-800 text-xs font-semibold">Total:</span>
                  <p className="text-lg font-bold text-green-600">${total.toFixed(2)}</p>
                </div>
              </div>
            </Card>

            {/* Botones de acción */}
            <div className="flex justify-end gap-2 flex-shrink-0 pt-2 border-t px-4 pb-3">
              <Button variant="outline" onClick={onClose} disabled={loading} size="sm">
                <X className="h-3 w-3 mr-1.5" />
                Cancelar
              </Button>
              <Button onClick={mostrarConfirmacion} disabled={loading || itemsCompra.length === 0} size="sm">
                Guardar Compra
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Confirmar Compra</h3>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-slate-600">Cantidad Total de Productos:</span>
                <span className="font-semibold">{cantidadTotalProductos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Items Diferentes:</span>
                <span className="font-semibold">{itemsCompra.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Subtotal (sin IVA):</span>
                <span className="font-semibold">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Total IVA (16%):</span>
                <span className="font-semibold text-blue-600">${totalIva.toFixed(2)}</span>
              </div>
              <div className="flex justify-between border-t pt-2">
                <span className="text-slate-800 font-semibold">Total:</span>
                <span className="font-bold text-green-600 text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowConfirmModal(false)} disabled={loading}>
                Cancelar
              </Button>
              <Button onClick={guardarCompra} disabled={loading}>
                {loading ? "Guardando..." : "Confirmar y Guardar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Compra Guardada con opción de imprimir */}
      {compraGuardada && (
        <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Compra Guardada Exitosamente</h3>
            <div className="space-y-2 mb-6 text-sm">
              <p><strong>Proveedor:</strong> {compraGuardada.proveedor?.nombre || "-"}</p>
              <p><strong>Items:</strong> {compraGuardada.items?.length || 0}</p>
              <p><strong>Total:</strong> ${(compraGuardada.totalPrecioVenta || compraGuardada.total || 0).toFixed(2)}</p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setCompraGuardada(null);
                setItemsCompra([]);
                setPagarEnDolarNegro(false);
                setBusquedaProducto("");
                setError(null);
                // Redirigir a cuentas por pagar
                if (window.location.pathname !== '/cuentas-por-pagar-compras') {
                  window.location.href = '/cuentas-por-pagar-compras';
                } else {
                  onSuccess();
                }
              }}>
                Cerrar
              </Button>
              <Button onClick={() => imprimirCompra(compraGuardada)}>
                Imprimir Compra
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Función para imprimir la compra
const imprimirCompra = (compraData: any) => {
  try {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    // Validar y normalizar datos
    if (!compraData) {
      console.error("compraData es undefined o null");
      return;
    }

    const items = Array.isArray(compraData.items) ? compraData.items : [];
    const proveedor = compraData.proveedor || { nombre: "-", rif: "-", telefono: "-" };

  // Función helper para convertir a número seguro
  const safeNumber = (value: any): number => {
    if (value === null || value === undefined) return 0;
    const num = Number(value);
    return isNaN(num) ? 0 : num;
  };

  // Pre-calcular todos los valores de items para evitar problemas en el template string
  // Asegurar que itemsProcessed siempre sea un array válido
  let itemsProcessed: any[] = [];
  try {
    itemsProcessed = (items && Array.isArray(items) ? items : []).map((item: any) => {
    try {
      const costo = safeNumber(item.costo || item.costo_unitario || 0);
      const costoAjustado = safeNumber(item.costoAjustado || item.costo_ajustado || 0);
      const utilidad = safeNumber(item.utilidad || 0);
      const precioVenta = safeNumber(item.precioVenta || item.precio_unitario || 0);
      const cantidad = safeNumber(item.cantidad || 0);
      const subtotalItem = safeNumber(precioVenta * cantidad);
      
      // Validar que todos los valores sean números válidos antes de usar toFixed
      const costoStr = isNaN(costo) ? "0.00" : costo.toFixed(2);
      const costoAjustadoStr = isNaN(costoAjustado) ? "0.00" : costoAjustado.toFixed(2);
      const utilidadStr = isNaN(utilidad) ? "0.00" : utilidad.toFixed(2);
      const precioVentaStr = isNaN(precioVenta) ? "0.00" : precioVenta.toFixed(2);
      const subtotalItemStr = isNaN(subtotalItem) ? "0.00" : subtotalItem.toFixed(2);
      
      let fechaVencimientoStr = "-";
      try {
        if (item.fechaVencimiento || item.fecha_vencimiento) {
          const fecha = new Date(item.fechaVencimiento || item.fecha_vencimiento);
          if (!isNaN(fecha.getTime())) {
            fechaVencimientoStr = fecha.toLocaleDateString('es-VE');
          }
        }
      } catch (e) {
        fechaVencimientoStr = "-";
      }
      
      return {
        codigo: String(item.codigo || "-"),
        descripcion: String(item.descripcion || item.nombre || "-"),
        marca: String(item.marca || "-"),
        cantidad: cantidad,
        costo: costoStr,
        costoAjustado: costoAjustadoStr,
        utilidad: utilidadStr,
        precioVenta: precioVentaStr,
        lote: String(item.lote || "-"),
        fechaVencimiento: fechaVencimientoStr,
        subtotalItem: subtotalItemStr
      };
    } catch (error) {
      console.error("Error procesando item:", item, error);
      return {
        codigo: "-",
        descripcion: "-",
        marca: "-",
        cantidad: 0,
        costo: "0.00",
        costoAjustado: "0.00",
        utilidad: "0.00",
        precioVenta: "0.00",
        lote: "-",
        fechaVencimiento: "-",
        subtotalItem: "0.00"
      };
    }
    }).filter((item: any) => item !== null && item !== undefined);
  } catch (error) {
    console.error("Error procesando items:", error);
    itemsProcessed = [];
  }

  const fecha = new Date().toLocaleDateString('es-VE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const hora = new Date().toLocaleTimeString('es-VE', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compra - ${proveedor.nombre || "-"}</title>
  <style>
    @media print {
      @page {
        margin: 1cm;
      }
      body {
        margin: 0;
        padding: 0;
      }
    }
    body {
      font-family: Arial, sans-serif;
      padding: 20px;
      max-width: 800px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
      margin-bottom: 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .info-section {
      margin-bottom: 20px;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .info-label {
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    .totals {
      margin-top: 20px;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
      font-size: 14px;
    }
    .total-final {
      font-size: 18px;
      font-weight: bold;
      margin-top: 10px;
    }
    .footer {
      margin-top: 30px;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>COMPRA DE MERCADERÍA</h1>
    <p>Fecha: ${fecha} - Hora: ${hora}</p>
  </div>

  <div class="info-section">
    <h2>Datos del Proveedor</h2>
    <div class="info-row">
      <span class="info-label">Nombre:</span>
      <span>${proveedor.nombre || "-"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">RIF:</span>
      <span>${proveedor.rif || "-"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Teléfono:</span>
      <span>${proveedor.telefono || "-"}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Días de Crédito:</span>
      <span>${proveedor.dias_credito || 0}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Desc. Comercial:</span>
      <span>${proveedor.descuento_comercial || 0}%</span>
    </div>
    <div class="info-row">
      <span class="info-label">Desc. Pronto Pago:</span>
      <span>${proveedor.descuento_pronto_pago || 0}%</span>
    </div>
  </div>

  ${compraData.pagarEnDolarNegro ? `
  <div class="info-section">
    <h2>Información de Cambio</h2>
    <div class="info-row">
      <span class="info-label">Dólar BCV:</span>
      <span>${safeNumber(compraData.dolarBcv).toFixed(2)} Bs</span>
    </div>
    <div class="info-row">
      <span class="info-label">Dólar Negro:</span>
      <span>${safeNumber(compraData.dolarNegro).toFixed(2)} Bs</span>
    </div>
    <div class="info-row">
      <span class="info-label">Pago en Dólar Negro:</span>
      <span>Sí</span>
    </div>
  </div>
  ` : ''}

  <h2>Items de la Compra</h2>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descripción</th>
        <th>Marca</th>
        <th>Cantidad</th>
        <th>Costo</th>
        ${compraData.pagarEnDolarNegro ? '<th>Costo Ajustado</th>' : ''}
        <th>Utilidad %</th>
        <th>Precio Venta</th>
        <th>Lote</th>
        <th>Vencimiento</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${(itemsProcessed && Array.isArray(itemsProcessed) && itemsProcessed.length > 0) ? itemsProcessed.filter((item: any) => item && typeof item === 'object').map((item: any) => {
        // Validar que item existe y tiene todas las propiedades necesarias
        try {
          if (!item || typeof item !== 'object') return '';
          const codigo = String(item.codigo || "-");
          const descripcion = String(item.descripcion || "-");
          const marca = String(item.marca || "-");
          const cantidad = Number(item.cantidad) || 0;
          const costo = String(item.costo || "0.00");
          const costoAjustado = String(item.costoAjustado || "0.00");
          const utilidad = String(item.utilidad || "0.00");
          const precioVenta = String(item.precioVenta || "0.00");
          const lote = String(item.lote || "-");
          const fechaVencimiento = String(item.fechaVencimiento || "-");
          const subtotalItem = String(item.subtotalItem || "0.00");
          
          return `
        <tr>
          <td>${codigo}</td>
          <td>${descripcion}</td>
          <td>${marca}</td>
          <td>${cantidad}</td>
          <td>$${costo}</td>
          ${compraData.pagarEnDolarNegro ? `<td>$${costoAjustado}</td>` : ''}
          <td>${utilidad}%</td>
          <td>$${precioVenta}</td>
          <td>${lote}</td>
          <td>${fechaVencimiento}</td>
          <td>$${subtotalItem}</td>
        </tr>
      `;
        } catch (e) {
          console.error("Error en map de itemsProcessed:", e, item);
          return '';
        }
      }).filter(Boolean).join('') : '<tr><td colspan="10" style="text-align: center;">No hay items</td></tr>'}
    </tbody>
  </table>

  <div class="totals">
    ${compraData.subtotal !== undefined && compraData.subtotal !== null ? `
    <div class="total-row">
      <span>Subtotal (sin IVA):</span>
      <span>$${safeNumber(compraData.subtotal).toFixed(2)}</span>
    </div>
    ` : ''}
    ${compraData.totalIva !== undefined && compraData.totalIva !== null ? `
    <div class="total-row">
      <span>Total IVA (16%):</span>
      <span>$${safeNumber(compraData.totalIva).toFixed(2)}</span>
    </div>
    ` : ''}
    ${compraData.totalCosto !== undefined && compraData.totalCosto !== null ? `
    <div class="total-row">
      <span>Total Costo:</span>
      <span>$${safeNumber(compraData.totalCosto).toFixed(2)}</span>
    </div>
    ` : ''}
    ${compraData.totalUtilidad !== undefined && compraData.totalUtilidad !== null ? `
    <div class="total-row">
      <span>Total Utilidad:</span>
      <span>$${safeNumber(compraData.totalUtilidad).toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="total-row total-final">
      <span>TOTAL:</span>
      <span>$${safeNumber(compraData.total || compraData.totalPrecioVenta || 0).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Documento generado el ${fecha} a las ${hora}</p>
  </div>
</body>
</html>
  `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  } catch (error) {
    console.error("Error al imprimir compra:", error);
    alert("Error al generar la impresión. Por favor, intente nuevamente.");
  }
};

export default ModalCrearCompra;

