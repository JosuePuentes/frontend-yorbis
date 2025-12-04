import React, { useEffect, useState } from "react";
import { useMetas} from "./useMetas";

const MetasPage: React.FC = () => {
  const { metas, loading, error, fetchMetas } = useMetas();
  const [farmaciasUsuario, setFarmaciasUsuario] = useState<{ id: string; nombre: string }[]>([]);

  useEffect(() => {
    // Obtener usuario y farmacias desde localStorage
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmaciasUsuario(farmaciasArr);
        // Buscar metas de todas las farmacias asignadas
        // Si hay más de una, buscar todas juntas
        if (farmaciasArr.length > 0) {
          // Si solo hay una farmacia, buscar por esa
          if (farmaciasArr.length === 1) {
            fetchMetas(farmaciasArr[0].id);
          } else {
            // Si hay varias, buscar todas y filtrar en frontend
            fetchMetas();
          }
        }
      } catch {
        setFarmaciasUsuario([]);
      }
    }
  }, []);

  // Filtrar metas por farmacias del usuario si hay varias
  const metasFiltradas = React.useMemo(() => {
    if (farmaciasUsuario.length === 1) return metas;
    const farmaciaIds = farmaciasUsuario.map((f) => f.id);
    return metas.filter((m) => m.farmaciaId && farmaciaIds.includes(m.farmaciaId));
  }, [metas, farmaciasUsuario]);

  return (
    <div className="max-w-5xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8 text-center text-yellow-700 drop-shadow">Metas por Localidad</h1>
      {loading && <div className="text-center text-slate-500">Cargando metas...</div>}
      {error && <div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>}
      {metasFiltradas.length === 0 ? (
        <div className="text-center text-slate-500">No hay metas asignadas a tus farmacias.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {metasFiltradas.map((meta) => {
            const farmaciaNombre = farmaciasUsuario.find((f) => f.id === meta.farmaciaId)?.nombre || meta.farmaciaId;
            return (
              <div
                key={meta._id}
                className={`rounded-xl shadow-lg p-6 border-2 border-yellow-400 hover:scale-[1.03] transition-transform duration-300 relative flex flex-col justify-between min-h-[260px]`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="inline-block px-3 py-1 bg-yellow-600 text-white text-xs font-semibold rounded-full shadow">{farmaciaNombre}</span>
                  {meta.estado === 'logrado' && (
                    <span className="ml-auto text-green-600 text-sm font-bold" title="Logrado">Logrado</span>
                  )}
                  {meta.estado === 'no_logrado' && (
                    <span className="ml-auto text-red-500 text-sm font-bold" title="No logrado">No logrado</span>
                  )}
                  {meta.estado === 'por_lograr' && (
                    <span className="ml-auto text-yellow-600 text-sm font-bold" title="Por lograr">Por lograr</span>
                  )}
                </div>
                <h2 className="text-xl font-bold text-yellow-700 mb-1">{meta.nombre}</h2>
                <p className="text-slate-700 mb-2 text-sm">{meta.descripcion || "Sin descripción"}</p>
                <div className="flex flex-col gap-1 mt-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Monto objetivo</span>
                    <span className="font-bold text-yellow-700 text-lg">USD. {meta.monto.toLocaleString("es-VE", { minimumFractionDigits: 2 })}</span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MetasPage;
