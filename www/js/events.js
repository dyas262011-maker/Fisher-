/**
 * js/events.js
 * Menampilkan notifikasi elegan ketika ikan bertingkat "rare" ke atas
 * menyambar umpan. Dipanggil oleh fishing.js tepat saat state berpindah
 * ke 'bite'. Level notifikasi (1/2/3) datang dari RARITY[rarity].notify.
 */
const Events = (() => {
  let el = null, hideTimer = null;

  function init() { el = document.getElementById('rare'); }

  function trigger(fish) {
    const r = RARITY[fish.rarity];
    if (!el || r.notify === 0) return;

    el.className = 'rare show tier' + r.notify;
    el.style.setProperty('--rc', r.color);
    el.style.setProperty('--rg', r.glow);
    el.textContent = RARITY_ALERT_MSG[fish.rarity] || (r.label + ' terdeteksi!');

    Audio2.play('catch', 0); // nada singkat sebagai isyarat, bukan fanfare penuh
    if (navigator.vibrate && PLAYER.settings.vibrate) {
      if (r.notify === 1) navigator.vibrate(40);
      else if (r.notify === 2) navigator.vibrate([40, 40, 60]);
      else navigator.vibrate([60, 40, 60, 40, 120]);
    }
    clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { el.classList.remove('show'); }, r.notify >= 3 ? 2200 : 1500);
  }

  return { init, trigger };
})();
