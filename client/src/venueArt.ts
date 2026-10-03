// Category illustrations used when a venue has no photo (for example places discovered on the map).
const THEME: Record<string, { a: string; b: string }> = {
  HEALTHCARE: { a: '#075985', b: '#0ea5e9' },
  RESTAURANT: { a: '#9a3412', b: '#fb923c' },
  RELIGIOUS: { a: '#92400e', b: '#fbbf24' },
  BANKING: { a: '#1e3a8a', b: '#60a5fa' },
  SALON: { a: '#9d174d', b: '#f472b6' }
};

function glyph(category: string): string {
  switch (category) {
    case 'HEALTHCARE':
      return (
        '<rect x="372" y="96" width="56" height="150" rx="14" fill="#fff" opacity=".95"/>' +
        '<rect x="325" y="143" width="150" height="56" rx="14" fill="#fff" opacity=".95"/>' +
        '<path d="M120 296 L250 296 L285 250 L330 330 L375 270 L405 296 L680 296" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>'
      );
    case 'RESTAURANT':
      return (
        '<circle cx="400" cy="170" r="92" fill="none" stroke="#fff" stroke-opacity=".9" stroke-width="10"/>' +
        '<circle cx="400" cy="170" r="62" fill="#fff" fill-opacity=".18"/>' +
        '<path d="M250 100 V240 M232 100 V150 Q232 170 250 170 Q268 170 268 150 V100" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>' +
        '<path d="M552 100 Q520 150 552 190 V250" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round"/>'
      );
    case 'RELIGIOUS':
      return (
        '<path d="M290 250 Q400 60 510 250 Z" fill="#fff" opacity=".92"/>' +
        '<line x1="400" y1="98" x2="400" y2="62" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="400" cy="52" r="9" fill="#fff"/>' +
        '<rect x="262" y="250" width="276" height="26" rx="6" fill="#fff" opacity=".85"/>' +
        '<path d="M368 250 V210 Q400 176 432 210 V250 Z" fill="#000" fill-opacity=".25"/>'
      );
    case 'BANKING':
      return (
        '<path d="M270 130 L400 62 L530 130 Z" fill="#fff" opacity=".95"/>' +
        '<rect x="292" y="146" width="28" height="98" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="346" y="146" width="28" height="98" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="426" y="146" width="28" height="98" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="480" y="146" width="28" height="98" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="262" y="252" width="276" height="22" rx="5" fill="#fff" opacity=".95"/>'
      );
    case 'SALON':
      return (
        '<circle cx="345" cy="232" r="30" fill="none" stroke="#fff" stroke-width="10"/>' +
        '<circle cx="455" cy="232" r="30" fill="none" stroke="#fff" stroke-width="10"/>' +
        '<path d="M365 208 L470 90 M435 208 L330 90" stroke="#fff" stroke-width="10" stroke-linecap="round"/>' +
        '<ellipse cx="600" cy="170" rx="46" ry="70" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-opacity=".7" stroke-width="6"/>'
      );
    default:
      return (
        '<path d="M400 90 a62 62 0 0 1 62 62 c0 52 -62 112 -62 112 s-62 -60 -62 -112 a62 62 0 0 1 62 -62 z" fill="#fff" opacity=".92"/>' +
        '<circle cx="400" cy="152" r="22" fill="#000" fill-opacity=".25"/>'
      );
  }
}

export function venueArtDataUri(category: string): string {
  const t = THEME[category] || { a: '#065f46', b: '#34d399' };
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 352" preserveAspectRatio="xMidYMid slice">' +
    '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + t.a + '"/><stop offset="1" stop-color="' + t.b + '"/></linearGradient></defs>' +
    '<rect width="800" height="352" fill="url(#g)"/>' +
    '<circle cx="90" cy="60" r="110" fill="#fff" fill-opacity=".07"/>' +
    '<circle cx="730" cy="320" r="150" fill="#fff" fill-opacity=".08"/>' +
    '<circle cx="640" cy="40" r="46" fill="#fff" fill-opacity=".08"/>' +
    glyph(category) +
    '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}