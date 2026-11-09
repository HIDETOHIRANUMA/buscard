// わたしのバスカード: page logic (steps, preview, print, remake link).
import { renderCards, renderSheet, renderCardSheet } from './render.js';
import { icon, PLACE_ICONS } from './icons.js';
import { normName } from './gtfs.js';
import { makeWallpaper } from './wallpaper.js';
import qrcode from '../vendor/qrcode.mjs';

const $ = (s, el = document) => el.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const API = 'https://api.gtfs-data.jp/v2';
const TILE = 'https://cyberjapandata.gsi.go.jp/xyz/pale/{z}/{x}/{y}.png';
const MM = 96 / 25.4;

const PREFS = ['', '北海道', '青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県', '茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県', '新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県', '三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県', '鳥取県', '島根県', '岡山県', '広島県', '山口県', '徳島県', '香川県', '愛媛県', '高知県', '福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県', '沖縄県'];
const PREFS_EN = ['', 'Hokkaido', 'Aomori', 'Iwate', 'Miyagi', 'Akita', 'Yamagata', 'Fukushima', 'Ibaraki', 'Tochigi', 'Gunma', 'Saitama', 'Chiba', 'Tokyo', 'Kanagawa', 'Niigata', 'Toyama', 'Ishikawa', 'Fukui', 'Yamanashi', 'Nagano', 'Gifu', 'Shizuoka', 'Aichi', 'Mie', 'Shiga', 'Kyoto', 'Osaka', 'Hyogo', 'Nara', 'Wakayama', 'Tottori', 'Shimane', 'Okayama', 'Hiroshima', 'Yamaguchi', 'Tokushima', 'Kagawa', 'Ehime', 'Kochi', 'Fukuoka', 'Saga', 'Nagasaki', 'Kumamoto', 'Oita', 'Miyazaki', 'Kagoshima', 'Okinawa'];

// Time windows: [first hour, end hour) of departures put on the card.
const WINS = [['all', null], ['morning', [5, 10]], ['day', [10, 15]], ['evening', [15, 19]], ['night', [19, 27]], ['custom', null]];

