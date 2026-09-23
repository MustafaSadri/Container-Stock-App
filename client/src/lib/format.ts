import { Transaction } from "../types";

export function formatQty(n: number): string {
  return n.toLocaleString("en-US");
}

// "YYYY-MM-DDTHH:mm" in local time, suitable as the default value of an <input type="datetime-local">
export function toLocalDatetimeInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export function transactionLabel(t: Transaction): string {
  switch (t.type) {
    case "ADD":
      return `+${formatQty(t.quantity)} added${t.destContainer ? ` to ${t.destContainer.name}` : ""}`;
    case "REMOVE":
      return `-${formatQty(t.quantity)} removed${t.sourceContainer ? ` from ${t.sourceContainer.name}` : ""}`;
    case "TRANSFER":
      return `${formatQty(t.quantity)} transferred: ${t.sourceContainer?.name ?? "?"} → ${t.destContainer?.name ?? "?"}`;
    case "ADJUST":
      return `Adjusted by ${t.quantity >= 0 ? "+" : ""}${formatQty(t.quantity)}`;
    case "IMPORT":
      return `Initial import: ${formatQty(t.quantity)}`;
    default:
      return t.type;
  }
}

export function transactionBadgeClass(type: Transaction["type"]): string {
  switch (type) {
    case "ADD":
    case "IMPORT":
      return "bg-emerald-50 text-emerald-700";
    case "REMOVE":
      return "bg-red-50 text-red-700";
    case "TRANSFER":
      return "bg-blue-50 text-blue-700";
    case "ADJUST":
      return "bg-amber-50 text-amber-700";
    default:
      return "bg-slate-100 text-slate-700";
  }
}
