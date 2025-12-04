import React, { useEffect, useState } from "react";
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { Search, Edit, Trash2, RefreshCw, Plus, History, ArrowUp, ArrowDown, ArrowRightLeft } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { fetchWithAuth } from "../lib/api";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface Banco {
  _id?: string;
  id?: string;
  numero_cuenta: string;
  nombre_banco: string;
  nombre_titular: string;
  saldo: number;
  divisa: "USD" | "BS"; // Backend espera "BS" en mayúsculas
  tipo_metodo?: "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "tarjeta_credito" | "vales";
  activo?: boolean;
}

interface Movimiento {
  _id?: string;
  banco_id: string;
  tipo: "deposito" | "retiro" | "transferencia" | "venta" | "vuelto" | "pago_compra" | "compra";
  monto: number; // Puede ser negativo para egresos
  descripcion?: string;
  fecha: string;
  referencia?: string;
  venta_id?: string;
  compra_id?: string;
  pago_compra_id?: string;
  pago_id?: string; // Alias para pago_compra_id
  proveedor_id?: string;
  proveedor_nombre?: string;
  numero_factura?: string;
  saldo_anterior?: number;
  saldo_nuevo?: number;
  divisa?: "USD" | "BS";
}

const GestionBancosPage: React.FC = () => {
  const [bancos, setBancos] = useState<Banco[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [bancoSeleccionado, setBancoSeleccionado] = useState<Banco | null>(null);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalCrear, setShowModalCrear] = useState(false);
  const [showModalMovimiento, setShowModalMovimiento] = useState(false);
  const [showModalHistorial, setShowModalHistorial] = useState(false);
  const [tipoMovimiento, setTipoMovimiento] = useState<"deposito" | "retiro" | "transferencia">("deposito");
  const [bancoDestino, setBancoDestino] = useState<string>("");
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loadingMovimientos, setLoadingMovimientos] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [bancoAEliminar, setBancoAEliminar] = useState<Banco | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Formulario de creación/edición
  const [numeroCuenta, setNumeroCuenta] = useState("");
  const [nombreBanco, setNombreBanco] = useState("");
  const [nombreTitular, setNombreTitular] = useState("");
  const [saldo, setSaldo] = useState("");
  const [divisa, setDivisa] = useState<"USD" | "BS">("USD");
  const [tipoMetodo, setTipoMetodo] = useState<"pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "tarjeta_credito" | "vales">("pago_movil");

  // Formulario de movimiento
  const [montoMovimiento, setMontoMovimiento] = useState("");
  const [descripcionMovimiento, setDescripcionMovimiento] = useState("");
  const [referenciaMovimiento, setReferenciaMovimiento] = useState("");

  const fetchBancos = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos`);
      if (res.ok) {
        const data = await res.json();
        // Normalizar divisa a mayúsculas (backend puede enviar "BS" o "Bs")
        const bancosNormalizados = (data.bancos || data || []).map((banco: any) => ({
          ...banco,
          divisa: banco.divisa?.toUpperCase() || "USD" // Normalizar a "USD" o "BS"
        }));
        setBancos(bancosNormalizados);
      } else {
        const errorData = await res.json().catch(() => ({ detail: "Error al obtener bancos" }));
        throw new Error(errorData.detail || "Error al obtener bancos");
      }
    } catch (err: any) {
      console.error("Error al obtener bancos:", err);
      setError(err.message || "Error al cargar bancos");
      setBancos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBancos();
  }, []);

  const handleCrearBanco = async () => {
    if (!numeroCuenta.trim() || !nombreBanco.trim() || !nombreTitular.trim()) {
      alert("El número de cuenta, nombre del banco y nombre del titular son requeridos");
      return;
    }

    setGuardando(true);
    try {
      const bancoData = {
        numero_cuenta: numeroCuenta.trim(),
        nombre_banco: nombreBanco.trim(),
        nombre_titular: nombreTitular.trim(),
        saldo: saldo ? parseFloat(saldo) : 0,
        divisa: divisa.toUpperCase(), // Asegurar que sea "USD" o "BS"
        tipo_metodo: tipoMetodo,
      };

      const res = await fetchWithAuth(`${API_BASE_URL}/bancos`, {
        method: "POST",
        body: JSON.stringify(bancoData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al crear banco" }));
        throw new Error(errorData.detail || "Error al crear banco");
      }

      await fetchBancos();
      setShowModalCrear(false);
      limpiarFormulario();
      alert("Banco creado exitosamente");
    } catch (error: any) {
      console.error("Error al crear banco:", error);
      alert(error.message || "Error al crear banco. Por favor, intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarBanco = (banco: Banco) => {
    setBancoSeleccionado(banco);
    setNumeroCuenta(banco.numero_cuenta);
    setNombreBanco(banco.nombre_banco);
    setNombreTitular(banco.nombre_titular);
    setSaldo(banco.saldo.toString());
    setDivisa(banco.divisa);
    setTipoMetodo(banco.tipo_metodo || "pago_movil");
    setShowModalEditar(true);
  };

  const handleGuardarBanco = async () => {
    if (!bancoSeleccionado || !numeroCuenta.trim() || !nombreBanco.trim() || !nombreTitular.trim()) {
      alert("Todos los campos son requeridos");
      return;
    }

    setGuardando(true);
    try {
      const bancoData = {
        numero_cuenta: numeroCuenta.trim(),
        nombre_banco: nombreBanco.trim(),
        nombre_titular: nombreTitular.trim(),
        saldo: parseFloat(saldo) || 0,
        divisa: divisa.toUpperCase(), // Asegurar que sea "USD" o "BS"
        tipo_metodo: tipoMetodo,
      };

      const bancoId = bancoSeleccionado._id || bancoSeleccionado.id;
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos/${bancoId}`, {
        method: "PUT",
        body: JSON.stringify(bancoData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al actualizar banco" }));
        throw new Error(errorData.detail || "Error al actualizar banco");
      }

      await fetchBancos();
      setShowModalEditar(false);
      setBancoSeleccionado(null);
      limpiarFormulario();
      alert("Banco actualizado exitosamente");
    } catch (error: any) {
      console.error("Error al actualizar banco:", error);
      alert(error.message || "Error al actualizar banco. Por favor, intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarBanco = (banco: Banco) => {
    setBancoAEliminar(banco);
    setShowConfirmDelete(true);
  };

  const confirmarEliminacion = async () => {
    if (!bancoAEliminar) return;

    try {
      const bancoId = bancoAEliminar._id || bancoAEliminar.id;
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos/${bancoId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al eliminar banco" }));
        throw new Error(errorData.detail || "Error al eliminar banco");
      }

      await fetchBancos();
      setShowConfirmDelete(false);
      setBancoAEliminar(null);
      alert("Banco eliminado exitosamente");
    } catch (error: any) {
      console.error("Error al eliminar banco:", error);
      alert(error.message || "Error al eliminar banco. Por favor, intente nuevamente.");
    }
  };

  const handleAbrirModalMovimiento = (banco: Banco, tipo: "deposito" | "retiro" | "transferencia") => {
    setBancoSeleccionado(banco);
    setTipoMovimiento(tipo);
    setMontoMovimiento("");
    setDescripcionMovimiento("");
    setReferenciaMovimiento("");
    setBancoDestino("");
    setShowModalMovimiento(true);
  };

  const handleProcesarMovimiento = async () => {
    if (!bancoSeleccionado || !montoMovimiento) {
      alert("Ingrese un monto válido");
      return;
    }

    const monto = parseFloat(montoMovimiento);
    if (isNaN(monto) || monto <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    if (tipoMovimiento === "retiro" && monto > bancoSeleccionado.saldo) {
      alert(`El monto a retirar (${monto}) es mayor que el saldo disponible (${bancoSeleccionado.saldo})`);
      return;
    }

    if (tipoMovimiento === "transferencia") {
      if (!bancoDestino) {
        alert("Seleccione un banco destino");
        return;
      }
      if (bancoDestino === (bancoSeleccionado._id || bancoSeleccionado.id)) {
        alert("No puede transferir al mismo banco");
        return;
      }
      const bancoDest = bancos.find(b => (b._id || b.id) === bancoDestino);
      if (!bancoDest) {
        alert("Banco destino no encontrado");
        return;
      }
      if (monto > bancoSeleccionado.saldo) {
        alert(`El monto a transferir (${monto}) es mayor que el saldo disponible (${bancoSeleccionado.saldo})`);
        return;
      }
    }

    setGuardando(true);
    try {
      const movimientoData: any = {
        banco_id: bancoSeleccionado._id || bancoSeleccionado.id,
        tipo: tipoMovimiento,
        monto: monto,
        descripcion: descripcionMovimiento.trim() || undefined,
        referencia: referenciaMovimiento.trim() || undefined,
      };

      if (tipoMovimiento === "transferencia") {
        movimientoData.banco_destino_id = bancoDestino;
      }

      const res = await fetchWithAuth(`${API_BASE_URL}/bancos/movimientos`, {
        method: "POST",
        body: JSON.stringify(movimientoData),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Error al procesar movimiento" }));
        throw new Error(errorData.detail || "Error al procesar movimiento");
      }

      await fetchBancos();
      setShowModalMovimiento(false);
      setBancoSeleccionado(null);
      alert("Movimiento procesado exitosamente");
    } catch (error: any) {
      console.error("Error al procesar movimiento:", error);
      alert(error.message || "Error al procesar movimiento. Por favor, intente nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  const handleVerHistorial = async (banco: Banco) => {
    setBancoSeleccionado(banco);
    setLoadingMovimientos(true);
    setShowModalHistorial(true);
    try {
      const bancoId = banco._id || banco.id;
      console.log(`🔍 [BANCOS] Obteniendo movimientos para banco ${bancoId}...`);
      const res = await fetchWithAuth(`${API_BASE_URL}/bancos/${bancoId}/movimientos`);
      if (res.ok) {
        const data = await res.json();
        console.log(`📋 [BANCOS] Respuesta del backend:`, JSON.stringify(data, null, 2));
        const movimientosArray = data.movimientos || data || [];
        console.log(`✅ [BANCOS] Movimientos encontrados: ${movimientosArray.length}`);
        
        // Log detallado de cada movimiento
        movimientosArray.forEach((mov: any, idx: number) => {
          console.log(`  📊 Movimiento ${idx + 1}: tipo=${mov.tipo}, monto=${mov.monto}, descripcion=${mov.descripcion}`);
        });
        
        // Contar movimientos por tipo
        const movimientosPorTipo = movimientosArray.reduce((acc: any, mov: any) => {
          acc[mov.tipo] = (acc[mov.tipo] || 0) + 1;
          return acc;
        }, {});
        console.log(`📊 [BANCOS] Movimientos por tipo:`, movimientosPorTipo);
        
        setMovimientos(movimientosArray);
      } else {
        const errorData = await res.json().catch(() => null);
        console.error(`❌ [BANCOS] Error al obtener movimientos:`, res.status, errorData);
        setMovimientos([]);
      }
    } catch (error) {
      console.error("❌ [BANCOS] Error al obtener movimientos:", error);
      setMovimientos([]);
    } finally {
      setLoadingMovimientos(false);
    }
  };

  // Función para obtener el nombre del tipo de método
  const getNombreMetodo = (tipoMetodo?: string) => {
    switch (tipoMetodo) {
      case "pago_movil":
        return "Pago Móvil";
      case "efectivo":
        return "Efectivo";
      case "zelle":
        return "Zelle";
      case "tarjeta_debit":
        return "Tarjeta Débit";
      case "tarjeta_credito":
        return "Tarjeta de Crédito";
      case "vales":
        return "Vales";
      default:
        return "Pago Móvil";
    }
  };

  const limpiarFormulario = () => {
    setNumeroCuenta("");
    setNombreBanco("");
    setNombreTitular("");
    setSaldo("");
    setDivisa("USD");
    setTipoMetodo("pago_movil");
    setMontoMovimiento("");
    setDescripcionMovimiento("");
    setReferenciaMovimiento("");
    setBancoDestino("");
  };

  const bancosFiltrados = bancos.filter((banco) => {
    if (!busqueda) return true;
    const busquedaLower = busqueda.toLowerCase();
    return (
      banco.numero_cuenta.toLowerCase().includes(busquedaLower) ||
      banco.nombre_banco.toLowerCase().includes(busquedaLower) ||
      banco.nombre_titular.toLowerCase().includes(busquedaLower)
    );
  });

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-blue-800 mb-2">
              Gestión de Bancos
            </h1>
            <p className="text-gray-600">
              Administra métodos de pago bancarios, saldos y movimientos
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                limpiarFormulario();
                setShowModalCrear(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Agregar Banco
            </Button>
            {!loading && bancos.length > 0 && (
              <div className="text-sm text-gray-500 flex items-center">
                Total: <span className="font-semibold text-blue-600 ml-1">{bancos.length}</span>{" "}
                {bancos.length === 1 ? "banco" : "bancos"}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Barra de búsqueda */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar por número de cuenta, banco o titular..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={fetchBancos}
                disabled={loading}
                variant="outline"
                size="sm"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de bancos */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">
          Cargando bancos...
        </div>
      ) : error ? (
        <div className="text-center py-8 text-red-500">
          {error}
        </div>
      ) : bancosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {busqueda ? "No se encontraron bancos con ese criterio" : "No hay bancos registrados"}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número de Cuenta</TableHead>
                  <TableHead>Banco</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Divisa</TableHead>
                  <TableHead className="text-right">Saldo</TableHead>
                  <TableHead className="text-center">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bancosFiltrados.map((banco) => (
                  <TableRow key={banco._id || banco.id}>
                    <TableCell className="font-medium">{banco.numero_cuenta}</TableCell>
                    <TableCell>{banco.nombre_banco}</TableCell>
                    <TableCell>{banco.nombre_titular}</TableCell>
                    <TableCell>{getNombreMetodo(banco.tipo_metodo)}</TableCell>
                    <TableCell>{banco.divisa}</TableCell>
                    <TableCell className="text-right font-semibold">
                      {banco.divisa === "USD" ? "$" : ""}
                      {banco.saldo.toLocaleString("es-VE", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      {banco.divisa === "BS" ? " Bs" : ""}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 justify-center items-center">
                        <Button
                          onClick={() => handleAbrirModalMovimiento(banco, "deposito")}
                          variant="outline"
                          size="sm"
                          className="text-green-600 hover:text-green-700"
                          title="Depósito"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleAbrirModalMovimiento(banco, "retiro")}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          title="Retiro"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleAbrirModalMovimiento(banco, "transferencia")}
                          variant="outline"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700"
                          title="Transferencia"
                        >
                          <ArrowRightLeft className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleVerHistorial(banco)}
                          variant="outline"
                          size="sm"
                          title="Historial"
                        >
                          <History className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEditarBanco(banco)}
                          variant="outline"
                          size="sm"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          onClick={() => handleEliminarBanco(banco)}
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Modal de Crear Banco */}
      <Dialog open={showModalCrear} onOpenChange={setShowModalCrear}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Banco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número de Cuenta *</label>
              <Input
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                placeholder="Ej: 0102-1234-56789012"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Banco *</label>
              <Input
                value={nombreBanco}
                onChange={(e) => setNombreBanco(e.target.value)}
                placeholder="Ej: Banco de Venezuela"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Titular *</label>
              <Input
                value={nombreTitular}
                onChange={(e) => setNombreTitular(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Divisa *</label>
              <select
                value={divisa}
                onChange={(e) => setDivisa(e.target.value as "USD" | "BS")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="USD">USD</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Método de Pago *</label>
              <select
                value={tipoMetodo}
                onChange={(e) => setTipoMetodo(e.target.value as "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "vales")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="pago_movil">Pago Móvil</option>
                <option value="efectivo">Efectivo</option>
                <option value="zelle">Zelle</option>
                <option value="tarjeta_debit">Tarjeta Débit</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="vales">Vales</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Saldo Inicial</label>
              <Input
                type="number"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowModalCrear(false);
                  limpiarFormulario();
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button onClick={handleCrearBanco} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Banco */}
      <Dialog open={showModalEditar} onOpenChange={setShowModalEditar}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Banco</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Número de Cuenta *</label>
              <Input
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                placeholder="Ej: 0102-1234-56789012"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Banco *</label>
              <Input
                value={nombreBanco}
                onChange={(e) => setNombreBanco(e.target.value)}
                placeholder="Ej: Banco de Venezuela"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nombre del Titular *</label>
              <Input
                value={nombreTitular}
                onChange={(e) => setNombreTitular(e.target.value)}
                placeholder="Ej: Juan Pérez"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Divisa *</label>
              <select
                value={divisa}
                onChange={(e) => setDivisa(e.target.value as "USD" | "BS")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="USD">USD</option>
                <option value="BS">BS</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tipo de Método de Pago *</label>
              <select
                value={tipoMetodo}
                onChange={(e) => setTipoMetodo(e.target.value as "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "vales")}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="pago_movil">Pago Móvil</option>
                <option value="efectivo">Efectivo</option>
                <option value="zelle">Zelle</option>
                <option value="tarjeta_debit">Tarjeta Débit</option>
                <option value="tarjeta_credito">Tarjeta de Crédito</option>
                <option value="vales">Vales</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Saldo</label>
              <Input
                type="number"
                value={saldo}
                onChange={(e) => setSaldo(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowModalEditar(false);
                  setBancoSeleccionado(null);
                  limpiarFormulario();
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button onClick={handleGuardarBanco} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Movimiento */}
      <Dialog open={showModalMovimiento} onOpenChange={setShowModalMovimiento}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {tipoMovimiento === "deposito" && "Depósito"}
              {tipoMovimiento === "retiro" && "Retiro"}
              {tipoMovimiento === "transferencia" && "Transferencia"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Banco</label>
              <Input
                value={`${bancoSeleccionado?.nombre_banco} - ${bancoSeleccionado?.numero_cuenta}`}
                disabled
              />
            </div>
            {tipoMovimiento === "transferencia" && (
              <div>
                <label className="block text-sm font-medium mb-1">Banco Destino *</label>
                <select
                  value={bancoDestino}
                  onChange={(e) => setBancoDestino(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Seleccione un banco</option>
                  {bancos
                    .filter(b => (b._id || b.id) !== (bancoSeleccionado?._id || bancoSeleccionado?.id))
                    .map((banco) => (
                      <option key={banco._id || banco.id} value={banco._id || banco.id}>
                        {banco.nombre_banco} - {banco.numero_cuenta} ({banco.divisa})
                      </option>
                    ))}
                </select>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium mb-1">Monto *</label>
              <Input
                type="number"
                value={montoMovimiento}
                onChange={(e) => setMontoMovimiento(e.target.value)}
                placeholder="0.00"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Descripción</label>
              <Input
                value={descripcionMovimiento}
                onChange={(e) => setDescripcionMovimiento(e.target.value)}
                placeholder="Descripción del movimiento"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Referencia</label>
              <Input
                value={referenciaMovimiento}
                onChange={(e) => setReferenciaMovimiento(e.target.value)}
                placeholder="Número de referencia"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                onClick={() => {
                  setShowModalMovimiento(false);
                  setBancoSeleccionado(null);
                }}
                variant="outline"
              >
                Cancelar
              </Button>
              <Button onClick={handleProcesarMovimiento} disabled={guardando}>
                {guardando ? "Procesando..." : "Procesar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Historial */}
      <Dialog open={showModalHistorial} onOpenChange={setShowModalHistorial}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Historial de Movimientos - {bancoSeleccionado?.nombre_banco} ({bancoSeleccionado?.numero_cuenta})
            </DialogTitle>
          </DialogHeader>
          {loadingMovimientos ? (
            <div className="text-center py-8">Cargando movimientos...</div>
          ) : movimientos.length === 0 ? (
            <div className="text-center py-8 text-gray-500">No hay movimientos registrados</div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movimientos.map((movimiento) => (
                    <TableRow key={movimiento._id}>
                      <TableCell>
                        {new Date(movimiento.fecha).toLocaleString('es-VE')}
                      </TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded text-xs font-semibold ${
                          movimiento.tipo === "deposito" || movimiento.tipo === "venta"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}>
                          {movimiento.tipo === "deposito" && "Depósito"}
                          {movimiento.tipo === "retiro" && "Retiro"}
                          {movimiento.tipo === "transferencia" && "Transferencia"}
                          {movimiento.tipo === "venta" && "Venta"}
                          {movimiento.tipo === "vuelto" && "Vuelto"}
                          {movimiento.tipo === "pago_compra" && "Pago Compra"}
                          {movimiento.tipo === "compra" && "Pago Compra"}
                        </span>
                      </TableCell>
                      <TableCell>{movimiento.descripcion || "-"}</TableCell>
                      <TableCell>{movimiento.referencia || "-"}</TableCell>
                      <TableCell className={`text-right font-semibold ${
                        movimiento.tipo === "deposito" || movimiento.tipo === "venta"
                          ? "text-green-600"
                          : "text-red-600"
                      }`}>
                        {/* Mostrar signo según tipo o si el monto es negativo */}
                        {(() => {
                          const esIngreso = movimiento.tipo === "deposito" || movimiento.tipo === "venta";
                          const montoAbsoluto = Math.abs(movimiento.monto);
                          const signo = esIngreso ? "+" : "-";
                          return (
                            <>
                              {signo}
                              {bancoSeleccionado?.divisa === "USD" ? "$" : ""}
                              {montoAbsoluto.toLocaleString("es-VE", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                              {bancoSeleccionado?.divisa === "BS" ? " Bs" : ""}
                            </>
                          );
                        })()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmación de Eliminación */}
      <Dialog open={showConfirmDelete} onOpenChange={setShowConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Eliminación</DialogTitle>
          </DialogHeader>
          <p className="py-4">
            ¿Está seguro de que desea eliminar el banco{" "}
            <strong>{bancoAEliminar?.nombre_banco}</strong>?
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              onClick={() => {
                setShowConfirmDelete(false);
                setBancoAEliminar(null);
              }}
              variant="outline"
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarEliminacion}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GestionBancosPage;

