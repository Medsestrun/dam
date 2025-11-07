import { useState, useEffect } from "react";

interface Toast {
  id: string;
  message: string;
  type?: "success" | "error" | "info";
}

let toasts: Toast[] = [];
let listeners: Array<() => void> = [];

export const toast = (message: string, type: Toast["type"] = "info") => {
  const id = Math.random().toString(36).substring(7);
  toasts = [...toasts, { id, message, type }];
  listeners.forEach((listener) => listener());

  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    listeners.forEach((listener) => listener());
  }, 3000);
};

export const Toaster = () => {
  const [currentToasts, setCurrentToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const update = () => setCurrentToasts([...toasts]);
    listeners.push(update);
    update();

    return () => {
      listeners = listeners.filter((l) => l !== update);
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {currentToasts.map((toast) => (
        <div
          key={toast.id}
          className={`px-4 py-2 rounded-md shadow-lg text-white ${
            toast.type === "error"
              ? "bg-red-600"
              : toast.type === "success"
                ? "bg-green-600"
                : "bg-blue-600"
          }`}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
};

