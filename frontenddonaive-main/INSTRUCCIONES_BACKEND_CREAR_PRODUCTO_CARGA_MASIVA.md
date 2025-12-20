# 📦 INSTRUCCIONES BACKEND: Crear Producto desde Carga Masiva

## 🎯 REQUERIMIENTO

El frontend tiene un botón "Carga Masiva" en la página de ver inventarios que permite:
1. **Crear productos nuevos** con código, descripción, marca, costo y utilidad
2. **Cargar existencias** de productos existentes o nuevos de forma masiva

---

## 📋 ENDPOINT REQUERIDO

### `POST /inventarios/crear-producto`

Este endpoint debe crear un nuevo producto en el inventario de una sucursal.

---

## 📥 REQUEST BODY

El frontend envía la siguiente estructura:

```json
{
  "farmacia": "sucursal_id",
  "nombre": "Nombre del producto",
  "codigo": "CODIGO123",  // Opcional
  "descripcion": "Descripción del producto",  // Opcional
  "marca": "Marca del producto",  // Opcional
  "costo": 10.50,
  "utilidad": 4.20,  // Opcional (en dinero)
  "porcentaje_utilidad": 40.0,  // Opcional (porcentaje)
  "precio_venta": 14.70  // Opcional (calculado automáticamente si no viene)
}
```

**Campos obligatorios:**
- `farmacia`: ID de la sucursal
- `nombre`: Nombre del producto
- `costo`: Costo del producto (número mayor a 0)

**Campos opcionales:**
- `codigo`: Código del producto
- `descripcion`: Descripción del producto
- `marca`: Marca del producto
- `utilidad`: Utilidad en dinero (si no viene, se calcula desde porcentaje_utilidad)
- `porcentaje_utilidad`: Porcentaje de utilidad (default: 40% si no viene)
- `precio_venta`: Precio de venta (si no viene, se calcula como costo + utilidad)

---

## 🔧 LÓGICA REQUERIDA

### 1. Validaciones

```python
# Validar campos obligatorios
if not request.nombre or not request.nombre.strip():
    raise HTTPException(status_code=400, detail="El nombre del producto es obligatorio")

if not request.costo or request.costo <= 0:
    raise HTTPException(status_code=400, detail="El costo debe ser mayor a 0")

if not request.farmacia:
    raise HTTPException(status_code=400, detail="La sucursal (farmacia) es obligatoria")
```

### 2. Calcular Utilidad y Precio

```python
costo = request.costo
utilidad = 0
porcentaje_utilidad = 40.0  # Default: 40%
precio_venta = 0

# Si viene utilidad en dinero
if request.utilidad and request.utilidad > 0:
    utilidad = request.utilidad
    porcentaje_utilidad = (utilidad / costo) * 100 if costo > 0 else 40.0
    precio_venta = costo + utilidad
# Si viene porcentaje de utilidad
elif request.porcentaje_utilidad and request.porcentaje_utilidad > 0:
    porcentaje_utilidad = request.porcentaje_utilidad
    utilidad = (costo * porcentaje_utilidad) / 100
    precio_venta = costo + utilidad
# Si no viene nada, usar 40% por defecto
else:
    porcentaje_utilidad = 40.0
    utilidad = (costo * porcentaje_utilidad) / 100
    precio_venta = costo + utilidad

# Si viene precio_venta explícito, usarlo (pero recalcular utilidad si es necesario)
if request.precio_venta and request.precio_venta > 0:
    precio_venta = request.precio_venta
    utilidad = precio_venta - costo
    porcentaje_utilidad = (utilidad / costo) * 100 if costo > 0 else 40.0
```

### 3. Buscar o Crear Inventario Activo

```python
# Buscar inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "farmacia": ObjectId(request.farmacia),
    "estado": "activo"  # O el campo que uses para inventarios activos
})

# Si no existe, crear uno nuevo
if not inventario:
    inventario = {
        "_id": ObjectId(),
        "farmacia": ObjectId(request.farmacia),
        "fecha": datetime.now(),
        "estado": "activo",
        "costo": 0,
        "items": [],
        "usuarioCorreo": current_user.get("correo", ""),
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    resultado_inventario = await db.inventarios.insert_one(inventario)
    inventario_id = resultado_inventario.inserted_id
else:
    inventario_id = inventario["_id"]
```

### 4. Crear el Producto/Item

```python
# Crear el nuevo item/producto
nuevo_item = {
    "_id": ObjectId(),
    "codigo": request.codigo.strip() if request.codigo else None,
    "nombre": request.nombre.strip(),
    "descripcion": request.descripcion.strip() if request.descripcion else request.nombre.strip(),
    "marca": request.marca.strip() if request.marca else None,
    "costo_unitario": costo,
    "precio_unitario": precio_venta,
    "utilidad": utilidad,
    "utilidad_porcentaje": porcentaje_utilidad,
    "cantidad": 0,  # Inicialmente sin stock
    "existencia": 0,  # Alias de cantidad
    "inventario_id": inventario_id,
    "farmacia": ObjectId(request.farmacia),
    "fecha_creacion": datetime.now(),
    "fecha_actualizacion": datetime.now()
}

# Agregar el item al inventario
if "items" not in inventario:
    inventario["items"] = []

inventario["items"].append(nuevo_item)

# Actualizar el inventario
await db.inventarios.update_one(
    {"_id": inventario_id},
    {
        "$set": {
            "items": inventario["items"],
            "fecha_actualizacion": datetime.now()
        }
    }
)

# O si los items están en una colección separada:
# await db.items_inventario.insert_one(nuevo_item)
```

