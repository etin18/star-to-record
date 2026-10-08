/**
 * 版面小細節檢查：每個主題 × 每一頁（含設定、表單、詳細、收集表）× 三種手機寬度，
 * 找「東西跑出去」這類問題。先 `python3 scripts/serve.py 8790`，再
 *   PW_CORE=<playwright-core 路徑> node scripts/test-layout.js
 *
 * 檢查什麼：
 *   1. 整頁或面板可以左右滑（scrollWidth > clientWidth）
 *   2. 有元素的右緣超出畫面（收集表自己有橫向捲動，不算）
 *   3. 列表那一列的文字被金額擠到幾乎看不見（.main 太窄）
 *   4. 圓形按鈕裡的圖示沒置中
 * 資料故意灌得很長（長名稱、很多成員、很大的金額），平常的資料不會把版面逼到極限。
 * 全部是虛構的。
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { chromium } = require(process.env.PW_CORE);
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

const iso = (o) => { const d = new Date(); d.setDate(d.getDate() + o); return d.toISOString().slice(0, 10); };
const LONG = '超級無敵長長長的虛構名稱用來測試版面會不會被撐開';
const members = Array.from({ length: 9 }, (_, i) => ({ id: 'm' + i, groupId: 'gA', name: '成員' + '甲乙丙丁戊己庚辛壬'[i] + (i % 2 ? '長名字測試' : '') }));

const SEED = {
  groups: [{ id: 'gA', name: LONG + '團' }],
  members,
  releases: [{ id: 'r1', groupId: 'gA', name: LONG + '回歸' }],
  accounts: [{ id: 'a1', name: LONG + '銀行' }],
  parties: [{ id: 'p1', name: LONG + '賣家', platform: 'Threads' }],
  options: [{ id: 'c1', kind: 'channel', name: LONG + '通路' }, { id: 's0', kind: 'ship', name: '賣貨便' }, { id: 'x0', kind: 'expcat', name: '演唱會' }],
  buys: [
    { id: 'b1', date: iso(-3), partyId: 'p1', partyName: LONG + '賣家', payMethod: '匯款', accountId: 'a1', paidDate: iso(-2), currency: 'TWD', arrival: '未到', note: LONG.repeat(3), photoIds: 'ph1,ph2,ph3,ph4,ph5,ph6,ph7' },
    { id: 'b2', date: iso(-8), partyId: 'p1', partyName: LONG + '賣家', payMethod: '刷卡', accountId: 'a1', paidDate: iso(-8), currency: 'KRW', paidTwd: 0, pending: true, arrival: '未到' }
  ],
  buyItems: [
    { id: 'i1', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: members.map((m) => m.id).join(','), channelId: 'c1', name: LONG, price: 12345678, qty: 9, flags: '多帶,重複,自留' },
    { id: 'i2', buyId: 'b2', groupId: 'gA', releaseId: 'r1', memberIds: '', isSet: true, channelId: 'c1', name: '一套', price: 93100, qty: 1, flags: '' }
  ],
  buyFees: [{ id: 'f1', buyId: 'b1', kind: '後補款', amount: 0, paid: false, note: LONG }],
  sells: [{ id: 's1', date: iso(-4), partyId: 'p1', partyName: LONG + '買家', content: LONG, groupId: 'gA', amount: 9876543, payMethod: '匯款', accountId: 'a1', paidDate: '', shipMethod: '賣貨便', shipStatus: '未寄' }],
  expenses: [{ id: 'e1', date: iso(-2), category: '演唱會', content: LONG, amount: 1234567, accountId: 'a1', groupId: 'gA' }]
};

const THEMES = ['light', 'dark', 'glow'];
const WIDTHS = [320, 360, 390];

/** 在頁面裡跑的檢查，回傳問題清單 */
function scan() {
  const problems = [];
  const vw = document.documentElement.clientWidth;
  const label = (el) => el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).join('.') : '') + ' 「' + (el.innerText || '').trim().slice(0, 20).replace(/\n/g, ' ') + '」';

  for (const el of [document.documentElement, document.body, document.querySelector('#view'), ...document.querySelectorAll('.sheet-body')]) {
    if (el && el.scrollWidth > el.clientWidth + 1) problems.push(`可以左右滑：${label(el)}（${el.scrollWidth} > ${el.clientWidth}）`);
  }
  for (const el of document.querySelectorAll('#view *, .sheet *')) {
    if (el.closest('.matrix-wrap') || el.closest('.toast')) continue;
    const r = el.getBoundingClientRect();
    if (r.width && r.right > vw + 1) problems.push(`超出右緣：${label(el)}（right ${Math.round(r.right)} > ${vw}）`);
  }
  for (const el of document.querySelectorAll('.item .main')) {
    if (el.getBoundingClientRect().width < 60) problems.push(`文字被擠到只剩 ${Math.round(el.getBoundingClientRect().width)}px：${label(el)}`);
  }
  for (const el of document.querySelectorAll('.ico, .av')) {
    const r = el.getBoundingClientRect();
    const svg = el.querySelector('svg');
    if (!svg) continue;
    const s = svg.getBoundingClientRect();
    if (Math.abs((s.left + s.width / 2) - (r.left + r.width / 2)) > 1 || Math.abs((s.top + s.height / 2) - (r.top + r.height / 2)) > 1) problems.push(`圖示沒置中：${label(el)}`);
  }
  return problems;
}

