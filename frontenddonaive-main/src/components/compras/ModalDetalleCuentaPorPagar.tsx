import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, FileText, Download, Printer } from "lucide-react";
import UpFilePagosCPP from "@/components/upfile/UpFilePagosCPP";
import ImageDisplay from "@/components/upfile/ImageDisplay";
import { fetchWithAuth } from "@/lib/api";
import * as XLSX from "xlsx";

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

interface Pago {
  _id?: string;
  monto?: number;
  monto_bs?: number;
  monto_usd?: number;
  fecha_pago?: string;
  metodo_pago?: string;
  banco_id?: string;
  banco?: {
    nombre_banco?: string;
    divisa?: string;
  };
  referencia?: string;
  notas?: string;
  comprobante?: string;
  usuario_id?: string;
  fecha_creacion?: string;
}

interface Compra {
  _id: string;
  proveedor_id?: string; // Opcional para compatibilidad
  proveedorId?: string; // Alternativa del backend
  proveedor?: Proveedor;
  fecha: string;
  pagar_en_dolar_negro: boolean;
  dolar_bcv: number;
  dolar_negro: number;
  total_costo: number;
  total_precio_venta: number;
  total?: number; // Total de la compra (puede venir del backend)
  items?: any[]; // Items de la compra
  productos?: any[]; // Productos de la compra (alternativa a items)
  estado?: "sin_pago" | "abonado" | "pagada";
  monto_abonado?: number;
  monto_restante?: number;
  pagos?: Pago[];
  dias_credito?: number;
  dias_restantes?: number;
  en_mora?: boolean;
  fecha_vencimiento?: Date | null;
  proveedor_nombre?: string; // Para fallback
  proveedorNombre?: string; // Alternativa del backend
  sucursal_id?: string;
  fecha_compra?: string;
  fecha_creacion?: string;
}

interface Banco {
  _id?: string;
  id?: string;
  nombre_banco: string;
  divisa: "USD" | "BS";
  tipo_metodo?: string;
  activo?: boolean;
  saldo?: number;
}

interface ModalDetalleCuentaPorPagarProps {
  open: boolean;
  onClose: () => void;
  compra: Compra;
  onPagoCompletado: () => void;
}

