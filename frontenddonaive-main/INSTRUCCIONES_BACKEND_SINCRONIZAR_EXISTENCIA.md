# 🔄 INSTRUCCIONES BACKEND: Sincronizar Existencia entre VerInventarios y Punto de Venta

## ⚠️ PROBLEMA ACTUAL

**Las cantidades/existencias mostradas en VerInventarios y Punto de Venta son diferentes**, lo que causa confusión y puede llevar a vender productos que no existen en inventario.

**Situación:**
- En VerInventarios se muestra la existencia del inventario
- En Punto de Venta se muestra una cantidad diferente
- Al confirmar una venta, no se descuenta correctamente la existencia

---

## 🎯 SOLUCIÓN REQUERIDA

**CRÍTICO:** Ambos módulos deben mostrar la MISMA existencia, obtenida directamente del inventario activo de la sucursal.

---

## 📋 ENDPOINTS AFECTADOS

### 1. `GET /inventarios/{inventario_id}/items`

**Este es el endpoint PRINCIPAL que ambos módulos deben usar.**

**Respuesta requerida:**
```json
[
  {
    "_id": "69349598873821ce1837413d",
    "codigo": "TT1135",
    "descripcion": "ESMERIL ANGULAR 4-1/2 710W",
    "marca": "TOTAL",
    "costo_unitario": 22.0,
    "precio_unitario": 30.8,
    "cantidad": 1,           // ✅ CRÍTICO: Debe ser la existencia real
    "existencia": 1,        // ✅ CRÍTICO: Campo principal (mismo valor que cantidad)
    "stock": 1,             // ✅ Compatibilidad (mismo valor)
    "lotes": []
  }
]
```

**Campos críticos:**
- `cantidad`: Existencia real del producto en el inventario
- `existencia`: Mismo valor que cantidad (campo principal)
- `stock`: Mismo valor que cantidad (compatibilidad)

**IMPORTANTE:** Estos tres campos deben tener el MISMO valor y reflejar la existencia real del inventario.

---

### 2. `GET /punto-venta/productos/buscar?q={busqueda}&sucursal={sucursal_id}`

**Este endpoint debe devolver los MISMOS datos que `/inventarios/{inventario_id}/items`.**

**Request:**
```
GET /punto-venta/productos/buscar?q=ESMERIL&sucursal=01
```

**Respuesta requerida:**
```json
[
  {
    "id": "69349598873821ce1837413d",
    "_id": "69349598873821ce1837413d",
    "codigo": "TT1135",
    "nombre": "ESMERIL ANGULAR 4-1/2 710W",
    "descripcion": "ESMERIL ANGULAR 4-1/2 710W",
    "marca": "TOTAL",
    "costo": 22.0,
    "costo_unitario": 22.0,
    "precio": 30.8,
    "precio_unitario": 30.8,
    "precio_venta": 30.8,
    "cantidad": 1,           // ✅ CRÍTICO: Debe ser la existencia real del inventario
    "existencia": 1,        // ✅ CRÍTICO: Campo principal (mismo valor que cantidad)
    "stock": 1,             // ✅ Compatibilidad (mismo valor)
    "utilidad": 8.8,
    "porcentaje_utilidad": 40.0,
    "sucursal": "01",
    "estado": "activo",
    "lotes": []
  }
]
```

**IMPORTANTE:**
- `cantidad`, `existencia` y `stock` deben tener el MISMO valor
- Este valor debe ser la existencia REAL del inventario activo de la sucursal
- NO debe ser un valor calculado o diferente

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Obtener Inventario Activo de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "sucursal": sucursal_id,  # O "farmacia" según tu estructura
    "estado": "activo"
})

if not inventario:
    raise HTTPException(
        status_code=404,
        detail=f"Inventario activo no encontrado para la sucursal {sucursal_id}"
    )

inventario_id = inventario["_id"]
```

### PASO 2: Obtener Items del Inventario

```python
# Obtener items del inventario
items = inventario.get("items", [])

# Buscar items que coincidan con la búsqueda
items_filtrados = []
busqueda_lower = busqueda.lower()

for item in items:
    codigo = (item.get("codigo") || item.get("codigo_producto") || "").lower()
    descripcion = (item.get("descripcion") || item.get("nombre") || "").lower()
    marca = (item.get("marca") || item.get("marca_producto") || "").lower()
    
    if busqueda_lower in codigo or busqueda_lower in descripcion or busqueda_lower in marca:
        # ✅ CRÍTICO: Obtener existencia real del inventario
        existencia_real = item.get("cantidad") or item.get("existencia") or item.get("stock") or 0
        
        # Formatear item para respuesta
        item_formateado = {
            "id": str(item.get("_id")),
            "_id": str(item.get("_id")),
            "codigo": item.get("codigo") || item.get("codigo_producto"),
            "nombre": item.get("descripcion") || item.get("nombre"),
            "descripcion": item.get("descripcion") || item.get("nombre"),
            "marca": item.get("marca") || item.get("marca_producto") || "",
            "costo": item.get("costo_unitario") || item.get("costo") || 0,
            "costo_unitario": item.get("costo_unitario") || item.get("costo") || 0,
            "precio": item.get("precio_unitario") || item.get("precio") || 0,
            "precio_unitario": item.get("precio_unitario") || item.get("precio") || 0,
            "precio_venta": item.get("precio_unitario") || item.get("precio") || 0,
            # ✅ CRÍTICO: Asignar existencia real a los tres campos
            "cantidad": existencia_real,
            "existencia": existencia_real,  # Campo principal
            "stock": existencia_real,       # Compatibilidad
            "utilidad": (item.get("precio_unitario") || 0) - (item.get("costo_unitario") || 0),
            "porcentaje_utilidad": item.get("porcentaje_utilidad") || item.get("utilidad_porcentaje") || 40.0,
            "sucursal": sucursal_id,
            "estado": "activo",
            "lotes": item.get("lotes") || []
        }
        
        items_filtrados.append(item_formateado)

