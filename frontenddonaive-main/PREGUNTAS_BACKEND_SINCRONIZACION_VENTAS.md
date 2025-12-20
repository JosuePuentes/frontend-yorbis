# 🔍 PREGUNTAS PARA EL BACKEND - SINCRONIZACIÓN DE VENTAS

## 🔴 PROBLEMA

Las ventas confirmadas e impresas desde el módulo "Punto de Venta" NO están apareciendo en el módulo "Resumen de Venta Diaria".

**Frontend está llamando:**
```
GET /punto-venta/ventas/usuario?sucursal=01&limit=10000&fecha_inicio=2025-12-20&fecha_fin=2025-12-20
```

**Frontend espera recibir:**
- Array de ventas con estado `"procesada"`
- Cada venta debe tener `items` o `productos` con todos los productos vendidos
- Cada venta debe tener `numero_factura` o `numeroFactura`

---

## ❓ PREGUNTAS ESPECÍFICAS PARA EL BACKEND

### 1. ¿Las ventas se están guardando en la base de datos?

**Pregunta:** ¿Puedes ejecutar esta consulta en MongoDB y decirme cuántas ventas hay?

```javascript
db.VENTAS.find().count()
```

**También:**
```javascript
db.VENTAS.find().sort({ fecha: -1 }).limit(5).forEach(v => {
  print("ID:", v._id);
  print("Estado:", v.estado);
  print("Fecha:", v.fecha);
  print("Sucursal:", v.sucursal || v.farmacia);
  print("---");
});
```

**¿Qué necesito saber?**
- ✅ ¿Existen ventas en la colección `VENTAS`?
- ✅ ¿Cuántas ventas hay en total?
- ✅ ¿Cuál es el estado de las últimas ventas?

---

### 2. ¿Las ventas tienen estado "procesada"?

**Pregunta:** ¿Puedes ejecutar esta consulta y decirme cuántas ventas tienen estado "procesada"?

```javascript
db.VENTAS.find({ estado: "procesada" }).count()
```

**También:**
```javascript
db.VENTAS.find({ estado: "procesada" }).sort({ fecha: -1 }).limit(3).forEach(v => {
  print("Estado:", v.estado);
  print("Fecha:", v.fecha);
  print("Número factura:", v.numero_factura || v.numeroFactura);
  print("---");
});
```

**¿Qué necesito saber?**
- ✅ ¿Existen ventas con estado `"procesada"` (EXACTAMENTE este string)?
- ✅ ¿O tienen otro estado como "confirmada", "impresa", etc.?
- ✅ ¿Cuál es el estado exacto de las ventas recientes?

---

### 3. ¿Las ventas tienen items/productos?

**Pregunta:** ¿Puedes ejecutar esta consulta y decirme si las ventas tienen items?

```javascript
db.VENTAS.findOne({ estado: "procesada" }, { items: 1, productos: 1, estado: 1 })
```

**¿Qué necesito saber?**
- ✅ ¿Las ventas tienen el campo `items`?
- ✅ ¿O tienen el campo `productos`?
- ✅ ¿Cuántos items/productos tiene cada venta?
- ✅ ¿Cada item tiene `codigo`, `nombre` o `descripcion`, `cantidad`, `precio_unitario`, `subtotal`?

---

### 4. ¿El endpoint GET /punto-venta/ventas/usuario está funcionando?

**Pregunta:** ¿Puedes probar el endpoint directamente y decirme qué retorna?

**URL de prueba:**
```
GET /punto-venta/ventas/usuario?sucursal=01&limit=10
```

**Sin filtro de fecha:**
```
GET /punto-venta/ventas/usuario?sucursal=01&limit=10
```

**Con filtro de fecha:**
```
GET /punto-venta/ventas/usuario?sucursal=01&fecha_inicio=2025-12-20&fecha_fin=2025-12-20&limit=10
```

**¿Qué necesito saber?**
- ✅ ¿El endpoint retorna un array?
- ✅ ¿Retorna ventas?
- ✅ ¿Cuántas ventas retorna?
- ✅ ¿Cada venta tiene `estado: "procesada"`?
- ✅ ¿Cada venta tiene `items` o `productos`?
- ✅ ¿Cada venta tiene `numero_factura` o `numeroFactura`?

---

### 5. ¿El filtro por estado está funcionando correctamente?

**Pregunta:** ¿Puedes ejecutar esta consulta y decirme qué retorna?

```javascript
// Probar el filtro exacto que usa el endpoint
db.VENTAS.find({
  estado: "procesada",
  $or: [
    { sucursal: "01" },
    { farmacia: "01" }
  ]
}).count()
```

**¿Qué necesito saber?**
- ✅ ¿El filtro `{ estado: "procesada" }` encuentra ventas?
- ✅ ¿O necesitas usar otro estado como `"confirmada"` o `"impresa"`?
- ✅ ¿El filtro por sucursal está funcionando?

---

### 6. ¿Las ventas tienen número de factura?

