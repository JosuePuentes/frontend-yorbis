import React, { useRef, useEffect, useState } from "react";
import { FaMoneyCheckAlt, FaTimes } from "react-icons/fa";
import { animate } from "animejs";
import UpFile from "@/components/upfile/UpFile";

// Los tipos y props ahora igual que AbonoModal
export interface PagoMasivoFormData {
  fecha: string;
  moneda: 'USD' | 'Bs';
  monto: number;
  referencia: string;
  usuario: string;
  bancoEmisor: string;
  bancoReceptor: string;
  tasa?: number;
  imagenPago?: string;
  farmaciaId: string;
  estado: 'cancelada' | 'aprobado' | 'en_espera';
  cuentaPorPagarId?: string;
}

interface PagoMasivoModalProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  error: string | null;
  monedaConversion: 'USD' | 'Bs';
}

const PagoMasivoModal: React.FC<PagoMasivoModalProps> = ({ open, onClose, loading, error, monedaConversion }) => {
  // Estado local para cuentas, sincronizado con localStorage
  const [cuentasState, setCuentasState] = useState<any[]>([]);

  const [form, setForm] = useState<PagoMasivoFormData>({
    fecha: new Date().toISOString().slice(0, 10),
    moneda: monedaConversion,
    monto: 0,
    referencia: "",
    usuario: "",
    bancoEmisor: "",
    bancoReceptor: "",
    tasa: undefined, // No se setea tasa global
    imagenPago: undefined,
    farmaciaId: "",
    estado: 'aprobado',
    cuentaPorPagarId: undefined,
  });
  const [imagenPago, setImagenPago] = useState<string>("");
  const modalRef = useRef<HTMLDivElement>(null);
  // Los totales se calculan SOLO a partir de los valores ya calculados en las cuentas
  const totalAPagar = cuentasState && cuentasState.length > 0 ? cuentasState.reduce((acc, c) => acc + (typeof c.montoDePago === 'number' ? Number(c.montoDePago) : 0), 0) : 0;
  const totalDescuento = cuentasState && cuentasState.length > 0 ? cuentasState.reduce((acc, c) => acc + (typeof c.totalDescuentos === 'number' ? Number(c.totalDescuentos) : 0), 0) : 0;
  const totalRetencion = cuentasState && cuentasState.length > 0 ? cuentasState.reduce((acc, c) => acc + (typeof c.retencion === 'number' ? Number(c.retencion) : 0), 0) : 0;

  // Sincroniza el monto y moneda del form con los totales y moneda global, pero NO la tasa
  useEffect(() => {
    setForm(f => ({
      ...f,
      monto: Number(totalAPagar.toFixed(4)),
      moneda: monedaConversion
    }));
  }, [totalAPagar, monedaConversion]);

  useEffect(() => {
    if (open && modalRef.current) {
      animate(modalRef.current, {
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 350,
        ease: "outCubic",
      });
    }
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: name === "monto" || name === "tasa" ? Number(value) : value }));
  };

  // En PagoMasivoModal, al registrar el pago masivo, marcar la cuenta como 'abonada' si esAbono está activo, si no 'pagada'
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mostrar alerta de confirmación antes de guardar
    const confirm = window.confirm("¿Está seguro de registrar el pago masivo para las cuentas seleccionadas? Esta acción no se puede deshacer.");
    if (!confirm) return;
    try {
      // Obtener correo del usuario autenticado
      const usuarioRaw = localStorage.getItem("usuario");
      const usuarioCorreo = usuarioRaw ? JSON.parse(usuarioRaw).correo : "";
      // Fusionar datos del formulario con los de cada cuenta seleccionada
      const pagosMasivos = cuentasState.map((cuenta) => {
        const pago = {
          fecha: form.fecha,
          referencia: form.referencia,
          usuario: usuarioCorreo,
          bancoEmisor: form.bancoEmisor,
          bancoReceptor: form.bancoReceptor,
          tasa: form.tasa,
          imagenPago: imagenPago,
          farmaciaId: cuenta.farmacia,
          estado: form.estado,
          cuentaPorPagarId: cuenta.cuentaPorPagarId || cuenta._id,
          fechaEmision: cuenta.fechaEmision,
          fechaRecepcion: cuenta.fechaRecepcion,
          fechaVencimiento: cuenta.fechaVencimiento,
          fechaRegistro: cuenta.fechaRegistro,
          diasCredito: cuenta.diasCredito,
          numeroFactura: cuenta.numeroFactura,
          numeroControl: cuenta.numeroControl,
          proveedor: cuenta.proveedor,
          descripcion: cuenta.descripcion,
          montoOriginal: cuenta.montoOriginal,
          retencion: cuenta.retencion,
          monedaOriginal: cuenta.monedaOriginal,
          tasaOriginal: cuenta.tasaOriginal,
          tasaDePago: cuenta.tasaDePago,
          estatus: cuenta.estatus,
          usuarioCorreoCuenta: cuenta.usuarioCorreo,
          imagenesCuentaPorPagar: cuenta.imagenesCuentaPorPagar,
          montoDePago: cuenta.montoDePago,
          monedaDePago: cuenta.monedaDePago,
          abono: typeof cuenta.abono === 'boolean' ? cuenta.abono : false,
        };
        return pago;
      });
      // Enviar al backend usando la URL base del .env si existe
      const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
      const res = await fetch(`${API_BASE_URL}/pagoscpp/masivo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pagosMasivos)
      });
      if (!res.ok) throw new Error("Error al registrar pagos masivos");
      // Opcional: limpiar localStorage o estado si es necesario
      onClose();
    } catch (err) {
      console.error('Error al registrar pagos masivos:', err);
      // Aquí podrías setear un estado de error si lo deseas
    }
  };

  // Sincroniza cuentasState con la prop o localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('cuentasParaPagar');
      if (stored) {
        setCuentasState(Object.values(JSON.parse(stored)));
      } else {
        setCuentasState([]);
      }
    } catch {
      setCuentasState([]);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white bg-opacity-40 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 relative border-2 border-green-600 animate-fade-in"
      >
        <button className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-red-600" onClick={onClose}>
          <FaTimes />
        </button>
        <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
          <FaMoneyCheckAlt /> Registrar Pago Masivo
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4" onKeyDown={e => {
          if (e.key === 'Enter') {
            // Evita submit con Enter excepto si el target es un textarea
            if (e.target && (e.target as HTMLElement).tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }
        }}>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
              <input type="date" name="fecha" value={form.fecha} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto total</label>
            <input type="number" name="monto" value={form.monto} onChange={handleChange} min="0" step="0.0001" required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm bg-slate-100" readOnly />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
            <input type="text" name="referencia" value={form.referencia} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Emisor</label>
            <input type="text" name="bancoEmisor" value={form.bancoEmisor} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Receptor</label>
            <input type="text" name="bancoReceptor" value={form.bancoReceptor} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" required />
          </div>
          <UpFile
            label="Agregar imagen de pago"
            allowedFileTypes={["image/*"]}
            onUploadSuccess={setImagenPago}
          />
          {error && <div className="text-red-600 text-sm text-center">{error}</div>}
          <div className="flex justify-end gap-3 mt-2">
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium">Cancelar</button>
            <button type="submit" className="px-5 py-2 rounded-md bg-green-600 text-white font-semibold hover:bg-green-700 transition-all" disabled={loading}>
              {loading ? "Registrando..." : "Registrar pago para seleccionadas"}
            </button>
          </div>
        </form>
        <div className="mt-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-2">Resumen de Pago</h3>
            <div className="text-sm space-y-1 bg-slate-50 p-3 rounded-md">
                <div className="flex justify-between">
                    <span className="text-slate-600">Total a Pagar:</span>
                    <span className="font-bold text-blue-600">{totalAPagar.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-600">Total Descuento:</span>
                    <span className="font-bold text-green-600">{totalDescuento.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                    <span className="text-slate-600">Total Retención:</span>
                    <span className="font-bold text-red-600">{totalRetencion.toFixed(4)}</span>
                </div>
                <hr className="my-1" />
                <div className="flex justify-between">
                    <span className="font-semibold text-slate-800">Total Acreditado a Deuda:</span>
                    <span className="font-bold text-purple-600">{(totalAPagar + totalDescuento).toFixed(4)}</span>
                </div>
            </div>
          <h3 className="text-sm font-semibold text-slate-700 mb-1 mt-4">Cuentas seleccionadas:</h3>
          <ul className="text-xs text-slate-600 max-h-24 overflow-y-auto list-disc pl-5">
            {cuentasState && cuentasState.map((c, index) => {
                const totalAcreditar = typeof c.totalAcreditar === 'number' ? c.totalAcreditar : 0;
                const d1 = typeof c.d1 === 'number' ? c.d1 : 0;
                const d2 = typeof c.d2 === 'number' ? c.d2 : 0;
                return (
                    <li key={c.cuentaPorPagarId || c._id || index}>
                        {c.numeroFactura} - {c.proveedor} | Pagar: {totalAcreditar.toFixed(4)} {c.moneda ? c.moneda : ''} | Dcto1: {d1.toFixed(4)} | Dcto2: {d2.toFixed(4)}{c.tasa ? ` | Tasa: ${Number(c.tasa).toFixed(4)}` : ''}
                    </li>
                );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PagoMasivoModal;
