import { supabase } from "@/lib/supabase";

export async function getProyectosParaUsuario(userId: string) {
  const { data, error } = await supabase
    .from("madrijim_proyectos")
    .select("proyecto:proyecto_id (id, nombre)")
    .eq("madrij_id", userId);

  if (error) throw error;
  return data.map((entry) => entry.proyecto);
}
