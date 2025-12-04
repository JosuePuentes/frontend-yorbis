import React, { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const AgregarInventarioPage: React.FC = () => {
    const [farmacias, setFarmacias] = useState<{ id: string; nombre: string }[]>([]);
    const [farmaciaSeleccionada, setFarmaciaSeleccionada] = useState("");
    const [costo, setCosto] = useState("");
    const [mensaje, setMensaje] = useState("");
    const [loading, setLoading] = useState(false);

    // Obtener usuario directamente del localStorage
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
    const correoUsuario = usuario?.correo || "";

    useEffect(() => {
        fetch(`${API_BASE_URL}/farmacias`)
            .then(res => res.json())
            .then(data => {
                const lista = data.farmacias
                    ? Object.entries(data.farmacias).map(([id, nombre]) => ({ id, nombre: String(nombre) }))
                    : Object.entries(data).map(([id, nombre]) => ({ id, nombre: String(nombre) }));
                setFarmacias(lista);
            });
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMensaje("");
        console.log("Datos enviados:", {
            farmaciaSeleccionada,
            costo,
            usuarioCorreo: correoUsuario, // Tomado del localStorage
        });
        if (!farmaciaSeleccionada || !costo) {
            setMensaje("Por favor, completa todos los campos.");
            setLoading(false);
            return;
        }
        if (isNaN(parseFloat(costo)) || parseFloat(costo) < 0) {
            setMensaje("El costo debe ser un número positivo.");
            setLoading(false);
            return;
        }
        try {
            const token = localStorage.getItem("access_token");
            const res = await fetch(`${API_BASE_URL}/inventarios`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({
                    farmacia: farmaciaSeleccionada,
                    costo: parseFloat(costo),
                    usuarioCorreo: correoUsuario, // Tomado del localStorage
                }),
            });
            if (!res.ok) throw new Error(`Error al guardar inventario {body: ${res.statusText}}`);
            setMensaje("Inventario guardado correctamente");
            setCosto("");
            setFarmaciaSeleccionada("");
        } catch (error) {
            setMensaje("Error al guardar inventario");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100 p-6">
            <Card className="max-w-md w-full p-8 rounded-2xl shadow-xl border-2 border-blue-400">
                <h2 className="text-2xl font-bold text-blue-800 mb-6 text-center">Registrar Costo de Inventario</h2>
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    <div>
                        <label className="block mb-1 font-semibold text-blue-700">Farmacia</label>
                        <select
                            className="w-full border rounded px-3 py-2"
                            value={farmaciaSeleccionada}
                            onChange={e => setFarmaciaSeleccionada(e.target.value)}
                            required
                        >
                            <option value="">Selecciona una farmacia</option>
                            {farmacias.map(f => (
                                <option key={f.id} value={f.id}>{f.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block mb-1 font-semibold text-blue-700">Costo del Inventario (USD)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.0001"
                            className="w-full border rounded px-3 py-2"
                            value={costo}
                            onChange={e => setCosto(e.target.value)}
                            required
                        />
                    </div>
                    <Button
                        type="submit"
                        className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-2 rounded-lg"
                        disabled={loading}
                    >
                        {loading ? "Guardando..." : "Guardar Inventario"}
                    </Button>
                    {mensaje && (
                        <div className={`text-center mt-2 font-semibold ${mensaje.includes("Error") ? "text-red-600" : "text-green-700"}`}>
                            {mensaje}
                        </div>
                    )}
                </form>
            </Card>
        </div>
    );
};

export default AgregarInventarioPage;