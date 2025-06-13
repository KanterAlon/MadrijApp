import { supabase } from "@/lib/supabase";

export interface ListaMaterialRow {
  id: string;
  proyecto_id: string | null;
  titulo: string;
  fecha: string | null;
  created_at?: string;
}

export async function getListas(proyectoId: string) {
  const { data, error } = await supabase
    .from("listas_materiales")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return (data as ListaMaterialRow[]) || [];
}

export async function addLista(
  proyectoId: string,
  titulo: string,
  fecha: string,
) {
  const { data, error } = await supabase
    .from("listas_materiales")
    .insert({ proyecto_id: proyectoId, titulo, fecha })
    .select()
    .single();
  if (error) throw error;
  return data as ListaMaterialRow;
}

export async function deleteLista(id: string) {
  const { error } = await supabase.from("listas_materiales").delete().eq("id", id);
  if (error) throw error;
}
