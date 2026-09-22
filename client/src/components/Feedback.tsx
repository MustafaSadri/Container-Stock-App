export function Loading({ label = "Loading..." }: { label?: string }) {
  return <div className="flex items-center justify-center py-16 text-sm text-slate-400">{label}</div>;
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return <div className="rounded-lg border border-dashed border-slate-300 px-4 py-10 text-center text-sm text-slate-400">{message}</div>;
}

export function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed bottom-20 left-1/2 z-50 -translate-x-1/2 rounded-lg px-4 py-2.5 text-sm font-medium shadow-lg sm:bottom-6 ${
        type === "success" ? "bg-slate-900 text-white" : "bg-red-600 text-white"
      }`}
    >
      {message}
    </div>
  );
}
