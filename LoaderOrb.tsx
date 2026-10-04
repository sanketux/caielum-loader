'use client';

import { useEffect, useRef, type CSSProperties, type HTMLAttributes } from 'react';
import { mountLoaderOrb, type LoaderOrbOptions } from './orb.js';
import './orb.css';

export interface LoaderOrbProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'>, LoaderOrbOptions {
  /** Pixel size or responsive CSS length. Defaults to 64 = eight 8px units. */
  size?: number | string;
  /** Accessible loading message. Use decorative when a nearby message announces status. */
  label?: string;
  decorative?: boolean;
  paused?: boolean;
}

/** A navy and sky 3D orb for indeterminate loading on bright surfaces. */
export function LoaderOrb({
  size = 64,
  label = 'Loading',
  decorative = false,
  paused = false,
  speed = 1,
  fluidity = 0.3,
  glow = 0.25,
  gloss = 0.7,
  className = '',
  style,
  ...props
}: LoaderOrbProps) {
  const root = useRef<HTMLSpanElement>(null);
  const renderer = useRef<ReturnType<typeof mountLoaderOrb> | null>(null);

  useEffect(() => {
    if (!root.current) return;
    const orb = mountLoaderOrb(root.current, { paused: true });
    renderer.current = orb;
    return () => {
      orb.dispose();
      renderer.current = null;
    };
    // Mount once. The effect below handles changes to paused without rebuilding WebGL.
  }, []);

  useEffect(() => { renderer.current?.setPaused(paused); }, [paused]);
  useEffect(() => { renderer.current?.setOptions({ speed, fluidity, glow, gloss }); }, [speed, fluidity, glow, gloss]);

  return (
    <span
      {...props}
      ref={root}
      className={`cai-loader-orb ${className}`.trim()}
      role={decorative ? undefined : 'status'}
      aria-label={decorative ? undefined : label}
      aria-hidden={decorative || undefined}
      style={{ ...style, '--cai-loader-orb-size': typeof size === 'number' ? `${size}px` : size } as CSSProperties}
    />
  );
}
