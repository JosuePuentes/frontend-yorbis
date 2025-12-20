# ⚠️ INSTRUCCIONES PARA EL BACKEND - ASIGNAR PERMISO RESUMEN VENTA DIARIA

## REQUERIMIENTO URGENTE

El usuario **ferreterialospuentesgmail.com** DEBE tener el permiso **`resumen_venta_diaria`** asignado en su cuenta para poder acceder al nuevo módulo "Resumen de Venta Diaria".

## ✅ ACCIÓN REQUERIDA

### Asignar Permiso al Usuario

**Usuario:** ferreterialospuentesgmail.com  
**Permiso a agregar:** `resumen_venta_diaria`

### Método 1: Actualizar directamente en la BD

```javascript
// MongoDB
db.usuarios.updateOne(
  { correo: "ferreterialospuentesgmail.com" },
  { $addToSet: { permisos: "resumen_venta_diaria" } }
);
```

### Método 2: Usar endpoint de actualización

**PATCH** `/usuarios/{usuario_id}` o `/modificar-usuarios/{usuario_id}`

**Request Body:**
```json
{
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "punto_venta",
    "resumen_venta_diaria"
  ]
}
```

**Nota:** Incluir todos los permisos existentes más el nuevo permiso `resumen_venta_diaria`.

---

## ✅ VERIFICACIÓN

Después de asignar el permiso, verificar que:

1. El usuario puede iniciar sesión
2. El permiso `resumen_venta_diaria` aparece en la lista de permisos del usuario
3. El módulo "Resumen de Venta Diaria" aparece en el menú del navbar
4. El usuario puede acceder a la ruta `/resumen-venta-diaria`

---

## 📋 PERMISOS DISPONIBLES (ACTUALIZADOS)

El sistema ahora incluye el siguiente permiso adicional:

- `resumen_venta_diaria` - Permite ver el resumen diario de ventas con detalles de productos vendidos

---

**Fecha de creación:** 2025-01-15  
**Prioridad:** 🔴 URGENTE  
**Usuario afectado:** ferreterialospuentesgmail.com

