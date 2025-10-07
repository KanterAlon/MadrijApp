"use client";

import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import BackLink from "@/components/ui/back-link";
import { supabase } from "@/lib/supabase";
import { upsertGrupo } from "@/lib/supabase/grupos";
import Button from "@/components/ui/button";
import { PlusCircle, X } from "lucide-react";

type GrupoOption = {
  id: string;
  nombre: string;
};

export default function NuevoProyectoPage() {
  const { user } = useUser();
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");
  const [janijSheet, setJanijSheet] = useState("");
  const [madrijSheet, setMadrijSheet] = useState("");
  const [grupoNombre, setGrupoNombre] = useState("");
  const [grupoModo, setGrupoModo] = useState<"new" | "existing">("new");
  const [grupoSeleccionado, setGrupoSeleccionado] = useState("");
  const [gruposDisponibles, setGruposDisponibles] = useState<GrupoOption[]>([]);
  const [creating, setCreating] = useState(false);

  const puedeElegirExistente = gruposDisponibles.length > 0;

  useEffect(() => {
    if (!user?.id) return;
    let ignore = false;
    const load = async () => {
      const { data, error } = await supabase
        .from("madrijim_grupos")
        .select("grupo_id, grupos(nombre)")
        .eq("madrij_id", user.id)
        .eq("activo", true);

      if (error || !data || ignore) {
        return;
      }

      const map = new Map<string, string>();
      for (const row of data as {
        grupo_id: string;
        grupos?: { nombre?: string | null } | null;
      }[]) {
        if (!row.grupo_id) continue;
        const nombre = row.grupos?.nombre?.trim() || "Grupo sin nombre";
        map.set(row.grupo_id, nombre);
      }

      if (!ignore) {
        setGruposDisponibles(Array.from(map, ([id, nombre]) => ({ id, nombre })));
      }
    };

    load().catch(() => {});

    return () => {
      ignore = true;
    };
  }, [user?.id]);

  useEffect(() => {
    if (grupoModo === "existing" && !puedeElegirExistente) {
      setGrupoModo("new");
    }
  }, [grupoModo, puedeElegirExistente]);

  useEffect(() => {
    if (grupoModo !== "existing") return;
    if (!grupoSeleccionado) return;
    if (!gruposDisponibles.some((g) => g.id === grupoSeleccionado)) {
      setGrupoSeleccionado("");
    }
  }, [grupoModo, grupoSeleccionado, gruposDisponibles]);

  useEffect(() => {
    if (grupoModo === "new") {
      setGrupoNombre((prev) => (prev.trim().length === 0 ? nombre : prev));
    }
  }, [grupoModo, nombre]);

  const handleCrear = async () => {
    if (!user || creating) return;
    setCreating(true);
    // Use the imported supabase client directly

    const nombreProyecto = nombre.trim();
    if (!nombreProyecto) {
      toast.error("Ingresá un nombre válido");
      setCreating(false);
      return;
    }

    let grupoId = grupoSeleccionado;
    let nuevoGrupoCreado = false;

    if (grupoModo === "existing") {
      if (!grupoId) {
        toast.error("Seleccioná un grupo válido");
        setCreating(false);
        return;
      }
    } else {
      const nombreGrupo = (grupoNombre || nombreProyecto).trim();
      if (!nombreGrupo) {
        toast.error("Ingresá un nombre de grupo válido");
        setCreating(false);
        return;
      }

      const { data: grupo, error: groupError } = await supabase
        .from("grupos")
        .insert({ nombre: nombreGrupo })
        .select()
        .single();

      if (groupError || !grupo) {
        toast.error("Error creando grupo");
        setCreating(false);
        return;
      }

      grupoId = grupo.id;
      nuevoGrupoCreado = true;
    }

    const { data: proyecto, error: e1 } = await supabase
      .from("proyectos")
      .insert({ nombre: nombreProyecto, creador_id: user.id, grupo_id: grupoId })
      .select()
      .single();

    if (e1 || !proyecto) {
      toast.error("Error creando proyecto");
      setCreating(false);
      return;
    }

    const { error: e2 } = await supabase
      .from("madrijim_grupos")
      .insert({
        grupo_id: grupoId,
        madrij_id: user.id,
        rol: nuevoGrupoCreado ? "creador" : "miembro",
        invitado: false,
        activo: true,
      });

    if (e2 && e2.code !== "23505") {
      toast.error("Error asignando grupo");
      setCreating(false);
      return;
    }

    try {
      await upsertGrupo(grupoId, proyecto.id, {
        spreadsheet_id: spreadsheetId.trim() || null,
        janij_sheet: janijSheet.trim() || null,
        madrij_sheet: madrijSheet.trim() || null,
      });
    } catch (err) {
      console.error("Error configurando grupo", err);
      toast.error("Proyecto creado, pero hubo un error guardando la hoja");
      setCreating(false);
      router.push(`/proyecto/${proyecto.id}`);
      return;
    }

    toast.success("Proyecto creado correctamente");

    router.push(`/proyecto/${proyecto.id}`);
    setCreating(false);
  };

  return (
    <div className="max-w-md mx-auto mt-24 bg-white p-6 rounded-2xl shadow">
      <BackLink href="/dashboard" className="mb-4 inline-flex" />
      <h1 className="text-2xl font-bold mb-4 text-center text-blue-700">
        Nuevo Proyecto
      </h1>
      <input
        type="text"
        placeholder="Ej.: Campamento de verano"
        className="p-2 border rounded w-full mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
      />
      <div className="mb-6 space-y-3">
        <p className="text-sm font-medium text-gray-700">Grupo</p>
        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="radio"
              name="grupo-mode"
              value="new"
              checked={grupoModo === "new"}
              onChange={() => setGrupoModo("new")}
            />
            Crear un grupo nuevo
          </label>
          <label
            className={`flex items-center gap-2 text-sm ${
              puedeElegirExistente ? "text-gray-700" : "text-gray-400"
            }`}
          >
            <input
              type="radio"
              name="grupo-mode"
              value="existing"
              disabled={!puedeElegirExistente}
              checked={grupoModo === "existing"}
              onChange={() => puedeElegirExistente && setGrupoModo("existing")}
            />
            Usar un grupo existente
          </label>
        </div>
        {grupoModo === "new" ? (
          <input
            type="text"
            placeholder="Nombre del grupo"
            className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={grupoNombre}
            onChange={(e) => setGrupoNombre(e.target.value)}
          />
        ) : (
          <select
            className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={grupoSeleccionado}
            onChange={(e) => setGrupoSeleccionado(e.target.value)}
          >
            <option value="">Seleccioná un grupo</option>
            {gruposDisponibles.map((grupo) => (
              <option key={grupo.id} value={grupo.id}>
                {grupo.nombre}
              </option>
            ))}
          </select>
        )}
        {grupoModo === "existing" && !puedeElegirExistente && (
          <p className="text-xs text-gray-500">
            No tenés grupos disponibles todavía. Creá uno nuevo para comenzar.
          </p>
        )}
      </div>
      <div className="space-y-3 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            ID de la hoja de cálculo (Google Sheets)
          </label>
          <input
            type="text"
            placeholder="1AbC..."
            className="mt-1 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={spreadsheetId}
            onChange={(e) => setSpreadsheetId(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pestaña de janijim
            </label>
            <input
              type="text"
              placeholder="Janijim"
              className="mt-1 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={janijSheet}
              onChange={(e) => setJanijSheet(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Pestaña de madrijim (opcional)
            </label>
            <input
              type="text"
              placeholder="Madrijim"
              className="mt-1 p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={madrijSheet}
              onChange={(e) => setMadrijSheet(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-gray-500">
          Podés editar estos datos más adelante volviendo a esta pantalla.
        </p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          className="flex-1"
          icon={<X className="w-4 h-4" />}
          onClick={() => router.push("/dashboard")}
        >
          Cancelar
        </Button>
        <Button
          className="flex-1"
          onClick={handleCrear}
          loading={creating}
          icon={<PlusCircle className="w-4 h-4" />}
        >
          Crear
        </Button>
      </div>
    </div>
  );
}
