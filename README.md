# Caielum Loader

Working component prototype for indeterminate loading on bright backgrounds. Default: **64 × 64 CSS pixels** (eight 8px units). Supports literal 8 × 8 pixels too, though material details naturally disappear at that size.

The renderer uses native WebGL: a ray-marched 3D sphere with subtle surface deformation, flowing navy/sky material and studio reflections. It has no Three.js or other runtime dependency, and does not simulate collisions or rigid-body physics.

## Preview

Serve this directory over HTTP (JavaScript modules need HTTP):

```sh
python3 -m http.server 4387 --bind 127.0.0.1
```

Open `http://127.0.0.1:4387/`. Try sizes, bright backgrounds, speed, fluidity, glow, gloss and the pause control. Add `?fallback=1` to inspect the CSS fallback. The 192px option is a detail view; 64px is the intended standalone size and 24px is the inline example.

## React

Copy `LoaderOrb.tsx`, `orb.js`, `orb.d.ts`, `orb.css`, and `orb.css.d.ts` together into your app. Import the existing Caielum stylesheet as usual; standalone consumers can load `tokens.css`.

```tsx
import { LoaderOrb } from './LoaderOrb';

<LoaderOrb label="Loading your trips" speed={1} fluidity={0.3} glow={0.25} gloss={0.7} />
<LoaderOrb size={24} label="Loading" />
<LoaderOrb size="clamp(32px, 8vw, 64px)" label="Loading" />
<LoaderOrb size={8} label="Loading" />

// When a visible message already announces the status:
<div role="status">
  <LoaderOrb size={24} decorative />
  Finding your next escape…
</div>
```

Props: `speed` (0–2, default `1`), `fluidity` (0–1, default `0.3`), `glow` (0–1, default `0.25`), `gloss` (0–1, default `0.7`), `size` (number in pixels or CSS length, default `64`), `label` (default `Loading`), `decorative` (default `false`), `paused` (default `false`), plus span attributes. Use `aria-busy="true"` on the region being loaded, then remove it when loading completes. Remove the orb after completion.

## HTML

```html
<link rel="stylesheet" href="./orb.css">
<span id="loading" class="cai-loader-orb" role="status" aria-label="Loading"></span>
<script type="module">
  import { mountLoaderOrb } from './orb.js';
  const controller = mountLoaderOrb(document.getElementById('loading'));
  // Update any subset immediately without rebuilding WebGL:
  // controller.setOptions({ speed: 1.5, fluidity: 0.6, glow: 0.4, gloss: 0.8 });
  // controller.setPaused(true);
  // controller.refreshColors(); // after changing theme tokens
  // controller.dispose();      // before removing the host
</script>
```

Set `--cai-loader-orb-size` on the host to use a different size. Percentage dimensions and `clamp()` work; the container remains square and fits its parent.

## Live controls

| Control | Range | Effect |
| --- | --- | --- |
| Speed | 0–2× | 0 freezes motion; 1 is the default; 2 runs twice as fast. Changes keep the current animation phase. |
| Fluidity | 0–1 | A round sphere at 0, increasing surface deformation and material flow up to 1. |
| Glow | 0–1 | A soft sky-coloured halo, independent of the orb's navy edge. |
| Gloss | 0–1 | Soft matte shading through bright polished reflections. |

The preview shows fluidity, glow and gloss as percentages; React and JavaScript take values from 0 to 1. All four update both preview orbs immediately. Reset tuning restores these four defaults and preserves the chosen size, background and pause state. Reduced motion continues to override animation at every speed.

Values outside the supported ranges are clamped; invalid numeric updates retain the previous value. The CSS fallback approximates the same controls with rotation speed, changing corner curves, a halo and highlight opacity. It does not reproduce WebGL shading exactly.

## Colour and motion

- Body: `--cai-surface-bg-brand` — navy 900, `#133d63`.
- Reflection: `--cai-color-secondary-sky-sky-main` — sky 300, `#a8d8f7`.
- Edge/depth: `--cai-color-primary-1000` — navy 1000, `#00203d`.
- Highlight: `--cai-surface-bg-brand-subtle` — `#eff7ff`.
- Transparent canvas; tested on white, sky tint, warm canvas and gold tint.
- Slow continuous movement capped at 30fps and pixel ratio 2.
- Automatically still for reduced motion, suspended when offscreen or in a hidden tab.
- CSS fallback on missing WebGL, shader failure or context loss; restores WebGL when its context returns.
- Accessible status label; canvas hidden from assistive technology. Forced-colour mode uses a system-colour silhouette.

This standalone component is not yet integrated into the Caielum design system. The preview uses system fonts; no font files or runtime libraries are required.

## Checks

With Node.js installed, run `npm test` for the lifecycle and control checks. No dependency installation is needed for these tests.
