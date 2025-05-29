import "./globals.css";
import type { Metadata } from "next";
import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";

export const metadata: Metadata = {
  title: "MadrijApp",
  description: "Gestión integral para madrijim",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-gray-50 text-gray-800">
        <div className="md:flex">
          <Sidebar />
          <div className="flex-1">
            <MobileMenu />
            <main className="p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
