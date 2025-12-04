# INSTRUCCIONES BACKEND: Módulo de Bancos

## Resumen
El frontend necesita un sistema completo de gestión de bancos que permita:
1. Crear, editar y eliminar bancos (métodos de pago)
2. Realizar movimientos (depósitos, retiros, transferencias)
3. Ver historial de movimientos
4. Integración con punto de venta (actualizar saldo al vender y dar vuelto)

---

## Endpoints Requeridos

### 1. GET /bancos
Obtener todos los bancos activos.

**Respuesta:**
```json
{
  "bancos": [
    {
      "_id": "banco_id_1",
      "numero_cuenta": "0102-1234-56789012",
      "nombre_banco": "Banco de Venezuela",
      "nombre_titular": "Juan Pérez",
      "saldo": 1000.50,
      "divisa": "USD",
      "activo": true
    }
  ]
}
```

### 2. POST /bancos
Crear un nuevo banco.

**Request:**
```json
{
  "numero_cuenta": "0102-1234-56789012",
  "nombre_banco": "Banco de Venezuela",
  "nombre_titular": "Juan Pérez",
  "saldo": 0,
  "divisa": "USD"
}
```

**Respuesta:**
```json
{
  "_id": "banco_id_1",
  "numero_cuenta": "0102-1234-56789012",
  "nombre_banco": "Banco de Venezuela",
  "nombre_titular": "Juan Pérez",
  "saldo": 0,
  "divisa": "USD",
  "activo": true
}
```

### 3. PUT /bancos/{banco_id}
Actualizar un banco existente.

**Request:** (mismos campos que POST)

### 4. DELETE /bancos/{banco_id}
Eliminar un banco (soft delete recomendado, solo marcar como inactivo).

### 5. POST /bancos/movimientos
Crear un movimiento (depósito, retiro, transferencia).

**Request:**
```json
{
  "banco_id": "banco_id_1",
  "tipo": "deposito",  // "deposito" | "retiro" | "transferencia"
  "monto": 100.00,
  "descripcion": "Depósito inicial",
  "referencia": "REF-12345",
  "banco_destino_id": "banco_id_2"  // Solo para transferencias
}
```

**Lógica:**
- **Depósito**: `saldo += monto`
- **Retiro**: `saldo -= monto` (validar que saldo >= monto)
- **Transferencia**: 
  - Banco origen: `saldo -= monto` (validar que saldo >= monto)
  - Banco destino: `saldo += monto`
  - Crear 2 movimientos (uno en cada banco)

**Respuesta:**
```json
{
  "mensaje": "Movimiento procesado exitosamente",
  "banco_origen": {
    "_id": "banco_id_1",
    "saldo": 900.00
  },
  "banco_destino": {  // Solo para transferencias
    "_id": "banco_id_2",
    "saldo": 1100.00
  }
}
```

### 6. GET /bancos/{banco_id}/movimientos
Obtener historial de movimientos de un banco.

**Query Parameters:**
- `limit` (opcional, default: 100)
- `offset` (opcional, default: 0)

**Respuesta:**
```json
{
  "movimientos": [
    {
      "_id": "movimiento_id_1",
      "banco_id": "banco_id_1",
      "tipo": "deposito",
      "monto": 100.00,
      "descripcion": "Depósito inicial",
      "referencia": "REF-12345",
      "fecha": "2025-01-15T10:30:00.000Z",
      "venta_id": null
    },
    {
      "_id": "movimiento_id_2",
      "banco_id": "banco_id_1",
      "tipo": "venta",
      "monto": 25.50,
      "descripcion": "Venta FAC-2025-001234",
      "referencia": null,
      "fecha": "2025-01-15T11:00:00.000Z",
      "venta_id": "venta_id_1"
    },
    {
      "_id": "movimiento_id_3",
      "banco_id": "banco_id_1",
      "tipo": "vuelto",
      "monto": 4.00,
      "descripcion": "Vuelto de venta FAC-2025-001234",
      "referencia": null,
      "fecha": "2025-01-15T11:00:00.000Z",
      "venta_id": "venta_id_1"
    }
  ],
  "total": 3
}
```

---

## Integración con Punto de Venta

### Modificación en POST /punto-venta/ventas

Cuando se registra una venta, el backend debe:

1. **Actualizar saldo de bancos usados en métodos de pago:**
   - Si un método de pago tiene `banco_id`, sumar el monto al saldo del banco
   - Crear un movimiento tipo "venta" en el banco

