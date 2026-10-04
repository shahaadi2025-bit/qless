// Category illustrations used when a venue has no photo (for example places discovered on the map).
const THEME: Record<string, { a: string; b: string }> = {
  HEALTHCARE: { a: '#075985', b: '#0ea5e9' },
  RESTAURANT: { a: '#9a3412', b: '#fb923c' },
  RELIGIOUS: { a: '#92400e', b: '#fbbf24' },
  BANKING: { a: '#1e3a8a', b: '#60a5fa' },
  SALON: { a: '#9d174d', b: '#f472b6' },
  PHARMACY: { a: '#047857', b: '#34d399' },
  EDUCATION: { a: '#5b21b6', b: '#a78bfa' },
  GOVERNMENT: { a: '#334155', b: '#94a3b8' },
  SHOPPING: { a: '#be123c', b: '#fb7185' },
  TRANSPORT: { a: '#0e7490', b: '#22d3ee' },
  ENTERTAINMENT: { a: '#7e22ce', b: '#c084fc' },
  FUEL: { a: '#a16207', b: '#facc15' },
  LODGING: { a: '#0f766e', b: '#5eead4' },
  LEISURE: { a: '#15803d', b: '#86efac' },
  ATTRACTION: { a: '#c2410c', b: '#fdba74' },
  SERVICES: { a: '#475569', b: '#cbd5e1' }
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
    case 'PHARMACY':
      return (
        '<g transform="rotate(-35 400 176)">' +
        '<rect x="295" y="138" width="210" height="76" rx="38" fill="#fff" opacity=".95"/>' +
        '<path d="M400 138 H467 A38 38 0 0 1 467 214 H400 Z" fill="#000" fill-opacity=".18"/>' +
        '</g>' +
        '<rect x="556" y="84" width="16" height="52" rx="4" fill="#fff"/>' +
        '<rect x="538" y="102" width="52" height="16" rx="4" fill="#fff"/>'
      );
    case 'EDUCATION':
      return (
        '<polygon points="400,86 548,152 400,218 252,152" fill="#fff" opacity=".95"/>' +
        '<path d="M318 186 V240 Q400 282 482 240 V186 L400 224 Z" fill="#fff" opacity=".85"/>' +
        '<path d="M548 152 V230" stroke="#fff" stroke-width="7" stroke-linecap="round"/>' +
        '<circle cx="548" cy="238" r="9" fill="#fff"/>'
      );
    case 'GOVERNMENT':
      return (
        '<line x1="400" y1="44" x2="400" y2="104" stroke="#fff" stroke-width="6" stroke-linecap="round"/>' +
        '<polygon points="400,46 456,62 400,80" fill="#fff"/>' +
        '<path d="M272 150 L400 100 L528 150 Z" fill="#fff" opacity=".95"/>' +
        '<rect x="296" y="164" width="26" height="86" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="354" y="164" width="26" height="86" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="420" y="164" width="26" height="86" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="478" y="164" width="26" height="86" rx="5" fill="#fff" opacity=".85"/>' +
        '<rect x="266" y="256" width="268" height="20" rx="5" fill="#fff"/>'
      );
    case 'SHOPPING':
      return (
        '<path d="M300 132 H500 L522 268 H278 Z" fill="#fff" opacity=".95"/>' +
        '<path d="M345 132 V116 Q345 70 400 70 Q455 70 455 116 V132" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>' +
        '<circle cx="360" cy="168" r="8" fill="#000" fill-opacity=".25"/>' +
        '<circle cx="440" cy="168" r="8" fill="#000" fill-opacity=".25"/>'
      );
    case 'TRANSPORT':
      return (
        '<rect x="310" y="86" width="180" height="156" rx="30" fill="#fff" opacity=".95"/>' +
        '<rect x="332" y="110" width="136" height="64" rx="10" fill="#000" fill-opacity=".28"/>' +
        '<circle cx="348" cy="206" r="10" fill="#000" fill-opacity=".3"/>' +
        '<circle cx="452" cy="206" r="10" fill="#000" fill-opacity=".3"/>' +
        '<path d="M300 262 L258 312 M500 262 L542 312" stroke="#fff" stroke-width="8" stroke-linecap="round"/>'
      );
    case 'ENTERTAINMENT':
      return (
        '<rect x="288" y="140" width="224" height="124" rx="14" fill="#fff" opacity=".95"/>' +
        '<path d="M288 140 L316 84 H368 L340 140 Z" fill="#fff" opacity=".9"/>' +
        '<path d="M352 140 L380 84 H432 L404 140 Z" fill="#fff" opacity=".7"/>' +
        '<path d="M416 140 L444 84 H496 L468 140 Z" fill="#fff" opacity=".9"/>' +
        '<polygon points="378,172 378,236 440,204" fill="#000" fill-opacity=".28"/>'
      );
    case 'FUEL':
      return (
        '<rect x="318" y="86" width="124" height="172" rx="16" fill="#fff" opacity=".95"/>' +
        '<rect x="340" y="110" width="80" height="52" rx="8" fill="#000" fill-opacity=".28"/>' +
        '<path d="M442 134 H470 Q492 134 492 156 V214 Q492 236 514 236" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round"/>' +
        '<rect x="296" y="258" width="168" height="18" rx="6" fill="#fff"/>'
      );
    case 'LODGING':
      return (
        '<rect x="290" y="170" width="220" height="70" rx="12" fill="#fff" opacity=".95"/>' +
        '<rect x="290" y="130" width="90" height="48" rx="12" fill="#fff" opacity=".85"/>' +
        '<rect x="300" y="240" width="14" height="30" rx="3" fill="#fff"/>' +
        '<rect x="486" y="240" width="14" height="30" rx="3" fill="#fff"/>' +
        '<rect x="392" y="140" width="118" height="34" rx="10" fill="#fff" opacity=".7"/>'
      );
    case 'LEISURE':
      return (
        '<circle cx="400" cy="130" r="70" fill="#fff" opacity=".95"/>' +
        '<circle cx="345" cy="165" r="48" fill="#fff" opacity=".85"/>' +
        '<circle cx="455" cy="165" r="48" fill="#fff" opacity=".85"/>' +
        '<rect x="388" y="190" width="24" height="86" rx="8" fill="#fff"/>'
      );
    case 'ATTRACTION':
      return (
        '<polygon points="400,70 427,140 500,146 444,194 462,265 400,226 338,265 356,194 300,146 373,140" fill="#fff" opacity=".95"/>'
      );
    case 'SERVICES':
      return (
        '<rect x="300" y="130" width="200" height="130" rx="16" fill="#fff" opacity=".95"/>' +
        '<path d="M360 130 V108 Q360 92 376 92 H424 Q440 92 440 108 V130" fill="none" stroke="#fff" stroke-width="10"/>' +
        '<rect x="300" y="186" width="200" height="14" fill="#000" fill-opacity=".18"/>' +
        '<rect x="386" y="178" width="28" height="30" rx="6" fill="#000" fill-opacity=".25"/>'
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