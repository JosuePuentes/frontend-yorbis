# INSTRUCCIONES BACKEND: Endpoint para Resumen de Ventas por Sucursal

## ⚠️ IMPORTANTE
El frontend necesita un endpoint que retorne todas las ventas (facturas) del punto de venta agrupadas por sucursal y filtradas por rango de fechas, para calcular los totales en tiempo real en `/resumenfarmacias`.

---

## 📋 ENDPOINT REQUERIDO: `GET /punto-venta/ventas/resumen`

### Query Parameters

- `sucursal` (string, opcional): ID de la sucursal/farmacia
- `fecha_inicio` (string, formato: YYYY-MM-DD): Fecha de inicio para filtrar
- `fecha_fin` (string, formato: YYYY-MM-DD): Fecha de fin para filtrar

### Ejemplo de Request

```
GET /punto-venta/ventas/resumen?sucursal=690c40be93d9d9d635fbaf5b&fecha_inicio=2025-01-01&fecha_fin=2025-01-31
```

---

## 📋 ESTRUCTURA DE RESPUESTA REQUERIDA

```json
{
  "ventas_por_sucursal": {
    "690c40be93d9d9d635fbaf5b": {
      "total_efectivo_usd": 1500.00,
      "total_zelle_usd": 800.00,
      "total_usd_recibido": 2300.00,
      "total_vales_usd": 50.00,
      "total_bs": 120000.00,
      "desglose_bs": {
        "pago_movil": 30000.00,
        "efectivo": 40000.00,
        "tarjeta_debit": 25000.00,
        "tarjeta_credito": 20000.00,
        "recargas": 5000.00,
        "devoluciones": 0.00
      },
      "total_costo_inventario": 1200.00,
      "total_ventas": 100
    }
  }
}
```

---

## ✅ IMPLEMENTACIÓN EN BACKEND

### Ejemplo Python/FastAPI:

