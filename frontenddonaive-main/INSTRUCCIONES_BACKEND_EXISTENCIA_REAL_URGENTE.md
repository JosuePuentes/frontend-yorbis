# 🚨 INSTRUCCIONES BACKEND URGENTES: Sincronizar Existencia Real en Punto de Venta

## ⚠️ PROBLEMA CRÍTICO ACTUAL

**El endpoint `/punto-venta/productos/buscar` está devolviendo existencia incorrecta.**

**Situación:**
- En **VerInventarios** se muestra: **Existencia: 1** (correcto)
- En **Punto de Venta** se muestra: **Existencia: 2** (incorrecto)
- El frontend está consultando directamente el inventario para corregir esto, pero **el backend debe devolver la existencia correcta desde el inicio**

**Impacto:**
- Los usuarios pueden vender productos que no existen en inventario
- Desconfianza en el sistema
- Posibles pérdidas por ventas de productos inexistentes

---

## 🎯 SOLUCIÓN REQUERIDA

**El endpoint `/punto-venta/productos/buscar` DEBE devolver la existencia REAL del inventario activo de la sucursal.**

---

## 📋 ENDPOINT AFECTADO

### `GET /punto-venta/productos/buscar`

**Request:**
```
GET /punto-venta/productos/buscar?q=TT1135&sucursal=01
```

**Parámetros:**
- `q`: Término de búsqueda (código, descripción, marca)
- `sucursal`: ID de la sucursal (ej: "01")

---

## ✅ RESPUESTA REQUERIDA

