import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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
  onSuccess?: () => void;
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

  // Buscar productos cuando cambia la búsqueda
  useEffect(() => {
    if (!busqueda.trim() || busqueda.length < 2) {
      setProductos([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setBuscando(true);
      try {
        const token = localStorage.getItem("access_token");
        if (!token) {
          setError("No se encontró el token de autenticación");
          return;
        }

        // Buscar productos en inventarios de la sucursal
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
        const productosEncontrados: Producto[] = [];

        // Buscar en todos los inventarios activos
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
            items.forEach((item: any) => {
              const codigo = item.codigo || "";
              const descripcion = item.descripcion || item.nombre || "";
              const busquedaLower = busqueda.toLowerCase();
              
              // Filtrar por código o descripción
              if (
                codigo.toLowerCase().includes(busquedaLower) ||
                descripcion.toLowerCase().includes(busquedaLower)
              ) {
                const productoId = item._id || item.id || item.item_id || codigo;
                // Evitar duplicados
                if (!productosEncontrados.find(p => (p._id || p.id) === productoId)) {
                  productosEncontrados.push({
                    _id: productoId,
                    id: productoId,
                    codigo: codigo,
                    nombre: descripcion,
                    descripcion: descripcion,
                    marca: item.marca || "",
                    existencia: item.cantidad || item.existencia || 0,
                    cantidad: item.cantidad || item.existencia || 0,
                    costo_unitario: item.costo_unitario || item.costo || 0,
                    costo: item.costo_unitario || item.costo || 0,
                    precio_unitario: item.precio_unitario || item.precio || 0,
                    precio: item.precio_unitario || item.precio || 0,
                  });
                }
              }
            });
          }
        }

        setProductos(productosEncontrados);
      } catch (err: any) {
        setError(err.message || "Error al buscar productos");
        setProductos([]);
      } finally {
        setBuscando(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
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

      // Actualizar productos en el estado local
      if (resultado.detalle?.exitosos) {
        resultado.detalle.exitosos.forEach((productoActualizado: any) => {
          setProductos((prevProductos) =>
            prevProductos.map((p) => {
              const productoId = p._id || p.id || p.codigo;
              if (productoId === productoActualizado.producto_id) {
                return {
                  ...p,
                  cantidad: productoActualizado.cantidad_nueva,
                  existencia: productoActualizado.cantidad_nueva,
                  costo_unitario: productoActualizado.costo || p.costo_unitario,
                  costo: productoActualizado.costo || p.costo,
                  precio_unitario: productoActualizado.precio_venta || p.precio_unitario,
                  precio: productoActualizado.precio_venta || p.precio,
                };
              }
              return p;
            })
          );
        });
      }

      setSuccess(
        `Carga masiva completada: ${resultado.detalle?.exitosos?.length || 0} productos actualizados`
      );

      // Llamar onSuccess para refrescar la lista principal
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
        }, 1000);
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

        {/* Búsqueda */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Buscar productos por código o descripción..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10"
          />
        </div>

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

