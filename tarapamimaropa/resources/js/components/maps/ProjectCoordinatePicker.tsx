import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './projectMap.css';
import { Crosshair, MapPin, Navigation } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MapBaseLayer } from '@/components/maps/mapTypes';
import {
    PROVINCE_MAP_CENTER,
    type Province,
} from '@/constants/taraProjects';
import { cn } from '@/lib/utils';

type Props = {
    province: Province;
    latitude: string;
    longitude: string;
    onChange: (next: { latitude: string; longitude: string }) => void;
    idPrefix?: string;
    errors?: {
        latitude?: string;
        longitude?: string;
    };
    className?: string;
};

/** Same basemap tiles as Landing / CommandMapWorkspace Maps.tsx */
const BASE_LAYERS: Record<
    MapBaseLayer,
    { url: string; attribution: string; maxZoom?: number }
> = {
    street: {
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    },
    satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
    },
    terrain: {
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        attribution:
            'Map data: &copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>, <a href="https://opentopomap.org">OpenTopoMap</a>',
        maxZoom: 17,
    },
    hybrid: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
    },
};

const BASE_LAYER_OPTIONS: { id: MapBaseLayer; label: string }[] = [
    { id: 'street', label: 'Street' },
    { id: 'satellite', label: 'Satellite' },
    { id: 'terrain', label: 'Terrain' },
    { id: 'hybrid', label: 'Hybrid' },
];

const pinIcon = L.divIcon({
    className: 'project-pin-leaflet-icon',
    html: `
      <div class="project-pin project-pin--hub project-pin--active" style="color:#22d3ee">
        <div class="project-pin__pulse"></div>
        <div class="project-pin__core" title="Selected pin">
          <span class="project-pin__glyph">PIN</span>
        </div>
        <div class="project-pin__point"></div>
      </div>
    `,
    iconSize: [52, 58],
    iconAnchor: [26, 30],
});

const formatCoord = (value: number) => value.toFixed(6);

