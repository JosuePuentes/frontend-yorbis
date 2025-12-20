# 🚨 INSTRUCCIONES URGENTES BACKEND: Descuento de Stock al Confirmar Venta

## ⚠️ PROBLEMA ACTUAL

**El stock NO se está descontando cuando se confirma e imprime una factura en el punto de venta.**

Cuando el usuario:
1. Selecciona productos y cantidades en el punto de venta
2. Presiona "Totalizar" (abre modal de pago)
3. Agrega métodos de pago
4. Presiona "Confirmar e Imprimir Factura"

**El stock NO se descuenta automáticamente del inventario.**

---

## 🎯 SOLUCIÓN REQUERIDA

**CRÍTICO:** El backend DEBE descontar automáticamente la cantidad vendida del inventario cuando se recibe la petición `POST /punto-venta/ventas`.

---

## 📋 ENDPOINT AFECTADO

### `POST /punto-venta/ventas`

**Request que envía el frontend:**

```json
{
  "items": [
    {
      "producto_id": "690c40be93d9d9d635fbae83",
      "nombre": "SPRAY DIESEL TOOLS AZUL CIELO",
      "codigo": "12345",
      "cantidad": 2,
      "precio_unitario": 360.03,
      "precio_unitario_usd": 3.00,
      "precio_unitario_original": 360.03,
      "precio_unitario_original_usd": 3.00,
      "subtotal": 720.06,
      "subtotal_usd": 6.00,
      "descuento_aplicado": 0
    }
  ],
  "metodos_pago": [
    {
      "tipo": "efectivo",
      "monto": 10.00,
      "divisa": "USD"
    }
  ],
  "total_bs": 1500.00,
  "total_usd": 12.50,
  "tasa_dia": 120.00,
  "sucursal": "690c40be93d9d9d635fbaf5b",
  "cajero": "usuario@ejemplo.com",
  "cliente": "690c40be93d9d9d635fbae83",
  "porcentaje_descuento": 0,
  "descuento_por_divisa": 0,
  "notas": ""
}
```

**Campos importantes:**
- `items[].producto_id`: ID del producto vendido
- `items[].cantidad`: Cantidad vendida (ESTE ES EL VALOR A DESCONTAR)
- `items[].codigo`: Código del producto (para búsqueda alternativa)
- `sucursal`: ID de la sucursal donde se realiza la venta

---

## 🔧 IMPLEMENTACIÓN REQUERIDA

### PASO 1: Obtener Inventario de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "farmacia": venta_data.sucursal,  # O "sucursal" según tu estructura
    "estado": "activo"  # O el campo que uses para inventarios activos
})

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
    )

