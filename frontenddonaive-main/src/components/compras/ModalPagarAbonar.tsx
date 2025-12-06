import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Upload, X } from "lucide-react";
import { fetchWithAuth } from "@/lib/api";
import UpFilePagosCPP from "@/components/upfile/UpFilePagosCPP";
import ImageDisplay from "@/components/upfile/ImageDisplay";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Banco {
  _id?: string;
  id?: string;
  nombre_banco: string;
  divisa: "USD" | "BS" | "Bs";
  tipo_metodo?: string;
  activo?: boolean;
  saldo?: number;
  numero_cuenta?: string;
}

interface Compra {
  _id: string;
  total_precio_venta?: number;
  total?: number;
  monto_restante?: number;
  monto_abonado?: number;
}

interface ModalPagarAbonarProps {
  open: boolean;
  onClose: () => void;
  compra: Compra;
  onPagoCompletado: () => void;
}

const ModalPagarAbonar: React.FC<ModalPagarAbonarProps> = ({
  open,
  onClose,
  compra,
  onPagoCompletado,
}) => {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [bancoSeleccionado, setBancoSeleccionado] = useState<string>("");
  const [montoPagar, setMontoPagar] = useState<string>("");
  const [referencia, setReferencia] = useState<string>("");
  const [notas, setNotas] = useState<string>("");
  const [comprobanteArchivo, setComprobanteArchivo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargandoBancos, setCargandoBancos] = useState(false);

  // Cargar bancos al abrir el modal
  useEffect(() => {
    if (open) {
      fetchBancos();
    }
  }, [open]);

  const fetchBancos = async () => {
    setCargandoBancos(true);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos`);
      if (res.ok) {
        const data = await res.json();
        const bancosData = Array.isArray(data) ? data : (data.bancos || []);
        const bancosActivos = bancosData.filter((b: Banco) => b.activo !== false);
        setBancos(bancosActivos);
        console.log("🏦 [PAGAR] Bancos cargados:", bancosActivos.length);
      } else {
        console.error("Error al cargar bancos:", res.status);
        setError("Error al cargar bancos. Por favor, intente nuevamente.");
      }
    } catch (err) {
      console.error("Error al cargar bancos:", err);
      setError("Error al cargar bancos. Por favor, intente nuevamente.");
    } finally {
      setCargandoBancos(false);
    }
  };

  const montoRestante = compra.monto_restante !== undefined && compra.monto_restante !== null
    ? compra.monto_restante
    : (compra.total_precio_venta || compra.total || 0) - (compra.monto_abonado || 0);

  const bancoSeleccionadoObj = bancos.find(b => (b._id || b.id) === bancoSeleccionado);
  const saldoDisponible = bancoSeleccionadoObj?.saldo || 0;
  const divisaBanco = bancoSeleccionadoObj?.divisa || "USD";

  const handleConfirmarPago = async () => {
    setError(null);

    if (!montoPagar || parseFloat(montoPagar) <= 0) {
      setError("Debe ingresar un monto válido mayor a 0");
      return;
    }

    const montoPagarNum = parseFloat(montoPagar);
    
    if (montoPagarNum > montoRestante) {
      setError(`El monto a pagar ($${montoPagarNum.toFixed(2)}) no puede ser mayor al monto restante ($${montoRestante.toFixed(2)})`);
      return;
    }

    if (!bancoSeleccionado) {
      setError("Debe seleccionar un banco");
      return;
    }

    // Validar saldo disponible si el banco tiene saldo
    if (saldoDisponible > 0 && montoPagarNum > saldoDisponible) {
      setError(`El monto a pagar ($${montoPagarNum.toFixed(2)}) excede el saldo disponible del banco ($${saldoDisponible.toFixed(2)})`);
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");

      const fechaPago = new Date().toISOString().split('T')[0];

      const pagoData: any = {
        monto: montoPagarNum,
        fecha_pago: fechaPago,
        metodo_pago: "banco",
        banco_id: bancoSeleccionado,
        referencia: referencia || "",
        notas: notas || "",
      };

      // Agregar comprobante si existe
      if (comprobanteArchivo) {
        pagoData.comprobante = comprobanteArchivo;
      }

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
      setMontoPagar("");
      setReferencia("");
      setNotas("");
      setComprobanteArchivo(null);
      setBancoSeleccionado("");
      setError(null);

      // Cerrar modal y recargar
      onClose();
      onPagoCompletado();
    } catch (err: any) {
      setError(err.message || "Error al guardar pago");
      console.error("Error al guardar pago:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelar = () => {
    setMontoPagar("");
    setReferencia("");
    setNotas("");
    setComprobanteArchivo(null);
    setBancoSeleccionado("");
    setError(null);
    onClose();
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Pagar/Abonar Cuenta por Pagar
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Información de la Compra */}
          <Card className="p-4 bg-slate-50">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-slate-600">N° Compra</div>
                <div className="font-semibold">{compra._id.slice(-8)}</div>
              </div>
              <div>
                <div className="text-sm text-slate-600">Monto Restante</div>
                <div className="text-lg font-bold text-red-600">${montoRestante.toFixed(2)}</div>
              </div>
            </div>
          </Card>

          {/* Selección de Banco */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Seleccionar Banco <span className="text-red-500">*</span>
            </label>
            {cargandoBancos ? (
              <div className="text-center py-4 text-slate-500">Cargando bancos...</div>
            ) : bancos.length === 0 ? (
              <div className="text-center py-4 text-red-500">
                No hay bancos disponibles. Por favor, registre bancos primero.
              </div>
            ) : (
              <select
                value={bancoSeleccionado}
                onChange={(e) => setBancoSeleccionado(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Seleccione un banco</option>
                {bancos.map((banco) => (
                  <option key={banco._id || banco.id} value={banco._id || banco.id}>
                    {banco.nombre_banco} - {banco.numero_cuenta || ""} ({banco.divisa}) - 
                    Saldo: ${(banco.saldo || 0).toFixed(2)}
                  </option>
                ))}
              </select>
            )}
            {bancoSeleccionadoObj && (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm font-semibold text-blue-800">
                  Saldo Disponible: ${saldoDisponible.toFixed(2)} {divisaBanco}
                </div>
                {saldoDisponible <= 0 && (
                  <div className="text-xs text-red-600 mt-1">
                    ⚠️ Este banco no tiene saldo disponible
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Monto a Pagar */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Monto a Pagar/Abonar <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              placeholder="0.00"
              value={montoPagar}
              onChange={(e) => {
                const valor = e.target.value;
                if (valor === "" || (parseFloat(valor) >= 0 && parseFloat(valor) <= montoRestante)) {
                  setMontoPagar(valor);
                }
              }}
              min="0"
              max={montoRestante}
              step="0.01"
              className="w-full"
            />
            <div className="text-xs text-slate-500 mt-1">
              Máximo: ${montoRestante.toFixed(2)}
            </div>
          </div>

          {/* Referencia */}
          <div>
            <label className="block text-sm font-medium mb-2">Referencia (Opcional)</label>
            <Input
              type="text"
              placeholder="Número de referencia del pago"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium mb-2">Notas (Opcional)</label>
            <textarea
              placeholder="Notas adicionales sobre el pago"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[80px]"
            />
          </div>

          {/* Adjuntar Comprobante */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Comprobante de Pago (Opcional)
            </label>
            {!comprobanteArchivo ? (
              <UpFilePagosCPP
                onFileUploaded={(url) => {
                  console.log("📎 [PAGAR] Comprobante subido:", url);
                  setComprobanteArchivo(url);
                }}
              />
            ) : (
              <div className="relative">
                <ImageDisplay imageUrl={comprobanteArchivo} />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setComprobanteArchivo(null)}
                  className="mt-2"
                >
                  <X className="h-4 w-4 mr-1" />
                  Eliminar Comprobante
                </Button>
              </div>
            )}
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCancelar}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmarPago}
              disabled={loading || !montoPagar || !bancoSeleccionado}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? "Guardando..." : "Confirmar Pago"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ModalPagarAbonar;