2. **Actualizar saldo si hay vuelto:**
   - Si el vuelto se da desde un banco (método de pago negativo con `banco_id`), restar el monto del saldo
   - Crear un movimiento tipo "vuelto" en el banco

### Estructura de Request Modificada

```json
{
  "items": [...],
  "metodos_pago": [
    {
      "tipo": "transferencia",
      "monto": 25.50,
      "divisa": "USD",
      "banco_id": "banco_id_1"  // ✅ NUEVO: ID del banco usado
    },
    {
      "tipo": "efectivo",
      "monto": 10.00,
      "divisa": "USD"
      // Sin banco_id para efectivo
    }
  ],
  "vuelto": [  // ✅ NUEVO: Array de vuelto dado
    {
      "tipo": "transferencia",
      "monto": 4.00,
      "divisa": "USD",
      "banco_id": "banco_id_1"
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

### Lógica de Actualización de Saldos

```python
# Después de registrar la venta exitosamente:

# 1. Procesar métodos de pago (sumar al saldo)
for metodo_pago in venta_data.metodos_pago:
    if metodo_pago.get("banco_id"):
        banco = await db.bancos.find_one({"_id": ObjectId(metodo_pago["banco_id"])})
        if banco:
            nuevo_saldo = banco["saldo"] + metodo_pago["monto"]
            await db.bancos.update_one(
                {"_id": ObjectId(metodo_pago["banco_id"])},
                {"$set": {"saldo": nuevo_saldo}}
            )
            
            # Crear movimiento tipo "venta"
            movimiento = {
                "banco_id": ObjectId(metodo_pago["banco_id"]),
                "tipo": "venta",
                "monto": metodo_pago["monto"],
                "descripcion": f"Venta {numero_factura}",
                "fecha": datetime.now(),
                "venta_id": ObjectId(venta_insertada.inserted_id),
                "referencia": None
            }
            await db.movimientos_bancos.insert_one(movimiento)

# 2. Procesar vuelto (restar del saldo)
if venta_data.get("vuelto"):
    for vuelto_item in venta_data["vuelto"]:
        if vuelto_item.get("banco_id"):
            banco = await db.bancos.find_one({"_id": ObjectId(vuelto_item["banco_id"])})
            if banco:
                nuevo_saldo = banco["saldo"] - vuelto_item["monto"]
                if nuevo_saldo < 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Saldo insuficiente en banco {banco['nombre_banco']}"
                    )
                await db.bancos.update_one(
                    {"_id": ObjectId(vuelto_item["banco_id"])},
                    {"$set": {"saldo": nuevo_saldo}}
                )
                
                # Crear movimiento tipo "vuelto"
                movimiento = {
                    "banco_id": ObjectId(vuelto_item["banco_id"]),
                    "tipo": "vuelto",
                    "monto": vuelto_item["monto"],
                    "descripcion": f"Vuelto de venta {numero_factura}",
                    "fecha": datetime.now(),
                    "venta_id": ObjectId(venta_insertada.inserted_id),
                    "referencia": None
                }
                await db.movimientos_bancos.insert_one(movimiento)
```

---

## Modelos de Base de Datos

### Colección: bancos

```javascript
{
  _id: ObjectId,
  numero_cuenta: String,  // Único
  nombre_banco: String,
  nombre_titular: String,
  saldo: Number,  // Decimal
  divisa: String,  // "USD" | "Bs"
  activo: Boolean,  // Default: true
  created_at: Date,
  updated_at: Date
}
```

**Índices:**
- `numero_cuenta`: único
- `activo`: para filtrar bancos activos

### Colección: movimientos_bancos

```javascript
{
  _id: ObjectId,
  banco_id: ObjectId,  // Referencia a bancos
  tipo: String,  // "deposito" | "retiro" | "transferencia" | "venta" | "vuelto"
  monto: Number,  // Decimal
  descripcion: String,  // Opcional
  referencia: String,  // Opcional (número de referencia externa)
  fecha: Date,
  venta_id: ObjectId,  // Opcional, solo para movimientos de venta/vuelto
  banco_destino_id: ObjectId,  // Opcional, solo para transferencias
  created_at: Date
}
```

**Índices:**
- `banco_id`: para búsquedas rápidas
- `fecha`: para ordenar por fecha
- `tipo`: para filtrar por tipo
- `venta_id`: para relacionar con ventas

---

## Validaciones Importantes

1. **Saldo suficiente para retiros/transferencias:**
   - Validar que `saldo >= monto` antes de procesar
   - Retornar error si no hay saldo suficiente

2. **Transferencias:**
   - Validar que banco origen y destino sean diferentes
   - Validar que ambos bancos existan y estén activos
   - Validar que ambos bancos tengan la misma divisa (o convertir si es necesario)

3. **Divisas:**
   - Si se transfiere entre bancos de diferentes divisas, convertir usando la tasa del día

4. **Movimientos de venta:**
   - Solo se crean automáticamente desde el endpoint de ventas
   - No se pueden crear manualmente desde `/bancos/movimientos`

---

## Ejemplo de Implementación (Python/FastAPI)

```python
from datetime import datetime
from bson import ObjectId
from fastapi import HTTPException, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

