import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { ReportData } from '@/types/ReportTypes';
import { Download, FileText, X } from 'lucide-react';

interface ReportPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData;
  title: string;
  onExport: (format: 'pdf' | 'excel' | 'csv') => void;
  isExporting?: boolean;
}

export const ReportPreview: React.FC<ReportPreviewProps> = ({
  isOpen,
  onClose,
  reportData,
  title,
  onExport,
  isExporting = false
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vista Preliminar - {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Botones de exportación */}
          <div className="flex gap-2 mb-4 p-4 bg-gray-50 rounded-lg">
            <Button
              onClick={() => onExport('pdf')}
              disabled={isExporting}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700"
            >
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Button
              onClick={() => onExport('excel')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
            <Button
              onClick={() => onExport('csv')}
              disabled={isExporting}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar CSV
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              className="ml-auto"
            >
              <X className="h-4 w-4" />
              Cerrar
            </Button>
          </div>

          {/* Vista preliminar del reporte */}
          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <div className="p-6">
              {/* Encabezado del reporte */}
              <div className="text-center mb-6 border-b pb-4">
                <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
                <p className="text-gray-600 mt-2">
                  Generado el {new Date().toLocaleDateString('es-VE', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              {/* Tabla de datos */}
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse border border-gray-300">
                  <thead>
                    <tr className="bg-gray-100">
                      {reportData.headers.map((header, index) => (
                        <th
                          key={index}
                          className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700"
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="border border-gray-300 px-4 py-2 text-gray-700"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Resumen */}
              {reportData.summary && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h3 className="text-lg font-semibold text-blue-800 mb-3">Resumen</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-blue-600">
                        <strong>Total de registros:</strong> {reportData.summary.totalRows}
                      </p>
                    </div>
                    {reportData.summary.totals && (
                      <div>
                        {Object.entries(reportData.summary.totals).map(([key, value]) => (
                          <p key={key} className="text-sm text-blue-600">
                            <strong>{key}:</strong> {typeof value === 'number' ? value.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : value}
                          </p>
                        ))}
                      </div>
                    )}
                    {reportData.summary.averages && (
                      <div>
                        {Object.entries(reportData.summary.averages).map(([key, value]) => (
                          <p key={key} className="text-sm text-blue-600">
                            <strong>{key}:</strong> {typeof value === 'number' ? value.toLocaleString('es-VE', { minimumFractionDigits: 2 }) : value}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pie de página */}
              <div className="mt-6 text-center text-sm text-gray-500 border-t pt-4">
                <p>Este es un reporte generado automáticamente por el sistema</p>
                <p>Para más información, contacte al administrador del sistema</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
