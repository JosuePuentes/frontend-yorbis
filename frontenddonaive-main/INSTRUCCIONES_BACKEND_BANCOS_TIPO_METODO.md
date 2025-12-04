# INSTRUCCIONES BACKEND: Campo tipo_metodo en Bancos

## ⚠️ IMPORTANTE
El frontend ahora envía un campo `tipo_metodo` al crear/actualizar bancos. Este campo identifica el tipo de método de pago que representa cada banco.

---

## 📋 CAMPO NUEVO: `tipo_metodo`

### Valores permitidos:
- `"pago_movil"` - Pago Móvil
- `"efectivo"` - Efectivo
- `"zelle"` - Zelle
- `"tarjeta_debit"` - Tarjeta Débit
- `"tarjeta_credito"` - Tarjeta de Crédito
- `"vales"` - Vales

### Estructura de Request (POST /bancos y PUT /bancos/{banco_id}):

```json
{
  "numero_cuenta": "0102-1234-56789012",
  "nombre_banco": "Banco de Venezuela",
  "nombre_titular": "Juan Pérez",
  "saldo": 0,
  "divisa": "USD",
  "tipo_metodo": "pago_movil"  // ✅ NUEVO CAMPO
}
```

---

## 📝 ACTUALIZACIÓN DE MODELO DE BASE DE DATOS

### Colección: bancos

```javascript
{
  _id: ObjectId,
  numero_cuenta: String,
  nombre_banco: String,
  nombre_titular: String,
  saldo: Number,
  divisa: String,  // "USD" | "BS"
  tipo_metodo: String,  // ✅ NUEVO: "pago_movil" | "efectivo" | "zelle" | "tarjeta_debit" | "tarjeta_credito" | "vales"
  activo: Boolean,
  created_at: Date,
  updated_at: Date
}
```

---

## ✅ IMPLEMENTACIÓN EN BACKEND

### 1. Actualizar modelo Pydantic (si usas Pydantic):

```python
from pydantic import BaseModel, Field
from typing import Optional
from enum import Enum

class TipoMetodo(str, Enum):
    PAGO_MOVIL = "pago_movil"
    EFECTIVO = "efectivo"
    ZELLE = "zelle"
    TARJETA_DEBIT = "tarjeta_debit"
    TARJETA_CREDITO = "tarjeta_credito"
    VALES = "vales"

class BancoCreate(BaseModel):
    numero_cuenta: str
    nombre_banco: str
    nombre_titular: str
    saldo: float = 0
    divisa: str = Field(..., pattern="^(USD|BS)$")
    tipo_metodo: Optional[TipoMetodo] = TipoMetodo.PAGO_MOVIL  # ✅ NUEVO
    activo: bool = True

class BancoUpdate(BaseModel):
    numero_cuenta: Optional[str] = None
    nombre_banco: Optional[str] = None
    nombre_titular: Optional[str] = None
    saldo: Optional[float] = None
    divisa: Optional[str] = Field(None, pattern="^(USD|BS)$")
    tipo_metodo: Optional[TipoMetodo] = None  # ✅ NUEVO
    activo: Optional[bool] = None
```

### 2. Actualizar endpoint POST /bancos:

```python
@router.post("/bancos")
async def crear_banco(
    banco_data: BancoCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    banco = {
        "numero_cuenta": banco_data.numero_cuenta,
        "nombre_banco": banco_data.nombre_banco,
        "nombre_titular": banco_data.nombre_titular,
        "saldo": banco_data.saldo,
        "divisa": banco_data.divisa,
        "tipo_metodo": banco_data.tipo_metodo or "pago_movil",  # ✅ NUEVO
        "activo": banco_data.activo,
        "created_at": datetime.now(),
        "updated_at": datetime.now()
    }
    
    resultado = await db.bancos.insert_one(banco)
    banco["_id"] = resultado.inserted_id
    banco["_id"] = str(banco["_id"])
    return banco
```

### 3. Actualizar endpoint PUT /bancos/{banco_id}:

```python
@router.put("/bancos/{banco_id}")
async def actualizar_banco(
    banco_id: str,
    banco_data: BancoUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    update_data = {}
    
    if banco_data.numero_cuenta:
        update_data["numero_cuenta"] = banco_data.numero_cuenta
    if banco_data.nombre_banco:
        update_data["nombre_banco"] = banco_data.nombre_banco
    if banco_data.nombre_titular:
        update_data["nombre_titular"] = banco_data.nombre_titular
    if banco_data.saldo is not None:
        update_data["saldo"] = banco_data.saldo
    if banco_data.divisa:
        update_data["divisa"] = banco_data.divisa
    if banco_data.tipo_metodo:  # ✅ NUEVO
        update_data["tipo_metodo"] = banco_data.tipo_metodo
    if banco_data.activo is not None:
        update_data["activo"] = banco_data.activo
    
    update_data["updated_at"] = datetime.now()
    
    await db.bancos.update_one(
        {"_id": ObjectId(banco_id)},
        {"$set": update_data}
    )
    
    banco_actualizado = await db.bancos.find_one({"_id": ObjectId(banco_id)})
    banco_actualizado["_id"] = str(banco_actualizado["_id"])
    return banco_actualizado
```

### 4. Actualizar GET /bancos para incluir tipo_metodo:

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
                "numero_cuenta": b.get("numero_cuenta", ""),
                "nombre_banco": b.get("nombre_banco", ""),
                "nombre_titular": b.get("nombre_titular", ""),
                "saldo": float(b.get("saldo", 0)),
                "divisa": b.get("divisa", "USD"),
                "tipo_metodo": b.get("tipo_metodo", "pago_movil"),  // ✅ NUEVO
                "activo": b.get("activo", True)
            }
            for b in bancos
        ]
    }
```

---

## ⚠️ VALIDACIONES

1. **Valor por defecto:** Si no se envía `tipo_metodo`, usar `"pago_movil"` como valor por defecto
2. **Valores válidos:** Validar que `tipo_metodo` sea uno de los valores permitidos
3. **Campo opcional:** El campo es opcional en el request, pero debe guardarse en la base de datos

---

## ✅ CHECKLIST

- [ ] Agregar campo `tipo_metodo` al modelo de base de datos
- [ ] Actualizar endpoint `POST /bancos` para aceptar y guardar `tipo_metodo`
- [ ] Actualizar endpoint `PUT /bancos/{banco_id}` para aceptar y actualizar `tipo_metodo`
- [ ] Actualizar endpoint `GET /bancos` para retornar `tipo_metodo`
- [ ] Validar valores permitidos de `tipo_metodo`
- [ ] Usar `"pago_movil"` como valor por defecto si no se proporciona
- [ ] Migrar bancos existentes para agregar `tipo_metodo: "pago_movil"` si no lo tienen

---

## 📄 NOTA

El frontend ya está enviando este campo. Si el backend no lo acepta, las solicitudes fallarán. Es importante implementar este campo lo antes posible.





