/* ==========================================================================
   STAR TO RECORD — 前端
   資料先存在手機（localStorage），每次改動排進「待送出」佇列，有網路再送到後端。
   沒設定後端網址也能用，只是資料只存在這支手機。
   數字都在 calc.js 算，這裡只負責畫面。
   ========================================================================== */
(function () {
'use strict';

const C = window.Calc;
const FRONT_VERSION = 'v2';
const BACKEND_NEEDED = 2;   // 前端需要的最低後端版本（v2 起試算表多一欄「照片」）
const ENTITIES = ['groups', 'members', 'releases', 'accounts', 'parties', 'options', 'buys', 'buyItems', 'buyFees', 'sells', 'expenses'];
const FLAGS = ['多帶', '重複', '自留'];
const PAY_BUY = ['匯款', '貨付', '刷卡', '現金'];
const PAY_SELL = ['匯款', '取貨付款', '現金'];
const ARRIVAL = ['未到', '已到', '已取消'];
const SHIP_STATUS = ['未寄', '已寄', '已取貨'];
const FEE_KINDS = ['運費', '包手', '匯款手續費', '刷卡手續費', '後補款', '其他'];
const DEFAULT_OPTIONS = {
  ship: ['賣貨便', '交貨便', '面交', '宅配'],
  expcat: ['演唱會', '周邊', '交通', '住宿', '餐飲', '其他']
};

/* ---------- 小工具 ---------- */
const $ = (sel, root) => (root || document).querySelector(sel);
const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10));
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : v; } catch (e) { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* 私密瀏覽等情況存不了，不影響使用 */ } };
const jsonGet = (k, d) => { try { return JSON.parse(lsGet(k, '')) || d; } catch (e) { return d; } };

/* 明細列左邊的種類圖示：買＝購物袋、賣＝標籤、花費＝錢包 */
const KIND_ICONS = {
  buy: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 8h14l-1 12H6z"/><path d="M9 8a3 3 0 0 1 6 0"/></svg>',
  sell: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12l9-9h8v8l-9 9z"/><circle cx="15.5" cy="8.5" r="1.2"/></svg>',
  expense: '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h15a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4z"/><path d="M4 6l11-3v3"/><circle cx="16.5" cy="13" r="1.2"/></svg>'
};
const KIND_LABEL = { buy: '買單', sell: '賣單', expense: '花費' };

const ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>',
  chart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V10M12 20V4M19 20v-7"/></svg>',
  list: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
  eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18M10.6 5.1A10 10 0 0 1 12 5c6 0 10 7 10 7a17 17 0 0 1-3 3.6M6.6 6.6A17 17 0 0 0 2 12s4 7 10 7a9.7 9.7 0 0 0 4-.9"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
};

/* ==========================================================================
   狀態與儲存
   ========================================================================== */
const state = {
  data: {},
  outbox: jsonGet('sl.outbox', []),
  apiUrl: lsGet('sl.api', ''),
  secret: lsGet('sl.secret', ''),
  theme: lsGet('sl.theme', 'light'),
  mask: lsGet('sl.mask', '') === '1',
  tab: 'home',
  collapsed: Object.assign({ parties: true }, jsonGet('sl.collapsed', {})),   // 設定頁哪些清單收起來；對象會越來越多，預設收合
  period: 'month',          // 報表：month／all
  month: todayStr().slice(0, 7),
  filter: { kinds: ['buy', 'sell', 'expense'], groupId: '', memberId: '', accountId: '', partyId: '', flag: '', q: '', month: todayStr().slice(0, 7), allTime: false },
  sync: { status: jsonGet('sl.data', null) ? 'idle' : 'idle', backend: '', error: '' }
};
ENTITIES.forEach((e) => { state.data[e] = []; });
Object.assign(state.data, jsonGet('sl.data', {}));
ENTITIES.forEach((e) => { if (!Array.isArray(state.data[e])) state.data[e] = []; });

let IDX = null;
const idx = () => IDX || (IDX = C.index(state.data));
function saveLocal() {
  IDX = null;
  lsSet('sl.data', JSON.stringify(state.data));
  lsSet('sl.outbox', JSON.stringify(state.outbox));
}

/* ---------- 寫入：先改本機，再排進佇列 ---------- */
function upsertLocal(entity, rec) {
  const list = state.data[entity];
  const i = list.findIndex((r) => r.id === rec.id);
  if (i >= 0) list[i] = rec; else list.push(rec);
}
function put(entity, rec) {
  if (!rec.id) rec.id = uid();
  if (!rec.createdAt) rec.createdAt = new Date().toISOString();
  upsertLocal(entity, rec);
  state.outbox.push({ action: 'save', entity, record: rec });
  saveLocal(); flush();
  return rec;
}
function del(entity, id) {
  const old = state.data[entity].find((r) => r.id === id);
  if (old && old.photoIds) dropPhotos(C.list(old.photoIds)).then(refreshPhotoStats);
  state.data[entity] = state.data[entity].filter((r) => r.id !== id);
  state.outbox.push({ action: 'remove', entity, id });
  saveLocal(); flush();
}
function putBuy(buy, items, fees) {
  if (!buy.id) buy.id = uid();
  if (!buy.createdAt) buy.createdAt = new Date().toISOString();
  items.forEach((i) => { if (!i.id) i.id = uid(); i.buyId = buy.id; });
  fees.forEach((f) => { if (!f.id) f.id = uid(); f.buyId = buy.id; });
  upsertLocal('buys', buy);
  state.data.buyItems = state.data.buyItems.filter((i) => i.buyId !== buy.id).concat(items);
  state.data.buyFees = state.data.buyFees.filter((f) => f.buyId !== buy.id).concat(fees);
  state.outbox.push({ action: 'saveBuy', buy, items, fees });
  saveLocal(); flush();
}
function delBuy(id) {
  const old = state.data.buys.find((b) => b.id === id);
  if (old && old.photoIds) dropPhotos(C.list(old.photoIds)).then(refreshPhotoStats);
  state.data.buys = state.data.buys.filter((b) => b.id !== id);
  state.data.buyItems = state.data.buyItems.filter((i) => i.buyId !== id);
  state.data.buyFees = state.data.buyFees.filter((f) => f.buyId !== id);
  state.outbox.push({ action: 'removeBuy', id });
  saveLocal(); flush();
}
const buyParts = (id) => ({
  items: state.data.buyItems.filter((i) => i.buyId === id),
  fees: state.data.buyFees.filter((f) => f.buyId === id)
});
/** 只改單頭（例如標已到貨）：品項費用原封不動重送 */
function patchBuy(id, patch) {
  const buy = Object.assign({}, idx().buys[id], patch);
  const { items, fees } = buyParts(id);
  putBuy(buy, items.map((i) => Object.assign({}, i)), fees.map((f) => Object.assign({}, f)));
}
function patchFee(fee, patch) {
  const buy = idx().buys[fee.buyId];
  const { items, fees } = buyParts(buy.id);
  putBuy(Object.assign({}, buy), items.map((i) => Object.assign({}, i)),
    fees.map((f) => Object.assign({}, f, f.id === fee.id ? patch : {})));
}

/* ---------- 同步 ---------- */
let flushing = false;
async function call(payload) {
  const res = await fetch(state.apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },   // 簡單請求，免 CORS 預檢
    body: JSON.stringify(Object.assign({ secret: state.secret }, payload))
  });
  const json = await res.json();
  if (json.apiVersion) state.sync.backend = json.apiVersion;
  if (!json.ok) {
    const err = new Error(json.error || '後端回應失敗');
    err.auth = !!json.authError;
    throw err;
  }
  return json;
}

async function flush() {
  renderSync();
  if (!state.apiUrl || flushing || !state.outbox.length) return;
  if (!navigator.onLine) return void setSync('offline');
  flushing = true;
  setSync('syncing');
  try {
    while (state.outbox.length) {
      const batch = state.outbox.slice(0, 20);
      const json = await call({ action: 'batch', ops: batch });
      // 單筆失敗不能卡住後面的：丟掉並提醒，不然會永遠送不完
      const failed = json.results.filter((r) => !r.ok);
      state.outbox.splice(0, batch.length);
      saveLocal();
      if (failed.length) toast(`有 ${failed.length} 筆沒存進試算表：${failed[0].error}`);
    }
    setSync('ok');
  } catch (e) {
    setSync(e.auth ? 'auth' : 'error', e.message);
  } finally {
    flushing = false;
  }
}

async function pull() {
  if (!state.apiUrl) return;
  await flush();
  if (state.outbox.length) return;           // 還有沒送出的，別拿舊資料蓋掉
  setSync('syncing');
  try {
    const json = await call({ action: 'list' });
    ENTITIES.forEach((e) => { state.data[e] = json[e] || []; });
    saveLocal();
    setSync('ok');
    ensureDefaults();
    render();
  } catch (e) {
    setSync(e.auth ? 'auth' : navigator.onLine ? 'error' : 'offline', e.message);
  }
}

function setSync(status, error) { state.sync.status = status; state.sync.error = error || ''; renderSync(); }
function renderSync() {
  const el = $('#sync');
  const n = state.outbox.length;
  let text = '', bad = false;
  if (!state.apiUrl) text = '只存在這支手機';
  else if (state.sync.status === 'syncing') text = '同步中…';
  else if (state.sync.status === 'auth') { text = '密語錯誤'; bad = true; }
  else if (state.sync.status === 'error') { text = n ? `待同步 ${n} 筆` : '同步失敗'; bad = true; }
  else if (state.sync.status === 'offline' || !navigator.onLine) { text = n ? `離線 · 待同步 ${n} 筆` : '離線'; bad = true; }
  else text = n ? `待同步 ${n} 筆` : '已同步';
  el.textContent = text;
  el.classList.toggle('bad', bad);
}

/** 通路以外的選項（寄送方式、花費類別）第一次用時補上預設值 */
function ensureDefaults() {
  let changed = false;
  Object.keys(DEFAULT_OPTIONS).forEach((kind) => {
    if (state.data.options.some((o) => o.kind === kind)) return;
    DEFAULT_OPTIONS[kind].forEach((name) => {
      state.data.options.push({ id: uid(), kind, name, createdAt: new Date().toISOString() });
      state.outbox.push({ action: 'save', entity: 'options', record: state.data.options[state.data.options.length - 1] });
    });
    changed = true;
  });
  if (changed) { saveLocal(); flush(); }
}

/* ==========================================================================
   顯示用的小函式
   ========================================================================== */
const money = (n, sign) => {
  if (state.mask) return '$•••';
  const v = Math.round(Number(n) || 0);
  return (sign && v > 0 ? '+' : v < 0 ? '−' : '') + '$' + Math.abs(v).toLocaleString('en-US');
};
const foreign = (n, cur) => (state.mask ? '•••' : (C.SYMBOLS[cur] || '$') + (Number(n) || 0).toLocaleString('en-US'));
const mmdd = (d) => (d ? d.slice(5).replace('-', '/') : '');
const opts = (kind) => state.data.options.filter((o) => o.kind === kind);
const nameOf = (entity, id, fallback) => (idx()[entity] && idx()[entity][id] ? idx()[entity][id].name : fallback || '');
const membersOf = (groupId) => state.data.members.filter((m) => m.groupId === groupId);
const releasesOf = (groupId) => state.data.releases.filter((r) => r.groupId === groupId);
const optionName = (id) => { const o = state.data.options.find((x) => x.id === id); return o ? o.name : ''; };
const memberNames = (item) => {
  if (item.isSet) return '一套';
  const names = C.list(item.memberIds).map((id) => nameOf('members', id)).filter(Boolean);
  return names.join('+');
};
const buyTotal = (buy) => {
  const { items, fees } = buyParts(buy.id);
  return C.buyGoods(buy, items) + C.feesSum(fees.filter((f) => f.paid));
};
const buyLabel = (buy) => {
  const items = buyParts(buy.id).items;
  const first = items[0];
  const rel = first && first.releaseId ? nameOf('releases', first.releaseId) : first ? nameOf('groups', first.groupId) : '';
  return [buy.partyName || '（未填賣家）', rel].filter(Boolean).join(' · ');
};

function toast(msg) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

/* ==========================================================================
   外觀：主題、自訂背景
   ========================================================================== */
