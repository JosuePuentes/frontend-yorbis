# ⚠️ INSTRUCCIONES PARA EL BACKEND - MÓDULO RESUMEN DE VENTA DIARIA

## PROBLEMA

Se ha creado un nuevo módulo en el frontend llamado "Resumen de Venta Diaria" que necesita obtener las ventas confirmadas e impresas desde el punto de venta. El módulo debe mostrar todos los productos vendidos con sus detalles.

## ✅ REQUISITOS

### 1. Endpoint: `GET /punto-venta/ventas/usuario`

**Este endpoint DEBE:**
1. ✅ Retornar todas las ventas confirmadas e impresas del punto de venta
2. ✅ Filtrar por sucursal
3. ✅ Filtrar por rango de fechas (fecha_inicio, fecha_fin)
4. ✅ Incluir todos los items/productos de cada venta con sus detalles completos
5. ✅ Incluir información del cliente si existe

**Query Parameters:**
- `sucursal` (string, requerido): ID de la sucursal
- `cajero` (string, opcional): Correo o nombre del cajero
- `fecha_inicio` (string, opcional): Fecha de inicio en formato YYYY-MM-DD
- `fecha_fin` (string, opcional): Fecha de fin en formato YYYY-MM-DD
- `limit` (number, opcional): Límite de resultados (default: 100)

**Request Ejemplo:**
```
GET /punto-venta/ventas/usuario?sucursal=01&fecha_inicio=2025-01-01&fecha_fin=2025-01-31&limit=10000
```

**Response (200 OK) - Array directo (PREFERIDO):**
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
      }
    ],
    "cliente": {
      "_id": "cliente_id_123",
      "nombre": "Juan Pérez",
      "cedula": "12345678",
      "correo": "juan@example.com"
    },
    "total_bs": 21.00,
    "total_usd": 21.00,
    "sucursal": {
      "id": "01",
      "nombre": "Santa Elena"
    },
    "cajero": "cajero@example.com"
  }
]
```

**Formato Alternativo - Objeto con array:**
```json
{
  "facturas": [
    {
      "_id": "venta_id_123",
      "numero_factura": "FAC-001",
      "fecha": "2025-01-15T10:30:00Z",
      "items": [...],
      "cliente": {...},
      "total_bs": 21.00,
      "total_usd": 21.00
    }
  ]
}
```

---

## 🔄 FLUJO DE DATOS

### Cuando se confirma e imprime una venta:

1. **Frontend llama:** `POST /punto-venta/ventas` (ya existe)
2. **Backend DEBE:**
   - ✅ Guardar la venta en la BD con estado "confirmada" o "impresa"
   - ✅ Guardar todos los items/productos de la venta
   - ✅ Guardar información del cliente si existe
   - ✅ Guardar fecha, sucursal, cajero, totales
3. **Inmediatamente después:**
   - ✅ La venta DEBE aparecer en `GET /punto-venta/ventas/usuario`
   - ✅ Todos los items/productos DEBEN estar incluidos con sus detalles

### Cuando se consulta el Resumen de Venta Diaria:

1. **Frontend llama:** `GET /punto-venta/ventas/usuario?sucursal={sucursal}&fecha_inicio={fecha_inicio}&fecha_fin={fecha_fin}&limit=10000`
2. **Backend DEBE:**
   - ✅ Retornar todas las ventas confirmadas/impresas en el rango de fechas
   - ✅ Incluir todos los items/productos de cada venta
   - ✅ Incluir información del cliente
   - ✅ Filtrar por sucursal correctamente

---

## ⚠️ VALIDACIONES CRÍTICAS

### 1. Items/Productos en cada Venta
- ✅ Cada venta DEBE incluir el array `items` con todos los productos vendidos
- ✅ Cada item DEBE tener:
  - `codigo` (string): Código del producto
  - `nombre` o `descripcion` (string): Nombre/descripción del producto
  - `marca` (string, opcional): Marca del producto
  - `cantidad` (number): Cantidad vendida
  - `precio_unitario` (number): Precio unitario de venta
  - `subtotal` (number): Subtotal (cantidad × precio_unitario)

### 2. Información del Cliente
- ✅ Si la venta tiene cliente, incluir objeto `cliente` con:
  - `nombre` (string): Nombre del cliente
  - `cedula` (string, opcional): Cédula del cliente
  - `correo` (string, opcional): Correo del cliente

### 3. Filtros
- ✅ Filtrar por `sucursal` correctamente
- ✅ Filtrar por `fecha_inicio` y `fecha_fin` (rango de fechas)
- ✅ Si no se especifican fechas, retornar todas las ventas de la sucursal
- ✅ El filtro de fechas debe ser inclusivo (incluir fecha_inicio y fecha_fin)

### 4. Ordenamiento
- ✅ Ordenar por fecha descendente (más recientes primero)
- ✅ Dentro de cada venta, mantener el orden de los items

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Endpoint `GET /punto-venta/ventas/usuario`:
- [ ] Retorna ventas confirmadas/impresas
- [ ] Filtra por sucursal correctamente
- [ ] Filtra por rango de fechas (fecha_inicio, fecha_fin)
- [ ] Incluye array `items` con todos los productos vendidos
- [ ] Cada item tiene código, descripción, marca, cantidad, precio_unitario, subtotal
- [ ] Incluye información del cliente si existe
- [ ] Retorna array consistente (siempre array, nunca objeto vacío)
- [ ] Maneja límite de resultados (limit parameter)
- [ ] Ordena por fecha descendente

### Persistencia de Ventas:
- [ ] Las ventas se guardan permanentemente en la BD
- [ ] Los items/productos se guardan con todos sus detalles
- [ ] La información del cliente se guarda correctamente
- [ ] Las ventas persisten después de reiniciar el servidor

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Confirmar una venta:**
   - Confirmar e imprimir una venta desde punto de venta
   - Verificar que se guarda en la BD
   - Consultar inmediatamente con `GET /punto-venta/ventas/usuario`
   - Verificar que la venta aparece con todos sus items

2. **Verificar en Resumen de Venta Diaria:**
   - Abrir el módulo "Resumen de Venta Diaria"
   - Verificar que aparecen las ventas confirmadas
   - Verificar que cada venta muestra todos sus productos
   - Verificar que se pueden filtrar por fechas
   - Verificar que se puede buscar por cliente o producto

3. **Verificar filtros:**
   - Filtrar por rango de fechas
   - Verificar que solo aparecen ventas en ese rango
   - Filtrar por sucursal
   - Verificar que solo aparecen ventas de esa sucursal

---

## 📝 NOTAS IMPORTANTES

- **TODAS las ventas confirmadas e impresas DEBEN aparecer en el resumen**
- **Cada venta DEBE incluir todos sus items/productos con detalles completos**
- **El filtro por fechas DEBE funcionar correctamente**
- **La información del cliente DEBE estar disponible si existe**

---

## 🔗 ENDPOINTS RELACIONADOS

- `POST /punto-venta/ventas` - Crear/confirmar venta (ya existe)
- `GET /punto-venta/ventas/usuario` - Obtener ventas para resumen (requerido)

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 ALTA  
**Estado:** ⚠️ PENDIENTE DE IMPLEMENTACIÓN

