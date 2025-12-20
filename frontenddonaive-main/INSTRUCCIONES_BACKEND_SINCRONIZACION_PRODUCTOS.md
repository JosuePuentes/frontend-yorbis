# ⚠️ INSTRUCCIONES CRÍTICAS PARA EL BACKEND - SINCRONIZACIÓN DE PRODUCTOS

## PROBLEMA ACTUAL

Los productos que aparecen en el módulo de **Punto de Venta** no siempre aparecen en el módulo de **VerInventarios (Tabla de Productos)**. Es crítico que **TODOS los productos que aparecen en Punto de Venta también aparezcan en VerInventarios** y que se estén guardando correctamente en la base de datos.

## ✅ REQUISITOS CRÍTICOS

### 1. Endpoint: `POST /inventarios/crear-producto`

**Este endpoint DEBE:**
1. ✅ Guardar el producto en la base de datos de forma permanente
2. ✅ Asociar el producto al inventario activo de la sucursal especificada
3. ✅ Retornar el producto creado con todos sus campos
4. ✅ Asegurar que el producto sea visible inmediatamente en ambos módulos (Punto de Venta y VerInventarios)

**Request Body:**
```json
{
  "farmacia": "01",  // ID de la sucursal/farmacia
  "nombre": "PRODUCTO NUEVO",
  "codigo": "NUEVO001",  // Opcional pero recomendado
  "descripcion": "Descripción del producto",  // Opcional
  "marca": "Marca del producto",  // Opcional
  "costo": 10.50,  // Costo unitario (REQUERIDO)
  "precio_venta": 14.70,  // Precio de venta (opcional, se calcula si no se envía)
  "utilidad": 4.20,  // Utilidad en dinero (opcional)
  "porcentaje_utilidad": 40.0  // Porcentaje de utilidad (opcional, default: 40%)
}
```

**Response (200 OK):**
```json
{
  "message": "Producto creado exitosamente",
  "producto": {
    "_id": "producto_id_123",
    "id": "producto_id_123",
    "codigo": "NUEVO001",
    "nombre": "PRODUCTO NUEVO",
    "descripcion": "Descripción del producto",
    "marca": "Marca del producto",
    "costo": 10.50,
    "costo_unitario": 10.50,
    "precio": 14.70,
    "precio_unitario": 14.70,
    "precio_venta": 14.70,
    "utilidad": 4.20,
    "porcentaje_utilidad": 40.0,
    "cantidad": 0,  // Inicialmente 0 hasta que se cargue existencia
    "existencia": 0,
    "stock": 0,
    "inventario_id": "inventario_activo_id",
    "farmacia": "01",
    "fecha_creacion": "2025-01-15T10:30:00Z"
  }
}
```

**Validaciones Requeridas:**
- ✅ El producto DEBE guardarse en la base de datos
- ✅ El producto DEBE asociarse al inventario activo de la sucursal
- ✅ Si no hay inventario activo, crear uno automáticamente o retornar error claro
- ✅ El código debe ser único por sucursal (o global, según la lógica del negocio)
- ✅ Todos los campos numéricos deben validarse (costo > 0, precio > 0, etc.)

---

### 2. Endpoint: `GET /punto-venta/productos/buscar`

**Este endpoint DEBE:**
1. ✅ Retornar **TODOS los productos** del inventario activo de la sucursal especificada
2. ✅ Incluir productos recién creados (inmediatamente después de crearlos)
3. ✅ Funcionar con query vacío (`q=`) para retornar todos los productos
4. ✅ Retornar productos en formato consistente

**Query Parameters:**
- `q` (string, opcional): Término de búsqueda. Si está vacío o no se envía, debe retornar TODOS los productos
- `sucursal` (string, requerido): ID de la sucursal
- `limit` (number, opcional): Límite de resultados (default: 1000)

**Request Ejemplo:**
```
GET /punto-venta/productos/buscar?q=&sucursal=01&limit=1000
```

