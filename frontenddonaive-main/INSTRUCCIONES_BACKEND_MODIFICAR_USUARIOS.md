# 🔧 INSTRUCCIONES BACKEND: Endpoints de Modificación de Usuarios

## 🎯 REQUERIMIENTO PRINCIPAL

El frontend necesita un conjunto completo de endpoints bajo la ruta `/modificar-usuarios` para gestionar usuarios, incluyendo creación, actualización, eliminación y gestión de permisos.

**Error actual:** El endpoint `GET /modificar-usuarios` retorna 404, lo que impide que el módulo de modificación de usuarios funcione.

---

## 📋 ENDPOINTS REQUERIDOS

### 1. `GET /modificar-usuarios`

**Descripción:** Obtiene la lista de todos los usuarios del sistema.

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitosa (200 OK):**
```json
[
  {
    "_id": "690c40be93d9d9d635fbae83",
    "correo": "usuario@ejemplo.com",
    "contraseña": "hash_password",  // Opcional: puede omitirse por seguridad
    "farmacias": {
      "01": "Santa Elena",
      "02": "Sur America"
    },
    "permisos": [
      "ver_inicio",
      "agregar_cuadre",
      "acceso_admin"
    ]
  },
  {
    "_id": "690c40be93d9d9d635fbae84",
    "correo": "otro@ejemplo.com",
    "farmacias": {
      "01": "Santa Elena"
    },
    "permisos": [
      "ver_inicio",
      "punto_venta"
    ]
  }
]
```

**Nota:** El frontend acepta diferentes formatos de respuesta:
- Array directo: `[...]`
- Objeto con array: `{ "usuarios": [...] }`
- Objeto con data: `{ "data": [...] }`

**Permisos requeridos:** `acceso_admin` o `editar_usuario`

---

### 2. `GET /modificar-usuarios/{usuario_id}`

**Descripción:** Obtiene un usuario específico por su ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `usuario_id` (string): ID del usuario

**Response Exitosa (200 OK):**
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
    "acceso_admin"
  ]
}
```

**Error 404:**
```json
{
  "detail": "Usuario no encontrado"
}
```

**Permisos requeridos:** `acceso_admin` o `editar_usuario`

---

### 3. `GET /modificar-usuarios/me`

**Descripción:** Obtiene el usuario actualmente autenticado (alternativa a `/auth/me`).

**Headers:**
```
Authorization: Bearer {token}
```

**Response Exitosa (200 OK):**
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
    "punto_venta"
  ]
}
```

**Nota:** Este endpoint es usado por el Navbar para actualizar permisos en tiempo real.

---

### 4. `POST /modificar-usuarios`

**Descripción:** Crea un nuevo usuario.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Request Body:**
```json
{
  "correo": "nuevo@ejemplo.com",
  "contraseña": "password123",
  "farmacias": {
    "01": "Santa Elena",
    "02": "Sur America"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre"
  ]
}
```

**Response Exitosa (201 Created):**
```json
{
  "_id": "690c40be93d9d9d635fbae85",
  "correo": "nuevo@ejemplo.com",
  "farmacias": {
    "01": "Santa Elena",
    "02": "Sur America"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre"
  ],
  "mensaje": "Usuario creado exitosamente"
}
```

**Error 400 (Validación):**
```json
{
  "detail": "El correo ya está registrado"
}
```

**Permisos requeridos:** `acceso_admin`

---

### 5. `PATCH /modificar-usuarios/{usuario_id}`

**Descripción:** Actualiza un usuario existente (todos los campos).

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `usuario_id` (string): ID del usuario

**Request Body:**
```json
{
  "correo": "usuario@ejemplo.com",
  "contraseña": "nueva_password",  // Opcional: solo si se quiere cambiar
  "farmacias": {
    "01": "Santa Elena",
    "03": "Milagro Norte"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "punto_venta",
    "acceso_admin"
  ]
}
```

**Response Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "correo": "usuario@ejemplo.com",
  "farmacias": {
    "01": "Santa Elena",
    "03": "Milagro Norte"
  },
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "punto_venta",
    "acceso_admin"
  ],
  "mensaje": "Usuario actualizado exitosamente"
}
```

**Nota:** Si `contraseña` no se envía o está vacía, no se debe actualizar la contraseña.

**Permisos requeridos:** `acceso_admin` o `editar_usuario`

---

### 6. `PATCH /modificar-usuarios/{usuario_id}/permisos`

**Descripción:** Actualiza solo los permisos de un usuario.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: application/json
```

**Path Parameters:**
- `usuario_id` (string): ID del usuario

