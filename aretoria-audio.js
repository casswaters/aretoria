/**
 * Aretoria sound: code-generated room loops and soft UI sounds (Web Audio, no audio files).
 * Off by default. The speaker toggle stores its choice in localStorage (SOUND_KEY). Audio starts only after a tap
 * (iOS autoplay rule). Each room's loop is synthesized once into a LOOP_SEC buffer with an OfflineAudioContext:
 * every voice is periodic over LOOP_SEC and the reverb tail past the end is folded back onto the start, so the
 * buffer loops with no seam. Rooms crossfade; the last two rendered loops stay in memory.
 * Every room shares one tonal centre (D), one gold bell timbre, one high ivory halo and one cosmic reverb, so the
 * realms differ in character (mode, register, texture) but never in mood. Same code renders the preview clips.
 */
export const SOUND_KEY = 'mec-aretoria:sound';
export const LOOP_SEC = 30;
export const ROOMS = ['arrival', 'axial', 'courage', 'justice', 'humanity', 'temperance', 'wisdom', 'transcendence', 'shadow', 'hall'];
const TAIL_SEC = 9;          // bell ring + reverb that spills past the loop end, folded back onto the start
const RENDER_SR = 24000;     // soft ambient content; half the memory of 48 kHz
const MUSIC_VOL = 0.55;      // modest master levels (loops are normalized to about -24 dBFS RMS before this)
const UI_VOL = 0.5;
const FADE_SEC = 2.4;        // room crossfade

/* ---------- small helpers ---------- */
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const loopHz = (f, L) => Math.max(1, Math.round(f * L)) / L;   // whole cycles per loop: phase-continuous seam
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const N = { D2: 38, A2: 45, D3: 50, F3: 53, G3: 55, A3: 57, Bb3: 58, B3: 59, C4: 60, D4: 62, E4: 64, F4: 65, Fs4: 66, G4: 67, Gs4: 68, A4: 69, Bb4: 70, B4: 71, C5: 72, Cs5: 73, D5: 74, E5: 76, F5: 77, Fs5: 78, G5: 79, Gs5: 80, A5: 81, B5: 83, Cs6: 85, D6: 86, E6: 88, Fs6: 90, A6: 93 };

function panNode(ctx, v) {
  if (!ctx.createStereoPanner) return ctx.createGain();
  const p = ctx.createStereoPanner(); p.pan.value = v; return p;
}
/** Stereo cosmic reverb: decaying filtered noise (deterministic, so every render matches). */
function impulse(ctx, sec, seed) {
  const sr = ctx.sampleRate, n = Math.floor(sec * sr), b = ctx.createBuffer(2, n, sr), r = rng(seed);
  for (let c = 0; c < 2; c++) {
    const d = b.getChannelData(c); let lp = 0;
    for (let i = 0; i < n; i++) {
      const t = i / n; lp += 0.35 * ((r() * 2 - 1) - lp);
      d[i] = lp * Math.pow(1 - t, 2.2) * Math.exp(-3.2 * t) * (i < sr * 0.012 ? i / (sr * 0.012) : 1);
    }
  }
  return b;
}
/** dry + wet buses into `out` */
function buses(ctx, out, { verb = 3.4, wet = 0.42, seed = 7 } = {}) {
  const dry = ctx.createGain(); dry.connect(out);
  const conv = ctx.createConvolver(); conv.normalize = true; conv.buffer = impulse(ctx, verb, seed);
  const wg = ctx.createGain(); wg.gain.value = wet; conv.connect(wg); wg.connect(out);
  return { ctx, dry, wet: conv };
}
function send(B, node, wetAmt = 1) {
  node.connect(B.dry);
  if (wetAmt) { const g = B.ctx.createGain(); g.gain.value = wetAmt; node.connect(g); g.connect(B.wet); }
}
/** periodic gain curve over [0, L]: base + depth * sin(2 pi k t / L + ph) */
function lfoCurve(base, depth, k, ph = 0, n = 256) {
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) c[i] = Math.max(0, base + depth * Math.sin((2 * Math.PI * k * i) / (n - 1) + ph));
  return c;
}