# GET /bancos
@router.get("/bancos")
async def obtener_bancos(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    bancos = await db.bancos.find({"activo": True}).to_list(length=None)
    return {
        "bancos": [
            {
                "_id": str(b["_id"]),
                "numero_cuenta": b["numero_cuenta"],
                "nombre_banco": b["nombre_banco"],
                "nombre_titular": b["nombre_titular"],
                "saldo": b["saldo"],
                "divisa": b["divisa"]
            }
            for b in bancos
        ]
    }

# POST /bancos
@router.post("/bancos")
async def crear_banco(
    banco_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Validar que el número de cuenta no exista
    existe = await db.bancos.find_one({"numero_cuenta": banco_data["numero_cuenta"]})
    if existe:
        raise HTTPException(status_code=400, detail="El número de cuenta ya existe")
    
    banco = {
        "numero_cuenta": banco_data["numero_cuenta"],
        "nombre_banco": banco_data["nombre_banco"],
        "nombre_titular": banco_data["nombre_titular"],
        "saldo": banco_data.get("saldo", 0),
        "divisa": banco_data["divisa"],
        "activo": True,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    resultado = await db.bancos.insert_one(banco)
    banco["_id"] = resultado.inserted_id
    banco["_id"] = str(banco["_id"])
    return banco

# POST /bancos/movimientos
@router.post("/bancos/movimientos")
async def crear_movimiento(
    movimiento_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    banco_id = ObjectId(movimiento_data["banco_id"])
    banco = await db.bancos.find_one({"_id": banco_id})
    
    if not banco:
        raise HTTPException(status_code=404, detail="Banco no encontrado")
    
    if not banco.get("activo", True):
        raise HTTPException(status_code=400, detail="Banco inactivo")
    
    monto = movimiento_data["monto"]
    tipo = movimiento_data["tipo"]
    
    if tipo == "deposito":
        nuevo_saldo = banco["saldo"] + monto
    elif tipo == "retiro":
        if banco["saldo"] < monto:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponible: {banco['saldo']}, Solicitado: {monto}"
            )
        nuevo_saldo = banco["saldo"] - monto
    elif tipo == "transferencia":
        if banco["saldo"] < monto:
            raise HTTPException(
                status_code=400,
                detail=f"Saldo insuficiente. Disponible: {banco['saldo']}, Solicitado: {monto}"
            )
        
        banco_destino_id = ObjectId(movimiento_data["banco_destino_id"])
        banco_destino = await db.bancos.find_one({"_id": banco_destino_id})
        
        if not banco_destino:
            raise HTTPException(status_code=404, detail="Banco destino no encontrado")
        
        # Actualizar saldo banco origen
        nuevo_saldo = banco["saldo"] - monto
        await db.bancos.update_one(
            {"_id": banco_id},
            {"$set": {"saldo": nuevo_saldo, "updated_at": datetime.now()}}
        )
        
        # Actualizar saldo banco destino
        nuevo_saldo_destino = banco_destino["saldo"] + monto
        await db.bancos.update_one(
            {"_id": banco_destino_id},
            {"$set": {"saldo": nuevo_saldo_destino, "updated_at": datetime.now()}}
        )
        
        # Crear movimiento en banco destino
        movimiento_destino = {
            "banco_id": banco_destino_id,
            "tipo": "deposito",  // Transferencia recibida se registra como depósito
            "monto": monto,
            "descripcion": f"Transferencia recibida de {banco['nombre_banco']}",
            "referencia": movimiento_data.get("referencia"),
            "fecha": datetime.now(),
            "banco_origen_id": banco_id,
            "created_at": datetime.now()
        }
        await db.movimientos_bancos.insert_one(movimiento_destino)
        
        # Crear movimiento en banco origen
        movimiento_origen = {
            "banco_id": banco_id,
            "tipo": "transferencia",
            "monto": monto,
            "descripcion": f"Transferencia a {banco_destino['nombre_banco']}",
            "referencia": movimiento_data.get("referencia"),
            "fecha": datetime.now(),
            "banco_destino_id": banco_destino_id,
            "created_at": datetime.now()
        }
        await db.movimientos_bancos.insert_one(movimiento_origen)
        
        return {
            "mensaje": "Transferencia procesada exitosamente",
            "banco_origen": {
                "_id": str(banco_id),
                "saldo": nuevo_saldo
            },
            "banco_destino": {
                "_id": str(banco_destino_id),
                "saldo": nuevo_saldo_destino
            }
        }
    else:
        raise HTTPException(status_code=400, detail="Tipo de movimiento inválido")
    
    # Para depósito y retiro (no transferencia)
    if tipo != "transferencia":
        await db.bancos.update_one(
            {"_id": banco_id},
            {"$set": {"saldo": nuevo_saldo, "updated_at": datetime.now()}}
        )
        
        movimiento = {
            "banco_id": banco_id,
            "tipo": tipo,
            "monto": monto,
            "descripcion": movimiento_data.get("descripcion"),
            "referencia": movimiento_data.get("referencia"),
            "fecha": datetime.now(),
            "created_at": datetime.now()
        }
        await db.movimientos_bancos.insert_one(movimiento)
        
        return {
            "mensaje": "Movimiento procesado exitosamente",
            "banco": {
                "_id": str(banco_id),
                "saldo": nuevo_saldo
            }
        }

# GET /bancos/{banco_id}/movimientos
@router.get("/bancos/{banco_id}/movimientos")
async def obtener_movimientos(
    banco_id: str,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    banco_object_id = ObjectId(banco_id)
    movimientos = await db.movimientos_bancos.find({"banco_id": banco_object_id})\
        .sort("fecha", -1)\
        .skip(offset)\
        .limit(limit)\
        .to_list(length=None)
    
    total = await db.movimientos_bancos.count_documents({"banco_id": banco_object_id})
    
    return {
        "movimientos": [
            {
                "_id": str(m["_id"]),
                "banco_id": str(m["banco_id"]),
                "tipo": m["tipo"],
                "monto": m["monto"],
                "descripcion": m.get("descripcion"),
                "referencia": m.get("referencia"),
                "fecha": m["fecha"].isoformat() if m.get("fecha") else None,
                "venta_id": str(m["venta_id"]) if m.get("venta_id") else None
            }
            for m in movimientos
        ],
        "total": total
    }
```

---

## Checklist de Implementación

- [ ] Crear colección `bancos` con índices
- [ ] Crear colección `movimientos_bancos` con índices
- [ ] Implementar `GET /bancos`
- [ ] Implementar `POST /bancos`
- [ ] Implementar `PUT /bancos/{banco_id}`
- [ ] Implementar `DELETE /bancos/{banco_id}`
- [ ] Implementar `POST /bancos/movimientos` (depósito, retiro, transferencia)
- [ ] Implementar `GET /bancos/{banco_id}/movimientos`
- [ ] Modificar `POST /punto-venta/ventas` para:
  - [ ] Actualizar saldo de bancos usados en métodos de pago
  - [ ] Crear movimientos tipo "venta"
  - [ ] Actualizar saldo si hay vuelto
  - [ ] Crear movimientos tipo "vuelto"
- [ ] Validar saldo suficiente antes de retiros/transferencias
- [ ] Validar que bancos existan y estén activos
- [ ] Probar todos los flujos de movimientos
- [ ] Probar integración con punto de venta

---

## Notas Importantes

1. **Transacciones:** Considera usar transacciones de MongoDB para asegurar que los movimientos y actualizaciones de saldo sean atómicos.

2. **Auditoría:** Todos los movimientos deben registrarse para auditoría.

3. **Divisas:** Si necesitas convertir entre USD y Bs, usa la tasa del día de la venta.

4. **Vuelto:** El vuelto se envía como un array separado en la request de venta, no como método de pago negativo.





