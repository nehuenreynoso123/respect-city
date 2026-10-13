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

import { ApiError } from '@/shared/http/ApiError';
import { WebAudioSfxAdapter } from '@/slices/audio/adapters/WebAudioSfxAdapter';
import type { SfxPort } from '@/slices/audio/ports/SfxPort';
import { HttpAuthAdapter } from '@/slices/auth/adapters/HttpAuthAdapter';
import { clearToken, loadToken, saveToken } from '@/slices/auth/application/session';
import type { AuthResponse, User } from '@/slices/auth/domain/types';
import { HttpGameRepository } from '@/slices/mission/adapters/HttpGameRepository';
import type { AppCommand } from '@/slices/mission/application/commands';
import type { AppEvent } from '@/slices/mission/application/events';
import { reduce } from '@/slices/mission/application/reducer';
import { freshAppState, persistedOf } from '@/slices/mission/application/state';
import type { AppState, PersistedState } from '@/slices/mission/application/state';
import { LocalStorageAdapter } from '@/slices/storage/adapters/LocalStorageAdapter';

import { isLocalCommand, mutationOf } from './pipeline';

/**
 * Backend base URL. Empty in the browser so requests are same-origin `/api/*`
 * (Vite dev proxy forwards them to the backend, see vite.config.ts); tests pass
 * an absolute base directly to the adapters.
 */
const API_BASE = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

/** RESPECT+ celebration payload derived from `missionCompleted` events. */
export interface RespectCelebration {
  respect: number;
  firstGrant: boolean;
}

export type AuthStatus = 'loading' | 'guest' | 'authenticated';

