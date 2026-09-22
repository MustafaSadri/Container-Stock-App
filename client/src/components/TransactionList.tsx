import { Transaction } from "../types";
import { formatDate, transactionBadgeClass, transactionLabel } from "../lib/format";

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="py-4 text-center text-xs text-slate-400">No transactions yet.</p>;
  }

  return (
    <ul className="divide-y divide-slate-100">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between gap-2 py-2 text-xs">
          <div className="min-w-0">
            <span className={`badge mr-2 ${transactionBadgeClass(t.type)}`}>{t.type}</span>
            <span className="text-slate-700">{transactionLabel(t)}</span>
            {t.note && <p className="truncate text-slate-400">{t.note}</p>}
          </div>
          <span className="shrink-0 text-slate-400">{formatDate(t.createdAt)}</span>
        </li>
      ))}
    </ul>
  );
}
