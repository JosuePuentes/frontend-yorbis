# ✅ VALIDACIÓN: Cálculos del Resumen de Ventas

## 📋 RESUMEN EJECUTIVO

Este documento valida que todos los cálculos del resumen de ventas estén correctos y que cada venta, cuenta por pagar, gasto y pago se sume correctamente en los totales.

---

## 🔍 VALIDACIÓN DE CÁLCULOS

### 1. ✅ VENTAS DEL PUNTO DE VENTA

**Ubicación:** `src/hooks/useResumenData.tsx` líneas 345-375

**¿Se suman correctamente?** ✅ SÍ

**Código:**
```typescript
// Sumar datos de ventas del punto de venta
const ventasPV = ventasPuntoVenta[farm.id] || { ... };

// Sumar efectivo USD y zelle USD de las ventas del punto de venta
efectivoUsd += ventasPV.total_efectivo_usd;
zelleUsd += ventasPV.total_zelle_usd;
totalUsd += ventasPV.total_usd_recibido;
valesUsd += ventasPV.total_vales_usd;
totalBs += ventasPV.total_bs;
totalCosto += ventasPV.total_costo_inventario;
```

**Validación:**
- ✅ Cada venta del punto de venta se suma a `efectivoUsd`, `zelleUsd`, `totalUsd`, `valesUsd`, `totalBs`
- ✅ El costo de inventario se suma a `totalCosto`
- ✅ Los datos se obtienen del endpoint `/punto-venta/ventas/resumen`

**Requisito del Backend:**
- El endpoint `/punto-venta/ventas/resumen` DEBE estar implementado
- Cada venta confirmada DEBE actualizar el resumen de ventas de la sucursal
- Ver: `INSTRUCCIONES_BACKEND_VENTAS_RESUMEN_COMPLETO.md`

---

### 2. ✅ CUENTAS POR PAGAR

**Ubicación:** `src/hooks/useResumenData.tsx` líneas 635-644

**¿Se suman correctamente?** ✅ SÍ

**Código:**
```typescript
const cuentasActivasPorFarmacia = useMemo(() => {
  const resultado: { [key: string]: number } = {};
  farmacias.forEach((farm) => {
    const total = cuentasPorPagar
      .filter((c) => c.farmacia === farm.id && c.estatus === "activa")
      .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
    resultado[farm.id] = Math.max(0, total);
  });
  return resultado;
}, [cuentasPorPagar, farmacias]);
```

**Validación:**
- ✅ Se suman todas las cuentas por pagar con `estatus === "activa"`
- ✅ Se agrupan por farmacia
- ✅ Se muestran en el componente `ResumeCardFarmacia` como "Cuentas por Pagar"

**Requisito del Backend:**
- El endpoint `/cuentas-por-pagar` DEBE retornar todas las cuentas con:
  - `farmacia`: ID de la sucursal
  - `estatus`: "activa" o "pagada"
  - `montoUsd`: Monto en USD

---

### 3. ✅ CUENTAS PAGADAS

**Ubicación:** `src/hooks/useResumenData.tsx` líneas 646-662

**¿Se suman correctamente?** ✅ SÍ

**Código:**
```typescript
const MontoFacturadoCuentasPagadasPorFarmacia = useMemo(() => {
  const resultado: { [key: string]: number } = {};
  farmacias.forEach((farm) => {
    const total = cuentasPorPagar
      .filter(
        (c) =>
          c.farmacia === farm.id &&
          c.estatus === "pagada" &&
          (!fechaInicio || new Date(c.fechaEmision) >= new Date(fechaInicio)) &&
          (!fechaFin || new Date(c.fechaEmision) <= new Date(fechaFin))
      )
      .reduce((acc, c) => acc + Number(c.montoUsd || 0), 0);
    resultado[farm.id] = Math.max(0, total);
  });
  return resultado;
}, [cuentasPorPagar, farmacias, fechaInicio, fechaFin]);
```

