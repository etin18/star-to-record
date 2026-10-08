/**
 * STAR TO RECORD — 追星記帳本 後端 API（Google Apps Script）
 *
 * 部署方式：
 *   1. 開啟目標 Google 試算表 → 擴充功能 → Apps Script
 *   2. 把本檔內容整份貼上，存檔
 *   3. 部署 → 新增部署作業 → 類型選「網頁應用程式」
 *      - 執行身分：我
 *      - 具有存取權的使用者：任何人
 *   4. 複製產生的網址（結尾是 /exec），貼進 App 的「設定」
 *
 * 分頁會在第一次呼叫時自動建立：
 *   團、成員、回歸、帳戶、對象、選項（通路／寄送方式／花費類別）、
 *   買單、買單品項、買單費用、賣單、花費
 *
 * ★★ 通關密語 ★★
 *   把下面的 SECRET 改成你自己的一組密語，再到 App 設定填入「同一組」。
 *   ⚠️ 改好密語的版本只貼在自己的 Apps Script 編輯器裡，
 *      不要貼回 GitHub 或任何公開的地方。
 *   （SECRET 留空字串代表不驗證，僅供測試。）
 */

var SECRET = '';   // ← 改成你自己的通關密語

/** 後端版本。App 設定頁會跟自己的版本並排顯示，用來確認有沒有真的重新部署。 */
var API_VERSION = 'v2';

/* ==========================================================================
   資料表定義：欄位順序＝試算表欄位順序
   type：text 文字／number 數字／bool 是否／date 日期（純文字，避免被改格式）
   ========================================================================== */

var SHEETS = {
  groups: {
    sheetName: '團',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'name', header: '名稱', type: 'text', width: 160 },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  members: {
    sheetName: '成員',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'groupId', header: '團id', type: 'text', width: 250 },
      { key: 'name', header: '名稱', type: 'text', width: 160 },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  releases: {
    sheetName: '回歸',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'groupId', header: '團id', type: 'text', width: 250 },
      { key: 'name', header: '名稱', type: 'text', width: 200 },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  accounts: {
    sheetName: '帳戶',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'name', header: '名稱', type: 'text', width: 160 },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  parties: {
    sheetName: '對象',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'name', header: '暱稱', type: 'text', width: 160 },
      { key: 'platform', header: '平台', type: 'text' },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  options: {
    sheetName: '選項',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      // channel 通路／ship 寄送方式／expcat 花費類別
      { key: 'kind', header: '種類', type: 'text' },
      { key: 'name', header: '名稱', type: 'text', width: 160 },
      { key: 'createdAt', header: '建立時間', type: 'text' }
    ]
  },
  buys: {
    sheetName: '買單',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'date', header: '下單日', type: 'date' },
      { key: 'partyId', header: '賣家id', type: 'text', width: 250 },
      { key: 'partyName', header: '賣家', type: 'text', width: 140 },
      { key: 'payMethod', header: '付款方式', type: 'text' },
      { key: 'accountId', header: '付款帳戶id', type: 'text', width: 250 },
      // 錢出去的那天；貨付則是取貨那天。空白＝還沒付
      { key: 'paidDate', header: '付款日', type: 'date' },
      { key: 'currency', header: '幣別', type: 'text' },
      // 外幣單的「實刷台幣」，成本以此為準
      { key: 'paidTwd', header: '實付台幣', type: 'number' },
      { key: 'pending', header: '待確認', type: 'bool' },
      { key: 'arrival', header: '到貨狀態', type: 'text' },
      { key: 'arrivedDate', header: '到貨日', type: 'date' },
      { key: 'expectedMonth', header: '預計到貨', type: 'text' },
      { key: 'note', header: '備註', type: 'text', width: 200 },
      { key: 'createdAt', header: '建立時間', type: 'text' },
      // 照片編號，逗號隔開。照片本體只存在手機裡，這裡只讓別支手機知道「這張單有照片」
      { key: 'photoIds', header: '照片', type: 'text', width: 200 }
    ]
  },
  buyItems: {
    sheetName: '買單品項',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'buyId', header: '買單id', type: 'text', width: 250 },
      { key: 'groupId', header: '團id', type: 'text', width: 250 },
      { key: 'releaseId', header: '回歸id', type: 'text', width: 250 },
      // 成員id 用逗號隔開；isSet＝「一套」
      { key: 'memberIds', header: '成員id', type: 'text', width: 250 },
      { key: 'isSet', header: '一套', type: 'bool' },
      { key: 'channelId', header: '通路id', type: 'text', width: 250 },
      { key: 'name', header: '品項', type: 'text', width: 200 },
      { key: 'price', header: '單價', type: 'number' },
      { key: 'qty', header: '數量', type: 'number' },
      // 逗號隔開：多帶、重複、自留
      { key: 'flags', header: '標記', type: 'text' },
      { key: 'cancelled', header: '已取消', type: 'bool' }
    ]
  },
  buyFees: {
    sheetName: '買單費用',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'buyId', header: '買單id', type: 'text', width: 250 },
      { key: 'kind', header: '類別', type: 'text' },
      { key: 'amount', header: '金額', type: 'number' },
      { key: 'paid', header: '已付', type: 'bool' },
      { key: 'paidDate', header: '付款日', type: 'date' },
      { key: 'note', header: '備註', type: 'text', width: 200 }
    ]
  },
  sells: {
    sheetName: '賣單',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'date', header: '日期', type: 'date' },
      { key: 'partyId', header: '買家id', type: 'text', width: 250 },
      { key: 'partyName', header: '買家', type: 'text', width: 140 },
      { key: 'content', header: '內容', type: 'text', width: 240 },
      { key: 'groupId', header: '團id', type: 'text', width: 250 },
      { key: 'memberIds', header: '成員id', type: 'text', width: 250 },
      { key: 'amount', header: '金額', type: 'number' },
      { key: 'payMethod', header: '收款方式', type: 'text' },
      { key: 'accountId', header: '收款帳戶id', type: 'text', width: 250 },
      { key: 'paidDate', header: '收款日', type: 'date' },
      { key: 'shipMethod', header: '寄送方式', type: 'text' },
      { key: 'shipStatus', header: '寄送狀態', type: 'text' },
      { key: 'note', header: '備註', type: 'text', width: 200 },
      { key: 'createdAt', header: '建立時間', type: 'text' },
      { key: 'photoIds', header: '照片', type: 'text', width: 200 }
    ]
  },
  expenses: {
    sheetName: '花費',
    fields: [
      { key: 'id', header: 'id', type: 'text', width: 250 },
      { key: 'date', header: '日期', type: 'date' },
      { key: 'category', header: '類別', type: 'text' },
      { key: 'content', header: '內容', type: 'text', width: 240 },
      { key: 'amount', header: '金額', type: 'number' },
      { key: 'accountId', header: '付款帳戶id', type: 'text', width: 250 },
      { key: 'groupId', header: '團id', type: 'text', width: 250 },
      { key: 'memberId', header: '成員id', type: 'text', width: 250 },
      { key: 'note', header: '備註', type: 'text', width: 200 },
      { key: 'createdAt', header: '建立時間', type: 'text' },
      { key: 'photoIds', header: '照片', type: 'text', width: 200 }
    ]
  }
};

