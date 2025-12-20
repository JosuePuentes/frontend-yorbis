import GestionMetas from "@/pages/metas/GestionMetas";
import MetasPage from "@/pages/metas/MetasPage";
import { Routes, Route } from "react-router";
import AboutPage from "@/pages/AboutPage";
import NotFoundPage from "@/pages/NotFoundPage";
import AdminPage from "@/pages/AdminPage";
import LoginPage from "@/pages/LoginPage";
import HomePage from "@/pages/HomePage";
import ServicesPage from "@/pages/ServicesPage";
import PrivateRoute from "./PrivateRoute";
import PermissionRoute from "./PermissionRoute";
import AgregarCuadrePage from "@/pages/AgregarCuadrePage";
import ResumenFarmaciasVentas from "@/pages/ResumenFarmaciasVentas";
import VerificacionCuadresPage from "@/pages/VerificacionCuadresPage";
import CuadresPorFarmaciaPage from "@/pages/CuadresPorFarmaciaPage";
import TotalGeneralFarmaciasPage from "@/pages/TotalGeneralFarmaciasPage";
import CuadresPorUsuarioPage from "@/pages/CuadresPorUsuarioPage";
import ChequeoGastosPage from "@/pages/ChequeoGastosPage";
import GastosPorUsuarioPage from "@/pages/GastosPorUsuarioPage";
import AgregarGastos from "@/pages/AgregarGastosPage";
import AdminCajerosPage from "@/pages/AdminCajerosPage";
import ComisionesPorTurnoPage from "@/pages/ComisionesPorTurnoPage";
import ComisionesEspecialesPage from "@/pages/ComisionesEspecialesPage";
import VisualizarGastosFarmaciaPage from "@/pages/VisualizarGastosFarmaciaPage";
import VisualizarCuadresPage from "@/pages/VisualizarCuadresPage";
import AgregarInventarioPage from "@/pages/AgregarInventarioPage";
import VisualizarInventariosPage from "@/pages/VisualizarInventariosPage";
import RetiroPage from "@/pages/RetiroPage";
import VisualizarCuentasPorPagarPage from "@/pages/cuentasPorPagar/visualizarCuentas/VisualizarCuentasPorPagarPage";
import VerificacionCuentasPorPagarPage from "@/pages/cuentasPorPagar/verificacionCuentas/VerificacionCuentasPorPagarPage";
import CuentasPorPagarPage from "@/pages/cuentasPorPagar/agregarCuentas/CuentasPorPagarPage";
import GastosCuentasCuadresPorFarmaciaPage from "@/pages/GastosCuentasCuadresPorFarmaciaPage";
import ValesPorFarmaciaPage from "@/pages/vales/ValesPorFarmaciaPage";
import VisualizarPagos from "@/pages/pagosCPP/VisualizarPagos";
import ModificarEstadoMeta from "@/pages/metas/ModificarEstadoMeta";

import ModificacionCuadrePage from "@/pages/cuadres/modificarCuadre/ModificacionCuadrePage";
import ModificarUsuarioPage from "@/pages/ModificarUsuarioPage";
import RegisterPage from "@/pages/RegisterPage";
import GestionClientesPage from "@/pages/GestionClientesPage";
import PuntoVentaPage from "@/pages/PuntoVentaPage";
import GestionBancosPage from "@/pages/GestionBancosPage";
import ComprasPage from "@/pages/ComprasPage";
import CuentasPorPagarComprasPage from "@/pages/CuentasPorPagarPage";
import DashboardPage from "@/pages/DashboardPage";
import ResumenVentaDiariaPage from "@/pages/ResumenVentaDiariaPage";

