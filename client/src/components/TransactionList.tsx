import { Transaction } from "../types";
import { formatDate, transactionBadgeClass, transactionLabel } from "../lib/format";
import { DeleteTransactionButton } from "./DeleteTransactionButton";

interface Props {
  transactions: Transaction[];
  // Show which product/flavour each row belongs to — useful when the list spans many
  // flavours (e.g. a container's activity feed); redundant when already filtered to one.
  showFlavour?: boolean;
}

export function TransactionList({ transactions, showFlavour = false }: Props) {
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
            {showFlavour && (
              <p className="truncate text-slate-400">
                {t.flavour.product.name} — {t.flavour.nameEn}
              </p>
            )}
            {t.note && <p className="truncate text-slate-400">{t.note}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-slate-400">{formatDate(t.createdAt)}</span>
            <DeleteTransactionButton transactionId={t.id} label={transactionLabel(t)} />
          </div>
        </li>
      ))}
    </ul>
  );
}
