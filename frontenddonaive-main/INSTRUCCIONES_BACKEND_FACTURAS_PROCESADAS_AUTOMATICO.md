# 🔧 INSTRUCCIONES BACKEND: Guardar Facturas en "Facturas Procesadas" Automáticamente

## 📌 REQUERIMIENTO

Cuando se totaliza y confirma una venta en el punto de venta, la factura **DEBE** guardarse automáticamente con `estado: "procesada"` para que aparezca inmediatamente en la lista de "Facturas Procesadas".

---

## ✅ SOLUCIÓN REQUERIDA

### Endpoint: `POST /punto-venta/ventas`

Cuando se crea una nueva venta, el backend **DEBE**:

1. **Guardar la venta con `estado: "procesada"`**
2. **Incluir todos los campos necesarios** para que aparezca en la lista de facturas procesadas
3. **Retornar el ID de la factura** para que el frontend pueda refrescar la lista

---

## 📋 ESTRUCTURA DE LA VENTA

### Request (Frontend envía)

```json
{
  "items": [
    {
      "producto_id": "producto_id",
      "codigo": "010001",
      "nombre": "ESMALTE SINTETICO",
      "cantidad": 2,
      "precio_unitario": 23.51,
      "precio_unitario_usd": 23.51,
      "subtotal": 47.02,
      "subtotal_usd": 47.02,
      "descuento_aplicado": 0
    }
  ],
  "metodos_pago": [
    {
      "tipo": "efectivo_usd",
      "monto": 50.00,
      "divisa": "USD"
    }
  ],
  "total_bs": 0,
  "total_usd": 47.02,
  "tasa_dia": 42.5,
  "sucursal": "sucursal_id",
  "cajero": "cajero@email.com",
  "cliente": "cliente_id",
  "porcentaje_descuento": 0,
  "descuento_por_divisa": 0,
  "notas": ""
}
```

### Response (Backend debe retornar)

```json
{
  "_id": "factura_id",
  "numero_factura": "FAC-2025-001234",
  "estado": "procesada",  // ✅ CRÍTICO: Debe ser "procesada"
  "fecha": "2025-01-15T16:30:00Z",
  "sucursal": "sucursal_id",
  "cajero": "cajero@email.com",
  "cliente": {
    "_id": "cliente_id",
    "nombre": "Juan Pérez",
    "cedula": "12345678"
  },
  "total_usd": 47.02,
  "total_bs": 0,
  "mensaje": "Venta registrada exitosamente"
}
```

---

## 🔧 IMPLEMENTACIÓN REQUERIDA

### Paso 1: Crear la Venta con Estado "procesada"

```python
from datetime import datetime
from bson import ObjectId

@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # ... validaciones y procesamiento de items ...
        
        # Generar número de factura
        numero_factura = await generar_numero_factura(venta_data["sucursal"], db)
        
        # Crear documento de venta
        venta_doc = {
            "numero_factura": numero_factura,
            "fecha": datetime.now(),
            "sucursal": ObjectId(venta_data["sucursal"]),
            "cajero": venta_data["cajero"],
            "cliente": ObjectId(venta_data["cliente"]) if venta_data.get("cliente") else None,
            "items": items_procesados,
            "metodos_pago": venta_data["metodos_pago"],
            "total_usd": venta_data["total_usd"],
            "total_bs": venta_data["total_bs"],
            "tasa_dia": venta_data["tasa_dia"],
            "porcentaje_descuento": venta_data.get("porcentaje_descuento", 0),
            "descuento_por_divisa": venta_data.get("descuento_por_divisa", 0),
            "notas": venta_data.get("notas", ""),
            "estado": "procesada",  # ✅ CRÍTICO: Marcar como procesada
            "fecha_creacion": datetime.now(),
            "fecha_actualizacion": datetime.now()
        }
        
        # Guardar en la base de datos
        resultado = await db.ventas.insert_one(venta_doc)
        venta_id = resultado.inserted_id
        
        # ... actualizar inventario, cuadres, etc. ...
        
        # Retornar respuesta
        return {
            "_id": str(venta_id),
            "numero_factura": numero_factura,
            "estado": "procesada",  # ✅ Confirmar estado
            "mensaje": "Venta registrada exitosamente"
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al procesar la venta: {str(e)}"
        )
```

