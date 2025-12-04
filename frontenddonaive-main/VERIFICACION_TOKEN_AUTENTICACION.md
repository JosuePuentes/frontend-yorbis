# Verificación del Manejo de Token de Autenticación

## Estado Actual del Código

### ✅ LoginPage.tsx (Línea 33)
```typescript
localStorage.setItem("token", data.access_token);
```
**Correcto**: Guarda el valor de `data.access_token` del backend en la clave `"token"` de localStorage.

### ✅ Todas las Peticiones
```typescript
const token = localStorage.getItem("token");
headers.Authorization = `Bearer ${token}`;
```
**Correcto**: Lee el token de localStorage y lo envía en el header `Authorization` con el formato `Bearer ${token}`.

---

## Verificación en DevTools

### Pasos para Verificar:

1. **Abrir DevTools** (F12)
2. **Ir a la pestaña Network**
3. **Hacer una petición** (por ejemplo, cargar inventarios)
4. **Seleccionar la petición** en la lista
5. **Ir a la pestaña Headers**
6. **Buscar "Request Headers"**
7. **Verificar que aparece:**
   ```
   Authorization: Bearer <token>
   ```

### Ejemplo de Header Correcto:
```
Request Headers:
  Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
  Content-Type: application/json
```

---

## Archivos que Usan el Token

Todos los siguientes archivos ya están usando el formato correcto:

- ✅ `src/pages/LoginPage.tsx` - Guarda el token
- ✅ `src/pages/PuntoVentaPage.tsx` - Usa el token en todas las peticiones
- ✅ `src/pages/VisualizarInventariosPage.tsx` - Usa el token
- ✅ `src/pages/GestionClientesPage.tsx` - Usa el token
- ✅ `src/components/ModificarItemInventarioModal.tsx` - Usa el token
- ✅ `src/components/VerItemsInventarioModal.tsx` - Usa el token
- ✅ `src/components/Navbar.tsx` - Usa el token
- ✅ Todos los demás archivos que hacen peticiones al backend

---

## Formato del Header Authorization

**Formato Correcto:**
```typescript
headers: {
  'Authorization': `Bearer ${token}`
}
```

**Formato Incorrecto (NO usar):**
```typescript
// ❌ Sin "Bearer"
headers: {
  'Authorization': token
}

// ❌ Con espacio incorrecto
headers: {
  'Authorization': `Bearer${token}`  // Falta espacio
}

// ❌ Con minúsculas
headers: {
  'authorization': `Bearer ${token}`  // Debe ser "Authorization"
}
```

---

## Flujo Completo

1. **Usuario hace login** → `POST /auth/login`
2. **Backend responde** → `{ access_token: "eyJ...", usuario: {...} }`
3. **Frontend guarda** → `localStorage.setItem("token", data.access_token)`
4. **Frontend hace peticiones** → `Authorization: Bearer ${token}`
5. **Backend valida** → Verifica el token JWT

---

## Notas Importantes

- ✅ El token se guarda como `"token"` en localStorage (no como `"access_token"`)
- ✅ El valor guardado es `data.access_token` (el token JWT del backend)
- ✅ Todas las peticiones usan el formato `Bearer ${token}`
- ✅ El header debe ser `Authorization` (con A mayúscula)
- ✅ Debe haber un espacio entre `Bearer` y el token

---

## Si el Backend No Recibe el Token

### Verificar:
1. ¿El token se guardó correctamente en localStorage?
   - Abrir DevTools → Application → Local Storage
   - Buscar la clave `token`
   - Verificar que tiene un valor (JWT token)

2. ¿El header se está enviando?
   - Abrir DevTools → Network
   - Seleccionar una petición
   - Verificar que aparece `Authorization: Bearer <token>`

3. ¿El formato es correcto?
   - Debe ser: `Authorization: Bearer <token>`
   - No debe ser: `Authorization: <token>` (sin Bearer)
   - No debe ser: `authorization: Bearer <token>` (minúscula)

---

## Código de Ejemplo Correcto

```typescript
// 1. Obtener token
const token = localStorage.getItem("token");

// 2. Crear headers
const headers: HeadersInit = {
  "Content-Type": "application/json",
};

// 3. Agregar Authorization si hay token
if (token) {
  headers.Authorization = `Bearer ${token}`;
}

// 4. Hacer petición
const response = await fetch(`${API_BASE_URL}/endpoint`, {
  method: "POST",
  headers,
  body: JSON.stringify(data),
});
```

---

## Conclusión

✅ **El código actual está correcto** y sigue las mejores prácticas:
- Guarda el token después del login
- Envía el token en todas las peticiones
- Usa el formato correcto `Bearer ${token}`
- El header es `Authorization` (mayúscula)

Si hay problemas de autenticación, verificar:
1. Que el token se guarde correctamente en localStorage
2. Que el header se envíe en todas las peticiones
3. Que el formato sea exactamente `Bearer ${token}`





