# Instrucciones Backend - Módulo de Compras con IVA y Cuentas por Pagar

Este documento detalla todas las funcionalidades implementadas en el frontend que requieren soporte del backend.

## 1. Funcionalidad de IVA en Compras

### 1.1. Actualización del Modelo de Compra

El modelo de `Compra` debe incluir los siguientes campos adicionales en los items:

```python
class ItemCompra(BaseModel):
    codigo: str
    descripcion: str
    marca: Optional[str] = None
    costo: float
    costo_ajustado: float  # Costo con ajuste de dólar negro si aplica
    lleva_iva: bool = False  # NUEVO: Indica si el producto lleva IVA
    iva: float = 0.0  # NUEVO: Monto del IVA (16% del costo_ajustado)
    utilidad: float  # Porcentaje de utilidad
    precio_venta: float
    cantidad: int
    fecha_vencimiento: Optional[str] = None
    lote: Optional[str] = None
    es_nuevo: bool
    producto_id: Optional[str] = None
    lotes_existentes: Optional[List[Dict]] = None
```

### 1.2. Cálculo del IVA

- Si `lleva_iva = True`, el IVA se calcula como: `iva = costo_ajustado * 0.16`
- El `precio_venta` se calcula como: `precio_venta = (costo_ajustado + iva) * (1 + utilidad / 100)`
- Si `lleva_iva = False`, el cálculo es: `precio_venta = costo_ajustado * (1 + utilidad / 100)`

### 1.3. Endpoint POST /compras

El endpoint debe aceptar los nuevos campos `lleva_iva` e `iva` en cada item:

```python
@app.post("/compras")
async def crear_compra(compra: CompraCreate, current_user: Usuario = Depends(get_current_user)):
    # Validar que si lleva_iva es True, el iva debe ser > 0
    for item in compra.items:
        if item.lleva_iva and item.iva <= 0:
            raise HTTPException(
                status_code=400,
                detail=f"El item {item.codigo} tiene lleva_iva=True pero iva={item.iva}"
            )
    
    # Guardar la compra con todos los campos
    compra_db = CompraDB(
        proveedor_id=compra.proveedor_id,
        sucursal_id=compra.sucursal_id,  # NUEVO: Campo de sucursal
        pagar_en_dolar_negro=compra.pagar_en_dolar_negro,
        dolar_bcv=compra.dolar_bcv,
        dolar_negro=compra.dolar_negro,
        items=compra.items,  # Incluye lleva_iva e iva
        fecha=datetime.now(),
        usuario_id=current_user._id
    )
    
    # Calcular totales
    subtotal = sum(item.costo_ajustado * item.cantidad for item in compra.items)
    total_iva = sum(item.iva * item.cantidad for item in compra.items if item.lleva_iva)
    total = subtotal + total_iva
    
    # Guardar en base de datos
    # ...
    
    return {
        "compra": compra_db,
        "subtotal": subtotal,
        "total_iva": total_iva,
        "total": total
    }
```

## 2. Selector de Sucursal en Compras

### 2.1. Campo sucursal_id en Compra

El modelo de `Compra` debe incluir el campo `sucursal_id`:

```python
class CompraCreate(BaseModel):
    proveedor_id: str
    sucursal_id: str  # NUEVO: ID de la sucursal donde se realiza la compra
    pagar_en_dolar_negro: bool
    dolar_bcv: float
    dolar_negro: float
    items: List[ItemCompra]
```

### 2.2. Endpoint GET /compras con filtro por sucursal

El endpoint debe permitir filtrar compras por sucursal:

```python
@app.get("/compras")
async def obtener_compras(
    sucursal_id: Optional[str] = None,  # NUEVO: Filtro opcional por sucursal
    current_user: Usuario = Depends(get_current_user)
):
    query = {}
    
    # Si se proporciona sucursal_id, filtrar por ella
    if sucursal_id:
        query["sucursal_id"] = sucursal_id
    
    compras = await db.compras.find(query).to_list(length=None)
    
    # Populate proveedor y sucursal
    for compra in compras:
        if compra.get("proveedor_id"):
            proveedor = await db.proveedores.find_one({"_id": compra["proveedor_id"]})
            compra["proveedor"] = proveedor
        
        if compra.get("sucursal_id"):
            # Obtener nombre de la sucursal desde /farmacias
            # O incluir en la respuesta
            compra["sucursal"] = {"id": compra["sucursal_id"], "nombre": "..."}
    
    return compras
```

