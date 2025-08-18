"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRestaurants, RestaurantRow, deleteRestaurant } from "@/lib/supabase/comidas";
import Button from "@/components/ui/button";
import Skeleton from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { PlusCircle, Trash2 } from "lucide-react";
import { confirmDialog, showError } from "@/lib/alerts";
import { toast } from "react-hot-toast";

export default function ComidasIndexPage() {
  const { id: proyectoId } = useParams<{ id: string }>();
  const router = useRouter();
  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderOpen, setOrderOpen] = useState(false);

  useEffect(() => {
    if (!proyectoId) return;
    setLoading(true);
    getRestaurants(proyectoId)
      .then(setRestaurants)
      .catch(() => setRestaurants([]))
      .finally(() => setLoading(false));
  }, [proyectoId]);


  const eliminarRestaurant = async (id: string) => {
    if (!(await confirmDialog("¿Eliminar restaurante?"))) return;
    deleteRestaurant(id)
      .then(() => {
        setRestaurants((prev) => prev.filter((r) => r.id !== id));
        toast.success("Restaurante eliminado");
      })
      .catch(() => showError("Error eliminando restaurante"));
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
                    className="cursor-pointer rounded-lg border p-6 shadow hover:shadow-md transition bg-white relative group"
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        eliminarRestaurant(r.id);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="absolute top-2 right-2 text-red-600 hover:text-red-800 hidden group-hover:block"
                    >
                      <Trash2 size={16} />
                    </button>
                    <h3 className="text-2xl font-bold text-center">{r.nombre}</h3>
                  </div>
                ))}
              </div>
            )}
          </div>
          <SheetFooter>
            <Button
              variant="secondary"
              onClick={() => router.push(`./comidas/nuevo`)}
            >
              Agregar restaurante
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