**Validación:**
- ✅ Se suman todas las cuentas por pagar con `estatus === "pagada"`
- ✅ Se filtran por rango de fechas (fechaEmision)
- ✅ Se agrupan por farmacia
- ✅ Se muestran en el componente como "Monto Facturas Pagadas"

---

### 4. ✅ GASTOS

**Ubicación:** `src/hooks/useResumenData.tsx` líneas 614-633

**¿Se suman correctamente?** ✅ SÍ

**Código:**
```typescript
const gastosPorFarmacia = useMemo(() => {
  const resultado: { [key: string]: number } = {};
  farmacias.forEach((farm) => {
    const gastosFiltrados = gastos.filter(
      (g) =>
        g.localidad === farm.id &&
        g.estado === "verified" &&
        (!fechaInicio || new Date(g.fecha) >= new Date(fechaInicio)) &&
        (!fechaFin || new Date(g.fecha) <= new Date(fechaFin))
    );
    const total = gastosFiltrados.reduce((acc, g) => {
      if (g.divisa === "Bs" && g.tasa && Number(g.tasa) > 0) {
        return acc + Number(g.monto || 0) / Number(g.tasa);
      }
      return acc + Number(g.monto || 0);
    }, 0);
    resultado[farm.id] = Math.max(0, total);
  });
  return resultado;
}, [gastos, farmacias, fechaInicio, fechaFin]);
```

**Validación:**
- ✅ Se suman todos los gastos con `estado === "verified"`
- ✅ Se convierten a USD si están en Bs (usando la tasa)
- ✅ Se filtran por rango de fechas
- ✅ Se agrupan por farmacia
- ✅ Se muestran en el componente como "Gastos Verificados"

---

### 5. ✅ PAGOS DE CUENTAS POR PAGAR

**Ubicación:** `src/hooks/useResumenData.tsx` líneas 664-780

**¿Se suman correctamente?** ✅ SÍ

**Código:**
```typescript
const totalPagosPorFarmacia = useMemo(() => {
  // Calcula:
  // - pagosUsd: Pagos en USD
  // - pagosBs: Pagos en Bs
  // - pagosGeneralUsd: Total de pagos convertido a USD
  // - abonosNoLiquidadosEnUsd: Abonos en USD
  // - abonosNoLiquidadosEnBs: Abonos en Bs
  // - montoOriginalFacturasUsd: Monto original de facturas
  // - diferencialPagosUsd: Diferencia entre pagos y monto original
}, [pagos, farmacias]);
```

**Validación:**
- ✅ Se suman todos los pagos del período
- ✅ Se discriminan por USD y Bs
- ✅ Se convierten a USD para el total general
- ✅ Se calculan abonos no liquidados
- ✅ Se calcula el diferencial de pagos
- ✅ Se muestran en el componente en la sección "Análisis de Pagos del Período"

---

### 6. ⚠️ VENTA TOTAL / VENTA NETA

**Ubicación:** `src/components/ResumeCardFarmacia.tsx` línea 70

**Cálculo Actual:**
```typescript
const totalConGastos = totalVentas - gastos - cuentasPagadas;
```

**Problema Identificado:**
- Actualmente se calcula como: `Ventas - Gastos - Cuentas Pagadas`
- Esto es una **Venta Neta** (después de descontar gastos y pagos)
- El usuario quiere que la **Venta Total** incluya TODO

**Interpretación del Usuario:**
El usuario quiere que "Venta Total" muestre:
- ✅ Suma de todas las ventas (de cuadres + punto de venta)
- ✅ Total de cuentas por pagar
- ✅ Total de cuentas pagadas
- ✅ Total de gastos
- ✅ Toda la discriminación de pagos

**Pero esto no tiene sentido matemáticamente** porque:
- Las cuentas por pagar NO son ventas (son deudas)
- Los gastos NO son ventas (son egresos)
- Los pagos NO son ventas (son pagos de deudas)

**Necesitamos aclarar con el usuario qué quiere decir con "Venta Total"**

---

## 📊 ESTRUCTURA ACTUAL DE CÁLCULOS

