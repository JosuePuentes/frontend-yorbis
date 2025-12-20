# 📋 INSTRUCCIONES BACKEND: Utilidad del 40% por Defecto (Solo Porcentaje)

## 🎯 REQUERIMIENTO PRINCIPAL

**CRÍTICO:** Todo el inventario debe tener una utilidad del **40%** por defecto. La utilidad se maneja **SOLO como porcentaje**, no como monto en dinero. Cuando se crea un producto nuevo o se carga inventario masivamente, si no se especifica un porcentaje de utilidad, debe establecerse automáticamente como **40%**.

---

## 📊 FÓRMULA DE CÁLCULO

### Utilidad como Porcentaje (40% por defecto)

```
Porcentaje de Utilidad = 40% (por defecto)
Utilidad (en dinero) = Costo × (Porcentaje de Utilidad / 100)
Precio de Venta = Costo + Utilidad
Precio de Venta = Costo × (1 + Porcentaje de Utilidad / 100)
Precio de Venta = Costo × 1.40 (si es 40%)
```

**Ejemplo:**
- Costo: $10.00
- Porcentaje de Utilidad: 40%
- Utilidad (en dinero): $10.00 × 0.40 = $4.00
- Precio de Venta: $10.00 + $4.00 = $14.00

---

## 🔧 ENDPOINTS AFECTADOS

### 1. `POST /inventarios/upload-excel`

**Request Body:**
```json
{
  "sucursal": "sucursal_id",
  "productos": [
    {
      "codigo": "PROD001",
      "nombre": "Aspirina 500mg",
      "marca": "Bayer",
      "costo": 2.50,
      "utilidad": 1.00,              // Opcional: si viene vacío o 0, calcular 40%
      "porcentaje_utilidad": 40.0,   // Opcional: si no viene, usar 40% por defecto
      "precio": 3.50,                 // Opcional: se calcula automáticamente
      "stock": 100
    }
  ]
}
```

**Lógica Requerida:**

```python
for producto in request.productos:
    costo = producto.costo or 0
    
    # ✅ Determinar porcentaje de utilidad (40% por defecto)
    porcentaje_utilidad = producto.porcentaje_utilidad or producto.porcentaje_ganancia or 40.0
    
    # Si viene utilidad en dinero, calcular porcentaje
    if producto.utilidad and producto.utilidad > 0:
        if costo > 0:
            porcentaje_calculado = (producto.utilidad / costo) * 100
            porcentaje_utilidad = porcentaje_calculado
        else:
            porcentaje_utilidad = 40.0  # Default si no hay costo
    elif porcentaje_utilidad == 0 or porcentaje_utilidad is None:
        # ✅ Si no viene porcentaje, usar 40% por defecto
        porcentaje_utilidad = 40.0
    
    # Calcular utilidad en dinero desde el porcentaje
    utilidad = costo * (porcentaje_utilidad / 100)
    
    # Calcular precio si no viene
    if not producto.precio or producto.precio == 0:
        precio = costo + utilidad
        # O directamente: precio = costo * (1 + porcentaje_utilidad / 100)
    else:
        precio = producto.precio
        # Recalcular porcentaje desde precio si viene precio pero no porcentaje
        if porcentaje_utilidad == 40.0 and costo > 0:
            porcentaje_utilidad = ((precio - costo) / costo) * 100
    
    # Guardar producto con porcentaje de utilidad
    producto_data = {
        "codigo": producto.codigo,
        "nombre": producto.nombre,
        "marca": producto.marca,
        "costo_unitario": costo,
        "costo": costo,  # Mantener ambos para compatibilidad
        "utilidad": utilidad,  # Utilidad en dinero (calculada)
        "utilidad_porcentaje": porcentaje_utilidad,  # ✅ CRÍTICO: Porcentaje (40% por defecto)
        "porcentaje_ganancia": porcentaje_utilidad,  # Alias para compatibilidad
        "porcentaje_utilidad": porcentaje_utilidad,   # Alias para compatibilidad
        "precio_unitario": precio,
        "precio": precio,  # Mantener ambos para compatibilidad
        "cantidad": producto.stock,
        "existencia": producto.stock,  # Alias
        "sucursal": request.sucursal
    }
```

