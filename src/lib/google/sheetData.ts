import removeAccents from "remove-accents";

import {
  getAdminSheetConfig,
  getCoordinatorSheetConfig,
  getDirectorSheetConfig,
  getJanijSheetConfig,
  getMadrijSheetConfig,
  getProyectoSheetConfig,
} from "./config";
import {
  getAdminsRows,
  getCoordinadoresRows,
  getDirectoresRows,
  getJanijimRows,
  getMadrijimRows,
  getProyectosRows,
} from "./sheets";

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

function parseBooleanCell(value: string | null) {
  if (!value) return false;
  const normalised = normaliseKey(value);
  return normalised === "true" || normalised === "1" || normalised === "si" || normalised === "sÃ­" || normalised === "yes" || normalised === "x";
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

export type ProyectoSheetEntry = {
  nombre: string;
  appliesToAll: boolean;
  grupos: string[];
};

const PROYECTO_HEADERS: Record<string, "proyecto" | "general" | "grupo"> = {
  proyecto: "proyecto",
  nombre: "proyecto",
  "nombre del proyecto": "proyecto",
  "es general": "general",
  general: "general",
  grupo: "grupo",
};

export function buildProyectoEntries(rows: unknown[][]) {
  if (rows.length === 0) return [] as ProyectoSheetEntry[];
  const [header, ...dataRows] = rows;

  const mapping = {} as Record<"proyecto" | "general" | "grupo", number | undefined>;
  header.forEach((value, index) => {
    const key = PROYECTO_HEADERS[normaliseHeader(String(value))];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });

  const proyectos = new Map<
    string,
    {
      nombre: string;
      appliesToAll: boolean;
      grupos: Set<string>;
    }
  >();

  for (const row of dataRows) {
    const nombre = readCell(row, mapping.proyecto);
    if (!nombre) continue;
    const key = normaliseKey(nombre);
    let entry = proyectos.get(key);
    if (!entry) {
      entry = {
        nombre,
        appliesToAll: false,
        grupos: new Set<string>(),
      };
      proyectos.set(key, entry);
    } else if (entry.nombre.trim().length === 0) {
      entry.nombre = nombre;
    }

    const isGeneral = parseBooleanCell(readCell(row, mapping.general) ?? null);
    if (isGeneral) {
      entry.appliesToAll = true;
      entry.grupos.clear();
      continue;
    }

    if (!entry.appliesToAll) {
      const grupoNombre = readCell(row, mapping.grupo);
      if (grupoNombre) {
        entry.grupos.add(grupoNombre);
      }
    }
  }

  return Array.from(proyectos.values()).map((entry) => ({
    nombre: entry.nombre,
    appliesToAll: entry.appliesToAll,
    grupos: Array.from(entry.grupos),
  }));
}

export type CoordinadorSheetEntry = {
  email: string;
  nombre: string;
  proyectos: string[];
};

const COORD_HEADERS: Record<string, "nombre" | "apellido" | "email" | "proyectos"> = {
  nombre: "nombre",
  apellido: "apellido",
  "nombre y apellido": "nombre",
  "nombre completo": "nombre",
  email: "email",
  mail: "email",
  correo: "email",
  proyecto: "proyectos",
  proyectos: "proyectos",
  "lista de proyectos": "proyectos",
};

function parseProjectList(value: string | null) {
  if (!value) return [] as string[];
  return value
    .split(/[,;\n\r]+/u)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function buildCoordinadorEntries(rows: unknown[][]) {
  if (rows.length === 0) return [] as CoordinadorSheetEntry[];
  const [header, ...dataRows] = rows;
  const mapping = {} as Record<"nombre" | "apellido" | "email" | "proyectos", number | undefined>;
  header.forEach((value, index) => {
    const key = COORD_HEADERS[normaliseHeader(String(value))];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });

  const entries: CoordinadorSheetEntry[] = [];
  for (const row of dataRows) {
    const emailRaw = readCell(row, mapping.email);
    if (!emailRaw) continue;
    const email = emailRaw.toLowerCase();
    const nombre = joinNombre(readCell(row, mapping.nombre), readCell(row, mapping.apellido)) ?? email;
    const proyectos = parseProjectList(readCell(row, mapping.proyectos));
    entries.push({ email, nombre, proyectos });
  }
  return entries;
}

export type RolBasicoSheetEntry = {
  email: string;
  nombre: string;
};

const ROL_BASICO_HEADERS: Record<string, "nombre" | "apellido" | "email"> = {
  nombre: "nombre",
  apellido: "apellido",
  "nombre y apellido": "nombre",
  "nombre completo": "nombre",
  email: "email",
  mail: "email",
  correo: "email",
};

export function buildRolBasicoEntries(rows: unknown[][]) {
  if (rows.length === 0) return [] as RolBasicoSheetEntry[];
  const [header, ...dataRows] = rows;
  const mapping = {} as Record<"nombre" | "apellido" | "email", number | undefined>;
  header.forEach((value, index) => {
    const key = ROL_BASICO_HEADERS[normaliseHeader(String(value))];
    if (key && mapping[key] === undefined) {
      mapping[key] = index;
    }
  });

  const entries: RolBasicoSheetEntry[] = [];
  for (const row of dataRows) {
    const emailRaw = readCell(row, mapping.email);
    if (!emailRaw) continue;
    const email = emailRaw.toLowerCase();
    const nombre = joinNombre(readCell(row, mapping.nombre), readCell(row, mapping.apellido)) ?? email;
    entries.push({ email, nombre });
  }
  return entries;
}

export type SheetsData = {
  madrijes: MadrijSheetEntry[];
  janijim: JanijSheetEntry[];
  proyectos: ProyectoSheetEntry[];
  coordinadores: CoordinadorSheetEntry[];
  directores: RolBasicoSheetEntry[];
  admins: RolBasicoSheetEntry[];
};

export async function loadSheetsData(): Promise<SheetsData> {
  const madConfig = getMadrijSheetConfig();
  const janConfig = getJanijSheetConfig();
  const proyectoConfig = getProyectoSheetConfig();
  const coordConfig = getCoordinatorSheetConfig();
  const dirConfig = getDirectorSheetConfig();
  const adminConfig = getAdminSheetConfig();
  const [madRows, janRows, proyectoRows, coordRows, dirRows, adminRows] = await Promise.all([
    getMadrijimRows(madConfig.spreadsheetId, madConfig.sheetName),
    getJanijimRows(janConfig.spreadsheetId, janConfig.sheetName),
    getProyectosRows(proyectoConfig.spreadsheetId, proyectoConfig.sheetName),
    getCoordinadoresRows(coordConfig.spreadsheetId, coordConfig.sheetName),
    getDirectoresRows(dirConfig.spreadsheetId, dirConfig.sheetName),
    getAdminsRows(adminConfig.spreadsheetId, adminConfig.sheetName),
  ]);

  return {
    madrijes: buildMadrijEntries(madRows),
    janijim: buildJanijEntries(janRows),
    proyectos: buildProyectoEntries(proyectoRows),
    coordinadores: buildCoordinadorEntries(coordRows),
    directores: buildRolBasicoEntries(dirRows),
    admins: buildRolBasicoEntries(adminRows),
  };
}

export function normaliseGroupName(value: string) {
  return normaliseKey(value);
}

export function normaliseEmail(value: string) {
  return value.trim().toLowerCase();
}
