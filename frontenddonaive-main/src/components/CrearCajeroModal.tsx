import React, { useState, useEffect } from "react";

interface CrearCajeroModalProps {
    open: boolean;
    onClose: () => void;
}

interface Farmacia {
  id: string;
  nombre: string;
}

const TIPOS_COMISION = ["Extra", "Especial", "Turno"];

const CrearCajeroModal: React.FC<CrearCajeroModalProps> = ({ open, onClose }) => {
    const [formData, setFormData] = useState({
        NOMBRE: "",
        ID: "",
        comision: 0,
        estado: "activo",
        FARMACIAS: [] as string[],
        tipocomision: ["", "", ""], // [extra, especial, turno]
    });

    const [farmacias, setFarmacias] = useState<Farmacia[]>([]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        if (name === "extra") {
            setFormData((prev) => ({ ...prev, tipocomision: [value, prev.tipocomision[1], prev.tipocomision[2]] }));
        } else if (name === "especial") {
            setFormData((prev) => ({ ...prev, tipocomision: [prev.tipocomision[0], value, prev.tipocomision[2]] }));
        } else if (name === "turno") {
            setFormData((prev) => ({ ...prev, tipocomision: [prev.tipocomision[0], prev.tipocomision[1], value] }));
        } else {
            setFormData({ ...formData, [name]: value });
        }
    };

    const toggleFarmaciaSelection = (id: string) => {
      setFormData((prevFormData) => {
        const isSelected = prevFormData.FARMACIAS.includes(id);
        const updatedFarmacias = isSelected
          ? prevFormData.FARMACIAS.filter((farmaciaId) => farmaciaId !== id)
          : [...prevFormData.FARMACIAS, id];
        return { ...prevFormData, FARMACIAS: updatedFarmacias }; // Correctly update FARMACIAS key
      });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const { FARMACIAS: selectedFarmacias, ...restFormData } = formData;
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

            const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cajeros`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(transformedFormData),
            });

            if (!res.ok) {
                throw new Error("Error al crear el cajero");
            }

            alert("Cajero creado exitosamente");
            onClose();
        } catch (error) {
            console.error("Error al crear el cajero:", error);
            alert("Hubo un error al crear el cajero");
        }
    };

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
                <h2 className="text-xl font-bold mb-4">Crear Nuevo Cajero</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            name="NOMBRE" // Updated to match formData key
                            id="nombre"
                            value={formData.NOMBRE}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="id" className="block text-sm font-medium text-gray-700 mb-1">ID</label>
                        <input
                            type="text"
                            name="ID" // Updated to match formData key
                            id="id"
                            value={formData.ID}
                            onChange={handleChange}
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
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
                            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm bg-white focus:border-green-500 focus:ring-1 focus:ring-green-500 transition"
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
                                    className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm transition focus:outline-none ${formData.tipocomision.includes(tipo) ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"}`}
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
                              className={`px-3 py-1 rounded-full text-sm font-medium shadow-sm transition focus:outline-none ${formData.FARMACIAS.includes(farmacia.id) ? "bg-green-500 text-white" : "bg-gray-200 text-gray-700"}`}
                            >
                              {farmacia.nombre}
                            </button>
                          ))}
                        </div>
                    </div>
                    <div className="pt-4">
                        <button
                            type="submit"
                            className="w-full bg-green-500 text-white text-sm font-medium py-2.5 rounded-lg shadow hover:bg-green-600 transition focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-green-500"
                        >
                            Crear Cajero
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CrearCajeroModal;
