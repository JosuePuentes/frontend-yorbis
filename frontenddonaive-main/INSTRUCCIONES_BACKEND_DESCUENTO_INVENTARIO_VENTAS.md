# 🚨 INSTRUCCIONES CRÍTICAS BACKEND: Descuento de Inventario al Registrar Venta

## ⚠️ PROBLEMA ACTUAL

**CRÍTICO:** Cuando se registra una venta desde el punto de venta, **NO se están descontando las cantidades del inventario**. Esto causa que el stock no se actualice y puede llevar a ventas de productos que ya no existen en inventario.

---

## 🎯 SOLUCIÓN REQUERIDA

**El backend DEBE descontar automáticamente la cantidad vendida de cada producto del inventario de la sucursal correspondiente cuando se recibe la petición `POST /punto-venta/ventas`.**

---

## 📋 ENDPOINT AFECTADO

### `POST /punto-venta/ventas`

**URL:** `${API_BASE_URL}/punto-venta/ventas`

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## 📦 ESTRUCTURA DE DATOS QUE RECIBE EL BACKEND

El frontend envía la siguiente estructura cuando se confirma una venta:

```json
{
  "items": [
    {
      "producto_id": "69349598873821ce1837413d",
      "nombre": "ESMERIL ANGULAR 4-1/2 710W",
      "codigo": "TT1135",
      "cantidad": 2,
      "precio_unitario": 30.8,
      "precio_unitario_usd": 30.8,
      "precio_unitario_original": 30.8,
      "precio_unitario_original_usd": 30.8,
      "subtotal": 61.6,
      "subtotal_usd": 61.6,
      "descuento_aplicado": 0
    }
  ],
  "metodos_pago": [
    {
      "tipo": "efectivo",
      "monto": 61.6,
      "divisa": "USD"
    }
  ],
  "total_bs": 7400.0,
  "total_usd": 61.6,
  "tasa_dia": 120.0,
  "sucursal": "01",
  "cajero": "usuario@ejemplo.com",
  "cliente": "69320b68ce15ee162003c4d2",
  "porcentaje_descuento": 0,
  "descuento_por_divisa": 0,
  "notas": ""
}
```

### Campos Importantes para Descontar Inventario:

- **`items[].producto_id`**: ID del producto en el inventario (CRÍTICO para buscar el item)
- **`items[].codigo`**: Código del producto (alternativa para búsqueda si producto_id falla)
- **`items[].cantidad`**: Cantidad vendida (ESTE ES EL VALOR A DESCONTAR)
- **`items[].nombre`**: Nombre del producto (para mensajes de error)
- **`sucursal`**: ID de la sucursal donde se realiza la venta (CRÍTICO para encontrar el inventario correcto)

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Obtener el Inventario de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "sucursal": venta_data.sucursal,  # O "farmacia" según tu estructura
    "estado": "activo"
})

# Si tu estructura usa "farmacia" en lugar de "sucursal":
# inventario = await db.inventarios.find_one({
#     "farmacia": venta_data.sucursal,
#     "estado": "activo"
# })

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
    )

inventario_id = inventario["_id"]
items_inventario = inventario.get("items", [])
```

### PASO 2: Procesar Cada Item y Descontar Stock

**⚠️ CRÍTICO:** Usar una transacción para asegurar atomicidad (todo o nada):

```python
from pymongo import MongoClient
from bson import ObjectId

