import { Head, Link, usePage } from '@inertiajs/react';
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
    HiLightBulb,
    HiMagnifyingGlass,
    HiMap,
    HiMapPin,
    HiCube,
    HiPaperAirplane,
    HiPauseCircle,
    HiPrinter,
    HiSignal,
    HiSparkles,
    HiSquares2X2,
    HiTableCells,
    HiUserGroup,
    HiXMark,
} from 'react-icons/hi2';
import AnalyticsChatBot from '@/components/region/dashboard/AnalyticsChatBot';
import GraphsPanel from '@/components/region/dashboard/GraphsPanel';
import Maps, {
    type MapBaseLayer,
    type MapViewMode,
    type UserLocation,
} from '@/components/maps/Maps';
import ThemeToggle from '@/theme/ThemeToggle';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import {
    PROGRAM_META,
    PROVINCES,
    STATUS_META,
    buildLiveInsights,
    describeProject,
    formatCompact,
    formatPeso,
    projectYear,
    statusBadgeClass,
    summarizeProjects,
    type ProjectStatus,
    type Province,
    type TaraProgram,
    type TaraProject,
} from '@/constants/taraProjects';
import { programs } from '@/routes/region';

type PageProps = {
  projects?: TaraProject[];
};

const BASE_LAYER_OPTIONS: { id: MapBaseLayer; label: string }[] = [
  { id: "street", label: "Street" },
  { id: "satellite", label: "Satellite" },
  { id: "terrain", label: "Terrain" },
  { id: "hybrid", label: "Hybrid" },
];

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
  accent: string;
  accentLight: string;
  valueClass: string;
  valueClassLight: string;
  format: "number" | "peso" | "compact";
  statusFilter?: ProjectStatus | "all";
}[] = [
  {
    key: "total",
    label: "Total projects",
    icon: HiSquares2X2,
    accent:
      "border-cyan-400/35 bg-gradient-to-br from-cyan-500/20 to-cyan-600/5 text-cyan-100",
    accentLight:
      "border-cyan-300 bg-gradient-to-br from-cyan-50 to-sky-50 text-cyan-900",
    valueClass: "text-cyan-200",
    valueClassLight: "text-cyan-800",
    format: "number",
    statusFilter: "all",
  },
  {
    key: "active",
    label: "Active",
    icon: HiSignal,
    accent:
      "border-blue-400/35 bg-gradient-to-br from-blue-500/20 to-blue-600/5 text-blue-100",
    accentLight:
      "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-900",
    valueClass: "text-blue-300",
    valueClassLight: "text-blue-800",
    format: "number",
    statusFilter: "ongoing",
  },
  {
    key: "completed",
    label: "Completed",
    icon: HiAcademicCap,
    accent:
      "border-emerald-400/35 bg-gradient-to-br from-emerald-500/20 to-emerald-600/5 text-emerald-100",
    accentLight:
      "border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 text-emerald-900",
    valueClass: "text-emerald-300",
    valueClassLight: "text-emerald-800",
    format: "number",
    statusFilter: "completed",
  },
  {
    key: "delayed",
    label: "Delayed",
    icon: HiExclamationTriangle,
    accent:
      "border-red-400/35 bg-gradient-to-br from-red-500/20 to-red-600/5 text-red-100",
    accentLight:
      "border-red-300 bg-gradient-to-br from-red-50 to-rose-50 text-red-900",
    valueClass: "text-red-300",
    valueClassLight: "text-red-800",
    format: "number",
    statusFilter: "delayed",
  },
  {
    key: "onHold",
    label: "On hold",
    icon: HiPauseCircle,
    accent:
      "border-amber-400/35 bg-gradient-to-br from-amber-500/20 to-amber-600/5 text-amber-100",
    accentLight:
      "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50 text-amber-900",
    valueClass: "text-amber-300",
    valueClassLight: "text-amber-800",
    format: "number",
    statusFilter: "on_hold",
  },
  {
    key: "beneficiaries",
    label: "Beneficiaries",
    icon: HiUserGroup,
    accent:
      "border-violet-400/35 bg-gradient-to-br from-violet-500/20 to-violet-600/5 text-violet-100",
    accentLight:
      "border-violet-300 bg-gradient-to-br from-violet-50 to-purple-50 text-violet-900",
    valueClass: "text-violet-300",
    valueClassLight: "text-violet-800",
    format: "compact",
  },
  {
    key: "funding",
    label: "Funding released",
    icon: HiBanknotes,
    accent:
      "border-yellow-400/35 bg-gradient-to-br from-yellow-500/20 to-yellow-600/5 text-yellow-100",
    accentLight:
      "border-amber-300 bg-gradient-to-br from-amber-50 to-yellow-50 text-amber-950",
    valueClass: "text-yellow-200",
    valueClassLight: "text-amber-800",
    format: "peso",
  },
  {
    key: "utilized",
    label: "Funding utilized",
    icon: HiChartBar,
    accent:
      "border-teal-400/35 bg-gradient-to-br from-teal-500/20 to-teal-600/5 text-teal-100",
    accentLight:
      "border-teal-300 bg-gradient-to-br from-teal-50 to-cyan-50 text-teal-900",
    valueClass: "text-teal-300",
    valueClassLight: "text-teal-800",
    format: "peso",
  },
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
  status: ProjectStatus | "all";
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
  if (filters.status !== "all")
    parts.push(`Status: ${STATUS_META[filters.status].label}`);
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
    REPORT_COLUMNS.map((c) => escapeCsv(p[c.key] as string | number)).join(","),
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
  const stamp = new Date();
  const s = summarizeProjects(projects);
  const esc = (v: string | number) =>
    String(v ?? "").replace(
      /[&<>]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] as string,
    );

  const byStatus = countBy(projects, (p) => STATUS_META[p.status].label);
  const byProgram = countBy(projects, (p) => p.program);
  const byProvince = countBy(projects, (p) => p.province);

  const chip = (rows: { key: string; count: number }[]) =>
    rows
      .map(
        (r) =>
          `<span class="chip"><b>${esc(r.key)}</b> ${r.count}</span>`,
      )
      .join("");

  const tableRows = projects
    .map(
      (p) => `<tr>
        <td>${esc(p.name)}</td>
        <td>${esc(p.program)}</td>
        <td>${esc(p.province)}<br><span class="muted">${esc(p.municipality)}, ${esc(p.barangay)}</span></td>
        <td>${esc(STATUS_META[p.status].label)}</td>
        <td class="num">${p.progress}%</td>
        <td class="num">${esc(formatPeso(p.budget))}</td>
        <td class="num">${esc(formatCompact(p.beneficiaries))}</td>
        <td>${esc(p.end_date)}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html><head><meta charset="utf-8" />
    <title>TARA PAMIMAROPA Report</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: "Segoe UI", Arial, sans-serif; color: #0f172a; margin: 32px; }
      h1 { margin: 0 0 2px; font-size: 22px; }
      .sub { color: #475569; font-size: 12px; margin-bottom: 2px; }
      .scope { color: #0369a1; font-size: 12px; font-weight: 600; margin: 6px 0 18px; }
      .cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
      .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
      .card .label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #64748b; }
      .card .value { font-size: 18px; font-weight: 700; margin-top: 2px; }
      .section-title { font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: #334155; margin: 16px 0 6px; }
      .chip { display: inline-block; border: 1px solid #e2e8f0; border-radius: 999px; padding: 3px 10px; margin: 0 6px 6px 0; font-size: 11px; }
      table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
      th, td { border-bottom: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
      th { background: #f1f5f9; text-transform: uppercase; font-size: 10px; letter-spacing: .05em; color: #475569; }
      td.num { text-align: right; white-space: nowrap; }
      .muted { color: #94a3b8; font-size: 10px; }
      .foot { margin-top: 20px; font-size: 10px; color: #94a3b8; }
      @media print { body { margin: 12mm; } .cards { grid-template-columns: repeat(4, 1fr); } }
    </style></head><body>
    <h1>TARA PAMIMAROPA — Project Report</h1>
    <div class="sub">Tracking of Accomplishments and Results of Activities and Programs · MIMAROPA</div>
    <div class="sub">Generated ${esc(stamp.toLocaleString("en-PH"))}</div>
    <div class="scope">Scope: ${esc(describeFilters(filters))}</div>

    <div class="cards">
      <div class="card"><div class="label">Total projects</div><div class="value">${s.total}</div></div>
      <div class="card"><div class="label">Active</div><div class="value">${s.active}</div></div>
      <div class="card"><div class="label">Completed</div><div class="value">${s.completed}</div></div>
      <div class="card"><div class="label">Delayed / On hold</div><div class="value">${s.delayed} / ${s.onHold}</div></div>
      <div class="card"><div class="label">Beneficiaries</div><div class="value">${esc(formatCompact(s.beneficiaries))}</div></div>
      <div class="card"><div class="label">Funding released</div><div class="value">${esc(formatPeso(s.funding))}</div></div>
      <div class="card"><div class="label">Funding utilized</div><div class="value">${esc(formatPeso(s.utilized))}</div></div>
      <div class="card"><div class="label">Municipalities</div><div class="value">${s.municipalities}</div></div>
    </div>

    <div class="section-title">By status</div><div>${chip(byStatus)}</div>
    <div class="section-title">By program</div><div>${chip(byProgram)}</div>
    <div class="section-title">By province</div><div>${chip(byProvince)}</div>

    <div class="section-title">Project detail (${projects.length})</div>
    <table>
      <thead><tr>
        <th>Project</th><th>Program</th><th>Location</th><th>Status</th>
        <th>Progress</th><th>Budget</th><th>Beneficiaries</th><th>End</th>
      </tr></thead>
      <tbody>${tableRows || `<tr><td colspan="8" class="muted">No projects match the current filters.</td></tr>`}</tbody>
    </table>

    <div class="foot">DOST-MIMAROPA · TARA PAMIMAROPA command map export.</div>
  </body></html>`;

  const win = window.open("", "_blank", "noopener,noreferrer,width=1024,height=768");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
  return true;
};

