import { supabase } from "@/lib/supabase";

export async function getJanijim(proyectoId: string) {
  const { data, error } = await supabase
    .from("janijim")
    .select("id, nombre")
    .eq("proyecto_id", proyectoId)
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addJanijim(proyectoId: string, nombres: string[]) {
  const payload = nombres.map((nombre) => ({ nombre, proyecto_id: proyectoId }));
  const { data, error } = await supabase.from("janijim").insert(payload).select();
  if (error) throw error;
  return data;
}

export async function updateJanij(id: string, nombre: string) {
  const { error } = await supabase.from("janijim").update({ nombre }).eq("id", id);
  if (error) throw error;
}

export async function removeJanij(id: string) {
  const { error } = await supabase.from("janijim").update({ activo: false }).eq("id", id);
  if (error) throw error;
}
