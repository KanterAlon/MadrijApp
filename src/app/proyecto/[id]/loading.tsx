import Loader from "@/components/ui/loader";

export default function Loading() {
  return (
    <div className="flex justify-center items-center h-32">
      <Loader className="h-8 w-8" />
    </div>
  );
}
