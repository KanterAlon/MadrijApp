"use client";

import { useEffect, useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import useHighlightScroll from "@/hooks/useHighlightScroll";
import fuzzysort from "fuzzysort";
import Loader from "@/components/ui/loader";
import { getJanijim, type JanijRecord } from "@/lib/supabase/janijim";
import {
  getAsistencias,
  marcarAsistencia,
  finalizarSesion,
  getSesion,
} from "@/lib/supabase/asistencias";
import { supabase } from "@/lib/supabase";
import { Search, FileUp, Check, ArrowLeft, ArrowUp, Eye, PhoneCall } from "lucide-react";
import Button from "@/components/ui/button";
import { toast } from "react-hot-toast";
import { showError } from "@/lib/alerts";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import { AccessDeniedError } from "@/lib/supabase/access";
import JanijDetailModal from "@/components/janij-detail-modal";
import { buildTelHref } from "@/lib/phone";

type AsistenciaRow = {
  janij_id: string;
  presente: boolean;
  madrij_id: string;
};

type SesionState = {
  id: string;
  proyecto_id: string;
  nombre: string;
  madrij_id: string;
  finalizado: boolean;
};

export default function AsistenciaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const params = useSearchParams();
  const sesionId = params.get("sesion") || "";
  const { user } = useUser();
  const router = useRouter();

  const [janijim, setJanijim] = useState<JanijRecord[]>([]);
  const [estado, setEstado] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [sesion, setSesion] = useState<SesionState | null>(null);
  const [finalizado, setFinalizado] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
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
  const [detailJanij, setDetailJanij] = useState<JanijRecord | null>(null);
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<JanijRecord | null>(null);
  const esCreador = user?.id === sesion?.madrij_id;

  const presentesCount = useMemo(
    () => janijim.filter((j) => estado[j.id]).length,
    [janijim, estado]
  );
  const sortedJanijim = useMemo(() => {
    const byName = [...janijim].sort((a, b) => (a.nombre ?? "").localeCompare(b.nombre ?? ""));
    const presentes = byName.filter((j) => estado[j.id]);
    const ausentes = byName.filter((j) => !estado[j.id]);
    return [...presentes, ...ausentes];
  }, [janijim, estado]);

  const [forbidden, setForbidden] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);

  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  useEffect(() => {
    const handle = () => setShowTopButton(window.scrollY > 200);
    window.addEventListener("scroll", handle);
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    if (!sesionId || !user) return;
    let cancelled = false;
    setLoading(true);
    setForbidden(false);
    setForbiddenMessage(null);

    (async () => {
      try {
        const sessionData = await getSesion(user.id, sesionId);
        if (cancelled) return;
        setSesion({
          id: sessionData.id,
          proyecto_id: sessionData.proyecto_id,
          nombre: sessionData.nombre,
          madrij_id: sessionData.madrij_id,
          finalizado: sessionData.finalizado,
        });
        setFinalizado(sessionData.finalizado);

        const proyectoRef = sessionData.proyecto_id as string;
        const [j, a] = await Promise.all([
          getJanijim(proyectoRef, user.id),
          getAsistencias(user.id, sesionId),
        ]);
        if (cancelled) return;
        setJanijim(j);
        const m: Record<string, boolean> = {};
        a.forEach((r) => {
          m[r.janij_id] = r.presente;
        });
        setEstado(m);
      } catch (err) {
        if (err instanceof AccessDeniedError) {
          if (!cancelled) {
            setForbidden(true);
            setForbiddenMessage(err.message);
            setJanijim([]);
            setEstado({});
            setSesion(null);
          }
        } else {
          if (!cancelled) {
            showError("No se pudo cargar la asistencia");
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sesionId, user]);

  const exactMatches = useMemo(() => {
    if (!search.trim()) return [];
    const q = normalize(search);
    return janijim
      .filter((j) => normalize(j.nombre).includes(q));
  }, [search, janijim]);

  const data = useMemo(
    () => janijim.map((j) => ({ ...j, norm: normalize(j.nombre) })),
    [janijim]
  );

  const fuzzyMatches = useMemo(() => {
    if (!search.trim()) return [];
    const results = fuzzysort.go(normalize(search), data, {
      key: "norm",
      limit: 5,
      threshold: -Infinity,
    });
    return results
      .map((r) => r.obj)
      .filter((j) => !exactMatches.some((e) => e.id === j.id));
  }, [search, data, exactMatches]);

  const resultados = [...exactMatches, ...fuzzyMatches];

  const seleccionar = (id: string) => {
    setShowResults(false);
    setSearch("");
    scrollTo(id);
  };

  useEffect(() => {
    if (!sesionId || !user || forbidden) return;

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
          const data = payload.new as SesionState;
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
  }, [sesionId, user, forbidden]);

  // Refresco periódico cada 5 segundos para asegurarnos de que
  // el estado esté siempre sincronizado, incluso si se pierde un evento
  useEffect(() => {
    if (!sesionId || !user || forbidden) return;
    const id = setInterval(() => {
      Promise.all([getSesion(user.id, sesionId), getAsistencias(user.id, sesionId)])
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
        .catch((err) => {
          if (err instanceof AccessDeniedError) {
            setForbidden(true);
            setForbiddenMessage(err.message);
            clearInterval(id);
          }
        });
    }, 5000);
    return () => clearInterval(id);
  }, [sesionId, user, forbidden]);

    const toggle = async (janijId: string) => {
      if (!user || !sesionId || forbidden) return;
      const nuevo = !estado[janijId];
      setEstado((p) => ({ ...p, [janijId]: nuevo }));
      try {
        await marcarAsistencia(user.id, sesionId, janijId, user.id, nuevo);
        // No se necesita broadcast
      } catch (e) {
        setEstado((p) => ({ ...p, [janijId]: !nuevo }));
        if (e instanceof AccessDeniedError) {
          setForbidden(true);
          setForbiddenMessage(e.message);
          toast.error(e.message);
        } else {
          showError("No se pudo actualizar la asistencia");
        }
      }
    };

    const finalizar = async () => {
      if (!user || !sesionId) return;
      try {
        await finalizarSesion(user.id, sesionId);
        setFinalizado(true);
      } catch (e) {
        if (e instanceof AccessDeniedError) {
          setForbidden(true);
          setForbiddenMessage(e.message);
          toast.error(e.message);
        } else {
          showError("No se pudo finalizar la sesión");
        }
      }
    };

  const irArriba = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const closeDetail = () => setDetailJanij(null);
  const openCallDialog = (janij: JanijRecord) => {
    setCallTarget(janij);
    setCallDialogOpen(true);
  };
  const closeCallDialog = () => {
    setCallDialogOpen(false);
    setCallTarget(null);
  };
  const initiateCall = (phone: string | null | undefined, fallbackMsg: string) => {
    const telHref = buildTelHref(phone);
    if (!telHref) {
      toast.error(fallbackMsg);
      return;
    }
    window.location.href = telHref;
  };
  const handleCallMother = () => {
    initiateCall(callTarget?.tel_madre, "No hay teléfono de la madre cargado");
    closeCallDialog();
  };
  const handleCallFather = () => {
    initiateCall(callTarget?.tel_padre, "No hay teléfono del padre cargado");
    closeCallDialog();
  };

    if (loading) {
      return (
        <div className="flex justify-center py-8">
          <Loader className="h-6 w-6" />
        </div>
      );
    }

    if (forbidden) {
      return (
        <div className="max-w-3xl mx-auto mt-12">
          <div className="rounded-xl border border-red-200 bg-red-50 p-6 shadow-sm text-red-800">
            <h2 className="text-xl font-semibold text-red-900">Acceso restringido</h2>
            <p className="mt-3">
              {forbiddenMessage ?? "No tenés permisos para gestionar la asistencia de este proyecto."}
            </p>
          </div>
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
      const keys = Object.keys(data[0] || {});
      const headers = keys.map((k) => k.toUpperCase());
      const ws = XLSX.utils.aoa_to_sheet([headers]);
      XLSX.utils.sheet_add_json(ws, data, { skipHeader: true, origin: "A2" });
      const colWidths = keys.map((key, i) => {
        const headerLength = headers[i].length;
        const maxDataLength = Math.max(
          0,
          ...data.map((row) => (row[key] ? row[key]!.toString().length : 0))
        );
        return { wch: Math.max(headerLength, maxDataLength) + 2 };
      });
      ws["!cols"] = colWidths;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
      const blob = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const url = URL.createObjectURL(new Blob([blob]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `${sesion?.nombre || "asistencia"}.xlsx`;
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
      <Modal open={callDialogOpen} onOpenChange={closeCallDialog}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Llamar</ModalTitle>
            <ModalDescription>ElegA- a quiAcn llamar</ModalDescription>
          </ModalHeader>
          <div className="p-4 space-y-4">
            <Button
              className="w-full"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={handleCallMother}
              disabled={!callTarget?.tel_madre}
            >
              MamA?
            </Button>
            <Button
              className="w-full"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={handleCallFather}
              disabled={!callTarget?.tel_padre}
            >
              PapA?
            </Button>
            <Button className="w-full" variant="secondary" onClick={closeCallDialog}>
              Cancelar
            </Button>
          </div>
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
    <>
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
                {/* 1. Coincidencias normales */}
                {exactMatches.map((r) => (
                  <li
                    key={r.id}
                    onClick={() => seleccionar(r.id)}
                    className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                  >
                    <span>{r.nombre}</span>
                  </li>
                ))}

                {/* 2. Coincidencias aproximadas */}
                {fuzzyMatches.length > 0 && (
                  <>
                    {exactMatches.length > 0 && (
                      <li className="px-2 text-xs text-gray-400">
                        Coincidencias aproximadas
                      </li>
                    )}
                    {fuzzyMatches.map((r) => (
                      <li
                        key={r.id}
                        onClick={() => seleccionar(r.id)}
                        className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                      >
                        <span>{r.nombre}</span>
                      </li>
                    ))}
                  </>
                )}

                {/* 3. Sin resultados */}
                {resultados.length === 0 && (
                  <li className="p-2 text-sm text-gray-500">
                    No se encontraron resultados.
                  </li>
                )}

                {/* 4. Opción para agregar un nuevo nombre */}
                {search.trim() !== "" &&
                  !janijim.some(
                    (j) => normalize(j.nombre) === normalize(search)
                  ) &&
                  !resultados.some(
                    (r) => normalize(r.nombre) === normalize(search)
                  ) && (
                    <li className="p-2 text-sm text-gray-500">
                      {`"${search.trim()}" no figura en la planilla. Edita la hoja y sincroniza de nuevo.`}
                    </li>
                  )}
              </ul>
            )}
          </div>
          <div className="space-y-3 pb-32">
            {sortedJanijim.length === 0 ? (
              <div className="text-center text-sm text-gray-500 border rounded-lg py-6 bg-white">
                Todavía no hay janijim disponibles para este proyecto.
              </div>
            ) : (
              <ul className="space-y-2">
                {sortedJanijim.map((janij) => {
                  const presente = Boolean(estado[janij.id]);
                  return (
                    <li
                      id={`janij-${janij.id}`}
                      key={janij.id}
                      className={`flex flex-col gap-3 rounded-lg bg-white p-4 shadow sm:flex-row sm:items-center sm:justify-between ${
                        highlightId === janij.id ? "ring-2 ring-blue-500" : ""
                      }`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-slate-900">{janij.nombre}</p>
                          <button
                            type="button"
                            onClick={() => setDetailJanij(janij)}
                            className="rounded-full p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            aria-label={`Ver información de ${janij.nombre}`}
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-sm text-slate-500">
                          {janij.grupo ? `Grupo ${janij.grupo}` : "Sin grupo asignado"}
                        </p>
                      </div>
                      <Button
                        variant={presente ? "success" : "secondary"}
                        onClick={() => toggle(janij.id)}
                        aria-pressed={presente}
                        className="w-full sm:w-auto"
                      >
                        {presente ? "Presente" : "Ausente"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            )}
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
      </div>
      <JanijDetailModal
        open={Boolean(detailJanij)}
        janij={detailJanij}
        onClose={closeDetail}
        readOnly
        onCall={
          detailJanij ? () => openCallDialog(detailJanij) : undefined
        }
        callDisabled={
          !detailJanij ||
          (!detailJanij.tel_madre && !detailJanij.tel_padre)
        }
      />
    </>
  );
}

