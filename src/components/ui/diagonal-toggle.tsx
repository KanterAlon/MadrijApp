export type DiagonalToggleValue = "capital" | "sanMiguel";

export interface DiagonalToggleProps {
  value: DiagonalToggleValue;
  onChange?: (v: DiagonalToggleValue) => void;
  className?: string;
}

export default function DiagonalToggle({ value, onChange, className }: DiagonalToggleProps) {
  return (
    <div className={`relative inline-block w-32 h-10 rounded overflow-hidden text-sm font-medium ${className || ""}`}> 
      <div className="absolute inset-0 pointer-events-none bg-[linear-gradient(135deg,transparent_49%,theme(colors.gray.300)_49%,theme(colors.gray.300)_51%,transparent_51%)]" />
      <button
        type="button"
        className={`absolute inset-y-0 left-0 w-1/2 flex items-center justify-center transition-colors ${value === "capital" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => onChange?.("capital")}
      >
        Capital
      </button>
      <button
        type="button"
        className={`absolute inset-y-0 right-0 w-1/2 flex items-center justify-center transition-colors ${value === "sanMiguel" ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-700"}`}
        onClick={() => onChange?.("sanMiguel")}
      >
        San Miguel
      </button>
    </div>
  );
}