const BG_DB = 'sl-bg';
function idb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BG_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('kv');
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function bgGet() {
  try {
    const db = await idb();
    return await new Promise((res) => { const r = db.transaction('kv').objectStore('kv').get('bg'); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); });
  } catch (e) { return null; }
}
async function bgSet(value) {
  const db = await idb();
  return new Promise((res, rej) => {
    const tx = db.transaction('kv', 'readwrite');
    value ? tx.objectStore('kv').put(value, 'bg') : tx.objectStore('kv').delete('bg');
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}

const GLOW = 'radial-gradient(circle at 20% 15%, #ff8fd0 0, transparent 38%), radial-gradient(circle at 85% 30%, #7c8cff 0, transparent 42%), radial-gradient(circle at 40% 85%, #ffb36b 0, transparent 40%), #3a2457';
let bgData = null;   // { url, lum }

function sliderVal(k, d) { const v = parseFloat(lsGet('sl.' + k, '')); return Number.isFinite(v) ? v : d; }

function applyTheme() {
  const root = document.documentElement;
  const pref = state.theme;
  const meta = $('#theme-color');
  if (pref === 'glow' || (pref === 'custom' && bgData)) {
    // 壓暗至少 20%：太亮的照片就算白字配深色玻璃也會刺眼
    const dim = Math.max(sliderVal('dim', .3), .2);
    const blur = sliderVal('blur', 2);
    root.dataset.theme = 'photo';
    root.dataset.tone = 'dark';
    // 自訂照片用「深色玻璃＋白字」：不管照片亮暗都一樣清楚，不再依亮度切換成淺色版
    if (pref === 'custom') root.dataset.glass = 'deep'; else delete root.dataset.glass;
    root.style.setProperty('--bg-img', pref === 'custom' ? `url(${bgData.url})` : GLOW);
    root.style.setProperty('--dim', dim);
    root.style.setProperty('--blur', blur + 'px');
    root.style.setProperty('--bg-pos', sliderVal('pos', 50) + '%');
    meta.setAttribute('content', '#2b1d3f');
  } else {
    const dark = pref === 'dark' || (pref === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
    root.dataset.theme = dark ? 'dark' : 'light';
    delete root.dataset.tone;
    delete root.dataset.glass;
    meta.setAttribute('content', dark ? '#16141b' : '#faf7f5');
  }
}

/** 照片縮到長邊 1600、取平均亮度，再存進 IndexedDB（不上傳） */
async function importBackground(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const dataUrl = c.toDataURL('image/jpeg', 0.82);

    const s = document.createElement('canvas'); s.width = s.height = 24;
    const sx = s.getContext('2d'); sx.drawImage(c, 0, 0, 24, 24);
    const px = sx.getImageData(0, 0, 24, 24).data;
    let sum = 0;
    for (let i = 0; i < px.length; i += 4) sum += (0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2]) / 255;
    const lum = sum / (px.length / 4);

    await bgSet({ url: dataUrl, lum });
    bgData = { url: dataUrl, lum };
    state.theme = 'custom'; lsSet('sl.theme', 'custom');
    applyTheme();
  } finally { URL.revokeObjectURL(url); }
}


/* ==========================================================================
   照片：IndexedDB（只存在這支手機）
   每張單可以有好幾張照片。紀錄上只記照片編號（photoIds，逗號隔開），
   照片本體在這裡，所以換手機要靠「匯出照片和資料」帶走。
   ========================================================================== */
const PhotoDB = (() => {
  let dbPromise = null;
  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open('sl-photos', 1);
      req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains('photos')) req.result.createObjectStore('photos'); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const t = db.transaction('photos', mode);
      const req = fn(t.objectStore('photos'));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
    });
  }
  return {
    get: (id) => tx('readonly', (st) => st.get(id)),
    put: (id, value) => tx('readwrite', (st) => st.put(value, id)),
    remove: (id) => tx('readwrite', (st) => st.delete(id)),
    clear: () => tx('readwrite', (st) => st.clear()),
    async all() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const out = [];
        const req = db.transaction('photos', 'readonly').objectStore('photos').openCursor();
        req.onsuccess = () => { const cur = req.result; if (!cur) return resolve(out); out.push({ id: cur.key, value: cur.value }); cur.continue(); };
        req.onerror = () => reject(req.error);
      });
    }
  };
})();

/** 縮到指定邊長後轉 JPEG，手機直接拍的大圖不會塞爆本機空間 */
async function compressImage(file, maxSide, quality) {
  let bitmap;
  try { bitmap = await createImageBitmap(file); }
  catch (e) {
    bitmap = await new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('無法讀取圖片')); };
      img.src = url;
    });
  }
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
}

const thumbUrls = new Map();     // 照片編號 → 縮圖網址
const missingPhotos = new Set(); // 這支手機上找不到的（在別支手機）
let fullUrl = null;              // 大圖檢視器目前那張，換張或關掉要釋放

/** 畫面上所有 <img data-thumb> 補上圖；找不到的標成「在別支手機」 */
async function hydratePhotos() {
  for (const img of document.querySelectorAll('img[data-thumb]')) {
    const id = img.dataset.thumb;
    if (thumbUrls.has(id)) { img.src = thumbUrls.get(id); continue; }
    if (missingPhotos.has(id)) { markMissing(img); continue; }
    const rec = await PhotoDB.get(id);
    if (!rec) { missingPhotos.add(id); markMissing(img); continue; }
    const url = URL.createObjectURL(rec.thumb || rec.full);
    thumbUrls.set(id, url);
    if (img.isConnected) img.src = url;
  }
  for (const img of document.querySelectorAll('img[data-full]')) {
    const rec = await PhotoDB.get(img.dataset.full);
    if (!rec) { img.replaceWith(Object.assign(document.createElement('p'), { className: 'hint', textContent: '這張照片在別支手機，匯入備份檔就會出現' })); continue; }
    if (fullUrl) URL.revokeObjectURL(fullUrl);
    fullUrl = URL.createObjectURL(rec.full || rec.thumb);
    if (img.isConnected) img.src = fullUrl;
  }
}
function markMissing(img) {
  const b = img.closest('.thumb');
  if (b) { b.classList.add('missing'); b.textContent = '在別支手機'; }
}
function forgetPhoto(id) {
  const url = thumbUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  thumbUrls.delete(id);
  missingPhotos.delete(id);
}
async function dropPhotos(ids) {
  for (const id of ids) { try { await PhotoDB.remove(id); } catch (e) { /* 本來就不在 */ } forgetPhoto(id); }
}

/* ---------- 設定頁的照片統計 ---------- */
const photoStats = { count: 0, bytes: 0, missing: 0 };
async function refreshPhotoStats() {
  try {
    const all = await PhotoDB.all();
    photoStats.count = all.length;
    photoStats.bytes = all.reduce((n, p) => n + ((p.value.full && p.value.full.size) || 0) + ((p.value.thumb && p.value.thumb.size) || 0), 0);
    const have = new Set(all.map((p) => p.id));
    const wanted = new Set();
    ['buys', 'sells', 'expenses'].forEach((e) => state.data[e].forEach((r) => C.list(r.photoIds).forEach((id) => wanted.add(id))));
    photoStats.missing = [...wanted].filter((id) => !have.has(id)).length;
  } catch (e) { /* 私密瀏覽等沒有 IndexedDB 的情況 */ }
  if (sheets.some((x) => x.id === 'settings')) refreshSheets();
}
const fmtSize = (n) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

/* ==========================================================================
   ZIP（store 模式，不壓縮）
   照片搬家用的容器。JPEG 已經壓過了，再 deflate 只是白費 CPU，所以一律 store；
   自己寫這幾十行，就不必為了換手機引進外部函式庫。
   ========================================================================== */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) { let c = i; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[i] = c >>> 0; }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
/** zip 沿用 1980 年代的 MS-DOS 時間格式：日期時間各擠在 16 bits 裡 */
function dosDateTime(d) {
  return { time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1), date: ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate() };
}
/** entries: [{ name, blob }] → zip Blob。檔名一律 ASCII（UUID、manifest.json、data.json），免得踩編碼旗標的坑 */
async function makeZip(entries) {
  const enc = new TextEncoder();
  const { time, date } = dosDateTime(new Date());
  const parts = [], central = [];
  let offset = 0;
  for (const e of entries) {
    const name = enc.encode(e.name);
    const bytes = new Uint8Array(await e.blob.arrayBuffer());
    const crc = crc32(bytes);
    const size = bytes.length;
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); local.setUint16(4, 20, true); local.setUint16(6, 0, true); local.setUint16(8, 0, true);
    local.setUint16(10, time, true); local.setUint16(12, date, true); local.setUint32(14, crc, true);
    local.setUint32(18, size, true); local.setUint32(22, size, true); local.setUint16(26, name.length, true); local.setUint16(28, 0, true);
    parts.push(local.buffer, name, e.blob);
    const cd = new DataView(new ArrayBuffer(46));
    cd.setUint32(0, 0x02014b50, true); cd.setUint16(4, 20, true); cd.setUint16(6, 20, true); cd.setUint16(8, 0, true); cd.setUint16(10, 0, true);
    cd.setUint16(12, time, true); cd.setUint16(14, date, true); cd.setUint32(16, crc, true);
    cd.setUint32(20, size, true); cd.setUint32(24, size, true); cd.setUint16(28, name.length, true); cd.setUint32(42, offset, true);
    central.push(cd.buffer, name);
    offset += 30 + name.length + size;
  }
  const cdSize = central.reduce((n, b) => n + b.byteLength, 0);
  const eocd = new DataView(new ArrayBuffer(22));
  eocd.setUint32(0, 0x06054b50, true); eocd.setUint16(8, entries.length, true); eocd.setUint16(10, entries.length, true);
  eocd.setUint32(12, cdSize, true); eocd.setUint32(16, offset, true);
  return new Blob([...parts, ...central, eocd.buffer], { type: 'application/zip' });
}
async function inflateRaw(blob) {
  if (typeof DecompressionStream === 'undefined') throw new Error('這個瀏覽器無法解開壓縮過的 zip，請用原本匯出的檔案');
  return new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).blob();
}
/** 解 zip → Map<檔名, Blob>。從中央目錄讀而不是掃檔頭，別人用電腦重新壓過的檔也吃得下 */
async function readZip(blob) {
  const tailSize = Math.min(blob.size, 65557);
  const tail = new DataView(await blob.slice(blob.size - tailSize).arrayBuffer());
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) if (tail.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('這不是有效的 zip 檔');
  const count = tail.getUint16(eocd + 10, true);
  const cdSize = tail.getUint32(eocd + 12, true);
  const cdOffset = tail.getUint32(eocd + 16, true);
  const cd = new DataView(await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  const out = new Map();
  let p = 0;
  for (let i = 0; i < count; i++) {
    if (p + 46 > cd.byteLength || cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    const size = cd.getUint32(p + 20, true);
    const nameLen = cd.getUint16(p + 28, true), extraLen = cd.getUint16(p + 30, true), commentLen = cd.getUint16(p + 32, true);
    const localOffset = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, p + 46, nameLen));
    p += 46 + nameLen + extraLen + commentLen;
    if (name.endsWith('/')) continue;
    const lh = new DataView(await blob.slice(localOffset, localOffset + 30).arrayBuffer());
    const start = localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const data = blob.slice(start, start + size);
    if (method === 0) out.set(name, data);
    else if (method === 8) out.set(name, await inflateRaw(data));
    else throw new Error(`不支援的壓縮方式（${method}）`);
  }
  return out;
}

/* ==========================================================================
   照片和資料打包（換手機、備份）
   zip 裡有：photos/<照片編號>.jpg（與 .thumb.jpg）、data.json（所有紀錄）、manifest.json（人看的對照表）
   匯入是「合併」不是取代：這支手機已經有的紀錄和照片都留著，只補上沒有的。
   ========================================================================== */
const BACKUP_VERSION = 1;
const asJpeg = (b) => (b.type === 'image/jpeg' ? b : b.slice(0, b.size, 'image/jpeg'));

function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

