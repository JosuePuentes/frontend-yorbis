import React, { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Calendar, Download, Filter } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ItemVenta {
  producto_id?: string;
  codigo?: string;
  nombre?: string;
  descripcion?: string;
  marca?: string;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_usd?: number;
  subtotal: number;
  subtotal_usd?: number;
}

interface Venta {
  _id: string;
  numero_factura?: string;
  fecha: string;
  items: ItemVenta[];
  cliente?: {
    _id?: string;
    nombre?: string;
    cedula?: string;
    correo?: string;
  };
  total_bs: number;
  total_usd: number;
  sucursal?: {
    id?: string;
    nombre?: string;
  };
  cajero?: string;
}

interface ProductoVendido {
  fecha: string;
  codigo: string;
  descripcion: string;
  marca: string;
  precio_venta: number;
  cantidad: number;
  subtotal: number;
  cliente?: string;
  numero_factura?: string;
}

const ResumenVentaDiariaPage: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fechaDesde, setFechaDesde] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [fechaHasta, setFechaHasta] = useState<string>(() => {
    const hoy = new Date();
    return hoy.toISOString().split('T')[0];
  });
  const [busqueda, setBusqueda] = useState("");
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>("");

  // Cargar sucursales del usuario
  useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(
          ([id, nombre]) => ({ id, nombre: String(nombre) })
        );
        setSucursales(farmaciasArr);
        if (farmaciasArr.length > 0) {
          setSucursalSeleccionada(farmaciasArr[0].id);
        }
      } catch {
        setSucursales([]);
      }
    }
  }, []);

  // Cargar ventas
  const cargarVentas = async () => {
    if (!sucursalSeleccionada) return;
    
    setLoading(true);
    setError(null);
    try {
      const url = `${API_BASE_URL}/punto-venta/ventas/usuario?sucursal=${sucursalSeleccionada}&limit=10000&fecha_inicio=${fechaDesde}&fecha_fin=${fechaHasta}`;
      console.log("🔍 [RESUMEN_VENTA] Cargando ventas:", url);
      
      const res = await fetchWithAuth(url);
      
      if (!res.ok) {
        throw new Error("Error al obtener ventas");
      }
      
      const data = await res.json();
      const ventasArray = Array.isArray(data) ? data : (data.facturas || data.ventas || data.data || []);
      
      console.log(`✅ [RESUMEN_VENTA] Ventas cargadas: ${ventasArray.length}`);
      setVentas(ventasArray);
    } catch (err: any) {
      console.error("❌ [RESUMEN_VENTA] Error al cargar ventas:", err);
      setError(err.message || "Error al cargar ventas");
      setVentas([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (sucursalSeleccionada) {
      cargarVentas();
    }
  }, [sucursalSeleccionada, fechaDesde, fechaHasta]);

  // Procesar productos vendidos desde las ventas
  const productosVendidos = useMemo(() => {
    const productos: ProductoVendido[] = [];
    
    ventas.forEach((venta) => {
      if (!venta.items || !Array.isArray(venta.items)) return;
      
      const fechaVenta = venta.fecha ? new Date(venta.fecha).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];
      const clienteNombre = venta.cliente?.nombre || "Sin cliente";
      
      venta.items.forEach((item) => {
        productos.push({
          fecha: fechaVenta,
          codigo: item.codigo || item.producto_id || "N/A",
          descripcion: item.descripcion || item.nombre || "Sin descripción",
          marca: item.marca || "Sin marca",
          precio_venta: item.precio_unitario || item.precio_unitario_usd || 0,
          cantidad: item.cantidad || 0,
          subtotal: item.subtotal || item.subtotal_usd || (item.precio_unitario || 0) * (item.cantidad || 0),
          cliente: clienteNombre,
          numero_factura: venta.numero_factura || venta._id
        });
      });
    });
    
    return productos;
  }, [ventas]);

  // Filtrar productos por búsqueda
  const productosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return productosVendidos;
    
    const busquedaLower = busqueda.toLowerCase().trim();
    return productosVendidos.filter((producto) => {
      const codigo = (producto.codigo || "").toLowerCase();
      const descripcion = (producto.descripcion || "").toLowerCase();
      const marca = (producto.marca || "").toLowerCase();
      const cliente = (producto.cliente || "").toLowerCase();
      
      return codigo.includes(busquedaLower) ||
             descripcion.includes(busquedaLower) ||
             marca.includes(busquedaLower) ||
             cliente.includes(busquedaLower);
    });
  }, [productosVendidos, busqueda]);

  // Calcular estadísticas
  const estadisticas = useMemo(() => {
    const productosUnicos = new Set<string>();
    const clientesUnicos = new Set<string>();
    let totalVendido = 0;
    let totalCantidad = 0;
    
    productosFiltrados.forEach((producto) => {
      const codigoKey = `${producto.codigo}_${producto.descripcion}`;
      productosUnicos.add(codigoKey);
      
      if (producto.cliente && producto.cliente !== "Sin cliente") {
        clientesUnicos.add(producto.cliente);
      }
      
      totalVendido += producto.subtotal;
      totalCantidad += producto.cantidad;
    });
    
    return {
      totalProductos: productosUnicos.size,
      totalClientes: clientesUnicos.size,
      totalVendido: totalVendido,
      totalCantidad: totalCantidad
    };
  }, [productosFiltrados]);

  // Filtrar por rango de fechas
  const productosFiltradosPorFecha = useMemo(() => {
    return productosFiltrados.filter((producto) => {
      const fechaProducto = producto.fecha;
      return fechaProducto >= fechaDesde && fechaProducto <= fechaHasta;
    });
  }, [productosFiltrados, fechaDesde, fechaHasta]);

  const handleExportarExcel = async () => {
    try {
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule.default || XLSXModule) as any;

      const data = [
        ["Fecha", "Código", "Descripción", "Marca", "Precio de Venta", "Cantidad", "Subtotal", "Cliente", "Número Factura"],
        ...productosFiltradosPorFecha.map(p => [
          p.fecha,
          p.codigo,
          p.descripcion,
          p.marca,
          p.precio_venta,
          p.cantidad,
          p.subtotal,
          p.cliente || "Sin cliente",
          p.numero_factura || ""
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Resumen Venta Diaria");

      const fecha = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const nombreArchivo = `Resumen_Venta_Diaria_${fecha}.xlsx`;
      XLSX.writeFile(wb, nombreArchivo);
    } catch (err: any) {
      alert(`Error al exportar: ${err.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800">📊 Resumen de Venta Diaria</h1>
          <Button
            onClick={handleExportarExcel}
            className="flex items-center gap-2"
            variant="outline"
          >
            <Download className="h-4 w-4" />
            Exportar a Excel
          </Button>
        </div>

        {/* Navbar con estadísticas */}
        <Card className="p-6 mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm font-medium opacity-90 mb-1">Total Productos Vendidos</div>
              <div className="text-3xl font-bold">{estadisticas.totalProductos}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm font-medium opacity-90 mb-1">Total de Clientes</div>
              <div className="text-3xl font-bold">{estadisticas.totalClientes}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
              <div className="text-sm font-medium opacity-90 mb-1">Total $ Vendidos</div>
              <div className="text-3xl font-bold">
                ${estadisticas.totalVendido.toLocaleString('es-VE', { 
                  minimumFractionDigits: 2, 
                  maximumFractionDigits: 2 
                })}
              </div>
            </div>
          </div>
        </Card>

        {/* Filtros */}
        <Card className="p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha Desde
              </label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Fecha Hasta
              </label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Sucursal
              </label>
              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {sucursales.map((suc) => (
                  <option key={suc.id} value={suc.id}>
                    {suc.nombre}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                <Search className="inline h-4 w-4 mr-1" />
                Buscar (Cliente/Producto)
              </label>
              <Input
                type="text"
                placeholder="Buscar por cliente, código, descripción o marca..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </Card>

        {/* Tabla de productos vendidos */}
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Marca
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Precio de Venta
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cantidad
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Factura
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        Cargando ventas...
                      </div>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-red-500">
                      {error}
                    </td>
                  </tr>
                ) : productosFiltradosPorFecha.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-8 text-center text-slate-500">
                      No hay productos vendidos en el rango de fechas seleccionado
                    </td>
                  </tr>
                ) : (
                  <>
                    {productosFiltradosPorFecha.map((producto, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900">
                          {producto.fecha}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                          {producto.codigo}
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-900">
                          {producto.descripcion}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {producto.marca}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                          ${producto.precio_venta.toLocaleString('es-VE', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                          {producto.cantidad}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-slate-900">
                          ${producto.subtotal.toLocaleString('es-VE', { 
                            minimumFractionDigits: 2, 
                            maximumFractionDigits: 2 
                          })}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {producto.cliente || "Sin cliente"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600">
                          {producto.numero_factura || "N/A"}
                        </td>
                      </tr>
                    ))}
                    {/* Fila de totales */}
                    <tr className="bg-slate-100 font-semibold">
                      <td colSpan={4} className="px-6 py-4 text-right text-sm text-slate-900">
                        TOTALES:
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                        {/* Total precio promedio */}
                        {productosFiltradosPorFecha.length > 0
                          ? `$${((estadisticas.totalVendido / estadisticas.totalCantidad) || 0).toLocaleString('es-VE', { 
                              minimumFractionDigits: 2, 
                              maximumFractionDigits: 2 
                            })}`
                          : "$0.00"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                        {estadisticas.totalCantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-slate-900">
                        ${estadisticas.totalVendido.toLocaleString('es-VE', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td colSpan={2}></td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
          {productosFiltradosPorFecha.length > 0 && (
            <div className="px-6 py-4 bg-slate-50 border-t text-sm text-slate-600">
              Mostrando {productosFiltradosPorFecha.length} producto(s) vendido(s)
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ResumenVentaDiariaPage;

