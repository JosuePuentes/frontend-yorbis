# Instrucciones Backend - Gestión de Clientes para Punto de Venta

## Endpoints Requeridos

### 1. Obtener Todos los Clientes
**GET** `/clientes`

**Descripción:** Obtiene la lista de todos los clientes registrados.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
[
  {
    "_id": "690c40be93d9d9d635fbae83",
    "id": "690c40be93d9d9d635fbae83",
    "cedula": "12345678",
    "nombre": "Juan Pérez",
    "direccion": "Av. Principal #123",
    "telefono": "0412-1234567",
    "porcentaje_descuento": 10.5,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
  }
]
```

---

### 2. Crear Cliente
**POST** `/clientes`

**Descripción:** Crea un nuevo cliente en el sistema.

**Headers:**
- `Authorization: Bearer {token}` (requerido)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "cedula": "12345678",
  "nombre": "Juan Pérez",
  "direccion": "Av. Principal #123",
  "telefono": "0412-1234567",
  "porcentaje_descuento": 10.5
}
```

**Campos:**
- `cedula` (string, requerido): Cédula del cliente
- `nombre` (string, requerido): Nombre completo del cliente
- `direccion` (string, opcional): Dirección del cliente
- `telefono` (string, opcional): Número de teléfono del cliente
- `porcentaje_descuento` (number, opcional): Porcentaje de descuento (0-100), por defecto 0

**Respuesta Exitosa (201 Created):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "id": "690c40be93d9d9d635fbae83",
  "cedula": "12345678",
  "nombre": "Juan Pérez",
  "direccion": "Av. Principal #123",
  "telefono": "0412-1234567",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Errores posibles:**
- `400 Bad Request`: Si faltan campos requeridos o la cédula ya existe
- `401 Unauthorized`: Si no hay token o es inválido
- `409 Conflict`: Si la cédula ya está registrada

---

### 7. Buscar Clientes
**GET** `/clientes/buscar?q={query}`

**Descripción:** Busca clientes por cédula o nombre (búsqueda en tiempo real).

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Query Parameters:**
- `q` (string, requerido): Término de búsqueda (mínimo 2 caracteres)

**Respuesta Exitosa (200 OK):**
```json
[
  {
    "_id": "690c40be93d9d9d635fbae83",
    "id": "690c40be93d9d9d635fbae83",
    "cedula": "12345678",
    "nombre": "Juan Pérez",
    "direccion": "Av. Principal #123",
    "telefono": "0412-1234567",
    "porcentaje_descuento": 10.5
  },
  {
    "_id": "690c40be93d9d9d635fbae84",
    "id": "690c40be93d9d9d635fbae84",
    "cedula": "87654321",
    "nombre": "María González",
    "direccion": "Calle Secundaria #456",
    "telefono": "0414-9876543"
  }
]
```

**Notas:**
- La búsqueda debe ser case-insensitive
- Debe buscar tanto en `cedula` como en `nombre`
- Debe retornar resultados incluso con coincidencias parciales
- Retorna un array vacío `[]` si no hay resultados

---

### 3. Actualizar Cliente
**PUT** `/clientes/{cliente_id}`

**Descripción:** Actualiza los datos de un cliente existente.

**Headers:**
- `Authorization: Bearer {token}` (requerido)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "cedula": "12345678",
  "nombre": "Juan Pérez",
  "direccion": "Av. Principal #123",
  "telefono": "0412-1234567",
  "porcentaje_descuento": 15.0
}
```

**Campos:**
- `cedula` (string, requerido): Cédula del cliente
- `nombre` (string, requerido): Nombre completo del cliente
- `direccion` (string, opcional): Dirección del cliente
- `telefono` (string, opcional): Número de teléfono del cliente
- `porcentaje_descuento` (number, opcional): Porcentaje de descuento (0-100), por defecto 0

**Respuesta Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "id": "690c40be93d9d9d635fbae83",
  "cedula": "12345678",
  "nombre": "Juan Pérez",
  "direccion": "Av. Principal #123",
  "telefono": "0412-1234567",
  "porcentaje_descuento": 15.0,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T11:45:00Z"
}
```