async function exportBackup() {
  const btn = $('[data-export]');
  if (btn) { btn.disabled = true; btn.textContent = '打包中…'; }
  try {
    const photos = (await PhotoDB.all()).filter((p) => p.value);
    const owners = {};
    [['buys', 'buy'], ['sells', 'sell'], ['expenses', 'expense']].forEach(([e, kind]) => state.data[e].forEach((r) => C.list(r.photoIds).forEach((id) => { owners[id] = { kind, r }; })));

    const entries = [];
    const items = [];
    for (const { id, value } of photos) {
      if (value.full) entries.push({ name: `photos/${id}.jpg`, blob: value.full });
      if (value.thumb) entries.push({ name: `photos/${id}.thumb.jpg`, blob: value.thumb });
      const o = owners[id];
      items.push({ id, kind: o ? o.kind : '', ownerId: o ? o.r.id : '', date: o ? o.r.date : '', who: o ? (o.r.partyName || o.r.content || '') : '' });
    }
    const json = (o) => new Blob([JSON.stringify(o, null, 2)], { type: 'application/json' });
    entries.push({ name: 'data.json', blob: json({ app: 'star-to-record', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), data: state.data }) });
    // 對照表：萬一哪天試算表出事，光看這個檔也知道哪張照片是哪張單的
    entries.push({ name: 'manifest.json', blob: json({ app: 'star-to-record', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), photoCount: items.length, photos: items }) });

    downloadBlob(`STAR-TO-RECORD_備份_${todayStr()}.zip`, await makeZip(entries));
    toast(`已匯出 ${items.length} 張照片和全部資料`);
  } catch (err) {
    toast(`匯出失敗：${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '匯出照片和資料'; }
  }
}

async function importBackup(file) {
  const btn = $('[data-import]');
  if (btn) { btn.disabled = true; btn.textContent = '匯入中…'; }
  try {
    const files = await readZip(file);
    // 只認檔名不管路徑：別人用電腦解開再壓、多包一層資料夾也還原得回來
    const byName = new Map();
    for (const [path, blob] of files) {
      if (path.startsWith('__MACOSX/')) continue;
      const base = path.split('/').pop();
      if (base) byName.set(base, blob);
    }

    // --- 照片 ---
    const ids = new Set();
    for (const base of byName.keys()) { const m = base.match(/^(.+?)(\.thumb)?\.jpg$/i); if (m) ids.add(m[1]); }
    let photosAdded = 0;
    for (const id of ids) {
      let full = byName.get(`${id}.jpg`);
      let thumb = byName.get(`${id}.thumb.jpg`);
      if (!full && !thumb) continue;
      if (full) full = asJpeg(full);
      if (thumb) thumb = asJpeg(thumb);
      if (!thumb) thumb = await compressImage(full, 240, 0.7);
      await PhotoDB.put(id, { full: full || thumb, thumb });
      forgetPhoto(id);
      photosAdded++;
    }

    // --- 資料：以 id 合併，這支手機已經有的紀錄不動 ---
    let recordsAdded = 0;
    const dj = byName.get('data.json');
    if (dj) {
      const incoming = (JSON.parse(await dj.text()).data) || {};
      const have = {};
      ENTITIES.forEach((e) => { have[e] = new Set(state.data[e].map((r) => r.id)); });
      const newBuys = new Map();
      (incoming.buys || []).forEach((b) => { if (b && b.id && !have.buys.has(b.id)) { state.data.buys.push(b); newBuys.set(b.id, { buy: b, items: [], fees: [] }); recordsAdded++; } });
      (incoming.buyItems || []).forEach((i) => { if (newBuys.has(i.buyId) && !have.buyItems.has(i.id)) { state.data.buyItems.push(i); newBuys.get(i.buyId).items.push(i); } });
      (incoming.buyFees || []).forEach((f) => { if (newBuys.has(f.buyId) && !have.buyFees.has(f.id)) { state.data.buyFees.push(f); newBuys.get(f.buyId).fees.push(f); } });
      newBuys.forEach(({ buy, items, fees }) => state.outbox.push({ action: 'saveBuy', buy, items, fees }));
      ['groups', 'members', 'releases', 'accounts', 'parties', 'options', 'sells', 'expenses'].forEach((e) => {
        (incoming[e] || []).forEach((r) => {
          if (!r || !r.id || have[e].has(r.id)) return;
          state.data[e].push(r); recordsAdded++;
          state.outbox.push({ action: 'save', entity: e, record: r });
        });
      });
      saveLocal(); flush();
    }

    if (!photosAdded && !recordsAdded) throw new Error('檔案裡沒有可以匯入的東西（或這支手機都已經有了）');
    missingPhotos.clear();
    render();
    refreshPhotoStats();
    toast(`已匯入 ${photosAdded} 張照片、${recordsAdded} 筆新紀錄`);
  } catch (err) {
    toast(`匯入失敗：${err.message}`);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = '匯入'; }
  }
}

/* ---------- 表單上的照片 ---------- */
const photoHolder = () => (form.kind === 'buy' ? form.model.buy : form.model);

async function addPhotos(files) {
  const h = photoHolder();
  form.added = form.added || [];
  let n = 0;
  for (const file of Array.from(files).slice(0, 10)) {
    try {
      const [full, thumb] = await Promise.all([compressImage(file, 1600, 0.8), compressImage(file, 240, 0.7)]);
      const id = uid();
      await PhotoDB.put(id, { full, thumb, kind: form.kind, createdAt: new Date().toISOString() });
      h.photoIds = C.list(h.photoIds).concat(id).join(',');
      form.added.push(id);
      n++;
    } catch (e) { toast('有一張照片打不開，換一張試試'); }
  }
  if (n) { refreshForm(); refreshPhotoStats(); }
}
function removePhoto(id) {
  const h = photoHolder();
  h.photoIds = C.list(h.photoIds).filter((x) => x !== id).join(',');
  form.removed = form.removed || [];
  form.added = form.added || [];
  if (form.added.includes(id)) { form.added = form.added.filter((x) => x !== id); dropPhotos([id]).then(refreshPhotoStats); }
  else form.removed.push(id);    // 原本就在單上的，等按「存起來」才真的刪，取消就還在
  refreshForm();
}
/** 表單結束時整理照片：存了就刪掉「被移除」的，取消就刪掉「這次新加」的 */
function settlePhotos(saved) {
  if (!form) return;
  const drop = saved ? form.removed : form.added;
  if (drop && drop.length) dropPhotos(drop).then(refreshPhotoStats);
  form.added = []; form.removed = [];
}
const photoIdsOf = (rec) => C.list(rec && rec.photoIds);

function thumbBtn(ids, i, removable) {
  return `<div class="thumb-wrap"><button class="thumb" data-pv="${ids.join(',')}" data-pvi="${i}" aria-label="看大圖"><img data-thumb="${ids[i]}" alt=""></button>${removable ? `<button class="thumb-x" data-del-photo="${ids[i]}" aria-label="移除這張照片">✕</button>` : ''}</div>`;
}
function photoCard() {
  const ids = C.list(photoHolder().photoIds);
  return `<div class="card"><h3>照片 <small class="hint">只存在這支手機</small></h3><div class="thumbs">${ids.map((_, i) => thumbBtn(ids, i, true)).join('')}<button class="thumb add" data-add-photo aria-label="加照片">＋</button></div></div>`;
}
function photoStrip(rec) {
  const ids = photoIdsOf(rec);
  return ids.length ? `<div class="card"><h3>照片 <span class="badge" style="background:var(--muted)">${ids.length}</span></h3><div class="thumbs">${ids.map((_, i) => thumbBtn(ids, i, false)).join('')}</div></div>` : '';
}

/* ---------- 大圖檢視器 ---------- */
const viewer = { ids: [], i: 0 };
function viewerHtml() {
  const n = viewer.ids.length;
  return `<div class="viewer">
    <div class="viewer-top"><button class="link" data-close>關閉</button><span>${viewer.i + 1} / ${n}</span><span style="min-width:52px"></span></div>
    <div class="viewer-img"><img data-full="${viewer.ids[viewer.i]}" alt=""></div>
    ${n > 1 ? `<div class="viewer-nav"><button class="btn ghost" data-pv-step="-1">‹ 上一張</button><button class="btn ghost" data-pv-step="1">下一張 ›</button></div>` : ''}
  </div>`;
}

/* ==========================================================================
   畫面：骨架
   ========================================================================== */
const TABS = [['home', '首頁', 'home'], ['add', '記一筆', 'plus'], ['report', '報表', 'chart'], ['history', '明細', 'list']];
const TITLES = { home: 'STAR TO RECORD', add: '記一筆', report: '報表', history: '明細' };

function renderChrome() {
  $('#tabs').innerHTML = TABS.map(([k, label, icon]) =>
    `<button data-tab="${k}" class="${state.tab === k ? 'on' : ''}">${ICONS[icon]}${label}</button>`).join('');
  $('#title').textContent = TITLES[state.tab];
  $('#btn-eye').innerHTML = state.mask ? ICONS.eyeOff : ICONS.eye;
  $('#btn-gear').innerHTML = ICONS.gear;
  renderSync();
}

function render() {
  renderChrome();
  const view = $('#view');
  const keep = view.scrollTop;
  const active = document.activeElement;
  const key = view.contains(active) && active.dataset ? active.dataset.path : '';
  const caret = key ? active.selectionStart : null;
  view.innerHTML = ({ home: viewHome, add: viewAdd, report: viewReport, history: viewHistory })[state.tab]();
  view.scrollTop = keep;
  if (key) {
    const again = view.querySelector(`[data-path="${key}"]`);
    if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (e) { /* 不是文字欄位 */ } }
  }
  refreshSheets();
}

/* ==========================================================================
   首頁：待處理
   ========================================================================== */
function todoRow(act, id, title, sub, amount, cls) {
  return `<div class="item" data-act="${act}" data-id="${id}"><div class="main"><div class="t">${esc(title)}</div><div class="s">${esc(sub)}</div></div><div class="amt ${cls || ''}">${amount}</div></div>`;
}
function todoCard(title, rows) {
  return rows.length ? `<div class="card"><h3>${title} <span class="badge">${rows.length}</span></h3>${rows.join('')}</div>` : '';
}

function viewHome() {
  const t = C.todos(state.data, todayStr());
  const cards = [
    todoCard('還沒付', t.unpaid.map((x) => todoRow('buy', x.buy.id, buyLabel(x.buy), `${mmdd(x.buy.date)} 下單 · ${x.buy.payMethod} · 已 ${x.days} 天`, money(x.total)))),
    todoCard('還沒到貨', t.notArrived.map((x) => todoRow('buy', x.buy.id, buyLabel(x.buy), `${x.buy.paidDate ? '已付款 ' + mmdd(x.buy.paidDate) : x.buy.payMethod} · 等了 ${x.days} 天`, money(x.total)))),
    todoCard('後補款還沒付', t.feesUnpaid.map((x) => todoRow('buy', x.buy.id, buyLabel(x.buy), x.fee.kind + (x.fee.note ? ' · ' + x.fee.note : ''), x.fee.amount ? money(x.fee.amount) : '？'))),
    todoCard('買家還沒匯款', t.sellUnpaid.map((x) => todoRow('sell', x.sell.id, `${x.sell.partyName || '（未填買家）'} · ${x.sell.content || ''}`, [mmdd(x.sell.date), x.sell.shipMethod].filter(Boolean).join(' · '), money(x.sell.amount), 'in'))),
    todoCard('還沒寄', t.notShipped.map((x) => todoRow('sell', x.sell.id, `${x.sell.partyName || '（未填買家）'} · ${x.sell.content || ''}`, [mmdd(x.sell.date), x.sell.shipMethod || '未選寄送方式'].join(' · '), money(x.sell.amount), 'in'))),
    todoCard('待確認', t.pending.map((x) => todoRow('buy', x.buy.id, buyLabel(x.buy), `實付台幣還沒填 · ${C.CURRENCIES[x.buy.currency] || ''}單`, '？'))),
    todoCard('預購中', t.preorder.map((x) => todoRow('buy', x.buy.id, buyLabel(x.buy), `預計 ${x.buy.expectedMonth} 到貨`, money(x.total))))
  ].filter(Boolean);

  const recent = [...state.data.buys.map((b) => ({ d: b.date, html: histRow('buy', b) })),
    ...state.data.sells.map((s) => ({ d: s.date, html: histRow('sell', s) })),
    ...state.data.expenses.map((e) => ({ d: e.date, html: histRow('expense', e) }))]
    .sort((a, b) => String(b.d).localeCompare(String(a.d))).slice(0, 5);

  const first = !state.data.groups.length && !state.data.buys.length;
  return (first
    ? `<div class="card"><h3>歡迎</h3><p class="hint" style="margin-bottom:10px">先到「設定」建立團、成員和帳戶，再按「記一筆」開始記。也可以先記，團和成員在表單裡當場新增。</p><button class="btn small" data-act="settings">打開設定</button></div>`
    : cards.length ? cards.join('') : `<div class="empty">都處理完了 ✨</div>`)
    + (recent.length ? `<div class="title-row"><h2>最近</h2></div><div class="card">${recent.map((r) => r.html).join('')}</div>` : '');
}

/* ==========================================================================
   明細的一列（首頁最近、明細頁共用）
   ========================================================================== */
function histRow(kind, r) {
  const head = `<span class="av ${kind}">${KIND_ICONS[kind]}</span>`;
  const label = `<div class="kk ${kind}">${KIND_LABEL[kind]}</div>`;
  if (kind === 'buy') {
    const { items } = buyParts(r.id);
    const flagged = items.some((i) => C.list(i.flags).includes('多帶'));
    const dim = C.isCancelled(r);
    const sub = `${mmdd(r.date)} · ${items.length} 項${r.arrival === '已到' ? ' · 已到貨' : r.arrival === '已取消' ? ' · 已取消' : ''}${r.paidDate ? '' : ' · 未付'}`;
    return `<div class="item" data-act="buy" data-id="${r.id}" style="${dim ? 'opacity:.5' : ''}">${head}<div class="main">${label}<div class="t">${esc(buyLabel(r))}</div><div class="s">${esc(sub)} ${flagged ? '<span class="tag warn">多帶</span>' : ''}${photoTag(r)}</div></div><div class="amt out">${money(-buyTotal(r))}</div></div>`;
  }
  if (kind === 'sell') {
    return `<div class="item" data-act="sell" data-id="${r.id}">${head}<div class="main">${label}<div class="t">${esc(r.partyName || '（未填買家）')}${r.content ? ' · ' + esc(r.content) : ''}</div><div class="s">${mmdd(r.date)} · ${r.paidDate ? '已收款' : '未收款'} · ${esc(r.shipStatus || '')}${photoTag(r)}</div></div><div class="amt in">${money(r.amount, true)}</div></div>`;
  }
  return `<div class="item" data-act="expense" data-id="${r.id}">${head}<div class="main">${label}<div class="t">${esc(r.category || '')}${r.content ? ' · ' + esc(r.content) : ''}</div><div class="s">${mmdd(r.date)}${r.groupId ? ' · ' + esc(nameOf('groups', r.groupId)) : ''}${photoTag(r)}</div></div><div class="amt out">${money(-r.amount)}</div></div>`;
}
const photoTag = (r) => (C.list(r.photoIds).length ? ` <span class="tag">照片 ${C.list(r.photoIds).length}</span>` : '');

/* ==========================================================================
   記一筆
   ========================================================================== */
const drafts = {};   // 記一筆頁的草稿，各種類各一份：切換種類或分頁時不會丟掉打到一半的內容
function newDraft(kind) {
  const model = kind === 'buy' ? newBuy() : kind === 'sell' ? newSell() : newExpense();
  return { kind, editing: false, inline: true, model };
}
function viewAdd() {
  if (!state.addKind) state.addKind = 'buy';
  // 從明細點進去編輯時，表單是開在面板裡，這一頁底下不用再畫
  if (form && !form.inline) return '';
  drafts[state.addKind] = drafts[state.addKind] || newDraft(state.addKind);
  form = drafts[state.addKind];
  const kinds = [['buy', '買單'], ['sell', '賣單'], ['expense', '花費']];
  return `<div class="seg" style="margin-top:6px">${kinds.map(([k, l]) => `<button data-addkind="${k}" class="${state.addKind === k ? 'on' : ''}">${l}</button>`).join('')}</div>`
    + ({ buy: buyFormHtml, sell: sellFormHtml, expense: expenseFormHtml })[form.kind]();
}

/* ==========================================================================
   報表
   ========================================================================== */
function viewReport() {
  const period = state.period === 'month' ? state.month : null;
  const s = C.summary(state.data, period);
  const months = C.monthly(state.data, state.month, 6);
  const maxM = Math.max(1, ...months.map((m) => Math.max(m.spend, m.income)));
  const groups = C.byGroup(state.data, period);
  const groupIds = Object.keys(groups).sort((a, b) => groups[b].net - groups[a].net);
  const maxG = Math.max(1, ...groupIds.map((g) => Math.abs(groups[g].net)));
  const multi = C.multiSpend(state.data, period);
  const spare = C.spareCounts(state.data);
  const flows = C.accountFlows(state.data, period);
  const accountIds = state.data.accounts.map((a) => a.id).filter((id) => flows[id]);

  return `
    <div class="seg" style="margin-top:6px"><button data-period="month" class="${period ? 'on' : ''}">單月</button><button data-period="all" class="${period ? '' : 'on'}">全部</button></div>
    ${period ? `<div class="title-row"><button class="ico" data-month="-1" aria-label="上個月">‹</button><h2 style="text-align:center">${period.replace('-', ' 年 ')} 月</h2><button class="ico" data-month="1" aria-label="下個月">›</button></div>` : ''}
    <div class="sum">
      <div class="card"><small>花</small><b class="out">${money(s.spend)}</b></div>
      <div class="card"><small>收</small><b class="in">${money(s.income)}</b></div>
      <div class="card"><small>淨花費</small><b>${money(s.net)}</b></div>
    </div>
    <div class="card"><h3>最近六個月（花／收）</h3>
      <div class="bars">${months.map((m) => `<div><div class="pair"><span class="o" style="height:${(m.spend / maxM * 100).toFixed(1)}%"></span><span class="i" style="height:${(m.income / maxM * 100).toFixed(1)}%"></span></div>${Number(m.month.slice(5))}月</div>`).join('')}</div>
    </div>
    <div class="card"><h3>依團看（淨花費）</h3>
      ${groupIds.length ? groupIds.map((g) => `<div class="item" data-act="group" data-id="${g}"><div class="main"><div class="t">${esc(g ? nameOf('groups', g) : '（沒指定團）')}</div><div class="pbar"><i style="width:${(Math.abs(groups[g].net) / maxG * 100).toFixed(1)}%"></i></div></div><div class="amt">${money(groups[g].net)}</div></div>`).join('') : '<p class="hint">還沒有資料</p>'}
      <p class="hint" style="margin-top:6px">點一個團，看各回歸、各成員，還有收集表。</p>
    </div>
    <div class="card"><h3>多帶</h3>
      <div class="item" style="cursor:default"><div class="main"><div class="t">被搭售的不熱門成員卡</div><div class="s">${period ? '這個月' : '累積'}共 ${multi.count} 張</div></div><div class="amt out">${money(multi.amount)}</div></div>
      <div class="item" style="cursor:default"><div class="main"><div class="t">手上可以賣或換的</div><div class="s">已到貨的多帶 ${spare['多帶']} 張 · 重複 ${spare['重複']} 張</div></div></div>
    </div>
    <div class="card"><h3>帳戶進出</h3>
      ${accountIds.length ? accountIds.map((id) => `<div class="item" style="cursor:default"><div class="main"><div class="t">${esc(nameOf('accounts', id))}</div><div class="s">出 ${money(flows[id].out)} · 進 ${money(flows[id].in)}</div></div><div class="amt">${money(flows[id].in - flows[id].out, true)}</div></div>`).join('') : '<p class="hint">記買單、賣單時選了帳戶，這裡就會有進出。</p>'}
    </div>`;
}

/* ==========================================================================
   明細
   ========================================================================== */
function applyFilter() {
  const f = state.filter;
  const q = f.q.trim().toLowerCase();
  const inMonth = (d) => f.allTime || String(d || '').slice(0, 7) === f.month;
  const rows = [];

  const memberHit = (ids, groupId) => !f.memberId || C.list(ids).includes(f.memberId);
  const groupHit = (gid) => !f.groupId || gid === f.groupId;

  if (f.kinds.includes('buy')) {
    state.data.buys.forEach((b) => {
      if (!inMonth(b.date)) return;
      const { items, fees } = buyParts(b.id);
      if (f.accountId && b.accountId !== f.accountId) return;
      if (f.partyId && b.partyId !== f.partyId) return;
      if ((f.groupId || f.memberId || f.flag) && !items.some((i) => groupHit(i.groupId) && memberHit(i.memberIds) && (!f.flag || C.list(i.flags).includes(f.flag)))) return;
      if (q) {
        const hay = [b.partyName, b.note, ...items.map((i) => i.name + nameOf('releases', i.releaseId) + optionName(i.channelId)), ...fees.map((x) => x.note)].join(' ').toLowerCase();
        if (!hay.includes(q)) return;
      }
      rows.push({ kind: 'buy', d: b.date, r: b, amount: -buyTotal(b) });
    });
  }
  if (f.kinds.includes('sell')) {
    state.data.sells.forEach((s) => {
      if (!inMonth(s.date)) return;
      if (f.accountId && s.accountId !== f.accountId) return;
      if (f.partyId && s.partyId !== f.partyId) return;
      if (f.groupId && s.groupId !== f.groupId) return;
      if (f.memberId && !C.list(s.memberIds).includes(f.memberId)) return;
      if (f.flag) return;
      if (q && ![s.partyName, s.content, s.note].join(' ').toLowerCase().includes(q)) return;
      rows.push({ kind: 'sell', d: s.date, r: s, amount: s.paidDate ? s.amount : 0 });
    });
  }
  if (f.kinds.includes('expense')) {
    state.data.expenses.forEach((e) => {
      if (!inMonth(e.date)) return;
      if (f.accountId && e.accountId !== f.accountId) return;
      if (f.partyId || f.flag) return;
      if (f.groupId && e.groupId !== f.groupId) return;
      if (f.memberId && e.memberId !== f.memberId) return;
      if (q && ![e.category, e.content, e.note].join(' ').toLowerCase().includes(q)) return;
      rows.push({ kind: 'expense', d: e.date, r: e, amount: -e.amount });
    });
  }
  return rows.sort((a, b) => String(b.d).localeCompare(String(a.d)));
}

const sel = (name, cur, options, blank) => `<select data-filter="${name}">${blank ? `<option value="">${blank}</option>` : ''}${options.map(([v, l]) => `<option value="${esc(v)}" ${v === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;

function viewHistory() {
  const f = state.filter;
  const rows = applyFilter();
  let buy = 0, sell = 0, exp = 0;
  rows.forEach((x) => { if (x.kind === 'buy') buy += x.amount; else if (x.kind === 'sell') sell += x.amount; else exp += x.amount; });
  const kinds = [['buy', '買單'], ['sell', '賣單'], ['expense', '花費']];

  return `
    <div class="card" style="margin-top:6px">
      <div class="field"><span>期間</span><span style="display:flex;gap:8px;align-items:center;flex:1;justify-content:flex-end">
        ${f.allTime ? '<b>全部</b>' : `<input type="month" data-filter="month" value="${f.month}" style="flex:none;width:auto">`}
        <button class="chip ${f.allTime ? 'on' : ''}" data-filter-toggle="allTime">全部</button></span></div>
      <div class="field"><span>搜尋</span><input type="search" data-filter="q" value="${esc(f.q)}" placeholder="品項、賣家、備註"></div>
    </div>
    <div class="chips">${kinds.map(([k, l]) => `<button class="chip ${f.kinds.includes(k) ? 'on' : ''}" data-kind="${k}">${l}</button>`).join('')}</div>
    <div class="card"><div class="field"><span>團</span>${sel('groupId', f.groupId, state.data.groups.map((g) => [g.id, g.name]), '全部')}</div>
      ${f.groupId ? `<div class="field"><span>成員</span>${sel('memberId', f.memberId, membersOf(f.groupId).map((m) => [m.id, m.name]), '全部')}</div>` : ''}
      <div class="field"><span>對象</span>${sel('partyId', f.partyId, state.data.parties.map((p) => [p.id, p.name]), '全部')}</div>
      <div class="field"><span>帳戶</span>${sel('accountId', f.accountId, state.data.accounts.map((a) => [a.id, a.name]), '全部')}</div>
      <div class="field"><span>標記</span>${sel('flag', f.flag, FLAGS.map((x) => [x, x]), '全部')}</div></div>
    <div class="card">${rows.length ? rows.map((x) => histRow(x.kind, x.r)).join('') : '<p class="hint">這段期間沒有符合的紀錄</p>'}</div>
    <div class="card"><h3>本期小計</h3>
      <div class="field"><span>買單</span><span class="amt">${money(buy)}</span></div>
      <div class="field"><span>賣單</span><span class="amt in">${money(sell, true)}</span></div>
      <div class="field"><span>花費</span><span class="amt">${money(exp)}</span></div></div>`;
}

/* ==========================================================================
   全螢幕面板：開關與重繪
   ========================================================================== */
const sheets = [];   // [{ id, render: () => html, onOpen }]
function openSheet(id, renderFn) {
  const found = sheets.find((s) => s.id === id);
  if (found) found.render = renderFn; else sheets.push({ id, render: renderFn });
  refreshSheets();
}
function closeSheet(id) {
  const i = sheets.findIndex((s) => s.id === id);
  if (i >= 0) sheets.splice(i, 1);
  refreshSheets();
}
/** 表單動了結構（新增一行、點成員…）要重畫：內嵌的重畫這一頁，開在面板的重畫面板 */
function refreshForm() { if (form && form.inline) render(); else refreshSheets(); }
function refreshSheets() {
  const host = $('#sheets');
  // 保留正在輸入的欄位焦點，不然每次重繪都會收鍵盤
  const active = document.activeElement;
  const key = active && active.dataset && active.dataset.path;
  const caret = active && active.selectionStart;
  const scrolls = Array.from(host.querySelectorAll('.sheet-body')).map((e) => e.scrollTop);
  host.innerHTML = sheets.map((s) => `<div class="sheet" data-sheet="${s.id}">${s.render()}</div>`).join('');
  host.querySelectorAll('.sheet-body').forEach((e, i) => { e.scrollTop = scrolls[i] || 0; });
  hydratePhotos();
  if (key) {
    const again = host.querySelector(`[data-path="${key}"]`);
    if (again) { again.focus(); try { again.setSelectionRange(caret, caret); } catch (e) { /* 不是文字欄位 */ } }
  }
}
const sheetTop = (title, left, right) => `<div class="sheet-top"><button class="link" data-close>${left || '取消'}</button><h2>${esc(title)}</h2>${right ? `<button class="link" data-save>${right}</button>` : '<span style="min-width:52px"></span>'}</div>`;

/* ==========================================================================
   表單：用 data-path 把欄位綁到 model（例如 "items.0.price"）
   ========================================================================== */
let form = null;   // { kind, model, editing }

function getPath(obj, path) { return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj); }
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((o, k) => o[k], obj);
  target[last] = value;
}

const optionTags = (list, cur, blank) => (blank ? `<option value="">${blank}</option>` : '') + list.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(cur) ? 'selected' : ''}>${esc(l)}</option>`).join('');
const fSelect = (label, path, list, blank, addKind) => `<div class="field"><label>${label}</label><select data-path="${path}" ${addKind ? `data-add="${addKind}"` : ''}>${optionTags(list, getPath(form.model, path), blank)}${addKind ? '<option value="__new__">＋ 新增…</option>' : ''}</select></div>`;
const fInput = (label, path, type, ph, extra) => `<div class="field"><label>${label}</label><input data-path="${path}" type="${type || 'text'}" ${type === 'number' ? 'inputmode="decimal" step="any"' : ''} value="${esc(getPath(form.model, path) == null ? '' : getPath(form.model, path))}" placeholder="${esc(ph || '')}" ${extra || ''}></div>`;
const fCheck = (label, path) => `<div class="field"><label>${label}</label><input type="checkbox" data-path="${path}" ${getPath(form.model, path) ? 'checked' : ''}></div>`;

/** 賣家／買家：打字搜尋，找不到就當場新增。對象會越來越多，下拉選單翻不完 */
function partyCombo(label, path) {
  const id = getPath(form.model, path);
  return `<div class="field"><label>${label}</label><div class="cb"><input type="text" data-pcombo="${path}" value="${esc(nameOf('parties', id))}" placeholder="輸入名字搜尋" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="cb-list" hidden></div></div></div>`;
}
function comboFill(input, query) {
  const box = input.parentElement.querySelector('.cb-list');
  const q = query.trim().toLowerCase();
  let rows = state.data.parties.filter((p) => !q || (p.name + ' ' + (p.platform || '')).toLowerCase().includes(q));
  rows.sort((a, b) => Number(b.name.toLowerCase().startsWith(q)) - Number(a.name.toLowerCase().startsWith(q)) || a.name.localeCompare(b.name));
  const exact = state.data.parties.some((p) => p.name.toLowerCase() === q);
  box.innerHTML = rows.slice(0, 40).map((p) => `<div class="cb-opt" data-pid="${p.id}">${esc(p.name)}${p.platform ? `<small>${esc(p.platform)}</small>` : ''}</div>`).join('')
    + (q && !exact ? `<div class="cb-opt cb-new" data-newname="${esc(query.trim())}">＋ 新增「${esc(query.trim())}」</div>` : '')
    || '<div class="cb-empty">還沒有任何對象，直接打名字就能新增</div>';
  box.hidden = false;
  const card = input.closest('.card');
  if (card) card.classList.add('cb-open');
}
function comboClose(input) {
  const box = input.parentElement.querySelector('.cb-list');
  if (box) box.hidden = true;
  const card = input.closest('.card');
  if (card) card.classList.remove('cb-open');
}
function comboChoose(input, pid, newName) {
  const path = input.dataset.pcombo;
  const id = pid || put('parties', { id: '', name: newName, platform: '' }).id;
  setPath(form.model, path, id);
  setPath(form.model, path.replace(/partyId$/, 'partyName'), nameOf('parties', id));
  comboClose(input);
  refreshForm();
}
/** 離開欄位時：打的字剛好是某個對象就選它，清空就取消選擇，其他的還原成原本選的 */
function comboResolve(input) {
  const path = input.dataset.pcombo;
  const text = input.value.trim().toLowerCase();
  const cur = getPath(form.model, path);
  const hit = state.data.parties.find((p) => p.name.toLowerCase() === text);
  comboClose(input);
  if (text && hit && hit.id !== cur) return comboChoose(input, hit.id);
  if (!text && cur) { setPath(form.model, path, ''); setPath(form.model, path.replace(/partyId$/, 'partyName'), ''); return refreshForm(); }
  input.value = nameOf('parties', cur);
}
document.addEventListener('focusin', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.pcombo) { el.select(); comboFill(el, ''); }
});
document.addEventListener('focusout', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.pcombo && el.isConnected && form) comboResolve(el);
});
// 用 pointerdown 而不是 click：click 之前輸入框已經失焦、清單就收起來了
document.addEventListener('pointerdown', (ev) => {
  const opt = ev.target.closest('.cb-opt');
  if (!opt) return;
  ev.preventDefault();
  const input = opt.closest('.cb').querySelector('input');
  comboChoose(input, opt.dataset.pid, opt.dataset.newname);
});
document.addEventListener('keydown', (ev) => {
  const el = ev.target;
  if (ev.key !== 'Enter' || !(el.dataset && el.dataset.pcombo)) return;
  ev.preventDefault();
  const first = el.parentElement.querySelector('.cb-opt');
  if (first) comboChoose(el, first.dataset.pid, first.dataset.newname);
});

