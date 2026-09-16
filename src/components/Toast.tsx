import { useEffect } from "react";

export interface Toast {
  id: string;
  message: string;
  type: "info" | "flagged";
}

interface ToastProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id]);

  const isFlagged = toast.type === "flagged";

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-sm max-w-xs w-full
        animate-fade-up cursor-pointer select-none
        ${isFlagged
          ? "bg-white border-rust/25 text-ink"
          : "bg-white border-ink/10 text-ink"
        }`}
      onClick={() => onDismiss(toast.id)}
    >
      <span
        className={`mt-0.5 w-1.5 h-1.5 rounded-full shrink-0 ${
          isFlagged ? "bg-rust" : "bg-ledger"
        }`}
      />
      <p className="text-xs leading-relaxed">{toast.message}</p>
    </div>
  );
}