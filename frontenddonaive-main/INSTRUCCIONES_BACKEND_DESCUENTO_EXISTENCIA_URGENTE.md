# 🚨 INSTRUCCIONES BACKEND URGENTES: Descontar Existencia al Confirmar Venta

## ⚠️ PROBLEMA CRÍTICO ACTUAL

**La existencia NO se está descontando del inventario cuando se confirma una venta en el punto de venta.**

**Situación:**
- Usuario vende 1 unidad de producto PPPP1 (existencia inicial: 10)
- Después de la venta, la existencia sigue mostrando 10 (debería ser 9)
- El frontend está enviando correctamente los datos al backend
- **El backend NO está descontando la cantidad del inventario**

**Logs del Frontend:**
```
🚨 [VENTA] Datos enviados al backend para DESCONTAR INVENTARIO:
📋 Sucursal: 01
📦 Items a descontar:
  1. Producto ID: 69461ccb667c6f5d36362356, Código: PPPP1, Nombre: PPPP1, Cantidad: 1
```

**Impacto:**
- Los usuarios pueden vender productos que ya no existen
- El inventario no refleja la realidad
- Pérdidas por ventas de productos inexistentes
- Desconfianza en el sistema

---

## 🎯 SOLUCIÓN REQUERIDA

**El endpoint `POST /punto-venta/ventas` DEBE descontar automáticamente la cantidad vendida del inventario activo.**

---

## 📋 ENDPOINT AFECTADO

### `POST /punto-venta/ventas`

**Request Body:**
```json
{
  "items": [
    {
      "producto_id": "69461ccb667c6f5d36362356",
      "codigo": "PPPP1",
      "nombre": "PPPP1",
      "cantidad": 1,
      "precio_unitario": 1.67,
      "subtotal": 1.67
    }
  ],
  "metodos_pago": [...],
  "total_bs": 818.3,
  "total_usd": 1.67,
  "tasa_dia": 490.0,
  "sucursal": "01",
  "cajero": "ferreterialospuentes@gmail.com",
  "cliente": "...",
  "porcentaje_descuento": 0
}
```

---

## ✅ IMPLEMENTACIÓN REQUERIDA

### PASO 1: Obtener Inventario Activo de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "$or": [
        {"sucursal": sucursal_id},
        {"farmacia": sucursal_id},
        {"sucursal_id": sucursal_id}
    ],
    "estado": "activo"
})

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario activo no encontrado para la sucursal {sucursal_id}"
    )
```

### PASO 2: Descontar Cantidad de Cada Item Vendido

```python
# Obtener items del inventario
items = inventario.get("items", [])

# Descontar cantidad de cada item vendido
for item_venta in venta_data["items"]:
    producto_id = item_venta.get("producto_id")
    cantidad_vendida = item_venta.get("cantidad", 0)
    
    if not producto_id or cantidad_vendida <= 0:
        continue
    
    # Buscar el producto en el inventario
    producto_encontrado = None
    for i, item_inventario in enumerate(items):
        item_id = str(item_inventario.get("_id")) if item_inventario.get("_id") else None
        item_codigo = item_inventario.get("codigo") || item_inventario.get("codigo_producto")
        
        # Buscar por ID o código
        if (item_id == producto_id) or (item_codigo == item_venta.get("codigo")):
            producto_encontrado = i
            break
    
    if producto_encontrado is None:
        print(f"⚠️ [BACKEND] Producto {producto_id} no encontrado en inventario")
        continue
    
    # Obtener existencia actual
    item_actual = items[producto_encontrado]
    existencia_actual = item_actual.get("cantidad") || item_actual.get("existencia") || item_actual.get("stock") || 0
    
    # Validar que hay suficiente existencia
    if existencia_actual < cantidad_vendida:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente para {item_venta.get('codigo')}. Disponible: {existencia_actual}, Solicitado: {cantidad_vendida}"
        )
    
    # ✅ CRÍTICO: Descontar la cantidad vendida
    nueva_existencia = existencia_actual - cantidad_vendida
    
    # Actualizar los tres campos de existencia
    items[producto_encontrado]["cantidad"] = nueva_existencia
    items[producto_encontrado]["existencia"] = nueva_existencia
    items[producto_encontrado]["stock"] = nueva_existencia
    
    print(f"✅ [BACKEND] Producto {item_venta.get('codigo')}: {existencia_actual} -> {nueva_existencia} (vendido: {cantidad_vendida})")
```

### PASO 3: Actualizar Inventario en la Base de Datos

```python
# Actualizar el inventario con los items modificados
await db.inventarios.update_one(
    {"_id": inventario["_id"]},
    {"$set": {"items": items}}
)

print(f"✅ [BACKEND] Inventario actualizado después de la venta")
```

### PASO 4: Registrar la Venta

```python
# Registrar la venta en la base de datos
venta_registrada = await db.ventas.insert_one(venta_data)

