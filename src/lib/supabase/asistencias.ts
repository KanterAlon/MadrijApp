import { supabase } from "@/lib/supabase";

export async function crearSesion(
  proyectoId: string,
  nombre: string,
  fecha: string,
  madrijId: string
) {
  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .insert({ proyecto_id: proyectoId, nombre, fecha, madrij_id: madrijId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getSesion(id: string) {
  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getSesionActiva(proyectoId: string) {
  const { data, error } = await supabase
    .from("asistencia_sesiones")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("finalizado", false)
    .order("inicio", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

export async function finalizarSesion(id: string) {
  const { error } = await supabase
    .from("asistencia_sesiones")
    .update({ finalizado: true, finalizado_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function getAsistencias(sesionId: string) {
  const { data, error } = await supabase
    .from("asistencias")
    .select("janij_id, presente")
    .eq("sesion_id", sesionId);
  if (error) throw error;
  return data;
}

export async function marcarAsistencia(
  sesionId: string,
  proyectoId: string,
  janijId: string,
  madrijId: string,
  presente: boolean
) {
  const { error } = await supabase.from("asistencias").upsert(
    {
      sesion_id: sesionId,
      proyecto_id: proyectoId,
      janij_id: janijId,
      madrij_id: madrijId,
      fecha: new Date().toISOString().split("T")[0],
      presente,
    },
    { onConflict: "sesion_id,janij_id" }
  );
  if (error) throw error;
}
