# Instrucciones Backend - Stock por Sucursal en Búsqueda de Productos

## Problema Identificado

El frontend muestra "No hay información de stock en otras sucursales" cuando el usuario hace clic en el botón "Stock" de un producto. Esto ocurre porque el campo `stock_por_sucursal` no está siendo enviado o está vacío.

## Endpoint Afectado

**GET** `/punto-venta/productos/buscar?q={query}&sucursal={sucursalId}`

## Campo Requerido: `stock_por_sucursal`

El campo `stock_por_sucursal` es **OBLIGATORIO** y debe estar presente en **TODOS** los productos devueltos por la búsqueda.

### Estructura Requerida

Cada producto debe incluir un array `stock_por_sucursal` con el stock del producto en **TODAS las sucursales**:

```json
{
  "id": "producto_id_123",
  "nombre": "Paracetamol 500mg",
  "codigo": "PROD001",
  "precio": 2.50,
  "precio_usd": 2.50,
  "cantidad": 150,
  "stock": 150,
  "stock_por_sucursal": [
    {
      "sucursal_id": "01",
      "sucursal_nombre": "Santa Elena",
      "cantidad": 150,
      "stock": 150
    },
    {
      "sucursal_id": "02",
      "sucursal_nombre": "Centro",
      "cantidad": 75,
      "stock": 75
    },
    {
      "sucursal_id": "03",
      "sucursal_nombre": "Norte",
      "cantidad": 0,
      "stock": 0
    }
  ]
}
```

### Campos del Objeto `stock_por_sucursal`

Cada elemento del array debe tener:

- `sucursal_id` (string, **requerido**): ID de la sucursal (ej: "01", "02", o el ObjectId como string)
- `sucursal_nombre` (string, **requerido**): Nombre completo de la sucursal (ej: "Santa Elena", "Centro", "Norte")
- `cantidad` (number, **requerido**): Stock disponible en esa sucursal
- `stock` (number, opcional): Alias de `cantidad` (puede ser igual a `cantidad`)

## Reglas Importantes

1. **SIEMPRE incluir el array**: Incluso si el producto solo existe en una sucursal, debe incluir `stock_por_sucursal` con al menos esa sucursal
2. **Incluir TODAS las sucursales**: Debe incluir todas las sucursales donde el producto existe, incluso si el stock es 0
3. **Nombre de sucursal obligatorio**: El campo `sucursal_nombre` NO puede estar vacío ni ser solo números. Debe ser el nombre real de la sucursal
4. **No enviar array vacío**: Si no hay stock en ninguna sucursal, igualmente incluir el array con las sucursales que tienen stock 0

## Ejemplo de Implementación (Python/FastAPI)

```python
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str,
    sucursal: str,
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # 1. Buscar productos que coincidan con la búsqueda
        # ... código de búsqueda ...
        
        # 2. Obtener todas las sucursales
        todas_las_sucursales = await db.farmacias.find({}).to_list(length=None)
        
        # 3. Para cada producto encontrado, calcular stock por sucursal
        productos_formateados = []
        for producto in productos_encontrados:
            stock_por_sucursal = []
            
            # Para cada sucursal, buscar el stock del producto
            for sucursal_doc in todas_las_sucursales:
                sucursal_id = str(sucursal_doc["_id"])
                sucursal_nombre = sucursal_doc.get("nombre", "")
                
                # Buscar el inventario de esta sucursal
                inventario = await db.inventarios.find_one({
                    "farmacia": ObjectId(sucursal_id)
                })
                
                if inventario:
                    # Buscar el item del producto en este inventario
                    item = await db.items_inventario.find_one({
                        "inventario_id": inventario["_id"],
                        "codigo": producto["codigo"]  # o el campo que identifique el producto
                    })
                    
                    stock_cantidad = 0
                    if item:
                        # Calcular stock total (suma de lotes o cantidad del item)
                        if item.get("lotes"):
                            stock_cantidad = sum(lote.get("cantidad", 0) for lote in item["lotes"])
                        else:
                            stock_cantidad = item.get("cantidad", 0)
                    
                    # Agregar a stock_por_sucursal (incluso si es 0)
                    stock_por_sucursal.append({
                        "sucursal_id": sucursal_id,
                        "sucursal_nombre": sucursal_nombre,
                        "cantidad": stock_cantidad,
                        "stock": stock_cantidad
                    })
            
            # Formatear producto con stock_por_sucursal
            producto_formateado = {
                "id": str(producto["_id"]),
                "nombre": producto.get("nombre", ""),
                "codigo": producto.get("codigo", ""),
                "precio": producto.get("precio_unitario", 0),
                "precio_usd": producto.get("precio_unitario", 0),
                "cantidad": stock_total_sucursal_actual,  # Stock en la sucursal actual
                "stock": stock_total_sucursal_actual,
                "stock_por_sucursal": stock_por_sucursal  # OBLIGATORIO: Array con todas las sucursales
            }
            
            productos_formateados.append(producto_formateado)
        
        return productos_formateados
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al buscar productos: {str(e)}")
```

## Validaciones que el Backend DEBE Hacer

1. ✅ Verificar que `stock_por_sucursal` sea un array (no null, no undefined)
2. ✅ Verificar que cada elemento tenga `sucursal_id` y `sucursal_nombre`
3. ✅ Verificar que `sucursal_nombre` no esté vacío ni sea solo números
4. ✅ Incluir todas las sucursales, incluso con stock 0
5. ✅ Obtener el nombre real de la sucursal desde la colección `farmacias` o `sucursales`

## Ejemplo de Respuesta Correcta

```json
[
  {
    "id": "producto_123",
    "nombre": "Paracetamol 500mg",
    "codigo": "PROD001",
    "precio": 2.50,
    "precio_usd": 2.50,
    "cantidad": 150,
    "stock": 150,
    "stock_por_sucursal": [
      {
        "sucursal_id": "690c40be93d9d9d635fbaf5b",
        "sucursal_nombre": "Santa Elena",
        "cantidad": 150,
        "stock": 150
      },
      {
        "sucursal_id": "690c40be93d9d9d635fbaf5c",
        "sucursal_nombre": "Centro",
        "cantidad": 75,
        "stock": 75
      },
      {
        "sucursal_id": "690c40be93d9d9d635fbaf5d",
        "sucursal_nombre": "Norte",
        "cantidad": 0,
        "stock": 0
      }
    ]
  }
]
```

## Errores Comunes a Evitar

❌ **NO hacer esto:**
```json
{
  "stock_por_sucursal": null  // ❌ INCORRECTO
}
```

❌ **NO hacer esto:**
```json
{
  "stock_por_sucursal": []  // ❌ INCORRECTO - debe tener al menos una sucursal
}
```

❌ **NO hacer esto:**
```json
{
  "stock_por_sucursal": [
    {
      "sucursal_id": "01",
      "sucursal_nombre": "01",  // ❌ INCORRECTO - debe ser el nombre real
      "cantidad": 150
    }
  ]
}
```

✅ **Hacer esto:**
```json
{
  "stock_por_sucursal": [
    {
      "sucursal_id": "01",
      "sucursal_nombre": "Santa Elena",  // ✅ CORRECTO
      "cantidad": 150,
      "stock": 150
    }
  ]
}
```

## Notas Finales

- El frontend **requiere** este campo para mostrar el stock por sucursal
- Si el campo no está presente o está vacío, el usuario verá "No hay información de stock en otras sucursales"
- El nombre de la sucursal debe obtenerse desde la base de datos, no hardcodearse
- Incluir todas las sucursales ayuda al usuario a ver dónde puede encontrar el producto



