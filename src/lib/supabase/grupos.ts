import { supabase } from "@/lib/supabase";

export type Grupo = {
  id: string;
  proyecto_id: string | null;
  spreadsheet_id: string | null;
  janij_sheet: string | null;
  madrij_sheet: string | null;
};

export async function getGrupoByProyecto(proyectoId: string) {
  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("grupo_id")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;

  const grupoId = proyecto?.grupo_id;
  if (!grupoId) return null;

  const { data, error } = await supabase
    .from("grupos")
    .select("id, proyecto_id, spreadsheet_id, janij_sheet, madrij_sheet")
    .eq("id", grupoId)
    .maybeSingle();

  if (error) throw error;
  return data as Grupo | null;
}

export async function upsertGrupo(
  grupoId: string,
  proyectoId: string,
  values: Partial<Omit<Grupo, "id" | "proyecto_id">>,
) {
  const payload = {
    ...values,
    proyecto_id: proyectoId,
  };

  const { data, error } = await supabase
    .from("grupos")
    .update(payload)
    .eq("id", grupoId)
    .select("id, proyecto_id, spreadsheet_id, janij_sheet, madrij_sheet")
    .maybeSingle();

  if (error) throw error;
  return data as Grupo | null;
}