/* ---------- voices ---------- */
/** Sustained drone voice for the whole loop (frequency snapped to whole cycles per loop). */
function drone(B, L, f, { type = 'sine', gain = 0.05, k = 1, depth = 0.5, ph = 0, pan = 0, lp = 0, detune = 0, wet = 0.8 } = {}) {
  const ctx = B.ctx, t0 = B.t0 || 0;
  const g = ctx.createGain(); g.gain.setValueCurveAtTime(lfoCurve(gain, gain * depth, k, ph), t0, L);
  const p = panNode(ctx, pan); g.connect(p);
  let tail = p;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; fl.Q.value = 0.5; p.connect(fl); tail = fl; }
  send(B, tail, wet);
  const fs = detune ? [f, f + detune] : [f];
  fs.forEach((x) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = loopHz(x, L); o.connect(g); o.start(t0); o.stop(t0 + L); });
}
/** Gold bell: a few inharmonic partials, soft attack, natural decay. */
function bell(B, t, f, { gain = 0.06, decay = 2.6, pan = 0, wet = 1, bright = 1, attack = 0.006 } = {}) {
  t += B.t0 || 0;
  const ctx = B.ctx, p = panNode(ctx, pan); send(B, p, wet);
  [[1, 1, 1], [2.0, 0.32 * bright, 0.6], [2.76, 0.16 * bright, 0.42], [5.4, 0.05 * bright, 0.22]].forEach(([r, a, dk]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.value = f * r; o.connect(g); g.connect(p);
    const d = decay * dk;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain * a, t + attack); g.gain.setTargetAtTime(0, t + attack, d / 4);
    o.start(t); o.stop(t + d * 1.6 + 0.1);
  });
}
/** Soft swelling chord tone (pad events used for chord changes). */
function swell(B, t, f, { dur = 7, gain = 0.03, att = 1.8, rel = 2.4, type = 'sine', pan = 0, partials = [1], lp = 0, wet = 0.9 } = {}) {
  t += B.t0 || 0;
  const ctx = B.ctx, g = ctx.createGain(), p = panNode(ctx, pan); g.connect(p);
  let tail = p;
  if (lp) { const fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = lp; p.connect(fl); tail = fl; }
  send(B, tail, wet);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + att); g.gain.setValueAtTime(gain, t + dur - rel); g.gain.linearRampToValueAtTime(0, t + dur);
  partials.forEach((a, i) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = type; o.frequency.value = f * (i + 1); og.gain.value = a; o.connect(og); og.connect(g); o.start(t); o.stop(t + dur + 0.05); });
}
/** Filtered noise bed (breath, sea, cave wind), one loop long, with a periodic swell. */
function noiseBed(B, L, { type = 'bandpass', f = 800, q = 0.7, gain = 0.02, k = 1, depth = 0.6, ph = 0, seed = 3, wet = 0.6, pan = 0 } = {}) {
  const ctx = B.ctx, n = Math.floor(L * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), r = rng(seed);
  for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
  const s = ctx.createBufferSource(); s.buffer = buf; const t0 = B.t0 || 0;
  const g = ctx.createGain(); g.gain.setValueCurveAtTime(lfoCurve(gain, gain * depth, k, ph), t0, L);
  const p = panNode(ctx, pan), fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  s.connect(g); g.connect(p); p.connect(fl); send(B, fl, wet);
  s.start(t0); s.stop(t0 + L);
}
/** Soft low pulse (distant drum of the forge). */
function thump(B, t, { gain = 0.12, f = 62 } = {}) {
  t += B.t0 || 0;
  const ctx = B.ctx, o = ctx.createOscillator(), g = ctx.createGain(); o.connect(g); send(B, g, 0.5);
  o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.setTargetAtTime(0, t + 0.02, 0.16);
  o.start(t); o.stop(t + 1.2);
}
/** Tiny ember crackle / star twinkle: a very short filtered noise tick or high ping. */
function tick(B, t, { f = 3200, gain = 0.02, pan = 0, seed = 1, len = 0.03, wet = 0.5 } = {}) {
  t += B.t0 || 0;
  const ctx = B.ctx, n = Math.max(8, Math.floor(len * ctx.sampleRate)), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), r = rng(seed);
  for (let i = 0; i < n; i++) d[i] = (r() * 2 - 1) * Math.pow(1 - i / n, 3);
  const s = ctx.createBufferSource(); s.buffer = buf;
  const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = 2;
  const g = ctx.createGain(); g.gain.value = gain; const p = panNode(ctx, pan);
  s.connect(fl); fl.connect(g); g.connect(p); send(B, p, wet); s.start(t);
}
/** The shared ivory halo: two very quiet high tones that breathe in and out (every room carries it). */
function halo(B, L, lvl = 1, low = false) {
  drone(B, L, hz(low ? N.D5 : N.D6), { gain: 0.007 * lvl, k: 1, depth: 0.9, pan: -0.45, wet: 1.2 });
  drone(B, L, hz(low ? N.A5 : N.A6), { gain: 0.005 * lvl, k: 2, depth: 0.9, ph: 1.7, pan: 0.45, wet: 1.2 });
}
/** Place a list of [time, midi] bell notes (pans spread deterministically). */
function bells(B, notes, opts = {}, seed = 11) {
  const r = rng(seed);
  notes.forEach(([t, m, g]) => bell(B, t, hz(m), { ...opts, gain: (opts.gain || 0.05) * (g || 1), pan: opts.pan != null ? opts.pan : (r() * 1.2 - 0.6) }));
}
const seq = (start, step, list) => list.map((m, i) => (m == null ? null : [start + i * step, m])).filter(Boolean);

