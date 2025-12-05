import React, { useMemo } from 'react';
import { useResumenData } from '../hooks/useResumenData';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  ShoppingCart,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const DashboardPage: React.FC = () => {
  const {
    loading,
    error,
    ventas,
    sortedFarmacias,
    gastosPorFarmacia,
    cuentasActivasPorFarmacia,
    fechaInicio,
    fechaFin,
    setHoy,
    setAyer,
    setSemanaActual,
    setQuincenaActual,
    setMesActual,
  } = useResumenData();

  // Calcular totales generales
  const totales = useMemo(() => {
    let totalVentas = 0;
    let totalGastos = 0;
    let totalCuentasPorPagar = 0;
    let totalEfectivoUsd = 0;
    let totalZelleUsd = 0;
    let totalBs = 0;

    sortedFarmacias.forEach((farm) => {
      const venta = ventas[farm.id] || {};
      totalVentas += venta.totalVentas || 0;
      totalEfectivoUsd += venta.efectivoUsd || 0;
      totalZelleUsd += venta.zelleUsd || 0;
      totalBs += venta.totalBs || 0;
      totalGastos += gastosPorFarmacia[farm.id] || 0;
      totalCuentasPorPagar += cuentasActivasPorFarmacia[farm.id] || 0;
    });

    return {
      totalVentas: Number(totalVentas.toFixed(2)),
      totalGastos: Number(totalGastos.toFixed(2)),
      totalCuentasPorPagar: Number(totalCuentasPorPagar.toFixed(2)),
      totalEfectivoUsd: Number(totalEfectivoUsd.toFixed(2)),
      totalZelleUsd: Number(totalZelleUsd.toFixed(2)),
      totalBs: Number(totalBs.toFixed(2)),
      utilidad: Number((totalVentas - totalGastos).toFixed(2)),
    };
  }, [ventas, sortedFarmacias, gastosPorFarmacia, cuentasActivasPorFarmacia]);

  // Datos para gráfica de barras de ventas por sucursal
  const datosVentasPorSucursal = useMemo(() => {
    return sortedFarmacias.map((farm) => ({
      nombre: farm.nombre.length > 15 ? farm.nombre.substring(0, 15) + '...' : farm.nombre,
      ventas: ventas[farm.id]?.totalVentas || 0,
      gastos: gastosPorFarmacia[farm.id] || 0,
      utilidad: (ventas[farm.id]?.totalVentas || 0) - (gastosPorFarmacia[farm.id] || 0),
    }));
  }, [sortedFarmacias, ventas, gastosPorFarmacia]);

  // Datos para gráfica de pie de métodos de pago
  const datosMetodosPago = useMemo(() => {
    return [
      { name: 'Efectivo USD', value: totales.totalEfectivoUsd },
      { name: 'Zelle USD', value: totales.totalZelleUsd },
      { name: 'Efectivo Bs', value: totales.totalBs },
    ].filter(item => item.value > 0);
  }, [totales]);

  // Datos para gráfica de línea de tendencia (simulado - puedes mejorarlo con datos históricos)
  const datosTendencia = useMemo(() => {
    const dias = 7;
    const datos = [];
    for (let i = dias - 1; i >= 0; i--) {
      const fecha = new Date();
      fecha.setDate(fecha.getDate() - i);
      // Simulación - en producción deberías obtener datos reales por día
      datos.push({
        fecha: fecha.toLocaleDateString('es-VE', { day: '2-digit', month: '2-digit' }),
        ventas: totales.totalVentas * (0.8 + Math.random() * 0.4),
        gastos: totales.totalGastos * (0.8 + Math.random() * 0.4),
      });
    }
    return datos;
  }, [totales]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-VE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatDateRange = () => {
    if (!fechaInicio || !fechaFin) return 'Seleccione un rango';
    const inicio = new Date(fechaInicio).toLocaleDateString('es-VE');
    const fin = new Date(fechaFin).toLocaleDateString('es-VE');
    return `${inicio} - ${fin}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando datos del dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <AlertCircle className="w-8 h-8 text-red-600 mx-auto mb-2" />
          <p className="text-red-600 text-center">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
            Dashboard Financiero
          </h1>
          <p className="text-gray-600">
            Resumen completo de ventas, gastos y cuentas por pagar
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={setHoy}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Hoy
            </button>
            <button
              onClick={setAyer}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Ayer
            </button>
            <button
              onClick={setSemanaActual}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Semana Actual
            </button>
            <button
              onClick={setQuincenaActual}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Quincena Actual
            </button>
            <button
              onClick={setMesActual}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
            >
              Mes Actual
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            Período: <span className="font-semibold">{formatDateRange()}</span>
          </p>
        </div>

        {/* Cards de Resumen */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Ventas */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-blue-100 p-3 rounded-lg">
                <DollarSign className="w-6 h-6 text-blue-600" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Ventas</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totales.totalVentas)}</p>
            <p className="text-xs text-gray-500 mt-2">En el período seleccionado</p>
          </div>

          {/* Total Gastos */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-red-100 p-3 rounded-lg">
                <ShoppingCart className="w-6 h-6 text-red-600" />
              </div>
              <ArrowDownRight className="w-5 h-5 text-red-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Total Gastos</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totales.totalGastos)}</p>
            <p className="text-xs text-gray-500 mt-2">Gastos verificados</p>
          </div>

          {/* Cuentas por Pagar */}
          <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-500">
            <div className="flex items-center justify-between mb-4">
              <div className="bg-orange-100 p-3 rounded-lg">
                <CreditCard className="w-6 h-6 text-orange-600" />
              </div>
              <AlertCircle className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Cuentas por Pagar</h3>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(totales.totalCuentasPorPagar)}</p>
            <p className="text-xs text-gray-500 mt-2">Pendientes de pago</p>
          </div>

          {/* Utilidad */}
          <div className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${totales.utilidad >= 0 ? 'border-green-500' : 'border-red-500'}`}>
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${totales.utilidad >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                {totales.utilidad >= 0 ? (
                  <TrendingUp className={`w-6 h-6 ${totales.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                ) : (
                  <TrendingDown className="w-6 h-6 text-red-600" />
                )}
              </div>
              {totales.utilidad >= 0 ? (
                <ArrowUpRight className="w-5 h-5 text-green-500" />
              ) : (
                <ArrowDownRight className="w-5 h-5 text-red-500" />
              )}
            </div>
            <h3 className="text-sm font-medium text-gray-600 mb-1">Utilidad Neta</h3>
            <p className={`text-2xl font-bold ${totales.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totales.utilidad)}
            </p>
            <p className="text-xs text-gray-500 mt-2">Ventas - Gastos</p>
          </div>
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Gráfica de Ventas por Sucursal */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Ventas por Sucursal</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={datosVentasPorSucursal}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="nombre" 
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  fontSize={12}
                />
                <YAxis fontSize={12} />
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
                <Legend />
                <Bar dataKey="ventas" fill="#3b82f6" name="Ventas" radius={[8, 8, 0, 0]} />
                <Bar dataKey="gastos" fill="#ef4444" name="Gastos" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Gráfica de Métodos de Pago */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Distribución de Métodos de Pago</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={datosMetodosPago}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {datosMetodosPago.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Tendencia */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Tendencia de Ventas y Gastos</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datosTendencia}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="fecha" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip 
                formatter={(value: number) => formatCurrency(value)}
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="ventas" 
                stroke="#3b82f6" 
                strokeWidth={3}
                name="Ventas"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line 
                type="monotone" 
                dataKey="gastos" 
                stroke="#ef4444" 
                strokeWidth={3}
                name="Gastos"
                dot={{ fill: '#ef4444', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Tabla de Resumen por Sucursal */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Resumen por Sucursal</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Sucursal</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Ventas</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Gastos</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Cuentas por Pagar</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Utilidad</th>
                </tr>
              </thead>
              <tbody>
                {sortedFarmacias.map((farm) => {
                  const venta = ventas[farm.id] || {};
                  const gastos = gastosPorFarmacia[farm.id] || 0;
                  const cuentas = cuentasActivasPorFarmacia[farm.id] || 0;
                  const utilidad = (venta.totalVentas || 0) - gastos;
                  return (
                    <tr key={farm.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-gray-900 font-medium">{farm.nombre}</td>
                      <td className="py-3 px-4 text-right text-gray-700">{formatCurrency(venta.totalVentas || 0)}</td>
                      <td className="py-3 px-4 text-right text-red-600">{formatCurrency(gastos)}</td>
                      <td className="py-3 px-4 text-right text-orange-600">{formatCurrency(cuentas)}</td>
                      <td className={`py-3 px-4 text-right font-semibold ${utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(utilidad)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 font-bold">
                  <td className="py-3 px-4 text-gray-900">TOTAL</td>
                  <td className="py-3 px-4 text-right text-gray-900">{formatCurrency(totales.totalVentas)}</td>
                  <td className="py-3 px-4 text-right text-red-600">{formatCurrency(totales.totalGastos)}</td>
                  <td className="py-3 px-4 text-right text-orange-600">{formatCurrency(totales.totalCuentasPorPagar)}</td>
                  <td className={`py-3 px-4 text-right ${totales.utilidad >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totales.utilidad)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;

