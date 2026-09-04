import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./projectMap.css";
import {
  PROGRAM_META,
  STATUS_META,
  type TaraProject,
} from "../../constants/taraProjects";
import { buildProjectPinHtml } from "./projectMapPins";
import Maps3D from "./Maps3D";
import type { MapBaseLayer, MapViewMode, UserLocation } from "./mapTypes";

export type { MapBaseLayer, MapViewMode, UserLocation };

const MIMAROPA_CENTER: L.LatLngExpression = [12.0, 121.0];
const DEFAULT_ZOOM = 7;

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
  marker: L.Marker;
};

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

const createProjectPinIcon = (project: TaraProject, isActive: boolean) =>
  L.divIcon({
    className: "project-pin-leaflet-icon",
    html: buildProjectPinHtml(project, isActive),
    iconSize: [52, 58],
    iconAnchor: [26, 30],
  });

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

const setPinState = (
  marker: L.Marker,
  { active, hover }: { active?: boolean; hover?: boolean },
) => {
  const pin = marker.getElement()?.querySelector(".project-pin");
  if (!pin) return;
  pin.classList.toggle("project-pin--active", !!active);
  pin.classList.toggle("project-pin--hover", !!hover);
};

const elevateMarker = (marker: L.Marker, offset = 800) => {
  marker.setZIndexOffset?.(offset);
};

const resetMarkerElevation = (marker: L.Marker) => {
  marker.setZIndexOffset?.(0);
};

type MapsProps = {
  projects: TaraProject[];
  selectedId?: string | null;
  baseLayer?: MapBaseLayer;
  viewMode?: MapViewMode;
  userLocation?: UserLocation | null;
  flyToUserToken?: number;
  /** Skip fly/zoom anim + lighter tiles — phone / coarse pointer */
  perfLite?: boolean;
  onViewProject?: (project: TaraProject) => void;
};

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
  const markersRef = useRef<MarkerEntry[]>([]);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyRef = useRef<L.Circle | null>(null);
  const onViewProjectRef = useRef(onViewProject);
  const selectedIdRef = useRef(selectedId);
  const perfLiteRef = useRef(perfLite);

  onViewProjectRef.current = onViewProject;
  selectedIdRef.current = selectedId;
  perfLiteRef.current = perfLite;

  const clearMarkers = (map: L.Map | null) => {
    markersRef.current.forEach((entry) => {
      entry.marker.off();
      if (map?.hasLayer(entry.marker)) entry.marker.remove();
    });
    markersRef.current = [];
  };

  const goTo = (
    map: L.Map,
    latlng: L.LatLngExpression,
    zoom: number,
    duration: number,
  ) => {
    if (perfLiteRef.current) {
      map.setView(latlng, zoom, { animate: false });
      return;
    }
    map.flyTo(latlng, zoom, { duration });
  };

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

    L.control.zoom({ position: "bottomright" }).addTo(map);

    const initial = BASE_LAYERS[baseLayer];
    tileRef.current = L.tileLayer(initial.url, {
      attribution: initial.attribution,
      subdomains: "abcd",
      maxZoom: initial.maxZoom ?? 19,
      updateWhenIdle: perfLite,
      keepBuffer: perfLite ? 1 : 2,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      clearMarkers(map);
      map.remove();
      mapRef.current = null;
      tileRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (tileRef.current) {
      map.removeLayer(tileRef.current);
    }

    const next = BASE_LAYERS[baseLayer];
    tileRef.current = L.tileLayer(next.url, {
      attribution: next.attribution,
      subdomains: "abcd",
      maxZoom: next.maxZoom ?? 19,
      updateWhenIdle: perfLiteRef.current,
      keepBuffer: perfLiteRef.current ? 1 : 2,
    }).addTo(map);
  }, [baseLayer]);

  // Rebuild markers only when project set changes — not on every select.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    clearMarkers(map);

    const valid = (projects ?? []).filter(
      (p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude),
    );
    const positioned = layoutProjectPositions(valid);
    const activeId = selectedIdRef.current;

    positioned.forEach(({ project, lat, lng }) => {
      const isActive = activeId === project.id;
      const marker = L.marker([lat, lng], {
        icon: createProjectPinIcon(project, isActive),
        riseOnHover: !perfLiteRef.current,
        riseOffset: 250,
      }).addTo(map);

      if (!perfLiteRef.current) {
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

      if (!perfLiteRef.current) {
        marker.on("mouseover", () => {
          const isPinActive = selectedIdRef.current === project.id;
          setPinState(marker, { active: isPinActive, hover: true });
          elevateMarker(marker, isPinActive ? 1000 : 800);
          marker.openTooltip();
        });

        marker.on("mouseout", () => {
          const isPinActive = selectedIdRef.current === project.id;
          setPinState(marker, { active: isPinActive, hover: false });
          if (!isPinActive) resetMarkerElevation(marker);
        });
      }

      markersRef.current.push({ marker, project, lat, lng });
    });

    if (valid.length === 1) {
      map.setView([positioned[0].lat, positioned[0].lng], 11, {
        animate: !perfLiteRef.current,
      });
    } else if (valid.length > 1) {
      const bounds = L.latLngBounds(positioned.map((p) => [p.lat, p.lng]));
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
  }, [projects]);

  // Selection: update pin state + pan only — no full marker rebuild.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(({ marker, project }) => {
      const active = selectedId === project.id;
      setPinState(marker, { active, hover: false });
      if (active) elevateMarker(marker, 1000);
      else resetMarkerElevation(marker);
    });

    if (!selectedId) return;
    const entry = markersRef.current.find((m) => m.project.id === selectedId);
    if (!entry) return;
    goTo(map, [entry.lat, entry.lng], 12, 0.6);
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
    <div
      ref={containerRef}
      className="project-map-container h-full w-full"
      aria-label="TARA PAMIMAROPA GIS project map"
    />
  );
};

const Maps = ({ viewMode = "2d", perfLite, ...props }: MapsProps) => {
  if (viewMode === "3d") {
    return <Maps3D {...props} />;
  }
  return <Maps2D {...props} perfLite={perfLite} />;
};

export default Maps;
