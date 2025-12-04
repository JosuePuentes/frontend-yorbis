declare module 'xlsx' {
  export interface WorkSheet {
    [key: string]: any;
  }
  
  export interface WorkBook {
    SheetNames: string[];
    Sheets: { [key: string]: WorkSheet };
  }
  
  export interface Sheet2JSONOpts {
    header?: number | string[];
    defval?: any;
    raw?: boolean;
  }
  
  export function read(data: any, opts?: { type?: string }): WorkBook;
  export function writeFile(wb: WorkBook, filename: string): void;
  export const utils: {
    sheet_to_json<T = any>(sheet: WorkSheet, opts?: Sheet2JSONOpts): T[];
    aoa_to_sheet(data: any[][]): WorkSheet;
    book_new(): WorkBook;
    book_append_sheet(wb: WorkBook, ws: WorkSheet, name: string): void;
  };
}

