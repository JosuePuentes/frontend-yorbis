# Instrucciones Backend: Registrar Movimientos en Bancos al Pagar Compras

## ⚠️ PROBLEMA ACTUAL

Cuando se realiza un pago de compra (abono o pago completo), el saldo del banco se actualiza correctamente, pero **NO se registra un movimiento en el historial del banco**. Esto hace que:

1. El historial de movimientos del banco no muestre los egresos por pagos de compras
2. No se pueda rastrear qué pagos de compras se hicieron desde cada banco
3. La trazabilidad de los movimientos bancarios está incompleta

## ✅ SOLUCIÓN REQUERIDA

### Endpoint: `POST /compras/{compra_id}/pagos`

Cuando se registra un pago de compra, el backend debe:

1. **Guardar el pago** en la colección `pagos_compras` (ya implementado)
2. **Actualizar el saldo del banco** (ya implementado)
3. **Crear un movimiento en el banco** (NUEVO - REQUERIDO)

### Estructura del Movimiento

El movimiento debe tener la siguiente estructura:

```python
movimiento_data = {
    "banco_id": banco_id,  # ID del banco desde el pago
    "tipo": "pago_compra",  # Tipo de movimiento
    "monto": monto,  # Monto del pago (en la divisa del banco)
    "descripcion": f"Pago de compra {compra_id} - Proveedor: {proveedor_nombre}",
    "fecha": fecha_pago,  # Fecha del pago
    "referencia": referencia,  # Referencia del pago (si existe)
    "compra_id": compra_id,  # ID de la compra
    "pago_compra_id": pago_id,  # ID del pago creado
    "divisa": divisa_banco  # Divisa del banco (USD o BS)
}
```

### Lógica de Implementación

```python
@router.post("/compras/{compra_id}/pagos")
async def crear_pago_compra(
    compra_id: str,
    pago_data: PagoCompraCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # 1. Validar compra existe
    compra = await db.compras.find_one({"_id": ObjectId(compra_id)})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    # 2. Validar banco existe
    banco = await db.bancos.find_one({"_id": ObjectId(pago_data.banco_id)})
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    
    # 3. Validar saldo suficiente
    if banco["saldo"] < pago_data.monto:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")
    
    # 4. Obtener proveedor para la descripción
    proveedor = await db.proveedores.find_one({"_id": ObjectId(compra["proveedor_id"])})
    proveedor_nombre = proveedor.get("nombre", "Proveedor desconocido") if proveedor else "Proveedor desconocido"
    
    # 5. Crear el pago
    pago_dict = {
        "compra_id": ObjectId(compra_id),
        "banco_id": ObjectId(pago_data.banco_id),
        "monto": pago_data.monto,
        "fecha_pago": pago_data.fecha_pago,
        "metodo_pago": pago_data.metodo_pago,
        "referencia": pago_data.referencia or "",
        "notas": pago_data.notas or "",
        "comprobante": pago_data.comprobante or "",
        "usuario_id": ObjectId(current_user["_id"]),
        "fecha_creacion": datetime.utcnow()
    }
    
    resultado_pago = await db.pagos_compras.insert_one(pago_dict)
    pago_id = resultado_pago.inserted_id
    
    # 6. Actualizar saldo del banco (RESTAR el monto)
    nuevo_saldo = banco["saldo"] - pago_data.monto
    await db.bancos.update_one(
        {"_id": ObjectId(pago_data.banco_id)},
        {"$set": {"saldo": nuevo_saldo}}
    )
    
    # 7. ⭐ CREAR MOVIMIENTO EN EL BANCO (NUEVO - CRÍTICO)
    # ⚠️ ESTE PASO ES OBLIGATORIO - Sin esto, el movimiento NO aparecerá en el historial
    movimiento_dict = {
        "banco_id": ObjectId(pago_data.banco_id),  # ⚠️ Debe ser ObjectId, no string
        "tipo": "pago_compra",  # ⚠️ Tipo específico para pagos de compras
        "monto": -abs(pago_data.monto),  # ⚠️ NEGATIVO porque es un egreso (salida de dinero)
        "descripcion": f"Pago de compra {compra_id[:8]}... - Proveedor: {proveedor_nombre}",
        "fecha": pago_data.fecha_pago or datetime.utcnow(),  # Usar fecha del pago o ahora
        "referencia": pago_data.referencia or "",
        "compra_id": ObjectId(compra_id),
        "pago_compra_id": pago_id,
        "pago_id": pago_id,  # Alias para compatibilidad
        "proveedor_id": ObjectId(compra["proveedor_id"]) if compra.get("proveedor_id") else None,
        "proveedor_nombre": proveedor_nombre,
        "divisa": banco["divisa"],  # USD o BS
        "fecha_creacion": datetime.utcnow()
    }
    
    # Insertar en la colección de movimientos bancarios
    resultado_movimiento = await db.movimientos_bancos.insert_one(movimiento_dict)
    movimiento_id = resultado_movimiento.inserted_id
    
    # ⚠️ LOG PARA VERIFICAR QUE SE CREÓ
    print(f"✅ [PAGO-COMPRA] Movimiento creado: {movimiento_id}, tipo: pago_compra, monto: {movimiento_dict['monto']}, banco_id: {pago_data.banco_id}")
    
    # 8. Actualizar estado de la compra
    # ... (lógica existente para actualizar monto_abonado, monto_restante, estado)
    
    return {
        "message": "Pago registrado exitosamente",
        "pago_id": str(pago_id),
        "nuevo_saldo_banco": nuevo_saldo
    }
```

