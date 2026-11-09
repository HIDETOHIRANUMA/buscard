// Phone lock-screen wallpaper (PNG) drawn on a canvas from the card model.
import { T, fmtDate, validUntil, enName } from './render.js';
import { iconPath } from './icons.js';

const W = 1170, H = 2532, S = 3; // design in points, 3 px per point
const UI_FONT = 'BIZ UDPGothic';
const NUM_FONT = 'BIZ UDGothic';
const FALLBACK = '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Yu Gothic", Meiryo, sans-serif';
const INK = '#1b2440', INK2 = '#4b5572', ON = '#0b7a6f', OFF = '#d4502a';
const hasKanji = (s) => /[一-鿿々〆ヶ]/.test(s || '');

const f = (pt, weight = 700, fam = UI_FONT) => `${weight} ${pt * S}px "${fam}", ${FALLBACK}`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fitSize(ctx, text, maxW, pt, minPt, weight = 700, fam = UI_FONT) {
  let s = pt;
  ctx.font = f(s, weight, fam);
  while (s > minPt && ctx.measureText(text).width / S > maxW) { s -= 0.5; ctx.font = f(s, weight, fam); }
  return s;
}

function ellipsize(ctx, text, maxW) {
  if (ctx.measureText(text).width / S <= maxW) return text;
  const chars = [...text];
  while (chars.length > 1 && ctx.measureText(chars.join('') + '…').width / S > maxW) chars.pop();
  return chars.join('') + '…';
}