const partyOptions = () => state.data.parties.map((p) => [p.id, p.name + (p.platform ? `（${p.platform}）` : '')]);
const accountOptions = () => state.data.accounts.map((a) => [a.id, a.name]);
const optionList = (kind) => opts(kind).map((o) => [o.id, o.name]);

/* ---------- 買單表單 ---------- */
function newBuy() {
  const last = state.data.buys.slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
  return {
    buy: { id: '', date: todayStr(), partyId: '', partyName: '', payMethod: '匯款', accountId: '', paidDate: '', currency: 'TWD', paidTwd: '', pending: false, arrival: '未到', arrivedDate: '', expectedMonth: '', note: '', photoIds: '' },
    items: [emptyItem(last ? buyParts(last.id).items[0] : null)],
    fees: []
  };
}
function emptyItem(prev) {
  return { id: '', groupId: prev ? prev.groupId : (state.data.groups[0] ? state.data.groups[0].id : ''), releaseId: prev ? prev.releaseId : '', memberIds: '', isSet: false, channelId: prev ? prev.channelId : '', name: '', price: '', qty: 1, flags: '', cancelled: false };
}

function saveLabel() {
  const m = form.model;
  const goods = C.isTwd(m.buy.currency) ? C.itemsSum(m.items) : C.num(m.buy.paidTwd);
  const feeAll = m.fees.filter((f) => f.paid).reduce((s, f) => s + C.num(f.amount), 0);
  if (state.mask) return '存起來';
  const tail = C.isTwd(m.buy.currency) ? money(goods + feeAll) : `${foreign(C.itemsSum(m.items), m.buy.currency)} → ${money(goods + feeAll)}`;
  return `存起來 · 合計 ${tail}`;
}
/** 打字時只更新小計與合計，不重畫整頁 —— 重畫會把正在點的按鈕換掉，點擊就落空 */
function updateTotals() {
  if (!form || form.kind !== 'buy') return;
  form.model.items.forEach((it, i) => {
    const el = document.querySelector(`[data-sub="${i}"]`);
    if (el) el.textContent = foreign(C.itemTotal(it), form.model.buy.currency);
  });
  const btn = document.querySelector('button.btn[data-save]');
  if (btn) btn.textContent = saveLabel();
}


