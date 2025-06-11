import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";

// ✅ Tipo correcto para páginas dinámicas
interface PageProps {
  params: Promise<{
    id: string;
  }>
}

export default async function ProyectoHome({ params }: PageProps) {
  const { userId } = await auth();
  const { id: proyectoId } = await params;

  if (!userId) {
    redirect("/");
  }

  const { data: relacion, error: errorRelacion } = await supabase
    .from("madrijim_proyectos")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .eq("madrij_id", userId)
    .single();

  if (!relacion || errorRelacion) {
    redirect("/dashboard");
  }

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
