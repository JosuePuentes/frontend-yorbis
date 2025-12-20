# 📦 INSTRUCCIONES BACKEND: Descuento de Inventario al Totalizar en Punto de Venta

## 🎯 REQUERIMIENTO PRINCIPAL

**CRÍTICO:** Cuando se totaliza y confirma una venta en el punto de venta (POS), **DEBE** descontarse automáticamente la cantidad vendida de cada producto de las existencias del inventario de la sucursal correspondiente.

---

## 📋 FLUJO COMPLETO

### 1. Usuario Totaliza Venta en Punto de Venta

El usuario:
1. Selecciona productos y cantidades
2. Presiona "Totalizar" o "Confirmar Venta"
3. El frontend envía la petición al backend

### 2. Backend Recibe la Venta

**Endpoint:** `POST /punto-venta/ventas`

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
  "porcentaje_descuento": 10.0,
  "notas": ""
}
```

### 3. Backend DEBE Descontar del Inventario

**PASO CRÍTICO:** Por cada producto en `items`, el backend debe:

1. **Buscar el producto en el inventario de la sucursal**
2. **Verificar que hay suficiente stock**
3. **Descontar la cantidad vendida del inventario**
4. **Actualizar las existencias**

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Obtener Inventario de la Sucursal

```python
# Obtener el inventario de la sucursal
inventario = await db.inventarios.find_one({
    "sucursal": ObjectId(venta_data.sucursal)
    # O según tu estructura:
    # "farmacia": venta_data.sucursal
})

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario no encontrado para la sucursal {venta_data.sucursal}"
    )

inventario_id = inventario["_id"]
```

### PASO 2: Procesar Cada Item y Descontar Stock

```python
items_procesados = []

for item_venta in venta_data.items:
    producto_id = ObjectId(item_venta.producto_id)
    cantidad_vendida = item_venta.cantidad
    
    # Buscar el item en el inventario
    item_inventario = await db.items_inventario.find_one({
        "inventario_id": inventario_id,
        "producto_id": producto_id
    })
    
    if not item_inventario:
        raise HTTPException(
            status_code=404,
            detail=f"Producto {item_venta.nombre} no encontrado en el inventario"
        )
    
    # Verificar stock disponible
    stock_actual = item_inventario.get("cantidad", 0)
    
    if stock_actual < cantidad_vendida:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente para {item_venta.nombre}. Stock disponible: {stock_actual}, solicitado: {cantidad_vendida}"
        )
    
    # ⚠️ CRÍTICO: Descontar la cantidad vendida del inventario
    nueva_cantidad = stock_actual - cantidad_vendida
    
    # Actualizar el item en el inventario
    await db.items_inventario.update_one(
        {"_id": item_inventario["_id"]},
        {
            "$set": {
                "cantidad": nueva_cantidad
            }
        }
    )
    
    # Agregar a items procesados para guardar en la venta
    items_procesados.append({
        "producto_id": str(item_inventario["_id"]),
        "nombre": item_venta.nombre,
        "codigo": item_venta.codigo,
        "cantidad": item_venta.cantidad,
        "precio_unitario": item_venta.precio_unitario,
        "precio_unitario_usd": item_venta.precio_unitario_usd,
        "subtotal": item_venta.subtotal,
        "subtotal_usd": item_venta.subtotal_usd
    })
```

### PASO 3: Manejar Lotes (Si el Producto Tiene Lotes)

Si el producto tiene lotes, descontar usando FIFO (First In First Out):

```python
# Si el producto tiene lotes
if item_inventario.get("lotes") and len(item_inventario["lotes"]) > 0:
    cantidad_restante = cantidad_vendida
    
    # Ordenar lotes por fecha de vencimiento (más antiguos primero - FIFO)
    lotes = sorted(
        item_inventario["lotes"],
        key=lambda x: x.get("fecha_vencimiento", "")
    )
    
    # Descontar de cada lote hasta completar la cantidad
    for lote in lotes:
        if cantidad_restante <= 0:
            break
        
        cantidad_lote = lote.get("cantidad", 0)
        if cantidad_lote > 0:
            cantidad_a_descontar = min(cantidad_restante, cantidad_lote)
            lote["cantidad"] = cantidad_lote - cantidad_a_descontar
            cantidad_restante -= cantidad_a_descontar
    
    # Eliminar lotes con cantidad 0
    lotes_actualizados = [lote for lote in lotes if lote.get("cantidad", 0) > 0]
    
    # Actualizar cantidad total
    nueva_cantidad = sum(lote.get("cantidad", 0) for lote in lotes_actualizados)
    
    # Actualizar el item en el inventario
    await db.items_inventario.update_one(
        {"_id": item_inventario["_id"]},
        {
            "$set": {
                "cantidad": nueva_cantidad,
                "lotes": lotes_actualizados
            }
        }
    )
```

### PASO 4: Recalcular Costo Total del Inventario

```python
# Recalcular costo total del inventario después de descontar
items_inventario = await db.items_inventario.find({
    "inventario_id": inventario_id
}).to_list(length=None)

costo_total = sum(
    item.get("cantidad", 0) * item.get("costo_unitario", 0)
    for item in items_inventario
)

