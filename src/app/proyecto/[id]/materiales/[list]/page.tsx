"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import useMediaQuery from "@/hooks/useMediaQuery";
import {
  FolderKanban,
  ShoppingCart,
  Building2,
  Tent,
  Warehouse,
  Laptop,
  Users,
  Handshake,
  House,
  Box,
  Trash2,
  Plus,
  Minus,
  X,
  FileUp,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import Button from "@/components/ui/button";
import BackLink from "@/components/ui/back-link";
import DiagonalToggle from "@/components/ui/diagonal-toggle";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
  SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "react-hot-toast";
import {
  getMateriales,
  addMaterialEnLista,
  updateMaterial,
  deleteMaterial,
  deleteMaterialList,
  MaterialRow,
} from "@/lib/supabase/materiales";
import { getMadrijimPorProyecto } from "@/lib/supabase/madrijim-client";
import { showError, confirmDialog } from "@/lib/alerts";
import Loader from "@/components/ui/loader";
import { parseSpreadsheetFile } from "@/lib/utils";

export default function MaterialesPage() {
  type Estado = "por hacer" | "en proceso" | "realizado";

  interface Item {
    nombre: string;
    cantidad: number;
    done?: boolean;
  }

  interface Material {
    id: string;
    nombre: string;
    descripcion: string;
    asignado: string;
    compra: boolean;
    sede: boolean;
    sanMiguel: boolean;
    armarEnSanMiguel: boolean;
    compraItems: Item[];
    compraOnlineItems: Item[];
    sedeItems: Item[];
    depositoItems: Item[];
    sanMiguelItems: Item[];
    kvutzaItems: Item[];
    alquilerItems: Item[];
    propiosItems: Item[];
    otrosItems: Item[];
    estado: Estado;
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
      compraOnlineItems: row.compra_online_items || [],
      sedeItems: row.sede_items || [],
      depositoItems: row.deposito_items || [],
      sanMiguelItems: row.san_miguel_items || [],
      kvutzaItems: row.kvutza_items || [],
      alquilerItems: row.alquiler_items || [],
      propiosItems: row.propios_items || [],
      otrosItems: row.otros_items || [],
      estado: (row.estado as Estado) || "por hacer",
    }),
    []
  );


  const { id: proyectoId, list } = useParams<{ id: string; list: string }>();
  const router = useRouter();
  const estados: Estado[] = ["por hacer", "en proceso", "realizado"];

  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPorEstado, setNuevoPorEstado] = useState<Record<Estado, string>>({
    "por hacer": "",
    "en proceso": "",
    realizado: "",
  });

  const [madrijes, setMadrijes] = useState<{ clerk_id: string; nombre: string }[]>([]);
  const [nuevoItemGeneral, setNuevoItemGeneral] = useState("");
  const [cantidadNuevoItem, setCantidadNuevoItem] = useState(1);
  const [tipoNuevoItem, setTipoNuevoItem] =
    useState<
      | "compra"
      | "compraOnline"
      | "sede"
      | "deposito"
      | "sanMiguel"
      | "kvutza"
      | "alquiler"
      | "propios"
      | "otros"
    >("compra");
  const [mostrarAgregar, setMostrarAgregar] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [materialActual, setMaterialActual] = useState<Material | null>(null);
  const [filtroAsignado, setFiltroAsignado] = useState("");

  const isDesktop = useMediaQuery("(min-width: 640px)");

  const fileInput = useRef<HTMLInputElement>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [columnOpen, setColumnOpen] = useState(false);
  const [rows, setRows] = useState<string[][]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [titleIndex, setTitleIndex] = useState(0);
  const [descIndex, setDescIndex] = useState(1);

  const namePreview = useMemo(
    () => rows.slice(1, 6).map((r) => r[titleIndex]).filter(Boolean),
    [rows, titleIndex]
  );
  const descPreview = useMemo(
    () =>
      descIndex >= 0
        ? rows.slice(1, 6).map((r) => r[descIndex]).filter(Boolean)
        : [],
    [rows, descIndex]
  );


  const sedeNombres = useMemo(() => {
    const nombres = new Set<string>();
    materiales.forEach((m) =>
      m.sedeItems.forEach((i) => nombres.add(i.nombre))
    );
    return Array.from(nombres);
  }, [materiales]);
  useEffect(() => {
    if (!proyectoId || !list) return;
    setLoading(true);
    Promise.all([getMateriales(proyectoId, list), getMadrijimPorProyecto(proyectoId)])
      .then(([mats, mads]) => {
        const convM = mats.map(rowToMaterial);
        setMateriales(convM);
        setMadrijes(mads);
      })
      .catch(() => {
        setMateriales([]);
        setMadrijes([]);
      })
      .finally(() => setLoading(false));
  }, [proyectoId, list, rowToMaterial]);

  interface AggregatedItem {
    nombre: string;
    total: number;
    done: boolean;
    detalles: {
      materialId: string;
      materialNombre: string;
      cantidad: number;
      index: number;
    }[];
  }

  const aggregatedSede = useMemo<AggregatedItem[]>(() => {
    const map = new Map<string, AggregatedItem>();
    materiales.forEach((m) => {
      m.sedeItems.forEach((it, idx) => {
        const key = it.nombre.toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            nombre: it.nombre,
            total: 0,
            done: true,
            detalles: [],
          });
        }
        const entry = map.get(key)!;
        entry.total += it.cantidad;
        entry.done = entry.done && !!it.done;
        entry.detalles.push({
          materialId: m.id,
          materialNombre: m.nombre,
          cantidad: it.cantidad,
          index: idx,
        });
      });
    });
    return Array.from(map.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre)
    );
  }, [materiales]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader className="h-6 w-6" />
      </div>
    );
  }

  const crearMaterial = () => {
    if (!nuevoNombre.trim() || !list) return;
    addMaterialEnLista(list, nuevoNombre.trim(), proyectoId)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoNombre("");
        toast.success("Material creado");
      })
      .catch(() => showError("Error creando material"));
  };

  const crearMaterialEnEstado = (estado: Estado) => {
    const nombre = nuevoPorEstado[estado].trim();
    if (!nombre || !list) return;
    addMaterialEnLista(list, nombre, proyectoId, estado)
      .then((row) => {
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
        setNuevoPorEstado((prev) => ({ ...prev, [estado]: "" }));
        toast.success("Material creado");
      })
      .catch(() => showError("Error creando material"));
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseSpreadsheetFile(file);
      setRows(data);
      setColumns(data[0] || []);
      setTitleIndex(0);
      setDescIndex(data[0]?.length > 1 ? 1 : -1);
      setImportOpen(false);
      setColumnOpen(true);
    } catch {
      showError("Error leyendo el archivo");
    }
    e.target.value = "";
  };

  const importMaterials = async () => {
    if (!list) return;
    const items = rows.slice(1).map((r) => ({
      nombre: r[titleIndex]?.trim(),
      descripcion: descIndex >= 0 ? r[descIndex]?.trim() || "" : "",
    }));
    for (const it of items) {
      if (!it.nombre) continue;
      try {
        const row = await addMaterialEnLista(list, it.nombre, proyectoId);
        if (it.descripcion) {
          await updateMaterial(row.id, { descripcion: it.descripcion });
          row.descripcion = it.descripcion;
        }
        setMateriales((prev) => [...prev, rowToMaterial(row)]);
      } catch {
        showError("Error importando materiales");
        break;
      }
    }
    toast.success("Materiales importados");
    setColumnOpen(false);
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
      compraOnlineItems: "compra_online_items",
      sedeItems: "sede_items",
      depositoItems: "deposito_items",
      sanMiguelItems: "san_miguel_items",
      kvutzaItems: "kvutza_items",
      alquilerItems: "alquiler_items",
      propiosItems: "propios_items",
      otrosItems: "otros_items",
      estado: "estado",
    };
    updateMaterial(id, { [map[campo]]: valor } as Partial<MaterialRow>).catch(() =>
      console.error("Error actualizando material")
    );
  };


  const eliminarMaterial = async (id: string) => {
    if (!(await confirmDialog("¿Eliminar material?"))) return;
    deleteMaterial(id)
      .then(() => {
        setMateriales((prev) => prev.filter((m) => m.id !== id));
        setSheetOpen(false);
        setMaterialActual(null);
        toast.success("Material eliminado");
      })
      .catch(() => showError("Error eliminando material"));
  };

  const eliminarLista = async () => {
    if (!list) return;
    if (!(await confirmDialog("¿Eliminar lista?"))) return;
    deleteMaterialList(list)
      .then(() => {
        toast.success("Lista eliminada");
        router.push("../");
      })
      .catch(() => showError("Error eliminando lista"));
  };


  const agregarItemLista = (
    mat: Material,
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
    nuevo: Item
  ) => {
    if (!nuevo.nombre.trim() || nuevo.cantidad <= 0) return;
    if (campo === "sedeItems") {
      const nombre = nuevo.nombre.trim().toLowerCase();
      const idx = mat.sedeItems.findIndex(
        (it) => it.nombre.toLowerCase() === nombre
      );
      if (idx !== -1) {
        cambiarCantidadItemLista(mat, "sedeItems", idx, nuevo.cantidad);
        toast.success("Cantidad agregada al item existente");
        return;
      }
    }
    const lista = [...mat[campo], nuevo];
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
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
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

  const eliminarItemSedeAggregado = (a: AggregatedItem) => {
    a.detalles.forEach((d) => {
      const mat = materiales.find((m) => m.id === d.materialId);
      if (mat) quitarItemLista(mat, "sedeItems", d.index);
    });
  };

  const cambiarCantidadItemLista = (
    mat: Material,
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
    idx: number,
    delta: number
  ) => {
    const lista = [...mat[campo]];
    const item = { ...lista[idx] };
    item.cantidad = Math.max(1, item.cantidad + delta);
    lista[idx] = item;
    actualizarMaterial(mat.id, campo, lista);
  };

  const toggleItemDone = (
    mat: Material,
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
    idx: number
  ) => {
    const lista = [...mat[campo]];
    const item = { ...lista[idx], done: !lista[idx].done };
    lista[idx] = item;
    actualizarMaterial(mat.id, campo, lista);
  };

  const setItemDone = (
    mat: Material,
    campo:
      | "compraItems"
      | "compraOnlineItems"
      | "sedeItems"
      | "depositoItems"
      | "sanMiguelItems"
      | "kvutzaItems"
      | "alquilerItems"
      | "propiosItems"
      | "otrosItems",
    idx: number,
    value: boolean
  ) => {
    const lista = [...mat[campo]];
    const item = { ...lista[idx], done: value };
    lista[idx] = item;
    actualizarMaterial(mat.id, campo, lista);
  };

  const compras = materiales.filter((m) => m.compraItems.length > 0);
  const comprasOnline = materiales.filter((m) => m.compraOnlineItems.length > 0);
  // items to retirar en la sede are aggregated across materiales
  const deposito = materiales.filter((m) => m.depositoItems.length > 0);
  const sanMiguelPend = materiales.filter((m) => m.sanMiguelItems.length > 0);
  const kvutza = materiales.filter((m) => m.kvutzaItems.length > 0);
  const alquiler = materiales.filter((m) => m.alquilerItems.length > 0);
  const propios = materiales.filter((m) => m.propiosItems.length > 0);
  const otros = materiales.filter((m) => m.otrosItems.length > 0);


  return (
    <div className="space-y-8">
      <BackLink
        href={`/proyecto/${proyectoId}/materiales`}
        className="inline-flex"
      />
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold flex items-center gap-2 text-blue-900">
          <FolderKanban className="w-7 h-7" /> Organización de Materiales
        </h1>
        <Button
          variant="danger"
          onClick={eliminarLista}
          icon={<Trash2 className="w-4 h-4" />}
        >
          Eliminar lista
        </Button>
      </div>

      {/* Cosas para hacer */}
      <section className="space-y-4">
        <div className="flex gap-2">
          <input
            value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nuevo material"
            className="border rounded p-2 flex-1"
          />
          <Button onClick={crearMaterial} icon={<Plus className="w-4 h-4" />}>
            Agregar
          </Button>
          <Button
            onClick={() => setImportOpen(true)}
            icon={<FileUp className="w-4 h-4" />}
          >
            Importar
          </Button>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            ref={fileInput}
            className="hidden"
          />
        </div>
        <div className="bg-white rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b gap-2">
            <h2 className="text-2xl font-semibold text-blue-800">Organización de materiales</h2>
            <div className="flex items-center gap-2">
              <label htmlFor="filtroAsignado" className="text-sm text-gray-700">
                Ver de:
              </label>
              <select
                id="filtroAsignado"
                value={filtroAsignado}
                onChange={(e) => setFiltroAsignado(e.target.value)}
                className="border rounded p-2"
              >
                <option value="">Todos</option>
                {madrijes.map((m) => (
                  <option key={m.clerk_id} value={m.nombre}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4 p-4">
            {estados.map((estado) => {
              const mats = materiales.filter(
                (m) =>
                  m.estado === estado &&
                  (!filtroAsignado || m.asignado === filtroAsignado)
              );
              return (
                <div
                  key={estado}
                  onDrop={(e) => onDrop(e, estado)}
                  onDragOver={onDragOver}
                  className="bg-gray-100 rounded-lg p-4 min-h-[200px]"
                >
                  <h3 className="text-lg font-semibold capitalize mb-2 text-blue-700">
                    {mats.length} {estado}
                  </h3>
                  <div className="space-y-2">
                    {mats.map((m) => (
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
                      <div className="text-xs text-gray-600">{m.asignado || "Sin asignar"}</div>
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
                    {mats.length === 0 && (
                      <p className="text-sm text-gray-500">Sin materiales</p>
                    )}
                <div className="pt-2 flex items-center gap-2">
                  <input
                    value={nuevoPorEstado[estado]}
                    onChange={(e) =>
                      setNuevoPorEstado((prev) => ({
                        ...prev,
                        [estado]: e.target.value,
                      }))
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && crearMaterialEnEstado(estado)
                    }
                    placeholder="Agregar material"
                    className="flex-1 bg-transparent border-b border-gray-300 focus:outline-none"
                  />
                  <button
                    onClick={() => crearMaterialEnEstado(estado)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
          </div>
        </div>
      </section>

      {/* Cosas a comprar */}
      {compras.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Cosas a comprar</h2>
          <div className="space-y-1">
            {compras.map((m) => {
              const items = m.compraItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-c-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "compraItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Comprado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-c-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "compraItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "compraItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}


      {/* Compras online */}
      {comprasOnline.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Comprar online</h2>
          <div className="space-y-1">
            {comprasOnline.map((m) => {
              const items = m.compraOnlineItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-co-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "compraOnlineItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Comprado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-co-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "compraOnlineItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "compraOnlineItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Cosas para retirar en la sede */}
      {aggregatedSede.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">
            Cosas para retirar en la sede
          </h2>
          <div className="space-y-1">
            {aggregatedSede
              .filter((a) => !a.done)
              .map((a) => (
                <label key={a.nombre} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={a.done}
                    onChange={() => {
                      a.detalles.forEach((d) => {
                        const mat = materiales.find((m) => m.id === d.materialId);
                        if (mat) setItemDone(mat, "sedeItems", d.index, !a.done);
                      });
                    }}
                  />
                  <span className="cursor-pointer hover:underline">
                    {a.total} {a.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      {a.detalles
                        .map((d) => `${d.cantidad} para ${d.materialNombre}`)
                        .join(", ")}
                    </span>
                  </span>
                </label>
              ))}
            {aggregatedSede.filter((a) => a.done).length > 0 && (
              <div className="ml-6 text-xs text-gray-500">Retirado</div>
            )}
            {aggregatedSede
              .filter((a) => a.done)
              .map((a) => (
                <div key={a.nombre} className="flex items-center gap-2 opacity-70">
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={a.done}
                    onChange={() => {
                      a.detalles.forEach((d) => {
                        const mat = materiales.find((m) => m.id === d.materialId);
                        if (mat) setItemDone(mat, "sedeItems", d.index, !a.done);
                      });
                    }}
                  />
                  <span className="cursor-pointer hover:underline line-through flex-1">
                    {a.total} {a.nombre}{" "}
                    <span className="text-xs text-gray-600">
                      {a.detalles
                        .map((d) => `${d.cantidad} para ${d.materialNombre}`)
                        .join(", ")}
                    </span>
                  </span>
                  <button
                    onClick={() => eliminarItemSedeAggregado(a)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
          </div>
        </section>
      )}


      {/* Retirar del depósito */}
      {deposito.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Retirar del depósito</h2>
          <div className="space-y-1">
            {deposito.map((m) => {
              const items = m.depositoItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-d-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "depositoItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-d-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "depositoItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "depositoItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Material en San Miguel */}
      {sanMiguelPend.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Material en San Miguel</h2>
          <div className="space-y-1">
            {sanMiguelPend.map((m) => {
              const items = m.sanMiguelItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-sm-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "sanMiguelItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-sm-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "sanMiguelItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "sanMiguelItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pedir a otra kvutzá */}
      {kvutza.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Pedir a otra kvutzá</h2>
          <div className="space-y-1">
            {kvutza.map((m) => {
              const items = m.kvutzaItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-k-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "kvutzaItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-k-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "kvutzaItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "kvutzaItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Material para alquilar */}
      {alquiler.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Material para alquilar</h2>
          <div className="space-y-1">
            {alquiler.map((m) => {
              const items = m.alquilerItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-a-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "alquilerItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-a-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "alquilerItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "alquilerItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Llevar desde casa */}
      {propios.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Llevar desde casa</h2>
          <div className="space-y-1">
            {propios.map((m) => {
              const items = m.propiosItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-p-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "propiosItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-p-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "propiosItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "propiosItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Otros materiales */}
      {otros.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold text-blue-800">Otros materiales</h2>
          <div className="space-y-1">
            {otros.map((m) => {
              const items = m.otrosItems.map((it, idx) => ({ it, idx }));
              const pendientes = items.filter((i) => !i.it.done);
              const hechos = items.filter((i) => i.it.done);
              return (
                <div key={m.id} className="space-y-1">
                  {pendientes.map(({ it, idx }) => (
                    <label key={`${m.id}-o-${idx}`} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "otrosItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                    </label>
                  ))}
                  {hechos.length > 0 && (
                    <div className="ml-6 text-xs text-gray-500">Retirado</div>
                  )}
                  {hechos.map(({ it, idx }) => (
                    <label
                      key={`${m.id}-o-${idx}`}
                      className="flex items-center gap-2 opacity-70"
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={!!it.done}
                        onChange={() => toggleItemDone(m, "otrosItems", idx)}
                      />
                      <span
                        onClick={() => {
                          setMaterialActual(m);
                          setSheetOpen(true);
                        }}
                        className="cursor-pointer hover:underline line-through"
                      >
                        {it.cantidad} {it.nombre}{" "}
                        <span className="text-xs text-gray-600">
                          ({m.nombre} - {m.asignado || "sin madrij"})
                        </span>
                      </span>
                      <button
                        onClick={() => quitarItemLista(m, "otrosItems", idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </label>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}


      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent
          side="bottom"
          className="w-full"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>Importar materiales</SheetTitle>
            <SheetDescription>
              Seleccioná un archivo CSV/Excel con los materiales.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4">
            <Button
              className="w-full"
              icon={<FileUp className="w-4 h-4" />}
              onClick={() => fileInput.current?.click()}
            >
              Seleccionar archivo
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={columnOpen} onOpenChange={setColumnOpen}>
        <SheetContent
          side="bottom"
          className="w-full"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <SheetHeader>
            <SheetTitle>Elegí las columnas</SheetTitle>
            <SheetDescription>
              Indicá qué columnas contienen el nombre y la descripción.
            </SheetDescription>
          </SheetHeader>
          <div className="p-4 space-y-4">
            <div>
              <label className="text-sm block mb-1">Nombre</label>
              <select
                className="w-full border rounded-lg p-2"
                value={titleIndex}
                onChange={(e) => setTitleIndex(Number(e.target.value))}
              >
                {columns.map((c, i) => (
                  <option key={i} value={i}>
                    {c || `Columna ${i + 1}`}
                  </option>
                ))}
              </select>
              {namePreview.length > 0 && (
                <ul className="list-disc ml-4 space-y-1 text-sm mt-1">
                  {namePreview.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              )}
            </div>
            <div>
              <label className="text-sm block mb-1">Descripción</label>
              <select
                className="w-full border rounded-lg p-2"
                value={descIndex}
                onChange={(e) => setDescIndex(Number(e.target.value))}
              >
                <option value={-1}>Ninguna</option>
                {columns.map((c, i) => (
                  <option key={i} value={i}>
                    {c || `Columna ${i + 1}`}
                  </option>
                ))}
              </select>
              {descIndex >= 0 && descPreview.length > 0 && (
                <ul className="list-disc ml-4 space-y-1 text-sm mt-1">
                  {descPreview.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button icon={<FileUp className="w-4 h-4" />} onClick={importMaterials}>
              Insertar
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        modal={false}
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open) setMaterialActual(null);
          setSheetOpen(open);
        }}
      >
        <SheetContent
          side={isDesktop ? "right" : "bottom"}
          className="w-full sm:w-96 h-dvh"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          {materialActual && (
            <div className="flex flex-col h-full">
              <SheetHeader>
                <SheetTitle>Editar material</SheetTitle>
              </SheetHeader>
              <div className="flex-1 overflow-y-auto space-y-3 p-4 pb-32 sm:pb-4">
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
                <div>
                  <DropdownMenu.Root open={menuOpen} onOpenChange={setMenuOpen}>
                    <DropdownMenu.Trigger asChild>
                      <Button
                        variant="secondary"
                        className="mb-2 justify-start"
                        icon={<Plus className="w-4 h-4" />}
                      >
                        Faltan materiales
                      </Button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content
                      align="start"
                      sideOffset={4}
                      className="z-20 w-52 rounded-md border border-gray-200 bg-white p-1 shadow-lg focus:outline-none"
                    >
                      <DropdownMenu.Label className="px-2 py-1 text-sm font-medium text-gray-600">
                        ¿Qué necesitás?
                      </DropdownMenu.Label>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("compra");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4" /> Comprar en comercio
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("compraOnline");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Laptop className="w-4 h-4" /> Comprar online
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sede");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Building2 className="w-4 h-4" /> Retirar en sede
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("deposito");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Warehouse className="w-4 h-4" /> Retirar del depósito
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("sanMiguel");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Tent className="w-4 h-4" /> Buscar en San Miguel
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("kvutza");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Users className="w-4 h-4" /> Pedir a otra kvutzá
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("alquiler");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Handshake className="w-4 h-4" /> Alquilar
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("propios");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <House className="w-4 h-4" /> Llevar de casa
                      </DropdownMenu.Item>
                      <DropdownMenu.Item
                        className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-gray-700 outline-none hover:bg-gray-100 focus:bg-gray-100"
                        onSelect={() => {
                          setTipoNuevoItem("otros");
                          setMostrarAgregar(true);
                          setMenuOpen(false);
                        }}
                      >
                        <Box className="w-4 h-4" /> Otro
                      </DropdownMenu.Item>
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                  {mostrarAgregar && (
                    <div className="flex flex-col gap-2 mt-2 sm:flex-row">
                      <input
                        type="number"
                        min={1}
                        value={cantidadNuevoItem}
                        onChange={(e) => setCantidadNuevoItem(Number(e.target.value))}
                        className="border rounded p-1 w-16 text-sm"
                        placeholder="Cant."
                      />
                      <input
                        value={nuevoItemGeneral}
                        onChange={(e) => setNuevoItemGeneral(e.target.value)}
                        className="border rounded p-1 flex-1 text-sm"
                        placeholder="Nuevo item"
                        list={tipoNuevoItem === "sede" ? "sede-suggestions" : undefined}
                      />
                      {tipoNuevoItem === "sede" && (
                        <datalist id="sede-suggestions">
                          {sedeNombres.map((n) => (
                            <option key={n} value={n} />
                          ))}
                        </datalist>
                      )}
                      <Button
                        className="w-full sm:flex-1"
                        icon={<Plus className="w-4 h-4" />}
                        onClick={() => {
                          const campo =
                            tipoNuevoItem === "compra"
                              ? "compraItems"
                              : tipoNuevoItem === "compraOnline"
                              ? "compraOnlineItems"
                              : tipoNuevoItem === "sede"
                              ? "sedeItems"
                              : tipoNuevoItem === "deposito"
                              ? "depositoItems"
                              : tipoNuevoItem === "sanMiguel"
                              ? "sanMiguelItems"
                              : tipoNuevoItem === "kvutza"
                              ? "kvutzaItems"
                              : tipoNuevoItem === "alquiler"
                              ? "alquilerItems"
                              : tipoNuevoItem === "propios"
                              ? "propiosItems"
                              : "otrosItems";
                          agregarItemLista(materialActual, campo, {
                            nombre: nuevoItemGeneral,
                            cantidad: cantidadNuevoItem,
                          });
                          setNuevoItemGeneral("");
                          setCantidadNuevoItem(1);
                          setMostrarAgregar(false);
                        }}
                      >
                        Agregar
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => setMostrarAgregar(false)}
                        className="w-full sm:flex-1"
                        icon={<X className="w-4 h-4" />}
                      >
                        Cancelar
                      </Button>
                    </div>
                  )}
                </div>
                {materialActual.compraItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4" /> Compras necesarias
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.compraItems.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {c.cantidad} {c.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "compraItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "compraItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "compraItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.sedeItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Retirar de la sede
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.sedeItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "sedeItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "sedeItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "sedeItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.sanMiguelItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Tent className="w-4 h-4" /> Material en San Miguel
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.sanMiguelItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "sanMiguelItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "sanMiguelItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "sanMiguelItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.compraOnlineItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Laptop className="w-4 h-4" /> Compras online
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.compraOnlineItems.map((c, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {c.cantidad} {c.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "compraOnlineItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "compraOnlineItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "compraOnlineItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.depositoItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Warehouse className="w-4 h-4" /> Retiro del depósito
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.depositoItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "depositoItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "depositoItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "depositoItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.kvutzaItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Users className="w-4 h-4" /> Pedir a otra kvutzá
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.kvutzaItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "kvutzaItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "kvutzaItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "kvutzaItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.alquilerItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Handshake className="w-4 h-4" /> Material para alquilar
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.alquilerItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "alquilerItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "alquilerItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "alquilerItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.propiosItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <House className="w-4 h-4" /> Llevar desde casa
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.propiosItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "propiosItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "propiosItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "propiosItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {materialActual.otrosItems.length > 0 && (
                  <details className="border rounded p-2">
                    <summary className="cursor-pointer flex items-center gap-2">
                      <Box className="w-4 h-4" /> Otros materiales
                    </summary>
                    <div className="mt-2 space-y-1">
                      {materialActual.otrosItems.map((s, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm">
                            {s.cantidad} {s.nombre}
                          </span>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "otrosItems", idx, 1)}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Plus size={14} />
                          </button>
                          <button
                            onClick={() => cambiarCantidadItemLista(materialActual, "otrosItems", idx, -1)}
                            className="text-yellow-600 hover:text-yellow-800"
                          >
                            <Minus size={14} />
                          </button>
                          <button
                            onClick={() => quitarItemLista(materialActual, "otrosItems", idx)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                <div className="flex items-center gap-2 text-sm">
                  <span>Se termina en</span>
                  <DiagonalToggle
                    value={materialActual.armarEnSanMiguel ? "sanMiguel" : "capital"}
                    onChange={(v) =>
                      actualizarMaterial(
                        materialActual.id,
                        "armarEnSanMiguel",
                        v === "sanMiguel"
                      )
                    }
                    disableCapital={materialActual.sanMiguelItems.length > 0}
                  />
                </div>

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
                <div className="flex flex-col sm:flex-row w-full gap-2">
                  <Button
                    variant="danger"
                    onClick={() => eliminarMaterial(materialActual.id)}
                    className="flex-1"
                    icon={<Trash2 className="w-4 h-4" />}
                  >
                    Eliminar
                  </Button>
                  <SheetClose asChild>
                    <Button
                      variant="secondary"
                      className="flex-1"
                      icon={<X className="w-4 h-4" />}
                    >
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
