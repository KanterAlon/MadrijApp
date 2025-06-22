import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ClientBootstrap from "@/components/client-bootstrap";
import ToastProvider from "@/components/ui/toaster";

const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set");
}
// Using system fonts avoids downloading external font files during the build
// process, which can fail in restricted environments.

export const metadata: Metadata = {
  title: "MadrijApp",
  description: "Gestión integral para madrijim",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={publishableKey}>
      <html lang="es">
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
        </head>
        <body className="antialiased bg-gray-50 text-gray-800">
          <ClientBootstrap />
          <ToastProvider />
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