async def procesar_venta_con_descuento_inventario(venta_data):
    # Usar transacción para asegurar atomicidad
    async with await db.client.start_session() as session:
        async with session.start_transaction():
            items_procesados = []
            
            # Obtener inventario
            inventario = await db.inventarios.find_one(
                {"sucursal": venta_data.sucursal, "estado": "activo"},
                session=session
            )
            
            if not inventario:
                raise HTTPException(
                    status_code=404,
                    detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
                )
            
            inventario_id = inventario["_id"]
            items = inventario.get("items", [])
            
            # Procesar cada item de la venta
            for item_venta in venta_data.items:
                producto_id = item_venta.producto_id
                cantidad_vendida = item_venta.cantidad
                codigo_producto = item_venta.codigo
                
                # Buscar el item en el inventario por producto_id
                item_encontrado = None
                item_index = None
                
                # Intentar buscar por producto_id (ObjectId)
                try:
                    producto_oid = ObjectId(producto_id)
                    for idx, item in enumerate(items):
                        # Comparar con _id del item o producto_id del item
                        item_producto_id = item.get("_id") or item.get("producto_id") or item.get("id")
                        if item_producto_id:
                            # Si es string, convertir a ObjectId para comparar
                            if isinstance(item_producto_id, str):
                                try:
                                    item_producto_oid = ObjectId(item_producto_id)
                                    if item_producto_oid == producto_oid:
                                        item_encontrado = item
                                        item_index = idx
                                        break
                                except:
                                    if item_producto_id == producto_id:
                                        item_encontrado = item
                                        item_index = idx
                                        break
                            elif item_producto_id == producto_oid:
                                item_encontrado = item
                                item_index = idx
                                break
                except Exception as e:
                    print(f"Error al convertir producto_id a ObjectId: {e}")
                
                # Si no se encontró por producto_id, intentar por código
                if not item_encontrado and codigo_producto:
                    for idx, item in enumerate(items):
                        if item.get("codigo") == codigo_producto or item.get("codigo_producto") == codigo_producto:
                            item_encontrado = item
                            item_index = idx
                            break
                
                # Si aún no se encontró, error
                if not item_encontrado:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Producto '{item_venta.nombre}' (ID: {producto_id}, Código: {codigo_producto}) no encontrado en el inventario de la sucursal {venta_data.sucursal}"
                    )
                
                # Obtener stock actual
                stock_actual = item_encontrado.get("cantidad", 0) or item_encontrado.get("existencia", 0) or item_encontrado.get("stock", 0)
                
                # Validar que hay suficiente stock
                if stock_actual < cantidad_vendida:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente para '{item_venta.nombre}'. Stock disponible: {stock_actual}, solicitado: {cantidad_vendida}"
                    )
                
                # ⚠️ CRÍTICO: Descontar la cantidad vendida del inventario
                nueva_cantidad = stock_actual - cantidad_vendida
                
                # Actualizar el item en el array
                items[item_index]["cantidad"] = nueva_cantidad
                items[item_index]["existencia"] = nueva_cantidad  # Mantener consistencia
                items[item_index]["stock"] = nueva_cantidad  # Mantener consistencia
                items[item_index]["fecha_actualizacion"] = datetime.now()
                
                # Agregar a items procesados para guardar en la venta
                items_procesados.append({
                    "producto_id": str(item_encontrado.get("_id") or producto_id),
                    "nombre": item_venta.nombre,
                    "codigo": item_venta.codigo,
                    "cantidad": cantidad_vendida,
                    "precio_unitario": item_venta.precio_unitario,
                    "precio_unitario_usd": item_venta.precio_unitario_usd,
                    "subtotal": item_venta.subtotal,
                    "subtotal_usd": item_venta.subtotal_usd,
                    "descuento_aplicado": item_venta.descuento_aplicado or 0
                })
            
            # Actualizar el inventario completo con los items modificados
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
            
            # Recalcular costo total del inventario (opcional pero recomendado)
            costo_total = sum(
                item.get("costo_unitario", 0) * item.get("cantidad", 0) 
                for item in items
            )
            
            await db.inventarios.update_one(
                {"_id": inventario_id},
                {
                    "$set": {
                        "costo": costo_total
                    }
                },
                session=session
            )
            
            # Registrar la venta
            venta_document = {
                "items": items_procesados,
                "metodos_pago": venta_data.metodos_pago,
                "total_bs": venta_data.total_bs,
                "total_usd": venta_data.total_usd,
                "tasa_dia": venta_data.tasa_dia,
                "sucursal": venta_data.sucursal,
                "cajero": venta_data.cajero,
                "cliente": venta_data.cliente,
                "porcentaje_descuento": venta_data.porcentaje_descuento,
                "descuento_por_divisa": venta_data.descuento_por_divisa,
                "notas": venta_data.notas or "",
                "fecha": datetime.now(),
                "estado": "procesada"
            }
            
            resultado = await db.ventas.insert_one(venta_document, session=session)
            
            # Confirmar transacción
            await session.commit_transaction()
            
            return {
                "_id": str(resultado.inserted_id),
                "numero_factura": str(resultado.inserted_id),
                "mensaje": "Venta registrada exitosamente. Inventario actualizado."
            }
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **Validar que existe inventario activo para la sucursal**
2. **Validar que cada producto existe en el inventario**
3. **Validar que hay suficiente stock antes de descontar**
4. **Usar transacciones para asegurar atomicidad** (si falla algo, no se descuenta nada)
5. **Actualizar todos los campos relacionados** (`cantidad`, `existencia`, `stock`)

---

## 🔍 LOGS RECOMENDADOS PARA DEPURACIÓN

```python
print(f"🔍 [VENTA] Procesando venta para sucursal: {venta_data.sucursal}")
print(f"📦 [VENTA] Total de items a procesar: {len(venta_data.items)}")

for item_venta in venta_data.items:
    print(f"   - Producto ID: {item_venta.producto_id}, Código: {item_venta.codigo}, Cantidad: {item_venta.cantidad}")

# Después de encontrar el item en inventario:
print(f"✅ [VENTA] Producto encontrado en inventario. Stock actual: {stock_actual}, Cantidad a descontar: {cantidad_vendida}, Nuevo stock: {nueva_cantidad}")

# Después de actualizar:
print(f"✅ [VENTA] Inventario actualizado exitosamente. Nuevo stock total: {sum(item.get('cantidad', 0) for item in items)}")
```

