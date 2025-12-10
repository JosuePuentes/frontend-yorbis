# 📋 INSTRUCCIONES FRONTEND: Mostrar Marca del Producto en Punto de Venta

## 📌 PROBLEMA

En el módulo de punto de venta, cuando se buscan productos, la marca del producto no se está mostrando en los resultados de búsqueda, aunque se está agregando en el módulo de compras.

## ✅ SOLUCIÓN

El código del frontend **YA está preparado** para mostrar la marca. El problema probablemente es que el backend no está enviando la marca en la respuesta del endpoint de búsqueda.

---

## 🔍 VERIFICACIÓN DEL CÓDIGO FRONTEND

### 1. Normalización de Productos (Ya implementado)

El código ya normaliza la marca en dos lugares:

**A) En la función `cargarProductosDesdeInventarios` (línea ~571):**
```typescript
marca: item.marca || item.marca_producto || "",
```

**B) En la visualización de resultados (línea ~2658):**
```typescript
const marca = producto.marca || producto.marca_producto || "";
```

**C) En el renderizado (líneas ~2683-2685):**
```tsx
{marca && (
  <div className="text-xs text-slate-600 mb-1">Marca: {marca}</div>
)}
```

### 2. Estructura Actual de Visualización

Los productos se muestran con esta estructura:
- **Código** (en azul, negrita)
- **Descripción** (en negro, negrita)
- **Marca** (en gris, texto pequeño) ← **DEBE APARECER AQUÍ**
- **Precio** (en verde, negrita)
- **Lote y fecha de vencimiento** (si aplica)
- **Stock** (botón verde/rojo)

---

## ⚠️ VERIFICACIÓN REQUERIDA

### Paso 1: Verificar que el Backend Envía la Marca

El endpoint `/punto-venta/productos/buscar` **DEBE** incluir la marca en cada producto:

```json
{
  "id": "producto_id",
  "codigo": "010001",
  "nombre": "ESMALTE SINTETICO",
  "descripcion": "ESMALTE SINTETICO GAL PINTEMOS EL PRO BLANCO",
  "marca": "PINTEMOS",  // ← DEBE ESTAR PRESENTE
  "marca_producto": "PINTEMOS",  // ← O ESTE CAMPO
  "precio": 23.51,
  "cantidad": 12
}
```

### Paso 2: Verificar en el Navegador

1. Abre el punto de venta
2. Busca un producto que tenga marca
3. Abre la consola del navegador (F12)
4. Verifica en la respuesta del endpoint si viene el campo `marca` o `marca_producto`

**Comando en consola:**
```javascript
// Ver productos encontrados
console.log(productosEncontrados);
```

### Paso 3: Verificar Normalización

Si el backend envía la marca pero no se muestra, verifica que la normalización esté funcionando:

```typescript
// En la función de normalización, agregar log temporal:
console.log('Marca del producto:', item.marca, item.marca_producto);
```

---

## 🔧 MEJORAS OPCIONALES

### Opción 1: Mejorar Visualización de la Marca

Si quieres hacer la marca más visible, puedes modificar el estilo:

**Ubicación:** `src/pages/PuntoVentaPage.tsx` línea ~2683

**Código actual:**
```tsx
{marca && (
  <div className="text-xs text-slate-600 mb-1">Marca: {marca}</div>
)}
```

**Código mejorado (más visible):**
```tsx
{marca && (
  <div className="text-xs font-medium text-slate-700 mb-1 bg-slate-50 px-2 py-0.5 rounded inline-block">
    🏷️ {marca}
  </div>
)}
```

### Opción 2: Mostrar Marca en la Descripción

Si prefieres mostrar la marca junto con la descripción:

**Código actual (línea ~2681):**
```tsx
<div className="font-semibold text-sm text-slate-800 mb-1">{descripcion}</div>
```

**Código mejorado:**
```tsx
<div className="font-semibold text-sm text-slate-800 mb-1">
  {descripcion}
  {marca && (
    <span className="text-xs font-normal text-slate-500 ml-2">
      ({marca})
    </span>
  )}
</div>
```

### Opción 3: Mostrar Marca como Badge

Para hacer la marca más destacada:

```tsx
{marca && (
  <div className="inline-block">
    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
      {marca}
    </span>
  </div>
)}
```

