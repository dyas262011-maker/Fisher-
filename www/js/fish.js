/**
 * js/fish.js
 * Database ikan + sistem kelangkaan (rarity) + pemilihan ikan berbobot.
 * Semua warna/bentuk di sini digambar prosedural di canvas (bukan aset gambar),
 * jadi aman dari masalah lisensi dan ringan untuk perangkat kelas menengah.
 */

// Tangga kelangkaan. `order` dipakai untuk menghitung bobot & efek notifikasi.
// notify: 0 = tanpa notifikasi khusus, 1 = ringan, 2 = sedang, 3 = dramatis.
const RARITY = {
  common:    { label: 'Umum',        color: '#9fb3ad', glow: '#c8d6d0', order: 0, notify: 0, baseW: 100 },
  uncommon:  { label: 'Tidak Umum',  color: '#5fae6f', glow: '#a5e0ae', order: 1, notify: 0, baseW: 46 },
  rare:      { label: 'Langka',      color: '#4a90d9', glow: '#9cc7f2', order: 2, notify: 1, baseW: 16 },
  epic:      { label: 'Epik',        color: '#a06bdc', glow: '#cdaaf2', order: 3, notify: 1, baseW: 6 },
  mythic:    { label: 'Mitos',       color: '#e0559f', glow: '#f7a8d1', order: 4, notify: 2, baseW: 1.8 },
  legendary: { label: 'Legendaris',  color: '#f2c245', glow: '#ffe49a', order: 5, notify: 3, baseW: 0.5 },
  secret:    { label: 'Rahasia',     color: '#1c1c22', glow: '#ffffff', order: 6, notify: 3, baseW: 0.05 },
};
const RARITY_ORDER = ['common','uncommon','rare','epic','mythic','legendary','secret'];

// Pesan notifikasi saat ikan bertingkat tinggi menyambar (dipakai oleh events.js).
const RARITY_ALERT_MSG = {
  rare: 'SESUATU YANG LANGKA TERDETEKSI...',
  epic: 'IKAN EPIK MENDEKAT!',
  mythic: 'IKAN MITOS MUNCUL DARI KEDALAMAN...',
  legendary: 'SEEKOR LEGENDA MUNCUL!',
  secret: 'ENTITAS TAK DIKENAL TERDETEKSI...',
};

/**
 * Menurunkan statistik minigame (tarikan, stamina, dst) dari `diff` (1-5) dan
 * tingkat rarity, supaya tiap entri ikan cukup ditulis singkat tanpa mengetik
 * 5 angka manual yang gampang salah ketik.
 */
function deriveStats(diff, rarityOrder) {
  return {
    pull: +(0.15 + diff * 0.085 + rarityOrder * 0.02).toFixed(3),
    stam: +(0.6 + diff * 0.34 + rarityOrder * 0.16).toFixed(2),
    burst: +(0.08 + diff * 0.045 + rarityOrder * 0.03).toFixed(3),
    win: +Math.max(0.35, 1.25 - diff * 0.09 - rarityOrder * 0.045).toFixed(2),
    spd: +(0.8 + diff * 0.16).toFixed(2),
  };
}

