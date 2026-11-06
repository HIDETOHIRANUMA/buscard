// Core logic of わたしのバスカード: places, direct trips, service days, fares and the card model.
import { normName, toHiragana, serviceRuns, serviceDateRange, ymdToDate, dateToYmd } from './gtfs.js';

const NEAR_M = 600;

function distM(lat1, lon1, lat2, lon2) {
  const k = Math.PI / 180;
  const x = (lon2 - lon1) * k * Math.cos(((lat1 + lat2) / 2) * k);
  const y = (lat2 - lat1) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}

// ---------- indexes ----------

export function buildIndex(feed) {
  const { st, stops, trips } = feed;
  const n = st.n;
  const tripOf = new Int32Array(n);
  for (let t = 0; t < trips.n; t++) for (let k = st.offsets[t]; k < st.offsets[t + 1]; k++) tripOf[k] = t;
  // Inverted index stop -> st rows.
  const cnt = new Int32Array(stops.n + 1);
  for (let k = 0; k < n; k++) cnt[st.stop[k] + 1]++;
  for (let s = 0; s < stops.n; s++) cnt[s + 1] += cnt[s];
  const pos = cnt.slice(0, stops.n);
  const rows = new Int32Array(n);
  for (let k = 0; k < n; k++) rows[pos[st.stop[k]]++] = k;
  const places = buildPlaces(feed, cnt);
  return { tripOf, stopRowsStart: cnt, stopRows: rows, ...places };
}

function buildPlaces(feed, stopRowStart) {
  const S = feed.stops;
  const groups = new Map();
  const parentOf = (i) => {
    const p = S.parent[i];
    if (!p) return -1;
    const pi = feed.stopIndex.get(p);
    return pi !== undefined && S.locType[pi] === 1 ? pi : -1;
  };
  for (let i = 0; i < S.n; i++) {
    if (S.locType[i] !== 0 && S.locType[i] !== 4) continue;
    if (stopRowStart[i + 1] - stopRowStart[i] === 0) continue; // never served
    const p = parentOf(i);
    const key = p >= 0 ? 'P\u0001' + S.id[p] : 'N\u0001' + normName(S.name[i]);
    let g = groups.get(key);
    if (!g) { g = []; groups.set(key, g); }
    g.push(i);
  }
  const list = [];
  const poleToPlace = new Int32Array(S.n).fill(-1);
  for (const [key, poles] of groups) {
    const clusters = [];
    if (key.startsWith('P')) clusters.push(poles);
    else {
      for (const i of poles) {
        let best = null;
        for (const c of clusters) {
          if (distM(S.lat[i], S.lon[i], c.lat, c.lon) < NEAR_M) { best = c; break; }
        }
        if (!best) { best = []; best.lat = S.lat[i]; best.lon = S.lon[i]; clusters.push(best); }
        best.push(i);
      }
    }
    for (const c of clusters) {
      const first = c[0];
      const pi = key.startsWith('P') ? feed.stopIndex.get(key.slice(2)) : -1;
      const name = pi >= 0 ? S.name[pi] : S.name[first];
      let lat = 0, lon = 0;
      for (const i of c) { lat += S.lat[i]; lon += S.lon[i]; }
      const reading = c.map((i) => S.reading[i]).find(Boolean) || (pi >= 0 ? S.reading[pi] : '') || '';
      const en = c.map((i) => S.en[i]).find(Boolean) || (pi >= 0 ? S.en[pi] : '') || '';
      const id = list.length;
      list.push({ id, name, reading, en, poles: c.slice(), lat: lat / c.length, lon: lon / c.length, key: normName(name), dup: clusters.length > 1 });
      for (const i of c) poleToPlace[i] = id;
    }
  }
  return { places: list, poleToPlace };
}

// ---------- search ----------

