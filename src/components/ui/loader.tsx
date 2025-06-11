import { cn } from "@/lib/utils";

export default function Loader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-4 border-gray-300 border-t-blue-600",
        className
      )}
    />
  );
}
