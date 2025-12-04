import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import type { ReportConfig, ReportParams, ReportData } from '@/types/ReportTypes';
import { ReportPreview } from './ReportPreview';
import { FileText, Filter, Eye } from 'lucide-react';

interface ReportButtonProps {
  module: string;
  reports: ReportConfig[];
  onGenerateReport: (params: ReportParams) => Promise<ReportData>;
  farmacias?: { id: string; nombre: string }[];
  className?: string;
}

export const ReportButton: React.FC<ReportButtonProps> = ({
  module,
  reports,
  onGenerateReport,
  farmacias = [],
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportConfig | null>(null);
  const [filters, setFilters] = useState<{ [key: string]: any }>({});
  const [format, setFormat] = useState<string>('pdf');
  const [previewData, setPreviewData] = useState<ReportData | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePreview = async () => {
    if (!selectedReport) return;

    setIsGenerating(true);
    try {
      const params: ReportParams = {
        format: 'preview',
        filters,
        module,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      };

      const data = await onGenerateReport(params);
      setPreviewData(data);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Error generando vista preliminar:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExport = async (exportFormat: 'pdf' | 'excel' | 'csv') => {
    if (!selectedReport || !previewData) return;

    setIsGenerating(true);
    try {
      const params: ReportParams = {
        format: exportFormat,
        filters,
        module,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo
      };

      await onGenerateReport(params);
    } catch (error) {
      console.error('Error exportando reporte:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFilterChange = (filterId: string, value: any) => {
    setFilters(prev => ({
      ...prev,
      [filterId]: value
    }));
  };

  // Función para obtener las opciones de farmacia actualizadas
  const getFarmaciaOptions = () => {
    return [
      { value: 'todas', label: 'Todas las farmacias' },
      ...farmacias.map(f => ({ value: f.id, label: f.nombre }))
    ];
  };

  // Función para obtener el filtro actualizado con opciones de farmacia
  const getUpdatedFilter = (filter: any) => {
    if (filter.id === 'farmacia' && farmacias.length > 0) {
      return {
        ...filter,
        options: getFarmaciaOptions()
      };
    }
    return filter;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={`gap-2 ${className}`}>
          <FileText className="h-4 w-4" />
          Reportes
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generar Reportes - {module}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selección de Reporte */}
          <div>
            <label className="text-sm font-medium mb-2 block">Tipo de Reporte</label>
            <div className="grid grid-cols-1 gap-2">
              {reports.map((report) => (
                <Button
                  key={report.id}
                  variant={selectedReport?.id === report.id ? "default" : "outline"}
                  onClick={() => setSelectedReport(report)}
                  className="justify-start h-auto p-3"
                >
                  <div className="text-left">
                    <div className="font-medium">{report.title}</div>
                    <div className="text-xs text-muted-foreground">{report.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>

          {/* Filtros */}
          {selectedReport && (
            <div>
              <label className="text-sm font-medium mb-2 block flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </label>
              <div className="space-y-3">
                {selectedReport.filters.map((filter) => {
                  const updatedFilter = getUpdatedFilter(filter);
                  return (
                  <div key={updatedFilter.id}>
                    <label className="text-xs text-muted-foreground mb-1 block">
                      {updatedFilter.label} {updatedFilter.required && <span className="text-red-500">*</span>}
                    </label>
                    
                    {updatedFilter.type === 'date' && (
                      <input
                        type="date"
                        className="w-full p-2 border rounded-md"
                        value={filters[updatedFilter.id] || ''}
                        onChange={(e) => handleFilterChange(updatedFilter.id, e.target.value)}
                        required={updatedFilter.required}
                      />
                    )}
                    
                    {updatedFilter.type === 'dateRange' && (
                      <div className="flex gap-2">
                        <input
                          type="date"
                          className="flex-1 p-2 border rounded-md"
                          placeholder="Desde"
                          value={filters[updatedFilter.id + '_from'] || ''}
                          onChange={(e) => handleFilterChange(updatedFilter.id + '_from', e.target.value)}
                        />
                        <input
                          type="date"
                          className="flex-1 p-2 border rounded-md"
                          placeholder="Hasta"
                          value={filters[updatedFilter.id + '_to'] || ''}
                          onChange={(e) => handleFilterChange(updatedFilter.id + '_to', e.target.value)}
                        />
                      </div>
                    )}
                    
                    {updatedFilter.type === 'select' && (
                      <select
                        className="w-full p-2 border rounded-md"
                        value={filters[updatedFilter.id] || ''}
                        onChange={(e) => handleFilterChange(updatedFilter.id, e.target.value)}
                        required={updatedFilter.required}
                      >
                        <option value="">Seleccionar...</option>
                        {updatedFilter.options?.map((option: any) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    )}
                    
                    {updatedFilter.type === 'text' && (
                      <input
                        type="text"
                        className="w-full p-2 border rounded-md"
                        placeholder={updatedFilter.label}
                        value={filters[updatedFilter.id] || ''}
                        onChange={(e) => handleFilterChange(updatedFilter.id, e.target.value)}
                        required={updatedFilter.required}
                      />
                    )}
                    
                    {updatedFilter.type === 'number' && (
                      <input
                        type="number"
                        className="w-full p-2 border rounded-md"
                        placeholder={updatedFilter.label}
                        value={filters[updatedFilter.id] || ''}
                        onChange={(e) => handleFilterChange(updatedFilter.id, e.target.value)}
                        required={updatedFilter.required}
                      />
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formato */}
          {selectedReport && (
            <div>
              <label className="text-sm font-medium mb-2 block">Formato de Exportación</label>
              <div className="flex gap-2">
                {selectedReport.formats.map((formatOption) => (
                  <Button
                    key={formatOption.type}
                    variant={format === formatOption.type ? "default" : "outline"}
                    onClick={() => setFormat(formatOption.type)}
                    className="flex items-center gap-2"
                  >
                    <span>{formatOption.icon}</span>
                    {formatOption.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex justify-end gap-2">
            <Button 
              onClick={handlePreview}
              disabled={!selectedReport || isGenerating}
              variant="outline"
              className="gap-2"
            >
              <Eye className="h-4 w-4" />
              {isGenerating ? 'Generando...' : 'Vista Preliminar'}
            </Button>
            <Button 
              onClick={() => setIsOpen(false)}
              variant="outline"
            >
              Cancelar
            </Button>
          </div>
        </div>
      </DialogContent>
      
      {/* Modal de vista preliminar */}
      {previewData && (
        <ReportPreview
          isOpen={isPreviewOpen}
          onClose={() => setIsPreviewOpen(false)}
          reportData={previewData}
          title={selectedReport?.title || 'Reporte'}
          onExport={handleExport}
          isExporting={isGenerating}
        />
      )}
    </Dialog>
  );
};
