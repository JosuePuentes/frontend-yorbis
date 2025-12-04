import { useEffect, useState, useRef } from 'react';
import { Link, useLocation } from 'react-router';
import { Menu, X, ChevronDown, LogOut, Home, BarChart, DollarSign, Users, Phone, Search, ShoppingCart } from 'lucide-react';
import { motion } from 'framer-motion';
import { fetchWithAuth } from '@/lib/api';

// Función helper para verificar si un usuario tiene un permiso o permisos relacionados
const tienePermiso = (permisos: string[], permisoRequerido: string | string[]): boolean => {
    // Si tiene acceso total, permitir todo
    if (permisos.some(p => p === 'admin' || p === 'super_admin' || p === 'acceso_total' || p === 'acceso_admin')) {
        return true;
    }
    
    // Si permisoRequerido es un array, verificar si tiene alguno
    if (Array.isArray(permisoRequerido)) {
        return permisoRequerido.some(p => permisos.includes(p));
    }
    
    return permisos.includes(permisoRequerido);
};

// Permisos y enlaces agrupados para una mejor organización visual
const allLinks = [
    {
        category: 'Resumen',
        icon: BarChart,
        items: [
            { to: '/gastoscxc-cuadres', label: 'Gastos, Cuentas y Cuadres', permiso: ['agregar_cuadre', 'ver_cuadres', 'ver_gastos', 'ver_cuentas_por_pagar'] },
            { to: '/resumendeventa', label: 'Resumen de Ventas', permiso: ['ver_resumen_mensual', 'ver_ventas', 'ver_inicio'] },
            { to: '/ventatotal', label: 'Venta Total', permiso: ['ver_ventas_totales', 'ver_ventas'] },
            { to: '/metas', label: 'Metas', permiso: ['ver_about', 'ver_metas'] },
            { to: '/gestionmetas', label: 'Crear Meta', permiso: ['metas', 'agregar_meta', 'editar_meta'] },
            { to: '/metasconf', label: 'Metas Configuración', permiso: ['ver_about', 'ver_metas', 'editar_meta'] },
        ]
    },
    {
        category: 'Cuadres',
        icon: BarChart,
        items: [
            { to: '/agregarcuadre', label: 'Agregar Cuadre', permiso: ['agregar_cuadre'] },
            { to: '/cuadresporfarmacia', label: 'Mis Cuadres', permiso: ['agregar_cuadre', 'ver_cuadres'] },
            { to: '/verificacion-cuadres', label: 'Verificación Cuadres', permiso: ['verificar_cuadres', 'aprobar_cuadre', 'rechazar_cuadre'] },
            { to: '/ver-cuadres-dia', label: 'Cuadres por Día', permiso: ['ver_cuadres_dia', 'ver_cuadres'] },
            { to: '/visualizarcuadres', label: 'Visualizar Cuadres', permiso: ['ver_cuadres_dia', 'ver_cuadres'] },
            { to: '/modificar-cuadre', label: 'Modificar Cuadre', permiso: ['modificar_cuadre', 'editar_cuadre'] },
        ]
    },
    {
        category: 'Gastos',
        icon: DollarSign,
        items: [
            { to: '/agregargastos', label: 'Agregar Gasto', permiso: ['agregar_cuadre', 'agregar_gasto'] },
            { to: '/gastosporusuario', label: 'Mis Gastos', permiso: ['agregar_cuadre', 'ver_gastos'] },
            { to: '/verificaciongastos', label: 'Verificación Gastos', permiso: ['verificar_gastos', 'aprobar_gasto', 'rechazar_gasto'] },
            { to: '/vergastos', label: 'Ver Gastos (Admin)', permiso: ['verificar_gastos', 'ver_gastos'] },
        ]
    },
    
    {
        category: 'RRHH',
        icon: Users,
        items: [
            { to: '/cajeros', label: 'Vendedores', permiso: ['cajeros', 'ver_cajeros'] },
            { to: '/comisiones', label: 'Comisiones Por Turno', permiso: ['comisiones'] },
            { to: '/comisionesgenerales', label: 'Comisiones Generales', permiso: ['comisiones'] },
        ]
    },
    {
        category: 'Administración',
        icon: Users,
        items: [
            { to: '/register', label: 'Agregar Usuario', permiso: ['acceso_admin', 'agregar_usuario'] },
            { to: '/modificar-usuarios', label: 'Modificación de Usuario', permiso: ['acceso_admin', 'editar_usuario', 'editar_permisos_usuario'] },
            { to: '/valesporfarmacia', label: 'Vales por Negocio', permiso: ['ver_cuadres_dia', 'ver_cuadres'] },
            { to: '/agregarinventariocosto', label: 'Agregar Costo Inv', permiso: ['acceso_admin', 'agregar_inventario'] },
            { to: '/verinventarios', label: 'Ver Inventarios', permiso: ['acceso_admin', 'ver_inventarios'] },
        ]
    },
    {
        category: 'Compras',
        icon: ShoppingCart,
        items: [
            { to: '/compras', label: 'Módulo de Compras', permiso: ['compras', 'ver_compras'] },
            { to: '/cuentas-por-pagar-compras', label: 'Cuentas por Pagar', permiso: ['compras', 'ver_cuentas_por_pagar'] },
        ]
    },
    
    {
        category: 'Ventas',
        icon: ShoppingCart,
        items: [
            { to: '/punto-venta', label: 'Punto de Venta', permiso: ['punto_venta', 'agregar_venta', 'ver_ventas'] },
        ]
    },
    {
        category: 'Clientes',
        icon: Users,
        items: [
            { to: '/clientes', label: 'Gestión de Clientes', permiso: ['gestionar_clientes', 'ver_clientes'] },
        ]
    },
    {
        category: 'Bancos',
        icon: DollarSign,
        items: [
            { to: '/bancos', label: 'Gestión de Bancos', permiso: ['gestionar_bancos', 'ver_bancos'] },
        ]
    },
    {
        category: 'Inicio',
        icon: Home,
        items: [
            { to: '/admin', label: 'Dashboard', permiso: ['acceso_admin', 'admin', 'super_admin'] },
        ]
    },
];

