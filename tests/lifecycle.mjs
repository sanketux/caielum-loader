import assert from 'node:assert/strict';
import { mountLoaderOrb } from '../orb.js';

class Events {
  listeners = new Map();
  addEventListener(key, fn) { this.listeners.set(key, fn); }
  removeEventListener(key) { this.listeners.delete(key); }
  emit(key) { this.listeners.get(key)?.(); }
}
class Element extends Events {
  dataset = {};
  children = [];
  width = 64;
  style = {
    values: new Map(),
    setProperty(key, value) { this.values.set(key, value); },
    removeProperty(key) { this.values.delete(key); },
  };
  setAttribute() {}
  append(...nodes) { this.children.push(...nodes); nodes.forEach(n => n.parent = this); }
  remove() { this.parent.children = this.parent.children.filter(n => n !== this); }
  getBoundingClientRect() { return { width: this.width, height: this.width }; }
}
const media = new Events();
media.matches = false;
globalThis.window = new Events();
window.matchMedia = () => media;
window.devicePixelRatio = 3;
globalThis.document = new Events();
document.createElement = () => new Element();
document.hidden = false;
globalThis.ResizeObserver = class { constructor(fn) { this.callback = fn; globalThis.resize = this; } observe() {} disconnect() { this.disconnected = true; } };
globalThis.IntersectionObserver = class { constructor(fn) { this.callback = fn; globalThis.intersection = this; } observe() {} disconnect() { this.disconnected = true; } };
const host = new Element();
const orb = mountLoaderOrb(host, { webgl: false });
assert.equal(host.dataset.renderer, 'css');
assert.equal(host.dataset.motion, 'running');
orb.setOptions({ speed: 0, fluidity: 1, glow: 1, gloss: 0 });
assert.equal(host.dataset.motion, 'paused', 'zero speed stops scheduling');
assert.equal(host.style.values.get('--_orb-glow'), '1');
assert.equal(host.style.values.get('--_orb-shine'), '5%');
orb.setOptions({ speed: 9, fluidity: -2, glow: NaN });
assert.equal(host.style.values.get('--_orb-duration'), '3.5s', 'speed is clamped to 2x');
assert.equal(host.style.values.get('--_orb-round-a'), '50%', 'negative fluidity is clamped');
assert.equal(host.style.values.get('--_orb-glow'), '1', 'invalid value retains existing setting');
orb.setOptions({ speed: 1 });
assert.equal(host.children[1].width, 128, 'DPR is capped at 2');
media.matches = true;
media.emit('change');
assert.equal(host.dataset.motion, 'paused', 'reduced motion stops animation');
media.matches = false;
media.emit('change');
document.hidden = true;
document.emit('visibilitychange');
assert.equal(host.dataset.motion, 'paused', 'hidden page stops animation');
document.hidden = false;
document.emit('visibilitychange');
intersection.callback([{ isIntersecting: false }]);
assert.equal(host.dataset.motion, 'paused', 'offscreen orb stops animation');
intersection.callback([{ isIntersecting: true }]);
assert.equal(host.dataset.motion, 'running');
orb.setPaused(true);
assert.equal(host.dataset.motion, 'paused');
host.width = 8;
resize.callback();
assert.equal(host.children[1].width, 16, '8px sizing uses the backing pixel ratio');
orb.dispose();
orb.dispose();
assert.equal(host.children.length, 0);
assert.equal(host.style.values.size, 0);
assert.equal(document.listeners.size, 0);
assert.equal(window.listeners.size, 0);
assert.equal(media.listeners.size, 0);
assert.ok(resize.disconnected && intersection.disconnected);
console.log('Passed: fallback, reduced motion, visibility, offscreen suspension, pause, resize, DPR cap, idempotent cleanup.');