/** 付款／收款合成一欄：「匯款 · 銀行甲」「貨付」「刷卡」。選了就同時決定方式與帳戶 */
function payOptions(methods, cur) {
  const list = [];
  methods.forEach((m) => {
    if (m === '匯款') {
      state.data.accounts.forEach((a) => list.push([`匯款:${a.id}`, `匯款 · ${a.name}`]));
      list.push(['匯款:', state.data.accounts.length ? '匯款（不指定帳戶）' : '匯款']);
    } else list.push([`${m}:`, m]);
  });
  if (!list.some(([v]) => v === cur)) {
    const [m, id] = cur.split(':');
    list.push([cur, id ? `${m} · ${nameOf('accounts', id)}` : m]);
  }
  return list;
}
const payCombo = (label, target, obj, methods) => {
  const cur = `${obj.payMethod}:${obj.accountId || ''}`;
  return `<div class="field"><label>${label}</label><select data-paycombo="${target}">${optionTags(payOptions(methods, cur), cur)}<option value="__new__">＋ 新增帳戶…</option></select></div>`;
};
/** 團與回歸合成一欄：「團A · 回歸A」。沒有回歸就選「團A（不指定回歸）」 */
function releaseOptions() {
  const list = [];
  state.data.groups.forEach((g) => {
    releasesOf(g.id).forEach((r) => list.push([`r:${r.id}`, `${g.name} · ${r.name}`]));
    list.push([`g:${g.id}`, `${g.name}（不指定回歸）`]);
  });
  return list;
}
const releaseCombo = (it, i) => {
  const cur = it.releaseId ? `r:${it.releaseId}` : it.groupId ? `g:${it.groupId}` : '';
  return `<div class="field"><label>回歸</label><select data-relcombo="${i}">${optionTags(releaseOptions(), cur, '（選擇）')}<option value="__newrel__">＋ 新增回歸…</option><option value="__newgrp__">＋ 新增團…</option></select></div>`;
};

function buyFormHtml() {
  const m = form.model;
  return `
    ${form.inline ? '' : sheetTop(form.editing ? '編輯買單' : '記買單', '取消', '存起來')}
    <div class="${form.inline ? '' : 'sheet-body'}">
      <div class="card">
        ${fInput('下單日', 'buy.date', 'date')}
        ${partyCombo('賣家', 'buy.partyId')}
        ${payCombo('付款', 'buy', m.buy, PAY_BUY)}
        ${m.buy.payMethod === '貨付' ? '' : `<div class="field"><label>已付款</label><input type="checkbox" data-paidchk ${m.buy.paidDate ? 'checked' : ''}></div>`}
        ${fSelect('幣別', 'buy.currency', Object.entries(C.CURRENCIES))}
        ${C.isTwd(m.buy.currency) ? '' : fInput('實付台幣', 'buy.paidTwd', 'number', '還不知道就空著')}
        ${C.isTwd(m.buy.currency) ? '' : fCheck('待確認', 'buy.pending')}
        ${form.editing ? '' : `<div class="field"><button class="chip" data-more>${state.addMore ? '收起 ▴' : '到貨與付款日 ▾'}</button></div>`}
        ${state.addMore || form.editing ? `
          ${m.buy.payMethod !== '貨付' ? fInput('付款日', 'buy.paidDate', 'date', '空白＝還沒付') : ''}
          ${fSelect('到貨狀態', 'buy.arrival', ARRIVAL.map((x) => [x, x]))}
          ${m.buy.arrival === '已到' ? fInput('到貨日', 'buy.arrivedDate', 'date') : fInput('預計到貨', 'buy.expectedMonth', 'month', '預購才填')}` : ''}
      </div>

      <datalist id="item-names">${[...new Set(state.data.buyItems.map((x) => x.name).filter(Boolean))].map((n) => `<option value="${esc(n)}">`).join('')}</datalist>
      ${m.items.map((it, i) => itemHtml(it, i)).join('')}
      <button class="btn ghost" data-add-item style="margin-bottom:10px">＋ 新增一行（回歸、通路會自動帶入）</button>

      <div class="card"><h3>費用</h3>
        ${m.fees.map((f, i) => `<div class="subitem"><div class="head"><span>${esc(f.kind)}</span><button class="x" data-del-fee="${i}" aria-label="刪除">✕</button></div>
          ${fSelect('類別', `fees.${i}.kind`, FEE_KINDS.map((x) => [x, x]))}
          ${fInput('金額', `fees.${i}.amount`, 'number', f.kind === '後補款' ? '還不知道就空著' : '')}
          ${fCheck('已付', `fees.${i}.paid`)}
          ${fInput('備註', `fees.${i}.note`, 'text', f.kind === '後補款' ? '例如國際運費、尾款' : '')}</div>`).join('')}
        <button class="btn ghost small" data-add-fee style="margin-top:6px">＋ 新增費用</button>
      </div>

      ${photoCard()}
      <div class="card"><div class="field col"><label>備註</label><textarea data-path="buy.note" rows="2">${esc(m.buy.note)}</textarea></div></div>
      <button class="btn" data-save>${saveLabel()}</button>
      ${form.editing ? `<button class="btn danger" data-delete>刪除這張買單</button>` : ''}
    </div>`;
}

function itemHtml(it, i) {
  const gid = it.groupId;
  const ids = C.list(it.memberIds);
  const flags = C.list(it.flags);
  const total = C.itemTotal(it);
  const many = form.model.items.length > 1;
  return `<div class="card"><div class="subitem">${many ? `<div class="head"><b style="color:var(--text)">品項 ${i + 1}</b><button class="x" data-del-item="${i}" aria-label="刪除">✕</button></div>` : '<h3>品項</h3>'}
    ${releaseCombo(it, i)}
    ${gid ? `<div class="field col"><label>成員</label><div class="chips">
      ${membersOf(gid).map((mm) => `<button class="chip ${ids.includes(mm.id) && !it.isSet ? 'on' : ''}" data-member="${i}:${mm.id}">${esc(mm.name)}</button>`).join('')}
      <button class="chip ${it.isSet ? 'on' : ''}" data-set="${i}">一套</button>
      <button class="chip" data-new-member="${i}">＋</button></div></div>` : ''}
    ${fSelect('通路', `items.${i}.channelId`, optionList('channel'), '（不指定）', 'channel')}
    ${fInput('品項', `items.${i}.name`, 'text', '例如 簽售卡 1.0、空專', `list="item-names"`)}
    <div class="field"><label>單價 × 數量</label><span class="pq"><input data-path="items.${i}.price" type="number" inputmode="decimal" step="any" value="${esc(it.price)}" placeholder="0"><i>×</i><input data-path="items.${i}.qty" type="number" inputmode="decimal" step="any" value="${esc(it.qty)}"></span></div>
    <div class="chips" style="margin-top:4px">${FLAGS.map((f) => `<button class="chip warn ${flags.includes(f) ? 'on' : ''}" data-flag="${i}:${f}">${f}</button>`).join('')}</div>
    ${form.editing ? fCheck('這行已取消', `items.${i}.cancelled`) : ''}
    <div class="field"><span>小計</span><span class="amt" data-sub="${i}">${foreign(total, form.model.buy.currency)}</span></div>
  </div></div>`;
}

/* ---------- 賣單、花費表單 ---------- */
function newSell() {
  return { id: '', date: todayStr(), partyId: '', partyName: '', content: '', groupId: '', memberIds: '', amount: '', payMethod: '匯款', accountId: '', paidDate: '', shipMethod: '', shipStatus: '未寄', note: '', photoIds: '' };
}
function sellFormHtml() {
  const m = form.model;
  return `
    ${form.inline ? '' : sheetTop(form.editing ? '編輯賣單' : '記賣單', '取消', '存起來')}
    <div class="${form.inline ? '' : 'sheet-body'}">
      <div class="card">
        ${fInput('日期', 'date', 'date')}
        ${partyCombo('買家', 'partyId')}
        ${fInput('內容', 'content', 'text', '例如 專卡 ×3')}
        ${fSelect('團', 'groupId', state.data.groups.map((g) => [g.id, g.name]), '（不指定）', 'group')}
        ${m.groupId ? `<div class="field col"><label>成員</label><div class="chips">${membersOf(m.groupId).map((mm) => `<button class="chip ${C.list(m.memberIds).includes(mm.id) ? 'on' : ''}" data-smember="${mm.id}">${esc(mm.name)}</button>`).join('')}</div></div>` : ''}
        ${fInput('金額', 'amount', 'number')}
        ${payCombo('收款', 'sell', m, PAY_SELL)}
        ${m.payMethod === '取貨付款' ? '' : `<div class="field"><label>已收款</label><input type="checkbox" data-paidchk ${m.paidDate ? 'checked' : ''}></div>`}
        ${fSelect('寄送方式', 'shipMethod', optionList('ship'), '（不指定）', 'ship')}
        ${fSelect('寄送狀態', 'shipStatus', SHIP_STATUS.map((x) => [x, x]))}
      </div>
      ${photoCard()}
      <div class="card"><div class="field col"><label>備註</label><textarea data-path="note" rows="2">${esc(m.note)}</textarea></div></div>
      <button class="btn" data-save>存起來</button>
      ${form.editing ? `<button class="btn danger" data-delete>刪除這張賣單</button>` : ''}
    </div>`;
}

