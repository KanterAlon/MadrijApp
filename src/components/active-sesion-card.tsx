"use client";
import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSesionActiva } from "@/lib/supabase/asistencias";
import { getMadrijNombre } from "@/lib/supabase/madrijim";
import { AccessDeniedError } from "@/lib/supabase/access";

type SesionData = {
  id: string;
  nombre: string;
  inicio: string;
  madrij_id: string;
  finalizado: boolean;
};

export default function ActiveSesionCard({
  proyectoId,
}: {
  proyectoId: string;
}) {
  const [sesion, setSesion] = useState<SesionData | null>(null);
  const [madrijNombre, setMadrijNombre] = useState<string>("");
  const [ago, setAgo] = useState("");
  const currentId = useRef<string | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) return;
    let ignore = false;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    const subscribe = () => {
      channel = supabase
        .channel("asistencia_sesiones")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "asistencia_sesiones",
            filter: `proyecto_id=eq.${proyectoId}`,
          },
          (payload) => {
            const data = payload.new as SesionData;
            if (!data.finalizado) {
              currentId.current = data.id;
              setSesion(data);
              getMadrijNombre(data.madrij_id)
                .then((n) => setMadrijNombre(n))
                .catch(() => {});
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "asistencia_sesiones",
            filter: `proyecto_id=eq.${proyectoId}`,
          },
          (payload) => {
            const data = payload.new as SesionData;
            if (data.finalizado) {
              if (currentId.current === data.id) {
                setSesion(null);
                currentId.current = null;
              }
            } else {
              currentId.current = data.id;
              setSesion(data);
              getMadrijNombre(data.madrij_id)
                .then((n) => setMadrijNombre(n))
                .catch(() => {});
            }
          },
        )
        .subscribe();
    };

    const load = async () => {
      try {
        const s = await getSesionActiva(user.id, proyectoId);
        if (ignore) return;
        if (s) {
          currentId.current = s.id as string;
          setSesion(s as SesionData);
          getMadrijNombre((s as SesionData).madrij_id)
            .then((n) => !ignore && setMadrijNombre(n))
            .catch(() => {});
        } else {
          currentId.current = null;
          setSesion(null);
          setMadrijNombre("");
        }
        subscribe();
      } catch (err) {
        if (err instanceof AccessDeniedError) {
          if (!ignore) {
            setSesion(null);
            setMadrijNombre("");
          }
          return;
        }
      }
    };

    load();

    return () => {
      ignore = true;
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [proyectoId, user]);

  useEffect(() => {
    if (!sesion) return;
    const calc = () => {
      const mins = Math.floor(
        (Date.now() - new Date(sesion.inicio).getTime()) / 60000,
      );
      setAgo(mins < 1 ? "hace menos de un minuto" : `hace ${mins} min`);
    };
    calc();
    const id = setInterval(calc, 60000);
    return () => clearInterval(id);
  }, [sesion]);

  if (!sesion) return null;

  return (
    <Link
      href={`/proyecto/${proyectoId}/janijim/asistencia?sesion=${sesion.id}`}
      className="block p-4 bg-yellow-50 border border-yellow-300 rounded-lg shadow-sm"
    >
      <p className="font-semibold">Asistencia en curso</p>
      <p className="text-sm">
        Iniciada por {user?.id === sesion.madrij_id ? "vos" : madrijNombre} {ago}
      </p>
    </Link>
  );
}
