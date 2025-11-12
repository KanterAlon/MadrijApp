"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

import Loader from "@/components/ui/loader";
import Button from "@/components/ui/button";
import { showError } from "@/lib/alerts";
import { ensureAdminAccess } from "@/lib/supabase/access";
import { getProyectosParaUsuario, type DashboardProyecto } from "@/lib/supabase/projects";
import { projectNavigationLinks } from "@/lib/navigationLinks";

function buildProjectHref(proyectoId: string, slug: string) {
  if (!slug) return `/proyecto/${proyectoId}`;
  return slug.startsWith("/") ? slug : `/proyecto/${proyectoId}/${slug}`;
}

export default function AdminPreviewPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [checking, setChecking] = useState(true);
  const [projects, setProjects] = useState<DashboardProyecto[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.replace("/");
      return;
    }

    let cancelled = false;
    setChecking(true);

    ensureAdminAccess(user.id)
      .then(() => {
        if (cancelled) return;
        setChecking(false);
      })
      .catch(() => {
        if (cancelled) return;
        setChecking(false);
        router.replace("/dashboard");
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, router, user]);

  useEffect(() => {
    if (!user || checking) return;

    let cancelled = false;
    setLoadingProjects(true);
    getProyectosParaUsuario(user.id)
      .then((data) => {
        if (cancelled) return;
        setProjects(data);
      })
      .catch(() => {
        showError("No se pudieron cargar los proyectos para previsualización");
      })
      .finally(() => {
        if (cancelled) return;
        setLoadingProjects(false);
      });

    return () => {
      cancelled = true;
    };
  }, [checking, user]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto w-full max-w-6xl px-4 pb-16 pt-10 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Vista completa de proyectos</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">
              Revisá todos los proyectos, entrá en sus herramientas y navegá por los grupos como administrador. Esta
              vista respeta los mismos permisos que el panel institucional, pero sin restricciones por asignación.
            </p>
          </div>
          <Button variant="outline" onClick={() => router.push("/admin")}>
            Volver al panel
          </Button>
        </div>

        <div className="mt-8 rounded-xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur">
          {checking || loadingProjects ? (
            <div className="flex justify-center py-12">
              <Loader className="h-6 w-6" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-12 text-center text-slate-600">
              Todavía no se encontraron proyectos para mostrar.
            </div>
          ) : (
            <div className="space-y-8">
              {projects.map((proyecto) => (
                <article
                  key={proyecto.id}
                  className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-6 shadow-sm transition hover:shadow-md"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-semibold text-slate-900">{proyecto.nombre}</h2>
                      <p className="mt-1 text-sm text-slate-600">
                        {proyecto.roles.length > 0
                          ? `Roles asignados: ${proyecto.roles.map((rol) => rol.toUpperCase()).join(", ")}`
                          : "Sin roles explícitos asignados"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-wide text-slate-400">
                        {proyecto.grupos.length} grupo{proyecto.grupos.length === 1 ? "" : "s"} vinculados
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        href={`/proyecto/${proyecto.id}`}
                        className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                      >
                        Abrir proyecto
                      </Link>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-wrap gap-2">
                    {projectNavigationLinks.map(({ href, label }) => (
                      <Link
                        key={href}
                        href={buildProjectHref(proyecto.id, href)}
                        className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
                      >
                        {label}
                      </Link>
                    ))}
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                      Grupos vinculados
                    </h3>
                    {proyecto.grupos.length === 0 ? (
                      <p className="mt-3 text-sm text-slate-600">El proyecto todavía no tiene grupos asociados.</p>
                    ) : (
                      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {proyecto.grupos.map((grupo) => (
                          <Link
                            key={grupo.id}
                            href={`/proyecto/${proyecto.id}/janijim`}
                            className="group block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300 hover:shadow"
                          >
                            <p className="text-sm font-semibold text-slate-800">Grupo {grupo.nombre}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Abrí la sección de janijim para revisar integrantes, asistencias y sincronización.
                            </p>
                            <span className="mt-3 inline-flex items-center text-xs font-medium text-blue-600 group-hover:underline">
                              Ver janijim
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