---

### 2. `POST /inventarios/cargar-existencia`

**Request Body:**
```json
{
  "farmacia": "sucursal_id",
  "productos": [
    {
      "producto_id": "producto_id",
      "cantidad": 10,
      "costo": 5.00,
      "utilidad": 2.00,              // Opcional
      "porcentaje_utilidad": 40.0    // Opcional, default: 40%
    }
  ]
}
```

**Lógica Requerida:**

```python
for producto_request in request.productos:
    costo = producto_request.get("costo") or 0
    porcentaje_proporcionado = producto_request.get("porcentaje_utilidad") or producto_request.get("porcentaje_ganancia") or 0
    utilidad_proporcionada = producto_request.get("utilidad") or 0
    
    # ✅ Determinar porcentaje de utilidad (40% por defecto)
    if porcentaje_proporcionado > 0:
        porcentaje_utilidad = porcentaje_proporcionado
    elif utilidad_proporcionada > 0 and costo > 0:
        # Calcular porcentaje desde utilidad en dinero
        porcentaje_utilidad = (utilidad_proporcionada / costo) * 100
    else:
        # ✅ Si no viene nada, usar 40% por defecto
        porcentaje_utilidad = 40.0
    
    # Calcular utilidad en dinero desde el porcentaje
    utilidad = costo * (porcentaje_utilidad / 100)
    
    # Calcular precio
    precio = costo + utilidad
    
    # Actualizar producto en inventario
    # ... código de actualización ...
    
    # Guardar con porcentaje de utilidad
    item_actualizado = {
        "costo_unitario": costo,
        "utilidad": utilidad,
        "utilidad_porcentaje": porcentaje_utilidad,  # ✅ CRÍTICO: 40% por defecto
        "porcentaje_ganancia": porcentaje_utilidad,
        "porcentaje_utilidad": porcentaje_utilidad,
        "precio_unitario": precio,
        "cantidad": producto_request.get("cantidad", 0)
    }
```

---

### 3. `POST /inventarios/{inventario_id}/items` (Crear nuevo producto)

**Request Body:**
```json
{
  "codigo": "PROD001",
  "descripcion": "Aspirina 500mg",
  "marca": "Bayer",
  "costo": 2.50,
  "existencia": 100,
  "utilidad": 1.00,              // Opcional
  "porcentaje_utilidad": 40.0    // Opcional, default: 40%
}
```

**Lógica Requerida:**

```python
costo = request.costo or 0
porcentaje_proporcionado = request.get("porcentaje_utilidad") or request.get("porcentaje_ganancia") or 0
utilidad_proporcionada = request.get("utilidad") or 0

# ✅ Determinar porcentaje de utilidad (40% por defecto)
if porcentaje_proporcionado > 0:
    porcentaje_utilidad = porcentaje_proporcionado
elif utilidad_proporcionada > 0 and costo > 0:
    porcentaje_utilidad = (utilidad_proporcionada / costo) * 100
else:
    # ✅ Si no viene nada, usar 40% por defecto
    porcentaje_utilidad = 40.0

# Calcular utilidad en dinero desde el porcentaje
utilidad = costo * (porcentaje_utilidad / 100)

# Calcular precio
precio = costo + utilidad

item_data = {
    "codigo": request.codigo,
    "descripcion": request.descripcion,
    "marca": request.marca,
    "costo_unitario": costo,
    "costo": costo,
    "utilidad": utilidad,
    "utilidad_porcentaje": porcentaje_utilidad,  # ✅ CRÍTICO: 40% por defecto
    "porcentaje_ganancia": porcentaje_utilidad,
    "porcentaje_utilidad": porcentaje_utilidad,
    "precio_unitario": precio,
    "precio": precio,
    "cantidad": request.existencia,
    "existencia": request.existencia
}
```

