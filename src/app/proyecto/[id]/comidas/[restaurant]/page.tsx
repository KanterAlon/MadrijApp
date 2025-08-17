"use client";

import { useEffect, useState } from "react";
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
    pedido_por: "",
  });

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
    addOrderItem(orderId, form)
      .then((it) => {
        setItems((prev) => [...prev, it]);
        setForm({ plato: "", guarnicion: "", variante: "", pedido_por: "" });
        toast.success("Agregado");
      })
      .catch(() => showError("Error agregando"));
  };

  const platos = restaurant?.platos || [];
  const selectedDish = platos.find((p) => p.nombre === form.plato);
  const sides = selectedDish?.guarniciones || [];
  const selectedSide = sides.find((s) => s.nombre === form.guarnicion);
  const variantes = selectedSide?.variantes || [];

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
              setForm((f) => ({ ...f, plato: e.target.value, guarnicion: "", variante: "" }))
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
                setForm((f) => ({ ...f, guarnicion: e.target.value, variante: "" }))
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
          {variantes.length > 0 && (
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
        {items.map((it) => (
          <div key={it.id} className="p-2 border rounded">
            <div className="font-semibold">
              {it.plato}
              {it.guarnicion && ` - ${it.guarnicion}`}
              {it.variante && ` (${it.variante})`}
            </div>
            <div className="text-sm text-gray-600">{it.pedido_por}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

