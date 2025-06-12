"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CalendarCheck, Group, LayoutDashboard } from "lucide-react";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirige al dashboard si ya está logueado
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

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
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition">
          Iniciar sesión
        </button>
      </SignInButton>
      <section className="mt-12 grid gap-6 w-full max-w-5xl md:grid-cols-3">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="flex flex-col items-center bg-white/60 backdrop-blur rounded-lg p-6 shadow">
            <Icon className="w-10 h-10 text-blue-600 mb-4" />
            <h3 className="text-lg font-semibold mb-2">{title}</h3>
            <p className="text-sm text-gray-600">{desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
