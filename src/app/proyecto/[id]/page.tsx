import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProyectoHome({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  const proyectoId = params.id;

  if (!userId) redirect("/");

  // 1. Verificamos que el usuario tenga acceso
  const { data: relacion, error: errorRelacion } = await supabase
    .from("madrijim_proyectos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("madrij_id", userId)
    .single();

  if (!relacion || errorRelacion) {
    redirect("/dashboard");
  }

  // ✅ Redirigir directamente a asistencia si todo está OK
  redirect(`/proyecto/${proyectoId}/asistencia`);
}
