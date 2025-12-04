import type { ReportData, ReportParams } from '@/types/ReportTypes';

export class ReportGenerator {
  static async generatePDF(data: ReportData, title: string): Promise<void> {
    // Implementación básica para PDF usando window.print()
    // En un proyecto real, usarías una librería como jsPDF o react-pdf
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = this.generateHTMLTable(data, title);
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.print();
  }

  static async generateExcel(data: ReportData, title: string): Promise<void> {
    // Implementación básica para Excel usando CSV
    // En un proyecto real, usarías una librería como xlsx
    
    const csvContent = this.generateCSVContent(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static async generateCSV(data: ReportData, title: string): Promise<void> {
    const csvContent = this.generateCSVContent(data);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `${title}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private static generateHTMLTable(data: ReportData, title: string): string {
    const headers = data.headers.map(header => `<th>${header}</th>`).join('');
    const rows = data.rows.map(row => 
      `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            h1 { color: #333; }
            .summary { margin-top: 20px; padding: 10px; background-color: #f9f9f9; }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <table>
            <thead>
              <tr>${headers}</tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
          ${data.summary ? this.generateSummaryHTML(data.summary) : ''}
        </body>
      </html>
    `;
  }

  private static generateCSVContent(data: ReportData): string {
    const headers = data.headers.join(',');
    const rows = data.rows.map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    return `${headers}\n${rows}`;
  }

  private static generateSummaryHTML(summary: any): string {
    let summaryHTML = '<div class="summary"><h3>Resumen</h3>';
    summaryHTML += `<p>Total de registros: ${summary.totalRows}</p>`;
    
    if (summary.totals) {
      summaryHTML += '<h4>Totales:</h4><ul>';
      Object.entries(summary.totals).forEach(([key, value]) => {
        summaryHTML += `<li>${key}: ${value}</li>`;
      });
      summaryHTML += '</ul>';
    }
    
    if (summary.averages) {
      summaryHTML += '<h4>Promedios:</h4><ul>';
      Object.entries(summary.averages).forEach(([key, value]) => {
        summaryHTML += `<li>${key}: ${value}</li>`;
      });
      summaryHTML += '</ul>';
    }
    
    summaryHTML += '</div>';
    return summaryHTML;
  }

  static async generateReport(params: ReportParams, data: ReportData): Promise<void> {
    const title = `Reporte_${params.module}_${new Date().toISOString().split('T')[0]}`;
    
    switch (params.format) {
      case 'pdf':
        await this.generatePDF(data, title);
        break;
      case 'excel':
        await this.generateExcel(data, title);
        break;
      case 'csv':
        await this.generateCSV(data, title);
        break;
      default:
        throw new Error(`Formato no soportado: ${params.format}`);
    }
  }
}
