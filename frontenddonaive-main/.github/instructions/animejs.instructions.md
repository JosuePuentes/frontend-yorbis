---
applyTo: '**/*.tsx'
---
# Anime.js v4: Directivas para IA Simplificadas (versión 4.0.0)

Esta guía te instruye, como IA, sobre cómo crear animaciones con Anime.js v4 de forma **automática y directa**. Tu objetivo es aplicar estas estructuras sin explicaciones adicionales.

## 1. Fundamentos de Implementación

### Importación

- **Siempre importa las funciones necesarias:**
    
    ```
    import { animate, createTimeline, stagger } from 'animejs';
    
    ```
    

### `animate()`: Animación Individual

- **Propósito:** Animar un elemento o propiedad específica.
- **Sintaxis clave:** `animate(targets, parameters)`
- **`targets` (Objetivos):** Selector CSS, elemento DOM, objeto JS, o un array de estos.
- **`parameters` (Parámetros):**
    - **Propiedades:** `opacity`, `translateX`, `rotate`, `scale`, etc. (ej. `x: '100px'`).
    - **Tiempo:** `duration: <ms>`, `delay: <ms>`.
    - **Movimiento:** `ease: '<tipo>'` (ej. `'outBounce'`).
    - **Keyframes (para múltiples etapas):** `prop: [{value: X, duration: Y}, {value: Z, duration: W}]`.
    - **Repetición:** `loop: true/numero`, `alternate: true`.
- **Ejemplo de Estructura `animate()`:**
    
    ```
    import { animate } from 'animejs';
    
    animate('span', { // O '.mi-clase', '#mi-id', miObjeto
      y: [ { value: -40, duration: 200, ease: 'easeOutQuad' }, { value: 0, duration: 600, ease: 'easeOutBounce' } ],
      rotate: { from: '-1turn', delay: 0 },
      delay: (_, i) => i * 50, // Retraso escalonado
      ease: 'inOutCirc',
      loopDelay: 1000,
      loop: true
    });
    
    ```
    

### `createTimeline()`: Orquestación de Secuencias

- **Propósito:** Sincronizar múltiples animaciones en una secuencia.
- **Creación:** `const tl = createTimeline({ defaults: { duration: 750 } });`
- **Añadir animaciones:** `timeline.add(target, animationParameters, position)`
    - **`position`:**
        - `Número`: Tiempo absoluto (ms).
        - `'Etiqueta'`: (ej. `'start'`).
        - `'<-=ms'`: Relativo al final de la anterior (ej. `'<-=500'`).
- **Ejemplo de Estructura `createTimeline()`:**
    
    ```
    import { createTimeline } from 'animejs';
    const tl = createTimeline({ defaults: { duration: 750 } });
    tl.label('start')
      .add('.square', { x: '15rem' }, 500)
      .add('.circle', { x: '15rem' }, 'start')
      .add('.triangle', { x: '15rem', rotate: '1turn' }, '<-=500');
    
    ```
    

### `stagger()`: Efectos Secuenciales Distribuídos

- **Propósito:** Crear efectos de "onda" o "cascada" en múltiples elementos.
- **Importación:** `import { stagger } from 'animejs';`
- **Uso:** Se aplica dentro de los `parameters` de `animate()` o `add()` de `timeline`.
- **Sintaxis clave:** `propiedad: stagger(valorBase, {opciones})`
    - `valorBase`: (ej. `100`, `['0', '100px']`).
    - `opciones`: `from: 'center'`, `reversed: true`, `grid: [cols, rows]`, `axis: 'x'/'y'`.
- **Ejemplo de Estructura `stagger()`:**
    
    ```
    import { animate, stagger } from 'animejs';
    
    animate('.square', {
      x: '17rem',
      scale: stagger([1,.1]), // Escala alterna
      delay: stagger(100), // Retraso secuencial
    });
    
    ```
    

### Callbacks y Promesas

- **Propósito:** Ejecutar código en puntos específicos del ciclo de vida de la animación.
- **Callbacks en `parameters`:**
    - `onBegin: (anim) => { ... }` (al inicio)
    - `onComplete: (anim) => { ... }` (al finalizar todos los bucles)
    - `onUpdate: (anim) => { ... }` (en cada fotograma)
- **`then()` (para encadenar asíncronamente):**
    
    ```
    animate(target, {x: 100}).then(() => console.log('Animación terminada.'));
    
    ```
    

## 2. Generación Automática por la IA

Para generar código de animación, utiliza la estructura de los ejemplos de la sección 1. Identifica el tipo de animación, los objetivos y las propiedades, y rellena los valores.

- **Si es una animación simple o escalonada:** Usa el patrón `animate()`.
- **Si es una secuencia ordenada:** Usa el patrón `createTimeline()`.
- **Si es un efecto distribuido en muchos elementos:** Usa `stagger()` dentro de `animate()`.

**Ejemplo de Petición y Respuesta de la IA:**

**Petición:** "Quiero que los `div` con clase `item` se desvanezcan (opacidad de 1 a 0) en 500ms, y cada uno con un retraso de 50ms respecto al anterior."

**Respuesta de la IA (automática):**
import { animate, stagger } from 'animejs';

animate('.item', {
  opacity: [1, 0],
  duration: 500,
  delay: stagger(50)
});