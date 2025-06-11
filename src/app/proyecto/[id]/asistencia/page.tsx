"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useParams } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileUp, EllipsisVertical } from "lucide-react";
import {
  getJanijim,
  addJanijim,
  updateJanij,
  removeJanij,
} from "@/lib/supabase/janijim";

type Janij = {
  id: string;
  nombre: string;
  estado: "presente" | "ausente";
};

export default function AsistenciaPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const fileInput = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnIndex, setColumnIndex] = useState<number>(0);
  const [columnOpen, setColumnOpen] = useState(false);
  const [dupOpen, setDupOpen] = useState(false);
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uniqueNames, setUniqueNames] = useState<string[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [selectedDupes, setSelectedDupes] = useState<string[]>([]);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  useEffect(() => {
    getJanijim(proyectoId)
      .then((data) =>
        setJanijim(
          data.map((j) => ({ ...j, estado: "ausente" as const }))
        )
      )
      .catch((err) => console.error("Error cargando janijim", err));
  }, [proyectoId]);

  const agregar = async (nombre: string) => {
    try {
      const inserted = await addJanijim(proyectoId, [nombre]);
      const nuevo = {
        id: inserted[0].id,
        nombre: inserted[0].nombre,
        estado: "ausente" as const,
      };
      setJanijim((prev) => [...prev, nuevo]);
      seleccionar(inserted[0].id);
    } catch {
      alert("Error agregando janij");
    }
  };

  const seleccionar = (id: string) => {
    setShowResults(false);
    setSearch("");
    setHighlightId(id);
    const el = document.getElementById(`janij-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightId(null), 2000);
  };

  const marcar = (id: string, nuevoEstado: "presente" | "ausente") => {
    setJanijim((prev) =>
      prev.map((j) => (j.id === id ? { ...j, estado: nuevoEstado } : j))
    );
  };

  const renameJanij = async (id: string) => {
    const nuevo = prompt("Nuevo nombre?");
    if (!nuevo) return;
    try {
      await updateJanij(id, nuevo);
      setJanijim((prev) =>
        prev.map((j) => (j.id === id ? { ...j, nombre: nuevo } : j))
      );
    } catch {
      alert("Error renombrando janij");
    }
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((line) => line.split(","));
      setRows(lines);
      setColumns(lines[0]);
      setColumnOpen(true);
    };
    reader.readAsText(file);
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

    const aiMatches = aiResults
      .map((name) => janijim.find((j) => j.nombre === name))
      .filter((j): j is Janij => !!j && !exact.some((e) => e.id === j.id))
      .map((j) => ({ ...j, ai: true }));

    return [...exact, ...aiMatches];
  }, [search, janijim, aiResults]);


  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
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
    {/* 1. Coincidencias normales */}
    {resultados.filter((r) => !r.ai).map((r) => (
      <li
        key={r.id}
        onMouseDown={() => seleccionar(r.id)}
        className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
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

    {/* 5. Opción para agregar un nuevo nombre */}
    {search.trim() !== "" &&
      !janijim.some(
        (j) => j.nombre.toLowerCase() === search.trim().toLowerCase()
      ) &&
      !resultados.some(
        (r) => r.nombre.toLowerCase() === search.trim().toLowerCase()
      ) && (
        <li
          onMouseDown={() => agregar(search.trim())}
          className="p-2 cursor-pointer hover:bg-gray-100"
        >
          Agregar &quot;{search.trim()}&quot;
        </li>
      )}
  </ul>
)}


        <button
          onClick={() => fileInput.current?.click()}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1"
        >
          <FileUp size={16} /> Importar
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv"
          onChange={handleFile}
          className="hidden"
        />
      </div>

      <ul className="space-y-2">
        {janijim.map((janij) => (
          <li
            id={`janij-${janij.id}`}
            key={janij.id}
            className={`flex items-center justify-between bg-white shadow p-4 rounded-lg ${
              highlightId === janij.id ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={janij.estado === "presente"}
                onChange={(e) =>
                  marcar(janij.id, e.target.checked ? "presente" : "ausente")
                }
              />
              <span>{janij.nombre}</span>
            </label>
            <div className="relative">
              <button
                onClick={() =>
                  setMenuOpenId(menuOpenId === janij.id ? null : janij.id)
                }
              >
                <EllipsisVertical size={16} />
              </button>
              {menuOpenId === janij.id && (
                <div className="absolute right-0 mt-2 bg-white border rounded shadow z-10">
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      renameJanij(janij.id);
                    }}
                    className="block px-3 py-1 w-full text-left hover:bg-gray-100"
                  >
                    Renombrar
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpenId(null);
                      deleteJanij(janij.id);
                    }}
                    className="block px-3 py-1 w-full text-left hover:bg-gray-100 text-red-600"
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

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
            <button
              onClick={importColumn}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Importar
            </button>
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
    </div>
  );
}
