"use client";

import { SignInButton, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Redirige al dashboard si ya está logueado
  useEffect(() => {
    if (isSignedIn) {
      router.push("/dashboard");
    }
  }, [isSignedIn, router]);

  return (
    <main className="min-h-screen flex flex-col justify-center items-center text-center p-6">
      <h1 className="text-4xl font-bold mb-4">Bienvenido a MadrijApp</h1>
      <p className="text-lg text-gray-600 mb-6">Tu espacio para organizar todo como madrij.</p>
      <div className="flex gap-4">
        <SignInButton
          mode="modal"
          withSignUp
          afterSignInUrl="/dashboard"
          afterSignUpUrl="/dashboard"
        >
          <button className="px-4 py-2 bg-black text-white rounded-xl hover:bg-gray-900 transition">
            Iniciar sesión
          </button>
        </SignInButton>
      </div>
    </main>
  );
}
