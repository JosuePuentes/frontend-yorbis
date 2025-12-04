# INSTRUCCIONES BACKEND: Devolución de Compra

## Resumen
El frontend necesita un endpoint para procesar devoluciones de compra. Cuando se hace una devolución:
1. Se elimina la factura original
2. Se devuelven las cantidades al stock
3. Se crea una nueva factura con los productos seleccionados
4. Solo se cobra la diferencia si el nuevo total es mayor que el original

---

## Endpoint: `POST /punto-venta/devolucion`

### Request Body

```json
{
  "factura_id": "venta_id_original",
  "items_nuevos": [
    {
      "producto_id": "producto_id_1",
      "nombre": "Producto 1",
      "codigo": "COD001",
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
      "tipo": "banco",
      "monto": 5.50,
      "divisa": "USD",
      "banco_id": "banco_id_123"
    }
  ],
  "diferencia_usd": 5.50,
  "total_nuevo_usd": 30.50,
  "total_original_usd": 25.00,
  "sucursal": "690c40be93d9d9d635fbaf5b",
  "cliente": "cliente_id_1",
  "cajero": "admin@gmail.com",
  "tasa_dia": 120.00
}
```

### Campos Importantes

- **`factura_id`**: ID de la factura original que se va a devolver
- **`items_nuevos`**: Array de productos para la nueva factura
- **`metodos_pago`**: Array de métodos de pago (solo se envía si `diferencia_usd > 0`)
  - **`tipo`**: Tipo de método (generalmente "banco")
  - **`monto`**: Monto a pagar
  - **`divisa`**: Divisa del pago ("USD" o "Bs")
  - **`banco_id`**: ID del banco utilizado para el pago (requerido)
- **`diferencia_usd`**: Diferencia entre el nuevo total y el original (positivo = cliente paga más, negativo = se devuelve dinero)
- **`total_nuevo_usd`**: Total de la nueva factura en USD
- **`total_original_usd`**: Total de la factura original en USD

---

## Lógica de Procesamiento

### Paso 1: Obtener y Validar la Factura Original

```python
# Buscar la factura original
factura_original = await db.ventas.find_one({"_id": ObjectId(factura_id)})

if not factura_original:
    raise HTTPException(status_code=404, detail="Factura no encontrada")

# Validar que la factura pertenece a la sucursal correcta
if str(factura_original["sucursal"]) != sucursal:
    raise HTTPException(status_code=403, detail="La factura no pertenece a esta sucursal")
```

### Paso 2: Devolver Stock de la Factura Original

Para cada item en la factura original:

```python
for item_original in factura_original.get("items", []):
    producto_id = item_original.get("producto_id")
    cantidad_devuelta = item_original.get("cantidad", 0)
    
    # Buscar el item en el inventario
    inventario_id = await obtener_inventario_id(sucursal)
    
    item_inventario = await db.items_inventario.find_one({
        "inventario_id": ObjectId(inventario_id),
        "producto_id": ObjectId(producto_id)
    })
    
    if not item_inventario:
        # Si no se encuentra por producto_id, intentar por código
        item_inventario = await db.items_inventario.find_one({
            "inventario_id": ObjectId(inventario_id),
            "codigo": item_original.get("codigo")
        })
    
    if item_inventario:
        # Si tiene lotes, agregar a un lote existente o crear uno nuevo
        if item_inventario.get("lotes"):
            # Agregar a un lote existente (preferiblemente el más reciente)
            lotes = item_inventario["lotes"]
            if lotes:
                # Agregar al último lote o crear uno nuevo
                lotes[-1]["cantidad"] = lotes[-1].get("cantidad", 0) + cantidad_devuelta
            else:
                # Crear un nuevo lote
                lotes.append({
                    "lote": f"DEV-{datetime.now().strftime('%Y%m%d')}",
                    "cantidad": cantidad_devuelta,
                    "fecha_vencimiento": None  # O usar la fecha original si está disponible
                })
        else:
            # Sin lotes, simplemente sumar a la cantidad
            cantidad_actual = item_inventario.get("cantidad", 0)
            item_inventario["cantidad"] = cantidad_actual + cantidad_devuelta
        
        # Actualizar el item en el inventario
        await db.items_inventario.update_one(
            {"_id": item_inventario["_id"]},
            {"$set": {
                "cantidad": item_inventario["cantidad"],
                "lotes": item_inventario.get("lotes", [])
            }}
        )
```