(async () => {
  const browser = await chromium.launch({ executablePath: findChromium(), headless: true });
  let total = 0, bad = 0;
  const report = [];

  for (const theme of THEMES) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({ viewport: { width, height: 780 } });
      const page = await ctx.newPage();
      await page.addInitScript(([seed, th]) => {
        localStorage.setItem('sl.data', JSON.stringify(seed));
        localStorage.setItem('sl.theme', th);
      }, [SEED, theme]);
      await page.goto(BASE);
      await page.waitForSelector('#view .card');
      // 照片：前 5 張在這支手機，後 2 張「在別支手機」
      await page.evaluate(async () => {
        for (const id of ['ph1', 'ph2', 'ph3', 'ph4', 'ph5']) {
          const cv = document.createElement('canvas'); cv.width = 300; cv.height = 200; cv.getContext('2d').fillRect(0, 0, 300, 200);
          const blob = await new Promise((r) => cv.toBlob(r, 'image/jpeg'));
          await window.__sl.PhotoDB.put(id, { full: blob, thumb: blob });
        }
        window.__sl.render();
      });

      const pages = [
        ['首頁', async () => page.click('[data-tab="home"]')],
        ['記一筆-買單', async () => { await page.click('[data-tab="add"]'); await page.click('[data-addkind="buy"]'); }],
        ['記一筆-賣家搜尋清單開著', async () => { await page.click('[data-tab="add"]'); await page.click('[data-addkind="buy"]'); await page.click('[data-pcombo="buy.partyId"]'); }],
        ['記一筆-賣單', async () => { await page.click('[data-addkind="sell"]'); }],
        ['記一筆-花費', async () => { await page.click('[data-addkind="expense"]'); }],
        ['報表-單月', async () => { await page.click('[data-tab="report"]'); await page.click('[data-period="month"]'); }],
        ['報表-全部', async () => { await page.click('[data-tab="report"]'); await page.click('[data-period="all"]'); }],
        ['明細', async () => { await page.click('[data-tab="history"]'); await page.click('[data-filter-toggle="allTime"]').catch(() => {}); }],
        ['明細-選了團', async () => { await page.selectOption('[data-filter="groupId"]', 'gA'); }],
        ['設定', async () => { await page.click('#btn-gear'); }],
        ['設定-照片與資料', async () => { await page.waitForTimeout(150); }],
        ['設定-對象展開', async () => { await page.click('[data-collapse="parties"]'); }],
        ['買單詳細', async () => { await page.click('.sheet [data-close]'); await page.click('[data-tab="home"]'); await page.click('[data-act="buy"][data-id="b1"]'); }],
        ['買單大圖', async () => { await page.click('.sheet .thumb'); await page.waitForTimeout(120); }],
        ['買單編輯（長資料、七張照片）', async () => { await page.click('.sheet[data-sheet="pv"] [data-close]'); await page.click('[data-quick="edit"]'); }],
        ['賣單詳細', async () => { await page.click('.sheet [data-close]'); await page.click('[data-tab="home"]'); await page.click('[data-act="sell"][data-id="s1"]'); }],
        ['團明細', async () => { await page.click('.sheet [data-close]'); await page.click('[data-tab="report"]'); await page.click('[data-act="group"][data-id="gA"]'); }],
        ['收集表', async () => { await page.click('[data-act="collection"][data-id="r1"]'); }]
      ];

      for (const [name, go] of pages) {
        try { await go(); } catch (e) { report.push(`[${theme} ${width}px] ${name}：走不到這一頁（${e.message.split('\n')[0]}）`); bad++; total++; continue; }
        await page.waitForTimeout(60);
        const problems = await page.evaluate(scan);
        total++;
        if (problems.length) { bad++; problems.forEach((p) => report.push(`[${theme} ${width}px] ${name}：${p}`)); }
      }
      await ctx.close();
    }
  }

  await browser.close();
  console.log(report.length ? report.join('\n') : '沒有發現問題');
  console.log(`\n${total - bad}/${total} 個畫面通過（${THEMES.length} 主題 × ${WIDTHS.length} 寬度）`);
  process.exit(bad ? 1 : 0);
})();
