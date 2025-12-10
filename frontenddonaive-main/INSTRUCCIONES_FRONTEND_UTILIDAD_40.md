# 📋 INSTRUCCIONES FRONTEND: Utilidad del 40%

## 📌 CONTEXTO

Este documento describe cómo implementar y mostrar la utilidad del 40% en las interfaces del frontend. La utilidad puede venir como porcentaje o como monto en dinero, y el frontend debe calcular correctamente los precios de venta.

---

## 🎯 CONCEPTOS CLAVE

### Tipos de Utilidad

1. **Utilidad como Porcentaje** (0-100%):
   - Ejemplo: 40% significa que el precio de venta es 40% más que el costo
   - Fórmula: `Precio = Costo × (1 + Utilidad% / 100)`
   - Ejemplo: Costo = $10, Utilidad = 40% → Precio = $10 × 1.40 = $14.00

2. **Utilidad como Monto en Dinero**:
   - Ejemplo: $4.00 significa que el precio de venta es costo + $4.00
   - Fórmula: `Precio = Costo + Utilidad`
   - Ejemplo: Costo = $10, Utilidad = $4.00 → Precio = $14.00

3. **Utilidad Contable** (utilidad_contable):
   - Es la diferencia entre precio y costo: `Utilidad Contable = Precio - Costo`
   - Se calcula después de establecer el precio

---

## 💻 EJEMPLOS DE CÓDIGO REACT/TYPESCRIPT

### 1. Función para Calcular Precio desde Utilidad

```typescript
/**
 * Calcula el precio de venta desde el costo y la utilidad
 * @param costo - Costo del producto
 * @param utilidad - Utilidad (puede ser porcentaje 0-100 o monto en dinero)
 * @returns Precio de venta calculado
 */
function calcularPrecioDesdeUtilidad(costo: number, utilidad: number): number {
  if (costo <= 0) return 0;
  
  // Si la utilidad es un porcentaje (0-100)
  if (utilidad > 0 && utilidad <= 100) {
    return costo * (1 + utilidad / 100);
  }
  
  // Si la utilidad es un monto en dinero (> 100 o negativo)
  if (utilidad > 100) {
    return costo + utilidad;
  }
  
  // Si no hay utilidad, retornar el costo
  return costo;
}

// Ejemplos de uso:
const precio1 = calcularPrecioDesdeUtilidad(10, 40); // 40% → $14.00
const precio2 = calcularPrecioDesdeUtilidad(10, 4); // $4.00 → $14.00
const precio3 = calcularPrecioDesdeUtilidad(10, 150); // $150.00 → $160.00
```

### 2. Función para Detectar Tipo de Utilidad

```typescript
/**
 * Detecta si la utilidad es un porcentaje o un monto en dinero
 * @param utilidad - Valor de la utilidad
 * @returns 'porcentaje' | 'monto'
 */
function detectarTipoUtilidad(utilidad: number): 'porcentaje' | 'monto' {
  if (utilidad > 0 && utilidad <= 100) {
    return 'porcentaje';
  }
  return 'monto';
}

// Ejemplos:
detectarTipoUtilidad(40); // 'porcentaje'
detectarTipoUtilidad(4); // 'porcentaje' (aunque podría ser monto, se asume %)
detectarTipoUtilidad(150); // 'monto'
```

### 3. Componente React para Mostrar Utilidad

```tsx
import React from 'react';

interface ProductoUtilidadProps {
  costo: number;
  utilidad: number;
  precio?: number; // Precio calculado o definido
  mostrarDetalle?: boolean;
}

const ProductoUtilidad: React.FC<ProductoUtilidadProps> = ({
  costo,
  utilidad,
  precio,
  mostrarDetalle = false
}) => {
  // Calcular precio si no viene
  const precioCalculado = precio || calcularPrecioDesdeUtilidad(costo, utilidad);
  const tipoUtilidad = detectarTipoUtilidad(utilidad);
  const utilidadEnDinero = tipoUtilidad === 'porcentaje' 
    ? (costo * utilidad / 100) 
    : utilidad;

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-gray-600">Costo:</span>
        <span className="font-semibold">${costo.toFixed(2)}</span>
      </div>
      
      {mostrarDetalle && (
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-500">
            Utilidad ({tipoUtilidad === 'porcentaje' ? `${utilidad}%` : 'Monto'}):
          </span>
          <span className="text-green-600 font-medium">
            {tipoUtilidad === 'porcentaje' 
              ? `$${utilidadEnDinero.toFixed(2)} (${utilidad}%)`
              : `$${utilidad.toFixed(2)}`
            }
          </span>
        </div>
      )}
      
      <div className="flex justify-between items-center border-t pt-2">
        <span className="text-gray-700 font-medium">Precio de Venta:</span>
        <span className="text-lg font-bold text-blue-600">
          ${precioCalculado.toFixed(2)}
        </span>
      </div>
    </div>
  );
};

export default ProductoUtilidad;
```

