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

export default function AsistenciaPage() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [columnIndex, setColumnIndex] = useState<number>(0);
  const [open, setOpen] = useState(false);
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [search, setSearch] = useState("");

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

  const resultados = useMemo(() => {
    if (!search) return janijim.map((j) => ({ ...j, ai: false }));
    const q = search.toLowerCase();
    const perfect = janijim.filter((j) =>
      j.nombre.toLowerCase().includes(q)
    );
    const remaining = janijim.filter((j) => !perfect.includes(j));
    const sx = soundex(q);
    const aiMatches = remaining.filter(
      (j) => soundex(j.nombre.toLowerCase()) === sx
    );
    const letters = remaining.filter((j) => !aiMatches.includes(j));
    return [
      ...perfect.map((j) => ({ ...j, ai: false })),
      ...aiMatches.map((j) => ({ ...j, ai: true })),
      ...letters.map((j) => ({ ...j, ai: false })),
    ];
  }, [search, janijim]);

  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar janij..."
          className="w-full border rounded-lg p-2"
        />
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
        {resultados.map((janij) => (
          <li
            key={janij.id}
            className="flex items-center justify-between bg-white shadow p-4 rounded-lg"
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
            {janij.ai && (
              <span className="bg-pink-100 text-pink-700 text-xs px-2 py-0.5 rounded-md">
                IA
              </span>
            )}
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

