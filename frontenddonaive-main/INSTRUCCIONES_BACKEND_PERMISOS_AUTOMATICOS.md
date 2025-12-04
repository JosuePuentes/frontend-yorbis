# Instrucciones Backend - Permisos Automáticos

## Problema
Cuando se activa un permiso para un usuario en el backend, el frontend no muestra automáticamente el módulo correspondiente hasta que el usuario cierra sesión y vuelve a iniciar sesión.

## Solución Requerida

### 1. Endpoint para Obtener Usuario Actual (GET)
**GET** `/auth/me` o `/usuarios/me` o `/modificar-usuarios/me`

**Descripción:** Debe devolver la información completa del usuario actualmente autenticado, incluyendo todos sus permisos actualizados.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "correo": "usuario@ejemplo.com",
  "farmacias": {
    "01": "Santa Elena",
    "02": "Sur America"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "gestionar_clientes",
    "punto_venta"
  ]
}
```

**Importante:** Este endpoint DEBE devolver los permisos más actualizados desde la base de datos, no desde el token JWT.

---

### 2. Endpoint para Obtener Usuario por ID (GET)
**GET** `/modificar-usuarios/{usuario_id}`

**Descripción:** Debe devolver la información completa de un usuario específico, incluyendo todos sus permisos.

**Headers:**
- `Authorization: Bearer {token}` (requerido)

**Respuesta Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "correo": "usuario@ejemplo.com",
  "farmacias": {
    "01": "Santa Elena"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "gestionar_clientes"
  ]
}
```

**Nota:** Este endpoint ya debería existir, pero debe asegurarse de que devuelva los permisos actualizados.

---

### 3. Endpoint de Login (POST)
**POST** `/auth/login`

**Descripción:** Cuando un usuario inicia sesión, debe devolver TODOS los permisos actualizados del usuario.

**Request Body:**
```json
{
  "correo": "usuario@ejemplo.com",
  "contraseña": "password123"
}
```

**Respuesta Exitosa (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "usuario": {
    "_id": "690c40be93d9d9d635fbae83",
    "correo": "usuario@ejemplo.com",
    "farmacias": {
      "01": "Santa Elena"
    },
    "permisos": [
      "ver_inicio",
      "agregar_cuadre",
      "gestionar_clientes",
      "punto_venta"
    ]
  }
}
```

**CRÍTICO:** El campo `usuario.permisos` debe contener TODOS los permisos actuales del usuario desde la base de datos, no solo los que estaban en el token anterior.

---

## Ejemplo de Implementación (Python/FastAPI)

### Endpoint GET /auth/me

```python
@router.get("/auth/me")
async def obtener_usuario_actual(
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la información del usuario actualmente autenticado.
    Devuelve los permisos más actualizados desde la base de datos.
    """
    # Obtener usuario desde la base de datos (no del token)
    usuario_db = await db.usuarios.find_one({"_id": ObjectId(current_user.id)})
    
    if not usuario_db:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    return {
        "_id": str(usuario_db["_id"]),
        "correo": usuario_db.get("correo", ""),
        "farmacias": usuario_db.get("farmacias", {}),
        "permisos": usuario_db.get("permisos", [])  # Permisos actualizados desde DB
    }
```

### Endpoint GET /modificar-usuarios/{usuario_id}

```python
@router.get("/modificar-usuarios/{usuario_id}")
async def obtener_usuario_por_id(
    usuario_id: str,
    current_user: User = Depends(get_current_user)
):
    """
    Obtiene la información de un usuario específico.
    Solo usuarios con permiso 'acceso_admin' pueden acceder.
    """
    # Verificar permisos de administrador
    if "acceso_admin" not in current_user.permisos:
        raise HTTPException(status_code=403, detail="No tiene permisos para acceder a esta información")
    
    try:
        usuario_db = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario_db:
            raise HTTPException(status_code=404, detail="Usuario no encontrado")
        
        return {
            "_id": str(usuario_db["_id"]),
            "correo": usuario_db.get("correo", ""),
            "farmacias": usuario_db.get("farmacias", {}),
            "permisos": usuario_db.get("permisos", [])  # Permisos actualizados desde DB
        }
    except InvalidId:
        raise HTTPException(status_code=400, detail="ID de usuario inválido")
```

### Endpoint POST /auth/login (Actualizado)

```python
@router.post("/auth/login")
async def login(credentials: LoginCredentials):
    """
    Inicia sesión y devuelve token + información completa del usuario.
    """
    # Verificar credenciales
    usuario = await verificar_credenciales(credentials.correo, credentials.contraseña)
    
    if not usuario:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")
    
    # Generar token
    access_token = crear_token_acceso(usuario)
    
    # IMPORTANTE: Obtener permisos actualizados desde la base de datos
    usuario_db = await db.usuarios.find_one({"_id": ObjectId(usuario["_id"])})
    permisos_actualizados = usuario_db.get("permisos", []) if usuario_db else []
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "usuario": {
            "_id": str(usuario["_id"]),
            "correo": usuario.get("correo", ""),
            "farmacias": usuario.get("farmacias", {}),
            "permisos": permisos_actualizados  # Permisos actualizados desde DB
        }
    }
```

---

## Checklist de Implementación

- [ ] Endpoint `GET /auth/me` implementado (o `/usuarios/me` o `/modificar-usuarios/me`)
- [ ] Endpoint `GET /modificar-usuarios/{usuario_id}` devuelve permisos actualizados
- [ ] Endpoint `POST /auth/login` devuelve permisos actualizados en `usuario.permisos`
- [ ] Todos los endpoints devuelven permisos desde la base de datos, no desde el token JWT
- [ ] Los permisos se actualizan correctamente cuando se modifica un usuario
- [ ] El campo `permisos` siempre es un array de strings
- [ ] El permiso `gestionar_clientes` está disponible para asignar a usuarios

---

## Notas Importantes

1. **Permisos desde Base de Datos:** Los permisos SIEMPRE deben leerse desde la base de datos, nunca desde el token JWT. El token puede estar desactualizado.

2. **Actualización en Tiempo Real:** Cuando se modifica un usuario y se actualizan sus permisos, el frontend puede consultar estos permisos actualizados usando el endpoint `GET /auth/me` o `GET /modificar-usuarios/{id}`.

3. **Permiso `gestionar_clientes`:** Asegúrate de que este permiso esté disponible en tu sistema de permisos y pueda ser asignado a usuarios.

4. **Validación:** El backend debe validar que los permisos asignados sean válidos antes de guardarlos.

---

## Estructura de Base de Datos

### Colección: usuarios

```json
{
  "_id": ObjectId("690c40be93d9d9d635fbae83"),
  "correo": "usuario@ejemplo.com",
  "contraseña": "hash_password",
  "farmacias": {
    "01": "Santa Elena",
    "02": "Sur America"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "gestionar_clientes",
    "punto_venta"
  ],
  "createdAt": ISODate("2025-01-15T10:30:00Z"),
  "updatedAt": ISODate("2025-01-15T11:45:00Z")
}
```

**Importante:** El campo `permisos` debe ser un array de strings que contenga todos los permisos válidos del sistema, incluyendo `gestionar_clientes`.