export function searchPlaces(ctx, q, limit = 30) {
  const nq = normName(q);
  if (!nq) return [];
  const hit = [];
  for (const p of ctx.places) {
    const r = normName(p.reading);
    let score = -1;
    if (p.key.startsWith(nq) || (r && r.startsWith(nq))) score = 0;
    else if (p.key.includes(nq) || (r && r.includes(nq))) score = 1;
    else if (p.en && p.en.toLowerCase().includes(q.toLowerCase())) score = 2;
    if (score >= 0) hit.push([score, p.name.length, p]);
  }
  hit.sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2].name.localeCompare(b[2].name, 'ja'));
  return hit.slice(0, limit).map((h) => h[2]);
}

export function nearestPlaces(ctx, lat, lon, limit = 8) {
  return ctx.places.map((p) => [distM(lat, lon, p.lat, p.lon), p]).sort((a, b) => a[0] - b[0]).slice(0, limit)
    .map(([d, p]) => ({ place: p, meters: Math.round(d) }));
}

// Names of routes that serve a place (for telling same-named places apart).
export function placeRoutes(feed, ctx, placeId, limit = 3) {
  const seen = new Map();
  for (const s of ctx.places[placeId].poles) {
    for (let r = ctx.stopRowsStart[s]; r < ctx.stopRowsStart[s + 1]; r++) {
      const t = ctx.tripOf[ctx.stopRows[r]];
      const ri = feed.trips.route[t];
      if (ri < 0) continue;
      seen.set(ri, (seen.get(ri) || 0) + 1);
    }
  }
  return [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([ri]) => routeLabel(feed.routes[ri]));
}

export function routeLabel(r) {
  if (!r) return '';
  return r.short && r.long && !r.long.includes(r.short) ? `${r.short} ${r.long}` : (r.long || r.short || r.id);
}

// ---------- trips between places ----------

// Returns rows {trip, i, j} where st row i is at A (boarding allowed) and j at B (alighting allowed).
export function directPairs(feed, ctx, aId, bId) {
  const { st } = feed;
  const A = new Set(ctx.places[aId].poles);
  const B = new Set(ctx.places[bId].poles);
  const best = new Map();
  for (const s of A) {
    for (let r = ctx.stopRowsStart[s]; r < ctx.stopRowsStart[s + 1]; r++) {
      const i = ctx.stopRows[r];
      if (st.pick[i] === 1) continue;
      const t = ctx.tripOf[i];
      const end = st.offsets[t + 1];
      for (let j = i + 1; j < end; j++) {
        const sj = st.stop[j];
        if (A.has(sj) && st.pick[j] !== 1) break; // a later boarding point at A will handle it
        if (B.has(sj) && st.drop[j] !== 1) {
          const key = t + ':' + j;
          const prev = best.get(key);
          if (!prev || prev.i < i) best.set(key, { trip: t, i, j });
          break;
        }
      }
    }
  }
  return [...best.values()];
}

// Expands frequency-based trips into concrete departures.
function departuresOf(feed, pair) {
  const { st } = feed;
  const f = feed.frequencies.get(pair.trip);
  const dep = st.dep[pair.i], arr = st.arr[pair.j];
  if (!f) return [{ dep, arr }];
  const base = st.dep[st.offsets[pair.trip]];
  const out = [];
  for (const w of f) {
    if (w.headway <= 0) continue;
    for (let t0 = w.start; t0 < w.end; t0 += w.headway) out.push({ dep: t0 + (dep - base), arr: t0 + (arr - base) });
  }
  return out;
}

