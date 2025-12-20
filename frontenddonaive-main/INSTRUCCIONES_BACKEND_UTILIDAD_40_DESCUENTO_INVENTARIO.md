# 📋 INSTRUCCIONES BACKEND: Utilidad del 40% y Descuento de Inventario

## 🎯 REQUERIMIENTOS PRINCIPALES

### 1. Utilidad del 40% por Defecto
**CRÍTICO:** Todo el inventario debe tener una utilidad del **40%** por defecto. Cuando se crea un producto nuevo o se carga inventario masivamente, si no se especifica una utilidad, debe calcularse automáticamente como el **40% del costo**.

### 2. Descuento de Inventario al Confirmar Venta
**CRÍTICO:** Cuando se confirma e imprime una factura en el punto de venta, la cantidad vendida de cada producto **DEBE** descontarse automáticamente del inventario de la sucursal correspondiente.

---

## 📦 PARTE 1: UTILIDAD DEL 40%

### Fórmula de Cálculo

La utilidad del 40% se calcula sobre el costo:

```
Utilidad (en dinero) = Costo × 0.40
Precio de Venta = Costo + Utilidad
Precio de Venta = Costo × 1.40
```

**Ejemplo:**
- Costo: $10.00
- Utilidad (40%): $4.00
- Precio de Venta: $14.00

### Endpoints Afectados

#### 1. `POST /inventarios/upload-excel`

**Request Body:**
```json
{
  "sucursal": "sucursal_id",
  "productos": [
    {
      "codigo": "PROD001",
      "nombre": "Aspirina 500mg",
      "marca": "Bayer",
      "costo": 2.50,
      "utilidad": 1.00,  // Opcional: si viene vacío o 0, calcular 40%
      "precio": 3.50,     // Opcional: se calcula automáticamente si no viene
      "stock": 100
    }
  ]
}
```

**Lógica Requerida:**

```python
for producto in request.productos:
    costo = producto.costo or 0
    
    # ✅ Si utilidad es 0 o no viene, calcular automáticamente el 40%
    if not producto.utilidad or producto.utilidad == 0:
        utilidad = costo * 0.40  # 40% de utilidad
    else:
        utilidad = producto.utilidad
    
    # Calcular precio si no viene
    if not producto.precio or producto.precio == 0:
        precio = costo + utilidad
    else:
        precio = producto.precio
    
    # Guardar producto con utilidad y porcentaje
    producto_data = {
        "codigo": producto.codigo,
        "nombre": producto.nombre,
        "marca": producto.marca,
        "costo": costo,
        "utilidad": utilidad,
        "utilidad_porcentaje": 40.0 if (costo * 0.40 == utilidad) else (utilidad / costo * 100),
        "precio": precio,
        "stock": producto.stock,
        "sucursal": request.sucursal
    }
```

#### 2. `POST /inventarios/cargar-existencia`

**Request Body:**
```json
{
  "farmacia": "sucursal_id",
  "productos": [
    {
      "producto_id": "producto_id",
      "cantidad": 10,
      "costo": 5.00,
      "utilidad": 2.00,              // Opcional
      "porcentaje_utilidad": 40.0    // Opcional, default: 40%
    }
  ]
}
```

**Lógica Requerida:**

```python
for producto_request in request.productos:
    costo = producto_request.get("costo") or 0
    utilidad_proporcionada = producto_request.get("utilidad")
    porcentaje_proporcionado = producto_request.get("porcentaje_utilidad")
    
    # ✅ Si no hay utilidad ni porcentaje, usar 40% por defecto
    if not utilidad_proporcionada and not porcentaje_proporcionado:
        porcentaje_utilidad = 40.0
        utilidad = costo * 0.40
    elif porcentaje_proporcionado:
        porcentaje_utilidad = porcentaje_proporcionado
        utilidad = costo * (porcentaje_utilidad / 100)
    elif utilidad_proporcionada:
        utilidad = utilidad_proporcionada
        porcentaje_utilidad = (utilidad / costo * 100) if costo > 0 else 40.0
    
    # Calcular precio
    precio = costo + utilidad
    
    # Actualizar producto en inventario
    # ... código de actualización ...
```

