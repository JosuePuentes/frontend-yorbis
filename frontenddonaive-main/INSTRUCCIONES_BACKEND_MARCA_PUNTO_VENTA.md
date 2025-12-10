# 🔧 INSTRUCCIONES BACKEND: Incluir Marca en Búsqueda de Productos - Punto de Venta

## 📌 PROBLEMA

En el módulo de punto de venta, cuando se buscan productos, la marca del producto no se está mostrando en los resultados de búsqueda, aunque se está agregando en el módulo de compras.

## ✅ SOLUCIÓN REQUERIDA

El backend **DEBE** incluir el campo `marca` o `marca_producto` en la respuesta del endpoint de búsqueda de productos.

---

## 🔍 ENDPOINTS AFECTADOS

### 1. Endpoint: `GET /punto-venta/productos/buscar`

**Parámetros:**
- `q` (query): Término de búsqueda
- `sucursal_id`: ID de la sucursal

**Respuesta Actual (Probable):**
```json
{
  "productos": [
    {
      "id": "producto_id",
      "codigo": "010001",
      "nombre": "ESMALTE SINTETICO",
      "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
      "precio": 23.51,
      "cantidad": 12
      // ⚠️ FALTA: "marca" o "marca_producto"
    }
  ]
}
```

**Respuesta Requerida:**
```json
{
  "productos": [
    {
      "id": "producto_id",
      "codigo": "010001",
      "nombre": "ESMALTE SINTETICO",
      "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
      "marca": "PINTEMOS",  // ✅ DEBE ESTAR PRESENTE
      "marca_producto": "PINTEMOS",  // ✅ O ESTE CAMPO (ambos es mejor)
      "precio": 23.51,
      "cantidad": 12
    }
  ]
}
```

### 2. Endpoint: `GET /inventarios/{inventario_id}/items`

**Respuesta Requerida:**
```json
[
  {
    "_id": "item_id",
    "codigo": "010001",
    "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "marca": "PINTEMOS",  // ✅ DEBE ESTAR PRESENTE
    "marca_producto": "PINTEMOS",  // ✅ O ESTE CAMPO
    "precio_unitario": 23.51,
    "cantidad": 12,
    "lotes": []
  }
]
```

---

## 📋 ESTRUCTURA DE BASE DE DATOS

### Colección: `inventarios.items`

Cada item del inventario **DEBE** tener el campo `marca`:

```javascript
{
  _id: ObjectId,
  codigo: String,
  descripcion: String,
  marca: String,  // ✅ DEBE ESTAR PRESENTE
  precio_unitario: Number,
  costo_unitario: Number,
  cantidad: Number,
  existencia: Number,
  lotes: Array,
  // ... otros campos
}
```

### Colección: `productos` (si existe)

Si hay una colección separada de productos, también debe incluir la marca:

```javascript
{
  _id: ObjectId,
  codigo: String,
  nombre: String,
  descripcion: String,
  marca: String,  // ✅ DEBE ESTAR PRESENTE
  precio: Number,
  // ... otros campos
}
```

---

## 🔧 IMPLEMENTACIÓN REQUERIDA

### Paso 1: Verificar que la Marca se Guarda al Crear/Actualizar Inventario

Cuando se crea o actualiza un inventario desde el módulo de compras, el backend **DEBE** guardar la marca:

```python
# Ejemplo Python/FastAPI
@router.post("/inventarios/{inventario_id}/items")
async def agregar_item_inventario(
    inventario_id: str,
    item: ItemInventarioRequest,
    db: AsyncIOMotorClient = Depends(get_database)
):
    item_data = {
        "codigo": item.codigo,
        "descripcion": item.descripcion,
        "marca": item.marca,  # ✅ INCLUIR MARCA
        "precio_unitario": item.precio_unitario,
        "costo_unitario": item.costo_unitario,
        "cantidad": item.cantidad,
        # ... otros campos
    }
    
    await db.inventarios.update_one(
        {"_id": ObjectId(inventario_id)},
        {"$push": {"items": item_data}}
    )
```

### Paso 2: Incluir Marca en la Respuesta de Búsqueda

Cuando se buscan productos, el backend **DEBE** incluir la marca en la respuesta:

