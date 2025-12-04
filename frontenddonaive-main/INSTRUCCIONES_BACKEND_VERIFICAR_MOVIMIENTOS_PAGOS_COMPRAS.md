# Instrucciones Backend: Verificar Movimientos de Pagos de Compras

## ⚠️ PROBLEMA REPORTADO

El usuario hizo dos abonos de $10 cada uno desde un banco, pero **NO aparecen en el historial de movimientos del banco**. Solo aparecen las ventas (ingresos), pero no los pagos de compras (egresos).

## 🔍 VERIFICACIÓN REQUERIDA

### 1. Verificar que se estén CREANDO los movimientos

**Paso 1: Revisar el código de `POST /compras/{compra_id}/pagos`**

Asegurar que después de crear el pago, se esté creando el movimiento:

```python
# Después de crear el pago y actualizar el saldo del banco
# ⚠️ ESTE CÓDIGO DEBE ESTAR PRESENTE:

movimiento_dict = {
    "banco_id": ObjectId(pago_data.banco_id),  # ⚠️ ObjectId, no string
    "tipo": "pago_compra",  # ⚠️ Tipo exacto
    "monto": -abs(pago_data.monto),  # ⚠️ NEGATIVO (egreso)
    "descripcion": f"Pago de compra {compra_id[:8]}... - Proveedor: {proveedor_nombre}",
    "fecha": pago_data.fecha_pago or datetime.utcnow(),
    "referencia": pago_data.referencia or "",
    "compra_id": ObjectId(compra_id),
    "pago_compra_id": pago_id,
    "divisa": banco["divisa"],
    "fecha_creacion": datetime.utcnow()
}

resultado = await db.movimientos_bancos.insert_one(movimiento_dict)
print(f"✅ [PAGO-COMPRA] Movimiento creado: ID={resultado.inserted_id}, banco_id={pago_data.banco_id}, monto={movimiento_dict['monto']}")
```

**Paso 2: Verificar en MongoDB directamente**

Conectarse a MongoDB y ejecutar:

```javascript
// Verificar que existan movimientos de tipo "pago_compra"
db.movimientos_bancos.find({ tipo: "pago_compra" }).pretty()

// Verificar movimientos de un banco específico
db.movimientos_bancos.find({ 
  banco_id: ObjectId("ID_DEL_BANCO_AQUI"),
  tipo: "pago_compra"
}).pretty()

// Contar movimientos por tipo
db.movimientos_bancos.aggregate([
  { $group: { _id: "$tipo", count: { $sum: 1 } } }
])
```

### 2. Verificar que se estén DEVOLVIENDO los movimientos

**Paso 1: Revisar el código de `GET /bancos/{banco_id}/movimientos`**

Asegurar que NO filtre por tipo y que busque correctamente:

```python
# ⚠️ BÚSQUEDA CORRECTA (buscar tanto por string como por ObjectId)
banco_oid = ObjectId(banco_id) if ObjectId.is_valid(banco_id) else None

query = {
    "$or": [
        {"banco_id": banco_id},  # String
        {"banco_id": banco_oid}   # ObjectId
    ]
} if banco_oid else {"banco_id": banco_id}

# ⚠️ NO FILTRAR POR TIPO - Debe devolver TODOS los movimientos
movimientos = await db.movimientos_bancos.find(query).sort("fecha", -1).to_list(length=10000)

# ⚠️ LOG PARA VERIFICAR
tipos_encontrados = {}
for mov in movimientos:
    tipo = mov.get("tipo", "desconocido")
    tipos_encontrados[tipo] = tipos_encontrados.get(tipo, 0) + 1

print(f"📊 [OBTENER-MOVIMIENTOS] Banco: {banco_id}, Total: {len(movimientos)}, Tipos: {tipos_encontrados}")
if "pago_compra" in tipos_encontrados:
    print(f"✅ Encontrados {tipos_encontrados['pago_compra']} movimientos de tipo 'pago_compra'")
else:
    print(f"⚠️ NO se encontraron movimientos de tipo 'pago_compra'")
```

**Paso 2: Probar el endpoint directamente**

```bash
# Hacer una petición GET al endpoint
curl -X GET "https://rapifarma-backend.onrender.com/bancos/{banco_id}/movimientos" \
  -H "Authorization: Bearer {token}"

# Verificar que la respuesta incluya movimientos de tipo "pago_compra"
```

## 🐛 PROBLEMAS COMUNES Y SOLUCIONES