**El endpoint DEBE devolver la existencia REAL del inventario activo:**

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
    "cantidad": 1,           // ✅ CRÍTICO: Debe ser la existencia REAL del inventario
    "existencia": 1,        // ✅ CRÍTICO: Mismo valor que cantidad (campo principal)
    "stock": 1,             // ✅ CRÍTICO: Mismo valor (compatibilidad)
    "utilidad": 8.8,
    "porcentaje_utilidad": 40.0,
    "sucursal": "01",
    "estado": "activo",
    "lotes": []
  }
]
```

**Campos críticos:**
- `cantidad`: **DEBE ser la existencia REAL del inventario activo**
- `existencia`: **DEBE tener el mismo valor que cantidad** (campo principal usado por el frontend)
- `stock`: **DEBE tener el mismo valor** (compatibilidad)

**IMPORTANTE:** Estos tres campos deben tener el **MISMO valor** y reflejar la **existencia REAL** del inventario activo.

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### PASO 1: Obtener Inventario Activo de la Sucursal

```python
# Obtener el inventario activo de la sucursal
inventario = await db.inventarios.find_one({
    "$or": [
        {"sucursal": sucursal_id},
        {"farmacia": sucursal_id},
        {"sucursal_id": sucursal_id}
    ],
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

if not items:
    return []  # No hay productos en el inventario
```

### PASO 3: Buscar Items que Coincidan con la Búsqueda

```python
# Buscar items que coincidan con la búsqueda
items_filtrados = []
busqueda_lower = busqueda.lower()

for item in items:
    codigo = (item.get("codigo") || item.get("codigo_producto") || "").lower()
    descripcion = (item.get("descripcion") || item.get("nombre") || "").lower()
    marca = (item.get("marca") || item.get("marca_producto") || "").lower()
    
    # Verificar si coincide con la búsqueda
    if busqueda_lower in codigo or busqueda_lower in descripcion or busqueda_lower in marca:
        items_filtrados.append(item)
```

### PASO 4: Formatear Respuesta con Existencia REAL

```python
# Formatear items para respuesta
resultados = []

for item in items_filtrados:
    # ✅ CRÍTICO: Obtener existencia REAL del inventario
    # Prioridad: cantidad > existencia > stock
    existencia_real = item.get("cantidad") or item.get("existencia") or item.get("stock") or 0
    
    # Calcular precio si no existe
    costo = item.get("costo_unitario") || item.get("costo") || 0
    precio = item.get("precio_unitario") || item.get("precio") || 0
    
    # Si no hay precio, calcular desde costo + utilidad (40% por defecto)
    if precio == 0 and costo > 0:
        utilidad_porcentaje = item.get("porcentaje_utilidad") || item.get("utilidad_porcentaje") || 40.0
        precio = costo * (1 + utilidad_porcentaje / 100)
    
    # Formatear item para respuesta
    resultado = {
        "id": str(item.get("_id")),
        "_id": str(item.get("_id")),
        "codigo": item.get("codigo") || item.get("codigo_producto"),
        "nombre": item.get("descripcion") || item.get("nombre"),
        "descripcion": item.get("descripcion") || item.get("nombre"),
        "marca": item.get("marca") || item.get("marca_producto") || "",
        "costo": costo,
        "costo_unitario": costo,
        "precio": precio,
        "precio_unitario": precio,
        "precio_venta": precio,
        # ✅ CRÍTICO: Asignar existencia REAL a los tres campos
        "cantidad": existencia_real,
        "existencia": existencia_real,  # Campo principal
        "stock": existencia_real,      # Compatibilidad
        "utilidad": precio - costo,
        "porcentaje_utilidad": item.get("porcentaje_utilidad") || item.get("utilidad_porcentaje") || 40.0,
        "sucursal": sucursal_id,
        "estado": "activo",
        "lotes": item.get("lotes") || []
    }
    
    resultados.append(resultado)

return resultados
```

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
    
    CRÍTICO: Debe devolver la existencia REAL del inventario activo.
    La existencia debe ser la misma que se muestra en VerInventarios.
    """
    try:
        # Validar parámetros
        if not q or not q.strip():
            return []
        
        if not sucursal:
            raise HTTPException(
                status_code=400,
                detail="Parámetro 'sucursal' es requerido"
            )
        
        busqueda = q.strip()
        
        # PASO 1: Obtener inventario activo
        inventario = await db.inventarios.find_one({
            "$or": [
                {"sucursal": sucursal},
                {"farmacia": sucursal},
                {"sucursal_id": sucursal}
            ],
            "estado": "activo"
        })
        
        if not inventario:
            print(f"⚠️ [BACKEND] Inventario activo no encontrado para sucursal: {sucursal}")
            return []  # No hay inventario activo, retornar vacío
        
        # PASO 2: Obtener items del inventario
        items = inventario.get("items", [])
        
        if not items:
            print(f"⚠️ [BACKEND] Inventario {inventario['_id']} no tiene items")
            return []  # No hay items en el inventario
        
        # PASO 3: Buscar items que coincidan
        busqueda_lower = busqueda.lower()
        items_filtrados = []
        
        for item in items:
            codigo = (item.get("codigo") || item.get("codigo_producto") || "").lower()
            descripcion = (item.get("descripcion") || item.get("nombre") || "").lower()
            marca = (item.get("marca") || item.get("marca_producto") || "").lower()
            
            if busqueda_lower in codigo or busqueda_lower in descripcion or busqueda_lower in marca:
                items_filtrados.append(item)
        
        # PASO 4: Formatear respuesta con existencia REAL
        resultados = []
        
        for item in items_filtrados:
            # ✅ CRÍTICO: Obtener existencia REAL del inventario
            existencia_real = item.get("cantidad") or item.get("existencia") or item.get("stock") or 0
            
            # Obtener datos del item
            costo = item.get("costo_unitario") || item.get("costo") || 0
            precio = item.get("precio_unitario") || item.get("precio") || 0
            
            # Calcular precio si no existe
            if precio == 0 and costo > 0:
                utilidad_porcentaje = item.get("porcentaje_utilidad") || item.get("utilidad_porcentaje") || 40.0
                precio = costo * (1 + utilidad_porcentaje / 100)
            
            # Formatear resultado
            resultado = {
                "id": str(item.get("_id")),
                "_id": str(item.get("_id")),
                "codigo": item.get("codigo") || item.get("codigo_producto"),
                "nombre": item.get("descripcion") || item.get("nombre"),
                "descripcion": item.get("descripcion") || item.get("nombre"),
                "marca": item.get("marca") || item.get("marca_producto") || "",
                "costo": costo,
                "costo_unitario": costo,
                "precio": precio,
                "precio_unitario": precio,
                "precio_venta": precio,
                # ✅ CRÍTICO: Asignar existencia REAL
                "cantidad": existencia_real,
                "existencia": existencia_real,  # Campo principal
                "stock": existencia_real,      # Compatibilidad
                "utilidad": precio - costo,
                "porcentaje_utilidad": item.get("porcentaje_utilidad") || item.get("utilidad_porcentaje") || 40.0,
                "sucursal": sucursal,
                "estado": "activo",
                "lotes": item.get("lotes") || []
            }
            
            resultados.append(resultado)
            
            # ✅ LOG CRÍTICO: Verificar que la existencia sea correcta
            print(f"✅ [BACKEND] Producto {resultado['codigo']}: existencia={existencia_real}, cantidad={item.get('cantidad')}, existencia_item={item.get('existencia')}, stock={item.get('stock')}")
        
        print(f"✅ [BACKEND] Búsqueda '{busqueda}' en sucursal '{sucursal}': {len(resultados)} productos encontrados")
        
        return resultados
        
    except Exception as e:
        print(f"❌ [BACKEND] Error al buscar productos: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
```

---

## ✅ VALIDACIONES CRÍTICAS

1. **SIEMPRE usar el inventario activo de la sucursal**
   - No usar inventarios inactivos
   - No usar inventarios de otras sucursales

2. **SIEMPRE obtener la existencia del item del inventario**
   - NO usar valores calculados
   - NO usar valores de otros inventarios
   - NO usar valores hardcodeados
   - DEBE usar `item.cantidad` o `item.existencia` o `item.stock` del inventario activo

3. **SIEMPRE sincronizar los tres campos**
   - `cantidad` = existencia real
   - `existencia` = existencia real (campo principal)
   - `stock` = existencia real (compatibilidad)

4. **SIEMPRE verificar que la existencia sea la misma que en VerInventarios**
   - El endpoint `/inventarios/{id}/items` muestra la existencia real
   - El endpoint `/punto-venta/productos/buscar` debe mostrar la MISMA existencia

---

## 🔍 VERIFICACIÓN POST-IMPLEMENTACIÓN

Para verificar que funciona correctamente:

1. **En VerInventarios:**
   - Buscar producto "TT1135"
   - Anotar la existencia mostrada (ejemplo: 1)

2. **En Punto de Venta:**
   - Buscar producto "TT1135"
   - Verificar que la existencia sea la misma (debe ser 1)

3. **Si son diferentes:**
   - Verificar logs del backend
   - Verificar que se esté usando el inventario activo correcto
   - Verificar que se esté obteniendo la existencia del item correcto

---

## 📊 LOGS RECOMENDADOS

Agregar estos logs para debugging:

```python
# Al obtener inventario
print(f"🔍 [BACKEND] Buscando inventario activo para sucursal: {sucursal}")
print(f"✅ [BACKEND] Inventario encontrado: {inventario['_id']}, items: {len(items)}")

# Al buscar items
print(f"🔍 [BACKEND] Búsqueda: '{busqueda}', items encontrados: {len(items_filtrados)}")

# Por cada item formateado
print(f"📦 [BACKEND] Producto {resultado['codigo']}: existencia_real={existencia_real}, cantidad_item={item.get('cantidad')}, existencia_item={item.get('existencia')}, stock_item={item.get('stock')}")
```

---

## 🚨 RECORDATORIOS IMPORTANTES

1. **NO usar valores calculados o hardcodeados para la existencia**
2. **SIEMPRE consultar el inventario activo de la sucursal**
3. **SIEMPRE obtener la existencia directamente del item del inventario**
4. **SIEMPRE sincronizar los tres campos** (`cantidad`, `existencia`, `stock`)
5. **La existencia debe ser la MISMA que se muestra en VerInventarios**

---

## 📞 EJEMPLO DE PRUEBA

**Request:**
```
GET /punto-venta/productos/buscar?q=TT1135&sucursal=01
```

**Respuesta esperada:**
```json
[
  {
    "codigo": "TT1135",
    "nombre": "ESMERIL ANGULAR 4-1/2 710W",
    "cantidad": 1,      // ✅ Debe ser 1 (existencia real del inventario)
    "existencia": 1,   // ✅ Debe ser 1 (mismo valor)
    "stock": 1         // ✅ Debe ser 1 (mismo valor)
  }
]
```

**NO debe ser:**
```json
[
  {
    "codigo": "TT1135",
    "cantidad": 2,      // ❌ INCORRECTO: No es la existencia real
    "existencia": 2,   // ❌ INCORRECTO
    "stock": 2         // ❌ INCORRECTO
  }
]
```

---

**Fecha de creación:** 2025-01-20
**Prioridad:** CRÍTICA - URGENTE
**Estado:** PENDIENTE DE IMPLEMENTACIÓN