async function iconImg(name, color, px) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="${px}" height="${px}" fill="none" stroke="${color}" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${iconPath(name)}</svg>`;
  const img = new Image();
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  try { await img.decode(); } catch { /* draw nothing if it fails */ }
  return img;
}

function shade(hex, k) {
  const n = parseInt(hex.replace('#', ''), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 0 ? v * (1 + k) : v + (255 - v) * k));
  return `rgb(${c.join(',')})`;
}

function tokensOf(d, lang) {
  return d.groups.map((g) => ({
    label: g.label, none: g.none,
    items: g.times.map((x) => ({
      mark: (d.mode === 'mark' || d.mode === 'pole') ? x.mark : '', phone: x.phone,
      t: x.t, dep: x.dep, code: d.mode === 'code' ? x.code : '',
    })),
    more: T[lang].more,
  }));
}

// Lays out the times of one direction; returns the drawn height (pt) and a draw function.
function layoutTimes(ctx, d, lang, width, maxLines) {
  const t = T[lang];
  const LABEL_W = 60, GAP = 9, LINE = 22, TIME_PT = 16.5;
  const rows = [];
  for (const g of tokensOf(d, lang)) {
    if (g.none || !g.items.length) { rows.push({ g, lines: [[{ text: t.none, none: true }]] }); continue; }
    const avail = width - LABEL_W - 8;
    const lines = [[]];
    let x = 0, shown = 0;
    const widthOf = (it) => {
      ctx.font = f(TIME_PT, 700, NUM_FONT);
      let w = ctx.measureText(it.t).width / S;
      ctx.font = f(11, 700);
      if (it.mark) w += ctx.measureText(it.mark).width / S + 1;
      if (it.phone) w += ctx.measureText('☎').width / S + 1;
      ctx.font = f(9.5, 700, NUM_FONT);
      if (it.code) w += ctx.measureText(it.code).width / S + 2;
      return w;
    };
    for (const it of g.items) {
      const w = widthOf(it);
      if (x > 0 && x + w > avail) {
        if (lines.length === maxLines) break;
        lines.push([]);
        x = 0;
      }
      lines[lines.length - 1].push({ ...it, w });
      x += w + GAP;
      shown++;
    }
    if (shown < g.items.length) {
      // Too many to list: show the span and how often the bus comes instead.
      const a = g.items[0], b = g.items[g.items.length - 1];
      const hours = Math.max(1, (b.dep - a.dep) / 3600);
      rows.push({ g, lines: [[{ text: t.freq(a.t, b.t, Math.max(1, Math.round(g.items.length / hours))), summary: true }]] });
      continue;
    }
    rows.push({ g, lines });
  }
  const height = rows.reduce((h, r) => h + r.lines.length * LINE + 4, 0);
  const draw = (x0, y0) => {
    let y = y0;
    for (const r of rows) {
      // day label
      ctx.fillStyle = '#efe9da';
      roundRect(ctx, x0 * S, (y + 2) * S, LABEL_W * S, (LINE - 4) * S, 5 * S);
      ctx.fill();
      ctx.fillStyle = INK;
      const ls = fitSize(ctx, r.g.label, LABEL_W - 6, 11.5, 6, 700);
      ctx.font = f(ls, 700);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ellipsize(ctx, r.g.label, LABEL_W - 4), (x0 + LABEL_W / 2) * S, (y + LINE / 2) * S);
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      for (const line of r.lines) {
        let x = x0 + LABEL_W + 8;
        const base = y + LINE / 2 + 6;
        for (const it of line) {
          if (it.summary) {
            const sz = fitSize(ctx, it.text, width - LABEL_W - 8, 14, 9, 700);
            ctx.font = f(sz, 700);
            ctx.fillStyle = INK;
            ctx.fillText(ellipsize(ctx, it.text, width - LABEL_W - 8), x * S, base * S);
            continue;
          }
          if (it.none || it.more) {
            ctx.font = f(11, 400);
            ctx.fillStyle = '#7c849b';
            ctx.fillText(ellipsize(ctx, it.text, width - LABEL_W - 8), x * S, base * S);
            x += ctx.measureText(it.text).width / S + GAP;
            continue;
          }
          ctx.fillStyle = INK;
          if (it.mark) { ctx.font = f(11, 700); ctx.fillText(it.mark, x * S, base * S); x += ctx.measureText(it.mark).width / S + 1; }
          if (it.phone) { ctx.font = f(11, 700); ctx.fillText('☎', x * S, base * S); x += ctx.measureText('☎').width / S + 1; }
          ctx.font = f(TIME_PT, 700, NUM_FONT);
          ctx.fillText(it.t, x * S, base * S);
          x += ctx.measureText(it.t).width / S;
          if (it.code) { ctx.font = f(9.5, 700, NUM_FONT); ctx.fillStyle = INK2; ctx.fillText(it.code, (x + 2) * S, (base - 6) * S); x += ctx.measureText(it.code).width / S + 2; }
          x += GAP;
        }
        y += LINE;
      }
      y += 4;
    }
  };
  return { height, draw };
}

// Fits a stop name in one line, or two lines when it is long; returns the lines and font size (pt).
function nameLayout(ctx, name, width) {
  const one = fitSize(ctx, name, width, 21, 13, 700);
  ctx.font = f(one, 700);
  if (ctx.measureText(name).width / S <= width) return { lines: [name], size: one };
  const chars = [...name];
  const cuts = [];
  chars.forEach((ch, i) => { if (i > 0 && /[\s\-(（・]/.test(ch)) cuts.push(ch === ' ' ? i : i); });
  if (!cuts.length) cuts.push(Math.ceil(chars.length / 2));
  let best = null;
  for (const c of cuts) {
    const a = chars.slice(0, c).join('').trim(), b = chars.slice(c).join('').trim();
    ctx.font = f(10, 700);
    const w = Math.max(ctx.measureText(a).width, ctx.measureText(b).width);
    if (!best || w < best.w) best = { a, b, w };
  }
  let size = 17;
  for (; size > 10; size -= 0.5) {
    ctx.font = f(size, 700);
    if (Math.max(ctx.measureText(best.a).width, ctx.measureText(best.b).width) / S <= width) break;
  }
  ctx.font = f(size, 700);
  return { lines: [ellipsize(ctx, best.a, width), ellipsize(ctx, best.b, width)], size };
}

function stopLabel(s, lang) {
  return lang === 'en' ? (enName(s.en) || s.name) : s.name;
}

async function panel(ctx, d, which, o, x0, y0, width, maxLines, icons, dryRun) {
  const lang = o.lang === 'en' ? 'en' : 'ja';
  const t = T[lang];
  const pad = 13;
  const inner = width - pad * 2;
  let v0 = d.variants[0];
  const times = layoutTimes(ctx, d, lang, inner, maxLines);
  const furi = lang === 'ja' && o.furigana;
  const colW = (inner - 26) / 2;
  const showReading = (s) => furi && s.reading && hasKanji(s.name) && s.reading !== s.name;
  const fromL = nameLayout(ctx, stopLabel(d.from, lang), colW), toL = nameLayout(ctx, stopLabel(d.to, lang), colW);
  const tripH = (L, s) => 15 + (showReading(s) ? 12 : 3) + L.lines.length * L.size * 1.15 + 2;
  const HEAD = 24, TRIP = Math.max(furi ? 50 : 42, tripH(fromL, d.from), tripH(toL, d.to)), BUS = 35, FOOT = 20;
  const hasLegend = ((d.mode === 'mark' || d.mode === 'code' || d.mode === 'pole') && d.variants.length > 1) || d.mode === 'dest';
  const LEG = hasLegend ? 17 : 0;
  const height = pad + HEAD + 8 + TRIP + 6 + BUS + LEG + 8 + (d.variants.length ? times.height : 24) + 6 + FOOT + pad - 4;
  if (dryRun) return height;

  // card body
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,.28)';
  ctx.shadowBlur = 18 * S;
  ctx.shadowOffsetY = 4 * S;
  ctx.fillStyle = 'rgba(255,253,248,.97)';
  roundRect(ctx, x0 * S, y0 * S, width * S, height * S, 22 * S);
  ctx.fill();
  ctx.restore();

  let y = y0 + pad;
  const x = x0 + pad;
  // header: direction pill, owner, icon
  ctx.font = f(13, 700);
  const dir = which === 'out' ? t.out : t.back;
  const pillW = ctx.measureText(dir).width / S + 18;
  ctx.fillStyle = which === 'out' ? '#ffe28a' : '#bfe8df';
  roundRect(ctx, x * S, y * S, pillW * S, HEAD * S, 8 * S);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.textBaseline = 'middle';
  ctx.fillText(dir, (x + 9) * S, (y + HEAD / 2 + 1) * S);
  const title = o.owner ? t.owner(o.owner) : t.title;
  ctx.font = f(12.5, 700);
  ctx.fillStyle = INK2;
  ctx.fillText(ellipsize(ctx, title, inner - pillW - 50), (x + pillW + 10) * S, (y + HEAD / 2 + 1) * S);
  const ic = which === 'out' ? icons.dest : icons.home;
  if (ic && ic.complete) ctx.drawImage(ic, (x + inner - 24) * S, y * S, 24 * S, 24 * S);
  ctx.textBaseline = 'alphabetic';
  y += HEAD + 8;

  // trip: get on -> get off
  const drawStop = (sx, tag, color, s, L) => {
    ctx.font = f(10, 700);
    const tw = ctx.measureText(tag).width / S + 10;
    ctx.fillStyle = color;
    roundRect(ctx, sx * S, y * S, tw * S, 15 * S, 4 * S);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.textBaseline = 'middle';
    ctx.fillText(tag, (sx + 5) * S, (y + 8) * S);
    ctx.textBaseline = 'alphabetic';
    let ny = y + 15 + (showReading(s) ? 12 : 3);
    if (showReading(s)) {
      ctx.font = f(Math.min(10, L.size * 0.5), 400);
      ctx.fillStyle = INK2;
      ctx.fillText(ellipsize(ctx, s.reading, colW), sx * S, (y + 15 + 10) * S);
    }
    ctx.font = f(L.size, 700);
    ctx.fillStyle = INK;
    for (const line of L.lines) {
      ny += L.size * 1.05;
      ctx.fillText(line, sx * S, ny * S);
      ny += L.size * 0.1;
    }
  };
  drawStop(x, t.board, ON, d.from, fromL);
  if (icons.arrow && icons.arrow.complete) ctx.drawImage(icons.arrow, (x + colW + 3) * S, (y + 20) * S, 20 * S, 20 * S);
  drawStop(x + colW + 26, t.alight, OFF, d.to, toL);
  y += TRIP + 6;

  // bus: LED plate or "any bus"
  if (!d.variants.length) {
    ctx.font = f(fitSize(ctx, t.noDirect, inner, 13, 9, 700), 700);
    ctx.fillStyle = INK2;
    ctx.fillText(ellipsize(ctx, t.noDirect, inner), x * S, (y + 24) * S);
    return height;
  }
  if (d.mode === 'any') {
    if (icons.check && icons.check.complete) ctx.drawImage(icons.check, x * S, (y + 7) * S, 24 * S, 24 * S);
    ctx.font = f(15, 700);
    ctx.fillStyle = ON;
    ctx.fillText(t.any, (x + 28) * S, (y + 25) * S);
  } else {
    const dest = lang === 'en' ? (enName(v0.destEn) || v0.dest) : v0.dest;
    if (d.mode === 'dest' && !(d.dests && d.dests.length > 1)) v0 = { ...v0, code: '' };
    const yuki = lang === 'en' ? '' : (v0.yuki ? t.yuki : '');
    ctx.font = f(13, 700, NUM_FONT);
    const codeW = v0.code ? ctx.measureText(v0.code).width / S + 10 : 0;
    ctx.font = f(11, 700, NUM_FONT);
    const yukiW = yuki ? ctx.measureText(yuki).width / S + 4 : 0;
    const maxDest = inner - codeW - yukiW - 30;
    const LED_FONT = lang === 'en' ? UI_FONT : NUM_FONT;
    const ds = fitSize(ctx, dest, maxDest, 19, 10, 700, LED_FONT);
    const destW = Math.min(maxDest, ctx.measureText(dest).width / S);
    const plateW = 14 + codeW + (codeW ? 8 : 0) + destW + yukiW + 14;
    ctx.fillStyle = '#161616';
    roundRect(ctx, x * S, y * S, plateW * S, BUS * S, 7 * S);
    ctx.fill();
    let px = x + 14;
    if (v0.code) {
      ctx.fillStyle = '#fff';
      roundRect(ctx, px * S, (y + 8) * S, codeW * S, (BUS - 16) * S, 4 * S);
      ctx.fill();
      ctx.fillStyle = '#111';
      ctx.font = f(13, 700, NUM_FONT);
      ctx.textBaseline = 'middle';
      ctx.fillText(v0.code, (px + 5) * S, (y + BUS / 2 + 1) * S);
      px += codeW + 8;
    }
    ctx.save();
    ctx.shadowColor = 'rgba(255,178,31,.7)';
    ctx.shadowBlur = 5 * S;
    ctx.fillStyle = '#ffb21f';
    ctx.font = f(ds, 700, LED_FONT);
    ctx.textBaseline = 'middle';
    ctx.fillText(ellipsize(ctx, dest, maxDest), px * S, (y + BUS / 2 + 1) * S);
    if (yuki) { ctx.font = f(11, 700, NUM_FONT); ctx.fillText(yuki, (px + destW + 4) * S, (y + BUS / 2 + 2) * S); }
    ctx.restore();
    ctx.textBaseline = 'alphabetic';
  }
  y += BUS;
  if (hasLegend && d.mode === 'dest') {
    ctx.font = f(11.5, 700);
    ctx.fillStyle = ON;
    const many = d.dests && d.dests.length > 1;
    const names = many ? d.dests.map((x) => (lang === 'en' ? (enName(x.en) || x.name) : x.name)).join(' / ') : '';
    const text = many ? `${t.anyDests}：${names}` : t.anyDest(lang === 'en' ? (enName(v0.destEn) || v0.dest) : v0.dest);
    ctx.fillText(ellipsize(ctx, text, inner), x * S, (y + 14) * S);
    y += LEG;
  } else if (hasLegend) {
    ctx.font = f(10.5, 400);
    ctx.fillStyle = INK2;
    const parts = d.variants.slice(0, 4).map((v) => {
      const key = d.mode === 'code' ? `[${v.code}]` : (v.mark || (lang === 'en' ? '—' : '無印'));
      const label = d.mode === 'pole' ? v.board.text : (lang === 'en' ? (enName(v.destEn) || v.dest) : v.dest + (v.yuki ? t.yuki : ''));
      return `${key} ${label}`;
    });
    if (d.variants.length > 4) parts.push(t.others(d.variants.length - 4));
    ctx.fillText(ellipsize(ctx, parts.join('　'), inner), x * S, (y + 14) * S);
    y += LEG;
  }
  y += 8;
  times.draw(x, y);
  y += times.height + 6;

  // footer: bell cue and fare
  ctx.strokeStyle = '#d8d0bd';
  ctx.setLineDash([4 * S, 3 * S]);
  ctx.lineWidth = 1 * S;
  ctx.beginPath();
  ctx.moveTo(x * S, (y - 3) * S);
  ctx.lineTo((x + inner) * S, (y - 3) * S);
  ctx.stroke();
  ctx.setLineDash([]);
  if (icons.bell && icons.bell.complete) ctx.drawImage(icons.bell, x * S, (y + 1) * S, 17 * S, 17 * S);
  let fareText = '';
  if (d.fare) {
    const a = d.fare.min === d.fare.max ? t.yen(d.fare.min) : `${t.yen(d.fare.min)}〜`;
    fareText = a;
  }
  ctx.font = f(11.5, 400);
  const fareW = fareText ? ctx.measureText(fareText).width / S + 6 : 0;
  const b = d.bell || { type: 'soon' };
  const nm = (x) => (lang === 'en' ? (enName(x.en) || x.name) : x.name);
  const bell = b.type === 'after' ? (lang === 'en' ? `Press after ${nm(b.stop)}` : `${nm(b.stop)} を でたら ボタン`)
    : b.type === 'next' ? (lang === 'en' ? `Press at "Next: ${nm(d.to)}"` : `「つぎは ${nm(d.to)}」で ボタン`) : t.bellNext;
  ctx.fillStyle = OFF;
  ctx.font = f(12, 700);
  ctx.fillText(ellipsize(ctx, bell, inner - 22 - fareW), (x + 21) * S, (y + 14) * S);
  if (fareText) {
    ctx.font = f(11.5, 400);
    ctx.fillStyle = INK2;
    ctx.textAlign = 'right';
    ctx.fillText(fareText, (x + inner) * S, (y + 14) * S);
    ctx.textAlign = 'left';
  }
  return height;
}

function collectText(card, o) {
  const lang = o.lang === 'en' ? 'en' : 'ja';
  const t = T[lang];
  const parts = [t.out, t.back, t.board, t.alight, t.yuki, t.any, t.anyDest(''), t.anyDests, t.none, t.bellNext, t.noDirect, t.title, o.owner ? t.owner(o.owner) : '', 'を でたら ボタン Press after at Next 「」つぎは で 〜…円¥0123456789:ほか本無印▲●■◆★▼◎☎　・1時間に やく本 about an hour –"', t.credit, t.valid(''), 'GTFS-JP わたしのバスカード'];
  for (const d of [card.outbound, card.inbound]) {
    if (!d) continue;
    parts.push(d.from.name, d.from.reading, d.from.en, d.to.name, d.to.reading, d.to.en);
    for (const v of d.variants) parts.push(v.dest, v.destEn, v.code, v.board.text);
    for (const g of d.groups) parts.push(g.label);
    if (d.prev) parts.push(d.prev.name, d.prev.en);
  }
  parts.push(card.agency.name, card.feedInfo.publisher);
  return parts.filter(Boolean).join('');
}

// The layout of the wallpaper, in points (390 x 844, 3 px each):
//  - 0 to TOP (the top third) stays empty for the clock of the lock screen;
//  - the panels and the data credit end above BOTTOM, clear of the buttons at the bottom of the screen.
// When they do not fit at full size, the busy rows are first shown as "6:47〜9:58　1時間に やく9本",
// then everything is drawn smaller, step by step, until it fits.
const TOP = 282, BOTTOM = 778, CREDIT = 18, GAP = 12, X = 16, WIDTH = 390 - 32;
const MIN_STEP = 0.7;

async function fitPanels(ctx, dirs, o, icons) {
  const room = BOTTOM - TOP - CREDIT - GAP * (dirs.length - 1);
  const maxLines = dirs.length > 1 ? 3 : 6;
  // Height of each panel when drawn k times smaller than the design, with at most `lines` lines per row.
  const sizes = async (k, lines) => {
    const hs = [];
    for (const [which, d] of dirs) hs.push(k * await panel(ctx, d, which, o, X / k, 0, WIDTH / k, lines, icons, true));
    return hs;
  };
  const sum = (hs) => hs.reduce((a, b) => a + b, 0);
  for (let k = 1; k >= MIN_STEP - 1e-9; k -= 0.02) {
    for (let lines = maxLines; lines >= 1; lines--) {
      const hs = await sizes(k, lines);
      if (sum(hs) <= room) return { k, lines, hs };
    }
  }
  // Still too tall (many day groups, long names): shrink to the room that is left, whatever it takes.
  let k = MIN_STEP, hs = await sizes(k, 1);
  for (let i = 0; i < 40 && sum(hs) > room; i++) {
    k *= Math.min(0.98, room / sum(hs));
    hs = await sizes(k, 1);
  }
  return { k, lines: 1, hs };
}

export async function makeWallpaper(card, o, report = null) {
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  const text = collectText(card, o);
  try {
    await Promise.all([
      document.fonts.load(f(12, 700), text), document.fonts.load(f(12, 400), text), document.fonts.load(f(12, 700, NUM_FONT), text),
    ]);
  } catch { /* system fonts are used instead */ }

  const v0 = card.outbound?.variants[0];
  const base = v0?.route?.color ? `#${v0.route.color}` : '#2b4a8b';
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, shade(base, -0.35));
  g.addColorStop(0.55, shade(base, -0.55));
  g.addColorStop(1, '#10131c');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // soft circles for texture
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = '#ffffff';
  for (const [cx, cy, r] of [[180, 520, 360], [1000, 300, 280], [900, 2300, 420]]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); }
  ctx.globalAlpha = 1;

  const icons = {
    dest: await iconImg(o.icon || 'star', INK, 96), home: await iconImg('home', INK, 96), arrow: await iconImg('arrow', '#7c849b', 80),
    check: await iconImg('check', ON, 96), bell: await iconImg('bell', OFF, 72),
  };
  const dirs = [['out', card.outbound], ['back', card.inbound]].filter(([, d]) => d);
  const { k, lines, hs: heights } = await fitPanels(ctx, dirs, o, icons);
  const panels = [];
  let y = TOP;
  for (let i = 0; i < dirs.length; i++) {
    const [which, d] = dirs[i];
    // Drawn in a coordinate system k times smaller: the panel keeps its width, everything in it shrinks.
    ctx.save();
    ctx.scale(k, k);
    await panel(ctx, d, which, o, X / k, y / k, WIDTH / k, lines, icons, false);
    ctx.restore();
    panels.push({ x: X, y, w: WIDTH, h: heights[i] });
    y += heights[i] + GAP;
  }
  // data credit and validity
  const lang = o.lang === 'en' ? 'en' : 'ja';
  const t = T[lang];
  const end = validUntil(card);
  const credit = [`${t.credit}：${card.agency.name || card.feedInfo.publisher}`, end ? t.valid(fmtDate(end, lang)) : ''].filter(Boolean).join('　');
  ctx.font = f(10, 400);
  ctx.fillStyle = 'rgba(255,255,255,.75)';
  ctx.textAlign = 'center';
  ctx.fillText(ellipsize(ctx, credit, WIDTH), (390 / 2) * S, (y + 4) * S);
  ctx.textAlign = 'left';
  // For automated checks: where things were drawn (points).
  if (report) Object.assign(report, { width: W / S, height: H / S, top: TOP, bottom: BOTTOM, scale: k, lines, panels, creditBaseline: y + 4 });
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}
