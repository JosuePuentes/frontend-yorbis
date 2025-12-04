# RESUMEN: Endpoint para Facturas Procesadas

## ⚠️ PROBLEMA ACTUAL
El frontend está llamando al endpoint `GET /punto-venta/ventas/usuario` pero este endpoint **NO EXISTE** en el backend, por eso no aparecen las facturas procesadas.

---

## ✅ SOLUCIÓN RÁPIDA

### Endpoint que debes crear:
```
GET /punto-venta/ventas/usuario
```

### Parámetros que recibe el frontend:
- `cajero` (string): Correo del usuario o nombre del cajero
- `sucursal` (string): ID de la sucursal
- `limit` (number): Límite de resultados (default: 100)

### Ejemplo de llamada del frontend:
```
GET /punto-venta/ventas/usuario?cajero=admin@gmail.com&sucursal=690c40be93d9d9d635fbaf5b&limit=100
```

---

## 📋 ESTRUCTURA DE RESPUESTA REQUERIDA

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
      "cajero": "admin@gmail.com",
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
  "total": 2,
  "limit": 100,
  "offset": 0
}
```

---

## 🔍 FILTROS IMPORTANTES

1. **Por cajero**: Buscar ventas donde `cajero` coincida con el parámetro (puede ser correo o nombre)
2. **Por sucursal**: Buscar ventas donde `sucursal` sea el ObjectId proporcionado
3. **Ordenar**: Por fecha descendente (más recientes primero)
4. **Incluir información completa**: 
   - Datos de la sucursal (nombre)
   - Datos del cliente (si existe)
   - Todos los items con sus detalles
   - Todos los métodos de pago

---

## 💡 CÓDIGO MÍNIMO (Python/FastAPI)

```python
@router.get("/punto-venta/ventas/usuario")
async def obtener_facturas_usuario(
    cajero: str = Query(..., description="Nombre o correo del cajero"),
    sucursal: str = Query(..., description="ID de la sucursal"),
    limit: int = Query(100, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Construir filtro
        filtro = {
            "cajero": cajero,
            "sucursal": ObjectId(sucursal)
        }
        
        # Buscar ventas
        ventas = await db.ventas.find(filtro)\
            .sort("fecha", -1)\
            .limit(limit)\
            .to_list(length=None)
        
        # Formatear respuesta
        facturas = []
        for venta in ventas:
            # Obtener sucursal
            sucursal_doc = await db.farmacias.find_one({"_id": venta["sucursal"]})
            
            # Obtener cliente si existe
            cliente_info = None
            if venta.get("cliente"):
                cliente_doc = await db.clientes.find_one({"_id": ObjectId(venta["cliente"])})
                if cliente_doc:
                    cliente_info = {
                        "_id": str(cliente_doc["_id"]),
                        "nombre": cliente_doc.get("nombre", ""),
                        "cedula": cliente_doc.get("cedula", "")
                    }
            
            factura = {
                "_id": str(venta["_id"]),
                "numero_factura": venta.get("numero_factura", ""),
                "fecha": venta.get("fecha").isoformat() if venta.get("fecha") else None,
                "sucursal": {
                    "_id": str(venta["sucursal"]),
                    "nombre": sucursal_doc.get("nombre", "") if sucursal_doc else ""
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
            facturas.append(factura)
        
        return {
            "facturas": facturas,
            "total": len(facturas),
            "limit": limit,
            "offset": 0
        }
        
    except Exception as e:
        logger.error(f"Error al obtener facturas: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ⚠️ PUNTOS CRÍTICOS

1. **Campo `cajero` en las ventas**: Asegúrate de que cuando se guarda una venta, el campo `cajero` se guarda como el correo del usuario o el nombre del cajero (debe coincidir con lo que envía el frontend)

2. **Campo `sucursal`**: Debe ser un ObjectId, no un string

3. **Campo `numero_factura`**: Debe existir en las ventas guardadas

4. **Estructura de respuesta**: El frontend espera `data.facturas`, no solo un array

---

## 📝 CHECKLIST

- [ ] Crear endpoint `GET /punto-venta/ventas/usuario`
- [ ] Filtrar por `cajero` (correo o nombre)
- [ ] Filtrar por `sucursal` (ObjectId)
- [ ] Ordenar por fecha descendente
- [ ] Incluir información de sucursal (nombre)
- [ ] Incluir información de cliente (si existe)
- [ ] Retornar estructura `{facturas: [...], total: X, limit: X, offset: 0}`
- [ ] Probar con las facturas que ya creaste

---

## 📄 DOCUMENTACIÓN COMPLETA

Para más detalles, revisa el archivo: `INSTRUCCIONES_BACKEND_FACTURAS_PROCESADAS.md`





