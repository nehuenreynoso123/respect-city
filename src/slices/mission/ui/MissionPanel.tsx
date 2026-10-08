import { Bar } from '@/shared/ui/Bar';
import { Checkbox } from '@/shared/ui/Checkbox';
import { categoryOf } from '@/slices/mission/domain/categories';
import type { Mission } from '@/slices/mission/domain/types';

export interface MissionPanelProps {
  /** Selected mission; null → closed (legacy placeholder content + aria-hidden). */
  mission: Mission | null;
  onToggleItem: (missionId: string, itemId: string) => void;
  onDelete: (missionId: string) => void;
  /** Legacy `#panel-close` → clear selection. */
  onClose: () => void;
}

/**
 * Side panel for one mission: header, progress bar, checklist, delete.
 * Keep it MOUNTED (mission=null when closed) so the CSS slide-in transition
 * runs — legacy toggles the `.open` class on an always-present element.
 */
export function MissionPanel({ mission, onToggleItem, onDelete, onClose }: MissionPanelProps) {
  const cat = mission ? categoryOf(mission.category) : null;
  const checked = mission ? mission.items.filter((i) => i.done).length : 0;
  const total = mission ? mission.items.length : 0;
  const progress = total > 0 ? (checked / total) * 100 : 0;

  const handleDelete = () => {
    if (!mission) return;
    if (!confirm(`Delete mission "${mission.title}"?`)) return;
    onDelete(mission.id);
  };

  return (
    <section
      id="mission-panel"
      className={mission ? 'open' : undefined}
      aria-hidden={mission ? 'false' : 'true'}
    >
      <div className="panel-head">
        <div id="panel-icon" style={cat ? { borderColor: cat.color } : undefined}>
          {cat ? cat.icon : '🎯'}
        </div>
        <div style={{ minWidth: 0 }}>
          <h2 id="panel-title">{mission ? mission.title : 'Mission'}</h2>
          <div className="panel-meta">
            <span id="panel-cat" style={cat ? { color: cat.color } : undefined}>
              {mission ? mission.category : 'CATEGORY'}
            </span>
            <span className="respect" id="panel-respect">
              {mission ? `+${mission.respect} RESPECT` : '+0 RESPECT'}
            </span>
          </div>
        </div>
        <button id="panel-close" title="Close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="panel-progress">
        <Bar width={`${progress}%`} />
        <div className="progress-text" id="panel-progress-text">
          {mission ? `${checked} / ${total} completed` : '0 / 0'}
        </div>
      </div>

      <ul id="panel-items">
        {mission?.items.map((item) => (
          <Checkbox
            key={item.id}
            itemId={item.id}
            checked={item.done}
            label={item.text}
            onChange={() => onToggleItem(mission.id, item.id)}
          />
        ))}
      </ul>

      <div className="panel-actions">
        <button
          className="btn btn-pink"
          id="panel-delete"
          style={{ width: '100%' }}
          onClick={handleDelete}
        >
          🗑 Delete Mission
        </button>
      </div>
    </section>
  );
}
