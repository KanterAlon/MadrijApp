import { supabase } from "@/lib/supabase";

export async function getMadrijimPorProyecto(proyectoId: string) {
  const { data: relaciones, error } = await supabase
    .from("madrijim_proyectos")
    .select("madrij_id")
    .eq("proyecto_id", proyectoId)
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
