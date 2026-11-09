// Data worker: downloads, unzips and parses a GTFS feed, then answers queries from the page.
import { unzipSync } from '../vendor/fflate.js';
import { loadFeed, serviceDateRange } from './gtfs.js';
import { buildIndex, searchPlaces, reachablePlaces, nearestPlaces, buildCard, placeRoutes, placesByName, sameStopName, directPairs } from './core.js';

let feed = null;
let ctx = null;
let holidays = null;

async function getHolidays() {
  if (!holidays) {
    const r = await fetch(new URL('../data/holidays.json', import.meta.url));
    holidays = new Set(Object.keys(await r.json()).map(Number));
  }
  return holidays;
}

async function download(urls, progress) {
  let lastErr = null;
  for (const url of urls) {
    try {
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const total = +res.headers.get('content-length') || 0;
      if (!res.body || !res.body.getReader) return new Uint8Array(await res.arrayBuffer());
      const reader = res.body.getReader();
      const chunks = [];
      let got = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        got += value.length;
        progress('download', { got, total });
      }
      const out = new Uint8Array(got);
      let o = 0;
      for (const c of chunks) { out.set(c, o); o += c.length; }
      return out;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('download failed');
}

function slim(p) {
  return { id: p.id, name: p.name, reading: p.reading, en: p.en, lat: p.lat, lon: p.lon, poles: p.poles.length, dup: p.dup, routes: placeRoutes(feed, ctx, p.id) };
}

function summary() {
  const range = serviceDateRange(feed);
  const S = feed.stops;
  let hasReading = false, hasEn = false;
  for (let i = 0; i < S.n && !(hasReading && hasEn); i++) { if (S.reading[i]) hasReading = true; if (S.en[i]) hasEn = true; }
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of ctx.places) {
    if (!p.lat && !p.lon) continue;
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat); minLon = Math.min(minLon, p.lon); maxLon = Math.max(maxLon, p.lon);
  }
  return {
    agencies: feed.agency.map((a) => a.name), agencyPhone: feed.agency[0]?.phone || '', feedInfo: feed.feedInfo, range,
    places: ctx.places.length, trips: feed.trips.n, routes: feed.routes.length, hasReading, hasEn,
    bbox: [minLat, minLon, maxLat, maxLon],
  };
}

// Stable ids for links: stop ids of the first pole.
function placeByStopId(stopId) {
  const s = feed.stopIndex.get(stopId);
  if (s === undefined) return null;
  const p = ctx.poleToPlace[s];
  return p >= 0 ? ctx.places[p] : null;
}

// Candidate places for one stop of a remake link ({ stopId, name }; links made before 2026-11-09 have no name).
// The stop id is used when it is still there and its name still matches. A newer timetable may have new ids:
// then the stop is looked up by its name. A stop that kept its id but was renamed is still found by the id.
function linkCandidates(x) {
  const byId = x.stopId ? placeByStopId(x.stopId) : null;
  if (!x.name) return byId ? [byId] : [];
  if (byId && sameStopName(feed, byId, x.name)) return [byId];
  const byName = placesByName(feed, ctx, x.name);
  if (!byName.length) return byId ? [byId] : [];
  return byId && !byName.includes(byId) ? [...byName, byId] : byName;
}

// Both stops of a remake link. When a name fits several stops, the pair with a direct bus between them wins
// (the link was made for such a pair). If that still leaves a choice, the page asks the user: no guessing.
function resolveLink(a, b) {
  const A = linkCandidates(a), B = linkCandidates(b);
  const pick = (p) => (p ? { ...slim(p), stopId: feed.stops.id[p.poles[0]] } : null);
  if (A.length === 1 && B.length === 1 && A[0] !== B[0]) return { from: pick(A[0]), to: pick(B[0]) };
  const linked = [];
  for (const x of A) for (const y of B) if (x.id !== y.id && directPairs(feed, ctx, x.id, y.id).length) linked.push([x, y]);
  if (linked.length === 1) return { from: pick(linked[0][0]), to: pick(linked[0][1]) };
  const froms = [...new Set(linked.map(([x]) => x))];
  const from = A.length === 1 ? A[0] : froms.length === 1 ? froms[0] : null;
  if (!from) return { need: 'from', count: A.length };
  const tos = linked.filter(([x]) => x === from).map(([, y]) => y);
  return { from: pick(from), need: 'to', count: B.length === 1 ? 1 : Math.max(tos.length, B.length) };
}

self.onmessage = async (e) => {
  const { id, type, ...p } = e.data;
  const reply = (data) => self.postMessage({ id, ok: true, data });
  const progress = (stage, extra = {}) => self.postMessage({ id, progress: stage, ...extra });
  try {
    if (type === 'load') {
      feed = null; ctx = null;
      let bytes;
      if (p.file) { progress('read'); bytes = new Uint8Array(await p.file.arrayBuffer()); }
      else bytes = await download(p.urls, progress);
      progress('unzip');
      const raw = unzipSync(bytes, { filter: (f) => /\.txt$/i.test(f.name) && !/shapes\.txt$/i.test(f.name) });
      const files = new Map(Object.entries(raw));
      if (![...files.keys()].some((n) => /stop_times\.txt$/i.test(n))) throw new Error('GTFSのファイル（stop_times.txt）が見つかりません');
      feed = loadFeed(files, (table) => progress('parse', { table }));
      progress('index');
      ctx = buildIndex(feed);
      await getHolidays();
      reply(summary());
    } else if (!feed) {
      throw new Error('データがまだ読み込まれていません');
    } else if (type === 'search') {
      reply(searchPlaces(ctx, p.q, p.limit || 30).map(slim));
    } else if (type === 'reachable') {
      reply(reachablePlaces(feed, ctx, p.from).slice(0, p.limit || 400).map((r) => ({ ...slim(r.place), trips: r.trips, minutes: r.minutes })));
    } else if (type === 'nearest') {
      reply(nearestPlaces(ctx, p.lat, p.lon, p.limit || 8).map((r) => ({ ...slim(r.place), meters: r.meters })));
    } else if (type === 'resolve') {
      reply(resolveLink(p.a || {}, p.b || {}));
    } else if (type === 'geo') {
      reply(ctx.places.map((pl) => [pl.id, pl.lat, pl.lon, pl.name]));
    } else if (type === 'card') {
      const h = await getHolidays();
      // Pole choice from the page: 'auto', 'all' or a stop_id.
      const pole = (v) => {
        if (!v || v === 'auto') return 'auto';
        if (v === 'all') return null;
        const s = feed.stopIndex.get(v);
        return s === undefined ? 'auto' : [s];
      };
      const card = buildCard(feed, ctx, { ...p.opts, outPoles: pole(p.opts.outPole), backPoles: pole(p.opts.backPole), holidays: h });
      card.stopIds = { from: feed.stops.id[ctx.places[p.opts.from].poles[0]], to: feed.stops.id[ctx.places[p.opts.to].poles[0]] };
      const poleList = (pid) => ctx.places[pid].poles.map((s) => ({ stop: s, lat: feed.stops.lat[s], lon: feed.stops.lon[s] }));
      card.poles = { from: poleList(p.opts.from), to: poleList(p.opts.to) };
      reply(card);
    } else throw new Error('unknown request ' + type);
  } catch (err) {
    self.postMessage({ id, ok: false, error: String((err && err.message) || err) });
  }
};
