# ⚠️ INSTRUCCIONES CRÍTICAS PARA EL BACKEND - COMPRAS Y PROVEEDORES

## PROBLEMA ACTUAL

El frontend NO está recibiendo los datos correctamente del backend:

1. **Proveedores no se muestran**: El backend envía solo `proveedor_id` pero NO el objeto `proveedor` completo
2. **Días de crédito en 0**: No se puede calcular porque falta el objeto proveedor
3. **Productos no aparecen en punto de venta**: El endpoint de búsqueda no está devolviendo productos

## ✅ SOLUCIÓN REQUERIDA EN EL BACKEND

### 1. Endpoint: `GET /compras`

**DEBE poblar el objeto `proveedor` completo en cada compra:**

```json
[
  {
    "_id": "693337d709dfa131aa8ec9a7",
    "proveedor_id": "69333abc90dcfe0167b0af0a",
    "proveedor": {
      "_id": "69333abc90dcfe0167b0af0a",
      "nombre": "GLOBAL COMPANY",
      "rif": "J503199326",
      "telefono": "04146330552",
      "dias_credito": 10,
      "descuento_comercial": 0,
      "descuento_pronto_pago": 0
    },
    "fecha": "2025-12-05",
    "fecha_compra": "2025-12-05",
    "total_precio_venta": 282.16,
    "items": [
      {
        "codigo": "010001",
        "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
        "cantidad": 12,
        "precio_unitario": 23.51
      }
    ],
    "pagos": [],
    "monto_abonado": 0,
    "monto_restante": 282.16
  }
]
```

### 2. Endpoint: `GET /punto-venta/productos/buscar?q={busqueda}&sucursal={sucursal_id}`

**DEBE devolver un array de productos:**

```json
[
  {
    "id": "producto_id",
    "nombre": "Nombre del producto",
    "codigo": "COD001",
    "precio": 10.50,
    "precio_usd": 10.50,
    "cantidad": 5,
    "stock": 5,
    "sucursal": "01"
  }
]
```

**O si viene en un objeto:**

```json
{
  "productos": [
    {
      "id": "producto_id",
      "nombre": "Nombre del producto",
      "codigo": "COD001",
      "precio": 10.50,
      "cantidad": 5
    }
  ]
}
```

## 📋 CÓDIGO PYTHON/FASTAPI EJEMPLO

### Para GET /compras:

```python
@router.get("/compras")
async def obtener_compras(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    compras = await db.compras.find({"activo": {"$ne": False}}).to_list(length=10000)
    
    compras_con_proveedor = []
    for compra in compras:
        compra_dict = dict(compra)
        compra_dict["_id"] = str(compra_dict["_id"])
        
        # ⚠️ CRÍTICO: Poblar proveedor
        if compra_dict.get("proveedor_id"):
            proveedor = await db.proveedores.find_one({"_id": ObjectId(compra_dict["proveedor_id"])})
            if proveedor:
                compra_dict["proveedor"] = {
                    "_id": str(proveedor["_id"]),
                    "nombre": proveedor.get("nombre", ""),
                    "rif": proveedor.get("rif", ""),
                    "telefono": proveedor.get("telefono", ""),
                    "dias_credito": proveedor.get("dias_credito", 0),
                    "descuento_comercial": proveedor.get("descuento_comercial", 0),
                    "descuento_pronto_pago": proveedor.get("descuento_pronto_pago", 0)
                }
        
        compras_con_proveedor.append(compra_dict)
    
    return compras_con_proveedor
```

### Para GET /punto-venta/productos/buscar:

```python
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str,
    sucursal: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Buscar productos en inventario de la sucursal
    query = {
        "farmacia": sucursal,
        "$or": [
            {"codigo": {"$regex": q, "$options": "i"}},
            {"descripcion": {"$regex": q, "$options": "i"}},
            {"nombre": {"$regex": q, "$options": "i"}}
        ]
    }
    
    productos = await db.inventarios.find(query).to_list(length=100)
    
    productos_array = []
    for producto in productos:
        productos_array.append({
            "id": str(producto["_id"]),
            "nombre": producto.get("descripcion") or producto.get("nombre", ""),
            "codigo": producto.get("codigo", ""),
            "precio": producto.get("precio_unitario", 0),
            "precio_usd": producto.get("precio_unitario", 0),
            "cantidad": producto.get("cantidad", 0),
            "stock": producto.get("cantidad", 0),
            "sucursal": sucursal
        })
    
    return productos_array  # ⚠️ Debe ser un array directo, NO un objeto
```

## ⚠️ IMPORTANTE

1. **El objeto `proveedor` DEBE estar poblado** en cada compra
2. **Los productos DEBEN venir como array directo**, no dentro de un objeto
3. **Los campos `dias_credito`, `descuento_comercial`, `descuento_pronto_pago` son CRÍTICOS** para el funcionamiento del frontend

