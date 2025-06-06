import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";

export default function ProyectoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="md:flex min-h-screen">
      <Sidebar />
      <div className="flex-1">
        <MobileMenu />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
