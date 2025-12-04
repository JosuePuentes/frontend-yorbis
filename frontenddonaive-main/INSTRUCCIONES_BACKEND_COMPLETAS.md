# Instrucciones Completas para el Backend - Modificar Items de Inventario

## Problemas Identificados

1. **Los datos se borran al actualizar la página**: Los cambios no se están guardando correctamente en la base de datos
2. **El Total Costo Inventario muestra precio en lugar de costo**: Puede ser un problema de cálculo o de campos

## Endpoint: PATCH /inventarios/{inventario_id}/items/{item_id}

### 1. Request Body que Envía el Frontend

El frontend envía:

```json
{
  "codigo": "string",
  "descripcion": "string",
  "marca": "string",
  "costo_unitario": number,    // ← IMPORTANTE
  "cantidad": number,            // ← IMPORTANTE (no "existencia")
  "precio_unitario": number,     // ← IMPORTANTE (no "precio")
  "porcentaje_ganancia": number
}
```

### 2. Modelo de Request (Pydantic)

```python
class ModificarItemRequest(BaseModel):
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None  # ← NO "costo"
    cantidad: Optional[int] = None          # ← NO "existencia"
    precio_unitario: Optional[float] = None # ← NO "precio"
    porcentaje_ganancia: Optional[float] = None
```

### 3. Código de Actualización (CRÍTICO)

```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,
    current_user: User = Depends(get_current_user)
):
    # 1. Buscar el item
    item = await get_item_by_codigo(item_id, inventario_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    # 2. ACTUALIZAR LOS CAMPOS CORRECTOS
    if item_data.codigo is not None:
        item.codigo = item_data.codigo
    if item_data.descripcion is not None:
        item.descripcion = item_data.descripcion
    if item_data.marca is not None:
        item.marca = item_data.marca
    
    # ← CRÍTICO: Usar los campos correctos
    if item_data.costo_unitario is not None:
        item.costo_unitario = item_data.costo_unitario  # ← NO item.costo
    if item_data.cantidad is not None:
        item.cantidad = item_data.cantidad  # ← NO item.existencia
    if item_data.precio_unitario is not None:
        item.precio_unitario = item_data.precio_unitario  # ← NO item.precio
    
    # 3. Calcular utilidad contable
    if item.costo_unitario and item.precio_unitario:
        item.utilidad_contable = item.precio_unitario - item.costo_unitario
        if item.costo_unitario > 0:
            item.porcentaje_ganancia = ((item.precio_unitario - item.costo_unitario) / item.costo_unitario) * 100
    elif item_data.porcentaje_ganancia is not None:
        item.porcentaje_ganancia = item_data.porcentaje_ganancia
    
    # 4. ACTUALIZAR FECHA
    item.fecha_actualizacion = datetime.utcnow()
    
    # 5. GUARDAR EN LA BASE DE DATOS (CRÍTICO - esto es lo que falta)
    await item.save()  # ← Asegurarse de que se guarde
    # O si usas MongoDB directamente:
    # await db.productos.update_one(
    #     {"_id": item._id},
    #     {"$set": {
    #         "codigo": item.codigo,
    #         "descripcion": item.descripcion,
    #         "marca": item.marca,
    #         "costo_unitario": item.costo_unitario,
    #         "cantidad": item.cantidad,
    #         "precio_unitario": item.precio_unitario,
    #         "utilidad_contable": item.utilidad_contable,
    #         "porcentaje_ganancia": item.porcentaje_ganancia,
    #         "fecha_actualizacion": item.fecha_actualizacion
    #     }}
    # )
    
    # 6. Recalcular costo total del inventario
    items = await get_items_by_inventario(inventario_id)
    costo_total = sum(
        (item.cantidad or 0) * (item.costo_unitario or 0)  # ← Usar cantidad × costo_unitario
        for item in items
    )
    
    inventario = await get_inventario(inventario_id)
    if inventario:
        inventario.costo = costo_total  # ← Guardar el costo total (no precio)
        inventario.fecha_actualizacion = datetime.utcnow()
        await inventario.save()  # ← Guardar el inventario también
    
    # 7. Devolver el item actualizado
    return {
        "message": "Item actualizado exitosamente",
        "item": {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo_unitario": item.costo_unitario,  # ← Devolver campos correctos
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "utilidad_contable": item.utilidad_contable,
            "inventario_id": str(item.inventario_id),
            "fecha_actualizacion": item.fecha_actualizacion.isoformat()
        }
    }
```

