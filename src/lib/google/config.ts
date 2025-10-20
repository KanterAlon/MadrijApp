const INSTITUTIONAL_SPREADSHEET_ID = "1u3KFbCBItK5oN5VEl55Kq7tlRxTb3qJ2FSMl9tS0Cjs";

export const MADRIJ_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;
export const JANIJ_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;
export const PROYECTO_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;
export const COORDINADOR_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;
export const DIRECTOR_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;
export const ADMIN_SPREADSHEET_ID = INSTITUTIONAL_SPREADSHEET_ID;

export const MADRIJ_SHEET_NAME = "Madrijim";
export const JANIJ_SHEET_NAME = "Janijim";
export const PROYECTO_SHEET_NAME = "Proyectos";
export const COORDINADOR_SHEET_NAME = "Coordinadores";
export const DIRECTOR_SHEET_NAME = "Directores";
export const ADMIN_SHEET_NAME = "Admin";

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

export function getProyectoSheetConfig(): SheetConfig {
  return {
    spreadsheetId: PROYECTO_SPREADSHEET_ID,
    sheetName: PROYECTO_SHEET_NAME,
  };
}

export function getCoordinatorSheetConfig(): SheetConfig {
  return {
    spreadsheetId: COORDINADOR_SPREADSHEET_ID,
    sheetName: COORDINADOR_SHEET_NAME,
  };
}

export function getDirectorSheetConfig(): SheetConfig {
  return {
    spreadsheetId: DIRECTOR_SPREADSHEET_ID,
    sheetName: DIRECTOR_SHEET_NAME,
  };
}

export function getAdminSheetConfig(): SheetConfig {
  return {
    spreadsheetId: ADMIN_SPREADSHEET_ID,
    sheetName: ADMIN_SHEET_NAME,
  };
}

export const SYSTEM_CREATOR_ID = "google-sheets-sync";