function newExpense() { return { id: '', date: todayStr(), category: '', content: '', amount: '', accountId: '', groupId: '', memberId: '', note: '', photoIds: '' }; }
function expenseFormHtml() {
  const m = form.model;
  return `
    ${form.inline ? '' : sheetTop(form.editing ? '編輯花費' : '記花費', '取消', '存起來')}
    <div class="${form.inline ? '' : 'sheet-body'}">
      <div class="card">
        ${fInput('日期', 'date', 'date')}
        <div class="field"><label>類別</label><select data-path="category" data-add="expcat">${optionTags(optionList('expcat').map(([, n]) => [n, n]), m.category, '（選擇）')}<option value="__new__">＋ 新增…</option></select></div>
        ${fInput('內容', 'content', 'text', '例如 演唱會門票')}
        ${fInput('金額', 'amount', 'number')}
        ${fSelect('付款帳戶', 'accountId', accountOptions(), '（不指定）', 'account')}
        ${fSelect('團', 'groupId', state.data.groups.map((g) => [g.id, g.name]), '（不指定）', 'group')}
        ${m.groupId ? fSelect('成員', 'memberId', membersOf(m.groupId).map((mm) => [mm.id, mm.name]), '（不指定）') : ''}
      </div>
      ${photoCard()}
      <div class="card"><div class="field col"><label>備註</label><textarea data-path="note" rows="2">${esc(m.note)}</textarea></div></div>
      <button class="btn" data-save>存起來</button>
      ${form.editing ? `<button class="btn danger" data-delete>刪除這筆花費</button>` : ''}
    </div>`;
}

function openForm(kind, existing) {
  if (kind === 'buy') {
    if (existing) {
      const { items, fees } = buyParts(existing.id);
      form = { kind, editing: true, model: { buy: Object.assign({}, existing), items: items.map((x) => Object.assign({}, x)), fees: fees.map((x) => Object.assign({}, x)) } };
    } else form = { kind, editing: false, model: newBuy() };
  } else {
    form = { kind, editing: !!existing, model: existing ? Object.assign({}, existing) : kind === 'sell' ? newSell() : newExpense() };
  }
  openSheet('form', () => ({ buy: buyFormHtml, sell: sellFormHtml, expense: expenseFormHtml })[form.kind]());
}

/** 新增選項時要問的名字；回傳 null 代表取消 */
function askName(label) {
  const v = prompt(label);
  return v && v.trim() ? v.trim() : null;
}

function addEntity(kind, ctx) {
  // 回傳新紀錄的 id，沒新增就回 null
  if (kind === 'group') { const n = askName('團的名字'); return n ? put('groups', { id: '', name: n }).id : null; }
  if (kind === 'release') { const n = askName('回歸（專輯或活動）的名字'); return n && ctx ? put('releases', { id: '', groupId: ctx, name: n }).id : null; }
  if (kind === 'channel') { const n = askName('通路的名字'); return n ? put('options', { id: '', kind: 'channel', name: n }).id : null; }
  if (kind === 'ship') { const n = askName('寄送方式'); return n ? put('options', { id: '', kind: 'ship', name: n }).id : null; }
  if (kind === 'expcat') { const n = askName('花費類別'); if (!n) return null; put('options', { id: '', kind: 'expcat', name: n }); return n; }
  if (kind === 'account') { const n = askName('帳戶的名字（例如銀行名）'); return n ? put('accounts', { id: '', name: n }).id : null; }
  if (kind === 'party') {
    const n = askName('對象的暱稱'); if (!n) return null;
    const platform = prompt('在哪個平台認識的？（X、Threads、IG、蝦皮…，可空白）') || '';
    return put('parties', { id: '', name: n, platform: platform.trim() }).id;
  }
  return null;
}

function validateForm() {
  const m = form.model;
  if (form.kind === 'buy') {
    if (!m.items.some((i) => i.name || C.num(i.price))) return '至少要有一個品項';
    if (m.items.some((i) => (i.name || C.num(i.price)) && !i.groupId)) return '每個品項都要選團';
  } else if (form.kind === 'sell') {
    if (!C.num(m.amount)) return '金額要填';
  } else if (!C.num(m.amount)) return '金額要填';
  return '';
}

function saveForm() {
  const err = validateForm();
  if (err) return toast(err);
  const m = form.model;
  if (form.kind === 'buy') {
    const buy = Object.assign({}, m.buy);
    buy.partyName = nameOf('parties', buy.partyId, buy.partyName);
    // 貨付：取貨那天才付錢；先到貨再補上付款日
    if (buy.payMethod === '貨付') buy.paidDate = buy.arrival === '已到' ? (buy.arrivedDate || todayStr()) : '';
    if (buy.arrival === '已到' && !buy.arrivedDate) buy.arrivedDate = todayStr();
    const items = m.items.filter((i) => i.name || C.num(i.price)).map((i) => Object.assign({}, i, { price: C.num(i.price), qty: C.num(i.qty) || 1 }));
    const fees = m.fees.map((f) => Object.assign({}, f, { amount: C.num(f.amount), paidDate: f.paid ? (f.paidDate || '') : '' }));
    buy.paidTwd = C.isTwd(buy.currency) ? '' : (buy.paidTwd === '' ? '' : C.num(buy.paidTwd));
    putBuy(buy, items, fees);
  } else if (form.kind === 'sell') {
    const s = Object.assign({}, m, { amount: C.num(m.amount) });
    s.partyName = nameOf('parties', s.partyId, s.partyName);
    if (s.payMethod === '取貨付款') s.paidDate = s.shipStatus === '已取貨' ? (s.paidDate || todayStr()) : '';
    put('sells', s);
  } else {
    put('expenses', Object.assign({}, m, { amount: C.num(m.amount) }));
  }
  settlePhotos(true);
  if (form.inline) { drafts[form.kind] = null; $('#view').scrollTop = 0; } else closeSheet('form');
  form = null;
  render();
  $('#view').scrollTop = 0;
  toast('存好了');
}

/* ==========================================================================
   詳細面板：快速改狀態
   ========================================================================== */
function detailBuy(id) {
  const b = idx().buys[id];
  if (!b) return '';
  const { items, fees } = buyParts(id);
  const cur = b.currency;
  return `
    ${sheetTop(buyLabel(b), '關閉')}
    <div class="sheet-body">
      <div class="card">
        <div class="field"><span>下單日</span><span>${esc(b.date)}</span></div>
        <div class="field"><span>付款</span><span>${esc(b.payMethod)}${b.accountId ? ' · ' + esc(nameOf('accounts', b.accountId)) : ''} · ${b.paidDate ? '已付 ' + mmdd(b.paidDate) : '未付'}</span></div>
        <div class="field"><span>到貨</span><span>${esc(b.arrival)}${b.arrivedDate ? ' ' + mmdd(b.arrivedDate) : ''}${b.expectedMonth && b.arrival === '未到' ? ' · 預計 ' + b.expectedMonth : ''}</span></div>
        ${C.isTwd(cur) ? '' : `<div class="field"><span>實付台幣</span><span>${b.paidTwd ? money(b.paidTwd) : '還沒填'}</span></div>`}
        <div class="field"><span>合計</span><span class="amt">${money(buyTotal(b))}</span></div>
        ${b.note ? `<div class="field col"><span>備註</span><span>${esc(b.note)}</span></div>` : ''}
      </div>
      <div class="card"><h3>品項</h3>${items.map((i) => `<div class="item" style="cursor:default"><div class="main"><div class="t">${esc(i.name || '（未命名）')}</div><div class="s">${C.list(i.flags).map((f) => `<span class="tag warn">${f}</span>`).join('')}${i.cancelled ? '<span class="tag">已取消</span>' : ''}${esc([nameOf('groups', i.groupId), nameOf('releases', i.releaseId), optionName(i.channelId), memberNames(i)].filter(Boolean).join(' · '))}</div></div><div class="amt">${foreign(C.itemTotal(i), cur)}</div></div>`).join('')}</div>
      ${photoStrip(b)}
      ${fees.length ? `<div class="card"><h3>費用</h3>${fees.map((f) => `<div class="item" style="cursor:default"><div class="main"><div class="t">${esc(f.kind)} ${f.paid ? '' : '<span class="tag warn">未付</span>'}</div><div class="s">${esc(f.note || '')}</div></div><div class="amt">${f.amount ? money(f.amount) : '？'}</div>${f.paid ? '' : `<button class="btn small" data-fee-paid="${f.id}">已付</button>`}</div>`).join('')}</div>` : ''}
      <div class="btn-row">
        ${!b.paidDate && b.payMethod !== '貨付' ? '<button class="btn" data-quick="paid">標示已付款</button>' : ''}
        ${b.arrival === '未到' ? '<button class="btn" data-quick="arrived">標示已到貨</button>' : ''}
      </div>
      <div class="btn-row">
        <button class="btn ghost" data-quick="edit">編輯</button>
        <button class="btn ghost" data-quick="copy">複製成新單</button>
        ${b.arrival !== '已取消' ? '<button class="btn ghost" data-quick="cancel">標示已取消</button>' : ''}
      </div>
    </div>`;
}

function detailSell(id) {
  const s = idx().sells[id];
  if (!s) return '';
  return `
    ${sheetTop(`賣 · ${s.partyName || ''}`, '關閉')}
    <div class="sheet-body">
      <div class="card">
        <div class="field"><span>日期</span><span>${esc(s.date)}</span></div>
        <div class="field"><span>內容</span><span>${esc(s.content)}</span></div>
        <div class="field"><span>金額</span><span class="amt in">${money(s.amount)}</span></div>
        <div class="field"><span>收款</span><span>${esc(s.payMethod)}${s.accountId ? ' · ' + esc(nameOf('accounts', s.accountId)) : ''} · ${s.paidDate ? '已收 ' + mmdd(s.paidDate) : '未收'}</span></div>
        <div class="field"><span>寄送</span><span>${esc(s.shipMethod || '')} · ${esc(s.shipStatus || '')}</span></div>
        ${s.note ? `<div class="field col"><span>備註</span><span>${esc(s.note)}</span></div>` : ''}
      </div>
      ${photoStrip(s)}
      <div class="btn-row">
        ${!s.paidDate && s.payMethod === '匯款' ? '<button class="btn" data-quick="paid">標示已收款</button>' : ''}
        ${s.shipStatus === '未寄' ? '<button class="btn" data-quick="shipped">標示已寄出</button>' : ''}
        ${s.shipStatus === '已寄' ? '<button class="btn" data-quick="picked">標示已取貨</button>' : ''}
      </div>
      <div class="btn-row"><button class="btn ghost" data-quick="edit">編輯</button><button class="btn ghost" data-quick="copy">複製成新單</button></div>
    </div>`;
}

/* ---------- 依團看：回歸、成員、收集表 ---------- */
function groupSheet(groupId) {
  const period = state.period === 'month' ? state.month : null;
  const d = C.groupDetail(state.data, groupId, period);
  const rels = Object.keys(d.byRelease).sort((a, b) => d.byRelease[b] - d.byRelease[a]);
  const mems = Object.keys(d.byMember).sort((a, b) => d.byMember[b] - d.byMember[a]);
  return `
    ${sheetTop(groupId ? nameOf('groups', groupId) : '（沒指定團）', '關閉')}
    <div class="sheet-body">
      <div class="card"><h3>各回歸支出（${period ? period : '累積'}）</h3>
        ${rels.length ? rels.map((r) => `<div class="item" ${r ? `data-act="collection" data-id="${r}"` : 'style="cursor:default"'}><div class="main"><div class="t">${esc(r ? nameOf('releases', r) : '（沒指定回歸）')}</div>${r ? '<div class="s">點開看收集表</div>' : ''}</div><div class="amt">${money(d.byRelease[r])}</div></div>`).join('') : '<p class="hint">還沒有支出</p>'}
      </div>
      <div class="card"><h3>各成員支出</h3>
        ${mems.length ? mems.map((m) => `<div class="item" style="cursor:default"><div class="main"><div class="t">${esc(m ? nameOf('members', m) : '（整套或未指定成員）')}</div></div><div class="amt">${money(d.byMember[m])}</div></div>`).join('') : '<p class="hint">還沒有支出</p>'}
      </div>
    </div>`;
}

function collectionSheet(releaseId) {
  const rel = idx().releases[releaseId];
  const { members, rows } = C.collection(state.data, releaseId);
  const channelIds = Object.keys(rows);
  const cols = members.concat(channelIds.some((c) => rows[c]['']) ? [{ id: '', name: '（無成員）' }] : []);
  const fmt = (n) => (Math.round(n * 10) / 10).toString();
  const cell = (c) => {
    if (!c || (!c.have && !c.pending)) return '<td class="none">–</td>';
    const bits = [];
    if (c.pending) bits.push(`待到 ${fmt(c.pending)}`);
    if (c.multi) bits.push(`多帶 ${fmt(c.multi)}`);
    if (c.dup) bits.push(`重複 ${fmt(c.dup)}`);
    return `<td class="has">${c.have ? fmt(c.have) : '–'}${bits.length ? `<small>${bits.join(' · ')}</small>` : ''}</td>`;
  };
  return `
    ${sheetTop(rel ? rel.name : '收集表', '關閉')}
    <div class="sheet-body">
      <div class="card">
        ${channelIds.length ? `<div class="matrix-wrap"><table class="matrix"><thead><tr><th>通路</th>${cols.map((m) => `<th>${esc(m.name)}</th>`).join('')}</tr></thead>
        <tbody>${channelIds.map((ch) => `<tr><td>${esc(ch ? optionName(ch) : '（沒填通路）')}</td>${cols.map((m) => cell(rows[ch][m.id])).join('')}</tr>`).join('')}</tbody></table></div>` : '<p class="hint">這個回歸還沒有買單品項。</p>'}
      </div>
      <p class="hint">數字是已到貨的張數；「待到」是還沒到的。「一套」算每位成員各一張。選了好幾位成員的品項，數量平分給他們。空格（–）就是還沒收到的。</p>
    </div>`;
}

