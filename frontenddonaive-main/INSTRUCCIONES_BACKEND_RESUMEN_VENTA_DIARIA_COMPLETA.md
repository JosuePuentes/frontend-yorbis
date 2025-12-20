# ⚠️ INSTRUCCIONES COMPLETAS PARA EL BACKEND - RESUMEN DE VENTA DIARIA

## 📋 RESUMEN EJECUTIVO

Se ha creado un nuevo módulo en el frontend llamado **"Resumen de Venta Diaria"** que necesita:
1. ✅ Un endpoint para obtener ventas confirmadas e impresas
2. ✅ Asignar el permiso `resumen_venta_diaria` al usuario `ferreterialospuentesgmail.com`

---

## 🔴 TAREA 1: ASIGNAR PERMISO AL USUARIO (URGENTE)

### Usuario: ferreterialospuentesgmail.com
### Permiso a agregar: `resumen_venta_diaria`

**Comando MongoDB:**
```javascript
db.usuarios.updateOne(
  { correo: "ferreterialospuentesgmail.com" },
  { $addToSet: { permisos: "resumen_venta_diaria" } }
);
```

**O usando endpoint PATCH:**
```
PATCH /usuarios/{usuario_id}
Body: {
  "permisos": ["permiso1", "permiso2", ..., "resumen_venta_diaria"]
}
```

**⚠️ IMPORTANTE:** Incluir TODOS los permisos existentes del usuario más el nuevo permiso.

---

## 🔴 TAREA 2: ENDPOINT PARA OBTENER VENTAS

### Endpoint: `GET /punto-venta/ventas/usuario`

**Este endpoint YA EXISTE** pero debe asegurarse de que:
1. ✅ Retorne ventas confirmadas/impresas
2. ✅ Incluya TODOS los items/productos de cada venta
3. ✅ Incluya información del cliente
4. ✅ Filtre correctamente por fechas y sucursal

---

## 📝 ESPECIFICACIONES DEL ENDPOINT

### URL
```
GET /punto-venta/ventas/usuario
```

### Query Parameters

| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `sucursal` | string | ✅ Sí | ID de la sucursal (ej: "01") |
| `cajero` | string | ❌ No | Correo o nombre del cajero |
| `fecha_inicio` | string | ❌ No | Fecha inicio (YYYY-MM-DD) |
| `fecha_fin` | string | ❌ No | Fecha fin (YYYY-MM-DD) |
| `limit` | number | ❌ No | Límite de resultados (default: 100) |

### Ejemplo de Request
```
GET /punto-venta/ventas/usuario?sucursal=01&fecha_inicio=2025-01-01&fecha_fin=2025-01-31&limit=10000
```

---

## 📤 FORMATO DE RESPUESTA REQUERIDO

### Opción 1: Array Directo (PREFERIDO)
```json
[
  {
    "_id": "venta_id_123",
    "numero_factura": "FAC-001",
    "fecha": "2025-01-15T10:30:00Z",
    "items": [
      {
        "producto_id": "producto_id_123",
        "codigo": "PROD001",
        "nombre": "PRODUCTO EJEMPLO",
        "descripcion": "Descripción del producto",
        "marca": "Marca del producto",
        "cantidad": 2,
        "precio_unitario": 10.50,
        "precio_unitario_usd": 10.50,
        "subtotal": 21.00,
        "subtotal_usd": 21.00
      },
      {
        "producto_id": "producto_id_456",
        "codigo": "PROD002",
        "nombre": "OTRO PRODUCTO",
        "descripcion": "Otra descripción",
        "marca": "Otra marca",
        "cantidad": 1,
        "precio_unitario": 5.00,
        "precio_unitario_usd": 5.00,
        "subtotal": 5.00,
        "subtotal_usd": 5.00
      }
    ],
    "cliente": {
      "_id": "cliente_id_123",
      "nombre": "Juan Pérez",
      "cedula": "12345678",
      "correo": "juan@example.com"
    },
    "total_bs": 26.00,
    "total_usd": 26.00,
    "sucursal": {
      "id": "01",
      "nombre": "Santa Elena"
    },
    "cajero": "cajero@example.com"
  }
]
```

