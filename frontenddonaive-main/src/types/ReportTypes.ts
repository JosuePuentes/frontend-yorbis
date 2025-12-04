export interface ReportConfig {
  id: string;
  title: string;
  description: string;
  module: string;
  formats: ReportFormat[];
  filters: ReportFilter[];
  columns: ReportColumn[];
}

export interface ReportFormat {
  type: 'pdf' | 'excel' | 'csv';
  label: string;
  icon: string;
}

export interface ReportFilter {
  id: string;
  label: string;
  type: 'date' | 'dateRange' | 'select' | 'text' | 'number';
  options?: { value: string; label: string }[];
  required?: boolean;
  defaultValue?: any;
}

export interface ReportColumn {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'currency' | 'boolean';
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface ReportData {
  headers: string[];
  rows: any[][];
  summary?: ReportSummary;
}

export interface ReportSummary {
  totalRows: number;
  totals?: { [key: string]: number };
  averages?: { [key: string]: number };
}

export interface ReportParams {
  format: string;
  filters: { [key: string]: any };
  dateFrom?: string;
  dateTo?: string;
  module: string;
}

export interface ReportModule {
  id: string;
  name: string;
  icon: string;
  reports: ReportConfig[];
}
