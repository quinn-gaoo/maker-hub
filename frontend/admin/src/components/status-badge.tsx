import type { ReactNode } from "react";
import { Badge, cn } from "@makerhub/ui";

type StatusBadgeProps = {
  tone: "neutral" | "success" | "warning" | "danger";
  children: ReactNode;
};

const toneClasses: Record<StatusBadgeProps["tone"], string> = {
  neutral: "border-slate-300 bg-slate-100 text-slate-700",
  success: "border-emerald-300 bg-emerald-50 text-emerald-700",
  warning: "border-amber-300 bg-amber-50 text-amber-700",
  danger: "border-rose-300 bg-rose-50 text-rose-700",
};

export function StatusBadge({ tone, children }: StatusBadgeProps) {
  return <Badge variant="outline" className={cn("rounded-full px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em]", toneClasses[tone])}>{children}</Badge>;
}
