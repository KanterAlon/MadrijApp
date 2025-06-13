import { supabase } from "@/lib/supabase";

export interface MaterialRow {
  id: string;
  proyecto_id: string | null;
  nombre: string;
  descripcion: string | null;
  asignado: string | null;
  compra: boolean | null;
  sede: boolean | null;
  san_miguel: boolean | null;
  armar_en_san_miguel: boolean | null;
  compra_items: string[] | null;
  sede_items: string[] | null;
  san_miguel_items: string[] | null;
  estado: string;
  created_at?: string;
}

export interface ItemRow {
  id: string;
  proyecto_id: string | null;
  nombre: string;
  en_san_miguel: boolean | null;
  desde_sede: boolean | null;
  encargado: string | null;
  created_at?: string;
}

export async function getMateriales(proyectoId: string) {
  const { data, error } = await supabase
    .from("materiales")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MaterialRow[]) || [];
}

export async function addMaterial(proyectoId: string, nombre: string) {
  const { data, error } = await supabase
    .from("materiales")
    .insert({ proyecto_id: proyectoId, nombre })
    .select()
    .single();
  if (error) throw error;
  return data as MaterialRow;
}

export async function updateMaterial(id: string, updates: Partial<MaterialRow>) {
  const { error } = await supabase
    .from("materiales")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteMaterial(id: string) {
  const { error } = await supabase.from("materiales").delete().eq("id", id);
  if (error) throw error;
}

export async function getItems(proyectoId: string) {
  const { data, error } = await supabase
    .from("items_llevar")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ItemRow[]) || [];
}

export async function addItem(proyectoId: string, nombre: string) {
  const { data, error } = await supabase
    .from("items_llevar")
    .insert({ proyecto_id: proyectoId, nombre })
    .select()
    .single();
  if (error) throw error;
  return data as ItemRow;
}

export async function updateItem(id: string, updates: Partial<ItemRow>) {
  const { error } = await supabase
    .from("items_llevar")
    .update(updates)
    .eq("id", id);
  if (error) throw error;
}

export async function deleteItem(id: string) {
  const { error } = await supabase.from("items_llevar").delete().eq("id", id);
  if (error) throw error;
}
