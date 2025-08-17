"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getRestaurants, RestaurantRow } from "@/lib/supabase/comidas";
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

