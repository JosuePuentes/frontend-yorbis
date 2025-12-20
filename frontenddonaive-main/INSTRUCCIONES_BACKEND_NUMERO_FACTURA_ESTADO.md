# ⚠️ INSTRUCCIONES URGENTES PARA EL BACKEND - NÚMERO DE FACTURA Y ESTADO

## 🔴 PROBLEMA REPORTADO

1. **Las ventas confirmadas e impresas NO están apareciendo en el módulo "Resumen de Venta Diaria"**
2. **Cada factura DEBE emitir un número de factura único**

---

## ✅ REQUISITOS CRÍTICOS

### 1. Estado de la Venta

**El frontend ahora envía:**
```json
{
  "estado": "procesada"
}
```

**El backend DEBE:**
- ✅ Guardar la venta con estado `"procesada"` cuando se recibe en `POST /punto-venta/ventas`
- ✅ El endpoint `GET /punto-venta/ventas/usuario` DEBE filtrar por estado `"procesada"` (ya implementado según el resumen anterior)
- ✅ Si el frontend no envía estado, el backend DEBE asignar automáticamente `"procesada"` cuando se confirma la venta

### 2. Número de Factura

**CRÍTICO:** Cada venta DEBE tener un número de factura único y secuencial.

**El backend DEBE:**
- ✅ Generar automáticamente un `numero_factura` único para cada venta
- ✅ El formato puede ser: `FAC-001`, `FAC-002`, etc., o cualquier formato secuencial
- ✅ El `numero_factura` DEBE retornarse en la respuesta de `POST /punto-venta/ventas`
- ✅ El `numero_factura` DEBE incluirse en la respuesta de `GET /punto-venta/ventas/usuario`

**Ejemplo de respuesta de `POST /punto-venta/ventas`:**
```json
{
  "_id": "venta_id_123",
  "numero_factura": "FAC-001",
  "estado": "procesada",
  "fecha": "2025-01-15T10:30:00Z",
  ...
}
```

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Endpoint `POST /punto-venta/ventas`:
- [ ] Genera `numero_factura` único y secuencial para cada venta
- [ ] Guarda la venta con estado `"procesada"` (o usa el estado enviado por el frontend)
- [ ] Retorna `numero_factura` en la respuesta
- [ ] Retorna `estado` en la respuesta
- [ ] Guarda todos los items/productos de la venta
- [ ] Guarda información del cliente si existe
- [ ] Guarda métodos de pago
- [ ] Guarda fecha, sucursal, cajero, totales

### Endpoint `GET /punto-venta/ventas/usuario`:
- [ ] Filtra solo ventas con estado `"procesada"` (ya implementado según resumen)
- [ ] Incluye `numero_factura` en cada venta
- [ ] Incluye `estado` en cada venta
- [ ] Incluye todos los items/productos de cada venta
- [ ] Incluye información del cliente si existe

---

## 🔄 FLUJO ESPERADO

### Cuando se confirma una venta:

1. **Frontend llama:** `POST /punto-venta/ventas` con:
   ```json
   {
     "items": [...],
     "metodos_pago": [...],
     "total_bs": 100.00,
     "total_usd": 10.00,
     "sucursal": "01",
     "cajero": "cajero@example.com",
     "cliente": "cliente_id_123",
     "estado": "procesada"
   }
   ```

2. **Backend DEBE:**
   - ✅ Generar `numero_factura` único (ej: "FAC-001")
   - ✅ Guardar venta con estado `"procesada"`
   - ✅ Guardar todos los items/productos
   - ✅ Guardar información del cliente
   - ✅ Guardar métodos de pago
   - ✅ Descontar existencia del inventario
   - ✅ Retornar respuesta con `numero_factura` y `estado`

3. **Respuesta del backend:**
   ```json
   {
     "_id": "venta_id_123",
     "numero_factura": "FAC-001",
     "estado": "procesada",
     "fecha": "2025-01-15T10:30:00Z",
     "items": [...],
     "cliente": {...},
     "total_bs": 100.00,
     "total_usd": 10.00
   }
   ```

4. **Inmediatamente después:**
   - ✅ La venta DEBE aparecer en `GET /punto-venta/ventas/usuario?sucursal=01&limit=10000`
   - ✅ El `numero_factura` DEBE estar presente
   - ✅ El `estado` DEBE ser `"procesada"`

---

## 📝 CÓDIGO DE EJEMPLO (Python/Flask)

