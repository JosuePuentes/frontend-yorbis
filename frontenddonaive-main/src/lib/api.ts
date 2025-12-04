/**
 * Utilidades para hacer peticiones autenticadas al backend
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * Obtiene el token de autenticación desde localStorage
 */
export const getAuthToken = (): string | null => {
  return localStorage.getItem("access_token");
};

/**
 * Crea headers con autenticación para peticiones al backend
 */
export const getAuthHeaders = (additionalHeaders?: HeadersInit): HeadersInit => {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(additionalHeaders as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

/**
 * Función helper para hacer peticiones autenticadas
 * Agrega automáticamente el token JWT en el header Authorization
 */
export const fetchWithAuth = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const token = getAuthToken();
  
  // Debug: Verificar que el token existe
  console.log('[fetchWithAuth] Token obtenido:', token ? 'Token encontrado' : 'Token NO encontrado');
  console.log('[fetchWithAuth] URL:', url);
  
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('[fetchWithAuth] Header Authorization agregado:', `Bearer ${token.substring(0, 20)}...`);
  } else {
    console.warn('[fetchWithAuth] ⚠️ No hay token disponible. La petición se enviará sin Authorization header.');
  }

  console.log('[fetchWithAuth] Headers finales:', headers);

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Si el token es inválido o expirado, redirigir a login
  if (response.status === 401 || response.status === 403) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("usuario");
    window.location.href = "/login";
    throw new Error("Token inválido o expirado");
  }

  return response;
};

/**
 * Obtiene la URL base de la API
 */
export const getApiBaseUrl = (): string => {
  return API_BASE_URL || "";
};