---

### 4. `PATCH /inventarios/{inventario_id}/items/{item_id}` (Modificar item existente)

**Request Body:**
```json
{
  "codigo": "PROD001",
  "descripcion": "Aspirina 500mg",
  "marca": "Bayer",
  "costo_unitario": 2.50,
  "cantidad": 100,
  "precio_unitario": 3.50,
  "porcentaje_ganancia": 40.0    // ✅ Puede venir del frontend cuando se edita
}
```

**Lógica Requerida:**

```python
# Obtener datos del request
costo = request.costo_unitario or request.costo or 0
precio = request.precio_unitario or request.precio or 0
porcentaje_proporcionado = request.get("porcentaje_ganancia") or request.get("porcentaje_utilidad") or request.get("utilidad_porcentaje") or 0

# ✅ Determinar porcentaje de utilidad
if porcentaje_proporcionado > 0:
    # Si viene porcentaje del frontend, usarlo
    porcentaje_utilidad = porcentaje_proporcionado
elif precio > 0 and costo > 0:
    # Calcular desde precio y costo si viene precio pero no porcentaje
    porcentaje_utilidad = ((precio - costo) / costo) * 100
else:
    # ✅ Si no se puede determinar, usar 40% por defecto
    porcentaje_utilidad = 40.0

# Calcular utilidad en dinero
utilidad = costo * (porcentaje_utilidad / 100)

# Si viene precio pero no coincide con el cálculo, usar el precio proporcionado
# pero mantener el porcentaje calculado
if precio > 0:
    precio_final = precio
else:
    precio_final = costo + utilidad

# Actualizar item
item_actualizado = {
    "codigo": request.codigo,
    "descripcion": request.descripcion,
    "marca": request.marca,
    "costo_unitario": costo,
    "utilidad": utilidad,
    "utilidad_porcentaje": porcentaje_utilidad,  # ✅ CRÍTICO: Guardar porcentaje
    "porcentaje_ganancia": porcentaje_utilidad,
    "porcentaje_utilidad": porcentaje_utilidad,
    "precio_unitario": precio_final,
    "cantidad": request.cantidad or request.existencia or 0
}
```

---

## 📊 ESTRUCTURA DE BASE DE DATOS

**Colección: `items_inventario` o `productos`**

```javascript
{
  _id: ObjectId,
  codigo: String,
  descripcion: String,
  marca: String,
  costo_unitario: Number,        // Costo del producto
  costo: Number,                 // Alias de costo_unitario
  utilidad: Number,              // Utilidad en dinero (calculada: costo × porcentaje_utilidad / 100)
  utilidad_porcentaje: Number,   // ✅ CRÍTICO: Porcentaje de utilidad (default: 40.0)
  porcentaje_ganancia: Number,  // Alias de utilidad_porcentaje
  porcentaje_utilidad: Number,   // Alias de utilidad_porcentaje
  precio_unitario: Number,        // Precio de venta (costo + utilidad)
  precio: Number,                 // Alias de precio_unitario
  cantidad: Number,              // Existencia actual
  existencia: Number,            // Alias de cantidad
  sucursal: String,              // ID de la sucursal
  inventario_id: String,         // ID del inventario
  lotes: Array,                  // Array de lotes (opcional)
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

**Campos Críticos:**
- `utilidad_porcentaje`: **DEBE** ser 40.0 por defecto si no se especifica
- `utilidad`: Se calcula automáticamente desde `costo × (utilidad_porcentaje / 100)`
- `precio_unitario`: Se calcula automáticamente desde `costo + utilidad`

---

## ✅ REGLAS DE NEGOCIO

### Regla 1: Porcentaje de Utilidad por Defecto

**SIEMPRE** que se cree o actualice un producto y no se especifique un porcentaje de utilidad, debe establecerse como **40%**.

```python
# Pseudocódigo
if porcentaje_utilidad is None or porcentaje_utilidad == 0:
    porcentaje_utilidad = 40.0
