# INSTRUCCIONES BACKEND: Descuento de Stock y Registro de Ventas

## Resumen
Cuando se confirma una venta desde el punto de venta, el backend debe:
1. **Descontar la cantidad vendida del inventario** de cada producto
2. **Registrar la venta** con todos los métodos de pago
3. **Manejar lotes** si el producto tiene lotes (descontar de los lotes más antiguos primero - FIFO)
4. **Actualizar el stock** en la sucursal correspondiente

---

## Endpoint: `POST /punto-venta/ventas`

### Estructura de la Request

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
    },
    {
      "tipo": "tarjeta",
      "monto": 5.00,
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

### Campos Importantes

- **`items`**: Array de productos vendidos. Cada item tiene:
  - `producto_id`: ID del producto en MongoDB
  - `codigo`: Código del producto (para búsqueda alternativa)
  - `cantidad`: Cantidad vendida (DEBE DESCONTARSE DEL INVENTARIO)
  - `precio_unitario_original`: Precio original sin descuento
  - `precio_unitario_original_usd`: Precio original en USD sin descuento
  - `descuento_aplicado`: Porcentaje de descuento aplicado (0 si no hay)

- **`metodos_pago`**: Array de métodos de pago (SOLO POSITIVOS - el vuelto no se envía)
- **`sucursal`**: ID de la sucursal donde se realizó la venta
- **`cliente`**: ID del cliente (opcional, puede ser string vacío)
- **`porcentaje_descuento`**: Porcentaje de descuento aplicado a nivel de venta

---

## Lógica de Descuento de Stock

### Paso 1: Buscar el Item en el Inventario

Para cada item en la venta:

```python
# Opción 1: Buscar por producto_id
item = await db.items_inventario.find_one({
    "inventario_id": ObjectId(inventario_id),
    "producto_id": ObjectId(item["producto_id"])
})

# Opción 2: Si no se encuentra, buscar por código
if not item:
    item = await db.items_inventario.find_one({
        "inventario_id": ObjectId(inventario_id),
        "codigo": item["codigo"]
    })
```

### Paso 2: Verificar Stock Disponible

```python
cantidad_disponible = item.get("cantidad", 0)

# Si hay lotes, calcular stock total de lotes
if item.get("lotes"):
    cantidad_disponible = sum(lote.get("cantidad", 0) for lote in item["lotes"])

if cantidad_disponible < item["cantidad"]:
    raise HTTPException(
        status_code=400,
        detail=f"Stock insuficiente para {item['nombre']}. Disponible: {cantidad_disponible}, Solicitado: {item['cantidad']}"
    )
```

### Paso 3: Descontar Stock (Con Lotes - FIFO)

Si el producto tiene lotes, descontar de los lotes más antiguos primero:

```python
cantidad_a_descontar = item["cantidad"]
lotes = item.get("lotes", [])

# Ordenar lotes por fecha de vencimiento (más antiguos primero)
lotes_ordenados = sorted(lotes, key=lambda x: x.get("fecha_vencimiento", ""))

# Descontar de cada lote hasta completar la cantidad
for lote in lotes_ordenados:
    if cantidad_a_descontar <= 0:
        break
    
    cantidad_lote = lote.get("cantidad", 0)
    if cantidad_lote > 0:
        cantidad_a_restar = min(cantidad_a_descontar, cantidad_lote)
        lote["cantidad"] = cantidad_lote - cantidad_a_restar
        cantidad_a_descontar -= cantidad_a_restar

# Eliminar lotes con cantidad 0
item["lotes"] = [lote for lote in lotes if lote.get("cantidad", 0) > 0]

# Actualizar cantidad total del item
item["cantidad"] = sum(lote.get("cantidad", 0) for lote in item["lotes"])
```

### Paso 4: Descontar Stock (Sin Lotes)

Si el producto NO tiene lotes:

```python
cantidad_actual = item.get("cantidad", 0)
cantidad_vendida = item["cantidad"]

item["cantidad"] = cantidad_actual - cantidad_vendida

if item["cantidad"] < 0:
    raise HTTPException(
        status_code=400,
        detail=f"Error: Stock negativo para {item['nombre']}"
    )
```

### Paso 5: Guardar Item Actualizado

```python
await db.items_inventario.update_one(
    {"_id": item["_id"]},
    {"$set": {
        "cantidad": item["cantidad"],
        "lotes": item.get("lotes", [])
    }}
)
```

### Paso 6: Actualizar Total del Inventario

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

## Ejemplo Completo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

class ItemVenta(BaseModel):
    producto_id: str
    nombre: str
    codigo: str
    cantidad: int
    precio_unitario: float
    precio_unitario_usd: float
    precio_unitario_original: float
    precio_unitario_original_usd: float
    subtotal: float
    subtotal_usd: float
    descuento_aplicado: float

class MetodoPago(BaseModel):
    tipo: str
    monto: float
    divisa: str

class VentaData(BaseModel):
    items: List[ItemVenta]
    metodos_pago: List[MetodoPago]
    total_bs: float
    total_usd: float
    tasa_dia: float
    sucursal: str
    cajero: str
    cliente: str = ""
    porcentaje_descuento: float = 0.0
    notas: str = ""

@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: VentaData,
    current_user: User = Depends(get_current_user)
):
    try:
        # 1. Obtener inventario de la sucursal
        inventario = await db.inventarios.find_one({
            "sucursal": ObjectId(venta_data.sucursal)
        })
        
        if not inventario:
            raise HTTPException(
                status_code=404,
                detail="Inventario no encontrado para esta sucursal"
            )
        
        inventario_id = inventario["_id"]
        
        # 2. Procesar cada item y descontar stock
        items_procesados = []
        
        for item_venta in venta_data.items:
            # Buscar item en inventario
            item = await db.items_inventario.find_one({
                "inventario_id": inventario_id,
                "$or": [
                    {"producto_id": ObjectId(item_venta.producto_id)},
                    {"codigo": item_venta.codigo}
                ]
            })
            
            if not item:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {item_venta.nombre} no encontrado en inventario"
                )
            
            # Verificar y descontar stock
            cantidad_a_descontar = item_venta.cantidad
            cantidad_disponible = item.get("cantidad", 0)
            
            # Si hay lotes, usar lógica FIFO
            if item.get("lotes") and len(item["lotes"]) > 0:
                lotes = item["lotes"]
                lotes_ordenados = sorted(
                    lotes,
                    key=lambda x: x.get("fecha_vencimiento", "")
                )
                
                cantidad_restante = cantidad_a_descontar
                
                for lote in lotes_ordenados:
                    if cantidad_restante <= 0:
                        break
                    
                    cantidad_lote = lote.get("cantidad", 0)
                    if cantidad_lote > 0:
                        cantidad_a_restar = min(cantidad_restante, cantidad_lote)
                        lote["cantidad"] = cantidad_lote - cantidad_a_restar
                        cantidad_restante -= cantidad_a_restar
                
                # Eliminar lotes vacíos
                item["lotes"] = [lote for lote in lotes_ordenados if lote.get("cantidad", 0) > 0]
                
                # Actualizar cantidad total
                item["cantidad"] = sum(lote.get("cantidad", 0) for lote in item["lotes"])
                
                if cantidad_restante > 0:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente en lotes para {item_venta.nombre}"
                    )
            else:
                # Sin lotes, descontar directamente
                if cantidad_disponible < cantidad_a_descontar:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente para {item_venta.nombre}. Disponible: {cantidad_disponible}, Solicitado: {cantidad_a_descontar}"
                    )
                
                item["cantidad"] = cantidad_disponible - cantidad_a_descontar
            
            # Guardar item actualizado
            await db.items_inventario.update_one(
                {"_id": item["_id"]},
                {"$set": {
                    "cantidad": item["cantidad"],
                    "lotes": item.get("lotes", [])
                }}
            )
            
            # Agregar a items procesados
            items_procesados.append({
                "producto_id": str(item["_id"]),
                "nombre": item_venta.nombre,
                "codigo": item_venta.codigo,
                "cantidad": item_venta.cantidad,
                "precio_unitario": item_venta.precio_unitario,
                "precio_unitario_usd": item_venta.precio_unitario_usd,
                "precio_unitario_original": item_venta.precio_unitario_original,
                "precio_unitario_original_usd": item_venta.precio_unitario_original_usd,
                "subtotal": item_venta.subtotal,
                "subtotal_usd": item_venta.subtotal_usd,
                "descuento_aplicado": item_venta.descuento_aplicado
            })
        
        # 3. Recalcular costo total del inventario
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
        
        # 4. Crear registro de venta
        venta_doc = {
            "items": items_procesados,
            "metodos_pago": [mp.dict() for mp in venta_data.metodos_pago],
            "total_bs": venta_data.total_bs,
            "total_usd": venta_data.total_usd,
            "tasa_dia": venta_data.tasa_dia,
            "sucursal": ObjectId(venta_data.sucursal),
            "cajero": venta_data.cajero,
            "cliente": ObjectId(venta_data.cliente) if venta_data.cliente else None,
            "porcentaje_descuento": venta_data.porcentaje_descuento,
            "notas": venta_data.notas,
            "fecha": datetime.now(),
            "numero_factura": generar_numero_factura(),  # Tu función para generar número
            "usuario": current_user.correo
        }
        
        resultado = await db.ventas.insert_one(venta_doc)
        
        return {
            "_id": str(resultado.inserted_id),
            "numero_factura": venta_doc["numero_factura"],
            "mensaje": "Venta registrada exitosamente"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la venta: {str(e)}"
        )