---

## ⚠️ CASOS ESPECIALES A CONSIDERAR

### 1. Estructura del Inventario

Si tu inventario tiene una estructura diferente, adapta el código:

**Opción A: Items dentro del inventario**
```python
inventario = {
    "_id": "...",
    "sucursal": "01",
    "items": [
        {
            "_id": ObjectId("..."),
            "producto_id": ObjectId("..."),
            "codigo": "TT1135",
            "cantidad": 10,
            "costo_unitario": 22.0
        }
    ]
}
```

**Opción B: Items en colección separada**
```python
# Buscar en colección items_inventario
item_inventario = await db.items_inventario.find_one({
    "inventario_id": inventario_id,
    "producto_id": ObjectId(producto_id)
})
```

### 2. Múltiples Formatos de ID

El frontend puede enviar IDs como string o ObjectId. Asegúrate de manejar ambos:

```python
# Convertir string a ObjectId si es necesario
try:
    producto_oid = ObjectId(producto_id) if isinstance(producto_id, str) else producto_id
except:
    producto_oid = producto_id  # Usar como string si falla la conversión
```

### 3. Campos de Stock Alternativos

Algunos inventarios pueden usar diferentes nombres:
- `cantidad`
- `existencia`
- `stock`
- `stock_disponible`

Actualiza todos para mantener consistencia.

---

## 🧪 TESTING RECOMENDADO

1. **Test con stock suficiente:** Verificar que se descuenta correctamente
2. **Test con stock insuficiente:** Verificar que lanza error y NO descuenta nada
3. **Test con producto no encontrado:** Verificar que lanza error 404
4. **Test con múltiples productos:** Verificar que todos se descuentan correctamente
5. **Test de transacción:** Verificar que si falla algo, no se descuenta nada (atomicidad)

---

## 📝 EJEMPLO COMPLETO DE ENDPOINT

```python
from fastapi import APIRouter, HTTPException, Depends
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: VentaRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Registrar una venta y descontar automáticamente el inventario.
    """
    try:
        # Usar transacción
        async with await db.client.start_session() as session:
            async with session.start_transaction():
                # Obtener inventario activo
                inventario = await db.inventarios.find_one(
                    {"sucursal": venta_data.sucursal, "estado": "activo"},
                    session=session
                )
                
                if not inventario:
                    raise HTTPException(
                        status_code=404,
                        detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
                    )
                
                inventario_id = inventario["_id"]
                items = inventario.get("items", [])
                items_procesados = []
                
                # Procesar cada item
                for item_venta in venta_data.items:
                    # ... código de búsqueda y descuento como se mostró arriba ...
                    pass
                
                # Actualizar inventario
                await db.inventarios.update_one(
                    {"_id": inventario_id},
                    {"$set": {"items": items, "fecha_actualizacion": datetime.now()}},
                    session=session
                )
                
                # Registrar venta
                venta_doc = {
                    "items": items_procesados,
                    "metodos_pago": venta_data.metodos_pago,
                    "total_bs": venta_data.total_bs,
                    "total_usd": venta_data.total_usd,
                    "tasa_dia": venta_data.tasa_dia,
                    "sucursal": venta_data.sucursal,
                    "cajero": venta_data.cajero,
                    "cliente": venta_data.cliente,
                    "fecha": datetime.now(),
                    "estado": "procesada"
                }
                
                resultado = await db.ventas.insert_one(venta_doc, session=session)
                await session.commit_transaction()
                
                return {
                    "_id": str(resultado.inserted_id),
                    "numero_factura": str(resultado.inserted_id),
                    "mensaje": "Venta registrada exitosamente"
                }
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error al procesar venta: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la venta: {str(e)}"
        )
```

---

## 🚨 RECORDATORIOS IMPORTANTES

1. **SIEMPRE usar transacciones** para asegurar que el descuento y el registro de venta sean atómicos
2. **Validar stock ANTES de descontar** para evitar stocks negativos
3. **Actualizar TODOS los campos relacionados** (`cantidad`, `existencia`, `stock`)
4. **Manejar errores correctamente** y hacer rollback de la transacción si algo falla
5. **Loggear las operaciones** para facilitar la depuración

---

## 📞 CONTACTO

Si tienes dudas sobre la estructura de datos o necesitas aclaraciones, revisa los logs del frontend que ahora incluyen información detallada sobre los datos enviados.

**Fecha de creación:** 2025-01-20
**Prioridad:** CRÍTICA
**Estado:** PENDIENTE DE IMPLEMENTACIÓN