export function reachablePlaces(feed, ctx, aId) {
  const { st } = feed;
  const A = new Set(ctx.places[aId].poles);
  const acc = new Map();
  for (const s of A) {
    for (let r = ctx.stopRowsStart[s]; r < ctx.stopRowsStart[s + 1]; r++) {
      const i = ctx.stopRows[r];
      if (st.pick[i] === 1) continue;
      const t = ctx.tripOf[i];
      const end = st.offsets[t + 1];
      const seen = new Set();
      for (let j = i + 1; j < end; j++) {
        const sj = st.stop[j];
        if (A.has(sj)) break;
        if (st.drop[j] === 1) continue;
        const p = ctx.poleToPlace[sj];
        if (p < 0 || p === aId || seen.has(p)) continue;
        seen.add(p);
        let o = acc.get(p);
        if (!o) { o = { place: ctx.places[p], trips: new Set(), minSec: Infinity }; acc.set(p, o); }
        o.trips.add(t);
        o.minSec = Math.min(o.minSec, st.arr[j] - st.dep[i]);
      }
    }
  }
  return [...acc.values()].map((o) => ({ place: o.place, trips: o.trips.size, minutes: Math.round(o.minSec / 60) }))
    .sort((a, b) => b.trips - a.trips || a.minutes - b.minutes);
}

// ---------- headsigns ----------

const CODE_RE = /^([0-9０-９A-Za-zＡ-Ｚａ-ｚ\-－]{1,5})(?=[^\x00-\x7F０-９Ａ-Ｚａ-ｚ\-－])/;

const CJK = '\\u3000-\\u9fff\\uff00-\\uffef';
const SPACE_IN_CJK = new RegExp(`(?<=[${CJK}])[\\s\\u3000]+(?=[${CJK}])`, 'g');

// Splits "（…経由）" from the end, allowing nested brackets.
function splitVia(s) {
  const m = s.match(/経由\s*[)）]\s*$/);
  if (!m) return [s, ''];
  let depth = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    const c = s[i];
    if (c === ')' || c === '）') depth++;
    else if (c === '(' || c === '（') {
      depth--;
      if (depth === 0) {
        const via = s.slice(i + 1).replace(/\s*経由\s*[)）]\s*$/, '').trim();
        return [s.slice(0, i).trim(), via];
      }
    }
  }
  return [s, ''];
}

export function parseHeadsign(raw) {
  let s = (raw || '').trim().replace(SPACE_IN_CJK, '');
  let code = '';
  let m;
  if ((m = s.match(/^([^;；]{1,10})[;；]\s*(.+)$/))) { code = m[1]; s = m[2]; }
  else if ((m = s.match(/^[[［]([^\]］]{1,10})[\]］]\s*(.+)$/))) { code = m[1]; s = m[2]; }
  else if ((m = s.match(CODE_RE)) && s.length > m[1].length + 1) { code = m[1]; s = s.slice(m[1].length); }
  let note = '';
  const star = s.indexOf('※');
  if (star > 0) { note = s.slice(star + 1).trim(); s = s.slice(0, star).trim(); }
  const [dest, via] = splitVia(s);
  return { code: code.normalize('NFKC'), dest: dest.replace(/\s*(行き?|ゆき)$/, ''), via, note };
}

function needsYuki(dest) {
  return !/(方面|循環|まわり|回り|ルート|線|行|ゆき|経由)$/.test(dest);
}

// ---------- service days ----------

const DOW_JA = ['月', '火', '水', '木', '金', '土', '日'];

function addDays(ymd, n) {
  const d = ymdToDate(String(ymd));
  d.setUTCDate(d.getUTCDate() + n);
  return dateToYmd(d);
}
function weekdayOf(ymd) {
  return (ymdToDate(String(ymd)).getUTCDay() + 6) % 7; // 0=Mon
}

export function dayPlan(feed, holidays, todayYmd, nDays = 90) {
  const range = serviceDateRange(feed) || { start: todayYmd, end: addDays(todayYmd, nDays) };
  let start = Math.max(todayYmd, range.start);
  let expired = false;
  if (start > range.end) { expired = true; start = Math.max(range.start, addDays(range.end, -nDays + 1)); }
  const dates = [];
  for (let d = start, k = 0; k < nDays && d <= range.end; k++, d = addDays(d, 1)) {
    const w = weekdayOf(d);
    const type = w === 6 || holidays.has(d) ? 'holiday' : (w === 5 ? 'saturday' : 'weekday');
    dates.push({ ymd: d, w, type });
  }
  return { start, end: dates.length ? dates[dates.length - 1].ymd : start, expired, range, dates };
}

