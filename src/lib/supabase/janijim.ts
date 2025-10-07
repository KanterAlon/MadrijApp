import { supabase } from "@/lib/supabase";
import { getGrupoIdForProyecto } from "./projects";

export type JanijData = {
  /** Nombre y apellido del janij */
  nombre: string;
  dni?: string | null;
  numero_socio?: string | null;
  grupo?: string | null;
  tel_madre?: string | null;
  tel_padre?: string | null;
  extras?: Record<string, unknown> | null;
};

export async function getJanijim(proyectoId: string) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const { data, error } = await supabase
    .from("janijim")
    .select(
      "id, nombre, dni, numero_socio, grupo, tel_madre, tel_padre, extras",
    )
    .eq("grupo_id", grupoId)
    .eq("activo", true)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return data;
}

export async function addJanijim(proyectoId: string, items: JanijData[]) {
  const grupoId = await getGrupoIdForProyecto(proyectoId);

  const payload = items.map((item) => ({
    ...item,
    proyecto_id: proyectoId,
    grupo_id: grupoId,
  }));
  const { data, error } = await supabase
    .from("janijim")
    .insert(payload)
    .select();
  if (error) throw error;
  return data;
}

export async function updateJanij(id: string, data: Partial<JanijData>) {
  const { error } = await supabase.from("janijim").update(data).eq("id", id);
  if (error) throw error;
}

export async function removeJanij(id: string) {
  const { error } = await supabase.from("janijim").update({ activo: false }).eq("id", id);
  if (error) throw error;
}