```

### Regla 2: Cálculo de Precio desde Porcentaje

El precio **SIEMPRE** se calcula desde el costo y el porcentaje de utilidad:

```python
utilidad = costo * (porcentaje_utilidad / 100)
precio = costo + utilidad
```

### Regla 3: Prioridad de Valores

Cuando se recibe un producto, el backend debe determinar el porcentaje de utilidad en este orden:

1. **Si viene `porcentaje_utilidad` o `porcentaje_ganancia`**: Usar ese valor
2. **Si viene `utilidad` (en dinero) y hay `costo`**: Calcular porcentaje = `(utilidad / costo) × 100`
3. **Si viene `precio` y hay `costo`**: Calcular porcentaje = `((precio - costo) / costo) × 100`
4. **Si no viene nada**: Usar **40% por defecto**

### Regla 4: Al Editar un Item

Cuando se modifica un item desde el frontend:

- El frontend puede enviar `porcentaje_ganancia` o `porcentaje_utilidad`
- El backend debe usar ese valor si viene
- Si no viene, calcular desde `precio` y `costo`
- Si no se puede calcular, usar **40% por defecto**

---

## 🔄 FLUJO DE CREACIÓN DE PRODUCTO

```
Usuario crea producto
    ↓
Backend recibe: costo, (opcional: porcentaje_utilidad, utilidad, precio)
    ↓
¿Viene porcentaje_utilidad?
    ├─ SÍ → Usar ese porcentaje
    └─ NO → ¿Viene utilidad en dinero?
        ├─ SÍ → Calcular porcentaje = (utilidad / costo) × 100
        └─ NO → ¿Viene precio?
            ├─ SÍ → Calcular porcentaje = ((precio - costo) / costo) × 100
            └─ NO → ✅ Usar 40% por defecto
    ↓
Calcular utilidad = costo × (porcentaje_utilidad / 100)
    ↓
Calcular precio = costo + utilidad
    ↓
Guardar producto con:
    - costo_unitario
    - utilidad_porcentaje: 40.0 (o el calculado)
    - utilidad: (calculada)
    - precio_unitario: (calculado)
