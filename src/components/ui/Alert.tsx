import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  type?: "error" | "success" | "info" | "warning";
  message: string;
  className?: string;
}

export function Alert({ type = "error", message, className }: AlertProps) {
  const icons = {
    error: <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />,
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-600 flex-shrink-0" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />,
  };

  const styles = {
    error: "bg-rose-50 border-rose-200 text-rose-800",
    success: "bg-emerald-50 border-emerald-200 text-emerald-800",
    info: "bg-sky-50 border-sky-200 text-sky-800",
    warning: "bg-amber-50 border-amber-200 text-amber-800",
  };

  return (
    <div
      className={cn(
        "p-4 rounded-xl border text-sm flex items-start gap-3 animate-in fade-in duration-150",
        styles[type],
        className
      )}
    >
      {icons[type]}
      <div className="flex-1 font-medium">{message}</div>
    </div>
  );
}
