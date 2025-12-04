import React, { createContext, useContext, useState } from "react";
import { farmacias, cuadreCajasSantaElena, cuadreCajasMilagroNorte } from "../data";
import type { CuadreCaja } from "../data";

// Aquí puedes agregar más datos de cuadre de caja por farmacia en el futuro
const cuadreCajasPorFarmacia: Record<string, CuadreCaja[]> = {
    "santa elena": cuadreCajasSantaElena,
    "milagro norte": cuadreCajasMilagroNorte,
    // ...
};

interface DataFarmaciaContextProps {
    farmacias: string[];
    selectedFarmacia: string;
    setSelectedFarmacia: (farmacia: string) => void;
    getCuadreCajasByFarmacia: (farmacia: string) => CuadreCaja[];
    getCuadreCajasByFarmaciaAndDia: (farmacia: string, dia: string) => CuadreCaja[];
    getAllCuadreCajasByFarmaciaAndDia: (farmacia: string, dia: string) => CuadreCaja[];
    deleteCuadreCaja: (farmacia: string, dia: string, cajaNumero: number) => void; // <--- NUEVO
    addCuadreCaja: (farmacia: string, cuadre: CuadreCaja) => void;
}

// Define and export the context
export const DataFarmaciaContext = createContext<DataFarmaciaContextProps | undefined>(undefined);

// Cambia cuadreCajasPorFarmacia a estado para poder actualizarlo
export const DataFarmaciaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [selectedFarmacia, setSelectedFarmacia] = useState<string>(farmacias[0]);
    const [cuadreCajasState, setCuadreCajasState] = useState(cuadreCajasPorFarmacia);

    const getCuadreCajasByFarmacia = (farmacia: string): CuadreCaja[] => {
        return cuadreCajasState[farmacia] || [];
    };

    const getCuadreCajasByFarmaciaAndDia = (farmacia: string, dia: string): CuadreCaja[] => {
        return (cuadreCajasState[farmacia] || []).filter(cuadre => cuadre.dia === dia && !cuadre.delete);
    };

    // Mostrar TODOS (incluyendo eliminados) para el detalle
    const getAllCuadreCajasByFarmaciaAndDia = (farmacia: string, dia: string): CuadreCaja[] => {
        return (cuadreCajasState[farmacia] || []).filter(cuadre => cuadre.dia === dia);
    };

    // Marcar como eliminado
    const deleteCuadreCaja = (farmacia: string, dia: string, cajaNumero: number) => {
        setCuadreCajasState(prev => ({
            ...prev,
            [farmacia]: prev[farmacia].map(c =>
                c.dia === dia && c.cajaNumero === cajaNumero
                    ? { ...c, delete: true }
                    : c
            ),
        }));
    };

    const addCuadreCaja = (farmacia: string, cuadre: CuadreCaja) => {
        setCuadreCajasState(prev => ({
            ...prev,
            [farmacia]: prev[farmacia]
                ? [...prev[farmacia], cuadre]
                : [cuadre]
        }));
    };

    return (
        <DataFarmaciaContext.Provider
            value={{
                farmacias,
                selectedFarmacia,
                setSelectedFarmacia,
                getCuadreCajasByFarmacia,
                getCuadreCajasByFarmaciaAndDia,
                getAllCuadreCajasByFarmaciaAndDia, // <-- agrega esto
                deleteCuadreCaja,
                addCuadreCaja,
            }}
        >
            {children}
        </DataFarmaciaContext.Provider>
    );
};

export function useDataFarmaciaContext() {
    const context = useContext(DataFarmaciaContext);
    if (!context) {
        throw new Error("useDataFarmaciaContext debe usarse dentro de DataFarmaciaProvider");
    }
    return context;
}

// Asegúrate de que el tipo CuadreCaja en este archivo incluya puntosVenta y estado.