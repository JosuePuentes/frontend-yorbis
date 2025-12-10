# 🔧 INSTRUCCIONES BACKEND: Cargar Inventario desde Excel con Utilidad

## 📌 REQUERIMIENTO

El frontend ahora envía inventario desde Excel con las columnas: **CODIGO, DESCRIPCION, MARCA, COSTO, UTILIDAD, EXISTENCIA**.

El backend debe:
1. Recibir estos campos
2. Calcular el precio automáticamente: **PRECIO = COSTO + UTILIDAD**
3. Guardar el producto con todos los campos

---

## 📋 ENDPOINT: `POST /inventarios/upload-excel`

### Request Body

```json
{
  "sucursal": "sucursal_id",
  "productos": [
    {
      "codigo": "PROD001",
      "nombre": "Aspirina 500mg",
      "descripcion": "Aspirina 500mg",
      "marca": "Bayer",
      "costo": 2.50,
      "utilidad": 1.25,
      "precio": 3.75,  // Calculado: costo + utilidad
      "stock": 100
    }
  ]
}
```

### Campos del Request

- `sucursal` (string, requerido): ID de la sucursal
- `productos` (array, requerido): Array de productos con:
  - `codigo` (string): Código del producto
  - `nombre` (string): Nombre/descripción del producto
  - `descripcion` (string): Descripción completa
  - `marca` (string): Marca del producto
  - `costo` (number): Costo del producto
  - `utilidad` (number): Utilidad en dinero (NO porcentaje)
  - `precio` (number): Precio de venta (calculado: costo + utilidad)
  - `stock` (number): Cantidad en existencia

---

## 🔧 IMPLEMENTACIÓN REQUERIDA

### Paso 1: Validar y Procesar Productos

```python
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
from datetime import datetime
from bson import ObjectId

router = APIRouter()

class ProductoInventario(BaseModel):
    codigo: str
    nombre: str
    descripcion: str = ""
    marca: str = ""
    costo: float
    utilidad: float  # ✅ NUEVO: Utilidad en dinero
    precio: float  # Precio calculado: costo + utilidad
    stock: float

class UploadInventarioRequest(BaseModel):
    sucursal: str
    productos: List[ProductoInventario]

@router.post("/inventarios/upload-excel")
async def upload_inventario_excel(
    request: UploadInventarioRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permisos
    if "acceso_admin" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permisos")
    
    # Validar sucursal
    sucursal = await db.sucursales.find_one({"_id": ObjectId(request.sucursal)})
    if not sucursal:
        raise HTTPException(status_code=404, detail="Sucursal no encontrada")
    
    agregados = 0
    actualizados = 0
    errores = []
    
    for idx, producto in enumerate(request.productos):
        try:
            # ✅ VALIDAR: Calcular precio si no viene o no coincide
            precio_calculado = producto.costo + producto.utilidad
            
            # Si el precio enviado no coincide con el calculado, usar el calculado
            if abs(producto.precio - precio_calculado) > 0.01:
                precio_final = precio_calculado
            else:
                precio_final = producto.precio
            
            # ✅ CALCULAR: Porcentaje de utilidad para referencia
            porcentaje_utilidad = 0
            if producto.costo > 0:
                porcentaje_utilidad = (producto.utilidad / producto.costo) * 100
            
            # Buscar producto existente por código y sucursal
            producto_existente = await db.productos.find_one({
                "codigo": producto.codigo,
                "sucursal": request.sucursal
            })
            
            # Preparar datos del producto
            producto_data = {
                "codigo": producto.codigo,
                "nombre": producto.nombre,
                "descripcion": producto.descripcion or producto.nombre,
                "marca": producto.marca,
                "existencia": producto.stock,
                "cantidad": producto.stock,  # Alias para compatibilidad
                "costo": producto.costo,
                "costo_unitario": producto.costo,  # Alias
                "precio": precio_final,
                "precio_unitario": precio_final,  # Alias
                "precio_venta": precio_final,  # Alias
                "utilidad": producto.utilidad,  # ✅ NUEVO: Utilidad en dinero
                "utilidad_contable": producto.utilidad,  # Alias
                "porcentaje_ganancia": porcentaje_utilidad,  # ✅ NUEVO: Porcentaje calculado
                "sucursal": request.sucursal,
                "fecha_actualizacion": datetime.now()
            }
            
            if producto_existente:
                # Actualizar producto existente
                await db.productos.update_one(
                    {"_id": producto_existente["_id"]},
                    {"$set": producto_data}
                )
                actualizados += 1
            else:
                # Crear nuevo producto
                producto_data["fecha_creacion"] = datetime.now()
                await db.productos.insert_one(producto_data)
                agregados += 1
                
        except Exception as e:
            errores.append({
                "fila": idx + 2,  # +2 porque la fila 1 es el encabezado
                "codigo": producto.codigo,
                "error": str(e)
            })
    
    return {
        "message": "Inventario cargado exitosamente",
        "agregados": agregados,
        "actualizados": actualizados,
        "errores": errores,
        "total_procesados": len(request.productos)
    }
```

