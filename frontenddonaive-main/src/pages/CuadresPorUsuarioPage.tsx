import React, { useEffect, useState } from "react";
import DenegarCuadresModal from "@/components/DenegarCuadresModal";

interface Farmacia {
  id: string;
  nombre: string;
}

const CuadresPorUsuarioPage: React.FC = () => {
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
    <div className="max-w-2xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Cuadres por Negocio</h1>
      {farmacias.length === 0 ? (
        <div className="text-center text-gray-500">No tienes farmacias asociadas.</div>
      ) : (
        <div className="flex flex-col gap-4">
          {farmacias.map(f => (
            <button
              key={f.id}
              className="w-full bg-blue-100 hover:bg-blue-200 border border-blue-300 rounded-lg p-4 text-lg font-semibold text-blue-900 shadow"
              onClick={() => handleSelectFarmacia(f)}
            >
              {f.nombre}
            </button>
          ))}
        </div>
      )}
      {selectedFarmacia && (
        <DenegarCuadresModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          farmaciaId={selectedFarmacia.id}
          farmaciaNombre={selectedFarmacia.nombre}
        />
      )}
    </div>
  );
};

export default CuadresPorUsuarioPage;
