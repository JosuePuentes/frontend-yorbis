import React, { useState } from 'react';
import UpFile from "./upfile/UpFilePagosCPP";

interface AbonoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AbonoFormData) => void;
  usuario: string;
  cuentaPorPagarId: string;
  farmaciaId: string;
}

export interface AbonoFormData {
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
  cuentaPorPagarId: string;
}

const AbonoModal: React.FC<AbonoModalProps> = ({ open, onClose, onSubmit, usuario, cuentaPorPagarId, farmaciaId }) => {
  const [form, setForm] = useState<AbonoFormData>({
    fecha: '',
    moneda: 'USD',
    monto: 0,
    referencia: '',
    usuario: usuario || '',
    bancoEmisor: '',
    bancoReceptor: '',
    tasa: undefined,
    farmaciaId: farmaciaId || '',
    estado: 'aprobado',
    cuentaPorPagarId: cuentaPorPagarId || '',
  });
  const [imagenPago, setImagenPago] = useState<string>("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: name === 'monto' || name === 'tasa' ? parseFloat(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Obtener correo del usuario autenticado
    const usuarioRaw = localStorage.getItem("usuario");
    const usuarioCorreo = usuarioRaw ? JSON.parse(usuarioRaw).correo : "";
    const abonoData = { ...form, usuario: usuarioCorreo, imagenPago };
    console.log(JSON.stringify(abonoData, null, 2));
    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || "";
      const response = await fetch(`${apiBaseUrl}/api/pagoscpp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(abonoData),
      });
      if (!response.ok) {
        throw new Error("Error al registrar el abono");
      }
      const data = await response.json();
      console.log("Pago registrado:", data);
      onSubmit(abonoData);
    } catch (error) {
      console.error(error);
      alert("Error al registrar el abono");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30 backdrop-blur-sm">
      <div className="bg-white p-6 rounded-lg shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-800">Registrar Abono</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input type="date" name="fecha" value={form.fecha} onChange={handleChange} required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
            <select name="moneda" value={form.moneda} onChange={handleChange} className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm">
              <option value="USD">USD</option>
              <option value="Bs">Bs</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Monto</label>
            <input type="number" name="monto" value={form.monto} onChange={handleChange} min="0" step="0.01" required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Referencia</label>
            <input type="text" name="referencia" value={form.referencia} onChange={handleChange} required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Emisor</label>
            <input type="text" name="bancoEmisor" value={form.bancoEmisor} onChange={handleChange} required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco Receptor</label>
            <input type="text" name="bancoReceptor" value={form.bancoReceptor} onChange={handleChange} required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tasa</label>
            <input type="number" name="tasa" value={form.tasa ?? ''} onChange={handleChange} min="0" step="0.0001" required className="w-full border-slate-300 rounded-md shadow-sm py-2 px-3 text-sm" />
          </div>
          <UpFile
            label="Agregar imagen de pago"
            allowedFileTypes={["image/*"]}
            onUploadSuccess={setImagenPago}
          />
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-md bg-slate-200 text-slate-700 hover:bg-slate-300 font-medium">Cancelar</button>
            <button type="submit" className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 font-semibold">Registrar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AbonoModal;
