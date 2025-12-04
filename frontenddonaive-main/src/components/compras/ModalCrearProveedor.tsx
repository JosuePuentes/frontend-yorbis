import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
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

interface ModalCrearProveedorProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  proveedor?: Proveedor | null;
}

const ModalCrearProveedor: React.FC<ModalCrearProveedorProps> = ({
  open,
  onClose,
  onSuccess,
  proveedor,
}) => {
  const [nombre, setNombre] = useState("");
  const [rif, setRif] = useState("");
  const [telefono, setTelefono] = useState("");
  const [diasCredito, setDiasCredito] = useState("");
  const [descuentoComercial, setDescuentoComercial] = useState("");
  const [descuentoProntoPago, setDescuentoProntoPago] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cargar datos del proveedor si se está editando
  useEffect(() => {
    if (proveedor) {
      setNombre(proveedor.nombre || "");
      setRif(proveedor.rif || "");
      setTelefono(proveedor.telefono || "");
      setDiasCredito(proveedor.dias_credito?.toString() || "");
      setDescuentoComercial(proveedor.descuento_comercial?.toString() || "");
      setDescuentoProntoPago(proveedor.descuento_pronto_pago?.toString() || "");
    } else {
      // Limpiar formulario si es nuevo
      setNombre("");
      setRif("");
      setTelefono("");
      setDiasCredito("");
      setDescuentoComercial("");
      setDescuentoProntoPago("");
    }
  }, [proveedor, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim() || !rif.trim() || !telefono.trim()) {
      setError("Nombre, RIF y Teléfono son obligatorios");
      return;
    }

    setLoading(true);
    try {
      const url = proveedor?._id 
        ? `${API_BASE_URL}/proveedores/${proveedor._id}`
        : `${API_BASE_URL}/proveedores`;
      
      const method = proveedor?._id ? "PUT" : "POST";

      const bodyData = {
        nombre: nombre.trim(),
        rif: rif.trim(),
        telefono: telefono.trim(),
        dias_credito: diasCredito.trim() ? parseInt(diasCredito) : 0,
        descuento_comercial: descuentoComercial.trim() ? parseFloat(descuentoComercial) : 0,
        descuento_pronto_pago: descuentoProntoPago.trim() ? parseFloat(descuentoProntoPago) : 0,
      };
      console.log("Enviando datos del proveedor:", bodyData);
      
      const res = await fetchWithAuth(url, {
        method: method,
        body: JSON.stringify(bodyData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        console.error("Error al guardar proveedor:", errorData);
        throw new Error(errorData?.detail || errorData?.message || `Error al ${proveedor?._id ? 'actualizar' : 'crear'} proveedor`);
      }

      const responseData = await res.json();
      console.log("Proveedor guardado exitosamente:", responseData);

      // Limpiar formulario
      setNombre("");
      setRif("");
      setTelefono("");
      setDiasCredito("");
      setDescuentoComercial("");
      setDescuentoProntoPago("");
      onSuccess();
    } catch (err: any) {
      setError(err.message || `Error al ${proveedor?._id ? 'actualizar' : 'crear'} proveedor`);
      console.error(`Error al ${proveedor?._id ? 'actualizar' : 'crear'} proveedor:`, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-800">
            {proveedor?._id ? "Editar Proveedor" : "Crear Nuevo Proveedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Nombre del Proveedor *
              </label>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Distribuidora ABC"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                RIF *
              </label>
              <Input
                value={rif}
                onChange={(e) => setRif(e.target.value)}
                placeholder="Ej: J-12345678-9"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Teléfono *
              </label>
              <Input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 0412-1234567"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Días de Crédito
              </label>
              <Input
                type="number"
                min="0"
                value={diasCredito}
                onChange={(e) => setDiasCredito(e.target.value)}
                placeholder="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descuento Comercial (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={descuentoComercial}
                onChange={(e) => setDescuentoComercial(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Descuento por Pronto Pago (%)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={descuentoProntoPago}
                onChange={(e) => setDescuentoProntoPago(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (proveedor?._id ? "Actualizando..." : "Creando...") : (proveedor?._id ? "Actualizar Proveedor" : "Crear Proveedor")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ModalCrearProveedor;