var ENTITIES = Object.keys(SHEETS);

/* ==========================================================================
   進入點
   ========================================================================== */

function doGet(e) {
  return respond({ ok: true, service: 'STAR TO RECORD API', message: '這是 API 端點，請從 App 使用。' });
}

function doPost(e) {
  var payload;
  try {
    payload = JSON.parse(e.postData.contents);
  } catch (err) {
    return respond({ ok: false, error: '無法解析請求內容' });
  }
  return respond(route(payload));
}

/** 所有操作都在 script lock 內執行，避免同時送出時互相蓋掉。 */
function route(payload) {
  var expected = String(SECRET || '').trim();
  if (expected && String(payload.secret || '').trim() !== expected) {
    return { ok: false, error: '通關密語錯誤，請到設定確認', authError: true };
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return { ok: false, error: '系統忙碌中，請稍後再試' };
  }

  try {
    switch (payload.action || 'list') {
      case 'list': {
        var out = { ok: true };
        ENTITIES.forEach(function (name) { out[name] = listRows(name); });
        return out;
      }
      case 'batch': {
        // App 離線時累積的操作，一次送來；依序執行，回報每一筆成功與否
        var results = (payload.ops || []).map(function (op) {
          try {
            runOp(op);
            return { ok: true };
          } catch (err) {
            return { ok: false, error: String((err && err.message) || err) };
          }
        });
        return { ok: true, results: results };
      }
      default:
        runOp(payload);
        return { ok: true };
    }
  } catch (err) {
    return { ok: false, error: String((err && err.message) || err) };
  } finally {
    lock.releaseLock();
  }
}

function runOp(op) {
  switch (op.action) {
    case 'save':
      saveRow(op.entity, op.record);
      return;
    case 'remove':
      removeRow(op.entity, op.id);
      return;
    case 'saveBuy':
      // 一張買單＝單頭＋品項＋費用，一起存，避免只存一半
      saveRow('buys', op.buy);
      replaceChildren('buyItems', op.buy.id, op.items || []);
      replaceChildren('buyFees', op.buy.id, op.fees || []);
      return;
    case 'removeBuy':
      removeRow('buys', op.id);
      replaceChildren('buyItems', op.id, []);
      replaceChildren('buyFees', op.id, []);
      return;
    default:
      throw new Error('未知的操作：' + op.action);
  }
}

