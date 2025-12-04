import { useState, useCallback } from "react";
import type { Usuario } from "../types/UsuarioTypes";

interface UseModificarUsuarioReturn {
  usuarios: Usuario[];
  loading: boolean;
  error: string | null;
  fetchUsuarios: () => Promise<void>;
  crearUsuario: (usuario: Omit<Usuario, '_id'>) => Promise<void>;
  actualizarUsuario: (usuario: Usuario) => Promise<void>;
  actualizarPermisosUsuario: (usuarioId: string, permisos: string[]) => Promise<void>;
  eliminarUsuario: (usuarioId: string) => Promise<void>;
  setError: (error: string | null) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://rapifarma-backend.onrender.com";

export const useModificarUsuario = (): UseModificarUsuarioReturn => {
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Función para obtener el token de autenticación
  const getAuthToken = (): string | null => {
    return localStorage.getItem("access_token");
  };

  // Función para crear headers con autenticación
  const getAuthHeaders = (): HeadersInit => {
    const token = getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const fetchUsuarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/modificar-usuarios`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('El endpoint /modificar-usuarios no está disponible. Verifique que el backend tenga esta ruta implementada.');
        }
        if (response.status === 403 || response.status === 401) {
          throw new Error('No tiene permisos para acceder a esta información.');
        }
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Manejar diferentes formatos de respuesta del backend
      let usuariosArray: any[] = [];
      
      if (Array.isArray(data)) {
        usuariosArray = data;
      } else if (data && Array.isArray(data.usuarios)) {
        usuariosArray = data.usuarios;
      } else if (data && Array.isArray(data.data)) {
        usuariosArray = data.data;
      } else if (data && typeof data === 'object') {
        // Si es un objeto, intentar convertir las claves en array
        usuariosArray = Object.values(data);
      }
      
      console.log(`Usuarios cargados: ${usuariosArray.length}`);
      setUsuarios(usuariosArray);
    } catch (err) {
      let errorMessage = "Error al obtener usuarios";
      
      if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
        errorMessage = 'Error de conexión: No se pudo conectar con el servidor. Verifique su conexión a internet y que el backend esté disponible.';
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error("Error fetching usuarios:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const crearUsuario = useCallback(async (usuario: Omit<Usuario, '_id'>) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/modificar-usuarios`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(usuario),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      // Actualizar la lista de usuarios después de la creación exitosa
      await fetchUsuarios();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al crear usuario";
      setError(errorMessage);
      console.error("Error creating usuario:", err);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, [fetchUsuarios]);

  const actualizarUsuario = useCallback(async (usuario: Usuario) => {
    if (!usuario._id) {
      throw new Error("ID de usuario requerido para actualizar");
    }

    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/modificar-usuarios/${usuario._id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(usuario),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      // Actualizar la lista de usuarios después de la modificación exitosa
      await fetchUsuarios();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar usuario";
      setError(errorMessage);
      console.error("Error updating usuario:", err);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, [fetchUsuarios]);

  const actualizarPermisosUsuario = useCallback(async (usuarioId: string, permisos: string[]) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/modificar-usuarios/${usuarioId}/permisos`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify(permisos),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      // Actualizar la lista de usuarios después de la modificación exitosa
      await fetchUsuarios();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al actualizar permisos";
      setError(errorMessage);
      console.error("Error updating permisos:", err);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, [fetchUsuarios]);

  const eliminarUsuario = useCallback(async (usuarioId: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_BASE_URL}/modificar-usuarios/${usuarioId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || 
          `Error ${response.status}: ${response.statusText}`
        );
      }
      
      // Actualizar la lista de usuarios después de la eliminación exitosa
      await fetchUsuarios();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al eliminar usuario";
      setError(errorMessage);
      console.error("Error deleting usuario:", err);
      throw err; // Re-lanzar para que el componente pueda manejarlo
    } finally {
      setLoading(false);
    }
  }, [fetchUsuarios]);

  return {
    usuarios,
    loading,
    error,
    fetchUsuarios,
    crearUsuario,
    actualizarUsuario,
    actualizarPermisosUsuario,
    eliminarUsuario,
    setError,
  };
};

export default useModificarUsuario;
