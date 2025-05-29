import "./globals.css";
import type { Metadata } from "next";
import { ClerkProvider, SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";

import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MadrijApp",
  description: "Gestión integral para madrijim",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body className={`min-h-screen bg-gray-50 text-gray-800 ${geistSans.variable} ${geistMono.variable} antialiased`}>
          
          {/* Layout de contenido con Sidebar y MobileMenu */}
          <div className="md:flex">
            <Sidebar />
            <div className="flex-1">
              <MobileMenu />
              <main className="p-6">{children}</main>
            </div>
          </div>
        </body>
      </html>
    </ClerkProvider>
  );
}
