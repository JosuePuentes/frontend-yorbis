---
applyTo: '**/*.ts'
---
# Guía de Componentes Funcionales: React, TypeScript, Tailwind CSS

Esta guía es para crear **componentes funcionales en React** utilizando **TypeScript** para tipado seguro, **Tailwind CSS** para estilización y **React-Icons** para los íconos. Anime.js se puede integrar para animaciones.

## 1. Fundamentos de los Componentes

Un componente funcional en React con TypeScript define su estructura y sus propiedades (`props`) de manera explícita. Esto asegura que los datos que recibe el componente estén bien definidos y facilita la detección de errores. Las `props` son tipadas usando interfaces, lo que mejora la claridad y el mantenimiento del código.

## 2. Estilización con Tailwind CSS

**Tailwind CSS** se integra directamente en el JSX de React usando el atributo `className`. Permite aplicar estilos de forma rápida y flexible, utilizando clases utilitarias para espaciado (`p-4`), colores (`bg-blue-500`), tipografía (`text-xl`, `font-bold`), y diseño (`flex`, `items-center`). Para el **diseño responsivo**, usa prefijos como `sm:`, `md:`, `lg:`, y para los **estados interactivos** (como `hover` o `focus`), utiliza prefijos como `hover:` o `focus:`.

## 3. Integración de Íconos con React-Icons

**React-Icons** simplifica la adición de íconos al permitir importarlos como componentes de React. Después de la instalación (`npm install react-icons`), simplemente importa el ícono deseado de la colección correspondiente (ej. `FaPlus` de `react-icons/fa`) y úsalo como un componente normal, pasándole propiedades como `size` o `color` si es necesario.

## 4. Animaciones con Anime.js

Para integrar **Anime.js** en componentes funcionales de React, utiliza el hook `useRef` para obtener una referencia directa al elemento DOM que deseas animar. Luego, dentro de un `useEffect`, puedes llamar a las funciones de Anime.js (`animate`, `createTimeline`, `stagger`) y configurarlas para que se ejecuten cuando el componente se monte o cuando cambien ciertas dependencias. Consulta tu guía específica de Anime.js para detalles sobre sus funciones y parámetros.

## 5. Ejemplo General de Componente Integrado

Este ejemplo muestra un componente `BotonAnimado` que combina **React**, **TypeScript**, **Tailwind CSS**, **React-Icons** y una integración básica para **Anime.js**.

// src/components/BotonAnimado/BotonAnimado.tsx
import React, { useRef, useEffect } from 'react';
import { FaPlus } from 'react-icons/fa'; // Ícono de Font Awesome
import { animate } from 'animejs'; // Importa animate de Anime.js

// 1. Define las propiedades del componente con TypeScript
interface BotonAnimadoProps {
  texto: string;
  onClick: () => void;
  // Puedes añadir más props si el icono fuera dinámico o necesite color/tamaño
}

const BotonAnimado: React.FC<BotonAnimadoProps> = ({ texto, onClick }) => {
  // Crea una referencia para el elemento HTML que se animará
  const botonRef = useRef<HTMLButtonElement>(null);

  // 4. Usa useEffect para ejecutar la animación de Anime.js
  useEffect(() => {
    if (botonRef.current) {
      animate({
        targets: botonRef.current,
        // Propiedades de animación: escala, duración, easing
        scale: [1, 1.05, 1], // Escala el botón ligeramente al 105% y vuelve a 100%
        duration: 800,
        easing: 'easeInOutQuad',
        loop: true, // Animación en bucle
        direction: 'alternate', // Alterna la dirección del bucle
      });
    }
  }, []); // Array de dependencias vacío para que se ejecute solo al montar

  return (
    // 2. Aplica estilos con Tailwind CSS directamente en el className
    <button
      ref={botonRef} // Asocia la referencia al botón
      onClick={onClick}
      className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg shadow-md
                 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-opacity-75
                 transition-all duration-300 ease-in-out
                 flex items-center justify-center space-x-2" // Clases para layout y espaciado
    >
      {/* 3. Usa un componente de React-Icons */}
      <FaPlus size={18} />
      <span>{texto}</span>
    </button>
  );
};

export default BotonAnimado;

// Ejemplo de uso en otro componente (ej. App.tsx):
/*
import BotonAnimado from './components/BotonAnimado/BotonAnimado';

function App() {
  const handleClick = () => {
    console.log('Botón clicado!');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <BotonAnimado texto="Añadir Nuevo" onClick={handleClick} />
    </div>
  );
}

export default App;
*/
