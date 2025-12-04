# INSTRUCCIONES BACKEND: Facturas Procesadas por Usuario/Cajero

## Resumen
El frontend necesita un endpoint para obtener todas las facturas (ventas) procesadas por un usuario/cajero específico, para mostrarlas en la sección "Facturas Procesadas" del punto de venta.

---

## Endpoint: `GET /punto-venta/ventas/usuario`

### Query Parameters

- `cajero` (string, opcional): Nombre o correo del cajero/usuario
- `sucursal` (string, opcional): ID de la sucursal para filtrar
- `fecha_inicio` (string, opcional, formato: YYYY-MM-DD): Fecha de inicio para filtrar
- `fecha_fin` (string, opcional, formato: YYYY-MM-DD): Fecha de fin para filtrar
- `limit` (number, opcional, default: 50): Número máximo de facturas a retornar
- `offset` (number, opcional, default: 0): Número de facturas a saltar (para paginación)

### Ejemplo de Request

```
GET /punto-venta/ventas/usuario?cajero=usuario@ejemplo.com&sucursal=690c40be93d9d9d635fbaf5b&limit=50
```

### Respuesta Exitosa (200)

```json
{
  "facturas": [
    {
      "_id": "venta_id_1",
      "numero_factura": "FAC-2025-001234",
      "fecha": "2025-01-15T10:30:00.000Z",
      "sucursal": {
        "_id": "690c40be93d9d9d635fbaf5b",
        "nombre": "Santa Elena"
      },
      "cajero": "usuario@ejemplo.com",
      "cliente": {
        "_id": "cliente_id_1",
        "nombre": "Juan Pérez",
        "cedula": "12345678"
      },
      "total_usd": 25.50,
      "total_bs": 3060.00,
      "tasa_dia": 120.00,
      "items": [
        {
          "producto_id": "690c40be93d9d9d635fbae83",
          "nombre": "SPRAY DIESEL TOOLS AZUL CIELO",
          "codigo": "12345",
          "cantidad": 2,
          "precio_unitario": 360.03,
          "precio_unitario_usd": 3.00,
          "precio_unitario_original": 360.03,
          "precio_unitario_original_usd": 3.00,
          "subtotal": 720.06,
          "subtotal_usd": 6.00,
          "descuento_aplicado": 0
        }
      ],
      "metodos_pago": [
        {
          "tipo": "efectivo",
          "monto": 25.50,
          "divisa": "USD"
        }
      ],
      "porcentaje_descuento": 0
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

### Campos Importantes en la Respuesta

- **`facturas`**: Array de facturas/ventas procesadas
  - **`numero_factura`**: Número único de la factura (requerido)
  - **`fecha`**: Fecha y hora de la venta (ISO 8601)
  - **`sucursal`**: Objeto con `_id` y `nombre` de la sucursal
  - **`cajero`**: Nombre o correo del cajero que procesó la venta
  - **`cliente`**: Objeto con información del cliente (si aplica)
  - **`total_usd`**: Total de la venta en USD
  - **`total_bs`**: Total de la venta en Bs
  - **`items`**: Array completo de productos vendidos con todos los detalles
  - **`metodos_pago`**: Array de métodos de pago utilizados
  - **`porcentaje_descuento`**: Porcentaje de descuento aplicado (si hay cliente con descuento)

- **`total`**: Número total de facturas que coinciden con los filtros (para paginación)
- **`limit`**: Límite aplicado
- **`offset`**: Offset aplicado

---

## Implementación en Python/FastAPI

```python
from datetime import datetime
from bson import ObjectId
from fastapi import Query, Depends
from motor.motor_asyncio import AsyncIOMotorClient
from typing import Optional

