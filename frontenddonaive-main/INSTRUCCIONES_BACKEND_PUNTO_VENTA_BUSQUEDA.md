# ⚠️ INSTRUCCIONES PARA EL BACKEND - BÚSQUEDA DE PRODUCTOS EN PUNTO DE VENTA

## PROBLEMA ACTUAL

El frontend está intentando buscar productos en el punto de venta usando el endpoint `/punto-venta/productos/buscar`, pero este endpoint puede no estar implementado o no estar devolviendo los productos correctamente.

## ✅ SOLUCIÓN REQUERIDA

### Endpoint: `GET /punto-venta/productos/buscar`

**Este endpoint DEBE:**
1. Buscar productos en los inventarios de la sucursal especificada
2. Filtrar por código, descripción o marca
3. Devolver productos con todos los campos necesarios
4. Incluir información de stock y lotes

### Parámetros de Query

- `q` (string, requerido): Término de búsqueda (código, descripción o marca)
- `sucursal` (string, requerido): ID de la sucursal

### Formato de Respuesta Esperado

El backend puede devolver los productos en cualquiera de estos formatos:

**Opción 1: Array directo (PREFERIDO)**
```json
[
  {
    "id": "producto_id_123",
    "_id": "producto_id_123",
    "codigo": "010001",
    "codigo_producto": "010001",
    "nombre": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "descripcion_producto": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "marca": "PINTEMOS",
    "marca_producto": "PINTEMOS",
    "precio": 23.51,
    "precio_usd": 23.51,
    "precio_unitario": 23.51,
    "precio_venta": 23.51,
    "cantidad": 12,
    "stock": 12,
    "existencia": 12,
    "lotes": [
      {
        "lote": "LOTE001",
        "fecha_vencimiento": "2025-12-31",
        "cantidad": 12
      }
    ],
    "sucursal": "01"
  }
]
```

**Opción 2: Objeto con array de productos**
```json
{
  "productos": [
    {
      "id": "producto_id_123",
      "codigo": "010001",
      "nombre": "ESMALTE SINTETICO",
      "precio": 23.51,
      "cantidad": 12,
      "lotes": []
    }
  ]
}
```

**Opción 3: Objeto con array de items**
```json
{
  "items": [
    {
      "id": "producto_id_123",
      "codigo": "010001",
      "nombre": "ESMALTE SINTETICO",
      "precio": 23.51,
      "cantidad": 12
    }
  ]
}
```

## 📋 CAMPOS REQUERIDOS EN CADA PRODUCTO

### Campos Obligatorios:
- `id` o `_id`: Identificador único del producto
- `codigo` o `codigo_producto`: Código del producto
- `nombre` o `descripcion` o `descripcion_producto`: Nombre/descripción del producto
- `precio` o `precio_usd` o `precio_unitario` o `precio_venta`: Precio de venta

### Campos Opcionales (pero recomendados):
- `marca` o `marca_producto`: Marca del producto
- `cantidad` o `stock` o `existencia`: Cantidad disponible
- `lotes`: Array de lotes con fechas de vencimiento
- `sucursal`: ID de la sucursal

## 🔍 LÓGICA DE BÚSQUEDA

El endpoint debe buscar productos que coincidan con el término de búsqueda (`q`) en:
1. **Código del producto** (coincidencia parcial)
2. **Descripción/Nombre** (coincidencia parcial)
3. **Marca** (coincidencia parcial)

La búsqueda debe ser **case-insensitive** (no distingue mayúsculas/minúsculas).

### Ejemplo de Búsqueda

Si el usuario busca "ESMALTE", el backend debe devolver todos los productos que:
- Tengan código que contenga "ESMALTE"
- O tengan descripción que contenga "ESMALTE"
- O tengan marca que contenga "ESMALTE"

## 📝 CÓDIGO PYTHON/FASTAPI EJEMPLO

