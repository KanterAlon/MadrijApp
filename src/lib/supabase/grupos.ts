import { supabase } from "@/lib/supabase";

export type Grupo = {
  id: string;
  proyecto_id: string;
  spreadsheet_id: string | null;
  janij_sheet: string | null;
  madrij_sheet: string | null;
};

export async function getGrupoByProyecto(proyectoId: string) {
  const { data, error } = await supabase
    .from("grupos")
    .select("id, proyecto_id, spreadsheet_id, janij_sheet, madrij_sheet")
    .eq("proyecto_id", proyectoId)
    .maybeSingle();

  if (error) throw error;
  return data as Grupo | null;
}

export async function upsertGrupo(
  proyectoId: string,
  values: Partial<Omit<Grupo, "id" | "proyecto_id">>,
) {
  const payload = {
    proyecto_id: proyectoId,
    ...values,
  };

  const { data, error } = await supabase
    .from("grupos")
    .upsert([payload], { onConflict: "proyecto_id" })
    .select("id, proyecto_id, spreadsheet_id, janij_sheet, madrij_sheet")
    .maybeSingle();

  if (error) throw error;
  return data as Grupo | null;
}
