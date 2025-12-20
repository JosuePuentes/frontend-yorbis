# 📊 INSTRUCCIONES BACKEND: Módulo Libro de Ventas

## 🎯 REQUERIMIENTO PRINCIPAL

Crear un módulo "Libro de Ventas" que muestre todas las ventas realizadas en formato tipo Excel, donde cada fila representa un producto vendido. El módulo debe estar protegido por un permiso específico y permitir búsqueda por cliente y producto.

---

## 📋 PERMISO REQUERIDO

**Nombre del permiso:** `ver_libro_ventas`

Este permiso debe:
- Aparecer en la lista de permisos disponibles en el módulo de gestión de usuarios
- Ser asignable a usuarios desde el panel de administración
- Proteger el acceso al módulo en el frontend

---

## 🔌 ENDPOINT PRINCIPAL

### `GET /libro-ventas`

**Descripción:** Obtiene todas las ventas procesadas con sus items expandidos (una fila por item).

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters (opcionales):**
- `cliente` (string): Buscar por nombre o cédula del cliente
- `producto` (string): Buscar por nombre del producto
- `fecha_inicio` (string, formato: YYYY-MM-DD): Filtrar desde esta fecha
- `fecha_fin` (string, formato: YYYY-MM-DD): Filtrar hasta esta fecha
- `sucursal` (string): Filtrar por ID de sucursal
- `page` (number, default: 1): Número de página para paginación
- `limit` (number, default: 100): Cantidad de registros por página

**Ejemplo de Request:**
```
GET /libro-ventas?cliente=Juan&producto=SPRAY&fecha_inicio=2025-01-01&fecha_fin=2025-01-31
```

---

## 📊 ESTRUCTURA DE RESPUESTA

### Response Exitosa (200 OK)

```json
{
  "data": [
    {
      "numero_factura": "FAC-2025-001234",
      "fecha": "2025-01-15T10:30:00Z",
      "nombre_producto": "SPRAY DIESEL TOOLS AZUL CIELO",
      "codigo_producto": "12345",
      "cantidad": 2,
      "precio_venta": 3.00,
      "precio_venta_bs": 360.03,
      "subtotal": 6.00,
      "subtotal_bs": 720.06,
      "cliente_nombre": "Juan Pérez",
      "cliente_cedula": "12345678",
      "cliente_id": "690c40be93d9d9d635fbae83",
      "sucursal": "Santa Elena",
      "sucursal_id": "690c40be93d9d9d635fbaf5b",
      "cajero": "cajero@email.com",
      "descuento_aplicado": 0
    },
    {
      "numero_factura": "FAC-2025-001234",
      "fecha": "2025-01-15T10:30:00Z",
      "nombre_producto": "ESMALTE SINTETICO",
      "codigo_producto": "010001",
      "cantidad": 1,
      "precio_venta": 23.51,
      "precio_venta_bs": 999.18,
      "subtotal": 23.51,
      "subtotal_bs": 999.18,
      "cliente_nombre": "Juan Pérez",
      "cliente_cedula": "12345678",
      "cliente_id": "690c40be93d9d9d635fbae83",
      "sucursal": "Santa Elena",
      "sucursal_id": "690c40be93d9d9d635fbaf5b",
      "cajero": "cajero@email.com",
      "descuento_aplicado": 10
    }
  ],
  "totales": {
    "total_cantidad_productos": 3,
    "total_ventas_usd": 29.51,
    "total_ventas_bs": 1719.24,
    "total_facturas": 1
  },
  "paginacion": {
    "page": 1,
    "limit": 100,
    "total": 2,
    "total_pages": 1
  }
}
```

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Obtener Todas las Ventas Procesadas

