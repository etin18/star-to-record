/**
 * 用 Playwright 開 App、灌入虛構資料、走完主要流程並截圖，同時收集 console 錯誤。
 * 先 `python3 scripts/serve.py 8790`，再
 *   PW_CORE=<playwright-core 路徑> node scripts/screenshot.js
 * 資料全是虛構的（團A、成員甲、賣家小明），repo 是公開的。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(process.env.PW_CORE);

const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const BASE = process.env.BASE || 'http://localhost:8790';

function findChromium() {
  if (process.env.PW_CHROME) return process.env.PW_CHROME;
  const base = path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright');
  const dirs = fs.readdirSync(base).filter((d) => d.startsWith('chromium'))
    .sort((a, b) => Number(b.split('-').pop()) - Number(a.split('-').pop()));
  for (const d of dirs) for (const rel of ['chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-mac/Chromium.app/Contents/MacOS/Chromium']) {
    const full = path.join(base, d, rel); if (fs.existsSync(full)) return full;
  }
}

const today = new Date();
const iso = (offset) => { const d = new Date(today); d.setDate(d.getDate() + offset); return d.toISOString().slice(0, 10); };
const nextMonth = (() => { const d = new Date(today.getFullYear(), today.getMonth() + 2, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; })();

const SEED = {
  groups: [{ id: 'gA', name: '團A' }, { id: 'gB', name: '團B' }],
  members: [
    { id: 'm1', groupId: 'gA', name: '成員甲' }, { id: 'm2', groupId: 'gA', name: '成員乙' }, { id: 'm3', groupId: 'gA', name: '成員丙' },
    { id: 'm4', groupId: 'gB', name: '成員丁' }, { id: 'm5', groupId: 'gB', name: '成員戊' }
  ],
  releases: [{ id: 'r1', groupId: 'gA', name: '回歸A' }, { id: 'r2', groupId: 'gA', name: '回歸B' }, { id: 'r3', groupId: 'gB', name: '預售專輯' }],
  accounts: [{ id: 'a1', name: '銀行甲' }, { id: 'a2', name: '銀行乙' }],
  parties: [{ id: 'p1', name: '賣家小明', platform: 'X' }, { id: 'p2', name: '買家小美', platform: 'Threads' }, { id: 'p3', name: '代購阿花', platform: 'IG' }],
  options: [
    { id: 'c1', kind: 'channel', name: '店家A' }, { id: 'c2', kind: 'channel', name: '平台B' },
    ...['賣貨便', '交貨便', '面交', '宅配'].map((n, i) => ({ id: 's' + i, kind: 'ship', name: n })),
    ...['演唱會', '周邊', '交通', '住宿', '餐飲', '其他'].map((n, i) => ({ id: 'x' + i, kind: 'expcat', name: n }))
  ],
  buys: [
    { id: 'b1', date: iso(-3), partyId: 'p1', partyName: '賣家小明', payMethod: '匯款', accountId: 'a1', paidDate: '', currency: 'TWD', arrival: '未到' },
    { id: 'b2', date: iso(-20), partyId: 'p3', partyName: '代購阿花', payMethod: '匯款', accountId: 'a1', paidDate: iso(-19), currency: 'TWD', arrival: '未到' },
    { id: 'b3', date: iso(-10), partyId: 'p1', partyName: '賣家小明', payMethod: '刷卡', accountId: 'a2', paidDate: iso(-10), currency: 'KRW', paidTwd: 0, pending: true, arrival: '未到', expectedMonth: nextMonth },
    { id: 'b4', date: iso(-30), partyId: 'p1', partyName: '賣家小明', payMethod: '貨付', paidDate: iso(-25), currency: 'TWD', arrival: '已到', arrivedDate: iso(-25) }
  ],
  buyItems: [
    { id: 'i1', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c1', name: '簽售卡 1.0', price: 150, qty: 1, flags: '' },
    { id: 'i2', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: 'm2', channelId: 'c1', name: '簽售卡 1.0', price: 100, qty: 1, flags: '多帶' },
    { id: 'i3', buyId: 'b2', groupId: 'gA', releaseId: 'r1', memberIds: '', isSet: true, channelId: 'c2', name: '預售特典', price: 880, qty: 1, flags: '' },
    { id: 'i4', buyId: 'b3', groupId: 'gB', releaseId: 'r3', memberIds: 'm4,m5', channelId: 'c2', name: '預售專輯', price: 31000, qty: 2, flags: '' },
    { id: 'i5', buyId: 'b4', groupId: 'gA', releaseId: 'r2', memberIds: 'm3', channelId: 'c1', name: '特典卡', price: 120, qty: 2, flags: '重複' },
    { id: 'i6', buyId: 'b4', groupId: 'gA', releaseId: 'r2', memberIds: '', channelId: 'c1', name: '空專', price: 80, qty: 1, flags: '' }
  ],
  buyFees: [
    { id: 'f1', buyId: 'b1', kind: '運費', amount: 38, paid: true },
    { id: 'f2', buyId: 'b2', kind: '後補款', amount: 80, paid: false, note: '國際運費' }
  ],
  sells: [
    { id: 's1', date: iso(-4), partyId: 'p2', partyName: '買家小美', content: '成員甲專卡 ×3', groupId: 'gA', amount: 120, payMethod: '匯款', accountId: 'a2', paidDate: '', shipMethod: '賣貨便', shipStatus: '未寄' },
    { id: 's2', date: iso(-6), partyId: 'p2', partyName: '買家小美', content: '空專', groupId: 'gA', amount: 90, payMethod: '匯款', accountId: 'a2', paidDate: iso(-5), shipMethod: '面交', shipStatus: '未寄' }
  ],
  expenses: [{ id: 'e1', date: iso(-2), category: '演唱會', content: '門票', amount: 3800, accountId: 'a1', groupId: 'gB' }]
};

const errors = [];
const checks = [];
const check = (name, ok) => { checks.push([name, ok]); console.log(ok ? '  ✓' : '  ✗', name); };

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  await page.addInitScript((seed) => {
    if (!localStorage.getItem('sl.data')) localStorage.setItem('sl.data', JSON.stringify(seed));
  }, SEED);
  await page.goto(BASE);
  await page.waitForSelector('#view .card, #view .empty');
  const shot = (name) => page.screenshot({ path: path.join(OUT, name + '.png') });
  const text = () => page.evaluate(() => document.body.innerText);

  /* ----- 首頁 ----- */
  await shot('01-首頁');
  let t = await text();
  check('首頁有「還沒付」', t.includes('還沒付'));
  check('首頁有「預購中」（預計下下個月到貨的那張）', /^預購中\s/m.test(t) && t.includes('預計 ' + nextMonth + ' 到貨'));
  check('首頁有後補款提醒', t.includes('後補款還沒付'));
  check('首頁有買家還沒匯款、還沒寄', t.includes('買家還沒匯款') && t.includes('還沒寄'));
  check('首頁有待確認（外幣實付台幣沒填）', t.includes('待確認'));

  /* ----- 點進買單詳細，標示已付款 ----- */
  await page.click('[data-act="buy"][data-id="b1"]');
  await page.waitForSelector('.sheet [data-quick="paid"]');
  await shot('02-買單詳細');
  await page.click('[data-quick="paid"]');
  await page.click('.sheet [data-close]');
  t = await text();
  check('標示已付款後「還沒付」那組消失', !/^還沒付\s/m.test(t));

  /* ----- 記買單：從頭填一張 ----- */
  await page.click('[data-tab="add"]');
  await page.waitForSelector('[data-path="buy.date"]');
  await shot('03-記買單');
  // 賣家：打字搜尋
  await page.click('[data-pcombo="buy.partyId"]');
  check('點進賣家欄會列出所有對象', (await page.locator('.cb-opt').count()) === 3);
  await page.keyboard.type('阿');
  await shot('03b-搜尋賣家');
  check('打「阿」只剩代購阿花（另有一個「＋ 新增」）', (await page.locator('.cb-opt:not(.cb-new)').count()) === 1 && (await page.textContent('.cb-opt:not(.cb-new)')).includes('代購阿花'));
  await page.click('.cb-opt:not(.cb-new)');
  check('選了之後欄位顯示代購阿花', (await page.inputValue('[data-pcombo="buy.partyId"]')) === '代購阿花');
  await page.click('[data-pcombo="buy.partyId"]');
  await page.keyboard.type('新賣家甲');
  check('沒有符合的就出現「＋ 新增」', (await page.textContent('.cb-new')).includes('新賣家甲'));
  await page.keyboard.press('Enter');
  check('Enter 當場新增並選起來', (await page.evaluate(() => window.__sl.state.data.parties.length)) === 4 && (await page.inputValue('[data-pcombo="buy.partyId"]')) === '新賣家甲');
  await page.click('[data-pcombo="buy.partyId"]');
  await page.keyboard.type('賣家小');
  await page.click('.cb-opt:not(.cb-new)');
  await page.selectOption('[data-paycombo="buy"]', '匯款:a1');
  await page.check('[data-paidchk]');
  await page.selectOption('[data-relcombo="0"]', 'r:r1');
  await page.click('[data-member="0:m1"]');
  await page.click('[data-member="0:m2"]');
  await page.fill('[data-path="items.0.name"]', '簽售卡 2.0');
  await page.fill('[data-path="items.0.price"]', '150');
  await page.click('[data-flag="0:多帶"]');
  const label = await page.textContent('button.btn[data-save]');
  check('合計跟著算（兩位成員、數量自動 2 → 300）', label.includes('300'));
  await page.click('[data-add-item]');
  check('新增一行會帶入上一行的回歸', (await page.inputValue('[data-relcombo="1"]')) === 'r:r1');
  await page.click('[data-del-item="1"]');
  await page.click('[data-add-fee]');
  await page.fill('[data-path="fees.0.amount"]', '38');
  await shot('04-買單填好');
  await page.click('button.btn[data-save]');
  await page.waitForSelector('.toast');
  const saved = await page.evaluate(() => window.__sl.state.data.buys.length);
  check('買單存起來了', saved === 5);

  /* ----- 報表 ----- */
  await page.click('[data-tab="report"]');
  await shot('05-報表');
  await page.click('[data-period="all"]');
  await shot('06-報表-全部');
  t = await text();
  check('報表有依團看與多帶', t.includes('依團看') && t.includes('多帶'));
  await page.click('[data-act="group"][data-id="gA"]');
  await page.waitForSelector('.sheet [data-act="collection"]');
  await shot('07-團A');
  await page.click('[data-act="collection"][data-id="r1"]');
  await page.waitForSelector('table.matrix');
  await shot('08-收集表');
  const matrix = await page.evaluate(() => document.querySelector('table.matrix').innerText);
  check('收集表有通路與成員欄', matrix.includes('店家A') && matrix.includes('成員甲'));
  await page.click('.sheet[data-sheet="collection"] [data-close]');
  await page.click('.sheet[data-sheet="group"] [data-close]');

  /* ----- 明細 ----- */
  await page.click('[data-tab="history"]');
  await shot('09-明細');
  await page.click('[data-filter-toggle="allTime"]');
  await page.selectOption('[data-filter="flag"]', '多帶');
  check('篩「多帶」只剩買單', (await page.locator('.kk.buy').count()) > 0 && (await page.locator('.kk.sell').count()) === 0);
  await page.selectOption('[data-filter="flag"]', '');
  check('明細每一列都有種類圖示與小字', (await page.locator('.item .av').count()) === (await page.locator('.item .kk').count()));

  /* ----- 賣單、花費 ----- */
  await page.click('[data-tab="add"]');
  await page.click('[data-addkind="sell"]');
  await page.waitForSelector('[data-path="amount"]');
  await page.fill('[data-path="amount"]', '200');
  await shot('10-記賣單');
  await page.click('button.btn[data-save]');
  check('賣單存起來了', (await page.evaluate(() => window.__sl.state.data.sells.length)) === 3);
  check('存完之後賣單表單清空', (await page.inputValue('[data-path="amount"]')) === '');
  await page.click('[data-addkind="expense"]');
  await page.waitForSelector('[data-path="amount"]');
  await page.fill('[data-path="amount"]', '500');
  await shot('11-記花費');
  await page.click('button.btn[data-save]');
  check('花費存起來了', (await page.evaluate(() => window.__sl.state.data.expenses.length)) === 2);

  /* ----- 照片：加、看大圖、刪、取消、打包、匯入 ----- */
  const makePng = async (color) => page.evaluate(async (c) => {
    const cv = document.createElement('canvas'); cv.width = 600; cv.height = 400;
    const g = cv.getContext('2d'); g.fillStyle = c; g.fillRect(0, 0, 600, 400); g.fillStyle = '#fff'; g.fillRect(40, 40, 200, 120);
    const blob = await new Promise((r) => cv.toBlob(r, 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }, color);
  const p1 = path.join(OUT, '_p1.png'), p2 = path.join(OUT, '_p2.png');
  fs.writeFileSync(p1, Buffer.from(await makePng('#c46'))); fs.writeFileSync(p2, Buffer.from(await makePng('#48c')));
  const photoCount = () => page.evaluate(async () => (await window.__sl.PhotoDB.all()).length);

  await page.click('[data-tab="add"]');
  await page.click('[data-addkind="sell"]');
  await page.fill('[data-path="amount"]', '321');
  await page.setInputFiles('#photo-file', [p1, p2]);
  await page.waitForFunction(() => document.querySelectorAll('.thumbs img[data-thumb]').length === 2 && [...document.querySelectorAll('.thumbs img[data-thumb]')].every((i) => i.naturalWidth > 0));
  check('一次選兩張照片，縮圖都出現', (await photoCount()) === 2);
  await shot('19-加照片');
  await page.click('[data-del-photo]');
  check('按 ✕ 移除新加的照片，馬上從本機刪掉', (await photoCount()) === 1);
  await page.click('button.btn[data-save]');
  check('存起來之後這張賣單帶著 1 張照片', await page.evaluate(() => window.__sl.state.data.sells.some((s) => s.amount === 321 && s.photoIds.split(',').length === 1)));

  // 明細 → 詳細 → 大圖
  await page.click('[data-tab="history"]');
  await page.click('[data-filter-toggle="allTime"]');
  check('明細那一列標出「照片 1」', (await text()).includes('照片 1'));
  await page.locator('.item[data-act="sell"]', { hasText: '照片 1' }).first().click();
  await page.waitForSelector('.sheet .thumb img');
  await page.click('.sheet .thumb');
  await page.waitForFunction(() => { const i = document.querySelector('.viewer-img img'); return i && i.naturalWidth > 0; });
  await shot('20-看大圖');
  check('點縮圖開大圖檢視器', true);
  await page.click('.sheet[data-sheet="pv"] [data-close]');

  // 編輯時加一張再取消，照片不能留在手機裡
  await page.click('[data-quick="edit"]');
  const before = await photoCount();
  await page.setInputFiles('#photo-file', [p2]);
  await page.waitForFunction(() => document.querySelectorAll('.sheet .thumbs img[data-thumb]').length === 2);
  await page.click('.sheet [data-close]');
  await page.waitForTimeout(200);
  check('編輯到一半取消，這次新加的照片會一起清掉', (await photoCount()) === before);

  // 刪掉原本的照片：要按「存起來」才真的刪
  await page.locator('.item[data-act="sell"]', { hasText: '照片 1' }).first().click();
  await page.click('[data-quick="edit"]');
  await page.click('.sheet [data-del-photo]');
  await page.click('.sheet [data-close]');
  await page.waitForTimeout(150);
  check('移除原本的照片後取消，照片還在', (await photoCount()) === before);

  // 設定頁：統計、匯出
  await page.click('#btn-gear');
  await page.waitForSelector('[data-export]');
  await page.waitForFunction(() => document.body.innerText.includes('共 1 張'));
  await shot('21-設定-照片與資料');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-export]')]);
  const zipPath = path.join(OUT, '_backup.zip');
  await dl.saveAs(zipPath);
  const zipBytes = fs.readFileSync(zipPath);
  const zipText = zipBytes.toString('latin1');
  check('匯出的是 zip，裡面有照片、data.json、manifest.json', zipBytes.slice(0, 2).toString() === 'PK' && zipText.includes('data.json') && zipText.includes('manifest.json') && /photos\/[0-9a-f-]+\.jpg/.test(zipText));
  check('檔名是 STAR-TO-RECORD_備份_日期.zip', /^STAR-TO-RECORD_備份_\d{4}-\d{2}-\d{2}\.zip$/.test(dl.suggestedFilename()));
  const sellsBefore = await page.evaluate(() => window.__sl.state.data.sells.length);

  // 全新的瀏覽器（沒有任何資料）匯入同一個 zip
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  page2.on('pageerror', (e) => errors.push('[匯入頁] ' + String(e)));
  await page2.goto(BASE);
  await page2.waitForSelector('#view .card');
  await page2.click('#btn-gear');
  await page2.setInputFiles('#import-file', zipPath);
  await page2.waitForSelector('.toast');
  const got = await page2.evaluate(async () => ({ sells: window.__sl.state.data.sells.length, buys: window.__sl.state.data.buys.length, photos: (await window.__sl.PhotoDB.all()).length, outbox: window.__sl.state.outbox.length }));
  check('新手機匯入後，紀錄和照片都回來', got.sells === sellsBefore && got.buys === 5 && got.photos === 1);
  // 再匯入一次：合併，不重複
  await page2.setInputFiles('#import-file', zipPath);
  await page2.waitForTimeout(600);
  const again = await page2.evaluate(async () => ({ sells: window.__sl.state.data.sells.length, photos: (await window.__sl.PhotoDB.all()).length }));
  check('重複匯入不會多出紀錄', again.sells === sellsBefore && again.photos === 1);
  await page2.click('.sheet [data-close]');
  await page2.click('[data-tab="history"]');
  await page2.click('[data-filter-toggle="allTime"]');
  await page2.locator('.item[data-act="sell"]', { hasText: '照片 1' }).first().click();
  await page2.waitForFunction(() => { const i = document.querySelector('.sheet .thumb img'); return i && i.naturalWidth > 0; });
  check('匯入後的賣單縮圖看得到', true);
  await ctx2.close();

  // 刪掉整張單，照片一起清掉
  await page.click('.sheet [data-close]');
  await page.click('[data-tab="history"]');
  await page.locator('.item[data-act="sell"]', { hasText: '照片 1' }).first().click();
  await page.click('[data-quick="edit"]');
  page.once('dialog', (d) => d.accept());
  await page.click('.sheet [data-delete]');
  await page.waitForTimeout(250);
  check('刪掉整張單，照片也一起清掉', (await photoCount()) === 0);
  fs.rmSync(p1, { force: true }); fs.rmSync(p2, { force: true }); fs.rmSync(zipPath, { force: true });

  /* ----- 設定、主題 ----- */
  await page.click('#btn-gear');
  await page.waitForSelector('.sheet [data-theme-pick]');
  check('設定頁的「對象」預設收合', (await page.locator('[data-act="edit-simple"][data-kind="parties"]').count()) === 0);
  await page.click('[data-collapse="parties"]');
  check('點標題可以展開', (await page.locator('[data-act="edit-simple"][data-kind="parties"]').count()) === 4);
  await page.click('[data-collapse="parties"]');
  await shot('12-設定');
  await page.click('[data-theme-pick="dark"]');
  await shot('13-設定-深色');
  await page.click('[data-theme-pick="glow"]');
  await shot('14-設定-粉紫');
  const tone = await page.evaluate(() => document.documentElement.dataset.tone);
  check('粉紫主題是玻璃（photo）', await page.evaluate(() => document.documentElement.dataset.theme) === 'photo' && tone === 'dark');
  await page.click('.sheet [data-close]');
  await shot('15-首頁-粉紫');

  /* ----- 自訂背景：用程式畫一張亮的照片餵進去，字色應該換成深色 ----- */
  const bright = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 800;
    const g = c.getContext('2d'); g.fillStyle = '#f6f0c8'; g.fillRect(0, 0, 400, 800);
    g.fillStyle = '#9fd3ff'; g.fillRect(0, 400, 400, 400);
    const blob = await new Promise((r) => c.toBlob(r, 'image/png'));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  fs.writeFileSync(path.join(OUT, '_bright.png'), Buffer.from(bright));
  await page.click('#btn-gear');
  await page.click('[data-theme-pick="custom"]');
  await page.setInputFiles('#bg-file', path.join(OUT, '_bright.png'));
  await page.waitForFunction(() => document.documentElement.style.getPropertyValue('--bg-img').startsWith('url('));
  await shot('16-設定-自訂背景');
  check('亮照片也是深色玻璃＋白字', await page.evaluate(() => document.documentElement.dataset.glass === 'deep' && document.documentElement.dataset.tone === 'dark'));
  check('字色是白色', await page.evaluate(() => getComputedStyle(document.body).color === 'rgb(255, 255, 255)'));
  await page.fill('[data-slider="dim"]', '80');
  await page.dispatchEvent('[data-slider="dim"]', 'input');
  check('壓暗拉到 80% 也一樣', await page.evaluate(() => document.documentElement.dataset.glass === 'deep' && document.documentElement.style.getPropertyValue('--dim') === '0.8'));
  await page.click('.sheet [data-close]');
  await shot('17-首頁-自訂背景');

  /* ----- 遮住金額 ----- */
  await page.click('[data-tab="home"]');
  await page.click('#btn-eye');
  t = await text();
  check('遮住金額後出現 $•••', t.includes('$•••'));
  await shot('18-遮住金額');

  console.log('\nconsole 錯誤：', errors.length ? '\n' + errors.join('\n') : '無');
  const failed = checks.filter((c) => !c[1]);
  console.log(`${checks.length - failed.length}/${checks.length} 項通過`);
  fs.rmSync(path.join(OUT, '_bright.png'), { force: true });
  await browser.close();
  process.exit(failed.length || errors.length ? 1 : 0);
})();
