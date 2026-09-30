/**
 * js/ui.js
 * Semua panel non-gameplay (dibuka dari menu utama) dirender sebagai HTML
 * biasa ke dalam #pB, supaya tombol-tombolnya otomatis mudah diakses &
 * ramah keyboard/screen reader dibanding menggambar tombol di canvas.
 */
const UI = (() => {
  let pT, pB, toastEl, catchCv, catchCtx;
  let curPanel = null, curCollectionFilter = 'all', curShopTab = 'rod';

  function init() {
    pT = document.getElementById('pT'); pB = document.getElementById('pB');
    toastEl = document.getElementById('toast');
    catchCv = document.getElementById('cmCanvas'); catchCtx = catchCv.getContext('2d');
    document.getElementById('cmSell').dataset.a = 'sell';
  }

  function toast(msg) {
    const d = document.createElement('div'); d.className = 'toast-item'; d.textContent = msg;
    toastEl.appendChild(d);
    requestAnimationFrame(() => d.classList.add('show'));
    setTimeout(() => { d.classList.remove('show'); setTimeout(() => d.remove(), 300); }, 2000);
  }

  function rarityChip(rarity) {
    const r = RARITY[rarity];
    return '<span class="rchip" style="--rc:' + r.color + '">' + r.label + '</span>';
  }

  // ---------- Koleksi Ikan ----------
  function renderCollection() {
    const prog = collectionProgress(PLAYER);
    const tabs = ['all', ...RARITY_ORDER].map(r =>
      '<button class="tab' + (curCollectionFilter === r ? ' on' : '') + '" data-f="' + r + '">' + (r === 'all' ? 'Semua' : RARITY[r].label) + '</button>').join('');
    const rows = FISH.filter(f => curCollectionFilter === 'all' || f.rarity === curCollectionFilter).map(f => {
      const rec = PLAYER.book[f.id];
      const locNames = f.loc.map(id => LOCATIONS_BY_ID[id].name).join(', ');
      if (!rec) {
        return '<div class="row locked r-' + f.rarity + '"><div class="row-main"><b>???</b>' + rarityChip(f.rarity) +
          '</div><div class="row-sub">Belum ditemukan · Coba di: ' + locNames + '</div></div>';
      }
      return '<div class="row r-' + f.rarity + '"><div class="row-main"><b>' + f.name + '</b>' + rarityChip(f.rarity) + '<span class="row-price">$' + f.price + '</span></div>' +
        '<div class="row-sub">Terberat ' + rec.bestW.toFixed(2) + ' kg · Ditangkap ' + rec.count + 'x · ' + locNames + '</div>' +
        '<div class="row-desc">' + f.desc + '</div></div>';
    }).join('');
    pB.innerHTML = '<div class="progress-head">' + prog.found + ' / ' + prog.total + ' ikan ditemukan' +
      '<div class="track"><i style="width:' + Math.round(prog.found / prog.total * 100) + '%"></i></div></div>' +
      '<div class="tabbar">' + tabs + '</div><div class="rowlist">' + rows + '</div>';
    pB.querySelectorAll('.tab').forEach(b => b.onclick = () => { curCollectionFilter = b.dataset.f; renderCollection(); });
  }

  // ---------- Toko ----------
  function renderShop() {
    const tabs = SHOP_CATS.map(c => '<button class="tab' + (curShopTab === c ? ' on' : '') + '" data-c="' + c + '">' + SHOP_CAT_LABEL[c] + '</button>').join('');
    const rows = SHOP_ITEMS[curShopTab].map(it => {
      const owned = shopOwns(PLAYER, curShopTab, it.id), equipped = PLAYER.equip[curShopTab] === it.id;
      const stat = statLine(curShopTab, it);
      let action;
      if (curShopTab === 'other') {
        action = owned ? '<span class="owned-tag">Dimiliki</span>' : buyBtn(it);
      } else if (equipped) action = '<span class="owned-tag">Dipakai</span>';
      else if (owned) action = '<button class="btn sm" data-eq="' + it.id + '">Pakai</button>';
      else action = buyBtn(it);
      return '<div class="row"><div class="row-main"><b>' + it.name + '</b><span class="row-price">' + (it.price ? '$' + it.price : 'Gratis') + '</span></div>' +
        '<div class="row-sub">' + stat + '</div><div class="row-desc">' + it.desc + '</div><div class="row-action">' + action + '</div></div>';
    }).join('');
    pB.innerHTML = '<div class="coin-head">🪙 ' + PLAYER.coins + ' koin</div><div class="tabbar">' + tabs + '</div><div class="rowlist">' + rows + '</div>';
    pB.querySelectorAll('.tab').forEach(b => b.onclick = () => { curShopTab = b.dataset.c; renderShop(); });
    pB.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => {
      const r = shopBuy(PLAYER, curShopTab, b.dataset.buy);
      Audio2.play(r.ok ? 'buy' : 'err'); toast(r.msg); if (r.ok) savePlayer(PLAYER);
      renderShop();
    });
    pB.querySelectorAll('[data-eq]').forEach(b => b.onclick = () => {
      shopEquip(PLAYER, curShopTab, b.dataset.eq); Audio2.play('click'); savePlayer(PLAYER); renderShop();
    });
  }
  function buyBtn(it) { return '<button class="btn sm" data-buy="' + it.id + '">Beli $' + it.price + '</button>'; }
  function statLine(cat, it) {
    if (cat === 'rod') return 'Kekuatan x' + it.power + ' · Hoki +' + Math.round(it.luck * 100) + '% · Senar x' + it.lineStr;
    if (cat === 'float') return 'Hoki +' + Math.round((it.luck || 0) * 100) + '%';
    if (cat === 'reel') return 'Kecepatan gulung x' + it.speed;
    if (cat === 'bait') return 'Hoki +' + Math.round(it.luck * 100) + '% · Sambaran x' + it.bite;
    if (cat === 'char') return 'Kosmetik';
    if (it.slotBonus) return '+' + it.slotBonus + ' slot akuarium';
    return 'Dekorasi akuarium';
  }

  // ---------- Inventori ----------
  function renderInventory() {
    const eqRows = SHOP_CATS.filter(c => c !== 'other').map(cat => {
      const owned = PLAYER.inv[cat];
      const opts = owned.map(id => {
        const it = SHOP_ITEMS[cat].find(i => i.id === id);
        const on = PLAYER.equip[cat] === id;
        return '<button class="chipsel' + (on ? ' on' : '') + '" data-cat="' + cat + '" data-id="' + id + '">' + it.name + '</button>';
      }).join('');
      return '<div class="inv-group"><b>' + SHOP_CAT_LABEL[cat] + '</b><div class="chiprow">' + opts + '</div></div>';
    }).join('');
    const kept = PLAYER.kept.filter(k => !k.displayed);
    const keptRows = kept.length ? kept.map(k => {
      const f = FISH_BY_ID[k.fishId];
      return '<div class="row r-' + f.rarity + '"><div class="row-main"><b>' + f.name + '</b>' + rarityChip(f.rarity) + '</div>' +
        '<div class="row-sub">' + k.w.toFixed(2) + ' kg · ' + k.sz + ' cm</div>' +
        '<div class="row-action"><button class="btn sm" data-sell="' + k.uid + '">Jual $' + k.price + '</button>' +
        '<button class="btn sm alt" data-disp="' + k.uid + '">Pamerkan</button></div></div>';
    }).join('') : '<p class="empty">Belum ada ikan tersimpan. Ikan yang kamu pilih "Simpan" saat ditangkap akan muncul di sini.</p>';
    pB.innerHTML = '<div class="inv-equip">' + eqRows + '</div><h4 class="sub-head">Ikan Tersimpan</h4><div class="rowlist">' + keptRows + '</div>';
    pB.querySelectorAll('.chipsel').forEach(b => b.onclick = () => { shopEquip(PLAYER, b.dataset.cat, b.dataset.id); savePlayer(PLAYER); renderInventory(); });
    pB.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { const r = sellKept(PLAYER, b.dataset.sell); if (r.ok) { toast('Terjual +' + r.price + ' koin'); savePlayer(PLAYER); renderInventory(); } });
    pB.querySelectorAll('[data-disp]').forEach(b => b.onclick = () => { const r = setDisplayed(PLAYER, b.dataset.disp, true); toast(r.ok ? 'Dipamerkan di akuarium' : r.msg); if (r.ok) { savePlayer(PLAYER); renderInventory(); } });
  }

  // ---------- Akuarium ----------
  function renderAquarium() {
    const shown = PLAYER.kept.filter(k => k.displayed);
    const slotInfo = shown.length + ' / ' + PLAYER.aquariumSlots + ' slot terpakai';
    const tiles = shown.map(k => {
      const f = FISH_BY_ID[k.fishId];
      return '<div class="tank-tile r-' + f.rarity + '"><b>' + f.name + '</b><span>' + k.w.toFixed(2) + 'kg</span>' +
        '<button class="link" data-undisp="' + k.uid + '">Lepas</button></div>';
    }).join('') || '<p class="empty">Akuarium masih kosong. Pilih "Pamerkan" saat menangkap ikan, atau pindahkan dari Inventori.</p>';
    const decor = SHOP_ITEMS.other.filter(i => i.decor).map(i => {
      const owned = shopOwns(PLAYER, 'other', i.id), on = PLAYER.aquariumDecor.includes(i.id);
      return '<button class="chipsel' + (on ? ' on' : '') + (owned ? '' : ' locked') + '" data-decor="' + i.id + '">' + i.name + (owned ? '' : ' 🔒') + '</button>';
    }).join('');
    pB.innerHTML = '<div class="coin-head">' + slotInfo + '</div><div class="tank-grid">' + tiles + '</div>' +
      '<h4 class="sub-head">Dekorasi</h4><div class="chiprow">' + decor + '</div>';
    pB.querySelectorAll('[data-undisp]').forEach(b => b.onclick = () => { setDisplayed(PLAYER, b.dataset.undisp, false); savePlayer(PLAYER); renderAquarium(); });
    pB.querySelectorAll('[data-decor]').forEach(b => b.onclick = () => {
      if (!shopOwns(PLAYER, 'other', b.dataset.decor)) { toast('Beli dulu di Toko > Lainnya'); return; }
      toggleDecor(PLAYER, b.dataset.decor); savePlayer(PLAYER); renderAquarium();
    });
  }

  // ---------- Pencapaian ----------
  function renderAchievements() {
    const rows = ACHIEVEMENTS.map(a => {
      const done = !!PLAYER.ach[a.id];
      let pct = done ? 1 : 0;
      if (!done && a.metric) pct = clamp((PLAYER.stats[a.metric].length !== undefined ? PLAYER.stats[a.metric].length : PLAYER.stats[a.metric]) / a.target, 0, 1);
      else if (!done && a.metricLevel) pct = clamp(PLAYER.level / a.metricLevel, 0, 1);
      return '<div class="row ach' + (done ? ' done' : '') + '"><div class="row-main"><b>' + a.name + '</b><span class="row-price">+' + a.reward + '</span></div>' +
        '<div class="row-sub">' + a.desc + '</div>' + (done ? '' : '<div class="track"><i style="width:' + Math.round(pct * 100) + '%"></i></div>') + '</div>';
    }).join('');
    pB.innerHTML = '<div class="rowlist">' + rows + '</div>';
  }

  // ---------- Pengaturan ----------
  let resetArmed = false;
  function renderSettings() {
    pB.innerHTML =
      '<div class="row"><div class="row-main"><b>Nama Pemain</b></div><div class="row-action">' +
      '<input id="setName" maxlength="14" value="' + escapeAttr(PLAYER.name) + '"><button class="btn sm" id="setNameSave">Simpan</button></div></div>' +
      '<div class="row"><div class="row-main"><b>Efek Suara</b></div><div class="row-action">' + toggleBtn('sound') + '</div></div>' +
      '<div class="row"><div class="row-main"><b>Getaran</b></div><div class="row-action">' + toggleBtn('vibrate') + '</div></div>' +
      '<div class="row"><div class="row-main"><b>Status</b></div><div class="row-sub">Bermain offline — tidak ada data yang dikirim ke internet.</div></div>' +
      '<div class="row"><div class="row-main"><b>Cadangkan Data</b></div><div class="row-sub">Simpan/pulihkan progres secara manual sebagai file .json.</div>' +
      '<div class="row-action"><button class="btn sm" id="setExport">Ekspor</button><label class="btn sm alt" id="setImportLbl">Impor<input type="file" id="setImport" accept="application/json" hidden></label></div></div>' +
      '<div class="row"><div class="row-main"><b>Reset Progres</b></div><div class="row-sub">Menghapus semua progres di perangkat ini.</div>' +
      '<div class="row-action"><button class="btn sm danger" id="setReset">Reset</button></div></div>';

    document.getElementById('setNameSave').onclick = () => {
      const v = document.getElementById('setName').value.trim(); PLAYER.name = v || 'Pemancing'; savePlayer(PLAYER); toast('Nama disimpan'); refreshMenuFoot();
    };
    pB.querySelectorAll('[data-tg]').forEach(b => b.onclick = () => {
      const k = b.dataset.tg; PLAYER.settings[k] = PLAYER.settings[k] ? 0 : 1;
      if (k === 'sound') Audio2.setEnabled(!!PLAYER.settings.sound);
      savePlayer(PLAYER); renderSettings();
    });
    document.getElementById('setExport').onclick = () => {
      const blob = new Blob([exportSave(PLAYER)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'fishercraft-save.json'; a.click();
    };
    document.getElementById('setImport').onchange = e => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = () => { try { Object.assign(PLAYER, importSave(reader.result)); savePlayer(PLAYER); toast('Data dipulihkan'); renderSettings(); refreshMenuFoot(); } catch (err) { toast('File tidak valid'); } };
      reader.readAsText(file);
    };
    const resetBtn = document.getElementById('setReset');
    resetBtn.onclick = () => {
      if (!resetArmed) { resetArmed = true; resetBtn.textContent = 'Yakin? Tap lagi'; setTimeout(() => { resetArmed = false; resetBtn.textContent = 'Reset'; }, 3000); return; }
      resetSave(); location.reload();
    };
  }
  function toggleBtn(key) { return '<button class="switch' + (PLAYER.settings[key] ? ' on' : '') + '" data-tg="' + key + '"></button>'; }
  function escapeAttr(s) { return String(s).replace(/"/g, '&quot;'); }
  function refreshMenuFoot() { const el = document.getElementById('menuFoot'); if (el) el.textContent = 'Halo, ' + PLAYER.name + ' · Level ' + PLAYER.level; }

  // ---------- Router panel ----------
  const RENDERERS = { col: renderCollection, shop: renderShop, inv: renderInventory, aq: renderAquarium, ach: renderAchievements, set: renderSettings };
  const TITLES = { col: 'Koleksi Ikan', shop: 'Toko', inv: 'Inventori', aq: 'Akuarium', ach: 'Pencapaian', set: 'Pengaturan', pause: 'Jeda' };
  function openPanel(kind) {
    curPanel = kind; pT.textContent = TITLES[kind] || '';
    if (kind === 'pause') renderPause(); else RENDERERS[kind]();
    App.showScreen('panel');
  }
  function renderPause() {
    pB.innerHTML = '<div class="rowlist">' +
      '<button class="ledger-row" id="pzLoc"><i class="ic ic-rod"></i>Ganti Lokasi</button>' +
      '<button class="ledger-row" id="pzSet"><i class="ic ic-gear"></i>Pengaturan</button>' +
      '<button class="ledger-row" id="pzMenu"><i class="ic ic-home"></i>Kembali ke Menu Utama</button></div>';
    document.getElementById('pzLoc').onclick = () => App.goLocationSelect();
    document.getElementById('pzSet').onclick = () => openPanel('set');
    document.getElementById('pzMenu').onclick = () => App.goMenu();
  }

  // ---------- Kartu hasil tangkapan ----------
  function showCatchModal(res) {
    const f = res.fish, r = RARITY[f.rarity];
    const isNew = PLAYER.book[f.id].count === 1;
    document.getElementById('cmBadge').textContent = res.leveledUp ? 'NAIK LEVEL!' : (isNew ? 'BARU' : '');
    document.getElementById('cmBadge').style.display = (res.leveledUp || isNew) ? 'block' : 'none';
    document.getElementById('cmRarity').innerHTML = rarityChip(f.rarity);
    document.getElementById('cmName').textContent = f.name;
    document.getElementById('cmStats').textContent = res.weight.toFixed(2) + ' kg · ' + res.size + ' cm · Harga jual $' + res.price;
    document.getElementById('cmDesc').textContent = f.desc;
    catchCtx.clearRect(0, 0, catchCv.width, catchCv.height);
    Fishing.drawFishShape(catchCtx, catchCv.width / 2, catchCv.height / 2 + 10, 1, 2.4, f, performance.now() / 500, 1, false);
    document.getElementById('catchModal').classList.remove('hidden');
    document.getElementById('catchModal').classList.toggle('tierGlow', r.notify >= 2);
    document.getElementById('catchModal').style.setProperty('--rc', r.color);
    if (res.unlocked && res.unlocked.length) setTimeout(() => res.unlocked.forEach(a => toast('Pencapaian: ' + a.name + ' +' + a.reward)), 400);
  }
  function hideCatchModal() { document.getElementById('catchModal').classList.add('hidden'); }

  return {
    init, toast, openPanel, showCatchModal, hideCatchModal, refreshMenuFoot,
    refreshTopChips() {}, // HUD memperbarui dirinya sendiri tiap frame; disediakan untuk simetri API
  };
})();
