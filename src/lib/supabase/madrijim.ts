import { supabase } from "@/lib/supabase";
import { getGrupoIdsForProyecto } from "./projects";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const grupoIds = await getGrupoIdsForProyecto(proyectoId);
  if (grupoIds.length === 0) return [];

  const { data: relaciones, error } = await supabase
    .from("madrijim_grupos")
    .select("madrij_id")
    .in("grupo_id", grupoIds)
    .eq("invitado", false)
    .eq("activo", true);
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
