# Instrucciones Backend: Actualización de Inventario al Crear Compra

## Resumen
Cuando se crea una compra, el backend debe **actualizar automáticamente el inventario** con todos los datos de la compra:
- **Cantidad**: Sumar a la existencia actual
- **Costo**: Actualizar al nuevo costo (costo_ajustado)
- **Precio de Venta**: Actualizar al nuevo precio (precio_unitario)
- **Utilidad**: Actualizar la utilidad del producto
- **Marca**: Actualizar la marca si viene en la compra
- **Fecha de Vencimiento y Lote**: Agregar nuevo lote si se proporciona

## Endpoint: `POST /compras`

### Estructura de la Request (Frontend envía)

```json
{
  "proveedor_id": "proveedor_id",
  "sucursal_id": "sucursal_id",
  "farmacia": "sucursal_id",
  "divisa": "USD",
  "tasa": 372.0,
  "pagar_en_dolar_negro": true,
  "dolar_bcv": 240.0,
  "dolar_negro": 372.0,
  "total": 1550.0,
  "items": [
    {
      "codigo": "PROD001",
      "nombre": "Aspirina 500mg",
      "descripcion": "Aspirina 500mg",
      "marca": "Bayer",
      "costo_unitario": 1.0,
      "costo": 1.0,
      "costo_ajustado": 1.55,
      "precio_unitario": 2.05,
      "precio_venta": 2.05,
      "lleva_iva": false,
      "iva": 0.0,
      "utilidad": 32.26,
      "cantidad": 100,
      "total": 205.0,
      "fecha_vencimiento": "2025-12-31",
      "lote": "LOTE001",
      "es_nuevo": false,
      "producto_id": "producto_id_existente",
      "lotes_existentes": []
    }
  ]
}
```

### Campos Importantes de cada Item

- **`codigo`**: Código del producto (para búsqueda)
- **`nombre`** o **`descripcion`**: Nombre/descripción del producto
- **`marca`**: Marca del producto (DEBE ACTUALIZARSE si viene)
- **`costo_unitario`** o **`costo`**: Costo original
- **`costo_ajustado`**: Costo con ajuste de dólar negro (ESTE ES EL COSTO QUE DEBE GUARDARSE)
- **`precio_unitario`** o **`precio_venta`**: Precio de venta (DEBE ACTUALIZARSE)
- **`utilidad`**: Porcentaje de utilidad (DEBE ACTUALIZARSE)
- **`cantidad`**: Cantidad comprada (DEBE SUMARSE a la existencia)
- **`fecha_vencimiento`**: Fecha de vencimiento del nuevo lote (opcional)
- **`lote`**: Número de lote (opcional)
- **`es_nuevo`**: `true` si es producto nuevo, `false` si existe
- **`producto_id`**: ID del producto en inventario (si existe)

## Lógica de Actualización del Inventario

### 1. Para Productos Existentes (`es_nuevo: false`)

**PASO 1: Buscar el producto en el inventario**
```python
# Buscar por producto_id primero, si no existe, buscar por código y sucursal_id
producto = await db.items_inventario.find_one({
    "_id": ObjectId(item.producto_id)
})

# Si no se encuentra, buscar por código y sucursal_id
if not producto:
    producto = await db.items_inventario.find_one({
        "codigo": item.codigo,
        "inventario_id": inventario_id  # O usar sucursal_id según tu estructura
    })
```

**PASO 2: Actualizar TODOS los campos del producto**
```python
update_data = {
    # ACTUALIZAR COSTO: Usar costo_ajustado (ya incluye ajuste de dólar negro)
    "costo_unitario": item.costo_ajustado,
    
    # ACTUALIZAR PRECIO DE VENTA
    "precio_unitario": item.precio_unitario or item.precio_venta,
    
    # ACTUALIZAR UTILIDAD: Guardar el porcentaje de utilidad
    "utilidad": item.utilidad,  # Porcentaje de utilidad
    
    # SUMAR CANTIDAD: Sumar a la existencia actual
    "cantidad": producto.get("cantidad", 0) + item.cantidad,
    
    # ACTUALIZAR MARCA: Si viene en la compra, actualizarla
    "marca": item.marca if item.marca else producto.get("marca"),
    
    # ACTUALIZAR DESCRIPCIÓN: Si viene diferente, actualizarla
    "descripcion": item.descripcion or item.nombre or producto.get("descripcion"),
    
    "fecha_actualizacion": datetime.now()
}
```

