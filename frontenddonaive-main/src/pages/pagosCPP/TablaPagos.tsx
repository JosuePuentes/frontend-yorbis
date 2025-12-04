import React, { useState, useMemo } from "react";
import type { Pago } from "./pagosTypes";
import {
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
  TableHead,
  Table, // Importamos TableHead que faltaba
} from "@/components/ui/table";
import ImageDisplay from "@/components/upfile/ImageDisplay";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const FARMACIAS: Record<string, string> = {
  "01": "Santa Elena",
  "02": "Sur America",
  "03": "Rapifarma",
  "04": "San Carlos",
  "05": "Las Alicias",
  "06": "San Martin",
  "07": "Milagro Norte",
};

interface TablaPagosProps {
  pagos: Pago[];
}

// Usaremos la función de optimización de totales que creamos antes
const calcularTotales = (listaPagos: Pago[]) => {
  const totalBs = listaPagos
    .filter((p) => p.monedaDePago?.toLowerCase() === "bs")
    .reduce((acc, p) => acc + Number(p.montoDePago), 0);
  const totalUsd = listaPagos
    .filter((p) => p.monedaDePago?.toLowerCase() === "usd")
    .reduce((acc, p) => acc + Number(p.montoDePago), 0);
  return { totalBs, totalUsd };
};

function agruparPorImagenPago(pagos: Pago[]): Record<string, Pago[]> {
  return pagos.reduce((acc: Record<string, Pago[]>, pago) => {
    const key = pago.imagenPago || "Sin comprobante";
    if (!acc[key]) acc[key] = [];
    acc[key].push(pago);
    return acc;
  }, {} as Record<string, Pago[]>);
}