---

## 📊 ESTRUCTURA DE BASE DE DATOS

### Colección: `productos` (o `items_inventario`)

```javascript
{
  _id: ObjectId,
  codigo: String,
  nombre: String,
  descripcion: String,
  marca: String,
  existencia: Number,
  cantidad: Number,  // Alias de existencia
  costo: Number,
  costo_unitario: Number,  // Alias de costo
  precio: Number,  // Precio de venta (costo + utilidad)
  precio_unitario: Number,  // Alias de precio
  precio_venta: Number,  // Alias de precio
  utilidad: Number,  // ✅ NUEVO: Utilidad en dinero
  utilidad_contable: Number,  // Alias de utilidad
  porcentaje_ganancia: Number,  // ✅ NUEVO: Porcentaje de utilidad
  sucursal: String,  // ID de la sucursal
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

---

## ✅ VALIDACIONES REQUERIDAS

### 1. Validar Precio Calculado

```python
# El precio debe ser: costo + utilidad
precio_calculado = producto.costo + producto.utilidad

# Si el precio enviado no coincide, usar el calculado
if abs(producto.precio - precio_calculado) > 0.01:
    precio_final = precio_calculado
else:
    precio_final = producto.precio
```

### 2. Validar Valores Positivos

```python
# Costo, utilidad y existencia deben ser >= 0
if producto.costo < 0:
    raise ValueError(f"Costo no puede ser negativo para producto {producto.codigo}")

if producto.utilidad < 0:
    raise ValueError(f"Utilidad no puede ser negativa para producto {producto.codigo}")

if producto.stock < 0:
    raise ValueError(f"Existencia no puede ser negativa para producto {producto.codigo}")
```

### 3. Calcular Porcentaje de Utilidad

```python
# Calcular porcentaje de utilidad para referencia
porcentaje_utilidad = 0
if producto.costo > 0:
    porcentaje_utilidad = (producto.utilidad / producto.costo) * 100
```

---

## 📝 EJEMPLO COMPLETO

### Request

```json
{
  "sucursal": "01",
  "productos": [
    {
      "codigo": "PROD001",
      "nombre": "Aspirina 500mg",
      "descripcion": "Aspirina 500mg caja x 10",
      "marca": "Bayer",
      "costo": 2.50,
      "utilidad": 1.25,
      "precio": 3.75,
      "stock": 100
    },
    {
      "codigo": "PROD002",
      "nombre": "Paracetamol 500mg",
      "descripcion": "Paracetamol 500mg caja x 10",
      "marca": "Genérico",
      "costo": 1.80,
      "utilidad": 0.90,
      "precio": 2.70,
      "stock": 50
    }
  ]
}
```

### Response

```json
{
  "message": "Inventario cargado exitosamente",
  "agregados": 2,
  "actualizados": 0,
  "errores": [],
  "total_procesados": 2
}
```

---

## 🔍 CÁLCULOS IMPORTANTES

### Precio de Venta

```
PRECIO = COSTO + UTILIDAD
```

**Ejemplo:**
- Costo: $2.50
- Utilidad: $1.25
- Precio: $3.75

### Porcentaje de Utilidad

```
PORCENTAJE_UTILIDAD = (UTILIDAD / COSTO) * 100
```

**Ejemplo:**
- Costo: $2.50
- Utilidad: $1.25
- Porcentaje: (1.25 / 2.50) * 100 = 50%

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] El endpoint recibe `utilidad` en el request
- [ ] El precio se calcula como `costo + utilidad`
- [ ] Se guarda el campo `utilidad` en la base de datos
- [ ] Se calcula y guarda el `porcentaje_ganancia`
- [ ] Se validan valores negativos
- [ ] Se manejan errores por producto sin detener todo el proceso
- [ ] Se retorna estadísticas de productos agregados y actualizados

---

**Última actualización:** 2025-01-15

