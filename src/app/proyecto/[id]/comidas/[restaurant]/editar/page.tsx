"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Categories } from "emoji-picker-react";
import {
  getRestaurant,
  updateRestaurant,
  DishOption,
} from "@/lib/supabase/comidas";
import Button from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type DishForm = { nombre: string; icono: string };
type SideForm = { nombre: string; variantes: string; multiple: boolean };
type DishSides = { enabled: boolean; sides: Set<number> };

export default function EditarRestaurantePage() {
  const { restaurant: restaurantId } = useParams<{
    id: string;
    restaurant: string;
  }>();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [nombre, setNombre] = useState("");
  const [dishes, setDishes] = useState<DishForm[]>([{ nombre: "", icono: "" }]);
  const [sides, setSides] = useState<SideForm[]>([]);
  const [dishSides, setDishSides] = useState<Record<number, DishSides>>({});
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurant(restaurantId)
      .then((r) => {
        setNombre(r.nombre);
        setDishes(r.platos.map((p) => ({ nombre: p.nombre, icono: p.icono })));
        const sideList: SideForm[] = [];
        const sideMap = new Map<string, number>();
        const ds: Record<number, DishSides> = {};
        r.platos.forEach((p, i) => {
          const indices = new Set<number>();
          (p.guarniciones || []).forEach((g) => {
            let idx = sideMap.get(g.nombre);
            if (idx === undefined) {
              idx = sideList.length;
              sideMap.set(g.nombre, idx);
              sideList.push({
                nombre: g.nombre,
                variantes: g.variantes?.join(", ") || "",
                multiple: g.multiple || false,
              });
            }
            indices.add(idx);
          });
          ds[i] = { enabled: indices.size > 0, sides: indices };
        });
        setSides(sideList);
        setDishSides(ds);
      })
      .catch(() => showError("Error cargando restaurante"));
  }, [restaurantId]);

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
    setSides((prev) => [...prev, { nombre: "", variantes: "", multiple: false }]);

  const updateSide = (
    sideIdx: number,
    field: keyof SideForm,
    value: string | boolean,
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
        sides: enabled ? new Set(sides.map((_, i) => i)) : new Set(),
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
    if (!restaurantId) return;
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
              multiple: sides[idx].multiple,
            }))
          : [],
    }));
    updateRestaurant(restaurantId, nombre, platos)
      .then(() => {
        toast.success("Restaurante actualizado");
        router.back();
      })
      .catch(() => showError("Error actualizando restaurante"));
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold text-blue-900">Editar restaurante</h1>

      {step === 1 && (
        <>
          <Card>
            <CardContent>
              <input
                type="text"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre del restaurante"
                className="w-full border rounded p-2"
              />
            </CardContent>
          </Card>
          {dishes.map((d, i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-2">
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
                    onClick={() => setPickerIndex((p) => (p === i ? null : i))}
                    className="border rounded p-2 min-w-12"
                  >
                    {d.icono || "🍽️"}
                  </button>
                  {pickerIndex === i && (
                    <div className="absolute z-10 mt-2 overflow-x-auto">
                      <div className="min-w-[352px]">
                        <EmojiPicker
                          lazyLoadEmojis
                          categories={[
                            { category: Categories.FOOD_DRINK, name: "Food & Drink" },
                          ]}
                          onEmojiClick={(e) => {
                            updateDish(i, "icono", e.emoji);
                            setPickerIndex(null);
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addDish}>
            Agregar plato
          </Button>
        </>
      )}

      {step === 2 && (
        <>
          {sides.map((s, i) => (
            <Card key={i}>
              <CardContent>
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
                <label className="flex items-center gap-2 text-sm mt-2">
                  <input
                    type="checkbox"
                    checked={s.multiple}
                    onChange={(e) => updateSide(i, "multiple", e.target.checked)}
                  />
                  Selección múltiple
                </label>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={addSide}>
            Agregar guarnición
          </Button>
        </>
      )}

      {step === 3 && (
        <>
          {dishes.map((d, i) => (
            <Card key={i}>
              <CardHeader>
                <CardTitle>
                  {d.icono || "🍽️"} {d.nombre}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={dishSides[i]?.enabled || false}
                    onChange={(e) => toggleHasSides(i, e.target.checked)}
                  />
                  Lleva guarnición
                </label>
                {dishSides[i]?.enabled && sides.length > 0 && (
                  <div className="grid grid-cols-2 gap-1">
                    {sides.map((s, j) => (
                      <label key={j} className="flex items-center gap-2 text-sm">
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
              </CardContent>
            </Card>
          ))}
        </>
      )}

      <div className="flex justify-between">
        {step > 1 && (
          <Button variant="secondary" onClick={() => setStep(step - 1)}>
            Anterior
          </Button>
        )}
        {step < 3 && <Button onClick={() => setStep(step + 1)}>Siguiente</Button>}
        {step === 3 && <Button onClick={submitRestaurant}>Guardar cambios</Button>}
      </div>
    </div>
  );
}

