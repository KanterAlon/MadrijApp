import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { supabase } from "@/lib/supabase";
import { AccessDeniedError } from "@/lib/supabase/access";
import { getGruposQuickStats } from "@/lib/supabase/grupos";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function ProyectoGruposPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const { id: proyectoId } = await params;

  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("nombre")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;
  if (!proyecto) {
    notFound();
  }

  let grupos = [];
  try {
    grupos = await getGruposQuickStats(proyectoId, userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      redirect("/dashboard");
    }
    throw err;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">
            Proyecto {proyecto.nombre}
          </p>
          <h1 className="text-3xl font-bold text-blue-900">Grupos del proyecto</h1>
          <p className="mt-2 text-sm text-blue-900/70">
            Selecciona un grupo para revisar su portada, conocer a los madrijim asignados y acceder a los janijim cargados desde la hoja institucional.
          </p>
        </div>
        <Link
          href={`/proyecto/${proyectoId}`}
          className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300"
        >
          Volver al inicio del proyecto
        </Link>
      </div>

      {grupos.length === 0 ? (
        <div className="rounded-xl border border-dashed border-blue-200 bg-blue-50 p-6 text-center text-sm text-blue-900/70">
          Todavia no hay grupos vinculados a este proyecto. Revisa la hoja institucional o consulta al administrador para confirmar la sincronizacion.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {grupos.map((grupo) => {
            const detalleHref = `/proyecto/${proyectoId}/grupos/${encodeURIComponent(grupo.id)}`;
            const janijimHref = `/proyecto/${proyectoId}/janijim?grupo=${encodeURIComponent(grupo.id)}`;
            const janijLabel = grupo.totalJanijim === 1 ? "janij" : "janijim";
            const madrijLabel = grupo.totalMadrijim === 1 ? "madrij" : "madrijim";
            const titulo = `Grupo ${grupo.nombre}`;

            return (
              <div
                key={grupo.id}
                className="flex h-full flex-col justify-between rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow-sm"
              >
                <div>
                  <h2 className="text-lg font-semibold text-blue-900">{titulo}</h2>
                  <p className="mt-2 text-sm text-blue-900/70">
                    Portada del grupo con sus responsables, coordinadores y acceso a materiales.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-blue-800">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1">
                      {grupo.totalJanijim} {janijLabel}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-indigo-100 px-3 py-1">
                      {grupo.totalMadrijim} {madrijLabel}
                    </span>
                  </div>
                </div>
                <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Link
                    href={detalleHref}
                    className="inline-flex items-center justify-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                  >
                    Sobre el grupo
                  </Link>
                  <Link
                    href={janijimHref}
                    className="inline-flex items-center justify-center rounded-md border border-blue-200 bg-white px-3 py-2 text-sm font-semibold text-blue-700 transition hover:border-blue-300"
                  >
                    Ir a janijim
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
