import React, { useState, useRef, useEffect } from "react";

interface InventarioInfoChipProps {
  totalInventario: number;
  totalCosto: number;
  formatCurrency: (amount: number) => string;
}

const InventarioInfoChip: React.FC<InventarioInfoChipProps> = ({ totalInventario, totalCosto, formatCurrency }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const chipRef = useRef<HTMLDivElement>(null);

  // Cerrar el tooltip al hacer clic fuera
  useEffect(() => {
    if (!showTooltip) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (chipRef.current && !chipRef.current.contains(event.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showTooltip]);

  return (
    <div className="relative" ref={chipRef}>
      <span
        className="ml-2 cursor-pointer bg-blue-200 text-blue-800 rounded-full px-2 py-0.5 text-xs font-bold flex items-center"
        title="Ver detalle de inventario neto"
        onClick={() => setShowTooltip((v) => !v)}
        tabIndex={0}
        role="button"
        aria-pressed={showTooltip}
      >
        <i className="fas fa-info-circle"></i>
      </span>
      {showTooltip && (
        <div className="absolute left-1/2 z-20 -translate-x-1/2 mt-2 w-max min-w-[220px] bg-white border border-blue-300 rounded-lg shadow-lg p-3 text-xs text-gray-700 animate-fade-in">
          <div className="font-semibold text-blue-700 mb-1">Inventario Neto</div>
          <div>
            <b>Inventario:</b> {formatCurrency(totalInventario)}<br />
            <b>- Costo de Cuadres:</b> {formatCurrency(totalCosto)}<br />
            <b>= Inventario Neto:</b> <span className="text-blue-800 font-bold">{formatCurrency(totalInventario - totalCosto)}</span>
          </div>
          <div className="mt-1 text-gray-500">Inventario neto disponible después de descontar el costo de cuadres.</div>
        </div>
      )}
    </div>
  );
};

export default InventarioInfoChip;
