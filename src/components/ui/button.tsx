import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger" | "success";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
};

export default function Button({
  variant = "primary",
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-60 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], className)}
      {...props}
    >
      {!iconRight && (loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon)}
      <span>{children}</span>
      {iconRight && (loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon)}
    </button>
  );
}
