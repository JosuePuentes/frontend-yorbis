import React, { useState } from "react";
import UpFileCuentasPorPagar from "../../../components/upfile/UpFileCuentasPorPagar";

interface CuentaPorPagar {
  fechaEmision: string;
  fechaRecepcion: string;
  fechaVencimiento?: string; // Nuevo campo
  fechaRegistro?: string; // Nuevo campo
  diasCredito: number;
  numeroFactura: string;
  numeroControl: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  retencion: number;
  divisa: "USD" | "Bs";
  tasa: number;
  estatus: string;
  usuarioCorreo: string;
  farmacia: string;
  imagenesCuentaPorPagar?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CuentasPorPagarPage: React.FC = () => {
  // Obtener usuario autenticado de localStorage
  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
      return null;
    }
  })();

  // Obtener farmacias del usuario autenticado
  const farmaciasUsuario: Record<string, string> = usuario?.farmacias || {};
  const farmaciasArr = Object.entries(farmaciasUsuario);
  // Si solo tiene una farmacia, seleccionarla por defecto
  const [farmacia, setFarmacia] = useState(farmaciasArr.length === 1 ? farmaciasArr[0][0] : "");

  const [form, setForm] = useState<CuentaPorPagar>({
    fechaEmision: "",
    fechaRecepcion: "",
    fechaVencimiento: "",
    fechaRegistro: new Date().toISOString().slice(0, 10),
    diasCredito: 0,
    numeroFactura: "",
    numeroControl: "",
    proveedor: "",
    descripcion: "",
    monto: 0,
    retencion: 0,
    divisa: "USD",
    tasa: 0,
    estatus: "wait",
    usuarioCorreo: usuario?.correo || "",
    farmacia: "",
    imagenesCuentaPorPagar: []
  });
  const [imagenesCuentaPorPagar, setImagenesCuentaPorPagar] = useState<Array<string | null>>([null, null, null]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Sincronizar farmacia seleccionada con el form
  React.useEffect(() => {
    setForm(prev => ({ ...prev, farmacia }));
  }, [farmacia]);

  // Asegurar que los campos numéricos no permitan valores NaN
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => {
      if (type === "number") {
        const num = value === "" ? "" : Number(value);
        return { ...prev, [name]: num };
      }
      return { ...prev, [name]: value };
    });
  };

  // Cálculo automático de días de crédito
  const handleFechaRecepcionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fechaRecepcion = e.target.value;
    setForm(prev => {
      const diasCredito = prev.fechaVencimiento && fechaRecepcion
        ? Math.max(0, Math.ceil((new Date(prev.fechaVencimiento).getTime() - new Date(fechaRecepcion).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return { ...prev, fechaRecepcion, diasCredito };
    });
  };
  const handleFechaVencimientoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fechaVencimiento = e.target.value;
    setForm(prev => {
      const diasCredito = prev.fechaRecepcion && fechaVencimiento
        ? Math.max(0, Math.ceil((new Date(fechaVencimiento).getTime() - new Date(prev.fechaRecepcion).getTime()) / (1000 * 60 * 60 * 24)))
        : 0;
      return { ...prev, fechaVencimiento, diasCredito };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    // Validar que haya al menos una imagen
    const imagenesValidas = imagenesCuentaPorPagar.filter((img): img is string => !!img);
    if (imagenesValidas.length === 0) {
      setError("Debe adjuntar al menos una imagen (máx. 3).");
      setLoading(false);
      return;
    }
    // Mensaje de advertencia antes de enviar
    if (!window.confirm("¿Está seguro de registrar esta cuenta por pagar? Verifique que los datos y las imágenes sean correctos.")) {
      setLoading(false);
      return;
    }
    try {
      const payload = {
        ...form,
        usuarioCorreo: usuario?.correo || "",
        farmacia,
        imagenesCuentaPorPagar: imagenesValidas.slice(0, 3),
        fechaRegistro: new Date().toISOString().slice(0, 10),
      };
      // Obtener token JWT del localStorage (guardado como string plano bajo la key "token")
      const token = localStorage.getItem("access_token");
      if (!token) throw new Error("No se encontró el token de autenticación");
      const response = await fetch(`${API_BASE_URL}/cuentas-por-pagar`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || "Error al registrar la cuenta por pagar");
      }
      setSuccess("Cuenta por pagar registrada exitosamente.");
      setForm({
        fechaEmision: "",
        fechaRecepcion: "",
        fechaVencimiento: "",
        fechaRegistro: new Date().toISOString().slice(0, 10),
        diasCredito: 0,
        numeroFactura: "",
        numeroControl: "",
        proveedor: "",
        descripcion: "",
        monto: 0,
        retencion: 0,
        divisa: "USD",
        tasa: 0,
        estatus: "wait",
        usuarioCorreo: usuario?.correo || "",
        farmacia: "",
        imagenesCuentaPorPagar: []
      });
      setFarmacia(farmaciasArr.length === 1 ? farmaciasArr[0][0] : "");
      setImagenesCuentaPorPagar([null, null, null]); // Limpieza de fotos
    } catch (err: any) {
      setError(err.message || "Error al registrar la cuenta por pagar");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Registrar Cuenta por Pagar</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      {success && <div className="text-green-600 mb-4">{success}</div>}
      <form onSubmit={handleSubmit} className="space-y-4 bg-blue-50 p-6 rounded-xl shadow">
        {/* Visualización del usuario autenticado */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Correo usuario</label>
          <input type="text" value={usuario?.correo || ""} className="w-full border rounded px-2 py-1 bg-gray-100" disabled />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Farmacia</label>
          <select name="farmacia" value={farmacia} onChange={e => setFarmacia(e.target.value)} className="w-full border rounded px-2 py-1" required>
            <option value="">Seleccione una farmacia</option>
            {farmaciasArr.map(([id, nombre]) => (
              <option key={id} value={id}>{nombre}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Emisión</label>
          <input type="date" name="fechaEmision" value={form.fechaEmision} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Recepción</label>
          <input type="date" name="fechaRecepcion" value={form.fechaRecepcion} onChange={handleFechaRecepcionChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
          <input type="date" name="fechaVencimiento" value={form.fechaVencimiento} onChange={handleFechaVencimientoChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Días de Crédito</label>
          <input type="number" name="diasCredito" value={form.diasCredito} readOnly className="w-full border rounded px-2 py-1 bg-gray-100" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de Factura</label>
          <input type="text" name="numeroFactura" value={form.numeroFactura} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Número de Control</label>
          <input type="text" name="numeroControl" value={form.numeroControl} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Proveedor</label>
          <input type="text" name="proveedor" value={form.proveedor} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Descripción</label>
          <textarea name="descripcion" value={form.descripcion} onChange={handleChange} className="w-full border rounded px-2 py-1" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Monto</label>
          <input type="number" name="monto" value={form.monto === 0 ? "" : form.monto} onChange={handleChange} min={0} step="0.0001" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Retención</label>
          <input type="number" name="retencion" value={form.retencion === 0 ? 0 : form.retencion} onChange={handleChange} min={0} step="0.0001" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Divisa</label>
          <select name="divisa" value={form.divisa} onChange={handleChange} className="w-full border rounded px-2 py-1">
            <option value="USD">Dólares</option>
            <option value="Bs">Bolívares</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tasa</label>
          <input type="number" name="tasa" value={form.tasa === 0 ? "" : form.tasa} onChange={handleChange} min={0} step="0.0001" className="w-full border rounded px-2 py-1" required onWheel={e => e.currentTarget.blur()} />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Adjuntar imágenes (máx. 3)</label>
          <div className="flex flex-wrap gap-4">
            {[0, 1, 2].map(idx => (
              <div key={idx} className="flex flex-col items-start relative group">
                <UpFileCuentasPorPagar
                  onUploadSuccess={(objectName: string) => {
                    setImagenesCuentaPorPagar(prev => {
                      const newArr = [...prev];
                      newArr[idx] = objectName;
                      return newArr;
                    });
                  }}
                  label={`Imagen ${idx + 1}`}
                  maxSizeMB={2}
                  initialFileUrl={imagenesCuentaPorPagar[idx] || undefined}
                />
                {imagenesCuentaPorPagar[idx] && (
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white bg-opacity-80 rounded-full p-1 shadow text-red-600 hover:bg-red-100 hover:text-red-800 transition-colors z-20 opacity-80 group-hover:opacity-100"
                    title="Eliminar imagen"
                    onClick={() => {
                      setImagenesCuentaPorPagar(prev => {
                        const newArr = [...prev];
                        newArr[idx] = null;
                        return newArr;
                      });
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded w-full mt-2" disabled={loading}>
          {loading ? "Guardando..." : "Registrar"}
        </button>
      </form>
    </div>
  );
};

export default CuentasPorPagarPage;
