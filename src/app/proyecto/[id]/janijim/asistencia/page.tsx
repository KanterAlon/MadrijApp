"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import useHighlightScroll from "@/hooks/useHighlightScroll";
import Loader from "@/components/ui/loader";
import { getJanijim } from "@/lib/supabase/janijim";
import {
  getAsistencias,
  marcarAsistencia,
  finalizarSesion,
  getSesion,
} from "@/lib/supabase/asistencias";
import { supabase } from "@/lib/supabase";

type AsistenciaRow = {
  janij_id: string;
  presente: boolean;
  madrij_id: string;
};

type SesionRow = {
  finalizado: boolean;
  madrij_id: string;
};

export default function AsistenciaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const params = useSearchParams();
  const sesionId = params.get("sesion") || "";
  const { user } = useUser();
  const router = useRouter();

  const [janijim, setJanijim] = useState<{ id: string; nombre: string }[]>([]);
  const [estado, setEstado] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState<{
    nombre: string;
    madrij_id: string;
  } | null>(null);
  const [finalizado, setFinalizado] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const { highlightId, scrollTo } = useHighlightScroll({ prefix: "janij-" });
  const esCreador = user?.id === sesion?.madrij_id;

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

  useEffect(() => {
    if (!search.trim()) {
      setAiResults([]);
      return;
    }

    const controller = new AbortController();
    setAiLoading(true);

    fetch("/api/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: search,
        names: janijim.map((j) => j.nombre),
      }),
      signal: controller.signal,
    })
      .then((res) => res.json())
      .then((d) => {
        setAiResults(d.matches || []);
        setAiLoading(false);
      })
      .catch(() => {
        setAiResults([]);
        setAiLoading(false);
      });

    return () => controller.abort();
  }, [search, janijim]);

  const resultados = useMemo(() => {
    if (!search.trim()) return [];

    const q = search.toLowerCase().trim();
    const exact = janijim
      .filter((j) => j.nombre.toLowerCase().includes(q))
      .map((j) => ({ ...j, ai: false }));

    const aiMatches = Array.from(new Set(aiResults))
      .map((name) => janijim.find((j) => j.nombre === name))
      .filter(
        (j): j is { id: string; nombre: string } =>
          !!j && !exact.some((e) => e.id === j.id)
      )
      .filter((j, idx, arr) => arr.findIndex((a) => a.id === j.id) === idx)
      .map((j) => ({ ...j, ai: true }));

    return [...exact, ...aiMatches];
  }, [search, janijim, aiResults]);

  const seleccionar = (id: string) => {
    setShowResults(false);
    setSearch("");
    scrollTo(id);
  };

  useEffect(() => {
    if (!sesionId) return;

    const canal = supabase
      .channel(`asistencia_sesion_${sesionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "asistencias",
          filter: `sesion_id=eq.${sesionId}`,
        },
        (payload) => {
          const data = payload.new as AsistenciaRow;
          setEstado((prev) => ({ ...prev, [data.janij_id]: data.presente }));
          if (data.madrij_id !== user?.id) {
            setUpdating(true);
            setTimeout(() => setUpdating(false), 150);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "asistencia_sesiones",
          filter: `id=eq.${sesionId}`,
        },
        (payload) => {
          const data = payload.new as SesionRow;
          if (data.finalizado) {
            setUpdating(true);
            setFinalizado(true);
            setTimeout(() => setUpdating(false), 150);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, [sesionId, user?.id]);

  // Refresco periódico cada 5 segundos para asegurarnos de que
  // el estado esté siempre sincronizado, incluso si se pierde un evento
  useEffect(() => {
    if (!sesionId) return;
    const id = setInterval(() => {
      Promise.all([getSesion(sesionId), getAsistencias(sesionId)])
        .then(([s, a]) => {
          if (s) {
            setFinalizado(s.finalizado);
          }
          const m: Record<string, boolean> = {};
          a.forEach((r) => {
            m[r.janij_id] = r.presente;
          });
          setEstado(m);
        })
        .catch(() => {
          /* ignore errors */
        });
    }, 5000);
    return () => clearInterval(id);
  }, [sesionId]);

  const toggle = async (janijId: string) => {
    if (!user || !sesionId) return;
    const nuevo = !estado[janijId];
    setEstado((p) => ({ ...p, [janijId]: nuevo }));
    try {
      await marcarAsistencia(sesionId, proyectoId, janijId, user.id, nuevo);
      // No se necesita broadcast
    } catch (e) {
      console.error(e);
    }
  };

  const finalizar = async () => {
    await finalizarSesion(sesionId);
    setFinalizado(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  if (finalizado) {
    const presentes = janijim.filter((j) => estado[j.id]);
    const ausentes = janijim.filter((j) => !estado[j.id]);

    const exportar = () => {
      const data = presentes.map((j) => ({ nombre: j.nombre }));
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      const blob = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `asistencia-${sesion?.nombre || "sesion"}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    };

    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-4">
        <h2 className="text-xl font-semibold">Asistencia finalizada</h2>
        <p className="text-gray-700">{sesion?.nombre}</p>
        <div className="bg-white p-4 rounded shadow">
          <p>Presentes: {presentes.length}</p>
          <p>Ausentes: {ausentes.length}</p>
        </div>
        {esCreador && (
          <button
            onClick={exportar}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg w-full"
          >
            Descargar Excel
          </button>
        )}
        <button
          onClick={() => router.push(`/proyecto/${proyectoId}/janijim`)}
          className="px-4 py-2 bg-green-600 text-white rounded-lg w-full"
        >
          Volver al menú
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      {updating && (
        <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
          <Loader className="h-6 w-6" />
        </div>
      )}
      <div className="max-w-2xl mx-auto mt-12 space-y-4">
        <h2 className="text-xl font-semibold">{sesion?.nombre}</h2>
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            value={search}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 100)}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
            }}
            placeholder="Buscar janij..."
            className="w-full border rounded-lg p-2"
          />
          {showResults && search.trim() !== "" && (
            <ul className="absolute z-10 left-0 top-full mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
              {resultados
                .filter((r) => !r.ai)
                .map((r) => (
                  <li
                    key={r.id}
                    onMouseDown={() => seleccionar(r.id)}
                    className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                  >
                    <span>{r.nombre}</span>
                  </li>
                ))}
              {aiLoading && (
                <li className="p-2 text-sm text-gray-500">Buscando con IA...</li>
              )}
              {!aiLoading && aiResults.length === 0 && (
                <li className="p-2 text-sm text-gray-500">
                  No se encontraron resultados con la IA.
                </li>
              )}
              {!aiLoading && resultados.filter((r) => r.ai).length > 0 && (
                <>
                  <li className="px-2 text-xs text-gray-400">
                    Sugerencias con IA
                  </li>
                  {resultados
                    .filter((r) => r.ai)
                    .map((r) => (
                      <li
                        key={r.id}
                        onMouseDown={() => seleccionar(r.id)}
                        className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                      >
                        <span>{r.nombre}</span>
                        <span className="bg-fuchsia-100 text-fuchsia-700 text-xs px-1 rounded">
                          IA
                        </span>
                      </li>
                    ))}
                </>
              )}
            </ul>
          )}
        </div>
        <ul className="space-y-2">
          {janijim.map((j) => (
            <li
              id={`janij-${j.id}`}
              key={j.id}
              className={`flex items-center justify-between bg-white shadow p-4 rounded-lg ${
                highlightId === j.id ? "ring-2 ring-blue-500 animate-pulse" : ""
              }`}
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
        {esCreador && (
          <button
            onClick={finalizar}
            className="px-4 py-2 bg-green-600 text-white rounded-lg w-full"
          >
            Finalizar asistencia
          </button>
        )}
      </div>
    </div>
  );
}
