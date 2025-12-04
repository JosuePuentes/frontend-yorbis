import React, { createContext, useContext, useState } from "react";
import type { Usuario } from "../data";
import { usuarios as usuariosData } from "../data";
import { jwtDecode } from "jwt-decode";

interface UserContextProps {
    usuario: Usuario | null;
    login: (correo: string, contraseña: string) => boolean;
    logout: () => void;
    register: (nuevoUsuario: Omit<Usuario, "id">) => boolean;
}

const UserContext = createContext<UserContextProps | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [usuario, setUsuario] = useState<Usuario | null>(null);
    const [usuarios, setUsuarios] = useState<Usuario[]>(usuariosData);

    // Helper para verificar expiración del token
    function isTokenExpired(token: string): boolean {
        try {
            const decoded: any = jwtDecode(token);
            if (!decoded.exp) return true;
            const now = Math.floor(Date.now() / 1000);
            return decoded.exp < now;
        } catch {
            return true;
        }
    }

    // Efecto para cerrar sesión si el token expira
    React.useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (token && isTokenExpired(token)) {
            setUsuario(null);
            localStorage.removeItem("access_token");
        }
        // Opcional: chequeo periódico
        const interval = setInterval(() => {
            const token = localStorage.getItem("access_token");
            if (token && isTokenExpired(token)) {
                setUsuario(null);
                localStorage.removeItem("access_token");
            }
        }, 60 * 1000); // cada minuto
        return () => clearInterval(interval);
    }, []);

    const login = (correo: string, contraseña: string) => {
        const user = usuarios.find(
            u => u.correo === correo && u.contraseña === contraseña
        );
        if (user) {
            setUsuario(user);
            return true;
        }
        return false;
    };

    const logout = () => setUsuario(null);

    const register = (nuevoUsuario: Omit<Usuario, "id">) => {
        if (usuarios.some(u => u.correo === nuevoUsuario.correo)) return false;
        const user: Usuario = { ...nuevoUsuario, id: usuarios.length + 1 };
        setUsuarios(prev => [...prev, user]);
        setUsuario(user);
        return true;
    };

    return (
        <UserContext.Provider value={{ usuario, login, logout, register }}>
            {children}
        </UserContext.Provider>
    );
};

export function useUserContext() {
    const ctx = useContext(UserContext);
    if (!ctx) throw new Error("useUserContext debe usarse dentro de UserProvider");
    return ctx;
}