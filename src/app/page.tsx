"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Loader from "@/components/ui/loader";
import { CalendarCheck, Group, LayoutDashboard, LogIn } from "lucide-react";
import Button from "@/components/ui/button";

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirige al dashboard si ya está logueado
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  if (!isLoaded || isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
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
  ];

  return (
    <main className="min-h-screen flex flex-col items-center justify-center text-center p-6 bg-gradient-to-b from-blue-50 to-white">
      <h1 className="text-5xl font-extrabold mb-4 text-blue-900">Bienvenido a MadrijApp</h1>
      <p className="text-xl text-gray-700 mb-8">Tu espacio para organizar todo como madrij.</p>
      <SignInButton mode="modal" withSignUp forceRedirectUrl="/dashboard" signUpForceRedirectUrl="/dashboard">
        <Button icon={<LogIn className="w-4 h-4" />}>Iniciar sesión</Button>
      </SignInButton>
      <section className="mt-12 grid gap-6 w-full max-w-5xl sm:grid-cols-2 md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="flex flex-col items-center bg-white/60 backdrop-blur rounded-xl p-6 shadow-md"
          >
            <Icon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