```

---

## Checklist de Implementación

- [ ] Endpoint `POST /punto-venta/ventas` implementado
- [ ] Validación de stock antes de descontar
- [ ] Lógica FIFO para descontar de lotes (más antiguos primero)
- [ ] Descuento de stock cuando NO hay lotes
- [ ] Actualización de `cantidad` en el item después de descontar
- [ ] Eliminación de lotes con cantidad 0
- [ ] Recalculo de `costo` total del inventario
- [ ] Registro de venta con todos los campos
- [ ] Manejo de errores (stock insuficiente, producto no encontrado)
- [ ] Generación de número de factura
- [ ] Los métodos de pago negativos (vuelto) NO se envían desde el frontend

---

## Notas Importantes

1. **Vuelto**: El frontend NO envía métodos de pago negativos. Solo envía los métodos de pago positivos (pagos recibidos).

2. **Validación de Stock**: Siempre validar que hay suficiente stock ANTES de descontar.

3. **Lotes FIFO**: Si hay lotes, descontar primero de los lotes con fecha de vencimiento más antigua.

4. **Transacciones**: Considera usar transacciones de MongoDB para asegurar que si falla el registro de la venta, no se descuente el stock.

5. **Actualización de Inventario**: Después de descontar stock, recalcular el `costo` total del inventario.

6. **Cliente Opcional**: El campo `cliente` puede ser string vacío si no hay cliente seleccionado.

---

## Ejemplo de Respuesta Exitosa

```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "numero_factura": "FAC-2025-001234",
  "mensaje": "Venta registrada exitosamente"
}
```

---

## Manejo de Errores

### Stock Insuficiente
```json
{
  "detail": "Stock insuficiente para SPRAY DIESEL TOOLS AZUL CIELO. Disponible: 5, Solicitado: 10"
}
```

### Producto No Encontrado
```json
{
  "detail": "Producto SPRAY DIESEL TOOLS AZUL CIELO no encontrado en inventario"
}
```

### Inventario No Encontrado
```json
{
  "detail": "Inventario no encontrado para esta sucursal"
}
```





