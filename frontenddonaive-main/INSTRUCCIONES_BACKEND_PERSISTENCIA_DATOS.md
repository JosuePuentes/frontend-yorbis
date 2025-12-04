# Instrucciones Backend: Persistencia de Datos - Proveedores y Compras

## ⚠️ PROBLEMA CRÍTICO REPORTADO

**Problema:** Los proveedores y compras creados **NO se están persistiendo** en la base de datos. Los datos creados ayer ya no están disponibles hoy.

**Causa Probable:** Los datos no se están guardando permanentemente en MongoDB, o se están eliminando después de cierto tiempo.

## 🔍 VERIFICACIONES NECESARIAS EN EL BACKEND

### 1. Verificar que los datos se guarden en MongoDB

**Para Proveedores (`POST /proveedores`):**

```python
@router.post("/proveedores")
async def crear_proveedor(
    proveedor: ProveedorBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para crear proveedores")
    
    # Verificar que el RIF no exista
    proveedor_existente = await db.proveedores.find_one({"rif": proveedor.rif})
    if proveedor_existente:
        raise HTTPException(status_code=400, detail="Ya existe un proveedor con este RIF")
    
    # Crear documento del proveedor
    proveedor_doc = {
        "nombre": proveedor.nombre,
        "rif": proveedor.rif,
        "telefono": proveedor.telefono,
        "dias_credito": proveedor.dias_credito or 0,
        "descuento_comercial": proveedor.descuento_comercial or 0.0,
        "descuento_pronto_pago": proveedor.descuento_pronto_pago or 0.0,
        "fecha_creacion": datetime.now(),  # ⚠️ IMPORTANTE: Guardar fecha de creación
        "fecha_actualizacion": datetime.now(),
        "usuario_id": current_user.get("_id"),  # Opcional: guardar quién lo creó
        "activo": True  # ⚠️ IMPORTANTE: Marcar como activo
    }
    
    # ⚠️ CRÍTICO: Insertar en la base de datos
    result = await db.proveedores.insert_one(proveedor_doc)
    
    # Verificar que se insertó correctamente
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Error al guardar proveedor en la base de datos")
    
    # Convertir ObjectId a string
    proveedor_doc["_id"] = str(result.inserted_id)
    
    # ⚠️ LOGGING: Registrar que se guardó
    print(f"[PROVEEDOR CREADO] ID: {proveedor_doc['_id']}, RIF: {proveedor.rif}, Nombre: {proveedor.nombre}")
    
    return proveedor_doc
```

**Para Compras (`POST /compras`):**

```python
@router.post("/compras")
async def crear_compra(
    compra: CompraCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # ... código de validación y procesamiento ...
    
    # ⚠️ CRÍTICO: Guardar compra en la base de datos
    compra_doc = {
        "proveedor_id": ObjectId(compra.proveedor_id),
        "sucursal_id": compra.sucursal_id,
        "fecha": datetime.now(),
        "pagar_en_dolar_negro": compra.pagar_en_dolar_negro,
        "dolar_bcv": compra.dolar_bcv,
        "dolar_negro": compra.dolar_negro,
        "subtotal": subtotal,
        "total_iva": total_iva,
        "total": total,
        "items": items_procesados,
        "usuario_id": current_user.get("_id"),
        "usuario_correo": current_user.get("correo"),
        "fecha_creacion": datetime.now(),  # ⚠️ IMPORTANTE: Guardar fecha de creación
        "fecha_actualizacion": datetime.now(),
        "activo": True  # ⚠️ IMPORTANTE: Marcar como activo
    }
    
    # ⚠️ CRÍTICO: Insertar en la base de datos
    result = await db.compras.insert_one(compra_doc)
    
    # Verificar que se insertó correctamente
    if not result.inserted_id:
        raise HTTPException(status_code=500, detail="Error al guardar compra en la base de datos")
    
    compra_doc["_id"] = result.inserted_id
    
    # ⚠️ LOGGING: Registrar que se guardó
    print(f"[COMPRA CREADA] ID: {compra_doc['_id']}, Proveedor: {compra.proveedor_id}, Total: {total}")
    
    return {
        "compra": compra_doc,
        "subtotal": subtotal,
        "total_iva": total_iva,
        "total": total
    }
```

### 2. Verificar que los datos se recuperen correctamente

**Para Proveedores (`GET /proveedores`):**

```python
@router.get("/proveedores")
async def obtener_proveedores(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver proveedores")
    
    # ⚠️ IMPORTANTE: Buscar TODOS los proveedores activos (sin filtro de fecha)
    proveedores = await db.proveedores.find({
        "activo": {"$ne": False}  # Incluir todos los activos y los que no tienen campo activo
    }).to_list(length=10000)  # Aumentar límite si es necesario
    
    # ⚠️ LOGGING: Registrar cuántos proveedores se encontraron
    print(f"[PROVEEDORES] Total encontrados: {len(proveedores)}")
    
    # Convertir ObjectId a string y normalizar campos
    for proveedor in proveedores:
        proveedor["_id"] = str(proveedor["_id"])
        proveedor.setdefault("dias_credito", 0)
        proveedor.setdefault("descuento_comercial", 0.0)
        proveedor.setdefault("descuento_pronto_pago", 0.0)
    
    return proveedores
```

