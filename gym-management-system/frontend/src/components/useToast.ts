import { useState, useCallback } from "react";
import { ToastData } from "./Toast";

export function useToast() {
  const [toast, setToast] = useState<ToastData | null>(null);

  const showToast = useCallback((type: ToastData["type"], message: string) => {
    setToast({ type, message });
  }, []);

  const clearToast = useCallback(() => setToast(null), []);

  return { toast, showToast, clearToast };
}