**Request Body:**
```json
[
  "ver_inicio",
  "agregar_cuadre",
  "punto_venta",
  "acceso_admin",
  "ver_libro_ventas"
]
```

**Nota:** El body es un array directo de strings, no un objeto.

**Response Exitosa (200 OK):**
```json
{
  "_id": "690c40be93d9d9d635fbae83",
  "correo": "usuario@ejemplo.com",
  "permisos": [
    "ver_inicio",
    "agregar_cuadre",
    "punto_venta",
    "acceso_admin",
    "ver_libro_ventas"
  ],
  "mensaje": "Permisos actualizados exitosamente"
}
```

**Permisos requeridos:** `acceso_admin` o `editar_permisos_usuario`

---

### 7. `DELETE /modificar-usuarios/{usuario_id}`

**Descripción:** Elimina un usuario del sistema.

**Headers:**
```
Authorization: Bearer {token}
```

**Path Parameters:**
- `usuario_id` (string): ID del usuario

**Response Exitosa (200 OK):**
```json
{
  "mensaje": "Usuario eliminado exitosamente"
}
```

**Error 404:**
```json
{
  "detail": "Usuario no encontrado"
}
```

**Error 400 (Protección):**
```json
{
  "detail": "No se puede eliminar el usuario actual"
}
```

**Permisos requeridos:** `acceso_admin`

---

## 🔧 IMPLEMENTACIÓN PASO A PASO

### Estructura Base (Python/FastAPI)