/* ==========================================================================
   設定
   ========================================================================== */
function settingsSheet() {
  const themes = [['light', '淺色', '#faf7f5', '#333'], ['dark', '深色', '#16141b', '#eee'], ['auto', '自動', 'linear-gradient(90deg,#faf7f5 50%,#16141b 50%)', '#888'], ['glow', '粉紫', 'linear-gradient(135deg,#ff8fd0,#7c8cff)', '#fff'], ['custom', '自訂', bgData ? `url(${bgData.url}) center/cover` : '#3a2457', '#fff']];
  const custom = state.theme === 'custom';
  const photo = state.theme === 'glow' || custom;
  const isOpen = (k) => !state.collapsed[k];
  const collHead = (k, label, count) => `<button class="coll" data-collapse="${k}"><span>${label} <small>${count}</small></span><span class="arrow">${isOpen(k) ? '▾' : '▸'}</span></button>`;
  const group = (g) => `<div class="item" data-act="edit-group" data-id="${g.id}"><div class="main"><div class="t">${esc(g.name)}</div><div class="s">${membersOf(g.id).length} 位成員 · ${releasesOf(g.id).length} 個回歸</div></div><span class="hint">›</span></div>`;
  const simple = (kind, list, label) => `<div class="card">${collHead(kind, label, list.length)}${!isOpen(kind) ? '' : list.map((o) => `<div class="item" data-act="edit-simple" data-kind="${kind}" data-id="${o.id}"><div class="main"><div class="t">${esc(o.name)}${o.platform ? ' · ' + esc(o.platform) : ''}</div></div><span class="hint">›</span></div>`).join('') + `<button class="btn ghost small" data-add-simple="${kind}" style="margin-top:6px">＋ 新增</button>`}</div>`;
  return `
    ${sheetTop('設定', '關閉')}
    <div class="sheet-body">
      <div class="card"><h3>連線（Google 試算表）</h3>
        <div class="field col"><label>後端網址</label><input id="set-url" type="url" value="${esc(state.apiUrl)}" placeholder="https://script.google.com/macros/s/…/exec"></div>
        <div class="field col"><label>通關密語</label><input id="set-secret" type="password" value="${esc(state.secret)}" autocomplete="off"></div>
        <button class="btn" data-save-conn style="margin-top:8px">儲存並測試</button>
        <p class="hint" style="margin-top:8px">${state.apiUrl ? (state.sync.error ? '⚠ ' + esc(state.sync.error) : '') : '還沒連線，資料只存在這支手機。'}</p>
      </div>

      <div class="card"><h3>外觀</h3>
        <div class="swatches">${themes.map(([k, l, bg, fg]) => `<button class="sw ${state.theme === k ? 'on' : ''}" data-theme-pick="${k}" style="background:${bg}"><span>${l}</span></button>`).join('')}</div>
        ${photo ? `
          ${custom ? `<input type="file" id="bg-file" accept="image/*" hidden><button class="btn ghost" data-pick-bg style="margin:6px 0 10px">${bgData ? '換一張照片' : '從相簿挑一張照片'}</button>` : ''}
          <div class="slider"><div class="lab"><span>背景壓暗</span><span>${Math.round(Math.max(sliderVal('dim', .3), .2) * 100)}%</span></div><input type="range" min="20" max="80" value="${Math.round(Math.max(sliderVal('dim', .3), .2) * 100)}" data-slider="dim"></div>
          <div class="slider"><div class="lab"><span>背景模糊</span><span>${sliderVal('blur', 2)}px</span></div><input type="range" min="0" max="20" value="${sliderVal('blur', 2)}" data-slider="blur"></div>
          ${custom ? `<div class="slider"><div class="lab"><span>照片位置</span><span>${sliderVal('pos', 50)}%</span></div><input type="range" min="0" max="100" value="${sliderVal('pos', 50)}" data-slider="pos"></div>` : ''}
          <p class="hint">卡片是深色玻璃配白字。照片太亮、字不夠清楚，就把「壓暗」拉高。照片只存在這支手機，換手機要重新上傳。</p>
          ${custom && bgData ? '<button class="btn danger" data-remove-bg>移除自訂背景</button>' : ''}` : ''}
      </div>

      <div class="card">${collHead('groups', '團與成員', state.data.groups.length)}${!isOpen('groups') ? '' : (state.data.groups.map(group).join('') || '<p class="hint">還沒有團</p>') + '<button class="btn ghost small" data-add-group style="margin-top:6px">＋ 新增團</button>'}</div>
      ${simple('accounts', state.data.accounts, '帳戶')}
      ${simple('parties', state.data.parties, '對象（賣家與買家）')}
      ${simple('channel', opts('channel'), '通路')}
      ${simple('ship', opts('ship'), '寄送方式')}
      ${simple('expcat', opts('expcat'), '花費類別')}

      <div class="card"><h3>照片與資料</h3>
        <p class="hint" style="margin-bottom:8px">單上的照片只存在這支手機，共 ${photoStats.count} 張、約 ${fmtSize(photoStats.bytes)}。${photoStats.missing ? `<b style="color:var(--warn)">還有 ${photoStats.missing} 張在別支手機</b>，` : ''}清除瀏覽器資料或換手機，照片就會不見，所以換手機前先匯出。</p>
        <div class="btn-row"><button class="btn" data-export>匯出照片和資料</button><button class="btn ghost" data-import>匯入</button></div>
        <p class="hint">匯出的 zip 會放在手機的「檔案」，裡面有所有照片和全部紀錄。匯入是合併：這支手機已經有的不會被蓋掉，只補上沒有的。</p>
        <button class="btn danger" data-clear-photos>清除這支手機上的照片</button>
      </div>

      <div class="card"><h3>關於</h3><p class="hint">STAR TO RECORD ${FRONT_VERSION} · 後端 ${esc(state.sync.backend || '—')}</p>${state.sync.backend && Number(state.sync.backend.slice(1)) < BACKEND_NEEDED ? '<p class="hint" style="color:var(--warn);margin-top:6px">後端版本太舊，請重新部署 Code.gs，才能把照片資訊同步到試算表。</p>' : ''}</div>
    </div>`;
}

function editGroupSheet(gid) {
  const g = idx().groups[gid];
  if (!g) return '';
  return `
    ${sheetTop(g.name, '關閉')}
    <div class="sheet-body">
      <div class="card"><h3>成員</h3>${membersOf(gid).map((m) => `<div class="item" data-act="edit-simple" data-kind="members" data-id="${m.id}"><div class="main"><div class="t">${esc(m.name)}</div></div><span class="hint">›</span></div>`).join('')}<button class="btn ghost small" data-add-member-g="${gid}" style="margin-top:6px">＋ 新增成員</button></div>
      <div class="card"><h3>回歸</h3>${releasesOf(gid).map((r) => `<div class="item" data-act="edit-simple" data-kind="releases" data-id="${r.id}"><div class="main"><div class="t">${esc(r.name)}</div></div><span class="hint">›</span></div>`).join('')}<button class="btn ghost small" data-add-release-g="${gid}" style="margin-top:6px">＋ 新增回歸</button></div>
      <button class="btn ghost" data-rename-group="${gid}">改團名</button>
      <button class="btn danger" data-del-group="${gid}">刪除這個團</button>
      <p class="hint">刪除只會移除團本身，已經記過的買單品項不會消失，但會變成「沒指定團」。</p>
    </div>`;
}

const editingSimple = {};
function editSimple(kind, id) {
  const rec = state.data[kind === 'channel' || kind === 'ship' || kind === 'expcat' ? 'options' : kind].find((r) => r.id === id);
  if (!rec) return;
  const entity = rec.kind ? 'options' : kind;
  const name = prompt('名稱（留空並按確定＝刪除）', rec.name);
  if (name === null) return;
  if (!name.trim()) {
    if (confirm(`刪除「${rec.name}」？已經記過的紀錄不會消失。`)) del(entity, id);
  } else {
    put(entity, Object.assign({}, rec, { name: name.trim() }));
    if (kind === 'parties') {
      const platform = prompt('平台（可空白）', rec.platform || '');
      if (platform !== null) put('parties', Object.assign({}, rec, { name: name.trim(), platform: platform.trim() }));
    }
  }
  render();
}

/* ==========================================================================
   事件
   ========================================================================== */
document.addEventListener('click', async (ev) => {
  const t = ev.target.closest('button, [data-act], [data-tab]');
  if (!t) return;
  const d = t.dataset;

  /* ----- 分頁、頂部 ----- */
  if (d.tab) { state.tab = d.tab; return render(); }
  if (t.id === 'btn-eye') { state.mask = !state.mask; lsSet('sl.mask', state.mask ? '1' : ''); return render(); }
  if (t.id === 'btn-gear' || d.act === 'settings') { refreshPhotoStats(); return openSheet('settings', settingsSheet); }
  if (d.addkind) { state.addKind = d.addkind; form = null; return render(); }
  if (d.period) { state.period = d.period; return render(); }
  if (d.month) {
    const [y, m] = state.month.split('-').map(Number);
    const nd = new Date(y, m - 1 + Number(d.month), 1);
    state.month = `${nd.getFullYear()}-${pad(nd.getMonth() + 1)}`;
    return render();
  }

  /* ----- 明細篩選 ----- */
  if (d.kind && t.classList.contains('chip') && !d.id) {
    const k = state.filter.kinds;
    state.filter.kinds = k.includes(d.kind) ? k.filter((x) => x !== d.kind) : k.concat(d.kind);
    return render();
  }
  if (d.filterToggle) { state.filter.allTime = !state.filter.allTime; return render(); }

  /* ----- 列表上的點擊 ----- */
  if (d.act === 'buy') { detailId = d.id; return openSheet('detail', () => detailBuy(d.id)); }
  if (d.act === 'sell') { detailId = d.id; return openSheet('detail', () => detailSell(d.id)); }
  if (d.act === 'expense') return openForm('expense', state.data.expenses.find((e) => e.id === d.id));
  if (d.act === 'group') return openSheet('group', () => groupSheet(d.id));
  if (d.act === 'collection') return openSheet('collection', () => collectionSheet(d.id));
  if (d.act === 'edit-group') return openSheet('group-edit', () => editGroupSheet(d.id));
  if (d.act === 'edit-simple') return editSimple(d.kind, d.id);

  /* ----- 照片：看大圖（任何地方的縮圖都一樣） ----- */
  if (d.pv != null) {
    viewer.ids = d.pv.split(','); viewer.i = Number(d.pvi) || 0;
    return openSheet('pv', viewerHtml);
  }
  if (d.pvStep) {
    viewer.i = (viewer.i + Number(d.pvStep) + viewer.ids.length) % viewer.ids.length;
    return refreshSheets();
  }
  if (t.hasAttribute('data-add-photo')) return $('#photo-file').click();
  if (d.delPhoto) return removePhoto(d.delPhoto);

  /* ----- 面板內 ----- */
  const sheetEl = t.closest('.sheet');
  const sheetId = sheetEl ? sheetEl.dataset.sheet : '';
  if (t.hasAttribute('data-close')) {
    if (sheetId === 'form') { settlePhotos(false); form = null; }
    if (sheetId === 'pv' && fullUrl) { URL.revokeObjectURL(fullUrl); fullUrl = null; }
    closeSheet(sheetId); return render();
  }
  if (t.hasAttribute('data-save') && sheetId === 'form') return saveForm();
  if (t.hasAttribute('data-delete') && sheetId === 'form') {
    if (!confirm('確定刪除？（這張單的照片也會一起刪掉）')) return;
    form.removed = []; form.added = [];
    if (form.kind === 'buy') delBuy(form.model.buy.id); else del(form.kind === 'sell' ? 'sells' : 'expenses', form.model.id);
    form = null; closeSheet('form'); closeSheet('detail'); render(); return toast('已刪除');
  }

  if (!sheetEl && form && form.inline && t.closest('#view')) {
    if (t.hasAttribute('data-save')) return saveForm();
    return formClick(t, d);
  }
  if (sheetId === 'form') return formClick(t, d);
  if (sheetId === 'detail') return detailClick(t, d);
  if (sheetId === 'settings' || sheetId === 'group-edit') return settingsClick(t, d);
});

let detailId = null;