### Paso 3: Descontar Stock de los Nuevos Productos

Para cada item en `items_nuevos`, usar la misma lógica que en una venta normal (ver `INSTRUCCIONES_BACKEND_DESCUENTO_STOCK_VENTAS.md`):

```python
for item_nuevo in items_nuevos:
    producto_id = item_nuevo["producto_id"]
    cantidad = item_nuevo["cantidad"]
    
    # Buscar item en inventario
    item_inventario = await db.items_inventario.find_one({
        "inventario_id": ObjectId(inventario_id),
        "producto_id": ObjectId(producto_id)
    })
    
    if not item_inventario:
        raise HTTPException(
            status_code=404,
            detail=f"Producto {item_nuevo['nombre']} no encontrado en inventario"
        )
    
    # Verificar stock disponible
    stock_disponible = item_inventario.get("cantidad", 0)
    if item_inventario.get("lotes"):
        stock_disponible = sum(lote.get("cantidad", 0) for lote in item_inventario["lotes"])
    
    if stock_disponible < cantidad:
        raise HTTPException(
            status_code=400,
            detail=f"Stock insuficiente para {item_nuevo['nombre']}. Disponible: {stock_disponible}, Solicitado: {cantidad}"
        )
    
    # Descontar stock (usar lógica FIFO si hay lotes)
    # ... (ver INSTRUCCIONES_BACKEND_DESCUENTO_STOCK_VENTAS.md)
```

### Paso 4: Procesar Métodos de Pago (si hay diferencia positiva)

Si `diferencia_usd > 0.01`, procesar los métodos de pago:

```python
if diferencia_usd > 0.01 and metodos_pago:
    # Validar que el total de métodos de pago coincida con la diferencia
    total_pagado = 0
    for metodo in metodos_pago:
        if metodo["divisa"] == "USD":
            total_pagado += metodo["monto"]
        else:  # Bs
            total_pagado += metodo["monto"] / tasa_dia
    
    if abs(total_pagado - diferencia_usd) > 0.01:
        raise HTTPException(
            status_code=400,
            detail=f"El total pagado (${total_pagado:.2f} USD) no coincide con la diferencia (${diferencia_usd:.2f} USD)"
        )
    
    # Actualizar saldos de bancos
    for metodo in metodos_pago:
        if metodo.get("banco_id"):
            banco = await db.bancos.find_one({"_id": ObjectId(metodo["banco_id"])})
            if banco:
                nuevo_saldo = banco.get("saldo", 0) + metodo["monto"]
                await db.bancos.update_one(
                    {"_id": ObjectId(metodo["banco_id"])},
                    {"$set": {"saldo": nuevo_saldo}}
                )
```

### Paso 5: Crear Nueva Factura

```python
# Generar número de factura
numero_factura = await generar_numero_factura(sucursal)

# Crear la nueva factura
nueva_factura = {
    "numero_factura": numero_factura,
    "fecha": datetime.now(),
    "sucursal": ObjectId(sucursal),
    "cajero": cajero,
    "cliente": ObjectId(cliente) if cliente else None,
    "items": items_nuevos,
    "metodos_pago": metodos_pago if diferencia_usd > 0.01 else [],
    "total_usd": total_nuevo_usd,
    "total_bs": total_nuevo_usd * tasa_dia,
    "tasa_dia": tasa_dia,
    "porcentaje_descuento": 0,
    "es_devolucion": True,  # Marcar como devolución
    "factura_original_id": ObjectId(factura_id),  # Referencia a la factura original
    "diferencia_usd": diferencia_usd,
    "estado": "procesada"  # IMPORTANTE: Debe aparecer en facturas procesadas
}

resultado = await db.ventas.insert_one(nueva_factura)
nueva_factura_id = resultado.inserted_id
```

**IMPORTANTE**: La nueva factura debe tener `estado: "procesada"` para que aparezca inmediatamente en la lista de facturas procesadas del punto de venta.

### Paso 6: Eliminar o Marcar la Factura Original

**Opción 1: Eliminar físicamente (NO RECOMENDADO)**
```python
# NO hacer esto, perderíamos el historial
# await db.ventas.delete_one({"_id": ObjectId(factura_id)})
```

