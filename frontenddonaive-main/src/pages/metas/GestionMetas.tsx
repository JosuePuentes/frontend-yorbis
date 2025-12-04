import React, { useState } from "react";
import { useMetas } from "./useMetas";
import type { Meta } from "./useMetas";


const initialMeta: Meta = {
  nombre: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  monto: 0,
  farmaciaId: "",
  usuario: "",
  estado: 'por_lograr',
};

const GestionMetas: React.FC = () => {
  const { crearMeta, loading, error } = useMetas();
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [success, setSuccess] = useState<string | null>(null);

  // Obtener farmacias del usuario
  const farmaciasUsuario = (() => {
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        return Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
      } catch {
        return [];
      }
    }
    return [];
  })();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setMeta((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    try {
      // Asignar usuario actual si existe
      const usuarioRaw = localStorage.getItem("usuario");
      let usuario = "";
      if (usuarioRaw) {
        try {
          usuario = JSON.parse(usuarioRaw).correo || "";
        } catch {}
      }
      const metaToSend = { ...meta, usuario };
      await crearMeta(metaToSend);
      setSuccess("Meta creada exitosamente");
      setMeta(initialMeta);
    } catch (err: any) {
      setSuccess(null);
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h2 className="text-2xl font-bold mb-6 text-center">Crear Meta</h2>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow">
        <div className="mb-4">
          <label className="block font-medium mb-1">Nombre</label>
          <input type="text" name="nombre" value={meta.nombre} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Descripción</label>
          <textarea name="descripcion" value={meta.descripcion} onChange={handleChange} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block font-medium mb-1">Fecha Inicio</label>
            <input type="date" name="fechaInicio" value={meta.fechaInicio} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
          <div>
            <label className="block font-medium mb-1">Fecha Fin</label>
            <input type="date" name="fechaFin" value={meta.fechaFin} onChange={handleChange} required className="w-full border rounded px-3 py-2" />
          </div>
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Monto</label>
          <input type="number" name="monto" value={meta.monto} onChange={handleChange} required min={0} step={0.01} className="w-full border rounded px-3 py-2" />
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Farmacia</label>
          <select name="farmaciaId" value={meta.farmaciaId} onChange={handleChange} required className="w-full border rounded px-3 py-2">
            <option value="">Selecciona una farmacia</option>
            {farmaciasUsuario.map((f) => (
              <option key={f.id} value={f.id}>{f.nombre}</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block font-medium mb-1">Estado</label>
          <select name="estado" value={meta.estado} onChange={handleChange} required className="w-full border rounded px-3 py-2">
            <option value="por_lograr">Por lograr</option>
            <option value="logrado">Logrado</option>
            <option value="no_logrado">No logrado</option>
          </select>
        </div>
        <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white font-bold py-2 rounded hover:bg-indigo-700 transition">
          {loading ? "Guardando..." : "Crear Meta"}
        </button>
        {error && <div className="mt-4 text-red-600">{error}</div>}
        {success && <div className="mt-4 text-green-600">{success}</div>}
      </form>
    </div>
  );
};

export default GestionMetas;
