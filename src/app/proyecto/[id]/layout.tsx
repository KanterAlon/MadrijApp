import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";

export default function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { id: string };
}) {
  const proyectoId = params.id;

  return (
    <div className="min-h-screen md:flex">
      <Sidebar proyectoId={proyectoId} />
      <div className="flex-1">
        <MobileMenu proyectoId={proyectoId} />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