const TablaPagos: React.FC<TablaPagosProps> = ({ pagos }) => {
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [proveedorFiltro, setProveedorFiltro] = useState<string>("");

  const handleToggle = (key: string) => {
    setOpenMap((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const pagosFiltrados = useMemo(() => {
    return proveedorFiltro.trim()
      ? pagos.filter((p) =>
          p.proveedor
            ?.toLowerCase()
            .includes(proveedorFiltro.trim().toLowerCase())
        )
      : pagos;
  }, [pagos, proveedorFiltro]);

  const totalGenerales = useMemo(
    () => calcularTotales(pagosFiltrados),
    [pagosFiltrados]
  );

  const pagosAgrupados = useMemo(
    () => agruparPorImagenPago(pagosFiltrados),
    [pagosFiltrados]
  );

  if (pagos.length === 0) {
    return (
      <div className="text-center p-8 text-slate-500 bg-slate-50 rounded-lg">
        No hay pagos para mostrar.
      </div>
    );
  }

  return (
    <div>
      <div className="bg-slate-100/80 p-4 rounded-lg mb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-2">
          <label
            htmlFor="filtro-proveedor"
            className="font-medium text-sm text-slate-700 whitespace-nowrap"
          >
            Filtrar proveedor:
          </label>
          <Input
            id="filtro-proveedor"
            type="text"
            value={proveedorFiltro}
            onChange={(e) => setProveedorFiltro(e.target.value)}
            placeholder="Escribe para filtrar..."
            className="w-full sm:w-64 h-9"
          />
        </div>
        <div className="flex items-center gap-x-6 gap-y-2 flex-wrap text-sm font-medium text-slate-800">
          <span>
            Total General (Bs):{" "}
            <span className="font-bold text-base text-green-600">
              {totalGenerales.totalBs.toLocaleString("es-VE", {
                minimumFractionDigits: 2,
              })}
            </span>
          </span>
          <span>
            Total General (USD):{" "}
            <span className="font-bold text-base text-blue-600">
              {totalGenerales.totalUsd.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
              })}
            </span>
          </span>
        </div>
      </div>

      {pagosFiltrados.length === 0 && (
        <div className="text-center p-8 text-slate-500 bg-white rounded-lg shadow-md border">
          No se encontraron pagos que coincidan con el proveedor "
          {proveedorFiltro}".
        </div>
      )}

      {Object.entries(pagosAgrupados).map(([imagen, pagosGrupo]) => {
        const totalesGrupo = calcularTotales(pagosGrupo);
        return (
          <div
            key={imagen}
            className="bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden mb-8"
          >
            <div className="flex items-center gap-4 p-4 bg-slate-50 border-b border-slate-200">
              {imagen !== "Sin comprobante" ? (
                <div className="w-16 h-16 flex-shrink-0">
                  <ImageDisplay imageName={imagen} alt="Comprobante" />
                </div>
              ) : (
                <div className="w-16 h-16 flex items-center justify-center bg-slate-200 rounded-md flex-shrink-0">
                  <span className="text-slate-500 text-xs text-center">
                    Sin Img
                  </span>
                </div>
              )}
              <span className="font-bold text-xl text-slate-800">
                Pagos con este Comprobante ({pagosGrupo.length})
              </span>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Farmacia</TableHead>
                    <TableHead>N° Factura</TableHead>
                    <TableHead>Tasa (Orig/Pago)</TableHead>
                    <TableHead>Monto Pagado</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-center">Comprobante</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pagosGrupo.map((pago) => {
                    const key = pago._id || pago.referencia;
                    const open = !!openMap[key];

                    return (
                      <TableRow key={pago._id}>
                        <TableCell className="whitespace-nowrap">
                          {new Date(pago.fecha).toLocaleDateString("es-VE")}
                        </TableCell>
                        <TableCell>{pago.usuario}</TableCell>
                        <TableCell>{pago.referencia}</TableCell>
                        <TableCell>{pago.proveedor}</TableCell>
                        <TableCell>
                          {FARMACIAS[pago.farmaciaId] || pago.farmaciaId}
                        </TableCell>
                        <TableCell>{pago.numeroFactura}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {pago.tasaOriginal ?? "-"} / {pago.tasaDePago ?? "-"}
                        </TableCell>
                        <TableCell
                          className={`font-semibold ${
                            pago.monedaDePago?.toLowerCase() === "bs"
                              ? "text-green-700"
                              : "text-blue-700"
                          }`}
                        >
                          {Number(pago.montoDePago).toLocaleString(
                            pago.monedaDePago?.toLowerCase() === "bs"
                              ? "es-VE"
                              : "en-US",
                            { minimumFractionDigits: 2 }
                          )}{" "}
                          {pago.monedaDePago}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              pago.estado?.toLowerCase() === "conciliado" ||
                              pago.estatus === "Conciliado"
                                ? "default"
                                : "secondary"
                            }
                          >
                            {pago.estado || pago.estatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {pago.imagenesCuentaPorPagar &&
                          pago.imagenesCuentaPorPagar.length > 0 ? (
                            <div>
                              <Button
                                onClick={() => handleToggle(key)}
                                variant="outline"
                                size="sm"
                              >
                                {open
                                  ? "Ocultar"
                                  : `Factura (${pago.imagenesCuentaPorPagar.length})`}
                              </Button>

                              {open && (
                                <div className="absolute right-4 mt-2 z-10 p-2 bg-white border-2 shadow-lg rounded-lg flex gap-2 max-w-sm overflow-auto overflow-hidden">
                                  {pago.imagenesCuentaPorPagar.map(
                                    (imgName, index) => (
                                      <div
                                        className="max-w-24 max-h-24 rounded-md"
                                        key={index}
                                      >
                                        <ImageDisplay
                                          imageName={imgName.toString()}
                                          alt={`Comprobante de factura ${
                                            index + 1
                                          }`}
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-xs italic">
                              N/A
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* --- AQUÍ SE AGREGAN LOS TOTALES DEL GRUPO --- */}
            <div className="text-right p-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-6 text-sm">
              <span className="font-medium">
                Total Grupo (Bs):{" "}
                <span className="font-bold text-green-700">
                  {totalesGrupo.totalBs.toLocaleString("es-VE", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </span>
              <span className="font-medium">
                Total Grupo (USD):{" "}
                <span className="font-bold text-blue-700">
                  {totalesGrupo.totalUsd.toLocaleString("en-US", {
                    style: "currency",
                    currency: "USD",
                  })}
                </span>
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default TablaPagos;
