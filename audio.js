// Efeitos sonoros e ambiente sintetizados (sem arquivos de áudio)
let ctx = null, master = null, ambient = null, on = true;
function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); } catch (e) { ctx = null; }
  }
  if (ctx && ctx.state === 'suspended') ctx.resume();
  return ctx;
}
export function setSound(v) { on = v; if (master) master.gain.value = v ? 0.5 : 0; }
export const soundOn = () => on;
function tone(freq, dur = 0.12, type = 'sine', vol = 0.25, when = 0, slide = 0) {
  const c = ac(); if (!c || !on) return;
  const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + when;
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur = 0.4, vol = 0.4, lp = 800, when = 0) {
  const c = ac(); if (!c || !on) return;
  const n = Math.floor(c.sampleRate * dur), b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime + when;
  s.buffer = b; fl.type = 'lowpass'; fl.frequency.value = lp; g.gain.value = vol;
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t);
}
export function sfx(name) {
  switch (name) {
    case 'tick': tone(660, 0.04, 'square', 0.05); break;
    case 'ui': tone(520, 0.07, 'triangle', 0.18); break;
    case 'open': tone(330, 0.1, 'triangle', 0.2); tone(495, 0.14, 'triangle', 0.2, 0.08); break;
    case 'pick': tone(660, 0.08, 'triangle', 0.22); tone(880, 0.12, 'triangle', 0.22, 0.07); tone(1320, 0.16, 'triangle', 0.2, 0.14); break;
    case 'good': tone(523, 0.12, 'triangle', 0.22); tone(659, 0.12, 'triangle', 0.22, 0.1); tone(784, 0.2, 'triangle', 0.22, 0.2); break;
    case 'bad': tone(200, 0.25, 'sawtooth', 0.18, 0, -90); break;
    case 'cannon': noise(0.9, 0.9, 500); tone(70, 0.6, 'sine', 0.6, 0, -40); break;
    case 'splash': noise(0.25, 0.3, 1800); break;
    case 'bell': tone(880, 1.2, 'sine', 0.2); tone(1320, 0.9, 'sine', 0.08); break;
    case 'lock': tone(180, 0.06, 'square', 0.15); tone(140, 0.08, 'square', 0.15, 0.07); break;
    case 'step': noise(0.07, 0.12, 400); break;
  }
}
// ambiente: rio (ruído filtrado) + insetos
export function startAmbient() {
  const c = ac(); if (!c || ambient) return;
  const n = c.sampleRate * 3, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < n; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; }
  const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
  s.buffer = b; s.loop = true; fl.type = 'lowpass'; fl.frequency.value = 500; g.gain.value = 0.35;
  s.connect(fl); fl.connect(g); g.connect(master); s.start();
  ambient = { g };
  setInterval(() => { if (on && Math.random() < 0.5) tone(2800 + Math.random() * 900, 0.05, 'sine', 0.025); }, 900);
}
