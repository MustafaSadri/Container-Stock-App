import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { Container, FlavourDetail, ProductDetail as ProductDetailType, Transaction } from "../types";
import { Loading, ErrorState } from "../components/Feedback";
import { StockActionModal } from "../components/StockActionModal";
import { TransactionList } from "../components/TransactionList";
import { useToast } from "../components/ToastProvider";
import { formatQty } from "../lib/format";

export function ProductDetail() {
  const { id } = useParams<{ id: string }>();
  const [actionFlavour, setActionFlavour] = useState<FlavourDetail | null>(null);
  const [historyFlavourId, setHistoryFlavourId] = useState<string | null>(null);
  const [showAddFlavour, setShowAddFlavour] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ["product", id],
    queryFn: () => api.get<ProductDetailType>(`/products/${id}`),
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message="Could not load product." />;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/products" className="text-xs text-slate-500 hover:underline">
          ← All products
        </Link>
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900">{data.name}</h1>
            <div className="mt-1 flex flex-wrap gap-1">
              {data.category && <span className="badge bg-slate-100 text-slate-600">{data.category}</span>}
              {data.brand && <span className="badge bg-slate-100 text-slate-600">{data.brand}</span>}
            </div>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-slate-900">{formatQty(data.totalStock)}</p>
            <p className="text-xs text-slate-400">total units</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Flavours ({data.flavours.length})</h2>
        <button className="btn-secondary text-xs" onClick={() => setShowAddFlavour(true)}>
          + Add flavour
        </button>
      </div>

      <div className="space-y-2">
        {data.flavours.map((f) => (
          <div key={f.id} className="card p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">
                  {f.nameEn}
                  {f.code ? <span className="ml-2 text-xs font-normal text-slate-400">#{f.code}</span> : null}
                </p>
                {f.nameRu && <p className="truncate text-xs text-slate-500">{f.nameRu}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span className={`text-sm font-semibold ${f.totalStock <= f.lowStockThreshold ? "text-red-600" : "text-slate-900"}`}>
                  {formatQty(f.totalStock)}
                </span>
                <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setActionFlavour(f)}>
                  Update
                </button>
              </div>
            </div>

            {f.byContainer.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {f.byContainer.map((c) => (
                  <span key={c.containerId} className="badge bg-slate-100 text-slate-600">
                    {c.containerName}: {formatQty(c.quantity)}
                  </span>
                ))}
              </div>
            )}

            <button
              className="mt-2 text-xs text-brand-600 hover:underline"
              onClick={() => setHistoryFlavourId(historyFlavourId === f.id ? null : f.id)}
            >
              {historyFlavourId === f.id ? "Hide history" : "View transaction history"}
            </button>

            {historyFlavourId === f.id && <FlavourHistory flavourId={f.id} />}
          </div>
        ))}
      </div>

      {actionFlavour && containers && (
        <StockActionModal
          flavourId={actionFlavour.id}
          flavourLabel={`${data.name} — ${actionFlavour.nameEn}`}
          containers={containers}
          currentQuantity={actionFlavour.totalStock}
          onClose={() => setActionFlavour(null)}
        />
      )}

      {showAddFlavour && id && <AddFlavourModal productId={id} onClose={() => setShowAddFlavour(false)} />}
    </div>
  );
}

function FlavourHistory({ flavourId }: { flavourId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["flavourHistory", flavourId],
    queryFn: () => api.get<Transaction[]>(`/products/flavours/${flavourId}/history`),
  });

  if (isLoading) return <p className="py-3 text-xs text-slate-400">Loading history...</p>;

  return (
    <div className="mt-2 border-t border-slate-100">
      <TransactionList transactions={data ?? []} />
    </div>
  );
}

function AddFlavourModal({ productId, onClose }: { productId: string; onClose: () => void }) {
  const [nameEn, setNameEn] = useState("");
  const [nameRu, setNameRu] = useState("");
  const [code, setCode] = useState("");
  const [lowStockThreshold, setLowStockThreshold] = useState("50");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/products/${productId}/flavours`, {
        nameEn,
        nameRu: nameRu || undefined,
        code: code || undefined,
        lowStockThreshold: Number(lowStockThreshold) || 50,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product", productId] });
      qc.invalidateQueries({ queryKey: ["products"] });
      toast("Flavour added");
      onClose();
    },
    onError: (e: any) => setError(e.message || "Something went wrong"),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-4 text-base font-semibold text-slate-900">Add flavour</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Flavour name (English)</label>
            <input className="input" value={nameEn} onChange={(e) => setNameEn(e.target.value)} autoFocus placeholder="e.g. Watermelon Ice" />
          </div>
          <div>
            <label className="label">Flavour name (Russian, optional)</label>
            <input className="input" value={nameRu} onChange={(e) => setNameRu(e.target.value)} placeholder="e.g. Ледяной Арбуз" />
          </div>
          <div>
            <label className="label">Code / SKU (optional)</label>
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div>
            <label className="label">Low stock threshold</label>
            <input type="number" className="input" value={lowStockThreshold} onChange={(e) => setLowStockThreshold(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={!nameEn.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Adding..." : "Add flavour"}
          </button>
        </div>
      </div>
    </div>
  );
}
