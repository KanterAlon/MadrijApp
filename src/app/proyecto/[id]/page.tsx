import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import ActiveSesionCard from "@/components/active-sesion-card";


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

  let { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("nombre, codigo_invite")
    .eq("id", proyectoId)
    .single();

  if (errorProyecto && errorProyecto.code === "42703") {
    const res = await supabase
      .from("proyectos")
      .select("nombre")
      .eq("id", proyectoId)
      .single();
    proyecto = res.data ? { ...res.data, codigo_invite: null } : null;
    errorProyecto = res.error;
  }

  if (!proyecto || errorProyecto) {
    console.error("Error cargando el proyecto", errorProyecto);
    return <div className="p-6">Error cargando el proyecto</div>;
  }

  const madrijim = await getMadrijimPorProyecto(proyectoId);

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">{proyecto.nombre}</h1>
      <ActiveSesionCard proyectoId={proyectoId} />
      <p className="text-gray-600">
        ¡Estás dentro de este proyecto! Compartí el siguiente código con otros madrijim para que se unan:
      </p>
      <div className="bg-gray-100 p-4 rounded font-mono break-all">
        {proyecto.codigo_invite}
      </div>
      <h2 className="text-xl font-semibold mt-6">Madrijim en este proyecto</h2>
      <ul className="list-disc list-inside space-y-1">
        {madrijim.map((m) => (
          <li key={m.clerk_id}>{m.nombre}</li>
        ))}
      </ul>
    </div>
  );
}