### Opción 2: Objeto con Array (ACEPTABLE)
```json
{
  "facturas": [
    {
      "_id": "venta_id_123",
      "numero_factura": "FAC-001",
      "fecha": "2025-01-15T10:30:00Z",
      "items": [...],
      "cliente": {...},
      "total_bs": 26.00,
      "total_usd": 26.00
    }
  ]
}
```

---

## ⚠️ VALIDACIONES CRÍTICAS

### 1. Items/Productos en cada Venta

**CRÍTICO:** Cada venta DEBE incluir el array `items` con TODOS los productos vendidos.

Cada item DEBE tener:
- ✅ `codigo` (string): Código del producto
- ✅ `nombre` o `descripcion` (string): Nombre/descripción del producto
- ✅ `marca` (string, opcional): Marca del producto
- ✅ `cantidad` (number): Cantidad vendida
- ✅ `precio_unitario` (number): Precio unitario de venta
- ✅ `subtotal` (number): Subtotal (cantidad × precio_unitario)

**Ejemplo de item:**
```json
{
  "producto_id": "producto_id_123",
  "codigo": "PROD001",
  "nombre": "PRODUCTO EJEMPLO",
  "descripcion": "Descripción del producto",
  "marca": "Marca del producto",
  "cantidad": 2,
  "precio_unitario": 10.50,
  "precio_unitario_usd": 10.50,
  "subtotal": 21.00,
  "subtotal_usd": 21.00
}
```

### 2. Información del Cliente

Si la venta tiene cliente asociado, incluir:
```json
{
  "cliente": {
    "_id": "cliente_id_123",
    "nombre": "Juan Pérez",
    "cedula": "12345678",
    "correo": "juan@example.com"
  }
}
```

Si NO tiene cliente:
```json
{
  "cliente": null
}
```
o simplemente omitir el campo `cliente`.

### 3. Filtros

- ✅ **Por Sucursal:** Filtrar por `sucursal` correctamente
- ✅ **Por Fechas:** Si se proporcionan `fecha_inicio` y `fecha_fin`, filtrar ventas en ese rango (inclusivo)
- ✅ **Sin Fechas:** Si no se proporcionan fechas, retornar todas las ventas de la sucursal
- ✅ **Ordenamiento:** Ordenar por fecha descendente (más recientes primero)

### 4. Estado de las Ventas

- ✅ Solo retornar ventas que estén **confirmadas** o **impresas**
- ✅ NO retornar ventas en borrador, canceladas o pendientes

---

## 🔄 FLUJO DE DATOS

### Cuando se confirma una venta en Punto de Venta:

1. **Frontend llama:** `POST /punto-venta/ventas` (ya existe)
2. **Backend DEBE:**
   - ✅ Guardar la venta en la BD con estado "confirmada" o "impresa"
   - ✅ Guardar TODOS los items/productos de la venta
   - ✅ Guardar información del cliente si existe
   - ✅ Guardar fecha, sucursal, cajero, totales
3. **Inmediatamente después:**
   - ✅ La venta DEBE aparecer en `GET /punto-venta/ventas/usuario`
   - ✅ Todos los items/productos DEBEN estar incluidos

### Cuando se consulta el Resumen de Venta Diaria:

1. **Frontend llama:** `GET /punto-venta/ventas/usuario?sucursal={sucursal}&fecha_inicio={fecha_inicio}&fecha_fin={fecha_fin}&limit=10000`
2. **Backend DEBE:**
   - ✅ Retornar todas las ventas confirmadas/impresas en el rango de fechas
   - ✅ Incluir TODOS los items/productos de cada venta
   - ✅ Incluir información del cliente si existe
   - ✅ Filtrar por sucursal correctamente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Endpoint `GET /punto-venta/ventas/usuario`:
