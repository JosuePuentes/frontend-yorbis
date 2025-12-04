# Instrucciones Backend - Cliente en Facturas Procesadas

## Problema Identificado

El frontend está recibiendo facturas procesadas donde el campo `cliente` aparece como `null` o con estructura incorrecta, mostrando "Sin cliente" incluso cuando hay un cliente asociado a la factura.

## Endpoint Afectado

**GET** `/punto-venta/ventas/usuario?cajero={cajero}&sucursal={sucursal}&limit={limit}`

## Estructura Requerida del Cliente

El campo `cliente` en cada factura **DEBE** ser un objeto con la siguiente estructura:

```json
{
  "_id": "string",
  "nombre": "string",
  "cedula": "string"
}
```

### Ejemplo Correcto de Respuesta

```json
{
  "facturas": [
    {
      "_id": "factura_id_123",
      "numero_factura": "FAC-001",
      "fecha": "2024-01-15T10:30:00Z",
      "sucursal": {
        "_id": "sucursal_id",
        "nombre": "Santa Elena"
      },
      "cajero": "cajero@email.com",
      "cliente": {
        "_id": "cliente_id_456",
        "nombre": "Juan Pérez",
        "cedula": "12345678"
      },
      "total_usd": 25.50,
      "total_bs": 1160.25,
      "tasa_dia": 45.50,
      "items": [...],
      "metodos_pago": [...],
      "porcentaje_descuento": 0
    }
  ]
}
```

## Casos a Manejar

### 1. Factura CON Cliente

Si la factura tiene un cliente asociado, el backend **DEBE**:

1. Buscar el documento del cliente en la colección `clientes` usando el `_id` almacenado en la venta
2. Incluir el objeto cliente completo con al menos `_id`, `nombre` y `cedula`
3. Si el cliente no se encuentra en la base de datos, el campo `cliente` debe ser `null`

```python
# Ejemplo en Python/FastAPI
cliente_info = None
if venta.get("cliente"):
    cliente_doc = await db.clientes.find_one({"_id": ObjectId(venta["cliente"])})
    if cliente_doc:
        cliente_info = {
            "_id": str(cliente_doc["_id"]),
            "nombre": cliente_doc.get("nombre", ""),
            "cedula": cliente_doc.get("cedula", "")
        }
```

### 2. Factura SIN Cliente

Si la factura NO tiene un cliente asociado (venta al mostrador), el campo `cliente` debe ser `null`:

```json
{
  "cliente": null
}
```

## Validaciones Requeridas

1. **NUNCA** enviar el cliente como string (ID): El frontend espera un objeto, no un ID
2. **SIEMPRE** incluir el campo `nombre` cuando hay cliente
3. **SIEMPRE** incluir el campo `cedula` cuando hay cliente (puede ser string vacío si no tiene)
4. Si el cliente no existe en la BD, enviar `cliente: null` en lugar de un objeto vacío

## Estructura de Código Sugerida

```python
@router.get("/punto-venta/ventas/usuario")
async def obtener_ventas_usuario(
    cajero: str,
    sucursal: str,
    limit: int = 100,
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
            
            # Obtener cliente SI EXISTE
            cliente_info = None
            if venta.get("cliente"):
                try:
                    cliente_doc = await db.clientes.find_one({"_id": ObjectId(venta["cliente"])})
                    if cliente_doc:
                        cliente_info = {
                            "_id": str(cliente_doc["_id"]),
                            "nombre": cliente_doc.get("nombre", ""),
                            "cedula": cliente_doc.get("cedula", "")
                        }
                except Exception as e:
                    # Si hay error al obtener cliente, dejarlo como None
                    print(f"Error al obtener cliente: {e}")
                    cliente_info = None
            
            factura = {
                "_id": str(venta["_id"]),
                "numero_factura": venta.get("numero_factura", ""),
                "fecha": venta.get("fecha").isoformat() if venta.get("fecha") else None,
                "sucursal": {
                    "_id": str(venta["sucursal"]),
                    "nombre": sucursal_doc.get("nombre", "") if sucursal_doc else ""
                },
                "cajero": venta.get("cajero", ""),
                "cliente": cliente_info,  # Puede ser None o un objeto con _id, nombre, cedula
                "total_usd": venta.get("total_usd", 0),
                "total_bs": venta.get("total_bs", 0),
                "tasa_dia": venta.get("tasa_dia", 0),
                "items": venta.get("items", []),
                "metodos_pago": venta.get("metodos_pago", []),
                "porcentaje_descuento": venta.get("porcentaje_descuento", 0)
            }
            facturas.append(factura)
        
        return {
            "facturas": facturas
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al obtener ventas: {str(e)}")
```

## Puntos Críticos

1. **NO enviar el ID del cliente como string**: El frontend necesita el objeto completo
2. **Siempre hacer lookup del cliente**: No asumir que el cliente existe, siempre buscarlo
3. **Manejar errores**: Si el cliente no existe o hay error, enviar `null`
4. **Campos requeridos**: `nombre` y `cedula` deben estar presentes cuando hay cliente

## Testing

Para verificar que funciona correctamente:

1. Crear una venta CON cliente
2. Crear una venta SIN cliente
3. Verificar que la respuesta incluya:
   - `cliente: { _id, nombre, cedula }` cuando hay cliente
   - `cliente: null` cuando no hay cliente

## Notas Adicionales

- El frontend ya está preparado para manejar `cliente: null` correctamente
- El frontend mostrará "Sin cliente" cuando `cliente` sea `null`
- El frontend mostrará el nombre del cliente cuando `cliente.nombre` esté disponible