## 3. Módulo de Cuentas por Pagar

### 3.1. Modelo de Pago

Crear un nuevo modelo para los pagos de compras:

```python
class PagoCompra(BaseModel):
    compra_id: str
    monto_bs: float
    monto_usd: float
    divisa: str  # "BS" o "USD"
    banco_id: str
    metodo_pago: str  # Ej: "Transferencia", "Pago Móvil", etc.
    tasa_bcv: float  # Tasa BCV del día del pago
    comprobante: Optional[str] = None  # Nombre del archivo en R2/S3
    fecha_pago: datetime
    usuario_id: str
```

### 3.2. Endpoint POST /compras/{compra_id}/pagos

Crear un nuevo pago para una compra:

```python
@app.post("/compras/{compra_id}/pagos")
async def crear_pago_compra(
    compra_id: str,
    pago: PagoCompraCreate,
    current_user: Usuario = Depends(get_current_user)
):
    # Verificar que la compra existe
    compra = await db.compras.find_one({"_id": ObjectId(compra_id)})
    if not compra:
        raise HTTPException(status_code=404, detail="Compra no encontrada")
    
    # Crear el pago
    pago_db = PagoCompraDB(
        compra_id=compra_id,
        monto_bs=pago.monto_bs,
        monto_usd=pago.monto_usd,
        divisa=pago.divisa,
        banco_id=pago.banco_id,
        metodo_pago=pago.metodo_pago,
        tasa_bcv=pago.tasa_bcv,
        comprobante=pago.comprobante,
        fecha_pago=datetime.now(),
        usuario_id=current_user._id
    )
    
    # Guardar en base de datos
    result = await db.pagos_compras.insert_one(pago_db.dict())
    pago_db._id = result.inserted_id
    
    # Calcular estado de la compra
    pagos_totales = await db.pagos_compras.find({"compra_id": compra_id}).to_list(length=None)
    monto_total_pagado = sum(p["monto_bs"] for p in pagos_totales)
    total_compra = compra.get("total_precio_venta", 0)
    
    # Actualizar estado de la compra
    if monto_total_pagado >= total_compra:
        estado = "pagada"
    elif monto_total_pagado > 0:
        estado = "abonado"
    else:
        estado = "sin_pago"
    
    # Actualizar compra con el nuevo estado (opcional, o calcularlo en GET)
    
    return pago_db
```

### 3.3. Endpoint GET /compras con pagos incluidos

El endpoint GET /compras debe incluir los pagos y calcular estados:

```python
@app.get("/compras")
async def obtener_compras(
    sucursal_id: Optional[str] = None,
    current_user: Usuario = Depends(get_current_user)
):
    query = {}
    if sucursal_id:
        query["sucursal_id"] = sucursal_id
    
    compras = await db.compras.find(query).to_list(length=None)
    
    for compra in compras:
        # Obtener pagos de la compra
        pagos = await db.pagos_compras.find({"compra_id": str(compra["_id"])}).to_list(length=None)
        compra["pagos"] = pagos
        
        # Calcular montos
        monto_abonado = sum(p["monto_bs"] for p in pagos)
        total_compra = compra.get("total_precio_venta", 0)
        monto_restante = total_compra - monto_abonado
        
        # Calcular estado
        if monto_abonado >= total_compra:
            estado = "pagada"
        elif monto_abonado > 0:
            estado = "abonado"
        else:
            estado = "sin_pago"
        
        compra["estado"] = estado
        compra["monto_abonado"] = monto_abonado
        compra["monto_restante"] = monto_restante
        
        # Calcular días de crédito y mora
        if compra.get("proveedor_id"):
            proveedor = await db.proveedores.find_one({"_id": compra["proveedor_id"]})
            if proveedor:
                compra["proveedor"] = proveedor
                dias_credito = proveedor.get("dias_credito", 0)
                
                if dias_credito > 0:
                    fecha_compra = compra.get("fecha", datetime.now())
                    if isinstance(fecha_compra, str):
                        fecha_compra = datetime.fromisoformat(fecha_compra.replace('Z', '+00:00'))
                    
                    fecha_vencimiento = fecha_compra + timedelta(days=dias_credito)
                    hoy = datetime.now()
                    
                    dias_transcurridos = (hoy - fecha_compra).days
                    dias_restantes = dias_credito - dias_transcurridos
                    en_mora = dias_restantes < 0 and estado != "pagada"
                    
                    compra["dias_credito"] = dias_credito
                    compra["dias_restantes"] = dias_restantes
                    compra["en_mora"] = en_mora
                    compra["fecha_vencimiento"] = fecha_vencimiento.isoformat()
    
    return compras
```