## Modelo de Base de Datos

El modelo debe tener los campos correctos:

```python
class Producto(BaseModel):  # o ItemInventario, como lo llames
    _id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None  # ← Campo en BD
    cantidad: Optional[int] = None           # ← Campo en BD
    precio_unitario: Optional[float] = None  # ← Campo en BD
    utilidad_contable: Optional[float] = None
    porcentaje_ganancia: Optional[float] = None
    inventario_id: Optional[PyObjectId] = None
    fecha_actualizacion: Optional[datetime] = None
    # ... otros campos
```

## Endpoint: GET /inventarios/{inventario_id}/items

Este endpoint debe devolver los items con los campos correctos:

```python
@router.get("/inventarios/{inventario_id}/items")
async def obtener_items_inventario(
    inventario_id: str,
    current_user: User = Depends(get_current_user)
):
    items = await get_items_by_inventario(inventario_id)
    
    return [
        {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo_unitario": item.costo_unitario,  # ← Devolver campo correcto
            "cantidad": item.cantidad,               # ← Devolver campo correcto
            "precio_unitario": item.precio_unitario, # ← Devolver campo correcto
            "utilidad_contable": item.utilidad_contable,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "inventario_id": str(item.inventario_id)
        }
        for item in items
    ]
```

## Checklist de Verificación

### Para el PATCH:
- [ ] El modelo `ModificarItemRequest` acepta `costo_unitario`, `cantidad`, `precio_unitario`
- [ ] El código actualiza `item.cantidad = item_data.cantidad` (no `item.existencia`)
- [ ] El código actualiza `item.costo_unitario = item_data.costo_unitario` (no `item.costo`)
- [ ] El código actualiza `item.precio_unitario = item_data.precio_unitario` (no `item.precio`)
- [ ] Se llama a `item.save()` o el método equivalente **DESPUÉS** de actualizar
- [ ] El costo total del inventario se calcula como `sum(cantidad × costo_unitario)` (no precio)
- [ ] Se guarda el inventario con `inventario.save()` después de recalcular

### Para el GET:
- [ ] El endpoint devuelve `costo_unitario`, `cantidad`, `precio_unitario` (no `costo`, `existencia`, `precio`)
- [ ] Los datos devueltos son los que están guardados en la BD (no valores calculados o en memoria)

### Para Persistencia:
- [ ] Los cambios se guardan en la base de datos (MongoDB)
- [ ] Al hacer GET después de PATCH, se devuelven los valores actualizados
- [ ] Al recargar la página, los datos persisten

## Prueba Completa

1. **Hacer PATCH** con:
```json
{
  "cantidad": 10,
  "costo_unitario": 25.50,
  "precio_unitario": 35.00
}
```

2. **Verificar en MongoDB** que el documento tenga:
   - `cantidad: 10` (no 0)
   - `costo_unitario: 25.50`
   - `precio_unitario: 35.00`

3. **Hacer GET** del mismo item y verificar que devuelva los valores actualizados

4. **Recargar la página** y verificar que los datos persistan

5. **Verificar el costo total del inventario**:
   - Debe ser: `sum(cantidad × costo_unitario)` de todos los items
   - NO debe ser: `sum(cantidad × precio_unitario)`

## Errores Comunes

1. **No se guarda en BD**: Falta llamar a `item.save()` o `inventario.save()`
2. **Usa campos incorrectos**: Usa `existencia` en lugar de `cantidad`, `costo` en lugar de `costo_unitario`
3. **Cálculo incorrecto**: Calcula costo total usando `precio_unitario` en lugar de `costo_unitario`
4. **No persiste**: Los cambios se hacen en memoria pero no se guardan en la BD


