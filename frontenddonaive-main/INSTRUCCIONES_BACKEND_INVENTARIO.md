# Instrucciones para Backend - Módulo de Inventario desde Excel

## Endpoints Necesarios

### 1. POST /inventarios/upload-excel

**Descripción:** Sube inventario desde un archivo Excel para una sucursal específica.

**Autenticación:** Requiere token JWT en el header `Authorization: Bearer <token>`

**Permiso:** Requiere permiso `acceso_admin`

**Request Body:**
```json
{
  "sucursal": "01",
  "productos": [
    {
      "codigo": "PROD001",
      "descripcion": "Aspirina 500mg",
      "marca": "Bayer",
      "existencia": 100,
      "costo": 2.50,
      "precio": 5.00
    },
    {
      "codigo": "PROD002",
      "descripcion": "Paracetamol 500mg",
      "marca": "Genérico",
      "existencia": 50,
      "costo": 1.80,
      "precio": 3.50
    }
  ]
}
```

**Campos del Request:**
- `sucursal` (string, requerido): ID de la sucursal donde se agregará el inventario
- `productos` (array, requerido): Array de objetos producto con:
  - `codigo` (string, opcional): Código del producto (puede estar vacío)
  - `descripcion` (string, opcional): Descripción/nombre del producto (puede estar vacío)
  - `marca` (string, opcional): Marca del producto (puede estar vacío)
  - `existencia` (number, opcional): Cantidad en stock (default: 0 si está vacío)
  - `costo` (number, opcional): Costo del producto (default: 0 si está vacío)
  - `precio` (number, opcional): Precio de venta del producto (default: 0 si está vacío)

**Formato del Excel:**
El archivo Excel debe tener exactamente estas columnas en este orden:
1. **CODIGO** (obligatorio)
2. **DESCRIPCION** (obligatorio)
3. **MARCA** (obligatorio)
4. **COSTO** (obligatorio)
5. **PRECIO** (obligatorio)
6. **EXISTENCIA** (obligatorio)

**IMPORTANTE:** Todas las columnas deben existir en el Excel, pero pueden estar vacías. El sistema guardará los productos incluso con campos vacíos (código, descripción, marca, etc.).

**Response (200 OK):**
```json
{
  "message": "Inventario cargado exitosamente",
  "sucursal": "01",
  "productos_agregados": 150,
  "productos_actualizados": 10
}
```

**Errores posibles:**
- `400 Bad Request`: Si faltan campos requeridos o los datos son inválidos
- `401 Unauthorized`: Si no hay token o es inválido
- `403 Forbidden`: Si el usuario no tiene permisos
- `404 Not Found`: Si la sucursal no existe

**Validaciones:**
- Las columnas deben existir en el Excel, pero pueden estar vacías
- Los campos de texto (código, descripción, marca) pueden estar vacíos
- La existencia, costo y precio pueden ser 0 o estar vacíos (se tratarán como 0)
- El código no necesita ser único si está vacío (se permiten múltiples productos sin código)
- Si un producto tiene todos los campos vacíos, se puede omitir o guardar según tu lógica de negocio
- El sistema debe aceptar productos con cualquier combinación de campos vacíos

---

### 2. GET /punto-venta/productos/buscar

**Descripción:** Busca productos filtrando por sucursal. Ya está implementado, pero debe asegurarse de que filtre correctamente.

**Query Parameters:**
- `q` (string, requerido): Término de búsqueda (mínimo 2 caracteres)
- `sucursal` (string, requerido): ID de la sucursal

**Response:**
```json
[
  {
    "id": "producto_id",
    "nombre": "Aspirina 500mg",
    "codigo": "PROD001",
    "precio": 5.00,
    "precio_usd": 0.14,
    "stock": 100,
    "sucursal": "01",
    "marca": "Bayer"
  }
]
```

**Importante:** Los productos deben estar asociados a la sucursal especificada en el parámetro `sucursal`.

---

## Estructura de Base de Datos Sugerida

### Colección/Tabla: productos

