import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useToast } from "./ToastProvider";

interface Props {
  transactionId: string;
  label: string;
}

// A small delete icon that, after one confirmation, deletes the transaction and rolls
// back the stock change it made — so stock ends up exactly as if it never happened.
export function DeleteTransactionButton({ transactionId, label }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/transactions/${transactionId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["container"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      qc.invalidateQueries({ queryKey: ["flavourHistory"] });
      toast("Transaction deleted — stock rolled back");
      setConfirming(false);
    },
    onError: (e: any) => setError(e.message || "Something went wrong"),
  });

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setConfirming(true);
        }}
        className="shrink-0 rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
        aria-label="Delete transaction"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5">
          <path d="M4 7h16M9 7V4h6v3m-7 0 1 13h8l1-13" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
          onClick={() => !mutation.isPending && setConfirming(false)}
        >
          <div
            className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
            style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-2 text-base font-semibold text-red-700">Delete this transaction?</h2>
            <p className="mb-1 text-sm text-slate-600">{label}</p>
            <p className="mb-4 text-sm text-slate-600">
              Stock will be rolled back to what it would be without this transaction. This cannot be undone.
            </p>
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 py-3" onClick={() => setConfirming(false)} disabled={mutation.isPending}>
                Cancel
              </button>
              <button className="btn-danger flex-1 py-3" onClick={() => mutation.mutate()} disabled={mutation.isPending}>
                {mutation.isPending ? "Deleting..." : "Delete & roll back"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
