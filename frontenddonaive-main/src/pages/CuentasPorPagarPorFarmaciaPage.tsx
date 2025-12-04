import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ListaCuentasPorPagarFarmacia from "@/components/ListaCuentasPorPagarFarmacia";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const CuentasPorPagarPorFarmaciaPage: React.FC = () => {
  const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
  const [mostrarLista, setMostrarLista] = useState(false);
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

  const abrirLista = (farmaciaId: string, farmaciaNombre: string) => {
    setFarmaciaSeleccionada(farmaciaId);
    setFarmaciaNombreSeleccionada(farmaciaNombre);
    setMostrarLista(true);
  };

  const cerrarLista = () => {
    setMostrarLista(false);
    setFarmaciaSeleccionada("");
    setFarmaciaNombreSeleccionada("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-200 p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-green-900 mb-6 text-center">Cuentas por Pagar por Farmacia</h1>
        {error && <div className="text-red-600 mb-4">{error}</div>}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {farmacias.map(farm => (
            <Card key={farm.id} className="p-4 flex flex-col items-center">
              <div className="font-bold text-green-700 text-lg mb-2">{farm.nombre}</div>
              <Button onClick={() => abrirLista(farm.id, farm.nombre)} className="mt-2">Ver cuentas por pagar</Button>
            </Card>
          ))}
        </div>
        {mostrarLista && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-green-800">Cuentas por Pagar de {farmaciaNombreSeleccionada}</h2>
              <Button variant="outline" onClick={cerrarLista}>Cerrar</Button>
            </div>
            <ListaCuentasPorPagarFarmacia farmaciaId={farmaciaSeleccionada} />
          </div>
        )}
      </div>
    </div>
  );
};

export default CuentasPorPagarPorFarmaciaPage;