### Problema 1: El movimiento no se crea

**Síntomas:**
- El saldo del banco se actualiza (se resta el monto)
- Pero no aparece movimiento en el historial

**Causas posibles:**
1. El código de creación del movimiento está comentado o no existe
2. Hay un error silencioso al insertar el movimiento
3. El `banco_id` no se está convirtiendo a ObjectId correctamente

**Solución:**
- Verificar que el código de creación del movimiento esté presente
- Agregar try-catch para capturar errores
- Verificar en MongoDB directamente si se creó el movimiento

### Problema 2: El movimiento se crea pero no se devuelve

**Síntomas:**
- El movimiento existe en MongoDB
- Pero no aparece en la respuesta de `GET /bancos/{banco_id}/movimientos`

**Causas posibles:**
1. El `banco_id` se guardó como string pero se busca como ObjectId (o viceversa)
2. Hay un filtro por tipo que excluye "pago_compra"
3. El query no está buscando correctamente

**Solución:**
- Usar `$or` para buscar tanto por string como por ObjectId
- Verificar que NO haya filtro por tipo
- Agregar logging para ver qué se encuentra

### Problema 3: El banco_id no coincide

**Síntomas:**
- El movimiento se crea con un `banco_id`
- Pero al consultar se busca con otro `banco_id`

**Causas posibles:**
1. El `banco_id` se está guardando incorrectamente
2. El `banco_id` del pago no coincide con el `banco_id` del banco

**Solución:**
- Verificar que el `banco_id` del pago sea el mismo que el `banco_id` del banco
- Usar logging para comparar los IDs
- Verificar en MongoDB directamente

## 📋 CHECKLIST DE VERIFICACIÓN

### Al crear un pago de compra:

- [ ] Se crea el pago en `pagos_compras`
- [ ] Se actualiza el saldo del banco (se resta el monto)
- [ ] **Se crea el movimiento en `movimientos_bancos`** ⚠️ CRÍTICO
- [ ] El movimiento tiene `tipo: "pago_compra"`
- [ ] El movimiento tiene `monto: -abs(monto)` (negativo)
- [ ] El movimiento tiene `banco_id: ObjectId(banco_id)`
- [ ] Los logs muestran que se creó el movimiento

### Al consultar movimientos:

- [ ] El endpoint `GET /bancos/{banco_id}/movimientos` devuelve movimientos
- [ ] La respuesta incluye movimientos de tipo "pago_compra"
- [ ] Los logs muestran cuántos movimientos de tipo "pago_compra" se encontraron
- [ ] El query NO filtra por tipo
- [ ] El query busca tanto por string como por ObjectId

## 🔧 CÓDIGO DE VERIFICACIÓN RÁPIDA

Ejecutar en MongoDB para verificar:

```javascript
// 1. Ver todos los movimientos de tipo "pago_compra"
db.movimientos_bancos.find({ tipo: "pago_compra" }).pretty()

// 2. Ver movimientos de un banco específico (reemplazar ID_DEL_BANCO)
db.movimientos_bancos.find({ 
  $or: [
    { banco_id: "ID_DEL_BANCO" },
    { banco_id: ObjectId("ID_DEL_BANCO") }
  ]
}).sort({ fecha: -1 }).pretty()

// 3. Contar movimientos por tipo para un banco
db.movimientos_bancos.aggregate([
  { 
    $match: { 
      $or: [
        { banco_id: "ID_DEL_BANCO" },
        { banco_id: ObjectId("ID_DEL_BANCO") }
      ]
    }
  },
  { $group: { _id: "$tipo", count: { $sum: 1 } } }
])
```

## 🎯 RESULTADO ESPERADO

Después de verificar y corregir:

1. ✅ Al crear un pago de compra, se crea el movimiento en `movimientos_bancos`
2. ✅ Al consultar el historial del banco, aparecen los movimientos de tipo "pago_compra"
3. ✅ Los movimientos se muestran en rojo (egreso) con el monto correcto
4. ✅ Los logs del backend muestran que se encontraron los movimientos

## 📝 NOTAS IMPORTANTES

1. **El movimiento DEBE crearse en la misma transacción o inmediatamente después de crear el pago**
2. **El `banco_id` DEBE ser ObjectId, no string**
3. **El `monto` DEBE ser negativo (egreso)**
4. **El `tipo` DEBE ser exactamente "pago_compra"**
5. **El query de consulta NO debe filtrar por tipo**

