"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import useHighlightScroll from "@/hooks/useHighlightScroll";
import fuzzysort from "fuzzysort";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Modal,
  ModalContent,
  ModalDescription,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "@/components/ui/modal";
import {
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ArrowLeft,
  ArrowUp,
  Eye,
  PhoneCall,
  RefreshCcw,
  PlusCircle,
} from "lucide-react";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
import ActiveSesionCard from "@/components/active-sesion-card";
import {
  getJanijim,
  addJanijim,
  updateJanij,
  removeJanij,
} from "@/lib/supabase/janijim";
import { crearSesion } from "@/lib/supabase/asistencias";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";
import { showError, confirmDialog } from "@/lib/alerts";
import { getGruposByProyecto, type Grupo } from "@/lib/supabase/grupos";
import { AccessDeniedError } from "@/lib/supabase/access";


type Janij = {
  id: string;
  /** Nombre y apellido del janij */
  nombre: string;
  dni: string | null;
  numero_socio: string | null;
  grupo: string | null;
  tel_madre: string | null;
  tel_padre: string | null;
  estado: "presente" | "ausente";
};

type Tag = { name: string; color: number };
type AppRole = "madrij" | "coordinador" | "director" | "admin";

const tagColors = [
  { bg: "bg-red-100", text: "text-red-800" },
  { bg: "bg-blue-100", text: "text-blue-800" },
  { bg: "bg-green-100", text: "text-green-800" },
  { bg: "bg-yellow-100", text: "text-yellow-800" },
  { bg: "bg-purple-100", text: "text-purple-800" },
  { bg: "bg-pink-100", text: "text-pink-800" },
  { bg: "bg-indigo-100", text: "text-indigo-800" },
  { bg: "bg-gray-100", text: "text-gray-800" },
];

