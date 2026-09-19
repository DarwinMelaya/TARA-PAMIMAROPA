import { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import { setWorkerUrl } from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';
import './projectMap.css';
import {
    STATUS_META,
    PROGRAM_META,
    type TaraProject,
} from '../../constants/taraProjects';
import { buildProjectPinHtml } from './projectMapPins';
import type { MapBaseLayer, UserLocation } from './mapTypes';
import mimaropaProvinces from './mimaropaProvinces.json';
import {
    placeKey,
    resolveProjectMapCoords,
} from './mimaropaPlaceCoords';

setWorkerUrl(maplibreWorkerUrl);

/** OpenFreeMap liberty — keeps extruded `building-3d` (dark OpenFreeMap style has none). */
const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const MIMAROPA_CENTER: [number, number] = [121.0, 12.0]; // lng, lat
const DEFAULT_ZOOM = 7.2;
/** Match AdminFleetMap camera */
const PITCH_3D = 62;
const BEARING_3D = -22;
/** Below → glowing GPU dots. At/above → labeled callout pins (viewport only). */
const DETAIL_ZOOM = 8.5;
const VIEWPORT_PAD_RATIO = 0.15;
/** Cap DOM pins so zoom stays smooth with huge datasets (GPU dots still show all). */
const MAX_DETAIL_MARKERS = 120;
/** Debounce paint after zoom/pan — avoid tearing layers mid-gesture. */
const PAINT_DEBOUNCE_MS = 140;

/** Dark chrome close to 2D CARTO dark / LandingPage slate. */
const DARK = {
    bg: '#020617',
    land: '#0b1220',
    park: '#0f2918',
    water: '#0c1a2e',
    waterLine: '#1e3a5f',
    sand: '#1c1917',
    aeroway: '#1e293b',
    road: '#334155',
    roadBright: '#475569',
    roadCasing: '#1e293b',
    motorway: '#1d4ed8',
    motorwayCasing: '#1e3a8a',
    rail: '#475569',
    boundary: '#64748b',
    building: '#1e293b',
    buildingTop: '#334155',
    label: '#cbd5e1',
    labelHalo: '#020617',
    poi: '#94a3b8',
} as const;

type StylePaint = Record<string, unknown>;
type StyleLayer = {
    id: string;
    type: string;
    paint?: StylePaint;
    layout?: Record<string, unknown>;
    [key: string]: unknown;
};
type StyleSpec = {
    version: number;
    layers: StyleLayer[];
    [key: string]: unknown;
};

const setPaint = (layer: StyleLayer, key: string, value: unknown) => {
    layer.paint = { ...(layer.paint ?? {}), [key]: value };
};

/**
 * Recolor liberty for dark LandingPage look. Keep `building-3d` extrusion.
 * Do not set paint/layout to `undefined` — MapLibre rejects those keys when nullish.
 */
const darkenLibertyStyle = (style: StyleSpec): StyleSpec => {
    const layers = (style.layers ?? []).map((layer) => {
        const next: StyleLayer = { ...layer };
        if (layer.paint) next.paint = { ...layer.paint };
        else delete next.paint;
        if (layer.layout) next.layout = { ...layer.layout };
        else delete next.layout;
        const id = next.id;

        if (id === 'background') {
            setPaint(next, 'background-color', DARK.bg);
            return next;
        }

        if (id === 'natural_earth') {
            setPaint(next, 'raster-opacity', 0.12);
            setPaint(next, 'raster-saturation', -0.85);
            setPaint(next, 'raster-brightness-min', 0);
            setPaint(next, 'raster-brightness-max', 0.35);
            return next;
        }

        if (id === 'water') {
            setPaint(next, 'fill-color', DARK.water);
            return next;
        }

        if (id.startsWith('waterway_') && next.type === 'line') {
            setPaint(next, 'line-color', DARK.waterLine);
            return next;
        }

        if (
            id.startsWith('park') ||
            id.startsWith('landcover_wood') ||
            id.startsWith('landcover_grass') ||
            id.startsWith('landcover_wetland') ||
            id.includes('cemetery') ||
            id.includes('pitch') ||
            id.includes('track') ||
            id.includes('school') ||
            id.includes('hospital')
        ) {
            if (next.type === 'fill') {
                setPaint(next, 'fill-color', DARK.park);
                setPaint(next, 'fill-opacity', 0.55);
            }
            if (next.type === 'line') setPaint(next, 'line-color', DARK.park);
            return next;
        }

        if (id.includes('residential') || id.includes('landuse')) {
            if (next.type === 'fill') {
                setPaint(next, 'fill-color', DARK.land);
                setPaint(next, 'fill-opacity', 0.85);
            }
            return next;
        }

        if (id.includes('sand') || id.includes('ice')) {
            if (next.type === 'fill') setPaint(next, 'fill-color', DARK.sand);
            return next;
        }

        if (id.startsWith('aeroway')) {
            if (next.type === 'fill') setPaint(next, 'fill-color', DARK.aeroway);
            if (next.type === 'line') setPaint(next, 'line-color', DARK.road);
            return next;
        }

        if (id === 'building') {
            setPaint(next, 'fill-color', DARK.building);
            setPaint(next, 'fill-opacity', 0.85);
            setPaint(next, 'fill-outline-color', DARK.buildingTop);
            return next;
        }

        if (id === 'building-3d') {
            setPaint(next, 'fill-extrusion-color', DARK.buildingTop);
            setPaint(next, 'fill-extrusion-opacity', 0.92);
            setPaint(next, 'fill-extrusion-vertical-gradient', true);
            return next;
        }

        if (
            id.includes('motorway') ||
            id.includes('trunk') ||
            id.includes('primary')
        ) {
            if (id.includes('casing')) {
                setPaint(next, 'line-color', DARK.motorwayCasing);
            } else if (next.type === 'line') {
                setPaint(next, 'line-color', DARK.motorway);
            }
            return next;
        }

        if (id.includes('rail')) {
            if (next.type === 'line') setPaint(next, 'line-color', DARK.rail);
            return next;
        }

        if (
            id.startsWith('road_') ||
            id.startsWith('tunnel_') ||
            id.startsWith('bridge_')
        ) {
            if (id.includes('casing')) {
                setPaint(next, 'line-color', DARK.roadCasing);
            } else if (next.type === 'line') {
                setPaint(
                    next,
                    'line-color',
                    id.includes('path') || id.includes('pedestrian')
                        ? DARK.roadBright
                        : DARK.road,
                );
            }
            return next;
        }

        if (id.startsWith('boundary')) {
            if (next.type === 'line') setPaint(next, 'line-color', DARK.boundary);
            return next;
        }

        if (next.type === 'symbol') {
            setPaint(next, 'text-color', DARK.label);
            setPaint(next, 'text-halo-color', DARK.labelHalo);
            setPaint(next, 'text-halo-width', 1.25);
            if (id.startsWith('poi')) setPaint(next, 'text-color', DARK.poi);
            return next;
        }

        return next;
    });

    return { ...style, layers, glyphs: style.glyphs, sprite: style.sprite };
};

const loadDarkLibertyStyle = async (): Promise<StyleSpec> => {
    const res = await fetch(LIBERTY_STYLE_URL);
    if (!res.ok) throw new Error(`Failed to load map style (${res.status})`);
    const style = (await res.json()) as StyleSpec;
    return darkenLibertyStyle(style);
};

const escapeHtml = (value: unknown) =>
    String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const layoutProjectPositions = (projects: TaraProject[]) => {
    // Group by Province + City so pins sit on the right place, not random lat clumps.
    const groups = new Map<
        string,
        { project: TaraProject; lat: number; lng: number }[]
    >();

    projects.forEach((project) => {
        const coords = resolveProjectMapCoords(project);
        const key = placeKey(project.province, project.municipality || '');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push({
            project,
            lat: coords.lat,
            lng: coords.lng,
        });
    });

    const laidOut: { project: TaraProject; lat: number; lng: number }[] = [];

    const hashAngle = (id: string) => {
        let h = 2166136261;
        for (let i = 0; i < id.length; i += 1) {
            h ^= id.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return ((h >>> 0) % 360) * (Math.PI / 180);
    };

    groups.forEach((group) => {
        if (group.length === 1) {
            laidOut.push(group[0]);
            return;
        }

        // Spiral scatter around city — visible even at province zoom (not 48m clump).
        const baseLat = group[0].lat;
        const baseLng = group[0].lng;
        const metersPerDegLat = 111_320;
        const metersPerDegLng =
            111_320 * Math.max(0.2, Math.cos((baseLat * Math.PI) / 180));
        const ringCapacity = 8;
        const ringGapMeters = Math.max(
            450,
            Math.min(2800, 320 + Math.sqrt(group.length) * 220),
        );

        group.forEach((row, index) => {
            const ring = Math.floor(index / ringCapacity) + 1;
            const slot = index % ringCapacity;
            const angle =
                (slot / ringCapacity) * Math.PI * 2 +
                ring * 0.4 +
                hashAngle(row.project.id) * 0.15;
            const meters = ring * ringGapMeters;
            laidOut.push({
                project: row.project,
                lat: baseLat + (meters * Math.sin(angle)) / metersPerDegLat,
                lng: baseLng + (meters * Math.cos(angle)) / metersPerDegLng,
            });
        });
    });

    return laidOut;
};

const buildTooltipContent = (project: TaraProject) => {
    const status = STATUS_META[project.status];
    const program = PROGRAM_META[project.program];

    return `
    <div class="project-map-tooltip__inner">
      <strong>◈ ${escapeHtml(project.name)}</strong>
      <span>${escapeHtml(project.program)} · ${escapeHtml(status.label)} · ${project.progress}%</span>
      <p>${escapeHtml(project.municipality)}, ${escapeHtml(project.province)}</p>
      <em>Click for project intel · ${escapeHtml(program.short)}</em>
    </div>
  `;
};

const programDotColor = (program: string) =>
    PROGRAM_META[program as keyof typeof PROGRAM_META]?.color ?? '#22d3ee';

const paddedViewport = (map: maplibregl.Map) => {
    const bounds = map.getBounds();
    const latPad =
        (bounds.getNorth() - bounds.getSouth()) * VIEWPORT_PAD_RATIO;
    const lngPad =
        (bounds.getEast() - bounds.getWest()) * VIEWPORT_PAD_RATIO;
    return new maplibregl.LngLatBounds(
        [bounds.getWest() - lngPad, bounds.getSouth() - latPad],
        [bounds.getEast() + lngPad, bounds.getNorth() + latPad],
    );
};

const cameraAngles = (flat: boolean) =>
    flat
        ? { pitch: 0, bearing: 0 }
        : { pitch: PITCH_3D, bearing: BEARING_3D };

const flyCamera = (
    map: maplibregl.Map,
    options: {
        center: [number, number];
        zoom: number;
        duration?: number;
        flat?: boolean;
    },
) => {
    const angles = cameraAngles(options.flat ?? false);
    map.stop();
    map.easeTo({
        center: options.center,
        zoom: options.zoom,
        pitch: angles.pitch,
        bearing: angles.bearing,
        duration: options.duration ?? 900,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
    });
};

const MIMAROPA_SOURCE = 'mimaropa-provinces';
const MIMAROPA_LABEL_SOURCE = 'mimaropa-province-labels';
const MIMAROPA_FILL = 'mimaropa-provinces-fill';
const MIMAROPA_LINE_CASING = 'mimaropa-provinces-line-casing';
const MIMAROPA_LINE = 'mimaropa-provinces-line';
const MIMAROPA_LABEL = 'mimaropa-provinces-label';

/** One label point per province (MultiPolygon would stamp name on every island). */
const MIMAROPA_LABEL_POINTS: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: [
        {
            type: 'Feature',
            properties: { name: 'Occidental Mindoro' },
            geometry: { type: 'Point', coordinates: [120.92, 12.85] },
        },
        {
            type: 'Feature',
            properties: { name: 'Oriental Mindoro' },
            geometry: { type: 'Point', coordinates: [121.25, 13.0] },
        },
        {
            type: 'Feature',
            properties: { name: 'Marinduque' },
            geometry: { type: 'Point', coordinates: [121.95, 13.38] },
        },
        {
            type: 'Feature',
            properties: { name: 'Romblon' },
            geometry: { type: 'Point', coordinates: [122.27, 12.55] },
        },
        {
            type: 'Feature',
            properties: { name: 'Palawan' },
            geometry: { type: 'Point', coordinates: [118.75, 9.75] },
        },
    ],
};

const mimaropaLayerIds = [
    MIMAROPA_FILL,
    MIMAROPA_LINE_CASING,
    MIMAROPA_LINE,
    MIMAROPA_LABEL,
] as const;

/** Keep outlines above basemap, under project dots/pins. */
const stackMimaropaOutlines = (map: maplibregl.Map) => {
    const before =
        (map.getLayer('projects-dots-halo') && 'projects-dots-halo') ||
        (map.getLayer('projects-dots-circle') && 'projects-dots-circle') ||
        undefined;

    for (const id of mimaropaLayerIds) {
        if (!map.getLayer(id)) continue;
        try {
            if (before) map.moveLayer(id, before);
            else map.moveLayer(id);
        } catch {
            // Layer order best-effort.
        }
    }
};

/** Province outlines so MIMAROPA is readable at overview zoom. */
const ensureMimaropaOutlines = (map: maplibregl.Map, isDark: boolean) => {
    if (!map.isStyleLoaded()) return;

    const fillColor = isDark ? '#22d3ee' : '#0038a8';
    const lineColor = isDark ? '#a5f3fc' : '#002d87';
    const casingColor = isDark ? '#083344' : '#ffffff';
    const labelColor = isDark ? '#ecfeff' : '#0f172a';
    const labelHalo = isDark ? '#020617' : '#ffffff';
    const fillOpacity = isDark ? 0.16 : 0.08;

    const addOrUpdate = (run: () => void) => {
        try {
            run();
        } catch {
            // One layer failure must not block the rest.
        }
    };

    addOrUpdate(() => {
        if (!map.getSource(MIMAROPA_SOURCE)) {
            map.addSource(MIMAROPA_SOURCE, {
                type: 'geojson',
                data: mimaropaProvinces as GeoJSON.FeatureCollection,
            });
        }
    });

    addOrUpdate(() => {
        if (!map.getSource(MIMAROPA_LABEL_SOURCE)) {
            map.addSource(MIMAROPA_LABEL_SOURCE, {
                type: 'geojson',
                data: MIMAROPA_LABEL_POINTS,
            });
        }
    });

    addOrUpdate(() => {
        if (!map.getLayer(MIMAROPA_FILL)) {
            map.addLayer({
                id: MIMAROPA_FILL,
                type: 'fill',
                source: MIMAROPA_SOURCE,
                paint: {
                    'fill-color': fillColor,
                    'fill-opacity': fillOpacity,
                },
            });
        } else {
            map.setPaintProperty(MIMAROPA_FILL, 'fill-color', fillColor);
            map.setPaintProperty(MIMAROPA_FILL, 'fill-opacity', fillOpacity);
        }
    });

    addOrUpdate(() => {
        // Recreate line layers if a prior invalid paint blocked them.
        if (map.getLayer(MIMAROPA_LINE_CASING)) {
            map.removeLayer(MIMAROPA_LINE_CASING);
        }
        map.addLayer({
            id: MIMAROPA_LINE_CASING,
            type: 'line',
            source: MIMAROPA_SOURCE,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': casingColor,
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    4.5,
                    8,
                    7,
                    12,
                    9,
                ],
                'line-opacity': isDark ? 0.95 : 0.85,
            },
        });
    });

    addOrUpdate(() => {
        if (map.getLayer(MIMAROPA_LINE)) {
            map.removeLayer(MIMAROPA_LINE);
        }
        map.addLayer({
            id: MIMAROPA_LINE,
            type: 'line',
            source: MIMAROPA_SOURCE,
            layout: {
                'line-join': 'round',
                'line-cap': 'round',
            },
            paint: {
                'line-color': lineColor,
                'line-width': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    isDark ? 2.4 : 1.8,
                    8,
                    isDark ? 3.4 : 2.8,
                    12,
                    isDark ? 4.2 : 3.4,
                ],
                'line-opacity': 1,
            },
        });
    });

    addOrUpdate(() => {
        if (map.getLayer(MIMAROPA_LABEL)) {
            map.removeLayer(MIMAROPA_LABEL);
        }
        map.addLayer({
            id: MIMAROPA_LABEL,
            type: 'symbol',
            source: MIMAROPA_LABEL_SOURCE,
            layout: {
                'text-field': ['get', 'name'],
                'text-size': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    11,
                    8,
                    13,
                    11,
                    15,
                ],
                'text-transform': 'uppercase',
                'text-letter-spacing': 0.04,
                'text-max-width': 10,
                'text-allow-overlap': false,
                'text-ignore-placement': false,
                'symbol-placement': 'point',
            },
            paint: {
                'text-color': labelColor,
                'text-halo-color': labelHalo,
                'text-halo-width': isDark ? 2 : 1.4,
                'text-opacity': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    0.95,
                    10,
                    0.65,
                    13,
                    0,
                ],
            },
        });
    });

    stackMimaropaOutlines(map);
};

