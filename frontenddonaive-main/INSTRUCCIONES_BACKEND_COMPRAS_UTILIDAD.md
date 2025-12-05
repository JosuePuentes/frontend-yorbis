# ⚠️ INSTRUCCIONES PARA EL BACKEND - UTILIDAD EN COMPRAS

## CONTEXTO

El frontend ahora carga productos desde las compras para mostrar la utilidad que se colocó en la compra. El precio se calcula como **Costo + Utilidad**.

## ✅ VERIFICACIÓN REQUERIDA

### Endpoint: `GET /compras`

El backend **DEBE** enviar la utilidad de cada producto en la respuesta. Verifica que cada producto en `items` o `productos` incluya:

1. **Utilidad** (puede venir como):
   - `utilidad`: Monto en dinero (ej: 3.00)
   - `utilidad_contable`: Monto en dinero (ej: 3.00)
   - `porcentaje_ganancia`: Porcentaje (ej: 30)
   - `utilidad_porcentaje`: Porcentaje (ej: 30)

2. **Costo**:
   - `precioUnitario` o `precio_unitario`: Costo del producto
   - `costo` o `costo_unitario`: Costo del producto

3. **Precio de venta** (opcional, se calcula si no viene):
   - `precio_venta` o `precioVenta`: Precio final de venta

## 📋 FORMATO ESPERADO

```json
[
  {
    "_id": "compra_id",
    "fecha": "2025-12-05",
    "farmacia": "01",
    "productos": [
      {
        "codigo": "010001",
        "nombre": "ESMALTE SINTETICO",
        "marca": "PINTEMOS",
        "cantidad": 12,
        "precioUnitario": 23.51,  // ← Costo
        "utilidad": 30,  // ← Utilidad (puede ser % o monto)
        "precio_venta": 30.56  // ← Precio = Costo + Utilidad (opcional)
      }
    ]
  }
]
```

## 🔍 CÓMO VERIFICAR

1. **Si el backend YA envía `utilidad` o `porcentaje_ganancia` en cada producto:**
   - ✅ **NO necesitas hacer cambios**
   - El frontend ya puede usar estos campos

2. **Si el backend NO envía la utilidad:**
   - ⚠️ **NECESITAS agregar la utilidad** a cada producto en la respuesta de `GET /compras`
   - La utilidad debe venir del campo que se guardó cuando se creó la compra

## 📝 CÓDIGO PYTHON/FASTAPI EJEMPLO

Si necesitas agregar la utilidad, aquí está el ejemplo:

```python
@router.get("/compras")
async def obtener_compras(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    compras = await db.compras.find({"activo": {"$ne": False}}).to_list(length=10000)
    
    compras_con_productos = []
    for compra in compras:
        compra_dict = dict(compra)
        compra_dict["_id"] = str(compra_dict["_id"])
        
        # Asegurar que productos incluyan utilidad
        if "productos" in compra_dict:
            for producto in compra_dict["productos"]:
                # Si no tiene utilidad, intentar calcularla
                if "utilidad" not in producto and "porcentaje_ganancia" not in producto:
                    costo = producto.get("precioUnitario", 0)
                    precio_venta = producto.get("precio_venta", 0)
                    if precio_venta > 0 and costo > 0:
                        # Calcular utilidad en dinero
                        producto["utilidad"] = precio_venta - costo
                        # Calcular porcentaje
                        producto["porcentaje_ganancia"] = ((precio_venta - costo) / costo) * 100
        
        compras_con_productos.append(compra_dict)
    
    return compras_con_productos
```

## ⚠️ IMPORTANTE

- La utilidad puede venir como **porcentaje** (0-100) o como **monto en dinero**
- El frontend detecta automáticamente si es porcentaje o monto
- Si es porcentaje, calcula: `utilidad_en_dinero = (costo × porcentaje) / 100`
- El precio se calcula como: `precio = costo + utilidad_en_dinero`