**Para Compras (`GET /compras`):**

```python
@router.get("/compras")
async def obtener_compras(
    sucursal_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    # Verificar permiso
    if "compras" not in current_user.get("permisos", []):
        raise HTTPException(status_code=403, detail="No tiene permiso para ver compras")
    
    # Construir query
    query = {
        "activo": {"$ne": False}  # ⚠️ IMPORTANTE: No filtrar por fecha, solo por activo
    }
    
    if sucursal_id:
        query["sucursal_id"] = sucursal_id
    
    # ⚠️ IMPORTANTE: Buscar TODAS las compras (sin filtro de fecha)
    compras = await db.compras.find(query).sort("fecha_creacion", -1).to_list(length=10000)
    
    # ⚠️ LOGGING: Registrar cuántas compras se encontraron
    print(f"[COMPRAS] Total encontradas: {len(compras)}, Filtro sucursal: {sucursal_id}")
    
    # Populate proveedor y sucursal
    for compra in compras:
        compra["_id"] = str(compra["_id"])
        
        # Obtener proveedor
        if compra.get("proveedor_id"):
            proveedor = await db.proveedores.find_one({"_id": ObjectId(compra["proveedor_id"])})
            if proveedor:
                proveedor["_id"] = str(proveedor["_id"])
                compra["proveedor"] = proveedor
        
        # Obtener sucursal (si es necesario)
        if compra.get("sucursal_id"):
            # Obtener nombre de sucursal desde /farmacias o colección sucursales
            compra["sucursal"] = {"id": compra["sucursal_id"], "nombre": "..."}
    
    return compras
```

### 3. Verificar que NO haya código que elimine datos

**⚠️ CRÍTICO: Verificar que NO exista código que:**
- Elimine proveedores o compras después de cierto tiempo
- Elimine datos basados en fecha
- Tenga un "cleanup" o "cron job" que elimine datos antiguos
- Tenga TTL (Time To Live) configurado en las colecciones de MongoDB

**Verificar en MongoDB:**
```javascript
// Verificar índices TTL en las colecciones
db.proveedores.getIndexes()
db.compras.getIndexes()

// Si hay índices TTL, eliminarlos:
// db.proveedores.dropIndex("fecha_creacion_1")
// db.compras.dropIndex("fecha_creacion_1")
```

### 4. Verificar la conexión a MongoDB

**Asegurar que:**
- La conexión a MongoDB sea persistente
- No se esté usando una base de datos en memoria
- La URL de conexión apunte a la base de datos correcta
- No haya múltiples instancias de la aplicación usando diferentes bases de datos

### 5. Agregar Logging Detallado

**Agregar logging en todos los endpoints:**

```python
import logging

logger = logging.getLogger(__name__)

@router.post("/proveedores")
async def crear_proveedor(...):
    logger.info(f"Creando proveedor: {proveedor.nombre}, RIF: {proveedor.rif}")
    
    result = await db.proveedores.insert_one(proveedor_doc)
    
    logger.info(f"Proveedor creado con ID: {result.inserted_id}")
    
    # Verificar que realmente se guardó
    verificar = await db.proveedores.find_one({"_id": result.inserted_id})
    if verificar:
        logger.info(f"✅ Proveedor verificado en BD: {verificar}")
    else:
        logger.error(f"❌ ERROR: Proveedor NO encontrado después de insertar!")
    
    return proveedor_doc
```

## 📋 CHECKLIST DE VERIFICACIÓN

- [ ] Los endpoints `POST /proveedores` y `POST /compras` están insertando datos con `insert_one()`
- [ ] Los endpoints `GET /proveedores` y `GET /compras` NO tienen filtros de fecha que excluyan datos antiguos
- [ ] No hay índices TTL en las colecciones `proveedores` y `compras`
- [ ] No hay código de "cleanup" o "cron jobs" que elimine datos
- [ ] La conexión a MongoDB es persistente y apunta a la base de datos correcta
- [ ] Se está usando `datetime.now()` para `fecha_creacion` (no una fecha fija)
- [ ] Los datos se están guardando con el campo `activo: True` (o sin filtro de activo)
- [ ] Se agregó logging para verificar que los datos se guarden y recuperen correctamente

## 🔧 SOLUCIÓN INMEDIATA

Si los datos ya se perdieron, verificar en MongoDB directamente:

```javascript
// Conectar a MongoDB
use tu_base_de_datos

// Verificar proveedores
db.proveedores.find().count()
db.proveedores.find().pretty()

// Verificar compras
db.compras.find().count()
db.compras.find().pretty()

// Si los datos están ahí pero no se muestran, verificar:
// 1. Filtros en el código
// 2. Permisos del usuario
// 3. Formato de respuesta del backend
```

## 📝 NOTAS IMPORTANTES

1. **Los datos NO deben eliminarse automáticamente** - Los proveedores y compras son datos históricos que deben persistir indefinidamente.

2. **No usar TTL (Time To Live)** - MongoDB tiene una característica TTL que elimina documentos automáticamente. Asegurar que NO esté activada.

3. **Verificar logs del backend** - Revisar los logs para ver si hay errores al guardar o recuperar datos.

4. **Probar directamente en MongoDB** - Conectar directamente a MongoDB y verificar que los datos estén ahí.

