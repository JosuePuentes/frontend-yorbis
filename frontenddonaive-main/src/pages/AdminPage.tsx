import React from 'react';
import { motion } from 'framer-motion';
// Import icons from Lucide React for a modern look
import { Store, DollarSign, HelpCircle, LayoutDashboard, CreditCard } from 'lucide-react';

// Animation variants for Framer Motion
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.1, // Slight delay for each card to appear
        },
    },
};

const cardVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
        y: 0,
        opacity: 1,
        transition: {
            type: "spring",
            stiffness: 100,
            damping: 10,
        },
    },
    hover: {
        scale: 1.05,
        boxShadow: "0 15px 30px rgba(0, 0, 0, 0.2)",
        transition: {
            duration: 0.2,
        },
    }
};

interface AdminCardProps {
    icon: React.ElementType; // Lucide React component
    title: string;
    description: string;
    color: string; // Tailwind CSS color class for icon and border
    // onClick?: () => void; // Optional: if cards are clickable
}

const AdminCard: React.FC<AdminCardProps> = ({ icon: Icon, title, description, color }) => {
    return (
        <motion.div
            className={`bg-white rounded-2xl shadow-lg p-8 flex flex-col items-center text-center border-b-4 ${color} transition-all duration-300`}
            variants={cardVariants}
            whileHover="hover"
            // onClick={onClick} // Uncomment if cards are clickable
            // style={{ cursor: onClick ? 'pointer' : 'default' }} // Add pointer cursor if clickable
        >
            <div className={`rounded-full p-4 mb-4 bg-${color.replace('border-b-4 border-', '').replace('-500', '')}-100`}>
                <Icon className={`w-10 h-10 text-${color.replace('border-b-4 border-', '')}`} />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{title}</h2>
            <p className="text-gray-600 text-base">{description}</p>
        </motion.div>
    );
};


const AdminPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br bg-black py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-7xl mx-auto">
                {/* --- Header Section --- */}
                <header className="text-center mb-16 animate-fade-in">
                    <h1 className="text-5xl md:text-6xl font-extrabold text-white mb-4 drop-shadow-2xl tracking-tight">
                        <LayoutDashboard className="inline-block w-14 h-14 mr-4 text-green-400" />
                        Panel de Administración
                    </h1>
                    <p className="text-xl text-gray-200 mt-4 max-w-2xl mx-auto">
                        Bienvenido al centro de control. Gestiona eficientemente todas las operaciones y datos de la farmacia.
                    </p>
                </header>

                {/* --- Admin Features Grid --- */}
                <motion.div
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                >
                    <AdminCard
                        icon={Store}
                        title="Gestión de Farmacias"
                        description="Administra la información de tus sucursales y sus detalles operativos."
                        color="border-blue-500"
                        // onClick={() => console.log('Navigate to Farmacias')}
                    />

                    <AdminCard
                        icon={DollarSign}
                        title="Resumen General de Ventas"
                        description="Visualiza un consolidado de todas las ventas para una visión global."
                        color="border-green-500"
                        // onClick={() => console.log('Navigate to Resumen General')}
                    />

                     <AdminCard
                        icon={CreditCard}
                        title="Gestión de Cuadres"
                        description="Revisa, verifica y administra los cuadres de caja diarios de cada farmacia."
                        color="border-purple-500"
                        // onClick={() => console.log('Navigate to Cuadres')}
                    />

                    <AdminCard
                        icon={HelpCircle}
                        title="Centro de Ayuda"
                        description="Accede a guías, tutoriales y soporte técnico para resolver tus dudas."
                        color="border-cyan-500"
                        // onClick={() => console.log('Navigate to Soporte')}
                    />
                </motion.div>
            </div>
        </div>
    );
};

export default AdminPage;