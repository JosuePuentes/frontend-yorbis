import React, { useState } from "react";
import { useNavigate } from "react-router";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;
const LoginPage: React.FC = () => {
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ correo, contraseña }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.detail || "Error al iniciar sesión");
            }

            // Guardar el token y el usuario en localStorage
            console.log('[Login] Guardando token:', data.access_token ? 'Token recibido' : 'Token NO recibido');
            localStorage.setItem("access_token", data.access_token);
            localStorage.setItem("usuario", JSON.stringify(data.usuario));
            console.log('[Login] Token guardado en localStorage:', localStorage.getItem("access_token") ? '✅ Token guardado correctamente' : '❌ Error al guardar token');

            // Navegar a la página principal
            navigate("/");

            // Recargar la página para reflejar los cambios
            setTimeout(() => {
                window.location.reload();
            }, 100);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-blue-100">
            <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm">
                <h2 className="text-2xl font-bold mb-4 text-center">Iniciar Sesión</h2>
                <input
                    type="email"
                    placeholder="Correo"
                    value={correo}
                    onChange={e => setCorreo(e.target.value)}
                    className="w-full mb-2 p-2 border rounded"
                    required
                />
                <input
                    type="password"
                    placeholder="Contraseña"
                    value={contraseña}
                    onChange={e => setContraseña(e.target.value)}
                    className="w-full mb-4 p-2 border rounded"
                    required
                />
                {error && <p className="text-red-500 mb-2">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {loading ? "Cargando..." : "Ingresar"}
                </button>
            </form>
        </div>
    );
};

export default LoginPage;