const ProjectCoordinatePicker = ({
    province,
    latitude,
    longitude,
    onChange,
    idPrefix = 'project-coords',
    errors,
    className,
}: Props) => {
    const mapHostRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tileRef = useRef<L.TileLayer | null>(null);
    const markerRef = useRef<L.Marker | null>(null);
    const onChangeRef = useRef(onChange);
    const [baseLayer, setBaseLayer] = useState<MapBaseLayer>('satellite');
    const [locateError, setLocateError] = useState('');
    const [locating, setLocating] = useState(false);

    useEffect(() => {
        onChangeRef.current = onChange;
    }, [onChange]);

    const latNum = Number(latitude);
    const lngNum = Number(longitude);
    const hasPin =
        latitude.trim() !== '' &&
        longitude.trim() !== '' &&
        Number.isFinite(latNum) &&
        Number.isFinite(lngNum);

    const center = PROVINCE_MAP_CENTER[province] ?? {
        lat: 12.0,
        lng: 121.0,
    };

    useEffect(() => {
        if (!mapHostRef.current || mapRef.current) {
            return;
        }

        const map = L.map(mapHostRef.current, {
            center: [center.lat, center.lng],
            zoom: 9,
            zoomControl: false,
            attributionControl: true,
            preferCanvas: true,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const initial = BASE_LAYERS.satellite;
        tileRef.current = L.tileLayer(initial.url, {
            attribution: initial.attribution,
            subdomains: 'abcd',
            maxZoom: initial.maxZoom ?? 19,
        }).addTo(map);

        map.on('click', (event: L.LeafletMouseEvent) => {
            onChangeRef.current({
                latitude: formatCoord(event.latlng.lat),
                longitude: formatCoord(event.latlng.lng),
            });
        });

        mapRef.current = map;

        window.setTimeout(() => map.invalidateSize(), 80);
        window.setTimeout(() => map.invalidateSize(), 280);

        return () => {
            map.off();
            map.remove();
            mapRef.current = null;
            tileRef.current = null;
            markerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        const next = BASE_LAYERS[baseLayer];
        if (tileRef.current) {
            map.removeLayer(tileRef.current);
        }

        tileRef.current = L.tileLayer(next.url, {
            attribution: next.attribution,
            subdomains: 'abcd',
            maxZoom: next.maxZoom ?? 19,
        }).addTo(map);
    }, [baseLayer]);

    useEffect(() => {
        const map = mapRef.current;
        if (!map) return;

        if (!hasPin) {
            markerRef.current?.remove();
            markerRef.current = null;
            map.setView([center.lat, center.lng], map.getZoom() || 9);
            return;
        }

        const latLng: L.LatLngExpression = [latNum, lngNum];

        if (!markerRef.current) {
            markerRef.current = L.marker(latLng, {
                icon: pinIcon,
                draggable: true,
            }).addTo(map);

            markerRef.current.on('dragend', () => {
                const pos = markerRef.current?.getLatLng();
                if (!pos) return;
                onChangeRef.current({
                    latitude: formatCoord(pos.lat),
                    longitude: formatCoord(pos.lng),
                });
            });
        } else {
            markerRef.current.setLatLng(latLng);
        }

        map.panTo(latLng);
    }, [hasPin, latNum, lngNum, center.lat, center.lng]);

    const useMyLocation = () => {
        setLocateError('');
        if (!navigator.geolocation) {
            setLocateError('Geolocation is not supported in this browser.');
            return;
        }

        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                onChangeRef.current({
                    latitude: formatCoord(position.coords.latitude),
                    longitude: formatCoord(position.coords.longitude),
                });
                setLocating(false);
                window.setTimeout(() => mapRef.current?.invalidateSize(), 50);
            },
            (error) => {
                setLocating(false);
                if (error.code === error.PERMISSION_DENIED) {
                    setLocateError('Location permission denied.');
                    return;
                }
                setLocateError('Could not get current location.');
            },
            { enableHighAccuracy: true, timeout: 12000 },
        );
    };

    const clearPin = () => {
        onChangeRef.current({ latitude: '', longitude: '' });
        setLocateError('');
    };

    return (
        <div className={cn('grid gap-3 sm:col-span-2', className)}>
            <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                    <Label>Map coordinates</Label>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                        Same map as the public command map. Click to pin, drag
                        the marker, use your location, or type coordinates.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={locating}
                        onClick={useMyLocation}
                    >
                        <Navigation className="size-3.5" />
                        {locating ? 'Locating…' : 'My location'}
                    </Button>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={!hasPin}
                        onClick={clearPin}
                    >
                        <Crosshair className="size-3.5" />
                        Clear
                    </Button>
                </div>
            </div>

            <div className="project-map-container relative h-56 w-full overflow-hidden rounded-lg border border-cyan-500/30 sm:h-72">
                <div
                    ref={mapHostRef}
                    className="absolute inset-0 z-0 h-full w-full"
                />
                <div className="absolute top-2 left-2 z-[1000] flex rounded-xl border border-cyan-400/40 bg-slate-950/80 p-1 shadow-lg backdrop-blur-md">
                    {BASE_LAYER_OPTIONS.map((opt) => (
                        <button
                            key={opt.id}
                            type="button"
                            onClick={() => setBaseLayer(opt.id)}
                            className={cn(
                                'rounded-lg px-2 py-1.5 text-[10px] font-bold tracking-wide uppercase transition sm:px-2.5',
                                baseLayer === opt.id
                                    ? 'bg-cyan-500/25 text-cyan-100'
                                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white',
                            )}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-latitude`}>
                        <span className="inline-flex items-center gap-1.5">
                            <MapPin className="size-3.5" />
                            Latitude
                        </span>
                    </Label>
                    <Input
                        id={`${idPrefix}-latitude`}
                        name="latitude"
                        type="number"
                        step="any"
                        min={-90}
                        max={90}
                        inputMode="decimal"
                        placeholder="e.g. 13.412345"
                        value={latitude}
                        onChange={(e) =>
                            onChange({
                                latitude: e.target.value,
                                longitude,
                            })
                        }
                    />
                    <InputError message={errors?.latitude} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor={`${idPrefix}-longitude`}>Longitude</Label>
                    <Input
                        id={`${idPrefix}-longitude`}
                        name="longitude"
                        type="number"
                        step="any"
                        min={-180}
                        max={180}
                        inputMode="decimal"
                        placeholder="e.g. 121.180300"
                        value={longitude}
                        onChange={(e) =>
                            onChange({
                                latitude,
                                longitude: e.target.value,
                            })
                        }
                    />
                    <InputError message={errors?.longitude} />
                </div>
            </div>

            {locateError ? (
                <p className="text-destructive text-xs">{locateError}</p>
            ) : null}
        </div>
    );
};

export default ProjectCoordinatePicker;
