import { motion } from 'framer-motion';
import { TrendingUp, Globe, Users, Target, Phone, ShoppingCart, Building, Palette, Briefcase } from 'lucide-react';

const ServicesPage: React.FC = () => {
    const services = [
        {
            icon: TrendingUp,
            title: "Asesoramiento Financiero",
            description: "Te guiamos para mejorar la gestión de tus finanzas, optimizar procesos y automatizar sistemas para una mayor eficiencia.",
            features: [
                "Optimización de procesos financieros",
                "Automatización de sistemas",
                "Reducción de riesgos al 100%",
                "Decisiones financieras inteligentes",
                "Análisis de compras inteligentes"
            ],
            color: "from-green-500 to-emerald-600"
        },
        {
            icon: Globe,
            title: "Desarrollo de Páginas Web",
            description: "Creamos sitios web modernos y funcionales, diseñados para complementar y fortalecer tu estrategia de negocios.",
            features: [
                "Diseño moderno y funcional",
                "Estrategia de negocios integrada",
                "Presencia digital robusta",
                "Consolidación de marca",
                "Optimización para motores de búsqueda"
            ],
            color: "from-blue-500 to-indigo-600"
        },
        {
            icon: Phone,
            title: "Potenciación de Telemarketing",
            description: "Optimizamos tus estrategias de ventas telefónicas para maximizar conversiones y mejorar la experiencia del cliente.",
            features: [
                "Estrategias de llamadas efectivas",
                "Scripts de venta optimizados",
                "Capacitación de equipos",
                "Análisis de métricas de conversión",
                "Técnicas de cierre de ventas"
            ],
            color: "from-purple-500 to-pink-600"
        },
        {
            icon: Users,
            title: "Talleres de Ventas",
            description: "Capacitamos a tu equipo con técnicas avanzadas de ventas para aumentar significativamente tus resultados comerciales.",
            features: [
                "Técnicas de prospección",
                "Manejo de objeciones",
                "Presentación efectiva de productos",
                "Negociación estratégica",
                "Seguimiento y fidelización"
            ],
            color: "from-orange-500 to-red-600"
        },
        {
            icon: Target,
            title: "Estrategias Comerciales",
            description: "Desarrollamos estrategias comerciales personalizadas que se adaptan a tu mercado y objetivos específicos.",
            features: [
                "Análisis de mercado",
                "Segmentación de clientes",
                "Estrategias de pricing",
                "Planes de crecimiento",
                "Competitive intelligence"
            ],
            color: "from-teal-500 to-cyan-600"
        },
        {
            icon: ShoppingCart,
            title: "Análisis de Compras Inteligentes",
            description: "Optimizamos tus procesos de compra para reducir costos, mejorar la calidad y aumentar la eficiencia operativa.",
            features: [
                "Análisis de proveedores",
                "Negociación estratégica",
                "Optimización de inventarios",
                "Reducción de costos",
                "Mejora de procesos de compra"
            ],
            color: "from-indigo-500 to-purple-600"
        },
        {
            icon: Palette,
            title: "Diseño de Identidad Corporativa",
            description: "Transformamos la apariencia física de tu empresa con diseños modernos que reflejan profesionalismo y confianza.",
            features: [
                "Diseño de espacios comerciales",
                "Identidad visual corporativa",
                "Señalización y branding",
                "Ambientación profesional",
                "Optimización de espacios de trabajo"
            ],
            color: "from-pink-500 to-rose-600"
        },
        {
            icon: Building,
            title: "Consultoría Empresarial Integral",
            description: "Ofrecemos asesoramiento completo para el crecimiento y desarrollo sostenible de tu empresa.",
            features: [
                "Análisis organizacional",
                "Mejora de procesos internos",
                "Capacitación de personal",
                "Implementación de tecnologías",
                "Planificación estratégica"
            ],
            color: "from-slate-500 to-gray-600"
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative py-20 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 overflow-hidden">
                {/* Background Pattern */}
                <div 
                    className="absolute inset-0 opacity-20"
                    style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                    }}
                ></div>

                <div className="relative z-10 max-w-7xl mx-auto px-6 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                    >
                        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                            Nuestros <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Servicios</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-blue-100 mb-8 max-w-4xl mx-auto leading-relaxed">
                            Soluciones integrales para transformar y potenciar tu empresa
                        </p>
                        <p className="text-lg text-gray-300 mb-12 max-w-3xl mx-auto">
                            Desde asesoría financiera hasta diseño corporativo, ofrecemos todo lo que necesitas para llevar tu negocio al siguiente nivel
                        </p>
                    </motion.div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl"></div>
            </section>

            {/* Services Grid */}
            <section className="py-20 bg-gray-50">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                            Servicios Especializados
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Cada servicio está diseñado para generar resultados tangibles y duraderos en tu empresa
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {services.map((service, index) => (
                            <motion.div
                                key={service.title}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: index * 0.1 }}
                                className="bg-white rounded-2xl p-8 shadow-lg hover:shadow-xl transition-all duration-300 group"
                            >
                                <div className="flex items-center mb-6">
                                    <div className={`bg-gradient-to-r ${service.color} p-3 rounded-xl mr-4 group-hover:scale-110 transition-transform duration-300`}>
                                        <service.icon className="text-white" size={32} />
                                    </div>
                                    <h3 className="text-xl font-bold text-slate-900">{service.title}</h3>
                                </div>
                                
                                <p className="text-gray-600 mb-6 leading-relaxed">
                                    {service.description}
                                </p>
                                
                                <ul className="space-y-3">
                                    {service.features.map((feature, featureIndex) => (
                                        <li key={featureIndex} className="flex items-center text-gray-700">
                                            <div className="w-2 h-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mr-3"></div>
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Process Section */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                            Nuestro Proceso de Trabajo
                        </h2>
                        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                            Un enfoque sistemático que garantiza resultados excepcionales
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-4 gap-8">
                        {[
                            {
                                step: "01",
                                title: "Análisis",
                                description: "Evaluamos tu situación actual y identificamos oportunidades de mejora"
                            },
                            {
                                step: "02", 
                                title: "Estrategia",
                                description: "Desarrollamos un plan personalizado adaptado a tus objetivos"
                            },
                            {
                                step: "03",
                                title: "Implementación",
                                description: "Ejecutamos las soluciones con seguimiento continuo"
                            },
                            {
                                step: "04",
                                title: "Optimización",
                                description: "Monitoreamos resultados y ajustamos para maximizar el impacto"
                            }
                        ].map((step, index) => (
                            <motion.div
                                key={step.step}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: index * 0.2 }}
                                className="text-center group"
                            >
                                <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-white font-bold text-xl">{step.step}</span>
                                </div>
                                <h3 className="text-xl font-bold text-slate-900 mb-4">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                            </motion.div>
                        ))}
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
                            ¿Listo para Transformar tu Empresa?
                        </h2>
                        <p className="text-xl text-blue-100 mb-8 max-w-3xl mx-auto leading-relaxed">
                            Contáctanos hoy mismo y descubre cómo nuestros servicios pueden impulsar el crecimiento de tu negocio
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-8 py-4 rounded-full text-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <Briefcase className="inline-block mr-2" size={20} />
                                Solicitar Consulta Gratuita
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-slate-900 transition-all duration-300">
                                <Phone className="inline-block mr-2" size={20} />
                                Contactar Ahora
                            </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mt-16">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400 mb-2">8+</div>
                                <div className="text-blue-200">Servicios Especializados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400 mb-2">100%</div>
                                <div className="text-blue-200">Resultados Garantizados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-400 mb-2">24/7</div>
                                <div className="text-blue-200">Soporte Continuo</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>
        </div>
    );
};

export default ServicesPage;