/* ---------- rooms (all in D, sharing bell, halo and reverb) ---------- */
const ROOM_DEFS = {
  /* Arrival: dawn at the shrine door. Open fifths, a breath of air, glints that rise and settle. */
  arrival: { verb: 3.6, wet: 0.45, build(B, L) {
    drone(B, L, hz(N.D3), { type: 'triangle', gain: 0.03, lp: 900, depth: 0.4, k: 1, detune: 0.2 });
    drone(B, L, hz(N.A3), { type: 'triangle', gain: 0.022, lp: 900, depth: 0.5, k: 1, ph: 2 });
    drone(B, L, hz(N.D4), { gain: 0.016, depth: 0.7, k: 2, ph: 1 });
    noiseBed(B, L, { f: 2200, q: 0.6, gain: 0.006, k: 1, depth: 0.7, seed: 21 });
    bells(B, [...seq(1.0, 0.9, [N.D5, N.E5, N.Fs5, N.A5]), ...seq(9.0, 0.9, [N.A5, N.B5, N.D6]), ...seq(16.0, 0.9, [N.D5, N.Fs5, N.A5, N.E6]), ...seq(24.0, 1.1, [N.B5, N.A5, N.Fs5])], { gain: 0.034, decay: 3.4 }, 12);
    halo(B, L, 1.2);
  } },
  /* Axial hub: celestial clockwork at the centre. Warm D major add9, a slow turning bell ostinato. */
  axial: { verb: 3.4, wet: 0.42, build(B, L) {
    drone(B, L, hz(N.D2), { gain: 0.04, depth: 0.25, k: 1 });
    drone(B, L, hz(N.D3), { type: 'triangle', gain: 0.022, lp: 1100, depth: 0.35, k: 2, detune: 0.15 });
    drone(B, L, hz(N.A3), { gain: 0.022, depth: 0.5, k: 1, ph: 1.5, pan: -0.2 });
    drone(B, L, hz(N.Fs4), { gain: 0.012, depth: 0.7, k: 3, ph: 0.5, pan: 0.25 });
    drone(B, L, hz(N.E5), { gain: 0.006, depth: 0.9, k: 2, ph: 3, pan: -0.3 });
    const o = [N.D5, N.A4, N.Fs5, N.E5, N.D5, N.A4, N.B4, N.A4, N.D5, N.A4, N.Fs5, N.A5];
    bells(B, seq(0.4, 2.5, o), { gain: 0.03, decay: 3.0 }, 21);
    halo(B, L);
  } },
  /* Courage: the Forge of Valor. Low warm brass-like drone, a slow distant heartbeat, faint embers. */
  courage: { verb: 3.0, wet: 0.36, build(B, L) {
    drone(B, L, hz(N.D2), { type: 'sawtooth', gain: 0.022, lp: 380, depth: 0.3, k: 1, detune: 0.3 });
    drone(B, L, hz(N.A2), { type: 'sawtooth', gain: 0.014, lp: 420, depth: 0.4, k: 2, ph: 1 });
    drone(B, L, hz(N.D3), { type: 'triangle', gain: 0.018, lp: 800, depth: 0.5, k: 1, ph: 2 });
    for (let i = 0; i < 8; i++) { const t = i * 3.75 + 0.2; thump(B, t, { gain: 0.07 }); thump(B, t + 0.42, { gain: 0.04 }); }
    const r = rng(31); for (let i = 0; i < 26; i++) tick(B, r() * (L - 0.5), { f: 2400 + r() * 2400, gain: 0.012 + r() * 0.012, pan: r() * 1.6 - 0.8, seed: 100 + i });
    bells(B, [[3.9, N.D4], [4.8, N.A4], [5.7, N.C5], [18.9, N.D4], [19.8, N.A4], [20.7, N.D5, 0.8], [11.4, N.G4, 0.7], [26.4, N.F4, 0.7]], { gain: 0.034, decay: 3.2, bright: 0.8 }, 32);
    halo(B, L, 0.9);
  } },
  /* Justice: the Scales of Equity. Pure fifths in a marble hall, bells answering left and right in balance. */
  justice: { verb: 4.2, wet: 0.5, build(B, L) {
    drone(B, L, hz(N.D3), { gain: 0.026, depth: 0.3, k: 1 });
    drone(B, L, hz(N.A3), { gain: 0.02, depth: 0.3, k: 1, ph: Math.PI });
    drone(B, L, hz(N.D4), { gain: 0.01, depth: 0.6, k: 2, pan: -0.3 });
    drone(B, L, hz(N.A4), { gain: 0.008, depth: 0.6, k: 2, ph: Math.PI, pan: 0.3 });
    const call = [[N.D5, N.A5], [N.E5, N.B5], [N.Fs5, N.Cs6], [N.A4, N.E5], [N.D5, N.A5], [N.G4, N.D5]];
    call.forEach(([a, b], i) => { const t = 0.5 + i * 5; bell(B, t, hz(a), { gain: 0.032, pan: -0.6, decay: 3.4 }); bell(B, t + 1.25, hz(b), { gain: 0.026, pan: 0.6, decay: 3.4 }); });
    halo(B, L);
  } },
  /* Humanity: the Hearth of Hearts. Warm close chords and a slow lullaby on soft kalimba-like bells. */
  humanity: { verb: 3.0, wet: 0.38, build(B, L) {
    drone(B, L, hz(N.D2), { gain: 0.03, depth: 0.2 });
    const ch = [[N.D3, N.A3, N.Fs4, N.E5], [N.G3, N.D4, N.B4, N.E5], [N.B3, N.Fs4, N.A4, N.D5], [N.A3, N.E4, N.G4, N.Cs5]];
    ch.forEach((c, i) => c.forEach((m, j) => swell(B, i * 7.5, hz(m), { dur: 8.6, att: 2.2, rel: 2.6, gain: 0.016 - j * 0.002, type: 'triangle', lp: 1300, pan: (j - 1.5) * 0.25 })));
    const mel = [[1.0, N.Fs5], [2.0, N.A5], [3.0, N.Fs5], [4.5, N.E5], [8.5, N.D5], [9.5, N.E5], [10.5, N.Fs5], [12.0, N.D5], [16.0, N.B4], [17.0, N.D5], [18.0, N.Fs5], [19.5, N.E5], [23.5, N.Cs5], [24.5, N.E5], [25.5, N.A4]];
    bells(B, mel, { gain: 0.03, decay: 2.2, bright: 0.45, attack: 0.012 }, 41);
    halo(B, L, 0.8);
  } },
  /* Temperance: the Veil of Balance. Slow sea swells breathing every ten seconds, still tones, a rare drop. */
  temperance: { verb: 3.6, wet: 0.45, build(B, L) {
    noiseBed(B, L, { type: 'lowpass', f: 650, q: 0.3, gain: 0.03, k: 3, depth: 0.85, seed: 51, wet: 0.5 });
    noiseBed(B, L, { type: 'bandpass', f: 1800, q: 0.5, gain: 0.006, k: 3, depth: 0.9, ph: 0.6, seed: 52, wet: 0.8, pan: 0.2 });
    drone(B, L, hz(N.D3), { gain: 0.022, depth: 0.3 });
    drone(B, L, hz(N.A3), { gain: 0.018, depth: 0.4, k: 3, ph: 1, detune: 0.1 });
    drone(B, L, hz(N.D4), { gain: 0.01, depth: 0.5, k: 3, ph: 2 });
    bells(B, [[2.2, N.A5], [8.6, N.D6, 0.7], [14.1, N.Fs5], [21.0, N.E6, 0.6], [26.8, N.A5, 0.8]], { gain: 0.03, decay: 3.6, bright: 0.6 }, 53);
    halo(B, L);
  } },
  /* Wisdom: the Prism of Insight. Lydian glass: quick crystalline arpeggios over a shimmering bed. */
  wisdom: { verb: 3.8, wet: 0.48, build(B, L) {
    drone(B, L, hz(N.D3), { gain: 0.022, depth: 0.3 });
    drone(B, L, hz(N.A3), { gain: 0.016, depth: 0.4, k: 2, pan: -0.2 });
    drone(B, L, hz(N.E4), { gain: 0.01, depth: 0.6, k: 1, ph: 2, pan: 0.25 });
    drone(B, L, hz(N.Gs4), { gain: 0.007, depth: 0.8, k: 3, ph: 1, pan: -0.25 });
    const arps = [[0.6, [N.D5, N.Fs5, N.A5, N.Cs6]], [6.4, [N.E5, N.Gs5, N.B5, N.E6]], [12.2, [N.A4, N.Cs5, N.E5, N.Gs5]], [18.1, [N.D5, N.Fs5, N.A5, N.Fs6]], [24.0, [N.B4, N.E5, N.Gs5, N.Cs6]]];
    const r = rng(61);
    arps.forEach(([t, ms]) => ms.forEach((m, i) => bell(B, t + i * 0.16, hz(m), { gain: 0.022 - i * 0.002, decay: 2.4, bright: 1.3, pan: -0.5 + i * 0.33 + (r() - 0.5) * 0.1 })));
    bells(B, [[3.6, N.Gs5, 0.6], [15.4, N.Cs6, 0.5], [27.6, N.Gs5, 0.5]], { gain: 0.03, decay: 3.6 }, 62);
    halo(B, L);
  } },
  /* Transcendence: the Nebula of Awe. A vast slowly turning cluster, deep swell below, faint stars above. */
  transcendence: { verb: 4.6, wet: 0.58, build(B, L) {
    drone(B, L, hz(N.D2), { gain: 0.03, depth: 0.6, k: 1 });
    [[N.D3, 1, 0, -0.5], [N.A3, 2, 1, 0.5], [N.E4, 3, 2, -0.3], [N.A4, 1, 3.5, 0.3], [N.B4, 2, 4.5, -0.6], [N.Fs5, 3, 5.5, 0.6]].forEach(([m, k, ph, pan], i) =>
      drone(B, L, hz(m), { gain: 0.016 - i * 0.0018, depth: 0.85, k, ph, pan, detune: 0.1 }));
    const r = rng(71); for (let i = 0; i < 22; i++) bell(B, r() * (L - 0.3), hz([N.A5, N.B5, N.D6, N.E6, N.Fs6, N.A6][Math.floor(r() * 6)]), { gain: 0.006 + r() * 0.006, decay: 1.6, bright: 0.3, pan: r() * 1.8 - 0.9, wet: 1.4 });
    bells(B, [[5.0, N.D5], [20.0, N.A4]], { gain: 0.028, decay: 4.2 }, 72);
    halo(B, L, 1.3);
  } },
  /* Shadow: the Veil of Shadows. Darker D minor, low and hollow, cave wind, a distant bell. Never harsh. */
  shadow: { verb: 4.2, wet: 0.55, build(B, L) {
    drone(B, L, hz(N.D2), { type: 'triangle', gain: 0.03, lp: 420, depth: 0.3, k: 1, detune: 0.2 });
    drone(B, L, hz(N.A2), { type: 'triangle', gain: 0.018, lp: 480, depth: 0.5, k: 1, ph: Math.PI });
    drone(B, L, hz(N.F3), { gain: 0.012, depth: 0.7, k: 2, ph: 1, pan: -0.25 });
    noiseBed(B, L, { type: 'bandpass', f: 420, q: 1.4, gain: 0.03, k: 2, depth: 0.8, seed: 81, wet: 0.7, pan: -0.2 });
    noiseBed(B, L, { type: 'bandpass', f: 650, q: 2.2, gain: 0.014, k: 3, depth: 0.9, ph: 2, seed: 82, wet: 0.8, pan: 0.3 });
    bells(B, [[2.0, N.D4], [9.5, N.Bb3, 0.9], [17.0, N.F4, 0.8], [24.5, N.A3, 0.9]], { gain: 0.036, decay: 4.0, bright: 0.5, wet: 1.3 }, 83);
    halo(B, L, 0.6, true);
  } },
  /* Hall of Virtues: a reverent ivory hall. A soft organ-like choir moving through four chords. */
  hall: { verb: 4.0, wet: 0.5, build(B, L) {
    drone(B, L, hz(N.D2), { gain: 0.028, depth: 0.2 });
    const ch = [[N.D3, N.A3, N.D4, N.Fs4], [N.B3 - 12, N.Fs4 - 12, N.B3, N.D4], [N.G3, N.D4, N.G4, N.B4], [N.A3, N.D4, N.E4, N.A4]];
    ch.forEach((c, i) => c.forEach((m, j) => swell(B, i * 7.5, hz(m), { dur: 9.2, att: 2.4, rel: 3.0, gain: 0.012, partials: [1, 0.35, 0.18, 0.08], lp: 2400, pan: (j - 1.5) * 0.3 })));
    bells(B, [[0.3, N.D5, 0.8], [15.3, N.G5, 0.6]], { gain: 0.03, decay: 3.8 }, 91);
    halo(B, L, 1.1);
  } }
};