```python
from fastapi import APIRouter, Depends, HTTPException, Query
from bson import ObjectId
from typing import Optional, List
from datetime import datetime
from pymongo import ASCENDING, DESCENDING

router = APIRouter()

@router.get("/libro-ventas")
async def obtener_libro_ventas(
    cliente: Optional[str] = Query(None, description="Buscar por nombre o cédula del cliente"),
    producto: Optional[str] = Query(None, description="Buscar por nombre del producto"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[str] = Query(None, description="Fecha fin (YYYY-MM-DD)"),
    sucursal: Optional[str] = Query(None, description="ID de sucursal"),
    page: int = Query(1, ge=1, description="Número de página"),
    limit: int = Query(100, ge=1, le=1000, description="Registros por página"),
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Obtiene el libro de ventas con items expandidos.
    Cada fila representa un producto vendido.
    """
    try:
        # Construir query base
        query = {
            "estado": "procesada"  # Solo ventas procesadas
        }
        
        # Filtro por sucursal
        if sucursal:
            query["sucursal"] = ObjectId(sucursal)
        
        # Filtro por fecha
        if fecha_inicio or fecha_fin:
            fecha_query = {}
            if fecha_inicio:
                fecha_inicio_obj = datetime.strptime(fecha_inicio, "%Y-%m-%d")
                fecha_query["$gte"] = fecha_inicio_obj
            if fecha_fin:
                fecha_fin_obj = datetime.strptime(fecha_fin, "%Y-%m-%d")
                fecha_fin_obj = fecha_fin_obj.replace(hour=23, minute=59, second=59)
                fecha_query["$lte"] = fecha_fin_obj
            query["fecha"] = fecha_query
        
        # Obtener ventas
        ventas = await db.ventas.find(query).sort("fecha", DESCENDING).to_list(length=None)
        
        # Expandir items en filas individuales
        filas_libro = []
        
        for venta in ventas:
            numero_factura = venta.get("numero_factura", str(venta["_id"]))
            fecha = venta.get("fecha", venta.get("fecha_creacion"))
            
            # Obtener información del cliente
            cliente_nombre = "Sin cliente"
            cliente_cedula = ""
            cliente_id = None
            
            if venta.get("cliente"):
                if isinstance(venta["cliente"], dict):
                    cliente_nombre = venta["cliente"].get("nombre", "Sin cliente")
                    cliente_cedula = venta["cliente"].get("cedula", "")
                    cliente_id = str(venta["cliente"].get("_id", ""))
                elif isinstance(venta["cliente"], ObjectId) or isinstance(venta["cliente"], str):
                    # Buscar cliente en la base de datos
                    cliente_obj = await db.clientes.find_one({
                        "_id": ObjectId(venta["cliente"]) if isinstance(venta["cliente"], str) else venta["cliente"]
                    })
                    if cliente_obj:
                        cliente_nombre = cliente_obj.get("nombre", "Sin cliente")
                        cliente_cedula = cliente_obj.get("cedula", "")
                        cliente_id = str(cliente_obj["_id"])
            
            # Obtener información de la sucursal
            sucursal_nombre = "Sin sucursal"
            sucursal_id = str(venta.get("sucursal", ""))
            
            if venta.get("sucursal"):
                if isinstance(venta["sucursal"], dict):
                    sucursal_nombre = venta["sucursal"].get("nombre", "Sin sucursal")
                elif isinstance(venta["sucursal"], ObjectId) or isinstance(venta["sucursal"], str):
                    sucursal_obj = await db.sucursales.find_one({
                        "_id": ObjectId(venta["sucursal"]) if isinstance(venta["sucursal"], str) else venta["sucursal"]
                    })
                    if sucursal_obj:
                        sucursal_nombre = sucursal_obj.get("nombre", "Sin sucursal")
            
            # Procesar cada item de la venta
            items = venta.get("items", [])
            
            for item in items:
                nombre_producto = item.get("nombre", "Sin nombre")
                codigo_producto = item.get("codigo", "")
                cantidad = item.get("cantidad", 0)
                precio_venta = item.get("precio_unitario_usd", item.get("precio_unitario", 0))
                precio_venta_bs = item.get("precio_unitario", 0)
                subtotal = item.get("subtotal_usd", item.get("subtotal", 0))
                subtotal_bs = item.get("subtotal", 0)
                descuento_aplicado = item.get("descuento_aplicado", 0)
                
                # Aplicar filtros de búsqueda
                incluir_fila = True
                
                # Filtro por cliente
                if cliente:
                    cliente_lower = cliente.lower()
                    if cliente_lower not in cliente_nombre.lower() and cliente_lower not in cliente_cedula.lower():
                        incluir_fila = False
                
                # Filtro por producto
                if producto and producto.lower() not in nombre_producto.lower():
                    incluir_fila = False
                
                if incluir_fila:
                    fila = {
                        "numero_factura": numero_factura,
                        "fecha": fecha.isoformat() if isinstance(fecha, datetime) else str(fecha),
                        "nombre_producto": nombre_producto,
                        "codigo_producto": codigo_producto,
                        "cantidad": cantidad,
                        "precio_venta": precio_venta,
                        "precio_venta_bs": precio_venta_bs,
                        "subtotal": subtotal,
                        "subtotal_bs": subtotal_bs,
                        "cliente_nombre": cliente_nombre,
                        "cliente_cedula": cliente_cedula,
                        "cliente_id": cliente_id,
                        "sucursal": sucursal_nombre,
                        "sucursal_id": sucursal_id,
                        "cajero": venta.get("cajero", ""),
                        "descuento_aplicado": descuento_aplicado
                    }
                    filas_libro.append(fila)
        
        # Ordenar por fecha (más reciente primero)
        filas_libro.sort(key=lambda x: x["fecha"], reverse=True)
        
        # Calcular totales
        total_cantidad_productos = sum(fila["cantidad"] for fila in filas_libro)
        total_ventas_usd = sum(fila["subtotal"] for fila in filas_libro)
        total_ventas_bs = sum(fila["subtotal_bs"] for fila in filas_libro)
        
        # Obtener número único de facturas
        numeros_factura_unicos = set(fila["numero_factura"] for fila in filas_libro)
        total_facturas = len(numeros_factura_unicos)
        
        # Paginación
        total_registros = len(filas_libro)
        total_pages = (total_registros + limit - 1) // limit
        inicio = (page - 1) * limit
        fin = inicio + limit
        filas_paginadas = filas_libro[inicio:fin]
        
        return {
            "data": filas_paginadas,
            "totales": {
                "total_cantidad_productos": total_cantidad_productos,
                "total_ventas_usd": round(total_ventas_usd, 2),
                "total_ventas_bs": round(total_ventas_bs, 2),
                "total_facturas": total_facturas
            },
            "paginacion": {
                "page": page,
                "limit": limit,
                "total": total_registros,
                "total_pages": total_pages
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener libro de ventas: {str(e)}"
        )
```

