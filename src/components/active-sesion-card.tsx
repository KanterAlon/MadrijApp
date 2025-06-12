"use client";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSesionActiva } from "@/lib/supabase/asistencias";
import { getMadrijNombre } from "@/lib/supabase/madrijim";

type SesionData = {
  id: string;
  nombre: string;
  inicio: string;
  madrij_id: string;
  finalizado: boolean;
};

export default function ActiveSesionCard({ proyectoId }: { proyectoId: string }) {
  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [madrijNombre, setMadrijNombre] = useState<string>("");
  const currentId = useRef<string | null>(null);

  useEffect(() => {
    let ignore = false;
    const load = async () => {
      try {
        const s = await getSesionActiva(proyectoId);
        if (s && !ignore) {
          currentId.current = s.id;
          setSesion(s as SesionData);
          getMadrijNombre(s.madrij_id)
            .then((n) => !ignore && setMadrijNombre(n))
            .catch(() => {});
        }
      } catch {
        /* empty */
      }
    };
    load();

    const channel = supabase
      .channel(`sesiones-${proyectoId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "asistencia_sesiones",
          filter: `proyecto_id=eq.${proyectoId}`,
        },
        (payload) => {
          const data = payload.new as SesionData;
          if (payload.eventType === "UPDATE" && data.finalizado) {
            if (currentId.current === data.id) {
              setSesion(null);
              currentId.current = null;
            }
            return;
          }

          if (!data.finalizado) {
            currentId.current = data.id;
            setSesion(data);
            getMadrijNombre(data.madrij_id)
              .then((n) => setMadrijNombre(n))
              .catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(channel);
    };
  }, [proyectoId]);

  if (!sesion) return null;

  const mins = Math.floor((Date.now() - new Date(sesion.inicio).getTime()) / 60000);
  const ago = mins < 1 ? "hace menos de un minuto" : `hace ${mins} min`;

  return (
    <Link
      href={`/proyecto/${proyectoId}/janijim/asistencia?sesion=${sesion.id}`}
      className="block p-4 bg-yellow-100 border rounded-lg"
    >
      <p className="font-semibold">Asistencia en curso</p>
      <p className="text-sm">Iniciada por {madrijNombre || ""} {ago}</p>
    </Link>
  );
}
