import { supabase } from "@/lib/supabase";

export async function getProyectosParaUsuario(userId: string) {
  const { data: relaciones, error } = await supabase
    .from("madrijim_grupos")
    .select("grupo_id")
    .eq("madrij_id", userId);

  if (error) throw error;

  const grupoIds = relaciones.map((entry) => entry.grupo_id);
  if (grupoIds.length === 0) return [];

  const { data: proyectos, error: e2 } = await supabase
    .from("proyectos")
    .select("id, nombre, creador_id, grupo_id")
    .in("grupo_id", grupoIds);

  if (e2) throw e2;

  return proyectos;
}

export async function getGrupoIdForProyecto(proyectoId: string) {
  const { data, error } = await supabase
    .from("proyectos")
    .select("grupo_id")
    .eq("id", proyectoId)
    .single();

  if (error) throw error;

  return data.grupo_id as string;
}

export async function renameProyecto(id: string, nombre: string) {
  const { error } = await supabase
    .from("proyectos")
    .update({ nombre })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProyecto(id: string) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw error;
}
