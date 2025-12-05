# INSTRUCCIONES BACKEND: DESCUENTO POR DIVISA EN PUNTO DE VENTA

## Resumen
El frontend ahora permite aplicar un descuento porcentual a todos los productos cuando el pago se realiza en divisas (USD). Este descuento se aplica además del descuento del cliente (si existe).

## Cambios en el Frontend

### 1. Nuevo Campo en la Solicitud de Venta

El endpoint `POST /punto-venta/ventas` ahora recibe un nuevo campo opcional:

```json
{
  "items": [...],
  "metodos_pago": [...],
  "total_bs": 0,
  "total_usd": 0,
  "tasa_dia": 0,
  "sucursal": "...",
  "cajero": "...",
  "cliente": "...",
  "porcentaje_descuento": 0,
  "descuento_por_divisa": 0,  // ⬅️ NUEVO CAMPO
  "notas": "",
  "vuelto": [...]
}
```

### 2. Descripción del Campo

- **Campo**: `descuento_por_divisa`
- **Tipo**: `number` (float)
- **Obligatorio**: No (opcional)
- **Valor por defecto**: `0`
- **Rango**: `0` a `100` (porcentaje)
- **Descripción**: Porcentaje de descuento a aplicar a todos los productos cuando el pago se realiza en divisas (USD). Este descuento se suma al descuento del cliente si existe.

### 3. Lógica del Frontend

1. El usuario puede activar/desactivar el descuento por divisa mediante un checkbox en el panel de resumen.
2. Si está activo, el usuario ingresa un porcentaje de descuento (0-100%).
3. El descuento se aplica a **todos los productos** en el carrito cuando:
   - El checkbox está activado (`descuentoPorDivisaActivo = true`)
   - El porcentaje es mayor a 0
4. El descuento se calcula **después** del descuento del cliente (si existe).
5. El descuento se aplica tanto al precio en USD como al precio en Bs (convertido con la tasa del día).

### 4. Ejemplo de Cálculo

**Escenario:**
- Producto precio original: $100 USD
- Descuento del cliente: 5%
- Descuento por divisa: 10%

**Cálculo:**
1. Aplicar descuento del cliente: $100 - ($100 × 5%) = $95 USD
2. Aplicar descuento por divisa: $95 - ($95 × 10%) = $85.50 USD

**Total de descuento aplicado**: 15% (5% + 10%)

## Requerimientos del Backend

### 1. Almacenamiento

El backend debe almacenar el campo `descuento_por_divisa` en la base de datos junto con la venta/factura.

**Estructura sugerida:**
```javascript
{
  _id: ObjectId,
  items: [...],
  metodos_pago: [...],
  total_bs: Number,
  total_usd: Number,
  tasa_dia: Number,
  sucursal: String,
  cajero: String,
  cliente: ObjectId,
  porcentaje_descuento: Number,      // Descuento del cliente
  descuento_por_divisa: Number,       // ⬅️ NUEVO: Descuento por divisa
  notas: String,
  fecha: Date,
  ...
}
```

### 2. Validación

- Validar que `descuento_por_divisa` sea un número.
- Validar que esté en el rango 0-100 (porcentaje).
- Si no se envía el campo, asumir `0` (sin descuento por divisa).

### 3. Respuesta del Endpoint

El endpoint `GET /punto-venta/ventas` y `GET /punto-venta/ventas/usuario` deben incluir el campo `descuento_por_divisa` en la respuesta:

```json
{
  "_id": "...",
  "numero_factura": "...",
  "items": [...],
  "metodos_pago": [...],
  "total_bs": 0,
  "total_usd": 0,
  "tasa_dia": 0,
  "sucursal": {...},
  "cajero": "...",
  "cliente": {...},
  "porcentaje_descuento": 0,
  "descuento_por_divisa": 0,  // ⬅️ INCLUIR EN RESPUESTA
  "fecha": "...",
  ...
}
```

### 4. Reportes y Consultas

Si el backend genera reportes o consultas de ventas, debe considerar el campo `descuento_por_divisa` para:
- Calcular el descuento total aplicado (cliente + divisa)
- Mostrar el descuento por divisa en los reportes
- Filtrar o agrupar ventas por descuento por divisa (si es necesario)

### 5. Compatibilidad

- Si una venta antigua no tiene el campo `descuento_por_divisa`, el backend debe retornar `0` por defecto.
- No romper la funcionalidad existente si el campo no está presente en solicitudes antiguas.

## Ejemplo de Implementación (Pseudocódigo)

```python
# En el modelo de Venta
class Venta:
    descuento_por_divisa: float = 0.0  # Por defecto 0
    
    def validar(self):
        if self.descuento_por_divisa < 0 or self.descuento_por_divisa > 100:
            raise ValueError("descuento_por_divisa debe estar entre 0 y 100")

# En el endpoint POST /punto-venta/ventas
def crear_venta(data):
    venta = Venta(
        items=data['items'],
        metodos_pago=data['metodos_pago'],
        total_bs=data['total_bs'],
        total_usd=data['total_usd'],
        tasa_dia=data['tasa_dia'],
        sucursal=data['sucursal'],
        cajero=data['cajero'],
        cliente=data.get('cliente', ''),
        porcentaje_descuento=data.get('porcentaje_descuento', 0),
        descuento_por_divisa=data.get('descuento_por_divisa', 0),  # ⬅️ NUEVO
        notas=data.get('notas', '')
    )
    venta.validar()
    venta.save()
    return venta
```

## Notas Importantes

1. **El descuento ya está calculado en el frontend**: El frontend calcula los precios con descuento y envía los totales ya calculados. El backend solo necesita almacenar el valor del porcentaje para referencia y reportes.

2. **El descuento se aplica solo cuando el pago es en USD**: Aunque el campo se envía siempre, el frontend solo lo activa cuando el usuario selecciona pagar en divisas (USD).

3. **Compatibilidad con descuentos del cliente**: El descuento por divisa se suma al descuento del cliente. Ambos se aplican secuencialmente.

4. **No afecta el cálculo de totales**: Los totales (`total_bs` y `total_usd`) ya vienen calculados desde el frontend con el descuento aplicado.

## Preguntas Frecuentes

**P: ¿El descuento por divisa se aplica a todos los métodos de pago en USD?**
R: Sí, el descuento se aplica cuando el usuario activa el checkbox, independientemente del método de pago específico (efectivo, banco, etc.), siempre que sea en USD.

**P: ¿Qué pasa si el usuario activa el descuento pero luego paga en Bs?**
R: El frontend solo activa el descuento cuando el pago es en USD. Si el usuario cambia a Bs, el descuento se desactiva automáticamente.

**P: ¿El backend debe recalcular los totales?**
R: No, el frontend ya calcula los totales con el descuento aplicado. El backend solo almacena el porcentaje para referencia.

## Fecha de Implementación

- **Frontend**: Implementado
- **Backend**: Pendiente de implementación

## Contacto

Si hay dudas sobre la implementación, consultar con el equipo de desarrollo del frontend.

