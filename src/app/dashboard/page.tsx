"use client";

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { toast } from "react-hot-toast";

import Loader from "@/components/ui/loader";
import { showError } from "@/lib/alerts";
import { getProyectosParaUsuario, type DashboardProyecto } from "@/lib/supabase/projects";

type AppRole = "madrij" | "coordinador" | "director" | "admin";

type PersonaGrupo = {
  grupoId: string | null;
  grupoNombre: string | null;
  proyectoId: string | null;
  proyectoNombre: string | null;
  rol: string | null;
};

type PersonaProyecto = {
  proyectoId: string | null;
  proyectoNombre: string | null;
};

type ClaimState =
  | { status: "loading" }
  | { status: "ready"; roles: AppRole[] }
  | {
      status: "needs_confirmation";
      persona: {
        nombre: string | null;
        email: string;
        roles: AppRole[];
        grupos: PersonaGrupo[];
        proyectos: PersonaProyecto[];
      };
    }
  | { status: "missing" }
  | { status: "claimed_by_other"; nombre: string | null; roles: AppRole[] }
  | { status: "error"; message: string };

async function fetchClaim(email: string) {
  const response = await fetch(`/api/auth/claim?email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "No se pudo verificar el usuario");
  }
  return (await response.json()) as
    | { status: "ready"; roles: AppRole[] }
    | { status: "missing" }
    | {
        status: "needs_confirmation";
        persona: {
          nombre: string | null;
          email: string;
          roles: AppRole[];
          grupos: PersonaGrupo[];
          proyectos: PersonaProyecto[];
        };
      }
    | { status: "claimed"; nombre: string | null; roles: AppRole[] }
    | { status: "error"; message: string };
}

async function confirmClaim(email: string) {
  const response = await fetch("/api/auth/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "No se pudo vincular tu usuario");
  }
  return (await response.json()) as { status: "claimed"; nombre: string | null; roles: AppRole[] };
}

export default function DashboardPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<DashboardProyecto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [claim, setClaim] = useState<ClaimState>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);
  const [userRoles, setUserRoles] = useState<AppRole[]>([]);
  const groupSourceProjects = useMemo(
    () => projects.filter((proyecto) => proyecto.roles.some((role) => role === "madrij" || role === "admin")),
    [projects],
  );
  const groupCards = useMemo(
    () =>
      groupSourceProjects.flatMap((proyecto) =>
        proyecto.grupos.map((grupo) => ({ proyecto, grupo })),
      ),
    [groupSourceProjects],
  );
  const projectCards = useMemo(
    () =>
      projects.filter((proyecto) =>
        proyecto.roles.some((role) => role === "coordinador" || role === "director" || role === "admin"),
      ),
    [projects],
  );
  const canSeeGroupSection = groupSourceProjects.length > 0;
  const canSeeProjectSection = projectCards.length > 0;
  const hasAssignments = canSeeGroupSection || canSeeProjectSection;

  useEffect(() => {
    if (!user) {
      setClaim({ status: "loading" });
      setProjects([]);
      setUserRoles([]);
      return;
    }
    const email = user.primaryEmailAddress?.emailAddress;
    if (!email) {
      setClaim({ status: "missing" });
      return;
    }

    let cancelled = false;
    setClaim({ status: "loading" });

    fetchClaim(email)
      .then((payload) => {
        if (cancelled) return;
        switch (payload.status) {
          case "ready":
            setClaim({ status: "ready", roles: payload.roles });
            setUserRoles(payload.roles);
            break;
          case "missing":
            setClaim({ status: "missing" });
            break;
          case "needs_confirmation":
            setClaim({ status: "needs_confirmation", persona: payload.persona });
            break;
          case "claimed":
            setClaim({
              status: "claimed_by_other",
              nombre: payload.nombre ?? null,
              roles: payload.roles,
            });
            break;
          case "error":
            setClaim({ status: "error", message: payload.message });
            break;
          default:
            setClaim({ status: "error", message: "Respuesta inesperada del servidor" });
        }
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setClaim({ status: "error", message: err.message });
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  useEffect(() => {
    if (!user || claim.status !== "ready") return;

    setProjectsLoading(true);
    getProyectosParaUsuario(user.id)
      .then((data) => setProjects(data))
      .catch((err) => {
        console.error("Error cargando proyectos", err);
        showError("No se pudieron cargar tus proyectos");
      })
      .finally(() => setProjectsLoading(false));
  }, [user, claim.status]);

  const handleConfirm = async () => {
    if (claim.status !== "needs_confirmation") return;
    try {
      setConfirming(true);
      const result = await confirmClaim(claim.persona.email);
      toast.success("Bienvenido, vinculamos tu cuenta");
      setUserRoles(result.roles);
      setClaim({ status: "ready", roles: result.roles });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido";
      showError(message);
    } finally {
      setConfirming(false);
    }
  };

  const renderClaimState = () => {
    switch (claim.status) {
      case "loading":
        return (
          <div className="flex justify-center py-12">
            <Loader className="h-6 w-6" />
          </div>
        );
      case "needs_confirmation":
        return (
          <div className="rounded-xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-900">Confirma tu identidad</h2>
            <p className="mt-3 text-blue-900">
              Encontramos en la hoja institucional a <strong>{claim.persona.nombre ?? claim.persona.email}</strong>. Confirma
              que sos esa persona para vincular tu cuenta de Google con MadrijApp.
            </p>
            <div className="mt-4">
              <h3 className="font-medium text-blue-900">Roles asignados</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {claim.persona.roles.map((rol) => (
                  <span
                    key={rol}
                    className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
                  >
                    {rol.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            {claim.persona.grupos.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-blue-900">Tus grupos</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-blue-900">
                  {claim.persona.grupos.map((grupo, index) => (
                    <li key={`${grupo.grupoId ?? "sin-grupo"}-${index}`}>
                      {grupo.grupoNombre || "Grupo sin nombre"}
                      {grupo.rol ? ` · Rol: ${grupo.rol}` : ""}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {claim.persona.proyectos.length > 0 && (
              <div className="mt-4">
                <h3 className="font-medium text-blue-900">Tus proyectos</h3>
                <ul className="mt-2 list-disc space-y-1 pl-6 text-blue-900">
                  {claim.persona.proyectos.map((proyecto, index) => (
                    <li key={`${proyecto.proyectoId ?? "sin-proyecto"}-${index}`}>
                      {proyecto.proyectoNombre || "Proyecto sin nombre"}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {confirming ? "Vinculando..." : "Si, soy yo"}
              </button>
              <div className="flex-1 text-sm text-blue-900/80">
                Si tu email cambio, pedile al equipo que actualice la planilla institucional antes de volver a ingresar.
              </div>
            </div>
          </div>
        );
      case "missing":
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-amber-900">No encontramos tu email</h2>
            <p className="mt-2 text-amber-900">
              Tu cuenta de Google no coincide con ningun registro en la hoja compartida. Verifica que la direccion sea correcta o
              solicita que te agreguen.
            </p>
          </div>
        );
      case "claimed_by_other":
        return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">Cuenta ya reclamada</h2>
            <p className="mt-2 text-red-900">
              El registro de {claim.nombre ?? "este usuario"} ya fue vinculado a otra cuenta. Contacta a tu equipo para revisarlo.
            </p>
          </div>
        );
      case "error":
        return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">Ocurrio un problema</h2>
            <p className="mt-2 text-red-900">{claim.message}</p>
          </div>
        );
      case "ready":
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-blue-900">Panel principal</h1>
        <p className="mt-1 text-sm text-blue-900/70">
          Revisá los proyectos y grupos que ya fueron importados por el equipo nacional. Si detectás algún dato incorrecto, avisá al administrador para que vuelva a sincronizar la hoja institucional.
        </p>
      </div>

      {renderClaimState()}

      {claim.status === "ready" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {userRoles.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {userRoles.map((rol) => (
                <span
                  key={rol}
                  className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-800"
                >
                  {rol.toUpperCase()}
                </span>
              ))}
            </div>
          )}
          {projectsLoading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-6 w-6" />
            </div>
          ) : projects.length === 0 || !hasAssignments ? (
            <div className="py-6 text-center text-gray-600">
              Todavía no encontramos grupos o proyectos vinculados a tu cuenta. Confirmá que tus datos estén cargados en la hoja institucional o consultá al equipo.
            </div>
          ) : (
            <div className="space-y-8">
              {userRoles.includes("admin") && (
                <section className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-emerald-900">Actualización anual</h2>
                      <p className="mt-1 text-sm text-emerald-900/80">
                        Generá la vista previa con los datos de Google Sheets, revisá los cambios y confirmá la importación desde la interfaz de administrador.
                      </p>
                    </div>
                    <Link
                      href="/admin/sync"
                      className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
                    >
                      Abrir sincronización anual
                    </Link>
                  </div>
                </section>
              )}
              {canSeeGroupSection && (
                <section>
                  <h2 className="text-lg font-semibold text-blue-900">Tus grupos</h2>
                  <p className="mt-1 text-sm text-blue-900/70">Estos son los grupos que ya están vinculados a tu usuario.</p>
                  {groupCards.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-dashed border-blue-200 bg-blue-50 p-4 text-sm text-blue-900/70">
                      Todavía no hay grupos cargados en tu proyecto. Avisale al administrador para que revise la hoja institucional.
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {groupCards.map(({ proyecto, grupo }) => (
                        <Link
                          key={`${proyecto.id}-${grupo.id}`}
                          href={`/proyecto/${proyecto.id}/janijim`}
                          className="block rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow transition hover:shadow-md"
                        >
                          <h3 className="text-lg font-semibold text-blue-900">Grupo {grupo.nombre}</h3>
                          <p className="mt-1 text-sm text-blue-900/70">Proyecto {proyecto.nombre}</p>
                          <p className="mt-3 text-xs text-blue-900/60">Ingresá para revisar a tus janijim y materiales del grupo.</p>
                        </Link>
                      ))}
                    </div>
                  )}
                </section>
              )}

              {canSeeProjectSection && projectCards.length > 0 && (
                <section>
                  <h2 className="text-lg font-semibold text-blue-900">Tus proyectos</h2>
                  <p className="mt-1 text-sm text-blue-900/70">Visualizá la información general de cada proyecto y sus referentes.</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {projectCards.map((proyecto) => (
                      <Link
                        key={proyecto.id}
                        href={`/proyecto/${proyecto.id}`}
                        className="block rounded-xl border border-gray-200 bg-gradient-to-br from-white to-slate-50 p-4 shadow transition hover:shadow-md"
                      >
                        <h3 className="text-lg font-semibold text-blue-900">{proyecto.nombre}</h3>
                        <p className="mt-2 text-sm text-blue-900/70">Ingresá para ver coordinadores, grupos y recursos del proyecto.</p>
                        {proyecto.roles.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {proyecto.roles.map((rol) => (
                              <span
                                key={`${proyecto.id}-${rol}`}
                                className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800"
                              >
                                {rol.toUpperCase()}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
