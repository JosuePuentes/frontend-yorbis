import React, { useState, useEffect } from "react";

interface EditarCajeroModalProps {
  open: boolean;
  onClose: () => void;
  cajero: {
    _id: string;
    id: string;
    nombre: string;
    farmacias: Record<string, string>;
    comision: number;
    estado: string;
    tipocomision?: string;
    turno?: string;
    especial?: string;
    extra?: string;
  };
}

interface Farmacia {
  id: string;
  nombre: string;
}

const TIPOS_COMISION = ["Extra", "Especial", "Turno"];

const EditarCajeroModal: React.FC<EditarCajeroModalProps> = ({ open, onClose, cajero }) => {
  const [formData, setFormData] = useState({
    _id: cajero._id,
    id: cajero.id,
    nombre: cajero.nombre,
    comision: cajero.comision,
    estado: cajero.estado,
    farmacias: Object.keys(cajero.farmacias),
    tipocomision: Array.isArray(cajero.tipocomision)
      ? cajero.tipocomision
      : (typeof cajero.tipocomision === "string" && cajero.tipocomision
          ? [cajero.tipocomision]
          : (cajero.tipocomision === undefined || cajero.tipocomision === null)
            ? []
            : []),
  });
  const [farmacias, setFarmacias] = useState<Farmacia[]>([]);

  useEffect(() => {
    const fetchFarmacias = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/farmacias`);
        const data = await res.json();
        const transformedFarmacias = Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: nombre as string }));
        setFarmacias(transformedFarmacias);
      } catch (error) {
        console.error("Error al cargar las farmacias:", error);
      }
    };
    fetchFarmacias();
  }, []);

  useEffect(() => {
    setFormData({
      _id: cajero._id,
      id: cajero.id,
      nombre: cajero.nombre,
      comision: cajero.comision,
      estado: cajero.estado,
      farmacias: Object.keys(cajero.farmacias),
      tipocomision: Array.isArray(cajero.tipocomision)
        ? cajero.tipocomision
        : (typeof cajero.tipocomision === "string" && cajero.tipocomision
            ? [cajero.tipocomision]
            : (cajero.tipocomision === undefined || cajero.tipocomision === null)
              ? []
              : []),
    });
  }, [cajero]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const toggleFarmaciaSelection = (id: string) => {
    setFormData((prevFormData) => {
      const isSelected = prevFormData.farmacias.includes(id);
      const updatedFarmacias = isSelected
        ? prevFormData.farmacias.filter((farmaciaId) => farmaciaId !== id)
        : [...prevFormData.farmacias, id];
      return { ...prevFormData, farmacias: updatedFarmacias };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { farmacias: selectedFarmacias, ...restFormData } = formData;
      const transformedFormData = {
        ...restFormData,
        FARMACIAS: selectedFarmacias.reduce((acc, id) => {
          const farmacia = farmacias.find((f) => f.id === id);
          if (farmacia) {
            acc[id] = farmacia.nombre;
          }
          return acc;
        }, {} as Record<string, string>),
        tipocomision: formData.tipocomision,
      };

      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cajeros/${cajero._id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedFormData),
      });

      if (!res.ok) {
        throw new Error("Error al actualizar el cajero");
      }

      alert("Cajero actualizado exitosamente");
      onClose();
      window.location.reload(); // <-- Recarga la página después de cerrar el modal
    } catch (error) {
      console.error("Error al actualizar el cajero:", error);
      alert("Hubo un error al actualizar el cajero");
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-white bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 text-red-500 hover:text-gray-700 focus:outline-none text-2xl font-bold"
        >
          &times;
        </button>
        <h2 className="text-xl font-bold mb-4">Editar Cajero</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">ID</label>
            <input
              type="text"
              name="id"
              id="id"
              value={formData.id}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
            <input
              type="text"
              name="nombre"
              id="nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="comision" className="block text-sm font-medium text-gray-700 mb-1">Comisión (%)</label>
            <input
              type="number"
              name="comision"
              id="comision"
              value={formData.comision}
              onChange={e => {
                const value = e.target.value;
                setFormData(prev => ({ ...prev, comision: value === '' ? 0 : parseFloat(value) }));
              }}
              step="0.01"
              min="0"
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            />
          </div>
          <div>
            <label htmlFor="estado" className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              name="estado"
              id="estado"
              value={formData.estado}
              onChange={handleChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm bg-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
              required
            >
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo Comisión</label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_COMISION.map((tipo) => (
                <button
                  key={tipo}
                  type="button"
                  onClick={() => {
                    setFormData((prev) => {
                      const selected = prev.tipocomision.includes(tipo);
                      let newTipos = selected
                          ? prev.tipocomision.filter((t: string) => t !== tipo)
                          : [...prev.tipocomision, tipo];
                      return { ...prev, tipocomision: newTipos };
                    });
                  }}
                  className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm transition focus:outline-none ${formData.tipocomision.includes(tipo) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                >
                  {tipo}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label htmlFor="farmacias" className="block text-sm font-medium text-gray-700 mb-1">Farmacias</label>
            <div className="flex flex-wrap gap-2">
              {farmacias.map((farmacia) => (
                <button
                  key={farmacia.id}
                  type="button"
                  onClick={() => toggleFarmaciaSelection(farmacia.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm transition focus:outline-none ${formData.farmacias.includes(farmacia.id) ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}
                >
                  {farmacia.nombre}
                </button>
              ))}
            </div>
          </div>
          <div className="pt-4">
            <button
              type="submit"
              className="w-full bg-blue-500 text-white text-sm font-medium py-2.5 rounded-lg shadow hover:bg-blue-600 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500"
            >
              Guardar Cambios
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarCajeroModal;
