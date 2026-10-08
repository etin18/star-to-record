/**
 * 計算邏輯測試：node scripts/test-calc.js
 * 資料全是虛構的，數字刻意取得好驗算。
 */
const assert = require('assert');
const C = require('../www/calc.js');

const data = {
  groups: [{ id: 'gA', name: '團A' }],
  members: [
    { id: 'm1', groupId: 'gA', name: '甲' },
    { id: 'm2', groupId: 'gA', name: '乙' },
    { id: 'm3', groupId: 'gA', name: '丙' }
  ],
  releases: [{ id: 'r1', groupId: 'gA', name: '回歸1' }],
  options: [{ id: 'c1', kind: 'channel', name: '店家A' }, { id: 'c2', kind: 'channel', name: '平台B' }],
  buys: [
    // 台幣、已付、已到：商品 100×1 + 200×2 = 500，運費 30
    { id: 'b1', date: '2026-10-01', payMethod: '匯款', accountId: 'a1', paidDate: '2026-10-02', currency: 'TWD', arrival: '已到', arrivedDate: '2026-10-09' },
    // 韓元單：實付台幣 800，商品用韓元記，另有一筆未付的後補款 50
    { id: 'b2', date: '2026-10-03', payMethod: '刷卡', accountId: 'a1', paidDate: '2026-10-03', currency: 'KRW', paidTwd: 800, arrival: '未到', expectedMonth: '2099-01' },
    // 還沒付
    { id: 'b3', date: '2026-10-04', payMethod: '匯款', currency: 'TWD', arrival: '未到' },
    // 已取消：整張不算
    { id: 'b4', date: '2026-10-05', payMethod: '匯款', paidDate: '2026-10-05', currency: 'TWD', arrival: '已取消' },
    // 外幣、實付台幣沒填 → 待確認
    { id: 'b5', date: '2026-09-20', payMethod: '刷卡', paidDate: '2026-09-20', currency: 'JPY', arrival: '已到' }
  ],
  buyItems: [
    { id: 'i1', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c1', name: 'x', price: 100, qty: 1, flags: '' },
    { id: 'i2', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: 'm2,m3', channelId: 'c1', name: 'y', price: 200, qty: 2, flags: '多帶' },
    { id: 'i3', buyId: 'b2', groupId: 'gA', releaseId: 'r1', memberIds: '', isSet: true, channelId: 'c2', name: '一套', price: 90000, qty: 1, flags: '' },
    { id: 'i4', buyId: 'b3', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c2', name: 'z', price: 300, qty: 1, flags: '' },
    { id: 'i5', buyId: 'b4', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c2', name: 'w', price: 999, qty: 1, flags: '' },
    { id: 'i6', buyId: 'b1', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c1', name: '重複卡', price: 0, qty: 2, flags: '重複' },
    { id: 'i7', buyId: 'b5', groupId: 'gA', releaseId: 'r1', memberIds: 'm1', channelId: 'c1', name: 'j', price: 5000, qty: 1, flags: '' }
  ],
  buyFees: [
    { id: 'f1', buyId: 'b1', kind: '運費', amount: 30, paid: true },
    { id: 'f2', buyId: 'b2', kind: '後補款', amount: 50, paid: false }
  ],
  sells: [
    { id: 's1', date: '2026-10-06', payMethod: '匯款', accountId: 'a2', amount: 120, paidDate: '2026-10-07', shipStatus: '未寄', groupId: 'gA' },
    { id: 's2', date: '2026-10-06', payMethod: '匯款', amount: 80, shipStatus: '已寄' },
    { id: 's3', date: '2026-10-06', payMethod: '取貨付款', amount: 60, shipStatus: '未寄' }
  ],
  expenses: [{ id: 'e1', date: '2026-10-10', category: '演唱會', amount: 1000, accountId: 'a1', groupId: 'gA' }]
};

let n = 0;
const ok = (name, fn) => { fn(); n++; console.log('  ✓', name); };

ok('買單成本：台幣單加總、外幣單用實付台幣', () => {
  const by = C.index(data);
  assert.equal(C.buyGoods(data.buys[0], by.itemsOf.b1), 100 + 400 + 0);
  assert.equal(C.buyGoods(data.buys[1], by.itemsOf.b2), 800);
  assert.equal(C.buyGoods(data.buys[4], by.itemsOf.b5), 0);
});

ok('十月：支出＝買單 500+800、運費 30、花費 1000；收入＝120（只算有收款日的）', () => {
  const s = C.summary(data, '2026-10');
  assert.equal(s.spend, 500 + 800 + 30 + 1000);
  assert.equal(s.income, 120);
  assert.equal(s.net, 2330 - 120);
});

ok('九月：只有那筆外幣單（實付台幣沒填，所以是 0）', () => {
  assert.equal(C.summary(data, '2026-09').spend, 0);
});

ok('已取消、還沒付款的買單不計入；未付的後補款不計入', () => {
  assert.equal(C.summary(data, null).spend, 500 + 800 + 30 + 1000);
});

ok('帳戶進出', () => {
  const f = C.accountFlows(data, '2026-10');
  assert.equal(f.a1.out, 500 + 30 + 800 + 1000);
  assert.equal(f.a2.in, 120);
});

ok('每月：結束在十月的三個月', () => {
  const m = C.monthly(data, '2026-10', 3);
  assert.deepEqual(m.map((x) => x.month), ['2026-08', '2026-09', '2026-10']);
  assert.equal(m[2].spend, 2330);
});

ok('依團累積：支出攤到團A；賣單歸到自己的團', () => {
  const g = C.byGroup(data, null).gA;
  assert.equal(Math.round(g.spend), 2330);
  assert.equal(g.income, 120);
});

ok('多帶：只算有標記的品項分到的錢（i2 佔 b1 商品的 400/500）', () => {
  const m = C.multiSpend(data, '2026-10');
  // b1 商品 500 × 400/500 ＝ 400，運費 30 × 0.8 ＝ 24
  assert.equal(Math.round(m.amount), 424);
  assert.equal(m.count, 2);
});

ok('手上的多帶＋重複（只算已到貨）', () => {
  assert.deepEqual(C.spareCounts(data), { 多帶: 2, 重複: 2 });
});

ok('收集表：一套每人各一、多選平分、未到另記', () => {
  const { members, rows } = C.collection(data, 'r1');
  assert.equal(members.length, 3);
  const a = rows.c1;
  assert.equal(a.m1.have, 1 + 2 + 1);     // 品項 x + 重複卡 ×2 + 九月那筆
  assert.equal(a.m1.dup, 2);
  assert.equal(a.m2.have, 1);              // 那行 qty 2 平分給乙丙，各 1
  assert.equal(a.m3.have, 1);
  assert.equal(a.m2.multi, 1);
  const b = rows.c2;
  assert.equal(b.m1.pending, 2);           // b3 單張＋b2 的一套
  assert.equal(b.m2.pending, 1);           // 一套（b2 未到）
  assert.equal(b.m3.pending, 1);
  assert.equal(b.m1.have, 0);
  assert.ok(!rows.c2[''] || !rows.c2[''].have);  // 已取消的 b4 不出現
});

ok('待處理：還沒付、預購中、後補款、賣單', () => {
  const t = C.todos(data, '2026-10-10');
  assert.deepEqual(t.unpaid.map((x) => x.buy.id), ['b3']);
  assert.deepEqual(t.preorder.map((x) => x.buy.id), ['b2']);        // 預計 2099 年 → 預購中
  assert.deepEqual(t.notArrived.map((x) => x.buy.id), []);          // b3 沒付不算；b2 是預購
  assert.deepEqual(t.feesUnpaid.map((x) => x.fee.id), ['f2']);
  assert.deepEqual(t.sellUnpaid.map((x) => x.sell.id), ['s2']);
  assert.deepEqual(t.notShipped.map((x) => x.sell.id).sort(), ['s1', 's3']);
  assert.deepEqual(t.pending.map((x) => x.buy.id).sort(), ['b5']);
});

ok('預計到貨的月份到了，就從預購中移到還沒到貨', () => {
  const t = C.todos(data, '2099-01-05');
  assert.deepEqual(t.preorder, []);
  assert.deepEqual(t.notArrived.map((x) => x.buy.id), ['b2']);
});

console.log(`\n${n} 組全過`);
