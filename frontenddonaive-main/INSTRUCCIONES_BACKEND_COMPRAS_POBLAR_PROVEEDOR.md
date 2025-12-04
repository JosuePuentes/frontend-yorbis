# Instrucciones Backend: Poblar Proveedor en GET /compras

## ⚠️ PROBLEMA ACTUAL

El frontend está recibiendo compras con `proveedor_id` y `proveedor_nombre`, pero **NO** recibe el objeto completo del proveedor con sus datos (días de crédito, descuentos, etc.).

**Respuesta actual del backend:**
```json
{
  "proveedor_id": "6929e7d327b70cb1aa01dd55",
  "proveedor_nombre": "Prueba",
  "dias_credito": 30
}
```

**Problema:** El frontend necesita el objeto completo del proveedor para:
- Mostrar el nombre correctamente
- Calcular días de crédito y días restantes
- Calcular el ahorro por pronto pago (necesita `descuento_pronto_pago`)
- Mostrar todas las condiciones del proveedor en el modal

## ✅ SOLUCIÓN REQUERIDA

### Endpoint: `GET /compras`

El backend debe **poblar** (populate) el objeto `proveedor` completo en cada compra.

**Respuesta esperada:**
```json
[
  {
    "_id": "692b87bab007a7d0121981ed",
    "proveedor_id": "6929e7d327b70cb1aa01dd55",
    "proveedor": {
      "_id": "6929e7d327b70cb1aa01dd55",
      "nombre": "Prueba",
      "rif": "P123456789",
      "telefono": "04146772709",
      "dias_credito": 30,
      "descuento_comercial": 5,
      "descuento_pronto_pago": 3,
      "estado": "activo"
    },
    "fecha_compra": "2025-11-29",
    "total": 44.82,
    "items": [...]
  }
]
```

## 📋 CÓDIGO PYTHON/FASTAPI

```python
@router.get("/compras")
async def obtener_compras(
    sucursal_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver compras")
    
    # Construir query
    query = {
        "activo": {"$ne": False}
    }
    
    if sucursal_id:
        query["sucursal_id"] = sucursal_id
    
    # Buscar compras
    compras = await db.compras.find(query).sort("fecha_creacion", -1).to_list(length=10000)
    
    # ⚠️ CRÍTICO: Poblar proveedor para cada compra
    compras_con_proveedor = []
    for compra in compras:
        compra_dict = dict(compra)
        compra_dict["_id"] = str(compra_dict["_id"])
        
        # Obtener proveedor completo
        if compra_dict.get("proveedor_id"):
            proveedor = await db.proveedores.find_one({"_id": ObjectId(compra_dict["proveedor_id"])})
            if proveedor:
                proveedor_dict = {
                    "_id": str(proveedor["_id"]),
                    "nombre": proveedor.get("nombre", ""),
                    "rif": proveedor.get("rif", ""),
                    "telefono": proveedor.get("telefono", ""),
                    "dias_credito": proveedor.get("dias_credito", 0),
                    "descuento_comercial": proveedor.get("descuento_comercial", 0),
                    "descuento_pronto_pago": proveedor.get("descuento_pronto_pago", 0),
                    "estado": proveedor.get("estado", "activo")
                }
                compra_dict["proveedor"] = proveedor_dict
            else:
                # Si no se encuentra el proveedor, crear objeto básico
                compra_dict["proveedor"] = {
                    "_id": compra_dict["proveedor_id"],
                    "nombre": compra_dict.get("proveedor_nombre", "Proveedor no encontrado"),
                    "rif": "",
                    "telefono": "",
                    "dias_credito": compra_dict.get("dias_credito", 0),
                    "descuento_comercial": 0,
                    "descuento_pronto_pago": 0,
                    "estado": "inactivo"
                }
        
        compras_con_proveedor.append(compra_dict)
    
    return compras_con_proveedor
```

## 🔍 VERIFICACIÓN

Después de implementar, verificar que la respuesta incluya:

1. ✅ `proveedor` como objeto completo (no solo `proveedor_id` y `proveedor_nombre`)
2. ✅ `proveedor.dias_credito` con el valor correcto
3. ✅ `proveedor.descuento_comercial` con el valor correcto
4. ✅ `proveedor.descuento_pronto_pago` con el valor correcto (ej: 3)
5. ✅ `fecha_compra` o `fecha` con el valor correcto

## 📝 NOTAS IMPORTANTES

1. **El objeto `proveedor` es OBLIGATORIO** - El frontend lo necesita para todos los cálculos
2. **Si el proveedor no existe**, crear un objeto básico con `nombre: "Proveedor no encontrado"`
3. **Convertir ObjectId a string** - Todos los `_id` deben ser strings, no ObjectId
4. **Incluir todos los campos** - `dias_credito`, `descuento_comercial`, `descuento_pronto_pago` son críticos

## 🎯 RESULTADO ESPERADO

Con esta implementación:
- ✅ El frontend mostrará el nombre del proveedor correctamente
- ✅ Se calcularán los días de crédito y días restantes
- ✅ Se calculará el ahorro por pronto pago correctamente
- ✅ Se mostrarán todas las condiciones del proveedor en el modal