function formClick(t, d) {
  const m = form.model;
  if (t.hasAttribute('data-more')) { state.addMore = !state.addMore; return refreshForm(); }
  if (t.hasAttribute('data-add-item')) { m.items.push(emptyItem(m.items[m.items.length - 1])); return refreshForm(); }
  if (d.delItem != null) { m.items.splice(Number(d.delItem), 1); if (!m.items.length) m.items.push(emptyItem(null)); return refreshForm(); }
  if (t.hasAttribute('data-add-fee')) { m.fees.push({ id: '', kind: '運費', amount: '', paid: true, paidDate: '', note: '' }); return refreshForm(); }
  if (d.delFee != null) { m.fees.splice(Number(d.delFee), 1); return refreshForm(); }

  if (d.member) {
    const [i, mid] = d.member.split(':');
    const it = m.items[Number(i)];
    let ids = C.list(it.memberIds);
    ids = ids.includes(mid) ? ids.filter((x) => x !== mid) : ids.concat(mid);
    it.memberIds = ids.join(',');
    it.isSet = false;
    // 多選時數量預設跟人數一樣（各一張），除非已經手動改過
    if (ids.length > 1 && (C.num(it.qty) <= 1 || C.num(it.qty) === ids.length - 1)) it.qty = ids.length;
    else if (ids.length <= 1 && C.num(it.qty) === ids.length + 1) it.qty = 1;
    return refreshForm();
  }
  if (d.set != null) { const it = m.items[Number(d.set)]; it.isSet = !it.isSet; if (it.isSet) { it.memberIds = ''; it.qty = 1; } return refreshForm(); }
  if (d.newMember != null) {
    const it = m.items[Number(d.newMember)];
    const n = askName('成員的名字');
    if (!n) return;
    const rec = put('members', { id: '', groupId: it.groupId, name: n });
    it.memberIds = C.list(it.memberIds).concat(rec.id).join(',');
    it.isSet = false;
    return refreshForm();
  }
  if (d.flag) {
    const [i, f] = d.flag.split(':');
    const it = m.items[Number(i)];
    const fl = C.list(it.flags);
    it.flags = (fl.includes(f) ? fl.filter((x) => x !== f) : fl.concat(f)).join(',');
    return refreshForm();
  }
  if (d.smember) {
    const ids = C.list(m.memberIds);
    m.memberIds = (ids.includes(d.smember) ? ids.filter((x) => x !== d.smember) : ids.concat(d.smember)).join(',');
    return refreshForm();
  }
}

function detailClick(t, d) {
  const id = detailId;
  const sheet = sheets.find((s) => s.id === 'detail');
  const isBuy = !!idx().buys[id];
  if (d.feePaid) {
    const fee = state.data.buyFees.find((f) => f.id === d.feePaid);
    patchFee(fee, { paid: true, paidDate: todayStr() });
    return render();
  }
  if (!d.quick) return;
  if (isBuy) {
    const b = idx().buys[id];
    if (d.quick === 'paid') patchBuy(id, { paidDate: todayStr() });
    if (d.quick === 'arrived') patchBuy(id, { arrival: '已到', arrivedDate: todayStr(), paidDate: b.payMethod === '貨付' ? todayStr() : b.paidDate });
    if (d.quick === 'cancel') { if (!confirm('這張單標成已取消？取消後不會計入花費。')) return; patchBuy(id, { arrival: '已取消' }); }
    if (d.quick === 'edit') { closeSheet('detail'); return openForm('buy', idx().buys[id]); }
    if (d.quick === 'copy') {
      closeSheet('detail');
      const { items, fees } = buyParts(id);
      form = { kind: 'buy', editing: false, model: { buy: Object.assign({}, b, { id: '', date: todayStr(), paidDate: '', arrival: '未到', arrivedDate: '', createdAt: '', photoIds: '' }), items: items.map((i) => Object.assign({}, i, { id: '' })), fees: fees.map((f) => Object.assign({}, f, { id: '', paid: f.kind === '後補款' ? false : f.paid, paidDate: '' })) } };
      return openSheet('form', buyFormHtml);
    }
  } else {
    const s = idx().sells[id];
    if (d.quick === 'paid') put('sells', Object.assign({}, s, { paidDate: todayStr() }));
    if (d.quick === 'shipped') put('sells', Object.assign({}, s, { shipStatus: '已寄' }));
    if (d.quick === 'picked') put('sells', Object.assign({}, s, { shipStatus: '已取貨', paidDate: s.paidDate || (s.payMethod === '取貨付款' ? todayStr() : s.paidDate) }));
    if (d.quick === 'edit') { closeSheet('detail'); return openForm('sell', s); }
    if (d.quick === 'copy') {
      closeSheet('detail');
      form = { kind: 'sell', editing: false, model: Object.assign({}, s, { id: '', date: todayStr(), paidDate: '', shipStatus: '未寄', createdAt: '', photoIds: '' }) };
      return openSheet('form', sellFormHtml);
    }
  }
  if (sheet) sheet.render = () => (isBuy ? detailBuy(id) : detailSell(id));
  render();
}

function settingsClick(t, d) {
  if (t.hasAttribute('data-export')) return exportBackup();
  if (t.hasAttribute('data-import')) return $('#import-file').click();
  if (t.hasAttribute('data-clear-photos')) {
    if (!confirm('刪掉這支手機上所有的照片？單上的紀錄還在，只是照片不見了。建議先匯出備份。')) return;
    return PhotoDB.clear().then(() => { thumbUrls.forEach((u) => URL.revokeObjectURL(u)); thumbUrls.clear(); missingPhotos.clear(); render(); refreshPhotoStats(); toast('已清除照片'); });
  }
  if (d.collapse) {
    state.collapsed[d.collapse] = !state.collapsed[d.collapse];
    lsSet('sl.collapsed', JSON.stringify(state.collapsed));
    return refreshSheets();
  }
  if (d.themePick) {
    if (d.themePick === 'custom' && !bgData) {
      state.theme = 'custom'; lsSet('sl.theme', 'custom');
      applyTheme(); refreshSheets();
      return;
    }
    state.theme = d.themePick; lsSet('sl.theme', d.themePick);
    applyTheme(); return refreshSheets();
  }
  if (t.hasAttribute('data-pick-bg')) return $('#bg-file').click();
  if (t.hasAttribute('data-remove-bg')) {
    bgSet(null); bgData = null; state.theme = 'light'; lsSet('sl.theme', 'light');
    applyTheme(); return refreshSheets();
  }
  if (t.hasAttribute('data-save-conn')) {
    state.apiUrl = $('#set-url').value.trim(); state.secret = $('#set-secret').value.trim();
    lsSet('sl.api', state.apiUrl); lsSet('sl.secret', state.secret);
    if (!state.apiUrl) { setSync('idle'); return toast('已清除連線設定'); }
    toast('連線中…');
    return pull().then(() => { refreshSheets(); if (state.sync.status === 'ok') toast('已同步'); });
  }
  if (t.hasAttribute('data-add-group')) { const id = addEntity('group'); if (id) openSheet('group-edit', () => editGroupSheet(id)); return refreshSheets(); }
  if (d.addSimple) {
    const map = { accounts: 'account', parties: 'party', channel: 'channel', ship: 'ship', expcat: 'expcat' };
    addEntity(map[d.addSimple]); return refreshSheets();
  }
  if (d.addMemberG) { const n = askName('成員的名字'); if (n) put('members', { id: '', groupId: d.addMemberG, name: n }); return refreshSheets(); }
  if (d.addReleaseG) { addEntity('release', d.addReleaseG); return refreshSheets(); }
  if (d.renameGroup) {
    const g = idx().groups[d.renameGroup];
    const n = askName('新的團名');
    if (n) put('groups', Object.assign({}, g, { name: n }));
    return refreshSheets();
  }
  if (d.delGroup) {
    if (!confirm('刪除這個團？成員與回歸也會一起移除。')) return;
    membersOf(d.delGroup).forEach((m) => del('members', m.id));
    releasesOf(d.delGroup).forEach((r) => del('releases', r.id));
    del('groups', d.delGroup);
    closeSheet('group-edit'); return render();
  }
}

/* ---------- 輸入欄位：改了就寫回 model ---------- */
function onFieldChange(ev) {
  const el = ev.target;
  if (!el.dataset) return;

  if (el.dataset.filter) {
    const k = el.dataset.filter;
    state.filter[k] = el.value;
    if (k === 'groupId') state.filter.memberId = '';
    return k === 'q' ? render() : render();
  }
  if (el.dataset.slider) {
    const k = el.dataset.slider;
    lsSet('sl.' + k, k === 'dim' ? (Number(el.value) / 100) : el.value);
    applyTheme();
    return refreshSheets();
  }
  if (el.id === 'photo-file') { const f = el.files; if (f && f.length && form) addPhotos(f); return; }
  if (el.id === 'import-file') { const f = el.files[0]; el.value = ''; if (f) importBackup(f); return; }
  if (el.id === 'bg-file' && el.files[0]) {
    return importBackground(el.files[0]).then(() => refreshSheets()).catch(() => toast('這張照片打不開，換一張試試'));
  }

  if (form && el.dataset.paycombo) {
    const target = el.dataset.paycombo === 'buy' ? form.model.buy : form.model;
    if (el.value === '__new__') {
      const id = addEntity('account');
      if (id) target.accountId = id;
    } else {
      const [method, id] = el.value.split(':');
      target.payMethod = method; target.accountId = id || '';
      if (method === '貨付' || method === '取貨付款') target.paidDate = '';
    }
    return refreshForm();
  }
  if (form && el.dataset.relcombo != null) {
    const it = form.model.items[Number(el.dataset.relcombo)];
    const v = el.value;
    const setGroup = (gid, rid) => {
      if (it.groupId !== gid) { it.memberIds = ''; it.isSet = false; }
      it.groupId = gid; it.releaseId = rid;
    };
    if (v.startsWith('r:')) { const r = idx().releases[v.slice(2)]; if (r) setGroup(r.groupId, r.id); }
    else if (v.startsWith('g:')) setGroup(v.slice(2), '');
    else if (v === '__newgrp__') { const id = addEntity('group'); if (id) setGroup(id, ''); }
    else if (v === '__newrel__') {
      if (!it.groupId) toast('先選團，再新增回歸');
      else { const id = addEntity('release', it.groupId); if (id) it.releaseId = id; }
    } else setGroup('', '');
    return refreshForm();
  }
  if (form && el.dataset.paidchk != null) {
    const target = form.kind === 'buy' ? form.model.buy : form.model;
    target.paidDate = el.checked ? (target.paidDate || todayStr()) : '';
    return refreshForm();
  }

  if (!form || !el.dataset.path) return;
  let value = el.type === 'checkbox' ? el.checked : el.value;

  // 下拉裡的「＋ 新增…」
  if (value === '__new__') {
    const kind = el.dataset.add;
    const ctx = kind === 'release' ? getPath(form.model, el.dataset.path.replace(/releaseId$/, 'groupId')) : null;
    const id = addEntity(kind, ctx);
    if (id) setPath(form.model, el.dataset.path, id);
    return refreshForm();
  }
  setPath(form.model, el.dataset.path, value);

  // 連動：換了團，回歸與成員要清掉；付款方式變了，帳戶與付款日跟著整理
  const path = el.dataset.path;
  if (/(^|\.)groupId$/.test(path)) {
    const base = path.replace(/groupId$/, '');
    if (base) { setPath(form.model, base + 'releaseId', ''); setPath(form.model, base + 'memberIds', ''); setPath(form.model, base + 'isSet', false); }
    else if ('memberId' in form.model) form.model.memberId = '';
    if (base === '' && form.kind === 'sell') form.model.memberIds = '';
  }
  if (path === 'buy.arrival' && value === '已到' && !form.model.buy.arrivedDate) form.model.buy.arrivedDate = todayStr();
  if (path === 'payMethod' && form.kind === 'sell' && value !== '匯款') form.model.accountId = '';

  const structural = el.tagName === 'SELECT' || el.type === 'checkbox' || /date|month/.test(el.type);
  if (structural) refreshForm(); else updateTotals();
}
document.addEventListener('change', onFieldChange);
document.addEventListener('input', (ev) => {
  const el = ev.target;
  if (el.dataset && el.dataset.pcombo) return comboFill(el, el.value);
  if (el.dataset && el.dataset.filter === 'q') { state.filter.q = el.value; return render(); }
  if (el.dataset && el.dataset.slider) return onFieldChange(ev);
  if (form && el.dataset && el.dataset.path && el.tagName !== 'SELECT' && el.type !== 'checkbox' && !/date|month/.test(el.type)) {
    setPath(form.model, el.dataset.path, el.value);
    updateTotals();
  }
});

/* ==========================================================================
   啟動
   ========================================================================== */
window.addEventListener('online', () => { flush(); });
window.addEventListener('offline', renderSync);

/** 開發用：網址加 ?seed=local，就把 www/_local-seed.json 灌進本機資料（只存手機本機，不送後端）。
    那個檔案放真實紀錄，已被 .gitignore 擋掉，不會進 repo；檔案不存在就什麼都不做。 */
async function loadLocalSeed() {
  if (new URLSearchParams(location.search).get('seed') !== 'local') return;
  try {
    const res = await fetch('_local-seed.json', { cache: 'no-store' });
    if (!res.ok) return;
    const seed = await res.json();
    ENTITIES.forEach((e) => { state.data[e] = seed[e] || []; });
    state.outbox = [];
    saveLocal();
    history.replaceState(null, '', location.pathname);
  } catch (e) { /* 沒有檔案或格式不對，照常啟動 */ }
}

async function boot() {
  await loadLocalSeed();
  const saved = await bgGet();
  if (saved) bgData = saved;
  if (state.theme === 'custom' && !bgData) state.theme = 'glow';
  applyTheme();
  ensureDefaults();
  render();
  if (state.apiUrl) pull();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();

// 給 scripts 測試用
window.__sl = { state, put, putBuy, render, openForm, openSheet, settingsSheet, applyTheme, PhotoDB, photoStats };
})();
