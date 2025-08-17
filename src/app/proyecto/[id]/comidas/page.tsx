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
  sides: { nombre: string; variantes: string }[];
};

export default function ComidasIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [nombre, setNombre] = useState("");
  const [dishes, setDishes] = useState<DishForm[]>([
    { nombre: "", icono: "", sides: [] },
  ]);
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!proyectoId) return;
    setLoading(true);
    getRestaurants(proyectoId)
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [proyectoId]);

  const addDish = () =>
    setDishes((prev) => [...prev, { nombre: "", icono: "", sides: [] }]);

  const updateDish = (i: number, field: keyof DishForm, value: string) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[i] = { ...copy[i], [field]: value } as DishForm;
      return copy;
    });
  };

  const addSide = (dishIdx: number) => {
    setDishes((prev) => {
      const copy = [...prev];
      copy[dishIdx].sides.push({ nombre: "", variantes: "" });
      return copy;
    });
  };

  const updateSide = (
    dishIdx: number,
    sideIdx: number,
    field: "nombre" | "variantes",
    value: string
  ) => {
    setDishes((prev) => {
      const copy = [...prev];
      const sides = [...copy[dishIdx].sides];
      sides[sideIdx] = { ...sides[sideIdx], [field]: value };
      copy[dishIdx] = { ...copy[dishIdx], sides };
      return copy;
    });
  };

  const submitRestaurant = async () => {
    if (!proyectoId) return;
    const platos: DishOption[] = dishes.map((d) => ({
      nombre: d.nombre,
      icono: d.icono || "🍽️",
      guarniciones: d.sides.map((s) => ({
        nombre: s.nombre,
        variantes: s.variantes
          ? s.variantes.split(",").map((v) => v.trim()).filter(Boolean)
          : [],
      })),
    }));
    addRestaurant(proyectoId, nombre, platos)
      .then((r) => {
        setRestaurants((prev) => [...prev, r]);
        setFormOpen(false);
        setNombre("");
        setDishes([{ nombre: "", icono: "", sides: [] }]);
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
          <div className="p-4 space-y-2">
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
            {restaurants.map((r) => (
              <div
                key={r.id}
                className="p-3 border rounded flex justify-between items-center"
              >
                <span>{r.nombre}</span>
                <Button onClick={() => router.push(`./comidas/${r.id}`)}>
                  Seleccionar
                </Button>
              </div>
            ))}
          </div>
          <SheetFooter>
            <Button variant="secondary" onClick={() => setFormOpen(true)}>
              Agregar restaurante
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={formOpen} onOpenChange={setFormOpen}>
        <SheetContent side="bottom" className="w-full max-h-screen overflow-auto">
          <SheetHeader>
            <SheetTitle>Nuevo restaurante</SheetTitle>
          </SheetHeader>
          <div className="p-4 space-y-4">
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
                      <div className="absolute z-10 mt-2">
                        <EmojiPicker
                          lazyLoadEmojis
                          categories={[{ category: Categories.FOOD_DRINK, name: "Food & Drink" }]}
                          onEmojiClick={(e) => {
                            updateDish(i, "icono", e.emoji);
                            setPickerIndex(null);
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {d.sides.map((s, j) => (
                  <div key={j} className="ml-4 space-y-1">
                    <input
                      type="text"
                      value={s.nombre}
                      onChange={(e) =>
                        updateSide(i, j, "nombre", e.target.value)
                      }
                      placeholder="Guarnición"
                      className="w-full border rounded p-2"
                    />
                    <input
                      type="text"
                      value={s.variantes}
                      onChange={(e) =>
                        updateSide(i, j, "variantes", e.target.value)
                      }
                      placeholder="Variantes (separadas por coma)"
                      className="w-full border rounded p-2"
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addSide(i)}
                >
                  Agregar guarnición
                </Button>
              </div>
            ))}
            <Button variant="outline" onClick={addDish}>
              Agregar plato
            </Button>
          </div>
          <SheetFooter>
            <Button onClick={submitRestaurant}>Crear restaurante</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

