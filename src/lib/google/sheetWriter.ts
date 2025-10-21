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
  const header = [
    "Nombre completo",
    "Grupo Principal",
    "Otro Grupo 1",
    "Otro Grupo 2",
    "TelÃ©fono madre",
    "TelÃ©fono padre",
    "NÃºmero socio",
  ];
  const rows = entries.map((entry) => {
    const [extra1, extra2] = entry.otrosGrupos.map((grupo) => sanitizeCell(grupo.nombre));
    return [
      sanitizeCell(entry.nombre),
      sanitizeCell(entry.grupoPrincipalNombre),
      extra1 ?? "",
      extra2 ?? "",
      sanitizeCell(entry.telMadre),
      sanitizeCell(entry.telPadre),
      sanitizeCell(entry.numeroSocio),
    ];
  });
  return [header, ...rows];
}

function buildProyectoRows(entries: ProyectoSheetEntry[]) {
  const header = ["Proyecto", "Grupo"];
  const rows: string[][] = [];

  entries.forEach((entry) => {
    if (entry.grupos.length === 0) {
      rows.push([sanitizeCell(entry.nombre), ""]);
      return;
    }

    entry.grupos.forEach((grupo) => {
      rows.push([sanitizeCell(entry.nombre), sanitizeCell(grupo)]);
    });
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
