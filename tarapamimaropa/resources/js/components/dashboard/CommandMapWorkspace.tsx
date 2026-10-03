import { Head, Link } from '@inertiajs/react';
import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
    HiAcademicCap,
    HiArrowTopRightOnSquare,
    HiBanknotes,
    HiBuildingOffice2,
    HiChartBar,
    HiDocumentArrowDown,
    HiDocumentText,
    HiExclamationTriangle,
    HiFunnel,
    HiChevronDown,
    HiMagnifyingGlass,
    HiMapPin,
    HiCube,
    HiPaperAirplane,
    HiPauseCircle,
    HiSignal,
    HiSquares2X2,
    HiTableCells,
    HiUserGroup,
    HiXMark,
} from 'react-icons/hi2';
import GraphsPanel from '@/components/region/dashboard/GraphsPanel';
import QuickSnapshotModal from '@/components/modals/region/QuickSnapshotModal';
import Maps, {
    type MapViewMode,
    type UserLocation,
} from '@/components/maps/Maps';
import ThemeToggle from '@/theme/ThemeToggle';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import {
    PROGRAM_META,
    PROVINCES,
    STATUS_META,
    describeProject,
    formatCompact,
    formatPeso,
    projectStatusClass,
    projectStatusLabel,
    projectTypeLabel,
    projectTypeOptions,
    projectYear,
    summarizeProjects,
    type ProjectStatus,
    type Province,
    type TaraProgram,
    type TaraProject,
} from '@/constants/taraProjects';
import { downloadProjectPdfReport } from '@/lib/project-print-report';
export type CommandMapVariant = "public" | "region";

export type CommandMapWorkspaceProps = {
  projects: TaraProject[];
  variant?: CommandMapVariant;
  programsHref?: string;
  pageTitle?: string;
  /** Public landing: scroll target for “Browse project list”. */
  browseListHref?: string;
};

type StatKey =
  | "total"
  | "active"
  | "completed"
  | "delayed"
  | "onHold"
  | "beneficiaries"
  | "funding"
  | "utilized";

const STAT_CARDS: {
  key: StatKey;
  label: string;
  icon: typeof HiSquares2X2;
  format: "number" | "peso" | "compact";
  statusFilter?: ProjectStatus | "all";
}[] = [
  { key: "total", label: "Total projects", icon: HiSquares2X2, format: "number", statusFilter: "all" },
  { key: "active", label: "Active", icon: HiSignal, format: "number", statusFilter: "ongoing" },
  { key: "completed", label: "Completed", icon: HiAcademicCap, format: "number", statusFilter: "completed" },
  { key: "delayed", label: "Delayed", icon: HiExclamationTriangle, format: "number", statusFilter: "delayed" },
  { key: "onHold", label: "On hold", icon: HiPauseCircle, format: "number", statusFilter: "on_hold" },
  { key: "beneficiaries", label: "Beneficiaries", icon: HiUserGroup, format: "compact" },
  { key: "funding", label: "Funding released", icon: HiBanknotes, format: "peso" },
  { key: "utilized", label: "Funding utilized", icon: HiChartBar, format: "peso" },
];

const formatStat = (
  value: number,
  format: "number" | "peso" | "compact",
) => {
  if (format === "peso") return formatPeso(value);
  if (format === "compact") return formatCompact(value);
  return String(value);
};

const openGoogleDirections = (
  project: TaraProject,
  origin: UserLocation | null,
) => {
  const destination = `${project.latitude},${project.longitude}`;
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  url.searchParams.set("destination", destination);
  url.searchParams.set("travelmode", "driving");
  if (origin) {
    url.searchParams.set("origin", `${origin.lat},${origin.lng}`);
  }
  window.open(url.toString(), "_blank", "noopener,noreferrer");
};

type ReportFilters = {
  province: Province | "all";
  program: TaraProgram | "all";
  type: string | "all";
  status: string | "all";
  search: string;
};

const REPORT_COLUMNS: { key: keyof TaraProject; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "name", label: "Project" },
  { key: "program", label: "Program" },
  { key: "province", label: "Province" },
  { key: "municipality", label: "Municipality" },
  { key: "barangay", label: "Barangay" },
  { key: "status", label: "Status" },
  { key: "progress", label: "Progress %" },
  { key: "budget", label: "Budget (PHP)" },
  { key: "funding_source", label: "Funding source" },
  { key: "beneficiaries", label: "Beneficiaries" },
  { key: "partner_agency", label: "Partner agency" },
  { key: "start_date", label: "Start" },
  { key: "end_date", label: "End" },
  { key: "latest_accomplishment", label: "Latest accomplishment" },
];

const describeFilters = (filters: ReportFilters): string => {
  const parts: string[] = [];
  if (filters.province !== "all") parts.push(`Province: ${filters.province}`);
  if (filters.program !== "all") parts.push(`Program: ${filters.program}`);
  if (filters.type !== "all") parts.push(`Type: ${filters.type}`);
  if (filters.status !== "all") parts.push(`Status: ${filters.status}`);
  if (filters.search.trim()) parts.push(`Search: "${filters.search.trim()}"`);
  return parts.length ? parts.join(" · ") : "All projects (no filters)";
};

