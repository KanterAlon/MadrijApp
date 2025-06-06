import { supabase } from "@/lib/supabase";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function ProyectoHome({ params }: { params: { id: string } }) {
  const { userId } = await auth();
  const proyectoId = params.id;

  if (!userId) {
    redirect("/");
  }

  // Verificar acceso del usuario al proyecto
  const { data: relacion, error: errorRelacion } = await supabase
    .from("madrijim_proyectos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("madrij_id", userId)
    .single();

  if (!relacion || errorRelacion) {
    redirect("/dashboard");
  }

  // Obtener nombre del proyecto
  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("nombre")
    .eq("id", proyectoId)
    .single();

  if (!proyecto || errorProyecto) {
    return <div className="p-6">Error cargando el proyecto</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">{proyecto.nombre}</h1>
      <p className="text-gray-600">
        ¡Estás dentro de este proyecto! Usá el menú lateral para acceder a asistencia, notas, planificaciones y más.
      </p>
    </div>
  );
}