**Errores posibles:**
- `400 Bad Request`: Si faltan campos requeridos
- `401 Unauthorized`: Si no hay token o es inválido
- `404 Not Found`: Si el cliente no existe
- `409 Conflict`: Si la cédula ya está registrada en otro cliente

---

### 4. Eliminar Cliente
**DELETE** `/clientes/{cliente_id}`

**Descripción:** Elimina un cliente del sistema.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
{
  "message": "Cliente eliminado exitosamente"
}
```

**Errores posibles:**
- `401 Unauthorized`: Si no hay token o es inválido
- `404 Not Found`: Si el cliente no existe

---

### 5. Obtener Cliente por ID
**GET** `/clientes/{cliente_id}`

**Descripción:** Obtiene los datos de un cliente específico.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "id": "690c40be93d9d9d635fbae83",
  "cedula": "12345678",
  "nombre": "Juan Pérez",
    "direccion": "Av. Principal #123",
    "telefono": "0412-1234567",
    "porcentaje_descuento": 10.5,
    "createdAt": "2025-01-15T10:30:00Z",
    "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Errores posibles:**
- `404 Not Found`: Si el cliente no existe
- `401 Unauthorized`: Si no hay token o es inválido

---

### 6. Buscar Clientes

## Estructura de Base de Datos Sugerida

### Modelo: Cliente

```python
class Cliente(BaseModel):
    _id: Optional[PyObjectId] = Field(default_factory=PyObjectId, alias="_id")
    cedula: str  # Requerido, único
    nombre: str  # Requerido
    direccion: Optional[str] = None
    telefono: Optional[str] = None
    porcentaje_descuento: Optional[float] = 0  # Porcentaje de descuento (0-100)
    createdAt: Optional[datetime] = None
    updatedAt: Optional[datetime] = None

    class Config:
        populate_by_name = True
        arbitrary_types_allowed = True
        json_schema_extra = {
            "example": {
                "cedula": "12345678",
                "nombre": "Juan Pérez",
                "direccion": "Av. Principal #123",
                "telefono": "0412-1234567"
            }
        }
```

### Índices Recomendados

```python
# Crear índices para mejorar búsquedas
db.clientes.create_index([("cedula", 1)], unique=True)
db.clientes.create_index([("nombre", "text")])
db.clientes.create_index([("cedula", "text")])
```

---

## Ejemplo de Implementación (Python/FastAPI)

### Endpoint: POST /clientes

```python
@router.post("/clientes")
async def crear_cliente(
    cliente_data: ClienteCreate,
    current_user: User = Depends(get_current_user)
):
    # Verificar si la cédula ya existe
    cliente_existente = await db.clientes.find_one({"cedula": cliente_data.cedula})
    if cliente_existente:
        raise HTTPException(
            status_code=409,
            detail="Ya existe un cliente con esta cédula"
        )
    
    # Crear nuevo cliente
    nuevo_cliente = {
        "cedula": cliente_data.cedula,
        "nombre": cliente_data.nombre,
        "direccion": cliente_data.direccion,
        "telefono": cliente_data.telefono,
        "porcentaje_descuento": cliente_data.porcentaje_descuento or 0,
        "createdAt": datetime.utcnow(),
        "updatedAt": datetime.utcnow()
    }
    
    result = await db.clientes.insert_one(nuevo_cliente)
    nuevo_cliente["_id"] = result.inserted_id
    nuevo_cliente["id"] = str(result.inserted_id)
    
    return nuevo_cliente
