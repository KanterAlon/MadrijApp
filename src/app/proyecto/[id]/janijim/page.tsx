"use client";

import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { toast } from "react-hot-toast";
import useHighlightScroll from "@/hooks/useHighlightScroll";
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
  FileUp,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
  ArrowLeft,
  ArrowUp,
  Eye,
  PhoneCall,
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
import { parseSpreadsheetFile } from "@/lib/utils";
import { crearSesion } from "@/lib/supabase/asistencias";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";
import { showError, confirmDialog, chooseParentDialog } from "@/lib/alerts";


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

export default function JanijimPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [dupOpen, setDupOpen] = useState(false);
  const [mappingOpen, setMappingOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const attributes = [
    { key: "nombre", label: "Nombre y apellido" },
    { key: "dni", label: "DNI" },
    { key: "numero_socio", label: "Número socio" },
    { key: "grupo", label: "Grupo" },
    { key: "tel_madre", label: "Tel. madre" },
    { key: "tel_padre", label: "Tel. padre" },
  ];
  const [fieldMap, setFieldMap] = useState<Record<string, number | null>>(() =>
    Object.fromEntries(attributes.map((a) => [a.key, null]))
  );
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] =
    useState<"chooser" | "file" | "manual">("chooser");
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [showTopButton, setShowTopButton] = useState(false);
  const { highlightId, scrollTo } = useHighlightScroll({ prefix: "janij-" });
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
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
  const [sesionNombre, setSesionNombre] = useState("");
  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [sesionMadrij, setSesionMadrij] = useState<string>("");
  const pendingScrollId = useRef<string | null>(null);


  const seleccionar = useCallback(
    (id: string) => {
      setShowResults(false);
      setSearch("");
      scrollTo(id);
    },
    [scrollTo]
  );

  useEffect(() => {
    if (importOpen) setImportMode("chooser");
  }, [importOpen]);

  useEffect(() => {
    const handle = () => setShowTopButton(window.scrollY > 200);
    window.addEventListener("scroll", handle);
    handle();
    return () => window.removeEventListener("scroll", handle);
  }, []);

  useEffect(() => {
    setLoading(true);
    getJanijim(proyectoId)
      .then((data) =>
        setJanijim(
          data.map((j) => ({ ...j, estado: "ausente" as const }))
        )
      )
      .catch((err) => console.error("Error cargando janijim", err))
      .finally(() => setLoading(false));
  }, [proyectoId]);

  useEffect(() => {
    if (!proyectoId) return;
    getMadrijimPorProyecto(proyectoId)
      .then((m) => {
        setMadrijes(m);
        if (m.length > 0 && !sesionMadrij) {
          const def = m.find((md) => md.clerk_id === user?.id) || m[0];
          setSesionMadrij(def.clerk_id);
        }
      })
      .catch((err) => console.error("Error cargando madrijim", err));
  }, [proyectoId, sesionMadrij, user]);

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
    try {
      await updateJanij(id, { nombre });
      setJanijim((prev) =>
        prev.map((j) => (j.id === id ? { ...j, nombre } : j)),
      );
      toast.success("Janij actualizado correctamente");
    } catch {
      showError("Error renombrando janij");
    }
  };

  const startEditing = (id: string, nombre: string) => {
    setEditingId(id);
    setEditName(nombre);
  };

  const confirmEdit = async () => {
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
    if (!detailJanij) return;
    const data = {
      dni: editDni.trim() || null,
      numero_socio: editSocio.trim() || null,
      grupo: editGrupo.trim() || null,
      tel_madre: editTelMadre.trim() || null,
      tel_padre: editTelPadre.trim() || null,
    };
    try {
      await updateJanij(detailJanij.id, data);
      setJanijim((prev) =>
        prev.map((j) => (j.id === detailJanij.id ? { ...j, ...data } : j)),
      );
      setDetailJanij({ ...detailJanij, ...data });
      toast.success("Janij actualizado correctamente");
    } catch {
      showError("Error actualizando janij");
    }
  };

  const callResponsible = async () => {
    const madre = editTelMadre.trim();
    const padre = editTelPadre.trim();

    if (!madre && !padre) {
      toast.error("No hay teléfono cargado");
      return;
    }

    let phone = madre || padre;

    if (madre && padre) {
      const option = await chooseParentDialog("¿A quién querés llamar?");
      if (option === "madre") phone = madre;
      else if (option === "padre") phone = padre;
      else return; // cancel
    } else {
      if (!(await confirmDialog("¿Llamar al adulto responsable?"))) return;
    }

    const sanitized = phone.replace(/[^+\d]/g, "");
    const url = `tel:${sanitized}`;
    // Using window.open with _self ensures the tel: URL triggers the phone dialer
    window.open(url, "_self");
  };

  const deleteJanij = async (id: string) => {
    if (!(await confirmDialog("¿Eliminar janij?"))) return;
    try {
      await removeJanij(id);
      setJanijim((prev) => prev.filter((j) => j.id !== id));
      toast.success("Janij eliminado");
    } catch {
      showError("Error eliminando janij");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const rows = await parseSpreadsheetFile(file);
      setRows(rows);
      setColumns(rows[0] || []);
      setImportOpen(false);
      setMappingOpen(true);
    } catch {
      showError("Error leyendo el archivo");
    }

    e.target.value = "";
  };

  const previewMapped = () => {
    setMappingOpen(false);
    setPreviewOpen(true);
  };

  const confirmMappedImport = async () => {
    const getVal = (row: string[], key: string) => {
      const idx = fieldMap[key];
      return idx !== null && idx! >= 0 ? row[idx!] : undefined;
    };
    const data = rows.slice(1).map((r) => ({
      nombre: getVal(r, "nombre")?.trim() || "",
      dni: getVal(r, "dni")?.trim() || null,
      numero_socio: getVal(r, "numero_socio")?.trim() || null,
      grupo: getVal(r, "grupo")?.trim() || null,
      tel_madre: getVal(r, "tel_madre")?.trim() || null,
      tel_padre: getVal(r, "tel_padre")?.trim() || null,
    }));
    try {
      const inserted = await addJanijim(proyectoId, data);
      setJanijim((prev) => [
        ...prev,
        ...inserted.map((j) => ({ ...j, estado: "ausente" as const })),
      ]);
      toast.success("Janijim importados correctamente");
    } catch {
      showError("Error importando janijim");
    }
    setPreviewOpen(false);
  };

  const importFromText = () => {
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
    try {
      const ahora = new Date();
      const rounded = new Date(Math.ceil(ahora.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000));
      const inicioIso = rounded.toISOString();
      const fecha = inicioIso.split("T")[0];
      const sesion = await crearSesion(
        proyectoId,
        sesionNombre || "Asistencia",
        fecha,
        sesionMadrij || user.id,
        inicioIso
      );
      toast.success("Asistencia iniciada");
      router.push(
        `/proyecto/${proyectoId}/janijim/asistencia?sesion=${sesion.id}`
      );
    } catch {
      showError("Error iniciando asistencia");
    }
  };

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
      .filter((j): j is Janij => !!j && !exact.some((e) => e.id === j.id))
      .filter((j, idx, arr) => arr.findIndex((a) => a.id === j.id) === idx)
      .map((j) => ({ ...j, ai: true }));

    return [...exact, ...aiMatches];
  }, [search, janijim, aiResults]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto mt-12 space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <ActiveSesionCard proyectoId={proyectoId} />

      <input
        ref={fileInput}
        type="file"
        accept=".csv,.xlsx,.xls"
        onChange={handleFile}
        className="hidden"
      />

      {janijim.length === 0 ? (
        <div className="text-center space-y-4 py-12 border rounded-lg">
          <p className="text-gray-600">Insertá janijim para comenzar</p>
          <Button
            className="mx-auto"
            icon={<FileUp className="w-4 h-4" />}
            onClick={() => setImportOpen(true)}
          >
            Insertar janijim
          </Button>
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
    {resultados.filter((r) => !r.ai).map((r) => (
      <li
        key={r.id}
        tabIndex={0}
        onMouseDown={() => seleccionar(r.id)}
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

    {/* 2. Loader de IA */}
    {aiLoading && (
      <li className="p-2 text-sm text-gray-500">Buscando con IA...</li>
    )}

    {/* 3. Ningún resultado de IA */}
    {!aiLoading && aiResults.length === 0 && (
      <li className="p-2 text-sm text-gray-500">
        No se encontraron resultados con la IA.
      </li>
    )}

    {/* 4. Resultados de IA */}
    {!aiLoading && resultados.filter((r) => r.ai).length > 0 && (
      <>
        <li className="px-2 text-xs text-gray-400">Sugerencias con IA</li>
        {resultados
          .filter((r) => r.ai)
          .map((r) => (
            <li
              key={r.id}
              tabIndex={0}
              onMouseDown={() => seleccionar(r.id)}
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
              <span className="bg-fuchsia-100 text-fuchsia-700 text-xs px-1 rounded">
                IA
              </span>
            </li>
          ))}
      </>
    )}

    {/* 5. Opción para agregar un nuevo nombre */}
    {search.trim() !== "" &&
      !janijim.some(
        (j) => j.nombre.toLowerCase() === search.trim().toLowerCase()
      ) &&
      !resultados.some(
        (r) => r.nombre.toLowerCase() === search.trim().toLowerCase()
      ) && (
        <li
          tabIndex={0}
          onMouseDown={() => agregar(search.trim())}
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
              <Button
                className="w-full sm:w-auto shrink-0 sm:ml-2"
                icon={<FileUp className="w-4 h-4" />}
                onClick={() => setImportOpen(true)}
              >
                Insertar
              </Button>
            </div>
            <Button
              variant="success"
              className="w-full sm:w-auto shrink-0 sm:ml-2"
              icon={<Check className="w-4 h-4" />}
              onClick={() => setSesionOpen(true)}
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
              {editingId === janij.id ? (
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
              )}
            </div>
          </li>
        ))}
      </ul>
      </>)}

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="bottom" className="w-full">
          {importMode === "chooser" && (
            <>
              <SheetHeader>
                <SheetTitle>Insertar janijim</SheetTitle>
                <SheetDescription>
                  ¿Cómo querés Insertar la lista de janijim?
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <Button
                  onClick={() => setImportMode("file")}
                  className="w-full"
                  icon={<FileUp className="w-4 h-4" />}
                >
                  Desde archivo
                </Button>
                <Button
                  onClick={() => setImportMode("manual")}
                  className="w-full"
                  icon={<Pencil className="w-4 h-4" />}
                >
                  Escribir manualmente
                </Button>
              </div>
            </>
          )}

          {importMode === "file" && (
            <>
              <SheetHeader>
                <SheetTitle>Insertar desde archivo</SheetTitle>
                <SheetDescription>
                  Seleccioná un archivo CSV/Excel con los nombres.
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <Button
                  onClick={() => fileInput.current?.click()}
                  className="w-full"
                  icon={<FileUp className="w-4 h-4" />}
                >
                  Seleccionar archivo
                </Button>
              </div>
              <SheetFooter>
                <button
                  onClick={() => setImportMode("chooser")}
                  className="px-4 py-2 bg-gray-200 rounded-lg inline-flex items-center gap-1"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Volver</span>
                </button>
              </SheetFooter>
            </>
          )}

          {importMode === "manual" && (
            <>
              <SheetHeader>
                <SheetTitle>Insertar manualmente</SheetTitle>
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
                <Button icon={<FileUp className="w-4 h-4" />} onClick={importFromText}>
                  Insertar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setImportMode("chooser")}
                  icon={<ArrowLeft className="w-4 h-4" />}
                >
                  Volver
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Modal open={!!detailJanij} onOpenChange={() => setDetailJanij(null)}>
        <ModalContent>
          <ModalHeader>
            <ModalTitle>{detailJanij?.nombre}</ModalTitle>
            <ModalDescription>Información del janij</ModalDescription>
          </ModalHeader>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col">
              <span className="font-medium">DNI</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editDni}
                onChange={(e) => setEditDni(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Número socio</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editSocio}
                onChange={(e) => setEditSocio(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Grupo</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editGrupo}
                onChange={(e) => setEditGrupo(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Tel. madre</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editTelMadre}
                onChange={(e) => setEditTelMadre(e.target.value)}
              />
            </label>
            <label className="flex flex-col">
              <span className="font-medium">Tel. padre</span>
              <input
                className="w-full border rounded-lg p-2"
                value={editTelPadre}
                onChange={(e) => setEditTelPadre(e.target.value)}
              />
            </label>
          </div>
          <ModalFooter>
            <Button
              variant="success"
              icon={<Check className="w-4 h-4" />}
              onClick={saveDetail}
            >
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setDetailJanij(null)}>
              Cerrar
            </Button>
            <Button
              variant="danger"
              icon={<PhoneCall className="w-4 h-4" />}
              onClick={callResponsible}
            >
              Llamar
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Sheet open={mappingOpen} onOpenChange={setMappingOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Mapear columnas</SheetTitle>
            <SheetDescription>
              Asigná cada atributo a la columna correspondiente.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {attributes.map((a) => (
              <div key={a.key} className="space-y-1">
                <label className="block text-sm font-medium">{a.label}</label>
                <select
                  className="w-full border rounded-lg p-2"
                  value={fieldMap[a.key] ?? ""}
                  onChange={(e) =>
                    setFieldMap({
                      ...fieldMap,
                      [a.key]: e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                >
                  <option value="">Sin asignar</option>
                  {columns.map((c, i) => (
                    <option key={i} value={i}>
                      {c || `Columna ${i + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button icon={<FileUp className="w-4 h-4" />} onClick={previewMapped}>
              Continuar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={previewOpen} onOpenChange={setPreviewOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Confirmar importación</SheetTitle>
            <SheetDescription>Revisá los datos antes de importar.</SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-1">
            {attributes.map((a) => (
              <div key={a.key} className="text-sm">
                <span className="font-medium mr-2">{a.label}:</span>
                {rows[1]?.[fieldMap[a.key] ?? -1] || "-"}
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button icon={<FileUp className="w-4 h-4" />} onClick={confirmMappedImport}>
              Importar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

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
              icon={<FileUp className="w-4 h-4" />}
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
              Ingresá el nombre y quién la lleva a cabo.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <input
              type="text"
              value={sesionNombre}
              onChange={(e) => setSesionNombre(e.target.value)}
              placeholder="Ej.: Reunión de planificación"
              className="w-full border rounded-lg p-2"
            />
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
