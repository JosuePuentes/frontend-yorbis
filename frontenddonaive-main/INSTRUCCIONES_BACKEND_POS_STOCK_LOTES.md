# Instrucciones Backend - Punto de Venta: Stock y Lotes

## Endpoint: GET `/punto-venta/productos/buscar`

El frontend ahora requiere que este endpoint devuelva información de **stock** y **stock por sucursal** para cada producto.

### Estructura de Respuesta Requerida

El endpoint debe devolver un **array de productos** (no un objeto con `productos`):

```json
[
  {
    "id": "producto_id_123",
    "nombre": "Paracetamol 500mg",
    "codigo": "PROD001",
    "precio": 2.50,
    "precio_usd": 2.50,
    "cantidad": 150,
    "stock": 150,
    "sucursal": "01",
    "stock_por_sucursal": [
      {
        "sucursal_id": "01",
        "sucursal_nombre": "Santa Elena",
        "cantidad": 150,
        "stock": 150
      },
      {
        "sucursal_id": "02",
        "sucursal_nombre": "Centro",
        "cantidad": 75,
        "stock": 75
      },
      {
        "sucursal_id": "03",
        "sucursal_nombre": "Norte",
        "cantidad": 0,
        "stock": 0
      }
    ]
  }
]
```

### Campos Requeridos

#### Campos Básicos:
- `id` (string, requerido): ID único del producto (puede ser `_id` convertido a string)
- `nombre` (string, requerido): Nombre del producto
- `codigo` (string, opcional): Código de barras o código interno
- `precio` (number, requerido): Precio en USD (usar `precio_unitario` del inventario)
- `precio_usd` (number, opcional): Precio en USD (igual que `precio`)

#### Campos de Stock:
- `cantidad` (number, requerido): **Stock total** del producto en la sucursal (suma de todos los lotes)
- `stock` (number, opcional): Alias de `cantidad` (para compatibilidad)

#### Campos de Stock por Sucursal:
- `stock_por_sucursal` (array, requerido): Array de objetos `StockPorSucursal` con el stock del producto en cada sucursal:
  ```json
  {
    "sucursal_id": "01",                   // String: ID de la sucursal
    "sucursal_nombre": "Santa Elena",      // String: Nombre de la sucursal
    "cantidad": 150,                       // Number: Stock en esta sucursal
    "stock": 150                           // Number: Alias de cantidad (opcional)
  }
  ```
  
  **Importante**: Debe incluir **todas las sucursales** donde el producto existe, incluso si el stock es 0.

### Ejemplo de Implementación (Python/FastAPI)

```python
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str,
    sucursal: str,
    current_user: User = Depends(get_current_user)
):
    # 1. Buscar items del inventario de la sucursal
    inventario = await get_inventario_by_sucursal(sucursal)
    if not inventario:
        return []
    
    # 2. Buscar items que coincidan con la búsqueda (por nombre o código)
    items = await buscar_items_inventario(
        inventario_id=inventario._id,
        query=q,
        sucursal=sucursal
    )
    
    # 3. Formatear respuesta con lotes
    productos = []
    for item in items:
        # Calcular stock total (suma de cantidades de lotes, o usar cantidad del item)
        stock_total = item.cantidad or 0
        if item.lotes:
            stock_total = sum(lote.get('cantidad', 0) for lote in item.lotes)
        
        # Obtener stock en todas las sucursales
        stock_por_sucursal = await obtener_stock_por_sucursal(
            producto_id=item._id,
            codigo=item.codigo
        )
        
        productos.append({
            "id": str(item._id),
            "nombre": item.descripcion or item.nombre or "",
            "codigo": item.codigo or "",
            "precio": item.precio_unitario or item.precio or 0,
            "precio_usd": item.precio_unitario or item.precio or 0,
            "cantidad": stock_total,
            "stock": stock_total,  # Alias para compatibilidad
            "sucursal": sucursal,
            "stock_por_sucursal": stock_por_sucursal
        })
    
    return productos
```

### Función Helper: `obtener_stock_por_sucursal`

Esta función debe buscar el producto (por `codigo` o `producto_id`) en **todas las sucursales** y devolver el stock en cada una:

```python
async def obtener_stock_por_sucursal(producto_id: str = None, codigo: str = None):
    """
    Obtiene el stock de un producto en todas las sucursales.
    
    Args:
        producto_id: ID del producto (opcional)
        codigo: Código del producto (opcional)
    
    Returns:
        Lista de objetos StockPorSucursal con stock en cada sucursal
    """
    # Obtener todas las sucursales
    sucursales = await obtener_todas_las_sucursales()
    
    stock_por_sucursal = []
    
    for sucursal in sucursales:
        # Buscar el inventario de esta sucursal
        inventario = await get_inventario_by_sucursal(sucursal.id)
        if not inventario:
            # Si no hay inventario, stock es 0
            stock_por_sucursal.append({
                "sucursal_id": sucursal.id,
                "sucursal_nombre": sucursal.nombre,
                "cantidad": 0,
                "stock": 0
            })
            continue
        
        # Buscar el item en este inventario
        item = None
        if codigo:
            item = await buscar_item_por_codigo(inventario._id, codigo)
        elif producto_id:
            item = await buscar_item_por_id(inventario._id, producto_id)
        
        if item:
            # Calcular stock total (suma de lotes o cantidad del item)
            stock_total = item.cantidad or 0
            if item.lotes:
                stock_total = sum(lote.get('cantidad', 0) for lote in item.lotes)
            
            stock_por_sucursal.append({
                "sucursal_id": sucursal.id,
                "sucursal_nombre": sucursal.nombre,
                "cantidad": stock_total,
                "stock": stock_total
            })
        else:
            # Producto no existe en esta sucursal, stock es 0
            stock_por_sucursal.append({
                "sucursal_id": sucursal.id,
                "sucursal_nombre": sucursal.nombre,
                "cantidad": 0,
                "stock": 0
            })
    
    return stock_por_sucursal
```

