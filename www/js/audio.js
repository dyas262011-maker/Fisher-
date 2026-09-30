/**
 * js/audio.js
 * Semua suara dibuat langsung oleh Web Audio API (osilator + noise buffer),
 * BUKAN file audio eksternal. Ini disengaja: menghindari masalah lisensi
 * aset suara dan membuat ukuran game tetap kecil. Ganti dengan file audio
 * asli/berlisensi jelas sebelum rilis komersial (lihat README).
 */
const Audio2 = (() => {
  let ctx = null, master = null, ambientGain = null, noiseBuf = null, ambientStarted = false;
  let enabled = true;

  function ensure() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); }
    catch (e) { return; }
    master = ctx.createGain(); master.gain.value = enabled ? 0.8 : 0; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0); let b = 0;
    for (let i = 0; i < d.length; i++) { const w = Math.random() * 2 - 1; b = (b + 0.02 * w) / 1.02; d[i] = b * 3.2; }
  }

  function setEnabled(on) { enabled = on; if (master) master.gain.setTargetAtTime(on ? 0.8 : 0, ctx.currentTime, 0.05); }

  function tone(freq, dur, type, vol, slideTo, delay) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + (delay || 0);
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol || 0.08, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, freq, vol, filterType, delay) {
    if (!ctx || !enabled) return;
    const t = ctx.currentTime + (delay || 0);
    const s = ctx.createBufferSource(); s.buffer = noiseBuf;
    const f = ctx.createBiquadFilter(); f.type = filterType || 'bandpass'; f.frequency.setValueAtTime(freq, t);
    const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t, Math.random() * 1.5); s.stop(t + dur + 0.05);
  }

  function startAmbient() {
    if (ambientStarted || !ctx) return; ambientStarted = true;
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
    ambientGain = ctx.createGain(); ambientGain.gain.value = 0.07;
    src.connect(lp); lp.connect(ambientGain); ambientGain.connect(master); src.start();
  }
  function setAmbientLevel(v) { if (ambientGain) ambientGain.gain.setTargetAtTime(v, ctx.currentTime, 0.6); }

  // Efek suara bernama. Tingkat rarity mempengaruhi kemegahan chime tangkapan.
  const SFX = {
    click: () => tone(880, 0.05, 'square', 0.05),
    cast: () => tone(500, 0.25, 'sawtooth', 0.05, 150),
    plop: () => tone(420, 0.12, 'sine', 0.16, 140),
    bite: () => { tone(300, 0.16, 'sine', 0.2, 110); tone(1320, 0.08, 'square', 0.05); },
    hook: () => { tone(220, 0.1, 'square', 0.07, 440); tone(660, 0.1, 'square', 0.05, 0, 0.06); },
    reelTick: () => tone(2300 + Math.random() * 300, 0.018, 'square', 0.03),
    snap: () => tone(1800, 0.2, 'sawtooth', 0.08, 200),
    miss: () => { tone(440, 0.12, 'triangle', 0.08, 330); tone(330, 0.18, 'triangle', 0.08, 247, 0.1); },
    buy: () => { tone(784, 0.07, 'square', 0.05); tone(1047, 0.07, 'square', 0.05, 0, 0.06); tone(1568, 0.2, 'square', 0.05, 0, 0.12); },
    err: () => tone(160, 0.18, 'square', 0.06, 120),
    levelUp: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'square', 0.05, 0, i * 0.09)),
    catch: (rarityOrder) => {
      const chords = [[523], [523, 659], [523, 659, 784], [523, 659, 784, 1047], [392, 523, 659, 784, 1047], [392, 523, 659, 784, 1047, 1319], [261, 392, 523, 659, 784, 1047, 1319]];
      const notes = chords[Math.min(rarityOrder, chords.length - 1)];
      notes.forEach((f, i) => tone(f, 0.25 + rarityOrder * 0.05, 'triangle', 0.06, 0, i * 0.07));
    },
  };
  function play(name, arg) { if (SFX[name]) SFX[name](arg); }

  return { ensure, setEnabled, play, startAmbient, setAmbientLevel };
})();