const AppRouter = () => (
  <Routes>
    <Route path="/login" element={<LoginPage />} />
    <Route path="/register" element={<RegisterPage />} />
    <Route path="/" element={<HomePage />} />
    <Route path="/servicios" element={<ServicesPage />} />
    <Route path="/admin" element={
      <PrivateRoute>
        <AdminPage />
      </PrivateRoute>
    } />
    <Route path="/dashboard" element={
      <PrivateRoute>
        <DashboardPage />
      </PrivateRoute>
    } />
    <Route path="/about" element={<AboutPage />} />

    <Route
      path="/modificar-cuadres"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <ModificacionCuadrePage />
        </PermissionRoute>
      }
    />
    <Route
      path="/modificar-cuadre"
      element={
        <PermissionRoute permiso="modificar_cuadre">
          <ModificacionCuadrePage />
        </PermissionRoute>
      }
    />

    <Route
      path="/gastoscxc-cuadres"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <GastosCuentasCuadresPorFarmaciaPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/agregarcuadre"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <AgregarCuadrePage />
        </PermissionRoute>
      }
    />
    <Route
      path="/resumendeventa"
      element={
        <PermissionRoute permiso="ver_resumen_mensual">
          <ResumenFarmaciasVentas />
        </PermissionRoute>
      }
    />
    <Route
      path="/metas"
      element={
        <PermissionRoute permiso="ver_about">
          <MetasPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/metasconf"
      element={
        <PermissionRoute permiso="metas">
          <ModificarEstadoMeta />
        </PermissionRoute>
      }
    />
    <Route
      path="/gestionmetas"
      element={
        <PermissionRoute permiso="metas">
          <GestionMetas />
        </PermissionRoute>
      }
    />
    <Route
      path="/verificacion-cuadres"
      element={
        <PermissionRoute permiso="verificar_cuadres">
          <VerificacionCuadresPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/ver-cuadres-dia"
      element={
        <PermissionRoute permiso="ver_cuadres_dia">
          <CuadresPorFarmaciaPage />
        </PermissionRoute>
      }
    />
    {/* Ejemplo: solo usuarios con permiso eliminar_cuadres pueden acceder */}
    <Route
      path="/ventatotal"
      element={
        <PermissionRoute permiso="ver_ventas_totales">
          <TotalGeneralFarmaciasPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/cuadresporfarmacia"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <CuadresPorUsuarioPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/agregargastos"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <AgregarGastos />
        </PermissionRoute>
      }
    />
    <Route
      path="/verificaciongastos"
      element={
        <PermissionRoute permiso="verificar_gastos">
          <ChequeoGastosPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/gastosporusuario"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <GastosPorUsuarioPage />
        </PermissionRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
    <Route
      path="/cajeros"
      element={
        <PermissionRoute permiso="cajeros">
          <AdminCajerosPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/comisiones"
      element={
        <PermissionRoute permiso="comisiones">
          <ComisionesPorTurnoPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/comisionesgenerales"
      element={
        <PermissionRoute permiso="comisiones">
          <ComisionesEspecialesPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/cuentasporpagar"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <CuentasPorPagarPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/vercuentasporpagar"
      element={
        <PermissionRoute permiso="verificar_gastos">
          <VisualizarCuentasPorPagarPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/vergastos"
      element={
        <PermissionRoute permiso="verificar_gastos">
          <VisualizarGastosFarmaciaPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/visualizarcuadres"
      element={
        <PermissionRoute permiso="ver_cuadres_dia">
          <VisualizarCuadresPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/agregarinventariocosto"
      element={
        <PermissionRoute permiso="acceso_admin">
          <AgregarInventarioPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/verinventarios"
      element={
        <PermissionRoute permiso="acceso_admin">
          <VisualizarInventariosPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/retiros"
      element={
        <PermissionRoute permiso="acceso_admin">
          <RetiroPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/compras"
      element={
        <PermissionRoute permiso="compras">
          <ComprasPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/cuentas-por-pagar-compras"
      element={
        <PermissionRoute permiso="compras">
          <CuentasPorPagarComprasPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/verificacioncuentasporpagar"
      element={
        <PermissionRoute permiso="verificar_gastos">
          <VerificacionCuentasPorPagarPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/pagoscpp"
      element={
        <PermissionRoute permiso="verificar_gastos">
          <VisualizarPagos />
        </PermissionRoute>
      }
    />
    <Route
      path="/valesporfarmacia"
      element={
        <PermissionRoute permiso="ver_cuadres_dia">
          <ValesPorFarmaciaPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/modificar-usuarios"
      element={
        <PermissionRoute permiso="acceso_admin">
          <ModificarUsuarioPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/punto-venta"
      element={
        <PermissionRoute permiso="agregar_cuadre">
          <PuntoVentaPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/clientes"
      element={
        <PermissionRoute permiso="gestionar_clientes">
          <GestionClientesPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/bancos"
      element={
        <PermissionRoute permiso="gestionar_bancos">
          <GestionBancosPage />
        </PermissionRoute>
      }
    />
    <Route
      path="/resumen-venta-diaria"
      element={
        <PermissionRoute permiso="resumen_venta_diaria">
          <ResumenVentaDiariaPage />
        </PermissionRoute>
      }
    />
    <Route path="*" element={<NotFoundPage />} />
  </Routes>
);

export default AppRouter;