type Maps3DProps = {
    projects: TaraProject[];
    selectedId?: string | null;
    /** Kept for API parity; map always uses OpenFreeMap liberty. */
    baseLayer?: MapBaseLayer;
    /** Flat top-down (2D toggle). Same liberty tiles / buildings style. */
    flat?: boolean;
    /** Dark chrome when true; white/standard liberty when false. */
    isDark?: boolean;
    userLocation?: UserLocation | null;
    flyToUserToken?: number;
    onViewProject?: (project: TaraProject) => void;
};

const Maps3D = ({
    projects,
    selectedId,
    flat = false,
    isDark = true,
    userLocation = null,
    flyToUserToken = 0,
    onViewProject,
}: Maps3DProps) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<maplibregl.Map | null>(null);
    const markersRef = useRef<maplibregl.Marker[]>([]);
    const userMarkerRef = useRef<maplibregl.Marker | null>(null);
    const positionedRef = useRef<
        { project: TaraProject; lat: number; lng: number }[]
    >([]);
    const onViewProjectRef = useRef(onViewProject);
    const selectedIdRef = useRef(selectedId);
    const isDarkRef = useRef(isDark);
    const flatRef = useRef(flat);
    const projectsRef = useRef(projects);
    const readyRef = useRef(false);
    const modeRef = useRef<'overview' | 'detail'>('overview');
    const paintRef = useRef<() => void>(() => {});
    const layoutCacheRef = useRef<{
        source: TaraProject[] | null;
        positioned: { project: TaraProject; lat: number; lng: number }[];
        valid: TaraProject[];
    } | null>(null);
    const clickHandlerRef = useRef<((e: maplibregl.MapLayerMouseEvent) => void) | null>(
        null,
    );
    const enterHandlerRef = useRef<(() => void) | null>(null);
    const leaveHandlerRef = useRef<(() => void) | null>(null);
    const [overviewHint, setOverviewHint] = useState(true);

    onViewProjectRef.current = onViewProject;
    selectedIdRef.current = selectedId;
    isDarkRef.current = isDark;
    flatRef.current = flat;
    projectsRef.current = projects;

    const clearMarkers = () => {
        markersRef.current.forEach((marker) => marker.remove());
        markersRef.current = [];
    };

    const clearDotLayer = (map: maplibregl.Map) => {
        if (clickHandlerRef.current) {
            map.off('click', 'projects-dots-circle', clickHandlerRef.current);
            clickHandlerRef.current = null;
        }
        if (enterHandlerRef.current) {
            map.off('mouseenter', 'projects-dots-circle', enterHandlerRef.current);
            enterHandlerRef.current = null;
        }
        if (leaveHandlerRef.current) {
            map.off('mouseleave', 'projects-dots-circle', leaveHandlerRef.current);
            leaveHandlerRef.current = null;
        }
        for (const id of [
            'projects-dots-circle',
            'projects-dots-halo',
            'projects-dots-selected',
        ]) {
            if (map.getLayer(id)) map.removeLayer(id);
        }
        if (map.getSource('projects-dots')) {
            map.removeSource('projects-dots');
        }
        map.getCanvas().style.cursor = '';
    };

    const paintOverviewDots = (
        map: maplibregl.Map,
        positioned: { project: TaraProject; lat: number; lng: number }[],
    ) => {
        clearMarkers();

        const features: GeoJSON.Feature[] = positioned.map(
            ({ project, lat, lng }) => ({
                type: 'Feature',
                properties: {
                    id: project.id,
                    name: project.name,
                    program: project.program,
                    color: programDotColor(project.program),
                    selected: selectedIdRef.current === project.id ? 1 : 0,
                },
                geometry: {
                    type: 'Point',
                    coordinates: [lng, lat],
                },
            }),
        );

        const collection: GeoJSON.FeatureCollection = {
            type: 'FeatureCollection',
            features,
        };

        const existing = map.getSource('projects-dots') as
            | maplibregl.GeoJSONSource
            | undefined;

        // Reuse GPU source — setData only. No layer tear-down on every zoom.
        if (existing) {
            existing.setData(collection);
            return;
        }

        map.addSource('projects-dots', {
            type: 'geojson',
            data: collection,
            // Keep individual dots (same look); MapLibre indexes for fast setData.
            buffer: 0,
            tolerance: 0.75,
            maxzoom: 14,
        });

        // Soft glow halo — constellation look when zoomed out
        map.addLayer({
            id: 'projects-dots-halo',
            type: 'circle',
            source: 'projects-dots',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    ['case', ['==', ['get', 'selected'], 1], 14, 9],
                    10,
                    ['case', ['==', ['get', 'selected'], 1], 22, 15],
                ],
                'circle-color': ['get', 'color'],
                'circle-opacity': [
                    'case',
                    ['==', ['get', 'selected'], 1],
                    0.38,
                    0.22,
                ],
                'circle-blur': 0.65,
            },
        });

        map.addLayer({
            id: 'projects-dots-circle',
            type: 'circle',
            source: 'projects-dots',
            paint: {
                'circle-radius': [
                    'interpolate',
                    ['linear'],
                    ['zoom'],
                    5,
                    ['case', ['==', ['get', 'selected'], 1], 5, 3.2],
                    10,
                    ['case', ['==', ['get', 'selected'], 1], 8, 5.5],
                ],
                'circle-color': ['get', 'color'],
                'circle-stroke-width': [
                    'case',
                    ['==', ['get', 'selected'], 1],
                    2.2,
                    1.2,
                ],
                'circle-stroke-color': [
                    'case',
                    ['==', ['get', 'selected'], 1],
                    '#ffffff',
                    isDarkRef.current ? '#020617' : '#ffffff',
                ],
                'circle-opacity': 0.95,
            },
        });

        const onClick = (e: maplibregl.MapLayerMouseEvent) => {
            const id = e.features?.[0]?.properties?.id as string | undefined;
            if (!id) return;
            const hit = positionedRef.current.find(
                (row) => row.project.id === id,
            );
            if (hit) onViewProjectRef.current?.(hit.project);
        };
        clickHandlerRef.current = onClick;
        map.on('click', 'projects-dots-circle', onClick);

        const onEnter = () => {
            map.getCanvas().style.cursor = 'pointer';
        };
        const onLeave = () => {
            map.getCanvas().style.cursor = '';
        };
        enterHandlerRef.current = onEnter;
        leaveHandlerRef.current = onLeave;
        map.on('mouseenter', 'projects-dots-circle', onEnter);
        map.on('mouseleave', 'projects-dots-circle', onLeave);
    };

    const paintDetailPins = (
        map: maplibregl.Map,
        positioned: { project: TaraProject; lat: number; lng: number }[],
    ) => {
        clearMarkers();
        clearDotLayer(map);

        const view = paddedViewport(map);
        const inView = positioned.filter(({ lat, lng }) =>
            view.contains([lng, lat]),
        );

        const center = map.getCenter();
        const selectedId = selectedIdRef.current;

        // Prefer selected + nearest-to-center; hard cap DOM markers.
        const ranked = inView
            .map((row) => {
                const dLat = row.lat - center.lat;
                const dLng = row.lng - center.lng;
                const dist = dLat * dLat + dLng * dLng;
                const boost = row.project.id === selectedId ? -1 : 0;
                return { row, score: boost + dist };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, MAX_DETAIL_MARKERS)
            .map(({ row }) => row);

        ranked.forEach(({ project, lat, lng }) => {
            const isActive = selectedIdRef.current === project.id;
            const el = document.createElement('div');
            el.className = 'project-pin-leaflet-icon';
            el.innerHTML = buildProjectPinHtml(project, isActive);
            el.style.cursor = 'pointer';
            el.title = project.name;

            el.addEventListener('click', (event) => {
                event.stopPropagation();
                onViewProjectRef.current?.(project);
            });

            const popup = new maplibregl.Popup({
                offset: 28,
                closeButton: false,
                className: 'project-maplibre-popup',
            }).setHTML(buildTooltipContent(project));

            const marker = new maplibregl.Marker({
                element: el,
                anchor: 'bottom',
                pitchAlignment: 'viewport',
                rotationAlignment: 'viewport',
            })
                .setLngLat([lng, lat])
                .setPopup(popup)
                .addTo(map);

            el.addEventListener('mouseenter', () => {
                if (!marker.getPopup()?.isOpen()) marker.togglePopup();
            });
            el.addEventListener('mouseleave', () => {
                if (marker.getPopup()?.isOpen()) marker.togglePopup();
            });

            markersRef.current.push(marker);
        });
    };

    const getPositioned = () => {
        const list = projectsRef.current ?? [];
        const cached = layoutCacheRef.current;
        if (cached && cached.source === list) {
            positionedRef.current = cached.positioned;
            return cached;
        }

        const valid = list.filter(
            (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
        );
        const positioned = layoutProjectPositions(valid);
        positionedRef.current = positioned;
        const next = { source: list, positioned, valid };
        layoutCacheRef.current = next;
        return next;
    };

    const paintMarkers = (map: maplibregl.Map) => {
        ensureMimaropaOutlines(map, isDarkRef.current);

        const { valid, positioned } = getPositioned();

        const nextMode: 'overview' | 'detail' =
            map.getZoom() < DETAIL_ZOOM ? 'overview' : 'detail';
        const prevMode = modeRef.current;
        modeRef.current = nextMode;

        const showHint = nextMode === 'overview' && positioned.length > 0;
        setOverviewHint((prev) => (prev === showHint ? prev : showHint));

        if (nextMode === 'overview') {
            if (prevMode === 'detail') {
                clearMarkers();
            }
            paintOverviewDots(map, positioned);
        } else {
            paintDetailPins(map, positioned);
        }

        stackMimaropaOutlines(map);

        return { valid, positioned };
    };

    paintRef.current = () => {
        const map = mapRef.current;
        if (!map || !readyRef.current) return;
        paintMarkers(map);
    };

    const frameProjects = (
        map: maplibregl.Map,
        positioned: { project: TaraProject; lat: number; lng: number }[],
        valid: TaraProject[],
    ) => {
        const activeId = selectedIdRef.current;

        const angles = cameraAngles(flatRef.current);

        if (activeId) {
            const hit = positioned.find((p) => p.project.id === activeId);
            if (hit) {
                flyCamera(map, {
                    center: [hit.lng, hit.lat],
                    zoom: 15.2,
                    duration: 1100,
                    flat: flatRef.current,
                });
                return;
            }
        }

        if (valid.length === 1) {
            flyCamera(map, {
                center: [positioned[0].lng, positioned[0].lat],
                zoom: 14.5,
                duration: 900,
                flat: flatRef.current,
            });
            return;
        }

        if (valid.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            positioned.forEach((p) => bounds.extend([p.lng, p.lat]));
            map.fitBounds(bounds, {
                padding: 80,
                maxZoom: 14,
                pitch: angles.pitch,
                bearing: angles.bearing,
                duration: 1200,
                essential: true,
                easing: (t) => 1 - Math.pow(1 - t, 3),
            });
            return;
        }

        flyCamera(map, {
            center: MIMAROPA_CENTER,
            zoom: DEFAULT_ZOOM,
            duration: 800,
            flat: flatRef.current,
        });
    };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const container = containerRef.current;
        let cancelled = false;
        let map: maplibregl.Map | null = null;
        let ro: ResizeObserver | null = null;
        let moveTimer: number | null = null;
        let onZoomEnd: (() => void) | null = null;
        let onMoveEnd: (() => void) | null = null;

        const resizeMap = () => {
            map?.resize();
        };

        void (async () => {
            let style: string | StyleSpec = LIBERTY_STYLE_URL;
            if (isDarkRef.current) {
                try {
                    style = await loadDarkLibertyStyle();
                } catch {
                    // Fall back to light liberty if dark recolor fetch fails.
                }
            }
            if (cancelled || !containerRef.current) return;

            const startAngles = cameraAngles(flatRef.current);
            map = new maplibregl.Map({
                container,
                style: style as maplibregl.StyleSpecification | string,
                center: MIMAROPA_CENTER,
                zoom: DEFAULT_ZOOM,
                pitch: startAngles.pitch,
                bearing: startAngles.bearing,
                minZoom: 5,
                maxZoom: 18,
                maxPitch: 85,
                attributionControl: false,
                canvasContextAttributes: { antialias: true },
            });

            // Top-left: avoid right rail, bottom stats, and feed panels.
            map.addControl(
                new maplibregl.NavigationControl({
                    visualizePitch: !flatRef.current,
                    showCompass: true,
                    showZoom: true,
                }),
                'top-left',
            );

            if (flatRef.current) {
                map.dragRotate.disable();
                map.touchZoomRotate.disableRotation();
                map.touchPitch.disable();
            } else {
                map.dragRotate.enable();
                map.touchZoomRotate.enableRotation();
                map.touchPitch.enable();
            }
            map.keyboard.enable();
            // Finer wheel steps = smoother zoom feel (look unchanged).
            map.scrollZoom.setWheelZoomRate(1 / 560);
            map.scrollZoom.setZoomRate(1 / 140);

            map.on('load', () => {
                if (cancelled || !map) return;
                readyRef.current = true;
                resizeMap();
                requestAnimationFrame(resizeMap);
                const paint = () => {
                    if (cancelled || !map) return;
                    ensureMimaropaOutlines(map, isDarkRef.current);
                    const { valid, positioned } = paintMarkers(map);
                    frameProjects(map, positioned, valid);
                };
                paint();
                // Dark custom style sometimes finishes glyphs one tick later.
                map.once('idle', paint);
            });

            const schedulePaint = () => {
                if (moveTimer != null) window.clearTimeout(moveTimer);
                moveTimer = window.setTimeout(() => {
                    // Skip while gesture still running — paint after settle.
                    if (map?.isMoving()) {
                        schedulePaint();
                        return;
                    }
                    paintRef.current();
                }, PAINT_DEBOUNCE_MS);
            };
            onZoomEnd = () => {
                schedulePaint();
            };
            onMoveEnd = () => {
                if (modeRef.current === 'detail') schedulePaint();
            };
            map.on('zoomend', onZoomEnd);
            map.on('moveend', onMoveEnd);

            ro = new ResizeObserver(() => {
                resizeMap();
            });
            ro.observe(container);
            window.addEventListener('resize', resizeMap);

            mapRef.current = map;
        })();

        return () => {
            cancelled = true;
            readyRef.current = false;
            if (moveTimer != null) window.clearTimeout(moveTimer);
            window.removeEventListener('resize', resizeMap);
            ro?.disconnect();
            clearMarkers();
            if (map) {
                if (onZoomEnd) map.off('zoomend', onZoomEnd);
                if (onMoveEnd) map.off('moveend', onMoveEnd);
                clearDotLayer(map);
            }
            if (userMarkerRef.current) {
                userMarkerRef.current.remove();
                userMarkerRef.current = null;
            }
            map?.remove();
            mapRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps -- mount once
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !readyRef.current) return;

        let cancelled = false;

        void (async () => {
            let style: string | StyleSpec = LIBERTY_STYLE_URL;
            if (isDark) {
                try {
                    style = await loadDarkLibertyStyle();
                } catch {
                    style = LIBERTY_STYLE_URL;
                }
            }
            if (cancelled || !mapRef.current) return;

            map.setStyle(style as maplibregl.StyleSpecification | string);
            map.once('style.load', () => {
                if (cancelled || !mapRef.current) return;
                const paint = () => {
                    if (cancelled || !mapRef.current) return;
                    ensureMimaropaOutlines(mapRef.current, isDark);
                    const { valid, positioned } = paintMarkers(mapRef.current);
                    frameProjects(mapRef.current, positioned, valid);
                };
                paint();
                mapRef.current.once('idle', paint);
            });
        })();

        return () => {
            cancelled = true;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !readyRef.current) return;

        const angles = cameraAngles(flat);
        if (flat) {
            map.dragRotate.disable();
            map.touchZoomRotate.disableRotation();
            map.touchPitch.disable();
        } else {
            map.dragRotate.enable();
            map.touchZoomRotate.enableRotation();
            map.touchPitch.enable();
        }

        map.easeTo({
            pitch: angles.pitch,
            bearing: angles.bearing,
            duration: 700,
            essential: true,
        });
    }, [flat]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !readyRef.current) return;

        const run = () => {
            const { valid, positioned } = paintMarkers(map);
            frameProjects(map, positioned, valid);
        };

        if (map.isStyleLoaded()) run();
        else map.once('idle', run);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !readyRef.current) return;
        // Select / deselect: highlight only — never auto zoom / fitBounds.
        paintMarkers(map);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedId]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
        }

        if (!userLocation) return;

        const el = document.createElement('div');
        el.className = 'user-location-leaflet-icon';
        el.innerHTML = `
      <div class="user-location-pin">
        <span class="user-location-pin__pulse"></span>
        <span class="user-location-pin__dot"></span>
      </div>
    `;

        userMarkerRef.current = new maplibregl.Marker({
            element: el,
            anchor: 'center',
            pitchAlignment: 'viewport',
            rotationAlignment: 'viewport',
        })
            .setLngLat([userLocation.lng, userLocation.lat])
            .setPopup(
                new maplibregl.Popup({ offset: 12, closeButton: false }).setText(
                    'Your location',
                ),
            )
            .addTo(map);
    }, [userLocation]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map || !userLocation || flyToUserToken <= 0) return;
        flyCamera(map, {
            center: [userLocation.lng, userLocation.lat],
            zoom: 15.2,
            duration: 1100,
            flat: flatRef.current,
        });
    }, [flyToUserToken, userLocation]);

    return (
        <div className="relative h-full min-h-0 w-full">
            <div
                ref={containerRef}
                className={[
                    'project-map-container maplibre-3d absolute inset-0 h-full w-full',
                    isDark ? 'project-map-container--dark' : 'project-map-container--light',
                ].join(' ')}
                aria-label={
                    flat
                        ? 'TARA PAMIMAROPA MapLibre project map'
                        : 'TARA PAMIMAROPA 3D buildings project map'
                }
            />
            {overviewHint ? (
                <p
                    className={[
                        'pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full border px-3 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-md',
                        isDark
                            ? 'border-slate-600/80 bg-slate-950/85 text-slate-200'
                            : 'border-slate-300 bg-white/90 text-slate-700',
                    ].join(' ')}
                >
                    Program glow dots · zoom in for labeled pins
                </p>
            ) : null}
        </div>
    );
};

export default Maps3D;
