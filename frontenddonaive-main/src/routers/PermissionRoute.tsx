import React from "react";
import { Navigate } from "react-router";

interface Props {
    permiso: string;
    children: React.ReactNode;
}

const PermissionRoute: React.FC<Props> = ({ permiso, children }) => {
    const usuario = JSON.parse(localStorage.getItem("usuario") || "null");

    if (!usuario) return <Navigate to="/login" replace />;
    if (!usuario.permisos || !usuario.permisos.includes(permiso)) return <Navigate to="/" replace />;

    return <>{children}</>;
};

export default PermissionRoute;