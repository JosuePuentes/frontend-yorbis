import React from "react";
import { useCuadresFarmacia } from "@/hooks/useCuadresFarmacia";

interface Props {
    farmaciaId: string;
    fechaInicio?: string;
    fechaFin?: string;
}

const ListaCuadresFarmacia: React.FC<Props> = ({ farmaciaId, fechaInicio, fechaFin }) => {
    const { data, isLoading, error } = useCuadresFarmacia(farmaciaId);
    // Filtrar por fecha si se proveen los props
    const dataFiltrada = data && Array.isArray(data)
        ? data.filter((cuadre: any) => {
            if (fechaInicio && cuadre.dia < fechaInicio) return false;
            if (fechaFin && cuadre.dia > fechaFin) return false;
            return true;
        })
        : data;

    if (isLoading) return <div>Cargando cuadres...</div>;
    if (error) return <div>Error al cargar cuadres</div>;

    // Chip visual reutilizable para estado de cuadre
    const EstadoChip: React.FC<{ estado: string }> = ({ estado }) => {
        let color = "bg-gray-200 text-gray-700";
        let label = estado;
        switch (estado) {
            case "wait":
                color = "bg-yellow-100 text-yellow-700 border border-yellow-400";
                label = "Pendiente";
                break;
            case "verified":
                color = "bg-green-100 text-green-700 border border-green-400";
                label = "Verificado";
                break;
            case "denied":
                color = "bg-red-100 text-red-700 border border-red-400";
                label = "Rechazado";
                break;
            default:
                color = "bg-gray-200 text-gray-700";
                label = estado;
        }
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold shadow-sm ${color}`}>{label}</span>
        );
    };

    return (
        <div>
            {dataFiltrada && dataFiltrada.length > 0 ? (
                <ul>
                    {dataFiltrada.map((cuadre: any) => (
                        <li key={cuadre._id} className="mb-2 border-b pb-2 flex flex-wrap items-center gap-2">
                            Día: <span className="font-mono">{cuadre.dia}</span> |
                            <span className="">Cajero: <span className="font-semibold">{cuadre.cajero || 'N/D'}</span></span> |
                            <span className="">Turno: <span className="font-semibold">{cuadre.turno || 'N/D'}</span></span> |
                            Sobrante: <span className="font-semibold">${cuadre.sobranteUsd}</span> |
                            Faltante: <span className="font-semibold">${cuadre.faltanteUsd}</span> |
                            <EstadoChip estado={cuadre.estado} />
                        </li>
                    ))}
                </ul>
            ) : (
                <div>No hay cuadres registrados.</div>
            )}
        </div>
    );
};

export default ListaCuadresFarmacia;