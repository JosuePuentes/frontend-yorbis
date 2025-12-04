# Instrucciones para Backend - Eliminar Inventario

## Endpoint Necesario

### DELETE /inventarios/{inventario_id}

**Descripción:** Elimina un inventario y todos sus items asociados.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin` o `eliminar_inventario`

**Path Parameters:**
- `inventario_id` (string, requerido): ID del inventario a eliminar

**Request Headers:**
```
Authorization: Bearer <token>
```

**Validaciones:**
- El inventario debe existir
- El usuario debe tener permisos para eliminar inventarios
- Se recomienda verificar que el inventario no esté siendo usado en otras operaciones (ventas, reportes, etc.)

**Response (200 OK):**
```json
{
  "message": "Inventario eliminado exitosamente",
  "inventario_id": "inventario_id",
  "items_eliminados": 150
}
```

**Errores posibles:**
- `400 Bad Request`: Si el inventario no puede ser eliminado (por ejemplo, tiene ventas asociadas)
- `401 Unauthorized`: Si no hay token o es inválido
- `403 Forbidden`: Si el usuario no tiene permisos
- `404 Not Found`: Si el inventario no existe

---

## Lógica de Negocio

### Al eliminar un inventario:

1. **Validar permisos:** Verificar que el usuario tiene permisos para eliminar inventarios
2. **Validar inventario:** Verificar que el inventario existe
3. **Validar dependencias (opcional):**
   - Verificar si hay ventas asociadas a productos de este inventario
   - Si hay dependencias críticas, se puede optar por:
     - Rechazar la eliminación (retornar error 400)
     - Marcar como "eliminado" (soft delete) en lugar de borrarlo físicamente
4. **Eliminar items asociados:**
   - Eliminar todos los productos/items que pertenecen a este inventario
   - O marcar como "eliminados" si se usa soft delete
5. **Eliminar inventario:**
   - Eliminar físicamente el registro del inventario
   - O marcar como "eliminado" si se usa soft delete
6. **Retornar respuesta:** Confirmar la eliminación y cantidad de items eliminados

### Opción 1: Eliminación Física (Hard Delete)

Elimina completamente el registro de la base de datos:

```javascript
// Eliminar todos los items del inventario
await Producto.deleteMany({ inventario_id: inventario_id });

// Eliminar el inventario
await Inventario.deleteOne({ _id: inventario_id });
```

### Opción 2: Eliminación Lógica (Soft Delete) - RECOMENDADO

Marca el inventario como eliminado sin borrarlo físicamente:

```javascript
// Marcar items como eliminados
await Producto.updateMany(
  { inventario_id: inventario_id },
  { 
    eliminado: true,
    fecha_eliminacion: new Date(),
    usuario_eliminacion: current_user.id
  }
);

// Marcar inventario como eliminado
await Inventario.updateOne(
  { _id: inventario_id },
  { 
    eliminado: true,
    fecha_eliminacion: new Date(),
    usuario_eliminacion: current_user.id
  }
);
```

**Ventajas del Soft Delete:**
- Permite recuperar datos eliminados por error
- Mantiene historial para auditoría
- Permite generar reportes históricos
- Evita problemas con referencias en otras colecciones

---

## Estructura de Base de Datos Sugerida

### Colección/Tabla: inventarios

Si se usa soft delete, agregar estos campos:

```javascript
{
  _id: ObjectId,
  fecha: Date,
  farmacia: String,
  costo: Number,
  usuarioCorreo: String,
  estado: String,           // "activo" o "inactivo"
  eliminado: Boolean,       // true si está eliminado
  fecha_eliminacion: Date,  // Fecha de eliminación
  usuario_eliminacion: String, // Usuario que eliminó
  // ... otros campos
}
```

### Colección/Tabla: productos (items)

Si se usa soft delete, agregar estos campos:

```javascript
{
  _id: ObjectId,
  codigo: String,
  descripcion: String,
  // ... otros campos
  inventario_id: String,
  eliminado: Boolean,       // true si está eliminado
  fecha_eliminacion: Date,  // Fecha de eliminación
  usuario_eliminacion: String, // Usuario que eliminó
  // ... otros campos
}
```

**Importante:** Al consultar inventarios y productos, siempre filtrar por `eliminado: false` o `eliminado: { $ne: true }` para no mostrar los eliminados.

---

## Ejemplo de Implementación (Python/FastAPI)

### Opción 1: Hard Delete

```python
from fastapi import APIRouter, Depends, HTTPException

router = APIRouter()