const UI = {
  ja: {
    skip: '本文へ', appName: 'わたしのバスカード', tagline: 'いつもの バスを、ポケットサイズの カードに。',
    s1: 'バスの データを えらぶ', s1hint: '都道府県と バス会社を えらんでください。時刻表は「GTFSデータリポジトリ」から その場で ダウンロードします。',
    pref: '都道府県', prefPick: 'えらんでください', prefAll: 'ぜんぶ', feedQ: '名前で さがす', or: 'または',
    dropZip: 'GTFS-JPの ZIPファイルを えらぶ（ここに ドロップも できます）',
    s2: 'いつも のる バス停', s2q: 'バス停の 名前（ひらがなでも OK）', nearby: '近くの バス停', nearbyNote: '位置情報は この 画面の 中だけで つかいます',
    s3: 'おりる バス停（行き先）', s3hint: 'のりかえなしで 行ける バス停です。バスが 多い じゅんに ならんでいます。', s3q: 'しぼりこむ',
    s4: 'カードの せってい', owner: 'なまえ（カードに 入ります。なくても OK）', iconL: '行き先の マーク',
    outWin: '「いき」に のせる 時間', backWin: '「かえり」に のせる 時間',
    overflow: 'じこくが 多くて カードに 入りきりません。のる 時間を えらぶと、ぜんぶ のせられます。',
    cardLang: 'カードの ことば', furigana: '漢字に ふりがなを つける', child: 'こども運賃も のせる（めやす）',
    homePhone: 'こまったときの 電話（いえ など。なくても OK）',
    s5: 'いんさつ・ほぞん', printCards: 'カードを いんさつ（4まい）', printSheet: 'A4シートを いんさつ', saveWall: 'スマホの 待ち受けを ほぞん', copyLink: 'つくりなおし用の リンクを コピー',
    printTip: 'いんさつ画面では 倍率「100%」（じっさいの 大きさ）を えらんでください。「PDFに保存」も できます。',
    preview: 'プレビュー', tabCard: 'カード', tabSheet: 'A4 シート', tabWall: 'スマホ', emptyPreview: 'バス停を えらぶと、ここに カードが できます',
    front: 'おもて（いき）', back: 'うら（かえり）',
    privacy: 'えらんだ バス停・なまえ・電話番号は、この ブラウザの 中だけで つかいます。どこにも 送りません。',
    licenses: 'ライセンス', credits: '時刻データ：GTFSデータリポジトリ・Mobility Database（各事業者の オープンデータ）・地図：地理院タイル・フォント：BIZ UDPゴシック／BIZ UDゴシック（SIL Open Font License）・ライブラリ：fflate、qrcode-generator、holiday_jp（MIT License）',
    change: 'かえる', win: { all: 'ぜんぶ', morning: 'あさ 5〜10時', day: 'ひる 10〜15時', evening: 'ゆうがた 15〜19時', night: 'よる 19時〜', custom: 'じぶんで えらぶ' },
    hourFrom: '時から', hourTo: '時まで', hour: (h) => `${h}時`,
    catalogLoading: 'バス会社の 一覧を よみこんでいます…', catalogOffline: '一覧を よみこめませんでした。ZIPファイルを つかってください。',
    catalogCount: (n) => `${n} 件`, noMatch: 'みつかりません', pickPref: '都道府県を えらぶか、名前を 入れてください',
    until: (d) => `〜${d}`, expiredTag: 'きげんぎれ',
    st: { download: 'ダウンロードしています', read: 'ファイルを よんでいます', unzip: 'ひらいています', parse: '時刻表を よんでいます', index: 'じゅんびしています' },
    loaded: (n) => `バス停 ${n} か所`, range: (a, b) => `${a}〜${b} の ダイヤ`,
    expired: 'この データは ダイヤの きげんが すぎています。あたらしい データが ないか たしかめてください。',
    errLoad: (m) => `よみこめませんでした（${m}）`, errWorker: 'この ブラウザでは うごきません。あたらしい Chrome・Edge・Safari・Firefox を つかってください。',
    poles: (n) => `のりば ${n}か所`, meters: (m) => `${m}m`, min: (m) => `やく${m}分`, sameName: '同じ名前の バス停が ほかにも あります',
    geoErr: '位置情報を つかえませんでした', geoWait: '位置を しらべています…',
    noReach: 'のりかえなしで 行ける バス停が ありません', building: 'カードを つくっています…',
    built: (a, b) => `カードが できました（いき ${a}本・かえり ${b}本）`,
    copied: 'リンクを コピーしました。QRコードと 同じ リンクです。', copyFail: 'コピーできませんでした。下の リンクを えらんで コピーしてください。',
    noLinkFile: 'ZIPファイルから つくった カードは、リンクで つくりなおせません。', restoring: 'リンクから カードを つくりなおしています…',
    restoreFail: 'リンクの バス停が みつかりませんでした。えらびなおしてください。', wallMaking: '待ち受け画像を つくっています…',
    restoreMissing: (n) => `リンクの バス停「${n}」が みつかりませんでした。えらびなおしてください。`,
    restoreMany: (n) => `「${n}」という バス停が いくつか あります。どれか えらんでください。`,
    wallHint: 'スマホで ひらいて 画像を ながおし →「写真に保存」→ 待ち受けに せってい', printing: 'いんさつの じゅんび中…',
    pinOn: 'のりば', mapAttr: '地理院タイル',
    outPole: '「いき」で のる のりば', backPole: '「かえり」で のる のりば', poleAll: 'ぜんぶ',
    poleAuto: 'バスが いちばん 多い のりばに しぼりました。ほかの のりばも えらべます。', poleCount: (n) => `${n}便`,
    dataBy: (n) => `${n}`,
  },
  en: {
    skip: 'Skip to content', appName: 'My Bus Card', tagline: 'Your everyday bus, on a pocket-size card.',
    s1: 'Choose bus data', s1hint: 'Pick a prefecture and a bus operator. The timetable is downloaded from the GTFS Data Repository.',
    pref: 'Prefecture', prefPick: 'Choose', prefAll: 'All', feedQ: 'Search by name', or: 'or',
    dropZip: 'Choose a GTFS-JP ZIP file (or drop it here)',
    s2: 'Where you get on', s2q: 'Bus stop name', nearby: 'Stops near me', nearbyNote: 'Your location stays on this device',
    s3: 'Where you get off', s3hint: 'Stops you can reach without changing buses, busiest first.', s3q: 'Filter',
    s4: 'Card settings', owner: 'Name on the card (optional)', iconL: 'Destination icon',
    outWin: 'Hours shown for GO', backWin: 'Hours shown for RETURN',
    overflow: 'Too many buses to fit on the card. Choose the hours you ride to show them all.',
    cardLang: 'Card language', furigana: 'Add furigana to kanji', child: 'Also show child fare (estimate)',
    homePhone: 'Phone to call for help (optional)',
    s5: 'Print & save', printCards: 'Print cards (4 per page)', printSheet: 'Print A4 sheet', saveWall: 'Save phone wallpaper', copyLink: 'Copy remake link',
    printTip: 'In the print dialog choose scale 100% (actual size). You can also save as PDF.',
    preview: 'Preview', tabCard: 'Card', tabSheet: 'A4 sheet', tabWall: 'Phone', emptyPreview: 'Your card appears here after you choose the stops',
    front: 'Front (GO)', back: 'Back (RETURN)',
    privacy: 'Stops, names and phone numbers stay in this browser. Nothing is sent anywhere.',
    licenses: 'Licenses', credits: 'Timetables: GTFS Data Repository, Mobility Database (operators\' open data) · Map: GSI Tiles · Fonts: BIZ UDPGothic / BIZ UDGothic (SIL Open Font License) · Libraries: fflate, qrcode-generator, holiday_jp (MIT License)',
    change: 'Change', win: { all: 'All', morning: 'Morning 5–10', day: 'Day 10–15', evening: 'Evening 15–19', night: 'Night 19–', custom: 'Custom' },
    hourFrom: 'from', hourTo: 'to', hour: (h) => `${h}:00`,
    catalogLoading: 'Loading the list of operators…', catalogOffline: 'Could not load the list. Please use a ZIP file.',
    catalogCount: (n) => `${n} feeds`, noMatch: 'No matches', pickPref: 'Choose a prefecture or type a name',
    until: (d) => `until ${d}`, expiredTag: 'expired',
    st: { download: 'Downloading', read: 'Reading the file', unzip: 'Unpacking', parse: 'Reading timetables', index: 'Preparing' },
    loaded: (n) => `${n} stops`, range: (a, b) => `Timetable ${a} – ${b}`,
    expired: 'This timetable has expired. Check whether newer data is available.',
    errLoad: (m) => `Could not load (${m})`, errWorker: 'This browser is not supported. Please use a recent Chrome, Edge, Safari or Firefox.',
    poles: (n) => `${n} stop poles`, meters: (m) => `${m} m`, min: (m) => `about ${m} min`, sameName: 'Another stop has the same name',
    geoErr: 'Location is not available', geoWait: 'Finding your location…',
    noReach: 'No stops can be reached without changing buses', building: 'Making your card…',
    built: (a, b) => `Card ready (GO ${a} buses, RETURN ${b} buses)`,
    copied: 'Link copied. It is the same link as the QR code.', copyFail: 'Could not copy. Please select the link below and copy it.',
    noLinkFile: 'Cards made from a ZIP file cannot be remade from a link.', restoring: 'Remaking the card from the link…',
    restoreFail: 'The stops in the link were not found. Please choose them again.', wallMaking: 'Making the wallpaper…',
    restoreMissing: (n) => `The stop "${n}" in the link was not found. Please choose it again.`,
    restoreMany: (n) => `There are several stops named "${n}". Please choose one.`,
    wallHint: 'Open on your phone, long-press the image, save it to Photos and set it as wallpaper', printing: 'Preparing to print…',
    pinOn: 'Bus stop', mapAttr: 'GSI Tiles',
    outPole: 'Where you wait (GO)', backPole: 'Where you wait (RETURN)', poleAll: 'All',
    poleAuto: 'We picked the stop pole with the most buses. You can choose another.', poleCount: (n) => `${n} trips`,
    dataBy: (n) => `${n}`,
  },
};

const today = new Date();
const todayYmd = today.getFullYear() * 10000 + (today.getMonth() + 1) * 100 + today.getDate();
const fmtYmd = (ymd, lang) => {
  if (!ymd) return '';
  const s = String(ymd).replace(/-/g, '');
  const y = +s.slice(0, 4), m = +s.slice(4, 6), d = +s.slice(6, 8);
  return lang === 'en' ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : `${y}/${m}/${d}`;
};
const ymdNum = (v) => (v ? +String(v).replace(/-/g, '').slice(0, 8) : 0);

function safeStore(key, val) {
  try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch { /* storage may be blocked */ }
  return null;
}

const state = {
  ui: safeStore('buscard.ui') || ((navigator.language || 'ja').startsWith('ja') ? 'ja' : 'en'),
  catalog: [], mdbById: new Map(), catalogOk: false,
  source: null, summary: null,
  from: null, to: null, reach: [],
  opts: { owner: '', icon: 'school', outPole: 'auto', backPole: 'auto', outWin: 'all', backWin: 'all', outCustom: [7, 9], backCustom: [15, 18], lang: null, furigana: true, childFare: false, homePhone: '' },
  card: null, full: null, fit: null, notes: null, sheetFit: null, tab: 'card', wallUrl: null, pendingTo: '',
};
const L = () => UI[state.ui];
const cardLang = () => state.opts.lang || state.ui;

