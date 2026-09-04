export type MapBaseLayer = "street" | "satellite" | "terrain" | "hybrid";

export type MapViewMode = "2d" | "3d";

export type UserLocation = {
  lat: number;
  lng: number;
  accuracy?: number;
};
