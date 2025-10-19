import removeAccents from "remove-accents";

import { getJanijSheetConfig, getMadrijSheetConfig } from "./config";
import { getJanijimRows, getMadrijimRows } from "./sheets";

function normaliseKey(value: string) {
  return removeAccents(value).trim().toLowerCase();
}

function normaliseHeader(value: string) {
  return normaliseKey(value.replace(/[^\p{L}\p{N}]+/gu, " "));
}

function readCell(row: unknown[], index: number | undefined) {
  if (index === undefined) return null;
  const value = row[index];
  if (value == null) return null;
  return String(value).trim();
}

function joinNombre(nombre: string | null, apellido: string | null) {
  const parts = [nombre, apellido].filter((part) => Boolean(part && part.trim()));
  if (parts.length === 0) return null;
  return parts.join(" ").trim();
}

export type MadrijSheetEntry = {
  email: string;
  nombre: string;
  grupoNombre: string;
  grupoKey: string;
};

const MAD_HEADERS: Record<string, "nombre" | "apellido" | "email" | "grupo"> = {
  nombre: "nombre",
  apellido: "apellido",
  "nombre y apellido": "nombre",
  "nombre completo": "nombre",
  email: "email",
  mail: "email",
  correo: "email",
  grupo: "grupo",
};

export function buildMadrijEntries(rows: unknown[][]) {
  if (rows.length === 0) return [] as MadrijSheetEntry[];
  const [header, ...dataRows] = rows;
  const mapping = {} as Record<"nombre" | "apellido" | "email" | "grupo", number | undefined>;
  header.forEach((value, index) => {
    const key = MAD_HEADERS[normaliseHeader(String(value))];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });

  const entries: MadrijSheetEntry[] = [];
  for (const row of dataRows) {
    const emailRaw = readCell(row, mapping.email);
    if (!emailRaw) continue;
    const email = emailRaw.toLowerCase();
    const nombre = joinNombre(readCell(row, mapping.nombre), readCell(row, mapping.apellido)) ?? email;
    const grupoNombre = readCell(row, mapping.grupo)?.trim() ?? "";
    if (!grupoNombre) continue;
    entries.push({
      email,
      nombre,
      grupoNombre,
      grupoKey: normaliseKey(grupoNombre),
    });
  }
  return entries;
}

export type JanijSheetEntry = {
  nombre: string;
  grupoNombre: string;
  grupoKey: string;
  telMadre: string | null;
  telPadre: string | null;
};

const JANIJ_HEADERS: Record<string, "nombre" | "apellido" | "grupo" | "telMadre" | "telPadre"> = {
  nombre: "nombre",
  apellido: "apellido",
  "nombre y apellido": "nombre",
  "nombre completo": "nombre",
  grupo: "grupo",
  kvutza: "grupo",
  "telefono madre": "telMadre",
  "telefono de la madre": "telMadre",
  "tel madre": "telMadre",
  "telefono papa": "telPadre",
  "telefono padre": "telPadre",
  "tel padre": "telPadre",
};

export function buildJanijEntries(rows: unknown[][]) {
  if (rows.length === 0) return [] as JanijSheetEntry[];
  const [header, ...dataRows] = rows;
  const mapping = {} as Record<
    "nombre" | "apellido" | "grupo" | "telMadre" | "telPadre",
    number | undefined
  >;
  header.forEach((value, index) => {
    const key = JANIJ_HEADERS[normaliseHeader(String(value))];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });

  const entries: JanijSheetEntry[] = [];
  for (const row of dataRows) {
    const nombre = joinNombre(readCell(row, mapping.nombre), readCell(row, mapping.apellido));
    if (!nombre) continue;
    const grupoNombre = readCell(row, mapping.grupo)?.trim() ?? "";
    if (!grupoNombre) continue;
    entries.push({
      nombre,
      grupoNombre,
      grupoKey: normaliseKey(grupoNombre),
      telMadre: readCell(row, mapping.telMadre),
      telPadre: readCell(row, mapping.telPadre),
    });
  }
  return entries;
}

export type SheetsData = {
  madrijes: MadrijSheetEntry[];
  janijim: JanijSheetEntry[];
};

export async function loadSheetsData(): Promise<SheetsData> {
  const madConfig = getMadrijSheetConfig();
  const janConfig = getJanijSheetConfig();
  const [madRows, janRows] = await Promise.all([
    getMadrijimRows(madConfig.spreadsheetId, madConfig.sheetName),
    getJanijimRows(janConfig.spreadsheetId, janConfig.sheetName),
  ]);

  return {
    madrijes: buildMadrijEntries(madRows),
    janijim: buildJanijEntries(janRows),
  };
}

export function normaliseGroupName(value: string) {
  return normaliseKey(value);
}

export function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}