#### 3. `POST /inventarios/{inventario_id}/items` (Crear nuevo producto)

**Request Body:**
```json
{
  "codigo": "PROD001",
  "descripcion": "Aspirina 500mg",
  "marca": "Bayer",
  "costo": 2.50,
  "existencia": 100,
  "utilidad": 1.00,              // Opcional
  "porcentaje_utilidad": 40.0    // Opcional, default: 40%
}
```

**Lógica Requerida:**

```python
costo = request.costo or 0
utilidad_proporcionada = request.get("utilidad")
porcentaje_proporcionado = request.get("porcentaje_utilidad", 40.0)  # Default: 40%

# ✅ Si no hay utilidad, calcular desde porcentaje (default 40%)
if not utilidad_proporcionada:
    porcentaje_utilidad = porcentaje_proporcionado or 40.0
    utilidad = costo * (porcentaje_utilidad / 100)
else:
    utilidad = utilidad_proporcionada
    porcentaje_utilidad = (utilidad / costo * 100) if costo > 0 else 40.0

precio = costo + utilidad

item_data = {
    "codigo": request.codigo,
    "descripcion": request.descripcion,
    "marca": request.marca,
    "costo_unitario": costo,
    "utilidad": utilidad,
    "utilidad_porcentaje": porcentaje_utilidad,
    "precio_unitario": precio,
    "cantidad": request.existencia,
    "existencia": request.existencia
}
```

### Estructura de Base de Datos

**Colección: `items_inventario` o `productos`**

```javascript
{
  _id: ObjectId,
  codigo: String,
  descripcion: String,
  marca: String,
  costo_unitario: Number,        // Costo del producto
  utilidad: Number,              // Utilidad en dinero (calculada: costo × 0.40 por defecto)
  utilidad_porcentaje: Number,   // Porcentaje de utilidad (default: 40.0)
  precio_unitario: Number,        // Precio de venta (costo + utilidad)
  cantidad: Number,              // Existencia actual
  existencia: Number,             // Alias de cantidad
  sucursal: String,              // ID de la sucursal
  inventario_id: String,          // ID del inventario
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

---

## 📦 PARTE 2: DESCUENTO DE INVENTARIO AL CONFIRMAR VENTA

### Endpoint: `POST /punto-venta/ventas`

**CRÍTICO:** Cuando se confirma una venta, **DEBE** descontarse automáticamente la cantidad vendida del inventario.

### Request Body

```json
{
  "items": [
    {
      "producto_id": "690c40be93d9d9d635fbae83",
      "nombre": "SPRAY DIESEL TOOLS AZUL CIELO",
      "codigo": "12345",
      "cantidad": 2,
      "precio_unitario": 360.03,
      "precio_unitario_usd": 3.00,
      "subtotal": 720.06,
      "subtotal_usd": 6.00
    }
  ],
  "metodos_pago": [
    {
      "tipo": "efectivo",
      "monto": 10.00,
      "divisa": "USD"
    }
  ],
  "total_bs": 1500.00,
  "total_usd": 12.50,
  "tasa_dia": 120.00,
  "sucursal": "690c40be93d9d9d635fbaf5b",
  "cajero": "usuario@ejemplo.com",
  "cliente": "cliente_id",
  "porcentaje_descuento": 0,
  "notas": ""
}
```

### Implementación Paso a Paso

#### PASO 1: Obtener Inventario de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "farmacia": venta_data.sucursal,
    "estado": "activo"
})

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
    )

inventario_id = inventario["_id"]
```

#### PASO 2: Procesar Cada Item y Descontar Stock

