# RESUMEN URGENTE: Endpoint /bancos - 404 Not Found

## ⚠️ PROBLEMA ACTUAL
El frontend está llamando al endpoint `GET /bancos` pero este endpoint **NO EXISTE** en el backend, por eso retorna **404 Not Found**.

**Request del frontend:**
```
GET https://rapifarma-backend.onrender.com/bancos
Authorization: Bearer <token>
```

**Respuesta actual:**
```
404 Not Found
```

---

## ✅ SOLUCIÓN RÁPIDA

### Endpoint que debes crear INMEDIATAMENTE:
```
GET /bancos
```

### Respuesta requerida:
```json
{
  "bancos": [
    {
      "_id": "banco_id_1",
      "numero_cuenta": "0102-1234-56789012",
      "nombre_banco": "Banco de Venezuela",
      "nombre_titular": "Juan Pérez",
      "saldo": 1000.50,
      "divisa": "USD",
      "activo": true
    }
  ]
}
```

---

## 📋 ENDPOINTS MÍNIMOS REQUERIDOS (Prioridad Alta)

### 1. GET /bancos ⚠️ URGENTE
**Descripción:** Obtener todos los bancos activos.

**Respuesta:**
```json
{
  "bancos": [
    {
      "_id": "banco_id",
      "numero_cuenta": "string",
      "nombre_banco": "string",
      "nombre_titular": "string",
      "saldo": 0.00,
      "divisa": "USD" | "Bs",
      "activo": true
    }
  ]
}
```

**Código Python/FastAPI mínimo:**
```python
@router.get("/bancos")
async def obtener_bancos(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    bancos = await db.bancos.find({"activo": True}).to_list(length=None)
    return {
        "bancos": [
            {
                "_id": str(b["_id"]),
                "numero_cuenta": b["numero_cuenta"],
                "nombre_banco": b["nombre_banco"],
                "nombre_titular": b["nombre_titular"],
                "saldo": b["saldo"],
                "divisa": b["divisa"]
            }
            for b in bancos
        ]
    }
```

---

## 📝 ESTRUCTURA DE BASE DE DATOS

### Colección: `bancos`

```javascript
{
  _id: ObjectId,
  numero_cuenta: String,  // Único, ejemplo: "0102-1234-56789012"
  nombre_banco: String,   // Ejemplo: "Banco de Venezuela"
  nombre_titular: String, // Ejemplo: "Juan Pérez"
  saldo: Number,          // Decimal, ejemplo: 1000.50
  divisa: String,         // "USD" o "Bs"
  activo: Boolean,        // Default: true
  created_at: Date,
  updated_at: Date
}
```

**Índices recomendados:**
- `numero_cuenta`: único
- `activo`: para filtrar bancos activos

---

## 🔧 IMPLEMENTACIÓN RÁPIDA

### Paso 1: Crear modelo en MongoDB
```python
# models/banco.py
from datetime import datetime
from bson import ObjectId

class Banco:
    def __init__(self, numero_cuenta, nombre_banco, nombre_titular, saldo=0, divisa="USD"):
        self.numero_cuenta = numero_cuenta
        self.nombre_banco = nombre_banco
        self.nombre_titular = nombre_titular
        self.saldo = saldo
        self.divisa = divisa
        self.activo = True
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
```

### Paso 2: Crear endpoint GET /bancos
```python
# routers/bancos.py
from fastapi import APIRouter, Depends, HTTPException
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter(prefix="/bancos", tags=["bancos"])

@router.get("")
async def obtener_bancos(
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        bancos = await db.bancos.find({"activo": True}).to_list(length=None)
        return {
            "bancos": [
                {
                    "_id": str(b["_id"]),
                    "numero_cuenta": b.get("numero_cuenta", ""),
                    "nombre_banco": b.get("nombre_banco", ""),
                    "nombre_titular": b.get("nombre_titular", ""),
                    "saldo": float(b.get("saldo", 0)),
                    "divisa": b.get("divisa", "USD"),
                    "activo": b.get("activo", True)
                }
                for b in bancos
            ]
        }
    except Exception as e:
        logger.error(f"Error al obtener bancos: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
```

### Paso 3: Registrar el router en main.py
```python
from routers import bancos

app.include_router(bancos.router)
```

---

## ⚠️ IMPORTANTE

1. **Autenticación:** El endpoint debe requerir autenticación (usar `get_current_user` o similar)
2. **Solo bancos activos:** Filtrar por `{"activo": True}`
3. **Formato de respuesta:** El frontend espera `{"bancos": [...]}`, no solo un array
4. **Tipos de datos:** 
   - `saldo` debe ser un número (float)
   - `divisa` debe ser "USD" o "Bs"
   - `_id` debe ser convertido a string

---

## 📄 DOCUMENTACIÓN COMPLETA

Para más detalles sobre todos los endpoints de bancos (POST, PUT, DELETE, movimientos, etc.), revisa el archivo:
**`INSTRUCCIONES_BACKEND_BANCOS.md`**

---

## ✅ CHECKLIST MÍNIMO

- [ ] Crear colección `bancos` en MongoDB
- [ ] Crear endpoint `GET /bancos`
- [ ] Filtrar solo bancos activos (`activo: true`)
- [ ] Retornar estructura `{"bancos": [...]}`
- [ ] Convertir `_id` a string
- [ ] Probar que el endpoint retorna 200 OK (no 404)

---

## 🚨 NOTA PARA LA IA DEL BACKEND

El frontend **YA ESTÁ IMPLEMENTADO** y está intentando llamar a `/bancos`. Si el endpoint no existe, la aplicación falla. Este es el endpoint **MÁS URGENTE** para implementar.

El frontend necesita este endpoint para:
1. Mostrar la lista de bancos en el módulo "Gestión de Bancos"
2. Mostrar bancos como métodos de pago en el punto de venta
3. Seleccionar bancos para pagos y vuelto

**Sin este endpoint, el módulo de bancos NO FUNCIONA.**





