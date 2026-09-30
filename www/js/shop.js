/**
 * js/shop.js
 * Data barang toko per kategori + fungsi beli/pasang. Setiap kategori
 * (kecuali 'other') bersifat "equip satu aktif", mirip slot di game
 * memancing pada umumnya.
 */
const SHOP_CATS = ['rod', 'float', 'reel', 'bait', 'char', 'other'];
const SHOP_CAT_LABEL = { rod: 'Joran', float: 'Pelampung', reel: 'Reel', bait: 'Umpan', char: 'Karakter', other: 'Lainnya' };

const SHOP_ITEMS = {
  rod: [
    { id: 'basic', name: 'Joran Dasar', price: 0, power: 1, luck: 0, lineStr: 1, desc: 'Joran bambu sederhana untuk memulai.' },
    { id: 'carbon', name: 'Joran Karbon', price: 300, power: 1.3, luck: 0.1, lineStr: 1.2, desc: 'Ringan dan cukup kuat untuk ikan menengah.' },
    { id: 'pro', name: 'Joran Pro', price: 900, power: 1.6, luck: 0.25, lineStr: 1.45, desc: 'Pilihan pemancing berpengalaman.' },
    { id: 'golden', name: 'Joran Emas', price: 2400, power: 2, luck: 0.5, lineStr: 1.7, desc: 'Berlapis emas, menarik perhatian ikan langka.' },
    { id: 'legendary', name: 'Joran Legendaris', price: 6000, power: 2.5, luck: 0.8, lineStr: 2, desc: 'Konon pernah menaklukkan ikan raksasa.' },
    { id: 'secret', name: 'Joran Rahasia', price: 15000, power: 3.2, luck: 1.3, lineStr: 2.4, desc: 'Asal-usulnya tidak diketahui siapa pun.' },
  ],
  float: [
    { id: 'basic', name: 'Pelampung Sederhana', price: 0, luck: 0, desc: 'Pelampung kayu biasa.' },
    { id: 'glow', name: 'Pelampung Bercahaya', price: 180, luck: 0.05, desc: 'Mudah terlihat saat memancing malam.' },
    { id: 'lucky', name: 'Pelampung Hoki', price: 520, luck: 0.15, desc: 'Dipercaya membawa keberuntungan kecil.' },
    { id: 'crystal', name: 'Pelampung Kristal', price: 1500, luck: 0.3, desc: 'Berkilau lembut, disukai ikan-ikan istimewa.' },
  ],
  reel: [
    { id: 'basic', name: 'Reel Dasar', price: 0, speed: 1, desc: 'Reel standar bawaan.' },
    { id: 'spin', name: 'Reel Spin', price: 260, speed: 1.25, desc: 'Menggulung sedikit lebih cepat.' },
    { id: 'turbo', name: 'Reel Turbo', price: 800, speed: 1.55, desc: 'Cocok untuk ikan yang suka melarikan diri.' },
    { id: 'storm', name: 'Reel Badai', price: 2100, speed: 1.9, desc: 'Gulungan tercepat yang pernah dibuat.' },
  ],
  bait: [
    { id: 'worm', name: 'Cacing', price: 0, luck: 0, bite: 1, desc: 'Umpan klasik yang disukai hampir semua ikan.' },
    { id: 'cricket', name: 'Jangkrik', price: 60, luck: 0.2, bite: 1.15, desc: 'Membuat ikan menyambar lebih cepat.' },
    { id: 'shrimp', name: 'Udang Segar', price: 150, luck: 0.4, bite: 1.25, desc: 'Disukai ikan laut.' },
    { id: 'shiny', name: 'Umpan Kilat', price: 420, luck: 0.7, bite: 1.4, desc: 'Berkilau menarik ikan-ikan besar.' },
    { id: 'mystic', name: 'Umpan Mistis', price: 1300, luck: 1.2, bite: 1.55, desc: 'Bahannya tidak biasa — hasilnya juga tidak biasa.' },
  ],
  char: [
    { id: 'default', name: 'Nelayan', price: 0, desc: 'Penampilan awal yang sederhana.' },
    { id: 'sailor', name: 'Pelaut', price: 400, desc: 'Jaket biru khas pelaut berpengalaman.' },
    { id: 'explorer', name: 'Penjelajah', price: 900, desc: 'Siap menjelajah lokasi terpencil.' },
    { id: 'royal', name: 'Bangsawan Laut', price: 2500, desc: 'Penampilan paling mewah di dermaga.' },
  ],
  other: [
    { id: 'deco_shell', name: 'Dekorasi Kerang', price: 150, decor: true, desc: 'Hiasan akuarium bertema kerang.' },
    { id: 'deco_coral', name: 'Dekorasi Karang', price: 300, decor: true, desc: 'Hiasan akuarium bertema karang warna-warni.' },
    { id: 'tank_1', name: 'Perluasan Akuarium I', price: 600, slotBonus: 4, desc: 'Menambah 4 slot pajangan akuarium.' },
    { id: 'tank_2', name: 'Perluasan Akuarium II', price: 1800, slotBonus: 6, desc: 'Menambah 6 slot pajangan akuarium lagi.' },
  ],
};

function shopOwns(player, cat, id) { return player.inv[cat].includes(id); }

/** Membeli & (jika relevan) langsung memasang barang. Mengembalikan {ok, msg}. */
function shopBuy(player, cat, id) {
  const item = SHOP_ITEMS[cat].find(i => i.id === id);
  if (!item) return { ok: false, msg: 'Barang tidak ditemukan.' };
  if (shopOwns(player, cat, id)) return { ok: false, msg: 'Sudah dimiliki.' };
  if (player.coins < item.price) return { ok: false, msg: 'Koin tidak cukup.' };

  player.coins -= item.price;
  player.inv[cat].push(id);

  if (cat === 'other') {
    if (item.slotBonus) player.aquariumSlots += item.slotBonus;
    // deco_* tidak butuh langkah tambahan: kepemilikannya sendiri sudah
    // cukup untuk ditampilkan sebagai pilihan di aquarium.js.
  } else {
    player.equip[cat] = id; // kategori equip: langsung dipakai setelah dibeli
  }
  return { ok: true, msg: item.name + ' dibeli!' };
}

function shopEquip(player, cat, id) {
  if (cat === 'other') return { ok: false, msg: 'Kategori ini tidak bisa dipasang.' };
  if (!shopOwns(player, cat, id)) return { ok: false, msg: 'Belum dimiliki.' };
  player.equip[cat] = id;
  return { ok: true, msg: 'Dipasang.' };
}

/** Menjumlahkan statistik semua barang yang sedang dipasang, dipakai fishing.js. */
function equippedStats(player) {
  const rod = SHOP_ITEMS.rod.find(i => i.id === player.equip.rod);
  const float = SHOP_ITEMS.float.find(i => i.id === player.equip.float);
  const reel = SHOP_ITEMS.reel.find(i => i.id === player.equip.reel);
  const bait = SHOP_ITEMS.bait.find(i => i.id === player.equip.bait);
  return {
    power: rod.power,
    lineStr: rod.lineStr,
    reelSpeed: reel.speed,
    biteMult: bait.bite,
    luck: (rod.luck || 0) + (float.luck || 0) + (bait.luck || 0),
    rod, float, reel, bait,
  };
}