```python
from fastapi import APIRouter, Depends, Query
from bson import ObjectId
from datetime import datetime
from typing import Optional
from motor.motor_asyncio import AsyncIOMotorClient

router = APIRouter()

@router.get("/punto-venta/ventas/resumen")
async def obtener_resumen_ventas(
    sucursal: Optional[str] = Query(None),
    fecha_inicio: Optional[str] = Query(None),
    fecha_fin: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    """
    Obtiene un resumen de ventas agrupadas por sucursal con totales calculados.
    """
    try:
        # Construir filtro
        filtro = {}
        
        if sucursal:
            try:
                filtro["sucursal"] = ObjectId(sucursal)
            except:
                return {"error": "ID de sucursal inválido"}
        
        # Filtrar por rango de fechas
        if fecha_inicio or fecha_fin:
            filtro_fecha = {}
            if fecha_inicio:
                fecha_inicio_dt = datetime.strptime(fecha_inicio, "%Y-%m-%d")
                filtro_fecha["$gte"] = fecha_inicio_dt
            if fecha_fin:
                fecha_fin_dt = datetime.strptime(fecha_fin, "%Y-%m-%d")
                # Incluir todo el día
                fecha_fin_dt = datetime(fecha_fin_dt.year, fecha_fin_dt.month, fecha_fin_dt.day, 23, 59, 59)
                filtro_fecha["$lte"] = fecha_fin_dt
            if filtro_fecha:
                filtro["fecha"] = filtro_fecha
        
        # Obtener todas las ventas que coinciden
        ventas = await db.ventas.find(filtro).to_list(length=None)
        
        # Agrupar por sucursal y calcular totales
        resumen_por_sucursal = {}
        
        for venta in ventas:
            sucursal_id = str(venta.get("sucursal", ""))
            if not sucursal_id:
                continue
            
            # Inicializar estructura si no existe
            if sucursal_id not in resumen_por_sucursal:
                resumen_por_sucursal[sucursal_id] = {
                    "total_efectivo_usd": 0.0,
                    "total_zelle_usd": 0.0,
                    "total_usd_recibido": 0.0,
                    "total_vales_usd": 0.0,
                    "total_bs": 0.0,
                    "desglose_bs": {
                        "pago_movil": 0.0,
                        "efectivo": 0.0,
                        "tarjeta_debit": 0.0,
                        "tarjeta_credito": 0.0,
                        "recargas": 0.0,
                        "devoluciones": 0.0
                    },
                    "total_costo_inventario": 0.0,
                    "total_ventas": 0
                }
            
            resumen = resumen_por_sucursal[sucursal_id]
            
            # Procesar métodos de pago
            metodos_pago = venta.get("metodos_pago", [])
            for metodo in metodos_pago:
                tipo = metodo.get("tipo", "").lower()
                monto = float(metodo.get("monto", 0))
                divisa = metodo.get("divisa", "").upper()
                
                # Si es vuelto (negativo), ignorarlo o restarlo según corresponda
                if monto < 0:
                    continue  # Los vuelto ya fueron descontados del método de pago original
                
                if divisa == "USD":
                    if tipo == "efectivo" or (tipo == "banco" and metodo.get("banco_id")):
                        # Verificar si el banco es de tipo efectivo
                        banco_id = metodo.get("banco_id")
                        if banco_id:
                            banco = await db.bancos.find_one({"_id": ObjectId(banco_id)})
                            if banco and banco.get("tipo_metodo") == "efectivo":
                                resumen["total_efectivo_usd"] += monto
                            elif banco and banco.get("tipo_metodo") == "zelle":
                                resumen["total_zelle_usd"] += monto
                            elif banco and banco.get("tipo_metodo") == "vales":
                                resumen["total_vales_usd"] += monto
                        else:
                            # Si no hay banco_id, asumir efectivo por defecto
                            resumen["total_efectivo_usd"] += monto
                    elif tipo == "zelle":
                        resumen["total_zelle_usd"] += monto
                elif divisa == "BS" or divisa == "BS":
                    resumen["total_bs"] += monto
                    
                    # Desglose por tipo en Bs
                    if tipo == "pago_movil" or (tipo == "banco" and metodo.get("banco_id")):
                        banco_id = metodo.get("banco_id")
                        if banco_id:
                            banco = await db.bancos.find_one({"_id": ObjectId(banco_id)})
                            if banco:
                                tipo_metodo = banco.get("tipo_metodo", "pago_movil")
                                if tipo_metodo == "pago_movil":
                                    resumen["desglose_bs"]["pago_movil"] += monto
                                elif tipo_metodo == "efectivo":
                                    resumen["desglose_bs"]["efectivo"] += monto
                                elif tipo_metodo == "tarjeta_debit":
                                    resumen["desglose_bs"]["tarjeta_debit"] += monto
                                elif tipo_metodo == "tarjeta_credito":
                                    resumen["desglose_bs"]["tarjeta_credito"] += monto
                        else:
                            resumen["desglose_bs"]["pago_movil"] += monto
                    elif tipo == "efectivo":
                        resumen["desglose_bs"]["efectivo"] += monto
                    elif tipo == "tarjeta" or tipo == "tarjeta_debit":
                        resumen["desglose_bs"]["tarjeta_debit"] += monto
                    elif tipo == "tarjeta_credito":
                        resumen["desglose_bs"]["tarjeta_credito"] += monto
            
            # Calcular total USD recibido (efectivo + zelle)
            resumen["total_usd_recibido"] = resumen["total_efectivo_usd"] + resumen["total_zelle_usd"]
            
            # Calcular costo de inventario (suma de cantidad * costo_unitario de todos los items)
            items = venta.get("items", [])
            for item in items:
                cantidad = float(item.get("cantidad", 0))
                costo_unitario = float(item.get("costo_unitario", 0))
                resumen["total_costo_inventario"] += cantidad * costo_unitario
            
            # Contar ventas
            resumen["total_ventas"] += 1
        
        # Redondear todos los valores a 2 decimales
        for sucursal_id in resumen_por_sucursal:
            resumen = resumen_por_sucursal[sucursal_id]
            resumen["total_efectivo_usd"] = round(resumen["total_efectivo_usd"], 2)
            resumen["total_zelle_usd"] = round(resumen["total_zelle_usd"], 2)
            resumen["total_usd_recibido"] = round(resumen["total_usd_recibido"], 2)
            resumen["total_vales_usd"] = round(resumen["total_vales_usd"], 2)
            resumen["total_bs"] = round(resumen["total_bs"], 2)
            resumen["total_costo_inventario"] = round(resumen["total_costo_inventario"], 2)
            for key in resumen["desglose_bs"]:
                resumen["desglose_bs"][key] = round(resumen["desglose_bs"][key], 2)
        
        return {
            "ventas_por_sucursal": resumen_por_sucursal
        }
        
    except Exception as e:
        print(f"Error al obtener resumen de ventas: {e}")
        return {"error": str(e)}
```

