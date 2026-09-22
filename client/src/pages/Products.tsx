import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, qs } from "../api/client";
import { Product } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { useToast } from "../components/ToastProvider";
import { formatQty } from "../lib/format";

export function Products() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [brand, setBrand] = useState("");
  const [showForm, setShowForm] = useState(false);

  const { data: meta } = useQuery({
    queryKey: ["meta"],
    queryFn: () => api.get<{ brands: string[]; categories: string[] }>("/products/meta/brands-categories"),
  });

  const params = useMemo(
    () => ({ search: search || undefined, category: category || undefined, brand: brand || undefined }),
    [search, category, brand]
  );

  const { data, isLoading, error } = useQuery({
    queryKey: ["products", params],
    queryFn: () => api.get<Product[]>(`/products${qs(params)}`),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500">Models and their flavours</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="input flex-1 min-w-[200px]"
          placeholder="Search brand, model, flavour, code..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select className="input w-auto" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {meta?.categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select className="input w-auto" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">All brands</option>
          {meta?.brands.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load products." />}
      {data && data.length === 0 && <EmptyState message="No products match your search." />}

      {data && data.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((p) => (
            <Link key={p.id} to={`/products/${p.id}`} className="card block p-4 transition hover:shadow-md">
              <p className="text-sm font-semibold text-slate-900">{p.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {p.category && <span className="badge bg-slate-100 text-slate-600">{p.category}</span>}
                {p.brand && <span className="badge bg-slate-100 text-slate-600">{p.brand}</span>}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{p.flavourCount ?? 0} flavours</span>
                <span className="text-lg font-bold text-slate-900">{formatQty(p.totalStock)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <NewProductModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function NewProductModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [unit, setUnit] = useState("pcs");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.post<Product>("/products", { name, brand, category, unit }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["meta"] });
      toast("Product created — now add its flavours from the product page");
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
        <h2 className="mb-4 text-base font-semibold text-slate-900">New product / model</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Full name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. ELFBAR TOWN 10000" autoFocus />
          </div>
          <div>
            <label className="label">Brand</label>
            <input className="input" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="e.g. ELFBAR" />
          </div>
          <div>
            <label className="label">Category</label>
            <input className="input" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="e.g. Disposables" />
          </div>
          <div>
            <label className="label">Unit</label>
            <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Creating..." : "Create product"}
          </button>
        </div>
      </div>
    </div>
  );
}
