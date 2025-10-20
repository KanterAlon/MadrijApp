"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CalendarCheck, Group, LayoutDashboard, LogIn, Wrench } from "lucide-react";

import Button from "@/components/ui/button";
import Loader from "@/components/ui/loader";

type RolesResponse = { roles: string[] };

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [checkingDestination, setCheckingDestination] = useState(false);

  useEffect(() => {
    if (!isSignedIn) return;

    let cancelled = false;
    setCheckingDestination(true);

    const resolveDestination = async () => {
      try {
        const res = await fetch("/api/auth/me");
        if (!res.ok) {
          throw new Error("No se pudieron obtener los roles");
        }
        const payload = (await res.json()) as RolesResponse;
        const destination = payload.roles.includes("admin") ? "/admin" : "/dashboard";
        if (!cancelled) {
          router.push(destination);
        }
      } catch (error) {
        console.error("Error determinando el destino post login", error);
        if (!cancelled) {
          router.push("/dashboard");
        }
      } finally {
        if (!cancelled) {
          setCheckingDestination(false);
        }
      }
    };

    void resolveDestination();

    return () => {
      cancelled = true;
    };
  }, [isSignedIn, router]);

  if (!isLoaded || isSignedIn || checkingDestination) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader className="h-8 w-8" />
      </div>
    );
  }

  const features = [
    {
      icon: Group,
      title: "Gestiona tu kvutzá",
      desc: "Administra madrijim y janijim fácilmente.",
    },
    {
      icon: CalendarCheck,
      title: "Planifica actividades",
      desc: "Organiza eventos y controla la asistencia.",
    },
    {
      icon: LayoutDashboard,
      title: "Todo en un lugar",
      desc: "Centraliza la información de forma segura.",
    },
    {
      icon: Wrench,
      title: "Herramientas institucionales",
      desc: "Encontrá datos clave de tus janijim y accesos rápidos.",
    },
  ];

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-6 text-center">
      <h1 className="mb-4 text-5xl font-extrabold text-blue-900">Bienvenido a MadrijApp</h1>
      <p className="mb-8 text-xl text-gray-700">Tu espacio para organizar todo como madrij.</p>
      <SignInButton mode="modal" withSignUp forceRedirectUrl="/" signUpForceRedirectUrl="/">
        <Button icon={<LogIn className="h-4 w-4" />}>Iniciar sesión</Button>
      </SignInButton>
      <section className="mx-auto mt-12 grid w-full max-w-5xl gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center rounded-xl bg-white/60 p-6 shadow-md backdrop-blur"
          >
            <Icon className="mb-4 h-10 w-10 text-blue-600" />
            <h3 className="mb-2 text-lg font-semibold">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