print(f"✅ [BACKEND] Venta registrada: {venta_registrada.inserted_id}")
```

---

## 📝 EJEMPLO COMPLETO DE ENDPOINT

```python
@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: dict,
    current_user: dict = Depends(get_current_user)
):
    """
    Crear una venta y descontar automáticamente del inventario.
    
    CRÍTICO: Debe descontar la cantidad vendida del inventario activo.
    """
    try:
        sucursal_id = venta_data.get("sucursal")
        items_venta = venta_data.get("items", [])
        
        if not sucursal_id:
            raise HTTPException(status_code=400, detail="Sucursal es requerida")
        
        if not items_venta:
            raise HTTPException(status_code=400, detail="Items de venta son requeridos")
        
        # PASO 1: Obtener inventario activo
        inventario = await db.inventarios.find_one({
            "$or": [
                {"sucursal": sucursal_id},
                {"farmacia": sucursal_id},
                {"sucursal_id": sucursal_id}
            ],
            "estado": "activo"
        })
        
        if not inventario:
            raise HTTPException(
                status_code=404,
                detail=f"Inventario activo no encontrado para la sucursal {sucursal_id}"
            )
        
        # PASO 2: Descontar cantidad de cada item
        items = inventario.get("items", [])
        items_modificados = False
        
        for item_venta in items_venta:
            producto_id = item_venta.get("producto_id")
            cantidad_vendida = item_venta.get("cantidad", 0)
            codigo_producto = item_venta.get("codigo")
            
            if not producto_id or cantidad_vendida <= 0:
                continue
            
            # Buscar producto en inventario
            producto_encontrado = None
            for i, item_inventario in enumerate(items):
                item_id = str(item_inventario.get("_id")) if item_inventario.get("_id") else None
                item_codigo = item_inventario.get("codigo") || item_inventario.get("codigo_producto")
                
                if (item_id == producto_id) or (item_codigo == codigo_producto):
                    producto_encontrado = i
                    break
            
            if producto_encontrado is None:
                print(f"⚠️ [BACKEND] Producto {producto_id} ({codigo_producto}) no encontrado en inventario")
                continue
            
            # Obtener existencia actual
            item_actual = items[producto_encontrado]
            existencia_actual = item_actual.get("cantidad") || item_actual.get("existencia") || item_actual.get("stock") || 0
            
            # Validar stock suficiente
            if existencia_actual < cantidad_vendida:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {codigo_producto}. Disponible: {existencia_actual}, Solicitado: {cantidad_vendida}"
                )
            
            # ✅ CRÍTICO: Descontar cantidad vendida
            nueva_existencia = existencia_actual - cantidad_vendida
            
            # Actualizar los tres campos
            items[producto_encontrado]["cantidad"] = nueva_existencia
            items[producto_encontrado]["existencia"] = nueva_existencia
            items[producto_encontrado]["stock"] = nueva_existencia
            
            items_modificados = True
            print(f"✅ [BACKEND] Producto {codigo_producto}: {existencia_actual} -> {nueva_existencia} (vendido: {cantidad_vendida})")
        
        # PASO 3: Actualizar inventario si hubo modificaciones
        if items_modificados:
            await db.inventarios.update_one(
                {"_id": inventario["_id"]},
                {"$set": {"items": items}}
            )
            print(f"✅ [BACKEND] Inventario actualizado después de la venta")
        
        # PASO 4: Registrar la venta
        venta_registrada = await db.ventas.insert_one(venta_data)
        
        print(f"✅ [BACKEND] Venta registrada: {venta_registrada.inserted_id}")
        
        return {
            "success": True,
            "venta_id": str(venta_registrada.inserted_id),
            "numero_factura": str(venta_registrada.inserted_id),
            "message": "Venta registrada y existencia descontada correctamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ [BACKEND] Error al crear venta: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **SIEMPRE descontar del inventario activo**
   - No usar inventarios inactivos
   - No usar inventarios de otras sucursales

2. **SIEMPRE validar stock suficiente**
   - Verificar que `existencia_actual >= cantidad_vendida`
   - Lanzar error si no hay suficiente stock

3. **SIEMPRE actualizar los tres campos**
   - `cantidad` = nueva existencia
   - `existencia` = nueva existencia (campo principal)
   - `stock` = nueva existencia (compatibilidad)

4. **SIEMPRE usar transacciones si es posible**
   - Para asegurar atomicidad (inventario y venta se actualizan juntos)
   - Si falla la venta, no se debe descontar el inventario

---

## 🔍 LOGS RECOMENDADOS

Agregar estos logs para debugging:

```python
# Al recibir la venta
print(f"🔍 [BACKEND] Venta recibida: {len(items_venta)} items, sucursal: {sucursal_id}")

# Por cada item a descontar
print(f"📦 [BACKEND] Descontando: {codigo_producto}, cantidad: {cantidad_vendida}")

# Antes y después de descontar
print(f"📊 [BACKEND] {codigo_producto}: {existencia_actual} -> {nueva_existencia}")

# Después de actualizar inventario
print(f"✅ [BACKEND] Inventario actualizado: {len(items)} items")
```

---

## 🚨 RECORDATORIOS IMPORTANTES

1. **NO olvidar descontar del inventario**
2. **SIEMPRE validar stock suficiente antes de descontar**
3. **SIEMPRE actualizar los tres campos** (`cantidad`, `existencia`, `stock`)
4. **SIEMPRE usar el inventario activo de la sucursal correcta**
5. **La existencia debe actualizarse INMEDIATAMENTE después de la venta**

---

## 📞 EJEMPLO DE PRUEBA

**Request:**
```json
{
  "items": [
    {
      "producto_id": "69461ccb667c6f5d36362356",
      "codigo": "PPPP1",
      "cantidad": 1
    }
  ],
  "sucursal": "01"
}
```

**Resultado esperado:**
- Existencia de PPPP1: 10 -> 9
- Venta registrada correctamente
- Inventario actualizado

**Fecha de creación:** 2025-01-20
**Prioridad:** CRÍTICA - URGENTE
**Estado:** PENDIENTE DE IMPLEMENTACIÓN

