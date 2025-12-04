export const farmacias: string[] = [
    'santa elena',
    'milagro norte',
    'san martin',
    'sur america',
    'las alicias',
    'san carlos',
    'san ignacio',
    'rapifarma'
];
export interface PuntoVenta {
  banco: string;
  puntoDebito: number;
  puntoCredito: number;
}

export interface CuadreCaja {
    dia: string; // formato: 'YYYY-MM-DD'
    cajaNumero: number;
    tasa: number; // tasa de cambio BS a USD
    turno: string;
    cajero: string;
    totalCajaSistemaBs: number;
    devolucionesBs: number;
    recargaBs: number;
    pagomovilBs: number;
    puntosVenta?: PuntoVenta[];
    efectivoBs: number;
    totalBs: number;
    totalBsEnUsd: number;
    efectivoUsd: number;
    zelleUsd: number;
    totalGeneralUsd: number;
    diferenciaUsd: number;
    sobranteUsd?: number;
    faltanteUsd?: number;
    delete: boolean; // <--- NUEVO CAMPO
    estado?: string;
    nombreFarmacia?: string;
    puntoDebitoBs?: number; // Propiedad opcional para punto débito en bolívares
    puntoCreditoBs?: number; // Propiedad opcional para punto crédito en bolívares
}

// Ejemplo de data
export const cuadreCajasSantaElena: CuadreCaja[] = [
    {
        dia: '2025-05-18',
        cajaNumero: 1,
        tasa: 40.5,
        turno: 'Mañana',
        cajero: 'Juan Pérez',
        totalCajaSistemaBs: 40500,
        devolucionesBs: 500,
        recargaBs: 1000,
        pagomovilBs: 5000,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 8000, puntoCredito: 2000 },
            { banco: 'Banco2', puntoDebito: 7000, puntoCredito: 1500 }
        ],
        efectivoBs: 24000,
        totalBs: 40500,
        totalBsEnUsd: 1000,
        efectivoUsd: 200,
        zelleUsd: 800,
        totalGeneralUsd: 1000,
        diferenciaUsd: 0,
        delete: false // <--- IMPORTANTE
    },
    {
        dia: '2025-05-18',
        cajaNumero: 2,
        tasa: 41.0,
        turno: 'Tarde',
        cajero: 'María Gómez',
        totalCajaSistemaBs: 50000,
        devolucionesBs: 1000,
        recargaBs: 2000,
        pagomovilBs: 7000,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 9000, puntoCredito: 3000 },
            { banco: 'Banco2', puntoDebito: 8000, puntoCredito: 2000 }
        ],
        efectivoBs: 28000,
        totalBs: 50000,
        totalBsEnUsd: 1219.51,
        efectivoUsd: 300,
        zelleUsd: 900,
        totalGeneralUsd: 1200,
        diferenciaUsd: -19.51,
        sobranteUsd: 0,
        faltanteUsd: 19.51,
        delete: false
    },
    {
        dia: '2025-05-18',
        cajaNumero: 3,
        tasa: 39.8,
        turno: 'Noche',
        cajero: 'Luis Rodríguez',

        totalCajaSistemaBs: 32000,
        devolucionesBs: 300,
        recargaBs: 800,
        pagomovilBs: 4000,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 6000, puntoCredito: 1200 },
            { banco: 'Banco2', puntoDebito: 5000, puntoCredito: 1000 }
        ],
        efectivoBs: 19700,
        totalBs: 32000,
        totalBsEnUsd: 804.02,

        efectivoUsd: 100,
        zelleUsd: 700,

        totalGeneralUsd: 800,
        diferenciaUsd: -4.02,
        sobranteUsd: 0,
        faltanteUsd: 4.02,
        delete: false
    },
    {
        dia: '2025-05-18',
        cajaNumero: 1,
        tasa: 40.0,
        turno: 'Mañana',
        cajero: 'Ana Torres',

        totalCajaSistemaBs: 45000,
        devolucionesBs: 600,
        recargaBs: 1500,
        pagomovilBs: 6000,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 10000, puntoCredito: 2500 },
            { banco: 'Banco2', puntoDebito: 9000, puntoCredito: 2000 }
        ],
        efectivoBs: 24400,
        totalBs: 45000,
        totalBsEnUsd: 1125,

        efectivoUsd: 400,
        zelleUsd: 700,

        totalGeneralUsd: 1100,
        diferenciaUsd: -25,
        sobranteUsd: 0,
        faltanteUsd: 25,
        delete: false
    }
];

export const cuadreCajasMilagroNorte: CuadreCaja[] = [
    {
        dia: '2025-05-18',
        cajaNumero: 1,
        tasa: 40.7,
        turno: 'Mañana',
        cajero: 'Pedro López',
        totalCajaSistemaBs: 38000,
        devolucionesBs: 400,
        recargaBs: 900,
        pagomovilBs: 4500,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 7000, puntoCredito: 1800 },
            { banco: 'Banco2', puntoDebito: 6000, puntoCredito: 1500 }
        ],
        efectivoBs: 23800,
        totalBs: 38000,
        totalBsEnUsd: 933.66,
        efectivoUsd: 150,
        zelleUsd: 780,
        totalGeneralUsd: 930,
        diferenciaUsd: -3.66,
        sobranteUsd: 0,
        faltanteUsd: 3.66,
        delete: false
    },
    {
        dia: '2025-05-18',
        cajaNumero: 2,
        tasa: 41.2,
        turno: 'Tarde',
        cajero: 'Sofía Martínez',

        totalCajaSistemaBs: 42000,

        devolucionesBs: 700,
        recargaBs: 1200,
        pagomovilBs: 5200,
        puntosVenta: [
            { banco: 'Banco1', puntoDebito: 8200, puntoCredito: 2100 },
            { banco: 'Banco2', puntoDebito: 7000, puntoCredito: 1500 }
        ],
        efectivoBs: 25300,
        totalBs: 42000,
        totalBsEnUsd: 1019.42,

        efectivoUsd: 200,
        zelleUsd: 820,

        totalGeneralUsd: 1020,
        diferenciaUsd: 0.58,
        sobranteUsd: 0.58,
        faltanteUsd: 0,
        delete: false
    }
];

export interface Usuario {
    id: number;
    nombre: string;
    cargo: string;
    correo: string;
    contraseña: string;
    permisos: string[]; // Ejemplo: ['admin', 'ver_cuadres']
    accesos: string[];  // Ejemplo: ['santa elena', 'milagro norte']
}

export const usuarios: Usuario[] = [
    {
        id: 1,
        nombre: "Carlos Pérez",
        cargo: "Administrador General",
        correo: "admin@rapifarma.com",
        contraseña: "admin123",
        permisos: ["admin", "ver_cuadres", "eliminar_cuadres","añadir_cuadres"],
        accesos: ["santa elena", "milagro norte", "san martin", "sur america", "las alicias", "san carlos", "san ignacio", "rapifarma"]
    },
    {
        id: 2,
        nombre: "María González",
        cargo: "Supervisor Santa Elena",
        correo: "santaelena@rapifarma.com",
        contraseña: "supervisor1",
        permisos: ["ver_cuadres", "añadir_cuadres"],
        accesos: ["santa elena"]
    },
    {
        id: 3,
        nombre: "Pedro López",
        cargo: "Cajero",
        correo: "milagronorte@rapifarma.com",
        contraseña: "cajero123",
        permisos: ["ver_cuadres", "añadir_cuadres"],
        accesos: ["milagro norte"]
    }
];