const PERF_LITE_MQ = "(max-width: 1023px), (pointer: coarse)";
/** Auto light-mode overlays when portfolio is this big. */
const HEAVY_DATASET = 120;
const FEED_PAGE_SIZE = 40;

const readPerfLite = () =>
  typeof window !== "undefined"
    ? window.matchMedia(PERF_LITE_MQ).matches
    : true;

const UI = {
  light: {
    page: "bg-slate-100 text-slate-900",
    panel:
      "border-slate-200 bg-white shadow-sm lg:border-cyan-500/25 lg:bg-white/95 lg:backdrop-blur-xl lg:shadow-[0_8px_40px_rgba(15,23,42,0.08)]",
    chromeBtn:
      "rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-cyan-500/50 hover:text-slate-900",
    badge:
      "border-cyan-600/35 bg-white text-cyan-800 shadow-sm lg:bg-white/95",
    title:
      "bg-gradient-to-r from-slate-900 via-cyan-800 to-blue-700 bg-clip-text text-transparent",
    subtitle: "text-cyan-800/80",
    meta: "text-slate-500",
    select:
      "cursor-pointer appearance-none rounded-xl border bg-white py-2 pl-8 pr-8 text-sm font-semibold text-slate-900 outline-none transition shadow-sm",
    selectIdle: "border-slate-300 hover:border-cyan-500/50",
    selectActive: "border-cyan-500/70 shadow-[0_0_18px_rgba(34,211,238,0.18)]",
    layerBar: "border-slate-300 bg-white shadow-sm",
    layerIdle: "text-slate-500 hover:text-slate-900",
    overlayDarkish:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(14,116,144,0.08),transparent_45%),linear-gradient(to_bottom,rgba(248,250,252,0.15),rgba(241,245,249,0.55))]",
    overlay3d:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(14,116,144,0.06),transparent_42%),linear-gradient(to_bottom,rgba(248,250,252,0.05),rgba(241,245,249,0.35))]",
    grid: "bg-[linear-gradient(rgba(14,116,144,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,0.05)_1px,transparent_1px)] bg-[size:40px_40px]",
    fadeTop: "from-slate-100/95 via-slate-100/40",
    fadeBottom: "from-slate-100/95 via-slate-100/40",
    mobileSheetBtn: "border-slate-300 bg-white text-slate-700 shadow-sm",
    mobileSheetBtnOn: "border-cyan-500/60 bg-cyan-50 text-cyan-800",
    scrim: "bg-slate-900/45",
    modal: "border-slate-200 bg-white shadow-xl",
    modalMuted: "text-slate-500",
    modalBody: "text-slate-700",
    modalHeading: "text-slate-900",
    feedItem:
      "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white",
    feedItemOn:
      "border-cyan-500/50 bg-cyan-50 shadow-[0_0_24px_rgba(34,211,238,0.12)]",
    input:
      "border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30",
    insight:
      "border-violet-300/50 bg-white/95 text-slate-800 shadow-sm",

    chipIdle: "border border-slate-300 text-slate-600",
    chipOn: "bg-cyan-500 text-white",
    chipOnAlt: "bg-cyan-400 text-slate-950",
    panelDivider: "border-cyan-200/80",
    panelLabel: "text-cyan-800/90",
    cell: "border-slate-200 bg-slate-50",
    closeBtn: "rounded-lg border border-slate-300 p-2 text-slate-500 hover:text-slate-900",
    iconBtn: "text-slate-400 hover:text-slate-800",
    searchPanel:
      "border-cyan-500/30 bg-white shadow-xl lg:shadow-[0_16px_60px_rgba(15,23,42,0.12),0_0_30px_rgba(34,211,238,0.08)]",
    searchDivider: "border-slate-200",
    avatarBox: "bg-slate-100 ring-slate-200",
    emptyPhoto: "border-dashed border-slate-300 bg-slate-50 text-slate-500",
    mutedBtn: "border border-slate-300 text-slate-600 hover:text-slate-900",
    showMore: "border border-slate-300 text-cyan-800 hover:border-cyan-500/40 hover:bg-cyan-50",
    ringOffset: "ring-offset-white",
    alert: "border-red-400/50 bg-white text-red-700",
    insightLabel: "text-violet-700/80",
  },
  dark: {
    page: "bg-slate-950 text-slate-100",
    panel:
      "border-slate-700/80 bg-slate-900 lg:border-cyan-400/25 lg:bg-slate-900/92 lg:backdrop-blur-xl lg:shadow-[0_8px_40px_rgba(0,0,0,0.45),0_0_30px_rgba(34,211,238,0.08)]",
    chromeBtn:
      "rounded-xl border border-slate-700/80 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 lg:border-slate-600/60 lg:bg-slate-900/90 lg:backdrop-blur-md",
    badge:
      "border-cyan-400/30 bg-slate-900 text-cyan-200 lg:bg-slate-900/90 lg:shadow-[0_0_20px_rgba(34,211,238,0.15)] lg:backdrop-blur-md",
    title:
      "bg-gradient-to-r from-white via-cyan-100 to-blue-300/90 bg-clip-text text-transparent",
    subtitle: "text-cyan-200/75",
    meta: "text-slate-400",
    select:
      "cursor-pointer appearance-none rounded-xl border bg-slate-900 py-2 pl-8 pr-8 text-sm font-semibold text-white outline-none transition lg:bg-slate-900/90 lg:backdrop-blur-md",
    selectIdle: "border-slate-600/60 hover:border-cyan-500/40",
    selectActive: "border-cyan-400/60 lg:shadow-[0_0_18px_rgba(34,211,238,0.25)]",
    layerBar: "border-slate-700/80 bg-slate-900 lg:bg-slate-900/90 lg:backdrop-blur-md",
    layerIdle: "text-slate-400 hover:text-white",
    overlayDarkish:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.12),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(37,99,235,0.12),transparent_42%),linear-gradient(to_bottom,rgba(2,6,23,0.08),rgba(2,6,23,0.55))]",
    overlay3d:
      "bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.06),transparent_42%),linear-gradient(to_bottom,rgba(2,6,23,0.02),rgba(2,6,23,0.28))]",
    grid: "bg-[linear-gradient(rgba(34,211,238,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.03)_1px,transparent_1px)] bg-[size:40px_40px]",
    fadeTop: "from-slate-950/95 via-slate-950/45",
    fadeBottom: "from-slate-950/95 via-slate-950/45",
    mobileSheetBtn: "border-slate-700/80 bg-slate-900 text-slate-300",
    mobileSheetBtnOn: "border-cyan-400/60 bg-cyan-500/25 text-cyan-100",
    scrim: "bg-slate-950/75 lg:bg-slate-950/70",
    modal: "border-slate-700 bg-slate-900",
    modalMuted: "text-slate-500",
    modalBody: "text-slate-300",
    modalHeading: "text-white",
    feedItem:
      "border-slate-800/80 bg-slate-800/40 hover:border-slate-600/80 hover:bg-slate-800/70",
    feedItemOn:
      "border-cyan-400/60 bg-cyan-400/15 shadow-[0_0_24px_rgba(34,211,238,0.2)]",
    input:
      "border-slate-700/80 bg-slate-950 text-white placeholder:text-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 lg:bg-slate-950/80",
    insight:
      "border-violet-500/25 bg-slate-900/85 text-slate-200 backdrop-blur-md",

    chipIdle: "border border-slate-700/80 text-slate-400",
    chipOn: "bg-cyan-500 text-white",
    chipOnAlt: "bg-cyan-400 text-slate-950",
    panelDivider: "border-cyan-900/50",
    panelLabel: "text-cyan-200/90",
    cell: "border-slate-700/70 bg-slate-950/50",
    closeBtn: "rounded-lg border border-slate-700 p-2 text-slate-400 hover:text-white",
    iconBtn: "text-slate-400 hover:text-white",
    searchPanel:
      "border-cyan-400/30 bg-slate-900 shadow-[0_16px_60px_rgba(0,0,0,0.6)] lg:bg-slate-900/95 lg:shadow-[0_16px_60px_rgba(0,0,0,0.6),0_0_30px_rgba(34,211,238,0.12)] lg:backdrop-blur-xl",
    searchDivider: "border-cyan-900/50",
    avatarBox: "bg-slate-950/70 ring-slate-700/60",
    emptyPhoto: "border-dashed border-slate-700/80 bg-slate-950/60 text-slate-500",
    mutedBtn: "border border-slate-700/80 text-slate-400 hover:text-white",
    showMore: "border border-slate-700/80 text-cyan-200 hover:border-cyan-500/40 hover:bg-cyan-500/10",
    ringOffset: "ring-offset-slate-900",
    alert: "border-red-500/40 bg-slate-900 text-red-300 lg:bg-slate-900/95 lg:backdrop-blur",
    insightLabel: "text-violet-200/80",
  },
} as const satisfies Record<ThemeMode, Record<string, string>>;

