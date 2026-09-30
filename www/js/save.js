/**
 * js/save.js
 * Penyimpanan lokal berbasis localStorage. Ini SATU-SATUNYA tempat progres
 * disimpan — game ini didesain 100% offline, tidak ada server dan tidak ada
 * data yang pernah dikirim ke mana pun. `SAVE_VERSION` dipakai untuk migrasi
 * sederhana bila bentuk data berubah di update berikutnya.
 *
 * exportSave()/importSave() ada supaya pemain bisa mencadangkan progresnya
 * sendiri sebagai file .json (misalnya sebelum ganti HP) dan memulihkannya
 * lagi lewat Pengaturan → Impor. Semua tetap berjalan tanpa internet.
 */
const SAVE_KEY = 'fishercraft_save';
const SAVE_VERSION = 1;

function loadPlayer() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return defaultPlayer();
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultPlayer();
    // Merge dangkal di atas default supaya field baru (dari update game)
    // tetap terisi walau save lama belum punya field tsb.
    const base = defaultPlayer();
    const merged = Object.assign(base, parsed.data || parsed);
    for (const k of ['inv', 'equip', 'book', 'stats', 'settings']) {
      merged[k] = Object.assign(base[k], (parsed.data || parsed)[k] || {});
    }
    return merged;
  } catch (e) {
    console.warn('Save rusak, memakai data baru.', e);
    return defaultPlayer();
  }
}

let _saveTimer = null;
function savePlayer(player) {
  clearTimeout(_saveTimer);
  // Debounce ringan supaya tidak menulis ke disk di setiap frame.
  _saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_VERSION, data: player }));
    } catch (e) {
      console.warn('Gagal menyimpan progres:', e);
    }
  }, 250);
}

function exportSave(player) {
  return JSON.stringify({ v: SAVE_VERSION, data: player });
}
function importSave(json) {
  const parsed = JSON.parse(json);
  return Object.assign(defaultPlayer(), parsed.data || parsed);
}

function resetSave() {
  localStorage.removeItem(SAVE_KEY);
}