```javascript
{
  _id: ObjectId,
  codigo: String,           // Código único del producto
  nombre: String,           // Descripción/nombre del producto
  descripcion: String,      // Descripción completa
  marca: String,            // Marca (opcional)
  existencia: Number,       // Cantidad en stock
  costo: Number,            // Costo del producto
  precio: Number,           // Precio de venta
  precio_usd: Number,        // Precio en USD (opcional, calculado)
  sucursal: String,         // ID de la sucursal (FK)
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

**Índices recomendados:**
- Índice único compuesto: `{ codigo: 1, sucursal: 1 }` (para evitar duplicados por sucursal)
- Índice: `{ sucursal: 1 }` (para búsquedas rápidas por sucursal)
- Índice de texto: `{ nombre: "text", descripcion: "text" }` (para búsquedas)

---

## Lógica de Negocio

### Al subir inventario desde Excel:

1. **Validar sucursal:** Verificar que la sucursal existe
2. **Procesar cada producto:**
   - Si el producto con ese `codigo` y `sucursal` ya existe:
     - Actualizar: `existencia`, `costo`, `precio`, `marca`, `descripcion`
     - Actualizar `fecha_actualizacion`
   - Si no existe:
     - Crear nuevo producto con todos los campos
     - Establecer `fecha_creacion` y `fecha_actualizacion`
3. **Calcular precio_usd:** Si hay tasa del día, calcular `precio_usd = precio / tasa_dia`
4. **Retornar estadísticas:** Cantidad de productos agregados y actualizados

### Al buscar productos en punto de venta:

1. **Filtrar por sucursal:** Solo mostrar productos de la sucursal seleccionada
2. **Filtrar por búsqueda:** Buscar en `nombre`, `descripcion` o `codigo`
3. **Mostrar stock:** Incluir el campo `stock` o `existencia` en la respuesta

---

## Ejemplo de Implementación (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List

router = APIRouter()

class ProductoInventario(BaseModel):
    codigo: str
    descripcion: str
    marca: str = ""
    existencia: float
    costo: float
    precio: float

class UploadInventarioRequest(BaseModel):
    sucursal: str
    productos: List[ProductoInventario]

@router.post("/inventarios/upload-excel")
async def upload_inventario_excel(
    request: UploadInventarioRequest,
    current_user: dict = Depends(get_current_user)
):
    # Verificar permisos
    if "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    # Validar sucursal
    sucursal = await db.sucursales.find_one({"_id": request.sucursal})
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    
    agregados = 0
    actualizados = 0
    
    for producto in request.productos:
        # Buscar producto existente
        producto_existente = await db.productos.find_one({
            "codigo": producto.codigo,
            "sucursal": request.sucursal
        })
        
        producto_data = {
            "codigo": producto.codigo,
            "nombre": producto.descripcion,
            "descripcion": producto.descripcion,
            "marca": producto.marca,
            "existencia": producto.existencia,
            "costo": producto.costo,
            "precio": producto.precio,
            "sucursal": request.sucursal,
            "fecha_actualizacion": datetime.now()
        }
        
        if producto_existente:
            # Actualizar
            await db.productos.update_one(
                {"_id": producto_existente["_id"]},
                {"$set": producto_data}
            )
            actualizados += 1
        else:
            # Crear nuevo
            producto_data["fecha_creacion"] = datetime.now()
            await db.productos.insert_one(producto_data)
            agregados += 1
    
    return {
        "message": "Inventario cargado exitosamente",
        "sucursal": request.sucursal,
        "productos_agregados": agregados,
        "productos_actualizados": actualizados
    }
```

---

## Notas Importantes

1. **Código único por sucursal:** El mismo código puede existir en diferentes sucursales, pero debe ser único dentro de cada sucursal.

2. **Stock/existencia:** Este campo se debe actualizar cuando se realizan ventas en el punto de venta.

3. **Precios:** El backend puede calcular automáticamente `precio_usd` usando la tasa del día si es necesario.

4. **Validaciones:** Validar que todos los números sean positivos y que los campos requeridos no estén vacíos.

