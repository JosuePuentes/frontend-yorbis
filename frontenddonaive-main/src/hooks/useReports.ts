import { useState } from 'react';
import type { ReportParams, ReportData } from '@/types/ReportTypes';
import { ReportGenerator } from '@/lib/reportGenerator';

export const useReports = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const generateReport = async (params: ReportParams, data: ReportData): Promise<ReportData> => {
    setIsGenerating(true);
    try {
      if (params.format === 'preview') {
        // Para vista preliminar, solo devolvemos los datos
        return data;
      } else {
        // Para exportación, generamos el archivo
        await ReportGenerator.generateReport(params, data);
        return data;
      }
    } catch (error) {
      console.error('Error generando reporte:', error);
      alert('Error al generar el reporte. Por favor, inténtalo de nuevo.');
      throw error;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    generateReport,
    isGenerating
  };
};
