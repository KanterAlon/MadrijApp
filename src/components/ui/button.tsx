import { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "success"
    | "ghost"
    | "outline";
  /** Optional size preset */
  size?: "icon" | "sm";
  loading?: boolean;
  icon?: React.ReactNode;
  iconRight?: boolean;
};

export default function Button({
  variant = "primary",
  size,
  loading,
  icon,
  iconRight,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 disabled:pointer-events-none";
  const variants: Record<string, string> = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-700 hover:bg-gray-300",
    danger: "bg-red-600 text-white hover:bg-red-700",
    success: "bg-green-600 text-white hover:bg-green-700",
    ghost: "bg-transparent text-gray-700 hover:bg-gray-100",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  };
  const sizes: Record<string, string> = {
    icon: "h-9 w-9 p-0",
    sm: "px-2 py-1 text-sm",
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(base, variants[variant], size && sizes[size], className)}
      {...props}
    >
      {!iconRight && (loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon)}
      {size === "icon" ? children : <span>{children}</span>}
      {iconRight && (loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon)}
    </button>
  );
}
