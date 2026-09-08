import L from "leaflet";
import {
  PROGRAM_META,
  type TaraProject,
} from "../../constants/taraProjects";

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Fill + soft highlight for pin gradient (from PROGRAM_META.color). */
export const PIN_COLORS: Record<string, { fill: string; soft: string }> =
  Object.fromEntries(
    Object.entries(PROGRAM_META).map(([key, meta]) => [
      key,
      { fill: meta.color, soft: meta.color },
    ]),
  );

const DEFAULT_PIN = { fill: "#7f23d0", soft: "#7f23d0" };

export type MapProject = Pick<
  TaraProject,
  | "id"
  | "name"
  | "program"
  | "province"
  | "status"
  | "progress"
  | "latitude"
  | "longitude"
> & {
  municipality?: string;
};

const pinIconCache = new Map<string, L.Icon>();

const pinColorsFor = (program: string) => PIN_COLORS[program] ?? DEFAULT_PIN;

const pinGlyphFor = (program: string) =>
  PROGRAM_META[program as keyof typeof PROGRAM_META]?.short ?? "PRJ";

/** SVG callout pin — circle + tip + label (matches HUB mock). */
export const buildPinSvgDataUri = (
  program: string,
  glyph: string,
  isActive: boolean,
): string => {
  const { fill, soft } = pinColorsFor(program);
  const label = escapeHtml(glyph.slice(0, 6).toUpperCase());
  const fontSize = glyph.length > 4 ? 9 : 11;
  const ring = isActive
    ? `<circle cx="24" cy="22" r="21" fill="none" stroke="#67e8f9" stroke-width="3" opacity="0.95"/>`
    : "";

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="58" viewBox="0 0 48 58">
  <defs>
    <radialGradient id="g" cx="38%" cy="30%" r="70%">
      <stop offset="0%" stop-color="${soft}"/>
      <stop offset="72%" stop-color="${fill}"/>
    </radialGradient>
    <filter id="s" x="-20%" y="-10%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="1.6" flood-opacity="0.45"/>
    </filter>
  </defs>
  <g filter="url(#s)">
    ${ring}
    <circle cx="24" cy="22" r="18" fill="url(#g)" stroke="#ffffff" stroke-width="2.5"/>
    <path d="M16 36 L24 48 L32 36 Z" fill="${fill}" stroke="#ffffff" stroke-width="1.2" stroke-linejoin="round"/>
    <text x="24" y="26" text-anchor="middle" font-family="system-ui,Segoe UI,sans-serif" font-size="${fontSize}" font-weight="800" letter-spacing="0.04em" fill="#ffffff">${label}</text>
  </g>
</svg>`.trim();

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/** Cached Leaflet image icon — cheap vs HTML divIcon for many markers. */
export const createLeafletPinIcon = (
  project: Pick<MapProject, "program">,
  isActive: boolean,
): L.Icon => {
  const glyph = pinGlyphFor(project.program);
  const key = `${project.program}|${glyph}|${isActive ? 1 : 0}`;
  const cached = pinIconCache.get(key);
  if (cached) return cached;

  const icon = L.icon({
    iconUrl: buildPinSvgDataUri(project.program, glyph, isActive),
    iconSize: [48, 58],
    iconAnchor: [24, 56],
    popupAnchor: [0, -48],
    tooltipAnchor: [0, -40],
    className: "project-pin-leaflet-icon",
  });
  pinIconCache.set(key, icon);
  return icon;
};

export const buildProjectPinHtml = (
  project: MapProject,
  isActive: boolean,
): string => {
  const meta = PROGRAM_META[project.program];
  const colors = pinColorsFor(project.program);
  const glyph = meta?.short ?? "PRJ";
  const classes = [
    "project-pin",
    meta?.pinClass ?? "project-pin--hub",
    glyph.length > 4 ? "project-pin--wide" : "",
    isActive ? "project-pin--active" : "",
    project.status === "delayed" ? "project-pin--alert" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return `
    <div
      class="${classes}"
      data-project-id="${escapeHtml(project.id)}"
      style="--pin:${colors.fill};--pin-soft:${colors.soft}"
    >
      <div class="project-pin__pulse"></div>
      <div class="project-pin__core" title="${escapeHtml(project.name)}">
        <span class="project-pin__glyph">${escapeHtml(glyph)}</span>
      </div>
      <div class="project-pin__point" aria-hidden="true"></div>
    </div>
  `;
};
