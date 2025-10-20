import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import { getGruposByProyecto } from "@/lib/supabase/grupos";
import { AccessDeniedError, ensureProyectoAccess, type ProyectoAccess } from "@/lib/supabase/access";
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

  let access: ProyectoAccess;
  try {
    access = await ensureProyectoAccess(userId, proyectoId);
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

  const grupos = await getGruposByProyecto(proyectoId, userId);

  const { data: coordinadorLinks, error: coordinadorError } = await supabase
    .from("proyecto_coordinadores")
    .select("role_id")
    .eq("proyecto_id", proyectoId);

  if (coordinadorError) throw coordinadorError;

  const roleIds = (coordinadorLinks ?? [])
    .map((row) => row.role_id as string | null)
    .filter((id): id is string => Boolean(id));

  let coordinadores: { nombre: string; email: string }[] = [];
  if (roleIds.length > 0) {
    const { data: coordinadoresRows, error: coordinadoresError } = await supabase
      .from("app_roles")
      .select("nombre, email")
      .in("id", roleIds)
      .eq("activo", true);

    if (coordinadoresError) throw coordinadoresError;

    coordinadores = (coordinadoresRows ?? [])
      .map((row) => ({
        nombre: (row.nombre as string) || (row.email as string) || "",
        email: (row.email as string) || "",
      }))
      .filter((row) => row.email)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">{proyecto.nombre}</h1>
        <p className="mt-2 text-sm text-blue-900/70">
          Acceso como {access.scope.toUpperCase()}. Desde aquí podés revisar la actividad, los grupos asignados y a los
          referentes del proyecto.
        </p>
      </div>

      <ActiveSesionCard proyectoId={proyectoId} />

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900">Código de invitación</h2>
        <p className="mt-2 text-sm text-blue-900/70">
          Compartí este código con nuevos madrijim para sumarles al proyecto.
        </p>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1 rounded-lg bg-slate-100 p-3 font-mono text-sm text-blue-900">
            {proyecto.codigo_invite ?? "Sin código generado"}
          </div>
          {proyecto.codigo_invite && <CopyButton text={proyecto.codigo_invite} />}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900">Coordinadores del proyecto</h2>
        {coordinadores.length > 0 ? (
          <ul className="mt-3 space-y-1 text-sm text-blue-900/80">
            {coordinadores.map((coordinador) => (
              <li key={coordinador.email}>
                <span className="font-medium text-blue-900">{coordinador.nombre}</span>
                {coordinador.email && <span className="ml-2 text-blue-900/70">({coordinador.email})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-blue-900/70">Todavía no hay coordinadores asignados a este proyecto.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900">Grupos vinculados</h2>
        {grupos.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-900/80">
            {grupos.map((grupo) => (
              <li key={grupo.id}>{grupo.nombre}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-blue-900/70">El proyecto aún no tiene grupos asociados.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-lg font-semibold text-blue-900">Madrijim en este proyecto</h2>
        {madrijim.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-blue-900/80">
            {madrijim.map((m) => (
              <li key={m.clerk_id}>{m.nombre}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-blue-900/70">Todavía no hay madrijim asociados a los grupos habilitados.</p>
        )}
      </section>
    </div>
  );
}
