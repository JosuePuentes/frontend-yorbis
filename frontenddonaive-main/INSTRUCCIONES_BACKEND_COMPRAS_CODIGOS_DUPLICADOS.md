# ⚠️ INSTRUCCIONES PARA EL BACKEND - VALIDACIÓN DE CÓDIGOS DUPLICADOS EN COMPRAS

## PROBLEMA ACTUAL

El frontend necesita validar que no se agreguen productos con códigos duplicados en las compras. Actualmente, el frontend valida:
1. Códigos duplicados dentro de la misma compra (frontend)
2. Códigos que ya existen en el inventario (requiere endpoint del backend)

## ✅ SOLUCIÓN REQUERIDA EN EL BACKEND

### 1. Endpoint: `GET /productos/buscar-codigo`

**Este endpoint DEBE:**
- Buscar si un código de producto ya existe en el inventario de una sucursal
- Retornar el producto si existe, o null/empty si no existe

**Parámetros de Query:**
- `codigo` (string, requerido): Código del producto a buscar
- `sucursal` (string, requerido): ID de la sucursal

**Formato de Respuesta:**

**Si el producto existe:**
```json
{
  "producto": {
    "id": "producto_id_123",
    "codigo": "010001",
    "nombre": "ESMALTE SINTETICO",
    "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "marca": "PINTEMOS",
    "precio": 23.51,
    "cantidad": 12
  }
}
```

**O como array:**
```json
[
  {
    "id": "producto_id_123",
    "codigo": "010001",
    "nombre": "ESMALTE SINTETICO",
    "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
    "marca": "PINTEMOS",
    "precio": 23.51,
    "cantidad": 12
  }
]
```

**Si el producto NO existe:**
```json
[]
```

**O:**
```json
{
  "producto": null
}
```

### 2. Endpoint: `POST /compras` - Validación de Códigos Duplicados

**El backend DEBE validar que:**
1. No haya códigos duplicados dentro de la misma compra
2. Si el producto es nuevo (`es_nuevo: true`), verificar que el código no exista en el inventario

**Si se detecta un código duplicado:**
- Retornar error 400 (Bad Request)
- Mensaje de error: `"El código {codigo} ya existe en el inventario"` o `"El código {codigo} está duplicado en esta compra"`

## 📝 CÓDIGO PYTHON/FASTAPI EJEMPLO

### Endpoint de Búsqueda de Código

```python
from fastapi import APIRouter, Depends, Query, HTTPException
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

@router.get("/productos/buscar-codigo")
async def buscar_producto_por_codigo(
    codigo: str = Query(..., description="Código del producto"),
    sucursal: str = Query(..., description="ID de la sucursal"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Buscar si un código de producto ya existe en el inventario de una sucursal.
    """
    codigo_normalizado = codigo.upper().strip()
    
    # Buscar en inventarios de la sucursal
    inventarios = await db.inventarios.find({
        "farmacia": sucursal,
        "activo": {"$ne": False}
    }).to_list(length=1000)
    
    # Buscar en cada inventario
    for inventario in inventarios:
        inventario_id = str(inventario["_id"])
        
        # Buscar en items del inventario
        item = await db.items_inventario.find_one({
            "inventario_id": inventario_id,
            "$or": [
                {"codigo": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}},
                {"codigo_producto": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}}
            ]
        })
        
        if item:
            return {
                "producto": {
                    "id": str(item.get("_id")),
                    "codigo": item.get("codigo") or item.get("codigo_producto"),
                    "nombre": item.get("descripcion") or item.get("nombre"),
                    "descripcion": item.get("descripcion") or item.get("nombre"),
                    "marca": item.get("marca") or item.get("marca_producto"),
                    "precio": item.get("precio_unitario") or item.get("precio") or 0,
                    "cantidad": item.get("cantidad") or item.get("existencia") or 0
                }
            }
        
        # También buscar en productos si existe esa colección
        producto = await db.productos.find_one({
            "sucursal": sucursal,
            "$or": [
                {"codigo": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}},
                {"codigo_producto": {"$regex": f"^{codigo_normalizado}$", "$options": "i"}}
            ]
        })
        
        if producto:
            return {
                "producto": {
                    "id": str(producto.get("_id")),
                    "codigo": producto.get("codigo") or producto.get("codigo_producto"),
                    "nombre": producto.get("descripcion") or producto.get("nombre"),
                    "descripcion": producto.get("descripcion") or producto.get("nombre"),
                    "marca": producto.get("marca") or producto.get("marca_producto"),
                    "precio": producto.get("precio_unitario") or producto.get("precio") or 0,
                    "cantidad": producto.get("cantidad") or producto.get("existencia") or 0
                }
            }
    
    # No se encontró el producto
    return []
```