### Notas Importantes

1. **Stock Total**: El campo `cantidad` debe reflejar el stock total del producto en esa sucursal. Si el item tiene `lotes`, sumar las cantidades de todos los lotes. Si no tiene lotes, usar el campo `cantidad` del item.

2. **Stock por Sucursal**: El campo `stock_por_sucursal` es **REQUERIDO** y debe incluir **TODAS las sucursales**, incluso si el stock es 0. Esto permite al frontend mostrar un dropdown completo con todas las sucursales.

3. **Lotes para Mostrar en Descripción**: El frontend muestra el **primer lote** al lado de la descripción. Asegúrate de que `lotes` esté ordenado por fecha de vencimiento (más próximo primero) o por importancia.

4. **Fecha de Vencimiento**: Debe estar en formato ISO (YYYY-MM-DD). Si un lote no tiene fecha de vencimiento, puede ser `null` o `undefined`.

5. **Filtrado por Sucursal**: Solo devolver productos que pertenezcan al inventario de la sucursal especificada en el query parameter.

6. **Búsqueda**: La búsqueda debe ser case-insensitive y buscar en:
   - `nombre` o `descripcion` del producto
   - `codigo` del producto

### Validaciones

- Si `cantidad` es 0 o `null`, el frontend mostrará el precio en **rojo** (sin stock)
- Si `cantidad` > 0, el frontend mostrará el precio en **verde** (con stock)
- Si hay lotes, el usuario podrá hacer clic en "Stock" para ver el desglose por lote
- Los lotes vencidos se mostrarán en rojo, los que vencen pronto (30 días) en naranja

### Estructura de Base de Datos Esperada

El backend debe tener los items del inventario con esta estructura:

```python
class ItemInventario:
    _id: ObjectId
    codigo: str
    descripcion: str
    marca: Optional[str]
    precio_unitario: float  # Precio en USD
    cantidad: int           # Stock total
    lotes: Optional[List[Lote]]  # Array de lotes
    inventario_id: ObjectId  # ID del inventario al que pertenece
    sucursal: str           # ID de la sucursal
    
class Lote:
    lote: str                    # Número/código del lote
    fecha_vencimiento: Optional[str]  # "YYYY-MM-DD"
    cantidad: Optional[int]      # Cantidad en este lote

class Inventario:
    _id: ObjectId
    sucursal: str           # ID de la sucursal
    fecha_carga: datetime
    items: List[ItemInventario]  # Items del inventario
```

### Ejemplo Completo de Respuesta

```json
[
  {
    "id": "690c40be93d9d9d635fbae83",
    "nombre": "Paracetamol 500mg",
    "codigo": "PROD001",
    "precio": 2.50,
    "precio_usd": 2.50,
    "cantidad": 150,
    "stock": 150,
    "sucursal": "01",
    "lotes": [
      {
        "lote": "LOTE-001",
        "fecha_vencimiento": "2025-12-31",
        "cantidad": 50
      },
      {
        "lote": "LOTE-002",
        "fecha_vencimiento": "2026-06-30",
        "cantidad": 100
      }
    ],
    "stock_por_sucursal": [
      {
        "sucursal_id": "01",
        "sucursal_nombre": "Santa Elena",
        "cantidad": 150,
        "stock": 150
      },
      {
        "sucursal_id": "02",
        "sucursal_nombre": "Centro",
        "cantidad": 75,
        "stock": 75
      },
      {
        "sucursal_id": "03",
        "sucursal_nombre": "Norte",
        "cantidad": 0,
        "stock": 0
      }
    ]
  }
]
```

### Checklist de Implementación

- [ ] El endpoint devuelve un array (no un objeto con `productos`)
- [ ] Cada producto incluye `id`, `nombre`, `codigo`, `precio`, `precio_usd`
- [ ] Cada producto incluye `cantidad` (stock total en la sucursal actual)
- [ ] Cada producto incluye `stock_por_sucursal` (array con stock en TODAS las sucursales)
- [ ] `stock_por_sucursal` incluye todas las sucursales, incluso si el stock es 0
- [ ] Cada elemento de `stock_por_sucursal` tiene `sucursal_id`, `sucursal_nombre`, `cantidad`, `stock`
- [ ] Cada producto incluye `lotes` (array, puede estar vacío) - solo el primer lote se muestra en la descripción
- [ ] Los lotes tienen `lote`, `fecha_vencimiento` (formato YYYY-MM-DD), y `cantidad`
- [ ] El stock total (`cantidad`) es la suma de las cantidades de los lotes (si existen)
- [ ] La búsqueda filtra correctamente por sucursal
- [ ] La búsqueda es case-insensitive y busca en nombre/código
- [ ] La función `obtener_stock_por_sucursal` busca el producto en todas las sucursales