@router.delete("/inventarios/{inventario_id}")
async def eliminar_inventario(
    inventario_id: str,
    current_user: User = Depends(get_current_user)
):
    # Validar permisos
    if not has_permission(current_user, "eliminar_inventario"):
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar inventarios")
    
    # Validar inventario
    inventario = await get_inventario(inventario_id)
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    # Validar dependencias (opcional)
    # ventas_asociadas = await get_ventas_by_inventario(inventario_id)
    # if ventas_asociadas:
    #     raise HTTPException(status_code=400, detail="No se puede eliminar: hay ventas asociadas")
    
    # Contar items antes de eliminar
    items_count = await count_items_by_inventario(inventario_id)
    
    # Eliminar items asociados
    await delete_items_by_inventario(inventario_id)
    
    # Eliminar inventario
    await delete_inventario(inventario_id)
    
    return {
        "message": "Inventario eliminado exitosamente",
        "inventario_id": inventario_id,
        "items_eliminados": items_count
    }
```

### Opción 2: Soft Delete (RECOMENDADO)

```python
from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime

router = APIRouter()

@router.delete("/inventarios/{inventario_id}")
async def eliminar_inventario(
    inventario_id: str,
    current_user: User = Depends(get_current_user)
):
    # Validar permisos
    if not has_permission(current_user, "eliminar_inventario"):
        raise HTTPException(status_code=403, detail="No tiene permisos para eliminar inventarios")
    
    # Validar inventario (no debe estar ya eliminado)
    inventario = await get_inventario(inventario_id)
    if not inventario:
        raise HTTPException(status_code=404, detail="Inventario no encontrado")
    
    if inventario.get("eliminado", False):
        raise HTTPException(status_code=400, detail="El inventario ya está eliminado")
    
    # Contar items antes de eliminar
    items_count = await count_items_by_inventario(inventario_id, incluir_eliminados=False)
    
    # Marcar items como eliminados
    await mark_items_as_deleted(inventario_id, current_user.id)
    
    # Marcar inventario como eliminado
    await mark_inventario_as_deleted(inventario_id, current_user.id)
    
    return {
        "message": "Inventario eliminado exitosamente",
        "inventario_id": inventario_id,
        "items_eliminados": items_count
    }

async def mark_items_as_deleted(inventario_id: str, usuario_id: str):
    """Marca todos los items del inventario como eliminados"""
    await db.productos.update_many(
        {"inventario_id": inventario_id, "eliminado": {"$ne": True}},
        {
            "$set": {
                "eliminado": True,
                "fecha_eliminacion": datetime.utcnow(),
                "usuario_eliminacion": usuario_id
            }
        }
    )

async def mark_inventario_as_deleted(inventario_id: str, usuario_id: str):
    """Marca el inventario como eliminado"""
    await db.inventarios.update_one(
        {"_id": inventario_id},
        {
            "$set": {
                "eliminado": True,
                "fecha_eliminacion": datetime.utcnow(),
                "usuario_eliminacion": usuario_id,
                "estado": "inactivo"  # También cambiar estado a inactivo
            }
        }
    )
```

---

## Notas Importantes

1. **Soft Delete vs Hard Delete:** Se recomienda usar soft delete para mantener historial y permitir recuperación de datos.

2. **Filtrado en consultas:** Al obtener inventarios, siempre filtrar por `eliminado: false`:
   ```javascript
   // En GET /inventarios
   inventarios = await Inventario.find({ eliminado: { $ne: true } })
   ```

3. **Dependencias:** Antes de eliminar, considerar si hay:
   - Ventas asociadas a productos del inventario
   - Reportes que referencian el inventario
   - Otros registros que dependen del inventario

4. **Auditoría:** Mantener registro de quién y cuándo eliminó el inventario para auditoría.

5. **Permisos:** Solo usuarios con permisos administrativos deben poder eliminar inventarios.

6. **Confirmación en frontend:** El frontend ya incluye un modal de confirmación para evitar eliminaciones accidentales.

---

## Endpoint de Recuperación (Opcional)

Si se usa soft delete, se puede agregar un endpoint para recuperar inventarios eliminados:

### PATCH /inventarios/{inventario_id}/restaurar

```python
@router.patch("/inventarios/{inventario_id}/restaurar")
async def restaurar_inventario(
    inventario_id: str,
    current_user: User = Depends(get_current_user)
):
    # Restaurar inventario y sus items
    await restore_inventario(inventario_id, current_user.id)
    return {"message": "Inventario restaurado exitosamente"}
```

