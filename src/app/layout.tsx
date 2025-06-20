import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ClientBootstrap from "@/components/client-bootstrap";
import ToastProvider from "@/components/ui/toaster";
// Using system fonts avoids downloading external font files during the build
// process, which can fail in restricted environments.

export const metadata: Metadata = {
  title: "MadrijApp",
  description: "Gestión integral para madrijim",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
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