---

## 📝 INSTRUCCIONES PARA EL BACKEND

Si el backend **NO está enviando la marca**, debe modificar el endpoint `/punto-venta/productos/buscar` para incluirla:

### Ejemplo Python/FastAPI:

```python
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str = Query(..., description="Término de búsqueda"),
    sucursal: str = Query(..., description="ID de la sucursal"),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # ... código de búsqueda existente ...
    
    productos_encontrados = []
    for item in items_inventario:
        producto = {
            "id": str(item["_id"]),
            "codigo": item.get("codigo", ""),
            "nombre": item.get("descripcion", ""),
            "descripcion": item.get("descripcion", ""),
            "marca": item.get("marca", ""),  # ← AGREGAR ESTA LÍNEA
            "marca_producto": item.get("marca", ""),  # ← Y ESTA (para compatibilidad)
            "precio": item.get("precio_unitario", 0),
            "cantidad": item.get("cantidad", 0),
            # ... otros campos ...
        }
        productos_encontrados.append(producto)
    
    return productos_encontrados
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

- [ ] Verificar que el backend envía `marca` o `marca_producto` en la respuesta
- [ ] Verificar en la consola del navegador que los productos tienen el campo marca
- [ ] Verificar que la marca se muestra en los resultados de búsqueda
- [ ] Probar con productos que tienen marca
- [ ] Probar con productos que NO tienen marca (no debe mostrar "Marca: ")
- [ ] Verificar que la marca se muestra correctamente en diferentes tamaños de pantalla

---

## 🐛 DEBUGGING

### Si la marca NO se muestra:

1. **Verificar respuesta del backend:**
   ```javascript
   // En la consola del navegador, después de buscar un producto:
   console.log('Productos encontrados:', productosEncontrados);
   console.log('Primer producto:', productosEncontrados[0]);
   console.log('Marca del primer producto:', productosEncontrados[0]?.marca);
   ```

2. **Verificar normalización:**
   ```typescript
   // Agregar temporalmente en la función de normalización:
   console.log('Item original:', item);
   console.log('Marca normalizada:', item.marca || item.marca_producto || "");
   ```

3. **Verificar renderizado:**
   ```tsx
   // Agregar temporalmente antes del renderizado:
   {console.log('Marca para renderizar:', marca)}
   {marca && (
     <div className="text-xs text-slate-600 mb-1">Marca: {marca}</div>
   )}
   ```

---

## 📊 ESTRUCTURA ESPERADA DEL PRODUCTO

El producto debe tener esta estructura para que la marca se muestre:

```typescript
interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  descripcion: string;
  marca?: string;  // ← Campo opcional pero recomendado
  marca_producto?: string;  // ← Campo alternativo
  precio: number;
  precio_usd?: number;
  cantidad: number;
  stock?: number;
  lotes?: Array<{
    lote: string;
    fecha_vencimiento?: string;
    cantidad?: number;
  }>;
}
```

---

## 🎨 ESTILOS ACTUALES

La marca se muestra con estos estilos:
- **Tamaño:** `text-xs` (texto pequeño)
- **Color:** `text-slate-600` (gris medio)
- **Posición:** Entre la descripción y el precio
- **Formato:** "Marca: {nombre_marca}"

---

## 🚀 IMPLEMENTACIÓN RÁPIDA

Si el backend ya envía la marca pero no se muestra, verifica:

1. **Abrir el archivo:** `src/pages/PuntoVentaPage.tsx`
2. **Ir a la línea ~2683**
3. **Verificar que existe este código:**
   ```tsx
   {marca && (
     <div className="text-xs text-slate-600 mb-1">Marca: {marca}</div>
   )}
   ```
4. **Si NO existe, agregarlo después de la línea 2681 (después de la descripción)**

---

## 📝 NOTAS IMPORTANTES

1. **El código frontend YA está preparado** para mostrar la marca
2. **El problema más probable** es que el backend no está enviando la marca
3. **La marca se normaliza** desde `marca` o `marca_producto`
4. **Si la marca está vacía**, no se muestra (evita mostrar "Marca: ")
5. **La marca se muestra solo si existe** (condición `{marca && ...}`)

---

**Última actualización:** 2025-01-15

