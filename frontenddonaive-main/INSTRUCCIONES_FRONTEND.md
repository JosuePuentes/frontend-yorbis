# Instrucciones para el Frontend - Modificar Items de Inventario

## Cambio en el Backend

El backend ahora busca items por el **código del producto** (campo `codigo` en PRODUCTOS), **NO por IDs internos de MongoDB**.

## Lo que el Frontend debe hacer

### 1. Usar el campo `codigo` del item para hacer PATCH

```javascript
// ✅ CORRECTO
const codigoProducto = item.codigo; // Ejemplo: "67"
await fetch(`/inventarios/${inventarioId}/items/${codigoProducto}`, {
  method: 'PATCH',
  body: JSON.stringify({ 
    codigo: codigo.trim(),
    descripcion: descripcion.trim(),
    marca: marca.trim(),
    costo: Number(costo),
    existencia: Number(existencia),
    precio: Number(precio),
    porcentaje_ganancia: porcentajeGanancia
  })
});
```

### 2. No usar `_id` o `item_id` internos

```javascript
// ❌ INCORRECTO
await fetch(`/inventarios/${inventarioId}/items/${item._id}`, ...);
await fetch(`/inventarios/${inventarioId}/items/${item.id}`, ...);
```

## Ejemplo completo

```javascript
// Al obtener items del inventario
const items = await fetch(`/inventarios/${inventarioId}/items`).then(r => r.json());

// Cada item tiene:
// - codigo: "67"  ← USAR ESTE para el PATCH
// - _id: "690c40be..."  ← NO usar este
// - id: "690c40be..."  ← NO usar este

// Modificar item
const codigoProducto = productoSeleccionado.codigo || codigo.trim();
await fetch(`/inventarios/${inventarioId}/items/${encodeURIComponent(codigoProducto)}`, {
  method: 'PATCH',
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ 
    codigo: codigo.trim(),
    descripcion: descripcion.trim(),
    marca: marca.trim(),
    costo: Number(costo),
    existencia: Number(existencia),
    precio: Number(precio),
    porcentaje_ganancia: porcentajeGanancia
  })
});
```

## Implementación en ModificarItemInventarioModal.tsx

El código ya está actualizado para usar el código del producto:

```typescript
// El backend busca items por código del producto, no por ID
// Usar el código del producto seleccionado (el código original, no el editado)
const codigoProducto = productoSeleccionado.codigo || codigo.trim();

// Validar que tenemos un código válido
if (!codigoProducto || codigoProducto.trim() === "") {
  throw new Error("No se pudo identificar el item. El código del producto es requerido.");
}

const res = await fetch(`${API_BASE_URL}/inventarios/${inventarioId}/items/${encodeURIComponent(codigoProducto)}`, {
  method: "PATCH",
  // ...
});
```

## Notas importantes

1. **Usar el código original**: Si el usuario edita el código, usar el código original del producto seleccionado para identificar el item en el backend.

2. **Validación**: Asegurarse de que el código no esté vacío antes de hacer la petición.

3. **Encoding**: Usar `encodeURIComponent()` para codificar el código en la URL, especialmente si contiene caracteres especiales.

4. **Consistencia**: Todos los endpoints que modifiquen items deben usar el código, no el ID interno.


