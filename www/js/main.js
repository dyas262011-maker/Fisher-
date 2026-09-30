/**
 * js/main.js
 * Boot aplikasi: layar mana yang tampil, wiring tombol, dan loop utama.
 * Satu-satunya tempat yang menyimpan referensi global `PLAYER` — semua
 * modul lain membaca/mengubah objek yang sama ini (lihat catatan di
 * README tentang gaya "skrip klasik" ini, tanpa bundler/module).
 *
 * Navigasi memakai history.pushState/popstate supaya tombol Back Android
 * (baik di browser maupun setelah dibungkus Capacitor) berpindah layar
 * di dalam game dulu, bukan langsung menutup aplikasi. Lihat README
 * bagian "Tombol Back Android" untuk cara menyambungkannya di Capacitor.
 */
let PLAYER = null;

const App = (() => {
  const SCREENS = ['login', 'menu', 'locSelect', 'panel'];

  function showScreen(name, fromPop) {
    SCREENS.forEach(s => document.getElementById(s).classList.add('hidden'));
    document.getElementById('hud').classList.add('hidden');
    if (name === 'play') document.getElementById('hud').classList.remove('hidden');
    else document.getElementById(name).classList.remove('hidden');
    if (!fromPop) history.pushState({ screen: name }, '', '');
  }

  function goMenu() {
    if (Fishing.isActive()) Fishing.stop();
    UI.refreshMenuFoot();
    showScreen('menu');
  }

  function renderLocList() {
    const list = document.getElementById('locList');
    list.innerHTML = LOCATIONS.map(loc => {
      const unlocked = isLocationUnlocked(loc, PLAYER);
      return '<button class="loc-row' + (unlocked ? '' : ' lock') + '" data-loc="' + loc.id + '">' +
        '<b>' + loc.name + (unlocked ? '' : ' \uD83D\uDD12') + '</b>' +
        '<span class="loc-sub">' + (unlocked ? loc.desc : 'Butuh Level ' + loc.unlock.level) + '</span></button>';
    }).join('');
    list.querySelectorAll('.loc-row').forEach(row => row.onclick = () => {
      const loc = LOCATIONS_BY_ID[row.dataset.loc];
      if (!isLocationUnlocked(loc, PLAYER)) { UI.toast('Butuh Level ' + loc.unlock.level); Audio2.play('err'); return; }
      Audio2.play('click'); Fishing.start(loc.id); showScreen('play');
    });
  }

  function goLocationSelect() {
    if (Fishing.isActive()) Fishing.stop();
    renderLocList();
    showScreen('locSelect');
  }

  function startGuest() {
    const name = document.getElementById('uName').value.trim();
    PLAYER.name = name || 'Pemancing';
    savePlayer(PLAYER);
    UI.refreshMenuFoot();
    showScreen('menu');
  }

  window.addEventListener('popstate', e => {
    const modal = document.getElementById('catchModal');
    if (!modal.classList.contains('hidden')) {
      // Jangan biarkan tombol Back meninggalkan kartu hasil tangkapan menggantung;
      // batalkan navigasinya dan cukup tutup kartunya.
      history.pushState({ screen: 'play' }, '', '');
      UI.hideCatchModal();
      return;
    }
    const target = (e.state && e.state.screen) || 'menu';
    if (Fishing.isActive() && target !== 'play') Fishing.stop();
    if (target === 'locSelect') renderLocList();
    showScreen(target, true);
  });

  return { showScreen, goMenu, goLocationSelect, startGuest };
})();

/* ---------- Kilau air kecil di layar mulai (hero), berhenti sendiri ---------- */
function startShimmer() {
  const cv = document.getElementById('shimmerCv'); if (!cv) return;
  const sctx = cv.getContext('2d'); let w, h;
  function size() { const r = cv.getBoundingClientRect(); w = cv.width = Math.round(r.width * 2); h = cv.height = Math.round(r.height * 2); }
  size(); window.addEventListener('resize', size);
  let t = 0;
  function tick() {
    if (document.getElementById('login').classList.contains('hidden')) return; // layar mulai hanya tampil sekali
    t += 0.016; sctx.clearRect(0, 0, w, h);
    const g = sctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#1b3a4a'); g.addColorStop(1, '#0c2233');
    sctx.fillStyle = g; sctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++) {
      const y = h * 0.28 + i * h * 0.24 + Math.sin(t * 0.6 + i) * 4;
      const shift = (Math.sin(t * 0.35 + i * 2) * 0.5 + 0.5) * w;
      const gg = sctx.createLinearGradient(shift - 70, 0, shift + 70, 0);
      gg.addColorStop(0, 'transparent'); gg.addColorStop(0.5, '#f2a34070'); gg.addColorStop(1, 'transparent');
      sctx.fillStyle = gg; sctx.fillRect(0, y, w, 2);
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

/* ---------- Boot ---------- */
function boot() {
  const hadSave = !!localStorage.getItem(SAVE_KEY);
  PLAYER = loadPlayer();

  UI.init();
  Fishing.init(document.getElementById('cv'));
  Events.init();
  Audio2.setEnabled(!!PLAYER.settings.sound);

  wireAll();

  history.replaceState({ screen: hadSave ? 'menu' : 'login' }, '', '');
  if (hadSave) { UI.refreshMenuFoot(); App.showScreen('menu', true); }
  else { App.showScreen('login', true); startShimmer(); }

  let last = performance.now();
  function frame(now) {
    let dt = (now - last) / 1000; last = now; if (dt > 0.1) dt = 0.1; if (dt < 0) dt = 0;
    Fishing.frame(dt);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(t => { last = t; frame(t); });

  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function wireAll() {
  document.querySelectorAll('#menu [data-a]').forEach(btn => btn.onclick = () => {
    Audio2.ensure(); Audio2.play('click');
    const a = btn.dataset.a;
    if (a === 'play') App.goLocationSelect(); else UI.openPanel(a);
  });
  document.getElementById('hLoc').onclick = () => {
    if (Fishing.isBusy()) { UI.toast('Selesaikan dulu tangkapan ini'); return; }
    App.goLocationSelect();
  };
  document.getElementById('hMenu').onclick = () => {
    if (Fishing.isBusy()) { UI.toast('Selesaikan dulu tangkapan ini'); return; }
    UI.openPanel('pause');
  };
  document.getElementById('pX').onclick = () => history.back();
  document.getElementById('locBack').onclick = () => history.back();
  document.getElementById('bGuest').onclick = () => App.startGuest();
}

document.addEventListener('DOMContentLoaded', boot);
