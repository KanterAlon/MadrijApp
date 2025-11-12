import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";

import { supabase } from "@/lib/supabase";
import { AccessDeniedError } from "@/lib/supabase/access";
import { getGrupoDetalle, getGruposQuickStats } from "@/lib/supabase/grupos";

interface PageProps {
  params: Promise<{
    id: string;
    grupoId: string;
  }>;
}

export default async function SobreGrupoPage({ params }: PageProps) {
  const { userId } = await auth();
  if (!userId) {
    redirect("/");
  }

  const { id: proyectoId, grupoId } = await params;

  const { data: proyecto, error: proyectoError } = await supabase
    .from("proyectos")
    .select("nombre")
    .eq("id", proyectoId)
    .maybeSingle();

  if (proyectoError) throw proyectoError;
  if (!proyecto) {
    notFound();
  }

  let detalle;
  try {
    detalle = await getGrupoDetalle(proyectoId, grupoId, userId);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      redirect("/dashboard");
    }
    throw err;
  }

  const grupos = await getGruposQuickStats(proyectoId, userId);
  const otrosGrupos = grupos.filter((grupo) => grupo.id !== grupoId);

  const resumenTexto =
    "Conoce quienes son los madrijim responsables, que coordinadores acompañan el proceso y cuantos janijim estan vinculados segun la hoja institucional.";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-blue-600">
            Proyecto {proyecto.nombre}
          </p>
          <h1 className="text-3xl font-bold text-blue-900">Sobre el grupo</h1>
          <h2 className="text-xl font-semibold text-blue-800">Grupo {detalle.nombre}</h2>
          <p className="mt-2 text-sm text-blue-900/70">{resumenTexto}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-blue-700">Janijim</p>
          <p className="mt-2 text-2xl font-bold text-blue-900">{detalle.totalJanijim}</p>
          <p className="mt-1 text-xs text-blue-900/60">
            Conteo segun la hoja institucional sincronizada.
          </p>
        </div>
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-indigo-700">Madrijim</p>
          <p className="mt-2 text-2xl font-bold text-indigo-900">{detalle.totalMadrijim}</p>
          <p className="mt-1 text-xs text-indigo-900/60">
            Incluye responsables activos y participantes invitados.
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-emerald-700">Coordinadores</p>
          <p className="mt-2 text-2xl font-bold text-emerald-900">
            {detalle.coordinadores.length}
          </p>
          <p className="mt-1 text-xs text-emerald-900/60">
            Referentes del proyecto que acompañan este grupo.
          </p>
        </div>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-blue-900">Madrijim del grupo</h3>
            <p className="text-sm text-blue-900/70">
              Datos importados automaticamente desde la hoja de madrijim. Si ves diferencias, revisa la planilla compartida.
            </p>
          </div>
        </div>
        {detalle.madrijim.length === 0 ? (
          <div className="mt-4 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-900/70">
            Todavia no hay madrijim activos vinculados a este grupo.
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {detalle.madrijim.map((madrij) => {
              const key = madrij.id ?? madrij.email ?? madrij.nombre;
              return (
                <li
                  key={key}
                  className="flex flex-col justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-semibold text-blue-900">{madrij.nombre}</p>
                    {madrij.email && (
                      <p className="text-xs text-blue-900/70">{madrij.email}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {madrij.rol && (
                      <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-blue-700">
                        {madrij.rol}
                      </span>
                    )}
                    {madrij.invitado && (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                        Invitado
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h3 className="text-lg font-semibold text-blue-900">Coordinadores del proyecto</h3>
        {detalle.coordinadores.length === 0 ? (
          <p className="mt-3 text-sm text-blue-900/70">
            Todavia no hay coordinadores asignados a este proyecto.
          </p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-blue-900/80">
            {detalle.coordinadores.map((coordinador) => (
              <li
                key={coordinador.email || coordinador.nombre}
                className="flex flex-col gap-1 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
              >
                <span className="font-medium text-emerald-900">{coordinador.nombre}</span>
                {coordinador.email && (
                  <span className="text-xs text-emerald-800">{coordinador.email}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {otrosGrupos.length > 0 && (
        <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="text-lg font-semibold text-blue-900">Otros grupos disponibles</h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {otrosGrupos.map((grupo) => (
              <Link
                key={grupo.id}
                href={`/proyecto/${proyectoId}/grupos/${encodeURIComponent(grupo.id)}`}
                className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:border-blue-300"
              >
                Grupo {grupo.nombre}
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
