import React from "react";
import type { Pago } from "./pagosTypes";

interface CardPagoProps {
  pago: Pago;
}

const CardPago: React.FC<CardPagoProps> = ({ pago }) => {
  return (
    <div style={{ border: "1px solid #ccc", borderRadius: 8, padding: 16, marginBottom: 16, background: "#fff" }}>
      <h3 style={{ margin: 0, marginBottom: 8 }}>Pago #{pago.numeroFactura || pago._id}</h3>
      <div><strong>Fecha:</strong> {pago.fecha}</div>
      <div><strong>Usuario:</strong> {pago.usuario}</div>
      <div><strong>Referencia:</strong> {pago.referencia}</div>
      <div><strong>Banco Emisor:</strong> {pago.bancoEmisor}</div>
      <div><strong>Banco Receptor:</strong> {pago.bancoReceptor}</div>
      <div><strong>Monto de Pago:</strong> {pago.montoDePago} {pago.monedaDePago}</div>
      <div><strong>Estado:</strong> {pago.estado}</div>
      {pago.descripcion && <div><strong>Descripción:</strong> {pago.descripcion}</div>}
      {pago.imagenPago && (
        <div style={{ marginTop: 8 }}>
          <img src={pago.imagenPago} alt="Comprobante" style={{ maxWidth: 200, borderRadius: 4 }} />
        </div>
      )}
    </div>
  );
};

export default CardPago;
