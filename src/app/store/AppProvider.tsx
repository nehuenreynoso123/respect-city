import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';

import { WebAudioSfxAdapter } from '@/slices/audio/adapters/WebAudioSfxAdapter';
import type { SfxPort } from '@/slices/audio/ports/SfxPort';
import { LocalStorageMissionRepository } from '@/slices/mission/adapters/LocalStorageMissionRepository';
import type { AppCommand } from '@/slices/mission/application/commands';
import type { AppEvent } from '@/slices/mission/application/events';
import { loadInitialState } from '@/slices/mission/application/load';
import {
  serializePersistedState,
} from '@/slices/mission/application/persistence';
import { reduce } from '@/slices/mission/application/reducer';
import { persistedOf } from '@/slices/mission/application/state';
import type { AppState } from '@/slices/mission/application/state';
import { LocalStorageAdapter } from '@/slices/storage/adapters/LocalStorageAdapter';

/** RESPECT+ celebration payload derived from `missionCompleted` events. */
export interface RespectCelebration {
  respect: number;
  firstGrant: boolean;
}

export interface AppContextValue {
  state: AppState;
  dispatch: (command: AppCommand) => void;
  /** Sound port, gated by the persisted `sound` flag (legacy tone() guard). */
  sfx: SfxPort;
  /** Non-null while the RESPECT+ overlay is showing. */
  celebration: RespectCelebration | null;
  hideCelebration: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

export interface AppProviderProps {
  children: ReactNode;
}

/**
 * Global store: ONE `useReducer` over the pure mission reducer (which folds
 * the player reducer for rewards), adapters injected here, boot via
 * `loadInitialState` (legacy `load()`) and persistence as an effect that
 * writes only when the persisted slice actually changed (legacy `save()`
 * ran on mutations only — selection/filter never touched storage).
 */
export function AppProvider({ children }: AppProviderProps) {
  const [repo] = useState(
    () => new LocalStorageMissionRepository(new LocalStorageAdapter()),
  );

  // Latest committed sound flag for the sfx gate (adapter takes a getter).
  const soundRef = useRef(true);
  const [sfx] = useState(() => new WebAudioSfxAdapter(() => soundRef.current));

  // Reducer side-effect intents, consumed once per committed state.
  const eventsRef = useRef<AppEvent[]>([]);
  const reducer = useCallback((current: AppState, command: AppCommand): AppState => {
    const result = reduce(current, command);
    eventsRef.current = result.events;
    return result.state;
  }, []);

  const [state, dispatch] = useReducer(reducer, repo, loadInitialState);

  const [celebration, setCelebration] = useState<RespectCelebration | null>(null);
  const hideCelebration = useCallback(() => setCelebration(null), []);

  // Run reducer intents after commit (legacy wiring: check ticks, sound
  // toggle chime, RESPECT+ overlay). soundRef is refreshed first so the
  // adapter gates on the NEW flag (legacy chime only when turning ON).
  useEffect(() => {
    soundRef.current = state.sound;
    const events = eventsRef.current;
    if (events.length === 0) return;
    eventsRef.current = [];
    for (const event of events) {
      switch (event.type) {
        case 'itemToggled':
          if (event.done) sfx.checkOn();
          else sfx.checkOff();
          break;
        case 'missionCompleted':
          setCelebration({ respect: event.respect, firstGrant: event.firstGrant });
          break;
        case 'soundToggled':
          if (event.enabled) sfx.checkOn(); // legacy: chime only when enabling
          break;
      }
    }
  }, [state, sfx]);

  // Persist only when the persisted slice changed. The first run records the
  // boot blob: loadInitialState already saved it when data was seeded/merged
  // (legacy load()/mergeRoutine guard), so we never rewrite on mount.
  const lastPersistedRef = useRef<string | null>(null);
  useEffect(() => {
    const serialized = serializePersistedState(persistedOf(state));
    if (lastPersistedRef.current === null) {
      lastPersistedRef.current = serialized;
      return;
    }
    if (serialized === lastPersistedRef.current) return;
    lastPersistedRef.current = serialized;
    repo.save(persistedOf(state));
  }, [state, repo]);

  const value: AppContextValue = {
    state,
    dispatch,
    sfx,
    celebration,
    hideCelebration,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
