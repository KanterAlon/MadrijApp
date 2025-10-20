import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import { AccessDeniedError, ensureProyectoAccess } from "@/lib/supabase/access";
import ActiveSesionCard from "@/components/active-sesion-card";
import CopyButton from "@/components/ui/copy-button";


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
    notFound();
  }

  try {
    await ensureProyectoAccess(userId, proyectoId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      redirect("/dashboard");
    }
    throw err;
  }

  let madrijim;
  try {
    madrijim = await getMadrijimPorProyecto(userId, proyectoId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      redirect("/dashboard");
    }
    throw err;
  }

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-3xl font-bold">{proyecto.nombre}</h1>
      <ActiveSesionCard proyectoId={proyectoId} />
      <p className="text-gray-600">
        ¡Estás dentro de este proyecto! Compartí el siguiente código con otros madrijim para que se unan:
      </p>
      <div className="flex items-center">
        <div className="bg-gray-100 p-4 rounded font-mono break-all flex-1">
          {proyecto.codigo_invite}
        </div>
        {proyecto.codigo_invite && <CopyButton text={proyecto.codigo_invite} />}
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
