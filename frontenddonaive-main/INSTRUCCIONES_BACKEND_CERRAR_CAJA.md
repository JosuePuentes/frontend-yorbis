# INSTRUCCIONES BACKEND: Cerrar Caja desde Punto de Venta

## Resumen
Cuando se guarda un cuadre desde el punto de venta (cerrar caja), el backend **NO debe sumar el total del sistema al pendiente** porque cada venta ya se fue sumando automáticamente al cuadre con estado "wait" cuando se confirmó.

---

## Contexto

### Flujo Actual

1. **Venta confirmada** → Backend actualiza/crea cuadre con estado `"wait"` → Suma métodos de pago al pendiente
2. **Cerrar caja desde punto de venta** → Se guarda el cuadre con los datos del sistema
3. **CRÍTICO:** El cuadre ya tiene todas las ventas sumadas, NO se debe volver a sumar

### Problema a Evitar

Si el backend suma el `totalCajaSistemaBs` o `totalCajaSistemaUsd` al pendiente cuando se guarda el cuadre desde el punto de venta, se estarían **duplicando las ventas** porque:
- Cada venta ya sumó sus métodos de pago al cuadre con estado "wait"
- El `totalCajaSistema` es la suma de todas esas ventas
- Si se vuelve a sumar, se duplica el monto

---

## Endpoint: `POST /agg/cuadre/{farmacia_id}`

### Modificación Requerida

El backend debe detectar si el cuadre viene desde el punto de venta y **NO actualizar el pendiente** cuando se guarda.

### Opción 1: Flag en el Request (Recomendado)

Agregar un campo opcional `desde_punto_venta: boolean` en el request del cuadre:

```python
class CuadreData(BaseModel):
    dia: str
    cajaNumero: int
    tasa: float
    turno: str
    cajero: str
    cajeroId: str
    totalCajaSistemaBs: float
    # ... otros campos ...
    desde_punto_venta: bool = False  # NUEVO: indica si viene desde punto de venta
```

### Opción 2: Detectar por Campos Prellenados

Si el cuadre tiene `totalCajaSistemaUsd` o campos específicos prellenados, asumir que viene desde punto de venta.

---

## Implementación en Python/FastAPI

```python
@router.post("/agg/cuadre/{farmacia_id}")
async def crear_cuadre(
    farmacia_id: str,
    cuadre_data: CuadreData,
    current_user: User = Depends(get_current_user),
    db: AsyncIOMotorClient = Depends(get_database)
):
    try:
        # Verificar si el cuadre viene desde punto de venta
        desde_punto_venta = cuadre_data.desde_punto_venta or False
        
        # Buscar cuadre existente del día
        fecha_actual = cuadre_data.dia
        farmacia_object_id = ObjectId(farmacia_id)
        
        cuadre_existente = await db.cuadres.find_one({
            "farmacia": farmacia_object_id,
            "dia": fecha_actual
        })
        
        if cuadre_existente:
            # Si el cuadre existe, actualizar con los datos del sistema
            # PERO NO sumar al pendiente porque las ventas ya están sumadas
            
            await db.cuadres.update_one(
                {
                    "_id": cuadre_existente["_id"]
                },
                {
                    "$set": {
                        "cajaNumero": cuadre_data.cajaNumero,
                        "tasa": cuadre_data.tasa,
                        "turno": cuadre_data.turno,
                        "cajero": cuadre_data.cajero,
                        "cajeroId": cuadre_data.cajeroId,
                        "totalCajaSistemaBs": cuadre_data.totalCajaSistemaBs,
                        "devolucionesBs": cuadre_data.devolucionesBs,
                        "recargaBs": cuadre_data.recargaBs,
                        "pagomovilBs": cuadre_data.pagomovilBs,
                        "efectivoBs": cuadre_data.efectivoBs,
                        "efectivoUsd": cuadre_data.efectivoUsd,
                        "zelleUsd": cuadre_data.zelleUsd,
                        "valesUsd": cuadre_data.valesUsd,
                        "puntosVenta": cuadre_data.puntosVenta,
                        "costoInventario": cuadre_data.costoInventario,
                        "imagenesCuadre": cuadre_data.imagenesCuadre,
                        "totalBs": cuadre_data.totalBs,
                        "totalBsEnUsd": cuadre_data.totalBsEnUsd,
                        "totalCajaSistemaMenosVales": cuadre_data.totalCajaSistemaMenosVales,
                        "totalGeneralUsd": cuadre_data.totalGeneralUsd,
                        "diferenciaUsd": cuadre_data.diferenciaUsd,
                        "sobranteUsd": cuadre_data.sobranteUsd,
                        "faltanteUsd": cuadre_data.faltanteUsd,
                        "estado": "wait",  # Mantener en wait hasta verificación
                        # NO usar $inc aquí porque las ventas ya están sumadas
                    }
                }
            )
        else:
            # Si no existe, crear nuevo cuadre
            # PERO si viene desde punto de venta, las ventas ya deberían estar en otro cuadre
            # O crear el cuadre con los datos del sistema sin sumar al pendiente
            
            nuevo_cuadre = {
                "farmacia": farmacia_object_id,
                "dia": fecha_actual,
                "cajaNumero": cuadre_data.cajaNumero,
                "tasa": cuadre_data.tasa,
                "turno": cuadre_data.turno,
                "cajero": cuadre_data.cajero,
                "cajeroId": cuadre_data.cajeroId,
                "totalCajaSistemaBs": cuadre_data.totalCajaSistemaBs,
                "devolucionesBs": cuadre_data.devolucionesBs,
                "recargaBs": cuadre_data.recargaBs,
                "pagomovilBs": cuadre_data.pagomovilBs,
                "efectivoBs": cuadre_data.efectivoBs,
                "efectivoUsd": cuadre_data.efectivoUsd,
                "zelleUsd": cuadre_data.zelleUsd,
                "valesUsd": cuadre_data.valesUsd,
                "puntosVenta": cuadre_data.puntosVenta,
                "costoInventario": cuadre_data.costoInventario,
                "imagenesCuadre": cuadre_data.imagenesCuadre,
                "totalBs": cuadre_data.totalBs,
                "totalBsEnUsd": cuadre_data.totalBsEnUsd,
                "totalCajaSistemaMenosVales": cuadre_data.totalCajaSistemaMenosVales,
                "totalGeneralUsd": cuadre_data.totalGeneralUsd,
                "diferenciaUsd": cuadre_data.diferenciaUsd,
                "sobranteUsd": cuadre_data.sobranteUsd,
                "faltanteUsd": cuadre_data.faltanteUsd,
                "estado": "wait",
                "delete": False
            }
            
            await db.cuadres.insert_one(nuevo_cuadre)
        
        return {
            "mensaje": "Cuadre guardado exitosamente",
            "desde_punto_venta": desde_punto_venta
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al guardar el cuadre: {str(e)}"
        )
```

