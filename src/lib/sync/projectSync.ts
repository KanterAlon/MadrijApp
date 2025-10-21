import { SYSTEM_CREATOR_ID } from "@/lib/google/config";
import { normaliseGroupName } from "@/lib/google/sheetData";
import { supabase } from "@/lib/supabase";

export async function ensureProyectoRecord(nombre: string) {
  const trimmed = nombre.trim();
  if (!trimmed) {
    throw new Error("El proyecto debe tener un nombre valido");
  }

  const normalised = normaliseGroupName(trimmed);

  const { data: exactMatches, error: exactError } = await supabase
    .from("proyectos")
    .select("id, nombre")
    .eq("nombre", trimmed);

  if (exactError) throw exactError;

  if (exactMatches && exactMatches.length > 0) {
    const match = exactMatches[0];
    return { id: match.id as string, nombre: match.nombre as string };
  }

  const { data: allProjects, error: listError } = await supabase
    .from("proyectos")
    .select("id, nombre");

  if (listError) throw listError;

  const normalisedMatch = (allProjects ?? []).find((row) => {
    const existingNombre = row.nombre as string | null;
    if (!existingNombre) return false;
    return normaliseGroupName(existingNombre) === normalised;
  });

  if (normalisedMatch) {
    const updates: Record<string, unknown> = {};
    if ((normalisedMatch.nombre as string) !== trimmed) {
      updates.nombre = trimmed;
    }
    if (Object.keys(updates).length > 0) {
      const { error: updateError } = await supabase
        .from("proyectos")
        .update(updates)
        .eq("id", normalisedMatch.id);
      if (updateError) throw updateError;
    }
    return {
      id: normalisedMatch.id as string,
      nombre: (updates.nombre as string | undefined) ?? (normalisedMatch.nombre as string),
    };
  }

  const { data: created, error: insertError } = await supabase
    .from("proyectos")
    .insert({
      nombre: trimmed,
      creador_id: SYSTEM_CREATOR_ID,
      applies_to_all: false,
    })
    .select("id, nombre")
    .single();

  if (insertError || !created) {
    throw insertError ?? new Error("No se pudo crear el proyecto");
  }

  return { id: created.id as string, nombre: created.nombre as string };
}

export async function ensureProyectoGrupoLink(proyectoId: string, grupoId: string) {
  const { data: existing, error: existingError } = await supabase
    .from("proyecto_grupos")
    .select("id, proyecto_id")
    .eq("grupo_id", grupoId);

  if (existingError) throw existingError;

  const rows = existing ?? [];
  const keepRow = rows.find((row) => row.proyecto_id === proyectoId);
  let retainedRowId = keepRow ? (keepRow.id as string) : undefined;

  if (!retainedRowId) {
    const rowToUpdate = rows[0];
    if (rowToUpdate) {
      const { error: updateLinkError } = await supabase
        .from("proyecto_grupos")
        .update({ proyecto_id: proyectoId })
        .eq("id", rowToUpdate.id);
      if (updateLinkError) throw updateLinkError;
      retainedRowId = rowToUpdate.id as string;
    } else {
      const { error: insertError } = await supabase
        .from("proyecto_grupos")
        .insert({ proyecto_id: proyectoId, grupo_id: grupoId });
      if (insertError) throw insertError;
      // No rows existed previously, nothing to clean up.
    }
  }

  const rowsToDelete = rows.filter((row) => (row.id as string) !== retainedRowId);
  if (rowsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("proyecto_grupos")
      .delete()
      .in(
        "id",
        rowsToDelete.map((row) => row.id as string),
      );
    if (deleteError) throw deleteError;
  }

  // The legacy grupo_id column is no longer used, keep it null to avoid confusions.
  await supabase.from("proyectos").update({ grupo_id: null }).eq("id", proyectoId);
}
