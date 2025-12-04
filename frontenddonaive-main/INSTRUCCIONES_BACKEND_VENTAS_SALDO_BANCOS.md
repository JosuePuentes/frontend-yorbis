# INSTRUCCIONES BACKEND: Actualizar Saldo de Bancos en Ventas

## ⚠️ IMPORTANTE
Cuando se registra una venta (`POST /punto-venta/ventas`), el backend **DEBE**:
1. **SUMAR** el monto de cada método de pago al saldo del banco correspondiente
2. **RESTAR** el monto de cada vuelto del saldo del banco correspondiente
3. Crear movimientos tipo "venta" y "vuelto" en el historial del banco

---

## 📋 ESTRUCTURA DE REQUEST

El frontend envía la venta con esta estructura:

```json
{
  "items": [...],
  "metodos_pago": [
    {
      "tipo": "banco",
      "monto": 25.50,
      "divisa": "USD",
      "banco_id": "banco_id_1"  // ✅ ID del banco usado
    }
  ],
  "vuelto": [  // ✅ Array de vuelto dado (si existe)
    {
      "tipo": "banco",
      "monto": 4.00,
      "divisa": "USD",
      "banco_id": "banco_id_1"  // ✅ ID del banco del que se da vuelto
    }
  ],
  "total_bs": 3060.00,
  "total_usd": 25.50,
  "tasa_dia": 120.00,
  "sucursal": "690c40be93d9d9d635fbaf5b",
  "cajero": "usuario@ejemplo.com",
  "cliente": "cliente_id_1",
  "porcentaje_descuento": 0,
  "notas": ""
}
```

---

## ✅ LÓGICA REQUERIDA EN EL BACKEND

### Paso 1: Procesar Métodos de Pago (SUMAR al saldo)

Después de registrar la venta exitosamente, para cada método de pago:

```python
# 1. Procesar métodos de pago (sumar al saldo)
for metodo_pago in venta_data.metodos_pago:
    if metodo_pago.get("banco_id"):
        banco_id = ObjectId(metodo_pago["banco_id"])
        banco = await db.bancos.find_one({"_id": banco_id})
        
        if not banco:
            raise HTTPException(
                status_code=404,
                detail=f"Banco {metodo_pago['banco_id']} no encontrado"
            )
        
        if not banco.get("activo", True):
            raise HTTPException(
                status_code=400,
                detail=f"Banco {banco['nombre_banco']} está inactivo"
            )
        
        # Sumar el monto al saldo del banco
        nuevo_saldo = banco["saldo"] + metodo_pago["monto"]
        
        # Actualizar saldo en la base de datos
        await db.bancos.update_one(
            {"_id": banco_id},
            {
                "$set": {
                    "saldo": nuevo_saldo,
                    "updated_at": datetime.now()
                }
            }
        )
        
        # Crear movimiento tipo "venta" en el historial
        movimiento = {
            "banco_id": banco_id,
            "tipo": "venta",
            "monto": metodo_pago["monto"],
            "descripcion": f"Venta {numero_factura}",
            "referencia": None,
            "fecha": datetime.now(),
            "venta_id": ObjectId(venta_insertada.inserted_id),
            "created_at": datetime.now()
        }
        await db.movimientos_bancos.insert_one(movimiento)
        
        logger.info(f"Saldo actualizado: Banco {banco['nombre_banco']} - Saldo anterior: {banco['saldo']}, Nuevo saldo: {nuevo_saldo}")
```

### Paso 2: Procesar Vuelto (RESTAR del saldo)

Si existe vuelto, para cada item de vuelto:

```python
# 2. Procesar vuelto (restar del saldo)
if venta_data.get("vuelto"):
    for vuelto_item in venta_data["vuelto"]:
        if vuelto_item.get("banco_id"):
            banco_id = ObjectId(vuelto_item["banco_id"])
            banco = await db.bancos.find_one({"_id": banco_id})
            
            if not banco:
                raise HTTPException(
                    status_code=404,
                    detail=f"Banco {vuelto_item['banco_id']} no encontrado para vuelto"
                )
            
            if not banco.get("activo", True):
                raise HTTPException(
                    status_code=400,
                    detail=f"Banco {banco['nombre_banco']} está inactivo"
                )
            
            # Validar que haya saldo suficiente
            if banco["saldo"] < vuelto_item["monto"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Saldo insuficiente en banco {banco['nombre_banco']}. Disponible: {banco['saldo']}, Solicitado: {vuelto_item['monto']}"
                )
            
            # Restar el monto del saldo del banco
            nuevo_saldo = banco["saldo"] - vuelto_item["monto"]
            
            # Actualizar saldo en la base de datos
            await db.bancos.update_one(
                {"_id": banco_id},
                {
                    "$set": {
                        "saldo": nuevo_saldo,
                        "updated_at": datetime.now()
                    }
                }
            )
            
            # Crear movimiento tipo "vuelto" en el historial
            movimiento = {
                "banco_id": banco_id,
                "tipo": "vuelto",
                "monto": vuelto_item["monto"],
                "descripcion": f"Vuelto de venta {numero_factura}",
                "referencia": None,
                "fecha": datetime.now(),
                "venta_id": ObjectId(venta_insertada.inserted_id),
                "created_at": datetime.now()
            }
            await db.movimientos_bancos.insert_one(movimiento)
            
            logger.info(f"Vuelto procesado: Banco {banco['nombre_banco']} - Saldo anterior: {banco['saldo']}, Nuevo saldo: {nuevo_saldo}")
```

---

## 🔄 ORDEN DE EJECUCIÓN

