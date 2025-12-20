# 🗑️ INSTRUCCIONES BACKEND: Eliminar Item del Inventario

## ⚠️ PROBLEMA ACTUAL

**El endpoint para eliminar items del inventario no está funcionando correctamente o no existe.**

**Situación:**
- El frontend intenta eliminar un producto/item del inventario
- La petición queda cargando indefinidamente
- El producto NO se elimina de la base de datos
- El usuario no puede eliminar productos del inventario

**Impacto:**
- No se pueden eliminar productos obsoletos o incorrectos
- El inventario se llena de productos innecesarios
- Problemas de gestión de inventario

---

## 🎯 SOLUCIÓN REQUERIDA

**El endpoint `DELETE /inventarios/{inventario_id}/items/{item_id}` DEBE eliminar el item del inventario en la base de datos.**

---

## 📋 ENDPOINT REQUERIDO

### `DELETE /inventarios/{inventario_id}/items/{item_id}`

**Request:**
```
DELETE /inventarios/69461ccb667c6f5d36362356/items/69461ccb667c6f5d36362357
Authorization: Bearer {token}
```

**Parámetros:**
- `inventario_id`: ID del inventario que contiene el item
- `item_id`: ID del item a eliminar (puede ser `_id` del item)

---

## ✅ IMPLEMENTACIÓN REQUERIDA

### PASO 1: Validar Parámetros

```python
@router.delete("/inventarios/{inventario_id}/items/{item_id}")
async def eliminar_item_inventario(
    inventario_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar un item del inventario.
    
    CRÍTICO: Debe eliminar el item de la base de datos.
    """
    try:
        # Validar que el inventario existe
        inventario = await db.inventarios.find_one({"_id": ObjectId(inventario_id)})
        
        if not inventario:
            raise HTTPException(
                status_code=404,
                detail=f"Inventario {inventario_id} no encontrado"
            )
```

### PASO 2: Buscar y Eliminar el Item

```python
        # Obtener items del inventario
        items = inventario.get("items", [])
        
        # Buscar el item a eliminar
        item_encontrado = False
        items_actualizados = []
        
        for item in items:
            item_id_str = str(item.get("_id")) if item.get("_id") else None
            
            # Buscar por ID
            if item_id_str == item_id:
                item_encontrado = True
                print(f"✅ [BACKEND] Item {item_id} encontrado, eliminando...")
                # NO agregar este item a items_actualizados (se elimina)
                continue
            
            # Agregar todos los demás items
            items_actualizados.append(item)
        
        if not item_encontrado:
            raise HTTPException(
                status_code=404,
                detail=f"Item {item_id} no encontrado en el inventario"
            )
```

### PASO 3: Actualizar Inventario en la Base de Datos

