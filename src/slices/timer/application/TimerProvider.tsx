import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import { loadTimers, saveTimers } from '../adapters/localStorageTimerStore';
import { EMPTY_TIMERS, pauseTimer, playTimer, resetTimer } from './timers';
import type { TimerMap } from './timers';

export interface TimerContextValue {
  timers: TimerMap;
  play: (missionId: string) => void;
  pause: (missionId: string) => void;
  reset: (missionId: string) => void;
}

const TimerContext = createContext<TimerContextValue | null>(null);

/** Timers of the current scope plus the commands that drive them. */
export function useTimers(): TimerContextValue {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimers must be used inside <TimerProvider>');
  return ctx;
}

export interface TimerProviderProps {
  scope: string;
  children: ReactNode;
}

/**
 * Owns the stopwatch state of every mission: it loads the map from
 * localStorage on mount (and whenever the scope changes), persists every
 * change and exposes the play/pause/reset commands. The clock itself lives
 * in the domain layer.
 */
export function TimerProvider({ scope, children }: TimerProviderProps) {
  const [timers, setTimers] = useState<TimerMap>(EMPTY_TIMERS);
  // Scope whose map is currently loaded; null until the first load lands.
  const [loadedScope, setLoadedScope] = useState<string | null>(null);

  useEffect(() => {
    setTimers(loadTimers(scope));
    setLoadedScope(scope);
  }, [scope]);

  // Persist every change, but never before the scope is loaded: the first
  // render would otherwise overwrite the stored map with an empty one.
  useEffect(() => {
    if (loadedScope !== scope) return;
    saveTimers(scope, timers);
  }, [loadedScope, scope, timers]);

  const play = useCallback((missionId: string) => {
    setTimers((current) => playTimer(current, missionId, Date.now()));
  }, []);

  const pause = useCallback((missionId: string) => {
    setTimers((current) => pauseTimer(current, missionId, Date.now()));
  }, []);

  const reset = useCallback((missionId: string) => {
    setTimers((current) => resetTimer(current, missionId));
  }, []);

  const value = useMemo<TimerContextValue>(
    () => ({ timers, play, pause, reset }),
    [timers, play, pause, reset],
  );

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}
