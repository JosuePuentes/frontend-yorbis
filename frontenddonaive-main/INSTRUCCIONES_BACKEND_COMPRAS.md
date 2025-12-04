# Instrucciones para el Backend - Módulo de Compras

## Descripción

El frontend ahora incluye un módulo completo de compras que permite gestionar proveedores y crear compras con productos del inventario o nuevos productos.

## Índice

1. [Endpoints Necesarios](#endpoints-necesarios)
   - [GET /proveedores](#1-get-proveedores)
   - [POST /proveedores](#2-post-proveedores)
   - [Búsqueda de Productos](#3-búsqueda-de-productos)
   - [POST /compras](#4-post-compras)
2. [Estructura de Base de Datos](#estructura-de-base-de-datos)
3. [Cálculo de Precio con Dólar Negro](#cálculo-de-precio-con-dólar-negro)
4. [Permisos](#permisos)
5. [Notas Importantes](#notas-importantes)

## Endpoints Necesarios

### 1. GET /proveedores

**Descripción:** Obtiene la lista de todos los proveedores.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin`

**Response (200 OK):**
```json
[
  {
    "_id": "proveedor_id",
    "nombre": "Distribuidora ABC",
    "rif": "J-12345678-9",
    "telefono": "0412-1234567",
    "dias_credito": 30,
    "descuento_comercial": 5.0,
    "descuento_pronto_pago": 2.0,
    "fecha_creacion": "2025-01-15T10:30:00Z",
    "fecha_actualizacion": "2025-01-15T10:30:00Z"
  }
]
```

### 2. POST /proveedores

**Descripción:** Crea un nuevo proveedor.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin`

**Request Body:**
```json
{
  "nombre": "Distribuidora ABC",
  "rif": "J-12345678-9",
  "telefono": "0412-1234567",
  "dias_credito": 30,
  "descuento_comercial": 5.0,
  "descuento_pronto_pago": 2.0
}
```

**Campos del Request:**
- `nombre` (string, requerido): Nombre del proveedor
- `rif` (string, requerido): RIF del proveedor
- `telefono` (string, requerido): Teléfono del proveedor
- `dias_credito` (number, opcional): Días de crédito (default: 0)
- `descuento_comercial` (number, opcional): Descuento comercial en porcentaje (default: 0)
- `descuento_pronto_pago` (number, opcional): Descuento por pronto pago en porcentaje (default: 0)

**Response (200 OK):**
```json
{
  "message": "Proveedor creado exitosamente",
  "proveedor": {
    "_id": "proveedor_id",
    "nombre": "Distribuidora ABC",
    "rif": "J-12345678-9",
    "telefono": "0412-1234567",
    "dias_credito": 30,
    "descuento_comercial": 5.0,
    "descuento_pronto_pago": 2.0,
    "fecha_creacion": "2025-01-15T10:30:00Z",
    "fecha_actualizacion": "2025-01-15T10:30:00Z"
  }
}
```

### 3. Búsqueda de Productos

**Opción A: Endpoint dedicado (Recomendado)**

**GET /productos?search={query}**

**Descripción:** Busca productos en todos los inventarios del sistema (sin filtrar por sucursal).

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `compras`

**Query Parameters:**
- `search` (string, opcional): Término de búsqueda para buscar por código o descripción

**Response (200 OK):**
```json
[
  {
    "_id": "producto_id",
    "codigo": "PROD001",
    "descripcion": "Aspirina 500mg",
    "marca": "Bayer",
    "costo_unitario": 1.0,
    "precio_unitario": 1.5,
    "cantidad": 50,
    "lotes": [
      {
        "lote": "LOTE001",
        "fecha_vencimiento": "2025-12-31",
        "cantidad": 30
      },
      {
        "lote": "LOTE002",
        "fecha_vencimiento": "2026-01-15",
        "cantidad": 20
      }
    ],
    "inventario_id": "inventario_id",
    "sucursal": "sucursal_id"
  }
]
```

**Notas:**
- Este endpoint debe buscar en TODOS los inventarios, no solo en el de la sucursal actual
- Debe retornar los lotes existentes del producto si los tiene
- La búsqueda debe ser por código o descripción (case-insensitive, partial match)

**Opción B: Usar endpoints existentes (Implementación actual del frontend)**

El frontend actualmente usa los siguientes endpoints:
- `GET /inventarios` - Para obtener todos los inventarios
- `GET /inventarios/{inventario_id}/items` - Para obtener items de cada inventario

Luego filtra localmente por código o descripción. Esta opción funciona pero es menos eficiente.

### 4. POST /compras

**Descripción:** Crea una nueva compra.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin`

**Request Body:**
```json
{
  "proveedor_id": "proveedor_id",
  "pagar_en_dolar_negro": true,
  "dolar_bcv": 240.0,
  "dolar_negro": 372.0,
  "items": [
    {
      "codigo": "PROD001",
      "descripcion": "Aspirina 500mg",
      "marca": "Bayer",
      "costo": 1.0,
      "costo_ajustado": 1.55,
      "utilidad": 0.5,
      "precio_venta": 2.05,
      "cantidad": 100,
      "fecha_vencimiento": "2025-12-31",
      "lote": "LOTE001",
      "es_nuevo": false,
      "producto_id": "producto_id_existente"
    },
    {
      "codigo": "PROD002",
      "descripcion": "Paracetamol 500mg",
      "marca": "Genérico",
      "costo": 0.8,
      "costo_ajustado": 1.24,
      "utilidad": 0.4,
      "precio_venta": 1.64,
      "cantidad": 50,
      "fecha_vencimiento": "2026-01-15",
      "lote": "LOTE002",
      "es_nuevo": true,
      "producto_id": null,
      "lotes_existentes": []
    },
    {
      "codigo": "PROD003",
      "descripcion": "Ibuprofeno 400mg",
      "marca": "Genérico",
      "costo": 0.9,
      "costo_ajustado": 0.9,
      "utilidad": 0.3,
      "precio_venta": 1.2,
      "cantidad": 75,
      "fecha_vencimiento": "2025-11-30",
      "lote": "LOTE003",
      "es_nuevo": false,
      "producto_id": "producto_id_existente",
      "lotes_existentes": [
        {
          "lote": "LOTE001",
          "fecha_vencimiento": "2025-10-15",
          "cantidad": 25
        }
      ]
    }
  ]
}
```

**Campos del Request:**
- `proveedor_id` (string, requerido): ID del proveedor
- `pagar_en_dolar_negro` (boolean, requerido): Indica si la compra se paga en dólar negro
- `dolar_bcv` (number, requerido): Precio del dólar BCV al momento de la compra
- `dolar_negro` (number, requerido): Precio del dólar negro al momento de la compra
- `items` (array, requerido): Array de items de la compra
  - `codigo` (string, requerido): Código del producto
  - `descripcion` (string, requerido): Descripción del producto
  - `marca` (string, opcional): Marca del producto
  - `costo` (number, requerido): Costo original del producto
  - `costo_ajustado` (number, requerido): Costo con ajuste de dólar negro si aplica
  - `utilidad` (number, requerido): Utilidad del producto
  - `precio_venta` (number, requerido): Precio de venta (costo_ajustado + utilidad)
  - `cantidad` (number, requerido): Cantidad comprada
  - `fecha_vencimiento` (string, opcional): Fecha de vencimiento del nuevo lote (formato: YYYY-MM-DD)
  - `lote` (string, opcional): Número del nuevo lote a agregar
  - `es_nuevo` (boolean, requerido): Indica si es un producto nuevo o existente
  - `producto_id` (string, opcional): ID del producto si existe en inventario
  - `lotes_existentes` (array, opcional): Array de lotes existentes del producto en inventario
    - `lote` (string): Número de lote existente
    - `fecha_vencimiento` (string): Fecha de vencimiento del lote (formato: YYYY-MM-DD)
    - `cantidad` (number): Cantidad en ese lote

**Lógica del Backend:**

1. **Para productos existentes (`es_nuevo: false`):**
   - Actualizar el producto en el inventario:
     - Actualizar `costo_unitario` con `costo_ajustado`
     - Actualizar `precio_unitario` con `precio_venta`
     - Sumar `cantidad` a la existencia actual
     - Si hay `fecha_vencimiento` y `lote` (nuevo lote), agregar el nuevo lote al array `lotes`:
       - El nuevo lote debe agregarse con la `cantidad` especificada en el item
       - Los `lotes_existentes` se mantienen sin cambios (solo se envían para referencia)
       - Si el lote ya existe, sumar la cantidad a ese lote en lugar de crear uno nuevo

2. **Para productos nuevos (`es_nuevo: true`):**
   - Crear un nuevo producto en el inventario con:
     - `codigo`: código del producto
     - `descripcion`: descripción del producto
     - `marca`: marca del producto (si se proporciona)
     - `costo_unitario`: `costo_ajustado`
     - `precio_unitario`: `precio_venta`
     - `cantidad`: cantidad comprada
     - `lotes`: array con el lote si se proporciona `fecha_vencimiento` y `lote`
     - `inventario_id`: ID del inventario actual o crear uno nuevo
     - `sucursal`: ID de la sucursal (debe determinarse según la lógica del sistema)

3. **Registrar la compra:**
   - Guardar un registro de la compra con todos los datos
   - Incluir fecha de compra, proveedor, totales, etc.

**Response (200 OK):**
```json
{
  "message": "Compra creada exitosamente",
  "compra": {
    "_id": "compra_id",
    "proveedor_id": "proveedor_id",
    "fecha": "2025-01-15T10:30:00Z",
    "pagar_en_dolar_negro": true,
    "dolar_bcv": 240.0,
    "dolar_negro": 372.0,
    "total_costo": 155.0,
    "total_precio_venta": 205.0,
    "items": [...],
    "usuario_correo": "usuario@example.com"
  }
}
```

## Estructura de Base de Datos

### Colección/Tabla: proveedores

```javascript
{
  _id: ObjectId,
  nombre: String,
  rif: String,              // Único
  telefono: String,
  dias_credito: Number,      // Default: 0
  descuento_comercial: Number,  // Default: 0
  descuento_pronto_pago: Number, // Default: 0
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

### Colección/Tabla: compras

```javascript
{
  _id: ObjectId,
  proveedor_id: ObjectId,    // FK a proveedores
  fecha: Date,
  pagar_en_dolar_negro: Boolean,
  dolar_bcv: Number,
  dolar_negro: Number,
  total_costo: Number,
  total_precio_venta: Number,
  items: [{
    codigo: String,
    descripcion: String,
    marca: String,
    costo: Number,
    costo_ajustado: Number,
    utilidad: Number,
    precio_venta: Number,
    cantidad: Number,
    fecha_vencimiento: Date,
    lote: String,
    es_nuevo: Boolean,
    producto_id: ObjectId    // FK a productos (si existe)
  }],
  usuario_correo: String,
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

## Cálculo de Precio con Dólar Negro

**Fórmula:**
```
diferencia_porcentaje = ((dolar_negro - dolar_bcv) / dolar_bcv) * 100
costo_ajustado = costo * (1 + diferencia_porcentaje / 100)
precio_venta = costo_ajustado + utilidad
```

**Ejemplo:**
- Dólar BCV: 240 Bs
- Dólar Negro: 372 Bs
- Diferencia: 132 Bs
- Diferencia %: 55%
- Costo producto: $1.00
- Costo ajustado: $1.55 (1.00 * 1.55)
- Utilidad: $0.50
- Precio venta: $2.05 (1.55 + 0.50)

## Permisos

El módulo de compras requiere el permiso `compras` en el sistema de usuarios. Este permiso debe:
- Estar disponible en la lista de permisos del sistema
- Poder asignarse a usuarios desde "Modificar Usuarios" y "Register"
- Ser verificado en todos los endpoints del módulo de compras

## Notas Importantes

1. **Actualización de Inventario:**
   - Los productos existentes deben actualizarse con los nuevos costos y precios
   - La cantidad debe sumarse a la existencia actual
   - Los lotes deben agregarse o actualizarse correctamente
   - Si un producto tiene lotes existentes y se agrega un nuevo lote, ambos deben mantenerse

2. **Productos Nuevos:**
   - Deben crearse en el inventario con todos los campos necesarios
   - Debe asignarse a un inventario y sucursal según la lógica del sistema
   - Si se proporciona lote y fecha de vencimiento, deben agregarse al array de lotes

3. **Validaciones:**
   - Verificar que el proveedor existe
   - Validar que todos los campos requeridos estén presentes
   - Validar que las cantidades sean mayores a 0
   - Validar que los costos y precios sean mayores a 0
   - Validar que `dias_credito`, `descuento_comercial` y `descuento_pronto_pago` sean números (pueden ser 0)

4. **Transacciones:**
   - Se recomienda usar transacciones de base de datos para asegurar que la compra y la actualización del inventario se completen ambas o ninguna
   - Si falla la actualización del inventario, la compra no debe guardarse

5. **Lotes:**
   - Los `lotes_existentes` se envían solo para referencia, no deben modificarse
   - Solo el nuevo lote (si se proporciona) debe agregarse al inventario
   - Si el lote ya existe, sumar la cantidad a ese lote en lugar de crear uno duplicado

## Ejemplos de Implementación (Python/FastAPI)

### Modelo de Proveedor

```python
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProveedorBase(BaseModel):
    nombre: str
    rif: str
    telefono: str
    dias_credito: int = 0
    descuento_comercial: float = 0.0
    descuento_pronto_pago: float = 0.0

class Proveedor(ProveedorBase):
    _id: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None

    class Config:
        from_attributes = True
```

### Modelo de Compra

```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LoteExistente(BaseModel):
    lote: str
    fecha_vencimiento: Optional[str] = None
    cantidad: Optional[int] = None

class ItemCompra(BaseModel):
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo: float
    costo_ajustado: float
    utilidad: float
    precio_venta: float
    cantidad: int
    fecha_vencimiento: Optional[str] = None
    lote: Optional[str] = None
    es_nuevo: bool
    producto_id: Optional[str] = None
    lotes_existentes: Optional[List[LoteExistente]] = []

class CompraCreate(BaseModel):
    proveedor_id: str
    pagar_en_dolar_negro: bool
    dolar_bcv: float
    dolar_negro: float
    items: List[ItemCompra]

class Compra(CompraCreate):
    _id: Optional[str] = None
    fecha: Optional[datetime] = None
    total_costo: Optional[float] = None
    total_precio_venta: Optional[float] = None
    usuario_correo: Optional[str] = None
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
```

### Endpoint POST /compras (Ejemplo)

```python
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

router = APIRouter()

@router.post("/compras")
async def crear_compra(
    compra: CompraCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para crear compras")
    
    # Verificar que el proveedor existe
    proveedor = await db.proveedores.find_one({"_id": ObjectId(compra.proveedor_id)})
    if not proveedor:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    
    # Calcular totales
    total_costo = sum(item.costo_ajustado * item.cantidad for item in compra.items)
    total_precio_venta = sum(item.precio_venta * item.cantidad for item in compra.items)
    
    # Procesar cada item
    for item in compra.items:
        if item.es_nuevo:
            # Crear nuevo producto
            nuevo_producto = {
                "codigo": item.codigo,
                "descripcion": item.descripcion,
                "marca": item.marca,
                "costo_unitario": item.costo_ajustado,
                "precio_unitario": item.precio_venta,
                "cantidad": item.cantidad,
                "lotes": [],
                "sucursal": current_user.get("sucursal_id"),  # Ajustar según tu lógica
                "fecha_creacion": datetime.now(),
                "fecha_actualizacion": datetime.now()
            }
            
            # Agregar lote si se proporciona
            if item.lote and item.fecha_vencimiento:
                nuevo_producto["lotes"].append({
                    "lote": item.lote,
                    "fecha_vencimiento": item.fecha_vencimiento,
                    "cantidad": item.cantidad
                })
            
            # Insertar producto (ajustar según tu estructura de inventario)
            await db.productos.insert_one(nuevo_producto)
        else:
            # Actualizar producto existente
            producto = await db.productos.find_one({"_id": ObjectId(item.producto_id)})
            if not producto:
                raise HTTPException(status_code=404, detail=f"Producto {item.codigo} no encontrado")
            
            # Actualizar costos y precios
            update_data = {
                "costo_unitario": item.costo_ajustado,
                "precio_unitario": item.precio_venta,
                "cantidad": producto.get("cantidad", 0) + item.cantidad,
                "fecha_actualizacion": datetime.now()
            }
            
            # Agregar nuevo lote si se proporciona
            if item.lote and item.fecha_vencimiento:
                lotes = producto.get("lotes", [])
                # Verificar si el lote ya existe
                lote_existente = next((l for l in lotes if l.get("lote") == item.lote), None)
                if lote_existente:
                    # Sumar cantidad al lote existente
                    lote_existente["cantidad"] = lote_existente.get("cantidad", 0) + item.cantidad
                else:
                    # Agregar nuevo lote
                    lotes.append({
                        "lote": item.lote,
                        "fecha_vencimiento": item.fecha_vencimiento,
                        "cantidad": item.cantidad
                    })
                update_data["lotes"] = lotes
            
            await db.productos.update_one(
                {"_id": ObjectId(item.producto_id)},
                {"$set": update_data}
            )
    
    # Guardar compra
    compra_doc = {
        "proveedor_id": ObjectId(compra.proveedor_id),
        "fecha": datetime.now(),
        "pagar_en_dolar_negro": compra.pagar_en_dolar_negro,
        "dolar_bcv": compra.dolar_bcv,
        "dolar_negro": compra.dolar_negro,
        "total_costo": total_costo,
        "total_precio_venta": total_precio_venta,
        "items": [item.dict() for item in compra.items],
        "usuario_correo": current_user.get("correo"),
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    result = await db.compras.insert_one(compra_doc)
    compra_doc["_id"] = str(result.inserted_id)
    
    return {"message": "Compra creada exitosamente", "compra": compra_doc}
```

### Endpoint GET /proveedores (Ejemplo)

```python
@router.get("/proveedores")
async def obtener_proveedores(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver proveedores")
    
    proveedores = await db.proveedores.find({}).to_list(length=1000)
    
    # Convertir ObjectId a string
    for proveedor in proveedores:
        proveedor["_id"] = str(proveedor["_id"])
        # Asegurar que los campos numéricos existan
        proveedor.setdefault("dias_credito", 0)
        proveedor.setdefault("descuento_comercial", 0.0)
        proveedor.setdefault("descuento_pronto_pago", 0.0)
    
    return proveedores
```

### Endpoint POST /proveedores (Ejemplo)

```python
@router.post("/proveedores")
async def crear_proveedor(
    proveedor: ProveedorBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para crear proveedores")
    
    # Verificar que el RIF no exista
    existente = await db.proveedores.find_one({"rif": proveedor.rif})
    if existente:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con este RIF")
    
    proveedor_doc = {
        **proveedor.dict(),
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    result = await db.proveedores.insert_one(proveedor_doc)
    proveedor_doc["_id"] = str(result.inserted_id)
    
    return {"message": "Proveedor creado exitosamente", "proveedor": proveedor_doc}
```