## 📋 ESTRUCTURA DE LA COLECCIÓN `movimientos_bancos`

```python
{
    "_id": ObjectId,
    "banco_id": ObjectId,  # Referencia al banco
    "tipo": "pago_compra" | "deposito" | "retiro" | "transferencia" | "venta" | "vuelto",
    "monto": float,  # Monto del movimiento
    "descripcion": str,  # Descripción del movimiento
    "fecha": datetime,  # Fecha del movimiento
    "referencia": str,  # Referencia (opcional)
    "compra_id": ObjectId,  # ID de la compra (solo para pagos de compras)
    "pago_compra_id": ObjectId,  # ID del pago (solo para pagos de compras)
    "venta_id": ObjectId,  # ID de la venta (solo para ventas)
    "divisa": "USD" | "BS",  # Divisa del movimiento
    "fecha_creacion": datetime
}
```

## 🔍 ENDPOINT DE CONSULTA: `GET /bancos/{banco_id}/movimientos`

### ⚠️ CRÍTICO: Este endpoint DEBE devolver TODOS los movimientos

El endpoint debe devolver **TODOS** los movimientos del banco, incluyendo:

- Depósitos
- Retiros
- Transferencias
- Ventas
- Vueltos
- **Pagos de compras** (NUEVO - DEBE estar incluido)

### Código de Implementación

