import { supabase } from "@/lib/supabase";

export interface MaterialRow {
  id: string;
  proyecto_id: string | null;
  lista_id?: string | null;
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

export interface MaterialListRow {
  id: string;
  proyecto_id: string | null;
  titulo: string;
  fecha: string;
  created_at?: string;
}

export async function getMateriales(proyectoId: string, listaId?: string) {
  let query = supabase.from("materiales").select("*");
  query = query.eq("proyecto_id", proyectoId);
  if (listaId) {
    query = query.eq("lista_id", listaId);
  }
  const { data, error } = await query.order("created_at", { ascending: true });
  if (error) throw error;
  return (data as MaterialRow[]) || [];
}

export async function getMaterialesPorLista(listaId: string) {
  const { data, error } = await supabase
    .from("materiales")
    .select("*")
    .eq("lista_id", listaId)
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

export async function addMaterialEnLista(
  listaId: string,
  nombre: string,
  proyectoId: string,
  estado: string = "por hacer"
) {
  const { data, error } = await supabase
    .from("materiales")
    .insert({ proyecto_id: proyectoId, lista_id: listaId, nombre, estado })
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

export async function getMaterialLists(proyectoId: string) {
  const { data, error } = await supabase
    .from("material_lists")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("fecha", { ascending: true });
  if (error) throw error;
  return (data as MaterialListRow[]) || [];
}

export async function addMaterialList(
  proyectoId: string,
  titulo: string,
  fecha: string
) {
  const { data, error } = await supabase
    .from("material_lists")
    .insert({ proyecto_id: proyectoId, titulo, fecha })
    .select()
    .single();
  if (error) throw error;
  return data as MaterialListRow;
}

export async function deleteMaterialList(id: string) {
  const { error } = await supabase.from("material_lists").delete().eq("id", id);
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