**Opción 2: Marcar como devuelta (RECOMENDADO)**
```python
await db.ventas.update_one(
    {"_id": ObjectId(factura_id)},
    {"$set": {
        "estado": "devuelta",
        "fecha_devolucion": datetime.now(),
        "factura_reemplazo_id": nueva_factura_id
    }}
)
```

### Paso 7: Actualizar Costo del Inventario

```python
# Recalcular costo total del inventario
items_inventario = await db.items_inventario.find({
    "inventario_id": ObjectId(inventario_id)
}).to_list(length=None)

costo_total = sum(
    item.get("cantidad", 0) * item.get("costo_unitario", 0)
    for item in items_inventario
)

await db.inventarios.update_one(
    {"_id": ObjectId(inventario_id)},
    {"$set": {"costo": costo_total}}
)
```

---

## Respuesta Exitosa (200)

```json
{
  "success": true,
  "mensaje": "Devolución procesada exitosamente",
  "factura_original_id": "venta_id_original",
  "factura_nueva_id": "nueva_venta_id",
  "factura_nueva": {
    "_id": "nueva_venta_id",
    "numero_factura": "FAC-2025-001235",
    "total_usd": 30.50,
    "diferencia_usd": 5.50
  }
}
```

---

## Manejo de Errores

### Error 400: Stock Insuficiente
```json
{
  "error": "Stock insuficiente para PRODUCTO. Disponible: 5, Solicitado: 10"
}
```

### Error 404: Factura No Encontrada
```json
{
  "error": "Factura no encontrada"
}
```

### Error 500: Error al Procesar
```json
{
  "error": "Error al procesar la devolución",
  "detail": "Mensaje de error detallado"
}
```

---

## Consideraciones Importantes

1. **Transacciones**: Usar transacciones de MongoDB para asegurar que todas las operaciones se completen o se reviertan en caso de error.

2. **Historial**: NO eliminar físicamente la factura original. Marcar como "devuelta" para mantener el historial.

3. **Stock**: Asegurarse de que el stock se devuelva correctamente, especialmente si hay lotes.

4. **Métodos de Pago**: 
   - Solo crear métodos de pago si `diferencia_usd > 0.01`
   - Los métodos de pago deben incluir `banco_id` para actualizar los saldos de los bancos
   - Validar que el total de métodos de pago coincida exactamente con la diferencia
   - Actualizar los saldos de los bancos correspondientes
   - Si la diferencia es negativa o cero, el cliente ya pagó de más y no se debe cobrar nada adicional

5. **Visibilidad de la Nueva Factura**: 
   - La nueva factura debe tener `estado: "procesada"` para que aparezca inmediatamente en la lista de facturas procesadas
   - El endpoint `GET /punto-venta/ventas/usuario` debe incluir facturas con `estado: "procesada"` y `es_devolucion: true`
   - La factura original debe marcarse como `estado: "devuelta"` pero NO debe eliminarse

6. **Validaciones**:
   - Verificar que la factura original existe
   - Verificar que pertenece a la sucursal correcta
   - Verificar stock disponible para los nuevos productos
   - Validar que los montos sean correctos

7. **Auditoría**: Registrar la devolución en un log o tabla de auditoría para trazabilidad.

---

## Ejemplo Completo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

