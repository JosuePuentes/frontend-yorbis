# Instrucciones para Backend - Modificación de Items de Inventario

## Endpoints Necesarios

### 1. PATCH /inventarios/{inventario_id}/items/{item_id}

**Descripción:** Modifica un item específico de un inventario.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin` o `modificar_inventario`

**Path Parameters:**
- `inventario_id` (string, requerido): ID del inventario
- `item_id` (string, requerido): ID del producto/item a modificar

**Request Body:**
```json
{
  "codigo": "PROD001",
  "descripcion": "Aspirina 500mg",
  "marca": "Bayer",
  "costo": 2.50,
  "existencia": 100,
  "precio": 5.00,
  "porcentaje_ganancia": 100.0
}
```

**Campos del Request:**
- `codigo` (string, requerido): Código del producto
- `descripcion` (string, requerido): Descripción/nombre del producto
- `marca` (string, opcional): Marca del producto
- `costo` (number, requerido): Costo del producto (debe ser > 0)
- `existencia` (number, requerido): Cantidad en stock (debe ser >= 0)
- `precio` (number, requerido): Precio de venta del producto (debe ser > 0)
- `porcentaje_ganancia` (number, opcional): Porcentaje de ganancia aplicado (para registro contable)

**Validaciones:**
- `codigo` y `descripcion` no pueden estar vacíos
- `costo` debe ser mayor que 0
- `existencia` debe ser mayor o igual a 0
- `precio` debe ser mayor que 0
- El producto debe existir en el inventario especificado
- El inventario debe existir

**Response (200 OK):**
```json
{
  "message": "Item actualizado exitosamente",
  "item": {
    "_id": "item_id",
    "codigo": "PROD001",
    "descripcion": "Aspirina 500mg",
    "marca": "Bayer",
    "costo": 2.50,
    "existencia": 100,
    "precio": 5.00,
    "porcentaje_ganancia": 100.0,
    "utilidad_contable": 2.50,
    "sucursal": "01",
    "inventario_id": "inventario_id",
    "fecha_actualizacion": "2025-01-15T10:30:00Z"
  }
}
```

**Errores posibles:**
- `400 Bad Request`: Si faltan campos requeridos o los datos son inválidos
- `401 Unauthorized`: Si no hay token o es inválido
- `403 Forbidden`: Si el usuario no tiene permisos
- `404 Not Found`: Si el inventario o el item no existen
- `409 Conflict`: Si el código ya existe en otro producto de la misma sucursal

---

## Lógica de Negocio

### Al modificar un item:

1. **Validar permisos:** Verificar que el usuario tiene permisos para modificar inventarios
2. **Validar inventario:** Verificar que el inventario existe y está activo
3. **Validar item:** Verificar que el item pertenece al inventario especificado
4. **Validar datos:** Verificar que todos los campos requeridos están presentes y son válidos
5. **Calcular utilidad contable:**
   - `utilidad_contable = precio - costo`
   - Esta utilidad se debe registrar para fines contables
6. **Actualizar producto:**
   - Actualizar: `codigo`, `descripcion`, `marca`, `costo`, `existencia`, `precio`, `porcentaje_ganancia`
   - Actualizar `fecha_actualizacion`
   - Registrar `utilidad_contable` para fines contables
7. **Actualizar costo total del inventario:**
   - Recalcular el costo total del inventario sumando: `suma(costo * existencia)` de todos los items
   - Actualizar el campo `costo` del inventario con este nuevo total
8. **Retornar respuesta:** Incluir el item actualizado y la utilidad contable

### Registro Contable:

La utilidad contable debe registrarse para cada modificación de precio:
- **Utilidad Contable = Precio - Costo**
- Esta utilidad representa la ganancia esperada por unidad cuando se venda el producto
- Se debe almacenar para reportes y análisis contables

### Relación con Porcentaje de Ganancia:

El porcentaje de ganancia se calcula como:
```
porcentaje_ganancia = ((precio - costo) / costo) * 100
```

Y viceversa, si se proporciona el porcentaje de ganancia:
```
precio = costo * (1 + porcentaje_ganancia / 100)
```

---

## Estructura de Base de Datos Sugerida

### Colección/Tabla: productos (items de inventario)

```javascript
{
  _id: ObjectId,
  codigo: String,           // Código único del producto
  descripcion: String,      // Descripción/nombre del producto
  marca: String,            // Marca (opcional)
  existencia: Number,       // Cantidad en stock
  costo: Number,            // Costo del producto
  precio: Number,           // Precio de venta
  porcentaje_ganancia: Number, // Porcentaje de ganancia aplicado
  utilidad_contable: Number,   // Utilidad contable (precio - costo)
  sucursal: String,         // ID de la sucursal (FK)
  inventario_id: String,    // ID del inventario al que pertenece (FK)
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

### Colección/Tabla: inventarios

```javascript
{
  _id: ObjectId,
  fecha: Date,              // Fecha de cargo del inventario
  farmacia: String,         // ID o nombre de la sucursal
  costo: Number,            // Costo total del inventario (suma de costo * existencia de todos los items)
  usuarioCorreo: String,     // Correo del usuario que creó el inventario
  estado: String,           // "activo" o "inactivo"
  items: [ObjectId],        // Referencias a los productos/items
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

**Actualización del costo total:**
Cada vez que se modifica un item, se debe recalcular el costo total del inventario:
```javascript
costo_total = items.reduce((sum, item) => sum + (item.costo * item.existencia), 0)
```

---

## Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

router = APIRouter()

class ModificarItemRequest(BaseModel):
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo: float
    existencia: float
    precio: float
    porcentaje_ganancia: Optional[float] = None

@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,
    current_user: User = Depends(get_current_user)
):
    # Validar permisos
    if not has_permission(current_user, "modificar_inventario"):
        raise HTTPException(status_code=403, detail="No tiene permisos para modificar inventarios")
    
    # Validar inventario
    inventario = await get_inventario(inventario_id)
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    # Validar item
    item = await get_item(item_id)
    if not item or item.inventario_id != inventario_id:
        raise HTTPException(status_code=404, detail="Item no encontrado en este inventario")
    
    # Validar datos
    if item_data.costo <= 0 or item_data.precio <= 0 or item_data.existencia < 0:
        raise HTTPException(status_code=400, detail="Costo, precio y existencia deben ser valores válidos")
    
    # Calcular utilidad contable
    utilidad_contable = item_data.precio - item_data.costo
    
    # Calcular porcentaje de ganancia si no se proporciona
    if item_data.porcentaje_ganancia is None:
        porcentaje_ganancia = ((item_data.precio - item_data.costo) / item_data.costo) * 100
    else:
        porcentaje_ganancia = item_data.porcentaje_ganancia
    
    # Actualizar item
    item.codigo = item_data.codigo
    item.descripcion = item_data.descripcion
    item.marca = item_data.marca
    item.costo = item_data.costo
    item.existencia = item_data.existencia
    item.precio = item_data.precio
    item.porcentaje_ganancia = porcentaje_ganancia
    item.utilidad_contable = utilidad_contable
    item.fecha_actualizacion = datetime.utcnow()
    
    await update_item(item)
    
    # Recalcular costo total del inventario
    items = await get_items_by_inventario(inventario_id)
    costo_total = sum(item.costo * item.existencia for item in items)
    inventario.costo = costo_total
    inventario.fecha_actualizacion = datetime.utcnow()
    await update_inventario(inventario)
    
    return {
        "message": "Item actualizado exitosamente",
        "item": {
            "_id": str(item._id),
            "codigo": item.codigo,
            "descripcion": item.descripcion,
            "marca": item.marca,
            "costo": item.costo,
            "existencia": item.existencia,
            "precio": item.precio,
            "porcentaje_ganancia": item.porcentaje_ganancia,
            "utilidad_contable": item.utilidad_contable,
            "sucursal": item.sucursal,
            "inventario_id": str(item.inventario_id),
            "fecha_actualizacion": item.fecha_actualizacion.isoformat()
        }
    }
```

---

## Notas Importantes

1. **Utilidad Contable:** La utilidad contable se calcula como `precio - costo` y debe registrarse para cada modificación. Esto es importante para reportes financieros.

2. **Porcentaje de Ganancia:** El porcentaje de ganancia puede ser calculado automáticamente o proporcionado por el usuario. Si se proporciona, el precio se calcula automáticamente.

3. **Actualización del Costo Total:** Cada modificación de un item debe actualizar el costo total del inventario sumando `costo * existencia` de todos los items.

4. **Validación de Código:** Si se modifica el código, verificar que no exista otro producto con el mismo código en la misma sucursal (a menos que sea el mismo producto).

5. **Historial de Cambios:** Se recomienda mantener un historial de cambios para auditoría, especialmente para cambios de precio y costo.

