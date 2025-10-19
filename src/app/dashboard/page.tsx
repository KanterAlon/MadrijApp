"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";

import { getProyectosParaUsuario } from "@/lib/supabase/projects";
import Loader from "@/components/ui/loader";
import { showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";

type Proyecto = {
  id: string;
  nombre: string;
  creador_id: string;
  grupo_id: string;
};

type PersonaGrupo = {
  grupoId: string | null;
  grupoNombre: string | null;
  proyectoId: string | null;
  proyectoNombre: string | null;
  rol: string | null;
};

type ClaimState =
  | { status: "loading" }
  | { status: "ready" }
  | { status: "needs_confirmation"; persona: { nombre: string | null; email: string; grupos: PersonaGrupo[] } }
  | { status: "missing" }
  | { status: "claimed_by_other"; nombre: string | null }
  | { status: "error"; message: string };

async function fetchClaim(email: string) {
  const response = await fetch(`/api/auth/claim?email=${encodeURIComponent(email)}`);
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.error || "No se pudo verificar el usuario");
  }
  return (await response.json()) as
    | { status: "ready" }
    | { status: "missing" }
    | { status: "needs_confirmation"; persona: { nombre: string | null; email: string; grupos: PersonaGrupo[] } }
    | { status: "claimed"; nombre: string | null }
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
  return (await response.json()) as { status: "claimed" };
}

export default function DashboardPage() {
  const { user } = useUser();
  const [projects, setProjects] = useState<Proyecto[]>([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [claim, setClaim] = useState<ClaimState>({ status: "loading" });
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!user) {
      setClaim({ status: "loading" });
      setProjects([]);
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
            setClaim({ status: "ready" });
            break;
          case "missing":
            setClaim({ status: "missing" });
            break;
          case "needs_confirmation":
            setClaim({ status: "needs_confirmation", persona: payload.persona });
            break;
          case "claimed":
            setClaim({ status: "claimed_by_other", nombre: payload.nombre ?? null });
            break;
          case "error":
            setClaim({ status: "error", message: payload.message });
            break;
          default:
            setClaim({ status: "error", message: "Respuesta inesperada" });
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
      .then((data) => setProjects(data.flat()))
      .catch((err) => {
        console.error("Error cargando proyectos", err);
        showError("No se pudieron cargar tus proyectos");
      })
      .finally(() => setProjectsLoading(false));
  }, [user, claim.status]);

  const handleConfirm = async () => {
    if (claim.status !== "needs_confirmation") return;
    setConfirming(true);
    try {
      await confirmClaim(claim.persona.email);
      toast.success("¡Bienvenido! Vinculamos tu cuenta");
      setClaim({ status: "ready" });
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
            <h2 className="text-xl font-semibold text-blue-900">Confirmá tu identidad</h2>
            <p className="mt-3 text-blue-900">
              Encontramos en la hoja de cálculo a <strong>{claim.persona.nombre ?? claim.persona.email}</strong>.
              Confirmá que sos esa persona para vincular tu cuenta de Google con MadrijApp.
            </p>
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
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={handleConfirm}
                disabled={confirming}
                className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-60"
              >
                {confirming ? "Vinculando..." : "Sí, soy yo"}
              </button>
              <div className="flex-1 text-sm text-blue-900/80">
                Si no sos esa persona, pedile al equipo que actualice tu email en la hoja de madrijim.
              </div>
            </div>
          </div>
        );
      case "missing":
        return (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-amber-900">No encontramos tu email</h2>
            <p className="mt-2 text-amber-900">
              Tu cuenta de Google no coincide con ningún registro de madrijim en la hoja compartida. Verificá que la dirección de
              correo sea la misma que figura en la planilla o pedile a un administrador que te agregue.
            </p>
          </div>
        );
      case "claimed_by_other":
        return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">Cuenta ya reclamada</h2>
            <p className="mt-2 text-red-900">
              El registro de {claim.nombre ?? "este madrij"} ya fue vinculado a otra cuenta. Contactá a tu equipo para que lo
              revisen.
            </p>
          </div>
        );
      case "error":
        return (
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-red-900">Ocurrió un problema</h2>
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
        <h1 className="text-3xl font-bold text-blue-900">Mis proyectos</h1>
        <p className="mt-1 text-sm text-blue-900/70">
          Cada proyecto proviene directamente de la hoja de cálculo. Accedé para gestionar tus janijim y herramientas del grupo.
        </p>
      </div>

      {renderClaimState()}

      {claim.status === "ready" && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {projectsLoading ? (
            <div className="flex justify-center py-12">
              <Loader className="h-6 w-6" />
            </div>
          ) : projects.length === 0 ? (
            <div className="py-6 text-center text-gray-600">
              Todavía no tenés proyectos asignados. Verificá que la planilla tenga tus datos o consultá con el equipo.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {projects.map((proyecto) => (
                <Link
                  key={proyecto.id}
                  href={`/proyecto/${proyecto.id}`}
                  className="block rounded-xl border border-gray-200 bg-gradient-to-br from-white to-blue-50 p-4 shadow transition hover:shadow-md"
                >
                  <h3 className="text-lg font-semibold text-blue-900">{proyecto.nombre}</h3>
                  <p className="mt-2 text-sm text-blue-900/70">Ingresá para ver janijim, tareas y materiales.</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
