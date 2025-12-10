import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plus, X, Loader2 } from "lucide-react";

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
}

interface CargarExistenciasModalProps {
  open: boolean;
  onClose: () => void;
  sucursalId: string;
  onSuccess?: () => void;
}

const CargarExistenciasModal: React.FC<CargarExistenciasModalProps> = ({
  open,
  onClose,
  sucursalId,
  onSuccess,
}) => {
  const [busqueda, setBusqueda] = useState("");
  const [productos, setProductos] = useState<Producto[]>([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState<Producto | null>(null);
  const [existenciaACargar, setExistenciaACargar] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Buscar productos cuando cambia la búsqueda
  useEffect(() => {
    if (!busqueda.trim() || busqueda.length < 2) {
      setProductos([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setBuscando(true);
      setError(null);
      
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          throw new Error("No se encontró el token de autenticación");
        }

        // Buscar en inventarios de la sucursal
        const res = await fetch(
          `${API_BASE_URL}/inventarios?farmacia=${sucursalId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!res.ok) {
          throw new Error("Error al buscar inventarios");
        }

        const inventarios = await res.json();
        const productosEncontrados: Producto[] = [];

        // Buscar en todos los inventarios activos
        for (const inventario of inventarios) {
          if (inventario.estado !== "activo") continue;

          // Obtener items del inventario
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
            
            // Filtrar items que coincidan con la búsqueda
            const itemsFiltrados = items.filter((item: any) => {
              const codigo = (item.codigo || "").toLowerCase();
              const descripcion = (item.descripcion || item.nombre || "").toLowerCase();
              const marca = (item.marca || "").toLowerCase();
              const busquedaLower = busqueda.toLowerCase();
              
              return codigo.includes(busquedaLower) || 
                     descripcion.includes(busquedaLower) || 
                     marca.includes(busquedaLower);
            });

            productosEncontrados.push(...itemsFiltrados.map((item: any) => ({
              _id: item._id || item.id,
              id: item._id || item.id,
              codigo: item.codigo || "",
              nombre: item.descripcion || item.nombre || "",
              descripcion: item.descripcion || item.nombre || "",
              marca: item.marca || "",
              existencia: item.cantidad || item.existencia || 0,
              cantidad: item.cantidad || item.existencia || 0,
            })));
          }
        }

        // Eliminar duplicados por código
        const productosUnicos = productosEncontrados.reduce((acc: Producto[], producto: Producto) => {
          const existe = acc.find(p => p.codigo === producto.codigo);
          if (!existe) {
            acc.push(producto);
          }
          return acc;
        }, []);

        setProductos(productosUnicos);
      } catch (err: any) {
        console.error("Error al buscar productos:", err);
        setError(err.message || "Error al buscar productos");
        setProductos([]);
      } finally {
        setBuscando(false);
      }
    }, 300); // Debounce de 300ms

    return () => clearTimeout(timeoutId);
  }, [busqueda, sucursalId]);

  const handleSeleccionarProducto = (producto: Producto) => {
    setProductoSeleccionado(producto);
    setExistenciaACargar("");
    setError(null);
  };

  const handleCargarExistencia = async () => {
    if (!productoSeleccionado) {
      setError("Por favor, selecciona un producto");
      return;
    }

    const existencia = parseFloat(existenciaACargar);
    if (isNaN(existencia) || existencia <= 0) {
      setError("Por favor, ingresa una cantidad válida mayor a 0");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) {
        throw new Error("No se encontró el token de autenticación");
      }

      // Buscar el inventario que contiene este producto
      const resInventarios = await fetch(
        `${API_BASE_URL}/inventarios?farmacia=${sucursalId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!resInventarios.ok) {
        throw new Error("Error al buscar inventarios");
      }

      const inventarios = await resInventarios.json();
      let inventarioEncontrado = null;
      let itemEncontrado = null;

      // Buscar el item en los inventarios
      for (const inventario of inventarios) {
        if (inventario.estado !== "activo") continue;

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
          const item = items.find((i: any) => 
            (i._id || i.id) === (productoSeleccionado._id || productoSeleccionado.id) ||
            i.codigo === productoSeleccionado.codigo
          );

          if (item) {
            inventarioEncontrado = inventario;
            itemEncontrado = item;
            break;
          }
        }
      }

      if (!inventarioEncontrado || !itemEncontrado) {
        throw new Error("No se encontró el producto en el inventario");
      }

      // Calcular nueva existencia
      const existenciaActual = itemEncontrado.cantidad || itemEncontrado.existencia || 0;
      const nuevaExistencia = existenciaActual + existencia;

      // Actualizar el item del inventario
      // Usar el nuevo endpoint sin ID de inventario (más simple)
      const itemId = itemEncontrado._id || itemEncontrado.id;
      const resUpdate = await fetch(
        `${API_BASE_URL}/inventarios/items/${itemId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            cantidad: nuevaExistencia,
            existencia: nuevaExistencia,
          }),
        }
      );

      if (!resUpdate.ok) {
        const errorData = await resUpdate.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Error al actualizar la existencia");
      }

      setSuccess(true);
      setProductoSeleccionado(null);
      setExistenciaACargar("");
      setBusqueda("");
      setProductos([]);

      // Llamar callback de éxito
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 500);
      }

      // Cerrar después de 2 segundos
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error al cargar existencia:", err);
      setError(err.message || "Error al cargar la existencia");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setProductoSeleccionado(null);
      setExistenciaACargar("");
      setBusqueda("");
      setProductos([]);
      setError(null);
      setSuccess(false);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cargar Existencias al Inventario</DialogTitle>
          <DialogDescription>
            Busca un producto y agrega la cantidad de existencia a cargar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Buscador */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar por código, descripción o marca..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
              disabled={loading}
            />
          </div>

          {/* Lista de productos encontrados */}
          {buscando && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span className="ml-2 text-sm text-gray-600">Buscando productos...</span>
            </div>
          )}

          {!buscando && busqueda.length >= 2 && productos.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No se encontraron productos
            </div>
          )}

          {!buscando && productos.length > 0 && (
            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <div className="p-2 bg-gray-50 border-b font-semibold text-sm">
                Productos encontrados ({productos.length})
              </div>
              <div className="divide-y">
                {productos.map((producto) => (
                  <button
                    key={producto._id || producto.id || producto.codigo}
                    onClick={() => handleSeleccionarProducto(producto)}
                    className={`w-full text-left p-3 hover:bg-blue-50 transition-colors ${
                      productoSeleccionado?._id === producto._id || 
                      productoSeleccionado?.id === producto.id
                        ? "bg-blue-100 border-l-4 border-blue-600"
                        : ""
                    }`}
                    disabled={loading}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="font-semibold text-sm">{producto.codigo}</div>
                        <div className="text-sm text-gray-700">{producto.descripcion || producto.nombre}</div>
                        {producto.marca && (
                          <div className="text-xs text-gray-500 mt-1">Marca: {producto.marca}</div>
                        )}
                        <div className="text-xs text-gray-600 mt-1">
                          Existencia actual: <span className="font-semibold">{producto.existencia || producto.cantidad || 0}</span>
                        </div>
                      </div>
                      {productoSeleccionado?._id === producto._id || 
                       productoSeleccionado?.id === producto.id ? (
                        <div className="text-blue-600">
                          <Plus className="w-5 h-5" />
                        </div>
                      ) : null}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Producto seleccionado y formulario */}
          {productoSeleccionado && (
            <div className="border rounded-lg p-4 bg-blue-50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <div className="font-semibold text-lg">{productoSeleccionado.codigo}</div>
                  <div className="text-sm text-gray-700">{productoSeleccionado.descripcion || productoSeleccionado.nombre}</div>
                  {productoSeleccionado.marca && (
                    <div className="text-xs text-gray-600 mt-1">Marca: {productoSeleccionado.marca}</div>
                  )}
                  <div className="text-sm text-gray-600 mt-2">
                    Existencia actual: <span className="font-bold text-blue-600">{productoSeleccionado.existencia || productoSeleccionado.cantidad || 0}</span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setProductoSeleccionado(null);
                    setExistenciaACargar("");
                  }}
                  disabled={loading}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium">
                  Cantidad a cargar <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  placeholder="Ingresa la cantidad"
                  value={existenciaACargar}
                  onChange={(e) => {
                    const valor = e.target.value;
                    if (valor === "" || (parseFloat(valor) > 0)) {
                      setExistenciaACargar(valor);
                    }
                  }}
                  min="0.01"
                  step="0.01"
                  disabled={loading}
                />
                {existenciaACargar && !isNaN(parseFloat(existenciaACargar)) && (
                  <div className="text-sm text-gray-600">
                    Nueva existencia: <span className="font-semibold text-green-600">
                      {(productoSeleccionado.existencia || productoSeleccionado.cantidad || 0) + parseFloat(existenciaACargar)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mensajes de error y éxito */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              Existencia cargada exitosamente
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleCargarExistencia}
              disabled={!productoSeleccionado || !existenciaACargar || loading || isNaN(parseFloat(existenciaACargar)) || parseFloat(existenciaACargar) <= 0}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Cargando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Cargar Existencia
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CargarExistenciasModal;

