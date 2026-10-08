import { useEffect, useRef } from 'react';

import type { CategoryKey } from '@/slices/mission/domain/categories';
import type { MissionInput } from '@/slices/mission/application/commands';
import { uid } from '@/slices/mission/domain/ids';

import { validateDraft, type MissionDraft } from './missionDraft';

/** Legacy `<option>` labels (index.html:736-739). */
const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: 'gym', label: '💪 Gym' },
  { key: 'code', label: '💻 Study / Code' },
  { key: 'work', label: '💼 Work' },
  { key: 'health', label: '❤️ Health' },
];

export interface CreateMissionModalProps {
  /** Legacy backdrop visibility — false while "Pick on map" crosshair mode is active. */
  open: boolean;
  /** Legacy `ui.draft` — owned by the caller so a map pick can update it. */
  draft: MissionDraft;
  onDraftChange: (draft: MissionDraft) => void;
  /** Validated submit: caller dispatches `createMission` with this input. */
  onCreate: (input: MissionInput) => void;
  /** Cancel button / backdrop click. */
  onCancel: () => void;
  /** "📍 Pick on map": caller enables crosshair mode and hides the modal. */
  onPickOnMap: () => void;
}

/**
 * Create-mission modal (legacy openCreateModal / renderDraftItems /
 * updateLocBox, index.html:1394-1506). Validates on save with the legacy
 * alert messages, then hands a ready MissionInput to the caller.
 * Location comes from props only — pick-on-map is wired by the app root.
 */
export function CreateMissionModal({
  open,
  draft,
  onDraftChange,
  onCreate,
  onCancel,
  onPickOnMap,
}: CreateMissionModalProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const focusLastRef = useRef(false);

  // Legacy focuses the title on open (openCreateModal) …
  useEffect(() => {
    if (open) titleRef.current?.focus();
  }, [open]);

  // … and the newest row after "+ Add checklist item".
  useEffect(() => {
    if (!focusLastRef.current || !rowsRef.current) return;
    focusLastRef.current = false;
    const inputs = rowsRef.current.querySelectorAll<HTMLInputElement>('[data-cl-input]');
    inputs[inputs.length - 1]?.focus();
  });

  if (!open) return null;

  const patch = (changes: Partial<MissionDraft>) => onDraftChange({ ...draft, ...changes });

  const setItemText = (index: number, text: string) =>
    patch({ items: draft.items.map((item, i) => (i === index ? { ...item, text } : item)) });

  const addItem = () => {
    focusLastRef.current = true;
    patch({ items: [...draft.items, { id: uid(), text: '' }] });
  };

  const removeItem = (index: number) => {
    // Legacy keeps at least one row: removing the last one just clears it.
    if (draft.items.length === 1) {
      patch({ items: [{ id: draft.items[0].id, text: '' }] });
      return;
    }
    patch({ items: draft.items.filter((_, i) => i !== index) });
  };

  const handleSave = () => {
    const result = validateDraft(draft);
    if (!result.ok) {
      alert(result.message);
      if (result.focusTitle) titleRef.current?.focus();
      return;
    }
    onCreate(result.input);
  };

  return (
    <div
      id="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel(); // close on backdrop only
      }}
    >
      <div id="mission-modal" role="dialog" aria-modal="true" aria-labelledby="modal-heading">
        <div className="modal-title" id="modal-heading">
          NEW MISSION
        </div>

        <div className="field">
          <label htmlFor="f-title">Mission title</label>
          <input
            ref={titleRef}
            type="text"
            id="f-title"
            maxLength={60}
            placeholder="e.g. Hit the gym before noon"
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="f-category">Category</label>
            <select
              id="f-category"
              value={draft.category}
              onChange={(e) => patch({ category: e.target.value as CategoryKey })}
            >
              {CATEGORY_OPTIONS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-respect">Respect / EXP</label>
            <input
              type="number"
              id="f-respect"
              min={10}
              max={9999}
              step={10}
              value={draft.respect}
              onChange={(e) => patch({ respect: e.target.value })}
            />
          </div>
        </div>

        <div className="field">
          <label>Map location</label>
          <div className="loc-box">
            <span id="loc-text" className={draft.x != null ? 'set' : undefined}>
              {draft.x != null ? `X ${draft.x} · Y ${draft.y}` : 'NOT SET'}
            </span>
            <button id="btn-pick" type="button" onClick={onPickOnMap}>
              📍 Pick on map
            </button>
          </div>
        </div>

        <div className="field">
          <label>Checklist</label>
          <div id="checklist-rows" ref={rowsRef}>
            {draft.items.map((item, index) => (
              <div className="cl-row" key={item.id} data-idx={index}>
                <input
                  type="text"
                  maxLength={80}
                  placeholder={`Sub-task ${index + 1}`}
                  value={item.text}
                  data-cl-input
                  onChange={(e) => setItemText(index, e.target.value)}
                />
                <button
                  className="cl-remove"
                  type="button"
                  data-cl-remove
                  title="Remove"
                  onClick={() => removeItem(index)}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <button id="btn-add-item" type="button" onClick={addItem}>
            + Add checklist item
          </button>
        </div>

        <div className="modal-actions">
          <button className="btn" id="btn-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-gold" id="btn-save" onClick={handleSave}>
            💾 Save Mission
          </button>
        </div>
      </div>
    </div>
  );
}