- [ ] Retorna ventas confirmadas/impresas (no borradores ni canceladas)
- [ ] Filtra por sucursal correctamente
- [ ] Filtra por rango de fechas (fecha_inicio, fecha_fin) - inclusivo
- [ ] Incluye array `items` con TODOS los productos vendidos
- [ ] Cada item tiene: código, nombre/descripción, marca, cantidad, precio_unitario, subtotal
- [ ] Incluye información del cliente si existe (nombre, cedula, correo)
- [ ] Retorna array consistente (siempre array, nunca objeto vacío)
- [ ] Maneja límite de resultados (limit parameter)
- [ ] Ordena por fecha descendente (más recientes primero)
- [ ] Si no hay ventas, retorna array vacío `[]`

### Persistencia de Ventas:
- [ ] Las ventas se guardan permanentemente en la BD
- [ ] Los items/productos se guardan con todos sus detalles
- [ ] La información del cliente se guarda correctamente
- [ ] Las ventas persisten después de reiniciar el servidor

### Permisos:
- [ ] El permiso `resumen_venta_diaria` está disponible en el sistema
- [ ] El usuario `ferreterialospuentesgmail.com` tiene el permiso asignado
- [ ] El endpoint valida permisos si es necesario

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Confirmar una venta
1. Confirmar e imprimir una venta desde punto de venta
2. Verificar que se guarda en la BD
3. Consultar inmediatamente: `GET /punto-venta/ventas/usuario?sucursal=01&limit=10`
4. Verificar que la venta aparece con TODOS sus items

### Prueba 2: Verificar items en respuesta
1. Obtener una venta: `GET /punto-venta/ventas/usuario?sucursal=01&limit=1`
2. Verificar que la venta tiene array `items`
3. Verificar que cada item tiene: código, descripción, marca, cantidad, precio_unitario, subtotal
4. Verificar que la suma de subtotales coincide con total_bs o total_usd

### Prueba 3: Verificar filtros
1. Filtrar por fechas: `GET /punto-venta/ventas/usuario?sucursal=01&fecha_inicio=2025-01-01&fecha_fin=2025-01-31`
2. Verificar que solo aparecen ventas en ese rango
3. Filtrar por sucursal diferente
4. Verificar que solo aparecen ventas de esa sucursal

### Prueba 4: Verificar en frontend
1. Asignar permiso `resumen_venta_diaria` al usuario
2. Iniciar sesión con ese usuario
3. Abrir módulo "Resumen de Venta Diaria"
4. Verificar que aparecen las ventas confirmadas
5. Verificar que cada venta muestra todos sus productos
6. Probar filtros por fechas
7. Probar búsqueda por cliente/producto

---

## 📝 CÓDIGO DE EJEMPLO (Python/Flask)

```python
@app.route('/punto-venta/ventas/usuario', methods=['GET'])
@jwt_required()
def obtener_ventas_usuario():
    sucursal = request.args.get('sucursal')
    cajero = request.args.get('cajero')
    fecha_inicio = request.args.get('fecha_inicio')
    fecha_fin = request.args.get('fecha_fin')
    limit = int(request.args.get('limit', 100))
    
    # Construir query
    query = {
        'sucursal': sucursal,
        'estado': {'$in': ['confirmada', 'impresa']}  # Solo ventas confirmadas/impresas
    }
    
    if cajero:
        query['cajero'] = cajero
    
    if fecha_inicio and fecha_fin:
        query['fecha'] = {
            '$gte': datetime.fromisoformat(fecha_inicio),
            '$lte': datetime.fromisoformat(fecha_fin)
        }
    
    # Obtener ventas
    ventas = db.ventas.find(query).sort('fecha', -1).limit(limit)
    
    # Formatear respuesta
    ventas_formateadas = []
    for venta in ventas:
        venta_formateada = {
            '_id': str(venta['_id']),
            'numero_factura': venta.get('numero_factura', str(venta['_id'])),
            'fecha': venta['fecha'].isoformat(),
            'items': venta.get('items', []),  # ✅ CRÍTICO: Incluir TODOS los items
            'total_bs': venta.get('total_bs', 0),
            'total_usd': venta.get('total_usd', 0),
            'sucursal': {
                'id': venta.get('sucursal'),
                'nombre': obtener_nombre_sucursal(venta.get('sucursal'))
            },
            'cajero': venta.get('cajero', '')
        }
        
        # Incluir cliente si existe
        if venta.get('cliente'):
            venta_formateada['cliente'] = {
                '_id': str(venta['cliente'].get('_id', '')),
                'nombre': venta['cliente'].get('nombre', ''),
                'cedula': venta['cliente'].get('cedula', ''),
                'correo': venta['cliente'].get('correo', '')
            }
        
        ventas_formateadas.append(venta_formateada)
    
    return jsonify(ventas_formateadas), 200
```

