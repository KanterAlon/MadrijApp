"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
  Trash2,
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
import {
  getMateriales,
  addMaterial,
  updateMaterial,
  deleteMaterial,
  getItems,
  addItem,
  updateItem,
  deleteItem,
  MaterialRow,
  ItemRow,
} from "@/lib/supabase/materiales";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";

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

  const rowToMaterial = useCallback(
    (row: MaterialRow): Material => ({
      id: row.id,
      nombre: row.nombre,
      descripcion: row.descripcion || "",
      asignado: row.asignado || "",
      compra: row.compra || false,
      sede: row.sede || false,
      sanMiguel: row.san_miguel || false,
      armarEnSanMiguel: row.armar_en_san_miguel || false,
      compraItems: row.compra_items || [],
      sedeItems: row.sede_items || [],
      sanMiguelItems: row.san_miguel_items || [],
      estado: (row.estado as Estado) || "por hacer",
    }),
    []
  );

  const rowToItem = useCallback(
    (row: ItemRow): ItemLlevar => ({
      id: row.id,
      nombre: row.nombre,
      enSanMiguel: row.en_san_miguel ?? true,
      desdeSede: row.desde_sede ?? false,
      encargado: row.encargado || "",
    }),
    []
  );

  const { id: proyectoId } = useParams<{ id: string }>();
  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [nuevoNombre, setNuevoNombre] = useState("");

  const [items, setItems] = useState<ItemLlevar[]>([]);
  const [nuevoItem, setNuevoItem] = useState("");

  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [nuevoCompraItem, setNuevoCompraItem] = useState("");
  const [nuevoSedeItem, setNuevoSedeItem] = useState("");
  const [nuevoSanMiguelItem, setNuevoSanMiguelItem] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);

  useEffect(() => {
    if (!proyectoId) return;
    Promise.all([getMateriales(proyectoId), getItems(proyectoId), getMadrijimPorProyecto(proyectoId)])
      .then(([mats, its, mads]) => {
        const convM = mats.map(rowToMaterial);
        const convI = its.map(rowToItem);
        setMateriales(convM);
        setItems(convI);
        setMadrijes(mads);
      })
      .catch(() => {
        setMateriales([]);
        setItems([]);
        setMadrijes([]);
      });
  }, [proyectoId, rowToMaterial, rowToItem]);

  const crearMaterial = () => {
    if (!nuevoNombre.trim()) return;
    addMaterial(proyectoId, nuevoNombre.trim())
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoNombre("");
      })
      .catch(() => alert("Error creando material"));
  };

  const crearItem = () => {
    if (!nuevoItem.trim()) return;
    addItem(proyectoId, nuevoItem.trim())
      .then((row) => {
        setItems((prev) => [...prev, rowToItem(row)]);
        setNuevoItem("");
      })
      .catch(() => alert("Error creando item"));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>, estado: Estado) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text");
    setMateriales((prev) =>
      prev.map((m) => (m.id === id ? { ...m, estado } : m))
    );
    setMaterialActual((prev) =>
      prev && prev.id === id ? { ...prev, estado } : prev
    );
    updateMaterial(id, { estado } as Partial<MaterialRow>).catch(() =>
      console.error("Error cambiando estado")
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
    setMaterialActual((prev) =>
      prev && prev.id === id ? { ...prev, [campo]: valor } : prev
    );
    const map: Record<keyof Material, keyof MaterialRow> = {
      id: "id",
      nombre: "nombre",
      descripcion: "descripcion",
      asignado: "asignado",
      compra: "compra",
      sede: "sede",
      sanMiguel: "san_miguel",
      armarEnSanMiguel: "armar_en_san_miguel",
      compraItems: "compra_items",
      sedeItems: "sede_items",
      sanMiguelItems: "san_miguel_items",
      estado: "estado",
    };
    updateMaterial(id, { [map[campo]]: valor } as Partial<MaterialRow>).catch(() =>
      console.error("Error actualizando material")
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
    const map: Record<keyof ItemLlevar, keyof ItemRow> = {
      id: "id",
      nombre: "nombre",
      enSanMiguel: "en_san_miguel",
      desdeSede: "desde_sede",
      encargado: "encargado",
    };
    updateItem(id, { [map[campo]]: valor } as Partial<ItemRow>).catch(() =>
      console.error("Error actualizando item")
    );
  };

  const eliminarMaterial = (id: string) => {
    if (!confirm("¿Eliminar material?")) return;
    deleteMaterial(id)
      .then(() => {
        setMateriales((prev) => prev.filter((m) => m.id !== id));
        setSheetOpen(false);
        setMaterialActual(null);
      })
      .catch(() => alert("Error eliminando material"));
  };

  const eliminarItem = (id: string) => {
    if (!confirm("¿Eliminar item?")) return;
    deleteItem(id)
      .then(() => setItems((prev) => prev.filter((i) => i.id !== id)))
      .catch(() => alert("Error eliminando item"));
  };

  const agregarItemLista = (
    mat: Material,
    campo: "compraItems" | "sedeItems" | "sanMiguelItems",
    nuevo: string
  ) => {
    if (!nuevo.trim()) return;
    const lista = [...mat[campo], nuevo.trim()];
    actualizarMaterial(mat.id, campo, lista);
    if (campo === "compraItems") actualizarMaterial(mat.id, "compra", lista.length > 0);
    if (campo === "sedeItems") actualizarMaterial(mat.id, "sede", lista.length > 0);
    if (campo === "sanMiguelItems") {
      actualizarMaterial(mat.id, "sanMiguel", lista.length > 0);
      actualizarMaterial(mat.id, "armarEnSanMiguel", lista.length > 0);
    }
  };

  const quitarItemLista = (
    mat: Material,
    campo: "compraItems" | "sedeItems" | "sanMiguelItems",
    idx: number
  ) => {
    const lista = mat[campo].filter((_, i) => i !== idx);
    actualizarMaterial(mat.id, campo, lista);
    if (campo === "compraItems") actualizarMaterial(mat.id, "compra", lista.length > 0);
    if (campo === "sedeItems") actualizarMaterial(mat.id, "sede", lista.length > 0);
    if (campo === "sanMiguelItems") {
      const flag = lista.length > 0;
      actualizarMaterial(mat.id, "sanMiguel", flag);
      actualizarMaterial(mat.id, "armarEnSanMiguel", flag);
    }
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
                      <div className="flex gap-1 mt-1">
                        {m.compraItems.length > 0 && (
                          <ShoppingCart className="w-4 h-4 text-gray-500" />
                        )}
                        {m.sedeItems.length > 0 && (
                          <Building2 className="w-4 h-4 text-gray-500" />
                        )}
                        {m.sanMiguelItems.length > 0 && (
                          <Tent className="w-4 h-4 text-gray-500" />
                        )}
                      </div>
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
              className="bg-white rounded p-3 shadow relative"
            >
              <button
                onClick={() => eliminarItem(item.id)}
                aria-label="Eliminar"
                className="absolute top-2 right-2 text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </button>
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
          {materiales.filter((m) => m.compraItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin compras</p>
          )}
          {materiales
            .filter((m) => m.compraItems.length > 0)
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
                  {item}{" "}
                  <span className="text-xs text-gray-600">
                    ({m.nombre} - {m.asignado || "sin madrij"})
                  </span>
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
          {materiales.filter((m) => m.sedeItems.length > 0).length === 0 && (
            <p className="text-sm text-gray-500">Sin retiros</p>
          )}
          {materiales
            .filter((m) => m.sedeItems.length > 0)
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
                  {item}{" "}
                  <span className="text-xs text-gray-600">
                    ({m.nombre} - {m.asignado || "sin madrij"})
                  </span>
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
                <details className="border rounded p-2">
                  <summary className="cursor-pointer flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4" /> Compras necesarias
                  </summary>
                  <div className="mt-2 space-y-1">
                    {materialActual.compraItems.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{c}</span>
                        <button
                          onClick={() => quitarItemLista(materialActual, "compraItems", idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={nuevoCompraItem}
                        onChange={(e) => setNuevoCompraItem(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nueva compra"
                      />
                      <Button
                        onClick={() => {
                          agregarItemLista(materialActual, "compraItems", nuevoCompraItem);
                          setNuevoCompraItem("");
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </details>

                <details className="border rounded p-2">
                  <summary className="cursor-pointer flex items-center gap-2">
                    <Building2 className="w-4 h-4" /> Retirar de la sede
                  </summary>
                  <div className="mt-2 space-y-1">
                    {materialActual.sedeItems.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{s}</span>
                        <button
                          onClick={() => quitarItemLista(materialActual, "sedeItems", idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={nuevoSedeItem}
                        onChange={(e) => setNuevoSedeItem(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nuevo item"
                      />
                      <Button
                        onClick={() => {
                          agregarItemLista(materialActual, "sedeItems", nuevoSedeItem);
                          setNuevoSedeItem("");
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </details>

                <details className="border rounded p-2">
                  <summary className="cursor-pointer flex items-center gap-2">
                    <Tent className="w-4 h-4" /> Material en San Miguel
                  </summary>
                  <div className="mt-2 space-y-1">
                    {materialActual.sanMiguelItems.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="flex-1 text-sm">{s}</span>
                        <button
                          onClick={() => quitarItemLista(materialActual, "sanMiguelItems", idx)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2">
                      <input
                        value={nuevoSanMiguelItem}
                        onChange={(e) => setNuevoSanMiguelItem(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nuevo item"
                      />
                      <Button
                        onClick={() => {
                          agregarItemLista(materialActual, "sanMiguelItems", nuevoSanMiguelItem);
                          setNuevoSanMiguelItem("");
                        }}
                      >
                        Agregar
                      </Button>
                    </div>
                  </div>
                </details>

                {materialActual.sanMiguelItems.length > 0 && (
                  <p className="text-sm text-blue-800">
                    Este material se terminará en San Miguel
                  </p>
                )}

                <label className="flex items-center gap-2">
                  <span>Asignado a:</span>
                  <select
                    value={materialActual.asignado}
                    onChange={(e) =>
                      actualizarMaterial(
                        materialActual.id,
                        "asignado",
                        e.target.value
                      )
                    }
                    className="border rounded p-1 flex-1"
                  >
                    <option value="">Sin asignar</option>
                    {madrijes.map((m) => (
                      <option key={m.clerk_id} value={m.nombre}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <SheetFooter>
                <div className="flex w-full gap-2">
                  <Button
                    variant="danger"
                    onClick={() => eliminarMaterial(materialActual.id)}
                    className="flex-1"
                  >
                    Eliminar
                  </Button>
                  <SheetClose asChild>
                    <Button variant="secondary" className="flex-1">
                      Cerrar
                    </Button>
                  </SheetClose>
                </div>
              </SheetFooter>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