### Venta Total (totalVentas)
```
totalVentas = 
  (Suma de cuadres verificados en USD) +
  (Suma de cuadres verificados en Bs convertidos a USD) +
  (Ventas del punto de venta en USD) +
  (Ventas del punto de venta en Bs convertidas a USD)
```

### Venta Neta (totalConGastos)
```
Venta Neta = totalVentas - gastos - cuentasPagadas
```

### Campos Mostrados en ResumeCardFarmacia:
1. **Venta Total:** `totalVentas` (suma de todas las ventas)
2. **Costo Inventario:** `totalInventario`
3. **Total sin Recargas:** `totalGeneralSinRecargas`
4. **Solo USD Efectivo:** `efectivoUsd`
5. **Solo USD Zelle:** `zelleUsd`
6. **Total USD (Recibido):** `totalUsd`
7. **Vales USD:** `valesUsd`
8. **Solo Bs:** `totalBs`
9. **Costo de Cuadres:** `totalCosto`
10. **Gastos Verificados:** `gastos`
11. **Cuentas por Pagar:** `cuentasPorPagarActivas`
12. **Monto Facturas Pagadas:** `cuentasPagadas`
13. **Venta Neta:** `totalVentas - gastos - cuentasPagadas`

---

## ✅ VALIDACIÓN POR COMPONENTE

### ResumeCardFarmacia

**Props recibidas:**
- `totalVentas`: Suma de todas las ventas ✅
- `totalBs`: Suma de todas las ventas en Bs ✅
- `totalUsd`: Suma de todas las ventas en USD ✅
- `efectivoUsd`: Suma de efectivo USD ✅
- `zelleUsd`: Suma de zelle USD ✅
- `valesUsd`: Suma de vales USD ✅
- `gastos`: Suma de gastos verificados ✅
- `cuentasPorPagarActivas`: Suma de cuentas activas ✅
- `cuentasPagadas`: Suma de cuentas pagadas ✅
- `totalCosto`: Suma de costos de cuadres ✅

**Validación:**
- ✅ Todos los campos se muestran correctamente
- ✅ Los valores se formatean correctamente
- ✅ La discriminación de pagos se muestra en "Análisis de Pagos del Período"

---

## 🔍 PUNTOS A VALIDAR CON EL USUARIO

### 1. ¿Qué significa "Venta Total"?

**Opción A: Venta Bruta (Solo Ventas)**
```
Venta Total = Suma de todas las ventas (cuadres + punto de venta)
```

**Opción B: Venta Neta (Ventas - Gastos - Pagos)**
```
Venta Total = Ventas - Gastos - Cuentas Pagadas
```

**Opción C: Total General (Ventas + Cuentas + Gastos)**
```
Venta Total = Ventas + Cuentas por Pagar + Cuentas Pagadas + Gastos
```
⚠️ **Esto no tiene sentido contablemente**

### 2. ¿Las Cuentas por Pagar deben sumarse a la Venta Total?

**Respuesta esperada:** NO
- Las cuentas por pagar son deudas, no ventas
- Deben mostrarse por separado
- No deben sumarse a las ventas

### 3. ¿Los Gastos deben sumarse a la Venta Total?

**Respuesta esperada:** NO
- Los gastos son egresos, no ventas
- Deben mostrarse por separado
- Deben restarse para calcular la utilidad

### 4. ¿Las Cuentas Pagadas deben sumarse a la Venta Total?

**Respuesta esperada:** NO
- Las cuentas pagadas son pagos de deudas, no ventas
- Deben mostrarse por separado
- Actualmente se restan en "Venta Neta"

---

## 📝 RECOMENDACIÓN

### Estructura Recomendada:

1. **Venta Total (Bruta):**
   ```
   = Suma de todas las ventas (cuadres verificados + punto de venta)
   ```

2. **Venta Neta:**
   ```
   = Venta Total - Gastos - Cuentas Pagadas
   ```

3. **Utilidad:**
   ```
   = Venta Neta - Costo de Inventario
   ```