/** Render one seamless loop for a room: Float32Array per channel, LOOP_SEC long, normalized. */
export async function renderRoom(id, { sr = RENDER_SR, periods = 0, Offline = (typeof OfflineAudioContext !== 'undefined' ? OfflineAudioContext : window.webkitOfflineAudioContext) } = {}) {
  const def = ROOM_DEFS[id] || ROOM_DEFS.axial, L = LOOP_SEC;
  const total = Math.ceil(((periods || 1) * L + TAIL_SEC) * sr);
  const ctx = new Offline(2, total, sr);
  const B = buses(ctx, ctx.destination, { verb: def.verb, wet: def.wet, seed: 7 });
  for (let p = 0; p < (periods || 1); p++) { B.t0 = p * L; def.build(B, L); }
  const out = await new Promise((res, rej) => {
    const p = ctx.startRendering();
    if (p && p.then) p.then(res, rej); else ctx.oncomplete = (e) => res(e.renderedBuffer);
  });
  if (periods) return { sr, raw: [out.getChannelData(0), out.getChannelData(1)] };   // verification only
  const n = Math.round(L * sr), chans = [];
  let sq = 0, peak = 0;
  for (let c = 0; c < 2; c++) {
    const src = out.getChannelData(c), d = new Float32Array(n);
    for (let i = 0; i < n; i++) d[i] = src[i] + (i + n < src.length ? src[i + n] : 0);   // fold the tail onto the start
    // level is judged above about 150 Hz (what a phone speaker plays), so deep drones never make a room sound quiet
    let hp = 0, prev = 0; const a1 = Math.exp(-2 * Math.PI * 150 / sr);
    for (let i = 0; i < n; i++) { hp = a1 * (hp + d[i] - prev); prev = d[i]; sq += hp * hp; const a = Math.abs(d[i]); if (a > peak) peak = a; }
    chans.push(d);
  }
  const rms = Math.sqrt(sq / (2 * n)) || 1;
  const k = Math.min(0.045 / rms, 0.6 / (peak || 1));                                    // about -27 dBFS above 150 Hz, peaks under -4.4 dBFS
  chans.forEach((d) => { for (let i = 0; i < n; i++) d[i] *= k; });
  return { sr, chans };
}

