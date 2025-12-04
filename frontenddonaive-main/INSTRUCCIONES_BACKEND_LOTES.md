# Instrucciones para el Backend - Lotes y Fechas de Vencimiento

## Nuevo Campo: Lotes

El frontend ahora envía y espera recibir un array de lotes con fechas de vencimiento para cada item del inventario.

## Estructura de Lotes

Cada lote tiene la siguiente estructura:

```typescript
interface Lote {
  lote: string;              // Número o código del lote
  fecha_vencimiento: string;  // Fecha en formato YYYY-MM-DD
  cantidad?: number;         // Cantidad opcional del lote
}
```

## Request Body del PATCH

El frontend ahora envía en el body del PATCH:

```json
{
  "codigo": "string",
  "descripcion": "string",
  "marca": "string",
  "costo_unitario": number,
  "cantidad": number,
  "precio_unitario": number,
  "porcentaje_ganancia": number,
  "lotes": [
    {
      "lote": "L001",
      "fecha_vencimiento": "2025-12-31",
      "cantidad": 10
    },
    {
      "lote": "L002",
      "fecha_vencimiento": "2026-01-15",
      "cantidad": 5
    }
  ]
}
```

## Modelo de Request (Pydantic)

```python
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime

class Lote(BaseModel):
    lote: str
    fecha_vencimiento: str  # Formato: YYYY-MM-DD
    cantidad: Optional[int] = None

class ModificarItemRequest(BaseModel):
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None
    porcentaje_ganancia: Optional[float] = None
    lotes: Optional[List[Lote]] = None  # ← NUEVO CAMPO
```

## Modelo de Base de Datos

El modelo de la base de datos debe incluir el campo `lotes`:

```python
from typing import List, Optional
from beanie import Document
from pydantic import BaseModel, Field
from datetime import datetime

class LoteDB(BaseModel):
    lote: str
    fecha_vencimiento: str  # Almacenar como string YYYY-MM-DD o como Date
    cantidad: Optional[int] = None

class Producto(Document):  # o ItemInventario, como lo llames
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None
    cantidad: Optional[int] = None
    precio_unitario: Optional[float] = None
    utilidad_contable: Optional[float] = None
    porcentaje_ganancia: Optional[float] = None
    lotes: Optional[List[LoteDB]] = []  # ← NUEVO CAMPO: Array de lotes
    inventario_id: Optional[PyObjectId] = None
    fecha_actualizacion: Optional[datetime] = None
    # ... otros campos
```

## Código de Actualización en el Endpoint PATCH

```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,
    current_user: User = Depends(get_current_user)
):
    # ... validaciones y búsqueda del item ...
    
    # Actualizar campos básicos
    if item_data.codigo is not None:
        item.codigo = item_data.codigo
    if item_data.descripcion is not None:
        item.descripcion = item_data.descripcion
    if item_data.marca is not None:
        item.marca = item_data.marca
    if item_data.costo_unitario is not None:
        item.costo_unitario = item_data.costo_unitario
    if item_data.cantidad is not None:
        item.cantidad = item_data.cantidad
    if item_data.precio_unitario is not None:
        item.precio_unitario = item_data.precio_unitario
    
    # ← NUEVO: Actualizar lotes
    if item_data.lotes is not None:
        # Filtrar lotes vacíos (sin lote o sin fecha)
        lotes_validos = [
            lote for lote in item_data.lotes 
            if lote.lote and lote.lote.strip() != "" and lote.fecha_vencimiento
        ]
        item.lotes = lotes_validos
    
    # Calcular utilidad contable
    if item.costo_unitario and item.precio_unitario:
        item.utilidad_contable = item.precio_unitario - item.costo_unitario
        if item.costo_unitario > 0:
            item.porcentaje_ganancia = ((item.precio_unitario - item.costo_unitario) / item.costo_unitario) * 100
    elif item_data.porcentaje_ganancia is not None:
        item.porcentaje_ganancia = item_data.porcentaje_ganancia
    
    item.fecha_actualizacion = datetime.utcnow()
    
    # GUARDAR EN LA BASE DE DATOS
    await item.save()  # ← CRÍTICO: Guardar los cambios
    
    # ... resto del código ...
    
    # Devolver el item actualizado con lotes
    return {
        "message": "Item actualizado exitosamente",
        "item": {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo_unitario": item.costo_unitario,
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "utilidad_contable": item.utilidad_contable,
            "lotes": item.lotes or [],  # ← Incluir lotes en la respuesta
            "inventario_id": str(item.inventario_id),
            "fecha_actualizacion": item.fecha_actualizacion.isoformat()
        }
    }
```

## Endpoint GET: Devolver Lotes

El endpoint `GET /inventarios/{inventario_id}/items` debe devolver los lotes:

```python
@router.get("/inventarios/{inventario_id}/items")
async def obtener_items_inventario(
    inventario_id: str,
    current_user: User = Depends(get_current_user)
):
    items = await get_items_by_inventario(inventario_id)
    
    return [
        {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo_unitario": item.costo_unitario,
            "cantidad": item.cantidad,
            "precio_unitario": item.precio_unitario,
            "utilidad_contable": item.utilidad_contable,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "lotes": item.lotes or [],  # ← Incluir lotes
            "inventario_id": str(item.inventario_id)
        }
        for item in items
    ]
```

## Validaciones Recomendadas

1. **Validar formato de fecha**: Asegurarse de que `fecha_vencimiento` esté en formato `YYYY-MM-DD`
2. **Validar lotes vacíos**: Filtrar lotes que no tengan `lote` o `fecha_vencimiento`
3. **Validar fechas futuras**: Opcionalmente, validar que las fechas de vencimiento sean futuras (o permitir fechas pasadas para productos vencidos)

## Ejemplo de Validación

```python
from datetime import datetime

def validar_lotes(lotes: List[Lote]) -> List[Lote]:
    """Valida y filtra lotes"""
    lotes_validos = []
    for lote in lotes:
        # Validar que tenga lote y fecha
        if not lote.lote or not lote.lote.strip():
            continue
        if not lote.fecha_vencimiento:
            continue
        
        # Validar formato de fecha
        try:
            datetime.strptime(lote.fecha_vencimiento, "%Y-%m-%d")
        except ValueError:
            continue  # Fecha inválida, omitir
        
        lotes_validos.append(lote)
    
    return lotes_validos
```

## Checklist de Verificación

- [ ] El modelo `ModificarItemRequest` incluye `lotes: Optional[List[Lote]]`
- [ ] El modelo de BD incluye `lotes: Optional[List[LoteDB]]`
- [ ] El código del PATCH actualiza `item.lotes = item_data.lotes`
- [ ] Se guarda en BD con `await item.save()` después de actualizar lotes
- [ ] El endpoint GET devuelve `lotes` en la respuesta
- [ ] Se validan y filtran lotes vacíos o inválidos

## Nota Importante

- Los lotes son un **array**, por lo que un item puede tener múltiples lotes
- Cada lote debe tener al menos `lote` y `fecha_vencimiento`
- La `cantidad` en el lote es opcional (puede ser útil para rastrear cuántas unidades hay por lote)
- Si un item no tiene lotes, el array debe ser `[]` (vacío), no `null`


