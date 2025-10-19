export const MADRIJ_SPREADSHEET_ID = "1lVMJx9lCH3O-oypWGXWZ9RD4YQVctZlmppV3Igqge64";
export const JANIJ_SPREADSHEET_ID = "1u3KFbCBItK5oN5VEl55Kq7tlRxTb3qJ2FSMl9tS0Cjs";
export const MADRIJ_SHEET_NAME = "Madrijim";
export const JANIJ_SHEET_NAME = "Janijim";

export type SheetConfig = {
  spreadsheetId: string;
  sheetName: string;
};

export function getMadrijSheetConfig(): SheetConfig {
  return {
    spreadsheetId: MADRIJ_SPREADSHEET_ID,
    sheetName: MADRIJ_SHEET_NAME,
  };
}

export function getJanijSheetConfig(): SheetConfig {
  return {
    spreadsheetId: JANIJ_SPREADSHEET_ID,
    sheetName: JANIJ_SHEET_NAME,
  };
}

export const SYSTEM_CREATOR_ID = "google-sheets-sync";