// ---------- worker ----------
let worker = null;
let seq = 0;
const pending = new Map();
function startWorker() {
  worker = new Worker(new URL('./worker.js', import.meta.url), { type: 'module' });
  worker.onmessage = (e) => {
    const m = e.data;
    const p = pending.get(m.id);
    if (!p) return;
    if (m.progress) { if (p.onProgress) p.onProgress(m); return; }
    pending.delete(m.id);
    if (m.ok) p.resolve(m.data); else p.reject(new Error(m.error));
  };
  worker.onerror = (e) => {
    e.preventDefault();
    for (const p of pending.values()) p.reject(new Error(e.message || 'worker error'));
    pending.clear();
  };
}
function call(type, payload = {}, onProgress) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject, onProgress });
    worker.postMessage({ id, type, ...payload });
  });
}

// ---------- i18n ----------
function applyUi() {
  const t = L();
  document.documentElement.lang = state.ui;
  document.title = t.appName;
  for (const el of document.querySelectorAll('[data-t]')) {
    const v = t[el.dataset.t];
    if (typeof v === 'string') el.textContent = v;
  }
  for (const b of document.querySelectorAll('.lang-switch button')) b.setAttribute('aria-pressed', String(b.dataset.lang === state.ui));
  $('#print-cards').innerHTML = `${icon('print')}<span>${t.printCards}</span>`;
  $('#print-sheet').innerHTML = `${icon('print')}<span>${t.printSheet}</span>`;
  $('#save-wall').innerHTML = `${icon('image')}<span>${t.saveWall}</span>`;
  $('#copy-link').innerHTML = `${icon('link')}<span>${t.copyLink}</span>`;
  $('#near-btn').innerHTML = `${icon('pin')}<span>${t.nearby}</span>`;
  buildPrefSelect();
  buildIcons();
  buildWinControls('out');
  buildWinControls('back');
  syncCardLang();
  renderFeedList();
  renderChosen();
}

// ---------- step state ----------
function setStep(id, enabled, done = false) {
  const el = $(id);
  el.setAttribute('aria-disabled', String(!enabled));
  el.classList.toggle('done', done);
}
function refreshSteps() {
  const hasFeed = !!state.summary, hasFrom = !!state.from, hasTo = !!state.to;
  setStep('#step-data', true, hasFeed);
  setStep('#step-from', hasFeed, hasFrom);
  setStep('#step-to', hasFrom, hasTo);
  setStep('#step-opts', hasTo, false);
  setStep('#step-out', !!state.card, false);
}

function chip(title, sub, onChange, extra = '') {
  const box = document.createElement('div');
  box.className = 'chip';
  box.innerHTML = `${icon('check', 'ic ic-ok')}<span class="chip-text"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}${extra}</span><button type="button" class="x">${esc(L().change)}</button>`;
  box.querySelector('.x').addEventListener('click', onChange);
  return box;
}

function placeTitle(p) {
  const lang = state.ui;
  if (lang === 'en' && p.en) return `${esc(p.en)} <span class="jp">${esc(p.name)}</span>`;
  return `${esc(p.name)}${p.reading && p.reading !== p.name ? ` <span class="rd">${esc(p.reading)}</span>` : ''}`;
}

function renderChosen() {
  const t = L();
  const dc = $('#data-chosen'), dp = $('#data-pick');
  dc.replaceChildren();
  if (state.summary) {
    const s = state.summary;
    const name = state.source.title;
    const range = s.range ? t.range(fmtYmd(s.range.start, state.ui), fmtYmd(s.range.end, state.ui)) : '';
    dc.append(chip(esc(name), esc([s.agencies.slice(0, 2).join('・'), t.loaded(s.places), range].filter(Boolean).join('　')), resetFeed));
    if (s.range && s.range.end < todayYmd) dc.insertAdjacentHTML('beforeend', `<p class="note warn">${esc(t.expired)}</p>`);
  }
  dc.hidden = !state.summary;
  dp.hidden = !!state.summary;
  const fc = $('#from-chosen'), fp = $('#from-pick');
  fc.replaceChildren();
  if (state.from) fc.append(chip(placeTitle(state.from), esc(state.from.routes.join('・')), resetFrom));
  fc.hidden = !state.from;
  fp.hidden = !!state.from;
  const tc = $('#to-chosen'), tp = $('#to-pick');
  tc.replaceChildren();
  if (state.to) tc.append(chip(placeTitle(state.to), esc(state.to.minutes ? t.min(state.to.minutes) : ''), resetTo));
  tc.hidden = !state.to;
  tp.hidden = !!state.to;
  refreshSteps();
}

// ---------- catalog ----------
function licenseName(url, name) {
  if (name) return name;
  const m = /creativecommons\.org\/(licenses|publicdomain)\/([a-z-]+)\/([\d.]+)/i.exec(url || '');
  if (!m) return '';
  return m[1] === 'publicdomain' ? `CC0 ${m[3]}` : `CC ${m[2].toUpperCase()} ${m[3]}`;
}

async function loadCatalog() {
  const status = $('#catalog-status');
  status.textContent = L().catalogLoading;
  const fallbackP = fetch(new URL('../data/feeds_fallback.json', import.meta.url)).then((r) => r.json()).catch(() => []);
  let list = null;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 12000);
    const r = await fetch(`${API}/feeds`, { mode: 'cors', credentials: 'omit', signal: ctl.signal });
    clearTimeout(timer);
    if (r.ok) {
      const j = await r.json();
      const body = Array.isArray(j) ? j : j.body;
      if (Array.isArray(body) && body.length) {
        list = body.filter((f) => !f.feed_is_discontinued && f.organization_id && f.feed_id).map((f) => ({
          key: `${f.organization_id}/${f.feed_id}`, org: f.organization_id, feed: f.feed_id, orgName: f.organization_name || '', name: f.feed_name || f.organization_name || '',
          pref: +(f.feed_pref_id || f.organization_pref_id || 0), license: licenseName(f.feed_license_url, f.feed_license), licenseUrl: f.feed_license_url || '',
          end: ymdNum(f.latest_feed_end_date), api: true,
        }));
      }
    }
  } catch { /* fall back to the bundled list */ }
  const fb = await fallbackP;
  const fromFallback = (f) => ({
    key: f.organization_id ? `${f.organization_id}/${f.feed_id}` : `mdb:${f.mdb_id}`, org: f.organization_id, feed: f.feed_id,
    orgName: f.organization_name || '', name: f.feed_name || f.organization_name || '', pref: +f.feed_pref_id || 0,
    license: licenseName(f.feed_license_url), licenseUrl: f.feed_license_url || '', end: 0, api: false, mdb: f.mdb_id,
  });
  for (const f of fb) if (f.organization_id) state.mdbById.set(`${f.organization_id}/${f.feed_id}`, f.mdb_id);
  // Feeds outside the repository (for example ODPT) come from the Mobility Database.
  const extra = fb.filter((f) => !f.organization_id).map(fromFallback);
  list = list ? list.concat(extra) : fb.map(fromFallback);
  state.catalog = list.sort((a, b) => a.pref - b.pref || a.name.localeCompare(b.name, 'ja'));
  state.catalogOk = list.length > 0;
  status.textContent = state.catalogOk ? '' : L().catalogOffline;
  buildPrefSelect();
  renderFeedList();
}

