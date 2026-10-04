export interface LoaderOrbOptions {
  /** Playback multiplier from 0 (still) to 2. Default 1. */
  speed?: number;
  /** Surface deformation from 0 to 1. Default 0.3. */
  fluidity?: number;
  /** Sky-coloured halo strength from 0 to 1. Default 0.25. */
  glow?: number;
  /** Reflection strength from matte (0) to glossy (1). Default 0.7. */
  gloss?: number;
}
export interface LoaderOrbController {
  setOptions(options: LoaderOrbOptions): void;
  setPaused(paused: boolean): void;
  refreshColors(): void;
  dispose(): void;
}
export function mountLoaderOrb(
  host: HTMLElement,
  options?: LoaderOrbOptions & { paused?: boolean; webgl?: boolean },
): LoaderOrbController;
