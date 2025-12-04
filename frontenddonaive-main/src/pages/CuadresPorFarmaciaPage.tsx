import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import CuadresModal from "@/components/CuadresModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CuadresPorFarmaciaPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");
  const [farmaciaNombreSeleccionada, setFarmaciaNombreSeleccionada] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmacias = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      } catch (err: any) {
        setError("Error al obtener farmacias");
      }
    };
    fetchFarmacias();
  }, []);

  const abrirModal = async (farmaciaId: string, farmaciaNombre: string) => {
    setFarmaciaSeleccionada(farmaciaId);
    setFarmaciaNombreSeleccionada(farmaciaNombre);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setFarmaciaSeleccionada("");
    setFarmaciaNombreSeleccionada("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-blue-900 mb-6 text-center">Cuadres por Día</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {farmacias.map(farm => (
            <Card key={farm.id} className="p-4 flex flex-col items-center">
              <div className="font-bold text-blue-700 text-lg mb-2">{farm.nombre}</div>
              <Button onClick={() => abrirModal(farm.id, farm.nombre)} className="mt-2">Ver cuadres</Button>
            </Card>
          ))}
        </div>
        <CuadresModal
          open={modalAbierto}
          onClose={cerrarModal}
          farmaciaId={farmaciaSeleccionada}
          farmaciaNombre={farmaciaNombreSeleccionada}
        />
      </div>
    </div>
  );
};

export default CuadresPorFarmaciaPage;