@router.post("/punto-venta/devolucion")
async def procesar_devolucion(
    devolucion_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        factura_id = devolucion_data["factura_id"]
        items_nuevos = devolucion_data["items_nuevos"]
        metodos_pago = devolucion_data.get("metodos_pago", [])
        diferencia_usd = devolucion_data["diferencia_usd"]
        total_nuevo_usd = devolucion_data["total_nuevo_usd"]
        total_original_usd = devolucion_data["total_original_usd"]
        sucursal = devolucion_data["sucursal"]
        cliente = devolucion_data.get("cliente", "")
        cajero = devolucion_data["cajero"]
        tasa_dia = devolucion_data["tasa_dia"]
        
        # Paso 1: Obtener factura original
        factura_original = await db.ventas.find_one({"_id": ObjectId(factura_id)})
        if not factura_original:
            raise HTTPException(status_code=404, detail="Factura no encontrada")
        
        # Paso 2: Devolver stock de la factura original
        inventario_id = await obtener_inventario_id(sucursal, db)
        
        for item_original in factura_original.get("items", []):
            await devolver_stock(item_original, inventario_id, db)
        
        # Paso 3: Descontar stock de nuevos productos
        for item_nuevo in items_nuevos:
            await descontar_stock(item_nuevo, inventario_id, db)
        
        # Paso 4: Procesar métodos de pago si hay diferencia positiva
        if diferencia_usd > 0.01 and metodos_pago:
            # Validar total pagado
            total_pagado = 0
            for metodo in metodos_pago:
                if metodo["divisa"] == "USD":
                    total_pagado += metodo["monto"]
                else:  # Bs
                    total_pagado += metodo["monto"] / tasa_dia
            
            if abs(total_pagado - diferencia_usd) > 0.01:
                raise HTTPException(
                    status_code=400,
                    detail=f"El total pagado (${total_pagado:.2f} USD) no coincide con la diferencia (${diferencia_usd:.2f} USD)"
                )
            
            # Actualizar saldos de bancos
            for metodo in metodos_pago:
                if metodo.get("banco_id"):
                    banco = await db.bancos.find_one({"_id": ObjectId(metodo["banco_id"])})
                    if banco:
                        nuevo_saldo = banco.get("saldo", 0) + metodo["monto"]
                        await db.bancos.update_one(
                            {"_id": ObjectId(metodo["banco_id"])},
                            {"$set": {"saldo": nuevo_saldo}}
                        )
        
        # Paso 5: Crear nueva factura
        numero_factura = await generar_numero_factura(sucursal, db)
        
        nueva_factura = {
            "numero_factura": numero_factura,
            "fecha": datetime.now(),
            "sucursal": ObjectId(sucursal),
            "cajero": cajero,
            "cliente": ObjectId(cliente) if cliente else None,
            "items": items_nuevos,
            "metodos_pago": metodos_pago if diferencia_usd > 0.01 else [],
            "total_usd": total_nuevo_usd,
            "total_bs": total_nuevo_usd * tasa_dia,
            "tasa_dia": tasa_dia,
            "porcentaje_descuento": 0,
            "es_devolucion": True,
            "factura_original_id": ObjectId(factura_id),
            "diferencia_usd": diferencia_usd,
            "estado": "procesada"  # IMPORTANTE: Para que aparezca en facturas procesadas
        }
        
        resultado = await db.ventas.insert_one(nueva_factura)
        nueva_factura_id = resultado.inserted_id
        
        # Paso 6: Marcar factura original como devuelta
        await db.ventas.update_one(
            {"_id": ObjectId(factura_id)},
            {"$set": {
                "estado": "devuelta",
                "fecha_devolucion": datetime.now(),
                "factura_reemplazo_id": nueva_factura_id
            }}
        )
        
        # Paso 7: Actualizar costo del inventario
        await actualizar_costo_inventario(inventario_id, db)
        
        return {
            "success": True,
            "mensaje": "Devolución procesada exitosamente",
            "factura_original_id": factura_id,
            "factura_nueva_id": str(nueva_factura_id),
            "factura_nueva": {
                "_id": str(nueva_factura_id),
                "numero_factura": numero_factura,
                "total_usd": total_nuevo_usd,
                "diferencia_usd": diferencia_usd
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al procesar devolución: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error al procesar la devolución: {str(e)}")
```

---

## Checklist de Implementación

- [ ] Crear endpoint `POST /punto-venta/devolucion`
- [ ] Validar que la factura original existe y pertenece a la sucursal
- [ ] Implementar lógica para devolver stock de la factura original
- [ ] Implementar lógica para descontar stock de los nuevos productos
- [ ] Crear nueva factura con los productos seleccionados
- [ ] Marcar factura original como "devuelta" (no eliminar)
- [ ] Actualizar costo del inventario
- [ ] Manejar métodos de pago solo si hay diferencia positiva
- [ ] Validar que el total de métodos de pago coincida con la diferencia
- [ ] Actualizar saldos de bancos cuando se procesen métodos de pago
- [ ] Asegurar que la nueva factura tenga `estado: "procesada"` para que aparezca en la lista
- [ ] Usar transacciones para asegurar consistencia
- [ ] Agregar logging/auditoría de devoluciones
- [ ] Probar con diferentes escenarios (diferencia positiva, negativa, cero)



