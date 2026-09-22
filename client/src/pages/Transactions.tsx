import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "../api/client";
import { Container, Transaction, TransactionType } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { formatDate, formatQty, transactionBadgeClass, transactionLabel } from "../lib/format";

const TYPES: TransactionType[] = ["ADD", "REMOVE", "TRANSFER", "ADJUST", "IMPORT"];

export function Transactions() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [containerId, setContainerId] = useState("");
  const [page, setPage] = useState(1);

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  const params = useMemo(
    () => ({ search: search || undefined, type: type || undefined, containerId: containerId || undefined, page, pageSize: 30 }),
    [search, type, containerId, page]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["transactions", params],
    queryFn: () => api.get<{ total: number; page: number; pageSize: number; transactions: Transaction[] }>(`/transactions${qs(params)}`),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Transaction history</h1>
        <p className="text-sm text-slate-500">Every stock change, ever</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search product, flavour, note, reference..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className="input w-auto"
          value={type}
          onChange={(e) => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="input w-auto"
          value={containerId}
          onChange={(e) => {
            setContainerId(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All containers</option>
          {containers?.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load transactions." />}
      {data && data.transactions.length === 0 && <EmptyState message="No transactions match your filters." />}

      {data && data.transactions.length > 0 && (
        <>
          <div className="card divide-y divide-slate-100">
            {data.transactions.map((t) => (
              <div key={t.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className={`badge mr-2 ${transactionBadgeClass(t.type)}`}>{t.type}</span>
                    <span className="text-sm text-slate-800">{transactionLabel(t)}</span>
                    <p className="truncate text-xs text-slate-500">
                      {t.flavour.product.name} — {t.flavour.nameEn}
                    </p>
                    {t.note && <p className="truncate text-xs text-slate-400">Note: {t.note}</p>}
                    {t.reference && <p className="truncate text-xs text-slate-400">Ref: {t.reference}</p>}
                  </div>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(t.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {data.page} of {totalPages} · {formatQty(data.total)} total
            </span>
            <div className="flex gap-2">
              <button className="btn-secondary px-3 py-1.5" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                Prev
              </button>
              <button className="btn-secondary px-3 py-1.5" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