// Per direction: the usual schedule for each weekday / Saturday / holiday, merged when identical,
// plus the dates that differ from the usual schedule of their kind.
const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'hol'];
function scheduleGroups(feed, plan, services) {
  const svc = [...services].sort((a, b) => a - b);
  const byKey = new Map(DAY_KEYS.map((k) => [k, new Map()]));
  const keyOf = (d) => (d.type === 'holiday' ? 'hol' : DAY_KEYS[d.w]);
  for (const d of plan.dates) {
    let sig = '';
    for (const s of svc) if (serviceRuns(feed, s, d.ymd, d.w)) sig += s + ',';
    const m = byKey.get(keyOf(d));
    const list = m.get(sig) || [];
    list.push(d.ymd);
    m.set(sig, list);
  }
  const groups = [];
  for (const k of DAY_KEYS) {
    const m = byKey.get(k);
    let bestSig = null, bestN = 0;
    for (const [sig, list] of m) if (list.length > bestN || (list.length === bestN && sig.length > (bestSig || '').length)) { bestN = list.length; bestSig = sig; }
    if (bestSig === null) continue;
    const specials = [];
    for (const [sig, list] of m) if (sig !== bestSig) specials.push(...list);
    const g = groups.find((x) => x.sig === bestSig);
    if (g) { g.keys.push(k); g.specials.push(...specials); g.ymd = Math.min(g.ymd, m.get(bestSig)[0]); }
    else groups.push({ sig: bestSig, ymd: m.get(bestSig)[0], keys: [k], specials, none: bestSig === '' });
  }
  for (const g of groups) g.specials.sort((a, b) => a - b);
  return groups;
}

export function groupLabel(keys, lang = 'ja') {
  const set = new Set(keys);
  const wk = ['mon', 'tue', 'wed', 'thu', 'fri'];
  const allWk = wk.every((k) => set.has(k));
  const hol = set.has('hol'), sat = set.has('sat');
  if (lang === 'en') {
    const names = { mon: 'Mo', tue: 'Tu', wed: 'We', thu: 'Th', fri: 'Fr', sat: 'Sa', hol: 'Hol' };
    if (allWk && sat && hol) return 'Every day';
    if (allWk && !sat && !hol) return 'Weekdays';
    if (allWk && sat && !hol) return 'Mon–Sat';
    if (allWk && !sat && hol) return 'Wkdy/Hol';
    if (!wk.some((k) => set.has(k)) && sat && hol) return 'Sat/Sun/Hol';
    if (set.size === 1 && sat) return 'Saturday';
    if (set.size === 1 && hol) return 'Sun/Hol';
    return keys.map((k) => names[k]).join('/');
  }
  const names = { mon: '月', tue: '火', wed: '水', thu: '木', fri: '金', sat: '土', hol: '日祝' };
  if (allWk && sat && hol) return '毎日';
  if (allWk && !sat && !hol) return '平日';
  if (allWk && sat && !hol) return '月〜土';
  if (allWk && !sat && hol) return '平日・日祝';
  if (!wk.some((k) => set.has(k)) && sat && hol) return '土日・祝日';
  if (set.size === 1 && sat) return '土曜';
  if (set.size === 1 && hol) return '日曜・祝日';
  const days = keys.filter((k) => k !== 'hol').map((k) => names[k]).join('・');
  return days ? days + '曜' + (hol ? '・日祝' : '') : '日曜・祝日';
}

