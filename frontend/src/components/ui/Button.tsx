import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" };

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { className, variant = "primary", ...props }, ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "rounded-xl px-4 py-2 text-sm font-semibold transition disabled:opacity-50",
        variant === "primary" && "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:opacity-90",
        variant === "ghost" && "bg-white/5 text-gray-200 hover:bg-white/10 border border-white/10",
        variant === "danger" && "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30",
        className
      )}
      {...props}
    />
  );
});
