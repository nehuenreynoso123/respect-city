import type { ReactNode } from 'react';

export interface StatChipProps {
  label: string;
  /** Bold gold value appended to the label (legacy `<b>` — level, coins). */
  value?: string | number;
  /** The `<Bar>` rendered under the label. */
  bar: ReactNode;
  /** Optional secondary line under the bar (legacy EXP text). */
  sub?: string;
}

/** Header stat block: label row + bar (+ optional sub-line). */
export function StatChip({ label, value, bar, sub }: StatChipProps) {
  return (
    <div className="stat">
      <div className="stat-label">
        {label}
        {value !== undefined && <b>{value}</b>}
      </div>
      {bar}
      {sub !== undefined && (
        <div className="stat-label" style={{ marginTop: 2 }}>
          <span>{sub}</span>
        </div>
      )}
    </div>
  );
}
