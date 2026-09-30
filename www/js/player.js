/**
 * js/player.js
 * Bentuk data pemain + fungsi-fungsi murni untuk mengubahnya (level/XP,
 * koleksi ikan, statistik, dan pengecekan achievement). File ini tidak
 * menyentuh localStorage sama sekali — itu tugas save.js.
 */
function defaultPlayer() {
  return {
    name: 'Pemancing',
    level: 1,
    xp: 0,
    coins: 250,
    inv: { rod: ['basic'], float: ['basic'], reel: ['basic'], bait: ['worm'], char: ['default'], other: [] },
    equip: { rod: 'basic', float: 'basic', reel: 'basic', bait: 'worm', char: 'default' },
    book: {},           // fishId -> { count, bestW, bestSz, firstAt }
    kept: [],           // spesimen fisik: { uid, fishId, w, sz, price, caughtAt, loc, displayed }
    aquariumSlots: 6,
    aquariumDecor: [],  // id dekorasi yang sedang aktif dipasang
    ach: {},            // achievementId -> true
    stats: { totalCatches: 0, maxWeight: 0, locationsVisited: [], raritiesCaught: [], uniqueSpecies: [] },
    settings: { sound: 1, music: 1, vibrate: 1 },
  };
}

function xpNeeded(level) { return 50 * level * level; }

/** Menambah XP dan menaikkan level berkali-kali jika perlu. Return level naik atau tidak. */
function addXp(player, amount) {
  const before = player.level;
  player.xp += amount;
  while (player.xp >= xpNeeded(player.level)) {
    player.xp -= xpNeeded(player.level);
    player.level++;
  }
  return player.level > before;
}

function addCoins(player, amount) { player.coins = Math.max(0, player.coins + amount); }

function visitLocation(player, locId) {
  if (!player.stats.locationsVisited.includes(locId)) player.stats.locationsVisited.push(locId);
}

/**
 * Mencatat satu tangkapan ke buku koleksi & statistik pemain.
 * Dipanggil begitu ikan mendarat, terlepas dari nanti dijual/disimpan/dipamerkan,
 * karena koleksi mencatat "pernah ditemukan", bukan kepemilikan fisik.
 */
function recordCatch(player, fish, weight, size, locId) {
  const rec = player.book[fish.id];
  player.book[fish.id] = {
    count: (rec ? rec.count : 0) + 1,
    bestW: Math.max(rec ? rec.bestW : 0, weight),
    bestSz: Math.max(rec ? rec.bestSz : 0, size),
    firstAt: rec ? rec.firstAt : Date.now(),
  };
  player.stats.totalCatches++;
  player.stats.maxWeight = Math.max(player.stats.maxWeight, weight);
  if (!player.stats.raritiesCaught.includes(fish.rarity)) player.stats.raritiesCaught.push(fish.rarity);
  if (!player.stats.uniqueSpecies.includes(fish.id)) player.stats.uniqueSpecies.push(fish.id);
  visitLocation(player, locId);
}

/** Menjalankan ulang semua syarat achievement, mengunlock yang baru terpenuhi. */
function checkAchievements(player) {
  const unlocked = [];
  for (const a of ACHIEVEMENTS) {
    if (player.ach[a.id]) continue;
    if (a.check(player.stats, player)) {
      player.ach[a.id] = true;
      addCoins(player, a.reward);
      unlocked.push(a);
    }
  }
  return unlocked;
}

function collectionProgress(player) {
  return { found: Object.keys(player.book).length, total: FISH.length };
}
