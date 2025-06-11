"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileUp } from "lucide-react";

type Janij = {
  id: string;
  nombre: string;
  estado: "presente" | "ausente";
};

export default function AsistenciaPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnIndex, setColumnIndex] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const agregar = (nombre: string) => {
    const id = String(janijim.length + 1);
    const nuevo = { id, nombre, estado: "ausente" as const };
    setJanijim((prev) => [...prev, nuevo]);
    seleccionar(id);
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

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const lines = text.split("\n").map((line) => line.split(","));
      setRows(lines);
      setColumns(lines[0]);
      setOpen(true);
    };
    reader.readAsText(file);
  };

  const importColumn = async () => {
    const names = rows.map((r) => r[columnIndex]).filter(Boolean);
    const enriched = await Promise.all(
      names.map(async (nombre, i) => ({
        id: String(i + 1),
        nombre,
        estado: "ausente" as const,
      }))
    );
    setJanijim(enriched);
    setOpen(false);
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
          </li>
        ))}
      </ul>

      <Sheet open={open} onOpenChange={setOpen}>
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
    </div>
  );
}
