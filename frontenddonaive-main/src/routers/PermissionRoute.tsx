import React from "react";
import { Navigate } from "react-router";

interface Props {
    permiso: string;
    children: React.ReactNode;
}

const PermissionRoute: React.FC<Props> = ({ permiso, children }) => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

    if (!usuario) return <Navigate to="/login" replace />;
    
    // Verificar si tiene acceso total (admin, super_admin, acceso_total, acceso_admin)
    const tieneAccesoTotal = usuario.permisos && Array.isArray(usuario.permisos) && usuario.permisos.some((p: string) => 
        p === 'admin' || 
        p === 'super_admin' || 
        p === 'acceso_total' || 
        p === 'acceso_admin'
    );
    
    // Si tiene acceso total, permitir acceso a todas las rutas
    if (tieneAccesoTotal) {
        return <>{children}</>;
    }
    
    // Si no tiene acceso total, verificar el permiso específico
    if (!usuario.permisos || !Array.isArray(usuario.permisos) || !usuario.permisos.includes(permiso)) {
        console.warn(`⚠️ PermissionRoute: Usuario no tiene permiso "${permiso}"`);
        console.warn(`⚠️ Permisos del usuario:`, usuario.permisos);
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

export default PermissionRoute;