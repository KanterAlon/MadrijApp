"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import useHighlightScroll from "@/hooks/useHighlightScroll";
import Loader from "@/components/ui/loader";
import { getJanijim, type JanijData } from "@/lib/supabase/janijim";
import {
  getAsistencias,
  marcarAsistencia,
  finalizarSesion,
  getSesion,
} from "@/lib/supabase/asistencias";
import { supabase } from "@/lib/supabase";
import { Search, FileUp, Check, ArrowLeft, ArrowUp } from "lucide-react";
import Button from "@/components/ui/button";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";

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

  const [janijim, setJanijim] = useState<(JanijData & { id: string })[]>([]);
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
  const [showTopButton, setShowTopButton] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const exportable = [
    { key: "dni", label: "DNI" },
    { key: "numero_socio", label: "Número socio" },
    { key: "grupo", label: "Grupo" },
    { key: "tel_madre", label: "Tel. madre" },
    { key: "tel_padre", label: "Tel. padre" },
  ];
  const [selectedExtras, setSelectedExtras] = useState<string[]>([]);
  const { highlightId, scrollTo } = useHighlightScroll({ prefix: "janij-" });
  const esCreador = user?.id === sesion?.madrij_id;

  const presentesCount = useMemo(
    () => janijim.filter((j) => estado[j.id]).length,
    [janijim, estado]
  );

  const [presentesArriba, setPresentesArriba] = useState(false);

  const janijimOrdenados = useMemo(() => {
    return [...janijim].sort((a, b) => {
      if (presentesArriba) {
        const aPres = estado[a.id] ? 1 : 0;
        const bPres = estado[b.id] ? 1 : 0;
        if (aPres !== bPres) {
          return bPres - aPres;
        }
      }
      return a.nombre.localeCompare(b.nombre);
    });
  }, [janijim, estado, presentesArriba]);

  useEffect(() => {
    const handle = () => setShowTopButton(window.scrollY > 200);
    window.addEventListener("scroll", handle);
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, []);

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
      .map((name) => janijim.find((j) => j.nombre.trim() === name))
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

  const irArriba = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
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
      const data = presentes.map((j) => {
        const row: Record<string, string | null | undefined> = {
          Nombre: j.nombre,
        };
        exportable.forEach((a) => {
          if (selectedExtras.includes(a.key)) {
            const value = (j as Record<string, string | null | undefined>)[a.key];
            row[a.label] = value || "";
          }
        });
        return row;
      });
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
          <>
            <Button
              className="w-full"
              icon={<FileUp className="w-4 h-4" />}
              onClick={() => setExportOpen(true)}
            >
              Descargar Excel
            </Button>
            <Modal open={exportOpen} onOpenChange={setExportOpen}>
              <ModalContent>
                <ModalHeader>
                  <ModalTitle>Columnas extra</ModalTitle>
                  <ModalDescription>
                    Seleccioná los datos adicionales a incluir.
                  </ModalDescription>
                </ModalHeader>
                <div className="space-y-2 text-sm">
                  {exportable.map((a) => (
                    <label key={a.key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedExtras.includes(a.key)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedExtras([...selectedExtras, a.key]);
                          } else {
                            setSelectedExtras(selectedExtras.filter((c) => c !== a.key));
                          }
                        }}
                      />
                      {a.label}
                    </label>
                  ))}
                </div>
                <ModalFooter>
                  <Button
                    icon={<FileUp className="w-4 h-4" />}
                    onClick={() => {
                      exportar();
                      setExportOpen(false);
                    }}
                  >
                    Exportar
                  </Button>
                </ModalFooter>
              </ModalContent>
            </Modal>
          </>
        )}
        <Button
          className="w-full"
          variant="secondary"
          onClick={() => router.push(`/proyecto/${proyectoId}/janijim`)}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Volver al menú
        </Button>
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
        <div className="relative flex items-center">
          <Search className="absolute left-2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onFocus={() => setShowResults(true)}
            onBlur={() => setTimeout(() => setShowResults(false), 100)}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowResults(true);
            }}
            placeholder="Buscá un janij por nombre"
            className="w-full border rounded-lg p-2 pl-8"
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
        <div className="flex items-center gap-2 mt-2">
          <input
            id="presentes-arriba"
            type="checkbox"
            className="h-4 w-4"
            checked={presentesArriba}
            onChange={(e) => setPresentesArriba(e.target.checked)}
          />
          <label htmlFor="presentes-arriba" className="text-sm">
            Presentes arriba
          </label>
        </div>
        <ul className="space-y-2 pb-32">
          {janijimOrdenados.map((j) => (
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
        </div>
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow text-center py-2">
          Presentes: {presentesCount} / {janijim.length}
        </div>
        {(esCreador || showTopButton) && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-10 flex flex-col items-end space-y-2">
          {esCreador && (
            <Button
              className="rounded-full shadow-lg px-6 py-3"
              variant="danger"
              icon={<Check className="w-4 h-4" />}
              onClick={finalizar}
            >
              Finalizar asistencia
            </Button>
          )}
          {showTopButton && (
            <Button
              className="rounded-full shadow-lg px-6 py-3"
              variant="secondary"
              icon={<ArrowUp className="w-4 h-4" />}
              onClick={irArriba}
            >
              Ir arriba
            </Button>
          )}
        </div>
      )}
    </div>
  );
}