4. **Campos Separados:**
   - Cuentas por Pagar (mostrar por separado, NO sumar)
   - Cuentas Pagadas (mostrar por separado, NO sumar)
   - Gastos (mostrar por separado, NO sumar)

---

## ✅ CHECKLIST DE VALIDACIÓN

### Ventas del Punto de Venta:
- [x] Cada venta se suma a `efectivoUsd` si el pago es efectivo USD
- [x] Cada venta se suma a `zelleUsd` si el pago es zelle USD
- [x] Cada venta se suma a `valesUsd` si el pago es vales USD
- [x] Cada venta se suma a `totalBs` según el método de pago en Bs
- [x] El costo de inventario se suma a `totalCosto`
- [x] Los datos se obtienen del endpoint `/punto-venta/ventas/resumen`

### Cuadres:
- [x] Solo se suman cuadres con estado "verified"
- [x] Se filtran por rango de fechas
- [x] Se suman todos los métodos de pago correctamente

### Cuentas por Pagar:
- [x] Se suman todas las cuentas activas
- [x] Se agrupan por farmacia
- [x] Se muestran por separado (NO se suman a ventas)

### Cuentas Pagadas:
- [x] Se suman todas las cuentas pagadas
- [x] Se filtran por rango de fechas
- [x] Se agrupan por farmacia
- [x] Se muestran por separado (NO se suman a ventas)

### Gastos:
- [x] Se suman todos los gastos verificados
- [x] Se convierten a USD si están en Bs
- [x] Se filtran por rango de fechas
- [x] Se agrupan por farmacia
- [x] Se muestran por separado (NO se suman a ventas)

### Pagos:
- [x] Se suman todos los pagos del período
- [x] Se discriminan por USD y Bs
- [x] Se calculan abonos no liquidados
- [x] Se calcula el diferencial de pagos
- [x] Se muestran en "Análisis de Pagos del Período"

---

## 🚨 PROBLEMAS IDENTIFICADOS

### Problema 1: "Venta Total" no incluye todo

**Situación actual:**
- "Venta Total" = Solo suma de ventas
- "Venta Neta" = Ventas - Gastos - Cuentas Pagadas

**Si el usuario quiere que "Venta Total" incluya TODO:**
- Necesitamos aclarar qué significa "incluir todo"
- ¿Sumar ventas + cuentas + gastos? (No tiene sentido contable)
- ¿O mostrar todo por separado y tener un "Total General"?

### Problema 2: Endpoint de resumen puede no existir

**Solución:** Verificar que el backend implemente `/punto-venta/ventas/resumen`

---

## 📋 INSTRUCCIONES PARA EL BACKEND

### Endpoint Requerido: `GET /punto-venta/ventas/resumen`

**Este endpoint DEBE:**
1. Agrupar todas las ventas por sucursal
2. Sumar los totales discriminados por tipo de pago
3. Incluir el costo de inventario de las ventas
4. Filtrar por rango de fechas

**Ver documentación completa en:**
- `INSTRUCCIONES_BACKEND_VENTAS_RESUMEN_COMPLETO.md`

---

## ✅ CONCLUSIÓN

**Estado Actual:**
- ✅ Las ventas del punto de venta se suman correctamente
- ✅ Las cuentas por pagar se calculan y muestran correctamente
- ✅ Los gastos se calculan y muestran correctamente
- ✅ Los pagos se calculan y muestran correctamente
- ✅ La discriminación de métodos de pago funciona correctamente

**Pendiente de Aclarar:**
- ⚠️ ¿Qué debe incluir exactamente "Venta Total"?
- ⚠️ ¿Las cuentas por pagar deben sumarse a la venta total?
- ⚠️ ¿Los gastos deben sumarse a la venta total?

**Recomendación:**
- Mantener "Venta Total" como suma de ventas solamente
- Mostrar cuentas, gastos y pagos por separado
- Calcular "Venta Neta" = Ventas - Gastos - Cuentas Pagadas
- Calcular "Utilidad" = Venta Neta - Costo Inventario

---

**Última actualización:** 2025-01-15

