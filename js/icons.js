// Simple line icons (24x24, stroke = currentColor). Drawn for this app.
const P = {
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 21v-3M16 21v-3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/><path d="M8 6.5h8"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>',
  coin: '<circle cx="12" cy="12" r="8.5"/><path d="M9 8.5l3 4 3-4M12 12.5V17M9.5 13.5h5M9.5 15.5h5"/>',
  clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  phone: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  home: '<path d="M3.5 11.5L12 4l8.5 7.5"/><path d="M6 10v10h12V10"/><path d="M10 20v-5h4v5"/>',
  school: '<path d="M4 20V9l8-5 8 5v11"/><path d="M2.5 20h19M9.5 20v-4.5h5V20"/><circle cx="12" cy="10" r="2"/>',
  juku: '<path d="M4 5.5h6.5a2 2 0 0 1 1.5.7 2 2 0 0 1 1.5-.7H20v13h-6.5a2 2 0 0 0-1.5.7 2 2 0 0 0-1.5-.7H4z"/><path d="M12 6.2v13.5"/>',
  hospital: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M12 8.5v8M8 12.5h8"/>',
  shop: '<path d="M4 9.5l1.5-5h13L20 9.5"/><path d="M4 9.5a2.7 2.7 0 0 0 5.3 0 2.7 2.7 0 0 0 5.4 0 2.7 2.7 0 0 0 5.3 0"/><path d="M5.5 12v8h13v-8M10 20v-4h4v4"/>',
  station: '<rect x="6" y="3.5" width="12" height="13" rx="3"/><path d="M6 10.5h12M9 20l1.5-3.5M15 20l-1.5-3.5"/><circle cx="9.5" cy="13.5" r=".8"/><circle cx="14.5" cy="13.5" r=".8"/>',
  park: '<path d="M12 3.5l-5 7h3l-3.5 5h11L14 10.5h3z"/><path d="M12 15.5v5"/>',
  work: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V5.5h6v2M3.5 12.5h17"/>',
  heart: '<path d="M12 19.5s-7.5-4.6-7.5-10A4 4 0 0 1 12 7.2a4 4 0 0 1 7.5 2.3c0 5.4-7.5 10-7.5 10z"/>',
  star: '<path d="M12 4l2.4 5 5.4.6-4 3.7 1.1 5.4L12 16l-4.9 2.7 1.1-5.4-4-3.7 5.4-.6z"/>',
  temple: '<path d="M3 8.5h18M5 8.5l1-3h12l1 3M6 8.5V20M18 8.5V20M9.5 11.5v8.5M14.5 11.5v8.5M3.5 20h17"/>',
  pin: '<path d="M12 21s-6-6.2-6-11a6 6 0 0 1 12 0c0 4.8-6 11-6 11z"/><circle cx="12" cy="10" r="2.2"/>',
  arrow: '<path d="M4 12h15M14 6.5l5.5 5.5-5.5 5.5"/>',
  print: '<path d="M7 9V3.5h10V9"/><rect x="3.5" y="9" width="17" height="8" rx="2"/><path d="M7 14h10v6.5H7z"/>',
  image: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 18l5-5 4 4 2.5-2.5L20 19"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  upload: '<path d="M12 15.5V4.5M7.5 9L12 4.5 16.5 9"/><path d="M4.5 15v4.5h15V15"/>',
  map: '<path d="M3.5 6.5l5.5-2 6 2 5.5-2v13l-5.5 2-6-2-5.5 2z"/><path d="M9 4.5v13M15 6.5v13"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2.5-6-2.5-2.5L11.5 8l3.5 2.5 2.5 1M11.5 8L8 10l-1 3.5M12.5 15l3 6"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.5v.5"/>',
};

export const PLACE_ICONS = [
  ['school', { ja: 'がっこう', en: 'School' }],
  ['juku', { ja: 'じゅく・ならいごと', en: 'Lessons' }],
  ['hospital', { ja: 'びょういん', en: 'Hospital' }],
  ['shop', { ja: 'おみせ', en: 'Shop' }],
  ['station', { ja: 'えき', en: 'Station' }],
  ['park', { ja: 'こうえん', en: 'Park' }],
  ['work', { ja: 'しごと・かよう所', en: 'Work' }],
  ['heart', { ja: 'デイサービス・あつまり', en: 'Day care' }],
  ['temple', { ja: 'やくしょ・こうみんかん', en: 'City hall' }],
  ['home', { ja: 'いえ', en: 'Home' }],
  ['star', { ja: 'そのほか', en: 'Other' }],
];

export function icon(name, cls = 'ic', title = '') {
  const body = P[name] || P.star;
  const t = title ? `<title>${title}</title>` : '';
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="${title ? 'false' : 'true'}"${title ? ' role="img"' : ''}>${t}${body}</svg>`;
}

// Paths for drawing on a canvas (wallpaper image).
export function iconPath(name) {
  return P[name] || P.star;
}
