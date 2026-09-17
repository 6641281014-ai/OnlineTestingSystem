import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "primary" | "success" | "warning" | "danger" | "info";
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  const variantStyles = {
    default: "bg-slate-100 text-slate-700 border-slate-200",
    primary: "bg-indigo-50 text-indigo-700 border-indigo-200",
    success: "bg-emerald-50 text-emerald-700 border-emerald-200",
    warning: "bg-amber-50 text-amber-700 border-amber-200",
    danger: "bg-rose-50 text-rose-700 border-rose-200",
    info: "bg-sky-50 text-sky-700 border-sky-200",
  }[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
        variantStyles,
        className
      )}
    >
      {children}
    </span>
  );
}

export function DifficultyBadge({ difficulty }: { difficulty: string }) {
  if (difficulty === "EASY") {
    return <Badge variant="success">ระดับง่าย</Badge>;
  }
  if (difficulty === "HARD") {
    return <Badge variant="danger">ระดับยาก</Badge>;
  }
  return <Badge variant="warning">ระดับปานกลาง</Badge>;
}

export function QuestionTypeBadge({ type }: { type: string }) {
  if (type === "TRUE_FALSE") {
    return <Badge variant="info">ถูก / ผิด</Badge>;
  }
  return <Badge variant="primary">ปรนัย (เลือกตอบ)</Badge>;
}
