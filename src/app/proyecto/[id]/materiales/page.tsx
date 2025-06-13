"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

interface Material {
  id: string;
  nombre: string;
  estado: Estado;
}

type Estado = "por-hacer" | "en-proceso" | "realizado";

const estados: { id: Estado; titulo: string }[] = [
  { id: "por-hacer", titulo: "Por hacer" },
  { id: "en-proceso", titulo: "En proceso" },
  { id: "realizado", titulo: "Realizado" },
];

function MaterialCard({ material }: { material: Material }) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useDraggable({ id: material.id });
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="bg-white p-3 rounded shadow mb-2 cursor-grab"
    >
      {material.nombre}
    </div>
  );
}

function Column({ estado, children }: { estado: Estado; children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: estado });
  return (
    <div
      ref={setNodeRef}
      className="flex-1 bg-gray-100 rounded p-2 min-h-[200px]"
    >
      {children}
    </div>
  );
}

export default function MaterialesPage() {
  const [materials, setMaterials] = useState<Material[]>([
    { id: "1", nombre: "Cartulina", estado: "por-hacer" },
    { id: "2", nombre: "Marcadores", estado: "en-proceso" },
    { id: "3", nombre: "Tijeras", estado: "realizado" },
  ]);
  const [newName, setNewName] = useState("");
  const sensors = useSensors(useSensor(PointerSensor));

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    if (over && over.id !== active.id) {
      const nuevoEstado = over.id as Estado;
      setMaterials((prev) =>
        prev.map((m) => (m.id === active.id ? { ...m, estado: nuevoEstado } : m))
      );
    }
  };

  const addMaterial = () => {
    const nombre = newName.trim();
    if (nombre === "") return;
    setMaterials((prev) => [
      ...prev,
      { id: Date.now().toString(), nombre, estado: "por-hacer" },
    ]);
    setNewName("");
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Materiales</h1>
      <div className="flex gap-2">
        <input
          className="border p-2 flex-1 rounded"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Nuevo material"
        />
        <button
          onClick={addMaterial}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Agregar
        </button>
      </div>
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4">
          {estados.map(({ id, titulo }) => (
            <Column key={id} estado={id}>
              <h2 className="font-semibold mb-2 text-center">{titulo}</h2>
              {materials
                .filter((m) => m.estado === id)
                .map((m) => (
                  <MaterialCard key={m.id} material={m} />
                ))}
            </Column>
          ))}
        </div>
      </DndContext>
    </div>
  );
}

