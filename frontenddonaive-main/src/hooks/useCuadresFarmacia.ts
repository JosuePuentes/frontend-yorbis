import { useQuery } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export function useCuadresFarmacia(farmaciaId: string) {
    return useQuery({
        queryKey: ["cuadres", farmaciaId],
        queryFn: async () => {
            const res = await fetch(`${API_BASE_URL}/cuadres/${farmaciaId}`, {
                method: "GET",
            });
            if (!res.ok) throw new Error("Error al obtener cuadres");
            const data = await res.json();

            // Asegúrate de que cada objeto tenga sobranteUsd y faltanteUsd, y si no existen, calcúlalos a partir de diferenciaUsd
            const cuadresConSobranteYFaltante = data.map((cuadre: any) => ({
                ...cuadre,
                sobranteUsd: cuadre.sobranteUsd ?? (cuadre.diferenciaUsd > 0 ? cuadre.diferenciaUsd : 0),
                faltanteUsd: cuadre.faltanteUsd ?? (cuadre.diferenciaUsd < 0 ? Math.abs(cuadre.diferenciaUsd) : 0),
            }));

            return cuadresConSobranteYFaltante;
        },
        enabled: !!farmaciaId,
    });
}