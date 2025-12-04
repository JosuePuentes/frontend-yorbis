# Módulo de Modificación de Usuarios

Este módulo permite la gestión completa de usuarios del sistema, incluyendo la creación, edición y eliminación de usuarios, así como la asignación de permisos y farmacias.

## Componentes Creados

### 1. `ModalEditarUsuario.tsx`
Modal completo para editar usuarios existentes con las siguientes características:
- **Campos editables:**
  - Correo electrónico
  - Contraseña
  - Farmacias asignadas (selección múltiple)
  - Permisos (selección múltiple)
- **Validaciones:**
  - Campos obligatorios
  - Al menos una farmacia debe estar seleccionada
  - Al menos un permiso debe estar seleccionado
- **UI/UX:**
  - Interfaz moderna con cards organizadas
  - Checkboxes para selección múltiple
  - Badges para mostrar selecciones actuales
  - Estados de carga y errores

### 2. `ModificarUsuarioPage.tsx`
Página principal de gestión de usuarios con:
- **Lista de usuarios:** Muestra todos los usuarios del sistema
- **Búsqueda:** Filtrado por correo, farmacia o permiso
- **Acciones:** Editar y eliminar usuarios
- **Confirmación:** Modal de confirmación para eliminación
- **Estados:** Loading, errores y mensajes informativos

### 3. `useModificarUsuario.ts`
Hook personalizado que maneja:
- **API calls:** GET, PATCH, DELETE para usuarios
- **Estados:** Loading, error, lista de usuarios
- **Funciones:**
  - `fetchUsuarios()`: Obtener lista de usuarios
  - `actualizarUsuario()`: Modificar usuario existente
  - `eliminarUsuario()`: Eliminar usuario
  - `setError()`: Manejo de errores

### 4. `UsuarioTypes.ts`
Tipos TypeScript compartidos:
- **Interfaces:** `Usuario`, `UsuarioConNombre`
- **Constantes:** `PERMISOS_DISPONIBLES`, `FARMACIAS_DISPONIBLES`
- **Tipos:** `Permiso`, `Farmacia`

## Funcionalidades

### ✅ Gestión de Usuarios
- [x] Visualizar lista de usuarios
- [x] Editar información de usuario
- [x] Eliminar usuarios
- [x] Búsqueda y filtrado

### ✅ Asignación de Farmacias
- [x] Selección múltiple de farmacias
- [x] 8 farmacias predefinidas disponibles
- [x] Visualización de farmacias asignadas

### ✅ Gestión de Permisos
- [x] 11 permisos disponibles
- [x] Selección múltiple de permisos
- [x] Categorización visual de permisos
- [x] Validación de permisos mínimos

### ✅ Validaciones
- [x] Campos obligatorios
- [x] Formato de correo electrónico
- [x] Al menos una farmacia asignada
- [x] Al menos un permiso asignado

### ✅ UI/UX
- [x] Diseño responsive
- [x] Estados de carga
- [x] Manejo de errores
- [x] Confirmaciones de acciones
- [x] Navegación intuitiva

## Integración

### Router
La página está disponible en la ruta `/modificar-usuarios` con protección de permisos `acceso_admin`.

### Navegación
El enlace se encuentra en el menú "Administración" del navbar principal.

### Permisos
Solo usuarios con permiso `acceso_admin` pueden acceder al módulo.

## API Endpoints Requeridos

El módulo espera los siguientes endpoints en el backend:

```
GET    /usuarios           - Obtener lista de usuarios
PATCH  /usuarios/:id       - Actualizar usuario
DELETE /usuarios/:id       - Eliminar usuario
```

## Estructura de Datos

### Usuario
```typescript
interface Usuario {
  _id?: string;
  correo: string;
  contraseña: string;
  farmacias: Record<string, string>;
  permisos: string[];
}
```

### Permisos Disponibles
- `ver_inicio`
- `ver_about`
- `agregar_cuadre`
- `ver_resumen_mensual`
- `verificar_cuadres`
- `ver_cuadres_dia`
- `ver_resumen_dia`
- `acceso_admin`
- `eliminar_cuadres`
- `ver_ventas_totales`
- `verificar_gastos`

### Farmacias Disponibles
- Santa Elena (01)
- Sur America (02)
- Milagro Norte (03)
- San Martin (04)
- Las Alicias (05)
- San Carlos (06)
- San Ignacio (07)
- Rapifarma (08)

## Uso

1. **Acceder al módulo:** Ir a "Administración" > "Modificar Usuarios"
2. **Editar usuario:** Hacer clic en "Editar" en la tarjeta del usuario
3. **Modificar datos:** Actualizar campos necesarios en el modal
4. **Guardar cambios:** Hacer clic en "Guardar Cambios"
5. **Eliminar usuario:** Hacer clic en "Eliminar" y confirmar

## Características Técnicas

- **TypeScript:** Tipado completo
- **React Hooks:** Estado y efectos
- **Responsive Design:** Adaptable a móviles
- **Error Handling:** Manejo robusto de errores
- **Loading States:** Indicadores de carga
- **Form Validation:** Validación de formularios
- **Accessibility:** Componentes accesibles

## Dependencias

- React 18+
- TypeScript
- Lucide React (iconos)
- Tailwind CSS
- React Router




