# 🔧 INSTRUCCIONES BACKEND: Cargar Existencias al Inventario

## 📌 REQUERIMIENTO

El frontend necesita un endpoint para cargar existencias a productos existentes en el inventario. El usuario busca un producto y agrega la cantidad de existencia a cargar.

---

## 📋 ENDPOINT: `PATCH /inventarios/{inventario_id}/items/{item_id}`

### Request Body

```json
{
  "cantidad": 50,
  "existencia": 50
}
```

### Campos del Request

- `cantidad` (number, requerido): Nueva cantidad total (existencia actual + cantidad a cargar)
- `existencia` (number, requerido): Alias de cantidad (mismo valor)

**Nota:** El frontend calcula la nueva existencia antes de enviar: `nueva_existencia = existencia_actual + cantidad_a_cargar`

### Response (200 OK)

```json
{
  "message": "Existencia actualizada exitosamente",
  "item": {
    "_id": "item_id",
    "codigo": "PROD001",
    "descripcion": "Aspirina 500mg",
    "marca": "Bayer",
    "cantidad": 150,  // Nueva cantidad
    "existencia": 150,
    "costo": 2.50,
    "precio": 3.75
  }
}
```

---

## 🔧 IMPLEMENTACIÓN REQUERIDA

### Código Python/FastAPI

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from bson import ObjectId
from datetime import datetime

router = APIRouter()

class ActualizarExistenciaRequest(BaseModel):
    cantidad: float
    existencia: float

