# Instrucciones para Corregir el Error 404 en PATCH /inventarios/{inventario_id}/items/{item_id}

## Análisis del Problema

Según los logs del backend, el problema es **intermitente**:

### ✅ Caso exitoso (23:03:54):
```
[MODIFICAR-ITEM] item_id recibido: 67
[MODIFICAR-ITEM] Item encontrado por código del producto: 67
[MODIFICAR-ITEM] Item encontrado: 690d2639cd1433736d0794a0
[MODIFICAR-ITEM] inventario_id del item: 690d263bcd1433736d079578
INFO: "PATCH /inventarios/690d263bcd1433736d079578/items/67 HTTP/1.1" 200 OK ✅
```

### ❌ Caso fallido (23:09:23 y 23:10:04):
```
[MODIFICAR-ITEM] item_id recibido: 67
[MODIFICAR-ITEM] Item encontrado por código del producto: 67
[MODIFICAR-ITEM] Item encontrado: 690d2639cd1433736d0794a0
[MODIFICAR-ITEM] inventario_id del item: 690d263bcd1433736d079578
INFO: "PATCH /inventarios/690d263bcd1433736d079578/items/67 HTTP/1.1" 404 Not Found ❌
```

**Observación:** El backend encuentra el item correctamente, pero aún así devuelve 404. Esto indica que el problema está **después** de encontrar el item, probablemente en:
1. La validación de datos del request body
2. La actualización del item en la base de datos
3. Alguna condición que falla silenciosamente

## Solución

### 1. Agregar más logs para identificar dónde falla

Agrega logs **después** de encontrar el item para ver dónde exactamente falla:

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
    
    logger.info(f"[MODIFICAR-ITEM] item_id recibido: {item_id}")
    logger.info(f"[MODIFICAR-ITEM] inventario_id recibido: {inventario_id}")
    
    # Validar permisos
    if not has_permission(current_user, "modificar_inventario"):
        logger.warning(f"[MODIFICAR-ITEM] Sin permisos para usuario: {current_user.email}")
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar inventarios")
    
    logger.info(f"[MODIFICAR-ITEM] Permisos validados")
    
    # Validar inventario
    inventario = await get_inventario(inventario_id)
    if not inventario:
        logger.warning(f"[MODIFICAR-ITEM] Inventario no encontrado: {inventario_id}")
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    logger.info(f"[MODIFICAR-ITEM] Inventario encontrado: {inventario_id}")
    
    # Buscar item por código
    item = await get_item_by_codigo(item_id, inventario_id)  # Asumiendo que buscas por código
    logger.info(f"[MODIFICAR-ITEM] Item encontrado por código del producto: {item_id}")
    
    if not item:
        logger.warning(f"[MODIFICAR-ITEM] Item no encontrado con código: {item_id}")
        raise HTTPException(status_code=404, detail="Item no encontrado")
    
    logger.info(f"[MODIFICAR-ITEM] Item encontrado: {item._id}")
    logger.info(f"[MODIFICAR-ITEM] inventario_id del item: {item.inventario_id if hasattr(item, 'inventario_id') else 'No tiene inventario_id'}")
    
    # Validar que el item pertenece al inventario
    item_inventario_id = str(item.inventario_id) if hasattr(item, 'inventario_id') and item.inventario_id else None
    
    if item_inventario_id != inventario_id:
        logger.warning(f"[MODIFICAR-ITEM] Item no pertenece al inventario. Item: {item_inventario_id}, Inventario: {inventario_id}")
        raise HTTPException(status_code=404, detail="Item no encontrado en este inventario")
    
    logger.info(f"[MODIFICAR-ITEM] Validación de inventario OK")
    
    # Validar datos del request
    logger.info(f"[MODIFICAR-ITEM] Validando datos: codigo={item_data.codigo}, costo={item_data.costo}, precio={item_data.precio}, existencia={item_data.existencia}")
    
    if item_data.costo <= 0 or item_data.precio <= 0 or item_data.existencia < 0:
        logger.warning(f"[MODIFICAR-ITEM] Datos inválidos: costo={item_data.costo}, precio={item_data.precio}, existencia={item_data.existencia}")
        raise HTTPException(status_code=400, detail="Costo, precio y existencia deben ser valores válidos")
    
    logger.info(f"[MODIFICAR-ITEM] Validación de datos OK")
    logger.info(f"[MODIFICAR-ITEM] Valores para cálculo: cantidad={item_data.existencia}, precio_unitario={item_data.precio}, costo_unitario={item_data.costo}")
    
    # Calcular utilidad contable
    utilidad_contable = item_data.precio - item_data.costo
    logger.info(f"[MODIFICAR-ITEM] Utilidad contable calculada: {utilidad_contable}")
    
    # Calcular porcentaje de ganancia
    if item_data.porcentaje_ganancia is None:
        porcentaje_ganancia = ((item_data.precio - item_data.costo) / item_data.costo) * 100
    else:
        porcentaje_ganancia = item_data.porcentaje_ganancia
    
    logger.info(f"[MODIFICAR-ITEM] Porcentaje ganancia: {porcentaje_ganancia}")
    
    # Actualizar item
    try:
        logger.info(f"[MODIFICAR-ITEM] Actualizando item en BD...")
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
        logger.info(f"[MODIFICAR-ITEM] Item actualizado en BD exitosamente")
    except Exception as e:
        logger.error(f"[MODIFICAR-ITEM] Error al actualizar item: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al actualizar el item: {str(e)}")
    
    # Recalcular costo total del inventario
    try:
        logger.info(f"[MODIFICAR-ITEM] Recalculando costo total del inventario...")
        items = await get_items_by_inventario(inventario_id)
        costo_total = sum(item.costo * item.existencia for item in items)
        inventario.costo = costo_total
        inventario.fecha_actualizacion = datetime.utcnow()
        await update_inventario(inventario)
        logger.info(f"[MODIFICAR-ITEM] Costo total actualizado: {costo_total}")
    except Exception as e:
        logger.error(f"[MODIFICAR-ITEM] Error al actualizar inventario: {str(e)}")
        # No lanzar error aquí, solo loguear
    
    logger.info(f"[MODIFICAR-ITEM] Proceso completado exitosamente")
    
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

