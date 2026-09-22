import { createContext, useCallback, useContext, useRef, useState } from "react";
import { Toast } from "./Feedback";

interface ToastMsg {
  id: number;
  message: string;
  type: "success" | "error";
}

const ToastContext = createContext<(message: string, type?: "success" | "error") => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++idRef.current;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-50 flex flex-col items-center justify-end gap-2 pb-20 sm:pb-6">
        {toasts.map((t) => (
          <Toast key={t.id} message={t.message} type={t.type} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}