```python
items_procesados = []

# Usar transacción para garantizar atomicidad
async with await db.client.start_session() as session:
    async with session.start_transaction():
        for item_venta in venta_data.items:
            producto_id = ObjectId(item_venta.producto_id)
            cantidad_vendida = item_venta.cantidad
            
            # Buscar el item en el inventario
            # Opción 1: Buscar en items del inventario (si están embebidos)
            inventario_actualizado = await db.inventarios.find_one(
                {"_id": inventario_id},
                session=session
            )
            
            items = inventario_actualizado.get("items", [])
            item_encontrado = None
            item_index = -1
            
            for idx, item in enumerate(items):
                # Buscar por producto_id, _id, o codigo
                item_producto_id = item.get("producto_id") or item.get("_id") or item.get("id")
                item_codigo = item.get("codigo")
                
                if (str(item_producto_id) == str(producto_id) or 
                    item_codigo == item_venta.codigo):
                    item_encontrado = item
                    item_index = idx
                    break
            
            if not item_encontrado:
                raise HTTPException(
                    status_code=404,
                    detail=f"Producto {item_venta.nombre} (ID: {producto_id}) no encontrado en el inventario"
                )
            
            # Verificar stock disponible
            stock_actual = item_encontrado.get("cantidad", item_encontrado.get("existencia", 0))
            
            if stock_actual < cantidad_vendida:
                raise HTTPException(
                    status_code=400,
                    detail=f"Stock insuficiente para {item_venta.nombre}. Stock disponible: {stock_actual}, solicitado: {cantidad_vendida}"
                )
            
            # ⚠️ CRÍTICO: Descontar la cantidad vendida del inventario
            nueva_cantidad = stock_actual - cantidad_vendida
            
            # Actualizar el item en el inventario
            items[item_index]["cantidad"] = nueva_cantidad
            items[item_index]["existencia"] = nueva_cantidad  # Mantener consistencia
            items[item_index]["fecha_actualizacion"] = datetime.now()
            
            # Actualizar el inventario completo
            await db.inventarios.update_one(
                {"_id": inventario_id},
                {
                    "$set": {
                        "items": items,
                        "fecha_actualizacion": datetime.now()
                    }
                },
                session=session
            )
            
            # Recalcular costo total del inventario
            costo_total = sum(
                item.get("costo_unitario", 0) * item.get("cantidad", 0) 
                for item in items
            )
            
            await db.inventarios.update_one(
                {"_id": inventario_id},
                {
                    "$set": {
                        "costo": costo_total
                    }
                },
                session=session
            )
            
            # Agregar a items procesados para guardar en la venta
            items_procesados.append({
                "producto_id": str(item_encontrado.get("_id") or producto_id),
                "nombre": item_venta.nombre,
                "codigo": item_venta.codigo,
                "cantidad": cantidad_vendida,
                "precio_unitario": item_venta.precio_unitario,
                "precio_unitario_usd": item_venta.precio_unitario_usd,
                "subtotal": item_venta.subtotal,
                "subtotal_usd": item_venta.subtotal_usd
            })
        
        # Registrar la venta
        venta_document = {
            "numero_factura": generar_numero_factura(),
            "fecha": datetime.now(),
            "sucursal": venta_data.sucursal,
            "cajero": venta_data.cajero,
            "cliente": venta_data.cliente,
            "items": items_procesados,
            "metodos_pago": venta_data.metodos_pago,
            "total_bs": venta_data.total_bs,
            "total_usd": venta_data.total_usd,
            "tasa_dia": venta_data.tasa_dia,
            "porcentaje_descuento": venta_data.porcentaje_descuento,
            "estado": "procesada",
            "notas": venta_data.notas
        }
        
        resultado_venta = await db.ventas.insert_one(venta_document, session=session)
        
        # Commit de la transacción
        await session.commit_transaction()
        
        return {
            "_id": str(resultado_venta.inserted_id),
            "numero_factura": venta_document["numero_factura"],
            "mensaje": "Venta registrada exitosamente. Inventario actualizado."
        }
```

### Validaciones Requeridas

1. **Inventario Existe:** Verificar que existe un inventario activo para la sucursal
2. **Producto Existe:** Verificar que cada producto existe en el inventario
3. **Stock Suficiente:** Verificar que hay suficiente stock antes de descontar
4. **No Stock Negativo:** Nunca permitir que el stock quede negativo
5. **Transacciones:** Usar transacciones de MongoDB para asegurar atomicidad