### 4. Hook Personalizado para Utilidad

```typescript
import { useMemo } from 'react';

interface UseUtilidadProps {
  costo: number;
  utilidad?: number;
  utilidadContable?: number;
  porcentajeGanancia?: number;
  precio?: number;
}

export function useUtilidad({
  costo,
  utilidad,
  utilidadContable,
  porcentajeGanancia,
  precio
}: UseUtilidadProps) {
  const resultado = useMemo(() => {
    // Si ya hay precio definido, usarlo
    if (precio && precio > 0) {
      const utilidadCalc = precio - costo;
      const porcentajeCalc = costo > 0 ? (utilidadCalc / costo) * 100 : 0;
      return {
        precio,
        utilidad: utilidadCalc,
        porcentaje: porcentajeCalc,
        tipo: 'definido' as const
      };
    }

    // Intentar usar utilidad proporcionada
    const utilidadFinal = utilidad || utilidadContable || 0;
    const porcentajeFinal = porcentajeGanancia || 0;

    // Si hay porcentaje de ganancia, calcular precio
    if (porcentajeFinal > 0 && porcentajeFinal < 100) {
      const precioCalc = costo / (1 - porcentajeFinal / 100);
      return {
        precio: precioCalc,
        utilidad: precioCalc - costo,
        porcentaje: porcentajeFinal,
        tipo: 'porcentaje' as const
      };
    }

    // Si hay utilidad, calcular precio
    if (utilidadFinal > 0) {
      const tipoUtilidad = detectarTipoUtilidad(utilidadFinal);
      const precioCalc = calcularPrecioDesdeUtilidad(costo, utilidadFinal);
      return {
        precio: precioCalc,
        utilidad: tipoUtilidad === 'porcentaje' 
          ? (costo * utilidadFinal / 100)
          : utilidadFinal,
        porcentaje: tipoUtilidad === 'porcentaje'
          ? utilidadFinal
          : (costo > 0 ? (utilidadFinal / costo) * 100 : 0),
        tipo: tipoUtilidad
      };
    }

    // Si no hay nada, retornar costo
    return {
      precio: costo,
      utilidad: 0,
      porcentaje: 0,
      tipo: 'sin_utilidad' as const
    };
  }, [costo, utilidad, utilidadContable, porcentajeGanancia, precio]);

  return resultado;
}

// Ejemplo de uso:
const { precio, utilidad, porcentaje, tipo } = useUtilidad({
  costo: 10,
  utilidad: 40 // 40%
});
// Resultado: precio = 14, utilidad = 4, porcentaje = 40, tipo = 'porcentaje'
```

---

## 📊 ESTRUCTURA DE TABLA RECOMENDADA

### Tabla de Productos con Utilidad

```tsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Código
      </th>
      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Descripción
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Costo
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Utilidad
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Precio Venta
      </th>
      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Stock
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {productos.map((producto) => {
      const costo = Number(producto.costo_unitario || producto.costo || 0);
      const utilidad = Number(producto.utilidad || producto.utilidad_contable || 0);
      const porcentajeGanancia = Number(producto.porcentaje_ganancia || producto.utilidad_porcentaje || 0);
      const precio = Number(producto.precio_unitario || producto.precio || producto.precio_venta || 0);
      
      const { precio: precioFinal, utilidad: utilidadFinal, porcentaje } = useUtilidad({
        costo,
        utilidad,
        porcentajeGanancia,
        precio
      });

      return (
        <tr key={producto.id} className="hover:bg-gray-50">
          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
            {producto.codigo}
          </td>
          <td className="px-6 py-4 text-sm text-gray-900">
            {producto.descripcion || producto.nombre}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
            ${costo.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
            <div className="flex flex-col items-end">
              <span className="text-green-600 font-medium">
                ${utilidadFinal.toFixed(2)}
              </span>
              <span className="text-xs text-gray-500">
                ({porcentaje.toFixed(1)}%)
              </span>
            </div>
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-blue-600">
            ${precioFinal.toFixed(2)}
          </td>
          <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
            {producto.cantidad || producto.stock || 0}
          </td>
        </tr>
      );
    })}
  </tbody>
</table>
```