```python
        # Actualizar el inventario sin el item eliminado
        await db.inventarios.update_one(
            {"_id": ObjectId(inventario_id)},
            {"$set": {"items": items_actualizados}}
        )
        
        print(f"✅ [BACKEND] Item {item_id} eliminado del inventario {inventario_id}")
        print(f"📊 [BACKEND] Items restantes: {len(items_actualizados)} (antes: {len(items)})")
        
        return {
            "success": True,
            "message": "Item eliminado correctamente",
            "items_restantes": len(items_actualizados)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [BACKEND] Error al eliminar item: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 📝 EJEMPLO COMPLETO DE ENDPOINT

```python
@router.delete("/inventarios/{inventario_id}/items/{item_id}")
async def eliminar_item_inventario(
    inventario_id: str,
    item_id: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar un item del inventario.
    
    CRÍTICO: Debe eliminar el item de la base de datos.
    """
    try:
        print(f"🗑️ [BACKEND] Eliminando item {item_id} del inventario {inventario_id}")
        
        # Validar que el inventario existe
        try:
            inventario = await db.inventarios.find_one({"_id": ObjectId(inventario_id)})
        except:
            inventario = await db.inventarios.find_one({"_id": inventario_id})
        
        if not inventario:
            raise HTTPException(
                status_code=404,
                detail=f"Inventario {inventario_id} no encontrado"
            )
        
        # Obtener items del inventario
        items = inventario.get("items", [])
        print(f"📦 [BACKEND] Inventario tiene {len(items)} items")
        
        # Buscar el item a eliminar
        item_encontrado = False
        item_eliminado = None
        items_actualizados = []
        
        for item in items:
            item_id_str = str(item.get("_id")) if item.get("_id") else None
            item_codigo = item.get("codigo") || item.get("codigo_producto")
            
            # Buscar por ID
            if item_id_str == item_id:
                item_encontrado = True
                item_eliminado = item
                print(f"✅ [BACKEND] Item encontrado: {item_codigo} (ID: {item_id_str})")
                # NO agregar este item a items_actualizados (se elimina)
                continue
            
            # Agregar todos los demás items
            items_actualizados.append(item)
        
        if not item_encontrado:
            raise HTTPException(
                status_code=404,
                detail=f"Item {item_id} no encontrado en el inventario"
            )
        
        # Actualizar el inventario sin el item eliminado
        await db.inventarios.update_one(
            {"_id": ObjectId(inventario_id)},
            {"$set": {"items": items_actualizados}}
        )
        
        print(f"✅ [BACKEND] Item {item_id} eliminado del inventario {inventario_id}")
        print(f"📊 [BACKEND] Items restantes: {len(items_actualizados)} (antes: {len(items)})")
        
        return {
            "success": True,
            "message": "Item eliminado correctamente de la base de datos",
            "item_eliminado": {
                "id": item_id,
                "codigo": item_eliminado.get("codigo") if item_eliminado else None
            },
            "items_restantes": len(items_actualizados),
            "items_antes": len(items)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [BACKEND] Error al eliminar item: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🔄 ENDPOINT ALTERNATIVO POR CÓDIGO

Si el endpoint por ID no funciona, también se puede implementar por código:

### `DELETE /inventarios/{inventario_id}/items/codigo/{codigo}`

```python
@router.delete("/inventarios/{inventario_id}/items/codigo/{codigo}")
async def eliminar_item_por_codigo(
    inventario_id: str,
    codigo: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Eliminar un item del inventario por código.
    """
    try:
        # Validar inventario
        inventario = await db.inventarios.find_one({"_id": ObjectId(inventario_id)})
        if not inventario:
            raise HTTPException(status_code=404, detail="Inventario no encontrado")
        
        # Buscar y eliminar por código
        items = inventario.get("items", [])
        items_actualizados = []
        item_encontrado = False
        
        for item in items:
            item_codigo = item.get("codigo") || item.get("codigo_producto")
            if item_codigo == codigo:
                item_encontrado = True
                continue
            items_actualizados.append(item)
        
        if not item_encontrado:
            raise HTTPException(status_code=404, detail=f"Item con código {codigo} no encontrado")
        
        # Actualizar inventario
        await db.inventarios.update_one(
            {"_id": ObjectId(inventario_id)},
            {"$set": {"items": items_actualizados}}
        )
        
        return {
            "success": True,
            "message": f"Item {codigo} eliminado correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **SIEMPRE validar que el inventario existe**
2. **SIEMPRE validar que el item existe antes de eliminar**
3. **SIEMPRE actualizar el inventario en la base de datos**
4. **SIEMPRE retornar respuesta de éxito o error**
5. **NO dejar la petición colgada - siempre responder**

---

## 🔍 LOGS RECOMENDADOS

```python
# Al recibir la petición
print(f"🗑️ [BACKEND] Eliminando item {item_id} del inventario {inventario_id}")

# Al encontrar el item
print(f"✅ [BACKEND] Item encontrado: {item_codigo}")

# Después de eliminar
print(f"✅ [BACKEND] Item eliminado. Items restantes: {len(items_actualizados)}")

# Si hay error
print(f"❌ [BACKEND] Error al eliminar: {e}")
```

---

## 🚨 RECORDATORIOS IMPORTANTES

1. **NO dejar la petición sin respuesta**
2. **SIEMPRE actualizar la base de datos**
3. **SIEMPRE validar que el item existe**
4. **SIEMPRE retornar respuesta JSON con éxito/error**
5. **El item DEBE eliminarse físicamente de la base de datos**

---

**Fecha de creación:** 2025-01-20
**Prioridad:** ALTA
**Estado:** PENDIENTE DE IMPLEMENTACIÓN