---

## Lógica Crítica

### Cuando viene desde Punto de Venta:

1. **NO usar `$inc`** (incrementar) en los campos de métodos de pago
2. **Usar `$set`** (reemplazar) para actualizar con los valores del sistema
3. **Las ventas ya están sumadas** en el cuadre desde que se confirmaron
4. **El `totalCajaSistema`** es solo para comparación, NO para sumar al pendiente

### Cuando viene desde Agregar Cuadre Manual:

1. **Usar `$inc`** si el cuadre existe (sumar métodos de pago)
2. **Crear nuevo cuadre** si no existe
3. **Sumar al pendiente** normalmente

---

## Diferenciación entre Orígenes

### Desde Punto de Venta:
- Tiene `totalCajaSistemaUsd` prellenado
- Tiene `costoInventario` prellenado
- Tiene `cajero` prellenado
- Tiene `tasa` prellenada
- **Flag:** `desde_punto_venta: true`

### Desde Agregar Cuadre Manual:
- Campos vacíos o ingresados manualmente
- **Flag:** `desde_punto_venta: false` (o no presente)

---

## Ejemplo de Request desde Punto de Venta

```json
{
  "dia": "2025-01-15",
  "cajaNumero": 1,
  "tasa": 120.00,
  "turno": "Mañana",
  "cajero": "Juan Pérez",
  "cajeroId": "123",
  "totalCajaSistemaBs": 12000.00,
  "totalCajaSistemaUsd": 100.00,
  "efectivoUsd": 50.00,
  "zelleUsd": 30.00,
  "efectivoBs": 1200.00,
  "pagomovilBs": 600.00,
  "puntosVenta": [{
    "banco": "Banco de Venezuela",
    "puntoDebito": 300.00,
    "puntoCredito": 0.00
  }],
  "costoInventario": 5000.00,
  "desde_punto_venta": true  // ← CRÍTICO: indica que NO se debe sumar al pendiente
}
```

---

## Checklist de Implementación

- [ ] Agregar campo `desde_punto_venta: bool` al modelo de datos del cuadre
- [ ] Modificar endpoint `POST /agg/cuadre/{farmacia_id}` para detectar origen
- [ ] Si `desde_punto_venta: true`, usar `$set` en lugar de `$inc`
- [ ] Si `desde_punto_venta: false`, mantener lógica actual (usar `$inc`)
- [ ] Verificar que las ventas ya están sumadas en el cuadre antes de guardar
- [ ] NO sumar `totalCajaSistema` al pendiente cuando viene desde punto de venta
- [ ] Pruebas: Verificar que no se duplican las ventas en el pendiente
- [ ] Pruebas: Verificar que el cuadre manual sigue funcionando correctamente

---

## Notas Importantes

1. **Las ventas se suman automáticamente** cuando se confirman desde el punto de venta (según `INSTRUCCIONES_BACKEND_VENTAS_PENDIENTE.md`)
2. **El cuadre ya tiene las ventas sumadas** cuando se cierra la caja
3. **El `totalCajaSistema`** es solo para comparación y cálculo de diferencias
4. **NO se debe volver a sumar** porque se duplicarían las ventas en el pendiente

---

## Resumen Visual del Flujo

```
Venta 1 ($10 USD) → Backend suma al cuadre "wait" → Pendiente: $10 USD
Venta 2 ($15 USD) → Backend suma al cuadre "wait" → Pendiente: $25 USD
Venta 3 ($20 USD) → Backend suma al cuadre "wait" → Pendiente: $45 USD

Cerrar Caja:
- Total Caja Sistema: $45 USD
- Cuadre tiene: efectivoUsd + zelleUsd = $45 USD (ya sumado)
- Backend guarda cuadre con $set (NO $inc)
- Pendiente sigue siendo: $45 USD ✅ (NO se duplica)
```

Si se usara `$inc` aquí, el pendiente sería $90 USD (duplicado) ❌





