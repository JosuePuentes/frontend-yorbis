import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import ModalCuentasPorPagar from "@/components/ModalCuentasPorPagar";

interface CuentaPorPagar {
  _id: string;
  proveedor: string;
  descripcion: string;
  monto: number;
  divisa: string;
  tasa: number;
  numeroFactura: string;
  numeroControl: string;
  fechaEmision: string;
  diasCredito: number;
  estatus: string;
  farmacia: string;
  retencion: number;
  fechaRecepcion: string;
}

const VerificacionCuentasPorPagarPage: React.FC = () => {
  const [cuentas, setCuentas] = useState<CuentaPorPagar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; cuentaId: string | null; nuevoEstatus: string }>({ open: false, cuentaId: null, nuevoEstatus: "activa" });
  const [modalAbierto, setModalAbierto] = useState(false);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<{ id: string; nombre: string } | null>(null);
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);

  // Fetch farmacias y cuentas
  useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        setFarmacias(Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) })));
      } catch {
        setFarmacias([]);
      }
    }
    fetchCuentas();
  }, []);

  async function fetchCuentas() {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = token ? { "Authorization": `Bearer ${token}` } : {};
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cuentas-por-pagar`, { headers });
      if (!res.ok) throw new Error("Error al obtener cuentas por pagar");
      const data = await res.json();
      setCuentas(data.filter((c: CuentaPorPagar) => c.estatus === "wait"));
    } catch (err: any) {
      setError(err.message || "Error al obtener cuentas por pagar");
    } finally {
      setLoading(false);
    }
  }

  // Cambiar estatus
  const handleEstatusSelect = (cuentaId: string, nuevoEstatus: string) => setConfirmDialog({ open: true, cuentaId, nuevoEstatus });
  const handleCancelChange = () => setConfirmDialog({ open: false, cuentaId: null, nuevoEstatus: "" });
  const handleConfirmChange = async () => {
    if (!confirmDialog.cuentaId) return;
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cuentas-por-pagar/${confirmDialog.cuentaId}/estatus`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ estatus: confirmDialog.nuevoEstatus })
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ message: "Error desconocido al actualizar estatus" }));
        throw new Error(errorData.detail || errorData.message || "Error al actualizar el estatus");
      }
      setCuentas(prev => prev.filter(c => c._id !== confirmDialog.cuentaId));
      setSuccess("Estatus actualizado correctamente");
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Error al actualizar el estatus");
      setTimeout(() => setError(null), 5000);
    } finally {
      setConfirmDialog({ open: false, cuentaId: null, nuevoEstatus: "" });
    }
  };

  // Render
  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="w-full max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold text-blue-700 mb-8 text-center">Verificación de Cuentas por Pagar</h1>
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6 rounded-md shadow" role="alert">
            <p className="font-bold">Éxito</p>
            <p>{success}</p>
          </div>
        )}
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-blue-800 mb-6">Negocios</h2>
          {farmacias.length === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-8">No hay farmacias disponibles para mostrar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {farmacias.map(farm => {
                const cuentasPendientes = cuentas.filter(c => c.farmacia === farm.id && c.estatus === "wait").length;
                return (
                  <Card
                    key={farm.id}
                    className="relative bg-white p-7 rounded-2xl shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl border-l-6 border-blue-500 flex flex-col justify-between"
                  >
                    <div className="text-center text-2xl font-bold text-blue-800 mb-4">{farm.nombre}</div>
                    {cuentasPendientes > 0 && (
                      <span className="absolute top-4 right-4 bg-blue-600 text-white text-md font-extrabold px-3 py-1 rounded-full shadow-md animate-bounce">
                        {cuentasPendientes} pendientes
                      </span>
                    )}
                    <Button
                      onClick={() => {
                        setFarmaciaSeleccionada(farm);
                        setModalAbierto(true);
                      }}
                      className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 mt-5 rounded-lg shadow-md transition-all duration-300 ease-in-out"
                    >
                      Ver Cuentas ({cuentasPendientes})
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        {modalAbierto && farmaciaSeleccionada && (
          <ModalCuentasPorPagar
            cuentas={cuentas.filter(c => c.farmacia === farmaciaSeleccionada.id && c.estatus === "wait")}
            farmaciaNombre={farmaciaSeleccionada.nombre}
            onConfirm={handleEstatusSelect}
            onClose={() => setModalAbierto(false)}
            loading={loading}
            error={error}
          />
        )}
        {confirmDialog.open && (
          <Dialog open={confirmDialog.open} onOpenChange={handleCancelChange}>
            <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-2xl shadow-xl border-2 border-blue-500">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-blue-600 text-center">Confirmar Acción</DialogTitle>
                <DialogDescription className="text-center text-gray-700 mt-2">
                  ¿Está seguro que desea cambiar el estatus de la cuenta por pagar?
                  <div className="mt-4 flex justify-center">
                    <select
                      value={confirmDialog.nuevoEstatus}
                      onChange={e => setConfirmDialog(cd => ({ ...cd, nuevoEstatus: e.target.value }))}
                      className="border border-blue-300 rounded-md px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white text-blue-700"
                    >
                      <option value="seleccionar">seleccionar</option>
                      <option value="activa">Activa</option>
                      <option value="anulada">Anulada</option>
                    </select>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
                <Button
                  onClick={handleCancelChange}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow-md transition-all"
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleConfirmChange}
                  className={`bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all`}
                  disabled={!confirmDialog.nuevoEstatus}
                >
                  Aceptar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
};

export default VerificacionCuentasPorPagarPage;