export default function JanijimPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const [dupOpen, setDupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const { highlightId, scrollTo } = useHighlightScroll({ prefix: "janij-" });
  const [uniqueNames, setUniqueNames] = useState<string[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [selectedDupes, setSelectedDupes] = useState<string[]>([]);
  const [importText, setImportText] = useState("");
  const [detailJanij, setDetailJanij] = useState<Janij | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDni, setEditDni] = useState("");
  const [editSocio, setEditSocio] = useState("");
  const [editGrupo, setEditGrupo] = useState("");
  const [editTelMadre, setEditTelMadre] = useState("");
  const [editTelPadre, setEditTelPadre] = useState("");
  const [sesionOpen, setSesionOpen] = useState(false);
  const [tags, setTags] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [sesionMadrij, setSesionMadrij] = useState<string>("");
  const [callDialogOpen, setCallDialogOpen] = useState(false);
  const [callTarget, setCallTarget] = useState<Janij | null>(null);
  const [grupos, setGrupos] = useState<Grupo[]>([]);
  const [selectedGrupoId, setSelectedGrupoId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [forbidden, setForbidden] = useState(false);
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const pendingScrollId = useRef<string | null>(null);
  const normalize = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();

  const selectedGrupo = useMemo(
    () => grupos.find((g) => g.id === selectedGrupoId) ?? null,
    [grupos, selectedGrupoId],
  );

  const sheetManaged = useMemo(
    () =>
      Boolean(
        selectedGrupo &&
          selectedGrupo.spreadsheet_id &&
          selectedGrupo.janij_sheet &&
          selectedGrupo.madrij_sheet,
      ),
    [selectedGrupo],
  );

  const isAdmin = useMemo(() => roles.includes("admin"), [roles]);
  const canEdit = isAdmin && !sheetManaged;
  const canStartSesion = roles.some((rol) =>
    ["admin", "coordinador", "madrij"].includes(rol),
  );

  const ensureWritable = useCallback(() => {
    if (!canEdit) {
      toast.error("No tenés permisos para editar este proyecto");
      return false;
    }
    if (!sheetManaged) return true;
    toast.error("Los datos se sincronizan desde Google Sheets y son de solo lectura");
    return false;
  }, [canEdit, sheetManaged]);

  const seleccionar = useCallback(
    (id: string) => {
      setShowResults(false);
      setSearch("");
      scrollTo(id);
    },
    [scrollTo]
  );

  useEffect(() => {
    const handle = () => setShowTopButton(window.scrollY > 200);
    window.addEventListener("scroll", handle);
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("roles fetch failed"))))
      .then((payload: { roles?: AppRole[] }) => {
        if (cancelled) return;
        const nextRoles = Array.isArray(payload?.roles) ? (payload?.roles as AppRole[]) : [];
        setRoles(nextRoles);
      })
      .catch(() => {
        if (!cancelled) {
          setRoles([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadJanijim = useCallback(
    async (targetGrupoId: string | null) => {
      if (!user) return;
      setLoading(true);
      try {
        const data = await getJanijim(proyectoId, user.id);
        setForbidden(false);
        setForbiddenMessage(null);
        const filtered = targetGrupoId ? data.filter((j) => j.grupo_id === targetGrupoId) : data;
        setJanijim(
          filtered.map((j) => ({
            id: j.id,
            nombre: j.nombre,
            dni: j.dni ?? null,
            numero_socio: j.numero_socio ?? null,
            grupo: j.grupo ?? null,
            grupo_id: j.grupo_id as string,
            tel_madre: j.tel_madre ?? null,
            tel_padre: j.tel_padre ?? null,
            estado: "ausente" as const,
          })),
        );
      } catch (err) {
        if (err instanceof AccessDeniedError) {
          setForbidden(true);
          setForbiddenMessage(err.message);
          setJanijim([]);
        } else {
          console.error("Error cargando janijim", err);
          showError("No se pudieron cargar los janijim");
        }
      } finally {
        setLoading(false);
      }
    },
    [proyectoId, user],
  );

  useEffect(() => {
    if (!selectedGrupoId || forbidden) return;
    loadJanijim(selectedGrupoId);
  }, [selectedGrupoId, forbidden, loadJanijim]);

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    getGruposByProyecto(proyectoId, user.id)
      .then((data) => {
        if (ignore) return;
        setForbidden(false);
        setForbiddenMessage(null);
        setGrupos(data);
        setSelectedGrupoId((prev) => prev ?? data[0]?.id ?? null);
        setSyncMessage(null);
      })
      .catch((err) => {
        if (ignore) return;
        if (err instanceof AccessDeniedError) {
          setForbidden(true);
          setForbiddenMessage(err.message);
          setGrupos([]);
          setSelectedGrupoId(null);
        } else {
          console.error("Error cargando grupos", err);
          showError("No se pudieron cargar los grupos");
        }
      });
    return () => {
      ignore = true;
    };
  }, [proyectoId, user]);

  useEffect(() => {
    if (sheetManaged) {
      setImportOpen(false);
    }
  }, [sheetManaged]);

  useEffect(() => {
    if (!proyectoId || !user || forbidden) return;
    getMadrijimPorProyecto(proyectoId)
      .then((m) => {
        setMadrijes(m);
        if (m.length > 0 && !sesionMadrij) {
          const def = m.find((md) => md.clerk_id === user.id) || m[0];
          setSesionMadrij(def.clerk_id);
        }
      })
      .catch((err) => {
        if (err instanceof AccessDeniedError) {
          setForbidden(true);
          setForbiddenMessage(err.message);
          setMadrijes([]);
        } else {
          console.error("Error cargando madrijim", err);
          showError("No se pudieron cargar los madrijim");
        }
      });
  }, [proyectoId, sesionMadrij, user, forbidden]);

  useEffect(() => {
    const stored = localStorage.getItem(`asistencia-tags-${proyectoId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          if (parsed.length > 0 && typeof parsed[0] === "string") {
            setAllTags(
              parsed.map((name: string, idx: number) => ({
                name,
                color: idx % tagColors.length,
              }))
            );
          } else {
            setAllTags(parsed);
          }
        } else {
          setAllTags([]);
        }
      } catch {
        setAllTags([]);
      }
    }
  }, [proyectoId]);

  useEffect(() => {
    localStorage.setItem(
      `asistencia-tags-${proyectoId}`,
      JSON.stringify(allTags)
    );
  }, [allTags, proyectoId]);

  const addTag = () => {
    const newTag = tagInput.trim();
    if (!newTag) return;
    if (!allTags.some((t) => t.name === newTag))
      setAllTags([
        ...allTags,
        { name: newTag, color: allTags.length % tagColors.length },
      ]);
    if (!tags.includes(newTag)) setTags([...tags, newTag]);
    setTagInput("");
  };

  const removeTagFromProject = (name: string) => {
    setAllTags(allTags.filter((t) => t.name !== name));
    setTags(tags.filter((t) => t !== name));
  };

  useEffect(() => {
    if (pendingScrollId.current) {
      seleccionar(pendingScrollId.current);
      pendingScrollId.current = null;
    }
  }, [janijim, seleccionar]);

  useEffect(() => {
    if (detailJanij) {
      setEditDni(detailJanij.dni ?? "");
      setEditSocio(detailJanij.numero_socio ?? "");
      setEditGrupo(detailJanij.grupo ?? "");
      setEditTelMadre(detailJanij.tel_madre ?? "");
      setEditTelPadre(detailJanij.tel_padre ?? "");
    }
  }, [detailJanij]);

  const agregar = async (nombre: string) => {
    if (!ensureWritable()) return;
    try {
      const inserted = await addJanijim(proyectoId, [{ nombre }]);
      const nuevo: Janij = {
        ...inserted[0],
        estado: "ausente" as const,
      };
      setJanijim((prev) => [...prev, nuevo]);
      toast.success("Janij agregado correctamente");
      pendingScrollId.current = inserted[0].id;
    } catch {
      showError("Error agregando janij");
    }
  };

  const renameJanij = async (
    id: string,
    nombre: string,
  ) => {
    if (!ensureWritable()) return;
    try {
      await updateJanij(proyectoId, id, { nombre });
      setJanijim((prev) =>
        prev.map((j) => (j.id === id ? { ...j, nombre } : j)),
      );
      toast.success("Janij actualizado correctamente");
    } catch {
      showError("Error renombrando janij");
    }
  };

  const startEditing = (id: string, nombre: string) => {
    if (!ensureWritable()) return;
    setEditingId(id);
    setEditName(nombre);
  };

  const confirmEdit = async () => {
    if (!ensureWritable()) return;
    if (!editingId) return;
    const nombre = editName.trim();
    if (nombre === "") {
      setEditingId(null);
      return;
    }
    await renameJanij(editingId, nombre);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const saveDetail = async () => {
    if (!ensureWritable()) return;
    if (!detailJanij) return;
    const data = {
      dni: editDni.trim() || null,
      numero_socio: editSocio.trim() || null,
      grupo: editGrupo.trim() || null,
      tel_madre: editTelMadre.trim() || null,
      tel_padre: editTelPadre.trim() || null,
    };
    try {
      await updateJanij(proyectoId, detailJanij.id, data);
      setJanijim((prev) =>
        prev.map((j) => (j.id === detailJanij.id ? { ...j, ...data } : j)),
      );
      setDetailJanij({ ...detailJanij, ...data });
      toast.success("Janij actualizado correctamente");
    } catch {
      showError("Error actualizando janij");
    }
  };

  const callParent = (phone: string, fallbackMsg: string) => {
    const sanitized = phone.trim();
    if (!sanitized) {
      toast.error(fallbackMsg);
      return;
    }

    const cleanNumber = sanitized.replace(/[^+\d]/g, "");
    if (!cleanNumber) {
      toast.error(fallbackMsg);
      return;
    }

    const normalized = cleanNumber.startsWith("+")
      ? `+${cleanNumber.slice(1).replace(/\+/g, "")}`
      : cleanNumber.replace(/\+/g, "");

    if (!normalized || normalized === "+") {
      toast.error(fallbackMsg);
      return;
    }

    const PRIVATE_CALL_PREFIX = "#31#";
    const callSequence = `${PRIVATE_CALL_PREFIX}${normalized}`;
    const url = `tel:${encodeURIComponent(callSequence)}`;
    window.location.assign(url);
  };

  const callMother = () =>
    callParent(editTelMadre, "No hay teléfono de la madre cargado");

  const callFather = () =>
    callParent(editTelPadre, "No hay teléfono del padre cargado");

  const openCallDialog = () => {
    if (!detailJanij) return;
    setCallTarget(detailJanij);
    setDetailJanij(null);
    setCallDialogOpen(true);
  };

  const closeCallDialog = () => {
    setCallDialogOpen(false);
    if (callTarget) {
      setDetailJanij(callTarget);
      setCallTarget(null);
    }
  };

  const handleCallMother = () => {
    callMother();
    closeCallDialog();
  };

  const handleCallFather = () => {
    callFather();
    closeCallDialog();
  };

  const syncWithSheets = async () => {
    if (forbidden) {
      toast.error("No tenés permisos para sincronizar este proyecto");
      return;
    }
    if (!isAdmin) {
      toast.error("Solo el administrador puede sincronizar los datos desde la hoja institucional");
      return;
    }
    if (!grupo?.id) {
      toast.error("No encontramos el grupo para sincronizar");
      return;
    }
    setSyncing(true);
    setSyncMessage(null);
    try {
      const res = await fetch(`/api/grupos/${grupo.id}/sync`, { method: "POST" });
      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload?.error || "Error sincronizando");
      }
      const summary = `Janijim: ${payload.janijim.inserted} nuevos, ${payload.janijim.updated} actualizados, ${payload.janijim.deactivated} inactivos. Madrijim: ${payload.madrijim.inserted} nuevos, ${payload.madrijim.updated} actualizados, ${payload.madrijim.deactivated} inactivos.`;
      const timestamp = new Date().toLocaleString();
      setSyncMessage(`Ultima sincronizacion (${timestamp}): ${summary}`);
      toast.success("Sincronizacion completada");
      await loadJanijim();
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Error sincronizando";
      setSyncMessage(message);
      toast.error(message);
    } finally {
      setSyncing(false);
    }
  };

  const deleteJanij = async (id: string) => {
    if (!ensureWritable()) return;
    if (!(await confirmDialog("¿Eliminar janij?"))) return;
    try {
      await removeJanij(id);
      setJanijim((prev) => prev.filter((j) => j.id !== id));
      toast.success("Janij eliminado");
    } catch {
      showError("Error eliminando janij");
    }
  };

  const importFromText = () => {
    if (!ensureWritable()) return;
    const names = importText
      .split("\n")
      .map((n) => n.trim())
      .filter((n) => n !== "");

    const existing = janijim.map((j) => j.nombre.toLowerCase());
    const uniqs: string[] = [];
    const dups: string[] = [];

    names.forEach((n) => {
      const lower = n.toLowerCase();
      if (existing.includes(lower)) {
        if (!dups.some((d) => d.toLowerCase() === lower)) dups.push(n);
      } else if (!uniqs.some((u) => u.toLowerCase() === lower)) {
        uniqs.push(n);
      }
    });

    setUniqueNames(uniqs);
    setDuplicateNames(dups);
    setSelectedDupes([]);
    setImportText("");
    setImportOpen(false);
    setDupOpen(true);
  };

  const confirmImport = async () => {
    if (!ensureWritable()) return;
    const namesToAdd = [...uniqueNames, ...selectedDupes];
    if (namesToAdd.length === 0) {
      setDupOpen(false);
      return;
    }
    try {
      const inserted = await addJanijim(
        proyectoId,
        namesToAdd.map((n) => ({ nombre: n }))
      );
      setJanijim((prev) => [
        ...prev,
        ...inserted.map((j) => ({ ...j, estado: "ausente" as const })),
      ]);
      toast.success("Janijim importados correctamente");
    } catch {
      showError("Error importando janijim");
    }
    setDupOpen(false);
  };

  const iniciarSesion = async () => {
    if (!user) return;
    if (!canStartSesion) {
      toast.error("No tenés permisos para iniciar la asistencia");
      return;
    }
    try {
      const ahora = new Date();
      const rounded = new Date(
        Math.ceil(ahora.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)
      );
      const inicioIso = rounded.toISOString();
      const fecha = inicioIso.split("T")[0];
      const hora = `${rounded
        .getHours()
        .toString()
        .padStart(2, "0")}-${rounded
        .getMinutes()
        .toString()
        .padStart(2, "0")}`;
      const tagPart = tags.join("-");
      const nombre = `asistencia-${fecha}-${hora}${
        tagPart ? `-${tagPart}` : ""
      }`;
      const sesion = await crearSesion(
        user.id,
        proyectoId,
        nombre,
        fecha,
        sesionMadrij || user.id,
        inicioIso
      );
      toast.success("Asistencia iniciada");
      router.push(
        `/proyecto/${proyectoId}/janijim/asistencia?sesion=${sesion.id}`
      );
    } catch (err) {
      if (err instanceof AccessDeniedError) {
        toast.error(err.message);
        setSesionOpen(false);
        return;
      }
      showError("Error iniciando asistencia");
    }
  };

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
      .map((r) => r.obj as Janij)
      .filter((j) => !exactMatches.some((e) => e.id === j.id));
  }, [search, data, exactMatches]);

  const resultados = [...exactMatches, ...fuzzyMatches];

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-800 space-y-3">
          <div className="space-y-1">
            <p className="font-semibold text-red-900">
              No tenés permisos para ver este proyecto
            </p>
            <p className="text-sm text-red-700">
              {forbiddenMessage ||
                "Contactá a tu coordinador o administrador para obtener acceso."}
            </p>
          </div>
          <div>
            <Button variant="outline" onClick={() => router.back()}>
              Volver atrás
            </Button>
          </div>
        </div>
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <ActiveSesionCard proyectoId={proyectoId} />

      {sheetManaged ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700 space-y-2">
          <p className="font-semibold text-blue-800">
            Sincronizado con Google Sheets
          </p>
          <p className="text-xs text-blue-700">
            Los datos se actualizan cuando el administrador confirma la sincronización anual desde la interfaz de administración.
          </p>
          {syncMessage ? (
            <p className="text-xs text-blue-700">{syncMessage}</p>
          ) : (
            <p className="text-xs text-blue-700">
              Si detectás diferencias, solicitá al administrador que genere una nueva importación.
            </p>
          )}
          {isAdmin ? (
            <div className="flex gap-2 flex-col sm:flex-row sm:items-center sm:justify-end">
              <Button
                onClick={syncWithSheets}
                loading={syncing}
                icon={<RefreshCcw className="w-4 h-4" />}
                disabled={forbidden}
                title={forbidden ? "No tenés permisos para sincronizar este proyecto" : undefined}
              >
                Sincronizar ahora
              </Button>
            </div>
          ) : (
            <p className="text-xs text-blue-700">
              Solo el administrador puede ejecutar la sincronización manual de este proyecto.
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
          <p>
            Este proyecto todavía no está vinculado a la planilla institucional. El administrador puede cargar janijim manualmente o configurar la sincronización desde la interfaz anual.
          </p>
        </div>
      )}

      {janijim.length === 0 ? (
        <div className="text-center space-y-4 py-12 border rounded-lg">
          <p className="text-gray-600">
            {canEdit
              ? "Insertá janijim para comenzar"
              : "Todavía no hay janijim cargados. Se mostrarán una vez que el administrador sincronice la planilla institucional."}
          </p>
          {canEdit && (
            <Button
              className="mx-auto"
              icon={<PlusCircle className="w-4 h-4" />}
              onClick={() => setImportOpen(true)}
            >
              Insertar janijim
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
            <div className="flex flex-col flex-1 gap-2 sm:flex-row">
              <div className="relative flex flex-1 items-center">
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
                  className="w-full border rounded-lg p-2 pl-8 focus:ring-2 focus:ring-blue-600 focus:outline-none"
                />

              {showResults && search.trim() !== "" && (
                <ul className="absolute z-10 left-0 top-full mt-1 w-full bg-white border rounded shadow max-h-60 overflow-auto">
                  {/* 1. Coincidencias normales */}
                  {exactMatches.map((r) => (
                    <li
                      key={r.id}
                      tabIndex={0}
                      onClick={() => seleccionar(r.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          seleccionar(r.id);
                        }
                      }}
                      className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                      aria-label={`Seleccionar ${r.nombre}`}
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
                          tabIndex={0}
                          onClick={() => seleccionar(r.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              seleccionar(r.id);
                            }
                          }}
                          className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
                          aria-label={`Seleccionar ${r.nombre}`}
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
                  {canEdit &&
                    search.trim() !== "" &&
                    !janijim.some(
                      (j) => normalize(j.nombre) === normalize(search)
                    ) &&
                    !resultados.some(
                      (r) => normalize(r.nombre) === normalize(search)
                    ) && (
                      <li
                        tabIndex={0}
                        onClick={() => agregar(search.trim())}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            agregar(search.trim());
                          }
                        }}
                        className="p-2 cursor-pointer hover:bg-gray-100"
                        aria-label={`Agregar ${search.trim()}`}
                      >
                        Agregar &quot;{search.trim()}&quot;
                      </li>
                    )}
                </ul>
              )}

              </div>
              {canEdit && (
                <Button
                  className="w-full sm:w-auto shrink-0 sm:ml-2"
                  icon={<Pencil className="w-4 h-4" />}
                  onClick={() => setImportOpen(true)}
                >
                  Insertar
                </Button>
              )}
            </div>
            <Button
              variant="success"
              className="w-full sm:w-auto shrink-0 sm:ml-2"
              icon={<Check className="w-4 h-4" />}
              onClick={() => setSesionOpen(true)}
              disabled={!canStartSesion || forbidden}
              title={!canStartSesion ? "No tenés permisos para iniciar la asistencia" : undefined}
            >
              Iniciar asistencia del día
            </Button>
          </div>

      <ul className="space-y-2">
        {janijim.map((janij) => (
          <li
            id={`janij-${janij.id}`}
            key={janij.id}
            className={`flex items-center justify-between bg-white shadow p-4 rounded-lg ${
              highlightId === janij.id
                ? "ring-2 ring-blue-500 animate-pulse"
                : ""
            }`}
          >
            {editingId === janij.id ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmEdit();
                  if (e.key === "Escape") cancelEdit();
                }}
                className="p-1 border rounded flex-1"
                autoFocus
                placeholder="Nombre y apellido"
              />
            ) : (
              <span>{janij.nombre}</span>
            )}
            <div className="flex items-center gap-2">
              {canEdit ? (
                editingId === janij.id ? (
                  <>
                    <button
                      onClick={confirmEdit}
                      aria-label="Guardar"
                      className="text-green-600 hover:text-green-800"
                    >
                      <Check size={16} />
                    </button>
                    <button
                      onClick={cancelEdit}
                      aria-label="Cancelar"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <X size={16} />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(janij.id, janij.nombre)}
                      aria-label="Editar"
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => setDetailJanij(janij)}
                      aria-label="Ver detalle"
                      className="text-gray-600 hover:text-gray-800"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => deleteJanij(janij.id)}
                      aria-label="Eliminar"
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </>
                )
              ) : (
                <button
                  onClick={() => setDetailJanij(janij)}
                  aria-label="Ver detalle"
                  className="text-gray-600 hover:text-gray-800"
                >
                  <Eye size={16} />
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      </>)}

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Insertar janijim manualmente</SheetTitle>
            <SheetDescription>
              Escribí un nombre por línea y luego tocá Insertar.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder="Ingresá un nombre por línea"
              className="w-full border rounded-lg p-2 min-h-32"
            />
          </div>
          <SheetFooter>
            <Button icon={<Pencil className="w-4 h-4" />} onClick={importFromText}>
              Insertar
            </Button>
            <Button
              variant="secondary"
              onClick={() => setImportOpen(false)}
              icon={<ArrowLeft className="w-4 h-4" />}
            >
              Cerrar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Modal open={!!detailJanij} onOpenChange={() => setDetailJanij(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{detailJanij?.nombre}</ModalTitle>
            <ModalDescription>Información del janij</ModalDescription>
          </ModalHeader>
          <div className="space-y-4 text-sm">
            {sheetManaged && (
              <p className="text-xs text-blue-600">
                Este registro es de solo lectura porque se sincroniza desde Google Sheets.
              </p>
            )}
            <label className="flex flex-col">
              <span className="font-medium">DNI</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editDni}
                onChange={(e) => setEditDni(e.target.value)}
                readOnly={sheetManaged}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Número socio</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editSocio}
                onChange={(e) => setEditSocio(e.target.value)}
                readOnly={sheetManaged}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Grupo</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editGrupo}
                onChange={(e) => setEditGrupo(e.target.value)}
                readOnly={sheetManaged}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Tel. madre</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editTelMadre}
                onChange={(e) => setEditTelMadre(e.target.value)}
                readOnly={sheetManaged}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Tel. padre</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editTelPadre}
                onChange={(e) => setEditTelPadre(e.target.value)}
                readOnly={sheetManaged}
              />
            </label>
          </div>
          <ModalFooter className="flex-wrap sm:flex-nowrap">
            {canEdit && (
              <Button
                variant="success"
                icon={<Check className="w-4 h-4" />}
                onClick={saveDetail}
              >
                Guardar
              </Button>
            )}
            <Button variant="secondary" onClick={() => setDetailJanij(null)}>
              Cerrar
            </Button>
            <Button
              variant="danger"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={openCallDialog}
            >
              Llamar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal open={callDialogOpen} onOpenChange={closeCallDialog}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>Llamar</ModalTitle>
            <ModalDescription>Elegí a quién llamar</ModalDescription>
          </ModalHeader>
          <div className="p-4 space-y-4">
            <Button
              className="w-full"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={handleCallMother}
            >
              Mamá
            </Button>
            <Button
              className="w-full"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={handleCallFather}
            >
              Papá
            </Button>
            <Button
              className="w-full"
              variant="secondary"
              onClick={closeCallDialog}
            >
              Cancelar
            </Button>
          </div>
        </ModalContent>
      </Modal>

      <Sheet open={dupOpen} onOpenChange={setDupOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Confirmar importación</SheetTitle>
            <SheetDescription>
              Se importarán {uniqueNames.length + selectedDupes.length} janijim.
              {duplicateNames.length > 0 &&
                " Seleccioná los repetidos que quieras insertar."}
            </SheetDescription>
          </SheetHeader>
          {uniqueNames.length > 0 && (
            <div className="p-4 space-y-1 max-h-40 overflow-auto border-b">
              {uniqueNames.map((n) => (
                <div key={n}>{n}</div>
              ))}
            </div>
          )}
          {duplicateNames.length > 0 && (
            <div className="p-4 space-y-2 max-h-64 overflow-auto">
              {duplicateNames.map((n) => (
                <label key={n} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedDupes.includes(n)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedDupes([...selectedDupes, n]);
                      } else {
                        setSelectedDupes(selectedDupes.filter((d) => d !== n));
                      }
                    }}
                  />
                  {n}
                </label>
              ))}
            </div>
          )}
          <SheetFooter>
            <Button
              onClick={confirmImport}
              icon={<PlusCircle className="w-4 h-4" />}
            >
              Insertar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={sesionOpen} onOpenChange={setSesionOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Nueva toma de asistencia</SheetTitle>
            <SheetDescription>
              Agregá tags y quién la lleva a cabo.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const info = allTags.find((x) => x.name === t);
                  const color = tagColors[info?.color ?? 1];
                  return (
                    <span
                      key={t}
                      className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 ${color.bg} ${color.text}`}
                    >
                      {t}
                      <button onClick={() => setTags(tags.filter((x) => x !== t))}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-2">
                {allTags
                  .filter((t) => !tags.includes(t.name))
                  .map((t) => {
                    const color = tagColors[t.color];
                    return (
                      <span
                        key={t.name}
                        className={`px-2 py-1 rounded-full text-sm flex items-center gap-1 cursor-pointer ${color.bg} ${color.text}`}
                      >
                        <button onClick={() => setTags([...tags, t.name])}>{t.name}</button>
                        <button onClick={() => removeTagFromProject(t.name)}>
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
              </div>
              <div className="flex gap-2 w-full">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Agregá un tag"
                  className="flex-1 border rounded-lg p-2"
                />
                <Button variant="outline" onClick={addTag}>
                  Agregar
                </Button>
              </div>
            </div>
            <select
              className="w-full border rounded-lg p-2"
              value={sesionMadrij}
              onChange={(e) => setSesionMadrij(e.target.value)}
            >
              <option value="" disabled>
                Seleccionar madrij
              </option>
              {madrijes.map((m) => (
                <option key={m.clerk_id} value={m.clerk_id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </div>
          <SheetFooter>
            <Button
              variant="success"
              icon={<Check className="w-4 h-4" />}
              onClick={iniciarSesion}
            >
              Iniciar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      {showTopButton && (
        <div className="fixed bottom-20 right-4 md:bottom-24 md:right-8 z-10">
          <Button
            className="rounded-full shadow-lg px-6 py-3"
            variant="secondary"
            icon={<ArrowUp className="w-4 h-4" />}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            Ir arriba
          </Button>
        </div>
      )}
    </div>
  );
}
