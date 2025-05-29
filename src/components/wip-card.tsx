import { AlertCircle } from "lucide-react";

export default function WorkInProgress({ title }: { title: string }) {
  return (
    <div className="max-w-xl mx-auto mt-24 text-center bg-white p-8 rounded-2xl shadow-md">
      <div className="flex justify-center mb-4 text-blue-600">
        <AlertCircle size={48} />
      </div>
      <h1 className="text-3xl font-semibold text-blue-700 mb-2">{title}</h1>
      <p className="text-gray-600">🚧 Esta sección está en desarrollo. ¡Muy pronto vas a poder usarla!</p>
    </div>
  );
}
