# Instrucciones para el Backend - Módulo de Punto de Venta

Este documento describe los endpoints y funcionalidades que el backend debe implementar para que el módulo de Punto de Venta funcione correctamente.

## Endpoints Requeridos

### 1. Obtener Tasa del Día
**GET** `/tasa-del-dia?fecha=YYYY-MM-DD`

**Descripción:** Retorna la tasa de cambio del día (Bs/USD) para una fecha específica.

**Headers:**
- `Authorization: Bearer {token}` (opcional)

**Query Parameters:**
- `fecha` (string, formato: YYYY-MM-DD): Fecha para la cual se quiere obtener la tasa

**Respuesta Exitosa (200):**
```json
{
  "tasa": 45.50,
  "fecha": "2024-01-15"
}
```

**Nota:** Si no existe una tasa para la fecha específica, puede retornar la tasa más reciente o una tasa por defecto.

---

### 2. Búsqueda de Productos
**GET** `/productos/buscar?q={query}&sucursal={sucursalId}`

**Descripción:** Búsqueda de productos en tiempo real por nombre o código.

**Headers:**
- `Authorization: Bearer {token}` (opcional)

**Query Parameters:**
- `q` (string): Término de búsqueda (nombre o código del producto)
- `sucursal` (string): ID de la sucursal para filtrar productos disponibles

**Respuesta Exitosa (200):**
```json
{
  "productos": [
    {
      "_id": "producto_id_123",
      "codigo": "PROD001",
      "nombre": "Paracetamol 500mg",
      "precio": 2.50,
      "precioBs": 113.75,
      "stock": 150,
      "descripcion": "Medicamento para dolor"
    }
  ]
}
```

**Estructura del Producto:**
- `_id` (string, requerido): ID único del producto
- `codigo` (string, opcional): Código de barras o código interno
- `nombre` (string, requerido): Nombre del producto
- `precio` (number, requerido): Precio en USD
- `precioBs` (number, opcional): Precio en Bs (calculado en frontend)
- `stock` (number, opcional): Cantidad disponible en stock
- `descripcion` (string, opcional): Descripción del producto

**Nota:** La búsqueda debe ser case-insensitive y buscar tanto en nombre como en código. Debe retornar resultados incluso con coincidencias parciales.

---

### 3. Registrar Venta
**POST** `/ventas`

**Descripción:** Registra una nueva venta en el punto de venta.

**Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer {token}` (opcional)

**Body:**
```json
{
  "sucursalId": "farmacia_id_123",
  "sucursalNombre": "Santa Elena",
  "cajeroId": "cajero_id_456",
  "cajeroNombre": "Juan Pérez",
  "items": [
    {
      "productoId": "producto_id_123",
      "nombre": "Paracetamol 500mg",
      "cantidad": 2,
      "precioUnitario": 2.50,
      "subtotal": 5.00
    }
  ],
  "total": 5.00,
  "totalBs": 227.50,
  "tasaDelDia": 45.50,
  "metodosPago": [
    {
      "tipo": "efectivo",
      "monto": 5.00,
      "moneda": "USD"
    },
    {
      "tipo": "punto_debito",
      "monto": 100.00,
      "moneda": "Bs"
    }
  ],
  "vuelto": 0.00,
  "fecha": "2024-01-15T10:30:00.000Z"
}
```

**Respuesta Exitosa (201):**
```json
{
  "_id": "venta_id_789",
  "numeroFactura": "FAC-2024-001234",
  "sucursalId": "farmacia_id_123",
  "sucursalNombre": "Santa Elena",
  "cajeroId": "cajero_id_456",
  "cajeroNombre": "Juan Pérez",
  "total": 5.00,
  "totalBs": 227.50,
  "fecha": "2024-01-15T10:30:00.000Z",
  "estado": "completada"
}
```

**Campos del Body:**
- `sucursalId` (string, requerido): ID de la sucursal/farmacia
- `sucursalNombre` (string, requerido): Nombre de la sucursal
- `cajeroId` (string, requerido): ID del cajero
- `cajeroNombre` (string, requerido): Nombre del cajero
- `items` (array, requerido): Array de items vendidos
  - `productoId` (string): ID del producto
  - `nombre` (string): Nombre del producto
  - `cantidad` (number): Cantidad vendida
  - `precioUnitario` (number): Precio unitario en USD
  - `subtotal` (number): Subtotal del item en USD
- `total` (number, requerido): Total de la venta en USD
- `totalBs` (number, requerido): Total de la venta en Bs
- `tasaDelDia` (number, requerido): Tasa de cambio utilizada
- `metodosPago` (array, requerido): Array de métodos de pago
  - `tipo` (string): Tipo de pago (efectivo, punto_debito, punto_credito, transferencia, zelle)
  - `monto` (number): Monto pagado
  - `moneda` (string): Moneda del pago (USD o Bs)
- `vuelto` (number, requerido): Vuelto entregado (si aplica)
- `fecha` (string, requerido): Fecha y hora de la venta (ISO 8601)

**Nota:** El backend debe:
1. Generar un número de factura único
2. Actualizar el stock de productos vendidos
3. Registrar la venta en la base de datos
4. Opcionalmente, registrar la venta en los cuadres de caja correspondientes

---

## Modelo de Datos Sugerido

### Modelo: Venta
```javascript
{
  _id: ObjectId,
  numeroFactura: String, // Ej: "FAC-2024-001234"
  sucursalId: String,
  sucursalNombre: String,
  cajeroId: String,
  cajeroNombre: String,
  items: [
    {
      productoId: String,
      nombre: String,
      cantidad: Number,
      precioUnitario: Number,
      subtotal: Number
    }
  ],
  total: Number,
  totalBs: Number,
  tasaDelDia: Number,
  metodosPago: [
    {
      tipo: String, // efectivo, punto_debito, punto_credito, transferencia, zelle
      monto: Number,
      moneda: String // USD o Bs
    }
  ],
  vuelto: Number,
  fecha: Date,
  estado: String, // completada, cancelada
  createdAt: Date,
  updatedAt: Date
}
```

### Modelo: Producto
```javascript
{
  _id: ObjectId,
  codigo: String, // Código de barras o código interno
  nombre: String,
  precio: Number, // Precio en USD
  stock: Number, // Cantidad disponible
  descripcion: String,
  sucursales: [String], // IDs de sucursales donde está disponible
  activo: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Consideraciones Adicionales

1. **Validaciones:**
   - Verificar que el stock sea suficiente antes de registrar la venta
   - Validar que el total de métodos de pago sea igual o mayor al total de la venta
   - Verificar que la tasa del día sea válida

2. **Stock:**
   - El backend debe actualizar el stock de productos después de cada venta
   - Considerar implementar un sistema de reserva temporal de stock durante el proceso de venta

3. **Integración con Cuadres:**
   - Las ventas pueden integrarse automáticamente con los cuadres de caja
   - Considerar registrar las ventas por método de pago en los cuadres correspondientes

4. **Búsqueda de Productos:**
   - Implementar índices en la base de datos para mejorar el rendimiento de la búsqueda
   - Considerar búsqueda por texto completo (full-text search) si es posible

5. **Seguridad:**
   - Validar permisos del usuario para realizar ventas
   - Registrar el usuario que realizó la venta (opcional)

6. **Número de Factura:**
   - Generar números de factura secuenciales y únicos
   - Formato sugerido: "FAC-{AÑO}-{NÚMERO_SECUENCIAL}"

---

## Endpoints Opcionales (Mejoras Futuras)

### 4. Obtener Historial de Ventas
**GET** `/ventas?sucursal={sucursalId}&fechaInicio={fecha}&fechaFin={fecha}`

### 5. Cancelar Venta
**PATCH** `/ventas/{ventaId}/cancelar`

### 6. Obtener Detalle de Venta
**GET** `/ventas/{ventaId}`

### 7. Imprimir/Exportar Factura
**GET** `/ventas/{ventaId}/factura` (PDF o HTML)

---

## Ejemplo de Respuesta para Búsqueda de Productos

Si el backend no tiene un endpoint específico de productos, puede usar el endpoint de inventarios existente y adaptarlo, o crear uno nuevo. La búsqueda debe ser rápida y eficiente para una experiencia de usuario fluida.

**Ejemplo de implementación sugerida:**
- Buscar productos por nombre o código que coincidan parcialmente con el query
- Filtrar por sucursal si es necesario
- Limitar resultados a 20-30 productos máximo
- Ordenar por relevancia o nombre

---

## Notas Finales

- Todos los endpoints deben manejar errores apropiadamente
- Retornar códigos HTTP adecuados (200, 201, 400, 401, 404, 500)
- Incluir mensajes de error descriptivos en caso de fallo
- El frontend ya maneja la autenticación con tokens Bearer, así que el backend debe validar estos tokens si están presentes

