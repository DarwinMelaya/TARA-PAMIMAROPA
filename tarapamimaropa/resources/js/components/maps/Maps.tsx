import Maps3D from "./Maps3D";
import type { MapBaseLayer, MapViewMode, UserLocation } from "./mapTypes";
import {
  type TaraProject,
} from "../../constants/taraProjects";
import { useTheme } from "@/theme/ThemeProvider";

export type { MapBaseLayer, MapViewMode, UserLocation };

type MapsProps = {
  projects: TaraProject[];
  selectedId?: string | null;
  /** Unused for MapLibre liberty (kept for callers). */
  baseLayer?: MapBaseLayer;
  viewMode?: MapViewMode;
  userLocation?: UserLocation | null;
  flyToUserToken?: number;
  /** Unused — MapLibre path shares one renderer. */
  perfLite?: boolean;
  /** When omitted, follows app theme. */
  isDark?: boolean;
  onViewProject?: (project: TaraProject) => void;
};

/**
 * Project map shell. Always MapLibre + OpenFreeMap liberty (same as Maps3D).
 * `viewMode="2d"` = flat camera; `"3d"` = pitched buildings.
 */
const Maps = ({
  viewMode = "3d",
  projects,
  isDark: isDarkProp,
  perfLite: _perfLite,
  ...props
}: MapsProps) => {
  const { isDark: themeDark } = useTheme();
  const isDark = isDarkProp ?? themeDark;

  return (
    <Maps3D
      projects={projects}
      isDark={isDark}
      flat={viewMode === "2d"}
      {...props}
    />
  );
};

export default Maps;
