// Turns a card model into printable HTML (pocket card front/back and the A4 sheet).
import { icon } from './icons.js';

// "12/29〜12/31 は", but "1/1・1/11（祝）は" (no space after a closing bracket)
const wa = (d) => (/[）)]$/.test(d) ? `${d}は` : `${d} は`);

export const T = {
  ja: {
    title: 'わたしの バスカード', owner: (n) => `${n} の バスカード`,
    out: 'いき', back: 'かえり', board: 'のる', alight: 'おりる', yuki: 'ゆき',
    any: 'どのバスでも だいじょうぶ', anyLong: (to) => `この のりばに くる バスは、どれでも ${to} に とまります`,
    anyDest: (d) => `「${d}」ゆきなら どれでも OK`, anyDestLong: (d) => `まえに「${d}」と でている バスなら、どれに のっても だいじょうぶ`,
    anyDests: 'この いきさきなら どれでも OK', anyDestsLong: 'まえに つぎの いきさきが でている バスなら、どれに のっても だいじょうぶ',
    toward: 'ほうこう', platform: (p) => `${p}ばん のりば`,
    bell: (prev) => `${prev} を でたら ボタン`, bellNext: 'のったら すぐ ボタン（つぎで おりる）',
    fare: 'うんちん', adult: 'おとな', child: 'こども', yen: (n) => `${n.toLocaleString('ja-JP')}円`,
    min: (m) => `やく ${m} ぷん`, none: 'バスは ありません', more: (n) => `ほか ${n}本`,
    special: 'じこくが ちがう日', etc: 'など', phone: 'こまったら', home: 'いえ',
    valid: (d) => `${d} まで の じこく`, made: (d) => `${d} つくりました`,
    legendCode: 'じこくの よこの ばんごうは、バスの まえに でている 番号です',
    others: (n) => `ほか ${n} つの いきさき`, booking: '☎ は よやくが ひつようです',
    remake: 'じこくが かわったら この QRで つくりなおせます',
    stepGo: (s) => `${s} の のりばへ`, stepRide: 'この バスに のる', stepBell: 'ボタンを おす', stepOff: (s) => `${s} で おりる`,
    timetable: 'じこくひょう', hour: 'じ', credit: 'データ', ver: 'データの 版', cutCard: 'きりとって、まんなかで おると カードに なります（定期入れサイズ）',
    expired: 'このデータは ダイヤの きげんが すぎています', from: (d) => `${d} から の じこく`,
    freq: (a, b, n) => `${a}〜${b}　1時間に やく${n}本`,
    noDirect: 'この むきに のりかえなしで いける バスは ありません',
    inWin: 'きいろの 時間は カードに のせた じこくです',
    ruler: 'この 線が 5cm なら、ただしい 大きさで いんさつ できています',
    cardsHelp: 'きりとり線で きって、まんなかの 点線で おると 定期入れに 入る カードに なります',
    // "じこくが ちがう日" (d = dates, l = the timetable that runs, ts = times)
    specAs: (d, l) => `${wa(d)} ${l}の じこく`, specNone: (d) => `${wa(d)} バスが ありません`,
    specMore: (d, ts) => `${wa(d)} ${ts} の バスも あります`, specMoreN: (d, n) => `${wa(d)} バスが ${n}本 ふえます`,
    specRun: (d, ts) => `${wa(d)} ${ts} に バスが あります`, specRunN: (d, n) => `${wa(d)} バスが ${n}本 あります`,
    specLess: (d, ts) => `${wa(d)} ${ts} の バスが ありません`, specLessN: (d, n) => `${wa(d)} バスが ${n}本 へります`,
    specAsMore: (d, l, ts) => `${wa(d)} ${l}の じこく ＋ ${ts}`, specAsLess: (d, l, ts) => `${wa(d)} ${l}の じこく（${ts} は なし）`,
    specOther: (d) => `${wa(d)} とくべつな じこく`,
    cardNote: '※じこくが ちがう日 あり → A4シート',
  },
  en: {
    title: 'My Bus Card', owner: (n) => `${n}'s Bus Card`,
    out: 'GO', back: 'RETURN', board: 'Get on', alight: 'Get off', yuki: '',
    any: 'Any bus is fine', anyLong: (to) => `Every bus from this stop goes to ${to}`,
    anyDest: (d) => `Any bus to "${d}"`, anyDestLong: (d) => `Any bus showing "${d}" on the front will take you there`,
    anyDests: 'Any bus to one of these', anyDestsLong: 'Any bus showing one of these destinations will take you there',
    toward: '', platform: (p) => `Stop ${p}`,
    bell: (prev) => `Press the button after ${prev}`, bellNext: 'Press right away (next stop)',
    fare: 'Fare', adult: 'Adult', child: 'Child', yen: (n) => `¥${n.toLocaleString('en-US')}`,
    min: (m) => `about ${m} min`, none: 'No buses', more: (n) => `+${n} more`,
    special: 'Days with other times', etc: 'etc.', phone: 'Help', home: 'Home',
    valid: (d) => `Times valid until ${d}`, made: (d) => `Made ${d}`,
    legendCode: 'The code next to a time is the number shown on the front of the bus',
    others: (n) => `+${n} more destinations`, booking: '☎ = booking required',
    remake: 'Scan to remake this card when the timetable changes',
    stepGo: (s) => `Go to ${s}`, stepRide: 'Take this bus', stepBell: 'Press the stop button', stepOff: (s) => `Get off at ${s}`,
    timetable: 'Timetable', hour: '', credit: 'Data', ver: 'Data version', cutCard: 'Cut out and fold in the middle to make a pocket card',
    expired: 'This timetable data has expired', from: (d) => `Times from ${d}`,
    freq: (a, b, n) => `${a}–${b} · about ${n} an hour`,
    noDirect: 'No direct bus in this direction',
    inWin: 'Highlighted hours are the times printed on the card',
    ruler: 'If this line is 5 cm long, the print size is correct',
    cardsHelp: 'Cut along the dashed lines and fold at the dotted line to make a pass-holder card',
    specAs: (d, l) => `${d}: ${l} times`, specNone: (d) => `${d}: no buses`,
    specMore: (d, ts) => `${d}: extra buses at ${ts}`, specMoreN: (d, n) => `${d}: ${n} more buses`,
    specRun: (d, ts) => `${d}: buses at ${ts}`, specRunN: (d, n) => `${d}: ${n} buses`,
    specLess: (d, ts) => `${d}: no bus at ${ts}`, specLessN: (d, n) => `${d}: ${n} fewer buses`,
    specAsMore: (d, l, ts) => `${d}: ${l} times plus ${ts}`, specAsLess: (d, l, ts) => `${d}: ${l} times without ${ts}`,
    specOther: (d) => `${d}: special timetable`,
    cardNote: '* Some days have other times → A4 sheet',
  },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Some feeds give English names in lower-case romaji; capitalise them for display.
export const enName = (s) => (s && /^[a-z0-9 .,'()\-]+$/.test(s) ? s.replace(/(^|[\s(\-])([a-z])/g, (m, a, b) => a + b.toUpperCase()) : s || '');
const clip = (s, n) => ([...(s || '')].length > n ? [...s].slice(0, n - 1).join('') + '…' : s || '');
const hasKanji = (s) => /[一-鿿々〆ヶ]/.test(s || '');

// Last date the timetable is good for: the earlier of feed_end_date and the last service date.
export function validUntil(card) {
  const a = +card.feedInfo.end || 0, b = card.plan.range?.end || 0;
  return a && b ? Math.min(a, b) : (a || b);
}

export function fmtDate(ymd, lang) {
  if (!ymd) return '';
  const y = Math.floor(ymd / 10000), m = Math.floor((ymd % 10000) / 100), d = ymd % 100;
  return lang === 'en' ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : `${y}年${m}月${d}日`;
}

function makeCtx(card, o) {
  const lang = o.lang === 'en' ? 'en' : 'ja';
  const t = T[lang];
  const ruby = (text, reading) => {
    if (lang === 'en') return esc(text);
    if (!o.furigana || !reading || !hasKanji(text) || reading === text) return esc(text);
    return `<ruby>${esc(text)}<rt>${esc(reading)}</rt></ruby>`;
  };
  const stopName = (s) => (lang === 'en' ? esc(enName(s.en) || s.name) : ruby(s.name, s.reading));
  return { lang, t, ruby, stopName, o, card };
}

function ledSize(text) {
  const n = [...(text || '')].length;
  return n <= 5 ? 'l' : n <= 8 ? 'm' : n <= 12 ? 's' : 'xs';
}

function led(c, v, small = false) {
  const { t, lang } = c;
  const dest = lang === 'en' ? (enName(v.destEn) || v.dest) : v.dest;
  const yuki = lang === 'en' ? '' : (v.yuki ? t.yuki : '');
  return `<div class="led${small ? ' led-small' : ''}" title="${esc(v.raw)}">${v.code ? `<span class="led-code">${esc(v.code)}</span>` : ''}<span class="led-dest led-${ledSize(dest)}">${esc(dest)}</span>${yuki ? `<span class="led-yuki">${yuki}</span>` : ''}</div>`;
}

function timeItem(d, x) {
  const mk = d.mode === 'mark' || d.mode === 'pole' ? (x.mark ? `<i class="mk">${x.mark}</i>` : '') : '';
  const code = d.mode === 'code' && x.code ? `<i class="cd">${esc(x.code)}</i>` : '';
  const ph = x.phone ? '<i class="mk">☎</i>' : '';
  return `<span class="t">${mk}${ph}${x.t}${code}</span>`;
}

function legend(c, d, max, cls = '', clipAt = 0) {
  const { t, lang } = c;
  if (d.mode === 'single' || d.mode === 'any' || d.mode === 'dest') return '';
  const cut = (s) => (clipAt ? clip(s, clipAt) : s);
  const items = d.variants.slice(0, max).map((v) => {
    const key = d.mode === 'code' ? `<b class="lg-code">${esc(v.code)}</b>` : `<b class="lg-mk">${v.mark || (lang === 'en' ? '—' : '無印')}</b>`;
    const dest = lang === 'en' ? esc(cut(enName(v.destEn) || v.dest)) : `${esc(cut(v.dest))}${v.yuki ? t.yuki : ''}`;
    const pole = d.mode === 'pole' || new Set(d.variants.map((x) => x.board.stop)).size > 1 ? ` <span class="lg-pole">(${esc(v.board.text)})</span>` : '';
    return `<span class="lg">${key}${d.mode === 'pole' ? esc(v.board.text) : dest}${d.mode === 'pole' ? '' : pole}</span>`;
  });
  const rest = d.variants.length - max;
  if (rest > 0) items.push(`<span class="lg lg-more">${t.others(rest)}</span>`);
  return `<div class="legend ${cls}">${items.join('')}</div>`;
}

function okChips(c, d) {
  return d.dests.map((x) => `<span class="okd">${esc(c.lang === 'en' ? (enName(x.en) || x.name) : x.name)}</span>`).join('');
}

function fareText(c, d) {
  const { t, o } = c;
  if (!d.fare) return '';
  const a = d.fare.min === d.fare.max ? t.yen(d.fare.min) : `${t.yen(d.fare.min)}〜${t.yen(d.fare.max)}`;
  if (!o.childFare) return a;
  const ch = (n) => Math.ceil(n / 2 / 10) * 10;
  const cf = d.fare.min === d.fare.max ? t.yen(ch(d.fare.min)) : `${t.yen(ch(d.fare.min))}〜`;
  return `${t.adult} ${a}・${t.child} ${cf}`;
}

function boardHint(c, d) {
  const v = d.variants[0];
  if (!v) return '';
  if (d.mode === 'pole') return '';
  const b = v.board;
  if (b.platform) return esc(c.t.platform(b.platform));
  return b.toward ? (c.lang === 'en' ? `toward ${esc(enName(b.toward))}` : `${c.ruby(b.toward, '')} ${c.t.toward}`) : '';
}

function bellText(c, d) {
  const b = d.bell;
  if (!b) return '';
  if (b.type === 'soon') return esc(c.t.bellNext);
  if (b.type === 'next') {
    const to = c.stopName(d.to);
    return c.lang === 'en' ? `Press at <b>"Next: ${to}"</b>` : `「つぎは <b>${to}</b>」で ボタン`;
  }
  const prev = b.stop;
  const name = c.lang === 'en' ? esc(enName(prev.en) || prev.name) : c.ruby(prev.name, prev.reading);
  return c.lang === 'en' ? `Press after <b>${name}</b>` : `<b>${name}</b> を でたら ボタン`;
}

// Header text colour with enough contrast on the route colour.
function lum(hex) {
  const n = parseInt(hex, 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}
function contrast(a, b) {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}
const HEX = /^[0-9a-f]{6}$/i;
export function routeColors(route) {
  const bg = route && HEX.test(route.color || '') ? route.color : '';
  if (!bg) return { bg: '', ink: '' };
  const ink = HEX.test(route.text || '') && contrast(bg, route.text) >= 4.5 ? route.text : (contrast(bg, 'ffffff') >= contrast(bg, '1b2440') ? 'ffffff' : '1b2440');
  return { bg: `#${bg}`, ink: `#${ink}` };
}

// ---------- pocket card (85 x 54 mm) ----------

const CARD_MAX_TIMES = 40;
// Width of a day label in full-width characters, to pick a font size that fits the box.
const dayCls = (label) => {
  const n = [...label.replace(/[・･]/g, '')].reduce((w, ch) => w + (ch.charCodeAt(0) < 0x2000 ? 0.62 : 1), 0);
  return n <= 4.6 ? '' : n <= 6 ? ' c-day-m' : ' c-day-l';
};

function cardSide(c, d, which) {
  const { t, o } = c;
  if (!d) return '<div class="card card-empty"></div>';
  const maxTimes = (o.max && o.max[which]) || o.maxTimes || CARD_MAX_TIMES;
  const v0 = d.variants[0];
  const { bg: color, ink } = routeColors(v0?.route);
  const dirLabel = which === 'out' ? t.out : t.back;
  const iconName = which === 'out' ? (o.icon || 'star') : 'home';
  const totalTimes = d.groups.reduce((n, g) => n + g.times.length, 0);
  let budget = maxTimes;
  const rows = !d.variants.length ? '' : d.groups.map((g) => {
    if (g.none) return `<div class="c-row"><span class="c-day${dayCls(g.label)}">${esc(g.label)}</span><span class="c-list c-none">${t.none}</span></div>`;
    const take = totalTimes <= maxTimes ? g.times.length : Math.max(4, Math.min(g.times.length, Math.floor((maxTimes * g.times.length) / Math.max(1, totalTimes))));
    const shown = g.times.slice(0, Math.min(take, budget));
    budget -= shown.length;
    const more = g.times.length - shown.length;
    return `<div class="c-row"><span class="c-day${dayCls(g.label)}">${esc(g.label)}</span><span class="c-list">${shown.map((x) => timeItem(d, x)).join('')}${more > 0 ? `<span class="t t-more">${t.more(more)}</span>` : ''}</span></div>`;
  }).join('');
  const destName = v0 ? (c.lang === 'en' ? (v0.destEn || v0.dest) : v0.dest) : '';
  const busLine = d.mode === 'any'
    ? `<div class="c-any">${icon('check', 'ic ic-ok')}<span>${t.any}</span></div>${led(c, v0, true)}`
    : d.mode === 'dest' && d.dests && d.dests.length > 1
      ? `${led(c, v0)}<div class="c-oklist"><span class="c-any">${icon('check', 'ic ic-ok')}<span>${esc(t.anyDests)}</span></span><span class="okd-list">${okChips(c, d)}</span></div>`
      : d.mode === 'dest'
      ? `${led(c, { ...v0, code: '' })}<div class="c-any">${icon('check', 'ic ic-ok')}<span>${esc(t.anyDest(destName))}</span></div>`
      : `${v0 ? led(c, v0) : ''}${legend(c, d, 3, 'legend-card', c.lang === 'en' ? 26 : 16)}`;
  return `<div class="card" lang="${c.lang}" style="${color ? `--route:${color};` : ''}${ink ? `--route-ink:${ink};` : ''}">
  <div class="c-head"><span class="c-dir c-dir-${which}">${dirLabel}</span><span class="c-owner">${esc(o.owner ? t.owner(o.owner) : t.title)}</span>${icon(iconName, 'ic c-icon')}</div>
  <div class="c-trip">
    <div class="c-stop"><span class="c-tag c-tag-on">${t.board}</span><span class="c-name">${c.stopName(d.from)}</span><span class="c-hint">${boardHint(c, d)}</span></div>
    ${icon('arrow', 'ic c-arrow')}
    <div class="c-stop"><span class="c-tag c-tag-off">${t.alight}</span><span class="c-name">${c.stopName(d.to)}</span></div>
  </div>
  <div class="c-bus">${busLine}</div>
  <div class="c-times">${rows || `<div class="c-row"><span class="c-list c-none">${d.variants.length ? t.none : t.noDirect}</span></div>`}${o.notes && o.notes[which] && d.special && d.special.length ? `<div class="c-note">${esc(t.cardNote)}</div>` : ''}</div>
  <div class="c-foot">${d.variants.length ? `<span class="c-bell">${icon('bell', 'ic')}<span>${bellText(c, d)}</span></span>` : '<span class="c-bell"></span>'}${d.fare ? `<span class="c-fare">${icon('coin', 'ic')}${fareText(c, d)}</span>` : ''}${d.minutes ? `<span class="c-min">${icon('clock', 'ic')}${t.min(d.minutes.max)}</span>` : ''}</div>
</div>`;
}

export function renderCards(card, o) {
  const c = makeCtx(card, o);
  return { front: cardSide(c, card.outbound, 'out'), back: cardSide(c, card.inbound, 'back') };
}

// ---------- A4 sheet ----------

function hourTable(c, d, win) {
  const { t } = c;
  const groups = d.groups;
  const hours = new Set();
  for (const g of groups) for (const x of g.times) hours.add(Math.floor(x.dep / 3600));
  const hs = [...hours].sort((a, b) => a - b);
  if (!hs.length) return `<p class="s-none">${t.none}</p>`;
  const head = `<tr><th class="h">${c.lang === 'en' ? 'h' : 'じ'}</th>${groups.map((g) => `<th>${esc(g.label)}</th>`).join('')}</tr>`;
  const inWin = (h) => win && h * 3600 <= win[1] && (h + 1) * 3600 - 1 >= win[0];
  const body = hs.map((h) => `<tr${inWin(h) ? ' class="in-win"' : ''}><th class="h">${h}</th>${groups.map((g) => {
    const list = g.times.filter((x) => Math.floor(x.dep / 3600) === h);
    return `<td>${list.map((x) => {
      const mm = String(Math.floor((x.dep % 3600) / 60)).padStart(2, '0');
      const mk = d.mode === 'mark' || d.mode === 'pole' ? (x.mark ? `<i class="mk">${x.mark}</i>` : '') : '';
      const cd = d.mode === 'code' && x.code ? `<i class="cd">${esc(x.code)}</i>` : '';
      return `<span class="m">${mk}${x.phone ? '<i class="mk">☎</i>' : ''}${mm}${cd}</span>`;
    }).join('')}</td>`;
  }).join('')}</tr>`).join('');
  return `<table class="s-table"><thead>${head}</thead><tbody>${body}</tbody></table>`;
}

// One line for each kind of day: "11/23・1/1・1/11（祝）は 月・水・金曜の じこく", "12/29〜1/3 は バスが ありません".
export function specialText(t, s, lang) {
  const ts = s.times ? s.times.join(lang === 'en' ? ', ' : '・') : '';
  switch (s.kind) {
    case 'as': return t.specAs(s.dates, s.as);
    case 'none': return t.specNone(s.dates);
    case 'more': return ts ? t.specMore(s.dates, ts) : t.specMoreN(s.dates, s.n);
    case 'run': return ts ? t.specRun(s.dates, ts) : t.specRunN(s.dates, s.n);
    case 'less': return ts ? t.specLess(s.dates, ts) : t.specLessN(s.dates, s.n);
    case 'asMore': return t.specAsMore(s.dates, s.as, ts);
    case 'asLess': return t.specAsLess(s.dates, s.as, ts);
    default: return t.specOther(s.dates);
  }
}

function specials(c, d) {
  const { t, lang } = c;
  const list = d.special || [];
  if (!list.length) return '';
  const items = list.slice(0, 4).map((s) => `<span class="sp">${esc(specialText(t, s, lang))}</span>`);
  if (list.length > 4) items.push(`<span class="sp">${t.etc}</span>`);
  return `<p class="s-special">${icon('info', 'ic')}<span><b>${t.special}</b>${lang === 'en' ? ' — ' : '　'}${items.join('')}</span></p>`;
}

function steps(c, d) {
  const { t, lang } = c;
  if (!d || !d.variants.length) return '';
  const v0 = d.variants[0];
  const fromName = c.stopName(d.from), toName = c.stopName(d.to);
  const hint = boardHint(c, d);
  const destName = lang === 'en' ? (v0.destEn || v0.dest) : v0.dest;
  const busBlock = d.mode === 'any' ? `<div class="s-any">${icon('check', 'ic ic-ok')}${esc(t.anyLong(lang === 'en' ? (d.to.en || d.to.name) : d.to.name))}</div><div class="s-leds">${d.variants.slice(0, 3).map((v) => led(c, v, true)).join('')}</div>`
    : d.mode === 'dest' && d.dests && d.dests.length > 1 ? `<div class="s-leds">${led(c, v0)}</div><div class="s-any">${icon('check', 'ic ic-ok')}${esc(t.anyDestsLong)}</div><div class="okd-list okd-sheet">${okChips(c, d)}</div>`
    : d.mode === 'dest' ? `<div class="s-leds">${led(c, { ...v0, code: '' })}</div><div class="s-any">${icon('check', 'ic ic-ok')}${esc(t.anyDestLong(destName))}</div>`
      : `<div class="s-leds">${led(c, v0)}</div>${legend(c, d, 10, 'legend-sheet')}`;
  return `<ol class="s-steps">
    <li>${icon('walk', 'ic')}<div><b>${lang === 'en' ? `Go to ${fromName}` : `${fromName} の のりばへ`}</b>${hint ? `<span>${hint}</span>` : ''}</div></li>
    <li>${icon('bus', 'ic')}<div><b>${t.stepRide}</b>${busBlock}</div></li>
    <li>${icon('bell', 'ic')}<div><b>${bellText(c, d)}</b></div></li>
    <li>${icon('pin', 'ic')}<div><b>${lang === 'en' ? `Get off at ${toName}` : `${toName} で おりる`}</b><span>${[d.fare ? fareText(c, d) : '', d.minutes ? t.min(d.minutes.max) : ''].filter(Boolean).join('　')}</span></div></li>
  </ol>`;
}

function dirBlock(c, d, which, extra) {
  const { t } = c;
  if (!d) return '';
  const win = extra.win ? extra.win[which] : null;
  const head = `<h2><span class="c-dir c-dir-${which}">${which === 'out' ? t.out : t.back}</span>${c.stopName(d.from)} ${icon('arrow', 'ic')} ${c.stopName(d.to)}</h2>`;
  if (!d.variants.length) return `<section class="s-dir s-${which}">${head}<p class="s-none">${t.noDirect}</p></section>`;
  const map = extra.maps && extra.maps[which] ? `<div class="s-map">${extra.maps[which]}</div>` : '';
  return `<section class="s-dir s-${which}">
    ${head}
    ${steps(c, d)}
    ${map}
    <h3>${t.timetable}</h3>
    ${hourTable(c, d, win)}
    ${win && d.count ? `<p class="s-note s-winnote"><i class="sw"></i>${t.inWin}</p>` : ''}
    ${specials(c, d)}
    ${d.mode === 'code' ? `<p class="s-note">${t.legendCode}</p>` : ''}
    ${d.phoneBooking ? `<p class="s-note">${t.booking}</p>` : ''}
    ${d.notes.length ? `<p class="s-note">${d.notes.map(esc).join(' / ')}</p>` : ''}
  </section>`;
}

export function renderSheet(card, o, extra = {}) {
  const c = makeCtx(card, o);
  const { t, lang } = c;
  const { front, back } = renderCards(extra.pocket || card, o);
  const end = validUntil(card);
  const contact = [
    card.agency.phone ? `${esc(card.agency.name)} ☎ ${esc(card.agency.phone)}` : '',
    o.homePhone ? `${t.home} ☎ ${esc(o.homePhone)}` : '',
  ].filter(Boolean).join('　');
  const foot = `<footer class="s-foot">${t.credit}：${esc(extra.credit || card.feedInfo.publisher || card.agency.name)}${extra.license ? `（${esc(extra.license)}）` : ''}${card.feedInfo.version ? `　${t.ver}：${esc(card.feedInfo.version)}` : ''}${extra.mapCredit ? `　${esc(extra.mapCredit)}` : ''}　${t.made(fmtDate(extra.todayYmd, lang))}　わたしのバスカード</footer>`;
  const cut = `<div class="s-cut"><p>${t.cutCard}</p><div class="cut-pair">${front}${back}</div></div>`;
  const dense = extra.dense ? ` dense-${extra.dense}` : '';
  const main = `<div class="sheet${dense}" lang="${lang}">
  <header class="s-head">
    <div class="s-logo">${icon('bus', 'ic')}</div>
    <div class="s-titles"><div class="s-title">${esc(o.owner ? t.owner(o.owner) : t.title)}</div>
    <div class="s-sub"><span>${esc(card.agency.name)}</span>${end ? `<wbr><span>・${t.valid(fmtDate(end, lang))}</span>` : ''}</div></div>
    ${extra.qr ? `<div class="s-qr">${extra.qr}<span>${t.remake}</span></div>` : ''}
  </header>
  ${card.plan.expired ? `<p class="s-warn">${t.expired}</p>` : ''}
  <div class="s-dirs">${dirBlock(c, card.outbound, 'out', extra)}${dirBlock(c, card.inbound, 'back', extra)}</div>
  ${contact ? `<p class="s-contact">${icon('phone', 'ic')}<span>${t.phone}　${contact}</span></p>` : ''}
  ${extra.splitCut || extra.noCut ? '' : cut}
  ${foot}
</div>`;
  if (!extra.splitCut) return main;
  return main + `<div class="sheet sheet-cut" lang="${lang}">${cut}${foot}</div>`;
}

export function renderCardSheet(card, o, copies = 4) {
  const t = T[o.lang === 'en' ? 'en' : 'ja'];
  const { front, back } = renderCards(card, o);
  const pair = `<div class="cut-pair">${front}${back}</div>`;
  return `<div class="sheet sheet-cards" lang="${o.lang === 'en' ? 'en' : 'ja'}"><p class="cards-help">${t.cardsHelp}</p>${Array.from({ length: copies }, () => pair).join('')}<div class="ruler"><i></i><span>${t.ruler}</span></div></div>`;
}