// Collapses a list of dates into "12/29〜1/3" style ranges.
export function dateRanges(list, lang = 'ja') {
  const out = [];
  let s = null, p = null;
  const fmt = (d) => `${Math.floor((d % 10000) / 100)}/${d % 100}`;
  for (const d of list) {
    if (s === null) { s = p = d; continue; }
    if (addDays(p, 1) === d) { p = d; continue; }
    out.push(s === p ? fmt(s) : `${fmt(s)}${lang === 'en' ? '–' : '〜'}${fmt(p)}`);
    s = p = d;
  }
  if (s !== null) out.push(s === p ? fmt(s) : `${fmt(s)}${lang === 'en' ? '–' : '〜'}${fmt(p)}`);
  return out;
}

// ---------- fares ----------

export function fareFor(feed, routeIdx, boardStop, alightStop) {
  const R = feed.fareRules.byRoute;
  const route = routeIdx >= 0 ? feed.routes[routeIdx].id : '';
  const zo = feed.stops.zone[boardStop] || '', zd = feed.stops.zone[alightStop] || '';
  const keys = [[route, zo + '|' + zd], ['', zo + '|' + zd], [route, zo + '|'], [route, '|' + zd], [route, '|'], ['', '|']];
  for (const [r, key] of keys) {
    const m = R.get(r);
    if (m && m.has(key)) {
      const a = feed.fareAttrs.get(m.get(key));
      if (a && Number.isFinite(a.price)) return a.price;
    }
  }
  if (feed.fareAttrs.size === 1) {
    const a = [...feed.fareAttrs.values()][0];
    if (Number.isFinite(a.price)) return a.price;
  }
  return null;
}

export function childFare(adult) {
  return adult == null ? null : Math.ceil(adult / 2 / 10) * 10;
}

// ---------- labels ----------

export function stopReading(feed, s) {
  return feed.stops.reading[s] || '';
}

function poleLabel(feed, s, nextStop, lang) {
  const S = feed.stops;
  const plat = S.platform[s];
  const next = nextStop >= 0 ? S.name[nextStop] : '';
  const nextEn = nextStop >= 0 ? (S.en[nextStop] || S.name[nextStop]) : '';
  if (lang === 'en') return { platform: plat, toward: nextEn, text: plat ? `Stop ${plat}` : (nextEn ? `toward ${nextEn}` : '') };
  return { platform: plat, toward: next, text: plat ? `${plat}番のりば` : (next ? `${next} ほうこう` : '') };
}

export function fmtTime(sec) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

// ---------- card model ----------

const MARKS = ['', '▲', '●', '■', '◆', '★', '▼'];
const OTHER_MARK = '◎';

