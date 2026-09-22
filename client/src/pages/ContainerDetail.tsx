import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { api, qs } from "../api/client";
import { Container, ContainerDetail as ContainerDetailType, Transaction } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { StockActionModal } from "../components/StockActionModal";
import { formatQty, formatDate, transactionLabel, transactionBadgeClass } from "../lib/format";

export function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [actionFlavour, setActionFlavour] = useState<{ id: string; label: string; qty: number } | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["container", id],
    queryFn: () => api.get<ContainerDetailType>(`/containers/${id}`),
    enabled: !!id,
  });

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  const { data: history } = useQuery({
    queryKey: ["transactions", { containerId: id }],
    queryFn: () => api.get<{ transactions: Transaction[] }>(`/transactions${qs({ containerId: id, pageSize: 20 })}`),
    enabled: !!id,
  });

  if (isLoading) return <Loading />;
  if (error || !data) return <ErrorState message="Could not load container." />;

  const filteredStock = data.stock.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.productName.toLowerCase().includes(q) ||
      s.flavourNameEn.toLowerCase().includes(q) ||
      (s.flavourNameRu?.toLowerCase().includes(q) ?? false) ||
      (s.code?.toLowerCase().includes(q) ?? false)
    );
  });

  return (
    <div className="space-y-5">
      <div>
        <Link to="/containers" className="text-xs text-slate-500 hover:underline">
          ← All containers
        </Link>
        <div className="mt-1 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">{data.name}</h1>
            {data.location && <p className="text-sm text-slate-500">{data.location}</p>}
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-slate-900">{formatQty(data.totalStock)}</p>
            <p className="text-xs text-slate-400">total units</p>
          </div>
        </div>
      </div>

      <input
        className="input"
        placeholder="Search stock in this container..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {filteredStock.length === 0 ? (
        <EmptyState message="No stock in this container yet." />
      ) : (
        <div className="space-y-2">
          {filteredStock.map((s) => (
            <div key={s.stockItemId} className="card flex items-center justify-between gap-3 p-3">
              <div className="min-w-0 flex-1">
                <Link to={`/products/${s.productId}`} className="truncate text-sm font-medium text-slate-900 hover:underline">
                  {s.productName} — {s.flavourNameEn}
                </Link>
                <p className="truncate text-xs text-slate-500">
                  {s.flavourNameRu ? `${s.flavourNameRu} · ` : ""}
                  {s.code ? `#${s.code}` : s.category}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className={`text-sm font-semibold ${s.quantity <= s.lowStockThreshold ? "text-red-600" : "text-slate-900"}`}>
                  {formatQty(s.quantity)}
                </span>
                <button
                  className="btn-secondary px-3 py-2 text-xs"
                  onClick={() => setActionFlavour({ id: s.flavourId, label: `${s.productName} — ${s.flavourNameEn}`, qty: s.quantity })}
                >
                  Update
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent activity in this container</h2>
        {!history || history.transactions.length === 0 ? (
          <p className="py-4 text-center text-xs text-slate-400">No activity yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {history.transactions.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-xs">
                <div className="min-w-0">
                  <span className={`badge mr-2 ${transactionBadgeClass(t.type)}`}>{t.type}</span>
                  <span className="text-slate-700">{transactionLabel(t)}</span>
                  <p className="truncate text-slate-400">
                    {t.flavour.product.name} — {t.flavour.nameEn}
                  </p>
                </div>
                <span className="shrink-0 text-slate-400">{formatDate(t.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {actionFlavour && containers && id && (
        <StockActionModal
          flavourId={actionFlavour.id}
          flavourLabel={actionFlavour.label}
          containers={containers}
          defaultContainerId={id}
          currentQuantity={actionFlavour.qty}
          onClose={() => setActionFlavour(null)}
        />
      )}
    </div>
  );
}