export interface AppContextValue {
  state: AppState;
  dispatch: (command: AppCommand) => void;
  /** Sound port, gated by the persisted `sound` flag (legacy tone() guard). */
  sfx: SfxPort;
  /** Non-null while the RESPECT+ overlay is showing. */
  celebration: RespectCelebration | null;
  hideCelebration: () => void;
  /** Session gate: 'loading' while a stored token is validated. */
  auth: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => void;
  /** Transient user-facing error/info message. */
  notice: string | null;
  dismissNotice: () => void;
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
 * Composition root: builds the storage + HTTP adapters once, owns the pure
 * mission reducer, gates the app behind a validated session, and runs the
 * optimistic reconciliation pipeline for mutation commands (dispatch locally,
 * then adopt the authoritative server state or roll back).
 */
export function AppProvider({ children }: AppProviderProps) {
  // --- Adapters (built once) ---------------------------------------------
  const [storage] = useState(() => new LocalStorageAdapter());
  // Token getter reads a ref kept in sync with the auth state; adapters never
  // read localStorage per call.
  const tokenRef = useRef<string | null>(null);
  const getToken = useCallback(() => tokenRef.current, []);
  const [authRepo] = useState(() => new HttpAuthAdapter(API_BASE, getToken));
  const [repo] = useState(() => new HttpGameRepository(API_BASE, getToken));

  // Latest committed sound flag for the sfx gate (adapter takes a getter).
  const soundRef = useRef(true);
  const [sfx] = useState(() => new WebAudioSfxAdapter(() => soundRef.current));

  // --- Reducer ------------------------------------------------------------
  const eventsRef = useRef<AppEvent[]>([]);
  const reducer = useCallback((current: AppState, command: AppCommand): AppState => {
    const result = reduce(current, command);
    eventsRef.current = result.events;
    return result.state;
  }, []);

  const [state, rawDispatch] = useReducer(reducer, undefined, () => freshAppState());

  // --- Session state ------------------------------------------------------
  const [auth, setAuth] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const dismissNotice = useCallback(() => setNotice(null), []);

  const [celebration, setCelebration] = useState<RespectCelebration | null>(null);
  const hideCelebration = useCallback(() => setCelebration(null), []);

  // Pre-command snapshot source: the ref lags one render behind an optimistic
  // dispatch, which is exactly what the pipeline needs for rollback and for
  // reading the flag the reducer just flipped.
  const latestStateRef = useRef(state);
  useEffect(() => {
    latestStateRef.current = state;
  }, [state]);

  // --- Reducer intents (sfx / celebration), unchanged from local-first -----
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

  // --- Boot: validate a stored token, then hydrate the state --------------
  // The ref guard makes the effect idempotent under React StrictMode's dev
  // double-invoke (the async boot runs once per provider instance).
  const bootedRef = useRef(false);
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;

    const stored = loadToken(storage);
    if (!stored) {
      tokenRef.current = null;
      setAuth('guest');
      return;
    }

    tokenRef.current = stored;
    void (async () => {
      try {
        const { user: me } = await authRepo.me();
        const loaded = await repo.load();
        setUser(me);
        rawDispatch({ type: 'replaceState', state: loaded });
        setAuth('authenticated');
      } catch (error) {
        if (error instanceof ApiError && error.code === 'unauthorized') {
          // Token rejected: drop it and ask for a fresh login.
          tokenRef.current = null;
          clearToken(storage);
          setUser(null);
          setAuth('guest');
          setNotice('Session expired. Please log in.');
          return;
        }
        // Network/other failure (e.g. backend down): keep the token so a retry
        // can succeed, but fall back to the guest screen with a softer message.
        setAuth('guest');
        setNotice('Unable to reach server.');
      }
    })();
  }, [authRepo, repo, storage, rawDispatch]);

  // --- Auth actions -------------------------------------------------------
  const adoptSession = useCallback(
    async (response: AuthResponse) => {
      // Establish the session only after the authoritative state loads: the
      // token stays in memory for the request and is persisted only on success,
      // so a failed state fetch never leaves a half-established session behind.
      tokenRef.current = response.accessToken;
      setUser(response.user);
      try {
        const loaded = await repo.load();
        saveToken(storage, response.accessToken);
        rawDispatch({ type: 'replaceState', state: loaded });
        setNotice(null);
        setAuth('authenticated');
      } catch (error) {
        tokenRef.current = null;
        setUser(null);
        setCelebration(null);
        throw error;
      }
    },
    [repo, storage, rawDispatch],
  );

  const login = useCallback(
    async (email: string, password: string) => {
      // Rejections bubble to AuthScreen, which renders the message.
      await adoptSession(await authRepo.login({ email, password }));
    },
    [authRepo, adoptSession],
  );

  const register = useCallback(
    async (email: string, password: string) => {
      await adoptSession(await authRepo.register({ email, password }));
    },
    [authRepo, adoptSession],
  );

  const logout = useCallback(() => {
    tokenRef.current = null;
    clearToken(storage);
    setUser(null);
    setNotice(null);
    // The guest subtree unmounts the overlay without running its auto-hide
    // cleanup, so clear it here or the celebration resurfaces on next login.
    setCelebration(null);
    setAuth('guest');
    // Clean slate for the next login; the guest screen hides the stale UI.
    rawDispatch({ type: 'replaceState', state: persistedOf(freshAppState()) });
  }, [storage, rawDispatch]);

  // --- Dispatch: optimistic pipeline for mutations ------------------------
  const dispatch = useCallback(
    (command: AppCommand) => {
      // Local-only and replaceState are applied directly, never sent.
      if (isLocalCommand(command) || command.type === 'replaceState') {
        rawDispatch(command);
        return;
      }

      const snapshot = persistedOf(latestStateRef.current);

      // Optimistic: existing reducer logic drives instant UI + sfx/celebration.
      rawDispatch(command);

      const plan = mutationOf(repo, command, snapshot);
      if (!plan) return;

      void plan
        .run()
        .then((serverState: PersistedState) => {
          // Authoritative sync (no merge): adopt the server blob.
          rawDispatch({ type: 'replaceState', state: serverState });
        })
        .catch((error: unknown) => {
          if (error instanceof ApiError && error.code === 'unauthorized') {
            tokenRef.current = null;
            clearToken(storage);
            setUser(null);
            setCelebration(null);
            setAuth('guest');
            setNotice('Session expired. Please log in.');
            return;
          }
          // Roll the optimistic change back to the pre-command snapshot and
          // drop any celebration the optimistic reducer may have fired: the
          // mutation failed, so a "reward" overlay would be a lie.
          setCelebration(null);
          rawDispatch({ type: 'replaceState', state: plan.snapshot });
          setNotice(
            error instanceof ApiError
              ? error.message
              : 'Something went wrong. Please try again.',
          );
        });
    },
    [rawDispatch, repo, storage],
  );

  const value: AppContextValue = {
    state,
    dispatch,
    sfx,
    celebration,
    hideCelebration,
    auth,
    user,
    login,
    register,
    logout,
    notice,
    dismissNotice,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
