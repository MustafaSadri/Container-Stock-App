import { useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { Transaction } from "../types";
import { Loading } from "./Feedback";
import { TransactionList } from "./TransactionList";

interface Props {
  flavourId: string;
  flavourLabel: string;
  onClose: () => void;
}

export function FlavourHistoryModal({ flavourId, flavourLabel, onClose }: Props) {
  const { data, isLoading } = useQuery({
    queryKey: ["flavourHistory", flavourId],
    queryFn: () => api.get<Transaction[]>(`/products/flavours/${flavourId}/history`),
  });

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        className="max-h-[80vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 sm:max-w-lg sm:rounded-2xl"
        style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{flavourLabel}</h2>
            <p className="text-xs text-slate-500">Transaction history</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>

        {isLoading ? <Loading label="Loading history..." /> : <TransactionList transactions={data ?? []} />}
      </div>
    </div>
  );
}
