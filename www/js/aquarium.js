/**
 * js/aquarium.js
 * Menyimpan spesimen ikan fisik (bukan sekadar catatan koleksi) dan mengatur
 * mana yang sedang dipajang di akuarium, dibatasi oleh player.aquariumSlots.
 */
function keepFish(player, fish, weight, size, price, locId, display) {
  const uid = 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const rec = { uid, fishId: fish.id, w: weight, sz: size, price, caughtAt: Date.now(), loc: locId, displayed: false };
  player.kept.push(rec);
  if (display) {
    const res = setDisplayed(player, uid, true);
    return { rec, slotFull: !res.ok };
  }
  return { rec, slotFull: false };
}

function displayedCount(player) { return player.kept.filter(k => k.displayed).length; }

function setDisplayed(player, uid, on) {
  const rec = player.kept.find(k => k.uid === uid);
  if (!rec) return { ok: false, msg: 'Ikan tidak ditemukan.' };
  if (on && displayedCount(player) >= player.aquariumSlots) {
    return { ok: false, msg: 'Slot akuarium penuh. Lepas satu ikan lain dulu.' };
  }
  rec.displayed = on;
  return { ok: true };
}

/** Menjual spesimen yang sudah tersimpan (dari inventori ikan, bukan saat baru ditangkap). */
function sellKept(player, uid) {
  const idx = player.kept.findIndex(k => k.uid === uid);
  if (idx === -1) return { ok: false, msg: 'Ikan tidak ditemukan.' };
  const rec = player.kept[idx];
  addCoins(player, rec.price);
  player.kept.splice(idx, 1);
  return { ok: true, price: rec.price };
}

function toggleDecor(player, id) {
  const i = player.aquariumDecor.indexOf(id);
  if (i === -1) player.aquariumDecor.push(id); else player.aquariumDecor.splice(i, 1);
}