```python
from datetime import datetime

@app.route('/punto-venta/ventas', methods=['POST'])
@jwt_required()
def crear_venta():
    data = request.json
    
    # ✅ Generar número de factura único y secuencial
    ultima_factura = db.ventas.find_one(
        sort=[("numero_factura", -1)]
    )
    
    if ultima_factura and ultima_factura.get("numero_factura"):
        # Extraer número de la última factura (ej: "FAC-001" -> 1)
        ultimo_numero = int(ultima_factura["numero_factura"].split("-")[-1])
        nuevo_numero = ultimo_numero + 1
    else:
        nuevo_numero = 1
    
    numero_factura = f"FAC-{nuevo_numero:03d}"  # Formato: FAC-001, FAC-002, etc.
    
    # ✅ Obtener estado del frontend o usar "procesada" por defecto
    estado = data.get("estado", "procesada")
    
    # ✅ Crear venta
    venta = {
        "numero_factura": numero_factura,
        "estado": estado,
        "fecha": datetime.now(),
        "items": data.get("items", []),
        "metodos_pago": data.get("metodos_pago", []),
        "total_bs": data.get("total_bs", 0),
        "total_usd": data.get("total_usd", 0),
        "sucursal": data.get("sucursal"),
        "cajero": data.get("cajero"),
        "cliente": data.get("cliente"),
        "tasa_dia": data.get("tasa_dia", 0),
        "porcentaje_descuento": data.get("porcentaje_descuento", 0),
    }
    
    # ✅ Descontar existencia del inventario (ya implementado)
    # ... código de descuento de inventario ...
    
    # ✅ Guardar venta
    resultado = db.ventas.insert_one(venta)
    venta["_id"] = str(resultado.inserted_id)
    
    # ✅ Retornar respuesta con numero_factura y estado
    return jsonify({
        "_id": venta["_id"],
        "numero_factura": numero_factura,
        "estado": estado,
        "fecha": venta["fecha"].isoformat(),
        "items": venta["items"],
        "cliente": venta.get("cliente"),
        "total_bs": venta["total_bs"],
        "total_usd": venta["total_usd"]
    }), 201
```

---

## 📝 CÓDIGO DE EJEMPLO (Node.js/Express)

```javascript
app.post('/punto-venta/ventas', authenticateToken, async (req, res) => {
  try {
    const data = req.body;
    
    // ✅ Generar número de factura único y secuencial
    const ultimaVenta = await Venta.findOne().sort({ numero_factura: -1 });
    
    let nuevoNumero = 1;
    if (ultimaVenta && ultimaVenta.numero_factura) {
      const ultimoNumero = parseInt(ultimaVenta.numero_factura.split('-')[1] || '0');
      nuevoNumero = ultimoNumero + 1;
    }
    
    const numeroFactura = `FAC-${String(nuevoNumero).padStart(3, '0')}`; // FAC-001, FAC-002, etc.
    
    // ✅ Obtener estado del frontend o usar "procesada" por defecto
    const estado = data.estado || "procesada";
    
    // ✅ Crear venta
    const venta = new Venta({
      numero_factura: numeroFactura,
      estado: estado,
      fecha: new Date(),
      items: data.items || [],
      metodos_pago: data.metodos_pago || [],
      total_bs: data.total_bs || 0,
      total_usd: data.total_usd || 0,
      sucursal: data.sucursal,
      cajero: data.cajero,
      cliente: data.cliente || null,
      tasa_dia: data.tasa_dia || 0,
      porcentaje_descuento: data.porcentaje_descuento || 0,
    });
    
    // ✅ Descontar existencia del inventario (ya implementado)
    // ... código de descuento de inventario ...
    
    // ✅ Guardar venta
    await venta.save();
    
    // ✅ Retornar respuesta con numero_factura y estado
    res.status(201).json({
      _id: venta._id.toString(),
      numero_factura: numeroFactura,
      estado: estado,
      fecha: venta.fecha.toISOString(),
      items: venta.items,
      cliente: venta.cliente,
      total_bs: venta.total_bs,
      total_usd: venta.total_usd
    });
  } catch (error) {
    console.error('Error al crear venta:', error);
    res.status(500).json({ detail: 'Error al crear venta' });
  }
});
```

---

## ⚠️ VALIDACIONES CRÍTICAS

1. **Número de Factura:**
   - ✅ DEBE ser único (no puede haber dos ventas con el mismo número)
   - ✅ DEBE ser secuencial (FAC-001, FAC-002, FAC-003, etc.)
   - ✅ DEBE generarse automáticamente (no debe depender del frontend)
   - ✅ DEBE retornarse en la respuesta de `POST /punto-venta/ventas`

2. **Estado:**
   - ✅ DEBE ser `"procesada"` cuando se confirma la venta
   - ✅ DEBE guardarse en la base de datos
   - ✅ DEBE incluirse en la respuesta de `GET /punto-venta/ventas/usuario`

3. **Sincronización:**
   - ✅ La venta DEBE aparecer inmediatamente en `GET /punto-venta/ventas/usuario` después de crearse
   - ✅ El `numero_factura` DEBE estar presente en ambas respuestas

---

## 🧪 PRUEBAS RECOMENDADAS

### Prueba 1: Crear venta y verificar número de factura
1. Crear una venta desde punto de venta
2. Verificar que la respuesta incluya `numero_factura` (ej: "FAC-001")
3. Verificar que la respuesta incluya `estado: "procesada"`
4. Crear otra venta
5. Verificar que el `numero_factura` sea secuencial (ej: "FAC-002")

### Prueba 2: Verificar en resumen-venta-diaria
1. Crear una venta desde punto de venta
2. Confirmar e imprimir la venta
3. Abrir el módulo "Resumen de Venta Diaria"
4. Verificar que la venta aparezca con su `numero_factura`
5. Verificar que todos los items/productos estén presentes

### Prueba 3: Verificar estado
1. Consultar `GET /punto-venta/ventas/usuario?sucursal=01&limit=10`
2. Verificar que todas las ventas tengan `estado: "procesada"`
3. Verificar que todas las ventas tengan `numero_factura`

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 URGENTE  
**Estado:** ⚠️ PENDIENTE DE IMPLEMENTACIÓN

