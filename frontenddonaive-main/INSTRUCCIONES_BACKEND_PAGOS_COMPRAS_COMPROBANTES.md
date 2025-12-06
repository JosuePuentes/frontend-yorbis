# INSTRUCCIONES BACKEND: Pagos de Compras con Comprobantes

## Resumen
El frontend ahora permite pagar/abonar cuentas por pagar desde la tabla principal, seleccionando un banco, ingresando el monto, y adjuntando un comprobante (imagen). El backend debe procesar estos pagos correctamente.

---

## Endpoint: POST /compras/{compra_id}/pagos

### Request Body

```json
{
  "monto": 100.50,
  "fecha_pago": "2025-01-15",
  "metodo_pago": "banco",
  "banco_id": "banco_id_123",
  "referencia": "TRF-123456",
  "notas": "Pago parcial",
  "comprobante": "nombre_archivo_comprobante.jpg"  // ⬅️ NUEVO: Nombre del archivo de imagen
}
```

### Campos

- `monto` (number, requerido): Monto del pago en USD
- `fecha_pago` (string, requerido): Fecha del pago en formato YYYY-MM-DD
- `metodo_pago` (string, requerido): Método de pago (ej: "banco", "efectivo")
- `banco_id` (string, requerido si metodo_pago es "banco"): ID del banco usado
- `referencia` (string, opcional): Número de referencia del pago
- `notas` (string, opcional): Notas adicionales sobre el pago
- `comprobante` (string, opcional): **NUEVO** - Nombre del archivo de imagen del comprobante subido

### Respuesta Exitosa (201 Created)

```json
{
  "_id": "pago_id_123",
  "compra_id": "compra_id_456",
  "monto": 100.50,
  "fecha_pago": "2025-01-15",
  "metodo_pago": "banco",
  "banco_id": "banco_id_123",
  "banco": {
    "_id": "banco_id_123",
    "nombre_banco": "Banco de Venezuela",
    "divisa": "USD"
  },
  "referencia": "TRF-123456",
  "notas": "Pago parcial",
  "comprobante": "nombre_archivo_comprobante.jpg",  // ⬅️ INCLUIR EN RESPUESTA
  "usuario_id": "usuario_id_789",
  "fecha_creacion": "2025-01-15T10:30:00.000Z"
}
```

---

## Lógica Requerida

### 1. Almacenar el Comprobante

El frontend sube la imagen del comprobante y envía el nombre del archivo en el campo `comprobante`. El backend debe:

- Almacenar el nombre del archivo en la base de datos
- Asegurarse de que el archivo existe en el servidor (ruta: `/uploads/{nombre_archivo}`)
- Si el archivo no existe, retornar un error o ignorar el campo (según la política del sistema)

### 2. Actualizar la Compra

Después de crear el pago, el backend **DEBE** actualizar la compra:

```python
# Calcular total abonado sumando todos los pagos
total_abonado = sum(pago.monto for pago in compra.pagos)

# Calcular monto restante
monto_restante = compra.total_precio_venta - total_abonado

# Actualizar estado
if monto_restante <= 0:
    compra.estado = "pagada"
elif total_abonado > 0:
    compra.estado = "abonado"
else:
    compra.estado = "sin_pago"

# Actualizar campos
compra.monto_abonado = total_abonado
compra.monto_restante = monto_restante

# Guardar compra
await db.compras.update_one(
    {"_id": ObjectId(compra_id)},
    {
        "$set": {
            "monto_abonado": total_abonado,
            "monto_restante": monto_restante,
            "estado": compra.estado
        },
        "$push": {
            "pagos": nuevo_pago
        }
    }
)
```

### 3. Actualizar Saldo del Banco

Si el pago se realiza desde un banco (`banco_id` presente), el backend debe:

- **RESTAR** el monto del saldo del banco (porque es un pago saliente)
- Crear un movimiento tipo "pago_compra" en el historial del banco

```python
# Actualizar saldo del banco
banco = await db.bancos.find_one({"_id": ObjectId(banco_id)})
nuevo_saldo = banco.saldo - monto_pago

if nuevo_saldo < 0:
    raise HTTPException(
        status_code=400, 
        detail=f"Saldo insuficiente. Saldo disponible: ${banco.saldo:.2f}"
    )

await db.bancos.update_one(
    {"_id": ObjectId(banco_id)},
    {"$set": {"saldo": nuevo_saldo}}
)

# Crear movimiento
movimiento = {
    "banco_id": banco_id,
    "tipo": "pago_compra",
    "monto": -monto_pago,  # Negativo porque es salida
    "descripcion": f"Pago de compra {compra_id}",
    "referencia": referencia,
    "compra_id": compra_id,
    "fecha": datetime.now()
}
await db.movimientos.insert_one(movimiento)
```

---

## Endpoint: GET /compras/{compra_id}

### Respuesta Requerida

El endpoint debe incluir los pagos con el comprobante:

```json
{
  "_id": "compra_id_456",
  "proveedor": {...},
  "total_precio_venta": 1000.00,
  "monto_abonado": 100.50,  // ⬅️ ACTUALIZAR
  "monto_restante": 899.50,  // ⬅️ ACTUALIZAR
  "estado": "abonado",  // ⬅️ ACTUALIZAR
  "pagos": [
    {
      "_id": "pago_id_123",
      "monto": 100.50,
      "fecha_pago": "2025-01-15",
      "metodo_pago": "banco",
      "banco_id": "banco_id_123",
      "banco": {
        "_id": "banco_id_123",
        "nombre_banco": "Banco de Venezuela",
        "divisa": "USD"
      },
      "referencia": "TRF-123456",
      "notas": "Pago parcial",
      "comprobante": "nombre_archivo_comprobante.jpg",  // ⬅️ INCLUIR
      "fecha_creacion": "2025-01-15T10:30:00.000Z"
    }
  ],
  ...
}
```

