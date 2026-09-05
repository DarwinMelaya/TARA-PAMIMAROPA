import { useEffect, useRef } from 'react';
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

setWorkerUrl(maplibreWorkerUrl);

/** OpenFreeMap liberty — keeps extruded `building-3d` (dark OpenFreeMap style has none). */
const LIBERTY_STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

const MIMAROPA_CENTER: [number, number] = [121.0, 12.0]; // lng, lat
const DEFAULT_ZOOM = 7.2;
/** Match AdminFleetMap camera */
const PITCH_3D = 62;
const BEARING_3D = -22;

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
    const groups = new Map<string, TaraProject[]>();

    projects.forEach((project) => {
        const key = `${Number(project.latitude).toFixed(4)},${Number(project.longitude).toFixed(4)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(project);
    });

    const laidOut: { project: TaraProject; lat: number; lng: number }[] = [];

    groups.forEach((group) => {
        if (group.length === 1) {
            laidOut.push({
                project: group[0],
                lat: group[0].latitude,
                lng: group[0].longitude,
            });
            return;
        }

        const angleStep = (2 * Math.PI) / group.length;
        const offsetMeters = 32;
        const baseLat = group[0].latitude;
        const latOffset = offsetMeters / 111_320;
        const lngOffsetBase =
            offsetMeters / (111_320 * Math.cos((baseLat * Math.PI) / 180));

        group.forEach((project, index) => {
            const angle = angleStep * index;
            laidOut.push({
                project,
                lat: baseLat + latOffset * Math.sin(angle),
                lng: project.longitude + lngOffsetBase * Math.cos(angle),
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
      <em>3D buildings · Click for project intel · ${escapeHtml(program.short)}</em>
    </div>
  `;
};

const flyCamera = (
    map: maplibregl.Map,
    options: {
        center: [number, number];
        zoom: number;
        duration?: number;
    },
) => {
    map.easeTo({
        center: options.center,
        zoom: options.zoom,
        pitch: PITCH_3D,
        bearing: BEARING_3D,
        duration: options.duration ?? 900,
        essential: true,
        easing: (t) => 1 - Math.pow(1 - t, 3),
    });
};

type Maps3DProps = {
    projects: TaraProject[];
    selectedId?: string | null;
    /** Kept for API parity with 2D map; 3D buildings always use OpenFreeMap liberty. */
    baseLayer?: MapBaseLayer;
    userLocation?: UserLocation | null;
    flyToUserToken?: number;
    onViewProject?: (project: TaraProject) => void;
};

const HEAVY_MARKER_COUNT = 80;

const PROGRAM_DOT_COLORS: Record<string, string> = {
    SETUP: '#22d3ee',
    CEST: '#a78bfa',
    GIA: '#fbbf24',
    STARBOOKS: '#34d399',
    Community: '#67e8f9',
    Water: '#38bdf8',
    Energy: '#facc15',
};

const Maps3D = ({
    projects,
    selectedId,
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
    const readyRef = useRef(false);
    const clickHandlerRef = useRef<((e: maplibregl.MapLayerMouseEvent) => void) | null>(
        null,
    );
    const enterHandlerRef = useRef<(() => void) | null>(null);
    const leaveHandlerRef = useRef<(() => void) | null>(null);

    onViewProjectRef.current = onViewProject;
    selectedIdRef.current = selectedId;

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
        if (map.getLayer('projects-dots-circle')) {
            map.removeLayer('projects-dots-circle');
        }
        if (map.getLayer('projects-dots-selected')) {
            map.removeLayer('projects-dots-selected');
        }
        if (map.getSource('projects-dots')) {
            map.removeSource('projects-dots');
        }
        map.getCanvas().style.cursor = '';
    };

    const paintMarkers = (map: maplibregl.Map) => {
        clearMarkers();
        clearDotLayer(map);

        const valid = (projects ?? []).filter(
            (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
        );
        const positioned = layoutProjectPositions(valid);
        positionedRef.current = positioned;
        const heavy = valid.length >= HEAVY_MARKER_COUNT;

        if (heavy) {
            const features: GeoJSON.Feature[] = positioned.map(
                ({ project, lat, lng }) => ({
                    type: 'Feature',
                    properties: {
                        id: project.id,
                        name: project.name,
                        program: project.program,
                        color:
                            PROGRAM_DOT_COLORS[project.program] ?? '#22d3ee',
                        selected: selectedIdRef.current === project.id ? 1 : 0,
                    },
                    geometry: {
                        type: 'Point',
                        coordinates: [lng, lat],
                    },
                }),
            );

            map.addSource('projects-dots', {
                type: 'geojson',
                data: {
                    type: 'FeatureCollection',
                    features,
                },
            });

            map.addLayer({
                id: 'projects-dots-circle',
                type: 'circle',
                source: 'projects-dots',
                paint: {
                    'circle-radius': [
                        'case',
                        ['==', ['get', 'selected'], 1],
                        8,
                        5,
                    ],
                    'circle-color': ['get', 'color'],
                    'circle-stroke-width': [
                        'case',
                        ['==', ['get', 'selected'], 1],
                        2,
                        1,
                    ],
                    'circle-stroke-color': [
                        'case',
                        ['==', ['get', 'selected'], 1],
                        '#ffffff',
                        '#0f172a',
                    ],
                    'circle-opacity': 0.9,
                },
            });

            const onClick = (e: maplibregl.MapLayerMouseEvent) => {
                const id = e.features?.[0]?.properties?.id as
                    | string
                    | undefined;
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

            return { valid, positioned };
        }

        positioned.forEach(({ project, lat, lng }) => {
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

        return { valid, positioned };
    };

    const frameProjects = (
        map: maplibregl.Map,
        positioned: { project: TaraProject; lat: number; lng: number }[],
        valid: TaraProject[],
    ) => {
        const activeId = selectedIdRef.current;

        if (activeId) {
            const hit = positioned.find((p) => p.project.id === activeId);
            if (hit) {
                flyCamera(map, {
                    center: [hit.lng, hit.lat],
                    zoom: 15.2,
                    duration: 1100,
                });
                return;
            }
        }

        if (valid.length === 1) {
            flyCamera(map, {
                center: [positioned[0].lng, positioned[0].lat],
                zoom: 14.5,
                duration: 900,
            });
            return;
        }

        if (valid.length > 1) {
            const bounds = new maplibregl.LngLatBounds();
            positioned.forEach((p) => bounds.extend([p.lng, p.lat]));
            map.fitBounds(bounds, {
                padding: 80,
                maxZoom: 14,
                pitch: PITCH_3D,
                bearing: BEARING_3D,
                duration: 1000,
                essential: true,
            });
            return;
        }

        flyCamera(map, {
            center: MIMAROPA_CENTER,
            zoom: DEFAULT_ZOOM,
            duration: 800,
        });
    };

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return;

        const container = containerRef.current;
        let cancelled = false;
        let map: maplibregl.Map | null = null;
        let ro: ResizeObserver | null = null;

        const resizeMap = () => {
            map?.resize();
        };

        void (async () => {
            let style: string | StyleSpec = LIBERTY_STYLE_URL;
            try {
                style = await loadDarkLibertyStyle();
            } catch {
                // Fall back to light liberty if dark recolor fetch fails.
            }
            if (cancelled || !containerRef.current) return;

            map = new maplibregl.Map({
                container,
                style: style as maplibregl.StyleSpecification | string,
                center: MIMAROPA_CENTER,
                zoom: DEFAULT_ZOOM,
                pitch: PITCH_3D,
                bearing: BEARING_3D,
                minZoom: 5,
                maxZoom: 18,
                maxPitch: 85,
                attributionControl: false,
                canvasContextAttributes: { antialias: true },
            });

            map.addControl(
                new maplibregl.AttributionControl({ compact: true }),
                'top-right',
            );
            map.addControl(
                new maplibregl.NavigationControl({
                    visualizePitch: true,
                    showCompass: true,
                    showZoom: true,
                }),
                'bottom-right',
            );

            map.dragRotate.enable();
            map.touchZoomRotate.enableRotation();
            map.touchPitch.enable();
            map.keyboard.enable();
            map.scrollZoom.setWheelZoomRate(1 / 420);
            map.scrollZoom.setZoomRate(1 / 120);

            map.on('load', () => {
                if (cancelled || !map) return;
                readyRef.current = true;
                resizeMap();
                requestAnimationFrame(resizeMap);
                const { valid, positioned } = paintMarkers(map);
                frameProjects(map, positioned, valid);
            });

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
            window.removeEventListener('resize', resizeMap);
            ro?.disconnect();
            clearMarkers();
            if (map) clearDotLayer(map);
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

        const run = () => {
            const { valid, positioned } = paintMarkers(map);
            frameProjects(map, positioned, valid);
        };

        if (map.isStyleLoaded()) run();
        else map.once('idle', run);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projects, selectedId]);

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
        });
    }, [flyToUserToken, userLocation]);

    return (
        <div className="relative h-full w-full">
            <div
                ref={containerRef}
                className="project-map-container maplibre-3d h-full w-full"
                aria-label="TARA PAMIMAROPA 3D buildings project map"
            />
            <div className="pointer-events-none absolute left-3 top-3 z-10 rounded-lg border border-cyan-400/30 bg-slate-950/75 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-200 backdrop-blur">
                3D buildings · dark chrome · drag rotate
            </div>
        </div>
    );
};

export default Maps3D;