---

## 📝 ESTRUCTURA DE DATOS

### Colección: `ventas`

```javascript
{
  _id: ObjectId,
  numero_factura: String,  // "FAC-2025-001234"
  fecha: Date,
  estado: "procesada",  // Solo ventas procesadas
  sucursal: ObjectId | String,
  cajero: String,
  cliente: ObjectId | {
    _id: ObjectId,
    nombre: String,
    cedula: String
  },
  items: [
    {
      producto_id: ObjectId,
      nombre: String,  // Nombre del producto
      codigo: String,  // Código del producto
      cantidad: Number,
      precio_unitario: Number,  // Precio en Bs
      precio_unitario_usd: Number,  // Precio en USD
      subtotal: Number,  // Subtotal en Bs
      subtotal_usd: Number,  // Subtotal en USD
      descuento_aplicado: Number
    }
  ],
  total_usd: Number,
  total_bs: Number,
  tasa_dia: Number,
  fecha_creacion: Date
}
```

---

## 🔍 LÓGICA DE BÚSQUEDA

### Búsqueda por Cliente

La búsqueda debe ser case-insensitive y buscar en:
- Nombre del cliente
- Cédula del cliente

```python
if cliente:
    cliente_lower = cliente.lower()
    if cliente_lower not in cliente_nombre.lower() and cliente_lower not in cliente_cedula.lower():
        incluir_fila = False
```

### Búsqueda por Producto

La búsqueda debe ser case-insensitive y buscar en:
- Nombre del producto

```python
if producto and producto.lower() not in nombre_producto.lower():
    incluir_fila = False
```

---

## 📊 CÁLCULOS DE TOTALES

### Total por Producto (en cada fila)

```python
subtotal = cantidad * precio_venta
```

### Total General

```python
total_cantidad_productos = sum(fila["cantidad"] for fila in filas_libro)
total_ventas_usd = sum(fila["subtotal"] for fila in filas_libro)
total_ventas_bs = sum(fila["subtotal_bs"] for fila in filas_libro)
total_facturas = len(set(fila["numero_factura"] for fila in filas_libro))
```

---

## ✅ VALIDACIONES

1. **Permiso requerido:** El usuario debe tener el permiso `ver_libro_ventas`
2. **Solo ventas procesadas:** Filtrar solo ventas con `estado: "procesada"`
3. **Fechas válidas:** Validar formato de fechas (YYYY-MM-DD)
4. **Paginación:** Validar que `page` y `limit` sean números positivos
5. **Límite máximo:** Limitar `limit` a un máximo razonable (ej: 1000)

---

## 🔐 PROTECCIÓN DE RUTA