**Response (200 OK) - Array directo (PREFERIDO):**
```json
[
  {
    "_id": "producto_id_123",
    "id": "producto_id_123",
    "codigo": "NUEVO001",
    "nombre": "PRODUCTO NUEVO",
    "descripcion": "Descripción del producto",
    "marca": "Marca del producto",
    "costo": 10.50,
    "costo_unitario": 10.50,
    "precio": 14.70,
    "precio_unitario": 14.70,
    "precio_venta": 14.70,
    "existencia": 0,
    "cantidad": 0,
    "stock": 0,
    "sucursal": "01"
  },
  {
    "_id": "producto_id_456",
    "codigo": "PROD002",
    "nombre": "OTRO PRODUCTO",
    "costo": 5.00,
    "precio": 7.00,
    "existencia": 10,
    "cantidad": 10,
    "stock": 10
  }
]
```

**Validaciones Requeridas:**
- ✅ Si `q` está vacío o no se envía, retornar **TODOS los productos** del inventario activo
- ✅ Si `q` tiene valor, buscar por código, nombre, descripción o marca (case-insensitive, partial match)
- ✅ Incluir productos recién creados (sin necesidad de recargar o refrescar)
- ✅ Retornar siempre un array (aunque esté vacío)
- ✅ Incluir campo `existencia` (o `cantidad` o `stock`) con el valor actual del inventario

---

### 3. Endpoint: `GET /inventarios/{inventario_id}/items`

**Este endpoint DEBE:**
1. ✅ Retornar todos los items/productos del inventario especificado
2. ✅ Incluir productos recién creados
3. ✅ Retornar datos completos y actualizados

**Response (200 OK):**
```json
[
  {
    "_id": "item_id_123",
    "id": "item_id_123",
    "codigo": "NUEVO001",
    "descripcion": "PRODUCTO NUEVO",
    "nombre": "PRODUCTO NUEVO",
    "marca": "Marca del producto",
    "costo": 10.50,
    "costo_unitario": 10.50,
    "precio": 14.70,
    "precio_unitario": 14.70,
    "precio_venta": 14.70,
    "cantidad": 0,
    "existencia": 0,
    "stock": 0
  }
]
```

---

## 🔄 FLUJO DE SINCRONIZACIÓN REQUERIDO

### Cuando se crea un producto nuevo:

1. **Frontend llama:** `POST /inventarios/crear-producto`
2. **Backend DEBE:**
   - ✅ Guardar el producto en la BD
   - ✅ Asociarlo al inventario activo de la sucursal
   - ✅ Retornar el producto creado con todos sus campos
3. **Inmediatamente después:**
   - ✅ El producto DEBE aparecer en `GET /punto-venta/productos/buscar?q=&sucursal=01`
   - ✅ El producto DEBE aparecer en `GET /inventarios/{inventario_id}/items`
   - ✅ El producto DEBE aparecer en ambos módulos del frontend

### Cuando se busca en Punto de Venta:

1. **Frontend llama:** `GET /punto-venta/productos/buscar?q={busqueda}&sucursal={sucursal}`
2. **Backend DEBE:**
   - ✅ Retornar productos del inventario activo de la sucursal
   - ✅ Si `q` está vacío, retornar TODOS los productos
   - ✅ Incluir productos recién creados

### Cuando se carga VerInventarios:

1. **Frontend llama múltiples endpoints:**
   - `GET /inventarios` (para obtener inventarios)
   - `GET /inventarios/{inventario_id}/items` (para cada inventario)
   - `GET /punto-venta/productos/buscar?q=&sucursal={sucursal}` (para productos nuevos)
2. **Backend DEBE:**
   - ✅ Retornar productos consistentes en todos los endpoints
   - ✅ Asegurar que los mismos productos aparezcan en ambos módulos

---

## ⚠️ VALIDACIONES CRÍTICAS

