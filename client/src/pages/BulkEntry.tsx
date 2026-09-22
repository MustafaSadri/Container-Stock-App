import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { Container, Product, ProductDetail } from "../types";
import { Loading, ErrorState } from "../components/Feedback";
import { useToast } from "../components/ToastProvider";
import { formatQty } from "../lib/format";

type Mode = "ADD" | "REMOVE" | "TRANSFER";

export function BulkEntry() {
  const [productId, setProductId] = useState("");
  const [productSearch, setProductSearch] = useState("");
  const [mode, setMode] = useState<Mode>("ADD");
  const [containerId, setContainerId] = useState("");
  const [destContainerId, setDestContainerId] = useState("");
  const [note, setNote] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [resultMsg, setResultMsg] = useState<string | null>(null);

  const qc = useQueryClient();
  const toast = useToast();

  const { data: products } = useQuery({
    queryKey: ["products", {}],
    queryFn: () => api.get<Product[]>("/products"),
  });

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  const { data: product, isLoading: loadingProduct } = useQuery({
    queryKey: ["product", productId],
    queryFn: () => api.get<ProductDetail>(`/products/${productId}`),
    enabled: !!productId,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter((p) => p.name.toLowerCase().includes(q) || p.brand?.toLowerCase().includes(q));
  }, [products, productSearch]);

  const currentQtyFor = (flavourId: string, cId: string): number => {
    const f = product?.flavours.find((fl) => fl.id === flavourId);
    return f?.byContainer.find((c) => c.containerId === cId)?.quantity ?? 0;
  };

  const lines = useMemo(
    () =>
      Object.entries(quantities)
        .map(([flavourId, qty]) => ({ flavourId, quantity: Number(qty) }))
        .filter((l) => l.quantity > 0),
    [quantities]
  );

  const totalUnits = lines.reduce((s, l) => s + l.quantity, 0);

  const mutation = useMutation({
    mutationFn: () =>
      api.post<{ succeeded: number; failed: number; errors: { flavourId: string; error: string }[] }>("/stock/bulk", {
        type: mode,
        containerId: mode !== "TRANSFER" ? containerId : undefined,
        sourceContainerId: mode === "TRANSFER" ? containerId : undefined,
        destContainerId: mode === "TRANSFER" ? destContainerId : undefined,
        lines,
        note: note || undefined,
        allowNegative,
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["stock"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["container"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["transactions"] });
      if (res.failed > 0) {
        setResultMsg(`${res.succeeded} succeeded, ${res.failed} failed: ${res.errors.map((e) => e.error).join("; ")}`);
      } else {
        toast(`Saved: ${res.succeeded} flavour${res.succeeded === 1 ? "" : "s"} updated`);
        setQuantities({});
        setNote("");
        setResultMsg(null);
      }
    },
    onError: (e: any) => setError(e.message || "Something went wrong"),
  });

  const canSubmit =
    lines.length > 0 && containerId && (mode !== "TRANSFER" || (destContainerId && destContainerId !== containerId));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Bulk entry</h1>
        <p className="text-sm text-slate-500">Pick a model and update many flavours in one go</p>
      </div>

      <div className="card space-y-4 p-4">
        <div>
          <label className="label">1. Product / model</label>
          {!productId ? (
            <>
              <input
                className="input"
                placeholder="Search product to select..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
              />
              <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm hover:bg-slate-50"
                    onClick={() => setProductId(p.id)}
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="shrink-0 text-xs text-slate-400">{p.flavourCount} flavours</span>
                  </button>
                ))}
                {filteredProducts.length === 0 && <p className="p-3 text-xs text-slate-400">No products found.</p>}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5">
              <span className="text-sm font-medium text-slate-900">{product?.name ?? "Loading..."}</span>
              <button
                className="text-xs text-brand-600 hover:underline"
                onClick={() => {
                  setProductId("");
                  setQuantities({});
                }}
              >
                Change
              </button>
            </div>
          )}
        </div>

        <div>
          <label className="label">2. Operation</label>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-slate-100 p-1">
            {(["ADD", "REMOVE", "TRANSFER"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md py-2 text-xs font-medium transition ${
                  mode === m ? "bg-white text-slate-900 shadow-sm" : "text-slate-500"
                }`}
              >
                {m === "ADD" ? "Add stock" : m === "REMOVE" ? "Remove stock" : "Transfer"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">{mode === "TRANSFER" ? "3. From container" : "3. Container"}</label>
            <select className="input" value={containerId} onChange={(e) => setContainerId(e.target.value)}>
              <option value="">Select container</option>
              {containers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {mode === "TRANSFER" && (
            <div>
              <label className="label">4. To container</label>
              <select className="input" value={destContainerId} onChange={(e) => setDestContainerId(e.target.value)}>
                <option value="">Select container</option>
                {containers
                  ?.filter((c) => c.id !== containerId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </div>

        {(mode === "REMOVE" || mode === "TRANSFER") && (
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input
              type="checkbox"
              checked={allowNegative}
              onChange={(e) => setAllowNegative(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300"
            />
            Allow going negative where stock is insufficient
          </label>
        )}

        <div>
          <label className="label">Note / reference (optional, applies to all lines)</label>
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Weekly restock, PO #45" />
        </div>
      </div>

      {productId && (
        <div className="card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Enter quantities per flavour</h2>
            {totalUnits > 0 && <span className="badge bg-brand-50 text-brand-700">{formatQty(totalUnits)} units · {lines.length} flavours</span>}
          </div>

          {loadingProduct && <Loading />}
          {product && (
            <div className="space-y-1.5">
              {product.flavours.map((f) => (
                <div key={f.id} className="flex items-center gap-3 border-b border-slate-100 py-1.5 last:border-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-slate-800">{f.nameEn}</p>
                    {containerId && (
                      <p className="text-[11px] text-slate-400">Currently: {formatQty(currentQtyFor(f.id, containerId))}</p>
                    )}
                  </div>
                  <input
                    type="number"
                    min={0}
                    className="input w-24 text-right"
                    placeholder="0"
                    value={quantities[f.id] ?? ""}
                    onChange={(e) => setQuantities((q) => ({ ...q, [f.id]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <ErrorState message={error} />}
      {resultMsg && <ErrorState message={resultMsg} />}

      <button className="btn-primary sticky bottom-20 w-full py-3.5 shadow-lg sm:bottom-4" disabled={!canSubmit || mutation.isPending} onClick={() => mutation.mutate()}>
        {mutation.isPending
          ? "Saving..."
          : `${mode === "ADD" ? "Add" : mode === "REMOVE" ? "Remove" : "Transfer"} ${totalUnits > 0 ? formatQty(totalUnits) + " units" : "stock"}`}
      </button>
    </div>
  );
}
