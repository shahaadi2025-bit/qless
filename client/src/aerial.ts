// Aerial (satellite) view used when no photo of a place can be found.
// Set to false to switch the aerial view off everywhere (the category artwork is shown instead).
export const AERIAL_ENABLED = true;

// Tiles are served by Esri World Imagery. Attribution is shown wherever the view appears.
export const AERIAL_CREDIT = 'Imagery: Esri, Maxar, Earthstar Geographics';

const ZOOM = 18; // building level

export interface AerialTile {
  url: string;
  left: number;
  top: number;
}

export interface AerialLayout {
  tiles: AerialTile[];
  /** Position of the place inside the 768 x 768 px grid of 3 x 3 tiles. */
  offsetX: number;
  offsetY: number;
}

export function aerialLayout(lat: number, lng: number): AerialLayout {
  const n = Math.pow(2, ZOOM);
  const latRad = (lat * Math.PI) / 180;
  const xf = ((lng + 180) / 360) * n;
  const yf = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const tx = Math.floor(xf);
  const ty = Math.floor(yf);
  const tiles: AerialTile[] = [];
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      tiles.push({
        url: `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${ZOOM}/${ty + dy}/${tx + dx}`,
        left: (dx + 1) * 256,
        top: (dy + 1) * 256
      });
    }
  }
  return { tiles, offsetX: 256 + (xf - tx) * 256, offsetY: 256 + (yf - ty) * 256 };
}