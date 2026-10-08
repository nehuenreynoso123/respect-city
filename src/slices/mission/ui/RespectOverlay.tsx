import { useEffect, useRef } from 'react';

import type { SfxPort } from '@/slices/audio/ports/SfxPort';

export interface RespectCelebration {
  respect: number;
  /** false → "REWARD ALREADY CLAIMED" (legacy showRespect firstGrant). */
  firstGrant: boolean;
}

export interface RespectOverlayProps {
  /** Non-null while celebrating; null renders nothing (legacy display:none). */
  celebration: RespectCelebration | null;
  /** Hide now — click on the overlay or after the legacy 2600 ms beat. */
  onHide: () => void;
  /** Audio port: plays the RESPECT arpeggio on show (legacy sfxRespect). */
  sfx: SfxPort;
}

/**
 * Full-screen RESPECT+ celebration (legacy showRespect/hideRespect,
 * index.html:1317-1338): auto-hides after 2600 ms, click dismisses.
 */
export function RespectOverlay({ celebration, onHide, sfx }: RespectOverlayProps) {
  const active = celebration !== null;
  const hideRef = useRef(onHide);
  const sfxRef = useRef(sfx);
  hideRef.current = onHide;
  sfxRef.current = sfx;

  const playedRef = useRef(false);

  useEffect(() => {
    if (!active) {
      playedRef.current = false;
      return;
    }
    // Sound once per show (StrictMode re-runs effects in development).
    if (!playedRef.current) {
      playedRef.current = true;
      sfxRef.current.respect();
    }
    const timer = setTimeout(() => hideRef.current(), 2600); // legacy delay
    return () => clearTimeout(timer);
  }, [active]);

  if (!celebration) return null;

  const big = celebration.respect >= 250;
  const sub = celebration.firstGrant
    ? `+${celebration.respect} EXP · +${Math.ceil(celebration.respect / 10)} COINS`
    : 'MISSION CLEARED · REWARD ALREADY CLAIMED';

  return (
    <div id="respect-overlay" onClick={() => hideRef.current()}>
      <div className="respect-inner">
        <div className="respect-big">
          {big ? (
            <>
              MISSION
              <br />
              RESPECT +
            </>
          ) : (
            'RESPECT +'
          )}
        </div>
        <div className="respect-sub">{sub}</div>
        <div className="respect-hint">click to continue</div>
      </div>
    </div>
  );
}
