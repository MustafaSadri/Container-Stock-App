import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "../api/client";
import { Container, StockRow } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { StockActionModal } from "../components/StockActionModal";
import { formatQty } from "../lib/format";

export function StockSearch() {
  const [search, setSearch] = useState("");
  const [containerId, setContainerId] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [actionRow, setActionRow] = useState<StockRow | null>(null);

  const { data: containers } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api.get<{ brands: string[]; categories: string[] }>("/products/meta/brands-categories"),
  });

  const params = useMemo(
    () => ({
      search: search || undefined,
      containerId: containerId || undefined,
      category: category || undefined,
      brand: brand || undefined,
      lowStockOnly: lowStockOnly || undefined,
      minQty: minQty || undefined,
      maxQty: maxQty || undefined,
    }),
    [search, containerId, category, brand, lowStockOnly, minQty, maxQty]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["stock", params],
    queryFn: () => api.get<StockRow[]>(`/stock${qs(params)}`),
  });

  const activeFilterCount = [containerId, category, brand, lowStockOnly, minQty, maxQty].filter(Boolean).length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Stock</h1>
        <p className="text-sm text-slate-500">Search and filter across every container</p>
      </div>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Search product, flavour, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button
          className={`btn-secondary shrink-0 ${activeFilterCount ? "ring-1 ring-brand-500" : ""}`}
          onClick={() => setShowFilters((v) => !v)}
        >
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ""}
        </button>
      </div>

      {showFilters && (
        <div className="card grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
          <div>
            <label className="label">Container</label>
            <select className="input" value={containerId} onChange={(e) => setContainerId(e.target.value)}>
              <option value="">All containers</option>
              {containers?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">All categories</option>
              {meta?.categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Brand</label>
            <select className="input" value={brand} onChange={(e) => setBrand(e.target.value)}>
              <option value="">All brands</option>
              {meta?.brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-slate-300"
                checked={lowStockOnly}
                onChange={(e) => setLowStockOnly(e.target.checked)}
              />
              Low stock only
            </label>
          </div>
          <div>
            <label className="label">Min quantity</label>
            <input type="number" className="input" value={minQty} onChange={(e) => setMinQty(e.target.value)} />
          </div>
          <div>
            <label className="label">Max quantity</label>
            <input type="number" className="input" value={maxQty} onChange={(e) => setMaxQty(e.target.value)} />
          </div>
          <div className="col-span-2 flex items-end sm:col-span-2">
            <button
              className="btn-secondary"
              onClick={() => {
                setContainerId("");
                setCategory("");
                setBrand("");
                setLowStockOnly(false);
                setMinQty("");
                setMaxQty("");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      )}

      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load stock." />}
      {data && data.length === 0 && <EmptyState message="No stock items match your filters." />}

      {data && data.length > 0 && (
        <>
          <p className="text-xs text-slate-500">{data.length} result{data.length === 1 ? "" : "s"}</p>
          <div className="space-y-2">
            {data.map((row) => (
              <div key={row.stockItemId} className="card flex items-center justify-between gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {row.productName} — {row.flavourNameEn}
                  </p>
                  <p className="truncate text-xs text-slate-500">
                    {row.flavourNameRu ? `${row.flavourNameRu} · ` : ""}
                    {row.containerName}
                    {row.location ? ` · ${row.location}` : ""}
                    {row.code ? ` · #${row.code}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span
                    className={`text-sm font-semibold ${
                      row.isLowStock ? "text-red-600" : "text-slate-900"
                    }`}
                  >
                    {formatQty(row.quantity)}
                  </span>
                  <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setActionRow(row)}>
                    Update
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {actionRow && containers && (
        <StockActionModal
          flavourId={actionRow.flavourId}
          flavourLabel={`${actionRow.productName} — ${actionRow.flavourNameEn}`}
          containers={containers}
          defaultContainerId={actionRow.containerId}
          currentQuantity={actionRow.quantity}
          onClose={() => setActionRow(null)}
        />
      )}
    </div>
  );
}