```

### Endpoint: GET /clientes

```python
@router.get("/clientes")
async def obtener_clientes(
    current_user: User = Depends(get_current_user)
):
    clientes = await db.clientes.find().to_list(length=None)
    
    return [
        {
            "_id": str(cliente["_id"]),
            "id": str(cliente["_id"]),
            "cedula": cliente.get("cedula", ""),
            "nombre": cliente.get("nombre", ""),
            "direccion": cliente.get("direccion"),
            "telefono": cliente.get("telefono"),
            "porcentaje_descuento": cliente.get("porcentaje_descuento", 0),
            "createdAt": cliente.get("createdAt"),
            "updatedAt": cliente.get("updatedAt")
        }
        for cliente in clientes
    ]
```

### Endpoint: PUT /clientes/{cliente_id}

```python
@router.put("/clientes/{cliente_id}")
async def actualizar_cliente(
    cliente_id: str,
    cliente_data: ClienteUpdate,
    current_user: User = Depends(get_current_user)
):
    try:
        # Verificar si el cliente existe
        cliente = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # Verificar si la cédula ya existe en otro cliente
        if cliente_data.cedula and cliente_data.cedula != cliente.get("cedula"):
            cliente_existente = await db.clientes.find_one({
                "cedula": cliente_data.cedula,
                "_id": {"$ne": ObjectId(cliente_id)}
            })
            if cliente_existente:
                raise HTTPException(
                    status_code=409,
                    detail="Ya existe un cliente con esta cédula"
                )
        
        # Validar porcentaje de descuento
        porcentaje_descuento = cliente_data.porcentaje_descuento or 0
        if porcentaje_descuento < 0 or porcentaje_descuento > 100:
            raise HTTPException(
                status_code=400,
                detail="El porcentaje de descuento debe estar entre 0 y 100"
            )
        
        # Actualizar cliente
        update_data = {
            "cedula": cliente_data.cedula,
            "nombre": cliente_data.nombre,
            "direccion": cliente_data.direccion,
            "telefono": cliente_data.telefono,
            "porcentaje_descuento": porcentaje_descuento,
            "updatedAt": datetime.utcnow()
        }
        
        await db.clientes.update_one(
            {"_id": ObjectId(cliente_id)},
            {"$set": update_data}
        )
        
        # Obtener cliente actualizado
        cliente_actualizado = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        
        return {
            "_id": str(cliente_actualizado["_id"]),
            "id": str(cliente_actualizado["_id"]),
            "cedula": cliente_actualizado.get("cedula", ""),
            "nombre": cliente_actualizado.get("nombre", ""),
            "direccion": cliente_actualizado.get("direccion"),
            "telefono": cliente_actualizado.get("telefono"),
            "porcentaje_descuento": cliente_actualizado.get("porcentaje_descuento", 0),
            "createdAt": cliente_actualizado.get("createdAt"),
            "updatedAt": cliente_actualizado.get("updatedAt")
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de cliente inválido")
```

### Endpoint: DELETE /clientes/{cliente_id}

```python
@router.delete("/clientes/{cliente_id}")
async def eliminar_cliente(
    cliente_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        cliente = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        await db.clientes.delete_one({"_id": ObjectId(cliente_id)})
        
        return {"message": "Cliente eliminado exitosamente"}
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de cliente inválido")
```

### Endpoint: GET /clientes/buscar

```python
@router.get("/clientes/buscar")
async def buscar_clientes(
    q: str,
    current_user: User = Depends(get_current_user)
):
    if len(q) < 2:
        return []
    
    # Búsqueda case-insensitive en cedula y nombre
    query = {
        "$or": [
            {"cedula": {"$regex": q, "$options": "i"}},
            {"nombre": {"$regex": q, "$options": "i"}}
        ]
    }
    
    clientes = await db.clientes.find(query).limit(10).to_list(length=10)
    
    return [
        {
            "_id": str(cliente["_id"]),
            "id": str(cliente["_id"]),
            "cedula": cliente.get("cedula", ""),
            "nombre": cliente.get("nombre", ""),
            "direccion": cliente.get("direccion"),
            "telefono": cliente.get("telefono"),
            "porcentaje_descuento": cliente.get("porcentaje_descuento", 0)
        }
        for cliente in clientes
    ]
```

### Endpoint: GET /clientes/{cliente_id}

```python
@router.get("/clientes/{cliente_id}")
async def obtener_cliente(
    cliente_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        cliente = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        return {
            "_id": str(cliente["_id"]),
            "id": str(cliente["_id"]),
            "cedula": cliente.get("cedula", ""),
            "nombre": cliente.get("nombre", ""),
            "direccion": cliente.get("direccion"),
            "telefono": cliente.get("telefono"),
            "porcentaje_descuento": cliente.get("porcentaje_descuento", 0),
            "createdAt": cliente.get("createdAt"),
            "updatedAt": cliente.get("updatedAt")
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de cliente inválido")
```

---

### 8. Obtener Total de Compras de un Cliente
**GET** `/clientes/{cliente_id}/compras/total`

**Descripción:** Obtiene el total en USD que ha gastado un cliente en todas sus compras.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
{
  "cliente_id": "690c40be93d9d9d635fbae83",
  "total_usd": 1250.50,
  "total_bs": 56897.75,
  "numero_ventas": 15
}
```

**Errores posibles:**
- `404 Not Found`: Si el cliente no existe
- `401 Unauthorized`: Si no hay token o es inválido

---

### 9. Obtener Items Comprados por un Cliente
**GET** `/clientes/{cliente_id}/compras/items`

**Descripción:** Obtiene todos los items/productos que ha comprado un cliente en todas sus ventas.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
[
  {
    "producto_id": "690c40be93d9d9d635fbae84",
    "nombre": "Paracetamol 500mg",
    "codigo": "PROD001",
    "cantidad": 2,
    "precio_unitario": 113.75,
    "precio_unitario_usd": 2.50,
    "subtotal": 227.50,
    "subtotal_usd": 5.00,
    "fecha_venta": "2025-01-15T10:30:00Z"
  },
  {
    "producto_id": "690c40be93d9d9d635fbae85",
    "nombre": "Aspirina 100mg",
    "codigo": "PROD002",
    "cantidad": 1,
    "precio_unitario": 91.00,
    "precio_unitario_usd": 2.00,
    "subtotal": 91.00,
    "subtotal_usd": 2.00,
    "fecha_venta": "2025-01-16T14:20:00Z"
  }
]
```

**Notas:**
- Retorna un array vacío `[]` si el cliente no ha realizado compras
- Los items están ordenados por fecha de venta (más reciente primero)
- Cada item incluye información de la venta donde se compró

**Errores posibles:**
- `404 Not Found`: Si el cliente no existe
- `401 Unauthorized`: Si no hay token o es inválido

---

## Integración con Punto de Venta

El campo `cliente` en el endpoint de ventas (`POST /punto-venta/ventas`) debe aceptar el ID del cliente:

```json
{
  "items": [...],
  "metodos_pago": [...],
  "total_bs": 1000,
  "total_usd": 20,
  "tasa_dia": 50,
  "sucursal": "01",
  "cajero": "cajero@email.com",
  "cliente": "690c40be93d9d9d635fbae83",  // ID del cliente (opcional)
  "notas": ""
}
```

---

## Validaciones

1. **Cédula:**
   - Debe ser única en el sistema
   - No puede estar vacía
   - Formato recomendado: solo números (pero puede aceptar letras si es necesario)

2. **Nombre:**
   - No puede estar vacío
   - Mínimo 2 caracteres recomendado

3. **Teléfono:**
   - Opcional
   - Formato flexible (aceptar con o sin guiones, espacios, etc.)

4. **Dirección:**
   - Opcional
   - Sin restricciones de formato

---

## Ejemplo de Implementación - Endpoints de Compras

### Endpoint: GET /clientes/{cliente_id}/compras/total

```python
@router.get("/clientes/{cliente_id}/compras/total")
async def obtener_total_compras_cliente(
    cliente_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        # Verificar que el cliente existe
        cliente = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # Buscar todas las ventas de este cliente
        ventas = await db.ventas.find({"cliente": cliente_id}).to_list(length=None)
        
        total_usd = sum(venta.get("total_usd", 0) for venta in ventas)
        total_bs = sum(venta.get("total_bs", 0) for venta in ventas)
        numero_ventas = len(ventas)
        
        return {
            "cliente_id": cliente_id,
            "total_usd": total_usd,
            "total_bs": total_bs,
            "numero_ventas": numero_ventas
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de cliente inválido")
```

### Endpoint: GET /clientes/{cliente_id}/compras/items

```python
@router.get("/clientes/{cliente_id}/compras/items")
async def obtener_items_comprados_cliente(
    cliente_id: str,
    current_user: User = Depends(get_current_user)
):
    try:
        # Verificar que el cliente existe
        cliente = await db.clientes.find_one({"_id": ObjectId(cliente_id)})
        if not cliente:
            raise HTTPException(status_code=404, detail="Cliente no encontrado")
        
        # Buscar todas las ventas de este cliente
        ventas = await db.ventas.find({"cliente": cliente_id}).sort("fecha", -1).to_list(length=None)
        
        # Extraer todos los items de todas las ventas
        items_comprados = []
        for venta in ventas:
            items = venta.get("items", [])
            fecha_venta = venta.get("fecha") or venta.get("createdAt")
            
            for item in items:
                items_comprados.append({
                    "producto_id": item.get("producto_id"),
                    "nombre": item.get("nombre", ""),
                    "codigo": item.get("codigo", ""),
                    "cantidad": item.get("cantidad", 0),
                    "precio_unitario": item.get("precio_unitario", 0),
                    "precio_unitario_usd": item.get("precio_unitario_usd", 0),
                    "subtotal": item.get("subtotal", 0),
                    "subtotal_usd": item.get("subtotal_usd", 0),
                    "fecha_venta": fecha_venta.isoformat() if fecha_venta else None
                })
        
        return items_comprados
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de cliente inválido")
```

## Checklist de Implementación

- [ ] Endpoint `GET /clientes` implementado (obtener todos los clientes)
- [ ] Endpoint `POST /clientes` implementado (crear cliente)
- [ ] Endpoint `PUT /clientes/{cliente_id}` implementado (actualizar cliente)
- [ ] Endpoint `DELETE /clientes/{cliente_id}` implementado (eliminar cliente)
- [ ] Endpoint `GET /clientes/buscar?q={query}` implementado (búsqueda)
- [ ] Endpoint `GET /clientes/{cliente_id}` implementado (obtener por ID, opcional)
- [ ] Endpoint `GET /clientes/{cliente_id}/compras/total` implementado (total de compras)
- [ ] Endpoint `GET /clientes/{cliente_id}/compras/items` implementado (items comprados)
- [ ] Campo `porcentaje_descuento` agregado al modelo de Cliente
- [ ] Validación de porcentaje_descuento (0-100)
- [ ] Validación de cédula única (al crear y actualizar)
- [ ] Búsqueda case-insensitive en cédula y nombre
- [ ] Índices creados en la base de datos para mejorar búsquedas
- [ ] Autenticación requerida en todos los endpoints
- [ ] Manejo de errores apropiado (400, 401, 404, 409)
- [ ] El campo `cliente` en ventas acepta el ID del cliente
- [ ] Las ventas almacenan el `cliente_id` para poder consultar compras

---

## Notas Adicionales

1. **Búsqueda en Tiempo Real:** El frontend hace búsquedas con debounce de 300ms, así que el backend debe responder rápidamente.

2. **Límite de Resultados:** Se recomienda limitar los resultados de búsqueda a 10-20 clientes para mejorar el rendimiento.

3. **Cédula Única:** Es importante validar que la cédula sea única para evitar duplicados.

4. **Historial de Compras:** Opcionalmente, puedes agregar un campo para almacenar el historial de compras del cliente en el futuro.

