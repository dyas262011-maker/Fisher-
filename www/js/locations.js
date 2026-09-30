/**
 * js/locations.js
 * Delapan lokasi memancing dengan syarat pembuka, suasana, dan palet warna
 * masing-masing. Palet dipakai langsung oleh fishing.js untuk menggambar
 * langit & air, jadi tiap lokasi terasa berbeda tanpa perlu aset gambar.
 */
const LOCATIONS = [
  {
    id: 'danau_kecil', name: 'Danau Kecil', unlock: { level: 1 },
    desc: 'Danau tenang tempat semua pemancing memulai perjalanan.',
    sky: ['#3a5a78', '#e7c98a'], water: ['#2f5a72', '#123047'],
    weather: ['cerah', 'hujan'],
  },
  {
    id: 'sungai', name: 'Sungai', unlock: { level: 3 },
    desc: 'Arus deras menyembunyikan ikan yang lebih gesit.',
    sky: ['#3f6a86', '#d8c78f'], water: ['#356a80', '#153a4d'],
    weather: ['cerah', 'hujan'],
  },
  {
    id: 'danau_hutan', name: 'Danau Hutan', unlock: { level: 6 },
    desc: 'Dikelilingi pohon lebat, sinar matahari jarang menembus air.',
    sky: ['#2c4a3e', '#a9c98a'], water: ['#1f4a3d', '#0d2a22'],
    weather: ['cerah', 'hujan', 'kabut'],
  },
  {
    id: 'laut_karang', name: 'Laut Karang', unlock: { level: 10 },
    desc: 'Perairan dangkal berwarna-warni penuh kehidupan karang.',
    sky: ['#2f7a9a', '#bfe8e0'], water: ['#1f8a92', '#0a3a4a'],
    weather: ['cerah', 'hujan'],
  },
  {
    id: 'laut_dalam', name: 'Laut Dalam', unlock: { level: 15 },
    desc: 'Cahaya matahari nyaris tak sampai ke dasar.',
    sky: ['#16324a', '#3a5a78'], water: ['#0e2438', '#050f1a'],
    weather: ['cerah', 'badai'],
  },
  {
    id: 'danau_beku', name: 'Danau Beku', unlock: { level: 20 },
    desc: 'Permukaan sebagian membeku, ikan di sini tahan dingin ekstrem.',
    sky: ['#48607a', '#dfeaf2'], water: ['#3a6478', '#16303e'],
    weather: ['cerah', 'salju'],
  },
  {
    id: 'pulau_misteri', name: 'Pulau Misteri', unlock: { level: 27 },
    desc: 'Kabut ungu menyelimuti pulau ini sepanjang waktu.',
    sky: ['#2a2140', '#6a4f8a'], water: ['#241a3a', '#0c0818'],
    weather: ['kabut_ungu'],
  },
  {
    id: 'lautan_legenda', name: 'Lautan Legenda', unlock: { level: 35 },
    desc: 'Konon di sinilah para legenda terakhir kali terlihat.',
    sky: ['#1a1a3a', '#3a2a5a'], water: ['#141432', '#06061a'],
    weather: ['cerah', 'aurora'],
  },
];
const LOCATIONS_BY_ID = Object.fromEntries(LOCATIONS.map(l => [l.id, l]));

function isLocationUnlocked(loc, player) {
  return player.level >= loc.unlock.level;
}