```python
from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Dict
from datetime import datetime
import bcrypt

router = APIRouter(prefix="/modificar-usuarios", tags=["usuarios"])

# Modelos Pydantic
class UsuarioBase(BaseModel):
    correo: EmailStr
    farmacias: Dict[str, str] = {}
    permisos: List[str] = []

class UsuarioCreate(UsuarioBase):
    contraseña: str

class UsuarioUpdate(UsuarioBase):
    contraseña: Optional[str] = None

class UsuarioResponse(UsuarioBase):
    _id: str
    
    class Config:
        from_attributes = True

# Dependencia para verificar permisos
def verificar_permiso_admin(current_user: dict = Depends(get_current_user)):
    permisos = current_user.get("permisos", [])
    if "acceso_admin" not in permisos and "editar_usuario" not in permisos:
        raise HTTPException(
            status_code=403,
            detail="No tiene permisos para acceder a esta funcionalidad"
        )
    return current_user

# 1. GET /modificar-usuarios
@router.get("", response_model=List[UsuarioResponse])
async def obtener_usuarios(
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Obtiene la lista de todos los usuarios.
    """
    try:
        usuarios = await db.usuarios.find({}).to_list(length=None)
        
        # Convertir ObjectId a string y omitir contraseña
        usuarios_list = []
        for usuario in usuarios:
            usuario_dict = {
                "_id": str(usuario["_id"]),
                "correo": usuario.get("correo", ""),
                "farmacias": usuario.get("farmacias", {}),
                "permisos": usuario.get("permisos", [])
            }
            usuarios_list.append(usuario_dict)
        
        return usuarios_list
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener usuarios: {str(e)}"
        )

# 2. GET /modificar-usuarios/{usuario_id}
@router.get("/{usuario_id}", response_model=UsuarioResponse)
async def obtener_usuario(
    usuario_id: str,
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Obtiene un usuario específico por su ID.
    """
    try:
        usuario = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado"
            )
        
        return {
            "_id": str(usuario["_id"]),
            "correo": usuario.get("correo", ""),
            "farmacias": usuario.get("farmacias", {}),
            "permisos": usuario.get("permisos", [])
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener usuario: {str(e)}"
        )

# 3. GET /modificar-usuarios/me
@router.get("/me", response_model=UsuarioResponse)
async def obtener_usuario_actual(
    current_user: dict = Depends(get_current_user),
    db = Depends(get_database)
):
    """
    Obtiene el usuario actualmente autenticado.
    """
    try:
        usuario_id = current_user.get("_id") or current_user.get("sub")
        
        if not usuario_id:
            raise HTTPException(
                status_code=401,
                detail="Usuario no autenticado"
            )
        
        usuario = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado"
            )
        
        return {
            "_id": str(usuario["_id"]),
            "correo": usuario.get("correo", ""),
            "farmacias": usuario.get("farmacias", {}),
            "permisos": usuario.get("permisos", [])
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al obtener usuario: {str(e)}"
        )

# 4. POST /modificar-usuarios
@router.post("", response_model=UsuarioResponse, status_code=status.HTTP_201_CREATED)
async def crear_usuario(
    usuario_data: UsuarioCreate,
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Crea un nuevo usuario.
    """
    try:
        # Verificar que el correo no exista
        usuario_existente = await db.usuarios.find_one({"correo": usuario_data.correo})
        
        if usuario_existente:
            raise HTTPException(
                status_code=400,
                detail="El correo ya está registrado"
            )
        
        # Hashear contraseña
        contraseña_hash = bcrypt.hashpw(
            usuario_data.contraseña.encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Crear documento de usuario
        nuevo_usuario = {
            "correo": usuario_data.correo,
            "contraseña": contraseña_hash,
            "farmacias": usuario_data.farmacias,
            "permisos": usuario_data.permisos,
            "fecha_creacion": datetime.now(),
            "fecha_actualizacion": datetime.now()
        }
        
        resultado = await db.usuarios.insert_one(nuevo_usuario)
        
        return {
            "_id": str(resultado.inserted_id),
            "correo": usuario_data.correo,
            "farmacias": usuario_data.farmacias,
            "permisos": usuario_data.permisos
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al crear usuario: {str(e)}"
        )

# 5. PATCH /modificar-usuarios/{usuario_id}
@router.patch("/{usuario_id}", response_model=UsuarioResponse)
async def actualizar_usuario(
    usuario_id: str,
    usuario_data: UsuarioUpdate,
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Actualiza un usuario existente.
    """
    try:
        usuario = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado"
            )
        
        # Verificar que el correo no esté en uso por otro usuario
        if usuario_data.correo != usuario.get("correo"):
            usuario_existente = await db.usuarios.find_one({"correo": usuario_data.correo})
            if usuario_existente:
                raise HTTPException(
                    status_code=400,
                    detail="El correo ya está registrado"
                )
        
        # Preparar datos de actualización
        update_data = {
            "correo": usuario_data.correo,
            "farmacias": usuario_data.farmacias,
            "permisos": usuario_data.permisos,
            "fecha_actualizacion": datetime.now()
        }
        
        # Actualizar contraseña solo si se proporciona
        if usuario_data.contraseña:
            contraseña_hash = bcrypt.hashpw(
                usuario_data.contraseña.encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            update_data["contraseña"] = contraseña_hash
        
        # Actualizar usuario
        await db.usuarios.update_one(
            {"_id": ObjectId(usuario_id)},
            {"$set": update_data}
        )
        
        # Obtener usuario actualizado
        usuario_actualizado = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        return {
            "_id": str(usuario_actualizado["_id"]),
            "correo": usuario_actualizado.get("correo", ""),
            "farmacias": usuario_actualizado.get("farmacias", {}),
            "permisos": usuario_actualizado.get("permisos", [])
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar usuario: {str(e)}"
        )

# 6. PATCH /modificar-usuarios/{usuario_id}/permisos
@router.patch("/{usuario_id}/permisos", response_model=UsuarioResponse)
async def actualizar_permisos_usuario(
    usuario_id: str,
    permisos: List[str],
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Actualiza solo los permisos de un usuario.
    """
    try:
        usuario = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado"
            )
        
        # Actualizar solo permisos
        await db.usuarios.update_one(
            {"_id": ObjectId(usuario_id)},
            {
                "$set": {
                    "permisos": permisos,
                    "fecha_actualizacion": datetime.now()
                }
            }
        )
        
        # Obtener usuario actualizado
        usuario_actualizado = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        return {
            "_id": str(usuario_actualizado["_id"]),
            "correo": usuario_actualizado.get("correo", ""),
            "farmacias": usuario_actualizado.get("farmacias", {}),
            "permisos": usuario_actualizado.get("permisos", [])
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al actualizar permisos: {str(e)}"
        )

# 7. DELETE /modificar-usuarios/{usuario_id}
@router.delete("/{usuario_id}")
async def eliminar_usuario(
    usuario_id: str,
    current_user: dict = Depends(verificar_permiso_admin),
    db = Depends(get_database)
):
    """
    Elimina un usuario del sistema.
    """
    try:
        usuario = await db.usuarios.find_one({"_id": ObjectId(usuario_id)})
        
        if not usuario:
            raise HTTPException(
                status_code=404,
                detail="Usuario no encontrado"
            )
        
        # Prevenir auto-eliminación
        usuario_actual_id = current_user.get("_id") or current_user.get("sub")
        if str(usuario["_id"]) == str(usuario_actual_id):
            raise HTTPException(
                status_code=400,
                detail="No se puede eliminar el usuario actual"
            )
        
        # Eliminar usuario
        await db.usuarios.delete_one({"_id": ObjectId(usuario_id)})
        
        return {
            "mensaje": "Usuario eliminado exitosamente"
        }
        
    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        raise HTTPException(
            status_code=500,
            detail=f"Error al eliminar usuario: {str(e)}"
        )
```