const ModalDetalleCuentaPorPagar: React.FC<ModalDetalleCuentaPorPagarProps> = ({
  open,
  onClose,
  compra,
  onPagoCompletado,
}) => {
  // Estado para proveedores (cargar si no viene poblado)
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  
  // Cargar proveedores si no vienen poblados
  useEffect(() => {
    const fetchProveedores = async () => {
      if (!compra.proveedor && (compra.proveedor_id || compra.proveedorId)) {
        try {
          const token = localStorage.getItem("access_token");
          if (!token) return;
          
          const res = await fetch(`${API_BASE_URL}/proveedores`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (res.ok) {
            const data = await res.json();
            let proveedoresData: any[] = [];
            if (Array.isArray(data)) {
              proveedoresData = data;
            } else if (data && Array.isArray(data.proveedores)) {
              proveedoresData = data.proveedores;
            } else if (data && data.proveedor) {
              proveedoresData = Array.isArray(data.proveedor) ? data.proveedor : [data.proveedor];
            }
            
            const proveedoresNormalizados = proveedoresData.map((p: any) => ({
              _id: p._id || p.id,
              nombre: p.nombre || "Sin nombre",
              rif: p.rif || "",
              telefono: p.telefono || "",
              dias_credito: p.dias_credito !== undefined && p.dias_credito !== null ? Number(p.dias_credito) : 0,
              descuento_comercial: p.descuento_comercial !== undefined && p.descuento_comercial !== null ? Number(p.descuento_comercial) : 0,
              descuento_pronto_pago: p.descuento_pronto_pago !== undefined && p.descuento_pronto_pago !== null ? Number(p.descuento_pronto_pago) : 0,
            }));
            
            setProveedores(proveedoresNormalizados);
            console.log(`✅ [MODAL] Proveedores cargados: ${proveedoresNormalizados.length}`);
          }
        } catch (err) {
          console.error("Error al cargar proveedores en modal:", err);
        }
      }
    };
    
    if (open) {
      fetchProveedores();
    }
  }, [open, compra.proveedor, compra.proveedor_id, compra.proveedorId]);

  // Normalizar compra para asegurar que items y pagos sean arrays, y proveedor esté poblado
  const compraNormalizada = React.useMemo(() => {
    let proveedorFinal = compra.proveedor;
    
    // Si no viene poblado, buscar en la lista de proveedores cargados
    if (!proveedorFinal && (compra.proveedor_id || compra.proveedorId) && proveedores.length > 0) {
      const proveedorId = compra.proveedor_id || compra.proveedorId || "";
      const proveedorEncontrado = proveedores.find((p: Proveedor) => {
        const idProveedor = String(p._id || "");
        const idCompra = String(proveedorId || "");
        return p._id === proveedorId || 
               idProveedor === idCompra || 
               idProveedor.toLowerCase() === idCompra.toLowerCase() ||
               p._id?.toString() === proveedorId?.toString();
      });
      
      if (proveedorEncontrado) {
        proveedorFinal = proveedorEncontrado;
        console.log(`✅ [MODAL] Proveedor encontrado: ${proveedorEncontrado.nombre}, días crédito: ${proveedorEncontrado.dias_credito}`);
      } else {
        console.warn(`⚠️ [MODAL] Proveedor no encontrado, ID: ${proveedorId}`);
        proveedorFinal = {
          _id: proveedorId,
          nombre: compra.proveedor_nombre || compra.proveedorNombre || "Proveedor no encontrado",
          rif: "",
          telefono: "",
          dias_credito: compra.dias_credito || 0,
          descuento_comercial: 0,
          descuento_pronto_pago: 0
        };
      }
    }
    
    return {
      ...compra,
      proveedor: proveedorFinal,
      items: compra.items && Array.isArray(compra.items) ? compra.items : (compra.productos && Array.isArray(compra.productos) ? compra.productos : []),
      pagos: compra.pagos && Array.isArray(compra.pagos) ? compra.pagos : [],
    };
  }, [compra, proveedores]);

  // Log para diagnosticar
  useEffect(() => {
    if (open) {
      console.log("🔍 [MODAL] Compra recibida:", compraNormalizada);
      console.log("🔍 [MODAL] Proveedor:", compraNormalizada.proveedor);
      console.log("🔍 [MODAL] Fecha:", compraNormalizada.fecha);
      console.log("🔍 [MODAL] Proveedor ID:", compraNormalizada.proveedor_id);
      console.log("🔍 [MODAL] Items:", compraNormalizada.items);
      console.log("🔍 [MODAL] Pagos:", compraNormalizada.pagos);
      if (compraNormalizada.pagos && compraNormalizada.pagos.length > 0) {
        compraNormalizada.pagos.forEach((pago: Pago, idx: number) => {
          console.log(`  💵 [PAGO ${idx + 1}]`, {
            _id: pago._id,
            monto: pago.monto,
            comprobante: pago.comprobante,
            tiene_comprobante: !!pago.comprobante
          });
        });
      } else {
        console.log("⚠️ [MODAL] No hay pagos en la compra");
      }
    }
  }, [open, compra]);
  const [mostrarPago, setMostrarPago] = useState(false);
  const [mostrarPreliminar, setMostrarPreliminar] = useState(false);
  const [tasaBcv, setTasaBcv] = useState<number>(compra.dolar_bcv || 0);
  const [montoBs, setMontoBs] = useState<number>(0);
  const [montoPagar, setMontoPagar] = useState<string>("");
  const [divisaPago, setDivisaPago] = useState<"USD" | "Bs">("USD");
  const [bancoSeleccionado, setBancoSeleccionado] = useState<string>("");
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [referencia, setReferencia] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [comprobanteArchivo, setComprobanteArchivo] = useState<string | null>(null);
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Función para cargar bancos
  const fetchBancos = async () => {
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos`);
      if (res.ok) {
        const data = await res.json();
        const bancosActivos = (data.bancos || data || []).filter((b: Banco) => b.activo !== false);
        setBancos(bancosActivos);
        console.log("🏦 [BANCOS] Bancos cargados:", bancosActivos.length);
      }
    } catch (err) {
      console.error("Error al cargar bancos:", err);
    }
  };
  
  // Cargar bancos al abrir el modal (si no están cargados)
  useEffect(() => {
    if (open && bancos.length === 0) {
      fetchBancos();
    }
  }, [open]);

  // Calcular descuento por pronto pago
  const calcularDescuentoProntoPago = () => {
    const descuentoProntoPago = compra.proveedor?.descuento_pronto_pago || 0;
    // Los días de pronto pago son días desde la compra (ej: 15 días)
    // Por ahora usamos un valor fijo de 15 días, pero podría venir del proveedor
    const diasProntoPago = 15; // Días desde la compra para aplicar descuento
    
    if (descuentoProntoPago > 0 && compra.fecha) {
      const fechaCompra = new Date(compra.fecha);
      if (!isNaN(fechaCompra.getTime())) {
        // Fecha límite para pronto pago: fecha compra + días de pronto pago
        const fechaLimiteProntoPago = new Date(fechaCompra);
        fechaLimiteProntoPago.setDate(fechaLimiteProntoPago.getDate() + diasProntoPago);
        
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaLimiteProntoPago.setHours(0, 0, 0, 0);
        
        // Si estamos antes o en la fecha límite, aplicar descuento
        if (hoy <= fechaLimiteProntoPago) {
          const totalFactura = compra.total_precio_venta || compra.total || 0;
          const descuento = (totalFactura * descuentoProntoPago) / 100;
          return {
            aplica: true,
            porcentaje: descuentoProntoPago,
            montoDescuento: descuento,
            totalConDescuento: totalFactura - descuento,
            fechaLimite: fechaLimiteProntoPago
          };
        }
      }
    }
    return {
      aplica: false,
      porcentaje: 0,
      montoDescuento: 0,
      totalConDescuento: compra.total_precio_venta || compra.total || 0,
      fechaLimite: null
    };
  };

  const descuentoProntoPago = calcularDescuentoProntoPago();
  const totalFacturaConDescuento = descuentoProntoPago.totalConDescuento;
  
  // Calcular total abonado sumando todos los pagos
  const totalAbonado = compraNormalizada.pagos?.reduce((sum: number, pago: Pago) => {
    return sum + Number(pago.monto || pago.monto_usd || pago.monto_bs || 0);
  }, 0) || (compra.monto_abonado || 0);
  
  // Calcular monto restante: total factura con descuento - total abonado
  const montoRestanteConDescuento = totalFacturaConDescuento - totalAbonado;

  // Calcular monto en Bs según tasa BCV
  useEffect(() => {
    if (!compra.pagar_en_dolar_negro && tasaBcv > 0) {
      const montoCalculado = totalFacturaConDescuento * tasaBcv;
      setMontoBs(montoCalculado);
    } else {
      setMontoBs(0);
    }
  }, [tasaBcv, totalFacturaConDescuento, compra.pagar_en_dolar_negro]);

  // Cargar bancos al abrir el modal (ya está definido arriba, solo llamarlo)
  useEffect(() => {
    if (open) {
      fetchBancos();
    }
  }, [open]);

  // Obtener tasa del día
  useEffect(() => {
    if (open && !compra.pagar_en_dolar_negro) {
      const obtenerTasa = async () => {
        try {
          const hoy = new Date().toISOString().split('T')[0];
          const res = await fetchWithAuth(`${API_BASE_URL}/punto-venta/tasa-del-dia?fecha=${hoy}`);
          if (res.ok) {
            const data = await res.json();
            setTasaBcv(data.tasa || compra.dolar_bcv || 0);
          }
        } catch (err) {
          console.error("Error al obtener tasa:", err);
        }
      };
      obtenerTasa();
    }
  }, [open, compra.pagar_en_dolar_negro, compra.dolar_bcv]);

  const handlePagar = () => {
    setMostrarPago(true);
  };

  const handleConfirmarPago = async () => {
    if (!montoPagar || parseFloat(montoPagar) <= 0) {
      setError("Debe ingresar un monto válido");
      return;
    }

    if (!bancoSeleccionado) {
      setError("Debe seleccionar un banco");
      return;
    }

    if (!metodoPago) {
      setError("Debe seleccionar un método de pago");
      return;
    }

    setError(null);
    setMostrarPreliminar(true);
  };

  const handleGuardarPago = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const montoPagarNum = parseFloat(montoPagar);
      
      // Formatear fecha como YYYY-MM-DD
      const fechaPago = new Date().toISOString().split('T')[0];

      const pagoData = {
        monto: montoPagarNum,
        fecha_pago: fechaPago,
        metodo_pago: metodoPago,
        banco_id: bancoSeleccionado,
        referencia: referencia || "",
        notas: notas || "",
        comprobante: comprobanteArchivo || undefined, // Agregar comprobante si existe
      };

      const res = await fetchWithAuth(`${API_BASE_URL}/compras/${compra._id}/pagos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(pagoData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || errorData?.message || "Error al guardar pago");
      }

      // Limpiar formulario
      setMostrarPreliminar(false);
      setMostrarPago(false);
      setMontoPagar("");
      setReferencia("");
      setNotas("");
      setComprobanteArchivo(null);
      setBancoSeleccionado("");
      setMetodoPago("");
      
      // Recargar compras para actualizar montos y estado
      // Agregar un pequeño delay para asegurar que el backend haya procesado el pago
      console.log("✅ [PAGO] Pago guardado exitosamente, esperando 500ms antes de recargar compras...");
      setTimeout(() => {
        console.log("🔄 [PAGO] Recargando compras...");
        onPagoCompletado();
      }, 500);
    } catch (err: any) {
      setError(err.message || "Error al guardar pago");
      console.error("Error al guardar pago:", err);
    } finally {
      setLoading(false);
    }
  };

  const imprimirCompra = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const html = generarHTMLImpresion();
    
    printWindow.document.write(html);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const exportarPDF = () => {
    imprimirCompra(); // Por ahora usamos la misma función de impresión
  };

  const exportarExcel = () => {
    const datos = [
      ["COMPRA DE MERCADERÍA"],
      ["Fecha:", new Date(compra.fecha).toLocaleDateString('es-VE')],
      [""],
      ["DATOS DEL PROVEEDOR"],
      ["Nombre:", compra.proveedor?.nombre || ""],
      ["RIF:", compra.proveedor?.rif || ""],
      ["Teléfono:", compra.proveedor?.telefono || ""],
      ["Días de Crédito:", compra.proveedor?.dias_credito || 0],
      [""],
      ["ITEMS"],
      ["Código", "Descripción", "Marca", "Cantidad", "Costo", "Utilidad %", "Precio Unitario", "Total Item"],
      ...(compraNormalizada.items || []).map((item: any) => [
        item.codigo,
        item.descripcion,
        item.marca || "",
        item.cantidad,
        item.costo,
        item.utilidad,
        item.precio_venta,
        item.precio_venta * item.cantidad,
      ]),
      [""],
      ["Total Costo:", compra.total_costo],
      ["Total Factura:", compra.total_precio_venta || compra.total || 0],
    ];

    const ws = XLSX.utils.aoa_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Compra");
    XLSX.writeFile(wb, `Compra_${compra._id.slice(-8)}.xlsx`);
  };

  const generarHTMLImpresion = () => {
    const fecha = new Date(compra.fecha).toLocaleDateString('es-VE');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compra - ${compra.proveedor?.nombre}</title>
  <style>
    @media print {
      @page { margin: 1cm; }
      body { margin: 0; padding: 0; }
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
    .info-section { margin-bottom: 20px; }
    .info-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
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
    th { background-color: #f2f2f2; font-weight: bold; }
    .totals {
      margin-top: 20px;
      border-top: 2px solid #000;
      padding-top: 10px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 5px;
    }
    .total-final {
      font-size: 18px;
      font-weight: bold;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>COMPRA DE MERCADERÍA</h1>
    <p>Fecha: ${fecha}</p>
  </div>
  <div class="info-section">
    <h2>Datos del Proveedor</h2>
    <div class="info-row">
      <span><strong>Nombre:</strong></span>
      <span>${compra.proveedor?.nombre || ""}</span>
    </div>
    <div class="info-row">
      <span><strong>RIF:</strong></span>
      <span>${compra.proveedor?.rif || ""}</span>
    </div>
    <div class="info-row">
      <span><strong>Teléfono:</strong></span>
      <span>${compra.proveedor?.telefono || ""}</span>
    </div>
    <div class="info-row">
      <span><strong>Días de Crédito:</strong></span>
      <span>${compra.proveedor?.dias_credito || 0}</span>
    </div>
  </div>
  <h2>Items de la Compra</h2>
  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Descripción</th>
        <th>Cantidad</th>
      </tr>
    </thead>
    <tbody>
      ${(compraNormalizada.items || []).map((item: any) => `
        <tr>
          <td>${item.codigo}</td>
          <td>${item.descripcion || "-"}</td>
          <td>${item.cantidad || 0}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  <div class="totals">
    <div class="total-row">
      <span>Total:</span>
      <span>$${(compra.total_precio_venta || compra.total || 0).toFixed(2)}</span>
    </div>
  </div>
</body>
</html>
    `;
  };

  const getEstadoBadge = () => {
    if (compra.estado === "pagada") {
      return <Badge className="bg-green-500">Pagada</Badge>;
    }
    if (compra.en_mora) {
      return <Badge className="bg-red-600">En Mora</Badge>;
    }
    if (compra.estado === "abonado") {
      return <Badge className="bg-yellow-500">Abonado</Badge>;
    }
    return <Badge className="bg-red-500">Sin Pago</Badge>;
  };

  if (!open) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-slate-800">
              Detalle de Cuenta por Pagar
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Información de la Compra */}
          <Card className="p-4 mb-4">
            {descuentoProntoPago.aplica && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-semibold text-green-800 mb-1">
                  💰 Ahorra ${descuentoProntoPago.montoDescuento.toFixed(2)} si aprovechas el pronto pago
                </div>
                <div className="text-xs text-green-700">
                  Descuento del {descuentoProntoPago.porcentaje}% aplicado. Válido hasta {descuentoProntoPago.fechaLimite?.toLocaleDateString('es-VE')}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-slate-600">N° Compra</div>
                <div className="font-semibold">{compra._id.slice(-8)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Estado</div>
                <div>{getEstadoBadge()}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Proveedor</div>
                <div className="font-semibold">
                  {compra.proveedor?.nombre || compra.proveedor_id || "Proveedor no encontrado"}
                </div>
                {compra.proveedor_id && !compra.proveedor && (
                  <div className="text-xs text-red-500 mt-1">
                    ID: {compra.proveedor_id}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600">Fecha</div>
                <div>
                  {compra.fecha 
                    ? (() => {
                        try {
                          const fecha = new Date(compra.fecha);
                          if (!isNaN(fecha.getTime())) {
                            return fecha.toLocaleDateString('es-VE', { 
                              year: 'numeric', 
                              month: '2-digit', 
                              day: '2-digit' 
                            });
                          }
                        } catch (e) {
                          console.error("Error parseando fecha:", e);
                        }
                        return String(compra.fecha);
                      })()
                    : "N/A"}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Días de Crédito</div>
                <div>{compra.proveedor?.dias_credito || 0} días</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Días Restantes</div>
                <div className={compra.dias_restantes !== undefined && compra.dias_restantes < 0 ? "text-red-600 font-semibold" : ""}>
                  {compra.dias_restantes !== undefined ? `${compra.dias_restantes} días` : "-"}
                </div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Total Factura</div>
                {descuentoProntoPago.aplica ? (
                  <div>
                    <div className="text-sm text-slate-500 line-through">${(compra.total_precio_venta || compra.total || 0).toFixed(2)}</div>
                    <div className="text-lg font-bold text-green-600">
                      ${totalFacturaConDescuento.toFixed(2)}
                      <span className="text-xs text-green-500 ml-2">
                        (Descuento {descuentoProntoPago.porcentaje}% pronto pago aplicado)
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="text-lg font-bold text-green-600">${(compra.total_precio_venta || compra.total || 0).toFixed(2)}</div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-600">Monto Restante</div>
                <div className="text-lg font-bold text-red-600">${montoRestanteConDescuento.toFixed(2)}</div>
              </div>
            </div>

            {/* Condiciones del Proveedor */}
            {compra.proveedor && (
              <div className="mt-4 pt-4 border-t">
                <div className="text-sm font-semibold mb-2">Condiciones del Proveedor</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-slate-600">Días de Crédito:</span>{" "}
                    <span className="font-semibold">{compra.proveedor.dias_credito || 0} días</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Desc. Comercial:</span>{" "}
                    <span className="font-semibold">{compra.proveedor.descuento_comercial || 0}%</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Desc. Pronto Pago:</span>{" "}
                    <span className="font-semibold">{compra.proveedor.descuento_pronto_pago || 0}%</span>
                  </div>
                  <div>
                    <span className="text-slate-600">Días Pronto Pago:</span>{" "}
                    <span className="font-semibold">15 días</span>
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Totales */}
          <Card className="p-4 mb-4 bg-slate-50">
            <h3 className="font-semibold mb-3">Resumen Financiero</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <div className="text-sm text-slate-600 mb-1">Total Adeudado</div>
                <div className="text-xl font-bold text-red-600">
                  ${montoRestanteConDescuento.toFixed(2)}
                </div>
              </div>
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <div className="text-sm text-slate-600 mb-1">Total Abonado</div>
                <div className="text-xl font-bold text-yellow-600">
                  ${totalAbonado.toFixed(2)}
                </div>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <div className="text-sm text-slate-600 mb-1">Total Factura</div>
                <div className="text-xl font-bold text-blue-600">
                  ${(compra.total_precio_venta || compra.total || 0).toFixed(2)}
                </div>
              </div>
              {descuentoProntoPago.aplica ? (
                <div className="bg-green-50 p-3 rounded-lg border-2 border-green-300">
                  <div className="text-sm font-semibold text-green-800 mb-1">
                    💰 Ahorro Pronto Pago
                  </div>
                  <div className="text-xl font-bold text-green-600">
                    ${descuentoProntoPago.montoDescuento.toFixed(2)}
                  </div>
                </div>
              ) : (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="text-sm text-slate-600 mb-1">Ahorro Pronto Pago</div>
                  <div className="text-xl font-bold text-slate-400">$0.00</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Sin descuentos disponibles
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Items de la Compra */}
          <Card className="p-4 mb-4">
            <h3 className="font-semibold mb-3">Items de la Compra</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Código</th>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-right p-2">Cantidad</th>
                  </tr>
                </thead>
                <tbody>
                  {(compraNormalizada.items && Array.isArray(compraNormalizada.items) ? compraNormalizada.items : []).map((item: any, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{item.codigo || item.codigo_producto || "-"}</td>
                      <td className="p-2">{item.descripcion || item.nombre || "-"}</td>
                      <td className="p-2 text-right">{item.cantidad || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Historial de Pagos */}
          {compraNormalizada.pagos && Array.isArray(compraNormalizada.pagos) && compraNormalizada.pagos.length > 0 && (
            <Card className="p-4 mb-4">
              <h3 className="font-semibold mb-3">Historial de Pagos</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Fecha</th>
                      <th className="text-left p-2">Monto</th>
                      <th className="text-left p-2">Método</th>
                      <th className="text-left p-2">Banco</th>
                      <th className="text-left p-2">Referencia</th>
                      <th className="text-left p-2">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compraNormalizada.pagos.map((pago: Pago, idx: number) => {
                      const montoPago = Number(pago.monto || pago.monto_usd || pago.monto_bs || 0);
                      const fechaPago = pago.fecha_pago || pago.fecha_creacion || "";
                      const comprobante = pago.comprobante || "";
                      
                      // Buscar banco si no viene poblado
                      let bancoNombre = pago.banco?.nombre_banco;
                      if (!bancoNombre && pago.banco_id) {
                        const bancoEncontrado = bancos.find(
                          (b) => (b._id || b.id) === pago.banco_id
                        );
                        bancoNombre = bancoEncontrado?.nombre_banco;
                      }
                      
                      // Log para diagnosticar
                      console.log(`📋 [PAGO ${idx + 1}]`, {
                        banco_id: pago.banco_id,
                        banco_poblado: pago.banco?.nombre_banco,
                        banco_encontrado: bancoNombre,
                        comprobante,
                        tiene_comprobante: !!comprobante,
                        longitud_comprobante: comprobante?.length || 0
                      });
                      
                      return (
                        <tr key={idx} className="border-b">
                          <td className="p-2">
                            {fechaPago ? (() => {
                              try {
                                const fecha = new Date(fechaPago);
                                if (!isNaN(fecha.getTime())) {
                                  return fecha.toLocaleDateString('es-VE', { 
                                    year: 'numeric', 
                                    month: '2-digit', 
                                    day: '2-digit' 
                                  });
                                }
                              } catch (e) {}
                              return fechaPago;
                            })() : "-"}
                          </td>
                          <td className="p-2 font-semibold">${montoPago.toFixed(2)}</td>
                          <td className="p-2">{pago.metodo_pago || "-"}</td>
                          <td className="p-2">{bancoNombre || "-"}</td>
                          <td className="p-2">{pago.referencia || "-"}</td>
                          <td className="p-2">
                            {comprobante ? (
                              <div className="flex items-center gap-2">
                                <ImageDisplay
                                  imageName={comprobante}
                                  alt="Comprobante de pago"
                                  style={{ maxWidth: 50, maxHeight: 50, borderRadius: 4, cursor: "pointer" }}
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const imageUrl = `${API_BASE_URL}/uploads/${comprobante}`;
                                    console.log("🖼️ [COMPROBANTE] Abriendo comprobante:", imageUrl);
                                    const modal = window.open("", "_blank");
                                    if (modal) {
                                      modal.document.write(`
                                        <!DOCTYPE html>
                                        <html>
                                          <head>
                                            <title>Comprobante de Pago</title>
                                            <style>
                                              body { 
                                                margin: 0; 
                                                padding: 20px; 
                                                display: flex; 
                                                justify-content: center; 
                                                align-items: center; 
                                                min-height: 100vh;
                                                background: #f5f5f5;
                                              }
                                              img { 
                                                max-width: 90vw; 
                                                max-height: 90vh; 
                                                height: auto;
                                                border: 1px solid #ddd;
                                                border-radius: 8px;
                                                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                                              }
                                            </style>
                                          </head>
                                          <body>
                                            <img src="${imageUrl}" alt="Comprobante de pago" onerror="this.alt='Error al cargar imagen'; this.style.border='2px solid red';" />
                                          </body>
                                        </html>
                                      `);
                                      modal.document.close();
                                    }
                                  }}
                                >
                                  Ver Detalle
                                </Button>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs">Sin comprobante</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={exportarExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
            <Button variant="outline" onClick={exportarPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" onClick={imprimirCompra}>
              <Printer className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            {compra.estado !== "pagada" && (
              <Button onClick={handlePagar}>
                <DollarSign className="h-4 w-4 mr-2" />
                Pagar/Abonar
              </Button>
            )}
            <Button variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Pago/Abono */}
      {mostrarPago && (
        <Dialog open={mostrarPago} onOpenChange={(open) => !open && setMostrarPago(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Pagar/Abonar Compra</DialogTitle>
            </DialogHeader>

            {!compra.pagar_en_dolar_negro && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Tasa del Día BCV (Bs)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={tasaBcv}
                  onChange={(e) => setTasaBcv(parseFloat(e.target.value) || 0)}
                />
                {tasaBcv > 0 && (
                  <div className="mt-2 text-sm text-slate-600">
                    Monto en Bs: {montoBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                  </div>
                )}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Divisa de Pago *
              </label>
              <select
                value={divisaPago}
                onChange={(e) => setDivisaPago(e.target.value as "USD" | "Bs")}
                className="w-full border rounded px-3 py-2"
              >
                <option value="USD">USD ($)</option>
                <option value="Bs">Bs</option>
              </select>
            </div>

            {descuentoProntoPago.aplica && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="text-sm font-semibold text-green-800 mb-1">
                  Descuento por Pronto Pago Aplicado
                </div>
                <div className="text-xs text-green-700">
                  Descuento: {descuentoProntoPago.porcentaje}% ({descuentoProntoPago.montoDescuento.toFixed(2)} USD)
                </div>
                <div className="text-xs text-green-700">
                  Total original: ${(compra.total_precio_venta || compra.total || 0).toFixed(2)} → 
                  Total con descuento: ${totalFacturaConDescuento.toFixed(2)}
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Monto a Pagar ({divisaPago}) *
              </label>
              <Input
                type="number"
                step="0.01"
                value={montoPagar}
                onChange={(e) => setMontoPagar(e.target.value)}
                placeholder={divisaPago === "USD" 
                  ? `Máximo: $${montoRestanteConDescuento.toFixed(2)}`
                  : `Máximo: ${(montoRestanteConDescuento * (tasaBcv || 0)).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
                }
              />
              {divisaPago === "Bs" && tasaBcv > 0 && (
                <div className="mt-1 text-xs text-slate-500">
                  Equivale a: ${(parseFloat(montoPagar) || 0) / tasaBcv} USD
                </div>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Banco *
              </label>
              <select
                value={bancoSeleccionado}
                onChange={(e) => {
                  setBancoSeleccionado(e.target.value);
                  const banco = bancos.find(b => (b._id || b.id) === e.target.value);
                  if (banco) {
                    setMetodoPago(banco.tipo_metodo || "");
                  }
                }}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccione un banco</option>
                {bancos.map((banco) => {
                  const saldo = banco.saldo !== undefined ? banco.saldo : 0;
                  const saldoFormateado = saldo.toFixed(2);
                  const simboloDivisa = banco.divisa === "USD" ? "$" : "Bs";
                  return (
                    <option key={banco._id || banco.id} value={banco._id || banco.id}>
                      {banco.nombre_banco} - Saldo: {simboloDivisa} {saldoFormateado} ({banco.divisa})
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Método de Pago *
              </label>
              <Input
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value)}
                placeholder="Ej: Transferencia, Pago Móvil, etc."
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Referencia
              </label>
              <Input
                value={referencia}
                onChange={(e) => setReferencia(e.target.value)}
                placeholder="Ej: TRF-123456, REF-789012"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Notas
              </label>
              <textarea
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Ej: Pago parcial, Pago completo, etc."
                className="w-full border rounded px-3 py-2 min-h-[80px]"
                rows={3}
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">
                Comprobante (Foto/Archivo)
              </label>
              <UpFilePagosCPP
                onUploadSuccess={(objectName) => setComprobanteArchivo(objectName)}
                label="Subir comprobante"
                maxSizeMB={5}
                initialFileUrl={comprobanteArchivo || undefined}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMostrarPago(false)}>
                Cancelar
              </Button>
              <Button onClick={handleConfirmarPago} disabled={loading}>
                Continuar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Modal de Preliminar */}
      {mostrarPreliminar && (
        <Dialog open={mostrarPreliminar} onOpenChange={(open) => !open && setMostrarPreliminar(false)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Preliminar de Pago</DialogTitle>
            </DialogHeader>

            <Card className="p-4 mb-4">
              <h3 className="font-semibold mb-3">Resumen del Pago</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Monto a Pagar:</span>
                  <span className="font-semibold">
                    {divisaPago === "USD" ? "$" : ""}{parseFloat(montoPagar || "0").toFixed(2)} {divisaPago}
                  </span>
                </div>
                {divisaPago === "Bs" && tasaBcv > 0 && (
                  <div className="flex justify-between">
                    <span>Equivalente en USD:</span>
                    <span className="font-semibold">
                      ${((parseFloat(montoPagar || "0")) / tasaBcv).toFixed(2)} USD
                    </span>
                  </div>
                )}
                {divisaPago === "USD" && tasaBcv > 0 && (
                  <div className="flex justify-between">
                    <span>Equivalente en Bs:</span>
                    <span className="font-semibold">
                      {((parseFloat(montoPagar || "0")) * tasaBcv).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Banco:</span>
                  <span>{bancos.find(b => (b._id || b.id) === bancoSeleccionado)?.nombre_banco || ""}</span>
                </div>
                <div className="flex justify-between">
                  <span>Método de Pago:</span>
                  <span>{metodoPago}</span>
                </div>
                {comprobanteArchivo && (
                  <div className="mt-4">
                    <div className="text-sm font-semibold mb-2">Comprobante:</div>
                    <div className="border rounded p-2">
                      <ImageDisplay
                        imageName={comprobanteArchivo}
                        alt="Comprobante de pago"
                        style={{ maxWidth: 300, maxHeight: 300, borderRadius: 8 }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMostrarPreliminar(false)}>
                Volver
              </Button>
              <Button onClick={handleGuardarPago} disabled={loading}>
                {loading ? "Guardando..." : "Confirmar y Guardar"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ModalDetalleCuentaPorPagar;

