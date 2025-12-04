import React from "react";

interface ItemTicket {
  nombre: string;
  codigo?: string;
  cantidad: number;
  precio_unitario: number;
  precio_unitario_usd: number;
  subtotal: number;
  subtotal_usd: number;
  descuento_aplicado?: number;
}

interface MetodoPagoTicket {
  tipo: string;
  monto: number;
  divisa: "USD" | "Bs";
}

interface TicketFacturaProps {
  numeroFactura: string;
  fecha: string;
  hora: string;
  sucursal: string;
  cajero: string;
  cliente?: {
    nombre: string;
    cedula?: string;
  };
  items: ItemTicket[];
  metodosPago: MetodoPagoTicket[];
  totalBs: number;
  totalUsd: number;
  tasaDia: number;
  porcentajeDescuento?: number;
  vuelto?: {
    monto: number;
    divisa: "USD" | "Bs";
  };
  onImpreso?: () => void;
}

export const TicketFactura: React.FC<TicketFacturaProps> = ({
  numeroFactura,
  fecha,
  hora,
  sucursal,
  cajero,
  cliente,
  items,
  metodosPago,
  totalBs,
  totalUsd,
  tasaDia,
  porcentajeDescuento,
  vuelto,
  onImpreso,
}) => {
  const imprimirTicket = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("Por favor, permite ventanas emergentes para imprimir el ticket");
      return;
    }

    // Calcular totales de descuentos
    const totalDescuento = items.reduce((sum, item) => {
      if (item.descuento_aplicado && item.descuento_aplicado > 0) {
        return sum + (item.subtotal_usd * (item.descuento_aplicado / 100));
      }
      return sum;
    }, 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Ticket - ${numeroFactura}</title>
  <style>
    @media print {
      @page {
        size: 80mm auto;
        margin: 0;
      }
      body {
        margin: 0;
        padding: 5mm;
      }
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Courier New', monospace;
      font-size: 12px;
      width: 80mm;
      max-width: 80mm;
      margin: 0 auto;
      padding: 10px;
      background: white;
      color: black;
    }
    .ticket {
      width: 100%;
    }
    .header {
      text-align: center;
      border-bottom: 1px dashed #000;
      padding-bottom: 10px;
      margin-bottom: 10px;
    }
    .empresa {
      font-weight: bold;
      font-size: 16px;
      margin-bottom: 5px;
    }
    .sucursal {
      font-size: 14px;
      margin-bottom: 5px;
    }
    .factura-num {
      font-size: 14px;
      font-weight: bold;
      margin-top: 5px;
    }
    .fecha-hora {
      font-size: 11px;
      margin-top: 5px;
    }
    .section {
      margin: 10px 0;
      padding: 5px 0;
      border-bottom: 1px dashed #000;
    }
    .section-title {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 5px;
    }
    .item {
      margin: 8px 0;
      padding: 5px 0;
      border-bottom: 1px dotted #ccc;
    }
    .item-nombre {
      font-weight: bold;
      font-size: 12px;
      margin-bottom: 2px;
      word-wrap: break-word;
    }
    .item-codigo {
      font-size: 10px;
      color: #666;
      margin-bottom: 2px;
    }
    .item-detalle {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      margin-top: 3px;
    }
    .item-cantidad {
      font-weight: bold;
    }
    .item-precio {
      text-align: right;
    }
    .item-descuento {
      font-size: 10px;
      color: #d32f2f;
      margin-top: 2px;
    }
    .totales {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 2px solid #000;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin: 5px 0;
      font-size: 12px;
    }
    .total-line.subtotal {
      font-size: 11px;
    }
    .total-line.descuento {
      color: #d32f2f;
      font-size: 11px;
    }
    .total-line.final {
      font-weight: bold;
      font-size: 14px;
      border-top: 1px dashed #000;
      padding-top: 5px;
      margin-top: 5px;
    }
    .metodos-pago {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #000;
    }
    .metodo-pago {
      display: flex;
      justify-content: space-between;
      margin: 3px 0;
      font-size: 11px;
    }
    .vuelto {
      margin-top: 10px;
      padding-top: 10px;
      border-top: 1px dashed #000;
      text-align: center;
      font-weight: bold;
      font-size: 13px;
      color: #d32f2f;
    }
    .footer {
      text-align: center;
      margin-top: 15px;
      padding-top: 10px;
      border-top: 1px dashed #000;
      font-size: 10px;
    }
    .separador {
      text-align: center;
      margin: 10px 0;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="ticket">
    <div class="header">
      <div class="empresa">RAPIFARMA</div>
      <div class="sucursal">${sucursal}</div>
      <div class="factura-num">FACTURA #${numeroFactura}</div>
      <div class="fecha-hora">${fecha} - ${hora}</div>
    </div>

    ${cliente ? `
    <div class="section">
      <div class="section-title">CLIENTE:</div>
      <div>${cliente.nombre}</div>
      ${cliente.cedula ? `<div>C.I.: ${cliente.cedula}</div>` : ""}
    </div>
    ` : ""}

    <div class="section">
      <div class="section-title">CAJERO:</div>
      <div>${cajero}</div>
    </div>

    <div class="separador">--------------------------------</div>

    <div class="section">
      <div class="section-title">DETALLE DE VENTA:</div>
      ${items.map((item) => `
        <div class="item">
          <div class="item-nombre">${item.nombre}</div>
          ${item.codigo ? `<div class="item-codigo">Código: ${item.codigo}</div>` : ""}
          <div class="item-detalle">
            <span class="item-cantidad">${item.cantidad} x</span>
            <span class="item-precio">$${item.precio_unitario_usd.toFixed(2)} USD</span>
          </div>
          ${item.descuento_aplicado && item.descuento_aplicado > 0 ? `
            <div class="item-descuento">Descuento: ${item.descuento_aplicado}%</div>
          ` : ""}
          <div class="item-detalle" style="margin-top: 3px;">
            <span>Subtotal:</span>
            <span class="item-precio">$${item.subtotal_usd.toFixed(2)} USD</span>
          </div>
        </div>
      `).join("")}
    </div>

    <div class="separador">--------------------------------</div>

    <div class="totales">
      ${porcentajeDescuento && porcentajeDescuento > 0 ? `
        <div class="total-line subtotal">
          <span>Subtotal:</span>
          <span>$${(totalUsd + totalDescuento).toFixed(2)} USD</span>
        </div>
        <div class="total-line descuento">
          <span>Descuento (${porcentajeDescuento}%):</span>
          <span>-$${totalDescuento.toFixed(2)} USD</span>
        </div>
      ` : ""}
      <div class="total-line final">
        <span>TOTAL:</span>
        <span>$${totalUsd.toFixed(2)} USD</span>
      </div>
      <div class="total-line final">
        <span>TOTAL:</span>
        <span>${totalBs.toFixed(2)} Bs</span>
      </div>
      <div class="total-line" style="font-size: 10px; color: #666;">
        <span>Tasa del día:</span>
        <span>${tasaDia.toFixed(2)} Bs/USD</span>
      </div>
    </div>

    <div class="separador">--------------------------------</div>

    <div class="metodos-pago">
      <div class="section-title">FORMA DE PAGO:</div>
      ${metodosPago.map((metodo) => `
        <div class="metodo-pago">
          <span>${metodo.tipo.toUpperCase()} (${metodo.divisa}):</span>
          <span>${metodo.divisa === "USD" ? "$" : ""}${metodo.monto.toFixed(2)} ${metodo.divisa === "Bs" ? "Bs" : ""}</span>
        </div>
      `).join("")}
    </div>

    ${vuelto ? `
    <div class="vuelto">
      VUELTO: ${vuelto.divisa === "USD" ? "$" : ""}${vuelto.monto.toFixed(2)} ${vuelto.divisa === "Bs" ? "Bs" : ""}
    </div>
    ` : ""}

    <div class="separador">================================</div>

    <div class="footer">
      <div>¡Gracias por su compra!</div>
      <div style="margin-top: 5px;">Vuelva pronto</div>
    </div>
  </div>
</body>
</html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    
    // Esperar a que se cargue el contenido antes de imprimir
    setTimeout(() => {
      printWindow.print();
      // Cerrar la ventana después de imprimir (opcional)
      // printWindow.close();
      
      // Notificar que se imprimió
      if (onImpreso) {
        setTimeout(() => {
          onImpreso();
        }, 500);
      }
    }, 250);
  };

  // Ejecutar impresión automáticamente cuando el componente se monta
  React.useEffect(() => {
    imprimirTicket();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null; // Este componente no renderiza nada en la UI
};

