import type { SfxPort } from '../ports/SfxPort';

/**
 * Port of the legacy Web Audio synth (index.html:1341-1386): zero audio
 * files, one lazily created AudioContext, the same tone envelopes and note
 * sequences. `isEnabled` mirrors the legacy `state.sound` guard inside tone().
 */
export class WebAudioSfxAdapter implements SfxPort {
  private ctx: AudioContext | null = null;

  constructor(private readonly isEnabled: () => boolean = () => true) {}

  checkOn(): void {
    if (!this.isEnabled()) return;
    this.tone(880, 0, 0.09, 'square', 0.12);
  }

  checkOff(): void {
    if (!this.isEnabled()) return;
    this.tone(440, 0, 0.09, 'square', 0.12);
  }

  /** Triumphant ascending arpeggio for RESPECT+ (Vice City flavour). */
  respect(): void {
    if (!this.isEnabled()) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 1318.51]; // C5 E5 G5 C6 E6
    notes.forEach((f, i) => {
      this.tone(f, i * 0.11, 0.22, 'square', 0.16);
      this.tone(f * 0.5, i * 0.11, 0.22, 'triangle', 0.1); // octave-down body
    });
    this.tone(1046.5, 0.6, 0.9, 'sawtooth', 0.1); // final chord stab
    this.tone(1318.51, 0.6, 0.9, 'square', 0.08);
    this.tone(523.25, 0.6, 0.9, 'triangle', 0.1);
  }

  private ac(): AudioContext | null {
    if (!this.ctx) {
      const w = window as typeof window & { webkitAudioContext?: typeof AudioContext };
      const AC = w.AudioContext ?? w.webkitAudioContext;
      if (!AC) return null; // very old browser: run silent
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  /** One synthetic tone: fast attack, exponential decay (legacy tone()). */
  private tone(
    freq: number,
    start: number,
    dur: number,
    type: OscillatorType = 'square',
    gain = 0.18,
  ): void {
    if (!this.isEnabled()) return;
    const ctx = this.ac();
    if (!ctx) return;
    const t0 = ctx.currentTime + start;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    amp.gain.setValueAtTime(0, t0);
    amp.gain.linearRampToValueAtTime(gain, t0 + 0.02); // fast attack
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); // decay
    osc.connect(amp).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }
}
