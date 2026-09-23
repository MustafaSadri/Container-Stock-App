import { InputHTMLAttributes } from "react";

// A plain numeric text field: no up/down spinner, and mouse-wheel scroll never changes
// the value (it just blurs instead) — typing the exact number is the only way to change it.
export function NumberInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      type="number"
      inputMode="numeric"
      className={`input ${className}`}
      onWheel={(e) => e.currentTarget.blur()}
      {...props}
    />
  );
}
