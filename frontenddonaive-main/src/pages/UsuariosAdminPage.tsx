import React, { useEffect, useState } from "react";

interface Usuario {
  _id?: string;
  correo: string;
  contraseña: string;
  farmacias: Record<string, string>;
  permisos: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const PERMISOS = [
  "ver_inicio",
  "ver_about",
  "agregar_cuadre",
  "ver_resumen_mensual",
  "verificar_cuadres",
  "ver_cuadres_dia",
  "ver_resumen_dia",
  "acceso_admin",
  "eliminar_cuadres",
  "ver_ventas_totales",
  "verificar_gastos"
];

const UsuariosAdminPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [nuevo, setNuevo] = useState<Usuario>({ correo: "", contraseña: "", farmacias: {}, permisos: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsuarios = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/usuarios`);
      const data = await res.json();
      setUsuarios(data);
    } catch {
      setError("Error al obtener usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>, key: keyof Usuario, isEdit = false) => {
    const value = e.target.value;
    if (isEdit && editando) {
      setEditando({ ...editando, [key]: value });
    } else if (!isEdit) {
      setNuevo({ ...nuevo, [key]: value });
    }
  };

  const handlePermisoChange = (permiso: string, isEdit = false) => {
    if (isEdit && editando) {
      setEditando({
        ...editando,
        permisos: editando.permisos.includes(permiso)
          ? editando.permisos.filter(p => p !== permiso)
          : [...editando.permisos, permiso]
      });
    } else if (!isEdit) {
      setNuevo({
        ...nuevo,
        permisos: nuevo.permisos.includes(permiso)
          ? nuevo.permisos.filter(p => p !== permiso)
          : [...nuevo.permisos, permiso]
      });
    }
  };

  const handleGuardar = async () => {
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API_BASE_URL}/usuarios`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevo)
      });
      setNuevo({ correo: "", contraseña: "", farmacias: {}, permisos: [] });
      fetchUsuarios();
    } catch {
      setError("Error al crear usuario");
    } finally {
      setLoading(false);
    }
  };

  const handleActualizar = async () => {
    if (!editando?._id) return;
    setLoading(true);
    setError(null);
    try {
      await fetch(`${API_BASE_URL}/usuarios/${editando._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editando)
      });
      setEditando(null);
      fetchUsuarios();
    } catch {
      setError("Error al actualizar usuario");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Administrar Usuarios</h1>
      {error && <div className="text-red-600 mb-4">{error}</div>}
      <div className="mb-8 border p-4 rounded-lg bg-blue-50">
        <h2 className="font-semibold mb-2">Crear nuevo usuario</h2>
        <div className="flex flex-col gap-2 mb-2">
          <input type="email" placeholder="Correo" value={nuevo.correo} onChange={e => handleInput(e, "correo")}
            className="border rounded px-2 py-1" />
          <input type="password" placeholder="Contraseña" value={nuevo.contraseña} onChange={e => handleInput(e, "contraseña")}
            className="border rounded px-2 py-1" />
          <div>
            <label className="block text-xs text-gray-600">Farmacias (id:nombre, separadas por coma)</label>
            <input type="text" placeholder="01:Santa Elena,02:Sur America" value={Object.entries(nuevo.farmacias).map(([id, nombre]) => `${id}:${nombre}`).join(",")}
              onChange={e => {
                const obj: Record<string, string> = {};
                e.target.value.split(",").forEach(pair => {
                  const [id, nombre] = pair.split(":");
                  if (id && nombre) obj[id.trim()] = nombre.trim();
                });
                setNuevo({ ...nuevo, farmacias: obj });
              }}
              className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-xs text-gray-600">Permisos</label>
            <div className="flex flex-wrap gap-2">
              {PERMISOS.map(p => (
                <label key={p} className="flex items-center gap-1">
                  <input type="checkbox" checked={nuevo.permisos.includes(p)} onChange={() => handlePermisoChange(p)} />
                  <span className="text-xs">{p}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded mt-2" onClick={handleGuardar} disabled={loading}>Crear usuario</button>
      </div>
      <h2 className="font-semibold mb-2">Usuarios existentes</h2>
      {loading ? <div>Cargando...</div> : (
        <div className="space-y-4">
          {usuarios.map(u => (
            <div key={u._id} className="border p-3 rounded-lg bg-white flex flex-col gap-1">
              {editando?._id === u._id ? (
                <>
                  <input type="email" value={editando?.correo ?? ""} onChange={e => handleInput(e, "correo", true)} className="border rounded px-2 py-1" />
                  <input type="password" value={editando?.contraseña ?? ""} onChange={e => handleInput(e, "contraseña", true)} className="border rounded px-2 py-1" />
                  <input type="text" value={Object.entries(editando?.farmacias ?? {}).map(([id, nombre]) => `${id}:${nombre}`).join(",")}
                    onChange={e => {
                      const obj: Record<string, string> = {};
                      e.target.value.split(",").forEach(pair => {
                        const [id, nombre] = pair.split(":");
                        if (id && nombre) obj[id.trim()] = nombre.trim();
                      });
                      setEditando(editando ? { ...editando, farmacias: obj } : null);
                    }}
                    className="border rounded px-2 py-1 w-full" />
                  <div className="flex flex-wrap gap-2">
                    {PERMISOS.map(p => (
                      <label key={p} className="flex items-center gap-1">
                        <input type="checkbox" checked={!!editando?.permisos?.includes(p)} onChange={() => handlePermisoChange(p, true)} />
                        <span className="text-xs">{p}</span>
                      </label>
                    ))}
                  </div>
                  <button className="bg-green-600 text-white px-3 py-1 rounded mt-2" onClick={handleActualizar} disabled={loading}>Guardar</button>
                  <button className="bg-gray-400 text-white px-3 py-1 rounded mt-2 ml-2" onClick={() => setEditando(null)}>Cancelar</button>
                </>
              ) : (
                <>
                  <div><b>Correo:</b> {u.correo}</div>
                  <div><b>Farmacias:</b> {Object.entries(u.farmacias).map(([id, nombre]) => `${id}:${nombre}`).join(", ")}</div>
                  <div><b>Permisos:</b> {u.permisos.join(", ")}</div>
                  <button className="bg-yellow-500 text-white px-3 py-1 rounded mt-2" onClick={() => setEditando(u)}>Editar</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UsuariosAdminPage;
