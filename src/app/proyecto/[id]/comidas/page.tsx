"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Categories } from "emoji-picker-react";
import {
  getRestaurants,
  addRestaurant,
  DishOption,
  RestaurantRow,
} from "@/lib/supabase/comidas";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PlusCircle } from "lucide-react";
import { showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
});

type DishForm = {
  nombre: string;
  icono: string;
};

type SideForm = {
  nombre: string;
  variantes: string;
};

type DishSides = {
  enabled: boolean;
  sides: Set<number>;
};

export default function ComidasIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState("");
  const [dishes, setDishes] = useState<DishForm[]>([{ nombre: "", icono: "" }]);
  const [sides, setSides] = useState<SideForm[]>([]);
  const [dishSides, setDishSides] = useState<Record<number, DishSides>>({});
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!proyectoId) return;
    setLoading(true);
    getRestaurants(proyectoId)
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [proyectoId]);

  useEffect(() => {
    setDishSides((prev) => {
      const copy = { ...prev };
      Object.values(copy).forEach((value) => {
        if (value.enabled) {
          sides.forEach((_, i) => {
            if (!value.sides.has(i)) value.sides.add(i);
          });
        }
      });
      return { ...copy };
    });
  }, [sides]);

  const addDish = () =>
    setDishes((prev) => [...prev, { nombre: "", icono: "" }]);

  const updateDish = (i: number, field: keyof DishForm, value: string) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value } as DishForm;
      return copy;
    });
  };

  const addSide = () =>
    setSides((prev) => [...prev, { nombre: "", variantes: "" }]);

  const updateSide = (
    sideIdx: number,
    field: keyof SideForm,
    value: string
  ) => {
    setSides((prev) => {
      const copy = [...prev];
      copy[sideIdx] = { ...copy[sideIdx], [field]: value } as SideForm;
      return copy;
    });
  };

  const toggleHasSides = (dishIdx: number, enabled: boolean) => {
    setDishSides((prev) => {
      const copy = { ...prev };
      copy[dishIdx] = {
        enabled,
        sides: enabled
          ? new Set(sides.map((_, i) => i))
          : new Set(),
      };
      return copy;
    });
  };

  const toggleDishSide = (dishIdx: number, sideIdx: number) => {
    setDishSides((prev) => {
      const copy = { ...prev };
      const info = copy[dishIdx];
      if (!info) return prev;
      if (info.sides.has(sideIdx)) info.sides.delete(sideIdx);
      else info.sides.add(sideIdx);
      return { ...copy, [dishIdx]: { ...info, sides: new Set(info.sides) } };
    });
  };

  const submitRestaurant = async () => {
    if (!proyectoId) return;
    const platos: DishOption[] = dishes.map((d, i) => ({
      nombre: d.nombre,
      icono: d.icono || "🍽️",
      guarniciones:
        dishSides[i]?.enabled
          ? Array.from(dishSides[i].sides).map((idx) => ({
              nombre: sides[idx].nombre,
              variantes: sides[idx].variantes
                ? sides[idx].variantes
                    .split(",")
                    .map((v) => v.trim())
                    .filter(Boolean)
                : [],
            }))
          : [],
    }));
    addRestaurant(proyectoId, nombre, platos)
      .then((r) => {
        setRestaurants((prev) => [...prev, r]);
        setFormOpen(false);
        setStep(1);
        setNombre("");
        setDishes([{ nombre: "", icono: "" }]);
        setSides([]);
        setDishSides({});
        toast.success("Restaurante creado");
      })
      .catch(() => showError("Error creando restaurante"));
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">Comidas</h1>
      <Button
        icon={<PlusCircle className="w-4 h-4" />}
        onClick={() => setOrderOpen(true)}
      >
        Crear nuevo pedido
      </Button>

      <Sheet open={orderOpen} onOpenChange={setOrderOpen}>
        <SheetContent side="bottom" className="w-full">
          <SheetHeader>
            <SheetTitle>Elegí un restaurante</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            {loading && (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            )}
            {!loading && restaurants.length === 0 && (
              <p className="text-gray-600">No hay restaurantes.</p>
            )}
            {!loading && restaurants.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {restaurants.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => router.push(`./comidas/${r.id}`)}
                    className="cursor-pointer rounded-lg border p-6 shadow hover:shadow-md transition bg-white"
                  >
                    <h3 className="text-2xl font-bold text-center">{r.nombre}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Agregar restaurante
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet
        open={formOpen}
        onOpenChange={(o) => {
          setFormOpen(o);
          if (!o) setStep(1);
        }}
      >
        <SheetContent side="bottom" className="w-full max-h-screen overflow-auto">
          <SheetHeader>
            <SheetTitle>Nuevo restaurante</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
            {step === 1 && (
              <>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Nombre del restaurante"
                  className="w-full border rounded p-2"
                />
                {dishes.map((d, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={d.nombre}
                        onChange={(e) => updateDish(i, "nombre", e.target.value)}
                        placeholder="Plato principal"
                        className="flex-1 border rounded p-2"
                      />
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setPickerIndex((p) => (p === i ? null : i))
                          }
                          className="border rounded p-2 min-w-12"
                        >
                          {d.icono || "🍽️"}
                        </button>
                        {pickerIndex === i && (
                          <div className="absolute z-10 mt-2 overflow-x-auto">
                            <div className="min-w-[352px]">
                              <EmojiPicker
                                lazyLoadEmojis
                                categories={[{ category: Categories.FOOD_DRINK, name: "Food & Drink" }]}
                                onEmojiClick={(e) => {
                                  updateDish(i, "icono", e.emoji);
                                  setPickerIndex(null);
                                }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <Button variant="outline" onClick={addDish}>
                  Agregar plato
                </Button>
              </>
            )}

            {step === 2 && (
              <>
                {sides.map((s, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <input
                      type="text"
                      value={s.nombre}
                      onChange={(e) => updateSide(i, "nombre", e.target.value)}
                      placeholder="Guarnición"
                      className="w-full border rounded p-2"
                    />
                    <input
                      type="text"
                      value={s.variantes}
                      onChange={(e) => updateSide(i, "variantes", e.target.value)}
                      placeholder="Variantes (separadas por coma)"
                      className="w-full border rounded p-2"
                    />
                  </div>
                ))}
                <Button variant="outline" onClick={addSide}>
                  Agregar guarnición
                </Button>
              </>
            )}

            {step === 3 && (
              <>
                {dishes.map((d, i) => (
                  <div key={i} className="border rounded p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span>
                        {d.icono || "🍽️"} {d.nombre}
                      </span>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={dishSides[i]?.enabled || false}
                          onChange={(e) =>
                            toggleHasSides(i, e.target.checked)
                          }
                        />
                        Lleva guarnición
                      </label>
                    </div>
                    {dishSides[i]?.enabled && sides.length > 0 && (
                      <div className="grid grid-cols-2 gap-1">
                        {sides.map((s, j) => (
                          <label
                            key={j}
                            className="flex items-center gap-2 text-sm"
                          >
                            <input
                              type="checkbox"
                              checked={dishSides[i].sides.has(j)}
                              onChange={() => toggleDishSide(i, j)}
                            />
                            {s.nombre}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
          <SheetFooter className="flex justify-between">
            {step > 1 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Anterior
              </Button>
            )}
            {step < 3 && (
              <Button onClick={() => setStep(step + 1)}>Siguiente</Button>
            )}
            {step === 3 && (
              <Button onClick={submitRestaurant}>Crear restaurante</Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

