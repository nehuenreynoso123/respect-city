const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 60 * 60,
  d: 24 * 60 * 60,
};

/**
 * Parses a TTL string into seconds: `7d`, `12h`, `30m`, `45s`, or bare
 * digits (= seconds). Used to size the session cookie Max-Age from
 * JWT_EXPIRES_IN so the cookie and the JWT share the same lifetime.
 * Throws on anything else (fail fast at boot instead of issuing a
 * session cookie that outlives or underlives its token).
 */
export function durationToSeconds(value: string): number {
  const match = /^(\d+)([smhd])?$/.exec(value.trim());
  if (!match) {
    throw new Error(`Invalid duration: "${value}" (expected e.g. 7d, 12h, 30m, 45s).`);
  }
  const amount = Number(match[1]);
  const unit = match[2] ?? 's';
  return amount * UNIT_SECONDS[unit];
}
