import { supabase } from "@/lib/supabase";
import { getGrupoIdsForProyecto } from "./projects";

export type Grupo = {
  id: string;
  nombre: string;
  spreadsheet_id: string | null;
  janij_sheet: string | null;
  madrij_sheet: string | null;
};

export async function getGruposByProyecto(proyectoId: string) {
  const grupoIds = await getGrupoIdsForProyecto(proyectoId);
  if (grupoIds.length === 0) return [] as Grupo[];

  const { data, error } = await supabase
    .from("grupos")
    .select("id, nombre, spreadsheet_id, janij_sheet, madrij_sheet")
    .in("id", grupoIds);

  if (error) throw error;

  const map = new Map<string, Grupo>();
  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      nombre: row.nombre as string,
      spreadsheet_id: row.spreadsheet_id ?? null,
      janij_sheet: row.janij_sheet ?? null,
      madrij_sheet: row.madrij_sheet ?? null,
    });
  }

  return grupoIds
    .map((id) => map.get(id))
    .filter((grupo): grupo is Grupo => Boolean(grupo));
}
