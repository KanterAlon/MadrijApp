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
  FileUp,
  Pencil,
  Trash2,
  Check,
  X,
  Search,
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


type Janij = {
  id: string;
  nombre: string;
  estado: "presente" | "ausente";
};

export default function JanijimPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const { user } = useUser();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnIndex, setColumnIndex] = useState<number>(0);
  const [columnOpen, setColumnOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importMode, setImportMode] =
    useState<"chooser" | "file" | "manual">("chooser");
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const { highlightId, scrollTo } = useHighlightScroll({ prefix: "janij-" });
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uniqueNames, setUniqueNames] = useState<string[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [selectedDupes, setSelectedDupes] = useState<string[]>([]);
  const [importText, setImportText] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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

  const agregar = async (nombre: string) => {
    try {
      const inserted = await addJanijim(proyectoId, [nombre]);
      const nuevo = {
        id: inserted[0].id,
        nombre: inserted[0].nombre,
        estado: "ausente" as const,
      };
      setJanijim((prev) => [...prev, nuevo]);
      pendingScrollId.current = inserted[0].id;
    } catch {
      alert("Error agregando janij");
    }
  };

  const renameJanij = async (id: string, nombre: string) => {
    try {
      await updateJanij(id, nombre);
      setJanijim((prev) =>
        prev.map((j) => (j.id === id ? { ...j, nombre } : j))
      );
    } catch {
      alert("Error renombrando janij");
    }
  };

  const startEditing = (id: string, nombre: string) => {
    setEditingId(id);
    setEditName(nombre);
  };

  const confirmEdit = async () => {
    if (!editingId) return;
    const name = editName.trim();
    if (name === "") {
      setEditingId(null);
      return;
    }
    await renameJanij(editingId, name);
    setEditingId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
  };

  const deleteJanij = async (id: string) => {
    if (!confirm("¿Eliminar janij?")) return;
    try {
      await removeJanij(id);
      setJanijim((prev) => prev.filter((j) => j.id !== id));
    } catch {
      alert("Error eliminando janij");
    }
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const finalize = (rows: string[][]) => {
      setRows(rows);
      setColumns(rows[0] || []);
      setImportOpen(false);
      setColumnOpen(true);
      e.target.value = "";
    };

    const reader = new FileReader();

    if (file.name.endsWith(".csv")) {
      reader.onload = (event) => {
        const text = (event.target?.result as string) || "";
        const lines = text
          .split(/\r?\n/)
          .map((line) => line.split(","));
        finalize(lines);
      };
      reader.readAsText(file);
    } else {
      const xlsx = await import("xlsx");
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const wb = xlsx.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = xlsx.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        finalize(json);
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const importColumn = () => {
    const names = rows
      .slice(1)
      .map((r) => r[columnIndex])
      .filter(Boolean)
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
    setColumnOpen(false);
    setDupOpen(true);
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
      const inserted = await addJanijim(proyectoId, namesToAdd);
      setJanijim((prev) => [
        ...prev,
        ...inserted.map((j) => ({ ...j, estado: "ausente" as const })),
      ]);
    } catch {
      alert("Error importando janijim");
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
      router.push(
        `/proyecto/${proyectoId}/janijim/asistencia?sesion=${sesion.id}`
      );
    } catch {
      alert("Error iniciando asistencia");
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
      body: JSON.stringify({ query: search, names: janijim.map((j) => j.nombre) }),
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
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
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
                className="flex-1 border rounded-lg p-2 pl-8 focus:ring-2 focus:ring-blue-600 focus:outline-none"
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


              <Button
                className="ml-2 shrink-0"
                icon={<FileUp className="w-4 h-4" />}
                onClick={() => setImportOpen(true)}
              >
                Importar
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFile}
                className="hidden"
              />
            </div>
            <Button
              className="shrink-0"
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
                className="p-1 border rounded flex-1 mr-2"
                autoFocus
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
      <Button
        className="mx-auto mt-4 block"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      >
        Volver arriba
      </Button>
      </>)}

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent side="bottom" className="w-full">
          {importMode === "chooser" && (
            <>
              <SheetHeader>
                <SheetTitle>Insertar janijim</SheetTitle>
                <SheetDescription>
                  ¿Cómo querés importar la lista de janijim?
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <button
                  onClick={() => setImportMode("file")}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Desde archivo
                </button>
                <button
                  onClick={() => setImportMode("manual")}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Escribir manualmente
                </button>
              </div>
            </>
          )}

          {importMode === "file" && (
            <>
              <SheetHeader>
                <SheetTitle>Importar desde archivo</SheetTitle>
                <SheetDescription>
                  Seleccioná un archivo CSV/Excel con los nombres.
                </SheetDescription>
              </SheetHeader>
              <div className="p-4 space-y-4">
                <button
                  onClick={() => fileInput.current?.click()}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Seleccionar archivo
                </button>
              </div>
              <SheetFooter>
                <button
                  onClick={() => setImportMode("chooser")}
                  className="px-4 py-2 bg-gray-200 rounded-lg"
                >
                  Volver
                </button>
              </SheetFooter>
            </>
          )}

          {importMode === "manual" && (
            <>
              <SheetHeader>
                <SheetTitle>Importar manualmente</SheetTitle>
                <SheetDescription>
                  Escribí un nombre por línea y luego tocá Importar.
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
                  Importar
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setImportMode("chooser")}
                >
                  Volver
                </Button>
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={columnOpen} onOpenChange={setColumnOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Elegí la columna con los nombres</SheetTitle>
            <SheetDescription>
              Seleccioná qué columna contiene la lista de janijim.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <select
              className="w-full border rounded-lg p-2"
              value={columnIndex}
              onChange={(e) => setColumnIndex(Number(e.target.value))}
            >
              {columns.map((c, i) => (
                <option key={i} value={i}>
                  {c || `Columna ${i + 1}`}
                </option>
              ))}
            </select>
          </div>
          <SheetFooter>
            <Button icon={<FileUp className="w-4 h-4" />} onClick={importColumn}>
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
              Se agregarán {uniqueNames.length} janijim nuevos.
              {duplicateNames.length > 0 &&
                " Seleccioná los repetidos que quieras importar."}
            </SheetDescription>
          </SheetHeader>
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
            <button
              onClick={confirmImport}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Importar
            </button>
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
            <Button icon={<Check className="w-4 h-4" />} onClick={iniciarSesion}>
              Iniciar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
