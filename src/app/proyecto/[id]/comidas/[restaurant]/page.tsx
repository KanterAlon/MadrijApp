"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  getRestaurant,
  createOrder,
  addOrderItem,
  getOrderItems,
  RestaurantRow,
  FoodOrderItemRow,
} from "@/lib/supabase/comidas";
import Button from "@/components/ui/button";
import { showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";

interface ItemForm {
  plato: string;
  guarnicion?: string;
  variante?: string;
  variantes: string[];
  pedido_por: string;
}

export default function RestaurantOrderPage() {
  const { id: proyectoId, restaurant: restaurantId } = useParams<{
    id: string;
    restaurant: string;
  }>();
  const [restaurant, setRestaurant] = useState<RestaurantRow | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [items, setItems] = useState<FoodOrderItemRow[]>([]);
  const [form, setForm] = useState<ItemForm>({
    plato: "",
    guarnicion: "",
    variante: "",
    variantes: [],
    pedido_por: "",
  });

  const aggregated = useMemo(() => {
    const map = new Map<
      string,
      { item: FoodOrderItemRow; count: number; people: string[] }
    >();
    items.forEach((it) => {
      const key = `${it.plato}|${it.guarnicion || ""}|${it.variante || ""}`;
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.people.push(it.pedido_por);
      } else {
        map.set(key, { item: it, count: 1, people: [it.pedido_por] });
      }
    });
    return Array.from(map.values());
  }, [items]);

  const compartir = () => {
    const text = aggregated
      .map(({ item, count, people }) =>
        `${count}x ${item.plato}` +
        (item.guarnicion ? ` - ${item.guarnicion}` : "") +
        (item.variante ? ` (${item.variante})` : "") +
        ` - ${people.join(", " )}`
      )
      .join("\n");
    navigator.clipboard.writeText(text).catch(() => {});
    toast.success("Pedido copiado");
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  useEffect(() => {
    if (!restaurantId) return;
    getRestaurant(restaurantId)
      .then(setRestaurant)
      .catch(() => showError("Error cargando restaurante"));
  }, [restaurantId]);

  useEffect(() => {
    if (!proyectoId || !restaurantId) return;
    createOrder(proyectoId, restaurantId)
      .then((o) => setOrderId(o.id))
      .catch(() => showError("Error creando pedido"));
  }, [proyectoId, restaurantId]);

  useEffect(() => {
    if (!orderId) return;
    getOrderItems(orderId)
      .then(setItems)
      .catch(() => setItems([]));
  }, [orderId]);

  const agregarItem = async () => {
    if (!orderId) return;
    if (!form.plato || !form.pedido_por) return;
    const variant = multiple ? form.variantes.join(", ") : form.variante;
    addOrderItem(orderId, {
      plato: form.plato,
      guarnicion: form.guarnicion,
      variante: variant,
      pedido_por: form.pedido_por,
    })
      .then((it) => {
        setItems((prev) => [...prev, it]);
        setForm({
          plato: "",
          guarnicion: "",
          variante: "",
          variantes: [],
          pedido_por: "",
        });
        toast.success("Agregado");
      })
      .catch(() => showError("Error agregando"));
  };

  const platos = restaurant?.platos || [];
  const selectedDish = platos.find((p) => p.nombre === form.plato);
  const sides = selectedDish?.guarniciones || [];
  const selectedSide = sides.find((s) => s.nombre === form.guarnicion);
  const variantes = selectedSide?.variantes || [];
  const multiple = selectedSide?.multiple;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-blue-900">
        {restaurant?.nombre || "Pedido"}
      </h1>

      <div className="space-y-4">
        <div className="flex flex-col md:flex-row gap-2">
          <select
            value={form.plato}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                plato: e.target.value,
                guarnicion: "",
                variante: "",
                variantes: [],
              }))
            }
            className="border rounded p-2 flex-1"
          >
            <option value="">Plato</option>
            {platos.map((p) => (
              <option key={p.nombre} value={p.nombre}>
                {p.icono} {p.nombre}
              </option>
            ))}
          </select>
          {sides.length > 0 && (
            <select
              value={form.guarnicion}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  guarnicion: e.target.value,
                  variante: "",
                  variantes: [],
                }))
              }
              className="border rounded p-2 flex-1"
            >
              <option value="">Guarnición</option>
              {sides.map((s) => (
                <option key={s.nombre} value={s.nombre}>
                  {s.nombre}
                </option>
              ))}
            </select>
          )}
          {variantes.length > 0 && !multiple && (
            <select
              value={form.variante}
              onChange={(e) =>
                setForm((f) => ({ ...f, variante: e.target.value }))
              }
              className="border rounded p-2 flex-1"
            >
              <option value="">Variante</option>
              {variantes.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          )}
          {variantes.length > 0 && multiple && (
            <div className="flex flex-wrap gap-2 flex-1">
              {variantes.map((v) => (
                <label key={v} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.variantes?.includes(v) || false}
                    onChange={(e) =>
                      setForm((f) => {
                        const set = new Set(f.variantes);
                        if (e.target.checked) set.add(v);
                        else set.delete(v);
                        return { ...f, variantes: Array.from(set) };
                      })
                    }
                  />
                  {v}
                </label>
              ))}
            </div>
          )}
        </div>
        <input
          type="text"
          value={form.pedido_por}
          onChange={(e) =>
            setForm((f) => ({ ...f, pedido_por: e.target.value }))
          }
          placeholder="Pedido por"
          className="w-full border rounded p-2"
        />
        <Button onClick={agregarItem}>Agregar</Button>
      </div>

      <div className="space-y-2">
        {aggregated.map(({ item, count, people }, i) => (
          <div key={i} className="p-2 border rounded">
            <div className="font-semibold">
              {count}x {item.plato}
              {item.guarnicion && ` - ${item.guarnicion}`}
              {item.variante && ` (${item.variante})`}
            </div>
            <div className="text-sm text-gray-600">{people.join(", ")}</div>
          </div>
        ))}
      </div>
      {aggregated.length > 0 && (
        <Button onClick={compartir}>Compartir por WhatsApp</Button>
      )}
    </div>
  );
}