### 5. Recalcular Costo Total del Inventario

```python
# Recalcular costo total del inventario
items_inventario = inventario.get("items", [])
costo_total = sum(
    item.get("costo_unitario", 0) * item.get("cantidad", 0)
    for item in items_inventario
)

await db.inventarios.update_one(
    {"_id": inventario_id},
    {
        "$set": {
            "costo": costo_total
        }
    }
)
```

---

## 📤 RESPONSE

### Respuesta Exitosa (200)

```json
{
  "message": "Producto creado exitosamente",
  "producto": {
    "id": "producto_id",
    "_id": "producto_id",
    "codigo": "CODIGO123",
    "nombre": "Nombre del producto",
    "descripcion": "Descripción del producto",
    "marca": "Marca del producto",
    "costo": 10.50,
    "costo_unitario": 10.50,
    "precio_venta": 14.70,
    "precio_unitario": 14.70,
    "utilidad": 4.20,
    "utilidad_porcentaje": 40.0,
    "cantidad": 0,
    "existencia": 0,
    "farmacia": "sucursal_id",
    "inventario_id": "inventario_id"
  }
}
```

### Errores

**400 Bad Request:**
```json
{
  "detail": "El nombre del producto es obligatorio"
}
```

```json
{
  "detail": "El costo debe ser mayor a 0"
}
```

**404 Not Found:**
```json
{
  "detail": "Sucursal no encontrada"
}
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [ ] Endpoint `POST /inventarios/crear-producto` implementado
- [ ] Validar campos obligatorios (nombre, costo, farmacia)
- [ ] Calcular utilidad del 40% por defecto si no viene
- [ ] Calcular precio_venta = costo + utilidad
- [ ] Buscar o crear inventario activo de la sucursal
- [ ] Crear el nuevo producto/item en el inventario
- [ ] Guardar código, descripción, marca, costo, utilidad, porcentaje_utilidad
- [ ] Recalcular costo total del inventario
- [ ] Retornar el producto creado con todos sus campos
- [ ] Manejar errores (sucursal no encontrada, validaciones)

---

## 🔄 FLUJO COMPLETO

```
Usuario en Ver Inventarios
    ↓
Presiona "Carga Masiva" (botón morado)
    ↓
Se abre modal CargarExistenciasMasivaModal
    ↓
Usuario presiona "Crear Producto Nuevo"
    ↓
Se muestra formulario con:
  - Código (opcional)
  - Nombre (obligatorio)
  - Descripción (opcional)
  - Marca (opcional)
  - Costo (obligatorio)
  - Utilidad (opcional)
  - % Utilidad (opcional, default 40%)
    ↓
Usuario completa formulario y presiona "Crear Producto"
    ↓
Frontend envía POST /inventarios/crear-producto
    ↓
Backend:
  1. Valida campos
  2. Calcula utilidad (40% por defecto)
  3. Calcula precio = costo + utilidad
  4. Busca/crea inventario activo de la sucursal
  5. Crea el producto en el inventario
  6. Retorna el producto creado
    ↓
Frontend:
  1. Agrega el producto a la lista
  2. Lo selecciona automáticamente
  3. Permite cargar existencias
```

---

## 📝 NOTAS IMPORTANTES

1. **Utilidad por Defecto:** Si no se especifica utilidad ni porcentaje_utilidad, usar **40%** por defecto.

2. **Cálculo de Precio:** El precio se calcula como `costo + utilidad`. Si viene `precio_venta` explícito, usarlo y recalcular la utilidad.

3. **Inventario Activo:** Buscar un inventario con `estado: "activo"` para la sucursal. Si no existe, crear uno nuevo.

4. **Stock Inicial:** El producto se crea con `cantidad: 0` y `existencia: 0`. El usuario luego puede cargar existencias desde el mismo modal.

5. **Campos Opcionales:** Código, descripción y marca son opcionales, pero deben guardarse si vienen.

6. **Consistencia:** Mantener `cantidad` y `existencia` sincronizados (son el mismo campo).

---

## 🎯 RESULTADO ESPERADO

**Cuando el usuario crea un producto desde "Carga Masiva":**

1. ✅ El producto se crea en el inventario activo de la sucursal
2. ✅ Se guardan todos los campos: código, descripción, marca, costo, utilidad, porcentaje_utilidad
3. ✅ La utilidad se calcula como 40% por defecto si no se especifica
4. ✅ El precio se calcula como costo + utilidad
5. ✅ El producto aparece en la lista del modal para cargar existencias
6. ✅ El usuario puede cargar existencias inmediatamente después de crear el producto

---

**Última actualización:** 2025-01-XX  
**Prioridad:** 🔴 ALTA  
**Estado:** ⚠️ VERIFICAR IMPLEMENTACIÓN