---

## 💰 FORMATO DE MONEDA

### Función de Formateo

```typescript
/**
 * Formatea un número como moneda USD
 * @param valor - Valor numérico a formatear
 * @param mostrarSimbolo - Si mostrar el símbolo $ (default: true)
 * @returns String formateado
 */
function formatearMoneda(valor: number, mostrarSimbolo: boolean = true): string {
  if (isNaN(valor) || valor === null || valor === undefined) {
    return mostrarSimbolo ? '$0.00' : '0.00';
  }
  
  const formateado = valor.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  
  return mostrarSimbolo ? `$${formateado}` : formateado;
}

// Ejemplos:
formatearMoneda(14.5); // "$14.50"
formatearMoneda(1000.99); // "$1,000.99"
formatearMoneda(0); // "$0.00"
formatearMoneda(14.5, false); // "14.50"
```

### Componente de Formato de Moneda

```tsx
interface MonedaProps {
  valor: number;
  mostrarSimbolo?: boolean;
  className?: string;
}

const Moneda: React.FC<MonedaProps> = ({ 
  valor, 
  mostrarSimbolo = true,
  className = ''
}) => {
  return (
    <span className={className}>
      {formatearMoneda(valor, mostrarSimbolo)}
    </span>
  );
};

// Uso:
<Moneda valor={14.5} className="font-bold text-blue-600" />
```

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

### Para Tablas de Productos:

- [ ] Mostrar costo unitario del producto
- [ ] Mostrar utilidad (en dinero y porcentaje)
- [ ] Mostrar precio de venta calculado
- [ ] Manejar casos donde utilidad viene como porcentaje (0-100)
- [ ] Manejar casos donde utilidad viene como monto (> 100)
- [ ] Calcular precio automáticamente si no viene definido
- [ ] Formatear todos los valores monetarios con 2 decimales
- [ ] Mostrar indicador visual del tipo de utilidad (porcentaje vs monto)

### Para Formularios de Compra/Inventario:

- [ ] Campo para ingresar costo
- [ ] Campo para ingresar utilidad (porcentaje o monto)
- [ ] Calcular precio automáticamente al cambiar costo o utilidad
- [ ] Mostrar preview del precio calculado
- [ ] Validar que costo sea mayor a 0
- [ ] Validar que utilidad sea mayor o igual a 0
- [ ] Permitir editar precio directamente (sobrescribir cálculo)

### Para Visualización de Resúmenes:

- [ ] Mostrar total de costos
- [ ] Mostrar total de utilidades
- [ ] Mostrar total de precios de venta
- [ ] Calcular margen de ganancia promedio
- [ ] Mostrar estadísticas por categoría/producto

---

## 🎨 ESTILOS SUGERIDOS

### Colores Recomendados:

```css
/* Utilidad positiva */
.utilidad-positiva {
  color: #10b981; /* green-500 */
  font-weight: 500;
}

/* Precio de venta */
.precio-venta {
  color: #2563eb; /* blue-600 */
  font-weight: 600;
  font-size: 1.125rem; /* text-lg */
}

/* Costo */
.costo {
  color: #6b7280; /* gray-500 */
  font-weight: 400;
}

/* Porcentaje de utilidad */
.porcentaje-utilidad {
  color: #059669; /* green-600 */
  font-size: 0.75rem; /* text-xs */
}
```

### Clases Tailwind CSS:

```tsx
// Costo
<span className="text-gray-500">${costo.toFixed(2)}</span>

// Utilidad
<span className="text-green-600 font-medium">
  ${utilidad.toFixed(2)}
</span>
<span className="text-xs text-gray-500">
  ({porcentaje.toFixed(1)}%)
</span>

// Precio de Venta
<span className="text-lg font-bold text-blue-600">
  ${precio.toFixed(2)}
</span>
```

---

## 🔍 CASOS ESPECIALES

### 1. Utilidad del 40% (Porcentaje)

```typescript
const costo = 10;
const utilidad = 40; // 40%
const precio = calcularPrecioDesdeUtilidad(costo, utilidad);
// Resultado: precio = 14.00
// Utilidad en dinero = 4.00
```

### 2. Utilidad Contable (Precio - Costo)

```typescript
const costo = 10;
const precio = 14;
const utilidadContable = precio - costo; // 4.00
const porcentaje = (utilidadContable / costo) * 100; // 40%
```

### 3. Porcentaje de Ganancia (Utilidad Contable)

