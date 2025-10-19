const DEFAULT_MADRIJ_SPREADSHEET_ID = "1lVMJx9lCH3O-oypWGXWZ9RD4YQVctZlmppV3Igqge64";
const DEFAULT_JANIJ_SPREADSHEET_ID = "1u3KFbCBItK5oN5VEl55Kq7tlRxTb3qJ2FSMl9tS0Cjs";
const DEFAULT_MADRIJ_SHEET_NAME = process.env.GOOGLE_MADRIJ_SHEET_NAME ?? "Madrijim";
const DEFAULT_JANIJ_SHEET_NAME = process.env.GOOGLE_JANIJ_SHEET_NAME ?? "Janijim";

export type SheetConfig = {
  spreadsheetId: string;
  sheetName: string;
};

function getEnvWithFallback(name: string, fallback: string) {
  const value = process.env[name];
  if (value && value.trim().length > 0) {
    return value.trim();
  }
  return fallback;
}

export function getMadrijSheetConfig(): SheetConfig {
  return {
    spreadsheetId: getEnvWithFallback(
      "GOOGLE_MADRIJ_SPREADSHEET_ID",
      DEFAULT_MADRIJ_SPREADSHEET_ID,
    ),
    sheetName: DEFAULT_MADRIJ_SHEET_NAME,
  };
}

export function getJanijSheetConfig(): SheetConfig {
  return {
    spreadsheetId: getEnvWithFallback(
      "GOOGLE_JANIJ_SPREADSHEET_ID",
      DEFAULT_JANIJ_SPREADSHEET_ID,
    ),
    sheetName: DEFAULT_JANIJ_SHEET_NAME,
  };
}

export const SYSTEM_CREATOR_ID = "google-sheets-sync";