await db.inventarios.update_one(
    {"_id": inventario_id},
    {"$set": {"costo": costo_total}}
)
```

### PASO 5: Guardar la Venta

```python
# Crear registro de venta
venta_doc = {
    "items": items_procesados,
    "metodos_pago": [mp.dict() for mp in venta_data.metodos_pago],
    "total_bs": venta_data.total_bs,
    "total_usd": venta_data.total_usd,
    "tasa_dia": venta_data.tasa_dia,
    "sucursal": ObjectId(venta_data.sucursal),
    "cajero": venta_data.cajero,
    "cliente": ObjectId(venta_data.cliente) if venta_data.cliente else None,
    "fecha": datetime.now(),
    "estado": "procesada",
    "numero_factura": generar_numero_factura()
}

resultado = await db.ventas.insert_one(venta_doc)

return {
    "_id": str(resultado.inserted_id),
    "numero_factura": venta_doc["numero_factura"],
    "mensaje": "Venta registrada exitosamente. Stock descontado del inventario."
}
```

---

## ✅ EJEMPLO COMPLETO

### Antes de la Venta:
- **Producto:** SPRAY DIESEL TOOLS AZUL CIELO
- **Stock en Inventario:** 10 unidades
- **Usuario selecciona:** 2 unidades

### Después de Totalizar:
- **Stock en Inventario:** 8 unidades (10 - 2 = 8)
- **Venta registrada:** 2 unidades vendidas

---

## ⚠️ VALIDACIONES CRÍTICAS

1. **Stock Disponible:** Verificar que hay suficiente stock ANTES de descontar
2. **Producto Existe:** Verificar que el producto existe en el inventario
3. **Inventario Existe:** Verificar que existe un inventario para la sucursal
4. **No Stock Negativo:** Nunca permitir que el stock quede negativo
5. **Transacciones:** Usar transacciones de MongoDB para asegurar atomicidad (si falla la venta, no se descuenta el stock)

---

## 🔄 FLUJO VISUAL

```
Usuario en POS
    ↓
Selecciona productos y cantidades
    ↓
Presiona "Totalizar"
    ↓
Frontend envía POST /punto-venta/ventas
    ↓
Backend recibe la petición
    ↓
✅ DESCUENTA CANTIDAD DEL INVENTARIO (CRÍTICO)
    ↓
Actualiza existencias en la base de datos
    ↓
Registra la venta
    ↓
Retorna confirmación al frontend
```

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Endpoint `POST /punto-venta/ventas` implementado
- [ ] Buscar inventario de la sucursal
- [ ] Buscar cada producto en el inventario
- [ ] Validar stock disponible antes de descontar
- [ ] Descontar cantidad vendida del inventario
- [ ] Manejar lotes con FIFO (si aplica)
- [ ] Actualizar existencias en la base de datos
- [ ] Recalcular costo total del inventario
- [ ] Registrar la venta
- [ ] Manejar errores (stock insuficiente, producto no encontrado)
- [ ] Usar transacciones para garantizar atomicidad
- [ ] Retornar confirmación al frontend

---

## 🎯 RESULTADO ESPERADO

**Cuando un usuario totaliza una venta en el punto de venta:**

1. ✅ La cantidad vendida se descuenta automáticamente del inventario
2. ✅ Las existencias se actualizan en tiempo real
3. ✅ Si hay lotes, se descuenta usando FIFO
4. ✅ Se valida que hay suficiente stock antes de descontar
5. ✅ La venta se registra correctamente
6. ✅ El frontend recibe confirmación de la venta

---

## 📌 NOTAS IMPORTANTES

1. **Momento del Descuento:** El descuento debe ocurrir **INMEDIATAMENTE** cuando se confirma la venta, no después.

2. **Atomicidad:** Usar transacciones de MongoDB para asegurar que:
   - Si falla el registro de la venta, NO se descuenta el stock
   - Si falla el descuento del stock, NO se registra la venta

3. **Stock Negativo:** NUNCA permitir que el stock quede negativo. Validar antes de descontar.

4. **Lotes:** Si un producto tiene lotes, descontar de los lotes más antiguos primero (FIFO).

5. **Múltiples Sucursales:** Asegurarse de descontar del inventario de la sucursal correcta (la que se especifica en `venta_data.sucursal`).

---

## 🚨 ERRORES COMUNES A EVITAR

1. ❌ **No descontar del inventario** - El stock no se actualiza
2. ❌ **Descontar del inventario incorrecto** - Descontar de otra sucursal
3. ❌ **Permitir stock negativo** - No validar stock antes de descontar
4. ❌ **Descontar antes de validar** - Descontar sin verificar que hay stock
5. ❌ **No manejar lotes** - No descontar de lotes cuando el producto los tiene

---

## 📞 EJEMPLO DE RESPUESTA EXITOSA

```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "numero_factura": "FAC-2025-001234",
  "mensaje": "Venta registrada exitosamente. Stock descontado del inventario."
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

## ✅ CONCLUSIÓN

**SÍ, es CRÍTICO que el backend descontar las cantidades del inventario cuando se totaliza una venta en el punto de venta.**

El descuento debe ser:
- ✅ Automático
- ✅ Inmediato
- ✅ Atómico (usando transacciones)
- ✅ Validado (verificar stock antes)
- ✅ Correcto (de la sucursal correcta)