---

## 📝 NOTAS IMPORTANTES

1. **Métodos de Pago en USD:**
   - Si `tipo == "banco"` y tiene `banco_id`, verificar el `tipo_metodo` del banco para determinar si es efectivo, zelle o vales
   - Si no hay `banco_id`, asumir efectivo por defecto

2. **Métodos de Pago en Bs:**
   - Si `tipo == "banco"` y tiene `banco_id`, verificar el `tipo_metodo` del banco (pago_movil, efectivo, tarjeta_debit, tarjeta_credito)
   - Si no hay `banco_id`, asumir pago_movil por defecto

3. **Recargas:**
   - Las recargas deben identificarse por un campo especial en la venta o por un tipo de servicio específico
   - Por ahora, se puede usar un banco con `tipo_metodo == "recargas"` o un campo `tipo_servicio == "recargas"` en la venta

4. **Devoluciones:**
   - Las devoluciones deben tener un campo `tipo == "devolucion"` o `monto < 0` en los métodos de pago
   - O pueden estar en un campo separado `devoluciones_bs` en la venta

5. **Costo de Inventario:**
   - Se calcula sumando `cantidad * costo_unitario` de todos los items en todas las ventas
   - El campo `costo_unitario` debe estar en cada item de la venta

---

## ✅ CHECKLIST

- [ ] Crear endpoint `GET /punto-venta/ventas/resumen`
- [ ] Filtrar por `sucursal` (opcional)
- [ ] Filtrar por `fecha_inicio` y `fecha_fin` (opcional)
- [ ] Agrupar ventas por sucursal
- [ ] Calcular `total_efectivo_usd` (suma de efectivo USD)
- [ ] Calcular `total_zelle_usd` (suma de zelle USD)
- [ ] Calcular `total_usd_recibido` (efectivo USD + zelle USD)
- [ ] Calcular `total_vales_usd` (suma de vales USD)
- [ ] Calcular `total_bs` (suma de todos los métodos de pago en Bs)
- [ ] Calcular `desglose_bs` (pago_movil, efectivo, tarjeta_debit, tarjeta_credito, recargas, devoluciones)
- [ ] Calcular `total_costo_inventario` (suma de cantidad * costo_unitario de todos los items)
- [ ] Contar `total_ventas`
- [ ] Verificar `tipo_metodo` de bancos para clasificar correctamente los métodos de pago
- [ ] Manejar recargas como un tipo especial de servicio
- [ ] Manejar devoluciones correctamente

---

## 🔄 ACTUALIZACIÓN EN TIEMPO REAL

El frontend llamará a este endpoint cada vez que:
- Se cambie el rango de fechas
- Se cargue la página `/resumenfarmacias`
- Se actualice cualquier dato relacionado

Por lo tanto, el endpoint debe ser eficiente y retornar datos actualizados en tiempo real desde la base de datos.





