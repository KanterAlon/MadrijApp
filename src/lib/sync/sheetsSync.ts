import { getJanijSheetConfig, getMadrijSheetConfig } from "@/lib/google/config";
import {
  type JanijSheetEntry,
  type MadrijSheetEntry,
  type SheetsData,
  loadSheetsData,
  normaliseEmail,
  normaliseGroupName,
} from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";
import { ensureProyectoRecord, ensureProyectoGrupoLink } from "@/lib/sync/projectSync";

function ensureNombre(value: string | null | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : fallback;
}

function pickDetailedValue(
  current: string | null | undefined,
  incoming: string | null | undefined,
): string | null {
  const currentValue = (current ?? "").trim();
  const incomingValue = (incoming ?? "").trim();
  if (incomingValue.length > currentValue.length) {
    return incomingValue.length > 0 ? incomingValue : null;
  }
  if (currentValue.length > 0) {
    return currentValue;
  }
  return incomingValue.length > 0 ? incomingValue : null;
}

function mergeJanijSheetEntry(base: JanijSheetEntry, extra: JanijSheetEntry): JanijSheetEntry {
  return {
    nombre: pickDetailedValue(base.nombre, extra.nombre) ?? base.nombre,
    grupoNombre: pickDetailedValue(base.grupoNombre, extra.grupoNombre) ?? base.grupoNombre,
    grupoKey: base.grupoKey || extra.grupoKey,
    telMadre: pickDetailedValue(base.telMadre, extra.telMadre),
    telPadre: pickDetailedValue(base.telPadre, extra.telPadre),
    numeroSocio: pickDetailedValue(base.numeroSocio, extra.numeroSocio),
  };
}

export function dedupeJanijEntries(entries: JanijSheetEntry[]): JanijSheetEntry[] {
  const byKey = new Map<string, JanijSheetEntry>();
  for (const entry of entries) {
    const nombreKey = normaliseGroupName(entry.nombre);
    const key = entry.grupoKey ? `${entry.grupoKey}|${nombreKey}` : nombreKey;
    if (!key) {
      continue;
    }
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeJanijSheetEntry(existing, entry) : entry);
  }
  return Array.from(byKey.values());
}

async function ensureGrupoRecord(nombre: string, expectedId?: string) {
  const janijConfig = getJanijSheetConfig();
  const madConfig = getMadrijSheetConfig();
  const trimmed = nombre.trim();
  if (!trimmed) {
    throw new Error("El grupo debe tener un nombre vÃ¡lido");
  }

  if (expectedId) {
    const { data: existingById } = await supabase
      .from("grupos")
      .select("id, nombre, spreadsheet_id, janij_sheet, madrij_sheet")
      .eq("id", expectedId)
      .maybeSingle();

    if (existingById) {
      const updates: Record<string, string> = {};
      if (existingById.nombre !== trimmed) {
        updates.nombre = trimmed;
      }
      if (existingById.spreadsheet_id !== janijConfig.spreadsheetId) {
        updates.spreadsheet_id = janijConfig.spreadsheetId;
      }
      if (existingById.janij_sheet !== janijConfig.sheetName) {
        updates.janij_sheet = janijConfig.sheetName;
      }
      if (existingById.madrij_sheet !== madConfig.sheetName) {
        updates.madrij_sheet = madConfig.sheetName;
      }
      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from("grupos")
          .update(updates)
          .eq("id", existingById.id);
        if (updateError) throw updateError;
      }
      return existingById.id as string;
    }
  }

  const { data: existing } = await supabase
    .from("grupos")
    .select("id, spreadsheet_id, janij_sheet, madrij_sheet")
    .eq("nombre", trimmed)
    .maybeSingle();

  if (existing) {
    const updates: Record<string, string> = {};
    if (existing.spreadsheet_id !== janijConfig.spreadsheetId) {
      updates.spreadsheet_id = janijConfig.spreadsheetId;
    }
    if (existing.janij_sheet !== janijConfig.sheetName) {
      updates.janij_sheet = janijConfig.sheetName;
    }
    if (existing.madrij_sheet !== madConfig.sheetName) {
      updates.madrij_sheet = madConfig.sheetName;
    }
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("grupos")
        .update(updates)
        .eq("id", existing.id);
      if (updateError) throw updateError;
    }
    return existing.id as string;
  }

  const { data: created, error } = await supabase
    .from("grupos")
    .insert({
      nombre: trimmed,
      spreadsheet_id: janijConfig.spreadsheetId,
      janij_sheet: janijConfig.sheetName,
      madrij_sheet: madConfig.sheetName,
    })
    .select("id")
    .maybeSingle();

  if (error || !created) {
    throw error ?? new Error("No se pudo crear el grupo");
  }

  return created.id as string;
}

