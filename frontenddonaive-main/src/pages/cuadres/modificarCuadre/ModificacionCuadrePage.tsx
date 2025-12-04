import React, { useState } from 'react';
import ModificacionCuadre from './ModificacionCuadre';
import SeleccionCuadre from './SeleccionCuadre';

const ModificacionCuadrePage: React.FC = () => {
  const [fecha, setFecha] = useState('');
  const [cuadreSeleccionado, setCuadreSeleccionado] = useState<any | null>(null);

  // Selección de cuadre desde SeleccionCuadre
  const handleSelectCuadre = (cuadre: any) => {
    setCuadreSeleccionado(cuadre);
  };

  return (
    <div
      style={{
        maxWidth: 700,
        margin: '0 auto',
        padding: '2rem 1rem',
        boxSizing: 'border-box',
        width: '100%',
      }}
    >
      <h1 style={{ fontSize: '2rem', marginBottom: '1.5rem', textAlign: 'center', fontWeight: 700 }}>Modificar Cuadres</h1>
      <div style={{ marginBottom: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12 }}>
        <label style={{ marginRight: 8, fontWeight: 500 }}>Fecha:</label>
        <input
          type="date"
          value={fecha}
          onChange={e => {
            setFecha(e.target.value);
            setCuadreSeleccionado(null);
          }}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: 6,
            border: '1px solid #ccc',
            fontSize: '1rem',
            minWidth: 180,
            flex: '1 1 180px',
            maxWidth: 220,
          }}
        />
      </div>
      <SeleccionCuadre fecha={fecha} onSelect={handleSelectCuadre} />
      {cuadreSeleccionado && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              boxShadow: '0 2px 24px rgba(0,0,0,0.18)',
              padding: '2rem 1rem',
              minWidth: '90vw',
              maxWidth: 480,
              width: '100%',
              position: 'relative',
              boxSizing: 'border-box',
            }}
          >
            <button
              onClick={() => setCuadreSeleccionado(null)}
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                background: 'transparent',
                border: 'none',
                fontSize: 28,
                cursor: 'pointer',
                color: '#888',
                fontWeight: 700,
                lineHeight: 1,
              }}
              aria-label="Cerrar"
            >
              ×
            </button>
            <h2 style={{ marginTop: 0, marginBottom: 18, fontSize: '1.3rem', fontWeight: 600, textAlign: 'center' }}>Editar cuadre seleccionado</h2>
            <div style={{ maxHeight: '70vh', overflowY: 'auto', paddingRight: 8 }}>
            <ModificacionCuadre id={cuadreSeleccionado._id} onCancel={() => setCuadreSeleccionado(null)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModificacionCuadrePage;
