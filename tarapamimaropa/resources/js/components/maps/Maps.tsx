import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./projectMap.css";
import {
  PROGRAM_META,
  STATUS_META,
  type TaraProject,
} from "../../constants/taraProjects";
import { createLeafletPinIcon, PIN_COLORS } from "./projectMapPins";
import Maps3D from "./Maps3D";
import type { MapBaseLayer, MapViewMode, UserLocation } from "./mapTypes";

export type { MapBaseLayer, MapViewMode, UserLocation };

const MIMAROPA_CENTER: L.LatLngExpression = [12.0, 121.0];
const DEFAULT_ZOOM = 7;
/** Below this zoom → canvas dots (fast). At/above → SVG callout pins. */
const DETAIL_ZOOM = 11;
const VIEWPORT_PAD_RATIO = 0.15;

const BASE_LAYERS: Record<
  MapBaseLayer,
  { url: string; attribution: string; maxZoom?: number }
> = {
  street: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
  terrain: {
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
    maxZoom: 19,
  },
};

const escapeHtml = (value: unknown) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

type PositionedProject = {
  project: TaraProject;
  lat: number;
  lng: number;
};

type MarkerEntry = PositionedProject & {
  marker: L.Layer;
};

type PaintMode = "overview" | "detail";

const layoutProjectPositions = (
  projects: TaraProject[],
): PositionedProject[] => {
  const groups = new Map<string, TaraProject[]>();

  projects.forEach((project) => {
    const key = `${Number(project.latitude).toFixed(4)},${Number(project.longitude).toFixed(4)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(project);
  });

  const laidOut: PositionedProject[] = [];

  groups.forEach((group) => {
    if (group.length === 1) {
      const project = group[0];
      laidOut.push({
        project,
        lat: project.latitude,
        lng: project.longitude,
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
      <em>Click for full project intel · ${escapeHtml(program.short)}</em>
    </div>
  `;
};

const elevateMarker = (marker: L.Marker, offset = 800) => {
  marker.setZIndexOffset?.(offset);
};

const resetMarkerElevation = (marker: L.Marker) => {
  marker.setZIndexOffset?.(0);
};

const dotColorFor = (program: string) =>
  PIN_COLORS[program]?.fill ?? "#64748b";

const createUserLocationIcon = () =>
  L.divIcon({
    className: "user-location-leaflet-icon",
    html: `
      <div class="user-location-pin">
        <span class="user-location-pin__pulse"></span>
        <span class="user-location-pin__dot"></span>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });

const paddedViewport = (map: L.Map) => {
  const bounds = map.getBounds();
  const latPad =
    (bounds.getNorth() - bounds.getSouth()) * VIEWPORT_PAD_RATIO;
  const lngPad =
    (bounds.getEast() - bounds.getWest()) * VIEWPORT_PAD_RATIO;
  return L.latLngBounds(
    [bounds.getSouth() - latPad, bounds.getWest() - lngPad],
    [bounds.getNorth() + latPad, bounds.getEast() + lngPad],
  );
};

type MapsProps = {
  projects: TaraProject[];
  selectedId?: string | null;
  baseLayer?: MapBaseLayer;
  viewMode?: MapViewMode;
  userLocation?: UserLocation | null;
  flyToUserToken?: number;
  /** Skip fly/zoom anim + tooltips — phone / coarse pointer */
  perfLite?: boolean;
  onViewProject?: (project: TaraProject) => void;
};

const Maps2D = ({
  projects,
  selectedId,
  baseLayer = "street",
  userLocation = null,
  flyToUserToken = 0,
  perfLite = false,
  onViewProject,
}: Omit<MapsProps, "viewMode">) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const positionedRef = useRef<PositionedProject[]>([]);
  const modeRef = useRef<PaintMode>("overview");
  const onViewProjectRef = useRef(onViewProject);
  const selectedIdRef = useRef(selectedId);
  const perfLiteRef = useRef(perfLite);
  const fittedProjectsKeyRef = useRef<string>("");
  const paintRef = useRef<() => void>(() => {});
  const [overviewHint, setOverviewHint] = useState(true);

  onViewProjectRef.current = onViewProject;
  selectedIdRef.current = selectedId;
  perfLiteRef.current = perfLite;

  const clearMarkers = () => {
    markersRef.current.forEach((entry) => {
      entry.marker.off();
    });
    markersRef.current = [];
    layerGroupRef.current?.clearLayers();
  };

  const goTo = (
    map: L.Map,
    latlng: L.LatLngExpression,
    zoomLevel: number,
    duration: number,
  ) => {
    if (perfLiteRef.current) {
      map.setView(latlng, zoomLevel, { animate: false });
      return;
    }
    map.flyTo(latlng, zoomLevel, { duration });
  };

  const paintMarkers = () => {
    const map = mapRef.current;
    const group = layerGroupRef.current;
    if (!map || !group) return;

    clearMarkers();

    const positioned = positionedRef.current;
    const activeId = selectedIdRef.current;
    const lite = perfLiteRef.current;
    const zoom = map.getZoom();
    const mode: PaintMode = zoom < DETAIL_ZOOM ? "overview" : "detail";
    modeRef.current = mode;
    setOverviewHint(mode === "overview" && positioned.length > 0);

    if (mode === "overview") {
      const renderer = canvasRendererRef.current;
      positioned.forEach(({ project, lat, lng }) => {
        const isActive = activeId === project.id;
        const color = dotColorFor(project.program);
        const marker = L.circleMarker([lat, lng], {
          radius: isActive ? 7 : 4,
          color: isActive ? "#fff" : color,
          weight: isActive ? 2 : 1,
          fillColor: color,
          fillOpacity: isActive ? 0.95 : 0.7,
          renderer: renderer ?? undefined,
        }).addTo(group);

        marker.on("click", (e) => {
          L.DomEvent.stopPropagation(e);
          onViewProjectRef.current?.(project);
        });

        markersRef.current.push({ marker, project, lat, lng });
      });
      return;
    }

    // Detail: labeled SVG pins for viewport only (keeps zoom-in smooth).
    const view = paddedViewport(map);
    const inView = positioned.filter(({ lat, lng }) =>
      view.contains(L.latLng(lat, lng)),
    );

    inView.forEach(({ project, lat, lng }) => {
      const isActive = activeId === project.id;
      const marker = L.marker([lat, lng], {
        icon: createLeafletPinIcon(project, isActive),
        riseOnHover: !lite,
        riseOffset: 250,
        keyboard: false,
      }).addTo(group);

      if (!lite) {
        marker.bindTooltip(buildTooltipContent(project), {
          direction: "top",
          offset: [0, -22],
          opacity: 1,
          className: "project-map-tooltip",
        });
      }

      marker.on("click", (e) => {
        L.DomEvent.stopPropagation(e);
        onViewProjectRef.current?.(project);
      });

      markersRef.current.push({ marker, project, lat, lng });
    });
  };

  paintRef.current = paintMarkers;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: MIMAROPA_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: false,
      tapTolerance: 18,
      fadeAnimation: !perfLite,
      zoomAnimation: !perfLite,
      markerZoomAnimation: !perfLite,
      inertiaDeceleration: perfLite ? 4000 : 3000,
    });

    mapRef.current = map;
    layerGroupRef.current = L.layerGroup().addTo(map);
    canvasRendererRef.current = L.canvas({ padding: 0.5 });

    const initial = BASE_LAYERS[baseLayer];
    tileRef.current = L.tileLayer(initial.url, {
      attribution: initial.attribution,
      subdomains: "abcd",
      maxZoom: initial.maxZoom ?? 19,
      updateWhenIdle: true,
      keepBuffer: perfLite ? 1 : 2,
    }).addTo(map);

    let moveTimer: number | null = null;
    const schedulePaint = () => {
      if (moveTimer != null) window.clearTimeout(moveTimer);
      moveTimer = window.setTimeout(() => {
        paintRef.current();
      }, 80);
    };

    map.on("zoomend", schedulePaint);
    map.on("moveend", () => {
      // Viewport pin refresh only needed in detail mode.
      if (modeRef.current === "detail") schedulePaint();
    });

    return () => {
      if (moveTimer != null) window.clearTimeout(moveTimer);
      map.off("zoomend", schedulePaint);
      map.off("moveend");
      clearMarkers();
      map.remove();
      mapRef.current = null;
      layerGroupRef.current = null;
      tileRef.current = null;
      canvasRendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- map once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !tileRef.current) return;

    map.removeLayer(tileRef.current);
    const next = BASE_LAYERS[baseLayer];
    tileRef.current = L.tileLayer(next.url, {
      attribution: next.attribution,
      subdomains: "abcd",
      maxZoom: next.maxZoom ?? 19,
      updateWhenIdle: true,
      keepBuffer: perfLiteRef.current ? 1 : 2,
    }).addTo(map);
  }, [baseLayer]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const valid = (projects ?? []).filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    positionedRef.current = layoutProjectPositions(valid);
    paintMarkers();

    const projectsKey = `${valid.length}|${valid[0]?.id ?? ""}|${valid[valid.length - 1]?.id ?? ""}`;
    if (fittedProjectsKeyRef.current !== projectsKey) {
      fittedProjectsKeyRef.current = projectsKey;
      const positioned = positionedRef.current;

      if (valid.length === 1 && positioned[0]) {
        map.setView([positioned[0].lat, positioned[0].lng], 12, {
          animate: !perfLiteRef.current,
        });
      } else if (valid.length > 1 && positioned.length > 0) {
        const bounds = L.latLngBounds(
          positioned.map((p) => [p.lat, p.lng] as [number, number]),
        );
        map.fitBounds(bounds, {
          padding: [64, 64],
          maxZoom: 10,
          animate: !perfLiteRef.current,
        });
      } else {
        map.setView(MIMAROPA_CENTER, DEFAULT_ZOOM, {
          animate: !perfLiteRef.current,
        });
      }
      // fitBounds may change zoom — repaint after settle
      window.setTimeout(() => paintRef.current(), 120);
    }
  }, [projects]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker, project }) => {
      const active = selectedId === project.id;
      if (marker instanceof L.Marker) {
        marker.setIcon(createLeafletPinIcon(project, active));
        if (active) elevateMarker(marker, 1000);
        else resetMarkerElevation(marker);
      } else if (marker instanceof L.CircleMarker) {
        const color = dotColorFor(project.program);
        marker.setStyle({
          radius: active ? 7 : 4,
          color: active ? "#fff" : color,
          weight: active ? 2 : 1,
          fillOpacity: active ? 0.95 : 0.7,
        });
      }
    });

    if (!selectedId) return;
    const entry =
      markersRef.current.find((m) => m.project.id === selectedId) ??
      positionedRef.current.find((m) => m.project.id === selectedId);
    if (!entry) return;
    goTo(
      map,
      [entry.lat, entry.lng],
      Math.max(map.getZoom(), DETAIL_ZOOM),
      0.6,
    );
  }, [selectedId]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
    }
    if (userAccuracyRef.current) {
      userAccuracyRef.current.remove();
      userAccuracyRef.current = null;
    }

    if (!userLocation) return;

    if (!perfLiteRef.current) {
      userAccuracyRef.current = L.circle(
        [userLocation.lat, userLocation.lng],
        {
          radius: userLocation.accuracy ?? 40,
          color: "#38bdf8",
          fillColor: "#0ea5e9",
          fillOpacity: 0.15,
          weight: 1,
        },
      ).addTo(map);
    }

    userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], {
      icon: createUserLocationIcon(),
      zIndexOffset: 1200,
    }).addTo(map);

    if (!perfLiteRef.current) {
      userMarkerRef.current.bindTooltip("Your location", {
        direction: "top",
        offset: [0, -10],
        opacity: 1,
        className: "project-map-tooltip",
      });
    }
  }, [userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userLocation || flyToUserToken <= 0) return;
    goTo(map, [userLocation.lat, userLocation.lng], 14, 0.7);
  }, [flyToUserToken, userLocation]);

  return (
    <div className="relative h-full w-full">
      <div
        ref={containerRef}
        className="project-map-container h-full w-full"
        aria-label="TARA PAMIMAROPA GIS project map"
      />
      {overviewHint ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-[450] -translate-x-1/2 rounded-full border border-slate-600/80 bg-slate-950/85 px-3 py-1.5 text-[11px] font-medium text-slate-200 shadow-lg backdrop-blur-md">
          Zoom in for labeled pins · overview stays light
        </p>
      ) : null}
    </div>
  );
};

const Maps = ({ viewMode = "2d", perfLite, projects, ...props }: MapsProps) => {
  if (viewMode === "3d") {
    return <Maps3D projects={projects} {...props} />;
  }
  return <Maps2D projects={projects} perfLite={perfLite} {...props} />;
};

export default Maps;