// loc: daftar id lokasi tempat ikan ini bisa muncul (lihat locations.js)
// time: 'any' | 'day' | 'night' | 'dawn'  — dawn juga mencakup senja
// w/sz: rentang berat (kg) dan ukuran (cm) saat ditangkap
// body/fin/pattern/glowAcc: parameter gambar prosedural
const FISH = [
  // ---------- Danau Kecil ----------
  fish('dk_mujair','Mujair','common',['danau_kecil'],1,'any',[.1,.4],[10,18],6,'#7fa8c9','#5c86ab',0,'Ikan kolam yang jinak. Cocok untuk pemanasan.'),
  fish('dk_nila','Nila','common',['danau_kecil'],1,'day',[.15,.5],[12,20],8,'#6f9c5c','#4c7a3e',0,'Sering ditemukan di pinggir danau saat siang.'),
  fish('dk_gabus','Gabus Kecil','uncommon',['danau_kecil','sungai'],2,'night',[.3,1.2],[18,30],22,'#4c5a3e','#333e28',0,'Predator kecil yang aktif berburu di malam hari.'),
  fish('dk_maskoki','Mas Koki Liar','rare',['danau_kecil'],2,'any',[.4,1.5],[15,25],70,'#e8703f','#c25a2e',1,'Warnanya mencolok, dianggap pembawa keberuntungan.'),

  // ---------- Sungai ----------
  fish('sg_wader','Wader','common',['sungai'],1,'day',[.05,.2],[8,14],5,'#b8c4d0','#93a2b0',0,'Bergerombol di arus yang tenang.'),
  fish('sg_lele','Lele Sungai','uncommon',['sungai'],2,'night',[.5,2],[20,35],28,'#55483c','#3a3025',0,'Berkumis panjang, suka bersembunyi di bebatuan.'),
  fish('sg_baung','Baung','uncommon',['sungai','danau_hutan'],3,'dawn',[.6,2.4],[22,38],34,'#8a7a5a','#6a5c40',0,'Paling aktif saat fajar dan senja.'),
  fish('sg_arwana','Arwana Muda','rare',['sungai'],3,'any',[.8,3],[25,45],160,'#d9c04a','#b39a2e',2,'Sisiknya besar dan berkilau seperti logam.'),
  fish('sg_belida','Belida Perak','epic',['sungai'],4,'night',[1,4],[35,55],420,'#c7d2de','#9aa8b8',2,'Bentuk tubuhnya pipih memanjang seperti pedang.'),

  // ---------- Danau Hutan ----------
  fish('dh_gurame','Gurame Hutan','uncommon',['danau_hutan'],2,'any',[.5,2.2],[20,32],30,'#6a8f52','#4f7038',0,'Hidup tenang di antara akar pohon yang terendam.'),
  fish('dh_toman','Toman','rare',['danau_hutan'],3,'any',[1,4.5],[35,60],180,'#3f6a3a','#2a4a26',1,'Rahang kuatnya membuatnya jadi lawan yang serius.'),
  fish('dh_belut','Belut Raksasa','epic',['danau_hutan'],4,'night',[1.5,6],[50,90],460,'#3a3128','#241d16',0,'Panjang dan licin, sulit dipegang setelah ditarik.'),
  fish('dh_naga_hijau','Naga Hijau Hutan','mythic',['danau_hutan'],4,'dawn',[2,6],[45,70],1400,'#2f8f5c','#1e6a40',1,'Konon jarang terlihat kecuali di pagi berkabut.','#8ef2c0'),

  // ---------- Laut Karang ----------
  fish('lk_kakatua','Kakatua Karang','common',['laut_karang'],2,'day',[.3,1.2],[18,30],16,'#ef8ac0','#c9689e',0,'Warna-warni cerah, hidup di sekitar terumbu dangkal.'),
  fish('lk_kerapu','Kerapu','uncommon',['laut_karang'],3,'any',[1,4],[30,50],45,'#a3893f','#80692c',1,'Suka bersembunyi di celah karang.'),
  fish('lk_pari','Pari Karang','rare',['laut_karang'],3,'day',[2,7],[40,70],210,'#5b6f7a','#42525c',0,'Berenang anggun melayang di dasar laut dangkal.'),
  fish('lk_naga_karang','Naga Karang','epic',['laut_karang'],4,'any',[2,8],[45,75],520,'#d9573f','#b0402c',2,'Bersirip seperti mahkota berduri.'),

  // ---------- Laut Dalam ----------
  fish('ld_kakap','Kakap Dalam','uncommon',['laut_dalam'],3,'any',[2,7],[35,60],55,'#35506e','#243a50',0,'Hidup jauh dari permukaan, jarang terlihat cahaya matahari.'),
  fish('ld_hiu_kecil','Hiu Kecil','rare',['laut_dalam'],4,'night',[5,20],[60,110],260,'#6b7885','#4e5862',0,'Predator gesit yang menarik tali dengan sangat kuat.'),
  fish('ld_cumi','Cumi Raksasa','epic',['laut_dalam'],5,'night',[3,12],[50,90],600,'#7a4f8a','#5a3868',1,'Tinta hitamnya membuat air di sekitarnya menggelap.'),
  fish('ld_lentera','Ikan Lentera Dalam','mythic',['laut_dalam'],4,'night',[.5,2],[15,25],1600,'#1c2a4a','#131d34',0,'Tubuhnya memancarkan cahaya redup sendiri.','#7ff2ff'),

  // ---------- Danau Beku ----------
  fish('db_trout_es','Trout Es','uncommon',['danau_beku'],3,'dawn',[.8,3],[25,40],48,'#bcd8e6','#93b8cc',2,'Kulitnya terasa dingin bahkan setelah diangkat.'),
  fish('db_salmon','Salmon Kristal','rare',['danau_beku'],4,'any',[2,8],[40,65],240,'#e6b7c4','#c992a2',2,'Sisiknya berkilau seperti pecahan es.'),
  fish('db_char','Char Kutub','epic',['danau_beku'],4,'night',[3,10],[45,75],540,'#6ea8c9','#4f83a3',0,'Tahan di air sedingin apapun.'),
  fish('db_kristal','Ikan Kristal Abadi','legendary',['danau_beku'],5,'night',[4,14],[55,90],3200,'#bfe8ff','#8fc7e8',1,'Tubuhnya seperti terbuat dari es yang tak pernah mencair.','#ffffff'),

  // ---------- Pulau Misteri ----------
  fish('pm_bayangan','Ikan Bayangan','epic',['pulau_misteri'],4,'night',[1.5,5],[35,55],600,'#2a2436','#1a1622',1,'Nyaris tak terlihat kecuali saat menyambar umpan.','#9b5de5'),
  fish('pm_rune','Ikan Rune','mythic',['pulau_misteri'],5,'any',[2,6],[40,60],1800,'#4a3f7a','#332b5c','stripe','Pola di tubuhnya menyerupai aksara kuno.','#c9a3ff'),
  fish('pm_topeng','Topeng Kuno','secret',['pulau_misteri'],5,'night',[3,9],[45,70],9000,'#17141f','#0e0c14','dot','Diyakini bukan ikan biasa — asal-usulnya tak tercatat.','#ffd76a'),

  // ---------- Lautan Legenda ----------
  fish('ll_paus_mini','Paus Mini','legendary',['lautan_legenda'],5,'any',[20,60],[120,200],4200,'#274b6b','#1a3550',0,'Meski disebut "mini", tetap butuh tenaga penuh untuk menariknya.'),
  fish('ll_phoenix','Phoenix Laut','legendary',['lautan_legenda'],5,'dawn',[3,9],[45,70],4600,'#f2621e','#c94c14','stripe','Siripnya berkilau seperti bara saat terkena cahaya fajar.','#ffd76a'),
  fish('ll_naga_emas','Naga Emas Legenda','secret',['lautan_legenda'],5,'night',[8,25],[80,140],12000,'#d9a017','#a87c10','stripe','Hanya segelintir pemancing yang pernah melihatnya.','#fff3c4'),
];