### Manejo de Lotes (Opcional)

Si los productos tienen lotes, descontar usando FIFO (First In, First Out):

```python
# Si el producto tiene lotes
if "lotes" in item_encontrado and item_encontrado["lotes"]:
    cantidad_restante = cantidad_vendida
    
    # Ordenar lotes por fecha de vencimiento (más antiguos primero)
    lotes_ordenados = sorted(
        item_encontrado["lotes"],
        key=lambda x: x.get("fecha_vencimiento", datetime.max)
    )
    
    for lote in lotes_ordenados:
        if cantidad_restante <= 0:
            break
        
        cantidad_lote = lote.get("cantidad", 0)
        cantidad_a_descontar = min(cantidad_restante, cantidad_lote)
        
        lote["cantidad"] = cantidad_lote - cantidad_a_descontar
        cantidad_restante -= cantidad_a_descontar
        
        # Si el lote se agotó, marcarlo o eliminarlo
        if lote["cantidad"] <= 0:
            lote["cantidad"] = 0
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Utilidad del 40%

- [ ] `POST /inventarios/upload-excel`: Calcular utilidad del 40% si no viene
- [ ] `POST /inventarios/cargar-existencia`: Usar 40% por defecto si no se especifica
- [ ] `POST /inventarios/{inventario_id}/items`: Calcular utilidad del 40% por defecto
- [ ] `PATCH /inventarios/{inventario_id}/items/{item_id}`: Mantener 40% si no se modifica
- [ ] Guardar `utilidad_porcentaje: 40.0` en la base de datos
- [ ] Calcular `precio_unitario = costo_unitario + utilidad`

### Descuento de Inventario

- [ ] `POST /punto-venta/ventas`: Descontar cantidad vendida del inventario
- [ ] Buscar inventario activo de la sucursal
- [ ] Buscar cada producto en el inventario
- [ ] Validar stock disponible antes de descontar
- [ ] Descontar cantidad vendida del inventario
- [ ] Manejar lotes con FIFO (si aplica)
- [ ] Actualizar existencias en la base de datos
- [ ] Recalcular costo total del inventario
- [ ] Usar transacciones para garantizar atomicidad
- [ ] Manejar errores (stock insuficiente, producto no encontrado)
- [ ] Retornar confirmación al frontend

---

## 🎯 RESULTADO ESPERADO

### Al Crear/Cargar Productos:

1. ✅ Si no se especifica utilidad, se calcula automáticamente como 40% del costo
2. ✅ El precio se calcula como: `Costo + Utilidad`
3. ✅ Se guarda `utilidad_porcentaje: 40.0` en la base de datos
4. ✅ El frontend puede verificar que el producto tiene 40% de utilidad

### Al Confirmar Venta en Punto de Venta:

1. ✅ La cantidad vendida se descuenta automáticamente del inventario
2. ✅ Las existencias se actualizan en tiempo real
3. ✅ Si hay lotes, se descuenta usando FIFO
4. ✅ Se valida que hay suficiente stock antes de descontar
5. ✅ La venta se registra correctamente
6. ✅ El frontend recibe confirmación de la venta

---

## 📌 NOTAS IMPORTANTES

1. **Momento del Descuento:** El descuento debe ocurrir **INMEDIATAMENTE** cuando se confirma la venta, no después.

2. **Atomicidad:** Usar transacciones de MongoDB para asegurar que:
   - Si falla el registro de la venta, NO se descuenta el stock
   - Si falla el descuento del stock, NO se registra la venta

3. **Stock Negativo:** NUNCA permitir que el stock quede negativo. Validar antes de descontar.

4. **Utilidad por Defecto:** El 40% es el valor por defecto, pero puede ser modificado manualmente si es necesario.

5. **Consistencia:** Mantener `cantidad` y `existencia` sincronizados (son el mismo campo).

---

## 🔄 FLUJO VISUAL COMPLETO

```
Usuario crea producto
    ↓
