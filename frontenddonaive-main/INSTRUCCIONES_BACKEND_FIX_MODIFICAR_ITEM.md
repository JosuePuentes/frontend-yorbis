# Instrucciones para Corregir el Endpoint PATCH /inventarios/{inventario_id}/items/{item_id}

## Problema Actual

El endpoint está devolviendo 404 Not Found cuando se intenta modificar un item. Según los logs del backend:

```
[MODIFICAR-ITEM] item_id recibido: 690c40be93d9d9d635fbae83
[MODIFICAR-ITEM] Item encontrado por código del producto: 67  ❌ PROBLEMA
[MODIFICAR-ITEM] Item encontrado: 690c40be93d9d9d635fbad69  ❌ ID diferente
[MODIFICAR-ITEM] inventario_id del item: No tiene inventario_id  ❌ PROBLEMA
```

**Problemas identificados:**
1. El backend está buscando el item por **código** (67) en lugar de por **ID** (690c40be93d9d9d635fbae83)
2. El item encontrado tiene un ID diferente al que se está buscando
3. Los items en la base de datos **NO tienen el campo `inventario_id` guardado**

## Solución

Necesitas verificar y corregir lo siguiente en tu backend:

### 1. ⚠️ CRÍTICO: Corregir la función `get_item()`

**PROBLEMA ACTUAL:** Tu backend está buscando por código en lugar de por ID. Los logs muestran:
```
[MODIFICAR-ITEM] Item encontrado por código del producto: 67
```

**SOLUCIÓN:** La función `get_item(item_id)` **DEBE buscar por el campo `_id` (ObjectId de MongoDB)**, NO por código.

**Busca en tu código donde dice algo como:**
```python
# ❌ INCORRECTO - Esto es lo que probablemente tienes ahora
item = await Producto.find_one(Producto.codigo == item_id)
# o
item = await db.productos.find_one({"codigo": item_id})
```

**Y cámbialo por:**

**Ejemplo correcto (MongoDB con Motor/Beanie):**
```python
async def get_item(item_id: str):
    try:
        # Convertir el string a ObjectId
        from bson import ObjectId
        object_id = ObjectId(item_id)
        
        # Buscar por _id
        item = await Producto.find_one(Producto.id == object_id)
        return item
    except Exception as e:
        # Si el ID no es válido, retornar None
        return None
```

**Ejemplo correcto (MongoDB con PyMongo):**
```python
async def get_item(item_id: str):
    try:
        from bson import ObjectId
        object_id = ObjectId(item_id)
        
        item = await db.productos.find_one({"_id": object_id})
        return item
    except Exception as e:
        return None
```

**❌ INCORRECTO (NO hacer esto):**
```python
# NO buscar por código
item = await Producto.find_one(Producto.codigo == item_id)
```

### 2. Corregir la validación del inventario_id

En la línea 200, la comparación `item.inventario_id != inventario_id` puede fallar si los tipos no coinciden.

**Ejemplo correcto:**
```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,
    current_user: User = Depends(get_current_user)
):
    # Validar permisos
    if not has_permission(current_user, "modificar_inventario"):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar inventarios")
    
    # Validar inventario
    inventario = await get_inventario(inventario_id)
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    # Validar item - IMPORTANTE: buscar por _id (ObjectId)
    from bson import ObjectId
    
    try:
        # Convertir item_id a ObjectId
        item_object_id = ObjectId(item_id)
    except Exception:
        raise HTTPException(status_code=400, detail="ID de item inválido")
    
    # Buscar el item por _id
    item = await get_item(item_id)  # Esta función debe buscar por _id
    
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    # Validar que el item pertenece al inventario
    # Convertir ambos a string para comparar correctamente
    item_inventario_id = str(item.inventario_id) if hasattr(item.inventario_id, '__str__') else item.inventario_id
    
    if item_inventario_id != inventario_id:
        raise HTTPException(
            status_code=404, 
            detail=f"Item no encontrado en este inventario. Item pertenece a inventario: {item_inventario_id}, pero se busca en: {inventario_id}"
        )
    
    # Validar datos
    if item_data.costo <= 0 or item_data.precio <= 0 or item_data.existencia < 0:
        raise HTTPException(status_code=400, detail="Costo, precio y existencia deben ser valores válidos")
    
    # Calcular utilidad contable
    utilidad_contable = item_data.precio - item_data.costo
    
    # Calcular porcentaje de ganancia si no se proporciona
    if item_data.porcentaje_ganancia is None:
        porcentaje_ganancia = ((item_data.precio - item_data.costo) / item_data.costo) * 100
    else:
        porcentaje_ganancia = item_data.porcentaje_ganancia
    
    # Actualizar item
    item.codigo = item_data.codigo
    item.descripcion = item_data.descripcion
    item.marca = item_data.marca
    item.costo = item_data.costo
    item.existencia = item_data.existencia
    item.precio = item_data.precio
    item.porcentaje_ganancia = porcentaje_ganancia
    item.utilidad_contable = utilidad_contable
    item.fecha_actualizacion = datetime.utcnow()
    
    await update_item(item)
    
    # Recalcular costo total del inventario
    items = await get_items_by_inventario(inventario_id)
    costo_total = sum(item.costo * item.existencia for item in items)
    inventario.costo = costo_total
    inventario.fecha_actualizacion = datetime.utcnow()
    await update_inventario(inventario)
    
    return {
        "message": "Item actualizado exitosamente",
        "item": {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo": item.costo,
            "existencia": item.existencia,
            "precio": item.precio,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "utilidad_contable": item.utilidad_contable,
            "sucursal": item.sucursal,
            "inventario_id": str(item.inventario_id),
            "fecha_actualizacion": item.fecha_actualizacion.isoformat()
        }
    }
```

