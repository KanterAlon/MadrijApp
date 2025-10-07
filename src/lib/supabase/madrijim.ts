import { supabase } from "@/lib/supabase";
import { getGrupoIdForProyecto } from "./projects";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const { data: relaciones, error } = await supabase
    .from("madrijim_grupos")
    .select("madrij_id")
    .eq("grupo_id", grupoId)
    .eq("invitado", false);
  if (error) throw error;
  const ids = relaciones.map((r) => r.madrij_id);
  if (ids.length === 0) return [];
  const { data: madrijim, error: e2 } = await supabase
    .from("madrijim")
    .select("clerk_id, nombre")
    .in("clerk_id", ids);
  if (e2) throw e2;
  return madrijim;
}

export async function getMadrijNombre(clerkId: string) {
  const { data, error } = await supabase
    .from("madrijim")
    .select("nombre")
    .eq("clerk_id", clerkId)
    .single();
  if (error) throw error;
  return data.nombre as string;
}
