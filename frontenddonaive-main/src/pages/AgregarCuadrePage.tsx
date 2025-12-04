import React, { useState } from 'react';
import AgregarCuadreModal from '../components/AgregarCuadreModal';

const usuario = (() => {
    try {
        const raw = localStorage.getItem("usuario");
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
})();

const farmacias = usuario?.farmacias || {};

const AgregarCuadrePage: React.FC = () => {
    const [mostrarModal, setMostrarModal] = useState(false);
    const [farmacia, setFarmacia] = useState<string>(Object.keys(farmacias)[0] || "");
    const [dia, setDia] = useState<string>(new Date().toISOString().slice(0, 10));
    const [mensaje, setMensaje] = useState<string>("");
    const [inputTouched, setInputTouched] = useState<{ farmacia: boolean; dia: boolean }>({ farmacia: false, dia: false });

    const handleAgregarCuadre = () => {
        setMostrarModal(true);
    };

    const handleCloseModal = (exito?: boolean, sobrante?: number, faltante?: number) => {
        setMostrarModal(false);
        if (exito) {
            let mensaje = "¡Cuadre agregado exitosamente!";
            if (typeof sobrante === "number" || typeof faltante === "number") {
                mensaje += `\nSobrante: ${sobrante ?? 0} | Faltante: ${faltante ?? 0}`;
            }
            setMensaje(mensaje);
            setTimeout(() => setMensaje(""), 5000);
            setFarmacia(Object.keys(farmacias)[0] || "");
            setDia(new Date().toISOString().slice(0, 10));
            setInputTouched({ farmacia: false, dia: false });
        }
    };

    const isFormValid = farmacia && dia;

    return (
        <div className="flex flex-col items-center py-8">
            <h1 className="text-2xl font-bold mb-6 text-blue-800">Agregar Cuadre</h1>
            {mensaje && (
                <div className="mb-4 px-4 py-2 bg-green-100 text-green-800 rounded border border-green-300 transition-all">
                    {mensaje}
                </div>
            )}
            <div className="mb-4 w-full max-w-md">
                <label className="block text-sm">Farmacia</label>
                <select
                    value={farmacia}
                    onChange={e => {
                        setFarmacia(e.target.value);
                        setInputTouched(t => ({ ...t, farmacia: true }));
                    }}
                    className={`w-full border rounded p-2 transition-all ${inputTouched.farmacia && !farmacia ? 'border-red-500' : ''}`}
                    required
                    onBlur={() => setInputTouched(t => ({ ...t, farmacia: true }))}
                >
                    <option value="">Seleccione una farmacia</option>
                    {Object.entries(farmacias).map(([codigo, nombre]) => (
                        <option key={codigo} value={codigo}>
                            {String(nombre)} ({String(codigo)})
                        </option>
                    ))}
                </select>
                {inputTouched.farmacia && !farmacia && (
                    <span className="text-xs text-red-500">Seleccione una farmacia.</span>
                )}
            </div>
            <div className="mb-4 w-full max-w-md">
                <label className="block text-sm">Día</label>
                <input
                    type="date"
                    value={dia}
                    onChange={e => {
                        setDia(e.target.value);
                        setInputTouched(t => ({ ...t, dia: true }));
                    }}
                    className={`w-full border rounded p-2 transition-all ${inputTouched.dia && !dia ? 'border-red-500' : ''}`}
                    required
                    onBlur={() => setInputTouched(t => ({ ...t, dia: true }))}
                />
                {inputTouched.dia && !dia && (
                    <span className="text-xs text-red-500">Seleccione un día.</span>
                )}
            </div>
            <button
                className={`bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-all ${!isFormValid ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleAgregarCuadre}
                disabled={!isFormValid}
            >
                Agregar Cuadre
            </button>
            {mostrarModal && (
                <AgregarCuadreModal
                    dia={dia}
                    farmacia={farmacia}
                    onClose={handleCloseModal}
                />
            )}
        </div>
    );
};

export default AgregarCuadrePage;