/* ---------- UI sounds (short, synthesized live) ---------- */
export const UI_SOUNDS = ['tap', 'open', 'gate', 'close'];
export const uiImpulse = (ctx) => impulse(ctx, 2.2, 9);
export function playUi(ctx, dest, verbBus, name, t = ctx.currentTime) {
  const lift = (to) => { const g = ctx.createGain(); g.gain.value = 4; g.connect(to); return g; };   // sits just above the room loop
  const B = { ctx, dry: lift(dest), wet: lift(verbBus) };
  if (name === 'tap') {
    bell(B, t, hz(N.A5), { gain: 0.05, decay: 0.5, bright: 0.5, wet: 0.4 });
  } else if (name === 'open') {
    bell(B, t, hz(N.A5), { gain: 0.05, decay: 1.6, bright: 0.7, pan: -0.15 });
    bell(B, t + 0.12, hz(N.D6), { gain: 0.045, decay: 2.0, bright: 0.7, pan: 0.15 });
  } else if (name === 'close') {
    bell(B, t, hz(N.D6), { gain: 0.04, decay: 1.0, bright: 0.6, pan: 0.15 });
    bell(B, t + 0.1, hz(N.A5), { gain: 0.04, decay: 1.3, bright: 0.6, pan: -0.15 });
  } else if (name === 'gate') {
    // a soft rising breath of air into a warm open chord
    const n = Math.floor(1.6 * ctx.sampleRate), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0), r = rng(5);
    for (let i = 0; i < n; i++) d[i] = r() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.Q.value = 0.9;
    fl.frequency.setValueAtTime(300, t); fl.frequency.exponentialRampToValueAtTime(2600, t + 1.1);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 0.6); g.gain.linearRampToValueAtTime(0, t + 1.5);
    s.connect(fl); fl.connect(g); send(B, g, 0.9); s.start(t); s.stop(t + 1.6);
    [N.D4, N.A4, N.D5, N.Fs5].forEach((m, i) => bell(B, t + 0.5 + i * 0.07, hz(m), { gain: 0.03, decay: 2.6, bright: 0.6, pan: (i - 1.5) * 0.3, attack: 0.03 }));
  }
}