```python
from fastapi import Depends, HTTPException

def verificar_permiso_libro_ventas(current_user: dict = Depends(get_current_user)):
    """
    Verifica que el usuario tenga el permiso ver_libro_ventas
    """
    permisos = current_user.get("permisos", [])
    if "ver_libro_ventas" not in permisos:
        raise HTTPException(
            status_code=403,
            detail="No tiene permiso para acceder al libro de ventas"
        )
    return current_user

@router.get("/libro-ventas")
async def obtener_libro_ventas(
    # ... parámetros ...
    current_user: dict = Depends(verificar_permiso_libro_ventas)
):
    # ... implementación ...
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Crear permiso `ver_libro_ventas` en el sistema de permisos
- [ ] Agregar permiso a la lista de permisos disponibles en gestión de usuarios
- [ ] Implementar endpoint `GET /libro-ventas`
- [ ] Expandir items de ventas en filas individuales
- [ ] Implementar búsqueda por cliente (nombre y cédula)
- [ ] Implementar búsqueda por producto (nombre)
- [ ] Implementar filtro por fecha (inicio y fin)
- [ ] Implementar filtro por sucursal
- [ ] Calcular totales (cantidad, ventas USD, ventas Bs, facturas)
- [ ] Implementar paginación
- [ ] Proteger endpoint con verificación de permiso
- [ ] Manejar casos donde cliente o sucursal no existen
- [ ] Manejar casos donde items están vacíos
- [ ] Validar formato de fechas
- [ ] Probar con diferentes combinaciones de filtros
- [ ] Optimizar consultas para mejor rendimiento

---

## 🎯 RESULTADO ESPERADO

Cuando un usuario con el permiso `ver_libro_ventas` acceda al módulo:

1. ✅ Verá todas las ventas procesadas
2. ✅ Cada fila mostrará un producto vendido con:
   - Número de factura
   - Fecha
   - Nombre del producto
   - Código del producto
   - Cantidad
   - Precio de venta (USD y Bs)
   - Subtotal (USD y Bs)
   - Cliente (nombre y cédula)
   - Sucursal
   - Cajero
3. ✅ Podrá buscar por cliente (nombre o cédula)
4. ✅ Podrá buscar por producto (nombre)
5. ✅ Verá totales generales:
   - Total cantidad de productos vendidos
   - Total ventas en USD
   - Total ventas en Bs
   - Total de facturas
6. ✅ Podrá filtrar por fecha y sucursal
7. ✅ Los datos estarán paginados para mejor rendimiento

---

## 📌 NOTAS IMPORTANTES

1. **Formato Excel:** Cada fila representa un producto vendido, no una factura completa. Si una factura tiene 3 productos, aparecerán 3 filas.

2. **Precio de Venta:** Usar `precio_unitario_usd` como precio de venta principal. El precio en Bs se calcula con la tasa del día.

3. **Total por Producto:** El total de cada fila es `cantidad * precio_venta` (ya viene en `subtotal`).

4. **Total General:** Sumar todos los `subtotal` de todas las filas.

5. **Cliente:** Si la venta no tiene cliente, mostrar "Sin cliente".

6. **Rendimiento:** Para grandes volúmenes de datos, considerar:
   - Índices en la base de datos (fecha, estado, sucursal)
   - Paginación eficiente
   - Cache de consultas frecuentes

7. **Exportación:** El frontend puede usar estos datos para exportar a Excel directamente.

---

## 🚨 ERRORES COMUNES A EVITAR

1. ❌ No expandir items - Mostrar solo facturas en lugar de productos
2. ❌ No filtrar por estado - Incluir ventas canceladas o pendientes
3. ❌ No poblar cliente - Mostrar solo ID en lugar de nombre
4. ❌ No calcular totales - No mostrar totales generales
5. ❌ Búsqueda case-sensitive - No encontrar resultados por mayúsculas/minúsculas
6. ❌ No paginar - Cargar todas las ventas de una vez (problemas de rendimiento)

---

## 📞 EJEMPLO DE USO

### Obtener todas las ventas
```
GET /libro-ventas
```

### Buscar por cliente
```
GET /libro-ventas?cliente=Juan
```

### Buscar por producto
```
GET /libro-ventas?producto=SPRAY
```

### Filtrar por fecha
```
GET /libro-ventas?fecha_inicio=2025-01-01&fecha_fin=2025-01-31
```

### Combinar filtros
```
GET /libro-ventas?cliente=Juan&producto=SPRAY&fecha_inicio=2025-01-01&fecha_fin=2025-01-31&sucursal=690c40be93d9d9d635fbaf5b
```

---

## ✅ CONCLUSIÓN

El endpoint debe devolver todas las ventas procesadas con sus items expandidos en formato tipo Excel, permitiendo búsqueda por cliente y producto, y mostrando totales generales. El acceso debe estar protegido por el permiso `ver_libro_ventas`.