## 4. Estructura de Base de Datos

### 4.1. Colección: compras

```python
{
    "_id": ObjectId,
    "proveedor_id": str,
    "sucursal_id": str,  # NUEVO
    "fecha": datetime,
    "pagar_en_dolar_negro": bool,
    "dolar_bcv": float,
    "dolar_negro": float,
    "items": [
        {
            "codigo": str,
            "descripcion": str,
            "marca": str,
            "costo": float,
            "costo_ajustado": float,
            "lleva_iva": bool,  # NUEVO
            "iva": float,  # NUEVO
            "utilidad": float,
            "precio_venta": float,
            "cantidad": int,
            "fecha_vencimiento": str,
            "lote": str,
            "es_nuevo": bool,
            "producto_id": str,
            "lotes_existentes": []
        }
    ],
    "total_costo": float,
    "total_precio_venta": float,
    "subtotal": float,  # NUEVO: sin IVA
    "total_iva": float,  # NUEVO: total de IVA
    "total": float,  # NUEVO: subtotal + IVA
    "usuario_id": str,
    "created_at": datetime,
    "updated_at": datetime
}
```

### 4.2. Colección: pagos_compras (NUEVA)

```python
{
    "_id": ObjectId,
    "compra_id": str,
    "monto_bs": float,
    "monto_usd": float,
    "divisa": str,  # "BS" o "USD"
    "banco_id": str,
    "metodo_pago": str,
    "tasa_bcv": float,
    "comprobante": str,  # Nombre del archivo en R2/S3
    "fecha_pago": datetime,
    "usuario_id": str,
    "created_at": datetime
}
```

## 5. Endpoints Requeridos

### 5.1. Compras

- `GET /compras` - Listar todas las compras (con filtro opcional por sucursal_id)
- `GET /compras/{compra_id}` - Obtener una compra específica
- `POST /compras` - Crear una nueva compra (con campos de IVA y sucursal_id)
- `PUT /compras/{compra_id}` - Actualizar una compra (opcional)

### 5.2. Pagos de Compras

- `GET /compras/{compra_id}/pagos` - Obtener todos los pagos de una compra
- `POST /compras/{compra_id}/pagos` - Crear un nuevo pago para una compra
- `GET /pagos-compras` - Listar todos los pagos (opcional, para reportes)

### 5.3. Proveedores (ya existente, verificar)

- `GET /proveedores` - Listar proveedores
- `POST /proveedores` - Crear proveedor
- `PUT /proveedores/{id}` - Actualizar proveedor

## 6. Validaciones Importantes

### 6.1. Validación de IVA

- Si `lleva_iva = True`, el campo `iva` debe ser > 0
- El cálculo debe ser: `iva = costo_ajustado * 0.16`
- Si `lleva_iva = False`, el campo `iva` debe ser 0

### 6.2. Validación de Pagos

