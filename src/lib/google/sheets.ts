import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];

function parsePrivateKey(raw: string): string {
  const normalized = raw.replace(/\\n/g, "\n");
  if (normalized.includes("-----BEGIN")) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(normalized, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) {
      return decoded;
    }
  } catch {
    /* ignore decode errors */
  }

  return normalized;
}

async function createSheetsClient() {
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account environment variables");
  }

  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: parsePrivateKey(privateKey),
    scopes: SCOPES,
  });

  await jwt.authorize();
  return google.sheets({ version: "v4", auth: jwt });
}

let sheetsPromise: ReturnType<typeof createSheetsClient> | null = null;

async function getSheetsClient() {
  if (!sheetsPromise) {
    sheetsPromise = createSheetsClient();
  }
  return sheetsPromise;
}

function sanitizeRange(sheetName: string) {
  const trimmed = sheetName.trim();
  if (!trimmed) {
    throw new Error("Sheet name is required");
  }
  return `'${trimmed.replace(/'/g, "''")}'`;
}

async function fetchSheet(spreadsheetId: string, sheetName: string) {
  const sheets = await getSheetsClient();
  const range = sanitizeRange(sheetName);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
    valueRenderOption: "UNFORMATTED_VALUE",
    dateTimeRenderOption: "FORMATTED_STRING",
  });
  return res.data.values ?? [];
}

export async function getJanijimRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}

export async function getMadrijimRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}
