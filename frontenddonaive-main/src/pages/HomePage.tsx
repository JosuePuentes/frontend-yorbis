import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Globe, Shield, Users, Target, Zap } from 'lucide-react';
import { Link } from 'react-router';

const HomePage: React.FC = () => {
    const handleWhatsAppContact = () => {
        const phoneNumber = '584146428857';
        const message = 'Hola! Me interesa conocer más sobre los productos de Ferrería Los Puentes.';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-start justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-yellow-400 overflow-hidden pt-12 md:pt-20">
                {/* Background Pattern */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }}></div>
                
                {/* Imagen de fondo con desvanecido - lado derecho */}
                <div className="absolute right-0 top-0 bottom-0 w-1/2 md:w-2/5 pointer-events-none">
                    <div className="relative h-full w-full">
                        <img 
                            src="/hero-image.png" 
                            alt="" 
                            className="w-full h-full object-cover object-right opacity-70"
                            style={{
                                maskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 100%)',
                                WebkitMaskImage: 'linear-gradient(to left, transparent 0%, black 20%, black 80%, transparent 100%)'
                            }}
                        />
                        {/* Overlay adicional para desvanecido más suave */}
                        <div className="absolute inset-0 bg-gradient-to-l from-blue-600/40 via-transparent to-transparent"></div>
                    </div>
                </div>
                
                <div className="relative z-10 max-w-7xl mx-auto px-6 w-full">
                    <div className="flex flex-col lg:flex-row items-start gap-8">
                        {/* Contenido de texto - lado izquierdo */}
                        <div className="flex-1 lg:max-w-2xl">
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="text-left"
                            >
                        <h1 className="font-bold text-white leading-tight mb-6">
                            <div className="flex flex-row items-center gap-3 flex-wrap">
                                <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl drop-shadow-lg">
                                    Ferrería
                                </span>
                                <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl drop-shadow-lg">Los</span>
                                <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl drop-shadow-lg">
                                    Puentes
                                </span>
                            </div>
                        </h1>
                        <p className="text-xl md:text-2xl text-white mb-8 max-w-4xl leading-relaxed mt-8 md:mt-12 font-semibold">
                            Tu solución integral en materiales de construcción y ferretería
                        </p>
                        <p className="text-lg text-white/90 mb-12 max-w-3xl">
                            Ofrecemos productos de calidad, asesoría especializada y servicio al cliente excepcional para todos tus proyectos de construcción.
                        </p>
                        
                               <motion.div
                                   initial={{ opacity: 0, y: 20 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ duration: 0.8, delay: 0.3 }}
                                   className="flex flex-col sm:flex-row gap-4 justify-start"
                               >
                                   <Link to="/servicios" className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-8 py-4 rounded-full text-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center justify-center">
                                       Nuestros Productos
                                       <ArrowRight className="inline-block ml-2" size={20} />
                                   </Link>
                                   <button 
                                       onClick={handleWhatsAppContact}
                                       className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300"
                                   >
                                       Contáctanos
                                   </button>
                               </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/30 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500/30 rounded-full blur-xl"></div>
            </section>

            {/* Services Section */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
                            ¿Cómo Te Ayudamos?
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                            Ofrecemos productos y servicios especializados para todos tus proyectos de construcción
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 gap-12">
                        {/* Financial Advisory */}
                        <motion.div
                            initial={{ opacity: 0, x: -30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center mb-6">
                                <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-3 rounded-xl mr-4">
                                    <TrendingUp className="text-blue-900" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-blue-900">Productos de Calidad</h3>
                            </div>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Ofrecemos una amplia gama de materiales de construcción y productos de ferretería de la más alta calidad. 
                                Nuestro inventario está cuidadosamente seleccionado para satisfacer todas tus necesidades de construcción 
                                y renovación.
                            </p>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                    Materiales de construcción de primera calidad
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                    Herramientas y accesorios especializados
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                    Asesoría técnica profesional
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-yellow-500 rounded-full mr-3"></div>
                                    Precios competitivos y justos
                                </li>
                            </ul>
                        </motion.div>

                        {/* Web Development */}
                        <motion.div
                            initial={{ opacity: 0, x: 30 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.8 }}
                            className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300"
                        >
                            <div className="flex items-center mb-6">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3 rounded-xl mr-4">
                                    <Globe className="text-white" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-blue-900">Servicio al Cliente</h3>
                            </div>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Nuestro compromiso es brindarte un servicio excepcional en cada visita. Contamos con personal capacitado 
                                que te ayudará a encontrar exactamente lo que necesitas para tu proyecto, con atención personalizada 
                                y asesoría técnica profesional.
                            </p>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Atención personalizada y profesional
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Asesoría técnica especializada
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Entrega rápida y eficiente
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Garantía de satisfacción
                                </li>
            </ul>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Vision & Mission Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
                            Nuestros Pilares del Éxito
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                            En Ferrería Los Puentes creemos que el éxito se construye sobre tres pilares fundamentales
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Shield className="text-blue-900" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-blue-900 mb-4">Calidad Garantizada</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Productos seleccionados cuidadosamente que garantizan durabilidad y excelencia en cada proyecto, 
                                asegurando resultados de primera calidad.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Globe className="text-white" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-blue-900 mb-4">Servicio Excepcional</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Atención personalizada y profesional que fortalece la confianza con nuestros clientes y consolida 
                                nuestra reputación en el mercado.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="text-blue-900" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-blue-900 mb-4">Variedad y Disponibilidad</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Amplio inventario siempre disponible. Mantenemos las últimas tendencias en materiales 
                                y herramientas para mantenerte a la vanguardia en tus proyectos.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-blue-600 via-blue-500 to-yellow-400">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Tu Socio de Confianza en Construcción
                        </h2>
                        <p className="text-xl text-white mb-8 max-w-3xl mx-auto leading-relaxed">
                            En Ferrería Los Puentes estamos comprometidos con tu éxito. Nuestra meta es ser tu proveedor 
                            de confianza, ofreciendo productos de calidad y servicio excepcional para todos tus proyectos.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <button 
                                onClick={handleWhatsAppContact}
                                className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-8 py-4 rounded-full text-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <Users className="inline-block mr-2" size={20} />
                                Contáctanos Ahora
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                                <Target className="inline-block mr-2" size={20} />
                                Consulta de Productos
                            </button>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-8 mt-16">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-300 mb-2">100%</div>
                                <div className="text-white">Calidad Garantizada</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-300 mb-2">+</div>
                                <div className="text-white">Años de Experiencia</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-300 mb-2">24/7</div>
                                <div className="text-white">Atención al Cliente</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;