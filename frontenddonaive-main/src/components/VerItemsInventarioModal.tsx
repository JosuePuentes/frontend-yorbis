import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { X, RefreshCw, FileSpreadsheet, FileText } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Lote {
  lote: string;
  fecha_vencimiento: string;
  cantidad?: number;
}

interface ItemInventario {
  _id?: string;
  id?: string;
  codigo: string;
  descripcion: string;
  marca?: string;
  costo?: number;
  costo_unitario?: number; // Campo usado por el backend
  existencia?: number;
  cantidad?: number; // Campo usado por el backend
  precio?: number;
  precio_unitario?: number; // Campo usado por el backend
  porcentaje_ganancia?: number;
  utilidad_contable?: number;
  lotes?: Lote[]; // Array de lotes con fechas de vencimiento
  sucursal?: string;
  inventario_id?: string;
}

interface VerItemsInventarioModalProps {
  open: boolean;
  onClose: () => void;
  inventarioId: string;
  inventarioNombre?: string;
  refreshTrigger?: number; // Para forzar refresh cuando cambie
  porcentajeDescuento?: number; // Porcentaje de descuento a aplicar
}

const VerItemsInventarioModal: React.FC<VerItemsInventarioModalProps> = ({
  open,
  onClose,
  inventarioId,
  inventarioNombre,
  refreshTrigger,
  porcentajeDescuento = 0,
}) => {
  const [items, setItems] = useState<ItemInventario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      // Intentar obtener items del inventario
      // El endpoint puede ser: GET /inventarios/{inventario_id}/items
      // O: GET /productos?inventario_id={inventario_id}
      const res = await fetch(`${API_BASE_URL}/inventarios/${inventarioId}/items`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        // Si el endpoint no existe (404), intentar endpoints alternativos
        if (res.status === 404) {
          console.warn(`⚠️ [VerItemsInventarioModal] Endpoint /inventarios/${inventarioId}/items no encontrado, intentando alternativas...`);
          
          // Intentar con endpoint alternativo 1: productos filtrados por inventario
          try {
            const resAlt1 = await fetch(`${API_BASE_URL}/productos?inventario_id=${inventarioId}`, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (resAlt1.ok) {
              const data = await resAlt1.json();
              const itemsArray = Array.isArray(data) ? data : (data.productos || data.items || []);
              setItems(itemsArray);
              console.log(`✅ [VerItemsInventarioModal] Items obtenidos desde endpoint alternativo: ${itemsArray.length} items`);
              return;
            }
          } catch (err) {
            console.warn("⚠️ [VerItemsInventarioModal] Endpoint alternativo 1 falló:", err);
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
              const productos = Array.isArray(data) ? data : (data.productos || []);
              // Filtrar productos que pertenezcan a este inventario
              const itemsFiltrados = productos.filter((p: any) => 
                p.inventario_id === inventarioId || 
                p.inventario === inventarioId ||
                p.inventarioId === inventarioId
              );
              setItems(itemsFiltrados);
              console.log(`✅ [VerItemsInventarioModal] Items obtenidos desde endpoint alternativo 2: ${itemsFiltrados.length} items`);
              return;
            }
          } catch (err) {
            console.warn("⚠️ [VerItemsInventarioModal] Endpoint alternativo 2 falló:", err);
          }
          
          // Si ningún endpoint alternativo funciona, mostrar mensaje amigable
          setItems([]);
          setError("El endpoint para obtener items del inventario no está disponible. Por favor, contacte al administrador.");
          return;
        }
        
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || "Error al obtener items del inventario");
      }

      const data = await res.json();
      const itemsArray = Array.isArray(data) ? data : [];
      // Debug: ver la estructura del primer item
      if (itemsArray.length > 0) {
        console.log('[VerItemsInventarioModal] Estructura del primer item:', itemsArray[0]);
        console.log('[VerItemsInventarioModal] Campos disponibles:', Object.keys(itemsArray[0]));
      }
      setItems(itemsArray);
    } catch (err: any) {
      setError(err.message || "Error al cargar los items del inventario");
      console.error("Error al obtener items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && inventarioId) {
      fetchItems();
    } else if (!open) {
      setItems([]);
      setError(null);
    }
  }, [open, inventarioId, refreshTrigger]);

  const handleCerrar = () => {
    setItems([]);
    setError(null);
    onClose();
  };

  const handleExportarExcel = async () => {
    try {
      // Importar xlsx dinámicamente
      const XLSXModule = await import("xlsx");
      const XLSX = (XLSXModule.default || XLSXModule) as any;

      // Preparar datos para Excel
      // Si un item tiene múltiples lotes, crear una fila por cada lote
      const filasExcel: any[] = [];
      
      items.forEach(item => {
        const costo = item.costo_unitario || item.costo || 0;
        const precioOriginal = item.precio_unitario || item.precio || 0;
        const precio = porcentajeDescuento > 0 
          ? precioOriginal * (1 - porcentajeDescuento / 100)
          : precioOriginal;
        const cantidad = item.cantidad || item.existencia || 0;
        const utilidad = item.utilidad_contable ?? (precio - costo);
        const porcentajeGanancia = item.porcentaje_ganancia ?? ((precio - costo) / costo) * 100;
        
        if (item.lotes && item.lotes.length > 0) {
          // Si tiene lotes, crear una fila por cada lote
          item.lotes.forEach((lote) => {
            filasExcel.push([
              item.codigo || "",
              item.descripcion || "",
              item.marca || "",
              costo,
              precio,
              cantidad,
              lote.lote || "",
              lote.fecha_vencimiento ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-VE') : "",
              utilidad.toFixed(2),
              porcentajeGanancia.toFixed(2) + "%"
            ]);
          });
        } else {
          // Si no tiene lotes, crear una fila normal
          filasExcel.push([
            item.codigo || "",
            item.descripcion || "",
            item.marca || "",
            costo,
            precio,
            cantidad,
            "",
            "",
            utilidad.toFixed(2),
            porcentajeGanancia.toFixed(2) + "%"
          ]);
        }
      });
      
      const data = [
        ["Código", "Descripción", "Marca", "Costo", "Precio", "Existencia", "Lote", "Fecha Vencimiento", "Utilidad", "% Ganancia"],
        ...filasExcel,
        // Fila de totales
        [
          "TOTALES",
          "",
          "",
          items.reduce((sum, item) => {
            const costo = item.costo_unitario || item.costo || 0;
            const cantidad = item.cantidad || item.existencia || 0;
            return sum + (Number(costo) * Number(cantidad));
          }, 0),
          items.reduce((sum, item) => {
            const precioOriginal = item.precio_unitario || item.precio || 0;
            const precio = porcentajeDescuento > 0 
              ? precioOriginal * (1 - porcentajeDescuento / 100)
              : precioOriginal;
            const cantidad = item.cantidad || item.existencia || 0;
            return sum + (Number(precio) * Number(cantidad));
          }, 0),
          items.reduce((sum, item) => {
            const cantidad = item.cantidad || item.existencia || 0;
            return sum + Number(cantidad);
          }, 0),
          "",
          "",
          items.reduce((sum, item) => {
            const costo = item.costo_unitario || item.costo || 0;
            const precioOriginal = item.precio_unitario || item.precio || 0;
            const precio = porcentajeDescuento > 0 
              ? precioOriginal * (1 - porcentajeDescuento / 100)
              : precioOriginal;
            const cantidad = item.cantidad || item.existencia || 0;
            const utilidad = item.utilidad_contable ?? (precio - costo);
            return sum + (utilidad * Number(cantidad));
          }, 0),
          ""
        ]
      ];

      // Crear workbook
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Items Inventario");

      // Generar nombre de archivo
      const fecha = new Date().toISOString().split("T")[0].replace(/-/g, "");
      const nombreArchivo = `Inventario_${inventarioNombre || inventarioId}_${fecha}.xlsx`;

      // Descargar
      XLSX.writeFile(wb, nombreArchivo);
    } catch (err: any) {
      console.error("Error al exportar a Excel:", err);
      alert(`Error al exportar a Excel: ${err.message}`);
    }
  };

  const handleExportarPDF = () => {
    try {
      // Crear HTML para imprimir
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permite ventanas emergentes para exportar el PDF');
        return;
      }

      // Calcular totales usando los campos correctos del backend
      const totalCosto = items.reduce((sum, item) => {
        const costo = item.costo_unitario || item.costo || 0;
        const cantidad = item.cantidad || item.existencia || 0;
        return sum + (Number(costo) * Number(cantidad));
      }, 0);
      const totalPrecio = items.reduce((sum, item) => {
        const precioOriginal = item.precio_unitario || item.precio || 0;
        const precio = porcentajeDescuento > 0 
          ? precioOriginal * (1 - porcentajeDescuento / 100)
          : precioOriginal;
        const cantidad = item.cantidad || item.existencia || 0;
        return sum + (Number(precio) * Number(cantidad));
      }, 0);
      const totalExistencia = items.reduce((sum, item) => {
        const cantidad = item.cantidad || item.existencia || 0;
        return sum + Number(cantidad);
      }, 0);
      const totalUtilidad = items.reduce((sum, item) => {
        const costo = item.costo_unitario || item.costo || 0;
        const precioOriginal = item.precio_unitario || item.precio || 0;
        const precio = porcentajeDescuento > 0 
          ? precioOriginal * (1 - porcentajeDescuento / 100)
          : precioOriginal;
        const cantidad = item.cantidad || item.existencia || 0;
        const utilidad = item.utilidad_contable ?? (precio - costo);
        return sum + (utilidad * Number(cantidad));
      }, 0);

      // Procesar items con descuento aplicado para el PDF
      const itemsConDescuento = items.map(item => {
        const costo = item.costo_unitario || item.costo || 0;
        const precioOriginal = item.precio_unitario || item.precio || 0;
        const precio = porcentajeDescuento > 0 
          ? precioOriginal * (1 - porcentajeDescuento / 100)
          : precioOriginal;
        const utilidad = item.utilidad_contable ?? (precio - costo);
        const porcentajeGanancia = item.porcentaje_ganancia ?? ((precio - costo) / costo) * 100;
        return {
          ...item,
          precioCalculado: precio,
          utilidadCalculada: utilidad,
          porcentajeGananciaCalculado: porcentajeGanancia,
          precioOriginal: precioOriginal
        };
      });

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Inventario - ${inventarioNombre || inventarioId}</title>
            <style>
              @media print {
                @page {
                  margin: 1cm;
                  size: A4 landscape;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                font-family: Arial, sans-serif;
                font-size: 10px;
                padding: 20px;
              }
              h1 {
                font-size: 18px;
                margin-bottom: 5px;
                color: #1e293b;
              }
              .header-info {
                font-size: 9px;
                color: #64748b;
                margin-bottom: 15px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
              }
              th {
                background-color: #f1f5f9;
                color: #1e293b;
                font-weight: bold;
                padding: 8px 6px;
                text-align: left;
                border: 1px solid #cbd5e1;
                font-size: 9px;
              }
              td {
                padding: 6px;
                border: 1px solid #e2e8f0;
                font-size: 9px;
              }
              tr:nth-child(even) {
                background-color: #f8fafc;
              }
              .text-right {
                text-align: right;
              }
              .text-center {
                text-align: center;
              }
              .totals-row {
                background-color: #e2e8f0 !important;
                font-weight: bold;
                border-top: 2px solid #94a3b8;
              }
              .totals-row td {
                border-top: 2px solid #94a3b8;
              }
            </style>
          </head>
          <body>
            <h1>Inventario - ${inventarioNombre || inventarioId}</h1>
            <div class="header-info">
              <p><strong>Fecha de generación:</strong> ${new Date().toLocaleDateString('es-VE', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</p>
              <p><strong>Total de items:</strong> ${items.length} | <strong>Total existencias:</strong> ${totalExistencia.toLocaleString('es-VE')}</p>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Marca</th>
                  <th class="text-right">Costo</th>
                  <th class="text-right">Precio</th>
                  <th class="text-right">Existencia</th>
                  <th>Lote</th>
                  <th>Fecha Vencimiento</th>
                  <th class="text-right">Utilidad</th>
                  <th class="text-right">% Ganancia</th>
                </tr>
              </thead>
              <tbody>
                ${itemsConDescuento.map(item => {
                  const costo = item.costo_unitario || item.costo || 0;
                  const precio = item.precioCalculado;
                  const cantidad = item.cantidad || item.existencia || 0;
                  const utilidad = item.utilidadCalculada;
                  const porcentajeGanancia = item.porcentajeGananciaCalculado;
                  
                  // Si tiene lotes, crear una fila por cada lote
                  if (item.lotes && item.lotes.length > 0) {
                    return item.lotes.map((lote) => {
                      const fechaVenc = lote.fecha_vencimiento 
                        ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-VE')
                        : "-";
                      const hoy = new Date();
                      const fechaVencDate = lote.fecha_vencimiento 
                        ? new Date(lote.fecha_vencimiento)
                        : null;
                      const estaVencido = fechaVencDate && fechaVencDate < hoy;
                      const estaPorVencer = fechaVencDate && fechaVencDate >= hoy && fechaVencDate <= new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
                      const colorFecha = estaVencido ? "color: red; font-weight: bold;" : estaPorVencer ? "color: orange; font-weight: 500;" : "";
                      
                      return `
                        <tr>
                          <td>${item.codigo || "-"}</td>
                          <td>${item.descripcion || "-"}</td>
                          <td>${item.marca || "-"}</td>
                          <td class="text-right">$${Number(costo).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td class="text-right">$${Number(precio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td class="text-right">${Number(cantidad).toLocaleString('es-VE')}</td>
                          <td>${lote.lote || "-"}${lote.cantidad ? ` (${lote.cantidad})` : ""}</td>
                          <td style="${colorFecha}">${fechaVenc}</td>
                          <td class="text-right">$${utilidad.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td class="text-right">${porcentajeGanancia.toFixed(2)}%</td>
                        </tr>
                      `;
                    }).join('');
                  } else {
                    // Si no tiene lotes, crear una fila normal
                    return `
                      <tr>
                        <td>${item.codigo || "-"}</td>
                        <td>${item.descripcion || "-"}</td>
                        <td>${item.marca || "-"}</td>
                        <td class="text-right">${Number(costo).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</td>
                        <td class="text-right">${Number(precio).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</td>
                        <td class="text-right">${Number(cantidad).toLocaleString('es-VE')}</td>
                        <td>-</td>
                        <td>-</td>
                        <td class="text-right">${utilidad.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs</td>
                        <td class="text-right">${porcentajeGanancia.toFixed(2)}%</td>
                      </tr>
                    `;
                  }
                }).join('')}
                <tr class="totals-row">
                  <td colspan="3"><strong>TOTALES</strong></td>
                  <td class="text-right"><strong>$${totalCosto.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td class="text-right"><strong>$${totalPrecio.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td class="text-right"><strong>${totalExistencia.toLocaleString('es-VE')}</strong></td>
                  <td></td>
                  <td></td>
                  <td class="text-right"><strong>$${totalUtilidad.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                  <td></td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();
      
      // Esperar a que se cargue el contenido y luego imprimir
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 250);
      };
    } catch (err: any) {
      console.error("Error al exportar a PDF:", err);
      alert(`Error al exportar a PDF: ${err.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleCerrar()}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto" aria-describedby="ver-items-description">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            Items del Inventario {inventarioNombre && `- ${inventarioNombre}`}
            {porcentajeDescuento > 0 && (
              <span className="ml-2 text-sm font-normal text-green-600">
                (Descuento: {porcentajeDescuento.toFixed(2)}%)
              </span>
            )}
          </DialogTitle>
          <p id="ver-items-description" className="sr-only">
            Lista de items/productos del inventario seleccionado.
          </p>
        </DialogHeader>

        <div className="flex justify-between items-center mb-4">
          <div className="flex gap-4">
            <p className="text-sm text-slate-600">
              Total de items: <span className="font-semibold">{items.length}</span>
            </p>
            <p className="text-sm text-slate-600">
              Total existencias: <span className="font-semibold">
                {items.reduce((sum, item) => {
                  const cantidad = item.cantidad || item.existencia || 0;
                  return sum + Number(cantidad);
                }, 0).toLocaleString('es-VE')}
              </span>
            </p>
          </div>
          <div className="flex gap-2">
            {items.length > 0 && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarExcel}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  Excel
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportarPDF}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  PDF
                </Button>
              </>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchItems}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-8 text-slate-500">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
            Cargando items...
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <p>No hay items en este inventario</p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Código</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Descripción</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Marca</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Costo</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Precio</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Existencia</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Lote</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Fecha Vencimiento</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">Utilidad</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-700">% Ganancia</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {items.map((item, index) => {
                    // El backend usa costo_unitario y cantidad
                    const costo = item.costo_unitario || item.costo || 0;
                    const precioOriginal = item.precio_unitario || item.precio || 0;
                    // Aplicar descuento al precio
                    const precioConDescuento = porcentajeDescuento > 0 
                      ? precioOriginal * (1 - porcentajeDescuento / 100)
                      : precioOriginal;
                    const precio = precioConDescuento;
                    const cantidad = item.cantidad || item.existencia || 0;
                    const utilidad = item.utilidad_contable ?? (precio - costo);
                    const porcentajeGanancia = item.porcentaje_ganancia ?? ((precio - costo) / costo) * 100;
                    
                    return (
                      <tr key={item._id || item.id || index} className="hover:bg-slate-50">
                        <td className="px-4 py-3 font-medium text-slate-900">{item.codigo || "-"}</td>
                        <td className="px-4 py-3 text-slate-700">{item.descripcion || "-"}</td>
                        <td className="px-4 py-3 text-slate-600">{item.marca || "-"}</td>
                        <td className="px-4 py-3 text-right text-slate-700">
                          ${costo.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-slate-900">
                          <div className="flex flex-col items-end">
                            {porcentajeDescuento > 0 && precioOriginal !== precio && (
                              <span className="text-xs text-slate-400 line-through">
                                ${precioOriginal.toLocaleString("es-VE", {
                                  minimumFractionDigits: 2,
                                  maximumFractionDigits: 2,
                                })}
                              </span>
                            )}
                            <span className={porcentajeDescuento > 0 ? "text-green-600" : ""}>
                              ${precio.toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-700">{cantidad}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.lotes && item.lotes.length > 0 ? (
                            <div className="space-y-1">
                              {item.lotes.map((lote, loteIndex) => (
                                <div key={loteIndex} className="text-xs">
                                  {lote.lote || "-"}
                                  {lote.cantidad && ` (${lote.cantidad})`}
                                </div>
                              ))}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-700">
                          {item.lotes && item.lotes.length > 0 ? (
                            <div className="space-y-1">
                              {item.lotes.map((lote, loteIndex) => {
                                const fechaVenc = lote.fecha_vencimiento 
                                  ? new Date(lote.fecha_vencimiento).toLocaleDateString('es-VE')
                                  : "-";
                                const hoy = new Date();
                                const fechaVencDate = lote.fecha_vencimiento 
                                  ? new Date(lote.fecha_vencimiento)
                                  : null;
                                const estaVencido = fechaVencDate && fechaVencDate < hoy;
                                const estaPorVencer = fechaVencDate && fechaVencDate >= hoy && fechaVencDate <= new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
                                
                                return (
                                  <div 
                                    key={loteIndex} 
                                    className={`text-xs ${
                                      estaVencido 
                                        ? "text-red-600 font-semibold" 
                                        : estaPorVencer 
                                        ? "text-orange-600 font-medium" 
                                        : "text-slate-600"
                                    }`}
                                  >
                                    {fechaVenc}
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="px-4 py-3 text-right text-green-600 font-medium">
                          ${utilidad.toLocaleString("es-VE", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </td>
                        <td className="px-4 py-3 text-right text-blue-600 font-medium">
                          {porcentajeGanancia.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 font-semibold text-slate-900">
                      Totales
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${items.reduce((sum, item) => {
                        const costo = item.costo_unitario || item.costo || 0;
                        const cantidad = item.cantidad || item.existencia || 0;
                        return sum + (Number(costo) * Number(cantidad));
                      }, 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      ${items.reduce((sum, item) => {
                        const precioOriginal = item.precio_unitario || item.precio || 0;
                        const precio = porcentajeDescuento > 0 
                          ? precioOriginal * (1 - porcentajeDescuento / 100)
                          : precioOriginal;
                        const cantidad = item.cantidad || item.existencia || 0;
                        return sum + (Number(precio) * Number(cantidad));
                      }, 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {items.reduce((sum, item) => {
                        const cantidad = item.cantidad || item.existencia || 0;
                        return sum + Number(cantidad);
                      }, 0)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-green-600">
                      ${items.reduce((sum, item) => {
                        const costo = item.costo_unitario || item.costo || 0;
                        const precioOriginal = item.precio_unitario || item.precio || 0;
                        const precio = porcentajeDescuento > 0 
                          ? precioOriginal * (1 - porcentajeDescuento / 100)
                          : precioOriginal;
                        const cantidad = item.cantidad || item.existencia || 0;
                        const utilidad = item.utilidad_contable ?? (precio - costo);
                        return sum + (utilidad * Number(cantidad));
                      }, 0).toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td colSpan={2}></td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={handleCerrar}>
            <X className="h-4 w-4 mr-2" />
            Cerrar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VerItemsInventarioModal;