Si no especifica utilidad → Calcular 40% automáticamente
    ↓
Guardar producto con utilidad_porcentaje: 40.0
    ↓
Usuario en Punto de Venta
    ↓
Selecciona productos y cantidades
    ↓
Presiona "Confirmar e Imprimir Factura"
    ↓
Frontend envía POST /punto-venta/ventas
    ↓
Backend recibe la petición
    ↓
✅ DESCUENTA CANTIDAD DEL INVENTARIO (CRÍTICO)
    ↓
Actualiza existencias en la base de datos
    ↓
Registra la venta
    ↓
Retorna confirmación al frontend
    ↓
Frontend imprime factura
```

---

## 📝 EJEMPLOS DE CÓDIGO

### Ejemplo Completo: Crear Producto con Utilidad 40%

```python
@router.post("/inventarios/{inventario_id}/items")
async def crear_item_inventario(
    inventario_id: str,
    item_data: ItemInventarioRequest,
    current_user: dict = Depends(get_current_user)
):
    costo = item_data.costo or 0
    
    # ✅ Calcular utilidad del 40% si no viene
    if not item_data.utilidad or item_data.utilidad == 0:
        porcentaje_utilidad = item_data.porcentaje_utilidad or 40.0
        utilidad = costo * (porcentaje_utilidad / 100)
    else:
        utilidad = item_data.utilidad
        porcentaje_utilidad = (utilidad / costo * 100) if costo > 0 else 40.0
    
    precio = costo + utilidad
    
    nuevo_item = {
        "codigo": item_data.codigo,
        "descripcion": item_data.descripcion,
        "marca": item_data.marca,
        "costo_unitario": costo,
        "utilidad": utilidad,
        "utilidad_porcentaje": porcentaje_utilidad,
        "precio_unitario": precio,
        "cantidad": item_data.existencia,
        "existencia": item_data.existencia,
        "fecha_creacion": datetime.now(),
        "fecha_actualizacion": datetime.now()
    }
    
    # Agregar al inventario
    # ... código de actualización ...
```

### Ejemplo Completo: Descontar Inventario al Confirmar Venta

```python
@router.post("/punto-venta/ventas")
async def crear_venta(
    venta_data: VentaRequest,
    current_user: dict = Depends(get_current_user)
):
    # Obtener inventario activo
    inventario = await db.inventarios.find_one({
        "farmacia": venta_data.sucursal,
        "estado": "activo"
    })
    
    if not inventario:
        raise HTTPException(
            status_code=404,
            detail=f"Inventario activo no encontrado para la sucursal {venta_data.sucursal}"
        )
    
    # Usar transacción
    async with await db.client.start_session() as session:
        async with session.start_transaction():
            items_procesados = []
            
            for item_venta in venta_data.items:
                # Buscar producto en inventario
                # ... código de búsqueda ...
                
                # Validar stock
                if stock_actual < cantidad_vendida:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Stock insuficiente para {item_venta.nombre}"
                    )
                
                # Descontar stock
                nueva_cantidad = stock_actual - cantidad_vendida
                items[item_index]["cantidad"] = nueva_cantidad
                items[item_index]["existencia"] = nueva_cantidad
            
            # Actualizar inventario
            await db.inventarios.update_one(
                {"_id": inventario["_id"]},
                {"$set": {"items": items}},
                session=session
            )
            
            # Registrar venta
            venta_doc = {
                "items": items_procesados,
                "metodos_pago": venta_data.metodos_pago,
                "total_usd": venta_data.total_usd,
                "estado": "procesada",
                # ... otros campos ...
            }
            
            resultado = await db.ventas.insert_one(venta_doc, session=session)
            await session.commit_transaction()
            
            return {
                "_id": str(resultado.inserted_id),
                "mensaje": "Venta registrada exitosamente"
            }
```

---

**Última actualización:** 2025-01-XX
**Versión:** 1.0