- El monto a pagar no puede ser mayor al monto restante de la compra
- Si se paga en Bs, el monto_usd debe calcularse: `monto_usd = monto_bs / tasa_bcv`
- Si se paga en USD, el monto_bs debe calcularse: `monto_bs = monto_usd * tasa_bcv`
- El banco_id debe existir en la colección de bancos
- El comprobante (si se proporciona) debe ser un nombre de archivo válido en R2/S3

### 6.3. Validación de Sucursal

- El `sucursal_id` debe existir en la lista de farmacias/sucursales
- Si se filtra por sucursal_id en GET /compras, solo devolver compras de esa sucursal

## 7. Cálculo de Totales en Compras

Al crear una compra, calcular:

```python
subtotal = sum(item.costo_ajustado * item.cantidad for item in compra.items)
total_iva = sum(item.iva * item.cantidad for item in compra.items if item.lleva_iva)
total = subtotal + total_iva
total_precio_venta = sum(item.precio_venta * item.cantidad for item in compra.items)
```

## 8. Ejemplo de Respuesta GET /compras

```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "proveedor_id": "507f1f77bcf86cd799439012",
    "proveedor": {
      "_id": "507f1f77bcf86cd799439012",
      "nombre": "Proveedor ABC",
      "rif": "J-123456789",
      "telefono": "04141234567",
      "dias_credito": 30,
      "descuento_comercial": 5,
      "descuento_pronto_pago": 2
    },
    "sucursal_id": "01",
    "sucursal": {
      "id": "01",
      "nombre": "Santa Elena"
    },
    "fecha": "2024-01-15T10:30:00Z",
    "pagar_en_dolar_negro": false,
    "dolar_bcv": 240.0,
    "dolar_negro": 372.0,
    "items": [
      {
        "codigo": "PROD001",
        "descripcion": "Producto de prueba",
        "marca": "Marca X",
        "costo": 10.0,
        "costo_ajustado": 10.0,
        "lleva_iva": true,
        "iva": 1.6,
        "utilidad": 30.0,
        "precio_venta": 15.08,
        "cantidad": 5,
        "fecha_vencimiento": "2025-12-31",
        "lote": "LOTE001",
        "es_nuevo": false,
        "producto_id": "507f1f77bcf86cd799439013"
      }
    ],
    "subtotal": 50.0,
    "total_iva": 8.0,
    "total": 58.0,
    "total_precio_venta": 75.4,
    "pagos": [
      {
        "_id": "507f1f77bcf86cd799439014",
        "monto_bs": 29000.0,
        "monto_usd": 100.0,
        "divisa": "USD",
        "banco_id": "507f1f77bcf86cd799439015",
        "metodo_pago": "Transferencia",
        "tasa_bcv": 290.0,
        "comprobante": "comprobantes/compra_001.jpg",
        "fecha_pago": "2024-01-20T14:00:00Z"
      }
    ],
    "estado": "abonado",
    "monto_abonado": 100.0,
    "monto_restante": 0.0,
    "dias_credito": 30,
    "dias_restantes": 15,
    "en_mora": false,
    "fecha_vencimiento": "2024-02-14T10:30:00Z"
  }
]
```

## 9. Notas Importantes

1. **IVA**: El IVA siempre se calcula sobre el `costo_ajustado` (después del ajuste de dólar negro si aplica)
2. **Días de Crédito**: Se calculan desde la fecha de la compra, no desde la fecha actual
3. **Estado de Mora**: Una compra está en mora si:
   - `dias_restantes < 0` Y
   - `estado != "pagada"`
4. **Comprobantes**: Los comprobantes se almacenan en R2/S3 usando el mismo sistema que otros archivos (gastos, cuadres, etc.)
5. **Tasa BCV**: Para compras con `pagar_en_dolar_negro = false`, se debe solicitar la tasa BCV del día del pago
6. **Filtros**: El endpoint GET /compras debe soportar filtros por:
   - `sucursal_id` (opcional)
   - `estado` (opcional: "sin_pago", "abonado", "pagada", "en_mora")

## 10. Permisos

El módulo de compras requiere el permiso `"compras"` en el sistema de permisos de usuarios.

