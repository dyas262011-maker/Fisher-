# Fisher Craft

Game memancing **100% offline** — tidak ada akun, tidak ada server, tidak ada
data yang dikirim ke internet. Berjalan sebagai web (bisa dipasang sebagai
PWA) dan bisa dibungkus jadi APK Android lewat Capacitor.

Dicoba end-to-end dengan Playwright (browser sungguhan, bukan cuma baca kode):
lempar kail → tunggu → sambaran → gulung tali → dapat ikan → jual, lalu
seluruh alur itu diuji ulang **dengan jaringan benar-benar diputus**
(`context.setOffline(true)`) dan tetap berjalan penuh. Lihat bagian
[Pengujian](#pengujian-yang-sudah-dilakukan) untuk detailnya.

## Isi cepat
- [Menjalankan versi web](#menjalankan-versi-web)
- [Struktur folder](#struktur-folder)
- [Fitur yang sudah jalan](#fitur-yang-sudah-jalan)
- [Yang disederhanakan & alasannya](#yang-disederhanakan--alasannya)
- [Build APK Android (Capacitor)](#build-apk-android-capacitor)
- [Checklist siap Play Store](#checklist-siap-play-store)
- [Aset & lisensi](#aset--lisensi)
- [Pengujian yang sudah dilakukan](#pengujian-yang-sudah-dilakukan)

---

## Menjalankan versi web

Tidak ada proses build. Buka langsung, atau layani sebagai file statis:

```bash
npx serve www -l 8080
# atau: python3 -m http.server 8080 --directory www
```

Buka `http://localhost:8080`. Setelah dibuka sekali, *service worker*
(`www/sw.js`) menyimpan seluruh game ke cache perangkat — kunjungan
berikutnya tetap jalan walau HP dalam mode pesawat. Di Chrome/Edge Android,
menu "Tambahkan ke Layar Utama" akan memasangnya sebagai app mandiri
(ikon sendiri, tanpa address bar) berkat `manifest.json`.

> Membuka `index.html` langsung lewat `file://` (klik dua kali) juga bisa
> untuk main-main cepat, tapi *service worker* butuh `http://`/`https://` —
> jadi untuk merasakan mode "instal & offline" yang sesungguhnya, layani
> lewat server statis seperti di atas (localhost dihitung sebagai "aman"
> oleh browser, tidak perlu HTTPS sungguhan untuk pengembangan).

---

## Struktur folder

```
Fisher-Craft/
├── package.json            ← dependensi Capacitor (untuk build APK)
├── capacitor.config.json    ← pengaturan nama app, ikon, dsb
├── README.md
└── www/                     ← seluruh game (dipakai bareng oleh web & APK)
    ├── index.html
    ├── manifest.json         PWA: nama, ikon, warna tema
    ├── sw.js                 Service worker (cache offline)
    ├── css/
    │   ├── style.css         Token warna/tipografi + elemen dasar
    │   ├── menu.css          Layar mulai, menu utama, pilih lokasi
    │   ├── game.css          HUD memancing, notifikasi rarity, kartu tangkapan
    │   └── shop.css          Baris koleksi/toko/inventori/akuarium, saklar
    ├── js/
    │   ├── fish.js            Data 31 ikan + rumus pemilihan berbobot
    │   ├── locations.js       8 lokasi + syarat unlock
    │   ├── achievements.js    15 pencapaian
    │   ├── shop.js            Data toko (joran/pelampung/reel/umpan/karakter/lainnya)
    │   ├── player.js          Level/XP, koleksi, statistik pemain
    │   ├── save.js            localStorage (satu-satunya penyimpanan)
    │   ├── aquarium.js        Simpan/pamerkan spesimen ikan
    │   ├── audio.js           SFX & ambient (disintesis, bukan file audio)
    │   ├── events.js          Notifikasi "ikan langka terdeteksi"
    │   ├── fishing.js         Mesin gameplay inti + render canvas
    │   ├── ui.js               Semua panel (koleksi/toko/inventori/dst)
    │   └── main.js             Boot, navigasi, loop utama
    └── assets/icons/          Ikon app (dibuat sendiri, bentuk kail+ombak)
```

Kode ditulis sebagai skrip klasik (`<script src="...">` biasa, bukan
`import`/bundler), supaya bisa langsung dibuka tanpa proses `build` apa pun.
Semua file di atas berbagi *scope global* yang sama secara sengaja — ini
pilihan desain untuk kesederhanaan, bukan kelalaian, dan dijelaskan di
komentar `js/main.js`.

---

## Fitur yang sudah jalan

Semuanya di bawah ini nyata berfungsi (bukan mockup), dan sudah dicoba lewat
browser sungguhan:

- **Gameplay memancing**: tahan-lepas untuk melempar, pelampung bergerak &
  menyelam saat disambar, indikator tegangan tali + stamina ikan, ikan
  melawan/melompat secara acak, percikan air, riak, getaran ringan
  (`navigator.vibrate`, bisa dimatikan), umpan balik suara di tiap langkah.
- **31 ikan**, 7 tingkat rarity (Umum → Rahasia), tiap ikan punya nama,
  harga, rentang berat/ukuran, habitat (lokasi), waktu kemunculan,
  deskripsi, dan kemampuan minigame sendiri (tarikan/stamina/kecepatan).
- **Notifikasi ikan langka** ("SESUATU YANG LANGKA TERDETEKSI...") dengan
  3 tingkat drama (warna, glow, getaran, animasi) sesuai kelangkaan.
- **Koleksi Ikan / Ensiklopedia** dengan progres "X / 31 ditemukan", rekor
  berat terbesar, jumlah tangkapan, dan filter per rarity.
- **Jual / Simpan / Pamerkan** — pilihan nyata tiap kali dapat ikan, bukan
  otomatis terjual.
- **Toko** 6 kategori (Joran, Pelampung, Reel, Umpan, Karakter, Lainnya)
  dengan statistik berbeda tiap barang, beli & pasang beneran mengubah
  gameplay (kekuatan tarik, kecepatan reel, hoki ikan langka, dst).
- **Inventori**: ganti perlengkapan yang dipakai, kelola ikan yang disimpan.
- **Akuarium**: pajang ikan (dibatasi jumlah slot, bisa dibeli tambahannya),
  dekorasi on/off.
- **15 Pencapaian** dengan progress bar & hadiah koin otomatis.
- **8 lokasi** dengan palet warna, cuaca, dan populasi ikan berbeda, terbuka
  berdasarkan level.
- **Level & XP**, ekonomi koin tunggal (sengaja tidak dibuat rumit).
- **Simpan otomatis** ke `localStorage` + tombol **Ekspor/Impor** manual
  (file `.json`) di Pengaturan untuk cadangan saat pindah HP.
- **Tombol Back Android** memindahkan layar di dalam game dulu (lewat
  `history.pushState`/`popstate`), bukan langsung menutup app.
- Setiap tombol di menu benar-benar membuka sesuatu — tidak ada yang
  hanya dekorasi.

## Yang disederhanakan & alasannya

Permintaan awal juga menyebut login Google/Facebook/X/Email, sinkronisasi
cloud, dan fitur sosial (teman, lihat akuarium teman). Karena arahan
terbaru **"buat ini game offline saja"**, bagian-bagian itu dilepas total,
bukan dipalsukan:

- **Tidak ada sistem login.** Cukup isi nama lalu main. Menambahkan tombol
  "Login Google" tanpa backend sungguhan akan jadi tombol palsu yang
  berpura-pura berhasil tanpa benar-benar mengautentikasi apa pun — itu
  yang justru ingin dihindari.
- **Tidak ada sinkronisasi cloud / fitur teman online**, karena keduanya
  butuh server yang tidak ada di sini. `js/save.js` tetap menyediakan
  Ekspor/Impor manual sebagai pengganti offline-friendly-nya.
- **Peralatan dipilih lewat Toko/Inventori (persisten)**, bukan lewat
  langkah "pilih pancing" terpisah tepat sebelum melempar kail. Secara
  gameplay hasilnya sama (perlengkapan yang dipakai memengaruhi
  lemparan), hanya letaknya dipindah agar alur tidak berbelit.

Kalau suatu saat memang ingin backend (login/cloud/teman sungguhan), kode
sekarang tidak menghalangi — cukup tambahkan modul baru yang memanggil API,
lalu isi `PLAYER` dari sana. Tidak perlu bongkar mesin gameplaynya.

---

## Build APK Android (Capacitor)

**Kenapa Capacitor?** Game ini HTML/CSS/JS polos tanpa proses build, dan
Capacitor membungkus web app seperti ini jadi aplikasi Android asli (WebView
native + akses API Android) tanpa perlu menulis ulang apa pun. Bagian ini
butuh Node.js + Android Studio di komputer kamu — environment saya di sini
tidak punya akses internet untuk mengunduh Capacitor/Gradle, jadi langkah di
bawah adalah instruksi tervalidasi dari dokumentasi resminya, silakan
jalankan sendiri.

```bash
# 1. Di folder root proyek (yang ada package.json ini):
npm install

# 2. Buat project Android-nya (sekali saja, membuat folder android/):
npx cap add android

# 3. Setiap kali file di www/ berubah, sinkronkan ke project Android:
npx cap sync android

# 4. Buka di Android Studio:
npx cap open android
```

Di Android Studio:
1. Biarkan Gradle sync selesai (butuh internet untuk sekali download).
2. **Jalankan/Debug** ke emulator atau HP untuk mencoba (tombol ▶️ hijau).
3. Untuk rilis: `Build → Generate Signed Bundle / APK`, buat keystore baru
   (simpan file `.jks` dan passwordnya baik-baik — **hilang keystore =
   tidak bisa update app yang sudah dirilis**), pilih **Android App Bundle
   (.aab)** karena itu format yang diminta Google Play sekarang (APK biasa
   tetap bisa dibuat untuk uji manual/sideload).

Sebelum build rilis, ubah 2 hal di `capacitor.config.json`:
- `appId`: ganti `"com.fishercraft.app"` dengan domain milikmu sendiri
  (contoh `"com.namamu.fishercraft"`). Ini ID permanen di Play Store —
  **tidak bisa diganti setelah publish pertama**.
- Nama tampilan (`appName`) kalau ingin beda dari "Fisher Craft".

**Izin aplikasi:** karena game ini murni offline, buka
`android/app/src/main/AndroidManifest.xml` setelah `cap add android` dan
hapus baris `<uses-permission android:name="android.permission.INTERNET" />`
jika Capacitor menambahkannya secara default — sesuai prinsip "izin
seminimal mungkin".

---

## Checklist siap Play Store

| Item | Status |
|---|---|
| App icon (192/512/maskable) | ✅ Sudah ada di `www/assets/icons/` |
| Splash screen | ⚠️ Warna latar sudah diatur (`#0c2233` di config); untuk splash bergambar, pasang plugin `@capacitor/splash-screen` |
| Tombol Back Android | ✅ Ditangani (lihat `js/main.js`) |
| Berjalan offline | ✅ Diuji dengan jaringan diputus total |
| Data tidak hilang saat app ditutup | ✅ `localStorage`, ditulis tiap ada perubahan |
| Loading/error handling | ✅ `save.js` gagal-aman ke data baru jika save rusak |
| Permission minimal | ⚠️ Hapus permission INTERNET manual (lihat atas) — tidak butuh permission lain |
| Privacy Policy | ❌ **Kamu perlu buat halaman ini sendiri** — Play Console **mewajibkan** tautan privacy policy meskipun app 100% offline dan tidak mengumpulkan data. Cukup satu halaman singkat menyatakan "app ini tidak mengumpulkan/mengirim data apa pun". |
| Content rating questionnaire | ❌ Diisi manual di Play Console (game ini tidak punya kekerasan/konten dewasa, biasanya masuk kategori umum) |
| Keystore rilis | ❌ Kamu buat sendiri saat "Generate Signed Bundle" (lihat atas) |
| `appId` unik milik sendiri | ❌ Wajib diganti sebelum publish (lihat atas) |

---

## Aset & lisensi

- **Grafis**: 100% digambar prosedural lewat Canvas `path`/gradient
  (lihat `fishing.js`) — tidak ada file gambar ikan/karakter yang diimpor,
  jadi tidak ada masalah lisensi aset visual. Ikon app dibuat dari SVG
  sendiri (bentuk kail + ombak, warna sesuai tema).
- **Audio**: semua efek suara & ambient disintesis langsung lewat Web Audio
  API (osilator + noise buffer) di `audio.js` — tidak ada file `.mp3`/`.wav`
  eksternal, jadi tidak ada isu lisensi suara juga. Ganti dengan file audio
  buatan sendiri/berlisensi jelas jika suatu saat ingin kualitas audio yang
  lebih kaya.
- **Font**: memakai font sistem (`Georgia`/`Iowan Old Style` untuk judul,
  font sistem untuk teks) — tidak memuat font dari internet, konsisten
  dengan target "berjalan tanpa koneksi".

---

## Pengujian yang sudah dilakukan

Bukan cuma ditulis lalu diasumsikan jalan — dua skenario ini benar-benar
dijalankan di Chromium headless lewat Playwright sebelum diserahkan:

1. **Alur utama**: mulai → buka tiap panel (koleksi/toko/inventori/
   akuarium/pencapaian/pengaturan) tanpa error → pilih lokasi → charge →
   lempar → tunggu → sambaran → tap → gulung tali sampai ikan naik → kartu
   hasil muncul dengan data ikan yang benar → tekan Jual → koin bertambah
   (termasuk bonus pencapaian tangkapan pertama) → buka menu jeda → tombol
   Back mengembalikan ke HUD.
2. **Mode offline sungguhan**: buka sekali (online) agar *service worker*
   ter-install → `context.setOffline(true)` (jaringan diputus total di
   level browser, bukan cuma disconnect wifi) → reload dari nol → tetap
   bisa: lihat layar mulai, isi nama, masuk menu, pilih lokasi, mulai
   memancing. Nol error konsol di kedua skenario.

Yang **belum** diuji otomatis (perlu dicoba manual oleh kamu): build APK
sungguhan di Android Studio, perilaku di perangkat Android fisik/emulator,
dan instalasi PWA lewat menu "Tambahkan ke Layar Utama" di HP asli.