async function syncMadrijRecords(grupoId: string, entries: MadrijSheetEntry[]) {
  if (entries.length === 0) {
    const { data: existing } = await supabase
      .from("madrijim_grupos")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("activo", true);

    if (existing && existing.length > 0) {
      const { error } = await supabase
        .from("madrijim_grupos")
        .update({ activo: false })
        .in(
          "id",
          existing.map((row) => row.id as string),
        );
      if (error) throw error;
    }

    return { inserted: 0, updated: 0, deactivated: existing?.length ?? 0 };
  }

  const uniqueProfiles = new Map<string, { email: string; nombre: string }>();
  for (const entry of entries) {
    const email = normaliseEmail(entry.email);
    if (!uniqueProfiles.has(email)) {
      uniqueProfiles.set(email, { email, nombre: ensureNombre(entry.nombre, email) });
    }
  }

  if (uniqueProfiles.size > 0) {
    const payload = Array.from(uniqueProfiles.values());
    const { error } = await supabase
      .from("madrijim")
      .upsert(payload, { onConflict: "email" });
    if (error) throw error;
  }

  const { data: existing, error: existingError } = await supabase
    .from("madrijim_grupos")
    .select("id, madrij_id, email, nombre, rol, activo, invitado")
    .eq("grupo_id", grupoId);

  if (existingError) throw existingError;

  const existingMap = new Map<string, (typeof existing)[number]>();
  for (const row of existing ?? []) {
    const email = row.email ? normaliseEmail(row.email) : null;
    if (email) {
      existingMap.set(email, row);
    }
  }

  const seen = new Set<string>();
  const updates: {
    id: string;
    grupo_id: string;
    nombre: string;
    email: string;
    activo: boolean;
    invitado: boolean;
    rol: string | null;
    madrij_id: string | null;
  }[] = [];
  const inserts: {
    grupo_id: string;
    nombre: string;
    email: string;
    activo: boolean;
    invitado: boolean;
    rol: string;
  }[] = [];

  for (const entry of entries) {
    const email = normaliseEmail(entry.email);
    const nombre = ensureNombre(entry.nombre, email);
    const existingRow = existingMap.get(email);
    seen.add(email);
    if (existingRow) {
      updates.push({
        id: existingRow.id as string,
        grupo_id: grupoId,
        nombre,
        email,
        activo: true,
        invitado: false,
        rol: (existingRow.rol as string | null) ?? "miembro",
        madrij_id: (existingRow.madrij_id as string | null) ?? null,
      });
    } else {
      inserts.push({
        grupo_id: grupoId,
        nombre,
        email,
        activo: true,
        invitado: false,
        rol: "miembro",
      });
    }
  }

  if (inserts.length > 0) {
    const { error } = await supabase.from("madrijim_grupos").insert(inserts);
    if (error) throw error;
  }

  if (updates.length > 0) {
    const { error } = await supabase
      .from("madrijim_grupos")
      .upsert(updates, { onConflict: "id" });
    if (error) throw error;
  }

  const toDeactivate = (existing ?? [])
    .filter((row) => row.activo !== false)
    .filter((row) => {
      const email = row.email ? normaliseEmail(row.email) : null;
      return email ? !seen.has(email) : false;
    });

  if (toDeactivate.length > 0) {
    const { error } = await supabase
      .from("madrijim_grupos")
      .update({ activo: false })
      .in(
        "id",
        toDeactivate.map((row) => row.id as string),
      );
    if (error) throw error;
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    deactivated: toDeactivate.length,
  };
}