// Helper pembangun entri ikan supaya array di atas tetap ringkas & konsisten.
function fish(id,name,rarity,loc,diff,time,w,sz,price,body,fin,pattern,desc,glowAcc){
  const st = deriveStats(diff, RARITY[rarity].order);
  return {
    id, name, rarity, loc, diff, time, w, sz, price, desc,
    body, fin, pattern: pattern || 0, glowAcc: glowAcc || null,
    ...st,
  };
}
const FISH_BY_ID = Object.fromEntries(FISH.map(f => [f.id, f]));

/**
 * Memilih ikan secara berbobot untuk satu lemparan kail.
 * Faktor: rarity dasar, kecocokan lokasi, kecocokan waktu, cuaca, dan
 * total "luck" dari peralatan (umpan/pelampung/joran yang dipakai).
 */
function pickFish(locId, timeOfDay, weather, luck) {
  const candidates = FISH.filter(f => f.loc.includes(locId));
  const weights = candidates.map(f => {
    let w = RARITY[f.rarity].baseW;
    if (f.time !== 'any') w *= (f.time === timeOfDay) ? 1.7 : 0.28;
    if (weather === 'hujan' && RARITY[f.rarity].order >= 2) w *= 1.35;
    if (weather === 'badai' && RARITY[f.rarity].order >= 3) w *= 1.6;
    // Luck menaikkan bobot ikan langka secara eksponensial ringan, tanpa
    // membuat ikan umum jadi langka (order 0 nyaris tak terpengaruh).
    w *= Math.pow(1 + luck, RARITY[f.rarity].order * 0.7);
    return Math.max(0.0001, w);
  });
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < candidates.length; i++) {
    r -= weights[i];
    if (r <= 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

function timeOfDayFromP(p) {
  if (p < 0.2 || p >= 0.84) return 'night';
  if (p < 0.34) return 'dawn';
  if (p < 0.7) return 'day';
  return 'dawn';
}
