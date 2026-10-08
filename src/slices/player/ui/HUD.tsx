import { Bar } from '@/shared/ui/Bar';
import { StatChip } from '@/shared/ui/StatChip';
import {
  EXP_PER_LEVEL,
  expBarPercent,
  inLevelExp,
  levelOf,
} from '@/slices/player/domain/level';
import {
  COIN_BAR_MAX,
  STAT_CAP,
  clamp,
  type Player,
} from '@/slices/player/domain/player';

export interface HUDProps {
  player: Player;
  sound: boolean;
  /** Legacy `#btn-sound` → provider toggles; chime plays from the soundToggled event. */
  onToggleSound: () => void;
  /** Legacy `#btn-list` → open/close the mission drawer. */
  onToggleList: () => void;
  /** Legacy `#btn-new` → open the create modal (caller seeds the location). */
  onNewMission: () => void;
}

/**
 * Header: logo, level + EXP bar, stamina, intelligence, coins, actions.
 * Values mirror legacy renderHUD() (index.html:963-976) exactly.
 */
export function HUD({ player, sound, onToggleSound, onToggleList, onNewMission }: HUDProps) {
  const level = levelOf(player.exp);
  const inLvl = inLevelExp(player.exp);

  return (
    <header id="hud">
      <div className="logo">
        RESPECT<span>CITY</span>
      </div>

      <StatChip
        label="Level"
        value={level}
        bar={<Bar variant="exp" width={`${expBarPercent(player.exp).toFixed(1)}%`} />}
        sub={`${inLvl} / ${EXP_PER_LEVEL} EXP`}
      />

      <StatChip
        label="Stamina"
        bar={<Bar variant="stamina" width={`${clamp(player.stamina, 0, STAT_CAP)}%`} />}
      />

      <StatChip
        label="Intelligence"
        bar={<Bar variant="intel" width={`${clamp(player.intel, 0, STAT_CAP)}%`} />}
      />

      <StatChip
        label="Coins"
        value={player.coins}
        bar={
          <Bar
            variant="coins"
            width={`${clamp((player.coins / COIN_BAR_MAX) * 100, 0, 100)}%`}
          />
        }
      />

      <div className="hud-actions">
        <button className="btn" id="btn-list" title="Mission list" onClick={onToggleList}>
          ☰
        </button>
        <button className="btn btn-gold" id="btn-new" onClick={onNewMission}>
          + New Mission
        </button>
        <button
          className="btn btn-pink"
          id="btn-sound"
          title="Toggle sound"
          onClick={onToggleSound}
        >
          {sound ? '🔊' : '🔇'}
        </button>
      </div>
    </header>
  );
}