function directionModel(feed, ctx, plan, fromId, toId, opts) {
  const { st, trips, stops } = feed;
  const lang = opts.lang || 'ja';
  const pairs = directPairs(feed, ctx, fromId, toId);
  // Variant = boarding pole + headsign shown at boarding.
  const variants = new Map();
  for (const p of pairs) {
    const t = p.trip;
    const lastStop = st.stop[st.offsets[t + 1] - 1];
    const hsRaw = st.strings[st.hs[p.i]] || trips.headsign[t] || stops.name[lastStop];
    const hs = parseHeadsign(hsRaw);
    if (!hs.dest) hs.dest = stops.name[lastStop];
    const rt = trips.route[t] >= 0 ? feed.routes[trips.route[t]] : null;
    if (!hs.code && rt && rt.short && rt.short.normalize('NFKC').length <= 5 && rt.short !== hs.dest) { hs.code = rt.short.normalize('NFKC'); hs.codeFromRoute = true; }
    const board = st.stop[p.i], alight = st.stop[p.j];
    const key = hs.code + '|' + hs.dest + '|' + board;
    let v = variants.get(key);
    if (!v) {
      v = { key, hs, hsRaw, board, alight, route: trips.route[t], pairs: [], prev: new Map(), next: new Map(), fares: new Map(), rides: [] };
      variants.set(key, v);
    }
    v.pairs.push(p);
    const prevStop = p.j - 1 > p.i ? st.stop[p.j - 1] : -1;
    v.prev.set(prevStop, (v.prev.get(prevStop) || 0) + 1);
    const nextStop = p.i + 1 < st.offsets[t + 1] ? st.stop[p.i + 1] : -1;
    v.next.set(nextStop, (v.next.get(nextStop) || 0) + 1);
    const fare = fareFor(feed, trips.route[t], board, alight);
    v.fares.set(fare, (v.fares.get(fare) || 0) + 1);
    v.rides.push(st.arr[p.j] - st.dep[p.i]);
  }
  const median = (a) => { if (!a.length) return Infinity; const b = [...a].sort((x, y) => x - y); return b[Math.floor(b.length / 2)]; };
  let vlist = [...variants.values()];
  for (const v of vlist) v.med = median(v.rides);
  // Drop long detours (for example the far way round a loop line).
  const fastest = Math.min(...vlist.map((v) => v.med));
  const limit = Math.max(fastest * 2, fastest + 20 * 60);
  const detours = vlist.filter((v) => v.med > limit).length;
  vlist = vlist.filter((v) => v.med <= limit).sort((a, b) => b.pairs.length - a.pairs.length);

  // Boarding poles, busiest first. At big stops the rider usually waits at one of them.
  const top0 = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const poleCount = new Map();
  for (const v of vlist) poleCount.set(v.board, (poleCount.get(v.board) || 0) + v.pairs.length);
  const poleStats = [...poleCount.entries()].sort((a, b) => b[1] - a[1]).map(([P, n]) => {
    const v = vlist.find((x) => x.board === P);
    return { stop: P, id: stops.id[P], count: n, ...poleLabel(feed, P, top0(v.next) ?? -1, lang) };
  });
  let poleChoice = 'all';
  let want = opts.poles;
  if (want === 'auto') {
    // Wait where most buses leave: always at big stops, and at two-pole stops when one pole has most of them.
    const total = poleStats.reduce((n, p) => n + p.count, 0);
    want = poleStats.length >= 3 || (poleStats.length === 2 && poleStats[0].count >= total * 0.6) ? [poleStats[0].stop] : null;
  }
  if (Array.isArray(want) && want.length) {
    const keep = new Set(want);
    const filtered = vlist.filter((v) => keep.has(v.board));
    if (filtered.length) { vlist = filtered; poleChoice = opts.poles === 'auto' ? 'auto' : 'custom'; }
  }

  // Does every bus leaving this pole reach the destination?
  const poles = [...new Set(vlist.map((v) => v.board))];
  const anyBus = new Map();
  for (const P of poles) {
    const all = new Set();
    for (let r = ctx.stopRowsStart[P]; r < ctx.stopRowsStart[P + 1]; r++) {
      const i = ctx.stopRows[r];
      const t = ctx.tripOf[i];
      if (st.pick[i] !== 1 && i + 1 < st.offsets[t + 1]) all.add(t);
    }
    const good = new Set(vlist.filter((v) => v.board === P).flatMap((v) => v.pairs.map((p) => p.trip)));
    anyBus.set(P, [...all].every((t) => good.has(t)));
  }
  // A short list of destination signs that are always right from this pole: any bus showing one of them gets us there.
  let destList = null;
  if (vlist.length > 1 && poles.length === 1) {
    const byDest = new Map();
    for (const v of vlist) byDest.set(v.hs.dest, (byDest.get(v.hs.dest) || 0) + v.pairs.length);
    if (byDest.size <= 8) {
      const P = poles[0];
      const good = new Set(vlist.flatMap((v) => v.pairs.map((p) => p.trip)));
      let ok = true;
      for (let r = ctx.stopRowsStart[P]; r < ctx.stopRowsStart[P + 1] && ok; r++) {
        const i = ctx.stopRows[r];
        const t = ctx.tripOf[i];
        if (st.pick[i] === 1 || i + 1 >= st.offsets[t + 1] || good.has(t)) continue;
        const lastStop = st.stop[st.offsets[t + 1] - 1];
        const d = parseHeadsign(st.strings[st.hs[i]] || trips.headsign[t] || stops.name[lastStop]).dest || stops.name[lastStop];
        if (byDest.has(d)) ok = false;
      }
      if (ok) destList = [...byDest.entries()].sort((a, b) => b[1] - a[1]).map(([d]) => d);
    }
  }
  let mode;
  if (vlist.length <= 1) mode = 'single';
  else if (poles.length === 1 && anyBus.get(poles[0])) mode = 'any';
  else if (destList) mode = 'dest';
  else if (poles.length > 1 && poles.every((P) => anyBus.get(P))) mode = 'pole';
  else if (vlist.every((v) => v.hs.code && v.hs.code.length <= 4)) mode = 'code';
  else mode = 'mark';
  if (mode === 'pole') {
    const pm = new Map(poles.map((P, i) => [P, i < MARKS.length ? MARKS[i] : OTHER_MARK]));
    vlist.forEach((v) => { v.mark = pm.get(v.board); });
  } else if (mode === 'mark' || mode === 'code') {
    vlist.forEach((v, i) => { v.mark = i < MARKS.length ? MARKS[i] : OTHER_MARK; });
  } else vlist.forEach((v) => { v.mark = ''; });

  const top = (m) => [...m.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const variantOut = vlist.map((v) => {
    const prev = top(v.prev);
    const next = top(v.next);
    const route = v.route >= 0 ? feed.routes[v.route] : null;
    const tr = feed.tr.byValue(v.hsRaw) || feed.tr.byValue(v.hs.dest);
    const destPlace = ctx.places.find((pl) => pl.name === v.hs.dest);
    return {
      key: v.key, mark: v.mark, trips: v.pairs.length, routeIdx: v.route, anyBus: anyBus.get(v.board),
      code: v.hs.code, dest: v.hs.dest, via: v.hs.via, note: v.hs.note || '', raw: v.hsRaw, yuki: needsYuki(v.hs.dest),
      destReading: (tr && tr.reading && !/[;；[［]/.test(tr.reading) && !v.hs.code ? tr.reading : '') || (destPlace ? destPlace.reading : ''),
      destEn: (tr && tr.en && !v.hs.code ? tr.en : '') || (destPlace ? destPlace.en : ''),
      route: route ? { name: routeLabel(route), short: route.short, color: route.color, text: route.textColor } : null,
      board: { stop: v.board, name: stops.name[v.board], reading: stops.reading[v.board], en: stops.en[v.board], lat: stops.lat[v.board], lon: stops.lon[v.board], ...poleLabel(feed, v.board, next ?? -1, lang) },
      alight: { stop: v.alight, name: stops.name[v.alight], reading: stops.reading[v.alight], en: stops.en[v.alight] },
      prev: prev >= 0 ? { name: stops.name[prev], reading: stops.reading[prev], en: stops.en[prev] } : null,
      fare: top(v.fares) ?? null,
      fareVaries: v.fares.size > 1,
      minutes: Number.isFinite(v.med) ? Math.round(v.med / 60) : null,
    };
  });
  const byKey = new Map(variantOut.map((v) => [v.key, v]));
  const rows = [];
  for (const v of vlist) {
    for (const p of v.pairs) {
      for (const d of departuresOf(feed, p)) {
        rows.push({ trip: p.trip, key: v.key, mark: v.mark, code: v.hs.code, dep: d.dep, arr: d.arr,
          phone: st.pick[p.i] === 2 || st.pick[p.i] === 3, sym: trips.descSym[p.trip], desc: trips.desc[p.trip] });
      }
    }
  }
  const win = opts.window;
  const sched = scheduleGroups(feed, plan, new Set(rows.map((r) => trips.service[r.trip])));
  const groups = sched.map((g) => {
    const w = weekdayOf(g.ymd);
    const list = rows.filter((r) => serviceRuns(feed, trips.service[r.trip], g.ymd, w))
      .filter((r) => !win || (r.dep >= win[0] && r.dep <= win[1]))
      .sort((a, b) => a.dep - b.dep || a.mark.localeCompare(b.mark));
    const seen = new Set();
    const times = [];
    for (const r of list) {
      const k = mode === 'any' || mode === 'single' || mode === 'dest' ? String(r.dep) : r.dep + '|' + r.key;
      if (seen.has(k)) continue;
      seen.add(k);
      times.push({ dep: r.dep, arr: r.arr, t: fmtTime(r.dep), mark: r.mark, code: r.code, key: r.key, phone: r.phone, sym: r.sym, desc: r.desc });
    }
    return { keys: g.keys, label: groupLabel(g.keys, lang), ymd: g.ymd, none: g.none || times.length === 0, specials: dateRanges(g.specials, lang), specialCount: g.specials.length, times };
  });
  // Variants that never run in the chosen window are hidden from the legend.
  const used = new Set(groups.flatMap((g) => g.times.map((t) => t.key)));
  const shown = variantOut.filter((v) => used.has(v.key));
  const fares = [...new Set(shown.map((v) => v.fare).filter((x) => x != null))].sort((a, b) => a - b);
  const mins = shown.map((v) => v.minutes).filter((x) => x != null);
  // Bell cue: name the stop before ours only when every shown bus passes the same one.
  const prevNames = new Set(shown.map((v) => (v.prev ? v.prev.name : '')));
  const bell = !shown.length ? null : prevNames.size === 1 ? (shown[0].prev ? { type: 'after', stop: shown[0].prev } : { type: 'soon' }) : { type: 'next' };
  return {
    from: ctx.places[fromId], to: ctx.places[toId], mode, detours, poleStats, poleChoice, bell,
    dests: destList ? destList.map((name) => { const v = variantOut.find((x) => x.dest === name); return { name, en: v ? v.destEn : '', yuki: v ? v.yuki : false }; }) : null,
    variants: shown, groups, count: groups.reduce((n, g) => n + g.times.length, 0),
    fare: fares.length ? { min: fares[0], max: fares[fares.length - 1] } : null,
    minutes: mins.length ? { min: Math.min(...mins), max: Math.max(...mins) } : null,
    prev: shown[0]?.prev || null,
    notes: [...new Set(rows.filter((r) => r.sym && r.desc).map((r) => r.desc))],
    phoneBooking: rows.some((r) => r.phone),
    byKey: Object.fromEntries([...byKey.entries()].filter(([k]) => used.has(k))),
  };
}

export function buildCard(feed, ctx, opts) {
  const plan = dayPlan(feed, opts.holidays, opts.todayYmd, opts.nDays || 90);
  const out = directionModel(feed, ctx, plan, opts.from, opts.to, { lang: opts.lang, window: opts.outWindow, poles: opts.outPoles === undefined ? 'auto' : opts.outPoles });
  const back = opts.to !== opts.from ? directionModel(feed, ctx, plan, opts.to, opts.from, { lang: opts.lang, window: opts.backWindow, poles: opts.backPoles === undefined ? 'auto' : opts.backPoles }) : null;
  const ri = out.variants[0]?.routeIdx ?? -1;
  const agId = ri >= 0 ? feed.routes[ri].agency : '';
  const ag = feed.agency.length === 1 ? feed.agency[0] : (feed.agency.find((a) => a.id === agId) || feed.agency[0] || {});
  return {
    plan: { start: plan.start, end: plan.end, expired: plan.expired, range: plan.range, days: plan.dates.length },
    outbound: out, inbound: back,
    agency: { name: ag?.name || feed.feedInfo.publisher || '', phone: ag?.phone || '', url: ag?.url || '', fareUrl: ag?.fareUrl || '' },
    feedInfo: feed.feedInfo,
  };
}
