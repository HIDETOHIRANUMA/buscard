// GTFS / GTFS-JP loader. Works in a browser worker and in Node.
// Input: a Map of file name -> Uint8Array (already unzipped).

const BOM = 0xfeff;

export function decodeText(bytes) {
  let view = bytes;
  if (view.length >= 3 && view[0] === 0xef && view[1] === 0xbb && view[2] === 0xbf) view = view.subarray(3);
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(view);
  } catch (e) {
    // Some older Japanese feeds are Shift_JIS.
    return new TextDecoder('shift_jis').decode(view);
  }
}

// Calls cb(fields) for every record. Handles quotes, CRLF and quoted newlines.
export function forEachRecord(text, cb) {
  const n = text.length;
  let pos = 0;
  if (n && text.charCodeAt(0) === BOM) pos = 1;
  let q = -2; // position of the next quote character at or after pos (-1: none left)
  while (pos < n) {
    let end = text.indexOf('\n', pos);
    if (end === -1) end = n;
    if (q !== -1 && q < pos) q = text.indexOf('"', pos);
    if (q === -1 || q > end) {
      let line = text.slice(pos, end);
      pos = end + 1;
      if (line.charCodeAt(line.length - 1) === 13) line = line.slice(0, -1);
      if (line.length === 0) continue;
      cb(line.split(','));
      continue;
    }
    const fields = [];
    let f = '';
    let inQ = false;
    let j = pos;
    for (; j < n; j++) {
      const c = text.charCodeAt(j);
      if (inQ) {
        if (c === 34) {
          if (text.charCodeAt(j + 1) === 34) { f += '"'; j++; } else inQ = false;
        } else f += text[j];
      } else if (c === 34) inQ = true;
      else if (c === 44) { fields.push(f); f = ''; }
      else if (c === 10) break;
      else if (c !== 13) f += text[j];
    }
    fields.push(f);
    pos = j + 1;
    cb(fields);
  }
}

function findFile(files, base) {
  if (files.has(base)) return files.get(base);
  const lower = base.toLowerCase();
  for (const [name, data] of files) {
    const b = name.split('/').pop().toLowerCase();
    if (b === lower) return data;
  }
  return null;
}

// Reads a whole (small) table into an array of plain objects.
function readTable(files, base) {
  const bytes = findFile(files, base);
  if (!bytes) return [];
  const out = [];
  let header = null;
  forEachRecord(decodeText(bytes), (f) => {
    if (!header) { header = f.map((h) => h.trim().replace(/^﻿/, '')); return; }
    const o = {};
    for (let i = 0; i < header.length; i++) o[header[i]] = (f[i] ?? '').trim();
    out.push(o);
  });
  return out;
}

export function parseTime(s) {
  if (!s) return -1;
  const p = s.trim().split(':');
  if (p.length < 2) return -1;
  const h = +p[0], m = +p[1], sec = p.length > 2 ? +p[2] : 0;
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 3600 + m * 60 + (Number.isNaN(sec) ? 0 : sec);
}

