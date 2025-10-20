import {
  getAdminSheetConfig,
  getCoordinatorSheetConfig,
  getDirectorSheetConfig,
  getJanijSheetConfig,
  getMadrijSheetConfig,
  getProyectoSheetConfig,
} from "@/lib/google/config";
import { overwriteSheetValues } from "@/lib/google/sheets";
import type {
  CoordinadorSheetEntry,
  JanijSheetEntry,
  MadrijSheetEntry,
  ProyectoSheetEntry,
  RolBasicoSheetEntry,
  SheetsData,
} from "@/lib/google/sheetData";

function sanitizeCell(value: string | null | undefined) {
  return (value ?? "").trim();
}

function buildMadrijRows(entries: MadrijSheetEntry[]) {
  const header = ["Nombre completo", "Email", "Grupo"];
  const rows = entries.map((entry) => [
    sanitizeCell(entry.nombre),
    sanitizeCell(entry.email),
    sanitizeCell(entry.grupoNombre),
  ]);
  return [header, ...rows];
}

function buildJanijRows(entries: JanijSheetEntry[]) {
  const header = ["Nombre completo", "Grupo", "Teléfono madre", "Teléfono padre"];
  const rows = entries.map((entry) => [
    sanitizeCell(entry.nombre),
    sanitizeCell(entry.grupoNombre),
    sanitizeCell(entry.telMadre),
    sanitizeCell(entry.telPadre),
  ]);
  return [header, ...rows];
}

function buildProyectoRows(entries: ProyectoSheetEntry[]) {
  const maxGrupos = entries.reduce((acc, entry) => Math.max(acc, entry.grupos.length), 0);
  const header = ["Proyecto", ...Array.from({ length: maxGrupos }, (_, index) => `Grupo ${index + 1}`)];
  const rows = entries.map((entry) => {
    const base = [sanitizeCell(entry.nombre)];
    const grupos = entry.grupos.map((grupo) => sanitizeCell(grupo));
    const padded = [...grupos];
    while (padded.length < maxGrupos) {
      padded.push("");
    }
    return [...base, ...padded];
  });
  return [header, ...rows];
}

function buildCoordinatorRows(entries: CoordinadorSheetEntry[]) {
  const header = ["Nombre completo", "Email", "Proyectos"];
  const rows = entries.map((entry) => [
    sanitizeCell(entry.nombre),
    sanitizeCell(entry.email),
    entry.proyectos.map((proyecto) => sanitizeCell(proyecto)).join("\n"),
  ]);
  return [header, ...rows];
}

function buildRoleRows(entries: RolBasicoSheetEntry[]) {
  const header = ["Nombre completo", "Email"];
  const rows = entries.map((entry) => [sanitizeCell(entry.nombre), sanitizeCell(entry.email)]);
  return [header, ...rows];
}

export async function saveSheetsData(data: SheetsData) {
  const madConfig = getMadrijSheetConfig();
  const janConfig = getJanijSheetConfig();
  const proyectoConfig = getProyectoSheetConfig();
  const coordConfig = getCoordinatorSheetConfig();
  const dirConfig = getDirectorSheetConfig();
  const adminConfig = getAdminSheetConfig();

  const payloads: Array<Promise<void>> = [];

  payloads.push(
    overwriteSheetValues(madConfig.spreadsheetId, madConfig.sheetName, buildMadrijRows(data.madrijes)),
  );
  payloads.push(
    overwriteSheetValues(janConfig.spreadsheetId, janConfig.sheetName, buildJanijRows(data.janijim)),
  );
  payloads.push(
    overwriteSheetValues(
      proyectoConfig.spreadsheetId,
      proyectoConfig.sheetName,
      buildProyectoRows(data.proyectos),
    ),
  );
  payloads.push(
    overwriteSheetValues(
      coordConfig.spreadsheetId,
      coordConfig.sheetName,
      buildCoordinatorRows(data.coordinadores),
    ),
  );
  payloads.push(
    overwriteSheetValues(dirConfig.spreadsheetId, dirConfig.sheetName, buildRoleRows(data.directores)),
  );
  payloads.push(
    overwriteSheetValues(adminConfig.spreadsheetId, adminConfig.sheetName, buildRoleRows(data.admins)),
  );

  await Promise.all(payloads);
}