/* ---------- live engine ---------- */
const S = { on: false, ctx: null, master: null, music: null, ui: null, uiVerb: null, room: null, cur: null, cache: new Map(), job: 0, listeners: new Set(), unlockArmed: false };
function readPref() { try { return localStorage.getItem(SOUND_KEY) === 'on'; } catch { return false; } }
function writePref(v) { try { localStorage.setItem(SOUND_KEY, v ? 'on' : 'off'); } catch { /* private mode: this visit only */ } }
const notify = () => S.listeners.forEach((f) => { try { f(S.on); } catch { /* ignore */ } });

function ensureCtx() {
  if (S.ctx) return S.ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch { /* Safari 17+: mixes politely, respects the silent switch */ }
  const ctx = new AC();
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ctx.destination);
  S.master = ctx.createGain(); S.master.gain.value = 1; S.master.connect(comp);
  S.music = ctx.createGain(); S.music.gain.value = MUSIC_VOL; S.music.connect(S.master);
  S.ui = ctx.createGain(); S.ui.gain.value = UI_VOL; S.ui.connect(S.master);
  S.uiVerb = ctx.createConvolver(); S.uiVerb.normalize = true; S.uiVerb.buffer = uiImpulse(ctx);
  const vg = ctx.createGain(); vg.gain.value = 0.35; S.uiVerb.connect(vg); vg.connect(S.ui);
  // iOS: a silent one-sample buffer played inside the tap unlocks output
  const b = ctx.createBuffer(1, 1, 22050), s = ctx.createBufferSource(); s.buffer = b; s.connect(ctx.destination); s.start(0);
  S.ctx = ctx;
  return ctx;
}
/** Call from inside a user gesture. Returns true when audio is running (or about to). */
function unlock() {
  const ctx = ensureCtx(); if (!ctx) return false;
  if (ctx.state !== 'running') ctx.resume().catch(() => {});
  return true;
}
/** Remembered "on" from a past visit: wait for the first tap / key anywhere, then start. */
function armUnlock() {
  if (S.unlockArmed) return; S.unlockArmed = true;
  const go = () => {
    ['pointerdown', 'touchend', 'keydown', 'click'].forEach((e) => document.removeEventListener(e, go, true));
    S.unlockArmed = false;
    if (S.on && unlock()) applyRoom();
  };
  ['pointerdown', 'touchend', 'keydown', 'click'].forEach((e) => document.addEventListener(e, go, true));
}

