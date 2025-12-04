import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Producto {
  id: string;
  nombre: string;
  codigo?: string;
  precio: number;
  precio_usd?: number;
  stock?: number;
  cantidad?: number;
}

interface ItemCarrito {
  producto: Producto;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_usd: number;
  subtotal: number;
  subtotal_usd: number;
}

interface Banco {
  _id?: string;
  id?: string;
  numero_cuenta: string;
  nombre_banco: string;
  nombre_titular: string;
  saldo: number;
  divisa: "USD" | "BS";
  tipo_metodo?: "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "tarjeta_credito" | "vales";
  activo?: boolean;
}

interface MetodoPago {
  tipo: string;
  monto: number;
  divisa: "Bs" | "USD";
  banco_id?: string;
}

interface ModalDevolucionCompraProps {
  factura: any;
  onClose: () => void;
  onSuccess: () => void;
}

const ModalDevolucionCompra: React.FC<ModalDevolucionCompraProps> = ({
  factura,
  onClose,
  onSuccess,
}) => {
  const [busquedaItem, setBusquedaItem] = useState("");
  const [productosEncontrados, setProductosEncontrados] = useState<Producto[]>([]);
  const [carrito, setCarrito] = useState<ItemCarrito[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [cantidadInput, setCantidadInput] = useState("1");
  const [showCantidadModal, setShowCantidadModal] = useState(false);
  const [tasaDelDia, setTasaDelDia] = useState<number>(factura.tasa_dia || 0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [metodosPago, setMetodosPago] = useState<MetodoPago[]>([]);
  const [bancoSeleccionado, setBancoSeleccionado] = useState<string>("");
  const [montoPago, setMontoPago] = useState("");

  const sucursalId = factura.sucursal?._id || factura.sucursal;

  useEffect(() => {
    // Obtener tasa del día
    const obtenerTasa = async () => {
      try {
        const hoy = new Date().toISOString().split('T')[0];
        const res = await fetchWithAuth(`${API_BASE_URL}/punto-venta/tasa-del-dia?fecha=${hoy}`);
        if (res.ok) {
          const data = await res.json();
          setTasaDelDia(data.tasa || factura.tasa_dia || 0);
        }
      } catch (error) {
        console.error("Error al obtener tasa:", error);
      }
    };
    obtenerTasa();

    // Obtener bancos
    const obtenerBancos = async () => {
      try {
        const res = await fetchWithAuth(`${API_BASE_URL}/bancos`);
        if (res.ok) {
          const data = await res.json();
          const bancosActivos = (data.bancos || []).filter((b: Banco) => b.activo !== false);
          setBancos(bancosActivos);
        }
      } catch (error) {
        console.error("Error al obtener bancos:", error);
      }
    };
    obtenerBancos();
  }, []);

  // Buscar productos
  const buscarProductos = async (query: string) => {
    if (!query.trim() || !sucursalId) {
      setProductosEncontrados([]);
      return;
    }

    try {
      const res = await fetchWithAuth(
        `${API_BASE_URL}/punto-venta/productos/buscar?q=${encodeURIComponent(query)}&sucursal=${sucursalId}`
      );
      if (res.ok) {
        const data = await res.json();
        setProductosEncontrados(data.productos || []);
      }
    } catch (error) {
      console.error("Error al buscar productos:", error);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      buscarProductos(busquedaItem);
    }, 300);
    return () => clearTimeout(timer);
  }, [busquedaItem, sucursalId]);

  const handleSeleccionarProducto = (producto: Producto) => {
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

  const handleAgregarAlCarrito = () => {
    if (!productoSeleccionado || !cantidadInput || parseFloat(cantidadInput) <= 0) {
      return;
    }

    const cantidad = parseFloat(cantidadInput);
    const stockDisponible = productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0;
    
    const itemExistente = carrito.find(
      (item) => item.producto.id === productoSeleccionado.id
    );
    
    const cantidadTotal = itemExistente ? itemExistente.cantidad + cantidad : cantidad;
    
    if (cantidadTotal > stockDisponible) {
      alert(`No hay suficiente stock disponible. Stock disponible: ${stockDisponible}`);
      return;
    }

    const precioUsd = productoSeleccionado.precio_usd || productoSeleccionado.precio || 0;
    const precioBs = precioUsd * tasaDelDia;

    if (itemExistente) {
      setCarrito(
        carrito.map((item) =>
          item.producto.id === productoSeleccionado.id
            ? {
                ...item,
                cantidad: item.cantidad + cantidad,
                subtotal: (item.cantidad + cantidad) * precioBs,
                subtotal_usd: (item.cantidad + cantidad) * precioUsd,
              }
            : item
        )
      );
    } else {
      setCarrito([
        ...carrito,
        {
          producto: productoSeleccionado,
          cantidad,
          precio_unitario: precioBs,
          precio_unitario_usd: precioUsd,
          subtotal: cantidad * precioBs,
          subtotal_usd: cantidad * precioUsd,
        },
      ]);
    }

    setShowCantidadModal(false);
    setProductoSeleccionado(null);
    setCantidadInput("1");
  };

  const handleEliminarItem = (index: number) => {
    setCarrito(carrito.filter((_, i) => i !== index));
  };

  const calcularTotalNuevo = () => {
    return carrito.reduce((acc, item) => acc + item.subtotal_usd, 0);
  };

  const calcularDiferencia = () => {
    const totalOriginal = factura.total_usd || 0;
    const totalNuevo = calcularTotalNuevo();
    return totalNuevo - totalOriginal;
  };

  const calcularTotalPagadoUsd = () => {
    return metodosPago.reduce((total, metodo) => {
      if (metodo.divisa === "USD") {
        return total + metodo.monto;
      } else {
        // Convertir Bs a USD usando la tasa del día
        return total + (metodo.monto / tasaDelDia);
      }
    }, 0);
  };

  const handleAgregarMetodoPago = () => {
    if (!bancoSeleccionado) {
      alert("Seleccione un banco");
      return;
    }

    const monto = parseFloat(montoPago);
    if (isNaN(monto) || monto <= 0) {
      alert("Ingrese un monto válido");
      return;
    }

    const banco = bancos.find(b => (b._id || b.id) === bancoSeleccionado);
    if (!banco) {
      alert("Banco no encontrado");
      return;
    }

    const divisaParaMetodo = banco.divisa === "BS" ? "Bs" : banco.divisa;

    const nuevoMetodo: MetodoPago = {
      tipo: "banco",
      monto: monto,
      divisa: divisaParaMetodo as "Bs" | "USD",
      banco_id: bancoSeleccionado,
    };

    setMetodosPago([...metodosPago, nuevoMetodo]);
    setMontoPago("");
    setBancoSeleccionado("");
  };

  const getNombreMetodo = (tipo?: string) => {
    const nombres: Record<string, string> = {
      efectivo: "Efectivo",
      zelle: "Zelle",
      pago_movil: "Pago Móvil",
      tarjeta_debit: "Tarjeta Débito",
      tarjeta_credito: "Tarjeta Crédito",
      vales: "Vales",
    };
    return nombres[tipo || ""] || "Otro";
  };

  const handleConfirmarDevolucion = async () => {
    if (carrito.length === 0) {
      setError("Debe seleccionar al menos un producto para la nueva factura");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const diferencia = calcularDiferencia();
      const totalNuevo = calcularTotalNuevo();

      // Preparar items para la nueva factura
      const items = carrito.map((item) => ({
        producto_id: item.producto.id,
        nombre: item.producto.nombre,
        codigo: item.producto.codigo || "",
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        precio_unitario_usd: item.precio_unitario_usd,
        precio_unitario_original: item.precio_unitario,
        precio_unitario_original_usd: item.precio_unitario_usd,
        subtotal: item.subtotal,
        subtotal_usd: item.subtotal_usd,
        descuento_aplicado: 0,
      }));

      // Validar métodos de pago si hay diferencia positiva
      if (diferencia > 0.01) {
        const totalPagado = calcularTotalPagadoUsd();
        const diferenciaAbsoluta = Math.abs(diferencia - totalPagado);
        
        if (diferenciaAbsoluta > 0.01) {
          setError(`El total pagado ($${totalPagado.toFixed(2)} USD) no coincide con la diferencia a pagar ($${diferencia.toFixed(2)} USD)`);
          setLoading(false);
          return;
        }
      }

      // Preparar métodos de pago para enviar al backend
      const metodosPagoParaEnviar = diferencia > 0.01 ? metodosPago.map(mp => ({
        tipo: mp.tipo,
        monto: mp.monto,
        divisa: mp.divisa,
        banco_id: mp.banco_id,
      })) : [];

      // Llamar al endpoint de devolución
      const res = await fetchWithAuth(`${API_BASE_URL}/punto-venta/devolucion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          factura_id: factura._id,
          items_nuevos: items,
          metodos_pago: metodosPagoParaEnviar,
          diferencia_usd: diferencia,
          total_nuevo_usd: totalNuevo,
          total_original_usd: factura.total_usd || 0,
          sucursal: sucursalId,
          cliente: factura.cliente?._id || factura.cliente || "",
          cajero: factura.cajero || "",
          tasa_dia: tasaDelDia,
        }),
      });

      if (res.ok) {
        alert("Devolución procesada exitosamente");
        onSuccess();
      } else {
        const data = await res.json();
        setError(data.error || "Error al procesar la devolución");
      }
    } catch (error: any) {
      setError(error.message || "Error al procesar la devolución");
    } finally {
      setLoading(false);
    }
  };

  const diferencia = calcularDiferencia();
  const totalNuevo = calcularTotalNuevo();
  const totalOriginal = factura.total_usd || 0;

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Devolución de Compra</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
            {error}
          </div>
        )}

        {/* Información de la factura original */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-blue-800 mb-2">Factura Original</h3>
          <div className="text-sm space-y-1">
            <div>Factura: #{factura.numero_factura || factura._id}</div>
            <div>Fecha: {new Date(factura.fecha).toLocaleString('es-VE')}</div>
            {factura.cliente && (
              <div>Cliente: {factura.cliente.nombre}</div>
            )}
            <div className="font-semibold text-blue-900">
              Total Original: ${totalOriginal.toFixed(2)} USD
            </div>
          </div>
        </div>

        {/* Búsqueda de productos */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Buscar Producto</label>
          <Input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={busquedaItem}
            onChange={(e) => setBusquedaItem(e.target.value)}
            className="w-full"
          />
          {productosEncontrados.length > 0 && (
            <div className="mt-2 max-h-48 overflow-y-auto border rounded-lg">
              {productosEncontrados.map((producto) => {
                const stock = producto.cantidad ?? producto.stock ?? 0;
                return (
                  <button
                    key={producto.id}
                    onClick={() => handleSeleccionarProducto(producto)}
                    disabled={stock <= 0}
                    className={`w-full text-left p-3 hover:bg-blue-50 transition-colors border-b last:border-b-0 ${
                      stock <= 0 ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-semibold">{producto.nombre}</div>
                        <div className="text-sm text-gray-600">
                          Código: {producto.codigo || "N/A"}
                        </div>
                        <div className="text-sm text-gray-600">
                          Precio: ${(producto.precio_usd || producto.precio || 0).toFixed(2)} USD
                        </div>
                      </div>
                      <div className="text-sm font-semibold">
                        Stock: {stock}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Carrito */}
        <div className="mb-4">
          <h3 className="font-semibold mb-2">Productos Seleccionados</h3>
          {carrito.length === 0 ? (
            <div className="text-center py-4 text-gray-500 text-sm">
              No hay productos seleccionados
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {carrito.map((item, index) => (
                <div
                  key={index}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{item.producto.nombre}</div>
                    <div className="text-sm text-gray-600">
                      Cantidad: {item.cantidad} x ${item.precio_unitario_usd.toFixed(2)} USD
                    </div>
                    <div className="text-sm font-semibold">
                      Subtotal: ${item.subtotal_usd.toFixed(2)} USD
                    </div>
                  </div>
                  <Button
                    onClick={() => handleEliminarItem(index)}
                    variant="outline"
                    size="sm"
                    className="ml-2 text-red-600"
                  >
                    Eliminar
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Resumen de diferencias */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Resumen</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Total Factura Original:</span>
              <span className="font-semibold">${totalOriginal.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between">
              <span>Total Nueva Factura:</span>
              <span className="font-semibold">${totalNuevo.toFixed(2)} USD</span>
            </div>
            <div className="flex justify-between border-t pt-1 mt-1">
              <span className="font-semibold">
                {diferencia > 0.01
                  ? "Diferencia a Pagar:"
                  : diferencia < -0.01
                  ? "Vuelto a Devolver:"
                  : "Sin Diferencia:"}
              </span>
              <span
                className={`font-bold ${
                  diferencia > 0.01
                    ? "text-red-600"
                    : diferencia < -0.01
                    ? "text-green-600"
                    : "text-gray-600"
                }`}
              >
                ${Math.abs(diferencia).toFixed(2)} USD
              </span>
            </div>
            {diferencia > 0.01 && (
              <div className="text-xs text-yellow-700 mt-2">
                El cliente debe pagar la diferencia de ${diferencia.toFixed(2)} USD
              </div>
            )}
            {diferencia < -0.01 && (
              <div className="text-xs text-yellow-700 mt-2">
                Se debe devolver ${Math.abs(diferencia).toFixed(2)} USD al cliente
              </div>
            )}
          </div>
        </div>

        {/* Sección de métodos de pago (solo si hay diferencia positiva) */}
        {diferencia > 0.01 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-green-800 mb-3">Métodos de Pago para la Diferencia</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Seleccionar Banco *</label>
                <select
                  value={bancoSeleccionado}
                  onChange={(e) => setBancoSeleccionado(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Seleccione un banco</option>
                  {bancos.map((banco) => (
                    <option key={banco._id || banco.id} value={banco._id || banco.id}>
                      {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco} ({banco.divisa === "USD" ? "$" : "Bs"})
                    </option>
                  ))}
                </select>
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

              <Button onClick={handleAgregarMetodoPago} className="w-full" variant="outline">
                Agregar Método de Pago
              </Button>

              {metodosPago.length > 0 && (
                <div className="border-t pt-3 mt-3">
                  <h4 className="font-semibold mb-2 text-sm">Métodos de Pago Agregados:</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {metodosPago.map((metodo, index) => {
                      const banco = metodo.banco_id ? bancos.find(b => (b._id || b.id) === metodo.banco_id) : null;
                      const montoEnUsd = metodo.divisa === "USD" ? metodo.monto : metodo.monto / tasaDelDia;
                      return (
                        <div
                          key={index}
                          className="flex justify-between items-center p-2 bg-white rounded border"
                        >
                          <span className="text-sm">
                            {banco ? (
                              <>
                                {getNombreMetodo(banco.tipo_metodo)} - {banco.nombre_banco} ({metodo.divisa === "USD" ? "$" : "Bs"})
                                {metodo.divisa === "Bs" && ` ($${montoEnUsd.toFixed(2)} USD)`}
                              </>
                            ) : (
                              `${metodo.tipo.toUpperCase()} (${metodo.divisa})`
                            )}: {metodo.divisa === "USD" ? "$" : ""}
                            {metodo.monto.toLocaleString("es-VE", {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {metodo.divisa === "Bs" ? "Bs" : ""}
                          </span>
                          <Button
                            onClick={() => setMetodosPago(metodosPago.filter((_, i) => i !== index))}
                            variant="destructive"
                            size="sm"
                          >
                            Eliminar
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Total Pagado (USD):</span>
                      <span>${calcularTotalPagadoUsd().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Diferencia a Pagar:</span>
                      <span>${diferencia.toFixed(2)}</span>
                    </div>
                    {Math.abs(calcularTotalPagadoUsd() - diferencia) > 0.01 && (
                      <div className="text-xs text-red-600 mt-1">
                        ⚠️ El total pagado no coincide con la diferencia
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal de cantidad */}
        {showCantidadModal && productoSeleccionado && (
          <Dialog open={showCantidadModal} onOpenChange={setShowCantidadModal}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ingresar Cantidad</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Producto: {productoSeleccionado.nombre}
                  </label>
                  <label className="block text-sm font-medium mb-2">
                    Stock disponible: {productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0}
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max={productoSeleccionado.cantidad ?? productoSeleccionado.stock ?? 0}
                    value={cantidadInput}
                    onChange={(e) => setCantidadInput(e.target.value)}
                    placeholder="Cantidad"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAgregarAlCarrito} className="flex-1">
                    Agregar
                  </Button>
                  <Button
                    onClick={() => {
                      setShowCantidadModal(false);
                      setProductoSeleccionado(null);
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
        )}

        {/* Botones de acción */}
        <div className="flex gap-2">
          <Button
            onClick={handleConfirmarDevolucion}
            disabled={
              loading || 
              carrito.length === 0 || 
              (diferencia > 0.01 && (metodosPago.length === 0 || Math.abs(calcularTotalPagadoUsd() - diferencia) > 0.01))
            }
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
            {loading ? "Procesando..." : "Confirmar Devolución"}
          </Button>
          <Button onClick={onClose} variant="outline" className="flex-1" disabled={loading}>
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalDevolucionCompra;



