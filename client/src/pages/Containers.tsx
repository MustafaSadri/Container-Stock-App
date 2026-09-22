import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Container } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { useToast } from "../components/ToastProvider";
import { formatQty } from "../lib/format";

export function Containers() {
  const [showForm, setShowForm] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["containers"],
    queryFn: () => api.get<Container[]>("/containers"),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Containers</h1>
          <p className="text-sm text-slate-500">Warehouses, stores, vehicles or any place you keep stock</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>
          + New
        </button>
      </div>

      {isLoading && <Loading />}
      {error && <ErrorState message="Could not load containers." />}
      {data && data.length === 0 && <EmptyState message="No containers yet. Create one to get started." />}

      {data && data.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((c) => (
            <Link key={c.id} to={`/containers/${c.id}`} className="card block p-4 transition hover:shadow-md">
              <p className="text-sm font-semibold text-slate-900">{c.name}</p>
              {c.location && <p className="mt-0.5 text-xs text-slate-500">{c.location}</p>}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-slate-400">{c.skuCount ?? 0} SKUs</span>
                <span className="text-lg font-bold text-slate-900">{formatQty(c.totalStock)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showForm && <NewContainerModal onClose={() => setShowForm(false)} />}
    </div>
  );
}

function NewContainerModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.post("/containers", { name, location, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Container created");
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
        <h2 className="mb-4 text-base font-semibold text-slate-900">New container</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Warehouse B" autoFocus />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Baku, Yasamal district" />
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <button className="btn-primary w-full py-3" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Creating..." : "Create container"}
          </button>
        </div>
      </div>
    </div>
  );
}
