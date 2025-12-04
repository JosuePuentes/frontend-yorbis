# Instrucciones para el Backend - Campos Correctos en PATCH /inventarios/{inventario_id}/items/{item_id}

## Problema Identificado

El frontend ahora envía los campos correctos, pero el backend puede no estar actualizándolos correctamente. Según los logs:

- **Frontend envía**: `cantidad`, `costo_unitario`, `precio_unitario`
- **Backend devuelve**: `cantidad: 0` (todos los items tienen cantidad en 0)
- **Backend devuelve**: `costo_unitario: 30` (tiene valores correctos)

Esto sugiere que el backend **NO está actualizando el campo `cantidad`** cuando se hace el PATCH.

## Campos que el Frontend Envía

El frontend ahora envía en el body del PATCH:

```json
{
  "codigo": "string",
  "descripcion": "string",
  "marca": "string",
  "costo_unitario": number,    // ← IMPORTANTE: No es "costo"
  "cantidad": number,          // ← IMPORTANTE: No es "existencia"
  "precio_unitario": number,   // ← IMPORTANTE: No es "precio"
  "porcentaje_ganancia": number
}
```

## Verificaciones Necesarias en el Backend

### 1. Verificar que el Endpoint PATCH Acepta los Campos Correctos

El endpoint `PATCH /inventarios/{inventario_id}/items/{item_id}` debe:

```python
@router.patch("/inventarios/{inventario_id}/items/{item_id}")
async def modificar_item(
    inventario_id: str,
    item_id: str,
    item_data: ModificarItemRequest,  # ← Verificar el modelo
    current_user: User = Depends(get_current_user)
):
    # ...
```

### 2. Verificar el Modelo de Request (Pydantic)

El modelo `ModificarItemRequest` debe aceptar:

```python
class ModificarItemRequest(BaseModel):
    codigo: Optional[str] = None
    descripcion: Optional[str] = None
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None  # ← NO "costo"
    cantidad: Optional[int] = None          # ← NO "existencia"
    precio_unitario: Optional[float] = None # ← NO "precio"
    porcentaje_ganancia: Optional[float] = None
```

**IMPORTANTE**: Si el modelo tiene `costo`, `existencia`, `precio` en lugar de `costo_unitario`, `cantidad`, `precio_unitario`, **debe actualizarse**.

### 3. Verificar que se Actualicen los Campos Correctos en la BD

El código de actualización debe ser algo como:

```python
# ❌ INCORRECTO (si usa campos antiguos)
item.costo = item_data.costo
item.existencia = item_data.existencia
item.precio = item_data.precio

# ✅ CORRECTO (usar campos nuevos)
item.costo_unitario = item_data.costo_unitario
item.cantidad = item_data.cantidad
item.precio_unitario = item_data.precio_unitario
```

### 4. Verificar el Modelo de la Base de Datos

El modelo de la base de datos (MongoDB/Beanie) debe tener los campos:

```python
class Producto(BaseModel):  # o como se llame tu modelo
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo_unitario: Optional[float] = None  # ← Campo en BD
    cantidad: Optional[int] = None          # ← Campo en BD
    precio_unitario: Optional[float] = None # ← Campo en BD
    # ... otros campos
```

### 5. Verificar que se Guarde Correctamente

Después de actualizar, asegúrate de guardar:

```python
# Actualizar campos
if item_data.costo_unitario is not None:
    item.costo_unitario = item_data.costo_unitario
if item_data.cantidad is not None:
    item.cantidad = item_data.cantidad  # ← Asegurarse de que se actualice
if item_data.precio_unitario is not None:
    item.precio_unitario = item_data.precio_unitario

# Guardar en BD
await item.save()  # o el método que uses
```

## Checklist de Verificación

- [ ] El modelo `ModificarItemRequest` acepta `costo_unitario`, `cantidad`, `precio_unitario`
- [ ] El código de actualización usa `item.cantidad = item_data.cantidad` (no `item.existencia`)
- [ ] El código de actualización usa `item.costo_unitario = item_data.costo_unitario` (no `item.costo`)
- [ ] El código de actualización usa `item.precio_unitario = item_data.precio_unitario` (no `item.precio`)
- [ ] Se llama a `item.save()` o el método equivalente después de actualizar
- [ ] El endpoint devuelve el item actualizado con los campos correctos

## Prueba Rápida

1. Hacer un PATCH con:
```json
{
  "cantidad": 10,
  "costo_unitario": 25.50,
  "precio_unitario": 35.00
}
```

2. Verificar en la BD que el item tenga:
   - `cantidad: 10` (no 0)
   - `costo_unitario: 25.50`
   - `precio_unitario: 35.00`

3. Hacer un GET del mismo item y verificar que devuelva los valores actualizados.

## Nota Importante

Si el backend está usando campos diferentes (`costo`, `existencia`, `precio`), tienes dos opciones:

1. **Opción 1 (Recomendada)**: Actualizar el backend para usar `costo_unitario`, `cantidad`, `precio_unitario` (como el frontend ahora envía)
2. **Opción 2**: Cambiar el frontend para enviar `costo`, `existencia`, `precio` (pero esto no coincide con lo que el backend devuelve en GET)

La **Opción 1 es la correcta** porque el backend ya devuelve `costo_unitario`, `cantidad`, `precio_unitario` en el GET, así que debe aceptarlos también en el PATCH.


