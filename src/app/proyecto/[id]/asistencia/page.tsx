"use client";

import { useState, useMemo, useRef } from "react";
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

function soundex(str: string) {
  const s = str
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  if (!s) return "";
  const first = s[0];
  const codes: Record<string, string> = {
    B: "1",
    F: "1",
    P: "1",
    V: "1",
    C: "2",
    G: "2",
    J: "2",
    K: "2",
    Q: "2",
    S: "2",
    X: "2",
    Z: "2",
    D: "3",
    T: "3",
    L: "4",
    M: "5",
    N: "5",
    R: "6",
  };
  let result = first;
  let prev = codes[first] || "";
  for (let i = 1; i < s.length && result.length < 4; i++) {
    const c = codes[s[i]] || "";
    if (c && c !== prev) result += c;
    prev = c || prev;
  }
  while (result.length < 4) result += "0";
  return result;
}

function levenshtein(a: string, b: string) {
  const al = a.length
  const bl = b.length
  const dp = Array.from({ length: al + 1 }, () => new Array(bl + 1).fill(0))
  for (let i = 0; i <= al; i++) dp[i][0] = i
  for (let j = 0; j <= bl; j++) dp[0][j] = j
  for (let i = 1; i <= al; i++) {
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      )
    }
  }
  return dp[al][bl]
}

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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text
      .trim()
      .split(/\r?\n/)
      .map((l) => l.split(/,|\t/));
    setColumns(lines[0]);
    setRows(lines.slice(1));
    setOpen(true);
  };

  const importColumn = () => {
    const names = rows
      .map((r) => r[columnIndex])
      .filter(Boolean);
    setJanijim(
      names.map((nombre, i) => ({
        id: String(i + 1),
        nombre,
        estado: "ausente",
      }))
    );
    setOpen(false);
  };

  const marcar = (id: string, nuevoEstado: "presente" | "ausente") => {
    setJanijim((prev) =>
      prev.map((j) => (j.id === id ? { ...j, estado: nuevoEstado } : j))
    );
  };

  const seleccionar = (id: string) => {
    setShowResults(false);
    setSearch("");
    setHighlightId(id);
    const el = document.getElementById(`janij-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => setHighlightId(null), 2000);
  };

  const resultados = useMemo(() => {
    if (!search.trim()) return [];
    const q = search.toLowerCase().trim();
    const sx = soundex(q);
    const scored = janijim.map((j) => {
      const name = j.nombre.toLowerCase();
      const dist = levenshtein(q, name);
      const sim = 1 - dist / Math.max(q.length, name.length);
      const includes = name.includes(q);
      const ai = soundex(name) === sx && !includes;
      return { ...j, ai, sim, includes };
    });
    const exact = scored
      .filter((s) => s.includes)
      .sort((a, b) => b.sim - a.sim);
    const aiMatches = scored
      .filter((s) => !s.includes && s.ai)
      .sort((a, b) => b.sim - a.sim);
    const textMatches = scored
      .filter((s) => !s.includes && !s.ai && s.sim > 0.3)
      .sort((a, b) => b.sim - a.sim);
    return [...exact, ...aiMatches, ...textMatches].slice(0, 5);
  }, [search, janijim]);

  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <div className="relative flex items-center gap-2">
        <input
          type="text"
          value={search}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 100)}
          onChange={(e) => {
            setSearch(e.target.value)
            setShowResults(true)
          }}
          placeholder="Buscar janij..."
          className="w-full border rounded-lg p-2"
        />
        {showResults && resultados.length > 0 && (
          <ul className="absolute z-10 left-0 top-full mt-1 w-full bg-white border rounded shadow">
            {resultados.map((r) => (
              <li
                key={r.id}
                onMouseDown={() => seleccionar(r.id)}
                className="flex justify-between p-2 cursor-pointer hover:bg-gray-100"
              >
                <span>{r.nombre}</span>
                {r.ai && (
                  <span className="bg-green-100 text-green-700 text-xs px-1 rounded">IA</span>
                )}
              </li>
            ))}
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

