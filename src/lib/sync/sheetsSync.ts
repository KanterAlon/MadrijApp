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
  if (entries.length === 0) {
    const { data: existing } = await supabase
      .from("janijim")
      .select("id")
      .eq("grupo_id", grupoId)
      .eq("activo", true);

    const ids = (existing ?? []).map((row) => row.id as string);

    if (ids.length > 0) {
      const { error } = await supabase.from("janijim").update({ activo: false }).in("id", ids);
      if (error) throw error;

      const { error: extrasError } = await supabase
        .from("janijim_grupos_extra")
        .delete()
        .in("janij_id", ids);
      if (extrasError) throw extrasError;
    }

    return { inserted: 0, updated: 0, deactivated: ids.length };
  }

  const { data: existing, error } = await supabase
    .from("janijim")
    .select("id, nombre, activo")
    .eq("grupo_id", grupoId);

  if (error) throw error;

  const existingMap = new Map<string, (typeof existing)[number]>();
  for (const row of existing ?? []) {
    existingMap.set(normaliseGroupName(row.nombre as string), row);
  }

  const seen = new Set<string>();
  const updates: {
    id: string;
    proyecto_id: string;
    grupo_id: string;
    nombre: string;
    grupo: string;
    tel_madre: string | null;
    tel_padre: string | null;
    numero_socio: string | null;
    activo: boolean;
  }[] = [];
  const inserts: {
    proyecto_id: string;
    grupo_id: string;
    nombre: string;
    grupo: string;
    tel_madre: string | null;
    tel_padre: string | null;
    numero_socio: string | null;
    activo: boolean;
  }[] = [];

  for (const entry of entries) {
    const key = normaliseGroupName(entry.nombre);
    const existingRow = existingMap.get(key);
    seen.add(key);
    if (existingRow) {
      updates.push({
        id: existingRow.id as string,
        proyecto_id: proyectoId,
        grupo_id: grupoId,
        nombre: entry.nombre,
        grupo: grupoNombre,
        tel_madre: entry.telMadre,
        tel_padre: entry.telPadre,
        numero_socio: entry.numeroSocio,
        activo: true,
      });
    } else {
      inserts.push({
        proyecto_id: proyectoId,
        grupo_id: grupoId,
        nombre: entry.nombre,
        grupo: grupoNombre,
        tel_madre: entry.telMadre,
        tel_padre: entry.telPadre,
        numero_socio: entry.numeroSocio,
        activo: true,
      });
    }
  }

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

    const { error: extrasCleanupError } = await supabase
      .from("janijim_grupos_extra")
      .delete()
      .in("janij_id", deactivateIds);
    if (extrasCleanupError) throw extrasCleanupError;
  }

  const desiredKeys = entries.map((entry) => normaliseGroupName(entry.nombre));
  const desiredKeySet = new Set(desiredKeys);
  const { data: refreshed, error: refreshedError } = await supabase
    .from("janijim")
    .select("id, nombre")
    .eq("grupo_id", grupoId)
    .in(
      "nombre",
      entries.map((entry) => entry.nombre),
    );

  if (refreshedError) throw refreshedError;

  const idByKey = new Map<string, string>();
  for (const row of refreshed ?? []) {
    const nombre = row.nombre as string | null;
    if (!nombre) continue;
    const key = normaliseGroupName(nombre);
    if (!desiredKeySet.has(key)) continue;
    idByKey.set(key, row.id as string);
  }

  const janijIds = Array.from(idByKey.values());

  const extraGroupNames = new Map<string, string>();
  for (const entry of entries) {
    for (const extra of entry.otrosGrupos) {
      if (!extraGroupNames.has(extra.key)) {
        extraGroupNames.set(extra.key, extra.nombre);
      }
    }
  }

  const extraGroupIdByKey = new Map<string, string>();
  for (const [key, nombre] of extraGroupNames.entries()) {
    const groupId = await ensureGrupoRecord(nombre);
    extraGroupIdByKey.set(key, groupId);
  }

  const existingExtrasByJanij = new Map<string, { id: string; grupo_id: string }[]>();
  if (janijIds.length > 0) {
    const { data: extrasRows, error: extrasError } = await supabase
      .from("janijim_grupos_extra")
      .select("id, janij_id, grupo_id")
      .in("janij_id", janijIds);

    if (extrasError) throw extrasError;

    for (const row of extrasRows ?? []) {
      const janijId = row.janij_id as string | null;
      const grupo = row.grupo_id as string | null;
      if (!janijId || !grupo) continue;
      let list = existingExtrasByJanij.get(janijId);
      if (!list) {
        list = [];
        existingExtrasByJanij.set(janijId, list);
      }
      list.push({ id: row.id as string, grupo_id: grupo });
    }
  }

  const extrasToInsert: { janij_id: string; grupo_id: string }[] = [];
  const extrasToDelete: string[] = [];

  for (const entry of entries) {
    const key = normaliseGroupName(entry.nombre);
    const janijId = idByKey.get(key);
    if (!janijId) continue;

    const desiredGroupIds = entry.otrosGrupos
      .map((extra) => extraGroupIdByKey.get(extra.key))
      .filter((value): value is string => Boolean(value));
    const desiredSet = new Set(desiredGroupIds);

    const existingExtras = existingExtrasByJanij.get(janijId) ?? [];
    const existingSet = new Set(existingExtras.map((row) => row.grupo_id));

    for (const grupoExtraId of desiredGroupIds) {
      if (!existingSet.has(grupoExtraId)) {
        extrasToInsert.push({ janij_id: janijId, grupo_id: grupoExtraId });
      }
    }

    for (const row of existingExtras) {
      if (!desiredSet.has(row.grupo_id)) {
        extrasToDelete.push(row.id);
      }
    }
  }

  if (extrasToInsert.length > 0) {
    const { error: insertExtrasError } = await supabase
      .from("janijim_grupos_extra")
      .insert(extrasToInsert);
    if (insertExtrasError) throw insertExtrasError;
  }

  if (extrasToDelete.length > 0) {
    const { error: deleteExtrasError } = await supabase
      .from("janijim_grupos_extra")
      .delete()
      .in("id", extrasToDelete);
    if (deleteExtrasError) throw deleteExtrasError;
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
  const janEntries = data.janijim.filter((entry) => entry.grupoPrincipalKey === key);

  const displayNombre = ensureNombre(
    madEntries[0]?.grupoNombre ?? janEntries[0]?.grupoPrincipalNombre ?? groupName,
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
