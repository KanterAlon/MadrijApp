import { supabase } from "@/lib/supabase";

export interface SideOption {
  nombre: string;
  variantes?: string[];
  multiple?: boolean;
}

export interface DishOption {
  nombre: string;
  icono: string;
  guarniciones?: SideOption[];
}

export interface RestaurantRow {
  id: string;
  proyecto_id: string | null;
  nombre: string;
  platos: DishOption[];
  created_at?: string;
}

export async function getRestaurants(proyectoId: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("proyecto_id", proyectoId)
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data as RestaurantRow[]) || [];
}

export async function getRestaurant(id: string) {
  const { data, error } = await supabase
    .from("restaurants")
    .select("*")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as RestaurantRow;
}

export async function addRestaurant(
  proyectoId: string,
  nombre: string,
  platos: DishOption[]
) {
  const { data, error } = await supabase
    .from("restaurants")
    .insert({ proyecto_id: proyectoId, nombre, platos })
    .select()
    .single();
  if (error) throw error;
  return data as RestaurantRow;
}

export interface FoodOrderRow {
  id: string;
  proyecto_id: string | null;
  restaurant_id: string | null;
  created_at?: string;
}

export interface FoodOrderItemRow {
  id: string;
  order_id: string;
  plato: string;
  guarnicion?: string | null;
  variante?: string | null;
  pedido_por: string;
  created_at?: string;
}

export async function createOrder(
  proyectoId: string,
  restaurantId: string
) {
  const { data, error } = await supabase
    .from("food_orders")
    .insert({ proyecto_id: proyectoId, restaurant_id: restaurantId })
    .select()
    .single();
  if (error) throw error;
  return data as FoodOrderRow;
}

export async function addOrderItem(
  orderId: string,
  item: {
    plato: string;
    guarnicion?: string;
    variante?: string;
    pedido_por: string;
  }
) {
  const { data, error } = await supabase
    .from("food_order_items")
    .insert({ order_id: orderId, ...item })
    .select()
    .single();
  if (error) throw error;
  return data as FoodOrderItemRow;
}

export async function getOrderItems(orderId: string) {
  const { data, error } = await supabase
    .from("food_order_items")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as FoodOrderItemRow[]) || [];
}

