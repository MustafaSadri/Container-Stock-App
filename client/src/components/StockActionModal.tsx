import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Container } from "../types";
import { useToast } from "./ToastProvider";

type Mode = "ADD" | "REMOVE" | "TRANSFER" | "ADJUST";

interface Props {
  flavourId: string;
  flavourLabel: string;
  containers: Container[];
  defaultContainerId?: string;
  defaultMode?: Mode;
  currentQuantity?: number;
  onClose: () => void;
}

export function StockActionModal({
  flavourId,
  flavourLabel,
  containers,
  defaultContainerId,
  defaultMode = "ADD",
  currentQuantity,
  onClose,
}: Props) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [containerId, setContainerId] = useState(defaultContainerId || containers[0]?.id || "");
  const [destContainerId, setDestContainerId] = useState(
    containers.find((c) => c.id !== defaultContainerId)?.id || ""
  );
  const [quantity, setQuantity] = useState("");
  const [newQuantity, setNewQuantity] = useState(currentQuantity !== undefined ? String(currentQuantity) : "");
  const [note, setNote] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const qc = useQueryClient();
  const toast = useToast();

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["stock"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["containers"] });
    qc.invalidateQueries({ queryKey: ["container"] });
    qc.invalidateQueries({ queryKey: ["products"] });
    qc.invalidateQueries({ queryKey: ["product"] });
    qc.invalidateQueries({ queryKey: ["transactions"] });
    qc.invalidateQueries({ queryKey: ["flavourHistory"] });
  };

  const mutation = useMutation({
    mutationFn: async () => {
      setError(null);
      if (mode === "ADD") {
        return api.post("/stock/add", { flavourId, containerId, quantity: Number(quantity), note: note || undefined });
      }
      if (mode === "REMOVE") {
        return api.post("/stock/remove", {
          flavourId,
          containerId,
          quantity: Number(quantity),
          note: note || undefined,
          allowNegative,
        });
      }
      if (mode === "TRANSFER") {
        return api.post("/stock/transfer", {
          flavourId,
          sourceContainerId: containerId,
          destContainerId,
          quantity: Number(quantity),
          note: note || undefined,
          allowNegative,
        });
      }
      return api.post("/stock/adjust", {
        flavourId,
        containerId,
        newQuantity: Number(newQuantity),
        note: note || undefined,
      });
    },
    onSuccess: () => {
      invalidateAll();
      toast(
        mode === "ADD"
          ? "Stock added"
          : mode === "REMOVE"
          ? "Stock removed"
          : mode === "TRANSFER"
          ? "Stock transferred"
          : "Stock adjusted"
      );
      onClose();
    },
    onError: (e: any) => setError(e.message || "Something went wrong"),
  });

  const canSubmit =
    mode === "ADJUST"
      ? containerId && newQuantity !== "" && !Number.isNaN(Number(newQuantity))
      : containerId &&
        quantity !== "" &&
        Number(quantity) > 0 &&
        (mode !== "TRANSFER" || (destContainerId && destContainerId !== containerId));

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{flavourLabel}</h2>
            <p className="text-xs text-slate-500">Update stock</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-1 rounded-lg bg-slate-100 p-1">
          {(["ADD", "REMOVE", "TRANSFER", "ADJUST"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md py-1.5 text-xs font-medium transition ${
                mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              {m === "ADD" ? "Add" : m === "REMOVE" ? "Remove" : m === "TRANSFER" ? "Transfer" : "Adjust"}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <div>
            <label className="label">{mode === "TRANSFER" ? "From container" : "Container"}</label>
            <select className="input" value={containerId} onChange={(e) => setContainerId(e.target.value)}>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {mode === "TRANSFER" && (
            <div>
              <label className="label">To container</label>
              <select className="input" value={destContainerId} onChange={(e) => setDestContainerId(e.target.value)}>
                <option value="">Select container</option>
                {containers
                  .filter((c) => c.id !== containerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}

          {mode === "ADJUST" ? (
            <div>
              <label className="label">New quantity (absolute value)</label>
              <input
                type="number"
                className="input"
                value={newQuantity}
                onChange={(e) => setNewQuantity(e.target.value)}
                placeholder="e.g. 120"
              />
            </div>
          ) : (
            <div>
              <label className="label">Quantity</label>
              <input
                type="number"
                min={1}
                className="input"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 20"
                autoFocus
              />
            </div>
          )}

          <div>
            <label className="label">Note / reference (optional)</label>
            <input
              type="text"
              className="input"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Invoice #123, restock, etc."
            />
          </div>

          {(mode === "REMOVE" || mode === "TRANSFER") && (
            <label className="flex items-center gap-2 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={allowNegative}
                onChange={(e) => setAllowNegative(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300"
              />
              Allow this to go negative (force adjustment)
            </label>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          <button
            className="btn-primary w-full py-3"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Saving..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