```python
from fastapi import APIRouter, Depends, Query
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

@router.get("/punto-venta/productos/buscar")
async def buscar_productos_punto_venta(
    q: str = Query(..., description="Término de búsqueda"),
    sucursal: str = Query(..., description="ID de la sucursal"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Buscar productos en inventarios de una sucursal específica.
    Busca por código, descripción o marca.
    """
    busqueda_lower = q.lower().strip()
    
    # Obtener todos los inventarios de la sucursal
    inventarios = await db.inventarios.find({
        "farmacia": sucursal,
        "activo": {"$ne": False}
    }).to_list(length=1000)
    
    productos_encontrados = []
    productos_ids_vistos = set()  # Para evitar duplicados
    
    # Buscar en cada inventario
    for inventario in inventarios:
        inventario_id = str(inventario["_id"])
        
        # Obtener items del inventario
        items = await db.items_inventario.find({
            "inventario_id": inventario_id
        }).to_list(length=10000)
        
        # También intentar desde productos si existe esa colección
        productos = await db.productos.find({
            "inventario_id": inventario_id,
            "sucursal": sucursal
        }).to_list(length=10000)
        
        # Combinar items y productos
        todos_items = items + productos
        
        # Filtrar por búsqueda
        for item in todos_items:
            # Normalizar campos
            codigo = (item.get("codigo") or item.get("codigo_producto") or "").lower()
            descripcion = (item.get("descripcion") or item.get("nombre") or item.get("descripcion_producto") or "").lower()
            marca = (item.get("marca") or item.get("marca_producto") or "").lower()
            
            # Verificar si coincide con la búsqueda
            coincide = (
                busqueda_lower in codigo or
                busqueda_lower in descripcion or
                busqueda_lower in marca
            )
            
            if coincide:
                item_id = str(item.get("_id") or item.get("id") or "")
                
                # Evitar duplicados
                if item_id and item_id not in productos_ids_vistos:
                    productos_ids_vistos.add(item_id)
                    
                    # Normalizar producto para el frontend
                    producto_normalizado = {
                        "id": item_id,
                        "_id": item_id,
                        "codigo": item.get("codigo") or item.get("codigo_producto") or "",
                        "codigo_producto": item.get("codigo") or item.get("codigo_producto") or "",
                        "nombre": item.get("descripcion") or item.get("nombre") or item.get("descripcion_producto") or "",
                        "descripcion": item.get("descripcion") or item.get("nombre") or item.get("descripcion_producto") or "",
                        "descripcion_producto": item.get("descripcion") or item.get("nombre") or item.get("descripcion_producto") or "",
                        "marca": item.get("marca") or item.get("marca_producto") or "",
                        "marca_producto": item.get("marca") or item.get("marca_producto") or "",
                        "precio": item.get("precio_unitario") or item.get("precio") or item.get("precio_venta") or 0,
                        "precio_usd": item.get("precio_unitario") or item.get("precio") or item.get("precio_venta") or 0,
                        "precio_unitario": item.get("precio_unitario") or item.get("precio") or item.get("precio_venta") or 0,
                        "precio_venta": item.get("precio_unitario") or item.get("precio") or item.get("precio_venta") or 0,
                        "cantidad": item.get("cantidad") or item.get("existencia") or item.get("stock") or 0,
                        "stock": item.get("cantidad") or item.get("existencia") or item.get("stock") or 0,
                        "existencia": item.get("cantidad") or item.get("existencia") or item.get("stock") or 0,
                        "lotes": item.get("lotes") or [],
                        "sucursal": sucursal
                    }
                    
                    productos_encontrados.append(producto_normalizado)
    
    return productos_encontrados
```

## ⚠️ IMPORTANTE

1. **El endpoint DEBE devolver productos de los inventarios de la sucursal especificada**
2. **La búsqueda debe ser case-insensitive**
3. **Debe buscar en código, descripción y marca**
4. **Debe normalizar los campos para que el frontend pueda usarlos**
5. **Debe incluir información de stock/cantidad disponible**
6. **Si hay lotes, debe incluirlos con fechas de vencimiento**

## 🔄 FALLBACK DEL FRONTEND

Si este endpoint no está disponible o retorna 404, el frontend intentará cargar productos directamente desde:
- `GET /inventarios` (filtrar por sucursal)
- `GET /inventarios/{inventario_id}/items` (para cada inventario)
- `GET /productos?inventario_id={inventario_id}` (endpoint alternativo)

Pero es **RECOMENDADO** implementar el endpoint `/punto-venta/productos/buscar` para mejor rendimiento y experiencia de usuario.

## 📊 EJEMPLO DE USO

**Request:**
```
GET /punto-venta/productos/buscar?q=ESMALTE&sucursal=01
```

**Response:**
```json
[
  {
    "id": "693337d709dfa131aa8ec9a8",
    "codigo": "010001",
    "nombre": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "marca": "PINTEMOS",
    "precio": 23.51,
    "precio_usd": 23.51,
    "cantidad": 12,
    "stock": 12,
    "lotes": [
      {
        "lote": "LOTE001",
        "fecha_vencimiento": "2025-12-31",
        "cantidad": 12
      }
    ],
    "sucursal": "01"
  }
]
```

## ✅ VERIFICACIÓN

Para verificar que el endpoint funciona correctamente:

1. Hacer una petición GET a `/punto-venta/productos/buscar?q=test&sucursal=01`
2. Verificar que retorna un array de productos
3. Verificar que cada producto tiene los campos requeridos
4. Verificar que la búsqueda funciona con códigos, descripciones y marcas

