# Instrucciones para el Backend - Porcentaje de Descuento por Inventario

## Descripción

El frontend ahora permite agregar un porcentaje de descuento a cada inventario. Este descuento se aplica automáticamente al precio de todos los productos del inventario.

## Endpoint Necesario

### PATCH /inventarios/{inventario_id}

**Descripción:** Actualiza el porcentaje de descuento de un inventario.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin` o `modificar_inventario`

**Path Parameters:**
- `inventario_id` (string, requerido): ID del inventario a actualizar

**Request Body:**
```json
{
  "porcentaje_descuento": 10.5
}
```

**Campos del Request:**
- `porcentaje_descuento` (number, opcional): Porcentaje de descuento a aplicar (0-100). Si no se envía o es null, se elimina el descuento.

**Validaciones:**
- `porcentaje_descuento` debe estar entre 0 y 100 (inclusive)
- El inventario debe existir
- El usuario debe tener permisos para modificar inventarios

**Response (200 OK):**
```json
{
  "message": "Inventario actualizado exitosamente",
  "inventario": {
    "_id": "inventario_id",
    "fecha": "2025-01-15T10:30:00Z",
    "farmacia": "01",
    "costo": 15000.00,
    "usuarioCorreo": "usuario@example.com",
    "porcentaje_descuento": 10.5,
    "fecha_actualizacion": "2025-01-15T11:00:00Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "detail": "Inventario no encontrado"
}
```

**Response (400 Bad Request):**
```json
{
  "detail": "El porcentaje de descuento debe estar entre 0 y 100"
}
```

## Estructura de Base de Datos

### Colección/Tabla: inventarios

Debe agregarse el campo `porcentaje_descuento` al modelo de inventario:

```javascript
{
  _id: ObjectId,
  fecha: Date,
  farmacia: String,
  costo: Number,
  usuarioCorreo: String,
  porcentaje_descuento: Number,  // ← NUEVO CAMPO (opcional, 0-100)
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

## Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Optional

router = APIRouter()

class ActualizarInventarioRequest(BaseModel):
    porcentaje_descuento: Optional[float] = Field(None, ge=0, le=100)

@router.patch("/inventarios/{inventario_id}")
async def actualizar_inventario(
    inventario_id: str,
    inventario_data: ActualizarInventarioRequest,
    current_user: User = Depends(get_current_user)
):
    # Validar permisos
    if not has_permission(current_user, "acceso_admin") and not has_permission(current_user, "modificar_inventario"):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar inventarios")
    
    # Buscar el inventario
    inventario = await get_inventario(inventario_id)
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    # Validar porcentaje de descuento
    if inventario_data.porcentaje_descuento is not None:
        if inventario_data.porcentaje_descuento < 0 or inventario_data.porcentaje_descuento > 100:
            raise HTTPException(
                status_code=400, 
                detail="El porcentaje de descuento debe estar entre 0 y 100"
            )
    
    # Actualizar el inventario
    update_data = {}
    if inventario_data.porcentaje_descuento is not None:
        update_data["porcentaje_descuento"] = inventario_data.porcentaje_descuento
    else:
        # Si se envía null o no se envía, eliminar el descuento
        update_data["porcentaje_descuento"] = None
    
    update_data["fecha_actualizacion"] = datetime.utcnow()
    
    # Actualizar en la base de datos
    inventario_actualizado = await update_inventario(inventario_id, update_data)
    
    return {
        "message": "Inventario actualizado exitosamente",
        "inventario": inventario_actualizado
    }
```

## Endpoint GET /inventarios

**IMPORTANTE:** El endpoint `GET /inventarios` debe incluir el campo `porcentaje_descuento` en la respuesta:

```json
[
  {
    "_id": "inventario_id",
    "fecha": "2025-01-15T10:30:00Z",
    "farmacia": "01",
    "costo": 15000.00,
    "usuarioCorreo": "usuario@example.com",
    "porcentaje_descuento": 10.5,  // ← Debe incluirse en la respuesta
    "fecha_creacion": "2025-01-15T10:30:00Z",
    "fecha_actualizacion": "2025-01-15T11:00:00Z"
  }
]
```

## Notas Importantes

1. **El descuento NO modifica los precios en la base de datos**: El descuento es solo un campo del inventario. El frontend calcula el precio con descuento en tiempo real: `precio_con_descuento = precio_original * (1 - porcentaje_descuento / 100)`

2. **El descuento se aplica a todos los items del inventario**: Cuando se visualiza un inventario, todos los productos muestran el precio con el descuento aplicado.

3. **Valores permitidos**: El porcentaje de descuento debe estar entre 0 y 100. Un valor de 0 significa sin descuento, y 100 significa precio a 0 (aunque esto no es recomendable).

4. **Persistencia**: El campo `porcentaje_descuento` debe guardarse en la base de datos para que persista entre sesiones.

5. **Compatibilidad**: Si el endpoint PATCH no existe, el frontend guardará el descuento solo localmente (durante la sesión). Para que persista, es necesario implementar este endpoint.

## Verificación

Para verificar que el endpoint funciona correctamente:

1. Hacer un PATCH con un porcentaje válido (ej: 10.5)
2. Verificar que se guarda en la base de datos
3. Hacer un GET del inventario y verificar que devuelve el `porcentaje_descuento`
4. Hacer un PATCH con null para eliminar el descuento
5. Verificar que el GET ya no devuelve el campo o devuelve null