return items_filtrados
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **Ambos endpoints deben devolver la MISMA existencia**
   - `/inventarios/{inventario_id}/items` → `existencia`
   - `/punto-venta/productos/buscar` → `existencia`
   - Ambos deben tener el mismo valor

2. **Los tres campos deben estar sincronizados**
   - `cantidad` = existencia real
   - `existencia` = existencia real (campo principal)
   - `stock` = existencia real (compatibilidad)

3. **La existencia debe venir directamente del inventario activo**
   - NO debe ser un valor calculado
   - NO debe ser un valor de otro inventario
   - DEBE ser el valor actual del campo `cantidad` o `existencia` del item en el inventario

---

## 🔍 VERIFICACIÓN

Para verificar que ambos módulos muestran la misma existencia:

1. **En VerInventarios:**
   - Buscar un producto
   - Anotar la existencia mostrada (ejemplo: 2)

2. **En Punto de Venta:**
   - Buscar el mismo producto
   - Verificar que la existencia sea la misma (debe ser 2)

3. **Si son diferentes:**
   - Verificar qué endpoint está usando cada módulo
   - Verificar que ambos endpoints devuelvan el mismo valor
   - Verificar que el inventario activo sea el mismo

---

## 📝 EJEMPLO COMPLETO DE ENDPOINT

```python
@router.get("/punto-venta/productos/buscar")
async def buscar_productos(
    q: str,
    sucursal: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Buscar productos en el inventario activo de la sucursal.
    CRÍTICO: Debe devolver la misma existencia que /inventarios/{id}/items
    """
    try:
        # Obtener inventario activo
        inventario = await db.inventarios.find_one({
            "sucursal": sucursal,
            "estado": "activo"
        })
        
        if not inventario:
            return []
        
        items = inventario.get("items", [])
        busqueda_lower = q.lower()
        resultados = []
        
        for item in items:
            # Buscar coincidencias
            codigo = (item.get("codigo") || "").lower()
            descripcion = (item.get("descripcion") || item.get("nombre") || "").lower()
            marca = (item.get("marca") || "").lower()
            
            if busqueda_lower not in codigo and busqueda_lower not in descripcion and busqueda_lower not in marca:
                continue
            
            # ✅ CRÍTICO: Obtener existencia real del inventario
            existencia_real = item.get("cantidad") or item.get("existencia") or item.get("stock") or 0
            
            # Formatear respuesta
            resultado = {
                "id": str(item.get("_id")),
                "_id": str(item.get("_id")),
                "codigo": item.get("codigo"),
                "nombre": item.get("descripcion") || item.get("nombre"),
                "descripcion": item.get("descripcion") || item.get("nombre"),
                "marca": item.get("marca") || "",
                "costo": item.get("costo_unitario") || 0,
                "costo_unitario": item.get("costo_unitario") || 0,
                "precio": item.get("precio_unitario") || 0,
                "precio_unitario": item.get("precio_unitario") || 0,
                "precio_venta": item.get("precio_unitario") || 0,
                # ✅ CRÍTICO: Asignar existencia real
                "cantidad": existencia_real,
                "existencia": existencia_real,
                "stock": existencia_real,
                "utilidad": (item.get("precio_unitario") || 0) - (item.get("costo_unitario") || 0),
                "porcentaje_utilidad": item.get("porcentaje_utilidad") || 40.0,
                "sucursal": sucursal,
                "estado": "activo",
                "lotes": item.get("lotes") || []
            }
            
            resultados.append(resultado)
        
        return resultados
        
    except Exception as e:
        print(f"Error al buscar productos: {e}")
        raise HTTPException(status_code=500, detail=str(e))
```

---

## 🚨 RECORDATORIOS IMPORTANTES

1. **SIEMPRE usar el inventario activo de la sucursal**
2. **SIEMPRE devolver la existencia real del inventario** (no valores calculados)
3. **SIEMPRE sincronizar los tres campos** (`cantidad`, `existencia`, `stock`)
4. **AMBOS endpoints deben devolver los MISMOS valores**

---

## 📞 VERIFICACIÓN POST-IMPLEMENTACIÓN

Después de implementar, verificar:

1. ✅ Buscar un producto en VerInventarios → Anotar existencia
2. ✅ Buscar el mismo producto en Punto de Venta → Verificar que sea la misma existencia
3. ✅ Vender 1 unidad del producto
4. ✅ Verificar que en ambos módulos la existencia se redujo en 1
5. ✅ Verificar que el backend descontó correctamente del inventario

**Fecha de creación:** 2025-01-20
**Prioridad:** CRÍTICA
**Estado:** PENDIENTE DE IMPLEMENTACIÓN

