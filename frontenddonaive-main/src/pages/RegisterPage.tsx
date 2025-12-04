import React, { useState } from "react";
import { useUserContext } from "@/context/UserContext";
import ModalAsignarPermisos from "@/components/ModalAsignarPermisos";
import { Button } from "@/components/ui/button";

const RegisterPage: React.FC = () => {
    const { register } = useUserContext();
    const [nombre, setNombre] = useState("");
    const [cargo, setCargo] = useState("");
    const [correo, setCorreo] = useState("");
    const [contraseña, setContraseña] = useState("");
    const [permisos, setPermisos] = useState<string[]>(["ver_cuadres"]);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [modalPermisosOpen, setModalPermisosOpen] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ok = register({
            nombre,
            cargo,
            correo,
            contraseña,
            permisos,
            accesos: []
        });
        if (ok) {
            setSuccess("Usuario registrado correctamente");
            setError("");
            // Limpiar formulario
            setNombre("");
            setCargo("");
            setCorreo("");
            setContraseña("");
            setPermisos(["ver_cuadres"]);
        } else {
            setError("El correo ya está registrado");
            setSuccess("");
        }
    };

    const handlePermisosConfirm = (nuevosPermisos: string[]) => {
        setPermisos(nuevosPermisos);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
                <h2 className="text-3xl font-bold mb-6 text-center text-gray-800">Crear Usuario</h2>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                        <input
                            type="text"
                            placeholder="Ingresa el nombre completo"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                        <input
                            type="text"
                            placeholder="Ingresa el cargo"
                            value={cargo}
                            onChange={e => setCargo(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Correo</label>
                        <input
                            type="email"
                            placeholder="Ingresa el correo electrónico"
                            value={correo}
                            onChange={e => setCorreo(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                        <input
                            type="password"
                            placeholder="Ingresa la contraseña"
                            value={contraseña}
                            onChange={e => setContraseña(e.target.value)}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Permisos Asignados</label>
                        <div className="p-3 border border-gray-300 rounded-lg bg-gray-50">
                            <p className="text-sm text-gray-600 mb-2">
                                {permisos.length} permiso(s) seleccionado(s)
                            </p>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setModalPermisosOpen(true)}
                                className="w-full"
                            >
                                {permisos.length === 0 ? "Seleccionar Permisos" : "Modificar Permisos"}
                            </Button>
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-600 text-sm">{error}</p>
                        </div>
                    )}
                    
                    {success && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-600 text-sm">{success}</p>
                        </div>
                    )}
                    
                    <Button 
                        type="submit" 
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
                    >
                        Crear Usuario
                    </Button>
                </form>
            </div>

            <ModalAsignarPermisos
                open={modalPermisosOpen}
                onClose={() => setModalPermisosOpen(false)}
                onConfirm={handlePermisosConfirm}
                permisosIniciales={permisos}
            />
        </div>
    );
};

export default RegisterPage;