**PASO 3: Manejar Lotes**
```python
# Si viene fecha_vencimiento y lote, agregar nuevo lote
if item.lote and item.fecha_vencimiento:
    lotes = producto.get("lotes", [])
    
    # Verificar si el lote ya existe
    lote_existente = next(
        (l for l in lotes if l.get("lote") == item.lote), 
        None
    )
    
    if lote_existente:
        # Si el lote existe, SUMAR la cantidad al lote existente
        lote_existente["cantidad"] = lote_existente.get("cantidad", 0) + item.cantidad
        # Actualizar fecha de vencimiento si viene diferente
        if item.fecha_vencimiento:
            lote_existente["fecha_vencimiento"] = item.fecha_vencimiento
    else:
        # Si el lote NO existe, agregar nuevo lote
        lotes.append({
            "lote": item.lote,
            "fecha_vencimiento": item.fecha_vencimiento,
            "cantidad": item.cantidad
        })
    
    update_data["lotes"] = lotes
```

**PASO 4: Actualizar en base de datos**
```python
await db.items_inventario.update_one(
    {"_id": ObjectId(item.producto_id)},
    {"$set": update_data}
)
```

### 2. Para Productos Nuevos (`es_nuevo: true`)

**Crear nuevo producto en el inventario:**
```python
nuevo_producto = {
    "codigo": item.codigo,
    "descripcion": item.descripcion or item.nombre,
    "marca": item.marca or "",
    "costo_unitario": item.costo_ajustado,  # Usar costo_ajustado
    "precio_unitario": item.precio_unitario or item.precio_venta,
    "utilidad": item.utilidad,  # Porcentaje de utilidad
    "cantidad": item.cantidad,
    "lotes": [],
    "inventario_id": inventario_id,  # O usar sucursal_id según tu estructura
    "farmacia": compra.sucursal_id,  # Usar sucursal_id de la compra
    "fecha_creacion": datetime.now(),
    "fecha_actualizacion": datetime.now()
}

# Agregar lote si se proporciona
if item.lote and item.fecha_vencimiento:
    nuevo_producto["lotes"].append({
        "lote": item.lote,
        "fecha_vencimiento": item.fecha_vencimiento,
        "cantidad": item.cantidad
    })

# Insertar producto
result = await db.items_inventario.insert_one(nuevo_producto)
```

## Ejemplo Completo de Implementación

