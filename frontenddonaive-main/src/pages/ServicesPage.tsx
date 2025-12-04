import { motion } from 'framer-motion';
import { TrendingUp, Globe, Users, Target, Phone, ShoppingCart, Building, Palette, Briefcase } from 'lucide-react';

const ServicesPage: React.FC = () => {
    const services = [
        {
            icon: ShoppingCart,
            title: "Materiales de Construcción",
            description: "Amplia variedad de materiales de construcción de primera calidad para todos tus proyectos.",
            features: [
                "Cemento, bloques y ladrillos",
                "Acero y estructuras metálicas",
                "Pinturas y acabados",
                "Materiales eléctricos",
                "Plomería y sanitarios"
            ],
            color: "from-yellow-400 to-yellow-500"
        },
        {
            icon: Building,
            title: "Herramientas y Equipos",
            description: "Herramientas profesionales y equipos especializados para construcción y mantenimiento.",
            features: [
                "Herramientas manuales",
                "Equipos eléctricos",
                "Maquinaria de construcción",
                "Equipos de seguridad",
                "Herramientas de medición"
            ],
            color: "from-blue-500 to-blue-600"
        },
        {
            icon: Target,
            title: "Asesoría Técnica",
            description: "Asesoría especializada para ayudarte a elegir los mejores productos para tu proyecto.",
            features: [
                "Consultoría en materiales",
                "Cálculo de cantidades",
                "Recomendaciones técnicas",
                "Soporte en obra",
                "Soluciones personalizadas"
            ],
            color: "from-yellow-400 to-yellow-500"
        },
        {
            icon: Users,
            title: "Atención Personalizada",
            description: "Servicio al cliente excepcional con personal capacitado para atender todas tus necesidades.",
            features: [
                "Atención especializada",
                "Asesoría en productos",
                "Cotizaciones rápidas",
                "Seguimiento de pedidos",
                "Soporte post-venta"
            ],
            color: "from-blue-500 to-blue-600"
        },
        {
            icon: TrendingUp,
            title: "Productos de Calidad",
            description: "Garantizamos productos de la más alta calidad de las mejores marcas del mercado.",
            features: [
                "Marcas reconocidas",
                "Garantía de calidad",
                "Control de inventario",
                "Productos certificados",
                "Calidad garantizada"
            ],
            color: "from-yellow-400 to-yellow-500"
        },
        {
            icon: Phone,
            title: "Entrega Rápida",
            description: "Servicio de entrega eficiente para que recibas tus productos cuando los necesites.",
            features: [
                "Entrega a domicilio",
                "Servicio express",
                "Cobertura amplia",
                "Tiempos de entrega garantizados",
                "Seguimiento en tiempo real"
            ],
            color: "from-blue-500 to-blue-600"
        }
    ];

    return (
        <div className="min-h-screen bg-white">
            {/* Hero Section */}
            <section className="relative py-20 bg-gradient-to-br from-blue-600 via-blue-500 to-yellow-400 overflow-hidden">
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
                            Nuestros <span className="bg-gradient-to-r from-yellow-300 to-yellow-500 bg-clip-text text-transparent">Servicios</span>
                        </h1>
                        <p className="text-xl md:text-2xl text-white mb-8 max-w-4xl mx-auto leading-relaxed font-semibold">
                            Soluciones integrales en materiales de construcción y ferretería
                        </p>
                        <p className="text-lg text-white/90 mb-12 max-w-3xl mx-auto">
                            Todo lo que necesitas para tus proyectos de construcción, desde materiales hasta herramientas y asesoría especializada
                        </p>
                    </motion.div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-20 left-10 w-20 h-20 bg-yellow-400/30 rounded-full blur-xl"></div>
                <div className="absolute bottom-20 right-10 w-32 h-32 bg-blue-500/30 rounded-full blur-xl"></div>
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
                        <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
                            Servicios Especializados
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto">
                            Cada servicio está diseñado para satisfacer todas tus necesidades en construcción y ferretería
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
                                            <div className={`w-2 h-2 ${service.color.includes('yellow') ? 'bg-yellow-500' : 'bg-blue-500'} rounded-full mr-3"></div>
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
                        <h2 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6">
                            Nuestro Proceso de Trabajo
                        </h2>
                        <p className="text-xl text-gray-700 max-w-3xl mx-auto">
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
                                <div className="bg-gradient-to-r from-blue-500 to-yellow-400 p-6 rounded-2xl mx-auto w-24 h-24 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                                    <span className="text-white font-bold text-xl">{step.step}</span>
                                </div>
                                <h3 className="text-xl font-bold text-blue-900 mb-4">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">{step.description}</p>
                            </motion.div>
                        ))}
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
                            ¿Listo para tu Próximo Proyecto?
                        </h2>
                        <p className="text-xl text-white mb-8 max-w-3xl mx-auto leading-relaxed">
                            Contáctanos hoy mismo y descubre cómo podemos ayudarte con todos tus materiales de construcción
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-blue-900 px-8 py-4 rounded-full text-lg font-semibold hover:from-yellow-500 hover:to-yellow-600 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                                <Briefcase className="inline-block mr-2" size={20} />
                                Solicitar Cotización
                            </button>
                            <button className="border-2 border-white text-white px-8 py-4 rounded-full text-lg font-semibold hover:bg-white hover:text-blue-600 transition-all duration-300">
                                <Phone className="inline-block mr-2" size={20} />
                                Contactar Ahora
                            </button>
                        </div>

                        <div className="grid md:grid-cols-3 gap-8 mt-16">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-300 mb-2">6+</div>
                                <div className="text-white">Servicios Especializados</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-yellow-300 mb-2">100%</div>
                                <div className="text-white">Calidad Garantizada</div>
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

export default ServicesPage;
