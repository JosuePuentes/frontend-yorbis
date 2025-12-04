# INSTRUCCIONES BACKEND: Endpoint para Obtener Ventas del Día

## Resumen
El frontend necesita un endpoint para obtener todas las ventas del día de una sucursal específica, para calcular el total de caja y el costo del inventario al cerrar la caja desde el punto de venta.

---

## Endpoint: `GET /punto-venta/ventas`

### Query Parameters

- `fecha` (string, formato: YYYY-MM-DD): Fecha para filtrar las ventas
- `sucursal` (string): ID de la sucursal/farmacia

### Ejemplo de Request

```
GET /punto-venta/ventas?fecha=2025-01-15&sucursal=690c40be93d9d9d635fbaf5b
```

### Respuesta Exitosa (200)

```json
[
  {
    "_id": "venta_id_1",
    "numero_factura": "FAC-2025-001234",
    "fecha": "2025-01-15T10:30:00.000Z",
    "sucursal": "690c40be93d9d9d635fbaf5b",
    "cajero": "Juan Pérez",
    "total_usd": 25.50,
    "total_bs": 3060.00,
    "tasa_dia": 120.00,
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
        "costo_unitario": 2.50,
        "descuento_aplicado": 0
      }
    ],
    "metodos_pago": [
      {
        "tipo": "efectivo",
        "monto": 25.50,
        "divisa": "USD"
      }
    ],
    "cliente": "690c40be93d9d9d635fbae83",
    "porcentaje_descuento": 0
  }
]
```

### Campos Importantes en la Respuesta

- **`total_usd`**: Total de la venta en USD (requerido para calcular total de caja)
- **`items`**: Array de productos vendidos
  - **`costo_unitario`**: CRÍTICO - Costo unitario del producto en USD (requerido para calcular costo del inventario)
  - **`cantidad`**: Cantidad vendida
  - Si `costo_unitario` no está disponible, el frontend intentará usar `precio_unitario_original_usd` como fallback

---

## Implementación en Python/FastAPI

```python
from datetime import datetime
from bson import ObjectId
from fastapi import Query, Depends
from motor.motor_asyncio import AsyncIOMotorClient

@router.get("/punto-venta/ventas")
async def obtener_ventas_del_dia(
    fecha: str = Query(..., description="Fecha en formato YYYY-MM-DD"),
    sucursal: str = Query(..., description="ID de la sucursal"),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Obtiene todas las ventas del día para una sucursal específica.
    """
    try:
        # Convertir fecha a datetime para búsqueda
        fecha_inicio = datetime.strptime(fecha, "%Y-%m-%d")
        fecha_fin = datetime(fecha_inicio.year, fecha_inicio.month, fecha_inicio.day, 23, 59, 59)
        
        sucursal_object_id = ObjectId(sucursal)
        
        # Buscar ventas del día para la sucursal
        ventas = await db.ventas.find({
            "sucursal": sucursal_object_id,
            "fecha": {
                "$gte": fecha_inicio,
                "$lte": fecha_fin
            }
        }).to_list(length=None)
        
        # Formatear respuesta
        ventas_formateadas = []
        for venta in ventas:
            venta_dict = {
                "_id": str(venta["_id"]),
                "numero_factura": venta.get("numero_factura", ""),
                "fecha": venta.get("fecha").isoformat() if venta.get("fecha") else None,
                "sucursal": str(venta.get("sucursal", "")),
                "cajero": venta.get("cajero", ""),
                "total_usd": venta.get("total_usd", 0),
                "total_bs": venta.get("total_bs", 0),
                "tasa_dia": venta.get("tasa_dia", 0),
                "items": [],
                "metodos_pago": venta.get("metodos_pago", []),
                "cliente": str(venta.get("cliente", "")) if venta.get("cliente") else "",
                "porcentaje_descuento": venta.get("porcentaje_descuento", 0)
            }
            
            # Procesar items y agregar costo_unitario si no está presente
            items = venta.get("items", [])
            for item in items:
                item_dict = {
                    "producto_id": str(item.get("producto_id", "")),
                    "nombre": item.get("nombre", ""),
                    "codigo": item.get("codigo", ""),
                    "cantidad": item.get("cantidad", 0),
                    "precio_unitario": item.get("precio_unitario", 0),
                    "precio_unitario_usd": item.get("precio_unitario_usd", 0),
                    "precio_unitario_original": item.get("precio_unitario_original", 0),
                    "precio_unitario_original_usd": item.get("precio_unitario_original_usd", 0),
                    "subtotal": item.get("subtotal", 0),
                    "subtotal_usd": item.get("subtotal_usd", 0),
                    "descuento_aplicado": item.get("descuento_aplicado", 0)
                }
                
                # CRÍTICO: Agregar costo_unitario si no está presente
                # El costo debe venir del inventario del producto
                if "costo_unitario" not in item or item.get("costo_unitario") is None:
                    # Buscar el producto en el inventario para obtener su costo
                    inventario = await db.inventarios.find_one({
                        "sucursal": sucursal_object_id
                    })
                    
                    if inventario:
                        producto_encontrado = None
                        for inv_item in inventario.get("items", []):
                            if str(inv_item.get("producto_id")) == str(item.get("producto_id")):
                                producto_encontrado = inv_item
                                break
                        
                        if producto_encontrado:
                            # El costo viene del inventario
                            costo = producto_encontrado.get("costo_unitario", 0)
                            # Si está en Bs, convertir a USD usando la tasa del día
                            if venta.get("tasa_dia", 0) > 0:
                                costo_usd = costo / venta.get("tasa_dia")
                            else:
                                costo_usd = costo
                            item_dict["costo_unitario"] = costo_usd
                        else:
                            # Fallback: usar precio_unitario_original_usd como aproximación
                            item_dict["costo_unitario"] = item.get("precio_unitario_original_usd", 0)
                    else:
                        # Fallback: usar precio_unitario_original_usd como aproximación
                        item_dict["costo_unitario"] = item.get("precio_unitario_original_usd", 0)
                else:
                    item_dict["costo_unitario"] = item.get("costo_unitario", 0)
                
                venta_dict["items"].append(item_dict)
            
            ventas_formateadas.append(venta_dict)
        
        return ventas_formateadas
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener ventas del día: {str(e)}"
        )
```

---

## Checklist de Implementación

- [ ] Endpoint `GET /punto-venta/ventas` implementado
- [ ] Filtrado por fecha (día completo)
- [ ] Filtrado por sucursal
- [ ] Campo `costo_unitario` en cada item (buscarlo en inventario si no está)
- [ ] Formato de respuesta correcto con todos los campos requeridos
- [ ] Manejo de errores (sucursal no encontrada, fecha inválida)