```python
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from datetime import datetime

router = APIRouter()

@router.post("/compras")
async def crear_compra(
    compra: CompraCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para crear compras")
    
    # Verificar que el proveedor existe
    proveedor = await db.proveedores.find_one({"_id": ObjectId(compra.proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Obtener inventario_id basado en sucursal_id de la compra
    # Ajustar según tu estructura (puede ser que necesites buscar el inventario por sucursal)
    inventario = await db.inventarios.find_one({"farmacia": compra.sucursal_id})
    if not inventario:
        raise HTTPException(status_code=404, detail=f"Inventario no encontrado para sucursal {compra.sucursal_id}")
    
    inventario_id = inventario["_id"]
    
    # Calcular totales
    subtotal = sum(item.costo_ajustado * item.cantidad for item in compra.items)
    total_iva = sum((item.iva or 0) * item.cantidad for item in compra.items if item.lleva_iva)
    total = subtotal + total_iva
    
    # Procesar cada item y actualizar inventario
    items_procesados = []
    
    for item in compra.items:
        if item.es_nuevo:
            # ===== CREAR PRODUCTO NUEVO =====
            nuevo_producto = {
                "codigo": item.codigo,
                "descripcion": item.descripcion or item.nombre,
                "marca": item.marca or "",
                "costo_unitario": item.costo_ajustado,  # IMPORTANTE: Usar costo_ajustado
                "precio_unitario": item.precio_unitario or item.precio_venta,
                "utilidad": item.utilidad,  # Porcentaje de utilidad
                "cantidad": item.cantidad,
                "lotes": [],
                "inventario_id": inventario_id,
                "farmacia": compra.sucursal_id,
                "fecha_creacion": datetime.now(),
                "fecha_actualizacion": datetime.now()
            }
            
            # Agregar lote si se proporciona
            if item.lote and item.fecha_vencimiento:
                nuevo_producto["lotes"].append({
                    "lote": item.lote,
                    "fecha_vencimiento": item.fecha_vencimiento,
                    "cantidad": item.cantidad
                })
            
            # Insertar producto
            result = await db.items_inventario.insert_one(nuevo_producto)
            producto_id = result.inserted_id
            
        else:
            # ===== ACTUALIZAR PRODUCTO EXISTENTE =====
            # Buscar producto
            producto = await db.items_inventario.find_one({
                "_id": ObjectId(item.producto_id)
            })
            
            if not producto:
                # Si no se encuentra por ID, buscar por código
                producto = await db.items_inventario.find_one({
                    "codigo": item.codigo,
                    "inventario_id": inventario_id
                })
            
            if not producto:
                raise HTTPException(
                    status_code=404, 
                    detail=f"Producto {item.codigo} no encontrado en inventario"
                )
            
            producto_id = producto["_id"]
            
            # Preparar datos de actualización
            update_data = {
                # ACTUALIZAR COSTO: Usar costo_ajustado (ya incluye ajuste de dólar negro)
                "costo_unitario": item.costo_ajustado,
                
                # ACTUALIZAR PRECIO DE VENTA
                "precio_unitario": item.precio_unitario or item.precio_venta,
                
                # ACTUALIZAR UTILIDAD
                "utilidad": item.utilidad,
                
                # SUMAR CANTIDAD: Sumar a la existencia actual
                "cantidad": producto.get("cantidad", 0) + item.cantidad,
                
                # ACTUALIZAR MARCA: Si viene en la compra, actualizarla
                "marca": item.marca if item.marca else producto.get("marca", ""),
                
                # ACTUALIZAR DESCRIPCIÓN si viene diferente
                "descripcion": item.descripcion or item.nombre or producto.get("descripcion", ""),
                
                "fecha_actualizacion": datetime.now()
            }
            
            # Manejar lotes
            if item.lote and item.fecha_vencimiento:
                lotes = producto.get("lotes", [])
                
                # Verificar si el lote ya existe
                lote_existente = next(
                    (l for l in lotes if l.get("lote") == item.lote), 
                    None
                )
                
                if lote_existente:
                    # Si el lote existe, SUMAR la cantidad
                    lote_existente["cantidad"] = lote_existente.get("cantidad", 0) + item.cantidad
                    # Actualizar fecha de vencimiento si viene diferente
                    if item.fecha_vencimiento:
                        lote_existente["fecha_vencimiento"] = item.fecha_vencimiento
                else:
                    # Si el lote NO existe, agregar nuevo lote
                    lotes.append({
                        "lote": item.lote,
                        "fecha_vencimiento": item.fecha_vencimiento,
                        "cantidad": item.cantidad
                    })
                
                update_data["lotes"] = lotes
            
            # Actualizar producto en base de datos
            await db.items_inventario.update_one(
                {"_id": ObjectId(item.producto_id)},
                {"$set": update_data}
            )
        
        # Agregar a items procesados
        items_procesados.append({
            "producto_id": str(producto_id),
            "codigo": item.codigo,
            "nombre": item.descripcion or item.nombre,
            "marca": item.marca,
            "costo_unitario": item.costo_ajustado,
            "precio_unitario": item.precio_unitario or item.precio_venta,
            "utilidad": item.utilidad,
            "cantidad": item.cantidad,
            "lote": item.lote,
            "fecha_vencimiento": item.fecha_vencimiento
        })
    
    # Recalcular costo total del inventario
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
    
    # Guardar compra
    compra_doc = {
        "proveedor_id": ObjectId(compra.proveedor_id),
        "sucursal_id": compra.sucursal_id,
        "fecha": datetime.now(),
        "pagar_en_dolar_negro": compra.pagar_en_dolar_negro,
        "dolar_bcv": compra.dolar_bcv,
        "dolar_negro": compra.dolar_negro,
        "subtotal": subtotal,
        "total_iva": total_iva,
        "total": total,
        "items": items_procesados,
        "usuario_id": current_user.get("_id"),
        "usuario_correo": current_user.get("correo"),
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    result = await db.compras.insert_one(compra_doc)
    compra_doc["_id"] = result.inserted_id
    
    return {
        "compra": compra_doc,
        "subtotal": subtotal,
        "total_iva": total_iva,
        "total": total
    }
```

## Puntos Críticos

1. **Costo a Guardar**: Siempre usar `costo_ajustado` (ya incluye ajuste de dólar negro si aplica)
2. **Cantidad**: SUMAR a la existencia actual, no reemplazar
3. **Marca**: Actualizar si viene en la compra
4. **Utilidad**: Guardar el porcentaje de utilidad
5. **Lotes**: Si el lote existe, SUMAR cantidad; si no existe, crear nuevo lote
6. **Sucursal**: Usar `sucursal_id` de la compra, no del usuario
7. **Inventario**: Buscar el inventario correcto basado en `sucursal_id`

## Validaciones Importantes

- Verificar que el producto existe antes de actualizar (si `es_nuevo: false`)
- Verificar que el inventario existe para la sucursal
- Validar que `costo_ajustado` y `precio_unitario` sean números válidos
- Validar que `cantidad` sea mayor a 0

## Ejemplo de Actualización

**Antes de la compra:**
- Producto: "Bomba"
- Cantidad: 10
- Costo: $20
- Precio: $30
- Marca: "Genérica"

**Compra realizada:**
- Cantidad: 10
- Costo: $30 (costo_ajustado)
- Precio: $45
- Utilidad: 50%
- Marca: "Bayer"

**Después de la compra:**
- Producto: "Bomba"
- Cantidad: 20 (10 + 10)
- Costo: $30 (actualizado)
- Precio: $45 (actualizado)
- Utilidad: 50% (actualizado)
- Marca: "Bayer" (actualizado)
- Lote: Nuevo lote agregado (si se proporcionó)