### Validación en POST /compras

```python
@router.post("/compras")
async def crear_compra(
    compra_data: dict,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Crear una nueva compra con validación de códigos duplicados.
    """
    productos = compra_data.get("productos", [])
    sucursal_id = compra_data.get("farmacia") or compra_data.get("sucursal_id")
    
    # 1. Validar códigos duplicados dentro de la compra
    codigos_vistos = set()
    for producto in productos:
        codigo = (producto.get("codigo") or "").upper().strip()
        if not codigo:
            raise HTTPException(
                status_code=400,
                detail="Todos los productos deben tener un código"
            )
        
        if codigo in codigos_vistos:
            raise HTTPException(
                status_code=400,
                detail=f"El código {codigo} está duplicado en esta compra. Cada producto debe tener un código único."
            )
        codigos_vistos.add(codigo)
    
    # 2. Validar que productos nuevos no tengan códigos existentes
    for producto in productos:
        es_nuevo = producto.get("es_nuevo", False)
        codigo = (producto.get("codigo") or "").upper().strip()
        
        if es_nuevo and codigo:
            # Verificar si el código ya existe en el inventario
            inventarios = await db.inventarios.find({
                "farmacia": sucursal_id,
                "activo": {"$ne": False}
            }).to_list(length=1000)
            
            for inventario in inventarios:
                inventario_id = str(inventario["_id"])
                
                # Buscar en items del inventario
                item_existente = await db.items_inventario.find_one({
                    "inventario_id": inventario_id,
                    "$or": [
                        {"codigo": {"$regex": f"^{codigo}$", "$options": "i"}},
                        {"codigo_producto": {"$regex": f"^{codigo}$", "$options": "i"}}
                    ]
                })
                
                if item_existente:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El código {codigo} ya existe en el inventario. Por favor, use el producto existente en lugar de crear uno nuevo."
                    )
                
                # También buscar en productos si existe esa colección
                producto_existente = await db.productos.find_one({
                    "sucursal": sucursal_id,
                    "$or": [
                        {"codigo": {"$regex": f"^{codigo}$", "$options": "i"}},
                        {"codigo_producto": {"$regex": f"^{codigo}$", "$options": "i"}}
                    ]
                })
                
                if producto_existente:
                    raise HTTPException(
                        status_code=400,
                        detail=f"El código {codigo} ya existe en el inventario. Por favor, use el producto existente en lugar de crear uno nuevo."
                    )
    
    # Si pasa todas las validaciones, crear la compra
    # ... resto del código para crear la compra ...
    
    return {"message": "Compra creada exitosamente", "compra_id": nueva_compra_id}
```

## ⚠️ IMPORTANTE

1. **La búsqueda de códigos debe ser case-insensitive** (no distinguir mayúsculas/minúsculas)
2. **Normalizar códigos a mayúsculas** antes de comparar
3. **Validar tanto en `codigo` como en `codigo_producto`** (el backend puede usar diferentes nombres)
4. **Buscar en todos los inventarios de la sucursal**, no solo en uno
5. **Retornar error 400 con mensaje claro** cuando se detecte un código duplicado

## 🔄 FLUJO DE VALIDACIÓN

1. **Frontend valida:**
   - Códigos duplicados dentro de la compra actual
   - Intenta verificar si el código existe en inventario (opcional, si el endpoint existe)

2. **Backend valida (OBLIGATORIO):**
   - Códigos duplicados dentro de la compra
   - Códigos de productos nuevos que ya existen en inventario
   - Retorna error 400 si encuentra duplicados

## 📊 EJEMPLO DE ERROR

**Request:**
```json
{
  "proveedorId": "proveedor_123",
  "farmacia": "01",
  "productos": [
    {
      "codigo": "010001",
      "nombre": "Producto 1",
      "es_nuevo": true
    },
    {
      "codigo": "010001",
      "nombre": "Producto 2",
      "es_nuevo": true
    }
  ]
}
```

**Response (Error 400):**
```json
{
  "detail": "El código 010001 está duplicado en esta compra. Cada producto debe tener un código único."
}
```

**O si el código ya existe en inventario:**
```json
{
  "detail": "El código 010001 ya existe en el inventario. Por favor, use el producto existente en lugar de crear uno nuevo."
}
```

