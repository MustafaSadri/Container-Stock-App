import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api, qs } from "../api/client";
import { Container, ContainerDetail as ContainerDetailType, Transaction } from "../types";
import { Loading, ErrorState, EmptyState } from "../components/Feedback";
import { StockActionModal } from "../components/StockActionModal";
import { useToast } from "../components/ToastProvider";
import { formatQty, formatDate, transactionLabel, transactionBadgeClass } from "../lib/format";

export function ContainerDetail() {
  const { id } = useParams<{ id: string }>();
  const [search, setSearch] = useState("");
  const [actionFlavour, setActionFlavour] = useState<{ id: string; label: string; qty: number } | null>(null);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
        <div className="mt-1 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-slate-900">{data.name}</h1>
            {data.location && <p className="truncate text-sm text-slate-500">{data.location}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="text-2xl font-bold text-slate-900">{formatQty(data.totalStock)}</p>
            <p className="text-xs text-slate-400">total units</p>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => setShowEdit(true)}>
            Rename / edit
          </button>
          <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => setShowDelete(true)}>
            Delete container
          </button>
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

      {showEdit && id && (
        <EditContainerModal
          containerId={id}
          initialName={data.name}
          initialLocation={data.location}
          initialNotes={data.notes}
          onClose={() => setShowEdit(false)}
        />
      )}

      {showDelete && id && (
        <DeleteContainerModal containerId={id} containerName={data.name} onClose={() => setShowDelete(false)} />
      )}
    </div>
  );
}

function EditContainerModal({
  containerId,
  initialName,
  initialLocation,
  initialNotes,
  onClose,
}: {
  containerId: string;
  initialName: string;
  initialLocation: string | null;
  initialNotes: string | null;
  onClose: () => void;
}) {
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState(initialLocation ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();

  const mutation = useMutation({
    mutationFn: () => api.patch(`/containers/${containerId}`, { name, location, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["container", containerId] });
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Container updated");
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
        <h2 className="mb-4 text-base font-semibold text-slate-900">Edit container</h2>
        <div className="space-y-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="label">Location</label>
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <div className="flex gap-2">
            <button className="btn-secondary flex-1 py-3" onClick={onClose}>
              Cancel
            </button>
            <button className="btn-primary flex-1 py-3" disabled={!name.trim() || mutation.isPending} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Saving..." : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteContainerModal({
  containerId,
  containerName,
  onClose,
}: {
  containerId: string;
  containerName: string;
  onClose: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();
  const toast = useToast();
  const navigate = useNavigate();

  const mutation = useMutation({
    mutationFn: () => api.delete(`/containers/${containerId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["containers"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast("Container deleted");
      navigate("/containers");
    },
    onError: (e: any) => setError(e.message || "Something went wrong"),
  });

  const nameMatches = confirmText.trim() === containerName;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="w-full rounded-t-2xl bg-white p-5 sm:max-w-md sm:rounded-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        {step === 1 ? (
          <>
            <h2 className="mb-2 text-base font-semibold text-red-700">Delete "{containerName}"?</h2>
            <p className="mb-4 text-sm text-slate-600">
              This permanently deletes the container. It only works if the container has no stock left — transfer
              or remove all stock first. This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 py-3" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-danger flex-1 py-3" onClick={() => setStep(2)}>
                Continue
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="mb-2 text-base font-semibold text-red-700">Are you absolutely sure?</h2>
            <p className="mb-3 text-sm text-slate-600">
              Type <span className="font-semibold text-slate-900">{containerName}</span> below to confirm deletion.
            </p>
            <input
              className="input mb-3"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={containerName}
              autoFocus
            />
            {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            <div className="flex gap-2">
              <button className="btn-secondary flex-1 py-3" onClick={onClose}>
                Cancel
              </button>
              <button
                className="btn-danger flex-1 py-3"
                disabled={!nameMatches || mutation.isPending}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