@router.get("/punto-venta/ventas/usuario")
async def obtener_facturas_usuario(
    cajero: Optional[str] = Query(None, description="Nombre o correo del cajero"),
    sucursal: Optional[str] = Query(None, description="ID de la sucursal"),
    fecha_inicio: Optional[str] = Query(None, description="Fecha de inicio (YYYY-MM-DD)"),
    fecha_fin: Optional[str] = Query(None, description="Fecha de fin (YYYY-MM-DD)"),
    limit: int = Query(50, ge=1, le=100, description="Número máximo de facturas"),
    offset: int = Query(0, ge=0, description="Número de facturas a saltar"),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Obtiene todas las facturas procesadas por un usuario/cajero específico.
    """
    try:
        # Construir filtro de búsqueda
        filtro = {}
        
        # Filtrar por cajero (si se proporciona)
        if cajero:
            filtro["cajero"] = cajero
        
        # Filtrar por sucursal (si se proporciona)
        if sucursal:
            try:
                filtro["sucursal"] = ObjectId(sucursal)
            except:
                return {"error": "ID de sucursal inválido"}
        
        # Filtrar por rango de fechas (si se proporciona)
        if fecha_inicio or fecha_fin:
            filtro_fecha = {}
            if fecha_inicio:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
                filtro_fecha["$gte"] = fecha_inicio_dt
            if fecha_fin:
                fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d")
                # Incluir todo el día
                fecha_fin_dt = datetime(fecha_fin_dt.year, fecha_fin_dt.month, fecha_fin_dt.day, 23, 59, 59)
                filtro_fecha["$lte"] = fecha_fin_dt
            if filtro_fecha:
                filtro["fecha"] = filtro_fecha
        
        # Contar total de facturas que coinciden
        total = await db.ventas.count_documents(filtro)
        
        # Buscar facturas con paginación, ordenadas por fecha descendente (más recientes primero)
        ventas = await db.ventas.find(filtro)\
            .sort("fecha", -1)\
            .skip(offset)\
            .limit(limit)\
            .to_list(length=None)
        
        # Formatear respuesta
        facturas_formateadas = []
        for venta in ventas:
            # Obtener información de la sucursal
            sucursal_info = None
            if venta.get("sucursal"):
                sucursal_doc = await db.farmacias.find_one({"_id": venta["sucursal"]})
                if sucursal_doc:
                    sucursal_info = {
                        "_id": str(sucursal_doc["_id"]),
                        "nombre": sucursal_doc.get("nombre", "")
                    }
            
            # Obtener información del cliente (si existe)
            cliente_info = None
            if venta.get("cliente"):
                cliente_doc = await db.clientes.find_one({"_id": ObjectId(venta["cliente"])})
                if cliente_doc:
                    cliente_info = {
                        "_id": str(cliente_doc["_id"]),
                        "nombre": cliente_doc.get("nombre", ""),
                        "cedula": cliente_doc.get("cedula", "")
                    }
            
            factura_dict = {
                "_id": str(venta["_id"]),
                "numero_factura": venta.get("numero_factura", ""),
                "fecha": venta.get("fecha").isoformat() if venta.get("fecha") else None,
                "sucursal": sucursal_info or {
                    "_id": str(venta.get("sucursal", "")),
                    "nombre": ""
                },
                "cajero": venta.get("cajero", ""),
                "cliente": cliente_info,
                "total_usd": venta.get("total_usd", 0),
                "total_bs": venta.get("total_bs", 0),
                "tasa_dia": venta.get("tasa_dia", 0),
                "items": venta.get("items", []),
                "metodos_pago": venta.get("metodos_pago", []),
                "porcentaje_descuento": venta.get("porcentaje_descuento", 0)
            }
            
            facturas_formateadas.append(factura_dict)
        
        return {
            "facturas": facturas_formateadas,
            "total": total,
            "limit": limit,
            "offset": offset
        }
        
    except Exception as e:
        logger.error(f"Error al obtener facturas del usuario: {str(e)}")
        return {"error": "Error al obtener facturas", "detail": str(e)}
```

---

## Consideraciones Adicionales

1. **Autenticación:**
   - El endpoint debe requerir autenticación (usar `get_current_user` o similar)
   - Si no se proporciona el parámetro `cajero`, se puede usar el usuario autenticado como filtro por defecto

2. **Ordenamiento:**
   - Las facturas deben estar ordenadas por fecha descendente (más recientes primero)

3. **Paginación:**
   - Implementar paginación para evitar cargar demasiadas facturas a la vez
   - El frontend puede solicitar más facturas usando `offset` y `limit`

4. **Rendimiento:**
   - Crear índices en la base de datos para los campos `cajero`, `sucursal`, y `fecha` para mejorar el rendimiento de las consultas

5. **Información del Cliente:**
   - Si la factura tiene un cliente asociado, incluir la información completa del cliente (nombre, cédula) en la respuesta
   - Si no hay cliente, el campo `cliente` debe ser `null`

6. **Información de la Sucursal:**
   - Incluir el nombre de la sucursal en la respuesta para facilitar la visualización en el frontend

---

## Checklist de Implementación

- [ ] Crear endpoint `GET /punto-venta/ventas/usuario`
- [ ] Implementar filtros por `cajero`, `sucursal`, y rango de fechas
- [ ] Implementar paginación con `limit` y `offset`
- [ ] Incluir información completa de la sucursal en la respuesta
- [ ] Incluir información completa del cliente en la respuesta (si aplica)
- [ ] Ordenar facturas por fecha descendente
- [ ] Crear índices en la base de datos para mejorar rendimiento
- [ ] Probar el endpoint con diferentes combinaciones de filtros
- [ ] Validar que el endpoint retorne todos los campos necesarios para el frontend

---

## Notas

- El frontend usará este endpoint para mostrar las facturas procesadas por el usuario/cajero actual
- El endpoint debe ser eficiente ya que se llamará cada vez que el usuario haga click en "Facturas Procesadas"
- Considerar implementar caché si el volumen de facturas es muy alto





