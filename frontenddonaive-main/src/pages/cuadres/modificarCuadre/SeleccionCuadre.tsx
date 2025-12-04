import React from 'react';
import { useResumenCuadres } from './useModificacionCuadre';

interface SeleccionCuadreProps {
  onSelect: (cuadre: any) => void;
  fecha: string;
}

const SeleccionCuadre: React.FC<SeleccionCuadreProps> = ({ onSelect, fecha }) => {
  const { data, loading, error, fetchResumen } = useResumenCuadres();

  React.useEffect(() => {
    if (fecha) fetchResumen(fecha);
  }, [fecha]);

  return (
    <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 12px rgba(0,0,0,0.08)', padding: '1.5rem 1rem', marginBottom: 24 }}>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 18, textAlign: 'center', color: '#222' }}>Selecciona un cuadre</h3>
      {error && <div style={{ color: 'red', marginBottom: 12 }}>{error}</div>}
      {loading && <div style={{ textAlign: 'center', color: '#555', marginBottom: 12 }}>Cargando cuadres...</div>}
      {data && data.cuadres && data.cuadres.length > 0 ? (
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {data.cuadres.map((c: any) => (
            <li key={c._id} style={{ marginBottom: 10 }}>
              <button
                onClick={() => onSelect(c)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: '#f9f9f9',
                  border: '1px solid #e5e5e5',
                  borderRadius: 8,
                  padding: '0.8rem 1rem',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  color: '#222',
                  fontWeight: 500,
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={e => (e.currentTarget.style.background = '#ececec')}
                onMouseOut={e => (e.currentTarget.style.background = '#f9f9f9')}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontWeight: 700 }}>{c.nombreFarmacia ?? 'Sin nombre'}</span>
                  <span style={{ color: '#555' }}>| Cajero: <span style={{ fontWeight: 500 }}>{c.cajero}</span></span>
                  <span style={{ color: '#555' }}>| Estado: <span style={{ fontWeight: 500 }}>{c.estado ?? 'N/A'}</span></span>
                  <span style={{ color: '#555' }}>| Turno: <span style={{ fontWeight: 500 }}>{c.turno}</span></span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        !loading && <div style={{ textAlign: 'center', color: '#888' }}>No hay cuadres para la fecha seleccionada.</div>
      )}
    </div>
  );
};

export default SeleccionCuadre;
