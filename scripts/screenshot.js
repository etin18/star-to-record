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

// 匯率不連真的網路：固定 1 台幣＝40 韓元，結果才穩定
const RATE_JSON = JSON.stringify({ date: '2026-11-01', twd: { krw: 40, jpy: 5, usd: 0.03 } });
const stubRates = (c) => c.route(/currency-api/, (r) => r.fulfill({ status: 200, contentType: 'application/json', body: RATE_JSON }));

const errors = [];
const checks = [];
const check = (name, ok) => { checks.push([name, ok]); console.log(ok ? '  ✓' : '  ✗', name); };

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  await stubRates(ctx);
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
  await page.waitForFunction(() => document.body.innerText.includes('約 $1,550'));   // 匯率抓到後重畫
  await shot('01-首頁');
  let t = await text();
  const dueText = () => page.evaluate(() => (document.querySelector('#view .card.due') || {}).innerText || '');
  check('首頁最上面只有兩個數字：待付 $368（還沒付 288 含運費＋整單二補 80）、待收 $120', await page.evaluate(() => document.querySelector('#view .card').classList.contains('due')) && (await dueText()).replace(/\s+/g, ' ').trim() === '待付 $368 待收 $120');
  check('首頁有「還沒付」', t.includes('還沒付'));
  check('首頁有「預購中」（預計下下個月到貨的那張）', /^預購中\s/m.test(t) && t.includes('預計 ' + nextMonth + ' 到貨'));
  check('首頁有整單二補提醒（試算表裡的舊名稱「後補款」自動換成新名字）', t.includes('整單二補還沒付') && !t.includes('後補款'));
  check('首頁有買家還沒匯款、還沒寄', t.includes('買家還沒匯款') && t.includes('還沒寄'));
  check('首頁有待確認（外幣實付台幣沒填）', t.includes('待確認'));
  check('首頁「還沒付」那一列含一起付的運費（250＋38），跟待付對得起來', /簽售卡 1\.0[\s\S]{0,60}\$288/.test(t));
  check('首頁的韓元單沒填實付台幣：用匯率估成「約 $1,550」，不會把 ₩62,000 當台幣', t.includes('約 $1,550') && !t.includes('$62,000'));

  /* ----- 點進買單詳細，標示已付款 ----- */
  await page.click('[data-act="buy"][data-id="b1"]');
  await page.waitForSelector('.sheet [data-quick="paid"]');
  await shot('02-買單詳細');
  await page.click('[data-quick="paid"]');
  await page.click('.sheet [data-close]');
  t = await text();
  check('標示已付款後「還沒付」那組消失', !/^還沒付\s/m.test(t));
  check('付款後待付只剩整單二補 $80', (await dueText()).includes('待付 $80') || (await dueText()).replace(/\s+/g, ' ').includes('待付 $80'));

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
  // 喊單日：還沒下單，只有喊單日
  await page.click('[data-no-order]');
  check('按「還沒下單」，下單日清空', (await page.inputValue('[data-path="buy.date"]')) === '');
  await page.fill('[data-path="buy.callDate"]', '2026-10-01');
  // 多付、二補：每一張多 30 和 70 → (150+30+70)×2 ＝ 500
  await page.fill('[data-path="items.0.extra"]', '30');
  await page.fill('[data-path="items.0.second"]', '70');
  const sub = await page.textContent('[data-sub="0"]');
  check('小計列出算式 (150＋30＋70)×2 ＝ $500', sub.includes('(150＋30＋70)×2') && sub.includes('$500'));
  await page.click('[data-add-fee]');
  check('費用類別裡有「整單二補」、沒有「後補款」', await page.evaluate(() => { const o = [...document.querySelectorAll('[data-path="fees.0.kind"] option')].map((x) => x.value); return o.includes('整單二補') && !o.includes('後補款'); }));
  await page.fill('[data-path="fees.0.amount"]', '38');
  check('合計含多付、二補和運費（500＋38）', (await page.textContent('button.btn[data-save]')).includes('538'));
  await shot('04-買單填好');
  await page.click('button.btn[data-save]');
  await page.waitForSelector('.toast');
  const saved = await page.evaluate(() => window.__sl.state.data.buys.length);
  check('買單存起來了', saved === 5);
  check('這張單有喊單日、沒有下單日', await page.evaluate(() => window.__sl.state.data.buys.some((b) => b.callDate === '2026-10-01' && b.date === '')));
  check('品項存了多付 30、二補 70', await page.evaluate(() => window.__sl.state.data.buyItems.some((i) => i.extra === 30 && i.second === 70)));

  // 首頁「還沒下單」
  await page.click('[data-tab="home"]');
  check('首頁有「還沒下單」，而且在最近的上面', await page.evaluate(() => { const t = document.body.innerText; return /^還沒下單\s/m.test(t) && t.indexOf('還沒下單') < t.indexOf('最近'); }));
  await page.locator('.item[data-act="buy"]', { hasText: '簽售卡 2.0' }).first().click();
  await page.waitForSelector('[data-quick="ordered"]');
  check('詳細頁的品項列出多付、二補，還有「標示已下單」', (await text()).includes('單價 $150 ＋ 多付 $30 ＋ 二補 $70，× 2') && (await text()).includes('標示已下單'));
  await page.click('[data-quick="ordered"]');
  await page.click('.sheet [data-close]');
  check('標示已下單後，離開「還沒下單」', !/^還沒下單\s/m.test(await text()));

  /* ----- 一起到貨：兩張單一起寄到超商，運費 38 平分 ----- */
  check('首頁「還沒到貨」旁邊有「一起到貨」', await page.locator('[data-ship-open]').count() === 1);
  await page.click('[data-ship-open]');
  await page.waitForSelector('.sheet [data-ship-pick]');
  await page.click('[data-ship-pick="b1"]');
  await page.click('[data-ship-pick="b2"]');
  await page.fill('[data-ship="amount"]', '38');
  check('打運費時每張馬上顯示分多少（19、19）', (await page.textContent('[data-ship-share="b1"]')).includes('19') && (await page.textContent('[data-ship-share="b2"]')).includes('19'));
  check('輸入運費時焦點沒有掉', await page.evaluate(() => document.activeElement && document.activeElement.dataset.ship === 'amount'));
  await shot('22-一起到貨');
  await page.click('[data-ship-go]');
  const shipped = await page.evaluate(() => {
    const d = window.__sl.state.data;
    const fees = d.buyFees.filter((f) => f.shipId);
    return { arrived: ['b1', 'b2'].every((id) => d.buys.find((b) => b.id === id).arrival === '已到'), amounts: fees.map((f) => f.amount), same: new Set(fees.map((f) => f.shipId)).size === 1, b1date: d.buys.find((b) => b.id === 'b1').date };
  });
  check('兩張都標成已到貨，各多一筆 19 的運費、同一個一起寄編號', shipped.arrived && shipped.amounts.join(',') === '19,19' && shipped.same);
  check('一起到貨不會動到原本的下單日', shipped.b1date === SEED.buys[0].date);
  await page.click('[data-tab="history"]');
  await page.locator('.item[data-act="buy"][data-id="b1"]').click();
  await page.waitForSelector('.sheet [data-ship-edit]');
  check('詳細頁有「一起寄」：共 $38、這張分 $19，列出另一張單', (await text()).includes('超商運費共 $38，2 張單平分，這張分 $19') && (await page.locator('.sheet .item[data-act="buy"][data-id="b2"]').count()) === 1);
  await shot('23-一起寄詳細');
  page.once('dialog', (dl) => dl.accept('40'));
  await page.click('[data-ship-edit]');
  check('改運費成 40，兩張重新平分成 20、20', await page.evaluate(() => window.__sl.state.data.buyFees.filter((f) => f.shipId).map((f) => f.amount).join(',') === '20,20'));
  await page.click('[data-quick="edit"]');
  await page.waitForSelector('.sheet [data-save]');
  check('編輯表單裡一起寄的運費不能直接改', (await text()).includes('運費 · 一起寄') && (await page.locator('.sheet .subitem', { hasText: '一起寄' }).locator('input').count()) === 0);
  await page.click('.sheet [data-close]');
  await page.locator('.item[data-act="buy"][data-id="b1"]').click();
  // 其中一張標成已取消：它分到 0，運費改由另一張全付
  await page.click('.sheet .item[data-act="buy"][data-id="b2"]');
  page.once('dialog', (dl) => dl.accept());
  await page.click('[data-quick="cancel"]');
  check('一起寄的其中一張取消：它分到 0，另一張分到全部 40', await page.evaluate(() => { const f = window.__sl.state.data.buyFees.filter((x) => x.shipId); return f.find((x) => x.buyId === 'b1').amount === 40 && f.find((x) => x.buyId === 'b2').amount === 0; }));
  check('取消的那張詳細頁寫「這張取消了，不分運費」', (await text()).includes('這張取消了，不分運費'));
  // 恢復成已到：又變回平分
  await page.click('[data-quick="edit"]');
  await page.selectOption('.sheet [data-path="buy.arrival"]', '已到');
  await page.click('.sheet [data-save]');
  check('取消的單恢復後，運費又變回 20、20', await page.evaluate(() => window.__sl.state.data.buyFees.filter((f) => f.shipId).map((f) => f.amount).join(',') === '20,20'));
  await page.click('[data-tab="history"]');
  await page.locator('.item[data-act="buy"][data-id="b1"]').click();
  page.once('dialog', (dl) => dl.accept());
  await page.click('[data-ship-undo]');
  check('取消一起寄：兩張的一起寄運費都刪掉，到貨狀態不變', await page.evaluate(() => { const d = window.__sl.state.data; return !d.buyFees.some((f) => f.shipId) && d.buys.find((b) => b.id === 'b2').arrival === '已到'; }));
  await page.click('.sheet [data-close]');

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
  check('明細的小計在篩選和列表中間', await page.evaluate(() => { const c = [...document.querySelectorAll('#hist-results > .card')]; return c.length === 2 && c[0].innerText.includes('本期小計'); }));
  const expectBuy = await page.evaluate(() => Object.values(window.Calc.paidByBuy(window.__sl.state.data)).reduce((a, b) => a + b, 0));
  check('明細小計的買單＝真的付出去的錢（還沒付的不算）', (await page.textContent('#hist-results .card .field .amt')).replace(/[^\d]/g, '') === String(Math.round(expectBuy)));
  await page.selectOption('[data-filter="flag"]', '多帶');
  check('篩「多帶」只剩買單', (await page.locator('.kk.buy').count()) > 0 && (await page.locator('.kk.sell').count()) === 0);
  await page.selectOption('[data-filter="flag"]', '');
  // 搜尋：一個字一個字打，輸入框要一直在、一直有焦點
  await page.click('[data-filter="q"]');
  await page.keyboard.type('簽售');
  check('搜尋可以連續打字，焦點沒有掉', await page.evaluate(() => document.activeElement && document.activeElement.dataset.filter === 'q' && document.activeElement.value === '簽售'));
  check('搜尋「簽售」只剩有簽售的列', (await page.locator('#hist-results .item').count()) > 0 && (await page.locator('#hist-results .item', { hasText: '空專' }).count()) === 0);
  await page.fill('[data-filter="q"]', '');
  check('清空搜尋後列表回來', (await page.locator('#hist-results .item').count()) > 2);
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
  await stubRates(ctx2);
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

  /* ----- 舊的貨付單（到貨日空白、付款日不詳）打開再存，日期不會變成今天 ----- */
  await page.evaluate(() => {
    const sl = window.__sl;
    sl.putBuy({ id: 'old1', date: '', payMethod: '貨付', paidDate: '日期不詳', currency: 'TWD', arrival: '已到', arrivedDate: '' },
      [{ id: 'oi1', groupId: 'gA', name: '舊貨付', price: 300, qty: 1 }], []);
    sl.openForm('buy', sl.state.data.buys.find((b) => b.id === 'old1'));
  });
  await page.click('.sheet [data-save]');
  check('舊貨付單存檔後，付款日還是日期不詳、到貨日還是空白', await page.evaluate(() => { const b = window.__sl.state.data.buys.find((x) => x.id === 'old1'); return b.paidDate === '日期不詳' && b.arrivedDate === ''; }));
  await page.evaluate(() => { window.__sl.state.data.buys = window.__sl.state.data.buys.filter((b) => b.id !== 'old1'); window.__sl.state.data.buyItems = window.__sl.state.data.buyItems.filter((i) => i.buyId !== 'old1'); window.__sl.render(); });

  /* ----- 一起寄的單被刪掉：運費總額不變，改由剩下的單分 ----- */
  await page.click('[data-tab="home"]');
  await page.click('[data-ship-open]');
  const cands = await page.$$eval('.sheet [data-ship-pick]', (els) => els.map((e) => e.dataset.shipPick));
  for (const id of cands.slice(0, 3)) await page.click(`[data-ship-pick="${id}"]`);
  await page.fill('[data-ship="amount"]', '38');
  await page.click('[data-ship-go]');
  const before3 = await page.evaluate(() => window.__sl.state.data.buyFees.filter((f) => f.shipId).map((f) => f.amount).sort().join(','));
  const victim = cands[cands.length > 2 ? 2 : 1];
  await page.click('[data-tab="history"]');
  await page.locator(`.item[data-act="buy"][data-id="${victim}"]`).click();
  await page.click('[data-quick="edit"]');
  page.once('dialog', (dl) => dl.accept());
  await page.click('.sheet [data-delete]');
  const after = await page.evaluate(() => window.__sl.state.data.buyFees.filter((f) => f.shipId).map((f) => f.amount).sort().join(','));
  check(`刪掉一起寄的其中一張（${cands.length >= 3 ? '14,12,12' : '19,19'} → 剩下的平分 38）`, (cands.length >= 3 ? before3 === '12,12,14' && after === '19,19' : before3 === '19,19' && after === '38'));

  /* ----- 設定、主題 ----- */
  await page.click('#btn-gear');
  await page.waitForSelector('.sheet [data-theme-pick]');
  check('設定頁寫出估算用的匯率（1 台幣 ≈ 40 韓元）', (await text()).includes('1 台幣 ≈ 40 韓元'));
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
