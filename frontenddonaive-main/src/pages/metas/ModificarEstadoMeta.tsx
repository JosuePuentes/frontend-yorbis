
import React, { useEffect, useState } from "react";
import { useMetas } from "./useMetas";
import type { Meta } from "./useMetas";

const ModificarEstadoMeta: React.FC = () => {
  const { metas, fetchMetas, actualizarMeta, loading, error } = useMetas();
  const [selectedMetaId, setSelectedMetaId] = useState<string>("");
  const [editMeta, setEditMeta] = useState<Partial<Meta>>({});
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMetas();
  }, []);

  useEffect(() => {
    if (selectedMetaId) {
      const meta = metas.find((m) => m._id === selectedMetaId);
      if (meta) setEditMeta(meta);
    } else {
      setEditMeta({});
    }
  }, [selectedMetaId, metas]);

  const handleSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedMetaId(e.target.value);
    setSuccess(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue: string | number | boolean = value;
    if (type === "checkbox") {
      newValue = (e.target as HTMLInputElement).checked;
    } else if (type === "number") {
      newValue = Number(value);
    }
    setEditMeta((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    if (!selectedMetaId) return;
    try {
      await actualizarMeta(selectedMetaId, editMeta);
      setSuccess("Meta modificada exitosamente");
      fetchMetas();
    } catch {}
  };

  // Obtener farmacias del usuario para mostrar el nombre
  const [farmaciasUsuario, setFarmaciasUsuario] = useState<{ id: string; nombre: string }[]>([]);
  useEffect(() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmaciasUsuario(farmaciasArr);
      } catch {
        setFarmaciasUsuario([]);
      }
    }
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Modificar Meta</h2>
      <div className="mb-8">
        <label className="block font-medium mb-3 text-lg text-center">Selecciona una meta</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {metas.map((meta) => {
            const isSelected = selectedMetaId === meta._id;
            const farmaciaNombre = farmaciasUsuario.find((f) => f.id === meta.farmaciaId)?.nombre || meta.farmaciaId;
            return (
              <button
                key={meta._id}
                type="button"
                onClick={() => handleSelect({ target: { value: meta._id } } as React.ChangeEvent<HTMLSelectElement>)}
                className={`rounded-xl shadow-lg p-5 border-2 transition-all duration-200 flex flex-col min-h-[180px] text-left ${isSelected ? 'border-indigo-600 bg-indigo-50 scale-[1.03]' : 'border-yellow-400 bg-white hover:scale-[1.02]'}`}
                style={{ outline: isSelected ? '2px solid #6366f1' : undefined }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded-full shadow">{farmaciaNombre}</span>
                  {meta.estado === 'logrado' && (
                    <span className="ml-auto text-green-600 text-sm font-bold">Logrado</span>
                  )}
                  {meta.estado === 'no_logrado' && (
                    <span className="ml-auto text-red-500 text-sm font-bold">No logrado</span>
                  )}
                  {meta.estado === 'por_lograr' && (
                    <span className="ml-auto text-yellow-600 text-sm font-bold">Por lograr</span>
                  )}
                </div>
                <h3 className="text-lg font-bold text-yellow-700 mb-1">{meta.nombre}</h3>
                <p className="text-slate-700 mb-2 text-sm">{meta.descripcion || "Sin descripción"}</p>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Monto</span>
                    <span className="font-bold text-yellow-700 text-base">USD. {meta.monto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Inicio</span>
                    <span className="text-sm font-medium text-slate-700">{meta.fechaInicio}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Fin</span>
                    <span className="text-sm font-medium text-slate-700">{meta.fechaFin}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      {selectedMetaId && editMeta && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow max-w-xl mx-auto">
          <div className="mb-4">
            <label className="block font-medium mb-1">Nombre</label>
            <input type="text" name="nombre" value={editMeta.nombre || ""} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Descripción</label>
            <textarea name="descripcion" value={editMeta.descripcion || ""} onChange={handleChange} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium mb-1">Fecha Inicio</label>
              <input type="date" name="fechaInicio" value={editMeta.fechaInicio || ""} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block font-medium mb-1">Fecha Fin</label>
              <input type="date" name="fechaFin" value={editMeta.fechaFin || ""} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
            </div>
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Monto</label>
            <input type="number" name="monto" value={editMeta.monto ?? 0} onChange={handleChange} required min={0} step={0.01} className="w-full border rounded px-3 py-2" />
          </div>
          <div className="mb-4">
            <label className="block font-medium mb-1">Estado</label>
            <select name="estado" value={editMeta.estado || 'por_lograr'} onChange={handleChange} required className="w-full border rounded px-3 py-2">
              <option value="por_lograr">Por lograr</option>
              <option value="logrado">Logrado</option>
              <option value="no_logrado">No logrado</option>
            </select>
          </div>
          <div className="flex gap-3 mt-6">
            <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition">
              {loading ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button type="button" onClick={() => { setSelectedMetaId(""); setEditMeta({}); setSuccess(null); }} className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded hover:bg-gray-400 transition">
              Cancelar
            </button>
          </div>
          {error && <div className="mt-4 text-red-600">{error}</div>}
          {success && <div className="mt-4 text-green-600">{success}</div>}
        </form>
      )}
    </div>
  );
};

export default ModificarEstadoMeta;
