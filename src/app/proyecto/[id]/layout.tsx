import Sidebar from "@/components/ui/sidebar";
import MobileMenu from "@/components/ui/mobile-menu";
import BottomNav from "@/components/ui/bottom-nav";

export default async function ProyectoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id: proyectoId } = await params

  return (
    <div className="min-h-screen md:flex">
      <Sidebar proyectoId={proyectoId} />
      <div className="flex-1 flex flex-col pb-16 pt-16">
        <MobileMenu proyectoId={proyectoId} />
        <main className="flex-1 p-6 pb-20">{children}</main>
        <BottomNav proyectoId={proyectoId} />
      </div>
    </div>
  );
}