### 2. Verificar la función `get_item_by_codigo()`

Asegúrate de que esta función busque correctamente:

```python
async def get_item_by_codigo(codigo: str, inventario_id: str):
    """
    Busca un item por código dentro de un inventario específico.
    """
    try:
        # Opción 1: Si tienes campo inventario_id en productos
        item = await Producto.find_one(
            Producto.codigo == codigo,
            Producto.inventario_id == inventario_id
        )
        
        # Opción 2: Si no tienes inventario_id, buscar solo por código y validar después
        # item = await Producto.find_one(Producto.codigo == codigo)
        
        return item
    except Exception as e:
        logger.error(f"Error al buscar item por código {codigo}: {str(e)}")
        return None
```

### 3. Verificar la función `update_item()`

Asegúrate de que la actualización funcione correctamente:

```python
async def update_item(item: Producto):
    """
    Actualiza un item en la base de datos.
    """
    try:
        await item.save()  # Si usas Beanie/Motor
        # o
        # await db.productos.update_one(
        #     {"_id": item._id},
        #     {"$set": {
        #         "codigo": item.codigo,
        #         "descripcion": item.descripcion,
        #         # ... otros campos
        #     }}
        # )
        return True
    except Exception as e:
        logger.error(f"Error al actualizar item {item._id}: {str(e)}")
        raise
```

### 4. Verificar que no haya excepciones silenciosas

Asegúrate de que todas las excepciones se capturen y se logueen:

```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(...):
    try:
        # ... todo el código ...
    except HTTPException:
        # Re-lanzar HTTPException sin modificar
        raise
    except Exception as e:
        # Capturar cualquier otra excepción
        logger.error(f"[MODIFICAR-ITEM] Error inesperado: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Error interno del servidor: {str(e)}")
```

## Checklist de Verificación

- [ ] Se agregaron logs detallados en cada paso del proceso
- [ ] La función `get_item_by_codigo()` busca correctamente por código e inventario_id
- [ ] La función `update_item()` funciona correctamente
- [ ] Todas las excepciones se capturan y se loguean
- [ ] Se verifica que el item tenga el campo `inventario_id` antes de comparar
- [ ] Se verifica que la actualización del item no falle silenciosamente

## Próximos Pasos

1. Agrega los logs detallados
2. Prueba de nuevo y revisa los logs completos
3. Identifica en qué paso exacto falla (debería aparecer en los logs)
4. Corrige el problema específico según los logs

## Nota Importante

El hecho de que a veces funcione (200 OK) y a veces no (404) sugiere que puede haber:
- Un problema de concurrencia
- Un problema con la validación de datos (algunos valores pueden ser inválidos)
- Un problema con la actualización en la BD (puede fallar silenciosamente)

Los logs detallados te ayudarán a identificar exactamente dónde está el problema.