```

---

## 📝 EJEMPLOS DE IMPLEMENTACIÓN

### Ejemplo 1: Crear Producto sin Utilidad

**Request:**
```json
{
  "codigo": "PROD001",
  "descripcion": "Aspirina",
  "costo": 10.00,
  "existencia": 100
}
```

**Procesamiento:**
```python
costo = 10.00
porcentaje_utilidad = 40.0  # ✅ Por defecto
utilidad = 10.00 * 0.40 = 4.00
precio = 10.00 + 4.00 = 14.00
```

**Resultado en BD:**
```json
{
  "costo_unitario": 10.00,
  "utilidad_porcentaje": 40.0,
  "utilidad": 4.00,
  "precio_unitario": 14.00
}
```

### Ejemplo 2: Crear Producto con Utilidad Personalizada

**Request:**
```json
{
  "codigo": "PROD002",
  "descripcion": "Paracetamol",
  "costo": 8.00,
  "porcentaje_utilidad": 50.0,
  "existencia": 50
}
```

**Procesamiento:**
```python
costo = 8.00
porcentaje_utilidad = 50.0  # Usar el proporcionado
utilidad = 8.00 * 0.50 = 4.00
precio = 8.00 + 4.00 = 12.00
```

**Resultado en BD:**
```json
{
  "costo_unitario": 8.00,
  "utilidad_porcentaje": 50.0,
  "utilidad": 4.00,
  "precio_unitario": 12.00
}
```

### Ejemplo 3: Editar Item y Cambiar Utilidad

**Request:**
```json
{
  "costo_unitario": 10.00,
  "porcentaje_ganancia": 35.0,  // Usuario cambió a 35%
  "cantidad": 100
}
```

**Procesamiento:**
```python
costo = 10.00
porcentaje_utilidad = 35.0  # Usar el proporcionado
utilidad = 10.00 * 0.35 = 3.50
precio = 10.00 + 3.50 = 13.50
```

**Resultado en BD:**
```json
{
  "costo_unitario": 10.00,
  "utilidad_porcentaje": 35.0,
  "utilidad": 3.50,
  "precio_unitario": 13.50
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Endpoints de Creación/Carga

- [ ] `POST /inventarios/upload-excel`: Usar 40% por defecto si no viene porcentaje
- [ ] `POST /inventarios/cargar-existencia`: Usar 40% por defecto si no viene porcentaje
- [ ] `POST /inventarios/{inventario_id}/items`: Usar 40% por defecto si no viene porcentaje

### Endpoints de Modificación

- [ ] `PATCH /inventarios/{inventario_id}/items/{item_id}`: 
  - Aceptar `porcentaje_ganancia` o `porcentaje_utilidad` del frontend
  - Si no viene, calcular desde precio y costo
  - Si no se puede calcular, usar 40% por defecto
  - Recalcular `utilidad` y `precio_unitario` desde el porcentaje

### Validaciones

- [ ] Verificar que `utilidad_porcentaje` siempre tenga un valor (nunca null o 0 sin razón)
- [ ] Validar que `porcentaje_utilidad` esté entre 0 y 100
- [ ] Calcular `precio_unitario` automáticamente desde `costo + (costo × porcentaje_utilidad / 100)`
- [ ] Guardar `utilidad_porcentaje`, `porcentaje_ganancia` y `porcentaje_utilidad` con el mismo valor

### Base de Datos

- [ ] Campo `utilidad_porcentaje` siempre presente (default: 40.0)
- [ ] Campo `utilidad` calculado automáticamente
- [ ] Campo `precio_unitario` calculado automáticamente
- [ ] Mantener compatibilidad con campos alias (`costo`, `precio`, `existencia`)

---

## 🎯 RESULTADO ESPERADO

### Al Crear/Cargar Productos:

1. ✅ Si no se especifica utilidad, se establece automáticamente como **40%**
2. ✅ El precio se calcula como: `Costo × 1.40` (si es 40%)
3. ✅ Se guarda `utilidad_porcentaje: 40.0` en la base de datos
4. ✅ El frontend puede verificar que el producto tiene 40% de utilidad

### Al Editar un Item:

1. ✅ El usuario puede modificar el porcentaje de utilidad
2. ✅ El backend recalcula automáticamente `utilidad` y `precio_unitario`
3. ✅ Si el usuario no modifica el porcentaje, se mantiene el existente
4. ✅ Si no hay porcentaje existente, se usa 40% por defecto

### Al Consultar Productos:

1. ✅ Todos los productos tienen `utilidad_porcentaje` (nunca null o 0 sin razón)
2. ✅ El frontend puede mostrar el porcentaje directamente
3. ✅ El porcentaje se muestra claramente (ej: "40.00%")

---

## 📌 NOTAS IMPORTANTES

1. **Porcentaje por Defecto:** El 40% es el valor por defecto, pero puede ser modificado manualmente si es necesario.

2. **Solo Porcentaje:** El frontend ahora muestra solo el porcentaje de utilidad, no el monto en dinero. El backend debe mantener ambos campos (`utilidad` y `utilidad_porcentaje`) para compatibilidad.

3. **Cálculo Automático:** El precio **SIEMPRE** se calcula desde el costo y el porcentaje de utilidad. No se debe permitir que el precio y el porcentaje sean inconsistentes.

4. **Al Editar:** Cuando se edita un item, el usuario puede modificar:
   - El porcentaje de utilidad directamente
   - El precio (y el backend recalcula el porcentaje)
   - El costo (y el backend recalcula precio y utilidad)

5. **Consistencia:** Mantener `utilidad_porcentaje`, `porcentaje_ganancia` y `porcentaje_utilidad` sincronizados (son el mismo campo con diferentes nombres para compatibilidad).

---

## 🔄 FLUJO VISUAL COMPLETO

```
Usuario crea producto
    ↓
Si no especifica utilidad → Backend establece 40% automáticamente
    ↓
Backend calcula: precio = costo × 1.40
    ↓
Guardar producto con utilidad_porcentaje: 40.0
    ↓
Frontend muestra: "40.00% ✓"
    ↓
Usuario edita producto
    ↓
Puede modificar porcentaje de utilidad
    ↓
Backend recalcula precio automáticamente
    ↓
Guardar con nuevo porcentaje
```

---

## 📝 EJEMPLOS DE CÓDIGO COMPLETOS

### Función Helper para Calcular Utilidad

```python
def calcular_utilidad_y_precio(costo: float, porcentaje_utilidad: float = None, 
                                utilidad_dinero: float = None, precio: float = None) -> dict:
    """
    Calcula utilidad y precio desde diferentes combinaciones de parámetros.
    Siempre retorna porcentaje_utilidad (40% por defecto).
    """
    if costo <= 0:
        return {
            "costo": 0,
            "utilidad_porcentaje": 40.0,
            "utilidad": 0,
            "precio_unitario": 0
        }
    
    # Prioridad 1: Porcentaje proporcionado
    if porcentaje_utilidad and porcentaje_utilidad > 0:
        porcentaje_final = porcentaje_utilidad
    # Prioridad 2: Utilidad en dinero proporcionada
    elif utilidad_dinero and utilidad_dinero > 0:
        porcentaje_final = (utilidad_dinero / costo) * 100
    # Prioridad 3: Precio proporcionado
    elif precio and precio > costo:
        porcentaje_final = ((precio - costo) / costo) * 100
    # Prioridad 4: Por defecto 40%
    else:
        porcentaje_final = 40.0
    
    # Calcular utilidad y precio desde el porcentaje
    utilidad = costo * (porcentaje_final / 100)
    precio_final = precio if precio and precio > 0 else (costo + utilidad)
    
    return {
        "costo": costo,
        "utilidad_porcentaje": porcentaje_final,
        "porcentaje_ganancia": porcentaje_final,
        "porcentaje_utilidad": porcentaje_final,
        "utilidad": utilidad,
        "precio_unitario": precio_final,
        "precio": precio_final
    }
```

### Ejemplo de Uso en Endpoint

```python
@router.post("/inventarios/{inventario_id}/items")
async def crear_item_inventario(
    inventario_id: str,
    item_data: ItemInventarioRequest,
    current_user: dict = Depends(get_current_user)
):
    # Calcular utilidad y precio usando la función helper
    resultado = calcular_utilidad_y_precio(
        costo=item_data.costo or 0,
        porcentaje_utilidad=item_data.porcentaje_utilidad,
        utilidad_dinero=item_data.utilidad,
        precio=item_data.precio
    )
    
    nuevo_item = {
        "codigo": item_data.codigo,
        "descripcion": item_data.descripcion,
        "marca": item_data.marca,
        "costo_unitario": resultado["costo"],
        "utilidad_porcentaje": resultado["utilidad_porcentaje"],  # ✅ 40% por defecto
        "porcentaje_ganancia": resultado["porcentaje_ganancia"],
        "porcentaje_utilidad": resultado["porcentaje_utilidad"],
        "utilidad": resultado["utilidad"],
        "precio_unitario": resultado["precio_unitario"],
        "cantidad": item_data.existencia,
        "existencia": item_data.existencia,
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    # Agregar al inventario
    # ... código de actualización ...
```

---

**Última actualización:** 2025-01-XX  
**Versión:** 2.0  
**Enfoque:** Solo porcentaje de utilidad, 40% por defecto