export function ymdToDate(ymd) {
  return new Date(Date.UTC(+ymd.slice(0, 4), +ymd.slice(4, 6) - 1, +ymd.slice(6, 8)));
}
export function dateToYmd(d) {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

const KATA_START = 0x30a1, KATA_END = 0x30f6;
export function toHiragana(s) {
  let out = '';
  for (const ch of s) {
    const c = ch.codePointAt(0);
    out += c >= KATA_START && c <= KATA_END ? String.fromCodePoint(c - 0x60) : ch;
  }
  return out;
}

export function normName(s) {
  return toHiragana((s || '').normalize('NFKC')).replace(/[\s　・･]/g, '').toLowerCase();
}

// Loads a feed. onProgress(stage) is optional.
export function loadFeed(files, onProgress = () => {}) {
  onProgress('agency');
  const agency = readTable(files, 'agency.txt').map((r) => ({
    id: r.agency_id || '', name: r.agency_name || '', url: r.agency_url || '', phone: r.agency_phone || '',
    fareUrl: r.agency_fare_url || '', lang: r.agency_lang || '',
  }));
  const agencyJp = readTable(files, 'agency_jp.txt');
  const offices = new Map(readTable(files, 'office_jp.txt').map((r) => [r.office_id, { name: r.office_name || '', phone: r.office_phone || '', url: r.office_url || '' }]));
  const fi = readTable(files, 'feed_info.txt')[0] || {};
  const feedInfo = {
    publisher: fi.feed_publisher_name || '', url: fi.feed_publisher_url || '', lang: fi.feed_lang || '',
    start: fi.feed_start_date || '', end: fi.feed_end_date || '', version: fi.feed_version || '',
  };

  onProgress('stops');
  const stopRows = readTable(files, 'stops.txt');
  const nS = stopRows.length;
  const stops = {
    n: nS, id: new Array(nS), name: new Array(nS), lat: new Float64Array(nS), lon: new Float64Array(nS),
    code: new Array(nS), desc: new Array(nS), platform: new Array(nS), zone: new Array(nS), parent: new Array(nS),
    locType: new Int8Array(nS), reading: new Array(nS).fill(''), en: new Array(nS).fill(''),
  };
  const stopIndex = new Map();
  stopRows.forEach((r, i) => {
    stops.id[i] = r.stop_id; stops.name[i] = r.stop_name || r.stop_id;
    stops.lat[i] = +r.stop_lat || 0; stops.lon[i] = +r.stop_lon || 0;
    stops.code[i] = r.stop_code || ''; stops.desc[i] = r.stop_desc || ''; stops.platform[i] = r.platform_code || '';
    stops.zone[i] = r.zone_id || ''; stops.parent[i] = r.parent_station || ''; stops.locType[i] = +(r.location_type || 0) || 0;
    stopIndex.set(r.stop_id, i);
  });

  onProgress('routes');
  const routeRows = readTable(files, 'routes.txt');
  const routesJp = new Map(readTable(files, 'routes_jp.txt').map((r) => [r.route_id, r]));
  const routes = routeRows.map((r) => ({
    id: r.route_id, short: r.route_short_name || '', long: r.route_long_name || '', desc: r.route_desc || '',
    color: (r.route_color || '').replace('#', ''), textColor: (r.route_text_color || '').replace('#', ''),
    agency: r.agency_id || '', url: r.route_url || '', type: +(r.route_type || 3), parent: r.jp_parent_route_id || '',
    jp: routesJp.get(r.route_id) || null,
  }));
  const routeIndex = new Map(routes.map((r, i) => [r.id, i]));

  onProgress('trips');
  const tripRows = readTable(files, 'trips.txt');
  const nT = tripRows.length;
  const serviceIndex = new Map();
  const services = [];
  const svc = (id) => {
    let i = serviceIndex.get(id);
    if (i === undefined) { i = services.length; services.push(id); serviceIndex.set(id, i); }
    return i;
  };
  const trips = {
    n: nT, id: new Array(nT), route: new Int32Array(nT), service: new Int32Array(nT), headsign: new Array(nT),
    shortName: new Array(nT), dir: new Int8Array(nT), desc: new Array(nT), descSym: new Array(nT), office: new Array(nT),
  };
  const tripIndex = new Map();
  tripRows.forEach((r, i) => {
    trips.id[i] = r.trip_id;
    const ri = routeIndex.get(r.route_id);
    trips.route[i] = ri === undefined ? -1 : ri;
    trips.service[i] = svc(r.service_id);
    trips.headsign[i] = r.trip_headsign || '';
    trips.shortName[i] = r.trip_short_name || '';
    trips.dir[i] = r.direction_id === '' || r.direction_id === undefined ? -1 : +r.direction_id;
    trips.desc[i] = r.jp_trip_desc || '';
    trips.descSym[i] = r.jp_trip_desc_symbol || '';
    trips.office[i] = r.jp_office_id || '';
    tripIndex.set(r.trip_id, i);
  });

  onProgress('stop_times');
  const st = loadStopTimes(files, tripIndex, stopIndex, nT);

  onProgress('frequencies');
  const freqRows = readTable(files, 'frequencies.txt');
  const frequencies = new Map();
  for (const r of freqRows) {
    const ti = tripIndex.get(r.trip_id);
    if (ti === undefined) continue;
    const list = frequencies.get(ti) || [];
    list.push({ start: parseTime(r.start_time), end: parseTime(r.end_time), headway: +r.headway_secs || 0 });
    frequencies.set(ti, list);
  }

  onProgress('calendar');
  const calendar = new Map();
  for (const r of readTable(files, 'calendar.txt')) {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map((d) => r[d] === '1');
    calendar.set(svc(r.service_id), { days, start: +r.start_date || 0, end: +r.end_date || 99999999 });
  }
  const calDates = new Map();
  for (const r of readTable(files, 'calendar_dates.txt')) {
    const s = svc(r.service_id);
    let m = calDates.get(s);
    if (!m) { m = new Map(); calDates.set(s, m); }
    m.set(+r.date, +r.exception_type);
  }

  onProgress('fares');
  const fareAttrs = new Map(readTable(files, 'fare_attributes.txt').map((r) => [r.fare_id, { price: +r.price, currency: r.currency_type || 'JPY', payment: r.payment_method || '', agency: r.agency_id || '' }]));
  const fareRules = readFareRules(files);

  onProgress('translations');
  const tr = loadTranslations(files);
  for (let i = 0; i < nS; i++) {
    const t = tr.lookup('stops', 'stop_name', stops.id[i], stops.name[i]);
    if (t) { stops.reading[i] = t.reading || ''; stops.en[i] = t.en || ''; }
  }

  return {
    agency, agencyJp, offices, feedInfo, stops, stopIndex, routes, routeIndex, trips, tripIndex, services, serviceIndex,
    st, frequencies, calendar, calDates, fareAttrs, fareRules, tr,
  };
}

// stop_times into compact typed arrays, sorted by trip and stop_sequence (CSR layout).
function loadStopTimes(files, tripIndex, stopIndex, nT) {
  const bytes = findFile(files, 'stop_times.txt');
  const strings = [''];
  const stringIndex = new Map([['', 0]]);
  if (!bytes) return emptyST(nT, strings);
  const text = decodeText(bytes);
  let cap = Math.max(1024, Math.floor(text.length / 40));
  let tripA = new Int32Array(cap), seqA = new Int32Array(cap), stopA = new Int32Array(cap);
  let arrA = new Int32Array(cap), depA = new Int32Array(cap), pickA = new Int8Array(cap), dropA = new Int8Array(cap), hsA = new Int32Array(cap);
  let n = 0;
  let col = null;
  const grow = () => {
    cap *= 2;
    const g = (a, C) => { const b = new C(cap); b.set(a); return b; };
    tripA = g(tripA, Int32Array); seqA = g(seqA, Int32Array); stopA = g(stopA, Int32Array); arrA = g(arrA, Int32Array);
    depA = g(depA, Int32Array); pickA = g(pickA, Int8Array); dropA = g(dropA, Int8Array); hsA = g(hsA, Int32Array);
  };
  forEachRecord(text, (f) => {
    if (!col) {
      const h = f.map((x) => x.trim().replace(/^﻿/, ''));
      col = { trip: h.indexOf('trip_id'), arr: h.indexOf('arrival_time'), dep: h.indexOf('departure_time'), stop: h.indexOf('stop_id'),
        seq: h.indexOf('stop_sequence'), hs: h.indexOf('stop_headsign'), pick: h.indexOf('pickup_type'), drop: h.indexOf('drop_off_type') };
      return;
    }
    const ti = tripIndex.get((f[col.trip] || '').trim());
    const si = stopIndex.get((f[col.stop] || '').trim());
    if (ti === undefined || si === undefined) return;
    if (n === cap) grow();
    tripA[n] = ti; stopA[n] = si; seqA[n] = parseInt(f[col.seq], 10) || 0;
    let a = parseTime(f[col.arr]), d = parseTime(f[col.dep]);
    if (a < 0) a = d; if (d < 0) d = a;
    arrA[n] = a; depA[n] = d;
    pickA[n] = col.pick >= 0 ? (parseInt(f[col.pick], 10) || 0) : 0;
    dropA[n] = col.drop >= 0 ? (parseInt(f[col.drop], 10) || 0) : 0;
    let hsi = 0;
    if (col.hs >= 0) {
      const hs = (f[col.hs] || '').trim();
      if (hs) {
        hsi = stringIndex.get(hs);
        if (hsi === undefined) { hsi = strings.length; strings.push(hs); stringIndex.set(hs, hsi); }
      }
    }
    hsA[n] = hsi;
    n++;
  });
  // Sort record indices by (trip, seq).
  const order = new Uint32Array(n);
  for (let i = 0; i < n; i++) order[i] = i;
  order.sort((x, y) => (tripA[x] - tripA[y]) || (seqA[x] - seqA[y]));
  const offsets = new Int32Array(nT + 1);
  const stop = new Int32Array(n), arr = new Int32Array(n), dep = new Int32Array(n), pick = new Int8Array(n), drop = new Int8Array(n), hs = new Int32Array(n);
  for (let k = 0; k < n; k++) {
    const i = order[k];
    offsets[tripA[i] + 1]++;
    stop[k] = stopA[i]; arr[k] = arrA[i]; dep[k] = depA[i]; pick[k] = pickA[i]; drop[k] = dropA[i]; hs[k] = hsA[i];
  }
  for (let t = 0; t < nT; t++) offsets[t + 1] += offsets[t];
  interpolateTimes(offsets, arr, dep, nT);
  return { n, offsets, stop, arr, dep, pick, drop, hs, strings };
}

function emptyST(nT, strings) {
  return { n: 0, offsets: new Int32Array(nT + 1), stop: new Int32Array(0), arr: new Int32Array(0), dep: new Int32Array(0),
    pick: new Int8Array(0), drop: new Int8Array(0), hs: new Int32Array(0), strings };
}

// Fills missing times (non-timepoints) by linear interpolation along the trip.
function interpolateTimes(offsets, arr, dep, nT) {
  for (let t = 0; t < nT; t++) {
    const a = offsets[t], b = offsets[t + 1];
    let last = -1;
    for (let k = a; k < b; k++) {
      if (dep[k] >= 0) {
        if (last >= 0 && k - last > 1) {
          const t0 = dep[last], t1 = arr[k];
          for (let m = last + 1; m < k; m++) {
            const v = Math.round(t0 + ((t1 - t0) * (m - last)) / (k - last));
            arr[m] = v; dep[m] = v;
          }
        }
        last = k;
      }
    }
  }
}

function readFareRules(files) {
  const rows = readTable(files, 'fare_rules.txt');
  // Index: route -> Map("origin|dest" -> fare_id). Empty strings mean "any".
  const byRoute = new Map();
  for (const r of rows) {
    const route = r.route_id || '';
    let m = byRoute.get(route);
    if (!m) { m = new Map(); byRoute.set(route, m); }
    const key = (r.origin_id || '') + '|' + (r.destination_id || '');
    if (!m.has(key)) m.set(key, r.fare_id);
  }
  return { byRoute, count: rows.length };
}

// translations.txt in three shapes:
//  - GTFS: table_name, field_name, language, translation, record_id, record_sub_id, field_value
//  - GTFS-JP v1/v2: trans_id, lang, translation (trans_id = the original text)
function loadTranslations(files) {
  const rows = readTable(files, 'translations.txt');
  const byRecord = new Map();
  const byValue = new Map();
  const put = (map, key, lang, text) => {
    let o = map.get(key);
    if (!o) { o = {}; map.set(key, o); }
    const l = (lang || '').toLowerCase();
    if (l === 'ja-hrkt') o.reading = toHiragana(text);
    else if (l === 'en') o.en = text;
    else if (l === 'ja') o.ja = text;
  };
  for (const r of rows) {
    if (r.table_name !== undefined) {
      const lang = r.language;
      if (r.record_id) put(byRecord, r.table_name + '\u0001' + r.field_name + '\u0001' + r.record_id + '\u0001' + (r.record_sub_id || ''), lang, r.translation);
      if (r.field_value) put(byValue, r.table_name + '\u0001' + r.field_name + '\u0001' + r.field_value, lang, r.translation);
      if (r.field_value) put(byValue, '*\u0001' + r.field_value, lang, r.translation);
    } else if (r.trans_id !== undefined) {
      put(byValue, '*\u0001' + r.trans_id, r.lang, r.translation);
    }
  }
  return {
    count: rows.length,
    lookup(table, field, recordId, value, subId = '') {
      return byRecord.get(table + '\u0001' + field + '\u0001' + recordId + '\u0001' + subId)
        || byValue.get(table + '\u0001' + field + '\u0001' + value)
        || byValue.get('*\u0001' + value) || null;
    },
    byValue(value) { return byValue.get('*\u0001' + value) || null; },
  };
}

// Is service s running on date ymd (number like 20261106)? weekday: 0=Mon..6=Sun
export function serviceRuns(feed, s, ymd, weekday) {
  const ex = feed.calDates.get(s);
  if (ex && ex.has(ymd)) return ex.get(ymd) === 1;
  const c = feed.calendar.get(s);
  if (!c) return false;
  return ymd >= c.start && ymd <= c.end && c.days[weekday];
}

// Range of dates covered by calendar + calendar_dates.
export function serviceDateRange(feed) {
  let lo = 99999999, hi = 0;
  for (const c of feed.calendar.values()) { lo = Math.min(lo, c.start); hi = Math.max(hi, c.end); }
  for (const m of feed.calDates.values()) for (const [d, t] of m) if (t === 1) { lo = Math.min(lo, d); hi = Math.max(hi, d); }
  return lo <= hi ? { start: lo, end: hi } : null;
}