---

## 📝 CÓDIGO DE EJEMPLO (Node.js/Express)

```javascript
app.get('/punto-venta/ventas/usuario', authenticateToken, async (req, res) => {
  try {
    const { sucursal, cajero, fecha_inicio, fecha_fin, limit = 100 } = req.query;
    
    // Construir query
    const query = {
      sucursal: sucursal,
      estado: { $in: ['confirmada', 'impresa'] }  // Solo ventas confirmadas/impresas
    };
    
    if (cajero) {
      query.cajero = cajero;
    }
    
    if (fecha_inicio && fecha_fin) {
      query.fecha = {
        $gte: new Date(fecha_inicio),
        $lte: new Date(fecha_fin)
      };
    }
    
    // Obtener ventas
    const ventas = await Venta.find(query)
      .sort({ fecha: -1 })
      .limit(parseInt(limit))
      .populate('cliente', 'nombre cedula correo')  // Poblar información del cliente
      .lean();
    
    // Formatear respuesta
    const ventasFormateadas = ventas.map(venta => ({
      _id: venta._id.toString(),
      numero_factura: venta.numero_factura || venta._id.toString(),
      fecha: venta.fecha.toISOString(),
      items: venta.items || [],  // ✅ CRÍTICO: Incluir TODOS los items
      cliente: venta.cliente ? {
        _id: venta.cliente._id?.toString() || '',
        nombre: venta.cliente.nombre || '',
        cedula: venta.cliente.cedula || '',
        correo: venta.cliente.correo || ''
      } : null,
      total_bs: venta.total_bs || 0,
      total_usd: venta.total_usd || 0,
      sucursal: {
        id: venta.sucursal,
        nombre: await obtenerNombreSucursal(venta.sucursal)
      },
      cajero: venta.cajero || ''
    }));
    
    res.json(ventasFormateadas);
  } catch (error) {
    console.error('Error al obtener ventas:', error);
    res.status(500).json({ detail: 'Error al obtener ventas' });
  }
});
```

---

## ⚠️ PUNTOS CRÍTICOS

1. **Items DEBEN estar incluidos:** Cada venta DEBE tener el array `items` con TODOS los productos vendidos
2. **Información completa:** Cada item DEBE tener código, descripción, marca, cantidad, precio_unitario, subtotal
3. **Cliente opcional:** Si la venta tiene cliente, incluir la información; si no, omitir o poner null
4. **Filtros funcionando:** Los filtros por fecha y sucursal DEBEN funcionar correctamente
5. **Solo ventas confirmadas:** NO retornar ventas en borrador, canceladas o pendientes

---

## 🔗 ENDPOINTS RELACIONADOS

- `POST /punto-venta/ventas` - Crear/confirmar venta (ya existe)
- `GET /punto-venta/ventas/usuario` - Obtener ventas para resumen (requerido)
- `PATCH /usuarios/{usuario_id}` - Actualizar permisos de usuario (para asignar permiso)

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 URGENTE  
**Estado:** ⚠️ PENDIENTE DE IMPLEMENTACIÓN

