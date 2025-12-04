import { motion } from 'framer-motion';
import { ArrowRight, TrendingUp, Globe, Shield, Users, Target, Zap } from 'lucide-react';
import { Link } from 'react-router';

const HomePage: React.FC = () => {
    const handleWhatsAppContact = () => {
        const phoneNumber = '584146772709';
        const message = 'Hola! Me interesa unirme a las empresas aliadas de Donaive.';
        const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative min-h-screen flex items-start justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden pt-12 md:pt-20">
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
                        <div className="absolute inset-0 bg-gradient-to-l from-slate-900/40 via-transparent to-transparent"></div>
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
                                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl">
                                    Futuro
                                </span>
                                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl">y</span>
                                <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent text-5xl md:text-7xl lg:text-8xl">
                                    Finanzas Digitales
                                </span>
                            </div>
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl leading-relaxed mt-8 md:mt-12">
                            Transformamos y potenciamos los resultados de tu empresa con una combinación única de <span className="text-green-600">asesoría financiera</span> y <span className="text-green-600">desarrollo web</span>
                        </p>
                        <p className="text-lg text-gray-300 mb-12 max-w-3xl">
                            Mejoramos tus procesos, estandarizamos operaciones y disminuimos riesgos al 100%, asegurando que tu negocio sea financieramente sólido y tenga una presencia digital robusta.
                        </p>
                        
                               <motion.div
                                   initial={{ opacity: 0, y: 20 }}
                                   animate={{ opacity: 1, y: 0 }}
                                   transition={{ duration: 0.8, delay: 0.3 }}
                                   className="flex flex-col sm:flex-row gap-4 justify-start"
                               >
                                   <Link to="/servicios" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl inline-flex items-center justify-center">
                                       Conoce Nuestros Servicios
                                       <ArrowRight className="inline-block ml-2" size={20} />
                                   </Link>
                                   <button 
                                       onClick={handleWhatsAppContact}
                                       className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-slate-900 transition-all duration-300"
                                   >
                                       Empresas Aliadas
                                   </button>
                               </motion.div>
                            </motion.div>
                        </div>
                    </div>
                </div>
                
                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl"></div>
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
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                            ¿Cómo Te Ayudamos?
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Ofrecemos servicios especializados diseñados para impulsar el crecimiento y la estabilidad de tu empresa
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
                                <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-3 rounded-xl mr-4">
                                    <TrendingUp className="text-white" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Asesoramiento Financiero</h3>
                            </div>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Te guiamos para mejorar la gestión de tus finanzas, optimizar procesos y automatizar sistemas 
                                para una mayor eficiencia. Nuestro objetivo es ayudarte a tomar decisiones inteligentes que 
                                impulsen el crecimiento y la estabilidad de tu empresa.
                            </p>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    Optimización de procesos financieros
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    Automatización de sistemas
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    Reducción de riesgos al 100%
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                                    Decisiones financieras inteligentes
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
                                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-3 rounded-xl mr-4">
                                    <Globe className="text-white" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-900">Desarrollo de Páginas Web</h3>
                            </div>
                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Creamos sitios web modernos y funcionales, diseñados para complementar y fortalecer tu estrategia 
                                de negocios. Una página web profesional es la herramienta perfecta para alcanzar a nuevos clientes 
                                y consolidar la imagen de tu marca en el mercado.
                            </p>
                            <ul className="space-y-3 text-gray-700">
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Diseño moderno y funcional
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Estrategia de negocios integrada
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Presencia digital robusta
                                </li>
                                <li className="flex items-center">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                    Consolidación de marca
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
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                            Nuestros Pilares del Éxito
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            En Donaive creemos que el éxito se construye sobre tres pilares fundamentales
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.1 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Shield className="text-white" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Gestión Financiera Impecable</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Procesos optimizados y automatizados que garantizan una producción limpia y eficiente, 
                                reduciendo riesgos y maximizando resultados.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.2 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Globe className="text-white" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Presencia Digital Impactante</h3>
                            <p className="text-gray-600 leading-relaxed">
                                Sitios web profesionales que fortalecen tu estrategia de negocios y consolidan 
                                tu imagen de marca en el mercado digital.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8, delay: 0.3 }}
                            className="text-center group"
                        >
                            <div className="bg-gradient-to-r from-purple-500 to-pink-600 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="text-white" size={40} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-4">Innovación Constante</h3>
                            <p className="text-gray-600 leading-relaxed">
                                La innovación siempre es la mejor herramienta. Implementamos las últimas tecnologías 
                                y mejores prácticas para mantener tu empresa a la vanguardia.
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900">
                <div className="max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                            Sé Nuestro Socio Estratégico
                        </h2>
                        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Permítenos ser tu socio estratégico para llevar tu empresa al siguiente nivel. 
                            Nuestra meta es que cada proceso, posicionamiento y empresa con sitio web siga creciendo 
                            para así ser una distribución de cada empresa sólida.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                            <button 
                                onClick={handleWhatsAppContact}
                                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                            >
                                <Users className="inline-block mr-2" size={20} />
                                Únete a Nuestras Empresas Aliadas
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-slate-900 transition-all duration-300">
                                <Target className="inline-block mr-2" size={20} />
                                Consulta Gratuita
                            </button>
                        </div>
                        
                        <div className="grid md:grid-cols-3 gap-8 mt-16">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">100%</div>
                                <div className="text-blue-200">Reducción de Riesgos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">∞</div>
                                <div className="text-blue-200">Crecimiento Continuo</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-green-600 mb-2">24/7</div>
                                <div className="text-blue-200">Soporte Estratégico</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default HomePage;