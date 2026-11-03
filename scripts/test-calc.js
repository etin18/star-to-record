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
    // 韓元單：實付台幣 800，商品用韓元記，另有一筆未付的整單二補 50
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
    { id: 'f2', buyId: 'b2', kind: '整單二補', amount: 50, paid: false }
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

ok('已取消、還沒付款的買單不計入；未付的整單二補不計入', () => {
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

ok('待處理：還沒付、預購中、整單二補、賣單', () => {
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

ok('付款日不詳：算進「全部」，不算進任何一個月，也不會出現 NaN 天', () => {
  const d = { buys: [{ id: 'u1', payMethod: '匯款', paidDate: C.UNKNOWN_DATE, currency: 'TWD', arrival: '未到' },
                     { id: 'u2', payMethod: '匯款', paidDate: '', currency: 'TWD', arrival: '未到', date: '' }],
              buyItems: [{ id: 'x', buyId: 'u1', groupId: 'g', price: 500, qty: 1 }, { id: 'y', buyId: 'u2', groupId: 'g', price: 70, qty: 1 }] };
  assert.equal(C.summary(d, null).spend, 500);
  assert.equal(C.summary(d, '2026-10').spend, 0);
  const t = C.todos(d, '2026-10-10');
  assert.deepEqual(t.notArrived.map((x) => x.buy.id), ['u1']);
  assert.equal(t.notArrived[0].days, null);
  assert.equal(t.unpaid[0].days, null);          // 沒有下單日
});

const extraData = () => ({
  buys: [{ id: 'x1', payMethod: '匯款', accountId: 'a1', paidDate: '2026-09-30', currency: 'TWD', arrival: '未到' }],
  buyItems: [{ id: 'xi1', buyId: 'x1', groupId: 'g', releaseId: 'r', memberIds: 'm1', price: 400, qty: 4, extra: 30, second: 70 },
             { id: 'xi2', buyId: 'x1', groupId: 'g', releaseId: 'r', memberIds: 'm2', price: 500, qty: 1 }],
  buyFees: [{ id: 'xf1', buyId: 'x1', kind: '運費', amount: 25, paid: true }]
});

ok('多付、二補是每一個多的錢：(400+30+70)×4 ＝ 2000', () => {
  const d = extraData();
  assert.equal(C.itemUnit(d.buyItems[0]), 500);
  assert.equal(C.itemTotal(d.buyItems[0]), 2000);
  assert.equal(C.itemsSum(d.buyItems), 2500);
});

ok('多付、二補跟商品款同一天算，帳戶也一起出', () => {
  const d = extraData();
  assert.equal(C.summary(d, '2026-09').spend, 2500 + 25);
  assert.equal(C.summary(d, '2026-10').spend, 0);
  assert.equal(C.accountFlows(d, null).a1.out, 2525);
});

ok('多付、二補算在那個品項的成員上，費用也照含多付的金額攤', () => {
  const byMember = C.groupDetail(extraData(), 'g', null).byMember;
  assert.equal(Math.round(byMember.m1), 2000 + 20);    // 運費 25 × 2000/2500
  assert.equal(Math.round(byMember.m2), 500 + 5);
});

ok('取消的品項連多付、二補一起不算', () => {
  const d = extraData();
  d.buyItems[0].cancelled = true;
  assert.equal(C.summary(d, null).spend, 500 + 25);
});

ok('一起寄的運費平分，零頭放第一張', () => {
  assert.deepEqual(C.splitEven(38, 2), [19, 19]);
  assert.deepEqual(C.splitEven(38, 3), [14, 12, 12]);
  assert.deepEqual(C.splitEven(38, 1), [38]);
  assert.deepEqual(C.splitEven(38, 0), []);
  assert.equal(C.splitEven(100, 7).reduce((a, b) => a + b, 0), 100);
});

ok('一起寄：兩張單各分 19，記在到貨那天，下單日、付款日不變', () => {
  const d = {
    buys: [{ id: 'y1', date: '2026-08-01', payMethod: '匯款', accountId: 'a1', paidDate: '2026-08-02', currency: 'TWD', arrival: '已到', arrivedDate: '2026-10-09' },
           { id: 'y2', date: '2026-09-15', payMethod: '貨付', paidDate: '2026-10-09', currency: 'TWD', arrival: '已到', arrivedDate: '2026-10-09' }],
    buyItems: [{ id: 'yi1', buyId: 'y1', groupId: 'g', price: 300, qty: 1 }, { id: 'yi2', buyId: 'y2', groupId: 'g', price: 200, qty: 1 }],
    buyFees: [{ id: 'yf1', buyId: 'y1', kind: '運費', amount: 19, paid: true, paidDate: '2026-10-09', shipId: 'sh' },
              { id: 'yf2', buyId: 'y2', kind: '運費', amount: 19, paid: true, paidDate: '2026-10-09', shipId: 'sh' }]
  };
  assert.equal(C.summary(d, '2026-08').spend, 300);
  assert.equal(C.summary(d, '2026-10').spend, 200 + 38);
  // 超商運費取貨時付現金：銀行甲只出商品款 300
  assert.equal(C.accountFlows(d, null).a1.out, 300);
});

ok('品項全部取消的單：連運費一起不算，首頁也不再提醒', () => {
  const d = {
    buys: [{ id: 'v1', date: '2026-10-01', payMethod: '匯款', accountId: 'a1', paidDate: '2026-10-02', currency: 'TWD', arrival: '未到' },
           { id: 'v2', date: '2026-10-01', payMethod: '刷卡', accountId: 'a1', paidDate: '2026-10-02', currency: 'KRW', paidTwd: 800, arrival: '未到' }],
    buyItems: [{ id: 'vi1', buyId: 'v1', groupId: 'g', price: 500, qty: 1, cancelled: true },
               { id: 'vi2', buyId: 'v2', groupId: 'g', price: 30000, qty: 1, cancelled: true }],
    buyFees: [{ id: 'vf', buyId: 'v1', kind: '運費', amount: 60, paid: true }]
  };
  assert.equal(C.summary(d, null).spend, 0);
  assert.deepEqual(C.byGroup(d, null), {});
  assert.equal(C.todos(d, '2026-10-10').notArrived.length, 0);
});

ok('沒有品項可以攤的買單算進「沒指定團」，各團加起來等於總花費', () => {
  const d = { buys: [{ id: 'n', payMethod: '匯款', paidDate: '2026-10-02', currency: 'TWD', arrival: '已到' }], buyItems: [],
              buyFees: [{ id: 'nf', buyId: 'n', kind: '運費', amount: 60, paid: true }] };
  assert.equal(C.summary(d, null).spend, 60);
  assert.equal(C.byGroup(d, null)[''].spend, 60);
});

ok('每張單實際付出去多少（明細小計用）：沒付、取消的都是 0', () => {
  const p = C.paidByBuy(data);
  assert.equal(p.b1, 500 + 30);
  assert.equal(p.b2, 800);                 // 整單二補還沒付，不算
  assert.equal(p.b3 || 0, 0);              // 還沒付
  assert.equal(p.b4 || 0, 0);              // 已取消
});

ok('付款日不詳的單，「等了幾天」改用下單日算', () => {
  const d = { buys: [{ id: 'w', date: '2026-10-01', payMethod: '匯款', paidDate: C.UNKNOWN_DATE, currency: 'TWD', arrival: '未到' }], buyItems: [] };
  assert.equal(C.todos(d, '2026-10-11').notArrived[0].days, 10);
});

ok('外幣單沒填實付台幣：用匯率估；填了就用實付台幣', () => {
  const d = { rates: { KRW: 40 },
    buys: [{ id: 'k1', payMethod: '刷卡', accountId: 'a1', paidDate: '2026-10-02', currency: 'KRW', arrival: '未到' },
           { id: 'k2', payMethod: '刷卡', accountId: 'a1', paidDate: '2026-10-02', currency: 'KRW', paidTwd: 1600, arrival: '未到' }],
    buyItems: [{ id: 'ki1', buyId: 'k1', groupId: 'g', price: 31000, qty: 2 }, { id: 'ki2', buyId: 'k2', groupId: 'g', price: 62000, qty: 1 }] };
  assert.equal(C.buyGoods(d.buys[0], [d.buyItems[0]], d.rates), 1550);
  assert.equal(C.summary(d, '2026-10').spend, 1550 + 1600);
  assert.equal(C.summary(Object.assign({}, d, { rates: null }), '2026-10').spend, 1600);   // 沒有匯率：照舊當 0
});

ok('待付：還沒付、貨付還沒取貨、喊單、未付費用各自加總；不知道金額的另外數', () => {
  const d = { rates: { KRW: 40 },
    buys: [{ id: 'd1', date: '2026-10-01', payMethod: '匯款', paidDate: '', currency: 'TWD', arrival: '未到' },
           { id: 'd2', date: '2026-10-01', payMethod: '貨付', paidDate: '', currency: 'TWD', arrival: '未到' },
           { id: 'd3', date: '', callDate: '2026-10-01', payMethod: '匯款', paidDate: '', currency: 'TWD', arrival: '未到' },
           { id: 'd4', date: '2026-09-01', payMethod: '匯款', paidDate: '2026-09-01', currency: 'TWD', arrival: '已到' },
           { id: 'd5', date: '2026-10-01', payMethod: '刷卡', paidDate: '', currency: 'KRW', arrival: '未到' },
           { id: 'd6', date: '2026-10-01', payMethod: '匯款', paidDate: '', currency: 'TWD', arrival: '已取消' },
           { id: 'd7', date: '2026-10-01', payMethod: '貨付', paidDate: '2026-10-09', currency: 'TWD', arrival: '已到' }],
    buyItems: [{ id: 'e1', buyId: 'd1', price: 500, qty: 1, extra: 30, second: 70 }, { id: 'e2', buyId: 'd2', price: 530, qty: 1 },
               { id: 'e3', buyId: 'd3', price: 200, qty: 2 }, { id: 'e4', buyId: 'd4', price: 999, qty: 1 },
               { id: 'e5', buyId: 'd5', price: 4000, qty: 1 }, { id: 'e6', buyId: 'd6', price: 999, qty: 1 }, { id: 'e7', buyId: 'd7', price: 999, qty: 1 }],
    buyFees: [{ id: 'g1', buyId: 'd1', kind: '運費', amount: 60, paid: true, paidDate: '' },      // 跟商品款一起付
              { id: 'g2', buyId: 'd4', kind: '整單二補', amount: 120, paid: false },
              { id: 'g3', buyId: 'd4', kind: '整單二補', amount: 0, paid: false },              // 還不知道多少
              { id: 'g4', buyId: 'd6', kind: '整單二補', amount: 500, paid: false }] };         // 取消的單，不算
  const due = C.dueSummary(d);
  assert.equal(due.unpaid, 600 + 60 + 100);      // d1 (500+30+70) + 運費，d5 ₩4000 ÷ 40
  assert.equal(due.cod, 530);
  assert.equal(due.called, 400);
  assert.equal(due.fees, 120);
  assert.equal(due.unknown, 1);
  assert.equal(due.total, 760 + 530 + 400 + 120);
  assert.equal(due.estimated, true);
});

ok('待收：賣單還沒收到的錢，依收款方式分開', () => {
  const r = C.receivable(data);
  assert.equal(r.transfer, 80);            // s2 匯款還沒收
  assert.equal(r.pickup, 60);              // s3 取貨付款、還沒取貨
  assert.equal(r.cash, 0);
  assert.equal(r.total, 140);              // s1 已收，不算
  assert.equal(r.count, 2);
});

ok('還沒下單：有喊單日、沒下單日，只出現在「還沒下單」', () => {
  const d = { buys: [{ id: 'n1', callDate: '2026-10-01', date: '', payMethod: '匯款', currency: 'TWD', arrival: '未到' },
                     { id: 'n2', callDate: '', date: '', payMethod: '匯款', currency: 'TWD', arrival: '未到' }],
              buyItems: [{ id: 'a', buyId: 'n1', groupId: 'g', price: 100, qty: 1 }, { id: 'b', buyId: 'n2', groupId: 'g', price: 100, qty: 1 }] };
  const t = C.todos(d, '2026-10-11');
  assert.deepEqual(t.notOrdered.map((x) => x.buy.id), ['n1']);
  assert.equal(t.notOrdered[0].days, 10);
  assert.deepEqual(t.unpaid.map((x) => x.buy.id), ['n2']);        // n1 還沒下單，不算還沒付
});

console.log(`\n${n} 組全過`);
