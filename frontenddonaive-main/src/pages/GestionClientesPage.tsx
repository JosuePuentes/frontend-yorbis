import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Edit, Trash2, RefreshCw } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Cliente {
  _id?: string;
  id?: string;
  cedula: string;
  nombre: string;
  direccion?: string;
  telefono?: string;
  porcentaje_descuento?: number;
  total_compras?: number; // Total en USD que ha comprado
}

interface ItemComprado {
  producto_id?: string;
  nombre: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_usd: number;
  subtotal: number;
  subtotal_usd: number;
  fecha_venta?: string;
}

const GestionClientesPage: React.FC = () => {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [clienteSeleccionado, setClienteSeleccionado] = useState<Cliente | null>(null);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [clienteAEliminar, setClienteAEliminar] = useState<Cliente | null>(null);
  const [loadingDelete, setLoadingDelete] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [clienteVerProductos, setClienteVerProductos] = useState<Cliente | null>(null);
  const [itemsComprados, setItemsComprados] = useState<ItemComprado[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [totalComprasPorCliente, setTotalComprasPorCliente] = useState<Record<string, number>>({});

  // Formulario de edición
  const [cedulaEdit, setCedulaEdit] = useState("");
  const [nombreEdit, setNombreEdit] = useState("");
  const [direccionEdit, setDireccionEdit] = useState("");
  const [telefonoEdit, setTelefonoEdit] = useState("");
  const [porcentajeDescuentoEdit, setPorcentajeDescuentoEdit] = useState("");

  const fetchClientes = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${API_BASE_URL}/clientes`, { headers });
      if (!res.ok) {
        throw new Error("Error al obtener clientes");
      }
      const data = await res.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch (err: any) {
      setError(err.message || "Error al cargar clientes");
      setClientes([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientes();
  }, []);

  // Cargar totales de compras para cada cliente
  useEffect(() => {
    const cargarTotalesCompras = async () => {
      if (clientes.length === 0) return;

      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const nuevosTotales: Record<string, number> = {};

      await Promise.all(
        clientes.map(async (cliente) => {
          const clienteId = cliente._id || cliente.id;
          if (!clienteId) return;

          try {
            const res = await fetch(
              `${API_BASE_URL}/clientes/${clienteId}/compras/total`,
              { headers }
            );
            if (res.ok) {
              const data = await res.json();
              nuevosTotales[clienteId] = data.total_usd || 0;
            } else {
              nuevosTotales[clienteId] = 0;
            }
          } catch (err) {
            console.error(`Error al obtener total de compras para cliente ${clienteId}:`, err);
            nuevosTotales[clienteId] = 0;
          }
        })
      );

      setTotalComprasPorCliente(nuevosTotales);
    };

    if (clientes.length > 0) {
      cargarTotalesCompras();
    }
  }, [clientes]);

  const handleVerProductos = async (cliente: Cliente) => {
    setClienteVerProductos(cliente);
    setLoadingProductos(true);
    setItemsComprados([]);

    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const clienteId = cliente._id || cliente.id;
      const res = await fetch(
        `${API_BASE_URL}/clientes/${clienteId}/compras/items`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setItemsComprados(Array.isArray(data) ? data : []);
      } else {
        setItemsComprados([]);
      }
    } catch (err) {
      console.error("Error al obtener productos comprados:", err);
      setItemsComprados([]);
    } finally {
      setLoadingProductos(false);
    }
  };

  const handleEditarCliente = (cliente: Cliente) => {
    setClienteSeleccionado(cliente);
    setCedulaEdit(cliente.cedula || "");
    setNombreEdit(cliente.nombre || "");
    setDireccionEdit(cliente.direccion || "");
    setTelefonoEdit(cliente.telefono || "");
    setPorcentajeDescuentoEdit(cliente.porcentaje_descuento?.toString() || "0");
    setShowModalEditar(true);
  };

  const handleGuardarCliente = async () => {
    if (!clienteSeleccionado?._id && !clienteSeleccionado?.id) {
      alert("Error: No se pudo identificar el cliente");
      return;
    }

    if (!cedulaEdit.trim() || !nombreEdit.trim()) {
      alert("La cédula y el nombre son requeridos");
      return;
    }

    setGuardando(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const clienteId = clienteSeleccionado._id || clienteSeleccionado.id;
      const clienteData = {
        cedula: cedulaEdit.trim(),
        nombre: nombreEdit.trim(),
        direccion: direccionEdit.trim() || undefined,
        telefono: telefonoEdit.trim() || undefined,
        porcentaje_descuento: porcentajeDescuentoEdit ? parseFloat(porcentajeDescuentoEdit) : 0,
      };

      const res = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify(clienteData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al actualizar cliente" }));
        throw new Error(errorData.detail || "Error al actualizar cliente");
      }

      await fetchClientes();
      setShowModalEditar(false);
      setClienteSeleccionado(null);
      alert("Cliente actualizado exitosamente");
    } catch (err: any) {
      console.error("Error al actualizar cliente:", err);
      alert(err.message || "Error al actualizar cliente. Por favor, intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarCliente = (cliente: Cliente) => {
    setClienteAEliminar(cliente);
    setShowConfirmDelete(true);
  };

  const confirmarEliminacion = async () => {
    if (!clienteAEliminar?._id && !clienteAEliminar?.id) return;

    setLoadingDelete(true);
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = {};
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const clienteId = clienteAEliminar._id || clienteAEliminar.id;
      const res = await fetch(`${API_BASE_URL}/clientes/${clienteId}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al eliminar cliente" }));
        throw new Error(errorData.detail || "Error al eliminar cliente");
      }

      await fetchClientes();
      setShowConfirmDelete(false);
      setClienteAEliminar(null);
      alert("Cliente eliminado exitosamente");
    } catch (err: any) {
      console.error("Error al eliminar cliente:", err);
      alert(err.message || "Error al eliminar cliente. Por favor, intente nuevamente.");
    } finally {
      setLoadingDelete(false);
    }
  };

  const clientesFiltrados = clientes.filter((cliente) => {
    const busquedaLower = busqueda.toLowerCase();
    return (
      cliente.cedula?.toLowerCase().includes(busquedaLower) ||
      cliente.nombre?.toLowerCase().includes(busquedaLower) ||
      cliente.telefono?.toLowerCase().includes(busquedaLower) ||
      cliente.direccion?.toLowerCase().includes(busquedaLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">
              Gestión de Clientes
            </h1>
            <p className="text-gray-600">
              Administra clientes, información de contacto y descuentos
            </p>
          </div>
          {!loading && clientes.length > 0 && (
            <div className="text-sm text-gray-500">
              Total: <span className="font-semibold text-blue-600">{clientes.length}</span>{" "}
              {clientes.length === 1 ? "cliente" : "clientes"}
            </div>
          )}
        </div>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por cédula, nombre, teléfono o dirección..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={fetchClientes}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de clientes */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Cargando clientes...</div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">{error}</div>
      ) : clientesFiltrados.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-gray-500">
            {busqueda ? "No se encontraron clientes que coincidan con la búsqueda" : "No hay clientes registrados"}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cédula</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Dirección</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">% Descuento</TableHead>
                  <TableHead className="text-right">Total Compras</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientesFiltrados.map((cliente) => (
                  <TableRow key={cliente._id || cliente.id}>
                    <TableCell className="font-medium">{cliente.cedula}</TableCell>
                    <TableCell>{cliente.nombre}</TableCell>
                    <TableCell>{cliente.direccion || "-"}</TableCell>
                    <TableCell>{cliente.telefono || "-"}</TableCell>
                    <TableCell className="text-right">
                      {cliente.porcentaje_descuento ? (
                        <span className="text-green-600 font-semibold">
                          {cliente.porcentaje_descuento.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-gray-400">0%</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="font-semibold text-blue-600">
                        ${(totalComprasPorCliente[cliente._id || cliente.id || ""] || 0).toLocaleString("es-VE", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerProductos(cliente)}
                          className="flex items-center gap-1"
                        >
                          Productos
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditarCliente(cliente)}
                          className="flex items-center gap-1"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleEliminarCliente(cliente)}
                          className="flex items-center gap-1"
                        >
                          <Trash2 className="w-4 h-4" />
                          Eliminar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Modal de editar cliente */}
      <Dialog open={showModalEditar} onOpenChange={setShowModalEditar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Cédula *</label>
              <Input
                type="text"
                value={cedulaEdit}
                onChange={(e) => setCedulaEdit(e.target.value)}
                placeholder="Ingrese la cédula"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre *</label>
              <Input
                type="text"
                value={nombreEdit}
                onChange={(e) => setNombreEdit(e.target.value)}
                placeholder="Ingrese el nombre completo"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <Input
                type="text"
                value={direccionEdit}
                onChange={(e) => setDireccionEdit(e.target.value)}
                placeholder="Ingrese la dirección"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Número de Teléfono</label>
              <Input
                type="text"
                value={telefonoEdit}
                onChange={(e) => setTelefonoEdit(e.target.value)}
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
                value={porcentajeDescuentoEdit}
                onChange={(e) => setPorcentajeDescuentoEdit(e.target.value)}
                placeholder="0.00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ingrese el porcentaje de descuento que aplicará a este cliente (0-100)
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleGuardarCliente}
                className="flex-1"
                disabled={guardando || !cedulaEdit.trim() || !nombreEdit.trim()}
              >
                {guardando ? "Guardando..." : "Guardar Cambios"}
              </Button>
              <Button
                onClick={() => {
                  setShowModalEditar(false);
                  setClienteSeleccionado(null);
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

      {/* Modal de confirmación de eliminación */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              ¿Está seguro de que desea eliminar al cliente{" "}
              <strong>{clienteAEliminar?.nombre}</strong> (Cédula: {clienteAEliminar?.cedula})?
            </p>
            <p className="text-sm text-red-600">
              Esta acción no se puede deshacer.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={confirmarEliminacion}
                variant="destructive"
                className="flex-1"
                disabled={loadingDelete}
              >
                {loadingDelete ? "Eliminando..." : "Eliminar"}
              </Button>
              <Button
                onClick={() => {
                  setShowConfirmDelete(false);
                  setClienteAEliminar(null);
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

      {/* Modal de Productos Comprados */}
      <Dialog open={!!clienteVerProductos} onOpenChange={(open) => !open && setClienteVerProductos(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Productos Comprados - {clienteVerProductos?.nombre} (Cédula: {clienteVerProductos?.cedula})
            </DialogTitle>
          </DialogHeader>
          {loadingProductos ? (
            <div className="text-center py-8 text-gray-500">Cargando productos...</div>
          ) : itemsComprados.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Este cliente no ha realizado compras aún.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Producto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead className="text-right">Cantidad</TableHead>
                      <TableHead className="text-right">Precio Unit.</TableHead>
                      <TableHead className="text-right">Subtotal</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsComprados.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {item.fecha_venta
                            ? new Date(item.fecha_venta).toLocaleDateString("es-VE")
                            : "-"}
                        </TableCell>
                        <TableCell className="font-medium">{item.nombre}</TableCell>
                        <TableCell>{item.codigo || "-"}</TableCell>
                        <TableCell className="text-right">{item.cantidad}</TableCell>
                        <TableCell className="text-right">
                          ${item.precio_unitario_usd.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          ${item.subtotal_usd.toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${itemsComprados
                      .reduce((sum, item) => sum + item.subtotal_usd, 0)
                      .toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionClientesPage;

