import { supabase } from "@/lib/supabase";

type RawProyecto = {
  id: string;
  nombre: string;
  creador_id: string;
  grupo_id: string;
};

type RawProyectoRow = {
  grupo_id: string;
  proyecto?: {
    proyectos?: RawProyecto[] | null;
  } | null;
};

export async function getProyectosParaUsuario(userId: string) {
  const { data, error } = await supabase
    .from("madrijim_grupos")
    .select(
      `
        grupo_id,
        proyecto:grupos!inner (
          proyectos!inner (
            id,
            nombre,
            creador_id,
            grupo_id
          )
        )
      `,
    )
    .eq("madrij_id", userId)
    .eq("invitado", false)
    .eq("activo", true);

  if (error) throw error;

  const proyectos = new Map<string, RawProyecto>();
  const grupoIds = new Set<string>();

  for (const row of ((data ?? []) as RawProyectoRow[])) {
    if (row.grupo_id) {
      grupoIds.add(row.grupo_id);
    }
    const lista = row.proyecto?.proyectos;
    if (!Array.isArray(lista)) continue;
    for (const proyecto of lista) {
      if (proyecto) {
        proyectos.set(proyecto.id, proyecto);
      }
    }
  }

  if (proyectos.size === 0 && grupoIds.size > 0) {
    const { data: fallback, error: fallbackError } = await supabase
      .from("proyectos")
      .select("id, nombre, creador_id, grupo_id")
      .in("grupo_id", Array.from(grupoIds));

    if (fallbackError) throw fallbackError;

    for (const proyecto of ((fallback ?? []) as RawProyecto[])) {
      if (proyecto) {
        proyectos.set(proyecto.id, proyecto);
      }
    }
  }

  return Array.from(proyectos.values());
}

export async function getGrupoIdForProyecto(proyectoId: string) {
  const { data, error } = await supabase
    .from("proyectos")
    .select("grupo_id")
    .eq("id", proyectoId)
    .single();

  if (error) throw error;

  return data.grupo_id as string;
}

export async function renameProyecto(id: string, nombre: string) {
  const { error } = await supabase
    .from("proyectos")
    .update({ nombre })
    .eq("id", id);
  if (error) throw error;
}

export async function deleteProyecto(id: string) {
  const { error } = await supabase.from("proyectos").delete().eq("id", id);
  if (error) throw error;
}
