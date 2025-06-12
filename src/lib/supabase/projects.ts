import { supabase } from "@/lib/supabase";

export async function getProyectosParaUsuario(userId: string) {
  const { data, error } = await supabase
    .from("madrijim_proyectos")
    .select("proyecto:proyecto_id (id, nombre, creador_id)")
    .eq("madrij_id", userId);

  if (error) throw error;
  return data.map((entry) => entry.proyecto);
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