### Paso 2: Asegurar que el Endpoint de Facturas Procesadas Incluya la Nueva Venta

El endpoint `GET /punto-venta/ventas/usuario` **DEBE** incluir ventas con `estado: "procesada"`:

```python
@router.get("/punto-venta/ventas/usuario")
async def obtener_facturas_procesadas(
    cajero: str,
    sucursal: str,
    limit: int = 100,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Buscar ventas con estado "procesada"
        query = {
            "cajero": cajero,
            "sucursal": ObjectId(sucursal),
            "estado": "procesada"  # ✅ CRÍTICO: Solo facturas procesadas
        }
        
        facturas = await db.ventas.find(query)\
            .sort("fecha", -1)\
            .limit(limit)\
            .to_list(length=None)
        
        # Poblar datos de cliente si existe
        for factura in facturas:
            if factura.get("cliente"):
                cliente = await db.clientes.find_one({"_id": factura["cliente"]})
                if cliente:
                    factura["cliente"] = {
                        "_id": str(cliente["_id"]),
                        "nombre": cliente.get("nombre", ""),
                        "cedula": cliente.get("cedula", "")
                    }
                else:
                    factura["cliente"] = None
            else:
                factura["cliente"] = None
        
        return {
            "facturas": facturas,
            "total": len(facturas)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener facturas procesadas: {str(e)}"
        )
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Para el Backend:

- [ ] El endpoint `POST /punto-venta/ventas` guarda la venta con `estado: "procesada"`
- [ ] El endpoint `GET /punto-venta/ventas/usuario` filtra por `estado: "procesada"`
- [ ] La respuesta de `POST /punto-venta/ventas` incluye el campo `estado: "procesada"`
- [ ] La factura aparece inmediatamente en la lista de facturas procesadas después de crearse
- [ ] Los datos del cliente se poblan correctamente en las facturas procesadas

### Para Verificar:

1. **Crear una venta:**
   - Ir al punto de venta
   - Agregar productos al carrito
   - Totalizar y confirmar la venta
   - Verificar que aparece en "Facturas Procesadas" inmediatamente

2. **Verificar en la base de datos:**
   - Verificar que la venta tiene `estado: "procesada"`
   - Verificar que todos los campos están presentes

3. **Verificar en el frontend:**
   - Abrir "Facturas Procesadas" después de crear una venta
   - Verificar que la nueva factura aparece en la lista
   - Verificar que los datos se muestran correctamente

---

## 🔍 ESTRUCTURA DE BASE DE DATOS

### Colección: `ventas`

```javascript
{
  _id: ObjectId,
  numero_factura: String,  // "FAC-2025-001234"
  fecha: Date,
  sucursal: ObjectId,
  cajero: String,  // Email del cajero
  cliente: ObjectId | null,
  items: Array,
  metodos_pago: Array,
  total_usd: Number,
  total_bs: Number,
  tasa_dia: Number,
  porcentaje_descuento: Number,
  descuento_por_divisa: Number,
  notas: String,
  estado: "procesada",  // ✅ CRÍTICO: Debe ser "procesada"
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

---

## 🚨 IMPORTANTE

1. **Estado "procesada":** Todas las ventas confirmadas deben tener `estado: "procesada"` para aparecer en la lista.

2. **Inmediatez:** La factura debe aparecer inmediatamente después de crearse, sin necesidad de refrescar manualmente.

3. **Consistencia:** El estado debe ser consistente en toda la aplicación:
   - `"procesada"`: Venta completada y confirmada
   - `"devuelta"`: Venta que fue devuelta
   - `"cancelada"`: Venta cancelada (si aplica)

4. **Filtrado:** El endpoint de facturas procesadas **SOLO** debe retornar ventas con `estado: "procesada"`.

---

## 📝 NOTAS ADICIONALES

- El frontend ya está configurado para refrescar automáticamente la lista de facturas procesadas después de confirmar una venta.
- Si la sección de "Facturas Procesadas" está abierta, se actualiza inmediatamente.
- Si no está abierta, se actualiza en segundo plano para que esté lista cuando se abra.

---

**Última actualización:** 2025-01-15

