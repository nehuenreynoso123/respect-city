import { describe, expect, it } from 'vitest';

import { JwtTokenService } from './JwtTokenService.js';

describe('JwtTokenService', () => {
  it('sign then verify returns userId', () => {
    const service = new JwtTokenService('test-secret-please-change-it-long', '1h');
    const token = service.sign('user123');
    const payload = service.verify(token);
    expect(payload.userId).toBe('user123');
  });

  it('tampered token throws', () => {
    const service = new JwtTokenService('test-secret-please-change-it-long', '1h');
    const token = service.sign('user123');
    const tampered = token + 'x';
    expect(() => service.verify(tampered)).toThrow();
  });
});
