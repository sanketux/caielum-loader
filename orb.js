/** Caielum Loader Orb — dependency-free WebGL renderer. */
const vertexSource = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = position;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const fragmentSource = `
precision highp float;
varying vec2 uv;
uniform float time;
uniform float resolution;
uniform float fluidity;
uniform float gloss;
uniform vec3 navy;
uniform vec3 sky;
uniform vec3 ink;
uniform vec3 pearl;

mat2 rotate(float a) {
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

vec3 localPoint(vec3 p) {
  p.xz = rotate(time * 0.29) * p.xz;
  p.xy = rotate(-0.28 + sin(time * 0.23) * 0.10) * p.xy;
  return p;
}

float field(vec3 p) {
  vec3 q = localPoint(p);
  float wave = sin(q.x * 3.5 + time * 0.31)
             * sin(q.y * 3.0 - time * 0.22)
             * sin(q.z * 3.5 + 0.8);
  return length(p) - (0.865 + wave * 0.113 * fluidity);
}

vec3 normalAt(vec3 p) {
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    field(p + e.xyy) - field(p - e.xyy),
    field(p + e.yxy) - field(p - e.yxy),
    field(p + e.yyx) - field(p - e.yyx)
  ));
}

vec3 shade(vec3 p, vec3 view) {
  vec3 n = normalAt(p);
  vec3 q = localPoint(p);
  float flow = q.y * 4.5 + q.x * 2.2
             + sin(q.x * 3.1 + q.z * 2.5 + time * 0.25) * (0.8 + fluidity * 1.5)
             + sin(q.z * 4.0 - q.y * 2.0) * 0.5;
  float ribbon = smoothstep(-0.52, 0.62, sin(flow));
  // Large, fluid bands stay legible at the actual 64px size.
  vec3 base = mix(navy, sky, ribbon * 0.87);
  float light = max(dot(n, normalize(vec3(-0.65, 0.95, 1.5))), 0.0);
  float facing = max(dot(n, view), 0.0);
  vec3 color = base * (0.37 + 0.65 * light);
  color = mix(ink, color, smoothstep(0.0, 0.44, facing) * 0.90 + 0.10);

  // Two broad studio reflections plus a small clear-coat glint.
  vec3 reflected = reflect(-view, n);
  float softbox = pow(max(dot(reflected, normalize(vec3(-0.65, 0.9, 1.25))), 0.0), mix(5.0, 24.0, gloss));
  float glint = pow(max(dot(reflected, normalize(vec3(-0.7, 0.82, 1.25))), 0.0), 95.0);
  float rim = pow(max(dot(reflected, normalize(vec3(1.2, -0.2, 0.6))), 0.0), 22.0);
  color = mix(color, pearl, softbox * (0.06 + gloss * 0.9));
  color += pearl * glint * gloss * 0.34;
  color = mix(color, sky, rim * (0.08 + gloss * 0.32));
  return clamp(color, 0.0, 1.0);
}

void main() {
  // A fixed camera keeps the silhouette stable while the material moves.
  vec3 origin = vec3(0.0, 0.0, 3.0);
  vec3 ray = normalize(vec3(uv * 1.035, -3.0));
  float travel = 1.9;
  vec3 p;
  float d = 1.0;
  for (int i = 0; i < 64; i++) {
    p = origin + ray * travel;
    d = field(p);
    if (d < 0.0008 || travel > 4.0) break;
    travel += d * 0.86;
  }
  if (travel > 4.0 || d > 0.004) {
    gl_FragColor = vec4(0.0);
    return;
  }
  vec3 color = shade(p, -ray);
  // Fade only the last screen pixel of the silhouette; canvas stays transparent.
  float facing = max(dot(normalAt(p), -ray), 0.0);
  float alpha = smoothstep(0.0, 1.4 / sqrt(resolution), facing);
  gl_FragColor = vec4(color, alpha);
}`;

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('WebGL shader allocation failed.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    throw new Error('WebGL shader compilation failed.');
  }
  return shader;
}