---

## Endpoint: GET /compras

### Respuesta Requerida

El endpoint debe incluir los pagos poblados en cada compra:

```json
[
  {
    "_id": "compra_id_456",
    "proveedor": {...},
    "total_precio_venta": 1000.00,
    "monto_abonado": 100.50,  // ⬅️ ACTUALIZAR
    "monto_restante": 899.50,  // ⬅️ ACTUALIZAR
    "estado": "abonado",  // ⬅️ ACTUALIZAR
    "pagos": [
      {
        "_id": "pago_id_123",
        "monto": 100.50,
        "comprobante": "nombre_archivo_comprobante.jpg",  // ⬅️ INCLUIR
        "banco": {
          "nombre_banco": "Banco de Venezuela"
        },
        ...
      }
    ],
    ...
  }
]
```

---

## Validaciones Requeridas

1. **Validar monto**: El monto no puede ser mayor al `monto_restante` de la compra
2. **Validar saldo del banco**: Si se usa un banco, verificar que tenga saldo suficiente
3. **Validar comprobante**: Verificar que el archivo existe (opcional, puede ignorarse si no existe)
4. **Validar estado**: No permitir pagos si la compra ya está pagada completamente

---

## Ejemplo de Implementación (Pseudocódigo)

```python
@router.post("/compras/{compra_id}/pagos")
async def crear_pago_compra(
    compra_id: str,
    pago_data: PagoCompraRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # 1. Obtener compra
    compra = await db.compras.find_one({"_id": ObjectId(compra_id)})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    # 2. Validar monto
    monto_restante = compra.get("monto_restante", compra.get("total_precio_venta", 0))
    if pago_data.monto > monto_restante:
        raise HTTPException(
            status_code=400,
            detail=f"El monto a pagar (${pago_data.monto:.2f}) excede el monto restante (${monto_restante:.2f})"
        )
    
    # 3. Validar saldo del banco (si aplica)
    if pago_data.banco_id:
        banco = await db.bancos.find_one({"_id": ObjectId(pago_data.banco_id)})
        if not banco:
            raise HTTPException(status_code=404, detail="Banco no encontrado")
        
        if banco.saldo < pago_data.monto:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Saldo disponible: ${banco.saldo:.2f}"
            )
        
        # Actualizar saldo del banco
        nuevo_saldo = banco.saldo - pago_data.monto
        await db.bancos.update_one(
            {"_id": ObjectId(pago_data.banco_id)},
            {"$set": {"saldo": nuevo_saldo}}
        )
        
        # Crear movimiento
        movimiento = {
            "banco_id": pago_data.banco_id,
            "tipo": "pago_compra",
            "monto": -pago_data.monto,
            "descripcion": f"Pago de compra {compra_id}",
            "referencia": pago_data.referencia,
            "compra_id": compra_id,
            "fecha": datetime.now(),
            "usuario_id": str(current_user.id)
        }
        await db.movimientos.insert_one(movimiento)
    
    # 4. Crear pago
    nuevo_pago = {
        "compra_id": compra_id,
        "monto": pago_data.monto,
        "fecha_pago": pago_data.fecha_pago,
        "metodo_pago": pago_data.metodo_pago,
        "banco_id": pago_data.banco_id,
        "referencia": pago_data.referencia,
        "notas": pago_data.notas,
        "comprobante": pago_data.comprobante,  # ⬅️ ALMACENAR
        "usuario_id": str(current_user.id),
        "fecha_creacion": datetime.now()
    }
    
    resultado = await db.pagos.insert_one(nuevo_pago)
    nuevo_pago["_id"] = resultado.inserted_id
    
    # 5. Obtener todos los pagos de la compra para calcular totales
    todos_los_pagos = await db.pagos.find({"compra_id": compra_id}).to_list(length=None)
    total_abonado = sum(p["monto"] for p in todos_los_pagos)
    total_factura = compra.get("total_precio_venta", compra.get("total", 0))
    nuevo_monto_restante = total_factura - total_abonado
    
    # 6. Actualizar estado de la compra
    if nuevo_monto_restante <= 0:
        nuevo_estado = "pagada"
    elif total_abonado > 0:
        nuevo_estado = "abonado"
    else:
        nuevo_estado = "sin_pago"
    
    # 7. Actualizar compra
    await db.compras.update_one(
        {"_id": ObjectId(compra_id)},
        {
            "$set": {
                "monto_abonado": total_abonado,
                "monto_restante": nuevo_monto_restante,
                "estado": nuevo_estado
            }
        }
    )
    
    # 8. Poblar banco en la respuesta
    if pago_data.banco_id:
        banco = await db.bancos.find_one({"_id": ObjectId(pago_data.banco_id)})
        nuevo_pago["banco"] = {
            "_id": str(banco["_id"]),
            "nombre_banco": banco.get("nombre_banco", ""),
            "divisa": banco.get("divisa", "USD")
        }
    
    return nuevo_pago
```

---

## Notas Importantes

1. **El comprobante es opcional**: Si no se envía, el pago se procesa normalmente
2. **El saldo del banco se resta**: Porque es un pago saliente (dinero que sale del banco)
3. **Los totales se calculan automáticamente**: Sumando todos los pagos de la compra
4. **El estado se actualiza automáticamente**: Según el monto restante
5. **Los pagos deben incluirse en GET /compras**: Para que el frontend pueda mostrar el historial

---

## Fecha de Implementación

- **Frontend**: Implementado
- **Backend**: Pendiente de verificación/implementación

---

## Contacto

Si hay dudas sobre la implementación, consultar con el equipo de desarrollo del frontend.