@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def actualizar_existencia_item(
    inventario_id: str,
    item_id: str,
    request: ActualizarExistenciaRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Verificar permisos
        if "acceso_admin" not in current_user.get("permisos", []):
            raise HTTPException(status_code=403, detail="No tiene permisos")
        
        # Validar inventario
        inventario = await db.inventarios.find_one({"_id": ObjectId(inventario_id)})
        if not inventario:
            raise HTTPException(status_code=404, detail="Inventario no encontrado")
        
        # Validar que el inventario esté activo
        if inventario.get("estado") != "activo":
            raise HTTPException(
                status_code=400, 
                detail="Solo se pueden actualizar items de inventarios activos"
            )
        
        # Buscar el item en el inventario
        items = inventario.get("items", [])
        item_index = None
        item_encontrado = None
        
        for idx, item in enumerate(items):
            item_obj_id = item.get("_id")
            if item_obj_id:
                # Si _id es ObjectId, comparar como string
                if str(item_obj_id) == item_id:
                    item_index = idx
                    item_encontrado = item
                    break
            elif item.get("id") == item_id:
                item_index = idx
                item_encontrado = item
                break
        
        if item_encontrado is None:
            raise HTTPException(status_code=404, detail="Item no encontrado en el inventario")
        
        # Validar que la nueva cantidad sea >= 0
        nueva_cantidad = request.cantidad
        if nueva_cantidad < 0:
            raise HTTPException(
                status_code=400,
                detail="La cantidad no puede ser negativa"
            )
        
        # Actualizar el item
        items[item_index]["cantidad"] = nueva_cantidad
        items[item_index]["existencia"] = nueva_cantidad  # Alias
        items[item_index]["fecha_actualizacion"] = datetime.now()
        
        # Actualizar el inventario
        await db.inventarios.update_one(
            {"_id": ObjectId(inventario_id)},
            {
                "$set": {
                    "items": items,
                    "fecha_actualizacion": datetime.now()
                }
            }
        )
        
        # Recalcular costo total del inventario
        costo_total = sum(
            item.get("cantidad", 0) * item.get("costo_unitario", item.get("costo", 0))
            for item in items
        )
        
        await db.inventarios.update_one(
            {"_id": ObjectId(inventario_id)},
            {"$set": {"costo": costo_total}}
        )
        
        # Retornar el item actualizado
        return {
            "message": "Existencia actualizada exitosamente",
            "item": items[item_index]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar existencia: {str(e)}"
        )
```

---

## 🔍 ALTERNATIVA: Endpoint Específico para Cargar Existencia

Si prefieres un endpoint más específico que reciba la cantidad a **sumar** en lugar de la cantidad total:

### Endpoint: `POST /inventarios/{inventario_id}/items/{item_id}/cargar-existencia`

### Request Body

```json
{
  "cantidad_a_cargar": 50
}
```

### Implementación

```python
@router.post("/inventarios/{inventario_id}/items/{item_id}/cargar-existencia")
async def cargar_existencia_item(
    inventario_id: str,
    item_id: str,
    request: dict,  # {"cantidad_a_cargar": 50}
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    cantidad_a_cargar = request.get("cantidad_a_cargar", 0)
    
    if cantidad_a_cargar <= 0:
        raise HTTPException(
            status_code=400,
            detail="La cantidad a cargar debe ser mayor a 0"
        )
    
    # ... buscar inventario e item ...
    
    # Obtener existencia actual
    existencia_actual = item_encontrado.get("cantidad", item_encontrado.get("existencia", 0))
    
    # Calcular nueva existencia
    nueva_existencia = existencia_actual + cantidad_a_cargar
    
    # Actualizar item
    items[item_index]["cantidad"] = nueva_existencia
    items[item_index]["existencia"] = nueva_existencia
    
    # ... resto de la implementación igual ...
```

---

## ✅ VALIDACIONES REQUERIDAS

1. **Permisos:** Verificar que el usuario tenga permisos de administrador
2. **Inventario existe:** Verificar que el inventario existe
3. **Inventario activo:** Solo permitir actualizar items de inventarios activos
4. **Item existe:** Verificar que el item existe en el inventario
5. **Cantidad válida:** La nueva cantidad debe ser >= 0
6. **Actualizar costo total:** Recalcular el costo total del inventario después de actualizar

---

## 📊 ESTRUCTURA DE BASE DE DATOS

### Colección: `inventarios`

```javascript
{
  _id: ObjectId,
  fecha: Date,
  farmacia: String,  // ID de la sucursal
  costo: Number,  // Costo total (debe actualizarse)
  estado: "activo" | "inactivo",
  items: [
    {
      _id: ObjectId,  // ID del item
      codigo: String,
      descripcion: String,
      marca: String,
      cantidad: Number,  // ✅ Se actualiza aquí
      existencia: Number,  // ✅ Alias de cantidad
      costo_unitario: Number,
      precio_unitario: Number,
      fecha_actualizacion: Date
    }
  ],
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

---

## 🔍 ENDPOINT ADICIONAL: Buscar Productos en Inventarios

El frontend también necesita buscar productos en los inventarios de una sucursal. Ya existe el endpoint `GET /inventarios?farmacia={sucursal_id}`, pero debe:

1. Retornar solo inventarios activos
2. Permitir obtener items de cada inventario con `GET /inventarios/{inventario_id}/items`

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] El endpoint `PATCH /inventarios/{inventario_id}/items/{item_id}` está implementado
- [ ] Se valida que el inventario existe y está activo
- [ ] Se valida que el item existe en el inventario
- [ ] Se actualiza la cantidad y existencia del item
- [ ] Se recalcula el costo total del inventario
- [ ] Se retorna el item actualizado en la respuesta
- [ ] Se manejan errores apropiadamente

---

## 📝 EJEMPLO DE USO

### Request

```http
PATCH /inventarios/507f1f77bcf86cd799439011/items/507f191e810c19729de860ea
Content-Type: application/json
Authorization: Bearer <token>

{
  "cantidad": 150,
  "existencia": 150
}
```

### Response

```json
{
  "message": "Existencia actualizada exitosamente",
  "item": {
    "_id": "507f191e810c19729de860ea",
    "codigo": "PROD001",
    "descripcion": "Aspirina 500mg",
    "marca": "Bayer",
    "cantidad": 150,
    "existencia": 150,
    "costo_unitario": 2.50,
    "precio_unitario": 3.75
  }
}
```

---

**Última actualización:** 2025-01-15

