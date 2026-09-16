import { useEffect } from "react";
import { CheckCircle2, XCircle } from "lucide-react";

export interface ToastData {
  type: "success" | "error";
  message: string;
}

interface ToastProps {
  toast: ToastData | null;
  onClose: () => void;
}

export default function Toast({ toast, onClose }: ToastProps) {
  useEffect(() => {
    if (toast) {
      const t = setTimeout(onClose, 3500);
      return () => clearTimeout(t);
    }
  }, [toast, onClose]);

  if (!toast) return null;

  const isSuccess = toast.type === "success";

  return (
    <div className="fixed bottom-5 right-5 z-[100] animate-in slide-in-from-bottom-4 fade-in">
      <div
        className={`flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${
          isSuccess
            ? "bg-brand-500/10 border-brand-500/30 text-brand-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
        }`}
      >
        {isSuccess ? <CheckCircle2 size={18} /> : <XCircle size={18} />}
        <p className="text-sm font-medium">{toast.message}</p>
      </div>
    </div>
  );
}