```python
@router.get("/bancos/{banco_id}/movimientos")
async def obtener_movimientos_banco(
    banco_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar que el banco existe
    banco = await db.bancos.find_one({"_id": ObjectId(banco_id)})
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    
    # ⚠️ CRÍTICO: Obtener TODOS los movimientos del banco
    # NO filtrar por tipo, debe incluir "pago_compra"
    # Buscar tanto por ObjectId como por string para compatibilidad
    banco_oid = ObjectId(banco_id) if ObjectId.is_valid(banco_id) else None
    
    query = {
        "$or": [
            {"banco_id": banco_id},  # String
            {"banco_id": banco_oid}   # ObjectId
        ]
    } if banco_oid else {"banco_id": banco_id}
    
    movimientos = await db.movimientos_bancos.find(query).sort("fecha", -1).to_list(length=10000)
    
    # ⚠️ LOG PARA VERIFICAR
    print(f"📊 [OBTENER-MOVIMIENTOS-BANCO] Banco ID: {banco_id}, Movimientos encontrados: {len(movimientos)}")
    tipos_encontrados = {}
    for mov in movimientos:
        tipo = mov.get("tipo", "desconocido")
        tipos_encontrados[tipo] = tipos_encontrados.get(tipo, 0) + 1
    print(f"📊 [OBTENER-MOVIMIENTOS-BANCO] Tipos encontrados: {tipos_encontrados}")
    if "pago_compra" in tipos_encontrados:
        print(f"✅ [OBTENER-MOVIMIENTOS-BANCO] Encontrados {tipos_encontrados['pago_compra']} movimientos de tipo 'pago_compra'")
    else:
        print(f"⚠️ [OBTENER-MOVIMIENTOS-BANCO] No se encontraron movimientos de tipo 'pago_compra'")
    
    # Convertir ObjectId a string y normalizar
    movimientos_dict = []
    for mov in movimientos:
        mov_dict = dict(mov)
        mov_dict["_id"] = str(mov_dict["_id"])
        mov_dict["banco_id"] = str(mov_dict["banco_id"])
        
        # Convertir campos opcionales
        if "compra_id" in mov_dict and mov_dict["compra_id"]:
            mov_dict["compra_id"] = str(mov_dict["compra_id"])
        if "pago_compra_id" in mov_dict and mov_dict["pago_compra_id"]:
            mov_dict["pago_compra_id"] = str(mov_dict["pago_compra_id"])
        if "pago_id" in mov_dict and mov_dict["pago_id"]:
            mov_dict["pago_id"] = str(mov_dict["pago_id"])
        if "venta_id" in mov_dict and mov_dict["venta_id"]:
            mov_dict["venta_id"] = str(mov_dict["venta_id"])
        if "proveedor_id" in mov_dict and mov_dict["proveedor_id"]:
            mov_dict["proveedor_id"] = str(mov_dict["proveedor_id"])
        
        # Asegurar que el tipo esté presente
        if "tipo" not in mov_dict:
            mov_dict["tipo"] = "deposito"  # Valor por defecto
        
        movimientos_dict.append(mov_dict)
    
    # Log para debugging (opcional)
    tipos_encontrados = set(mov.get("tipo", "desconocido") for mov in movimientos_dict)
    print(f"📊 [BANCOS] Movimientos encontrados: {len(movimientos_dict)}, Tipos: {tipos_encontrados}")
    
    return {"movimientos": movimientos_dict}
```

### ⚠️ VERIFICACIÓN IMPORTANTE

1. **NO filtrar por tipo**: El query debe ser solo `{"banco_id": ObjectId(banco_id)}`, sin filtrar por `tipo`
2. **Incluir todos los tipos**: Debe devolver movimientos de tipo "pago_compra", "deposito", "retiro", "transferencia", "venta", "vuelto"
3. **Ordenar por fecha**: Debe ordenar por `fecha` descendente (más recientes primero)
4. **Convertir ObjectId**: Todos los `_id` deben ser strings en la respuesta

## ⚠️ IMPORTANTE

1. **El monto debe ser en la divisa del banco**: Si el banco es USD, el monto debe estar en USD. Si el banco es BS, el monto debe estar en BS.

2. **El movimiento es un EGRESO**: Los pagos de compras son egresos (salidas de dinero), por lo que deben mostrarse en rojo en el frontend (ya implementado).

3. **La descripción debe ser clara**: Debe incluir el ID de la compra (o los últimos 8 caracteres) y el nombre del proveedor para facilitar la identificación.

4. **Consistencia con otros movimientos**: El formato debe ser consistente con los otros tipos de movimientos (deposito, retiro, transferencia, venta, vuelto).

## 🎯 RESULTADO ESPERADO

Después de implementar:

1. ✅ Cuando se pague una compra, se creará un movimiento en el banco
2. ✅ El movimiento aparecerá en el historial del banco como "Pago Compra"
3. ✅ El movimiento se mostrará en rojo (egreso)
4. ✅ La descripción incluirá información de la compra y proveedor
5. ✅ Se podrá rastrear qué compras se pagaron desde cada banco

## 📝 NOTAS ADICIONALES

- Si ya existe una colección `movimientos_bancos`, simplemente agregar el nuevo tipo "pago_compra"
- Si no existe, crear la colección con un índice en `banco_id` y `fecha` para optimizar las consultas
- Considerar agregar índices: `{"banco_id": 1, "fecha": -1}` y `{"compra_id": 1}`