function buildPrefSelect() {
  const sel = $('#pref');
  const t = L();
  const cur = sel.value;
  const counts = new Map();
  for (const f of state.catalog) counts.set(f.pref, (counts.get(f.pref) || 0) + 1);
  const names = state.ui === 'en' ? PREFS_EN : PREFS;
  let html = `<option value="">${esc(t.prefPick)}</option><option value="all">${esc(t.prefAll)}</option>`;
  for (let i = 1; i <= 47; i++) if (counts.get(i)) html += `<option value="${i}">${esc(names[i])}（${counts.get(i)}）</option>`;
  sel.innerHTML = html;
  sel.value = cur;
}

function renderFeedList() {
  const ul = $('#feed-list');
  const t = L();
  const pref = $('#pref').value;
  const q = normName($('#feed-q').value);
  if (!state.catalog.length) { ul.replaceChildren(); return; }
  if (!pref && !q) { ul.innerHTML = `<li class="li-note">${esc(t.pickPref)}</li>`; return; }
  const items = state.catalog.filter((f) => (!pref || pref === 'all' || f.pref === +pref)
    && (!q || normName(f.name).includes(q) || normName(f.orgName).includes(q)));
  if (!items.length) { ul.innerHTML = `<li class="li-note">${esc(t.noMatch)}</li>`; return; }
  ul.innerHTML = items.slice(0, 200).map((f) => {
    const expired = f.end && f.end < todayYmd;
    const sub = [f.orgName !== f.name ? f.orgName : '', state.ui === 'en' ? PREFS_EN[f.pref] : PREFS[f.pref], f.end ? t.until(fmtYmd(f.end, state.ui)) : ''].filter(Boolean).join('・');
    return `<li><button type="button" data-k="${esc(f.key)}"><span class="nm">${esc(f.name)}${expired ? ` <em class="tag">${esc(t.expiredTag)}</em>` : ''}</span><span class="sub">${esc(sub)}</span></button></li>`;
  }).join('');
}

function feedUrls(key) {
  const mdbUrls = (id) => [`https://files.mobilitydatabase.org/${id}/latest.zip`, `https://storage.googleapis.com/mobilitydata-datasets-prod/${id}/latest.zip`];
  if (key.startsWith('mdb:')) return mdbUrls(key.slice(4));
  const [org, feed] = key.split('/');
  const mdb = state.mdbById.get(key) || `jbda-${org}-${feed}`;
  return [`${API}/organizations/${encodeURIComponent(org)}/feeds/${encodeURIComponent(feed)}/files/feed.zip?rid=current`, ...mdbUrls(mdb)];
}

// ---------- loading a feed ----------
async function loadFeed(source, payload) {
  const t = L();
  const box = $('#load-box'), st = $('#load-status'), bar = $('#load-bar');
  resetFeed(false);
  box.hidden = false;
  st.classList.remove('err');
  bar.style.width = '2%';
  st.textContent = t.st[payload.file ? 'read' : 'download'];
  try {
    const summary = await call('load', payload, (m) => {
      const tt = L();
      if (m.progress === 'download') {
        const mb = (m.got / 1048576).toFixed(1);
        st.textContent = `${tt.st.download}… ${mb} MB`;
        bar.style.width = m.total ? `${Math.min(60, (m.got / m.total) * 60)}%` : `${Math.min(55, 5 + m.got / 200000)}%`;
      } else if (m.progress === 'parse') {
        st.textContent = `${tt.st.parse}…（${m.table}）`;
        bar.style.width = `${Math.min(92, parseFloat(bar.style.width) + 4)}%`;
      } else {
        st.textContent = `${tt.st[m.progress] || m.progress}…`;
        bar.style.width = m.progress === 'index' ? '95%' : m.progress === 'unzip' ? '62%' : bar.style.width;
      }
    });
    bar.style.width = '100%';
    state.source = source;
    state.summary = summary;
    box.hidden = true;
    renderChosen();
    $('#from-q').focus();
    return true;
  } catch (e) {
    st.textContent = t.errLoad(e.message);
    st.classList.add('err');
    bar.style.width = '0';
    return false;
  }
}

function resetFeed(render = true) {
  state.source = null; state.summary = null; state.pendingTo = '';
  resetFrom(false);
  if (render) { renderChosen(); renderFeedList(); }
}

// ---------- step 2 / 3 ----------
function stopItem(p, extra = '') {
  const t = L();
  const sub = [p.routes.slice(0, 3).join('・'), p.poles > 1 ? t.poles(p.poles) : '', extra].filter(Boolean).join('　');
  return `<li><button type="button" data-id="${p.id}"><span class="nm">${placeTitle(p)}</span><span class="sub">${esc(sub)}${p.dup ? `<em class="tag">${esc(t.sameName)}</em>` : ''}</span></button></li>`;
}

let searchTimer = 0;
let searchToken = 0;
async function fromSearch(q) {
  const ul = $('#from-list');
  const tok = ++searchToken;
  if (!q || !state.summary) { ul.replaceChildren(); $('#from-status').textContent = ''; return; }
  const res = await call('search', { q, limit: 30 });
  if (tok !== searchToken) return;
  ul.innerHTML = res.map((p) => stopItem(p)).join('');
  $('#from-status').textContent = res.length ? '' : L().noMatch;
  ul._items = res;
}
function onFromInput() {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => fromSearch($('#from-q').value.trim()), 120);
}

