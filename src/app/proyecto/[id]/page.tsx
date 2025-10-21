import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";

import ActiveSesionCard from "@/components/active-sesion-card";
import { supabase } from "@/lib/supabase";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-server";
import { getGruposByProyecto } from "@/lib/supabase/grupos";
import { AccessDeniedError, ensureProyectoAccess, type ProyectoAccess } from "@/lib/supabase/access";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProyectoHome({ params }: PageProps) {
  const { userId } = await auth();
  const { id: proyectoId } = await params;

  if (!userId) {
    redirect("/");
  }

  const { data: proyecto, error: errorProyecto } = await supabase
    .from("proyectos")
    .select("nombre")
    .eq("id", proyectoId)
    .single();

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
          Acceso como {access.scope.toUpperCase()}. Desde aqui podes revisar la actividad, los grupos asignados y a los referentes del
          proyecto.
        </p>
      </div>

      <ActiveSesionCard proyectoId={proyectoId} />

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
          <p className="mt-3 text-sm text-blue-900/70">Todavia no hay coordinadores asignados a este proyecto.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-blue-900">Grupos vinculados</h2>
            <p className="text-sm text-blue-900/70">
              Accede a la portada de cada grupo para conocer a sus responsables y revisar los recursos disponibles.
            </p>
          </div>
          <Link
            href={`/proyecto/${proyectoId}/grupos`}
            className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300"
          >
            Ver todos los grupos
          </Link>
        </div>
        {grupos.length > 0 ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {grupos.map((grupo) => {
              const isGeneral = grupo.id.startsWith("general:");
              const titulo = isGeneral ? grupo.nombre : `Grupo ${grupo.nombre}`;
              const detalleHref = `/proyecto/${proyectoId}/grupos/${encodeURIComponent(grupo.id)}`;
              const janijimHref = isGeneral
                ? `/proyecto/${proyectoId}/janijim`
                : `/proyecto/${proyectoId}/janijim?grupo=${encodeURIComponent(grupo.id)}`;
              return (
                <div
                  key={grupo.id}
                  className="flex h-full flex-col justify-between rounded-lg border border-blue-100 bg-blue-50 p-3"
                >
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900">{titulo}</h3>
                    <p className="mt-1 text-xs text-blue-900/70">
                      {isGeneral
                        ? "Resumen con todos los janijim cargados en el proyecto."
                        : "Portada del grupo con sus madrijim y materiales asignados."}
                    </p>
                  </div>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <Link
                      href={detalleHref}
                      className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      Sobre el grupo
                    </Link>
                    <Link
                      href={janijimHref}
                      className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 transition hover:border-blue-300"
                    >
                      Ver janijim
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mt-4 text-sm text-blue-900/70">El proyecto aun no tiene grupos asociados.</p>
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
          <p className="mt-3 text-sm text-blue-900/70">Todavia no hay madrijim asociados a los grupos habilitados.</p>
        )}
      </section>
    </div>
  );
}