---

## 📝 ESTRUCTURA DE BASE DE DATOS

### Colección: `usuarios`

```javascript
{
  _id: ObjectId,
  correo: String,  // Email único
  contraseña: String,  // Hash bcrypt
  farmacias: {
    "01": "Santa Elena",
    "02": "Sur America"
  },
  permisos: [
    "ver_inicio",
    "agregar_cuadre",
    "acceso_admin"
  ],
  fecha_creacion: Date,
  fecha_actualizacion: Date
}
```

**Índices recomendados:**
```javascript
db.usuarios.createIndex({ "correo": 1 }, { unique: true })
```

---

## ✅ VALIDACIONES

1. **Correo único:** No puede haber dos usuarios con el mismo correo
2. **Correo válido:** Debe ser un email válido
3. **Farmacias:** Debe ser un objeto con claves de farmacia
4. **Permisos:** Debe ser un array de strings
5. **Contraseña:** Mínimo 6 caracteres (al crear)
6. **Auto-eliminación:** No se puede eliminar el usuario actual
7. **Permisos requeridos:** Verificar permisos en cada endpoint

---

## 🔐 PERMISOS REQUERIDOS

- **`acceso_admin`:** Acceso completo a todos los endpoints
- **`editar_usuario`:** Puede ver y editar usuarios (no eliminar)
- **`editar_permisos_usuario`:** Puede editar permisos específicamente

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Endpoint `GET /modificar-usuarios` implementado
- [ ] Endpoint `GET /modificar-usuarios/{usuario_id}` implementado
- [ ] Endpoint `GET /modificar-usuarios/me` implementado
- [ ] Endpoint `POST /modificar-usuarios` implementado
- [ ] Endpoint `PATCH /modificar-usuarios/{usuario_id}` implementado
- [ ] Endpoint `PATCH /modificar-usuarios/{usuario_id}/permisos` implementado
- [ ] Endpoint `DELETE /modificar-usuarios/{usuario_id}` implementado
- [ ] Validación de correo único
- [ ] Hash de contraseñas con bcrypt
- [ ] Verificación de permisos en cada endpoint
- [ ] Prevención de auto-eliminación
- [ ] Manejo de errores apropiado
- [ ] Índice único en campo correo
- [ ] Omitir contraseña en respuestas GET
- [ ] Actualizar `fecha_actualizacion` en cada modificación

---

## 🎯 RESULTADO ESPERADO

Una vez implementados estos endpoints:

1. ✅ El módulo `/modificar-usuarios` funcionará correctamente
2. ✅ Se podrán listar todos los usuarios
3. ✅ Se podrán crear nuevos usuarios
4. ✅ Se podrán editar usuarios y sus permisos
5. ✅ Se podrán eliminar usuarios
6. ✅ El Navbar podrá actualizar permisos en tiempo real
7. ✅ No habrá más errores 404

---

## 🚨 ERRORES COMUNES A EVITAR

1. ❌ No omitir contraseña en respuestas GET (riesgo de seguridad)
2. ❌ No validar correo único (duplicados)
3. ❌ No hashear contraseñas (almacenar en texto plano)
4. ❌ No verificar permisos (acceso no autorizado)
5. ❌ Permitir auto-eliminación (bloquear cuenta propia)
6. ❌ No actualizar `fecha_actualizacion` (auditoría)

---

## 📞 EJEMPLOS DE USO

### Obtener todos los usuarios
```
GET /modificar-usuarios
Authorization: Bearer {token}
```

### Obtener usuario actual
```
GET /modificar-usuarios/me
Authorization: Bearer {token}
```

### Crear usuario
```
POST /modificar-usuarios
Authorization: Bearer {token}
Content-Type: application/json

{
  "correo": "nuevo@ejemplo.com",
  "contraseña": "password123",
  "farmacias": {"01": "Santa Elena"},
  "permisos": ["ver_inicio"]
}
```

### Actualizar permisos
```
PATCH /modificar-usuarios/690c40be93d9d9d635fbae83/permisos
Authorization: Bearer {token}
Content-Type: application/json

["ver_inicio", "agregar_cuadre", "ver_libro_ventas"]
```

---

## ✅ CONCLUSIÓN

Todos los endpoints bajo `/modificar-usuarios` deben estar implementados para que el módulo de gestión de usuarios funcione correctamente. El endpoint más crítico es `GET /modificar-usuarios` que actualmente retorna 404.


