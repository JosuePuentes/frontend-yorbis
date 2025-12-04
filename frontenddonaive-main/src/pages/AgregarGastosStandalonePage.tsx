import React, { useState } from "react";
import VerGastosModal from "@/components/VerGastosModal";

const AgregarGastosStandalonePage: React.FC = () => {
  // Simula una farmacia para el modal (puedes ajustar esto según tu lógica de usuario)
  const [modalOpen, setModalOpen] = useState(true);
  // Puedes obtener estos valores de contexto o props si lo deseas
  const farmaciaId = ""; // Coloca aquí el id de la farmacia si lo tienes
  const farmaciaNombre = "Selecciona una farmacia";

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-green-200 p-4">
      <div className="w-full max-w-2xl">
        <VerGastosModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          farmaciaId={farmaciaId}
          farmaciaNombre={farmaciaNombre}
        />
      </div>
    </div>
  );
};

export default AgregarGastosStandalonePage;
