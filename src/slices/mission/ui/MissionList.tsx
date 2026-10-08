import type { Filter } from '@/slices/mission/application/state';
import { categoryOf } from '@/slices/mission/domain/categories';
import { missionDone } from '@/slices/mission/domain/missionDone';
import type { Mission } from '@/slices/mission/domain/types';

/** Legacy filter chips (index.html:542-544). */
const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'done', label: 'Done' },
];

/** Legacy renderList() filter (index.html:1159-1163). */
export function filterMissions(missions: readonly Mission[], filter: Filter): Mission[] {
  return missions.filter((m) =>
    filter === 'active' ? !missionDone(m) : filter === 'done' ? missionDone(m) : true,
  );
}

export interface MissionListProps {
  missions: readonly Mission[];
  filter: Filter;
  selectedId: string | null;
  /** Legacy `.open` class (mobile slide-in drawer). */
  open: boolean;
  onFilterChange: (filter: Filter) => void;
  /** Legacy card click → openPanel(id). Callers also close the drawer (legacy line 1228). */
  onSelect: (missionId: string) => void;
}

/**
 * Left drawer: MISSION LOG + All/Active/Done filters + mission cards.
 * Note: legacy has NO Escape binding for the drawer — Escape closes the
 * modal or the panel only (index.html:1510-1515); the drawer toggles via
 * `#btn-list` and closes when a mission is selected.
 */
export function MissionList({
  missions,
  filter,
  selectedId,
  open,
  onFilterChange,
  onSelect,
}: MissionListProps) {
  const list = filterMissions(missions, filter);

  return (
    <aside id="mission-list" className={open ? 'open' : undefined}>
      <div className="list-head">📋 MISSION LOG</div>

      <div className="filters">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            className={filter === key ? 'chip active' : 'chip'}
            onClick={() => onFilterChange(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="list-scroll" id="list-scroll">
        {list.length === 0 ? (
          <div className="list-empty">
            No missions here.
            <br />
            <b>Click the map</b> to create one!
          </div>
        ) : (
          list.map((m) => {
            const cat = categoryOf(m.category);
            const done = missionDone(m);
            const checked = m.items.filter((i) => i.done).length;
            return (
              <div
                key={m.id}
                className={`mission-card${done ? ' done' : ''}${
                  m.id === selectedId ? ' selected' : ''
                }`}
                data-id={m.id}
                style={{ borderLeftColor: cat.color }}
                onClick={() => onSelect(m.id)}
              >
                <div className="mc-icon" style={{ borderColor: cat.color }}>
                  {cat.icon}
                </div>
                <div className="mc-body">
                  <div className="mc-title">{m.title}</div>
                  <div className="mc-meta">
                    <span className="mc-respect">+{m.respect} EXP</span>
                    <span>
                      {checked}/{m.items.length}
                    </span>
                  </div>
                </div>
                {done && <div className="mc-check">✓</div>}
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