inventario_id = inventario["_id"]
```

### PASO 2: Procesar Cada Item y Descontar Stock

**⚠️ ESTE ES EL PASO CRÍTICO QUE FALTA:**

```python
# Usar transacción para garantizar atomicidad
async with await db.client.start_session() as session:
    async with session.start_transaction():
        items_procesados = []
        
        for item_venta in venta_data.items:
            producto_id = ObjectId(item_venta.producto_id)
            cantidad_vendida = item_venta.cantidad
            
            # Buscar el item en el inventario
            # Opción 1: Si los items están embebidos en el inventario
            inventario_actualizado = await db.inventarios.find_one(
                {"_id": inventario_id},
                session=session
            )
            
            items = inventario_actualizado.get("items", [])
            item_encontrado = None
            item_index = -1
            
            for idx, item in enumerate(items):
                # Buscar por producto_id, _id, o codigo
                item_producto_id = item.get("producto_id") or item.get("_id") or item.get("id")
                item_codigo = item.get("codigo")
                
                if (str(item_producto_id) == str(producto_id) or 
                    item_codigo == item_venta.codigo):
                    item_encontrado = item
                    item_index = idx
                    break
            
            # Opción 2: Si los items están en una colección separada
            # item_encontrado = await db.items_inventario.find_one({
            #     "inventario_id": inventario_id,
            #     "$or": [
            #         {"producto_id": producto_id},
            #         {"_id": producto_id},
            #         {"codigo": item_venta.codigo}
            #     ]
            # }, session=session)
            
            if not item_encontrado:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {item_venta.nombre} (ID: {producto_id}) no encontrado en el inventario"
                )
            
            # Verificar stock disponible
            stock_actual = item_encontrado.get("cantidad", item_encontrado.get("existencia", 0))
            
            if stock_actual < cantidad_vendida:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item_venta.nombre}. Stock disponible: {stock_actual}, solicitado: {cantidad_vendida}"
                )
            
            # ⚠️ CRÍTICO: Descontar la cantidad vendida del inventario
            nueva_cantidad = stock_actual - cantidad_vendida
            
            # Actualizar el item en el inventario
            if item_index >= 0:  # Si está embebido en el inventario
                items[item_index]["cantidad"] = nueva_cantidad
                items[item_index]["existencia"] = nueva_cantidad  # Mantener consistencia
                items[item_index]["fecha_actualizacion"] = datetime.now()
                
                # Actualizar el inventario completo
                await db.inventarios.update_one(
                    {"_id": inventario_id},
                    {
                        "$set": {
                            "items": items,
                            "fecha_actualizacion": datetime.now()
                        }
                    },
                    session=session
                )
            else:  # Si está en colección separada
                await db.items_inventario.update_one(
                    {"_id": item_encontrado["_id"]},
                    {
                        "$set": {
                            "cantidad": nueva_cantidad,
                            "existencia": nueva_cantidad,
                            "fecha_actualizacion": datetime.now()
                        }
                    },
                    session=session
                )
            
            # Manejar lotes si el producto los tiene (FIFO)
            if "lotes" in item_encontrado and item_encontrado["lotes"]:
                cantidad_restante = cantidad_vendida
                lotes_ordenados = sorted(
                    item_encontrado["lotes"],
                    key=lambda x: x.get("fecha_vencimiento", datetime.max)
                )
                
                for lote in lotes_ordenados:
                    if cantidad_restante <= 0:
                        break
                    
                    cantidad_lote = lote.get("cantidad", 0)
                    if cantidad_lote > 0:
                        cantidad_a_descontar = min(cantidad_restante, cantidad_lote)
                        lote["cantidad"] = cantidad_lote - cantidad_a_descontar
                        cantidad_restante -= cantidad_a_descontar
                
                # Actualizar lotes
                lotes_actualizados = [lote for lote in lotes_ordenados if lote.get("cantidad", 0) > 0]
                
                if item_index >= 0:
                    items[item_index]["lotes"] = lotes_actualizados
                    await db.inventarios.update_one(
                        {"_id": inventario_id},
                        {"$set": {"items": items}},
                        session=session
                    )
                else:
                    await db.items_inventario.update_one(
                        {"_id": item_encontrado["_id"]},
                        {"$set": {"lotes": lotes_actualizados}},
                        session=session
                    )
            
            # Agregar a items procesados para guardar en la venta
            items_procesados.append({
                "producto_id": str(item_encontrado.get("_id") or producto_id),
                "nombre": item_venta.nombre,
                "codigo": item_venta.codigo,
                "cantidad": cantidad_vendida,
                "precio_unitario": item_venta.precio_unitario,
                "precio_unitario_usd": item_venta.precio_unitario_usd,
                "subtotal": item_venta.subtotal,
                "subtotal_usd": item_venta.subtotal_usd
            })
        
        # Recalcular costo total del inventario
        if item_index >= 0:  # Si está embebido
            costo_total = sum(
                item.get("costo_unitario", 0) * item.get("cantidad", 0) 
                for item in items
            )
            await db.inventarios.update_one(
                {"_id": inventario_id},
                {"$set": {"costo": costo_total}},
                session=session
            )
        
        # Registrar la venta
        venta_document = {
            "numero_factura": generar_numero_factura(),
            "fecha": datetime.now(),
            "sucursal": venta_data.sucursal,
            "cajero": venta_data.cajero,
            "cliente": venta_data.cliente,
            "items": items_procesados,
            "metodos_pago": venta_data.metodos_pago,
            "total_bs": venta_data.total_bs,
            "total_usd": venta_data.total_usd,
            "tasa_dia": venta_data.tasa_dia,
            "porcentaje_descuento": venta_data.porcentaje_descuento,
            "descuento_por_divisa": venta_data.descuento_por_divisa,
            "estado": "procesada",
            "notas": venta_data.notas
        }
        
        resultado_venta = await db.ventas.insert_one(venta_document, session=session)
        
        # Commit de la transacción
        await session.commit_transaction()
        
        return {
            "_id": str(resultado_venta.inserted_id),
            "numero_factura": venta_document["numero_factura"],
            "mensaje": "Venta registrada exitosamente. Inventario actualizado."
        }
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **Inventario Existe:** Verificar que existe un inventario activo para la sucursal
2. **Producto Existe:** Verificar que cada producto existe en el inventario
3. **Stock Suficiente:** Verificar que hay suficiente stock ANTES de descontar
4. **No Stock Negativo:** NUNCA permitir que el stock quede negativo
5. **Transacciones:** Usar transacciones de MongoDB para asegurar atomicidad:
   - Si falla el registro de la venta, NO se descuenta el stock
   - Si falla el descuento del stock, NO se registra la venta

