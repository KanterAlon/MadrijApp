import removeAccents from "remove-accents";
import { google } from "googleapis";

const SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"];
const SERVICE_ACCOUNT_HINT =
  "Confirma que GOOGLE_SERVICE_ACCOUNT_EMAIL use el correo de la cuenta de servicio (termina en gserviceaccount.com) y que compartiste las planillas con ese usuario.";

function parsePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  const withoutTrailingComma = trimmed.replace(/,+\s*$/, "");
  const normalized = withoutTrailingComma.replace(/\\n/g, "\n");
  if (normalized.includes("-----BEGIN")) {
    return normalized;
  }

  try {
    const decoded = Buffer.from(withoutTrailingComma, "base64")
      .toString("utf8")
      .trim()
      .replace(/,+\s*$/, "");
    if (decoded.includes("-----BEGIN")) {
      return decoded.replace(/\\n/g, "\n");
    }
  } catch {
    /* ignore decode errors */
  }

  return normalized;
}

function sanitizeServiceAccountEmail(value: string | undefined) {
  const email = (value ?? "").trim();
  if (!email) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_EMAIL no esta definido");
  }
  if (!email.includes(".gserviceaccount.com")) {
    throw new Error(
      `GOOGLE_SERVICE_ACCOUNT_EMAIL debe apuntar a una cuenta de servicio. ${SERVICE_ACCOUNT_HINT}`,
    );
  }
  return email;
}

function isInvalidGrant(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const maybeError = error as {
    message?: string;
    response?: { data?: { error?: string; error_description?: string } };
  };

  const message = maybeError.message ?? "";
  const code = maybeError.response?.data?.error ?? "";
  const description = maybeError.response?.data?.error_description ?? "";

  const haystack = `${message} ${code} ${description}`.toLowerCase();
  return haystack.includes("invalid_grant");
}

function buildAuthError(error: unknown) {
  const base =
    "No se pudo autenticar con Google Sheets. Revisa GOOGLE_SERVICE_ACCOUNT_EMAIL y GOOGLE_SERVICE_ACCOUNT_KEY.";
  if (isInvalidGrant(error)) {
    return `${base} ${SERVICE_ACCOUNT_HINT}`;
  }
  return base;
}

async function createSheetsClient() {
  const rawClientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;

  if (!privateKey) {
    throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no esta definido");
  }

  const clientEmail = sanitizeServiceAccountEmail(rawClientEmail);

  const jwt = new google.auth.JWT({
    email: clientEmail,
    key: parsePrivateKey(privateKey),
    scopes: SCOPES,
  });

  try {
    await jwt.authorize();
  } catch (error) {
    throw new Error(buildAuthError(error), { cause: error instanceof Error ? error : undefined });
  }

  return google.sheets({ version: "v4", auth: jwt });
}

let sheetsPromise: ReturnType<typeof createSheetsClient> | null = null;

async function getSheetsClient() {
  if (!sheetsPromise) {
    sheetsPromise = createSheetsClient().catch((error) => {
      sheetsPromise = null;
      throw error;
    });
  }
  return sheetsPromise;
}

function normaliseTitle(value: string) {
  return removeAccents(value).trim().toLowerCase();
}

function buildRange(title: string) {
  return `${title.includes("'") ? `'${title.replace(/'/g, "''")}'` : `'${title}'`}`;
}

function isParseRangeError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const maybeError = error as {
    code?: number;
    errors?: Array<{ message?: string }>;
    message?: string;
  };
  if (maybeError.code !== 400) return false;
  const direct = (maybeError.message ?? "").toLowerCase();
  if (direct.includes("unable to parse range")) return true;
  const messages = (maybeError.errors ?? []).map((item) => item.message ?? "").join(" ").toLowerCase();
  return messages.includes("unable to parse range");
}

async function listSheetTitles(spreadsheetId: string) {
  const sheets = await getSheetsClient();
  const res = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: "sheets(properties(title))",
  });
  return (res.data.sheets ?? [])
    .map((sheet) => sheet.properties?.title)
    .filter((title): title is string => Boolean(title && title.trim()));
}

async function resolveSheetRange(spreadsheetId: string, desiredName: string) {
  const titles = await listSheetTitles(spreadsheetId);
  const desiredKey = normaliseTitle(desiredName);
  const match = titles.find((title) => normaliseTitle(title) === desiredKey);
  if (match) {
    return buildRange(match);
  }

  const suggestionList = titles.map((title) => `- ${title}`).join("\n");
  throw new Error(
    [
      `No se encontro la pestaña "${desiredName}" en la planilla.`,
      "Verifica que el nombre coincida exactamente con la hoja institucional.",
      suggestionList ? `Pestañas disponibles:\n${suggestionList}` : "La planilla no tiene pestañas visibles.",
    ].join("\n"),
  );
}

async function fetchSheet(spreadsheetId: string, sheetName: string) {
  const sheets = await getSheetsClient();
  const trimmed = sheetName.trim();
  if (!trimmed) {
    throw new Error("Sheet name is required");
  }

  const attempt = async (range: string) =>
    sheets.spreadsheets.values.get({
      spreadsheetId,
      range,
      valueRenderOption: "UNFORMATTED_VALUE",
      dateTimeRenderOption: "FORMATTED_STRING",
    });

  try {
    const primaryRange = buildRange(trimmed);
    const res = await attempt(primaryRange);
    return res.data.values ?? [];
  } catch (error) {
    if (!isParseRangeError(error)) {
      throw error;
    }
    const fallbackRange = await resolveSheetRange(spreadsheetId, trimmed);
    const res = await attempt(fallbackRange);
    return res.data.values ?? [];
  }
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

export async function getProyectosRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}

export async function getCoordinadoresRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}

export async function getDirectoresRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}

export async function getAdminsRows(
  spreadsheetId: string,
  sheetName: string,
) {
  return fetchSheet(spreadsheetId, sheetName);
}
