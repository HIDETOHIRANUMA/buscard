// Data worker: downloads, unzips and parses a GTFS feed, then answers queries from the page.
import { unzipSync } from '../vendor/fflate.js';
import { loadFeed, serviceDateRange } from './gtfs.js';
import { buildIndex, searchPlaces, reachablePlaces, nearestPlaces, buildCard, placeRoutes } from './core.js';

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
    } else if (type === 'place') {
      const pl = p.stopId ? placeByStopId(p.stopId) : ctx.places[p.id];
      reply(pl ? { ...slim(pl), stopId: feed.stops.id[pl.poles[0]] } : null);
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
