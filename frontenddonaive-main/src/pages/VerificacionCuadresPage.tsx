import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import VerificacionCuadresModal from "@/components/VerificacionCuadresModal";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const VerificacionCuadresPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [cuadresPorFarmacia, setCuadresPorFarmacia] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState<string>("");
  const [farmaciaNombreSeleccionada, setFarmaciaNombreSeleccionada] = useState<string>("");

  useEffect(() => {
    const fetchFarmacias = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/farmacias`);
        const data = await res.json();
        const lista = data.farmacias
          ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
          : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
        setFarmacias(lista);
      } catch (err: any) {
        setError("Error al obtener farmacias");
      } finally {
        setLoading(false);
      }
    };
    fetchFarmacias();
  }, []);

  useEffect(() => {
    const fetchCuadresPorFarmacia = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/cuadres/all`);
        const data = await response.json();
        const cuadresCount = data.reduce((acc: Record<string, number>, cuadre: any) => {
          if (cuadre.estado === "wait") {
            acc[cuadre.codigoFarmacia] = (acc[cuadre.codigoFarmacia] || 0) + 1;
          }
          return acc;
        }, {});
        setCuadresPorFarmacia(cuadresCount);
      } catch (err) {
        console.error("Error al obtener cuadres por farmacia", err);
      }
    };

    fetchCuadresPorFarmacia();
  }, []);

  const abrirModal = (id: string, nombre: string) => {
    setFarmaciaSeleccionada(id);
    setFarmaciaNombreSeleccionada(nombre);
    setModalAbierto(true);
  };
  const cerrarModal = () => {
    setModalAbierto(false);
    setFarmaciaSeleccionada("");
    setFarmaciaNombreSeleccionada("");
  };

  if (loading) return <div className="text-center py-10 text-lg text-gray-600">Cargando...</div>;
  if (error) return <div className="text-center text-red-600 py-10 text-lg">{error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-200 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-blue-900 mb-10 text-center tracking-tight">
          Verificación de Cuadres
        </h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {farmacias.map(farm => (
            <Card
              key={farm.id}
              className="relative bg-white p-6 rounded-2xl shadow-xl transition-transform transform hover:scale-[1.02]"
            >
              <div className="text-center text-xl font-semibold text-blue-800 mb-4">
                {farm.nombre}
              </div>
              {cuadresPorFarmacia[farm.id] && (
                <span className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                  {cuadresPorFarmacia[farm.id]}
                </span>
              )}
              <Button
                onClick={() => abrirModal(farm.id, farm.nombre)}
                className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-2 mt-4 rounded-lg"
              >
                Ver cuadres pendientes
              </Button>
            </Card>
          ))}
        </div>
        <VerificacionCuadresModal
          open={modalAbierto}
          onClose={cerrarModal}
          farmaciaId={farmaciaSeleccionada}
          farmaciaNombre={farmaciaNombreSeleccionada}
        />
      </div>
    </div>
  );
};

export default VerificacionCuadresPage;
