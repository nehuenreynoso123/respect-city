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
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="check-box">✓</span>
      <span className="check-text">{label}</span>
    </li>
  );
}
