import VerGastosModal from "@/components/VerGastosModal";
import React, { useEffect, useState } from "react";

interface Farmacia {
  id: string;
  nombre: string;
}

const GastosPorUsuarioPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);
  const [selectedFarmacia, setSelectedFarmacia] = useState<Farmacia | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    // Obtener farmacias del usuario autenticado desde localStorage
    const usuarioRaw = localStorage.getItem("usuario");
    if (usuarioRaw) {
      try {
        const usuario = JSON.parse(usuarioRaw);
        const farmaciasObj = usuario.farmacias || {};
        const farmaciasArr = Object.entries(farmaciasObj).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(farmaciasArr);
      } catch {
        setFarmacias([]);
      }
    }
  }, []);

  const handleSelectFarmacia = (farmacia: Farmacia) => {
    setSelectedFarmacia(farmacia);
    setModalOpen(true);
  };

  return (
    <div className="w-full max-w-2xl mx-auto py-8 px-2 sm:px-4">
      <h1 className="text-2xl sm:text-3xl font-bold text-red-800 mb-6 text-center">Gastos por Negocio</h1>
      {farmacias.length === 0 ? (
        <div className="text-center text-gray-500">No tienes farmacias asociadas.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {farmacias.map(f => (
            <button
              key={f.id}
              className="w-full bg-red-100 hover:bg-red-200 border border-red-300 rounded-lg p-3 sm:p-4 text-base sm:text-lg font-semibold text-red-900 shadow transition-all duration-200"
              onClick={() => handleSelectFarmacia(f)}
              tabIndex={0}
              onWheel={e => e.currentTarget.blur()} // Evita scroll accidental en el botón
            >
              {f.nombre}
            </button>
          ))}
        </div>
      )}
      {selectedFarmacia && (
        <div>
          <VerGastosModal
            open={modalOpen}
            onClose={() => setModalOpen(false)}
            farmaciaId={selectedFarmacia.id}
            farmaciaNombre={selectedFarmacia.nombre}
          />
        </div>
      )}
    </div>
  );
};

export default GastosPorUsuarioPage;
