/** Fill gradient variants (legacy `.bar-fill.exp` / `.stamina` / `.intel` / `.coins`). */
export type BarVariant = 'exp' | 'stamina' | 'intel' | 'coins';

export interface BarProps {
  /**
   * Fully formatted CSS width. Legacy formats the value before writing
   * `style.width` (EXP with one decimal, stats via clamp, etc.).
   */
  width: string;
  /** Omit for the neutral panel-progress fill (styled by `.panel-progress`). */
  variant?: BarVariant;
}

/** Arcade progress bar: `.bar` track > `.bar-fill` (legacy markup). */
export function Bar({ width, variant }: BarProps) {
  return (
    <div className="bar">
      <div className={`bar-fill${variant ? ` ${variant}` : ''}`} style={{ width }} />
    </div>
  );
}