const Navbar = () => {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [permisosUsuario, setPermisosUsuario] = useState<string[]>([]);
    const [usuario, setUsuario] = useState<any>(null);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const location = useLocation();
    const dropdownRef = useRef<HTMLDivElement>(null);
    const mobileMenuRef = useRef<HTMLDivElement>(null);

    // Effect for handling user data and permissions from localStorage
    useEffect(() => {
        const loadUserData = async () => {
            const storedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
            if (!storedUsuario) {
                console.log('⚠️ NAVBAR: No hay usuario en localStorage');
                return;
            }
            
            setUsuario(storedUsuario);
            const permisos = storedUsuario?.permisos || [];
            setPermisosUsuario(permisos);
            
            // Debug: verificar permisos cargados
            console.log('=== NAVBAR: Cargando permisos ===');
            console.log('Usuario ID:', storedUsuario._id);
            console.log('Usuario correo:', storedUsuario.correo);
            console.log('Permisos del localStorage:', permisos);
            console.log('Cantidad de permisos:', permisos.length);
            console.log('Permisos detallados:', permisos);
            
            // Intentar actualizar desde el backend si hay token
            const token = localStorage.getItem('access_token');
            if (token && storedUsuario._id) {
                console.log('🔄 Intentando actualizar permisos desde backend...');
                // Intentar primero con /auth/me, luego con /usuarios/me, /modificar-usuarios/me
                const endpoints = [
                    `${import.meta.env.VITE_API_BASE_URL}/auth/me`,
                    `${import.meta.env.VITE_API_BASE_URL}/usuarios/me`,
                    `${import.meta.env.VITE_API_BASE_URL}/modificar-usuarios/me`,
                    `${import.meta.env.VITE_API_BASE_URL}/modificar-usuarios/${storedUsuario._id}`
                ];
                
                for (const endpoint of endpoints) {
                    try {
                        console.log(`🔍 Intentando endpoint: ${endpoint}`);
                        const response = await fetchWithAuth(endpoint);
                        if (response.ok) {
                            const usuarioActualizado = await response.json();
                            console.log('📦 Respuesta del backend:', usuarioActualizado);
                            // Normalizar respuesta (puede venir como objeto directo o dentro de 'usuario')
                            const usuarioData = usuarioActualizado.usuario || usuarioActualizado;
                            
                            if (usuarioData.permisos && Array.isArray(usuarioData.permisos)) {
                                console.log('✅ Permisos actualizados desde backend:', usuarioData.permisos);
                                console.log('📊 Cantidad de permisos actualizados:', usuarioData.permisos.length);
                                setPermisosUsuario(usuarioData.permisos);
                                // Actualizar localStorage
                                const usuarioCompleto = {
                                    ...storedUsuario,
                                    permisos: usuarioData.permisos,
                                    farmacias: usuarioData.farmacias || storedUsuario.farmacias
                                };
                                localStorage.setItem('usuario', JSON.stringify(usuarioCompleto));
                                setUsuario(usuarioCompleto);
                                console.log('💾 Usuario actualizado en localStorage');
                                break; // Salir del loop si encontramos un endpoint válido
                            } else {
                                console.log('⚠️ No se encontraron permisos en la respuesta');
                            }
                        } else {
                            console.log(`❌ Endpoint ${endpoint} respondió con status: ${response.status}`);
                        }
                    } catch (err) {
                        // Continuar con el siguiente endpoint si este falla
                        console.log(`⚠️ Error en endpoint ${endpoint}:`, err);
                        continue;
                    }
                }
            } else {
                console.log('⚠️ No hay token o ID de usuario, usando permisos de localStorage');
            }
        };

        loadUserData();

        const handleStorageChange = () => {
            const updatedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
            setUsuario(updatedUsuario);
            const permisos = updatedUsuario?.permisos || [];
            setPermisosUsuario(permisos);
            console.log('Permisos actualizados desde storage event:', permisos);
        };

        // Escuchar cambios en localStorage (desde otras pestañas)
        window.addEventListener('storage', handleStorageChange);
        
        // También escuchar cambios personalizados
        const handleCustomStorage = () => {
            const updatedUsuario = JSON.parse(localStorage.getItem('usuario') || 'null');
            setUsuario(updatedUsuario);
            const permisos = updatedUsuario?.permisos || [];
            setPermisosUsuario(permisos);
            console.log('Permisos actualizados desde custom event:', permisos);
        };
        
        window.addEventListener('userUpdated', handleCustomStorage);
        
        return () => {
            window.removeEventListener('storage', handleStorageChange);
            window.removeEventListener('userUpdated', handleCustomStorage);
        };
    }, []);

    // Effect for handling clicks outside dropdown/mobile menu to close them
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            // Close desktop dropdown
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
                setSearchTerm(''); // Limpiar búsqueda al cerrar
            }
            // Close mobile menu if open and click is outside the menu and not on the toggle button
            if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node) && isMobileMenuOpen) {
                const mobileButton = document.querySelector('[aria-label="Toggle mobile menu"]');
                if (mobileButton && !mobileButton.contains(event.target as Node)) {
                    setIsMobileMenuOpen(false);
                    setSearchTerm(''); // Limpiar búsqueda al cerrar
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobileMenuOpen]);

    // Limpiar búsqueda cuando se cierra el menú
    useEffect(() => {
        if (!isDropdownOpen && !isMobileMenuOpen) {
            setSearchTerm('');
        }
    }, [isDropdownOpen, isMobileMenuOpen]);

    // Filter links based on user permissions
    const accessibleLinks = permisosUsuario.length > 0
        ? allLinks.map(category => ({
            ...category,
            items: category.items.filter(link => {
                // Si no requiere permiso, mostrar siempre
                if (!link.permiso) return true;
                // Usar la función helper para verificar permisos
                return tienePermiso(permisosUsuario, link.permiso);
            })
        })).filter(category => category.items.length > 0)
        : [];

    // Debug: verificar permisos y módulos accesibles
    useEffect(() => {
        console.log('=== DEBUG NAVBAR - PERMISOS Y MÓDULOS ===');
        console.log('Permisos del usuario:', permisosUsuario);
        console.log('Total de permisos:', permisosUsuario.length);
        console.log('Categorías accesibles:', accessibleLinks.map(cat => ({
            category: cat.category,
            itemsCount: cat.items.length,
            items: cat.items.map(item => item.label)
        })));
        console.log('Total de categorías:', accessibleLinks.length);
        console.log('Total de items accesibles:', accessibleLinks.reduce((sum, cat) => sum + cat.items.length, 0));
        
        // Verificar cada categoría
        allLinks.forEach(category => {
            const accessibleItems = category.items.filter(link => !link.permiso || permisosUsuario.includes(link.permiso));
            if (accessibleItems.length > 0) {
                console.log(`✅ ${category.category}: ${accessibleItems.length} items accesibles`);
                accessibleItems.forEach(item => {
                    console.log(`   - ${item.label} (requiere: ${item.permiso || 'ninguno'})`);
                });
            } else {
                console.log(`❌ ${category.category}: 0 items accesibles`);
                category.items.forEach(item => {
                    const tienePermiso = !item.permiso || permisosUsuario.includes(item.permiso);
                    console.log(`   - ${item.label}: ${tienePermiso ? '✅' : '❌'} (requiere: ${item.permiso || 'ninguno'})`);
                });
            }
        });
        console.log('==========================================');
    }, [accessibleLinks, permisosUsuario]);

    // Filter links based on search term
    const filteredLinks = searchTerm.trim() === ''
        ? accessibleLinks
        : accessibleLinks.map(category => ({
            ...category,
            items: category.items.filter(link => {
                const matchesCategory = category.category.toLowerCase().includes(searchTerm.toLowerCase());
                const matchesLabel = link.label.toLowerCase().includes(searchTerm.toLowerCase());
                return matchesCategory || matchesLabel;
            })
        })).filter(category => category.items.length > 0);

    const handleLogout = () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('usuario');
        window.location.href = '/login';
    };

    const handleWhatsAppContact = () => {
        const phoneNumber = '584146428857';
        const message = 'Hola! Me interesa conocer más sobre los productos de Ferrería Los Puentes.';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <nav className="bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-400 text-white shadow-lg px-4 py-2 sticky top-0 z-50">
            <div className="flex justify-between items-center max-w-7xl mx-auto">
                {/* Logo / Brand Name */}
                <Link to="/" className="text-xl font-bold tracking-wide flex flex-col items-start gap-1 text-white hover:text-yellow-200 transition-colors duration-200 ml-4">
                    <div className="flex items-center gap-3">
                        <img 
                            src="/logo.png" 
                            alt="Ferrería Los Puentes Logo" 
                            className="h-12 w-12 object-contain"
                        />
                        <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent font-bold">Ferrería Los Puentes</span>
                    </div>
                </Link>

                {/* Desktop Menu */}
                <div className="hidden sm:flex items-center gap-4 relative" ref={dropdownRef}>
                    {/* Mostrar MÓDULOS solo si está logueado */}
                    {usuario && accessibleLinks.length > 0 && (
                        <button
                            className="flex items-center gap-2 px-3 py-1.5 text-sm font-semibold rounded-lg text-blue-100 hover:text-white hover:bg-blue-800/50 transition-all duration-200"
                            onClick={() => setIsDropdownOpen(prev => !prev)}
                            aria-expanded={isDropdownOpen}
                        >
                            MÓDULOS
                            <ChevronDown className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'rotate-180' : 'rotate-0'}`} />
                        </button>
                    )}

                    <button
                        onClick={handleWhatsAppContact}
                        className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        <Phone className="w-4 h-4" />
                        CONTACTO
                    </button>

                    {/* Dropdown de módulos solo si está logueado */}
                    {usuario && isDropdownOpen && accessibleLinks.length > 0 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 top-full mt-3 w-72 bg-white border border-gray-200 rounded-lg shadow-xl z-50 overflow-hidden"
                        >
                            {/* Campo de búsqueda con lupita - aparece al abrir el dropdown */}
                            <div className="p-3 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-blue-500" />
                                    <input
                                        type="text"
                                        placeholder="Buscar módulos..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-10 pr-3 py-2.5 text-sm border border-blue-200 rounded-lg bg-white text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="py-2 max-h-[80vh] overflow-y-auto custom-scrollbar">
                                {filteredLinks.length === 0 ? (
                                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                                        No se encontraron módulos que coincidan con "{searchTerm}"
                                    </div>
                                ) : (
                                    filteredLinks.map(category => (
                                        <div key={category.category} className="mb-2">
                                            <h3 className="px-4 pt-3 pb-2 text-xs font-bold uppercase text-gray-700 flex items-center gap-2 border-b border-gray-100">
                                                {category.icon && <category.icon className="w-4 h-4 text-gray-700" />}
                                                {category.category}
                                            </h3>
                                            <ul className="pb-1">
                                                {category.items.map(link => (
                                                    <li key={link.to}>
                                                        <Link
                                                            to={link.to}
                                                            onClick={() => setIsDropdownOpen(false)}
                                                            className={`block px-4 py-2 text-sm whitespace-nowrap transition-all duration-150 rounded mx-2 my-1
                                                                ${location.pathname === link.to
                                                                    ? 'text-black font-semibold bg-gray-100 hover:bg-gray-200'
                                                                    : 'text-gray-800 hover:text-black hover:bg-gray-50'
                                                                }`}
                                                        >
                                                            {link.label}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ))
                                )}
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded mx-2 my-1 flex items-center gap-2"
                                    >
                                        <LogOut className="w-4 h-4" /> Cerrar sesión
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="sm:hidden p-1.5 rounded-lg hover:bg-blue-800/50 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200"
                    onClick={() => setIsMobileMenuOpen(prev => !prev)}
                    aria-label="Toggle mobile menu"
                >
                    {isMobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5 text-white" />}
                </button>
            </div>

            {/* Mobile Menu Content (Animated Slide-in) */}
            <motion.div
                ref={mobileMenuRef}
                initial={false}
                animate={isMobileMenuOpen ? "open" : "closed"}
                variants={{
                    open: { opacity: 1, height: "auto", transition: { duration: 0.3 } },
                    closed: { opacity: 0, height: 0, transition: { duration: 0.3 } }
                }}
                className="sm:hidden mt-4 bg-blue-900/20 backdrop-blur-sm rounded-lg shadow-xl overflow-y-auto overflow-x-hidden max-h-[70vh] border border-blue-800/30"
            >
                <div className="p-4 custom-scrollbar">
                    {/* Campo de búsqueda móvil */}
                    {usuario && accessibleLinks.length > 0 && (
                        <div className="mb-4 pb-4 border-b border-blue-800/30">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-blue-300" />
                                <input
                                    type="text"
                                    placeholder="Buscar módulos..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 text-sm bg-blue-800/30 border border-blue-700/50 rounded-lg text-white placeholder-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
                                />
                            </div>
                        </div>
                    )}
                    {/* Mostrar módulos solo si está logueado */}
                    {usuario && accessibleLinks.length > 0 && (
                        <>
                            {filteredLinks.length === 0 ? (
                                <div className="px-4 py-6 text-center text-blue-200 text-sm">
                                    No se encontraron módulos que coincidan con "{searchTerm}"
                                </div>
                            ) : (
                                filteredLinks.map(category => (
                                <div key={category.category} className="mb-4 last:mb-0">
                                    <h3 className="text-sm font-bold uppercase text-blue-200 mb-2 flex items-center gap-2">
                                        {category.icon && <category.icon className="w-4 h-4" />}
                                        {category.category}
                                    </h3>
                                    <ul className="space-y-1">
                                        {category.items.map(link => (
                                            <li key={link.to}>
                                                <Link
                                                    to={link.to}
                                                    onClick={() => setIsMobileMenuOpen(false)}
                                                    className={`block px-3 py-2 text-sm transition-all duration-150 rounded
                                                        ${location.pathname === link.to
                                                            ? 'text-white font-semibold bg-blue-800/50'
                                                            : 'text-blue-100 hover:text-white hover:bg-blue-800/30'
                                                        }`}
                                                >
                                                    {link.label}
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))
                            )}
                            <div className="border-t border-blue-800/30 pt-4 mt-4">
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-900/30 hover:text-red-300 rounded flex items-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> Cerrar sesión
                                </button>
                            </div>
                        </>
                    )}
                    
                    {/* Botón de Contacto WhatsApp en móvil */}
                    <div className="border-t border-blue-800/30 pt-4 mt-4">
                        <button
                            onClick={handleWhatsAppContact}
                            className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-semibold rounded-lg bg-green-600 hover:bg-green-700 text-white transition-all duration-200 shadow-md hover:shadow-lg mb-4"
                        >
                            <Phone className="w-4 h-4" />
                            CONTACTO WHATSAPP
                        </button>
                    </div>
                </div>
            </motion.div>
        </nav>
    );
};

export default Navbar;