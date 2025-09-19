// types.ts
export type SmartsheetColumn = {
    id: number;
    title: string;
  };
  
  export type SmartsheetCell = {
    columnId: number;
    value: any;
  };
  
  export type SmartsheetRow = {
    id: number;
    cells: SmartsheetCell[];
  };
  
  export type SmartsheetSheet = {
    id: string;
    columns: SmartsheetColumn[];
    rows: SmartsheetRow[];
  };
  
  export type RunData = {
    rowId: string;
    runId: number;
    documentNumber: string;
    customerName: string;
    date: Date;
    testName: string | null;
    testDetails: string | null;
    physicianReferred: string | null;
    hospital: string | null;
    signedOrderDate: Date | null;
    totalPaid?: number | null;
  };
  
  export type SmartsheetMap = {
    smartsheetId: string;
    customerName: string;
    testName: string;
    testDetails: string;
    physicianName: string;
    hospitalName: string;
    signedOrderDate: string;
  };
  