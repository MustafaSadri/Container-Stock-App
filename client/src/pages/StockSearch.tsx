import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, qs } from "../api/client";
import { Container, StockRow } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { StockActionModal } from "../components/StockActionModal";
import { FlavourHistoryModal } from "../components/FlavourHistoryModal";
import { formatQty } from "../lib/format";

interface FlavourGroup {
  flavourId: string;
  productId: string;
  productName: string;
  flavourNameEn: string;
  flavourNameRu: string | null;
  code: string | null;
  category: string | null;
  brand: string | null;
  lowStockThreshold: number;
  totalQty: number;
  isLowStock: boolean;
  containers: { containerId: string; containerName: string; location: string | null; quantity: number }[];
}

function groupByFlavour(rows: StockRow[]): FlavourGroup[] {
  const map = new Map<string, FlavourGroup>();
  for (const r of rows) {
    let g = map.get(r.flavourId);
    if (!g) {
      g = {
        flavourId: r.flavourId,
        productId: r.productId,
        productName: r.productName,
        flavourNameEn: r.flavourNameEn,
        flavourNameRu: r.flavourNameRu,
        code: r.code,
        category: r.category,
        brand: r.brand,
        lowStockThreshold: r.lowStockThreshold,
        totalQty: 0,
        isLowStock: false,
        containers: [],
      };
      map.set(r.flavourId, g);
    }
    g.totalQty += r.quantity;
    g.containers.push({ containerId: r.containerId, containerName: r.containerName, location: r.location, quantity: r.quantity });
  }
  const groups = Array.from(map.values());
  for (const g of groups) {
    g.isLowStock = g.totalQty <= g.lowStockThreshold;
    g.containers.sort((a, b) => b.quantity - a.quantity);
  }
  groups.sort((a, b) => b.totalQty - a.totalQty);
  return groups;
}

export function StockSearch() {
  const [search, setSearch] = useState("");
  const [containerId, setContainerId] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [minQty, setMinQty] = useState("");
  const [maxQty, setMaxQty] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [actionGroup, setActionGroup] = useState<FlavourGroup | null>(null);
  const [historyGroup, setHistoryGroup] = useState<FlavourGroup | null>(null);

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

  const groups = useMemo(() => (data ? groupByFlavour(data) : []), [data]);

  const activeFilterCount = [containerId, category, brand, lowStockOnly, minQty, maxQty].filter(Boolean).length;

  const reportUrl = `/api/reports/stock.csv${qs({ search: search || undefined, category: category || undefined, brand: brand || undefined })}`;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Stock</h1>
          <p className="text-sm text-slate-500">Search by product or model — see stock across every container</p>
        </div>
        <a href={reportUrl} download className="btn-secondary shrink-0 text-xs">
          ⬇ CSV
        </a>
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
      {groups.length === 0 && !isLoading && <EmptyState message="No stock items match your filters." />}

      {groups.length > 0 && (
        <>
          <p className="text-xs text-slate-500">
            {groups.length} flavour{groups.length === 1 ? "" : "s"}
          </p>
          <div className="space-y-2">
            {groups.map((g) => (
              <div key={g.flavourId} className="card p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-900">
                      {g.productName} — {g.flavourNameEn}
                    </p>
                    <p className="truncate text-xs text-slate-500">
                      {g.flavourNameRu ? `${g.flavourNameRu} · ` : ""}
                      {g.code ? `#${g.code}` : g.category}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className={`text-sm font-semibold ${g.isLowStock ? "text-red-600" : "text-slate-900"}`}>
                      {formatQty(g.totalQty)}
                    </span>
                    <button className="btn-secondary px-3 py-2 text-xs" onClick={() => setActionGroup(g)}>
                      Update
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {g.containers.map((c) => (
                    <span key={c.containerId} className="badge bg-slate-100 text-slate-600">
                      {c.containerName}: {formatQty(c.quantity)}
                    </span>
                  ))}
                  <button
                    className="ml-auto text-xs text-brand-600 hover:underline"
                    onClick={() => setHistoryGroup(g)}
                  >
                    History
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {actionGroup && containers && (
        <StockActionModal
          flavourId={actionGroup.flavourId}
          flavourLabel={`${actionGroup.productName} — ${actionGroup.flavourNameEn}`}
          containers={containers}
          defaultContainerId={actionGroup.containers[0]?.containerId}
          currentQuantity={actionGroup.containers[0]?.quantity}
          onClose={() => setActionGroup(null)}
        />
      )}

      {historyGroup && (
        <FlavourHistoryModal
          flavourId={historyGroup.flavourId}
          flavourLabel={`${historyGroup.productName} — ${historyGroup.flavourNameEn}`}
          onClose={() => setHistoryGroup(null)}
        />
      )}
    </div>
  );
}