async function loopBuffer(id) {
  if (S.cache.has(id)) { const b = S.cache.get(id); S.cache.delete(id); S.cache.set(id, b); return b; }
  const { sr, chans } = await renderRoom(id);
  const b = S.ctx.createBuffer(2, chans[0].length, sr);
  chans.forEach((d, c) => { if (b.copyToChannel) b.copyToChannel(d, c); else b.getChannelData(c).set(d); });
  S.cache.set(id, b);
  while (S.cache.size > 2) S.cache.delete(S.cache.keys().next().value);   // keep the memory small on phones
  return b;
}
function fadeOut(v, sec = FADE_SEC) {
  if (!v) return;
  const t = S.ctx.currentTime;
  v.gain.gain.cancelScheduledValues(t); v.gain.gain.setValueAtTime(v.gain.gain.value, t); v.gain.gain.linearRampToValueAtTime(0, t + sec);
  try { v.src.stop(t + sec + 0.05); } catch { /* already stopped */ }
}
async function applyRoom() {
  if (!S.ctx) return;
  const id = S.on ? S.room : null;
  if ((S.cur && S.cur.id) === id) return;
  const job = ++S.job;
  if (!id) { fadeOut(S.cur, 1.2); S.cur = null; return; }
  let buf;
  try { buf = await loopBuffer(id); } catch (err) { console.warn('Aretoria sound: could not render', id, err); return; }
  if (job !== S.job || !S.on || S.room !== id) return;   // the visitor moved on while this rendered
  const t = S.ctx.currentTime, src = S.ctx.createBufferSource(), g = S.ctx.createGain();
  src.buffer = buf; src.loop = true; src.connect(g); g.connect(S.music);
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + FADE_SEC);
  src.start(t);
  fadeOut(S.cur);
  S.cur = { id, src, gain: g };
}

