import { SYSTEM_CREATOR_ID } from "@/lib/google/config";
import { supabase } from "@/lib/supabase";

export async function ensureProyectoRecord(nombre: string) {
  const trimmed = nombre.trim();
  if (!trimmed) {
    throw new Error("El proyecto debe tener un nombre valido");
  }

  const { data: existing, error: existingError } = await supabase
    .from("proyectos")
    .select("id, nombre")
    .eq("nombre", trimmed)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    return { id: existing.id as string, nombre: existing.nombre as string };
  }

  const { data: created, error: insertError } = await supabase
    .from("proyectos")
    .insert({
      nombre: trimmed,
      creador_id: SYSTEM_CREATOR_ID,
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

  const keep = (existing ?? []).find((row) => row.proyecto_id === proyectoId);
  const toRemove = (existing ?? []).filter((row) => row.proyecto_id !== proyectoId);

  if (!keep) {
    const { error: insertError } = await supabase
      .from("proyecto_grupos")
      .insert({ proyecto_id: proyectoId, grupo_id: grupoId });
    if (insertError) throw insertError;
  }

  if (toRemove.length > 0) {
    const { error: deleteError } = await supabase
      .from("proyecto_grupos")
      .delete()
      .in(
        "id",
        toRemove.map((row) => row.id as string),
      );
    if (deleteError) throw deleteError;
  }

  // The legacy grupo_id column is no longer used, keep it null to avoid confusions.
  await supabase.from("proyectos").update({ grupo_id: null }).eq("id", proyectoId);
}
