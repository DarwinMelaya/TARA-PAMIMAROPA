import {
    PROVINCE_MAP_CENTER,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';

type LatLng = { lat: number; lng: number };

/** Known municipality / city centers (lng/lat) for MIMAROPA map pins. */
const CITY_COORDS: Record<string, LatLng> = {
    // Oriental Mindoro
    'oriental mindoro|calapan city': { lat: 13.4117, lng: 121.1803 },
    'oriental mindoro|calapan': { lat: 13.4117, lng: 121.1803 },
    'oriental mindoro|puerto galera': { lat: 13.5031, lng: 120.9517 },
    'oriental mindoro|victoria': { lat: 13.1764, lng: 121.2756 },
    'oriental mindoro|naujan': { lat: 13.2667, lng: 121.2 },
    'oriental mindoro|pinamalayan': { lat: 13.0333, lng: 121.4833 },
    'oriental mindoro|roxas': { lat: 12.5833, lng: 121.5167 },
    'oriental mindoro|bansud': { lat: 12.8667, lng: 121.45 },
    'oriental mindoro|bongabong': { lat: 12.75, lng: 121.4833 },
    'oriental mindoro|mansalay': { lat: 12.5167, lng: 121.4333 },
    'oriental mindoro|bulalacao': { lat: 12.3333, lng: 121.35 },
    'oriental mindoro|socorro': { lat: 13.05, lng: 121.4 },
    'oriental mindoro|pola': { lat: 13.15, lng: 121.45 },
    'oriental mindoro|gloria': { lat: 12.9833, lng: 121.4833 },
    // Occidental Mindoro
    'occidental mindoro|sablayan': { lat: 12.8344, lng: 120.7829 },
    'occidental mindoro|san jose': { lat: 12.3528, lng: 121.0675 },
    'occidental mindoro|mamburao': { lat: 13.2233, lng: 120.5964 },
    'occidental mindoro|lubang': { lat: 13.85, lng: 120.12 },
    'occidental mindoro|looc': { lat: 13.72, lng: 120.25 },
    'occidental mindoro|paluan': { lat: 13.4167, lng: 120.4667 },
    'occidental mindoro|abram': { lat: 13.1167, lng: 120.7 },
    'occidental mindoro|abra de ilog': { lat: 13.45, lng: 120.7333 },
    'occidental mindoro|santa cruz': { lat: 13.0833, lng: 120.7167 },
    'occidental mindoro|calintaan': { lat: 12.5667, lng: 120.9333 },
    'occidental mindoro|rizal': { lat: 12.4667, lng: 120.9667 },
    'occidental mindoro|magsaysay': { lat: 12.3167, lng: 121.15 },
    // Marinduque
    'marinduque|boac': { lat: 13.4467, lng: 121.8394 },
    'marinduque|torrijos': { lat: 13.3186, lng: 122.0856 },
    'marinduque|mogpog': { lat: 13.4833, lng: 121.8667 },
    'marinduque|gasan': { lat: 13.3167, lng: 121.85 },
    'marinduque|buenavista': { lat: 13.25, lng: 121.95 },
    'marinduque|santa cruz': { lat: 13.4833, lng: 122.1 },
    // Romblon
    'romblon|odiongan': { lat: 12.4008, lng: 121.9881 },
    'romblon|looc': { lat: 12.2603, lng: 121.9925 },
    'romblon|romblon': { lat: 12.5754, lng: 122.2708 },
    'romblon|cajidiocan': { lat: 12.3667, lng: 122.6833 },
    'romblon|san fernando': { lat: 12.2833, lng: 122.6 },
    'romblon|magdiwang': { lat: 12.5, lng: 122.5167 },
    'romblon|san agustin': { lat: 12.5667, lng: 122.1333 },
    'romblon|calatrava': { lat: 12.6167, lng: 122.0667 },
    'romblon|alcantara': { lat: 12.2667, lng: 122.0 },
    'romblon|ferrol': { lat: 12.3333, lng: 121.9333 },
    'romblon|santa fe': { lat: 12.15, lng: 122.0 },
    'romblon|san jose': { lat: 12.05, lng: 121.95 },
    'romblon|corcuera': { lat: 12.8, lng: 122.05 },
    'romblon|banton': { lat: 12.95, lng: 122.0833 },
    'romblon|concepcion': { lat: 12.9167, lng: 122.15 },
    // Palawan
    'palawan|puerto princesa city': { lat: 9.7392, lng: 118.7353 },
    'palawan|puerto princesa': { lat: 9.7392, lng: 118.7353 },
    'palawan|coron': { lat: 12.0011, lng: 120.2097 },
    'palawan|el nido': { lat: 11.1787, lng: 119.3915 },
    'palawan|culion': { lat: 11.8375, lng: 119.9928 },
    'palawan|roxas': { lat: 10.3194, lng: 119.3431 },
    'palawan|taytay': { lat: 10.8333, lng: 119.5167 },
    'palawan|narra': { lat: 9.2667, lng: 118.4 },
    'palawan|brooke\'s point': { lat: 8.7833, lng: 117.8333 },
    'palawan|brookes point': { lat: 8.7833, lng: 117.8333 },
    'palawan|bataraza': { lat: 8.6667, lng: 117.5833 },
    'palawan|quezón': { lat: 9.2333, lng: 118.0 },
    'palawan|quezon': { lat: 9.2333, lng: 118.0 },
    'palawan|aborlan': { lat: 9.4333, lng: 118.55 },
    'palawan|rizal': { lat: 9.0, lng: 117.65 },
    'palawan|sofronio española': { lat: 9.0, lng: 117.9833 },
    'palawan|española': { lat: 9.0, lng: 117.9833 },
    'palawan|espanola': { lat: 9.0, lng: 117.9833 },
    'palawan|dumaran': { lat: 10.5333, lng: 119.7667 },
    'palawan|araceli': { lat: 10.55, lng: 119.9833 },
    'palawan|cuyo': { lat: 10.85, lng: 121.0333 },
    'palawan|magsaysay': { lat: 10.8667, lng: 121.05 },
    'palawan|agutaya': { lat: 11.15, lng: 120.9333 },
    'palawan|busuanga': { lat: 12.15, lng: 119.95 },
    'palawan|linapacan': { lat: 11.4833, lng: 119.8667 },
    'palawan|cagayancillo': { lat: 9.5833, lng: 121.2 },
    'palawan|kalayaan': { lat: 11.05, lng: 114.2833 },
    'palawan|balabac': { lat: 7.9833, lng: 117.0667 },
    'palawan|san vicente': { lat: 10.5333, lng: 119.2667 },
};

const PROVINCE_SPREAD: Record<string, { latSpan: number; lngSpan: number }> = {
    'occidental mindoro': { latSpan: 0.55, lngSpan: 0.35 },
    'oriental mindoro': { latSpan: 0.55, lngSpan: 0.3 },
    marinduque: { latSpan: 0.18, lngSpan: 0.18 },
    romblon: { latSpan: 0.35, lngSpan: 0.4 },
    palawan: { latSpan: 1.8, lngSpan: 0.7 },
};

const normalize = (value: string) =>
    value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{M}/gu, '')
        .replace(/\bcity\b/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');

export const placeKey = (province: string, city: string) =>
    `${normalize(province)}|${normalize(city)}`;

const hash01 = (input: string) => {
    let h = 2166136261;
    for (let i = 0; i < input.length; i += 1) {
        h ^= input.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return (h >>> 0) / 4294967295;
};

/** Stable point inside province when city is missing/unknown. */
const approxFromProvinceCity = (province: string, city: string): LatLng => {
    const center =
        PROVINCE_MAP_CENTER[province as Province] ??
        ({ lat: 12.0, lng: 121.0 } as LatLng);
    const spread =
        PROVINCE_SPREAD[normalize(province)] ??
        ({ latSpan: 0.35, lngSpan: 0.35 } as const);
    const key = placeKey(province, city || 'unknown');
    const u = hash01(`${key}:lat`);
    const v = hash01(`${key}:lng`);
    return {
        lat: Number((center.lat + (u - 0.5) * spread.latSpan).toFixed(5)),
        lng: Number((center.lng + (v - 0.5) * spread.lngSpan).toFixed(5)),
    };
};

export const coordsForPlace = (province: string, city: string): LatLng => {
    const key = placeKey(province, city);
    if (CITY_COORDS[key]) return CITY_COORDS[key];

    // Retry without trailing "city"
    const alt = placeKey(province, city.replace(/\bcity\b/i, ''));
    if (CITY_COORDS[alt]) return CITY_COORDS[alt];

    return approxFromProvinceCity(province, city);
};

/**
 * Map pin position: saved GPS if present; else Province + City lookup.
 * Empty city → scatter by project id inside province (avoid one giant pile).
 */
export const resolveProjectMapCoords = (
    project: Pick<
        TaraProject,
        'id' | 'province' | 'municipality' | 'latitude' | 'longitude'
    > & { has_coordinates?: boolean },
): LatLng => {
    if (project.has_coordinates) {
        return { lat: project.latitude, lng: project.longitude };
    }

    const city = (project.municipality || '').trim();
    if (!city) {
        return approxFromProvinceCity(
            project.province,
            `project:${project.id}`,
        );
    }

    return coordsForPlace(project.province, city);
};
