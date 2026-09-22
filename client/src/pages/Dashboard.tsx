import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { DashboardData } from "../types";
import { Loading, ErrorState } from "../components/Feedback";
import { transactionLabel, formatDate, formatQty } from "../lib/format";

export function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<DashboardData>("/dashboard"),
  });

  if (isLoading) return <Loading label="Loading dashboard..." />;
  if (error || !data) return <ErrorState message="Could not load dashboard." />;

  const maxCategory = Math.max(1, ...data.byCategory.map((c) => c.quantity));
  const maxContainer = Math.max(1, ...data.byContainer.map((c) => c.totalStock));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Overview of your entire inventory</p>
        </div>
        <a href="/api/reports/stock.csv" download className="btn-secondary shrink-0 text-xs">
          ⬇ Download report
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Total stock" value={formatQty(data.totalStock)} accent="bg-brand-50 text-brand-700" />
        <StatCard label="Containers" value={String(data.totalContainers)} accent="bg-emerald-50 text-emerald-700" />
        <StatCard label="Products" value={String(data.totalProducts)} accent="bg-amber-50 text-amber-700" />
        <StatCard label="Flavours / SKUs" value={String(data.totalFlavours)} accent="bg-purple-50 text-purple-700" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Stock by container</h2>
          <div className="space-y-3">
            {data.byContainer.map((c) => (
              <Link key={c.containerId} to={`/containers/${c.containerId}`} className="block">
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{c.containerName}</span>
                  <span className="text-slate-500">{formatQty(c.totalStock)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-brand-500"
                    style={{ width: `${(c.totalStock / maxContainer) * 100}%` }}
                  />
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 text-sm font-semibold text-slate-900">Stock by category</h2>
          <div className="space-y-3">
            {data.byCategory.map((c) => (
              <div key={c.category}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700">{c.category}</span>
                  <span className="text-slate-500">{formatQty(c.quantity)}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-emerald-500"
                    style={{ width: `${(c.quantity / maxCategory) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Recent transactions</h2>
        {data.recentTransactions.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">No transactions yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.recentTransactions.map((t) => (
              <li key={t.id} className="py-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-800">{transactionLabel(t)}</span>
                  <span className="text-slate-400">{formatDate(t.createdAt)}</span>
                </div>
                <p className="truncate text-slate-500">
                  {t.flavour.product.name} — {t.flavour.nameEn}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="card p-4">
      <div className={`mb-2 inline-flex rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${accent}`}>
        {label}
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
    </div>
  );
}
