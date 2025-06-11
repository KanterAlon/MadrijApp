"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Loader from "@/components/ui/loader";
import {
  getJanijim,
} from "@/lib/supabase/janijim";
import {
  getAsistencias,
  marcarAsistencia,
  finalizarSesion,
  getSesion,
} from "@/lib/supabase/asistencias";

export default function AsistenciaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const params = useSearchParams();
  const sesionId = params.get("sesion") || "";
  const { user } = useUser();
  const router = useRouter();

  const [janijim, setJanijim] = useState<{ id: string; nombre: string }[]>([]);
  const [estado, setEstado] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState<{ nombre: string } | null>(null);

  useEffect(() => {
    if (!sesionId) return;
    Promise.all([
      getSesion(sesionId),
      getJanijim(proyectoId),
      getAsistencias(sesionId),
    ])
      .then(([s, j, a]) => {
        setSesion(s);
        setJanijim(j);
        const m: Record<string, boolean> = {};
        a.forEach((r) => {
          m[r.janij_id] = r.presente;
        });
        setEstado(m);
      })
      .finally(() => setLoading(false));
  }, [sesionId, proyectoId]);

  const toggle = async (janijId: string) => {
    if (!user || !sesionId) return;
    const nuevo = !estado[janijId];
    setEstado((p) => ({ ...p, [janijId]: nuevo }));
    try {
      await marcarAsistencia(
        sesionId,
        proyectoId,
        janijId,
        user.id,
        nuevo
      );
    } catch (e) {
      console.error(e);
    }
  };

  const finalizar = async () => {
    await finalizarSesion(sesionId);
    router.push(`/proyecto/${proyectoId}/janijim`);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <h2 className="text-xl font-semibold">{sesion?.nombre}</h2>
      <ul className="space-y-2">
        {janijim.map((j) => (
          <li
            key={j.id}
            className="flex items-center justify-between bg-white shadow p-4 rounded-lg"
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={!!estado[j.id]}
                onChange={() => toggle(j.id)}
              />
              <span>{j.nombre}</span>
            </label>
          </li>
        ))}
      </ul>
      <button
        onClick={finalizar}
        className="px-4 py-2 bg-green-600 text-white rounded-lg w-full"
      >
        Finalizar asistencia
      </button>
    </div>
  );
}
