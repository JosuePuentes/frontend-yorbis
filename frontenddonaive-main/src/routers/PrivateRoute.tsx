import React, { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { useUserContext } from "@/context/UserContext";

interface Props {
    children: React.ReactNode;
}

const PrivateRoute: React.FC<Props> = ({ children }) => {
    const { usuario } = useUserContext();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        const token = localStorage.getItem("access_token");
        if (usuario || token) {
            setIsAuthenticated(true);
        } else {
            setIsAuthenticated(false);
        }
    }, [usuario]);

    if (isAuthenticated === null) return null; // opcional: puedes poner un loader

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};

export default PrivateRoute;