1. **Primero:** Registrar la venta en la base de datos
2. **Segundo:** Procesar métodos de pago (sumar saldos)
3. **Tercero:** Procesar vuelto (restar saldos)
4. **Cuarto:** Retornar respuesta exitosa

**⚠️ IMPORTANTE:** Si falla cualquier paso después de registrar la venta, considera hacer rollback o manejar el error apropiadamente.

---

## 📝 EJEMPLO COMPLETO

```python
@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # 1. Registrar la venta
        venta = {
            "items": venta_data["items"],
            "metodos_pago": venta_data["metodos_pago"],
            "total_bs": venta_data["total_bs"],
            "total_usd": venta_data["total_usd"],
            "tasa_dia": venta_data["tasa_dia"],
            "sucursal": ObjectId(venta_data["sucursal"]),
            "cajero": venta_data["cajero"],
            "cliente": ObjectId(venta_data["cliente"]) if venta_data.get("cliente") else None,
            "porcentaje_descuento": venta_data.get("porcentaje_descuento", 0),
            "fecha": datetime.now(),
            "numero_factura": generar_numero_factura(),
            # ... otros campos
        }
        
        resultado_venta = await db.ventas.insert_one(venta)
        numero_factura = venta["numero_factura"]
        
        # 2. Procesar métodos de pago (SUMAR saldos)
        for metodo_pago in venta_data["metodos_pago"]:
            if metodo_pago.get("banco_id"):
                banco_id = ObjectId(metodo_pago["banco_id"])
                banco = await db.bancos.find_one({"_id": banco_id})
                
                if banco:
                    nuevo_saldo = banco["saldo"] + metodo_pago["monto"]
                    await db.bancos.update_one(
                        {"_id": banco_id},
                        {"$set": {"saldo": nuevo_saldo, "updated_at": datetime.now()}}
                    )
                    
                    # Crear movimiento
                    movimiento = {
                        "banco_id": banco_id,
                        "tipo": "venta",
                        "monto": metodo_pago["monto"],
                        "descripcion": f"Venta {numero_factura}",
                        "fecha": datetime.now(),
                        "venta_id": resultado_venta.inserted_id,
                        "created_at": datetime.now()
                    }
                    await db.movimientos_bancos.insert_one(movimiento)
        
        # 3. Procesar vuelto (RESTAR saldos)
        if venta_data.get("vuelto"):
            for vuelto_item in venta_data["vuelto"]:
                if vuelto_item.get("banco_id"):
                    banco_id = ObjectId(vuelto_item["banco_id"])
                    banco = await db.bancos.find_one({"_id": banco_id})
                    
                    if banco:
                        if banco["saldo"] < vuelto_item["monto"]:
                            raise HTTPException(
                                status_code=400,
                                detail=f"Saldo insuficiente en banco {banco['nombre_banco']}"
                            )
                        
                        nuevo_saldo = banco["saldo"] - vuelto_item["monto"]
                        await db.bancos.update_one(
                            {"_id": banco_id},
                            {"$set": {"saldo": nuevo_saldo, "updated_at": datetime.now()}}
                        )
                        
                        # Crear movimiento
                        movimiento = {
                            "banco_id": banco_id,
                            "tipo": "vuelto",
                            "monto": vuelto_item["monto"],
                            "descripcion": f"Vuelto de venta {numero_factura}",
                            "fecha": datetime.now(),
                            "venta_id": resultado_venta.inserted_id,
                            "created_at": datetime.now()
                        }
                        await db.movimientos_bancos.insert_one(movimiento)
        
        return {
            "mensaje": "Venta registrada exitosamente",
            "venta_id": str(resultado_venta.inserted_id),
            "numero_factura": numero_factura
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error al registrar venta: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ⚠️ VALIDACIONES IMPORTANTES

1. **Banco existe:** Verificar que el `banco_id` existe en la base de datos
2. **Banco activo:** Verificar que el banco esté activo (`activo: true`)
3. **Saldo suficiente para vuelto:** Validar que el banco tenga saldo suficiente antes de restar
4. **Divisa correcta:** El monto debe estar en la misma divisa que el banco (USD o BS)

---

## 📊 ESTRUCTURA DE MOVIMIENTOS

Cada movimiento debe guardarse en la colección `movimientos_bancos`:

```javascript
{
  _id: ObjectId,
  banco_id: ObjectId,  // Referencia al banco
  tipo: "venta" | "vuelto",
  monto: Number,       // Monto en la divisa del banco
  descripcion: String, // Ej: "Venta FAC-2025-001234"
  referencia: null,
  fecha: Date,
  venta_id: ObjectId,  // Referencia a la venta
  created_at: Date
}
```

---

## ✅ CHECKLIST

- [ ] Procesar métodos de pago después de registrar la venta
- [ ] Sumar monto al saldo del banco para cada método de pago
- [ ] Crear movimiento tipo "venta" para cada método de pago
- [ ] Procesar vuelto si existe
- [ ] Restar monto del saldo del banco para cada vuelto
- [ ] Validar saldo suficiente antes de restar vuelto
- [ ] Crear movimiento tipo "vuelto" para cada vuelto
- [ ] Actualizar campo `updated_at` del banco
- [ ] Manejar errores apropiadamente
- [ ] Agregar logs para debugging

---

## 🚨 NOTA IMPORTANTE

**El frontend YA ESTÁ ENVIANDO** los campos `banco_id` en `metodos_pago` y `vuelto`. El backend **DEBE** procesarlos para actualizar los saldos automáticamente.

**Sin esta funcionalidad, los saldos de los bancos NO se actualizarán cuando se hagan ventas.**





