"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { FileUp, EllipsisVertical } from "lucide-react";
import Loader from "@/components/ui/loader";
import {
  getJanijim,
  addJanijim,
  updateJanij,
  removeJanij,
} from "@/lib/supabase/janijim";
import { crearSesion } from "@/lib/supabase/asistencias";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim";

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
  const [janijim, setJanijim] = useState<Janij[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [aiResults, setAiResults] = useState<string[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [uniqueNames, setUniqueNames] = useState<string[]>([]);
  const [duplicateNames, setDuplicateNames] = useState<string[]>([]);
  const [selectedDupes, setSelectedDupes] = useState<string[]>([]);
  const [importText, setImportText] = useState("");
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [sesionOpen, setSesionOpen] = useState(false);
  const [sesionNombre, setSesionNombre] = useState("");
  const [sesionFecha, setSesionFecha] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [sesionMadrij, setSesionMadrij] = useState<string>("");

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
@@ -195,50 +215,67 @@ export default function AsistenciaPage() {
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
      const sesion = await crearSesion(
        proyectoId,
        sesionNombre || "Asistencia",
        sesionFecha.split("T")[0],
        sesionMadrij || user.id
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

@@ -250,50 +287,56 @@ export default function AsistenciaPage() {

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

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader className="h-6 w-6" />
      </div>
    );
  }


  return (
    <div className="max-w-2xl mx-auto mt-12 space-y-4">
      <button
        onClick={() => setSesionOpen(true)}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Iniciar asistencia del día
      </button>
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
@@ -353,60 +396,51 @@ export default function AsistenciaPage() {

        <button
          onClick={() => setImportOpen(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-1"
        >
          <FileUp size={16} /> Importar
        </button>
        <input
          ref={fileInput}
          type="file"
          accept=".csv,.xlsx,.xls"
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
            <span>{janij.nombre}</span>
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
@@ -504,28 +538,77 @@ export default function AsistenciaPage() {
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
              Ingresá el nombre, fecha y madrij encargado.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <input
              type="text"
              value={sesionNombre}
              onChange={(e) => setSesionNombre(e.target.value)}
              placeholder="Nombre de la sesión"
              className="w-full border rounded-lg p-2"
            />
            <input
              type="datetime-local"
              value={sesionFecha}
              onChange={(e) => setSesionFecha(e.target.value)}
              placeholder="Fecha y hora de inicio"
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
            <button
              onClick={iniciarSesion}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              Iniciar
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