const escapeCsv = (value: string | number): string => {
  const str = String(value ?? "");
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const downloadCsvReport = (
  projects: TaraProject[],
  filters: ReportFilters,
) => {
  const stamp = new Date();
  const headerLines = [
    `TARA PAMIMAROPA — Project Report`,
    `Generated: ${stamp.toLocaleString("en-PH")}`,
    `Scope: ${describeFilters(filters)}`,
    `Projects: ${projects.length}`,
    "",
  ].map((line) => escapeCsv(line));

  const header = REPORT_COLUMNS.map((c) => escapeCsv(c.label)).join(",");
  const rows = projects.map((p) =>
    REPORT_COLUMNS.map((c) => {
      if (c.key === "status") return escapeCsv(projectStatusLabel(p));
      return escapeCsv(p[c.key] as string | number);
    }).join(","),
  );

  const csv = [...headerLines, header, ...rows].join("\r\n");
  const blob = new Blob(["\ufeff" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tara-report-${stamp.toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const countBy = <T extends string>(
  projects: TaraProject[],
  pick: (p: TaraProject) => T,
): { key: T; count: number }[] => {
  const map = new Map<T, number>();
  projects.forEach((p) => {
    const k = pick(p);
    map.set(k, (map.get(k) ?? 0) + 1);
  });
  return [...map.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
};

const printReport = (projects: TaraProject[], filters: ReportFilters) => {
  downloadProjectPdfReport(projects, {
    label: describeFilters(filters),
    fileStem: `tara-report-${new Date().toISOString().slice(0, 10)}`,
  });
  return true;
};

const PERF_LITE_MQ = "(max-width: 1023px), (pointer: coarse)";
const FEED_PAGE_SIZE = 40;

const readPerfLite = () =>
  typeof window !== "undefined"
    ? window.matchMedia(PERF_LITE_MQ).matches
    : true;

const UI = {
  light: {
    page: "bg-[#f4f6f9] text-[#070F1F]",
    panel:
      "border-[#e2e7ee] bg-white shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
    chromeBtn:
      "min-h-10 rounded-lg border border-[#d5dce5] bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-colors duration-150 hover:border-[#1D4ED8] hover:text-[#1D4ED8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/40 disabled:opacity-50",
    badge: "border-[#d5dce5] bg-white text-[#1D4ED8] shadow-sm",
    title: "text-[#070F1F]",
    subtitle: "text-slate-600",
    meta: "text-[#4b5563]",
    select:
      "min-h-10 cursor-pointer appearance-none rounded-lg border bg-white py-2 pl-8 pr-8 text-sm font-semibold text-[#070F1F] shadow-sm outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/40",
    selectIdle: "border-[#d5dce5] hover:border-[#1D4ED8]",
    selectActive: "border-[#1D4ED8] bg-[#eff4ff]",
    layerBar: "border-[#d5dce5] bg-white shadow-sm",
    layerIdle: "text-[#4b5563] hover:text-[#070F1F]",
    overlayDarkish: "",
    overlay3d: "",
    grid: "",
    fadeTop: "from-white/80 via-white/30",
    fadeBottom: "from-white/70 via-white/20",
    mobileSheetBtn: "border-[#d5dce5] bg-white text-slate-700 shadow-sm",
    mobileSheetBtnOn: "border-[#1D4ED8] bg-[#1D4ED8] text-white",
    scrim: "bg-[#030A17]/50",
    modal: "border-[#e2e7ee] bg-white shadow-[0_16px_40px_rgba(15,23,42,0.18)]",
    modalMuted: "text-[#4b5563]",
    modalBody: "text-slate-700",
    modalHeading: "text-[#070F1F]",
    feedItem:
      "border-[#e8edf3] bg-white hover:border-[#d5dce5] hover:bg-[#f8fafc]",
    feedItemOn: "border-[#1D4ED8] bg-[#eff4ff]",
    input:
      "border-[#d5dce5] bg-white text-[#070F1F] placeholder:text-slate-500 focus:border-[#1D4ED8] focus:ring-2 focus:ring-[#1D4ED8]/20",
    insight: "border-[#e2e7ee] bg-white text-slate-800 shadow-sm",

    chipIdle:
      "border border-[#d5dce5] bg-white text-slate-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]",
    chipOn: "border border-[#1D4ED8] bg-[#1D4ED8] text-white",
    chipOnAlt: "border border-[#1D4ED8] bg-[#1D4ED8] text-white",
    panelDivider: "border-[#e8edf3]",
    panelLabel: "text-[#4b5563]",
    cell: "border-[#e8edf3] bg-[#f8fafc]",
    closeBtn:
      "rounded-lg border border-[#d5dce5] p-2 text-[#4b5563] transition-colors duration-150 hover:bg-slate-50 hover:text-[#070F1F]",
    iconBtn: "text-slate-500 hover:text-slate-800",
    searchPanel:
      "border-[#e2e7ee] bg-white shadow-[0_16px_48px_rgba(15,23,42,0.18)]",
    searchDivider: "border-[#e8edf3]",
    avatarBox: "bg-slate-100 ring-slate-200",
    emptyPhoto: "border-dashed border-[#d5dce5] bg-[#f8fafc] text-[#4b5563]",
    mutedBtn:
      "border border-[#d5dce5] text-slate-600 hover:border-[#1D4ED8] hover:text-[#1D4ED8]",
    showMore: "border border-[#d5dce5] text-[#1D4ED8] hover:bg-[#eff4ff]",
    ringOffset: "ring-offset-white",
    alert: "border-red-300 bg-white text-red-700",
    insightLabel: "text-[#4b5563]",
    active: "border-[#1D4ED8] bg-[#eff4ff] text-[#1D4ED8]",
    accentText: "text-[#1D4ED8]",
    primaryBtn:
      "min-h-10 rounded-lg border border-[#1D4ED8] bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-colors duration-150 hover:bg-[#1E40AF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/40 focus-visible:ring-offset-1 disabled:opacity-40",
    heroCard: "border-[#e2e7ee] bg-white/95 shadow-[0_4px_16px_rgba(15,23,42,0.08)]",
    statCard: "border-[#e8edf3] bg-white hover:border-[#d5dce5]",
    statIcon: "bg-[#eff4ff] text-[#1D4ED8]",
    statValue: "text-[#070F1F]",
    countPill: "bg-[#eff4ff] text-[#1D4ED8]",
  },
  dark: {
    page: "bg-[#030A17] text-[#f1f1f1]",
    panel:
      "border-white/10 bg-[#070F1F]/95 shadow-[0_8px_24px_rgba(0,0,0,0.4)] lg:backdrop-blur-md",
    chromeBtn:
      "min-h-10 rounded-lg border border-white/15 bg-[#070F1F]/95 px-3 py-2 text-sm font-semibold text-[#f1f1f1] transition-colors duration-150 hover:border-[#93C5FD]/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/60 disabled:opacity-50 lg:backdrop-blur-md",
    badge: "border-white/15 bg-[#070F1F] text-[#BFDBFE]",
    title: "text-white",
    subtitle: "text-[#cfcfcf]",
    meta: "text-[#a3acbd]",
    select:
      "min-h-10 cursor-pointer appearance-none rounded-lg border bg-[#070F1F]/95 py-2 pl-8 pr-8 text-sm font-semibold text-white outline-none transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-[#93C5FD]/60 lg:backdrop-blur-md",
    selectIdle: "border-white/15 hover:border-[#93C5FD]/60",
    selectActive: "border-[#60A5FA] bg-[#0B1E4A]/60",
    layerBar: "border-white/15 bg-[#070F1F]/95 lg:backdrop-blur-md",
    layerIdle: "text-[#a3acbd] hover:text-white",
    overlayDarkish:
      "bg-[linear-gradient(to_bottom,rgba(2,6,23,0.05),rgba(2,6,23,0.35))]",
    overlay3d: "",
    grid: "",
    fadeTop: "from-[#030A17]/90 via-[#030A17]/40",
    fadeBottom: "from-[#030A17]/90 via-[#030A17]/40",
    mobileSheetBtn: "border-white/15 bg-[#070F1F] text-[#f1f1f1]",
    mobileSheetBtnOn: "border-[#60A5FA] bg-[#1D4ED8] text-white",
    scrim: "bg-[#030A17]/70",
    modal: "border-white/10 bg-[#070F1F] shadow-[0_16px_40px_rgba(0,0,0,0.5)]",
    modalMuted: "text-[#a3acbd]",
    modalBody: "text-[#cfcfcf]",
    modalHeading: "text-white",
    feedItem:
      "border-white/10 bg-[#070F1F] hover:border-white/15 hover:bg-white/[0.04]",
    feedItemOn: "border-[#60A5FA] bg-[#0B1E4A]/50",
    input:
      "border-white/15 bg-[#030A17] text-white placeholder:text-[#8b95a8] focus:border-[#60A5FA] focus:ring-2 focus:ring-[#60A5FA]/30",
    insight: "border-white/10 bg-[#070F1F]/90 text-[#f1f1f1]",

    chipIdle:
      "border border-white/15 text-[#cfcfcf] hover:border-[#93C5FD]/60 hover:text-white",
    chipOn: "border border-[#60A5FA] bg-[#1D4ED8] text-white",
    chipOnAlt: "border border-[#60A5FA] bg-[#1D4ED8] text-white",
    panelDivider: "border-white/10",
    panelLabel: "text-[#a3acbd]",
    cell: "border-white/10 bg-[#030A17]/60",
    closeBtn:
      "rounded-lg border border-white/15 p-2 text-[#a3acbd] transition-colors duration-150 hover:bg-white/[0.06] hover:text-white",
    iconBtn: "text-[#a3acbd] hover:text-white",
    searchPanel:
      "border-white/10 bg-[#070F1F] shadow-[0_16px_48px_rgba(0,0,0,0.6)]",
    searchDivider: "border-white/10",
    avatarBox: "bg-[#030A17]/70 ring-white/15",
    emptyPhoto: "border-dashed border-white/15 bg-[#030A17]/60 text-[#8b95a8]",
    mutedBtn:
      "border border-white/15 text-[#cfcfcf] hover:border-[#93C5FD]/60 hover:text-white",
    showMore: "border border-white/15 text-[#93C5FD] hover:bg-[#60A5FA]/10",
    ringOffset: "ring-offset-[#070F1F]",
    alert: "border-red-500/40 bg-[#070F1F] text-red-300",
    insightLabel: "text-[#a3acbd]",
    active: "border-[#60A5FA] bg-[#0B1E4A]/60 text-[#DBEAFE]",
    accentText: "text-[#93C5FD]",
    primaryBtn:
      "min-h-10 rounded-lg border border-[#60A5FA] bg-[#1D4ED8] px-3.5 py-2 text-sm font-semibold text-white transition-colors duration-150 hover:bg-[#2563EB] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/60 focus-visible:ring-offset-1 focus-visible:ring-offset-[#070F1F] disabled:opacity-40",
    heroCard: "border-white/10 bg-[#070F1F]/90 shadow-[0_8px_24px_rgba(0,0,0,0.4)] backdrop-blur-md",
    statCard: "border-white/10 bg-[#030A17]/40 hover:border-white/15",
    statIcon: "bg-[#60A5FA]/15 text-[#93C5FD]",
    statValue: "text-white",
    countPill: "bg-[#60A5FA]/15 text-[#BFDBFE]",
  },
} as const satisfies Record<ThemeMode, Record<string, string>>;

const CommandMapWorkspace = ({
  projects,
  variant = "region",
  programsHref,
  pageTitle = "TARA PAMIMAROPA",
  browseListHref,
}: CommandMapWorkspaceProps) => {
  const { theme, isDark } = useTheme();
  const ui = UI[theme];
  const statusMode = isDark ? "dark" : "light";
  const isPublic = variant === "public";
  const [devicePerfLite, setDevicePerfLite] = useState(readPerfLite);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<TaraProject | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<Province | "all">("all");
  const [programFilter, setProgramFilter] = useState<TaraProgram | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [mobileSheet, setMobileSheet] = useState<
    "stats" | "feed" | "graphs" | null
  >(null);
  const [viewMode, setViewMode] = useState<MapViewMode>("3d");
  const [graphsExpanded, setGraphsExpanded] = useState(false);
  const [feedExpanded, setFeedExpanded] = useState(false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [reportError, setReportError] = useState("");
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locateLoading, setLocateLoading] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [flyToUserToken, setFlyToUserToken] = useState(0);
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);

  const statusOptions = useMemo(() => {
    const labels = new Set<string>();
    for (const p of projects) {
      labels.add(projectStatusLabel(p));
    }
    return [...labels].sort((a, b) => a.localeCompare(b));
  }, [projects]);

  // Device perf only — never force cyan dots just because many projects.
  const perfLite = devicePerfLite;

  useEffect(() => {
    const mq = window.matchMedia(PERF_LITE_MQ);
    const sync = () => setDevicePerfLite(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Debounce search so each keystroke not rebuild map markers.
  useEffect(() => {
    const id = window.setTimeout(() => setSearch(searchDraft), perfLite ? 280 : 160);
    return () => window.clearTimeout(id);
  }, [searchDraft, perfLite]);

  // Reset feed window when filters change.
  useEffect(() => {
    setFeedLimit(FEED_PAGE_SIZE);
  }, [provinceFilter, programFilter, typeFilter, statusFilter, search]);

  const stats = useMemo(() => summarizeProjects(projects), [projects]);
  const typeOptions = useMemo(() => projectTypeOptions(projects), [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const mappedKeys = Object.keys(STATUS_META);
    return projects.filter((p) => {
      if (provinceFilter !== "all" && p.province !== provinceFilter) return false;
      if (programFilter !== "all" && p.program !== programFilter) return false;
      if (typeFilter !== "all" && projectTypeLabel(p) !== typeFilter) return false;
      if (statusFilter !== "all") {
        if (mappedKeys.includes(statusFilter)) {
          if (p.status !== statusFilter) return false;
        } else if (projectStatusLabel(p) !== statusFilter) {
          return false;
        }
      }
      if (!q) return true;
      const label = projectStatusLabel(p).toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.program.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        p.barangay.toLowerCase().includes(q) ||
        p.partner_agency.toLowerCase().includes(q) ||
        p.funding_source.toLowerCase().includes(q) ||
        label.includes(q)
      );
    });
  }, [projects, provinceFilter, programFilter, typeFilter, statusFilter, search]);

  const deferredMapProjects = useDeferredValue(filteredProjects);
  const feedProjects = useMemo(
    () => filteredProjects.slice(0, feedLimit),
    [filteredProjects, feedLimit],
  );
  const searchResultProjects = useMemo(
    () => filteredProjects.slice(0, Math.min(feedLimit, 30)),
    [filteredProjects, feedLimit],
  );

  const scoped = useMemo(
    () => summarizeProjects(filteredProjects),
    [filteredProjects],
  );

  const handleViewProject = (project: TaraProject) => {
    setSelectedId(project.id);
    setViewing(project);
  };

  const handleCloseDetail = () => {
    setViewing(null);
    setSelectedId(null);
  };

  const handleStatClick = (card: (typeof STAT_CARDS)[number]) => {
    if (card.statusFilter) {
      setStatusFilter(card.statusFilter);
    }
  };

  const clearFilters = () => {
    setProvinceFilter("all");
    setProgramFilter("all");
    setTypeFilter("all");
    setStatusFilter("all");
    setSearch("");
    setSearchDraft("");
  };

  const reportFilters: ReportFilters = {
    province: provinceFilter,
    program: programFilter,
    type: typeFilter,
    status: statusFilter,
    search,
  };

  const handleDownloadCsv = () => {
    setReportError("");
    downloadCsvReport(filteredProjects, reportFilters);
  };

  const handlePrintReport = () => {
    try {
      printReport(filteredProjects, reportFilters);
      setReportError("");
    } catch {
      setReportError(
        "Could not generate the PDF. Try again or export CSV instead.",
      );
    }
  };

  const hasFilters =
    provinceFilter !== "all" ||
    programFilter !== "all" ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim().length > 0;

  const toggleMobileSheet = (
    sheet: "stats" | "feed" | "graphs",
  ) => {
    setMobileSheet((current) => (current === sheet ? null : sheet));
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setLocateError("Geolocation not supported on this browser.");
      return;
    }

    setLocateLoading(true);
    setLocateError("");

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next: UserLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        setUserLocation(next);
        setFlyToUserToken((token) => token + 1);
        setLocateLoading(false);
      },
      (error) => {
        setLocateLoading(false);
        if (error.code === error.PERMISSION_DENIED) {
          setLocateError("Location permission denied.");
          return;
        }
        if (error.code === error.POSITION_UNAVAILABLE) {
          setLocateError("Location unavailable.");
          return;
        }
        setLocateError("Could not get current location.");
      },
      {
        enableHighAccuracy: true,
        timeout: 12_000,
        maximumAge: 15_000,
      },
    );
  };

  return (
    <>
    <Head title={pageTitle} />
    <section className={`relative z-30 min-h-[32rem] w-full flex-1 overflow-hidden pb-[calc(5.75rem+env(safe-area-inset-bottom))] lg:pb-0 ${isPublic ? "h-svh rounded-none" : "h-full max-md:h-svh max-md:rounded-none md:h-[calc(100svh-1.5rem)] rounded-[inherit]"} ${ui.page}`}>
      <div className="pointer-events-auto absolute inset-0 z-[5]">
        <Maps
          projects={deferredMapProjects}
          selectedId={selectedId}
          viewMode={viewMode}
          isDark={isDark}
          userLocation={userLocation}
          flyToUserToken={flyToUserToken}
          onViewProject={handleViewProject}
        />
      </div>

      {/* Soft chrome fades only — keep map readable in light + dark */}
      {!perfLite ? (
        <>
          <div
            className={[
              "pointer-events-none absolute inset-0 z-10",
              viewMode === "3d" ? ui.overlay3d : ui.overlayDarkish,
            ].join(" ")}
          />
          {viewMode !== "3d" && theme === "dark" ? (
            <div className={`pointer-events-none absolute inset-0 z-10 ${ui.grid}`} />
          ) : null}
        </>
      ) : null}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b to-transparent lg:h-28 ${ui.fadeTop}`} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t to-transparent lg:h-36 ${ui.fadeBottom}`} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5">
        <div
          className={[
            isPublic
              ? "flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              : "flex items-start justify-between gap-2 sm:gap-3",
          ].join(" ")}
        >
          {/* Title is visual only — never steal map drag/pan hits */}
          <div
            className={[
              "pointer-events-none min-w-0",
              isPublic
                ? `max-w-md rounded-2xl border p-3 sm:p-4 ${ui.heroCard}`
                : "max-w-xl lg:max-w-2xl",
            ].join(" ")}
          >
            {isPublic ? (
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${ui.accentText}`}>
                DOST-MIMAROPA · Project map
              </p>
            ) : null}
            <h1
              className={[
                "font-sei-display font-extrabold tracking-tight",
                isPublic ? "mt-1 text-xl sm:text-2xl" : "text-xl sm:text-3xl",
                ui.title,
              ].join(" ")}
            >
              TARA PAMIMAROPA
            </h1>
            {isPublic ? (
              <>
                <p className={`mt-1 hidden text-sm leading-snug sm:block ${ui.subtitle}`}>
                  Tracking of Accomplishments and Results of Activities and
                  Programs across MIMAROPA
                </p>
                <dl className={`mt-3 hidden gap-4 border-t pt-3 text-xs sm:flex ${ui.panelDivider}`}>
                  {(
                    [
                      ["On map", filteredProjects.length],
                      ["Municipalities", stats.municipalities],
                      ["Partners", stats.partners],
                    ] as const
                  ).map(([label, value]) => (
                    <div key={label}>
                      <dt className={ui.meta}>{label}</dt>
                      <dd className={`mt-0.5 text-base font-bold tabular-nums ${ui.title}`}>
                        {value.toLocaleString()}
                      </dd>
                    </div>
                  ))}
                </dl>
                <ul
                  className={`mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold sm:mt-3 ${ui.subtitle}`}
                  aria-label="Program colors"
                >
                  {(["SETUP", "CEST", "GIA", "SSCP"] as const).map((program) => (
                    <li key={program} className="inline-flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 rounded-full ring-2 ring-white/80"
                        style={{ backgroundColor: PROGRAM_META[program].color }}
                        aria-hidden
                      />
                      {program}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className={`mt-1 hidden text-xs sm:block ${ui.meta}`}>
                {filteredProjects.length} projects on map
              </p>
            )}
          </div>

          {isPublic ? (
            <div className="pointer-events-auto flex flex-wrap items-center gap-2 sm:justify-end">
              <div className="relative shrink-0">
                <HiMapPin
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${ui.accentText}`}
                  aria-hidden
                />
                <select
                  value={provinceFilter}
                  onChange={(e) =>
                    setProvinceFilter(e.target.value as Province | "all")
                  }
                  aria-label="Filter by province"
                  className={[
                    ui.select,
                    provinceFilter !== "all" ? ui.selectActive : ui.selectIdle,
                  ].join(" ")}
                >
                  <option value="all">All provinces</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="relative shrink-0">
                <HiFunnel
                  className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${ui.accentText}`}
                  aria-hidden
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by project type"
                  className={[
                    ui.select,
                    "max-w-[12rem]",
                    typeFilter !== "all" ? ui.selectActive : ui.selectIdle,
                  ].join(" ")}
                >
                  <option value="all">All types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSearchOpen((v) => {
                    if (!v) setSearchDraft(search);
                    return !v;
                  })
                }
                className={[
                  "inline-flex w-10 shrink-0 items-center justify-center",
                  ui.chromeBtn,
                  searchOpen ? ui.active : "",
                ].join(" ")}
                aria-label="Search projects"
                title="Search projects"
                aria-pressed={searchOpen}
              >
                <HiMagnifyingGlass className="h-4 w-4" aria-hidden />
              </button>
              <ThemeToggle compact className="w-10" />
              <button
                type="button"
                onClick={() => {
                  setViewMode((mode) => (mode === "2d" ? "3d" : "2d"));
                }}
                className={[
                  "inline-flex shrink-0 items-center justify-center gap-2",
                  ui.chromeBtn,
                  viewMode === "3d" ? ui.active : "",
                ].join(" ")}
                aria-pressed={viewMode === "3d"}
                title={viewMode === "3d" ? "Switch to flat 2D map" : "Switch to 3D map"}
              >
                <HiCube className="h-4 w-4" aria-hidden />
                <span>{viewMode === "3d" ? "3D" : "2D"}</span>
              </button>
              <button
                type="button"
                onClick={handleLocateMe}
                disabled={locateLoading}
                className={[
                  "inline-flex w-10 shrink-0 items-center justify-center",
                  ui.chromeBtn,
                  userLocation ? ui.active : "",
                ].join(" ")}
                aria-label={locateLoading ? "Locating…" : "Show my location"}
                title={locateLoading ? "Locating…" : "Show my location"}
              >
                <HiMapPin
                  className={`h-4 w-4 ${locateLoading ? "animate-pulse" : ""}`}
                  aria-hidden
                />
              </button>
              <span className={`mx-0.5 hidden h-6 border-l sm:block ${ui.panelDivider}`} aria-hidden />
              <button
                type="button"
                onClick={() => {
                  setGraphsExpanded((open) => !open);
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setMobileSheet((sheet) =>
                      sheet === "graphs" ? null : "graphs",
                    );
                  }
                }}
                className={[
                  "inline-flex shrink-0 items-center justify-center gap-2",
                  ui.chromeBtn,
                  graphsExpanded || mobileSheet === "graphs" ? ui.active : "",
                ].join(" ")}
                aria-pressed={graphsExpanded || mobileSheet === "graphs"}
                aria-label="Graphs"
              >
                <HiChartBar className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Graphs</span>
              </button>
              <button
                type="button"
                onClick={() => setSnapshotOpen(true)}
                className={[
                  "inline-flex shrink-0 items-center justify-center gap-2",
                  ui.chromeBtn,
                  snapshotOpen ? ui.active : "",
                ].join(" ")}
                aria-pressed={snapshotOpen}
                aria-label="Snapshot"
              >
                <HiTableCells className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Snapshot</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setReportError("");
                  setReportOpen(true);
                }}
                className={[
                  "inline-flex shrink-0 items-center justify-center gap-2",
                  ui.chromeBtn,
                ].join(" ")}
                aria-label="Report"
              >
                <HiDocumentArrowDown className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Report</span>
              </button>
              {browseListHref ? (
                <a
                  href={browseListHref}
                  onClick={(e) => {
                    const id = browseListHref.replace(/^#/, "");
                    const el = document.getElementById(id);
                    if (!el) return;
                    e.preventDefault();
                    el.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className={`inline-flex shrink-0 items-center justify-center gap-2 ${ui.primaryBtn}`}
                >
                  <span className="hidden sm:inline">Browse projects</span>
                  <span className="sm:hidden">List</span>
                  <HiChevronDown className="h-4 w-4" aria-hidden />
                </a>
              ) : null}
            </div>
          ) : (
            <aside
              className={[
                "pointer-events-auto flex max-h-[min(72svh,40rem)] w-[11.25rem] shrink-0 flex-col gap-2 overflow-y-auto overscroll-contain rounded-2xl border p-2 sm:w-[12.5rem] sm:p-2.5",
                ui.panel,
              ].join(" ")}
              aria-label="Map controls"
            >
              <div className="relative w-full">
                <HiMapPin
                  className={`pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${ui.accentText}`}
                  aria-hidden
                />
                <select
                  value={provinceFilter}
                  onChange={(e) =>
                    setProvinceFilter(e.target.value as Province | "all")
                  }
                  aria-label="Filter by province"
                  className={[
                    ui.select,
                    "w-full py-1.5 pl-7 pr-7 text-xs",
                    provinceFilter !== "all" ? ui.selectActive : ui.selectIdle,
                  ].join(" ")}
                >
                  <option value="all">All provinces</option>
                  {PROVINCES.map((province) => (
                    <option key={province} value={province}>
                      {province}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="relative w-full">
                <HiFunnel
                  className={`pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 ${ui.accentText}`}
                  aria-hidden
                />
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  aria-label="Filter by project type"
                  className={[
                    ui.select,
                    "w-full py-1.5 pl-7 pr-7 text-xs",
                    typeFilter !== "all" ? ui.selectActive : ui.selectIdle,
                  ].join(" ")}
                >
                  <option value="all">All types</option>
                  {typeOptions.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <svg
                  className="pointer-events-none absolute right-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-400"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  aria-hidden
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 11.17l3.71-3.94a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>

              <div className="grid grid-cols-4 gap-1">
                <button
                  type="button"
                  title="Search"
                  onClick={() =>
                    setSearchOpen((v) => {
                      if (!v) setSearchDraft(search);
                      return !v;
                    })
                  }
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-lg border text-sm transition",
                    ui.chromeBtn,
                    "px-0 py-0",
                    searchOpen ? ui.active : "",
                  ].join(" ")}
                  aria-label="Search"
                  aria-pressed={searchOpen}
                >
                  <HiMagnifyingGlass className="h-4 w-4" aria-hidden />
                </button>
                <ThemeToggle
                  compact
                  className="h-9 min-h-0 w-full px-0 py-0"
                />
                <button
                  type="button"
                  title={viewMode === "3d" ? "3D on" : "3D"}
                  onClick={() => {
                    setViewMode((mode) => (mode === "2d" ? "3d" : "2d"));
                  }}
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-lg border text-sm transition",
                    ui.chromeBtn,
                    "px-0 py-0",
                    viewMode === "3d" ? ui.active : "",
                  ].join(" ")}
                  aria-label={viewMode === "3d" ? "3D on" : "Switch to 3D"}
                  aria-pressed={viewMode === "3d"}
                >
                  <HiCube className="h-4 w-4" aria-hidden />
                </button>
                <button
                  type="button"
                  title={locateLoading ? "Locating…" : "My location"}
                  onClick={handleLocateMe}
                  disabled={locateLoading}
                  className={[
                    "inline-flex h-9 items-center justify-center rounded-lg border text-sm transition disabled:opacity-50",
                    ui.chromeBtn,
                    "px-0 py-0",
                    userLocation ? ui.active : "",
                  ].join(" ")}
                  aria-label="My location"
                >
                  <HiMapPin
                    className={`h-4 w-4 ${locateLoading ? "animate-pulse" : ""}`}
                    aria-hidden
                  />
                </button>
              </div>

              <div className="flex flex-col gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setGraphsExpanded((open) => !open);
                    if (typeof window !== "undefined" && window.innerWidth < 1024) {
                      setMobileSheet((sheet) =>
                        sheet === "graphs" ? null : "graphs",
                      );
                    }
                  }}
                  className={[
                    "inline-flex h-9 w-full items-center justify-start gap-2 px-2.5 text-xs",
                    ui.chromeBtn,
                    graphsExpanded || mobileSheet === "graphs" ? ui.active : "",
                  ].join(" ")}
                  aria-pressed={graphsExpanded || mobileSheet === "graphs"}
                >
                  <HiChartBar className="h-4 w-4 shrink-0" aria-hidden />
                  Graphs
                </button>
                <button
                  type="button"
                  onClick={() => setSnapshotOpen(true)}
                  className={[
                    "inline-flex h-9 w-full items-center justify-start gap-2 px-2.5 text-xs",
                    ui.chromeBtn,
                    snapshotOpen ? ui.active : "",
                  ].join(" ")}
                  aria-pressed={snapshotOpen}
                >
                  <HiTableCells className="h-4 w-4 shrink-0" aria-hidden />
                  Snapshot
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReportError("");
                    setReportOpen(true);
                  }}
                  className={[
                    "inline-flex h-9 w-full items-center justify-start gap-2 px-2.5 text-xs",
                    ui.chromeBtn,
                  ].join(" ")}
                >
                  <HiDocumentArrowDown className="h-4 w-4 shrink-0" aria-hidden />
                  Report
                </button>
                {programsHref ? (
                  <Link
                    href={programsHref}
                    className={[
                      "inline-flex h-9 w-full items-center justify-start gap-2 px-2.5 text-xs",
                      ui.chromeBtn,
                    ].join(" ")}
                  >
                    <HiBuildingOffice2 className="h-4 w-4 shrink-0" aria-hidden />
                    Programs
                  </Link>
                ) : null}
              </div>
            </aside>
          )}
        </div>

        {locateError ? (
          <div className={`pointer-events-auto mt-2 max-w-md rounded-xl border px-3 py-2 text-xs ${ui.alert}`}>
            {locateError}
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-start justify-center p-3 pt-24 sm:pt-28">
          <button
            type="button"
            className={`absolute inset-0 cursor-default ${theme === "light" ? "bg-[#030A17]/25" : "bg-[#030A17]/55 lg:bg-[#030A17]/40 lg:backdrop-blur-[2px]"}`}
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
          />
          <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl border ${ui.searchPanel}`}>
            <div className={`border-b p-3 ${ui.searchDivider}`}>
              <div className="relative">
                <HiMagnifyingGlass
                  className={`pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 ${ui.meta}`}
                  aria-hidden
                />
                <input
                  type="search"
                  autoFocus
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Project, program, municipality, partner…"
                  aria-label="Search projects"
                  className={`w-full rounded-lg border py-3 pl-11 pr-10 text-base outline-none transition-colors duration-150 sm:text-sm ${ui.input}`}
                />
                <button
                  type="button"
                  onClick={() => setSearchOpen(false)}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 ${ui.iconBtn}`}
                  aria-label="Close"
                >
                  <HiXMark className="h-5 w-5" aria-hidden />
                </button>
              </div>
              <p className={`mt-2 flex items-center gap-1.5 text-xs ${ui.meta}`}>
                <HiMapPin className={`h-3.5 w-3.5 ${ui.accentText}`} aria-hidden />
                Searching in{" "}
                <span className={`font-semibold ${ui.accentText}`}>
                  {provinceFilter === "all" ? "all MIMAROPA" : provinceFilter}
                </span>
                · {filteredProjects.length} result
                {filteredProjects.length === 1 ? "" : "s"}
              </p>
            </div>

            <ul className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain p-2 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
              {filteredProjects.length === 0 ? (
                <li className={`px-3 py-8 text-center text-sm ${ui.modalMuted}`}>
                  No matches. Try another keyword or clear the province filter.
                </li>
              ) : null}
              {searchResultProjects.map((project) => {
                const meta = PROGRAM_META[project.program];
                const statusLabel = projectStatusLabel(project);
                const statusClass = projectStatusClass(project, statusMode);
                return (
                  <li key={project.id} className="mb-1.5 last:mb-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleViewProject(project);
                        setSearchOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition-colors duration-150 ${ui.feedItem}`}
                    >
                      <span
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-extrabold uppercase text-white"
                        style={{ backgroundColor: meta.color }}
                        aria-hidden
                      >
                        {meta.short}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${ui.modalHeading}`}>
                          {project.name}
                        </span>
                        <span className={`block truncate text-xs ${ui.meta}`}>
                          {project.municipality}, {project.province}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredProjects.length > searchResultProjects.length ? (
                <li className={`px-2 py-2 text-center text-xs ${ui.modalMuted}`}>
                  Showing {searchResultProjects.length} of{" "}
                  {filteredProjects.length}. Refine search or open Project feed.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-25 flex snap-x justify-start gap-2 overflow-x-auto px-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center lg:hidden">
        {(["stats", "graphs", "feed"] as const).map((sheet) => (
          <button
            key={sheet}
            type="button"
            onClick={() => toggleMobileSheet(sheet)}
            className={[
              "shrink-0 rounded-full border px-3 py-2 text-xs font-bold shadow-lg capitalize transition",
              mobileSheet === sheet
                ? ui.mobileSheetBtnOn
                : ui.mobileSheetBtn,
            ].join(" ")}
          >
            {sheet === "feed"
              ? `Feed (${filteredProjects.length})`
              : sheet}
          </button>
        ))}
        {mobileSheet ? (
          <button
            type="button"
            onClick={() => setMobileSheet(null)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-bold ${ui.mobileSheetBtn}`}
          >
            Map
          </button>
        ) : null}
      </div>

      <div
        className={[
          "pointer-events-none absolute inset-x-0 z-20 flex flex-col gap-3 p-3 sm:p-5",
          "bottom-[calc(7rem+env(safe-area-inset-bottom))] lg:bottom-0 lg:flex-row lg:items-end lg:justify-between lg:gap-3",
        ].join(" ")}
      >
        <div
          className={[
            "pointer-events-auto flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border transition-all duration-300",
            ui.panel,
            mobileSheet === "stats"
              ? "max-h-[min(55vh,420px)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              : "hidden",
            "lg:flex lg:max-w-[min(340px,calc(100%-2rem))]",
            statsExpanded
              ? "lg:max-h-[min(520px,62vh)] lg:overflow-y-auto"
              : "lg:max-h-14",
          ].join(" ")}
        >
          <div
            className={[
              "flex items-center justify-between gap-2",
              statsExpanded || mobileSheet === "stats" ? "px-3 pt-3 sm:px-3" : "px-3 py-3",
            ].join(" ")}
          >
            <button
              type="button"
              onClick={() => setStatsExpanded((v) => !v)}
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
            >
              <p className={`text-xs font-bold uppercase tracking-[0.14em] ${ui.panelLabel}`}>
                Regional overview
              </p>
            </button>
            <button
              type="button"
              onClick={() => setStatsExpanded((v) => !v)}
              className={`hidden rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-150 lg:inline-flex ${ui.mutedBtn}`}
              aria-expanded={statsExpanded}
            >
              {statsExpanded ? "Collapse" : "Expand"}
            </button>
          </div>

          {statsExpanded || mobileSheet === "stats" ? (
            <div className="p-3 pt-0">
          <div className="grid w-full grid-cols-2 gap-2">
            {STAT_CARDS.filter((c) =>
              ["total", "active", "completed", "funding"].includes(c.key),
            ).map((card) => {
              const Icon = card.icon;
              const isActive =
                card.statusFilter != null && statusFilter === card.statusFilter;
              const value = scoped[card.key];

              return (
                <button
                  key={card.key}
                  type="button"
                  onClick={() => handleStatClick(card)}
                  aria-pressed={card.statusFilter != null ? isActive : undefined}
                  className={[
                    "rounded-xl border p-3 text-left transition-colors duration-150",
                    isActive ? ui.feedItemOn : ui.statCard,
                  ].join(" ")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs font-medium ${ui.meta}`}>
                      {card.label}
                    </p>
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${ui.statIcon}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                  <p
                    className={`mt-1.5 text-lg font-bold tabular-nums sm:text-xl ${ui.statValue}`}
                  >
                    {formatStat(value, card.format)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className={`mt-3 rounded-xl border p-2.5 ${ui.cell}`}>
            <p className={`mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.1em] ${ui.meta}`}>
              <HiMapPin className="h-3.5 w-3.5" aria-hidden />
              Province
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setProvinceFilter("all")}
                aria-pressed={provinceFilter === "all"}
                className={[
                  "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-150",
                  provinceFilter === "all" ? ui.chipOnAlt : ui.chipIdle,
                ].join(" ")}
              >
                All
              </button>
              {PROVINCES.map((province) => (
                <button
                  key={province}
                  type="button"
                  onClick={() => setProvinceFilter(province)}
                  aria-pressed={provinceFilter === province}
                  className={[
                    "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-150",
                    provinceFilter === province ? ui.chipOnAlt : ui.chipIdle,
                  ].join(" ")}
                >
                  {province.replace(" Mindoro", " Min.")}
                </button>
              ))}
            </div>
          </div>

          {hasFilters ? (
            <button
              type="button"
              onClick={clearFilters}
              className={`mt-2 min-h-9 w-full rounded-lg text-xs font-semibold transition-colors duration-150 ${ui.mutedBtn}`}
            >
              Clear filters
            </button>
          ) : null}
            </div>
          ) : null}
        </div>

        <GraphsPanel
          projects={filteredProjects}
          expanded={graphsExpanded || mobileSheet === "graphs"}
          onToggleExpand={() => setGraphsExpanded((v) => !v)}
          statusFilter={statusFilter}
          provinceFilter={provinceFilter}
          programFilter={programFilter}
          onStatusFilter={setStatusFilter}
          onProvinceFilter={setProvinceFilter}
          onProgramFilter={setProgramFilter}
          className={[
            mobileSheet === "graphs" ? "max-h-[min(58vh,480px)]" : "hidden",
            "lg:flex",
            graphsExpanded || mobileSheet === "graphs"
              ? "lg:max-h-[min(520px,62vh)] lg:max-w-[min(340px,calc(100%-2rem))]"
              : "lg:max-h-14 lg:max-w-[min(240px,calc(100%-2rem))]",
          ].join(" ")}
        />

        <div
          className={[
            "pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border transition-all duration-300",
            ui.panel,
            mobileSheet === "feed" ? "max-h-[min(58vh,460px)]" : "hidden",
            "lg:flex lg:max-w-[min(420px,calc(100%-2rem))]",
            feedExpanded ? "lg:max-h-[min(520px,62vh)]" : "lg:max-h-14",
          ].join(" ")}
        >
          <div className={`border-b px-3 py-3 sm:px-4 ${ui.panelDivider}`}>
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setFeedExpanded((v) => !v)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${ui.panelLabel}`}>
                  Project feed
                </p>
                <span className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${ui.countPill}`}>
                  {filteredProjects.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFeedExpanded((v) => !v)}
                className={`hidden rounded-md px-2 py-1 text-xs font-semibold transition-colors duration-150 lg:inline-flex ${ui.mutedBtn}`}
                aria-expanded={feedExpanded}
              >
                {feedExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            {feedExpanded || mobileSheet === "feed" ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  aria-pressed={statusFilter === "all"}
                  className={[
                    "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-150",
                    statusFilter === "all" ? ui.chipOn : ui.chipIdle,
                  ].join(" ")}
                >
                  All status
                </button>
                {statusOptions.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() =>
                      setStatusFilter(statusFilter === status ? "all" : status)
                    }
                    aria-pressed={statusFilter === status}
                    className={[
                      "min-h-8 rounded-full px-3 text-xs font-semibold transition-colors duration-150",
                      statusFilter === status ? ui.chipOn : ui.chipIdle,
                    ].join(" ")}
                  >
                    {status}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {feedExpanded || mobileSheet === "feed" ? (
          <ul className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            {filteredProjects.length === 0 ? (
              <li className="flex flex-col items-center px-4 py-10 text-center">
                <HiBuildingOffice2
                  className={`h-8 w-8 ${ui.meta}`}
                  aria-hidden
                />
                <p className={`mt-3 text-sm font-semibold ${ui.modalHeading}`}>
                  No projects
                </p>
                <p className={`mt-1 text-xs ${ui.modalMuted}`}>
                  Adjust province, status, or search filters.
                </p>
              </li>
            ) : null}

            {feedProjects.map((project) => {
              const statusLabel = projectStatusLabel(project);
              const statusClass = projectStatusClass(project, statusMode);
              const program = PROGRAM_META[project.program];
              const isSelected = selectedId === project.id;

              return (
                <li key={project.id} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => handleViewProject(project)}
                    className={[
                      "flex w-full flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors duration-150",
                      isSelected ? ui.feedItemOn : ui.feedItem,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${statusClass}`}
                      >
                        {statusLabel}
                      </span>
                      <span className={`text-sm font-semibold tabular-nums ${ui.modalHeading}`}>
                        {formatCompact(project.budget)}
                      </span>
                    </div>
                    <p className={`line-clamp-1 text-sm font-semibold ${ui.modalHeading}`}>
                      {project.name}
                    </p>
                    <p className={`flex min-w-0 items-center gap-1.5 text-xs ${ui.meta}`}>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ backgroundColor: program.color }}
                        aria-hidden
                      />
                      <span className="font-semibold">{project.program}</span>
                      <span aria-hidden>·</span>
                      <span className="truncate">
                        {project.municipality}, {project.province}
                      </span>
                    </p>
                  </button>
                </li>
              );
            })}
            {feedLimit < filteredProjects.length ? (
              <li className="pt-1">
                <button
                  type="button"
                  onClick={() =>
                    setFeedLimit((n) => n + FEED_PAGE_SIZE)
                  }
                  className={`min-h-9 w-full rounded-lg text-xs font-semibold transition-colors duration-150 ${ui.showMore}`}
                >
                  Show more ({filteredProjects.length - feedLimit} left)
                </button>
              </li>
            ) : null}
          </ul>
          ) : null}
        </div>
      </div>

      {viewing ? (
        <div
          className={`pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center lg:backdrop-blur-sm ${ui.scrim}`}
          role="dialog"
          aria-modal="true"
          aria-label="Project detail"
        >
          <div className={`max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border [-webkit-overflow-scrolling:touch] ${ui.modal}`}>
            <div className="relative">
              {viewing.photo_url ? (
                <img
                  src={viewing.photo_url}
                  alt=""
                  loading="lazy"
                  className={`h-48 w-full rounded-t-2xl object-cover ${ui.avatarBox}`}
                />
              ) : (
                <div className={`flex h-24 w-full items-center justify-center rounded-t-2xl border-b text-xs ${ui.emptyPhoto}`}>
                  No project photo
                </div>
              )}
              <button
                type="button"
                onClick={handleCloseDetail}
                className={`absolute right-3 top-3 grid h-10 w-10 place-items-center ${ui.closeBtn} ${theme === "light" ? "bg-white" : "bg-[#070F1F]"}`}
                aria-label="Close project details"
              >
                <HiXMark className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className="p-4 sm:p-5">
              <p
                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em]"
                style={{ color: PROGRAM_META[viewing.program].color }}
              >
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: PROGRAM_META[viewing.program].color }}
                  aria-hidden
                />
                {viewing.program} · {viewing.province}
              </p>
              <h2 className={`mt-1.5 text-lg font-semibold leading-snug ${ui.modalHeading}`}>
                {viewing.name}
              </h2>
              <p className="mt-2">
                <span
                  className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${projectStatusClass(viewing, statusMode)}`}
                >
                  {projectStatusLabel(viewing)}
                </span>
              </p>

              {describeProject(viewing).trim() ? (
                <p className={`mt-3 text-sm leading-relaxed ${ui.modalBody}`}>
                  {describeProject(viewing)}
                </p>
              ) : null}

              <dl className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4 text-sm ${ui.cell}`}>
                {(
                  [
                    ["Type", viewing.program, false],
                    ["Year", projectYear(viewing), false],
                    ["Beneficiary", viewing.beneficiary, true],
                    ["Sector", viewing.sector, true],
                    ["Municipality", viewing.municipality, false],
                    ["Project cost", formatPeso(viewing.budget), false],
                  ] as const
                ).map(([label, value, wide]) => (
                  <div key={label} className={wide ? "col-span-2" : ""}>
                    <dt className={`text-xs ${ui.modalMuted}`}>{label}</dt>
                    <dd className={`mt-0.5 font-semibold ${ui.modalHeading}`}>{value}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => openGoogleDirections(viewing, userLocation)}
                  className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 ${ui.primaryBtn}`}
                >
                  <HiPaperAirplane className="h-4 w-4" aria-hidden />
                  Get directions
                  <HiArrowTopRightOnSquare className="h-4 w-4 opacity-80" aria-hidden />
                </button>
                {!userLocation ? (
                  <button
                    type="button"
                    onClick={handleLocateMe}
                    disabled={locateLoading}
                    className={`inline-flex min-h-11 items-center justify-center gap-2 ${ui.chromeBtn}`}
                  >
                    <HiMapPin className="h-4 w-4" aria-hidden />
                    {locateLoading ? "Locating…" : "Use my location"}
                  </button>
                ) : null}
              </div>
              <p className={`mt-2 text-xs ${ui.modalMuted}`}>
                {userLocation
                  ? "Route starts from your current location."
                  : "Opens Google Maps. Share your location first for a full driving route."}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <QuickSnapshotModal
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        projects={projects}
        provinceFilter={provinceFilter}
        statusFilter={statusFilter}
        onProvinceFilter={setProvinceFilter}
        onStatusFilter={setStatusFilter}
      />

      {reportOpen ? (
        <div
          className={`pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center lg:backdrop-blur-sm ${ui.scrim}`}
          role="dialog"
          aria-modal="true"
          aria-label="Generate report"
        >
          <div className={`w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border p-4 [-webkit-overflow-scrolling:touch] sm:p-5 ${ui.modal}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-bold uppercase tracking-[0.14em] ${ui.accentText}`}>
                  Generate report
                </p>
                <h2 className={`mt-1 text-lg font-semibold ${ui.modalHeading}`}>
                  {filteredProjects.length} project
                  {filteredProjects.length === 1 ? "" : "s"} in scope
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setReportOpen(false)}
                className={ui.closeBtn}
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <div className={`mt-3 flex items-start gap-2 rounded-xl border p-3 ${ui.cell}`}>
              <HiFunnel className={`mt-0.5 h-4 w-4 shrink-0 ${ui.accentText}`} aria-hidden />
              <div className={`min-w-0 text-sm ${ui.modalBody}`}>
                <p className={`font-semibold ${ui.modalHeading}`}>Current scope</p>
                <p className={`mt-0.5 break-words ${ui.meta}`}>
                  {describeFilters(reportFilters)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              {(
                [
                  ["Funding", `₱${formatCompact(filteredProjects.reduce((s, p) => s + p.budget, 0))}`],
                  ["Beneficiaries", formatCompact(filteredProjects.reduce((s, p) => s + p.beneficiaries, 0))],
                  ["Provinces", String(new Set(filteredProjects.map((p) => p.province)).size)],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className={`rounded-xl border p-3 ${ui.cell}`}>
                  <p className={`text-xs font-medium ${ui.modalMuted}`}>{label}</p>
                  <p className={`mt-1 text-base font-bold tabular-nums ${ui.modalHeading}`}>
                    {value}
                  </p>
                </div>
              ))}
            </div>

            {reportError ? (
              <p className={`mt-3 rounded-xl border px-3 py-2 text-xs ${
                theme === "light"
                  ? "border-red-300 bg-red-50 text-red-800"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}>
                {reportError}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col gap-2">
              <button
                type="button"
                onClick={handlePrintReport}
                disabled={filteredProjects.length === 0}
                className={`inline-flex min-h-11 items-center justify-center gap-2 ${ui.primaryBtn}`}
              >
                <HiDocumentArrowDown className="h-4 w-4" aria-hidden />
                Download PDF report
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={filteredProjects.length === 0}
                className={`inline-flex min-h-11 items-center justify-center gap-2 ${ui.chromeBtn}`}
              >
                <HiTableCells className="h-4 w-4" aria-hidden />
                Export spreadsheet (CSV)
              </button>
            </div>

            <p className={`mt-3 flex items-center gap-1.5 text-xs ${ui.modalMuted}`}>
              <HiDocumentText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Report reflects active filters. Clear filters for a region-wide
              report.
            </p>
          </div>
        </div>
      ) : null}

    </section>
    </>
  );
};

export default CommandMapWorkspace;