function nearby() {
  const t = L();
  const status = $('#from-status');
  if (!navigator.geolocation) { status.textContent = t.geoErr; return; }
  status.textContent = t.geoWait;
  navigator.geolocation.getCurrentPosition(async (pos) => {
    const res = await call('nearest', { lat: pos.coords.latitude, lon: pos.coords.longitude, limit: 8 });
    const ul = $('#from-list');
    ul.innerHTML = res.map((p) => stopItem(p, t.meters(p.meters))).join('');
    ul._items = res;
    status.textContent = '';
  }, () => { status.textContent = t.geoErr; }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
}

async function chooseFrom(p) {
  state.from = p;
  if (!state.restoring) { state.opts.outPole = 'auto'; state.opts.backPole = 'auto'; }
  state.to = null; state.card = null; state.full = null;
  renderChosen();
  renderPreview();
  const ul = $('#to-list');
  ul.replaceChildren();
  $('#to-q').value = '';
  const res = await call('reachable', { from: p.id, limit: 400 });
  state.reach = res;
  // A remake link that needed a choice of the boarding stop still knows the name of the other stop.
  if (state.pendingTo && !state.restoring) { $('#to-q').value = state.pendingTo; state.pendingTo = ''; }
  renderReach();
  $('#to-status').textContent = res.length ? ($('#to-q').value && !$('#to-list').children.length ? L().noMatch : '') : L().noReach;
  if (!state.restoring) $('#to-q').focus();
}

function renderReach() {
  const q = normName($('#to-q').value);
  const t = L();
  const items = state.reach.filter((p) => !q || normName(p.name).includes(q) || normName(p.reading).includes(q) || (p.en || '').toLowerCase().includes($('#to-q').value.trim().toLowerCase()));
  const ul = $('#to-list');
  ul.innerHTML = items.slice(0, 150).map((p) => stopItem(p, p.minutes ? t.min(p.minutes) : '')).join('');
  ul._items = items;
  if (state.reach.length) $('#to-status').textContent = items.length ? '' : t.noMatch;
}

async function chooseTo(p) {
  state.to = p;
  if (!state.restoring) { state.opts.outPole = 'auto'; state.opts.backPole = 'auto'; }
  renderChosen();
  await buildCard();
  if (!state.restoring && matchMedia('(max-width: 900px)').matches) $('.preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetFrom(render = true) {
  state.from = null;
  resetTo(false);
  $('#from-list').replaceChildren();
  if (render) { renderChosen(); $('#from-q').focus(); }
}
function resetTo(render = true) {
  state.to = null; state.card = null; state.full = null; state.fit = null;
  updateHash();
  renderPreview();
  if (render) { renderChosen(); renderReach(); $('#to-q').focus(); }
}

// ---------- step 4: settings ----------
function buildIcons() {
  const box = $('#icons');
  const lang = state.ui;
  box.innerHTML = PLACE_ICONS.filter(([k]) => k !== 'home').map(([k, label]) => `<button type="button" data-icon="${k}" aria-pressed="${k === state.opts.icon}">${icon(k)}<span>${esc(label[lang] || label.ja)}</span></button>`).join('');
}

function hourOptions(sel, from, to) {
  let h = '';
  for (let i = from; i <= to; i++) h += `<option value="${i}"${i === sel ? ' selected' : ''}>${esc(L().hour(i))}</option>`;
  return h;
}

function buildWinControls(dir) {
  const t = L();
  const seg = $(`#win-${dir}`);
  const cur = state.opts[dir + 'Win'];
  seg.innerHTML = WINS.map(([k]) => `<button type="button" data-w="${k}" aria-pressed="${k === cur}">${esc(t.win[k])}</button>`).join('');
  const box = $(`#win-${dir}-custom`);
  const [a, b] = state.opts[dir + 'Custom'];
  box.innerHTML = `<label class="field"><select data-c="0" aria-label="${esc(t.hourFrom)}">${hourOptions(a, 4, 26)}</select></label><span>${esc(t.hourFrom)}</span>
    <label class="field"><select data-c="1" aria-label="${esc(t.hourTo)}">${hourOptions(b, 5, 27)}</select></label><span>${esc(t.hourTo)}</span>`;
  box.hidden = cur !== 'custom';
}

function winSec(dir) {
  const k = state.opts[dir + 'Win'];
  if (k === 'all') return null;
  const hrs = k === 'custom' ? state.opts[dir + 'Custom'] : WINS.find((w) => w[0] === k)[1];
  const a = Math.min(hrs[0], hrs[1]), b = Math.max(hrs[0], hrs[1]);
  return [a * 3600, (b === a ? a + 1 : b) * 3600 - 1];
}

function syncCardLang() {
  const lang = cardLang();
  for (const b of document.querySelectorAll('#card-lang button')) b.setAttribute('aria-pressed', String(b.dataset.v === lang));
  $('#furigana').closest('label').hidden = lang === 'en';
}

function renderOpts(extra = {}) {
  const o = state.opts;
  return { lang: cardLang(), furigana: o.furigana, owner: o.owner.trim(), icon: o.icon, childFare: o.childFare, homePhone: o.homePhone.trim(), ...extra };
}
// Options with the fitted card layout (how many times per side, and where the "different days" note fits).
const fitOpts = () => renderOpts({ max: state.fit, notes: state.notes });

function renderPoleControls() {
  const t = L();
  for (const dir of ['out', 'back']) {
    const d = state.card && (dir === 'out' ? state.card.outbound : state.card.inbound);
    const box = $(`#pole-${dir}-box`);
    const stats = d ? d.poleStats : [];
    box.hidden = !stats || stats.length < 2;
    if (box.hidden) continue;
    const cur = d.poleChoice === 'all' ? 'all' : d.poleChoice === 'auto' ? stats[0].id : state.opts[dir + 'Pole'];
    $(`#pole-${dir}`).innerHTML = `<button type="button" data-p="all" aria-pressed="${cur === 'all'}">${esc(t.poleAll)}</button>`
      + stats.map((p) => `<button type="button" data-p="${esc(p.id)}" aria-pressed="${cur === p.id}">${esc(p.text || p.id)}<small>${esc(t.poleCount(p.count))}</small></button>`).join('');
    $(`#pole-${dir}-note`).textContent = d.poleChoice === 'auto' ? t.poleAuto : '';
  }
}

// ---------- card ----------
let buildToken = 0;
async function buildCard() {
  if (!state.from || !state.to) return;
  const t = L();
  const tok = ++buildToken;
  $('#preview-status').textContent = t.building;
  const req = { from: state.from.id, to: state.to.id, todayYmd, lang: cardLang(), outWindow: winSec('out'), backWindow: winSec('back'), outPole: state.opts.outPole, backPole: state.opts.backPole };
  try {
    const card = await call('card', { opts: req });
    const full = req.outWindow || req.backWindow ? await call('card', { opts: { ...req, outWindow: null, backWindow: null } }) : card;
    if (tok !== buildToken) return;
    state.card = card;
    state.full = full;
    renderPoleControls();
    await refit();
    if (tok !== buildToken) return;
    refreshSteps();
    updateHash();
    renderPreview();
    $('#preview-status').textContent = t.built(card.outbound?.count || 0, card.inbound?.count || 0);
  } catch (e) {
    $('#preview-status').textContent = t.errLoad(e.message);
  }
}

// Measures the printed layout offscreen so nothing gets cut off.
const measure = (() => {
  const el = document.createElement('div');
  el.className = 'measure';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);
  return el;
})();

async function settle() {
  void measure.offsetHeight;
  await document.fonts.ready;
}

async function refit() {
  if (!state.card) return;
  const o = renderOpts();
  const max = { out: 40, back: 40 };
  for (let i = 0; i < 10; i++) {
    const { front, back } = renderCards(state.card, { ...o, max });
    measure.innerHTML = front + back;
    await settle();
    const [f, b] = measure.querySelectorAll('.c-times');
    const of = f && f.scrollHeight > f.clientHeight + 1;
    const ob = b && b.scrollHeight > b.clientHeight + 1;
    if (!of && !ob) break;
    if (of) max.out = Math.max(6, max.out - 4);
    if (ob) max.back = Math.max(6, max.back - 4);
  }
  state.fit = max;
  const truncated = /t-more/.test(measure.innerHTML);
  $('#overflow-note').hidden = !truncated;
  // "※じこくが ちがう日 あり → A4シート": only on a side where it fits under the times, never instead of times.
  const notes = { out: false, back: false };
  const want = { out: !!state.card.outbound?.special?.length, back: !!state.card.inbound?.special?.length };
  if (want.out || want.back) {
    const { front, back } = renderCards(state.card, { ...o, max, notes: want });
    measure.innerHTML = front + back;
    await settle();
    // No rounding allowance here: the note must not push anything out of the box, not even a pixel.
    const fits = (box) => {
      const n = box && box.querySelector('.c-note');
      if (!n || box.scrollHeight > box.clientHeight || box.scrollWidth > box.clientWidth) return false;
      const r = box.getBoundingClientRect(), nr = n.getBoundingClientRect();
      return nr.bottom <= r.bottom + 0.5 && nr.right <= r.right + 0.5;
    };
    const [f, b] = measure.querySelectorAll('.c-times');
    notes.out = want.out && fits(f);
    notes.back = want.back && fits(b);
  }
  state.notes = notes;
  // A4 sheet: try roomier layouts first.
  const extra = sheetExtra();
  // When the cut-out card does not fit, it is left out: the card sheet prints it four times anyway.
  state.sheetFit = { dense: 3, noCut: true };
  for (const [dense, noCut] of [[0, false], [1, false], [0, true], [1, true], [2, true], [3, true]]) {
    measure.innerHTML = renderSheet(state.full, fitOpts(), { ...extra, dense, noCut });
    await settle();
    const sheet = measure.querySelector('.sheet');
    if (sheet.offsetHeight <= 297 * MM + 1) { state.sheetFit = { dense, noCut }; break; }
  }
  measure.replaceChildren();
}

function remakeUrl() {
  if (!state.source || !state.source.key || !state.from || !state.to || !state.card) return '';
  const o = state.opts;
  const w = (dir) => (o[dir + 'Win'] === 'custom' ? `c${o[dir + 'Custom'][0]}-${o[dir + 'Custom'][1]}` : o[dir + 'Win']);
  const p = new URLSearchParams();
  p.set('f', state.source.key);
  // Stop id of the first pole, and the stop name: a newer timetable may give the stop a new id.
  p.set('a', state.card.stopIds.from);
  p.set('an', state.from.name);
  p.set('b', state.card.stopIds.to);
  p.set('bn', state.to.name);
  p.set('i', o.icon);
  if (o.outPole !== 'auto') p.set('op', o.outPole);
  if (o.backPole !== 'auto') p.set('bp', o.backPole);
  if (o.outWin !== 'all') p.set('ow', w('out'));
  if (o.backWin !== 'all') p.set('bw', w('back'));
  p.set('l', cardLang());
  if (!o.furigana) p.set('r', '0');
  if (o.childFare) p.set('c', '1');
  return `${location.origin}${location.pathname}#${p.toString()}`;
}

function updateHash() {
  const url = remakeUrl();
  try { history.replaceState(null, '', url || `${location.pathname}${location.search}`); } catch { /* ignore */ }
}

function qrSvg(text) {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true, title: 'QR' });
}