---

## 🔄 FLUJO COMPLETO

```
Usuario en Punto de Venta
    ↓
Selecciona productos y cantidades
    ↓
Presiona "Totalizar" (abre modal de pago)
    ↓
Agrega métodos de pago
    ↓
Presiona "Confirmar e Imprimir Factura"
    ↓
Frontend envía POST /punto-venta/ventas
    ↓
Backend recibe la petición
    ↓
✅ PASO CRÍTICO: DESCUENTA CANTIDAD DEL INVENTARIO
    - Busca inventario de la sucursal
    - Busca cada producto en el inventario
    - Valida stock disponible
    - Descuenta cantidad vendida
    - Actualiza existencias
    ↓
Registra la venta
    ↓
Retorna confirmación al frontend
    ↓
Frontend imprime factura
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Obtener inventario activo de la sucursal
- [ ] Buscar cada producto en el inventario (por `producto_id` o `codigo`)
- [ ] Validar stock disponible antes de descontar
- [ ] **Descontar cantidad vendida del inventario** ⚠️ CRÍTICO
- [ ] Actualizar campo `cantidad` y `existencia` en el inventario
- [ ] Manejar lotes con FIFO (si el producto tiene lotes)
- [ ] Recalcular costo total del inventario
- [ ] Usar transacciones de MongoDB para atomicidad
- [ ] Registrar la venta
- [ ] Manejar errores (stock insuficiente, producto no encontrado)
- [ ] Retornar confirmación al frontend

---

## 🎯 RESULTADO ESPERADO

**Antes de la venta:**
- Producto: SPRAY DIESEL TOOLS AZUL CIELO
- Stock en Inventario: 10 unidades

**Usuario selecciona:** 2 unidades

**Después de confirmar e imprimir factura:**
- ✅ Stock en Inventario: 8 unidades (10 - 2 = 8)
- ✅ Venta registrada: 2 unidades vendidas
- ✅ El stock se actualiza automáticamente

---

## 🚨 ERRORES COMUNES A EVITAR

1. ❌ **No descontar del inventario** - El stock no se actualiza (PROBLEMA ACTUAL)
2. ❌ **Descontar del inventario incorrecto** - Descontar de otra sucursal
3. ❌ **Permitir stock negativo** - No validar stock antes de descontar
4. ❌ **Descontar antes de validar** - Descontar sin verificar que hay stock
5. ❌ **No usar transacciones** - Si falla la venta, el stock ya se descontó
6. ❌ **No manejar lotes** - No descontar de lotes cuando el producto los tiene

---

## 📞 EJEMPLO DE RESPUESTA EXITOSA

```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "numero_factura": "FAC-2025-001234",
  "mensaje": "Venta registrada exitosamente. Inventario actualizado."
}
```

---

## 🚨 EJEMPLO DE ERROR (Stock Insuficiente)

```json
{
  "detail": "Stock insuficiente para SPRAY DIESEL TOOLS AZUL CIELO. Stock disponible: 1, solicitado: 2"
}
```

---

## ⚠️ NOTA IMPORTANTE

**El descuento del stock DEBE ocurrir INMEDIATAMENTE cuando se confirma la venta, no después.**

El frontend ya está enviando toda la información necesaria:
- ✅ `items[].producto_id`: ID del producto
- ✅ `items[].cantidad`: Cantidad a descontar
- ✅ `items[].codigo`: Código del producto (para búsqueda alternativa)
- ✅ `sucursal`: ID de la sucursal

**El backend solo necesita implementar la lógica de descuento.**

---

**Última actualización:** 2025-01-XX  
**Prioridad:** 🚨 URGENTE  
**Estado:** ⚠️ NO IMPLEMENTADO