async function syncJanijRecords(
  grupoId: string,
  proyectoId: string,
  grupoNombre: string,
  entries: JanijSheetEntry[],
) {
  const uniqueEntries = dedupeJanijEntries(entries);

  if (uniqueEntries.length === 0) {
    const { data: existing } = await supabase
      .from("janijim")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("activo", true);

    const ids = (existing ?? []).map((row) => row.id as string);

    if (ids.length > 0) {
      const { error } = await supabase.from("janijim").update({ activo: false }).in("id", ids);
      if (error) throw error;
    }

    return { inserted: 0, updated: 0, deactivated: ids.length };
  }

  const { data: existing, error } = await supabase
    .from("janijim")
    .select("id, nombre, activo, extras")
    .eq("grupo_id", grupoId);

  if (error) throw error;

  const existingMap = new Map<string, (typeof existing)[number]>();
  for (const row of existing ?? []) {
    existingMap.set(normaliseGroupName(row.nombre as string), row);
  }

  const seen = new Set<string>();
  type JanijUpdatePayload = {
    id: string;
    proyecto_id: string;
    grupo_id: string;
    nombre: string;
    grupo: string;
    tel_madre: string | null;
    tel_padre: string | null;
    numero_socio: string | null;
    activo: boolean;
  };
  type JanijInsertPayload = {
    proyecto_id: string;
    grupo_id: string;
    nombre: string;
    grupo: string;
    tel_madre: string | null;
    tel_padre: string | null;
    numero_socio: string | null;
    activo: boolean;
  };
  const updateMap = new Map<string, JanijUpdatePayload>();
  const insertMap = new Map<string, JanijInsertPayload>();

  for (const entry of uniqueEntries) {
    const key = normaliseGroupName(entry.nombre);
    if (!key) {
      continue;
    }
    const existingRow = existingMap.get(key);
    if (existingRow) {
      seen.add(key);
      const payload: JanijUpdatePayload = {
        id: existingRow.id as string,
        proyecto_id: proyectoId,
        grupo_id: grupoId,
        nombre: entry.nombre,
        grupo: grupoNombre,
        tel_madre: entry.telMadre,
        tel_padre: entry.telPadre,
        numero_socio: entry.numeroSocio,
        activo: true,
      };
      updateMap.set(existingRow.id as string, payload);
    } else {
      const payload: JanijInsertPayload = {
        proyecto_id: proyectoId,
        grupo_id: grupoId,
        nombre: entry.nombre,
        grupo: grupoNombre,
        tel_madre: entry.telMadre,
        tel_padre: entry.telPadre,
        numero_socio: entry.numeroSocio,
        activo: true,
      };
      insertMap.set(key, payload);
    }
  }

  const updates = Array.from(updateMap.values());
  const inserts = Array.from(insertMap.values());

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("janijim").insert(inserts);
    if (insertError) throw insertError;
  }

  if (updates.length > 0) {
    const { error: updateError } = await supabase
      .from("janijim")
      .upsert(updates, { onConflict: "id" });
    if (updateError) throw updateError;
  }

  const toDeactivate = (existing ?? [])
    .filter((row) => row.activo !== false)
    .filter((row) => !seen.has(normaliseGroupName(row.nombre as string)));

  const deactivateIds = toDeactivate.map((row) => row.id as string);

  if (deactivateIds.length > 0) {
    const { error: deactivateError } = await supabase
      .from("janijim")
      .update({ activo: false })
      .in("id", deactivateIds);
    if (deactivateError) throw deactivateError;
  }

  return {
    inserted: inserts.length,
    updated: updates.length,
    deactivated: toDeactivate.length,
  };
}

export type SyncResult = {
  grupoId: string;
  grupoNombre: string;
  proyectoId: string;
  proyectoNombre: string;
  madrijim: { inserted: number; updated: number; deactivated: number };
  janijim: { inserted: number; updated: number; deactivated: number };
};

export async function syncGroupFromSheets(
  groupName: string,
  options?: { expectedGrupoId?: string; data?: SheetsData },
): Promise<SyncResult> {
  const data = options?.data ?? (await loadSheetsData());
  const key = normaliseGroupName(groupName);
  const madEntries = data.madrijes.filter((entry) => entry.grupoKey === key);
  const janEntries = data.janijim.filter((entry) => entry.grupoKey === key);

  const displayNombre = ensureNombre(
    madEntries[0]?.grupoNombre ?? janEntries[0]?.grupoNombre ?? groupName,
    groupName,
  );

  const grupoId = await ensureGrupoRecord(displayNombre, options?.expectedGrupoId);

  const projectAssignments = new Map<string, string>();
  for (const proyectoSheet of data.proyectos ?? []) {
    for (const grupoSheetNombre of proyectoSheet.grupos) {
      projectAssignments.set(normaliseGroupName(grupoSheetNombre), proyectoSheet.nombre);
    }
  }

  const assignedProjectName = projectAssignments.get(key) ?? displayNombre;
  const proyecto = await ensureProyectoRecord(assignedProjectName);
  await ensureProyectoGrupoLink(proyecto.id, grupoId);

  const madStats = await syncMadrijRecords(grupoId, madEntries);
  const janStats = await syncJanijRecords(grupoId, proyecto.id, displayNombre, janEntries);

  return {
    grupoId,
    grupoNombre: displayNombre,
    proyectoId: proyecto.id,
    proyectoNombre: proyecto.nombre,
    madrijim: madStats,
    janijim: janStats,
  };
}