// Small static map of the boarding stop (tiles stitched together, no map library).
function lonLatPx(lon, lat, z) {
  const n = 256 * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return [((lon + 180) / 360) * n, (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n];
}
function staticMap(d, poles, wMm, hMm) {
  if (!d || !d.variants.length) return '';
  const boards = [...new Map(d.variants.map((v) => [v.board.stop, v])).values()];
  const valid = boards.filter((v) => v.board.lat || v.board.lon);
  if (!valid.length) return '';
  const W = wMm * MM, H = hMm * MM;
  // Closest zoom that keeps every boarding pole in view.
  let z = 18;
  for (; z > 14; z--) {
    const pts = valid.map((v) => lonLatPx(v.board.lon, v.board.lat, z));
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    if (Math.max(...xs) - Math.min(...xs) <= W * 0.7 && Math.max(...ys) - Math.min(...ys) <= H * 0.5) break;
  }
  z = Math.min(z, 17);
  const pts = valid.map((v) => lonLatPx(v.board.lon, v.board.lat, z));
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2, cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const left = cx - W / 2, top = cy - H / 2 - 8;
  let tiles = '';
  for (let x = Math.floor(left / 256); x <= Math.floor((left + W) / 256); x++) {
    for (let y = Math.floor(top / 256); y <= Math.floor((top + H) / 256); y++) {
      tiles += `<img src="${TILE.replace('{z}', z).replace('{x}', x).replace('{y}', y)}" style="left:${(x * 256 - left).toFixed(1)}px;top:${(y * 256 - top).toFixed(1)}px" alt="" loading="eager" decoding="async">`;
    }
  }
  const t = UI[cardLang()];
  const boardSet = new Set(valid.map((v) => v.board.stop));
  const others = (poles || []).filter((p) => !boardSet.has(p.stop) && (p.lat || p.lon)).map((p) => {
    const [px, py] = lonLatPx(p.lon, p.lat, z);
    return `<span class="dot" style="left:${(px - left).toFixed(1)}px;top:${(py - top).toFixed(1)}px"></span>`;
  }).join('');
  const pins = valid.map((v, i) => {
    const [px, py] = pts[i];
    const label = d.mode === 'pole' ? `${v.mark || ''} ${v.board.text || t.pinOn}`.trim() : (v.board.platform ? v.board.text : t.pinOn);
    return `<span class="pin" style="left:${(px - left).toFixed(1)}px;top:${(py - top).toFixed(1)}px"><b>${esc(label)}</b><i></i></span>`;
  }).join('');
  return `<div class="tiles">${tiles}</div>${others}${pins}<span class="attr">${esc(t.mapAttr)}</span>`;
}

function sheetExtra() {
  const card = state.full;
  const url = remakeUrl();
  const src = state.source || {};
  const t = UI[cardLang()];
  const mapW = 91, mapH = 30;
  return {
    qr: url ? qrSvg(url) : '',
    credit: src.credit || card.feedInfo.publisher || card.agency.name,
    license: src.license || '',
    mapCredit: `${cardLang() === 'en' ? 'Map' : '地図'}：${t.mapAttr}`,
    todayYmd,
    pocket: state.card,
    win: { out: winSec('out'), back: winSec('back') },
    maps: { out: staticMap(card.outbound, state.card.poles.from, mapW, mapH), back: staticMap(card.inbound, state.card.poles.to, mapW, mapH) },
  };
}

function sheetHtml() {
  return renderSheet(state.full, fitOpts(), { ...sheetExtra(), ...state.sheetFit });
}
function cardSheetHtml() {
  return renderCardSheet(state.card, fitOpts(), 4);
}

// ---------- preview ----------
function fitInto(html, naturalW, maxScale = 1.6) {
  const stage = $('#stage');
  stage.innerHTML = `<div class="fit-box"><div class="fit">${html}</div></div>`;
  const box = stage.firstElementChild, inner = box.firstElementChild;
  const avail = stage.clientWidth - 32;
  const k = Math.min(maxScale, avail / naturalW);
  inner.style.width = `${naturalW}px`;
  inner.style.transform = `scale(${k})`;
  box.style.height = `${inner.offsetHeight * k}px`;
}

async function renderPreview() {
  const stage = $('#stage');
  for (const b of document.querySelectorAll('.tabs button')) b.setAttribute('aria-selected', String(b.dataset.tab === state.tab));
  if (!state.card) {
    stage.innerHTML = '';
    stage.append(emptyEl);
    $('#overflow-note').hidden = true;
    return;
  }
  const t = L();
  const o = fitOpts();
  if (state.tab === 'card') {
    const { front, back } = renderCards(state.card, o);
    const narrow = stage.clientWidth < 560;
    fitInto(`<div class="pair-view${narrow ? ' pair-col' : ''}"><figure>${front}<figcaption>${esc(t.front)}</figcaption></figure><figure>${back}<figcaption>${esc(t.back)}</figcaption></figure></div>`, (narrow ? 85 : 176) * MM + 2, narrow ? 2 : 1.6);
  } else if (state.tab === 'sheet') {
    fitInto(`<div class="sheet-view">${sheetHtml()}</div>`, 210 * MM, 1);
  } else {
    stage.innerHTML = `<div class="wall-view"><p class="status">${esc(t.wallMaking)}</p></div>`;
    const url = await wallpaperUrl();
    if (state.tab !== 'wall') return;
    stage.innerHTML = `<div class="wall-view"><img src="${url}" alt="${esc(t.tabWall)}"><p class="tiny">${esc(t.wallHint)}</p></div>`;
  }
}

let wallKey = '';
async function wallpaperUrl() {
  const o = renderOpts({ max: state.fit });
  const key = JSON.stringify([state.card.stopIds, o, state.opts.outWin, state.opts.backWin, state.opts.outCustom, state.opts.backCustom]);
  if (state.wallUrl && key === wallKey) return state.wallUrl;
  const blob = await makeWallpaper(state.card, o);
  if (state.wallUrl) URL.revokeObjectURL(state.wallUrl);
  state.wallUrl = URL.createObjectURL(blob);
  wallKey = key;
  return state.wallUrl;
}

const emptyEl = $('#empty');

// ---------- print / save ----------
async function waitImages(root, ms) {
  const imgs = [...root.querySelectorAll('img')].filter((i) => !i.complete);
  await Promise.race([
    Promise.all(imgs.map((i) => new Promise((r) => { i.onload = r; i.onerror = r; }))),
    new Promise((r) => setTimeout(r, ms)),
  ]);
}

async function doPrint(kind) {
  if (!state.card) return;
  const t = L();
  const root = $('#print-root');
  $('#out-status').textContent = t.printing;
  root.innerHTML = kind === 'cards' ? cardSheetHtml() : sheetHtml();
  await document.fonts.ready;
  await waitImages(root, 5000);
  const title = document.title;
  const base = `${state.from.name}-${state.to.name}`.replace(/[\\/:*?"<>|]/g, '');
  document.title = `${kind === 'cards' ? 'buscard' : 'bussheet'}_${base}`;
  $('#out-status').textContent = '';
  window.print();
  setTimeout(() => { document.title = title; }, 500);
}

async function saveWallpaper() {
  if (!state.card) return;
  $('#out-status').textContent = L().wallMaking;
  const url = await wallpaperUrl();
  const a = document.createElement('a');
  a.href = url;
  a.download = `buscard_${state.from.name}-${state.to.name}.png`.replace(/[\\/:*?"<>|]/g, '');
  document.body.append(a);
  a.click();
  a.remove();
  $('#out-status').textContent = '';
}

async function copyLink() {
  const t = L();
  const out = $('#out-status');
  const url = remakeUrl();
  if (!url) { out.textContent = t.noLinkFile; return; }
  try {
    await navigator.clipboard.writeText(url);
    out.textContent = t.copied;
  } catch {
    out.innerHTML = `${esc(t.copyFail)}<br><input type="text" class="linkbox" readonly value="${esc(url)}">`;
    const box = out.querySelector('input');
    box.focus();
    box.select();
  }
}

// ---------- restore from a remake link ----------
async function restoreFromHash() {
  const h = location.hash.slice(1);
  if (!h) return;
  const p = new URLSearchParams(h);
  const f = p.get('f'), a = p.get('a'), b = p.get('b');
  if (!f || !a || !b) return;
  const t = L();
  state.restoring = true;
  const o = state.opts;
  if (p.get('i') && PLACE_ICONS.some(([k]) => k === p.get('i'))) o.icon = p.get('i');
  const readWin = (v, dir) => {
    if (!v) return;
    const m = /^c(\d+)-(\d+)$/.exec(v);
    if (m) { o[dir + 'Win'] = 'custom'; o[dir + 'Custom'] = [+m[1], +m[2]]; } else if (WINS.some((w) => w[0] === v)) o[dir + 'Win'] = v;
  };
  if (p.get('op')) o.outPole = p.get('op');
  if (p.get('bp')) o.backPole = p.get('bp');
  readWin(p.get('ow'), 'out');
  readWin(p.get('bw'), 'back');
  if (p.get('l') === 'en' || p.get('l') === 'ja') o.lang = p.get('l');
  o.furigana = p.get('r') !== '0';
  o.childFare = p.get('c') === '1';
  syncControls();
  $('#preview-status').textContent = t.restoring;
  const entry = state.catalog.find((x) => x.key === f);
  const ok = await loadFeed(sourceOf(entry || { key: f, name: f.replace(/^mdb:/, ''), orgName: '' }), { urls: feedUrls(f) });
  if (ok) {
    // Links made since 2026-11-09 also carry the stop names (an, bn), used when a stop id is not found.
    const an = (p.get('an') || '').trim(), bn = (p.get('bn') || '').trim();
    const r = await call('resolve', { a: { stopId: a, name: an }, b: { stopId: b, name: bn } });
    if (r.from) await chooseFrom(r.from);
    if (r.from && r.to) {
      const reach = state.reach.find((x) => x.id === r.to.id);
      await chooseTo(reach || r.to);
    } else {
      // Not sure which stop the link means: ask instead of guessing, with its name already filled in.
      const name = r.need === 'from' ? an : bn;
      const msg = !name ? t.restoreFail : r.count > 1 ? t.restoreMany(name) : t.restoreMissing(name);
      state.restoring = false;
      if (r.need === 'from') {
        state.pendingTo = bn;
        if (an) { $('#from-q').value = an; await fromSearch(an); }
        $('#from-status').textContent = msg;
      } else {
        if (bn) { $('#to-q').value = bn; renderReach(); }
        $('#to-status').textContent = msg;
      }
      $('#preview-status').textContent = msg;
    }
  }
  state.restoring = false;
}

function sourceOf(f) {
  return { key: f.key, title: f.name, credit: f.orgName || f.name, license: f.license || '' };
}

function syncControls() {
  const o = state.opts;
  $('#owner').value = o.owner;
  $('#furigana').checked = o.furigana;
  $('#child-fare').checked = o.childFare;
  $('#home-phone').value = o.homePhone;
  buildIcons();
  buildWinControls('out');
  buildWinControls('back');
  syncCardLang();
}

// ---------- events ----------
let rerenderTimer = 0;
function softRerender() {
  clearTimeout(rerenderTimer);
  rerenderTimer = setTimeout(async () => { await refit(); renderPreview(); }, 160);
}

function bind() {
  for (const b of document.querySelectorAll('.lang-switch button')) {
    b.addEventListener('click', () => {
      const prevCard = cardLang();
      state.ui = b.dataset.lang;
      safeStore('buscard.ui', state.ui);
      applyUi();
      if (cardLang() !== prevCard && state.card) buildCard(); else renderPreview();
    });
  }
  $('#pref').addEventListener('change', renderFeedList);
  $('#feed-q').addEventListener('input', renderFeedList);
  $('#feed-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-k]');
    if (!btn) return;
    const f = state.catalog.find((x) => x.key === btn.dataset.k);
    if (f) loadFeed(sourceOf(f), { urls: feedUrls(f.key) });
  });
  const zip = $('#zip');
  const fromFile = (file) => { if (file) loadFeed({ title: file.name.replace(/\.zip$/i, ''), credit: '', license: '' }, { file }); };
  zip.addEventListener('change', () => fromFile(zip.files[0]));
  const drop = $('#drop');
  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('over'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('over'));
  drop.addEventListener('drop', (e) => { e.preventDefault(); drop.classList.remove('over'); fromFile(e.dataTransfer.files[0]); });

  $('#from-q').addEventListener('input', onFromInput);
  $('#near-btn').addEventListener('click', nearby);
  $('#from-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const p = $('#from-list')._items.find((x) => x.id === +btn.dataset.id);
    if (p) chooseFrom(p);
  });
  $('#to-q').addEventListener('input', renderReach);
  $('#to-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-id]');
    if (!btn) return;
    const p = $('#to-list')._items.find((x) => x.id === +btn.dataset.id);
    if (p) chooseTo(p);
  });

  $('#owner').addEventListener('input', (e) => { state.opts.owner = e.target.value; softRerender(); });
  $('#home-phone').addEventListener('input', (e) => { state.opts.homePhone = e.target.value; softRerender(); });
  $('#furigana').addEventListener('change', (e) => { state.opts.furigana = e.target.checked; updateHash(); softRerender(); });
  $('#child-fare').addEventListener('change', (e) => { state.opts.childFare = e.target.checked; updateHash(); softRerender(); });
  $('#icons').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-icon]');
    if (!btn) return;
    state.opts.icon = btn.dataset.icon;
    for (const x of document.querySelectorAll('#icons button')) x.setAttribute('aria-pressed', String(x === btn));
    updateHash();
    renderPreview();
  });
  for (const dir of ['out', 'back']) {
    $(`#pole-${dir}`).addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-p]');
      if (!btn) return;
      state.opts[dir + 'Pole'] = btn.dataset.p;
      buildCard();
    });
    $(`#win-${dir}`).addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-w]');
      if (!btn) return;
      state.opts[dir + 'Win'] = btn.dataset.w;
      buildWinControls(dir);
      buildCard();
    });
    $(`#win-${dir}-custom`).addEventListener('change', (e) => {
      const sel = e.target.closest('select[data-c]');
      if (!sel) return;
      state.opts[dir + 'Custom'][+sel.dataset.c] = +sel.value;
      buildCard();
    });
  }
  $('#card-lang').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-v]');
    if (!btn) return;
    state.opts.lang = btn.dataset.v;
    syncCardLang();
    buildCard();
  });
  for (const b of document.querySelectorAll('.tabs button')) {
    b.addEventListener('click', () => { state.tab = b.dataset.tab; renderPreview(); });
    b.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      const tabs = [...document.querySelectorAll('.tabs button')];
      const i = (tabs.indexOf(b) + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
      tabs[i].focus();
      tabs[i].click();
    });
  }
  $('#print-cards').addEventListener('click', () => doPrint('cards'));
  $('#print-sheet').addEventListener('click', () => doPrint('sheet'));
  $('#save-wall').addEventListener('click', saveWallpaper);
  $('#copy-link').addEventListener('click', copyLink);
  window.addEventListener('afterprint', () => { $('#print-root').replaceChildren(); });
  let rt = 0;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (state.tab !== 'wall') renderPreview(); }, 150); });
}

async function main() {
  try { startWorker(); } catch {
    $('#catalog-status').textContent = L().errWorker;
    return;
  }
  bind();
  applyUi();
  refreshSteps();
  await loadCatalog();
  await restoreFromHash();
}

main();

// For automated checks.
window.__buscard = { state, call, buildCard, refit, sheetHtml, cardSheetHtml };
