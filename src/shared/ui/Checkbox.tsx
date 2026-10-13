export interface CheckboxProps {
  /** Legacy `data-item` id on the row (kept for DOM parity). */
  itemId: string;
  checked: boolean;
  label: string;
  onChange: (checked: boolean) => void;
}

/** Arcade checklist row: hidden input + styled box (legacy `.check-item`). */
export function Checkbox({ itemId, checked, label, onChange }: CheckboxProps) {
  return (
    <li className="check-item" data-item={itemId}>
      {/* The native box is `display:none` (custom check-box below), so the row
          must be a <label> for clicks to reach the control. Without this the
          whole checklist is inert — nothing toggles on click. */}
      <label className="check-label">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span className="check-box">✓</span>
        <span className="check-text">{label}</span>
      </label>
    </li>
  );
}