```typescript
// Si el porcentaje de ganancia es 40%, significa:
// Precio = Costo / (1 - 0.40) = Costo / 0.60
const costo = 10;
const porcentajeGanancia = 40;
const precio = costo / (1 - porcentajeGanancia / 100);
// Resultado: precio = 16.67
// Utilidad = 6.67
```

### 4. Validación de Datos

```typescript
function validarUtilidad(costo: number, utilidad: number): boolean {
  if (costo <= 0) {
    console.error('El costo debe ser mayor a 0');
    return false;
  }
  
  if (utilidad < 0) {
    console.error('La utilidad no puede ser negativa');
    return false;
  }
  
  // Si es porcentaje, debe estar entre 0 y 100
  if (utilidad > 0 && utilidad <= 100) {
    return true; // Es porcentaje válido
  }
  
  // Si es monto, debe ser positivo
  if (utilidad > 100) {
    return true; // Es monto válido
  }
  
  return true; // Utilidad = 0 es válida
}
```

---

## 📝 NOTAS IMPORTANTES

1. **Prioridad de Campos:**
   - Si viene `precio_venta` o `precio_unitario`, usarlo directamente
   - Si no, calcular desde `costo + utilidad`
   - Si `utilidad` es porcentaje (0-100), calcular: `costo × (1 + utilidad/100)`
   - Si `utilidad` es monto (> 100), calcular: `costo + utilidad`

2. **Compatibilidad con Backend:**
   - El backend puede enviar utilidad como `utilidad`, `utilidad_contable`, `porcentaje_ganancia`, o `utilidad_porcentaje`
   - El frontend debe manejar todos estos casos

3. **Redondeo:**
   - Todos los valores monetarios deben redondearse a 2 decimales
   - Usar `toFixed(2)` para mostrar, pero mantener precisión en cálculos

4. **Performance:**
   - Usar `useMemo` para cálculos costosos
   - Cachear resultados de cálculos cuando sea posible

---

## 🚀 EJEMPLO COMPLETO: Componente de Producto

```tsx
import React from 'react';
import { useUtilidad } from '@/hooks/useUtilidad';

interface ProductoCardProps {
  producto: {
    id: string;
    codigo: string;
    nombre: string;
    costo_unitario?: number;
    costo?: number;
    utilidad?: number;
    utilidad_contable?: number;
    porcentaje_ganancia?: number;
    precio_unitario?: number;
    precio?: number;
    precio_venta?: number;
    cantidad?: number;
    stock?: number;
  };
}

const ProductoCard: React.FC<ProductoCardProps> = ({ producto }) => {
  const costo = Number(producto.costo_unitario || producto.costo || 0);
  const { precio, utilidad, porcentaje } = useUtilidad({
    costo,
    utilidad: producto.utilidad,
    utilidadContable: producto.utilidad_contable,
    porcentajeGanancia: producto.porcentaje_ganancia,
    precio: Number(producto.precio_unitario || producto.precio || producto.precio_venta || 0)
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {producto.nombre}
          </h3>
          <p className="text-sm text-gray-500">Código: {producto.codigo}</p>
        </div>
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
          Stock: {producto.cantidad || producto.stock || 0}
        </span>
      </div>
      
      <div className="space-y-3 border-t pt-4">
        <div className="flex justify-between">
          <span className="text-gray-600">Costo:</span>
          <span className="font-medium text-gray-900">
            ${costo.toFixed(2)}
          </span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-gray-600">Utilidad:</span>
          <div className="text-right">
            <span className="font-medium text-green-600">
              ${utilidad.toFixed(2)}
            </span>
            <span className="text-xs text-gray-500 ml-2">
              ({porcentaje.toFixed(1)}%)
            </span>
          </div>
        </div>
        
        <div className="flex justify-between border-t pt-3">
          <span className="text-gray-700 font-semibold">Precio de Venta:</span>
          <span className="text-xl font-bold text-blue-600">
            ${precio.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductoCard;
```

---

## ✅ VERIFICACIÓN FINAL

Antes de considerar la implementación completa, verifica:

- [ ] Los cálculos de precio son correctos para utilidad del 40%
- [ ] Se manejan correctamente porcentajes y montos
- [ ] El formato de moneda es consistente en toda la aplicación
- [ ] Los componentes son reutilizables
- [ ] Se validan los datos de entrada
- [ ] Se manejan casos edge (costo = 0, utilidad negativa, etc.)
- [ ] Los estilos son consistentes con el diseño de la aplicación

---

**Última actualización:** 2025-01-15

