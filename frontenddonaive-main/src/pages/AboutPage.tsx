const AboutPage: React.FC = () => {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-yellow-50 py-20">
            <div className="max-w-7xl mx-auto px-6">
                <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-blue-900 mb-6 text-center">
                        Sobre Ferrería Los Puentes
                    </h1>
                    <div className="prose prose-lg max-w-none">
                        <p className="text-xl text-gray-700 mb-6 leading-relaxed">
                            <strong>Ferrería Los Puentes</strong> es tu socio de confianza en materiales de construcción y ferretería. 
                            Nos especializamos en ofrecer productos de la más alta calidad para todos tus proyectos de construcción.
                        </p>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Con años de experiencia en el mercado, nos hemos consolidado como una de las ferreterías más confiables, 
                            ofreciendo una amplia variedad de materiales, herramientas y equipos especializados.
                        </p>
                        <h2 className="text-2xl font-bold text-blue-900 mt-8 mb-4">Nuestra Misión</h2>
                        <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                            Proporcionar a nuestros clientes los mejores productos y servicios en materiales de construcción, 
                            con atención personalizada y asesoría técnica especializada para garantizar el éxito de sus proyectos.
                        </p>
                        <h2 className="text-2xl font-bold text-blue-900 mt-8 mb-4">Nuestros Valores</h2>
                        <ul className="list-disc list-inside text-lg text-gray-600 space-y-2">
                            <li>Calidad garantizada en todos nuestros productos</li>
                            <li>Atención al cliente excepcional</li>
                            <li>Asesoría técnica profesional</li>
                            <li>Precios competitivos y justos</li>
                            <li>Compromiso con la satisfacción del cliente</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AboutPage;