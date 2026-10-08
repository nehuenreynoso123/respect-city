import { describe, expect, it } from 'vitest';

import type { SfxPort } from './SfxPort';

/**
 * The adapter contract only: a fake must satisfy the interface so the
 * provider can swap WebAudioSfxAdapter for it in tests. The real adapter
 * needs a browser AudioContext, which node does not have.
 */
function makeFakeSfx() {
  const calls: string[] = [];
  const port: SfxPort = {
    checkOn: () => void calls.push('checkOn'),
    checkOff: () => void calls.push('checkOff'),
    respect: () => void calls.push('respect'),
  };
  return { port, calls };
}

describe('SfxPort', () => {
  it('a fake implementing the port drives all three sounds', () => {
    const { port, calls } = makeFakeSfx();
    port.checkOn();
    port.checkOff();
    port.respect();
    expect(calls).toEqual(['checkOn', 'checkOff', 'respect']);
  });

  it('the port exposes exactly checkOn/checkOff/respect', () => {
    const { port } = makeFakeSfx();
    expect(Object.keys(port).sort()).toEqual(['checkOff', 'checkOn', 'respect']);
  });
});