function respond(obj) {
  obj.apiVersion = API_VERSION;
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ==========================================================================
   通用 CRUD
   ========================================================================== */

function getConfig(entity) {
  var config = SHEETS[entity];
  if (!config) throw new Error('未知的資料表：' + entity);
  return config;
}

function getSheet(entity) {
  var config = getConfig(entity);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(config.sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(config.sheetName);
    var headers = config.fields.map(function (f) { return f.header; });
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    for (var i = 0; i < config.fields.length; i++) {
      if (config.fields[i].width) sheet.setColumnWidth(i + 1, config.fields[i].width);
    }
    // 日期、id 欄設純文字，Sheets 才不會自作聰明改格式
    config.fields.forEach(function (f, idx) {
      if (f.type === 'date' || f.type === 'text') {
        sheet.getRange(2, idx + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      }
    });
  } else {
    ensureColumns(sheet, config);
  }
  return sheet;
}

/**
 * 後來新增的欄位（例如「照片」）補到既有分頁的最後面。
 * 新欄位一律加在最後，所以舊資料的欄位順序不會亂。
 */
function ensureColumns(sheet, config) {
  var have = sheet.getLastColumn();
  if (have >= config.fields.length) return;
  for (var i = have; i < config.fields.length; i++) {
    var f = config.fields[i];
    sheet.getRange(1, i + 1).setValue(f.header).setFontWeight('bold');
    if (f.width) sheet.setColumnWidth(i + 1, f.width);
    if (f.type === 'date' || f.type === 'text') {
      sheet.getRange(2, i + 1, Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    }
  }
}

function listRows(entity) {
  var config = getConfig(entity);
  var sheet = getSheet(entity);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var values = sheet.getRange(2, 1, last - 1, config.fields.length).getValues();
  return values
    .filter(function (row) { return row[0] !== ''; })
    .map(function (row) {
      var rec = {};
      config.fields.forEach(function (f, i) { rec[f.key] = readCell(row[i], f.type); });
      return rec;
    });
}

function saveRow(entity, record) {
  var config = getConfig(entity);
  var sheet = getSheet(entity);
  validate(record);
  if (!record.createdAt) record.createdAt = new Date().toISOString();

  var row = config.fields.map(function (f) { return writeCell(record[f.key], f.type); });
  var rowIndex = findRowById(sheet, record.id);
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }
}

function removeRow(entity, id) {
  var sheet = getSheet(entity);
  var rowIndex = findRowById(sheet, id);
  if (rowIndex > 0) sheet.deleteRow(rowIndex);
}

/** 把某張買單底下的品項（或費用）整批換掉。 */
function replaceChildren(entity, buyId, records) {
  var config = getConfig(entity);
  var sheet = getSheet(entity);
  var last = sheet.getLastRow();
  var buyCol = fieldIndex(config, 'buyId');

  // 從下往上刪，列號才不會跑掉
  if (last >= 2) {
    var ids = sheet.getRange(2, buyCol + 1, last - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(buyId)) sheet.deleteRow(i + 2);
    }
  }
  if (!records.length) return;

  var rows = records.map(function (rec) {
    rec.buyId = buyId;
    return config.fields.map(function (f) { return writeCell(rec[f.key], f.type); });
  });
  var start = sheet.getLastRow() + 1;
  sheet.getRange(start, 1, rows.length, config.fields.length).setValues(rows);
}

function fieldIndex(config, key) {
  for (var i = 0; i < config.fields.length; i++) {
    if (config.fields[i].key === key) return i;
  }
  throw new Error('找不到欄位：' + key);
}

function findRowById(sheet, id) {
  var last = sheet.getLastRow();
  if (last < 2) return -1;
  var ids = sheet.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(id)) return i + 2;
  }
  return -1;
}

function readCell(value, type) {
  if (type === 'number') return value === '' ? 0 : Number(value);
  if (type === 'bool') return value === '是' || value === true;
  if (type === 'date') return normalizeDate(value);
  return value === null || value === undefined ? '' : String(value);
}

function writeCell(value, type) {
  if (value === undefined || value === null) return '';
  if (type === 'number') return value === '' ? '' : Number(value);
  if (type === 'bool') return value ? '是' : '';
  if (type === 'date') return normalizeDate(value);
  return String(value);
}

function normalizeDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(value, tz, 'yyyy-MM-dd');
  }
  return String(value).slice(0, 10);
}

function validate(record) {
  if (!record || !record.id) throw new Error('缺少 id');
}