export const sound = {
  get on() { return S.on; },
  /** Which loop should be heard: a ROOMS id, or null for silence (Aretoria closed). */
  room(id) { S.room = id || null; if (S.on && S.ctx && S.ctx.state === 'running') applyRoom(); else if (S.on && S.ctx) { S.ctx.resume().then(applyRoom, () => {}); } },
  /** Toggle from the speaker button (a user gesture). */
  toggle() { return sound.set(!S.on); },
  set(v) {
    S.on = !!v; writePref(S.on);
    if (S.on) { if (unlock()) { applyRoom(); playUi(S.ctx, S.ui, S.uiVerb, 'open'); } }
    else if (S.ctx) { S.job++; fadeOut(S.cur, 0.8); S.cur = null; }
    notify();
    return S.on;
  },
  /** Soft UI cue: 'tap' | 'open' | 'gate' | 'close'. Silent unless sound is on and running. */
  ui(name) { if (S.on && S.ctx && S.ctx.state === 'running') playUi(S.ctx, S.ui, S.uiVerb, name); },
  onChange(f) { S.listeners.add(f); return () => S.listeners.delete(f); },
  init() {
    S.on = readPref();
    if (S.on) armUnlock();
    document.addEventListener('visibilitychange', () => {
      if (!S.ctx) return;
      if (document.hidden) S.ctx.suspend().catch(() => {});
      else if (S.on) S.ctx.resume().catch(() => {});
    });
    // iOS can leave the context "interrupted" after a call or app switch; the next tap brings it back
    document.addEventListener('pointerdown', () => { if (S.on && S.ctx && S.ctx.state !== 'running') S.ctx.resume().then(applyRoom, () => {}); }, true);
  }
};
