/**
 * js/achievements.js
 * Daftar pencapaian. Setiap entri punya fungsi `check(stats)` murni yang
 * dievaluasi ulang setelah tiap tangkapan (lihat player.checkAchievements).
 */
const ACHIEVEMENTS = [
  { id: 'catch_1', name: 'Tangkapan Pertama', desc: 'Tangkap 1 ikan apa saja.', reward: 50,
    metric: 'totalCatches', target: 1, check: s => s.totalCatches >= 1 },
  { id: 'catch_10', name: 'Pemancing Rajin', desc: 'Tangkap 10 ikan.', reward: 120,
    metric: 'totalCatches', target: 10, check: s => s.totalCatches >= 10 },
  { id: 'catch_50', name: 'Pemancing Berpengalaman', desc: 'Tangkap 50 ikan.', reward: 450,
    metric: 'totalCatches', target: 50, check: s => s.totalCatches >= 50 },
  { id: 'catch_200', name: 'Legenda Dermaga', desc: 'Tangkap 200 ikan.', reward: 1500,
    metric: 'totalCatches', target: 200, check: s => s.totalCatches >= 200 },
  { id: 'species_10', name: 'Kolektor Pemula', desc: 'Temukan 10 spesies berbeda.', reward: 200,
    metric: 'uniqueSpecies', target: 10, check: s => s.uniqueSpecies.length >= 10 },
  { id: 'species_25', name: 'Kolektor Sejati', desc: 'Temukan 25 spesies berbeda.', reward: 900,
    metric: 'uniqueSpecies', target: 25, check: s => s.uniqueSpecies.length >= 25 },
  { id: 'first_rare', name: 'Kilauan Pertama', desc: 'Tangkap ikan Langka pertamamu.', reward: 150,
    check: s => s.raritiesCaught.includes('rare') },
  { id: 'first_epic', name: 'Buruan Epik', desc: 'Tangkap ikan Epik pertamamu.', reward: 400,
    check: s => s.raritiesCaught.includes('epic') },
  { id: 'first_mythic', name: 'Bertemu Mitos', desc: 'Tangkap ikan Mitos pertamamu.', reward: 900,
    check: s => s.raritiesCaught.includes('mythic') },
  { id: 'first_legendary', name: 'Torehan Legenda', desc: 'Tangkap ikan Legendaris pertamamu.', reward: 2000,
    check: s => s.raritiesCaught.includes('legendary') },
  { id: 'first_secret', name: '???', desc: 'Tangkap sesuatu yang seharusnya tidak ada.', reward: 5000,
    check: s => s.raritiesCaught.includes('secret') },
  { id: 'big_one', name: 'Tangkapan Raksasa', desc: 'Tangkap ikan seberat 15kg atau lebih.', reward: 500,
    check: s => s.maxWeight >= 15 },
  { id: 'explorer', name: 'Penjelajah Perairan', desc: 'Kunjungi seluruh 8 lokasi.', reward: 1000,
    metric: 'locationsVisited', target: 8, check: s => s.locationsVisited.length >= 8 },
  { id: 'level_10', name: 'Naik Kelas', desc: 'Capai level 10.', reward: 300,
    metricLevel: 10, check: (s, p) => p.level >= 10 },
  { id: 'level_25', name: 'Nelayan Kawakan', desc: 'Capai level 25.', reward: 1200,
    metricLevel: 25, check: (s, p) => p.level >= 25 },
];
