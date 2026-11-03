/* ==========================================================================
   計算：所有數字都在這裡算，畫面只負責顯示。
   純函式，不碰 DOM，所以 scripts/test-calc.js 可以直接在 Node 底下跑。

   記帳基準：錢出去（進來）的那天，不是下單日、也不是到貨日。
   - 買單：付款日（貨付＝取貨那天）。還沒付款的不計入
   - 費用：自己的付款日，沒填就跟著買單。標了未付的不計入
   - 賣單：收款日。還沒收的不計入
   - 已取消的買單整張不算；品項全部取消的單也一樣（連運費等費用都不算）
   - 一起寄的超商運費是取貨時付現金，不算進任何帳戶
   - 外幣單以「實付台幣」為準；還沒填就用匯率先估（data.rates，1 台幣＝多少外幣）
   ========================================================================== */
(function (root) {
  'use strict';

  /** 付了錢但不知道哪天：App 會把它算進「全部」，但不屬於任何一個月 */
  const UNKNOWN_DATE = '日期不詳';
  const CURRENCIES = { TWD: '台幣', KRW: '韓元', JPY: '日圓', USD: '美元' };
  const SYMBOLS = { TWD: '$', KRW: '₩', JPY: '¥', USD: 'US$' };
  const isTwd = (c) => !c || c === 'TWD';

  const list = (v) => (v ? String(v).split(',').filter(Boolean) : []);
  const num = (v) => Number(v) || 0;
  const ym = (date) => String(date || '').slice(0, 7);

  /** 把資料表攤成方便查的樣子：id → 紀錄，買單 → 品項／費用 */
  function index(data) {
    const by = {};
    ['groups', 'members', 'releases', 'accounts', 'parties', 'options', 'buys', 'sells'].forEach((k) => {
      by[k] = {};
      (data[k] || []).forEach((r) => { by[k][r.id] = r; });
    });
    by.itemsOf = {};
    by.feesOf = {};
    (data.buyItems || []).forEach((i) => { (by.itemsOf[i.buyId] = by.itemsOf[i.buyId] || []).push(i); });
    (data.buyFees || []).forEach((f) => { (by.feesOf[f.buyId] = by.feesOf[f.buyId] || []).push(f); });
    return by;
  }

  /** 一個的價錢＝單價＋多付＋二補。多付：例如走貨付被加價的錢；二補：照品項補的錢。都是「每一個」多出來的 */
  const itemUnit = (it) => num(it.price) + num(it.extra) + num(it.second);
  const itemTotal = (it) => (it.cancelled ? 0 : itemUnit(it) * num(it.qty));
  const itemsSum = (items) => items.reduce((s, it) => s + itemTotal(it), 0);

  /** 外幣單還沒填實付台幣：金額是用匯率估的 */
  const isEstimated = (buy) => !isTwd(buy.currency) && !num(buy.paidTwd);
  /** 用匯率把外幣品項合計換成台幣。rates：1 台幣＝多少外幣，例如 { KRW: 41.2 }；沒有匯率就是 0 */
  function estimateTwd(buy, items, rates) {
    const r = rates ? num(rates[buy.currency]) : 0;
    return r > 0 ? Math.round(itemsSum(items) / r) : 0;
  }
  /** 買單的商品款（台幣）。外幣單以「實付台幣」為準，還沒填就用匯率估 */
  function buyGoods(buy, items, rates) {
    if (isTwd(buy.currency)) return itemsSum(items);
    return num(buy.paidTwd) || estimateTwd(buy, items, rates);
  }
  const feesSum = (fees) => fees.reduce((s, f) => s + num(f.amount), 0);

  const isCancelled = (buy) => buy.arrival === '已取消';
  /** 這張單不算錢：整張取消，或品項全部都取消了（費用也一起不算） */
  const isVoid = (buy, items) => isCancelled(buy) || (!!items && items.length > 0 && items.every((i) => i.cancelled));

  /**
   * 一起寄的運費平分給 n 張單。都取整數，除不盡的零頭放第一張。
   * 例如 38 分 3 張 → [14, 12, 12]
   */
  function splitEven(total, n) {
    if (!n) return [];
    const base = Math.floor(num(total) / n);
    const out = Array(n).fill(base);
    out[0] = num(total) - base * (n - 1);
    return out;
  }

  /**
   * 現金流事件。每筆都是「某一天，某筆錢，進或出」。
   * 報表、帳戶進出都從這裡來，口徑才會一致。
   * share：這筆錢要怎麼攤到各品項（依品項小計比例），給「依團／成員看」用
   */
  function events(data) {
    const by = index(data);
    const out = [];

    (data.buys || []).forEach((buy) => {
      if (isVoid(buy, by.itemsOf[buy.id])) return;
      const items = (by.itemsOf[buy.id] || []).filter((i) => !i.cancelled);
      const sum = items.reduce((s, i) => s + itemTotal(i), 0);
      // 費用依品項小計比例攤
      const shares = items.map((i) => ({
        item: i,
        ratio: sum > 0 ? itemTotal(i) / sum : 1 / (items.length || 1)
      }));
      const account = buy.payMethod === '匯款' || buy.payMethod === '刷卡' ? buy.accountId : '';

      // 多付、二補都含在品項金額裡，跟商品款同一天付
      if (buy.paidDate) {
        out.push({ type: 'buy', date: buy.paidDate, amount: buyGoods(buy, by.itemsOf[buy.id] || [], data.rates), dir: -1, accountId: account, buyId: buy.id, shares, estimated: isEstimated(buy) });
      }
      (by.feesOf[buy.id] || []).forEach((fee) => {
        const date = fee.paid ? (fee.paidDate || buy.paidDate) : '';
        if (!date) return;
        out.push({ type: 'fee', date, amount: num(fee.amount), dir: -1, accountId: fee.shipId ? '' : account, buyId: buy.id, shares });
      });
    });

    (data.sells || []).forEach((s) => {
      if (!s.paidDate) return;
      out.push({ type: 'sell', date: s.paidDate, amount: num(s.amount), dir: 1, accountId: s.accountId, sellId: s.id, groupId: s.groupId });
    });

    (data.expenses || []).forEach((e) => {
      out.push({ type: 'expense', date: e.date, amount: num(e.amount), dir: -1, accountId: e.accountId, groupId: e.groupId, memberId: e.memberId, expenseId: e.id });
    });

    return out;
  }

  /**
   * 首頁最上面的「待付」：之後還要付出去的錢，好先把錢留起來。
   *   unpaid 還沒付的單（不含貨付）     cod 貨付、還沒取貨（取貨時付）
   *   called 喊單、還沒下單            fees 標了未付的費用（大多是整單二補）
   * 前三種連同「跟商品款一起付」的費用（標已付、沒有自己的付款日）一起算。
   * 未付費用金額空白的不知道多少，另外數幾筆（unknown）
   */
  function dueSummary(data) {
    const by = index(data);
    const res = { total: 0, unpaid: 0, cod: 0, called: 0, fees: 0, unknown: 0, estimated: false };
    (data.buys || []).forEach((buy) => {
      const items = by.itemsOf[buy.id] || [];
      if (isVoid(buy, items)) return;
      const fees = by.feesOf[buy.id] || [];
      let bucket = '';
      if (buy.callDate && !buy.date) bucket = 'called';
      else if (buy.payMethod === '貨付') bucket = buy.arrival === '未到' ? 'cod' : '';
      else if (!buy.paidDate) bucket = 'unpaid';
      if (bucket) {
        res[bucket] += buyGoods(buy, items, data.rates) + feesSum(fees.filter((f) => f.paid && !f.paidDate));
        if (isEstimated(buy)) res.estimated = true;
      }
      fees.filter((f) => !f.paid).forEach((f) => { if (num(f.amount) > 0) res.fees += num(f.amount); else res.unknown++; });
    });
    res.total = res.unpaid + res.cod + res.called + res.fees;
    return res;
  }

  /**
   * 首頁的「待收」：賣單已經成立、錢還沒收到的。
   *   transfer 買家還沒匯款   pickup 取貨付款、買家還沒取貨   cash 現金還沒收
   */
  function receivable(data) {
    const res = { total: 0, transfer: 0, pickup: 0, cash: 0, count: 0 };
    (data.sells || []).forEach((s) => {
      if (s.paidDate) return;
      const key = s.payMethod === '取貨付款' ? 'pickup' : s.payMethod === '現金' ? 'cash' : 'transfer';
      res[key] += num(s.amount);
      res.count++;
    });
    res.total = res.transfer + res.pickup + res.cash;
    return res;
  }

  /** 每張買單實際付出去多少（商品款＋已付的費用，不分日期）。明細的小計用，跟報表同一套規則 */
  function paidByBuy(data) {
    const res = {};
    events(data).forEach((e) => { if (e.buyId) res[e.buyId] = (res[e.buyId] || 0) + e.amount; });
    return res;
  }

  /** period：'YYYY-MM' 只算那個月；null 算全部 */
  const inPeriod = (ev, period) => !period || ym(ev.date) === period;

  function summary(data, period) {
    let spend = 0;
    let income = 0;
    events(data).filter((e) => inPeriod(e, period)).forEach((e) => {
      if (e.dir < 0) spend += e.amount; else income += e.amount;
    });
    return { spend, income, net: spend - income };
  }

  /** 結束在 endYm 的最近 n 個月 */
  function monthly(data, endYm, n) {
    const [y, m] = endYm.split('-').map(Number);
    const months = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(y, m - 1 - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    const evs = events(data);
    return months.map((month) => {
      let spend = 0;
      let income = 0;
      evs.forEach((e) => {
        if (ym(e.date) !== month) return;
        if (e.dir < 0) spend += e.amount; else income += e.amount;
      });
      return { month, spend, income };
    });
  }

  function accountFlows(data, period) {
    const flows = {};
    events(data).filter((e) => inPeriod(e, period) && e.accountId).forEach((e) => {
      const f = (flows[e.accountId] = flows[e.accountId] || { out: 0, in: 0 });
      if (e.dir < 0) f.out += e.amount; else f.in += e.amount;
    });
    return flows;
  }

  /**
   * 把支出攤到「團／回歸／成員」。
   * 回傳一列一列：{ groupId, releaseId, memberIds, isSet, flags, amount, date, type }
   * 賣單、花費沒有品項，直接用自己的團。
   */
  function allocations(data, period) {
    const rows = [];
    events(data).filter((e) => inPeriod(e, period)).forEach((e) => {
      if (e.shares && e.shares.length) {
        e.shares.forEach((s) => rows.push({
          type: e.type, dir: -1, date: e.date, amount: e.amount * s.ratio,
          groupId: s.item.groupId, releaseId: s.item.releaseId,
          memberIds: list(s.item.memberIds), isSet: !!s.item.isSet, flags: list(s.item.flags)
        }));
      } else {
        rows.push({
          // 沒有品項可以攤的買單（很少見）放進「沒指定團」，各團加起來才會等於總花費
          type: e.type, dir: e.dir, date: e.date, amount: e.amount,
          groupId: e.groupId || '', releaseId: '', memberIds: e.memberId ? [e.memberId] : [], isSet: false, flags: []
        });
      }
    });
    return rows;
  }

  /** 依團累積：{ groupId: { spend, income, net } } */
  function byGroup(data, period) {
    const res = {};
    allocations(data, period).forEach((r) => {
      const g = (res[r.groupId || ''] = res[r.groupId || ''] || { spend: 0, income: 0, net: 0 });
      if (r.dir < 0) g.spend += r.amount; else g.income += r.amount;
      g.net = g.spend - g.income;
    });
    return res;
  }

  /** 某個團底下，依回歸、依成員的支出 */
  function groupDetail(data, groupId, period) {
    const byRelease = {};
    const byMember = {};
    allocations(data, period).filter((r) => (r.groupId || '') === groupId && r.dir < 0).forEach((r) => {
      byRelease[r.releaseId || ''] = (byRelease[r.releaseId || ''] || 0) + r.amount;
      const targets = r.memberIds.length && !r.isSet ? r.memberIds : [''];
      targets.forEach((m) => { byMember[m] = (byMember[m] || 0) + r.amount / targets.length; });
    });
    return { byRelease, byMember };
  }

  /** 被搭售的「多帶」花了多少錢、幾張 */
  function multiSpend(data, period) {
    const by = index(data);
    let amount = 0;
    allocations(data, period).filter((r) => r.dir < 0 && r.flags.includes('多帶')).forEach((r) => { amount += r.amount; });

    let count = 0;
    (data.buyItems || []).forEach((i) => {
      const buy = by.buys[i.buyId];
      if (!buy || isCancelled(buy) || i.cancelled || !list(i.flags).includes('多帶')) return;
      if (period && ym(buy.paidDate) !== period) return;
      if (!buy.paidDate) return;
      count += num(i.qty);
    });
    return { amount, count };
  }

  /**
   * 手上「多帶＋重複」的張數（已到貨的），給「拿去賣或換」用。
   * 回傳 { 多帶: n, 重複: n }
   */
  function spareCounts(data) {
    const by = index(data);
    const res = { 多帶: 0, 重複: 0 };
    (data.buyItems || []).forEach((i) => {
      const buy = by.buys[i.buyId];
      if (!buy || buy.arrival !== '已到' || i.cancelled) return;
      list(i.flags).forEach((f) => { if (f in res) res[f] += num(i.qty); });
    });
    return res;
  }

  /**
   * 回歸收集表：橫軸成員、縱軸通路，格子＝收了幾張。
   * 數量規則：
   *   一套          → 該團每位成員各 qty 張
   *   選了好幾位    → qty 平分給這幾位（數量預設就是人數，各 1 張）
   *   沒選成員      → 算在「（無成員）」那一欄，例如空專
   * 只有「已到」算收到；「未到」另外記成待到
   */
  function collection(data, releaseId) {
    const by = index(data);
    const release = by.releases[releaseId];
    const groupId = release ? release.groupId : '';
    const members = (data.members || []).filter((m) => m.groupId === groupId);
    const rows = {};

    const cellOf = (channelId, memberId) => {
      const row = (rows[channelId || ''] = rows[channelId || ''] || {});
      return (row[memberId || ''] = row[memberId || ''] || { have: 0, pending: 0, multi: 0, dup: 0, buyIds: [] });
    };

    (data.buyItems || []).forEach((i) => {
      if (i.releaseId !== releaseId || i.cancelled) return;
      const buy = by.buys[i.buyId];
      if (!buy || isCancelled(buy)) return;

      const qty = num(i.qty);
      const ids = list(i.memberIds);
      const flags = list(i.flags);
      let targets;
      if (i.isSet) targets = members.map((m) => [m.id, qty]);
      else if (ids.length) targets = ids.map((id) => [id, qty / ids.length]);
      else targets = [['', qty]];

      targets.forEach(([memberId, n]) => {
        const cell = cellOf(i.channelId, memberId);
        if (buy.arrival === '已到') cell.have += n; else cell.pending += n;
        if (flags.includes('多帶')) cell.multi += n;
        if (flags.includes('重複')) cell.dup += n;
        if (!cell.buyIds.includes(buy.id)) cell.buyIds.push(buy.id);
      });
    });

    return { members, rows };
  }

  const monthOf = (today) => String(today).slice(0, 7);

  /** 首頁「待處理」。today：'YYYY-MM-DD' */
  function todos(data, today) {
    const by = index(data);
    const thisMonth = monthOf(today);
    const t = { unpaid: [], preorder: [], notArrived: [], feesUnpaid: [], sellUnpaid: [], notShipped: [], pending: [], notOrdered: [] };
    const daysSince = (d) => { const t = new Date(d); return d && !isNaN(t) ? Math.max(0, Math.round((new Date(today) - t) / 86400000)) : null; };   // 日期不詳就沒有「等了幾天」

    (data.buys || []).forEach((buy) => {
      const items = by.itemsOf[buy.id] || [];
      if (isVoid(buy, items)) return;
      // 有喊單日、還沒下單：這張單還在等賣家，只放「還沒下單」，不算還沒付、還沒到貨
      if (buy.callDate && !buy.date) {
        t.notOrdered.push({ buy, days: daysSince(buy.callDate), total: itemsSum(items) });
        return;
      }
      const unpaid = !buy.paidDate && buy.payMethod !== '貨付';

      if (unpaid) t.unpaid.push({ buy, days: daysSince(buy.date), total: itemsSum(items) });

      if (buy.arrival === '未到' && !unpaid) {
        const future = buy.expectedMonth && buy.expectedMonth > thisMonth;
        if (future) t.preorder.push({ buy, total: itemsSum(items) });
        else t.notArrived.push({ buy, days: daysSince(/^\d{4}-/.test(buy.paidDate) ? buy.paidDate : buy.date), total: itemsSum(items) });
      }

      (by.feesOf[buy.id] || []).forEach((fee) => {
        if (!fee.paid) t.feesUnpaid.push({ buy, fee });
      });

      if (buy.pending || (!isTwd(buy.currency) && !num(buy.paidTwd))) {
        t.pending.push({ buy, total: itemsSum(items) });
      }
    });

    t.preorder.sort((a, b) => String(a.buy.expectedMonth).localeCompare(b.buy.expectedMonth));

    (data.sells || []).forEach((s) => {
      if (s.payMethod === '匯款' && !s.paidDate) t.sellUnpaid.push({ sell: s });
      if (s.shipStatus === '未寄' && (s.paidDate || s.payMethod === '取貨付款')) t.notShipped.push({ sell: s });
    });

    return t;
  }

  const api = {
    UNKNOWN_DATE, CURRENCIES, SYMBOLS, isTwd, list, num, ym, index,
    itemUnit, itemTotal, itemsSum, splitEven, buyGoods, estimateTwd, isEstimated, feesSum, isCancelled, isVoid,
    events, paidByBuy, dueSummary, receivable, summary, monthly, accountFlows, allocations,
    byGroup, groupDetail, multiSpend, spareCounts, collection, todos
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Calc = api;
})(typeof self !== 'undefined' ? self : this);