**Pregunta:** ¿Puedes ejecutar esta consulta y decirme si las ventas tienen número de factura?

```javascript
db.VENTAS.find({ estado: "procesada" }).forEach(v => {
  print("Número factura:", v.numero_factura || v.numeroFactura || "NO TIENE");
  print("Estado:", v.estado);
  print("---");
});
```

**¿Qué necesito saber?**
- ✅ ¿Las ventas tienen el campo `numero_factura`?
- ✅ ¿O tienen el campo `numeroFactura` (camelCase)?
- ✅ ¿O no tienen número de factura?

---

### 7. ¿La fecha de las ventas es correcta?

**Pregunta:** ¿Puedes ejecutar esta consulta y decirme qué fecha tienen las ventas?

```javascript
db.VENTAS.find({ estado: "procesada" }).sort({ fecha: -1 }).limit(5).forEach(v => {
  print("Fecha:", v.fecha);
  print("Fecha tipo:", typeof v.fecha);
  print("Estado:", v.estado);
  print("---");
});
```

**¿Qué necesito saber?**
- ✅ ¿Las fechas son correctas (no futuras)?
- ✅ ¿El formato de fecha es correcto?
- ✅ ¿Las fechas coinciden con las fechas de las ventas que se están haciendo?

---

### 8. ¿El endpoint POST /punto-venta/ventas está guardando correctamente?

**Pregunta:** ¿Puedes verificar en los logs del backend cuando se crea una venta?

**Cuando el frontend llama:**
```
POST /punto-venta/ventas
Body: {
  "items": [...],
  "metodos_pago": [...],
  "estado": "procesada",
  "sucursal": "01",
  ...
}
```

**¿Qué necesito saber?**
- ✅ ¿El backend recibe el campo `estado: "procesada"`?
- ✅ ¿El backend guarda la venta con estado `"procesada"`?
- ✅ ¿El backend genera el `numero_factura` automáticamente?
- ✅ ¿El backend guarda el array `items` o `productos` completo?
- ✅ ¿Hay algún error en los logs cuando se crea una venta?

---

## 📋 CHECKLIST DE VERIFICACIÓN

Por favor, confirma cada punto:

### Base de Datos:
- [ ] Existen ventas en la colección `VENTAS`
- [ ] Las ventas tienen `estado: "procesada"` (EXACTAMENTE este string)
- [ ] Las ventas tienen `numero_factura` o `numeroFactura`
- [ ] Las ventas tienen array `items` o `productos` con productos
- [ ] Las fechas son correctas (no futuras)

### Endpoint POST /punto-venta/ventas:
- [ ] Recibe `estado: "procesada"` del frontend
- [ ] Guarda la venta con estado `"procesada"` (EXACTAMENTE)
- [ ] Genera `numero_factura` automáticamente
- [ ] Guarda array `items` o `productos` completo
- [ ] Guarda fecha correctamente

### Endpoint GET /punto-venta/ventas/usuario:
- [ ] Filtra por `estado: "procesada"` (EXACTAMENTE)
- [ ] Filtra por `sucursal` o `farmacia` correctamente
- [ ] Retorna array de ventas (no objeto vacío)
- [ ] Cada venta tiene `items` o `productos`
- [ ] Cada venta tiene `numero_factura` o `numeroFactura`
- [ ] Cada venta tiene `estado: "procesada"`

---

## 🔍 PRUEBA RÁPIDA

### Paso 1: Crear una venta de prueba
1. Desde el punto de venta, crear una venta
2. Confirmar e imprimir

### Paso 2: Verificar inmediatamente en MongoDB
```javascript
// Ver la última venta creada
db.VENTAS.find().sort({ fecha: -1 }).limit(1).pretty()
```

**Verificar:**
- ✅ `estado` es `"procesada"`
- ✅ `numero_factura` existe
- ✅ `items` o `productos` tiene productos
- ✅ `fecha` es la fecha actual

### Paso 3: Consultar el endpoint
```bash
GET /punto-venta/ventas/usuario?sucursal=01&limit=10
```

**Verificar:**
- ✅ Retorna la venta recién creada
- ✅ Tiene `estado: "procesada"`
- ✅ Tiene `items` o `productos`
- ✅ Tiene `numero_factura` o `numeroFactura`

---

## 📝 RESPUESTA ESPERADA

Por favor, proporciona:

1. **Cantidad de ventas en la BD:** `X ventas`
2. **Cantidad con estado "procesada":** `X ventas`
3. **Estado de las últimas ventas:** `"procesada"` o `"otro estado"`
4. **Si tienen items/productos:** `Sí` o `No`
5. **Si tienen numero_factura:** `Sí` o `No`
6. **Resultado del endpoint:** `Array con X ventas` o `Array vacío []`
7. **Errores en logs:** `Ninguno` o `[descripción del error]`

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 URGENTE - CRÍTICO  
**Estado:** ⚠️ PENDIENTE DE RESPUESTA DEL BACKEND

