import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <h1 className="text-2xl font-bold text-center">Crear cuenta</h1>
        <SignUp afterSignInUrl="/dashboard" afterSignUpUrl="/dashboard" />
      </div>
    </main>
  );
}