### 3. Agregar logs para debugging

Agrega logs temporales para ver qué está pasando:

```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,
    current_user: User = Depends(get_current_user)
):
    import logging
    logger = logging.getLogger(__name__)
    
    logger.info(f"[MODIFICAR-ITEM] Recibido: inventario_id={inventario_id}, item_id={item_id}")
    
    # ... resto del código ...
    
    # Después de buscar el item
    if item:
        logger.info(f"[MODIFICAR-ITEM] Item encontrado: _id={item._id}, inventario_id={item.inventario_id}, tipo={type(item.inventario_id)}")
        logger.info(f"[MODIFICAR-ITEM] Comparando: {str(item.inventario_id)} == {inventario_id}")
    else:
        logger.warning(f"[MODIFICAR-ITEM] Item NO encontrado con item_id={item_id}")
```

### 4. ⚠️ CRÍTICO: Agregar campo `inventario_id` a los items existentes

**PROBLEMA:** Los logs muestran que los items NO tienen el campo `inventario_id`:
```
[MODIFICAR-ITEM] inventario_id del item: No tiene inventario_id
```

**SOLUCIÓN:** Necesitas:

1. **Actualizar el modelo/schema** para incluir `inventario_id`:
```python
class Producto(BaseModel):
    _id: Optional[ObjectId] = Field(default_factory=ObjectId, alias="_id")
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo: float
    existencia: float
    precio: float
    inventario_id: str  # ⬅️ Asegúrate de que este campo existe
    sucursal: str
    # ... otros campos
```

2. **Actualizar los items existentes** en la base de datos. Ejecuta un script de migración:

```python
# Script de migración para agregar inventario_id a items existentes
async def migrar_items_sin_inventario_id():
    """
    Si los items no tienen inventario_id, necesitas asociarlos con un inventario.
    Esto depende de tu lógica de negocio. Algunas opciones:
    
    Opción 1: Si cada sucursal tiene un inventario activo, asociar por sucursal
    Opción 2: Si los items se crearon desde un inventario, buscar el inventario más reciente de esa sucursal
    Opción 3: Crear un inventario por defecto para items huérfanos
    """
    from bson import ObjectId
    
    # Ejemplo: Asociar items a su inventario más reciente por sucursal
    items_sin_inventario = await db.productos.find({"inventario_id": {"$exists": False}})
    
    for item in items_sin_inventario:
        sucursal = item.get("sucursal")
        if sucursal:
            # Buscar el inventario más reciente de esa sucursal
            inventario = await db.inventarios.find_one(
                {"farmacia": sucursal},
                sort=[("fecha_creacion", -1)]
            )
            
            if inventario:
                await db.productos.update_one(
                    {"_id": item["_id"]},
                    {"$set": {"inventario_id": str(inventario["_id"])}}
                )
                print(f"Item {item['_id']} asociado a inventario {inventario['_id']}")
```

3. **Asegúrate de que al crear nuevos items** se guarde el `inventario_id`:
```python
# Al crear un item desde un inventario
item = Producto(
    codigo=...,
    descripcion=...,
    inventario_id=inventario_id,  # ⬅️ Asegúrate de guardarlo
    # ... otros campos
)
```

4. **Verificar en MongoDB:**
```javascript
// Verificar items sin inventario_id
db.productos.find({inventario_id: {$exists: false}})

// Verificar un item específico
db.productos.findOne({_id: ObjectId("690c40be93d9d9d635fbae83")})

// Verificar todos los items de un inventario
db.productos.find({inventario_id: "690c40be93d9d9d635fbaf5b"})
```

## Checklist de Verificación (EN ORDEN DE PRIORIDAD)

### Prioridad 1 - CRÍTICO (Debe hacerse primero)
- [ ] **La función `get_item(item_id)` busca por `_id` (ObjectId), NO por código**
  - Busca en tu código: `Producto.find_one(Producto.codigo == ...)` o `{"codigo": ...}`
  - Cámbialo a: `Producto.find_one(Producto.id == ObjectId(item_id))` o `{"_id": ObjectId(item_id)}`
  
- [ ] **Los items en la BD tienen el campo `inventario_id` guardado**
  - Ejecuta: `db.productos.find({inventario_id: {$exists: false}})`
  - Si hay items sin `inventario_id`, ejecuta el script de migración (ver sección 4)

### Prioridad 2 - IMPORTANTE
- [ ] La conversión de `item_id` string a ObjectId se hace correctamente
- [ ] La comparación de `inventario_id` convierte ambos valores a string antes de comparar
- [ ] Se agregaron logs para debugging (ya los tienes, perfecto)

### Prioridad 3 - VERIFICACIÓN
- [ ] Probar el endpoint después de los cambios
- [ ] Verificar que los nuevos items se crean con `inventario_id`

## Prueba

Después de hacer los cambios, prueba con:
- URL: `PATCH /inventarios/690c40be93d9d9d635fbaf5b/items/690c40be93d9d9d635fbae83`
- Debe retornar 200 OK si el item existe y pertenece al inventario
- Debe retornar 404 solo si realmente no existe o no pertenece al inventario