const RegionDashboard = () => {
  const { theme } = useTheme();
  const ui = UI[theme];
  const { projects: serverProjects = [] } = usePage<PageProps>().props;
  const projects = serverProjects;
  const [devicePerfLite, setDevicePerfLite] = useState(readPerfLite);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewing, setViewing] = useState<TaraProject | null>(null);
  const [provinceFilter, setProvinceFilter] = useState<Province | "all">("all");
  const [programFilter, setProgramFilter] = useState<TaraProgram | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [mobileSheet, setMobileSheet] = useState<
    "stats" | "feed" | "ai" | "graphs" | null
  >(null);
  const [baseLayer, setBaseLayer] = useState<MapBaseLayer>("satellite");
  const [viewMode, setViewMode] = useState<MapViewMode>("2d");
  const [graphsExpanded, setGraphsExpanded] = useState(false);
  const [feedExpanded, setFeedExpanded] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportError, setReportError] = useState("");
  const [insightIndex, setInsightIndex] = useState(0);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locateLoading, setLocateLoading] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [flyToUserToken, setFlyToUserToken] = useState(0);
  const [feedLimit, setFeedLimit] = useState(FEED_PAGE_SIZE);

  const insights = useMemo(() => buildLiveInsights(projects), [projects]);

  const heavyDataset = projects.length >= HEAVY_DATASET;
  const perfLite = devicePerfLite || heavyDataset;

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
  }, [provinceFilter, programFilter, statusFilter, search]);

  const stats = useMemo(() => summarizeProjects(projects), [projects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (provinceFilter !== "all" && p.province !== provinceFilter) return false;
      if (programFilter !== "all" && p.program !== programFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.program.toLowerCase().includes(q) ||
        p.province.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        p.barangay.toLowerCase().includes(q) ||
        p.partner_agency.toLowerCase().includes(q) ||
        p.funding_source.toLowerCase().includes(q)
      );
    });
  }, [projects, provinceFilter, programFilter, statusFilter, search]);

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
    setStatusFilter("all");
    setSearch("");
    setSearchDraft("");
  };

  const reportFilters: ReportFilters = {
    province: provinceFilter,
    program: programFilter,
    status: statusFilter,
    search,
  };

  const handleDownloadCsv = () => {
    setReportError("");
    downloadCsvReport(filteredProjects, reportFilters);
  };

  const handlePrintReport = () => {
    const ok = printReport(filteredProjects, reportFilters);
    if (!ok) {
      setReportError(
        "Popup blocked. Allow popups for this site to open the printable report.",
      );
      return;
    }
    setReportError("");
  };

  const hasFilters =
    provinceFilter !== "all" ||
    programFilter !== "all" ||
    statusFilter !== "all" ||
    search.trim().length > 0;

  const toggleMobileSheet = (sheet: "stats" | "feed" | "ai" | "graphs") => {
    setMobileSheet((current) => {
      const next = current === sheet ? null : sheet;
      if (sheet === "ai") {
        setChatOpen(next === "ai");
      } else if (next !== null) {
        setChatOpen(false);
      }
      return next;
    });
  };

  const toggleChat = () => {
    setChatOpen((open) => {
      const next = !open;
      if (typeof window !== "undefined" && window.innerWidth < 1024) {
        setMobileSheet(next ? "ai" : null);
      }
      return next;
    });
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
    <Head title="Region Dashboard" />
    <section className={`relative z-30 h-[calc(100svh-1rem)] min-h-[32rem] w-full overflow-hidden rounded-[inherit] pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0 ${ui.page}`}>
      <div className="pointer-events-auto absolute inset-0 z-[5]">
        <Maps
          projects={deferredMapProjects}
          selectedId={selectedId}
          baseLayer={baseLayer}
          viewMode={viewMode}
          userLocation={userLocation}
          flyToUserToken={flyToUserToken}
          perfLite={perfLite && viewMode !== "3d"}
          onViewProject={handleViewProject}
        />
      </div>

      {/* Decorative overlays desktop-only — full-bleed paint over map kills phone GPU */}
      {!perfLite ? (
        <>
          <div
            className={[
              "pointer-events-none absolute inset-0 z-10",
              viewMode === "3d" ? ui.overlay3d : ui.overlayDarkish,
            ].join(" ")}
          />
          {viewMode !== "3d" ? (
            <div className={`pointer-events-none absolute inset-0 z-10 ${ui.grid}`} />
          ) : null}
        </>
      ) : (
        <div className={`pointer-events-none absolute inset-0 z-10 bg-gradient-to-b via-transparent ${theme === "light" ? "from-slate-100/60 to-slate-100/70" : "from-slate-950/50 to-slate-950/70"}`} />
      )}
      <div className={`pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b to-transparent lg:h-32 ${ui.fadeTop}`} />
      <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 bg-gradient-to-t to-transparent lg:h-44 ${ui.fadeBottom}`} />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3 sm:p-5">
        <div className="pointer-events-auto flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
          <div className="min-w-0 max-w-2xl">
            <div className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] sm:px-3 sm:py-1.5 sm:text-[11px] ${ui.badge}`}>
              <HiMap className="h-3.5 w-3.5" aria-hidden />
              {!perfLite ? (
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-cyan-400" />
                </span>
              ) : (
                <span className="inline-flex h-2 w-2 rounded-full bg-cyan-400" />
              )}
              TARA · STI Command Map
            </div>
            <h1 className={`mt-2 text-xl font-bold tracking-tight sm:mt-3 sm:text-3xl ${ui.title}`}>
              TARA PAMIMAROPA
            </h1>
            <p className={`mt-1 max-w-xl text-xs sm:text-sm ${ui.subtitle}`}>
              Tracking of Accomplishments and Results of Activities and Programs
              across MIMAROPA
            </p>
            <p className={`mt-1 hidden text-xs sm:block ${ui.meta}`}>
              {stats.municipalities} municipalities · {stats.barangays} barangays
              · {stats.partners} partners · {filteredProjects.length} on map
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            <div className="relative shrink-0">
              <HiMapPin
                className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-300"
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
            <button
              type="button"
              onClick={() =>
                setSearchOpen((v) => {
                  if (!v) setSearchDraft(search);
                  return !v;
                })
              }
              className={[
                "inline-flex shrink-0 items-center justify-center gap-2",
                ui.chromeBtn,
                searchOpen
                  ? theme === "light"
                    ? "border-cyan-500/60 bg-cyan-50 text-cyan-800"
                    : "border-cyan-400/60 bg-cyan-500/20 text-cyan-100"
                  : "",
              ].join(" ")}
              aria-pressed={searchOpen}
            >
              <HiMagnifyingGlass className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Search</span>
            </button>
            <ThemeToggle compact />
            <div className={`flex shrink-0 rounded-xl border p-1 ${ui.layerBar}`}>
              {BASE_LAYER_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setBaseLayer(opt.id)}
                  className={[
                    "rounded-lg px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition sm:px-2.5",
                    baseLayer === opt.id
                      ? "bg-cyan-500/25 text-cyan-800 dark:text-cyan-100"
                      : ui.layerIdle,
                  ].join(" ")}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode((mode) => {
                  const next = mode === "2d" ? "3d" : "2d";
                  if (
                    next === "3d" &&
                    (baseLayer === "street" || baseLayer === "terrain")
                  ) {
                    setBaseLayer("satellite");
                  }
                  return next;
                });
              }}
              className={[
                "inline-flex shrink-0 items-center justify-center gap-2",
                ui.chromeBtn,
                viewMode === "3d"
                  ? theme === "light"
                    ? "border-fuchsia-400/50 bg-fuchsia-50 text-fuchsia-800"
                    : "border-fuchsia-400/50 bg-fuchsia-500/20 text-fuchsia-100 lg:shadow-[0_0_18px_rgba(217,70,239,0.25)]"
                  : "",
              ].join(" ")}
              aria-pressed={viewMode === "3d"}
            >
              <HiCube className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">
                {viewMode === "3d" ? "3D on" : "3D"}
              </span>
            </button>
            <button
              type="button"
              onClick={handleLocateMe}
              disabled={locateLoading}
              className={[
                "inline-flex shrink-0 items-center justify-center gap-2",
                ui.chromeBtn,
                theme === "light" ? "text-emerald-800 disabled:opacity-50" : "text-emerald-100 disabled:opacity-50",
              ].join(" ")}
            >
              <HiMapPin
                className={`h-4 w-4 ${locateLoading ? "animate-pulse" : ""}`}
                aria-hidden
              />
              <span className="hidden sm:inline">
                {locateLoading ? "Locating…" : "My location"}
              </span>
            </button>
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
                graphsExpanded || mobileSheet === "graphs"
                  ? theme === "light"
                    ? "border-teal-500/50 bg-teal-50 text-teal-800"
                    : "border-teal-400/50 bg-teal-500/20 text-teal-100"
                  : "",
              ].join(" ")}
              aria-pressed={graphsExpanded || mobileSheet === "graphs"}
            >
              <HiChartBar className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Graphs</span>
            </button>
            <button
              type="button"
              onClick={toggleChat}
              className={[
                "inline-flex shrink-0 items-center justify-center gap-2",
                ui.chromeBtn,
                chatOpen || mobileSheet === "ai"
                  ? theme === "light"
                    ? "border-violet-500/50 bg-violet-50 text-violet-800"
                    : "border-violet-400/60 bg-violet-500/25 text-violet-100"
                  : theme === "light"
                    ? "text-violet-800"
                    : "text-violet-100",
              ].join(" ")}
              aria-pressed={chatOpen || mobileSheet === "ai"}
            >
              <HiSparkles className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">AI chat</span>
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
                theme === "light"
                  ? "border-amber-500/40 bg-amber-50 text-amber-800"
                  : "border-amber-500/40 bg-amber-500/15 text-amber-100",
              ].join(" ")}
            >
              <HiDocumentArrowDown className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Report</span>
            </button>
            <Link
              href={programs()}
              className={[
                "inline-flex shrink-0 items-center justify-center gap-2",
                ui.chromeBtn,
                "border-blue-500/30 bg-blue-950 text-blue-100 sm:px-4 lg:bg-blue-950/80",
              ].join(" ")}
            >
              <HiBuildingOffice2 className="h-4 w-4 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">Programs</span>
            </Link>
          </div>
        </div>

        {locateError ? (
          <div className={`pointer-events-auto mt-2 max-w-md rounded-xl border px-3 py-2 text-xs ${ui.alert}`}>
            {locateError}
          </div>
        ) : null}

        {!perfLite ? (
          <div className={`pointer-events-auto mt-3 hidden max-w-3xl items-start gap-2 rounded-xl border p-3 lg:flex ${ui.insight}`}>
            <HiLightBulb className="mt-0.5 h-5 w-5 shrink-0 text-violet-500 dark:text-violet-300" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-bold uppercase tracking-[0.16em] ${ui.insightLabel}`}>
                AI insight
              </p>
              <p className={`mt-1 text-sm ${ui.modalHeading}`}>
                {insights[insightIndex % insights.length]}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setInsightIndex((i) => (i + 1) % insights.length)}
              className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                theme === "light"
                  ? "border-violet-300 text-violet-700"
                  : "border-violet-700/50 text-violet-200"
              }`}
            >
              Next
            </button>
            <button
              type="button"
              onClick={toggleChat}
              className={`shrink-0 rounded-lg border px-2 py-1 text-[10px] font-semibold ${
                theme === "light"
                  ? "border-violet-400/50 bg-violet-50 text-violet-800"
                  : "border-violet-400/40 bg-violet-500/20 text-violet-100"
              }`}
            >
              Open chat
            </button>
          </div>
        ) : null}
      </header>

      {searchOpen ? (
        <div className="pointer-events-auto absolute inset-0 z-40 flex items-start justify-center p-3 pt-24 sm:pt-28">
          <button
            type="button"
            className={`absolute inset-0 cursor-default ${theme === "light" ? "bg-slate-900/25" : "bg-slate-950/55 lg:bg-slate-950/40 lg:backdrop-blur-[2px]"}`}
            onClick={() => setSearchOpen(false)}
            aria-label="Close search"
          />
          <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl border ${ui.searchPanel}`}>
            <div className={`border-b p-3 ${ui.searchDivider}`}>
              <div className="relative">
                <HiMagnifyingGlass
                  className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-300"
                  aria-hidden
                />
                <input
                  type="search"
                  autoFocus
                  value={searchDraft}
                  onChange={(e) => setSearchDraft(e.target.value)}
                  placeholder="Search project, program, LGU, partner…"
                  className={`w-full rounded-xl border py-3 pl-11 pr-10 text-sm outline-none ${ui.input}`}
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
              <p className={`mt-2 flex items-center gap-1.5 text-[11px] ${ui.meta}`}>
                <HiMapPin className="h-3.5 w-3.5 text-cyan-500" aria-hidden />
                Searching in{" "}
                <span className={`font-semibold ${theme === "light" ? "text-cyan-800" : "text-cyan-200"}`}>
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
                const status = STATUS_META[project.status];
                return (
                  <li key={project.id} className="mb-1.5 last:mb-0">
                    <button
                      type="button"
                      onClick={() => {
                        handleViewProject(project);
                        setSearchOpen(false);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl border p-2.5 text-left transition hover:border-cyan-500/50 ${ui.feedItem}`}
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[9px] font-extrabold uppercase ring-1 ${ui.avatarBox} ${meta.accent}`}
                      >
                        {meta.short}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className={`block truncate text-sm font-semibold ${ui.modalHeading}`}>
                          {project.name}
                        </span>
                        <span className={`block truncate text-[11px] ${ui.meta}`}>
                          {project.municipality}, {project.province}
                        </span>
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ring-1 ${statusBadgeClass(project.status, theme)}`}
                      >
                        {status.label}
                      </span>
                    </button>
                  </li>
                );
              })}
              {filteredProjects.length > searchResultProjects.length ? (
                <li className={`px-2 py-2 text-center text-[11px] ${ui.modalMuted}`}>
                  Showing {searchResultProjects.length} of{" "}
                  {filteredProjects.length}. Refine search or open Project feed.
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-auto absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-25 flex snap-x justify-start gap-2 overflow-x-auto px-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:justify-center lg:hidden">
        {(["stats", "graphs", "feed", "ai"] as const).map((sheet) => (
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
            {sheet === "feed" ? `Feed (${filteredProjects.length})` : sheet}
          </button>
        ))}
        {mobileSheet ? (
          <button
            type="button"
            onClick={() => {
              setMobileSheet(null);
              setChatOpen(false);
            }}
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
            "pointer-events-auto flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border p-3",
            ui.panel,
            mobileSheet === "stats"
              ? "max-h-[min(55vh,420px)] overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]"
              : "hidden",
            "lg:flex lg:max-h-[min(520px,62vh)] lg:max-w-[min(340px,calc(100%-2rem))] lg:overflow-y-auto",
          ].join(" ")}
        >
          <p className={`mb-2.5 text-[11px] font-bold uppercase tracking-[0.18em] ${ui.panelLabel}`}>
            Regional overview
          </p>
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
                  className={[
                    "rounded-xl border p-2.5 text-left transition",
                    theme === "light" ? card.accentLight : card.accent,
                    isActive
                      ? `ring-2 ring-cyan-400/50 ring-offset-1 ${ui.ringOffset}`
                      : "hover:brightness-110",
                  ].join(" ")}
                >
                  <div className="flex items-start justify-between gap-1">
                    <p
                      className={`text-[9px] font-semibold uppercase tracking-wide ${
                        theme === "light" ? "text-slate-700" : "opacity-80"
                      }`}
                    >
                      {card.label}
                    </p>
                    <Icon
                      className={`h-4 w-4 shrink-0 ${
                        theme === "light" ? "opacity-80" : "opacity-70"
                      }`}
                      aria-hidden
                    />
                  </div>
                  <p
                    className={`mt-1 text-lg font-bold tabular-nums sm:text-xl ${
                      theme === "light" ? card.valueClassLight : card.valueClass
                    }`}
                  >
                    {formatStat(value, card.format)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className={`mt-3 rounded-xl border p-2.5 ${ui.cell}`}>
            <p className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.14em] ${ui.meta}`}>
              <HiMapPin className="h-3.5 w-3.5" aria-hidden />
              Province
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setProvinceFilter("all")}
                className={[
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold",
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
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold",
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
              className={`mt-2 w-full rounded-lg py-1.5 text-[11px] font-semibold transition ${ui.mutedBtn}`}
            >
              Clear filters
            </button>
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

        {mobileSheet === "ai" ? (
          <div className="pointer-events-auto block w-full lg:hidden">
            <AnalyticsChatBot
              open
              onClose={() => {
                setMobileSheet(null);
                setChatOpen(false);
              }}
              projects={filteredProjects}
              variant="sheet"
            />
          </div>
        ) : null}

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
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${ui.panelLabel}`}>
                  Project feed
                </p>
                <span className={`rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold ${theme === "light" ? "text-cyan-800" : "text-cyan-300"}`}>
                  {filteredProjects.length}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setFeedExpanded((v) => !v)}
                className={`rounded-lg px-2 py-1 text-[10px] font-semibold transition ${ui.mutedBtn}`}
                aria-expanded={feedExpanded}
              >
                {feedExpanded ? "Collapse" : "Expand"}
              </button>
            </div>
            {feedExpanded ? (
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setStatusFilter("all")}
                  className={[
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                    statusFilter === "all" ? ui.chipOn : ui.chipIdle,
                  ].join(" ")}
                >
                  All status
                </button>
                {(
                  [
                    "ongoing",
                    "completed",
                    "delayed",
                    "on_hold",
                    "planning",
                  ] as ProjectStatus[]
                ).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={[
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold",
                      statusFilter === status ? ui.chipOn : ui.chipIdle,
                    ].join(" ")}
                  >
                    {STATUS_META[status].label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {feedExpanded ? (
          <ul className="flex-1 overflow-y-auto overscroll-contain p-2 sm:p-3 [-webkit-overflow-scrolling:touch] [scrollbar-width:thin]">
            {filteredProjects.length === 0 ? (
              <li className="flex flex-col items-center px-4 py-10 text-center">
                <HiBuildingOffice2
                  className="h-8 w-8 text-cyan-500/60"
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
              const status = STATUS_META[project.status];
              const program = PROGRAM_META[project.program];
              const isSelected = selectedId === project.id;

              return (
                <li key={project.id} className="mb-2 last:mb-0">
                  <button
                    type="button"
                    onClick={() => handleViewProject(project)}
                    className={[
                      "flex w-full flex-col gap-1 rounded-xl border p-2.5 text-left transition",
                      isSelected ? ui.feedItemOn : ui.feedItem,
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusBadgeClass(project.status, theme)}`}
                      >
                        {status.label}
                      </span>
                      <span className={`text-[11px] font-bold ${theme === "light" ? "text-cyan-800" : "text-cyan-200"}`}>
                        {formatCompact(project.budget)}
                      </span>
                    </div>
                    <p className={`line-clamp-1 text-sm font-semibold ${ui.modalHeading}`}>
                      {project.name}
                    </p>
                    <p className={`line-clamp-1 text-[11px] ${ui.meta}`}>
                      {project.municipality}, {project.province} ·{" "}
                      <span className={program.accent}>{project.program}</span>
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
                  className={`w-full rounded-lg py-2 text-[11px] font-semibold transition ${ui.showMore}`}
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
          <div className={`max-h-[85vh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-2xl [-webkit-overflow-scrolling:touch] sm:p-5 ${theme === "light" ? "border-cyan-500/30 bg-white" : "border-cyan-800/50 bg-slate-900"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${theme === "light" ? "text-cyan-800/80" : "text-cyan-300/80"}`}>
                  Project intel · {viewing.program}
                </p>
                <h2 className={`mt-1 text-lg font-semibold ${ui.modalHeading}`}>
                  {viewing.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={handleCloseDetail}
                className={ui.closeBtn}
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" aria-hidden />
              </button>
            </div>

            {viewing.photo_url ? (
              <img
                src={viewing.photo_url}
                alt={viewing.name}
                loading="lazy"
                className={`mt-3 h-44 w-full rounded-xl object-cover ring-1 ${theme === "light" ? "ring-slate-200" : "ring-slate-700/60"}`}
              />
            ) : (
              <div className={`mt-3 flex h-28 w-full items-center justify-center rounded-xl border text-xs ${ui.emptyPhoto}`}>
                No project photo
              </div>
            )}

            {describeProject(viewing).trim() ? (
              <>
                <p className="mt-3 text-[10px] font-bold uppercase tracking-[0.14em] text-cyan-300/70">
                  Project description
                </p>
                <p className={`mt-1 text-sm leading-relaxed ${ui.modalBody}`}>
                  {describeProject(viewing)}
                </p>
              </>
            ) : null}

            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Type</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>{viewing.program}</p>
              </div>
              <div className={`rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Year</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>
                  {projectYear(viewing)}
                </p>
              </div>
              <div className={`col-span-2 rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Beneficiary</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>
                  {viewing.beneficiary}
                </p>
              </div>
              <div className={`col-span-2 rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Sector</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>{viewing.sector}</p>
              </div>
              <div className={`rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Municipality</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>
                  {viewing.municipality}
                </p>
              </div>
              <div className={`rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Status</p>
                <p className={`mt-1 font-semibold ${ui.modalHeading}`}>
                  {STATUS_META[viewing.status].label}
                </p>
              </div>
              <div className={`col-span-2 rounded-xl border p-3 ${ui.cell}`}>
                <p className={ui.modalMuted}>Project Cost</p>
                <p className={`mt-1 font-semibold ${theme === "light" ? "text-cyan-800" : "text-cyan-200"}`}>
                  {formatPeso(viewing.budget)}
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => openGoogleDirections(viewing, userLocation)}
                className={`inline-flex flex-1 items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  theme === "light"
                    ? "border-cyan-400 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
                    : "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                }`}
              >
                <HiPaperAirplane className="h-5 w-5" aria-hidden />
                Google Maps directions
                <HiArrowTopRightOnSquare className="h-4 w-4 opacity-70" aria-hidden />
              </button>
              {!userLocation ? (
                <button
                  type="button"
                  onClick={handleLocateMe}
                  disabled={locateLoading}
                  className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold disabled:opacity-50 ${
                    theme === "light"
                      ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                      : "border-emerald-500/40 bg-emerald-500/10 text-emerald-100"
                  }`}
                >
                  <HiMapPin className="h-5 w-5" aria-hidden />
                  {locateLoading ? "Locating…" : "Use my location"}
                </button>
              ) : null}
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              {userLocation
                ? "Route starts from your current GPS position."
                : "No origin yet — Google opens with destination only. Tap Use my location for full route."}
            </p>
          </div>
        </div>
      ) : null}

      {reportOpen ? (
        <div
          className={`pointer-events-auto absolute inset-0 z-40 flex items-end justify-center p-3 sm:items-center lg:backdrop-blur-sm ${ui.scrim}`}
          role="dialog"
          aria-modal="true"
          aria-label="Generate report"
        >
          <div className={`w-full max-w-md overflow-y-auto overscroll-contain rounded-2xl border p-4 shadow-2xl [-webkit-overflow-scrolling:touch] sm:p-5 ${theme === "light" ? "border-amber-400/40 bg-white" : "border-amber-800/50 bg-slate-900"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className={`text-[11px] font-bold uppercase tracking-[0.16em] ${theme === "light" ? "text-amber-700/80" : "text-amber-300/80"}`}>
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
              <HiFunnel className="mt-0.5 h-4 w-4 shrink-0 text-cyan-500" aria-hidden />
              <div className={`min-w-0 text-xs ${ui.modalBody}`}>
                <p className={`font-semibold ${ui.modalHeading}`}>Current scope</p>
                <p className={`mt-0.5 break-words ${ui.meta}`}>
                  {describeFilters(reportFilters)}
                </p>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className={`rounded-xl border p-2.5 ${ui.cell}`}>
                <p className={`text-[9px] font-semibold uppercase tracking-wide ${ui.modalMuted}`}>
                  Funding
                </p>
                <p className={`mt-1 text-sm font-bold ${theme === "light" ? "text-cyan-800" : "text-cyan-200"}`}>
                  {formatCompact(
                    filteredProjects.reduce((s, p) => s + p.budget, 0),
                  )}
                </p>
              </div>
              <div className={`rounded-xl border p-2.5 ${ui.cell}`}>
                <p className={`text-[9px] font-semibold uppercase tracking-wide ${ui.modalMuted}`}>
                  Beneficiaries
                </p>
                <p className={`mt-1 text-sm font-bold ${theme === "light" ? "text-violet-800" : "text-violet-200"}`}>
                  {formatCompact(
                    filteredProjects.reduce((s, p) => s + p.beneficiaries, 0),
                  )}
                </p>
              </div>
              <div className={`rounded-xl border p-2.5 ${ui.cell}`}>
                <p className={`text-[9px] font-semibold uppercase tracking-wide ${ui.modalMuted}`}>
                  Provinces
                </p>
                <p className={`mt-1 text-sm font-bold ${theme === "light" ? "text-emerald-800" : "text-emerald-200"}`}>
                  {new Set(filteredProjects.map((p) => p.province)).size}
                </p>
              </div>
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
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                  theme === "light"
                    ? "border-amber-400 bg-amber-50 text-amber-900 hover:bg-amber-100"
                    : "border-amber-500/40 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
                }`}
              >
                <HiPrinter className="h-5 w-5" aria-hidden />
                Printable report (PDF)
              </button>
              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={filteredProjects.length === 0}
                className={`inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition disabled:opacity-40 ${
                  theme === "light"
                    ? "border-cyan-400 bg-cyan-50 text-cyan-900 hover:bg-cyan-100"
                    : "border-cyan-500/40 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25"
                }`}
              >
                <HiTableCells className="h-5 w-5" aria-hidden />
                Export spreadsheet (CSV)
              </button>
            </div>

            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-500">
              <HiDocumentText className="h-3.5 w-3.5 shrink-0" aria-hidden />
              Report reflects active filters. Clear filters for a region-wide
              report.
            </p>
          </div>
        </div>
      ) : null}

      {/* Desktop AI chat dock */}
      {chatOpen ? (
        <div className="pointer-events-none absolute bottom-5 right-5 z-30 hidden lg:block">
          <AnalyticsChatBot
            open={chatOpen}
            onClose={() => setChatOpen(false)}
            projects={filteredProjects}
            variant="dock"
          />
        </div>
      ) : null}
    </section>
    </>
  );
};

export default RegionDashboard;