function colorFromToken(styles, name, fallback) {
  const value = styles.getPropertyValue(name).trim();
  // Caielum's source tokens are sRGB hex. CSS rgb() overrides are accepted too.
  const hex = /^#([\da-f]{6})$/i.exec(value || fallback);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16) / 255);
  const rgb = /^rgba?\(\s*(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)[,\s]+(\d+(?:\.\d+)?)/.exec(value);
  if (rgb) return rgb.slice(1, 4).map((n) => Math.min(255, Number(n)) / 255);
  return [0, 2, 4].map((i) => parseInt(fallback.slice(i + 1, i + 3), 16) / 255);
}

/**
 * Mount once on an empty span/div with class="cai-loader-orb".
 * Returns setOptions(), setPaused(), refreshColors(), and dispose(). No global state.
 * Label/role belong to the host; the canvas is decorative.
 */
export function mountLoaderOrb(host, { paused = false, webgl = true, speed = 1, fluidity = 0.3, glow = 0.25, gloss = 0.7 } = {}) {
  const clamp = (value, max, fallback) => typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(max, value)) : fallback;
  const settings = {
    speed: clamp(speed, 2, 1),
    fluidity: clamp(fluidity, 1, 0.3),
    glow: clamp(glow, 1, 0.25),
    gloss: clamp(gloss, 1, 0.7),
  };
  const canvas = document.createElement('canvas');
  canvas.className = 'cai-loader-orb__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const fallback = document.createElement('span');
  fallback.className = 'cai-loader-orb__fallback';
  fallback.setAttribute('aria-hidden', 'true');
  host.append(fallback, canvas);

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false;
  let lost = false;
  let visible = true;
  let inView = true;
  let raf = 0;
  let last = 0;
  let elapsed = 1.8;
  let program = null;
  let buffer = null;
  let vertex = null;
  let fragment = null;
  let locations = null;
  let pixelSize = 1;
  let gl = null;
  try {
    gl = webgl ? canvas.getContext('webgl', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'low-power',
      depth: false,
      stencil: false,
    }) : null;
  } catch { /* A blocked GPU uses the same CSS fallback as an unsupported one. */ }

  function releaseResources() {
    if (!gl) return;
    if (buffer) gl.deleteBuffer(buffer);
    if (program) gl.deleteProgram(program);
    if (vertex) gl.deleteShader(vertex);
    if (fragment) gl.deleteShader(fragment);
    buffer = program = vertex = fragment = null;
    locations = null;
  }

  function init() {
    if (!gl) return;
    try {
      vertex = compile(gl, gl.VERTEX_SHADER, vertexSource);
      fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
      program = gl.createProgram();
      if (!program) throw new Error('WebGL program allocation failed.');
      gl.attachShader(program, vertex);
      gl.attachShader(program, fragment);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('WebGL link failed.');
      gl.useProgram(program);
      buffer = gl.createBuffer();
      if (!buffer) throw new Error('WebGL buffer allocation failed.');
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
      const position = gl.getAttribLocation(program, 'position');
      gl.enableVertexAttribArray(position);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
      locations = Object.fromEntries(['time', 'resolution', 'fluidity', 'gloss', 'navy', 'sky', 'ink', 'pearl'].map((key) => [key, gl.getUniformLocation(program, key)]));
      gl.clearColor(0, 0, 0, 0);
      refreshColors();
      // Reveal only after an actual render, so startup never shows an empty status.
      resize();
      host.dataset.renderer = 'webgl';
    } catch {
      releaseResources();
      host.dataset.renderer = 'css';
    }
  }

  function refreshColors() {
    if (!gl || !program || lost || disposed) return;
    gl.useProgram(program);
    const styles = getComputedStyle(host);
    for (const [key, token, fallbackValue] of [
      ['navy', '--cai-surface-bg-brand', '#133d63'],
      ['sky', '--cai-color-secondary-sky-sky-main', '#a8d8f7'],
      ['ink', '--cai-color-primary-1000', '#00203d'],
      ['pearl', '--cai-surface-bg-brand-subtle', '#eff7ff'],
    ]) gl.uniform3fv(locations[key], colorFromToken(styles, token, fallbackValue));
    render();
  }

  function render() {
    if (!gl || !program || disposed || lost) return;
    gl.uniform1f(locations.time, elapsed);
    gl.uniform1f(locations.resolution, pixelSize);
    gl.uniform1f(locations.fluidity, settings.fluidity);
    gl.uniform1f(locations.gloss, settings.gloss);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
  }

  function resize() {
    if (disposed) return;
    const rect = host.getBoundingClientRect();
    visible = rect.width > 0 && rect.height > 0;
    pixelSize = Math.min(1024, Math.max(1, Math.round(Math.min(rect.width, rect.height) * Math.min(window.devicePixelRatio || 1, 2))));
    if (canvas.width !== pixelSize || canvas.height !== pixelSize) {
      canvas.width = canvas.height = pixelSize;
      if (gl && !lost) gl.viewport(0, 0, pixelSize, pixelSize);
    }
    render();
    sync();
  }

  function tick(now) {
    raf = 0;
    // Cap at 30fps; a calm loading loop does not need a display's full refresh rate.
    if (!last || now - last >= 1000 / 30) {
      if (last) elapsed += Math.min((now - last) / 1000, 0.1) * settings.speed;
      last = now;
      render();
    }
    raf = requestAnimationFrame(tick);
  }

  function sync() {
    if (disposed) return;
    const animate = !paused && settings.speed > 0 && !media.matches && !document.hidden && visible && inView && !lost;
    host.dataset.motion = animate ? 'running' : 'paused';
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    last = 0;
    if (animate && program) raf = requestAnimationFrame(tick);
    else render();
  }

  function onLost(event) {
    event.preventDefault();
    lost = true;
    host.dataset.renderer = 'css';
    sync();
  }

  function onRestored() {
    if (disposed) return;
    lost = false;
    releaseResources();
    init();
    sync();
  }

  function setOptions(options = {}) {
    if (disposed) return;
    for (const key of ['speed', 'fluidity', 'glow', 'gloss']) {
      if (key in options) settings[key] = clamp(options[key], key === 'speed' ? 2 : 1, settings[key]);
    }
    host.style.setProperty('--_orb-glow', String(settings.glow));
    host.style.setProperty('--_orb-duration', `${7 / (settings.speed || 1)}s`);
    host.style.setProperty('--_orb-round-a', `${50 - settings.fluidity * 12}%`);
    host.style.setProperty('--_orb-round-b', `${50 + settings.fluidity * 12}%`);
    host.style.setProperty('--_orb-shine', `${5 + settings.gloss * 95}%`);
    sync();
  }

  host.dataset.renderer = 'css';
  setOptions();
  canvas.addEventListener('webglcontextlost', onLost);
  canvas.addEventListener('webglcontextrestored', onRestored);
  document.addEventListener('visibilitychange', sync);
  media.addEventListener('change', sync);
  window.addEventListener('resize', resize);
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting;
    sync();
  });
  intersection.observe(host);
  init();
  resize();

  return {
    setOptions,
    setPaused(value) { paused = Boolean(value); sync(); },
    refreshColors,
    dispose() {
      if (disposed) return;
      disposed = true;
      if (raf) cancelAnimationFrame(raf);
      observer.disconnect();
      intersection.disconnect();
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', sync);
      media.removeEventListener('change', sync);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      releaseResources();
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      fallback.remove();
      delete host.dataset.renderer;
      delete host.dataset.motion;
      for (const key of ['glow', 'duration', 'round-a', 'round-b', 'shine']) host.style.removeProperty(`--_orb-${key}`);
    },
  };
}