### 1. Persistencia en Base de Datos
- ✅ Los productos DEBEN guardarse permanentemente en la BD
- ✅ No deben ser solo en memoria o caché temporal
- ✅ Deben persistir después de reiniciar el servidor

### 2. Inventario Activo
- ✅ Cada sucursal DEBE tener un inventario activo
- ✅ Los productos nuevos se asocian al inventario activo
- ✅ Si no hay inventario activo, crear uno automáticamente o retornar error claro

### 3. Consistencia de Datos
- ✅ El mismo producto debe aparecer con los mismos datos en todos los endpoints
- ✅ Los campos `existencia`, `cantidad` y `stock` deben estar sincronizados
- ✅ Los precios y costos deben ser consistentes

### 4. Sincronización en Tiempo Real
- ✅ Los productos creados deben aparecer inmediatamente (sin necesidad de refrescar manualmente)
- ✅ No debe haber delay entre crear un producto y que aparezca en las búsquedas

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Endpoint `POST /inventarios/crear-producto`:
- [ ] Guarda el producto en la BD permanentemente
- [ ] Asocia el producto al inventario activo de la sucursal
- [ ] Valida que el costo sea > 0
- [ ] Calcula precio si no se envía (costo + utilidad)
- [ ] Retorna el producto creado con todos los campos
- [ ] Maneja errores apropiadamente (código duplicado, sucursal inválida, etc.)

### Endpoint `GET /punto-venta/productos/buscar`:
- [ ] Retorna TODOS los productos cuando `q` está vacío
- [ ] Busca por código, nombre, descripción y marca cuando `q` tiene valor
- [ ] Incluye productos recién creados inmediatamente
- [ ] Retorna array consistente (siempre array, nunca objeto)
- [ ] Incluye campo `existencia` (o `cantidad` o `stock`)
- [ ] Filtra por sucursal correctamente

### Endpoint `GET /inventarios/{inventario_id}/items`:
- [ ] Retorna todos los items del inventario
- [ ] Incluye productos recién creados
- [ ] Retorna datos completos y actualizados
- [ ] Maneja inventarios inexistentes (404)

### Base de Datos:
- [ ] Los productos se guardan permanentemente
- [ ] Los productos persisten después de reiniciar el servidor
- [ ] Los productos están correctamente asociados a inventarios
- [ ] Los índices están optimizados para búsquedas rápidas

---

## 🧪 PRUEBAS RECOMENDADAS

1. **Crear un producto nuevo:**
   - Crear producto con `POST /inventarios/crear-producto`
   - Verificar que se guarda en la BD
   - Buscar inmediatamente con `GET /punto-venta/productos/buscar?q=&sucursal=01`
   - Verificar que el producto aparece

2. **Verificar en ambos módulos:**
   - Crear producto en Carga Masiva
   - Verificar que aparece en Punto de Venta
   - Verificar que aparece en VerInventarios (Tabla de Productos)
   - Verificar que los datos son consistentes

3. **Verificar persistencia:**
   - Crear producto
   - Reiniciar el servidor
   - Verificar que el producto sigue existiendo
   - Verificar que aparece en ambos módulos

---

## 📝 NOTAS IMPORTANTES

- **TODOS los productos que aparecen en Punto de Venta DEBEN aparecer en VerInventarios**
- **Los productos DEBEN guardarse permanentemente en la BD**
- **No debe haber productos "fantasma" que solo aparecen en un módulo**
- **La sincronización debe ser inmediata (sin delays)**

---

## 🔗 ENDPOINTS RELACIONADOS

- `POST /inventarios/crear-producto` - Crear producto nuevo
- `GET /punto-venta/productos/buscar` - Buscar productos para punto de venta
- `GET /inventarios/{inventario_id}/items` - Obtener items de un inventario
- `GET /inventarios` - Obtener todos los inventarios
- `POST /inventarios/cargar-existencia` - Cargar existencia masiva

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 CRÍTICA  
**Estado:** ⚠️ PENDIENTE DE IMPLEMENTACIÓN

