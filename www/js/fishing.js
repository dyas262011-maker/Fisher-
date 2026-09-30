/**
 * js/fishing.js
 * Mesin state gameplay memancing + render canvas. Semua digambar dengan
 * bentuk vektor (path canvas), bukan pixel-art, supaya tampilan bersih &
 * halus di berbagai resolusi layar (lihat catatan gaya di README).
 *
 * Alur state: idle -> charge -> cast -> wait -> (nibble ->) bite -> reel
 *             -> landing -> caught (menunggu pilihan Jual/Simpan/Pamerkan)
 *             kegagalan apa pun -> fail -> kembali ke idle
 */
const Fishing = (() => {
  let cv, ctx, W = 360, H = 640, DPR = 1;
  let active = false, locId = null, loc = null, weather = 'cerah', weatherLv = 0;
  let T = 0, dayP = 0.32, DAYLEN = 360;
  let horizon = 0, dockY = 0, dockEnd = 0;
  let rodAngle = -1.05, rodVel = 0, bend = 0, hopY = 0, hopVel = 0;
  let hold = false, combo = 0;
  let ripples = [], particles = [], weatherParticles = [];
  let lastFrameT = null;

  // State ikan yang sedang diproses (dikumpulkan dalam satu objek per konvensi kode sebelumnya)
  const F = {
    s: 'idle', t: 0, power: 0, pdir: 1,
    bx: 0, by: 0, sx: 0, sy: 0, tx: 0, ty: 0, castPw: 0, flightDur: 0.6,
    fishId: null, wait: 0, nib: 0, dip: 0,
    dist: 1, tension: 0, stam: 1, stamMax: 1, rush: 0, rushT: 1, over: 0,
    fx: 0, fy: 0, fdir: 1, phase: 0, landFromX: 0, landFromY: 0,
    result: null, msg: '',
  };

  // ---------- DOM refs ----------
  let dom = {};
  function bindDom() {
    dom = {
      hCoin: document.getElementById('hCoin'), hLv: document.getElementById('hLv'),
      hLoc: document.getElementById('hLoc'), hMenu: document.getElementById('hMenu'),
      hint: document.getElementById('hint'),
      rowPower: document.getElementById('rowPower'), fillPower: document.getElementById('fillPower'),
      rowTen: document.getElementById('rowTen'), fillTen: document.getElementById('fillTen'),
      rowDist: document.getElementById('rowDist'), fillDist: document.getElementById('fillDist'),
      rowStam: document.getElementById('rowStam'), fillStam: document.getElementById('fillStam'),
      modal: document.getElementById('catchModal'), cmBadge: document.getElementById('cmBadge'),
      cmRarity: document.getElementById('cmRarity'), cmName: document.getElementById('cmName'),
      cmStats: document.getElementById('cmStats'), cmDesc: document.getElementById('cmDesc'),
      cmCanvas: document.getElementById('cmCanvas'),
      cmSell: document.getElementById('cmSell'), cmKeep: document.getElementById('cmKeep'),
      cmShow: document.getElementById('cmShow'), cmClose: document.getElementById('cmClose'),
    };
  }

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    W = cv.clientWidth; H = cv.clientHeight;
    cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    horizon = Math.round(H * 0.4);
    dockY = Math.round(H * 0.72);
    dockEnd = Math.round(Math.min(W * 0.42, 250));
  }

  function charX() { return dockEnd - 34; }
  function charFeet() { return dockY + Math.round(hopY); }
  function handPos() { const y = charFeet() - 46; return { x: charX() + 24, y }; }
  function rodTip() { const h = handPos(); return { x: h.x + Math.cos(rodAngle) * 62, y: h.y + Math.sin(rodAngle) * 62 + bend }; }
  function waterEntry() { return { x: dockEnd + 10, y: dockY + 26 }; }
  function castTarget(pw) {
    const minX = dockEnd + 30, maxX = W - 40;
    return {
      x: lerp(minX, maxX, 0.15 + pw * 0.85),
      y: lerp(Math.min(H - 30, dockY + 60), horizon + 24, pw),
    };
  }

  // ---------- Siklus waktu & cuaca ----------
  function timeOfDay() { return timeOfDayFromP(dayP); }
  function skyLerp() {
    // Interpolasi sederhana pagi->siang->sore->malam berdasarkan dayP (0..1)
    const stops = [
      [0.00, ['#12203a', '#2b3550']], [0.20, ['#1c2c4a', '#e0a566']],
      [0.30, ['#3a5a78', '#e7c98a']], [0.45, loc.sky], [0.68, loc.sky],
      [0.78, ['#5a4a78', '#e08a5a']], [0.88, ['#1a1a3a', '#3a2a5a']], [1.00, ['#12203a', '#2b3550']],
    ];
    let i = 0; while (i < stops.length - 2 && stops[i + 1][0] <= dayP) i++;
    const a = stops[i], b = stops[i + 1];
    const t = (dayP - a[0]) / (b[0] - a[0] || 1);
    return [mixHex(a[1][0], b[1][0], t), mixHex(a[1][1], b[1][1], t)];
  }
  function mixHex(a, b, t) { return rgbCss(mix(hx(a), hx(b), t)); }
  function nightFactor() { const p = dayP; if (p < 0.2) return 1; if (p < 0.3) return 1 - (p - 0.2) / 0.1; if (p < 0.76) return 0; if (p < 0.86) return (p - 0.76) / 0.1; return 1; }

  // ---------- Mulai sesi memancing ----------
  function start(locationId) {
    locId = locationId; loc = LOCATIONS_BY_ID[locId];
    visitLocation(PLAYER, locId);
    weather = loc.weather[(Math.random() * loc.weather.length) | 0];
    weatherLv = weather === 'cerah' ? 0 : (weather === 'badai' ? 0.95 : 0.6);
    weatherParticles = [];
    setState('idle'); F.result = null; combo = 0;
    active = true;
    Audio2.ensure(); Audio2.startAmbient();
    updateChipStatic();
  }
  function stop() { active = false; if (F.s === 'charge') { hold = false; } }
  function isActive() { return active; }
  function isBusy() { return !['idle', 'fail'].includes(F.s); }
  function currentLocId() { return locId; }

  function setState(s) { F.s = s; F.t = 0; }

  // ---------- Pilih ikan & mulai menyambar ----------
  function pick() {
    const eq = equippedStats(PLAYER);
    return pickFish(locId, timeOfDay(), weather, eq.luck);
  }

  function fail(msg) { setState('fail'); F.msg = msg; combo = 0; hold = false; Audio2.play('miss'); }

  // ---------- Input ----------
  function pointerDown() {
    if (!active) return;
    switch (F.s) {
      case 'idle': setState('charge'); F.power = 0; F.pdir = 1; hold = true; Audio2.play('click'); break;
      case 'bite': hold = true; hook(); break;
      case 'wait': case 'nibble': fail('Terlalu cepat! Tunggu sampai ikan benar-benar menyambar.'); break;
      case 'reel': hold = true; break;
    }
  }
  function pointerUp() {
    hold = false;
    if (F.s === 'charge') release();
  }

  function release() {
    const pw = clamp(F.power, 0, 1); F.castPw = pw;
    const tgt = castTarget(pw), tip = rodTip();
    F.sx = tip.x; F.sy = tip.y; F.tx = tgt.x; F.ty = tgt.y;
    F.flightDur = 0.5 + pw * 0.4;
    setState('cast'); rodVel -= 9; Audio2.play('cast');
  }

  function hook() {
    const fish = FISH_BY_ID[F.fishId];
    setState('reel');
    F.dist = 1; F.tension = 0.15; F.rush = 0; F.rushT = 1 + Math.random() * 2; F.over = 0;
    const eq = equippedStats(PLAYER);
    F.stamMax = 4 + fish.stam * 5; F.stam = F.stamMax;
    F.fx = F.bx; F.fy = F.by; F.phase = 0;
    splash(F.bx, F.by, 10); ripple(F.bx, F.by, 26);
    Audio2.play('hook');
  }

  function reelStep(dt) {
    const fish = FISH_BY_ID[F.fishId], eq = equippedStats(PLAYER);
    const sR = F.stam / F.stamMax;
    if (F.rush > 0) F.rush -= dt;
    else {
      F.rushT -= dt;
      if (F.rushT <= 0) { F.rush = 0.6 + Math.random() * 0.9; F.rushT = (1.2 + Math.random() * 2.4) / (0.5 + fish.burst * 2); ripple(F.fx, F.fy, 22); splash(F.fx, F.fy, 6); }
    }
    const pull = fish.pull * (F.rush > 0 ? 1.9 : 1) * (0.35 + 0.65 * sR) / Math.max(0.6, eq.power);
    const lineStr = eq.lineStr;
    if (hold) F.tension += (0.22 + pull * 0.95) / lineStr * dt * 0.95;
    else F.tension -= (0.55 + 0.25 * (1 - pull)) * dt;
    if (F.rush > 0) F.tension += pull * 0.45 / lineStr * dt;
    F.tension = clamp(F.tension, 0, 1.05);

    if (F.tension >= 1) { F.over += dt; if (F.over > 0.4) return fail('Tali putus! Ikan terlalu kuat.'); }
    else F.over = Math.max(0, F.over - dt * 2);

    if (hold) F.dist -= eq.reelSpeed * 0.22 * dt * (1 - Math.min(0.6, pull * 0.5)) * (F.rush > 0 ? 0.4 : 1);
    else F.dist += pull * pull * 0.2 * dt * (0.4 + 0.6 * sR);
    if (F.rush > 0) F.dist += pull * pull * 0.14 * dt;

    F.stam = Math.max(0, F.stam - dt * (hold ? 1 : 0.35) * (F.tension > 0.25 && F.tension < 0.92 ? 1.5 : 0.5));

    if (F.dist >= 1.25) return fail('Ikan berhasil kabur!');
    if (F.dist <= 0) {
      F.dist = 0; setState('landing'); F.landFromX = F.fx; F.landFromY = F.fy;
      splash(F.fx, F.fy, 16); Audio2.play('plop'); return;
    }
    const we = waterEntry(), d = clamp(F.dist, 0, 1.2);
    const wig = (F.rush > 0 ? 16 : 7) * (0.4 + sR * 0.6);
    F.phase += dt * (F.rush > 0 ? 6 : 2.4) * fish.spd;
    const tx = lerp(we.x, F.bx, d) + Math.sin(F.phase) * wig, ty = lerp(we.y, F.by, d) + Math.cos(F.phase * 0.7) * wig * 0.35;
    const ox = F.fx, k = Math.min(1, dt * 6);
    F.fx += (tx - F.fx) * k; F.fy = Math.max(horizon + 10, F.fy + (ty - F.fy) * k);
    if (Math.abs(F.fx - ox) > 0.05) F.fdir = F.fx > ox ? 1 : -1;
    if (Math.random() < dt * (F.rush > 0 ? 8 : 2)) ripple(F.fx + (Math.random() - 0.5) * 10, F.fy, 8);
  }

  function finishLanding() {
    const fish = FISH_BY_ID[F.fishId];
    const r = Math.pow(Math.random(), 1.5 - equippedStats(PLAYER).luck * 0.2);
    const weight = +(fish.w[0] + (fish.w[1] - fish.w[0]) * r).toFixed(2);
    const size = Math.round(fish.sz[0] + (fish.sz[1] - fish.sz[0]) * r);
    const price = Math.max(1, Math.round(fish.price * (0.7 + r * 0.6) * (1 + Math.min(combo, 5) * 0.05)));
    combo++;

    recordCatch(PLAYER, fish, weight, size, locId);
    const leveledUp = addXp(PLAYER, fish.diff * 12 + RARITY[fish.rarity].order * 20);
    const unlocked = checkAchievements(PLAYER);
    savePlayer(PLAYER);

    F.result = { fish, weight, size, price, leveledUp, unlocked };
    setState('caught');
    Audio2.play('catch', RARITY[fish.rarity].order);
    if (leveledUp) setTimeout(() => Audio2.play('levelUp'), 350);
    UI.showCatchModal(F.result);
    UI.refreshTopChips();
  }

  /** Dipanggil UI saat pemain menekan Jual/Simpan/Pamerkan pada kartu hasil. */
  function resolveCatch(action) {
    const r = F.result; if (!r) return;
    if (action === 'sell') { addCoins(PLAYER, r.price); UI.toast('Terjual +' + r.price + ' koin'); }
    else if (action === 'keep') { keepFish(PLAYER, r.fish, r.weight, r.size, r.price, locId, false); UI.toast('Disimpan di inventori ikan'); }
    else if (action === 'show') {
      const res = keepFish(PLAYER, r.fish, r.weight, r.size, r.price, locId, true);
      UI.toast(res.slotFull ? 'Disimpan (slot akuarium penuh)' : 'Dipamerkan di akuarium!');
    }
    savePlayer(PLAYER);
    F.result = null; setState('idle');
  }

  // ---------- Update ----------
  function ripple(x, y, m) { ripples.push({ x, y, r: 0, m }); }
  function splash(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 1.9, v = 55 + Math.random() * 70;
      particles.push({ x, y, vx: Math.cos(a) * v * 0.7, vy: Math.sin(a) * v, l: 0.55, t: 0, wy: y });
    }
  }

  function update(dt) {
    T += dt; dayP = (dayP + dt / DAYLEN) % 1;
    for (let i = ripples.length - 1; i >= 0; i--) { const r = ripples[i]; r.r += 40 * dt * (1 - r.r / r.m * 0.6); if (r.r >= r.m) ripples.splice(i, 1); }
    for (let i = particles.length - 1; i >= 0; i--) { const p = particles[i]; p.t += dt; p.vy += 260 * dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.t > p.l || (p.vy > 0 && p.y > p.wy + 4)) particles.splice(i, 1); }
    if (!active) return;
    updateWeatherParticles(dt);
    updateRodPhysics(dt);
    updateStateMachine(dt);
    updateHudDom();
  }

  function updateWeatherParticles(dt) {
    const isRain = weather === 'hujan' || weather === 'badai';
    const isSnow = weather === 'salju';
    if (isRain || isSnow) {
      const target = Math.round(weatherLv * W * 0.4);
      while (weatherParticles.length < target) weatherParticles.push({ x: Math.random() * (W + 60) - 30, y: -Math.random() * H, v: isSnow ? 40 + Math.random() * 30 : 220 + Math.random() * 80, snow: isSnow });
      weatherParticles.length = Math.min(weatherParticles.length, target);
      for (const p of weatherParticles) {
        p.y += p.v * dt; p.x += (p.snow ? Math.sin(T + p.y * 0.02) * 12 : -p.v * 0.15) * dt;
        if (p.y > H + 10) { p.y = -10; p.x = Math.random() * (W + 60) - 30; }
      }
    } else weatherParticles.length = 0;
  }

  function updateRodPhysics(dt) {
    let target = -1.05;
    if (F.s === 'charge') target = -1.05 - F.power * 1.05;
    else if (F.s === 'cast') target = -0.55;
    else if (F.s === 'wait' || F.s === 'nibble' || F.s === 'bite') target = -0.62;
    else if (F.s === 'reel') target = -0.9 - (hold ? 0.25 : 0);
    else if (F.s === 'caught') target = -1.3;
    rodVel += (target - rodAngle) * 140 * dt; rodVel *= Math.pow(0.0009, dt); rodAngle += rodVel * dt;
    const bendTarget = F.s === 'reel' ? 6 + F.tension * 16 : F.s === 'bite' ? 6 : F.s === 'nibble' ? F.dip * 4 : (F.s === 'wait' || F.s === 'cast') ? 2 : 0;
    bend += (bendTarget - bend) * Math.min(1, dt * 10);
    hopVel += 420 * dt; hopY += hopVel * dt; if (hopY > 0) { hopY = 0; hopVel = 0; }
  }

  function updateStateMachine(dt) {
    F.t += dt;
    switch (F.s) {
      case 'charge':
        F.power += F.pdir * dt * 1.1;
        if (F.power > 1) { F.power = 1; F.pdir = -1; } if (F.power < 0) { F.power = 0; F.pdir = 1; }
        break;
      case 'cast': {
        const k = Math.min(1, F.t / F.flightDur);
        F.bx = lerp(F.sx, F.tx, k); F.by = lerp(F.sy, F.ty, k) - Math.sin(k * Math.PI) * (34 + F.castPw * 50);
        if (k >= 1) {
          F.bx = F.tx; F.by = F.ty; splash(F.bx, F.by, 10); ripple(F.bx, F.by, 24); Audio2.play('plop');
          setState('wait'); F.wait = (2 + Math.random() * 5.5) / equippedStats(PLAYER).biteMult;
          F.fishId = pick().id; F.nib = Math.random() < 0.8 ? 1 + ((Math.random() * 3) | 0) : 0;
        }
        break;
      }
      case 'wait':
        F.wait -= dt; F.dip = Math.max(0, F.dip - dt * 4);
        if (F.wait <= 0) {
          if (F.nib > 0) { setState('nibble'); F.dip = 1; F.nib--; ripple(F.bx, F.by, 14); }
          else {
            setState('bite'); ripple(F.bx, F.by, 30); splash(F.bx, F.by, 8); Audio2.play('bite'); hopVel = -60;
            Events.trigger(FISH_BY_ID[F.fishId]);
          }
        }
        break;
      case 'nibble':
        F.dip = Math.max(0, 1 - F.t * 3.5);
        if (F.t > 0.45) { setState('wait'); F.wait = 0.5 + Math.random() * 1.4; }
        break;
      case 'bite':
        if (F.t > FISH_BY_ID[F.fishId].win + 0.25) fail('Terlalu lambat! Ikan lepas dari kail.');
        break;
      case 'reel': reelStep(dt); break;
      case 'landing': {
        const k = Math.min(1, F.t / 0.7), h = handPos();
        F.fx = lerp(F.landFromX, h.x - 10, k); F.fy = lerp(F.landFromY, h.y - 20, k) - Math.sin(k * Math.PI) * 40;
        if (k >= 1) finishLanding();
        break;
      }
      case 'fail': if (F.t > 1.4) setState('idle'); break;
    }
  }

  // ---------- HUD (DOM) ----------
  function updateChipStatic() {
    dom.hLoc.textContent = loc.name;
  }
  function refreshTopChipsInner() {
    dom.hCoin.textContent = '\uD83E\uDE99 ' + PLAYER.coins;
    dom.hLv.textContent = 'Lv ' + PLAYER.level;
  }
  function setBar(row, fill, show, frac, color) {
    row.classList.toggle('hidden', !show);
    if (show) { fill.style.width = Math.round(clamp(frac, 0, 1) * 100) + '%'; if (color) fill.style.background = color; }
  }
  function updateHudDom() {
    refreshTopChipsInner();
    const s = F.s;
    setBar(dom.rowPower, dom.fillPower, s === 'charge', F.power, F.power > 0.85 ? 'var(--r-legendary)' : null);
    setBar(dom.rowTen, dom.fillTen, s === 'reel', F.tension, F.tension > 0.85 ? 'var(--danger)' : null);
    setBar(dom.rowDist, dom.fillDist, s === 'reel', 1 - clamp(F.dist, 0, 1), null);
    setBar(dom.rowStam, dom.fillStam, s === 'reel', F.stam / F.stamMax, null);

    let hint = '';
    if (s === 'idle') hint = 'Tahan layar lalu lepas untuk melempar kail';
    else if (s === 'wait' || s === 'nibble') hint = 'Menunggu sambaran' + '.'.repeat(1 + Math.floor(T * 2) % 3);
    else if (s === 'bite') hint = 'Tap sekarang!';
    else if (s === 'reel') hint = F.tension > 0.9 ? 'Kendurkan sedikit!' : (F.rush > 0 ? 'Ikan melawan keras!' : (hold ? 'Menggulung...' : 'Tahan untuk menggulung'));
    else if (s === 'fail') hint = F.msg;
    dom.hint.textContent = hint;
    dom.hint.classList.toggle('warn', s === 'fail' || (s === 'reel' && F.tension > 0.9));
  }

  // ---------- Render ----------
  function drawSky() {
    const [top, bot] = skyLerp();
    const g = ctx.createLinearGradient(0, 0, 0, horizon); g.addColorStop(0, top); g.addColorStop(1, bot);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, horizon);
    const nf = nightFactor();
    if (nf > 0.05) {
      ctx.save(); ctx.globalAlpha = nf * (weather === 'cerah' ? 1 : 0.35);
      for (let i = 0; i < 40; i++) {
        const sx = (i * 97 + 31) % W, sy = (i * 53 + 11) % (horizon * 0.8);
        const tw = 0.5 + 0.5 * Math.sin(T * (1 + (i % 5) * 0.4) + i);
        ctx.globalAlpha = nf * 0.8 * tw; ctx.fillStyle = '#eaf0ff'; ctx.beginPath(); ctx.arc(sx, sy, 1.1, 0, 7); ctx.fill();
      }
      ctx.restore();
    }
    // matahari / bulan
    const sun = arcPos(0.22, 0.56), moon = arcPos(0.76, 0.46);
    if (sun) drawOrb(sun.x, sun.y, 16, '#ffe9b0', 0.9 * (1 - weatherLv));
    if (moon) drawOrb(moon.x, moon.y, 11, '#dfe6ff', 0.9);
    drawClouds();
    drawTreeline();
    if (weather === 'kabut' || weather === 'kabut_ungu') {
      ctx.fillStyle = weather === 'kabut_ungu' ? 'rgba(150,110,200,0.18)' : 'rgba(220,230,235,0.16)';
      ctx.fillRect(0, horizon * 0.4, W, horizon * 0.6);
    }
    if (weather === 'aurora') {
      for (let i = 0; i < 3; i++) {
        ctx.save(); ctx.globalAlpha = 0.14 + 0.06 * Math.sin(T * 0.4 + i);
        const g2 = ctx.createLinearGradient(0, 0, W, 0);
        g2.addColorStop(0, 'transparent'); g2.addColorStop(0.5, i % 2 ? '#7ff2c0' : '#a08bff'); g2.addColorStop(1, 'transparent');
        ctx.fillStyle = g2; ctx.fillRect(0, horizon * (0.1 + i * 0.12) + Math.sin(T * 0.3 + i) * 8, W, 14); ctx.restore();
      }
    }
  }
  function arcPos(centerP, span) {
    const a = (((dayP - centerP) % 1) + 1) % 1 / span;
    if (a > 1) return null;
    return { x: W * (0.08 + 0.84 * a), y: horizon + 6 - Math.sin(Math.PI * a) * horizon * 0.82 };
  }
  function drawOrb(x, y, r, color, alpha) {
    ctx.save(); ctx.globalAlpha = alpha * 0.25; const gg = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4);
    gg.addColorStop(0, color); gg.addColorStop(1, 'transparent'); ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, 7); ctx.fill();
    ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); ctx.restore();
  }
  const CLOUDS = [[0.1, 0.14, 46, 1], [0.55, 0.22, 60, 0.7], [0.8, 0.08, 38, 1.3], [0.32, 0.3, 34, 0.9]];
  function drawClouds() {
    ctx.save(); ctx.globalAlpha = 0.8 - weatherLv * 0.3;
    for (const c of CLOUDS) {
      const x = ((c[0] * W + T * 6 * c[3]) % (W + 120)) - 60, y = c[1] * horizon;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(x, y, c[2], c[2] * 0.42, 0, 0, 7); ctx.ellipse(x + c[2] * 0.5, y - c[2] * 0.12, c[2] * 0.6, c[2] * 0.34, 0, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  function drawTreeline() {
    const nf = nightFactor();
    ctx.fillStyle = rgbCss(mix(hx('#284a3c'), [10, 14, 26], nf * 0.5));
    ctx.beginPath(); ctx.moveTo(0, horizon);
    for (let x = 0; x <= W; x += 14) ctx.lineTo(x, horizon - (18 + 14 * Math.sin(x * 0.02 + 3) + 8 * Math.sin(x * 0.05)));
    ctx.lineTo(W, horizon); ctx.closePath(); ctx.fill();
  }

  function drawWater() {
    const g = ctx.createLinearGradient(0, horizon, 0, H);
    g.addColorStop(0, loc.water[0]); g.addColorStop(1, loc.water[1]);
    ctx.fillStyle = g; ctx.fillRect(0, horizon, W, H - horizon);
    // kilau air
    ctx.save(); ctx.globalAlpha = 0.22;
    for (let i = 0; i < 10; i++) {
      const y = horizon + 14 + i * (H - horizon) / 12;
      const shift = Math.sin(T * 1.3 + i) * 10;
      ctx.fillStyle = '#eaf6ff'; ctx.fillRect(20 + shift, y, W * 0.3, 2);
    }
    ctx.restore();
    for (const r of ripples) {
      ctx.save(); ctx.globalAlpha = 0.5 * (1 - r.r / r.m); ctx.strokeStyle = '#eaf6ff'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(r.x, r.y, r.r, r.r * 0.32, 0, 0, 7); ctx.stroke(); ctx.restore();
    }
  }

  function drawDock() {
    const y = dockY;
    ctx.fillStyle = '#5a4128'; ctx.fillRect(0, y, dockEnd + 6, H - y);
    ctx.fillStyle = '#7a5c3a'; ctx.fillRect(0, y, dockEnd + 6, 10);
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    for (let x = 10; x < dockEnd; x += 26) ctx.fillRect(x, y + 2, 3, H - y - 4);
    // tiang lentera
    const lx = Math.max(16, dockEnd - 46);
    ctx.fillStyle = '#3c2c1a'; ctx.fillRect(lx, y - 54, 5, 54);
    const nf = nightFactor(), flick = 0.85 + 0.15 * Math.sin(T * 13) * Math.sin(T * 7);
    drawOrb(lx + 2, y - 58, 7, '#ffcf7a', Math.max(0.12, nf * flick));
  }

  function drawCharacter() {
    const x = charX(), y = charFeet();
    ctx.save(); ctx.translate(x, y);
    // bayangan
    ctx.fillStyle = 'rgba(10,10,20,0.25)'; ctx.beginPath(); ctx.ellipse(20, 2, 22, 5, 0, 0, 7); ctx.fill();
    // kaki
    ctx.strokeStyle = '#2c3a44'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(10, -8); ctx.lineTo(8, -1); ctx.moveTo(28, -8); ctx.lineTo(30, -1); ctx.stroke();
    // badan
    ctx.fillStyle = '#3f8f8a'; ctx.beginPath(); ctx.moveTo(4, -10); ctx.quadraticCurveTo(0, -46, 20, -50); ctx.quadraticCurveTo(40, -46, 36, -10); ctx.closePath(); ctx.fill();
    // lengan (satu diangkat memegang joran)
    const armRaise = (F.s === 'reel' || F.s === 'charge' || F.s === 'bite') ? 1 : 0.4;
    ctx.strokeStyle = '#357570'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(30, -36); ctx.quadraticCurveTo(46, -40 - armRaise * 10, 46, -50 - armRaise * 14); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(8, -34); ctx.quadraticCurveTo(0, -24, 4, -16); ctx.stroke();
    // kepala
    ctx.fillStyle = '#e8b98a'; ctx.beginPath(); ctx.arc(20, -58, 12, 0, 7); ctx.fill();
    // topi
    ctx.fillStyle = '#d98a3f'; ctx.beginPath(); ctx.ellipse(20, -66, 15, 5, 0, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(20, -70, 9, Math.PI, 0); ctx.fill();
    // wajah sederhana
    ctx.fillStyle = '#20262a';
    if (F.s === 'caught') { ctx.beginPath(); ctx.arc(16, -58, 1.6, 0, 7); ctx.arc(24, -58, 1.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(20, -54, 3, 0, Math.PI); ctx.stroke(); }
    else { ctx.fillRect(15, -59, 2, 3); ctx.fillRect(23, -59, 2, 3); }
    ctx.restore();
  }

  function drawFishShape(c, x, y, dir, scale, fish, t, alpha, silhouette) {
    const L = 18 + fish.diff * 3.4, Hh = 6 + fish.diff * 1.1;
    c.save(); c.translate(x, y); c.scale(dir * scale, scale); c.globalAlpha = alpha;
    const wig = Math.sin(t * 6) * (Hh * 0.18);
    if (!silhouette && fish.glowAcc) {
      c.save(); c.globalAlpha = alpha * 0.4; c.fillStyle = fish.glowAcc;
      c.beginPath(); c.arc(0, 0, Hh * 2.1, 0, 7); c.fill(); c.restore();
    }
    c.fillStyle = silhouette ? 'rgba(6,10,22,0.85)' : fish.body;
    c.beginPath(); c.moveTo(-L / 2, 0);
    c.quadraticCurveTo(-L / 4, -Hh, L / 3, -Hh * 0.55);
    c.quadraticCurveTo(L / 2, 0, L / 3, Hh * 0.55);
    c.quadraticCurveTo(-L / 4, Hh, -L / 2, 0); c.closePath(); c.fill();
    c.beginPath(); c.moveTo(-L / 2 + 1, 0);
    c.lineTo(-L / 2 - Hh * 0.95, -Hh * 0.75 + wig); c.lineTo(-L / 2 - Hh * 0.4, 0);
    c.lineTo(-L / 2 - Hh * 0.95, Hh * 0.75 + wig); c.closePath();
    c.fillStyle = silhouette ? 'rgba(6,10,22,0.85)' : fish.fin; c.fill();
    if (!silhouette) {
      c.globalAlpha = alpha * 0.45; c.fillStyle = '#ffffff';
      c.beginPath(); c.ellipse(L * 0.02, Hh * 0.28, L * 0.26, Hh * 0.24, 0, 0, 7); c.fill();
      c.globalAlpha = alpha;
      if (fish.pattern === 'stripe') {
        c.strokeStyle = fish.fin; c.lineWidth = Math.max(1, Hh * 0.14);
        for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(L * 0.05 * i, -Hh * 0.65); c.lineTo(L * 0.05 * i - Hh * 0.25, Hh * 0.65); c.stroke(); }
      } else if (fish.pattern === 'dot') {
        c.fillStyle = fish.fin;
        for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(-L * 0.12 + i * L * 0.12, (i % 2 ? 1 : -1) * Hh * 0.24, Math.max(1, Hh * 0.1), 0, 7); c.fill(); }
      }
      c.fillStyle = '#141018'; c.beginPath(); c.arc(L * 0.3, -Hh * 0.1, Math.max(1.2, Hh * 0.15), 0, 7); c.fill();
    }
    c.restore();
  }

  function drawBobber() {
    if (!['cast', 'wait', 'nibble', 'bite'].includes(F.s)) return;
    const bob = F.s === 'cast' ? 0 : Math.sin(T * 3) * 1.4;
    const dip = F.s === 'bite' ? 6 : F.dip * 3;
    const x = F.bx, y = F.by + bob + dip;
    ctx.save(); ctx.fillStyle = '#e8402e'; ctx.beginPath(); ctx.arc(x, y, 5, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#f4f4f0'; ctx.beginPath(); ctx.arc(x, y, 5, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#20141a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, 5, 0, 7); ctx.stroke();
    if (F.s === 'bite' && Math.sin(T * 20) > 0) { ctx.fillStyle = '#f2c245'; ctx.font = 'bold 16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('!', x, y - 10); }
    ctx.restore();
  }

  function drawUnderwaterFish() {
    if (['wait', 'nibble', 'bite'].includes(F.s) && (F.s !== 'wait' || F.wait < 1.4)) {
      const fish = FISH_BY_ID[F.fishId];
      ctx.save(); ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
      drawFishShape(ctx, F.bx - 22, F.by + 14, 1, 1, fish, T, 0.4, true);
      ctx.restore();
    } else if (F.s === 'reel') {
      const fish = FISH_BY_ID[F.fishId];
      ctx.save(); ctx.beginPath(); ctx.rect(0, horizon, W, H - horizon); ctx.clip();
      drawFishShape(ctx, F.fx, F.fy, F.fdir, 1, fish, T * (F.rush > 0 ? 2.2 : 1), 0.6, true);
      if (RARITY[fish.rarity].order >= 4) {
        ctx.globalAlpha = 0.25 + 0.15 * Math.sin(T * 6); ctx.strokeStyle = RARITY[fish.rarity].glow; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(F.fx, F.fy, 26, 0, 7); ctx.stroke();
      }
      ctx.restore();
    } else if (F.s === 'landing') {
      drawFishShape(ctx, F.fx, F.fy, -1, 1, FISH_BY_ID[F.fishId], T * 3, 1, false);
    }
  }

  function drawRodAndLine() {
    const h = handPos(), tip = rodTip();
    ctx.strokeStyle = '#4a2e1a'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(h.x, h.y);
    ctx.quadraticCurveTo(h.x + Math.cos(rodAngle) * 34, h.y + Math.sin(rodAngle) * 34, tip.x, tip.y); ctx.stroke();

    let lx = null, ly = null;
    if (['cast', 'wait', 'nibble', 'bite'].includes(F.s)) { lx = F.bx; ly = F.by - 6; }
    else if (F.s === 'reel' || F.s === 'landing') { lx = F.fx; ly = F.fy; }
    if (lx !== null) {
      const taut = F.s === 'reel' ? F.tension : 0;
      ctx.strokeStyle = taut > 0.8 ? '#ff8a70' : '#eef3ef'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(tip.x, tip.y);
      ctx.quadraticCurveTo((tip.x + lx) / 2, (tip.y + ly) / 2 + (1 - taut) * 14 + 4, lx, ly); ctx.stroke();
    }
  }

  function drawRain() {
    if (!weatherParticles.length) return;
    ctx.save();
    for (const p of weatherParticles) {
      if (p.snow) { ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 7); ctx.fill(); }
      else { ctx.strokeStyle = '#cfe0ff'; ctx.globalAlpha = 0.5; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 6, p.y + 14); ctx.stroke(); }
    }
    ctx.restore();
  }
  function drawParticles() {
    for (const p of particles) { ctx.globalAlpha = 1 - Math.pow(p.t / p.l, 2); ctx.fillStyle = '#eaf6ff'; ctx.beginPath(); ctx.arc(p.x, p.y, 1.6, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.clearRect(0, 0, W, H);
    drawSky(); drawWater(); drawUnderwaterFish(); drawBobber(); drawDock(); drawCharacter(); drawRodAndLine(); drawParticles(); drawRain();
  }

  // ---------- Loop driver dipanggil dari main.js ----------
  function frame(dt) { update(dt); if (active) render(); }

  function init(canvasEl) {
    cv = canvasEl; ctx = cv.getContext('2d'); bindDom();
    let ptr = null;
    cv.addEventListener('pointerdown', e => { e.preventDefault(); if (!active) return; ptr = e.pointerId; try { cv.setPointerCapture(e.pointerId); } catch (_) {} pointerDown(); }, { passive: false });
    cv.addEventListener('pointerup', e => { e.preventDefault(); if (e.pointerId !== ptr) return; ptr = null; pointerUp(); }, { passive: false });
    cv.addEventListener('pointercancel', () => { ptr = null; pointerUp(); });
    cv.addEventListener('contextmenu', e => e.preventDefault());
    window.addEventListener('resize', resize);
    resize();

    dom.cmSell.onclick = () => { resolveCatch('sell'); UI.hideCatchModal(); };
    dom.cmKeep.onclick = () => { resolveCatch('keep'); UI.hideCatchModal(); };
    dom.cmShow.onclick = () => { resolveCatch('show'); UI.hideCatchModal(); };
    dom.cmClose.onclick = () => { UI.hideCatchModal(); };
  }

  return { init, start, stop, isActive, isBusy, frame, currentLocId, resolveCatch, drawFishShape, get F() { return F; } };
})();

// ---------- util angka & warna kecil dipakai lintas modul ----------
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hx(h) { return [1, 3, 5].map(i => parseInt(h.substr(i, 2), 16)); }
function mix(a, b, t) { return a.map((v, i) => v + (b[i] - v) * t); }
function rgbCss(c) { return 'rgb(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ')'; }
