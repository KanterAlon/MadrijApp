"use client";

import { useState } from "react";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
} from "lucide-react";
import Button from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

export default function MaterialesPage() {
  type Estado = "por hacer" | "en proceso" | "realizado";

  interface Material {
    id: string;
    nombre: string;
    descripcion: string;
    asignado: string;
    compra: boolean;
    sede: boolean;
    sanMiguel: boolean;
    armarEnSanMiguel: boolean;
    compraItems: string[];
    sedeItems: string[];
    sanMiguelItems: string[];
    estado: Estado;
  }

  interface ItemLlevar {
    id: string;
    nombre: string;
    enSanMiguel: boolean;
    desdeSede: boolean;
    encargado: string;
  }

  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const [items, setItems] = useState<ItemLlevar[]>([]);
  const [nuevoItem, setNuevoItem] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);

  const crearMaterial = () => {
    if (!nuevoNombre.trim()) return;
    const nuevo: Material = {
      id: Date.now().toString(),
      nombre: nuevoNombre.trim(),
      descripcion: "",
      asignado: "",
      compra: false,
      sede: false,
      sanMiguel: false,
      armarEnSanMiguel: false,
      compraItems: [],
      sedeItems: [],
      sanMiguelItems: [],
      estado: "por hacer",
    };
    setMateriales((prev) => [...prev, nuevo]);
    setNuevoNombre("");
  };

  const crearItem = () => {
    if (!nuevoItem.trim()) return;
    const nuevo: ItemLlevar = {
      id: Date.now().toString(),
      nombre: nuevoItem.trim(),
      enSanMiguel: true,
      desdeSede: false,
      encargado: "",
    };
    setItems((prev) => [...prev, nuevo]);
    setNuevoItem("");
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, estado: Estado) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    setMateriales((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado } : m))
    );
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const actualizarMaterial = (
    id: string,
    campo: keyof Material,
    valor: Material[keyof Material]
  ) => {
    setMateriales((prev) =>
      prev.map((m) => (m.id === id ? { ...m, [campo]: valor } : m))
    );
  };

  const actualizarItem = (
    id: string,
    campo: keyof ItemLlevar,
    valor: ItemLlevar[keyof ItemLlevar]
  ) => {
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, [campo]: valor } : i))
    );
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-900">
        <FolderKanban className="w-7 h-7" /> organización de materiales
      </h1>

      {/* Cosas para hacer */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas para hacer</h2>
        <div className="flex gap-2">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo material"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearMaterial}>Agregar</Button>
        </div>
        <div className="grid md:grid-cols-3 gap-4 mt-4">
          {estados.map((estado) => (
            <div
              key={estado}
              onDrop={(e) => onDrop(e, estado)}
              onDragOver={onDragOver}
              className="bg-gray-100 rounded-lg p-4 min-h-[200px]"
            >
              <h3 className="text-lg font-semibold capitalize mb-2 text-blue-700">
                {estado}
              </h3>
              <div className="space-y-2">
                {materiales
                  .filter((m) => m.estado === estado)
                  .map((m) => (
                    <div
                      key={m.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData("text", m.id)}
                      onClick={() => {
                        setMaterialActual(m);
                        setSheetOpen(true);
                      }}
                      className="bg-white rounded p-3 shadow cursor-pointer"
                    >
                      <div className="font-medium">{m.nombre}</div>
                    </div>
                  ))}
                {materiales.filter((m) => m.estado === estado).length === 0 && (
                  <p className="text-sm text-gray-500">Sin materiales</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>


      {/* Cosas para llevar */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas para llevar</h2>
        <div className="flex gap-2">
          <input
            value={nuevoItem}
            onChange={(e) => setNuevoItem(e.target.value)}
            placeholder="Nuevo item"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearItem}>Agregar</Button>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded p-3 shadow"
            >
              <div className="font-medium mb-2">{item.nombre}</div>
              <label className="flex items-center gap-2 text-sm mb-1">
                <input
                  type="checkbox"
                  checked={item.enSanMiguel}
                  onChange={(e) =>
                    actualizarItem(item.id, "enSanMiguel", e.target.checked)
                  }
                />
                Ya está en San Miguel
              </label>
              {!item.enSanMiguel && (
                <div className="space-y-1 ml-4 text-sm">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={item.desdeSede}
                      onChange={(e) =>
                        actualizarItem(item.id, "desdeSede", e.target.checked)
                      }
                    />
                    Buscar en sede
                  </label>
                  <label className="flex items-center gap-2">
                    <span>Encargado:</span>
                    <input
                      value={item.encargado}
                      onChange={(e) =>
                        actualizarItem(item.id, "encargado", e.target.value)
                      }
                      className="border rounded p-1 flex-1"
                      placeholder="Madrij"
                    />
                  </label>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && (
            <p className="text-sm text-gray-500">Sin items</p>
          )}
        </div>
      </section>

      {/* Cosas a comprar */}
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-blue-800">Cosas a comprar</h2>
        <div className="space-y-1">
          {materiales.filter((m) => m.compra && m.compraItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin compras</p>
          )}
          {materiales
            .filter((m) => m.compra && m.compraItems.length > 0)
            .map((m) =>
              m.compraItems.map((item, idx) => (
                <div
                  key={`${m.id}-c-${idx}`}
                  onClick={() => {
                    setMaterialActual(m);
                    setSheetOpen(true);
                  }}
                  className="cursor-pointer hover:underline"
                >
                  {item} <span className="text-xs text-gray-600">({m.nombre})</span>
                </div>
              ))
            )}
        </div>
      </section>

      {/* Cosas para retirar en la sede */}
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold text-blue-800">
          Cosas para retirar en la sede
        </h2>
        <div className="space-y-1">
          {materiales.filter((m) => m.sede && m.sedeItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin retiros</p>
          )}
          {materiales
            .filter((m) => m.sede && m.sedeItems.length > 0)
            .map((m) =>
              m.sedeItems.map((item, idx) => (
                <div
                  key={`${m.id}-s-${idx}`}
                  onClick={() => {
                    setMaterialActual(m);
                    setSheetOpen(true);
                  }}
                  className="cursor-pointer hover:underline"
                >
                  {item} <span className="text-xs text-gray-600">({m.nombre})</span>
                </div>
              ))
            )}
        </div>
      </section>

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setMaterialActual(null);
          setSheetOpen(open);
        }}
      >
        <SheetContent className="w-80 sm:w-96">
          {materialActual && (
            <div className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Editar material</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 p-4">
                <input
                  value={materialActual.nombre}
                  onChange={(e) =>
                    actualizarMaterial(materialActual.id, "nombre", e.target.value)
                  }
                  className="border rounded p-2 w-full"
                />
                <textarea
                  value={materialActual.descripcion}
                  onChange={(e) =>
                    actualizarMaterial(
                      materialActual.id,
                      "descripcion",
                      e.target.value
                    )
                  }
                  className="border rounded p-2 w-full"
                  placeholder="Descripción"
                />
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={materialActual.compra}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "compra",
                        e.target.checked
                      )
                    }
                  />
                  <ShoppingCart className="w-4 h-4" /> Comprar material
                </label>
                {materialActual.compra && (
                  <input
                    value={materialActual.compraItems.join(", ")}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "compraItems",
                        e.target.value
                          .split(/,\s*/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="border rounded p-1 w-full text-sm"
                    placeholder="Qué comprar"
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={materialActual.sede}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "sede",
                        e.target.checked
                      )
                    }
                  />
                  <Building2 className="w-4 h-4" /> Retirar de la sede
                </label>
                {materialActual.sede && (
                  <input
                    value={materialActual.sedeItems.join(", ")}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "sedeItems",
                        e.target.value
                          .split(/,\s*/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="border rounded p-1 w-full text-sm"
                    placeholder="Qué retirar en sede"
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={materialActual.sanMiguel}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "sanMiguel",
                        e.target.checked
                      )
                    }
                  />
                  <Tent className="w-4 h-4" /> Usar en San Miguel
                </label>
                {materialActual.sanMiguel && (
                  <input
                    value={materialActual.sanMiguelItems.join(", ")}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "sanMiguelItems",
                        e.target.value
                          .split(/,\s*/)
                          .map((s) => s.trim())
                          .filter(Boolean)
                      )
                    }
                    className="border rounded p-1 w-full text-sm"
                    placeholder="Qué usar en San Miguel"
                  />
                )}
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={materialActual.armarEnSanMiguel}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "armarEnSanMiguel",
                        e.target.checked
                      )
                    }
                  />
                  <Tent className="w-4 h-4" /> Armar en San Miguel
                </label>
                <label className="flex items-center gap-2">
                  <span>Asignado a:</span>
                  <input
                    value={materialActual.asignado}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "asignado",
                        e.target.value
                      )
                    }
                    className="border rounded p-1 flex-1"
                    placeholder="Madrij"
                  />
                </label>
              </div>
              <SheetFooter>
                <SheetClose asChild>
                  <Button variant="secondary">Cerrar</Button>
                </SheetClose>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
