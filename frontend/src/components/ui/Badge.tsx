import { cn } from "@/lib/utils";
import { severityColor } from "@/lib/utils";

export function Badge({ children, tone }: { children: string; tone?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
      tone ? severityColor(tone) : "bg-white/10 text-gray-200")}>
      {children}
    </span>
  );
}
