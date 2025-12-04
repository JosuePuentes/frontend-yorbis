import CrearCajeroModal from "@/components/CrearCajeroModal";
import EditarCajeroModal from "@/components/EditarCajeroModal";
import React, { useEffect, useState } from "react";

interface Cajero {
  _id: string; // Add _id field
  id: string;
  nombre: string;
  farmacias: Record<string, string>;
  comision: number;
  estado: string;
  tipocomision?: string[]; // <-- Cambia a string[]
  turno?: string;
  especial?: string;
  extra?: string;
}

const AdminCajerosPage: React.FC = () => {
  const [cajeros, setCajeros] = useState<Cajero[]>([]);
  const [selectedCajero, setSelectedCajero] = useState<Cajero | null>(null);
  const [modalEditarOpen, setModalEditarOpen] = useState(false);
  const [modalCrearOpen, setModalCrearOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [farmaciaFiltro, setFarmaciaFiltro] = useState<string>("");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("");

  useEffect(() => {
    const fetchCajeros = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/cajeros`);
        const data = await res.json();
        const transformedData = data.map((cajero: any) => ({
          _id: cajero._id, // Use _id as id
          id: cajero.ID, // Use _id as id
          nombre: cajero.NOMBRE,
          farmacias: cajero.FARMACIAS || {},
          comision: cajero.comision || 0, // Default commission
          estado: cajero.estado || "activo", // Default state
          tipocomision: Array.isArray(cajero.tipocomision)
            ? cajero.tipocomision
            : (typeof cajero.tipocomision === "string" && cajero.tipocomision
                ? [cajero.tipocomision]
                : []), // <-- Asegura que tipocomision sea un array
          turno: cajero.turno || "",
          especial: cajero.especial || "",
          extra: cajero.extra || "",
        }));
        setCajeros(transformedData);
        console.log("Cajeros transformados:", transformedData);
      } catch (error) {
        console.error("Error al obtener los cajeros:", error);
      }
    };
    fetchCajeros();
  }, []);
  const handleEditarCajero = (cajero: Cajero) => {
    setSelectedCajero(cajero);
    setModalEditarOpen(true);
  };

  // Obtener farmacias únicas de todos los cajeros
  const farmaciasUnicas = Array.from(
    new Set(
      cajeros.flatMap((c) => Object.values(c.farmacias || {})).filter(Boolean)
    )
  );
  // Obtener estados únicos de todos los cajeros
  // Obtener estados únicos de todos los cajeros, agregando "todos" al inicio
  const estadosUnicos = ["todos", ...Array.from(new Set(cajeros.map(c => c.estado).filter(Boolean)))];

  // Filtrado de cajeros por búsqueda, farmacia y estado
  const cajerosFiltrados = cajeros.filter((cajero) => {
    const coincideBusqueda =
      cajero.nombre.toLowerCase().includes(search.toLowerCase()) ||
      cajero.id.toLowerCase().includes(search.toLowerCase());
    const farmaciasArr = Object.values(cajero.farmacias || {});
    const coincideFarmacia =
      !farmaciaFiltro || farmaciasArr.includes(farmaciaFiltro);
    // Si estadoFiltro es vacío o "todos", mostrar todos los estados
    const coincideEstado =
      !estadoFiltro || estadoFiltro === "todos" || cajero.estado === estadoFiltro;
    return coincideBusqueda && coincideFarmacia && coincideEstado;
  });

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold text-blue-800 mb-6 text-center">Administrar Cajeros</h1>
      {/* Filtros de búsqueda y farmacia */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar por nombre o ID..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm shadow-sm focus:ring-blue-500"
        />
      </div>
      {/* Chips de filtro por farmacia y estado */}
      <div className="mb-4 flex flex-wrap gap-2">
        {/* Chips de farmacia */}
        {farmaciasUnicas.map((f) => (
          <button
            key={f}
            className={`px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ${
              farmaciaFiltro === f
                ? "bg-blue-500 text-white border-blue-600"
                : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
            }`}
            onClick={() => setFarmaciaFiltro(farmaciaFiltro === f ? "" : f)}
          >
            {farmaciaFiltro === f ? `Farmacia: ${f}` : f}
          </button>
        ))}
        {farmaciaFiltro && (
          <button
            className="px-3 py-1 rounded-full text-xs font-semibold border bg-gray-200 text-gray-700 border-gray-300 ml-2"
            onClick={() => setFarmaciaFiltro("")}
          >
            Limpiar filtro farmacia
          </button>
        )}
        {/* Botón único de estado */}
        <button
          className={`px-3 py-1 rounded-full text-xs font-semibold border transition shadow-sm ml-2 ${
            estadoFiltro === "" || estadoFiltro === "todos"
              ? "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100"
              : "bg-purple-500 text-white border-purple-600"
          }`}
          onClick={() => {
            // Alternar entre los estados disponibles
            const actual = estadoFiltro === "" ? "todos" : estadoFiltro;
            const idx = estadosUnicos.indexOf(actual);
            const siguiente = estadosUnicos[(idx + 1) % estadosUnicos.length];
            setEstadoFiltro(siguiente === "todos" ? "" : siguiente);
          }}
        >
          {estadoFiltro === "" || estadoFiltro === "todos"
            ? "Estado: Todos"
            : `Estado: ${estadoFiltro.charAt(0).toUpperCase() + estadoFiltro.slice(1)}`}
        </button>
      </div>
      {/* Botón para abrir modal de crear cajero */}
      <div className="mb-6 text-right">
        <button
          className="bg-green-500 hover:bg-green-600 text-white font-semibold px-4 py-2 rounded shadow"
          onClick={() => setModalCrearOpen(true)}
        >
          + Agregar Cajero
        </button>
      </div>
      {/* Lista filtrada de cajeros */}
      {cajerosFiltrados.length === 0 ? (
        <div className="text-center text-gray-500">No hay cajeros registrados.</div>
      ) : (
        <ul className="divide-y divide-gray-200">
          {cajerosFiltrados.map(cajero => (
            <li key={cajero._id} className="py-4 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">{cajero.nombre}</h3>
                <p className="text-sm text-gray-600">ID: {cajero.id}</p>
                <p className="text-sm text-gray-600">Comisión: {cajero.comision}%</p>
                <p className={`text-sm font-medium ${cajero.estado === "activo" ? "text-green-600" : "text-red-600"}`}>
                  Estado: {cajero.estado}
                </p>
              </div>
              <button
                className="text-sm font-medium text-blue-600 hover:underline"
                onClick={() => handleEditarCajero(cajero)}
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
      {modalEditarOpen && selectedCajero && (
        <EditarCajeroModal
          open={modalEditarOpen}
          onClose={() => setModalEditarOpen(false)}
          cajero={{
            ...selectedCajero,
            tipocomision: Array.isArray(selectedCajero.tipocomision)
              ? selectedCajero.tipocomision
              : (typeof selectedCajero.tipocomision === "string" && selectedCajero.tipocomision
                  ? [selectedCajero.tipocomision]
                  : []),
          } as any}
        />
      )}
      {modalCrearOpen && (
        <CrearCajeroModal
          open={modalCrearOpen}
          onClose={() => setModalCrearOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminCajerosPage;
