import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGastos } from "@/hooks/useGastos";
import AgregarGastosPage from "./AgregarGastosPage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"; // Importamos componentes de Dialog de Shadcn UI
import ImageDisplay from "@/components/upfile/ImageDisplay";

const ChequeoGastosPage: React.FC = () => {
  const { localidades, gastosPorLocalidad = {}, loading, error, refreshGastos } = useGastos(); // fallback a {}
  const [modalGastosAbierto, setModalGastosAbierto] = useState(false); // Renombrado para mayor claridad
  const [modalAgregarAbierto, setModalAgregarAbierto] = useState(false);
  const [localidadSeleccionadaId, setLocalidadSeleccionadaId] = useState(""); // Renombrado para mayor claridad
  const [localidadNombreSeleccionada, setLocalidadNombreSeleccionada] = useState("");
  const [confirmarEliminarGasto, setConfirmarEliminarGasto] = useState<string | null>(null); // Estado para la confirmación de eliminación

  console.log("Gastos por Localidad (ChequeoGastosPage):", gastosPorLocalidad);

  const abrirModalGastos = (id: string, nombre: string) => {
    setLocalidadSeleccionadaId(id);
    setLocalidadNombreSeleccionada(nombre);
    setModalGastosAbierto(true);
  };

  const verificarGasto = async (gastoId: string, nuevoEstado: string) => {
    console.log(`Verificando gasto ${gastoId} con estado ${nuevoEstado}`);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/estado`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: gastoId, estado: nuevoEstado }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al actualizar el estado del gasto");
      }

      // Cerrar modal y refrescar la lista de gastos
      setModalGastosAbierto(false);
      refreshGastos(); // Llama a la función para refrescar los datos
      alert(`Estado del gasto actualizado a ${nuevoEstado} exitosamente.`);
    } catch (error: any) {
      console.error("Error al verificar el gasto:", error);
      alert(`Hubo un error al actualizar el estado del gasto: ${error.message || error}`);
    }
  };

  const eliminarGasto = async (gastoId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/gastos/${gastoId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al eliminar el gasto");
      }

      alert("Gasto eliminado exitosamente.");
      setConfirmarEliminarGasto(null); // Cierra el diálogo de confirmación
      refreshGastos(); // Refresca los gastos después de eliminar
    } catch (error: any) {
      console.error("Error al eliminar el gasto:", error);
      alert(`Hubo un error al eliminar el gasto: ${error.message || error}`);
    }
  };


  if (loading) return <div className="text-center py-12 text-xl font-medium text-gray-700">Cargando datos...</div>;
  if (error) return <div className="text-center text-red-600 py-12 text-xl font-medium">Error: {error}</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-100 p-6 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Encabezado Principal */}
        <h1 className="text-5xl font-extrabold text-gray-900 mb-12 text-center tracking-tight leading-tight">
          Panel de Chequeo de <span className="text-red-600">Gastos</span>
        </h1>

        {/* Sección de Localidades */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold text-gray-800">Localidades</h2>
            <Button
              onClick={() => setModalAgregarAbierto(true)}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
            >
              + Agregar Gasto
            </Button>
          </div>

          {localidades.length === 0 ? (
            <p className="text-center text-gray-500 text-lg mt-8">No hay localidades disponibles para mostrar.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
              {localidades.map((loc) => {
                const gastosPendientes = (gastosPorLocalidad[loc.id] || []).filter((gasto) => gasto.estado !== "verified" && gasto.estado !== "denied").length;
                console.log(`Localidad ${loc.nombre} (${loc.id}): ${gastosPendientes} gastos pendientes.`);
                return (
                  <Card
                    key={loc.id}
                    className="relative bg-white p-7 rounded-2xl shadow-xl transition-all duration-300 ease-in-out transform hover:-translate-y-1 hover:shadow-2xl border-l-6 border-red-500 flex flex-col justify-between"
                  >
                    <div className="text-center text-2xl font-bold text-gray-800 mb-4">{loc.nombre}</div>
                    {gastosPendientes > 0 && (
                      <span className="absolute top-4 right-4 bg-red-600 text-white text-md font-extrabold px-3 py-1 rounded-full shadow-md animate-bounce">
                        {gastosPendientes} pendientes
                      </span>
                    )}
                    <Button
                      onClick={() => abrirModalGastos(loc.id, loc.nombre)}
                      className="w-full bg-red-500 hover:bg-red-600 text-white font-semibold py-3 mt-5 rounded-lg shadow-md transition-all duration-300 ease-in-out"
                    >
                      Ver Gastos ({gastosPendientes})
                    </Button>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        {/* Modal de Gastos por Localidad (usando Shadcn Dialog) */}
        <Dialog open={modalGastosAbierto} onOpenChange={setModalGastosAbierto}>
          <DialogContent className="sm:max-w-[800px] p-8 bg-white rounded-3xl shadow-2xl border-4 border-red-500 transform scale-95 transition-all duration-300 ease-out">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-4xl font-extrabold text-red-600 text-center tracking-wide">
                Gastos Pendientes - {localidadNombreSeleccionada}
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 text-lg mt-2">
                Revisa y gestiona los gastos pendientes para esta localidad.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-6 max-h-[70vh] overflow-y-auto pr-2">
              {((gastosPorLocalidad[localidadSeleccionadaId] || []).filter((gasto) => gasto.estado === "wait").length === 0) ? (
                <p className="text-center text-gray-500 text-xl py-10">¡No hay gastos pendientes para esta localidad!</p>
              ) : (
                (gastosPorLocalidad[localidadSeleccionadaId] || []).filter((gasto) => gasto.estado === "wait").map((g, idx) => {
                  const gasto = g as any; // Forzar tipado flexible para acceder a divisa y tasa
                  console.log("Gasto filtrado en modal:", gasto);
                  let montoUsd = gasto.monto;
                  let montoBs = gasto.monto;
                  if (gasto.divisa === "Bs" && gasto.tasa && Number(gasto.tasa) > 0) {
                    montoUsd = gasto.monto / Number(gasto.tasa);
                    montoBs = gasto.monto;
                  } else if (gasto.divisa === "USD" && gasto.tasa && Number(gasto.tasa) > 0) {
                    montoBs = gasto.monto * Number(gasto.tasa);
                    montoUsd = gasto.monto;
                  }
                  return (
                    <Card key={gasto._id || idx} className="p-8 border-2 border-red-400 rounded-2xl shadow-2xl bg-gradient-to-br from-white to-red-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all duration-300 hover:shadow-3xl">
                      <div className="flex-grow">
                        <div className="text-2xl font-extrabold text-gray-900 mb-2 flex items-center gap-2">
                          {gasto.titulo}
                          <span className="inline-block bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full ml-2 border border-blue-300">
                            {gasto.divisa ? gasto.divisa : "Sin moneda"}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-3 mb-2">
                          <span className="bg-green-100 text-green-800 font-semibold px-3 py-1 rounded-lg text-lg shadow-sm">
                            Monto: {gasto.monto.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {gasto.divisa || ''}
                          </span>
                          <span className="bg-yellow-100 text-yellow-800 font-semibold px-3 py-1 rounded-lg text-lg shadow-sm">
                            Tasa: {gasto.tasa !== undefined && gasto.tasa !== null && gasto.tasa !== "" ? gasto.tasa : "-"}
                          </span>
                          <span className="bg-blue-100 text-blue-800 font-semibold px-3 py-1 rounded-lg text-lg shadow-sm">
                            {gasto.divisa === "Bs"
                              ? `Equivalente: ${montoUsd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                              : gasto.divisa === "USD"
                                ? `Equivalente: ${montoBs.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} Bs`
                                : ""}
                          </span>
                        </div>
                        <div className="text-base text-gray-600 mt-1 mb-1">Descripción: {gasto.descripcion}</div>
                        <div className="text-sm text-gray-500 mt-1">Fecha: {typeof gasto.fecha === 'string' ? gasto.fecha : ''}</div>
                        {gasto.fechaRegistro && (
                          <div className="text-sm text-gray-500 mt-1">Fecha de registro: {new Date(gasto.fechaRegistro).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas' })}</div>
                        )}
                        {/* Mostrar imágenes si existen */}
                        {Array.isArray(gasto.imagenesGasto) && gasto.imagenesGasto.length > 0 && (
                          <div className="flex gap-2 mt-3 flex-wrap">
                            {gasto.imagenesGasto.map((img: string, idx: number) => (
                              <ImageDisplay key={img + idx} imageName={img} style={{ maxWidth: 100, maxHeight: 100, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                            ))}
                          </div>
                        )}
                        {gasto.imagenGasto && (!gasto.imagenesGasto || gasto.imagenesGasto.length === 0) && (
                          <div className="mt-3">
                            <ImageDisplay imageName={gasto.imagenGasto} style={{ maxWidth: 100, maxHeight: 100, borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 mt-4 md:mt-0">
                        <Button
                          onClick={() => verificarGasto(gasto._id, "verified")}
                          className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105"
                        >
                          ✅ Verificar
                        </Button>
                        <Button
                          onClick={() => verificarGasto(gasto._id, "denied")}
                          className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105"
                        >
                          ❌ Denegar
                        </Button>
                        <Button
                          onClick={() => setConfirmarEliminarGasto(gasto._id)}
                          className="bg-gray-400 hover:bg-gray-500 text-white font-semibold py-2 px-5 rounded-lg shadow-md transition-all duration-300 ease-in-out hover:scale-105"
                        >
                          🗑️ Eliminar
                        </Button>
                      </div>
                    </Card>
                  );
                })
              )}
            </div>

            <DialogFooter className="mt-8 flex justify-center">
              <Button
                onClick={() => setModalGastosAbierto(false)}
                className="bg-gray-700 hover:bg-gray-800 text-white font-semibold py-3 px-8 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105"
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal para Agregar Nuevo Gasto (usando Shadcn Dialog) */}
        <Dialog open={modalAgregarAbierto} onOpenChange={setModalAgregarAbierto}>
          <DialogContent className="sm:max-w-[800px] p-8 bg-white rounded-3xl shadow-2xl border-4 border-green-600 transform scale-95 transition-all duration-300 ease-out">
            <DialogHeader className="mb-6">
              <DialogTitle className="text-4xl font-extrabold text-green-700 text-center tracking-wide">
                Agregar Nuevo Gasto
              </DialogTitle>
              <DialogDescription className="text-center text-gray-600 text-lg mt-2">
                Completa los detalles para añadir un nuevo gasto.
              </DialogDescription>
            </DialogHeader>
            <AgregarGastosPage onSubmitSuccess={() => { refreshGastos(); setModalAgregarAbierto(false); }} /> {/* Pasa prop onClose y onGastoAgregado */}
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmación de Eliminación */}
        <Dialog open={!!confirmarEliminarGasto} onOpenChange={() => setConfirmarEliminarGasto(null)}>
          <DialogContent className="sm:max-w-[425px] p-6 bg-white rounded-2xl shadow-xl border-2 border-red-500">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-red-600 text-center">Confirmar Eliminación</DialogTitle>
              <DialogDescription className="text-center text-gray-700 mt-2">
                ¿Estás seguro de que deseas eliminar este gasto? Esta acción no se puede deshacer.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex flex-col sm:flex-row justify-center gap-4 mt-6">
              <Button
                onClick={() => setConfirmarEliminarGasto(null)}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-6 rounded-lg shadow-md transition-all"
              >
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  if (confirmarEliminarGasto) {
                    eliminarGasto(confirmarEliminarGasto);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition-all"
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default ChequeoGastosPage;