```python
# Ejemplo Python/FastAPI
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str,
    sucursal_id: str,
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Buscar productos en inventarios
    inventarios = await db.inventarios.find({
        "farmacia": sucursal_id,
        "estado": "activo"
    }).to_list(length=None)
    
    productos = []
    for inventario in inventarios:
        for item in inventario.get("items", []):
            # Verificar si coincide con la búsqueda
            if (q.lower() in item.get("codigo", "").lower() or
                q.lower() in item.get("descripcion", "").lower() or
                q.lower() in item.get("marca", "").lower()):  # ✅ Buscar también por marca
                
                productos.append({
                    "id": str(item.get("_id", "")),
                    "codigo": item.get("codigo", ""),
                    "nombre": item.get("descripcion", ""),
                    "descripcion": item.get("descripcion", ""),
                    "marca": item.get("marca", ""),  # ✅ INCLUIR MARCA
                    "marca_producto": item.get("marca", ""),  # ✅ TAMBIÉN INCLUIR ESTE CAMPO
                    "precio": item.get("precio_unitario", 0),
                    "cantidad": item.get("cantidad", 0),
                    "lotes": item.get("lotes", [])
                })
    
    return {"productos": productos}
```

### Paso 3: Incluir Marca al Cargar Items del Inventario

Cuando se cargan los items de un inventario, el backend **DEBE** incluir la marca:

```python
# Ejemplo Python/FastAPI
@router.get("/inventarios/{inventario_id}/items")
async def obtener_items_inventario(
    inventario_id: str,
    db: AsyncIOMotorClient = Depends(get_database)
):
    inventario = await db.inventarios.find_one({"_id": ObjectId(inventario_id)})
    
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    items = []
    for item in inventario.get("items", []):
        items.append({
            "_id": str(item.get("_id", "")),
            "codigo": item.get("codigo", ""),
            "descripcion": item.get("descripcion", ""),
            "marca": item.get("marca", ""),  # ✅ INCLUIR MARCA
            "marca_producto": item.get("marca", ""),  # ✅ TAMBIÉN INCLUIR ESTE CAMPO
            "precio_unitario": item.get("precio_unitario", 0),
            "costo_unitario": item.get("costo_unitario", 0),
            "cantidad": item.get("cantidad", 0),
            "existencia": item.get("cantidad", 0),
            "lotes": item.get("lotes", [])
        })
    
    return items
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Para el Backend:

- [ ] El campo `marca` se guarda al crear/actualizar items del inventario
- [ ] El campo `marca` se incluye en la respuesta de `GET /punto-venta/productos/buscar`
- [ ] El campo `marca` se incluye en la respuesta de `GET /inventarios/{inventario_id}/items`
- [ ] El campo `marca_producto` también se incluye (por compatibilidad)
- [ ] La búsqueda de productos también busca por marca (opcional pero recomendado)

### Para Verificar:

1. **Crear una compra con marca:**
   - Ir al módulo de compras
   - Agregar un producto con marca
   - Guardar la compra
   - Verificar que la marca se guardó en el inventario

2. **Buscar el producto en punto de venta:**
   - Ir al módulo de punto de venta
   - Buscar el producto por código o nombre
   - Verificar que la marca aparece en los resultados

3. **Verificar en la consola del navegador:**
   - Abrir la consola (F12)
   - Buscar logs que empiecen con `🏷️ [PUNTO_VENTA]`
   - Verificar que aparezca el log con la marca del producto

---

## 🐛 DEBUGGING

### Si la marca no aparece:

1. **Verificar en la consola del navegador:**
   ```javascript
   // Buscar logs
   🏷️ [PUNTO_VENTA] Producto ... tiene marca: ...
   ```

2. **Verificar la respuesta del backend:**
   - Abrir la pestaña "Network" en las herramientas de desarrollo
   - Buscar la petición a `/punto-venta/productos/buscar` o `/inventarios/.../items`
   - Verificar que la respuesta incluye el campo `marca`

3. **Verificar en la base de datos:**
   - Verificar que los items del inventario tienen el campo `marca`
   - Verificar que la marca no está vacía o null

---

## 📝 NOTAS IMPORTANTES

1. **Compatibilidad:** El frontend busca tanto `marca` como `marca_producto`, pero es mejor incluir ambos campos en la respuesta.

2. **Búsqueda por marca:** Es recomendable que la búsqueda de productos también busque por marca, no solo por código y descripción.

3. **Actualización:** Cuando se actualiza un producto desde el módulo de compras, la marca debe actualizarse también.

---

**Última actualización:** 2025-01-15

