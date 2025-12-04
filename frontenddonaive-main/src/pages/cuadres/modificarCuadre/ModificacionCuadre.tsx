import React, { useState, useEffect } from 'react';
import { useModificarCuadre, useDetalleCuadres } from './useModificacionCuadre';
import type { Cuadre } from './useModificacionCuadre';

interface Props {
  id: string;
  onCancel?: () => void;
}

const ModificacionCuadre: React.FC<Props> = ({ id, onCancel }) => {
  const [editData, setEditData] = useState<Cuadre | null>(null);
  const { result, loading: loadingMod, error: errorMod, modificarCuadre } = useModificarCuadre();
  const { data: detalleData, loading: loadingCuadre, error: errorDetalle, fetchDetalle } = useDetalleCuadres();

  // Obtener detalle del cuadre por id
  useEffect(() => {
    if (id) {
      fetchDetalle({ id });
    }
  }, [id]);

  // Actualizar editData cuando se obtenga el detalle
  useEffect(() => {
    if (detalleData && Array.isArray(detalleData) && detalleData.length > 0) {
      setEditData({ ...detalleData[0] });
    } else {
      setEditData(null);
    }
  }, [detalleData]);

  // Actualizar campo editado
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    if (!editData) return;
    const { name, value, type } = e.target;
    setEditData({
      ...editData,
      [name]: type === 'number' ? Number(value) : value
    });
  };

  // Estilo para campos editables
  const editableStyle: React.CSSProperties = {
    border: '2px solid #000',
    background: '#f5f5f5',
    borderRadius: 6,
    padding: '0.4rem 0.7rem',
    fontWeight: 500,
    fontSize: '1rem',
    outline: 'none',
    marginBottom: 2,
  };
  // Estilo para campos solo lectura
  const readonlyStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    background: '#fff',
    borderRadius: 6,
    padding: '0.4rem 0.7rem',
    fontWeight: 400,
    fontSize: '1rem',
    outline: 'none',
    marginBottom: 2,
  };

  // Enviar modificación
  const handleModificar = () => {
    if (id && editData) {
      modificarCuadre(id, editData);
    }
  };

  return (
    <div
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: 24,
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <h2>Modificar Cuadres</h2>
      {loadingCuadre && <div>Cargando información del cuadre...</div>}
      {errorDetalle && <div style={{ color: 'red' }}>Error: {errorDetalle}</div>}
      {!loadingCuadre && editData && (
        <div style={{ border: '1px solid #ccc', padding: 16 }}>
          <h3>Editar Cuadre</h3>
          <form onSubmit={e => { e.preventDefault(); handleModificar(); }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 12,
                width: '100%',
                boxSizing: 'border-box',
                ...(window.innerWidth < 600
                  ? { gridTemplateColumns: '1fr', gap: 8 }
                  : {}),
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Día:</label>
                <input
                  name="dia"
                  value={editData.dia}
                  onChange={handleChange}
                  style={editableStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Turno:</label>
                <select
                  name="turno"
                  value={editData.turno}
                  onChange={handleChange}
                  style={editableStyle}
                >
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="De Turno">De Turno</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Costo Inventario:</label>
                <input
                  name="costoInventario"
                  type="number"
                  value={editData.costoInventario}
                  onChange={handleChange}
                  style={editableStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Estado:</label>
                <select
                  name="estado"
                  value={editData.estado ?? ''}
                  onChange={handleChange}
                  style={editableStyle}
                >
                  <option value="wait">wait</option>
                  <option value="aprobado">aprobado</option>
                  <option value="rechazado">rechazado</option>
                </select>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Caja #:</label>
                <input
                  name="cajaNumero"
                  type="number"
                  value={editData.cajaNumero}
                  onChange={handleChange}
                  style={editableStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Total Caja Sistema Bs:</label>
                <input
                  name="totalCajaSistemaBs"
                  type="number"
                  value={editData.totalCajaSistemaBs}
                  onChange={handleChange}
                  style={editableStyle}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Tasa:</label>
                <input name="tasa" type="number" value={editData.tasa} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Cajero:</label>
                <input name="cajero" value={editData.cajero} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Devoluciones Bs:</label>
                <input name="devolucionesBs" type="number" value={editData.devolucionesBs} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Recarga Bs:</label>
                <input name="recargaBs" type="number" value={editData.recargaBs} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Pago Móvil Bs:</label>
                <input name="pagomovilBs" type="number" value={editData.pagomovilBs} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Efectivo Bs:</label>
                <input name="efectivoBs" type="number" value={editData.efectivoBs} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Efectivo USD:</label>
                <input name="efectivoUsd" type="number" value={editData.efectivoUsd} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Zelle USD:</label>
                <input name="zelleUsd" type="number" value={editData.zelleUsd} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>Vales USD:</label>
                <input name="valesUsd" type="number" value={editData.valesUsd ?? 0} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>totalBs:</label>
                <input name="totalBs" type="number" value={editData.totalBs} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>totalBsEnUsd:</label>
                <input name="totalBsEnUsd" type="number" value={editData.totalBsEnUsd} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>totalGeneralUsd:</label>
                <input name="totalGeneralUsd" type="number" value={editData.totalGeneralUsd} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>diferenciaUsd:</label>
                <input name="diferenciaUsd" type="number" value={editData.diferenciaUsd} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>sobranteUsd:</label>
                <input name="sobranteUsd" type="number" value={editData.sobranteUsd ?? 0} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>faltanteUsd:</label>
                <input name="faltanteUsd" type="number" value={editData.faltanteUsd ?? 0} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>nombreFarmacia:</label>
                <input name="nombreFarmacia" value={editData.nombreFarmacia ?? ''} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>fecha:</label>
                <input name="fecha" value={editData.fecha ?? ''} readOnly style={readonlyStyle} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label>hora:</label>
                <input name="hora" value={editData.hora ?? ''} readOnly style={readonlyStyle} />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <label>Puntos de Venta:</label>
              {editData.puntosVenta && editData.puntosVenta.map((pv, idx) => (
                <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 500 }}>Banco</label>
                    <input
                      value={pv.banco}
                      readOnly
                      style={{ marginBottom: 2 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 500 }}>Débito Bs</label>
                    <input
                      type="number"
                      value={pv.puntoDebito}
                      readOnly
                      style={{ marginBottom: 2 }}
                    />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <label style={{ fontSize: 13, fontWeight: 500 }}>Crédito Bs</label>
                    <input
                      type="number"
                      value={pv.puntoCredito}
                      style={editableStyle}
                      readOnly={false}
                    />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
              <button
                type="submit"
                disabled={loadingMod}
                style={{
                  flex: 1,
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  padding: '0.7rem 1.2rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: loadingMod ? 'not-allowed' : 'pointer',
                  transition: 'background 0.2s',
                  opacity: loadingMod ? 0.7 : 1,
                }}
              >
                Guardar cambios
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  background: '#fff',
                  color: '#000',
                  border: '2px solid #000',
                  borderRadius: 6,
                  padding: '0.7rem 1.2rem',
                  fontWeight: 600,
                  fontSize: '1rem',
                  cursor: 'pointer',
                  transition: 'background 0.2s',
                }}
                onClick={onCancel}
              >
                Cancelar
              </button>
            </div>
            {errorMod && <div style={{ color: 'red' }}>{errorMod}</div>}
            {result && <div style={{ color: 'green' }}>{result.message}</div>}
          </form>
        </div>
      )}
    </div>
  );
};

export default ModificacionCuadre;
