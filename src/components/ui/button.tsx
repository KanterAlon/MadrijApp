import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
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
  icon?: ReactNode;
  iconRight?: boolean;
  /** Apply button styles to the child element instead of rendering a <button> */
  asChild?: boolean;
};

type ChildComponentProps = {
  className?: string;
  children?: ReactNode;
  onClick?: (event: ReactMouseEvent<HTMLElement>) => void;
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
  asChild = false,
  onClick,
  ...rest
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

  const variantClass = variants[variant] ?? variants.primary;
  const sizeClass = size ? sizes[size] : undefined;
  const disabledStyles = disabled || loading ? "pointer-events-none cursor-not-allowed opacity-60" : undefined;
  const childElement =
    asChild && isValidElement<ChildComponentProps>(children)
      ? (children as ReactElement<ChildComponentProps>)
      : null;
  const childContent = childElement ? childElement.props.children : children;
  const leadingIcon = !iconRight ? (loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon) : null;
  const trailingIcon = iconRight ? (loading ? <Loader2 className="h-4 w-4 animate-spin" /> : icon) : null;
  const inner = size === "icon" ? childContent : <span>{childContent}</span>;
  const content = (
    <>
      {leadingIcon}
      {inner}
      {trailingIcon}
    </>
  );

  if (childElement) {
    const { onClick: childOnClick } = childElement.props;
    const handleClick = (event: ReactMouseEvent<HTMLElement>) => {
      if (disabled || loading) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      onClick?.(event as unknown as ReactMouseEvent<HTMLButtonElement>);
      childOnClick?.(event);
    };

    return cloneElement(childElement, {
      ...rest,
      onClick: handleClick,
      className: cn(base, variantClass, sizeClass, disabledStyles, childElement.props.className, className),
      children: content,
      ...(disabled || loading
        ? { "aria-disabled": true, tabIndex: -1 }
        : {}),
    });
  }

  return (
    <button
      disabled={disabled || loading}
      onClick={onClick}
      className={cn(base, variantClass, sizeClass, className)}
      {...rest}
    >
      {content}
    </button>
  );
}
