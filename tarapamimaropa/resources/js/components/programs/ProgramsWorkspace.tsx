import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useRef, useState, type ReactNode } from 'react';
import {
  HiArrowDownTray,
  HiArrowPath,
  HiArrowUpTray,
  HiBanknotes,
  HiChartBar,
  HiChevronDown,
  HiChevronUp,
  HiChevronRight,
  HiDocumentArrowDown,
  HiHome,
  HiInboxStack,
  HiMagnifyingGlass,
  HiMapPin,
  HiPencilSquare,
  HiPlus,
  HiPresentationChartLine,
  HiSquares2X2,
  HiTableCells,
  HiXMark,
} from 'react-icons/hi2';
import AddProjectsModal from '@/components/modals/psto/AddProjectsModal';
import EditProjectsModal from '@/components/modals/psto/EditProjectsModal';
import QuickSnapshotModal from '@/components/modals/region/QuickSnapshotModal';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  PROVINCES,
  formatMoneyOrDash,
  formatPeso,
  formatRateOrDash,
  projectStatusClass,
  projectStatusLabel,
  projectType,
  projectTypeMeta,
  projectYear,
  type Province,
  type TaraProject,
} from '@/constants/taraProjects';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

export type ProgramsWorkspaceProps = {
  projects: TaraProject[];
  /** When set, UI is locked to this province (PSTO). */
  lockedProvince?: Province | null;
  allowImport?: boolean;
  importUrl?: string;
  /** PSTO: export live data + blank import template. */
  allowExport?: boolean;
  exportUrl?: string;
  exportTemplateUrl?: string;
  /** PSTO: show Add / Edit project actions. */
  allowMutate?: boolean;
  /** Next QR-TTC sequence for auto code preview. */
  nextCodeSequence?: number;
  /** Region: link to dedicated Summary graphs page. */
  summaryGraphsHref?: string;
  homeHref: string;
  homeLabel?: string;
  pageTitle?: string;
};

const UI = {
  light: {
    page: 'bg-background text-foreground',
    card: 'border-slate-200 bg-white shadow-sm',
    cardHover: 'hover:border-slate-300 hover:bg-slate-50',
    heading: 'text-slate-900',
    muted: 'text-slate-500',
    soft: 'text-slate-600',
    body: 'text-slate-700',
    ghostBtn:
      'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-900',
    chipIdle:
      'border border-slate-300 text-slate-600 hover:border-slate-400 hover:text-slate-900',
    input:
      'border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500',
    track: 'bg-slate-200',
    rowBorder: 'border-slate-100',
    theadBorder: 'border-slate-200',
    rowHover: 'hover:bg-slate-50',
    barHover: 'hover:bg-slate-100',
    statusAllOn: 'bg-slate-900 text-white',
    statusAllOff:
      'border border-slate-300 text-slate-500 hover:text-slate-800',
    statusIdle:
      'border border-slate-300 text-slate-500 ring-transparent hover:text-slate-800',
    pager:
      'border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40',
    modal: 'border-slate-200 bg-white shadow-xl',
    modalClose: 'text-slate-500 hover:bg-slate-100 hover:text-slate-900',
    imgBorder: 'border-slate-200',
    scope: 'text-slate-700',
    value: 'text-slate-900',
  },
  dark: {
    page: 'bg-background text-foreground',
    card: 'border-slate-700 bg-slate-900/80 shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
    cardHover: 'hover:border-slate-600 hover:bg-slate-900',
    heading: 'text-white',
    muted: 'text-slate-500',
    soft: 'text-slate-400',
    body: 'text-slate-300',
    ghostBtn:
      'border-slate-700 bg-transparent text-slate-300 hover:border-slate-600 hover:bg-slate-900 hover:text-white',
    chipIdle:
      'border border-slate-700 text-slate-400 hover:border-slate-600 hover:text-slate-200',
    input:
      'border-slate-700 bg-slate-900 text-white placeholder:text-slate-600 focus:border-blue-500',
    track: 'bg-slate-800',
    rowBorder: 'border-slate-800/80',
    theadBorder: 'border-slate-800',
    rowHover: 'hover:bg-slate-800/40',
    barHover: 'hover:bg-slate-800/50',
    statusAllOn: 'bg-slate-100 text-slate-900',
    statusAllOff:
      'border border-slate-700 text-slate-400 hover:text-slate-200',
    statusIdle:
      'border border-slate-700 text-slate-500 ring-transparent hover:text-slate-300',
    pager:
      'border-slate-700 text-slate-300 hover:bg-slate-900 disabled:opacity-40',
    modal: 'border-slate-800 bg-slate-950 shadow-[0_8px_24px_rgba(0,0,0,0.4)]',
    modalClose: 'text-slate-400 hover:bg-slate-900 hover:text-white',
    imgBorder: 'border-slate-800',
    scope: 'text-slate-300',
    value: 'text-white',
  },
} as const satisfies Record<ThemeMode, Record<string, string>>;

const PAGE_SIZE = 25;

type SortKey = "year_asc" | "year_desc" | "name" | "province" | "status";

type UiTokens = (typeof UI)[ThemeMode];

const dash = (value: string | null | undefined) => {
  const text = (value ?? "").trim();
  return text === "" ? "—" : text;
};

const FilterSelect = ({
  label,
  allLabel,
  value,
  options,
  onChange,
  labelClass,
  selectClass,
}: {
  label: string;
  allLabel: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  labelClass: string;
  selectClass: string;
}) => (
  <label className="block">
    <span className={`mb-1.5 block text-sm font-medium ${labelClass}`}>
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={selectClass}
    >
      <option value="all">{allLabel}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </label>
);

const EmptyState = ({
  noProjects,
  canMutate,
  allowImport,
  onAdd,
  onImport,
  onClear,
  headingClass,
  mutedClass,
  ghostBtnClass,
  primaryBtnClass,
}: {
  noProjects: boolean;
  canMutate: boolean;
  allowImport: boolean;
  onAdd: () => void;
  onImport: () => void;
  onClear: () => void;
  headingClass: string;
  mutedClass: string;
  ghostBtnClass: string;
  primaryBtnClass: string;
}) => (
  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
    <HiInboxStack className={`h-10 w-10 ${mutedClass}`} aria-hidden />
    <p className={`mt-3 text-base font-semibold ${headingClass}`}>
      {noProjects ? "No projects yet" : "No projects match these filters"}
    </p>
    <p className={`mt-1 text-sm ${mutedClass}`}>
      {noProjects
        ? "Add a project or import your Excel list to get started."
        : "Try a different search term or clear the filters."}
    </p>
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {noProjects ? (
        <>
          {allowImport ? (
            <button type="button" onClick={onImport} className={ghostBtnClass}>
              <HiArrowUpTray className="h-4 w-4" aria-hidden />
              Import from Excel
            </button>
          ) : null}
          {canMutate ? (
            <button type="button" onClick={onAdd} className={primaryBtnClass}>
              <HiPlus className="h-4 w-4" aria-hidden />
              Add project
            </button>
          ) : null}
        </>
      ) : (
        <button type="button" onClick={onClear} className={ghostBtnClass}>
          <HiXMark className="h-4 w-4" aria-hidden />
          Clear filters
        </button>
      )}
    </div>
  </div>
);

const TypeBadge = ({
  type,
  isDark,
  className = "",
}: {
  type: string;
  isDark: boolean;
  className?: string;
}) => {
  const meta = projectTypeMeta(type);
  return (
    <span
      title={type}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-semibold ${isDark ? "text-slate-100" : "text-slate-800"} ${className}`}
      style={{
        borderColor: `${meta.color}66`,
        backgroundColor: `${meta.color}${isDark ? "33" : "14"}`,
      }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: meta.color }}
        aria-hidden
      />
      <span className="truncate">{meta.short}</span>
    </span>
  );
};

const SummaryStat = ({
  label,
  labelClass,
  valueClass,
  className = "",
  children,
}: {
  label: string;
  labelClass: string;
  valueClass: string;
  className?: string;
  children: ReactNode;
}) => (
  <div className={className}>
    <p className={`text-xs font-medium ${labelClass}`}>{label}</p>
    <p className={`mt-0.5 line-clamp-2 text-sm font-semibold ${valueClass}`}>
      {children}
    </p>
  </div>
);

const DetailList = ({
  title,
  rows,
  ui,
}: {
  title: string;
  rows: { label: string; value: string }[];
  ui: UiTokens;
}) => (
  <section>
    <h3 className={`mb-2 text-xs font-semibold uppercase tracking-wider ${ui.muted}`}>
      {title}
    </h3>
    <dl className={`divide-y rounded-xl border ${ui.card} ${ui.rowBorder}`}>
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-start justify-between gap-4 px-3.5 py-2.5"
        >
          <dt className={`shrink-0 text-sm ${ui.soft}`}>{row.label}</dt>
          <dd className={`text-right text-sm font-medium tabular-nums ${ui.heading}`}>
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);

const ProgramsWorkspace = ({
  projects,
  lockedProvince = null,
  allowImport = false,
  importUrl,
  allowExport = false,
  exportUrl,
  exportTemplateUrl,
  allowMutate = false,
  nextCodeSequence = 1,
  summaryGraphsHref,
  homeHref,
  homeLabel = "Dashboard",
  pageTitle = "Programs",
}: ProgramsWorkspaceProps) => {
  const { theme, isDark } = useTheme();
  const ui = UI[theme];
  const statusMode = isDark ? "dark" : "light";
  const provinceLocked =
    lockedProvince != null &&
    (PROVINCES as readonly string[]).includes(lockedProvince);
  const canMutate = allowMutate && provinceLocked;
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [provinceFilter, setProvinceFilter] = useState<Province | "all">(
    provinceLocked ? (lockedProvince as Province) : "all",
  );
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [typeFilter, setTypeFilter] = useState<string | "all">("all");
  const [sectorFilter, setSectorFilter] = useState<string | "all">("all");
  const [yearFilter, setYearFilter] = useState<string | "all">("all");
  const [cityFilter, setCityFilter] = useState<string | "all">("all");
  const [districtFilter, setDistrictFilter] = useState<string | "all">("all");
  const [sortBy, setSortBy] = useState<SortKey>("year_asc");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<TaraProject | null>(null);
  const [snapshotOpen, setSnapshotOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<TaraProject | null>(null);

  const onPickImport = () => fileInputRef.current?.click();

  const onImportFile = (file: File | undefined) => {
    if (!file || !importUrl) return;

    const data = new FormData();
    data.append('file', file);
    setImporting(true);

    router.post(importUrl, data, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const resetPage = () => setPage(1);

  const clearFilters = () => {
    if (!provinceLocked) {
      setProvinceFilter("all");
    }
    setStatusFilter("all");
    setTypeFilter("all");
    setSectorFilter("all");
    setYearFilter("all");
    setCityFilter("all");
    setDistrictFilter("all");
    setSortBy("year_asc");
    setSearch("");
    setPage(1);
  };

  const scopedProjects = useMemo(
    () =>
      provinceFilter === "all"
        ? projects
        : projects.filter((p) => p.province === provinceFilter),
    [projects, provinceFilter],
  );

  const typeOptions = useMemo(() => {
    const set = new Set<string>();
    scopedProjects.forEach((p) => {
      const t = projectType(p).trim();
      if (t) set.add(t);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopedProjects]);

  const sectorOptions = useMemo(() => {
    const set = new Set<string>();
    scopedProjects.forEach((p) => {
      const s = (p.sector ?? "").trim();
      if (s) set.add(s);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopedProjects]);

  const yearOptions = useMemo(() => {
    const set = new Set<number>();
    scopedProjects.forEach((p) => set.add(projectYear(p)));
    return [...set].sort((a, b) => a - b);
  }, [scopedProjects]);

  const cityOptions = useMemo(() => {
    const set = new Set<string>();
    scopedProjects.forEach((p) => {
      const city = (p.municipality ?? "").trim();
      if (city) set.add(city);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopedProjects]);

  const districtOptions = useMemo(() => {
    const set = new Set<string>();
    scopedProjects.forEach((p) => {
      const d = (p.district ?? "").trim();
      if (d) set.add(d);
    });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [scopedProjects]);

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = scopedProjects.filter((p) => {
      if (statusFilter !== "all" && projectStatusLabel(p) !== statusFilter) {
        return false;
      }
      if (typeFilter !== "all" && projectType(p) !== typeFilter) {
        return false;
      }
      if (sectorFilter !== "all" && (p.sector ?? "") !== sectorFilter) {
        return false;
      }
      if (yearFilter !== "all" && String(projectYear(p)) !== yearFilter) {
        return false;
      }
      if (cityFilter !== "all" && (p.municipality ?? "") !== cityFilter) {
        return false;
      }
      if (districtFilter !== "all" && (p.district ?? "") !== districtFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.beneficiary.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.sector ?? "").toLowerCase().includes(q) ||
        (p.collaborators ?? "").toLowerCase().includes(q) ||
        (p.district ?? "").toLowerCase().includes(q) ||
        projectType(p).toLowerCase().includes(q) ||
        projectStatusLabel(p).toLowerCase().includes(q)
      );
    });

    return [...list].sort((a, b) => {
      if (sortBy === "year_asc") {
        const dy = projectYear(a) - projectYear(b);
        return dy !== 0 ? dy : a.name.localeCompare(b.name);
      }
      if (sortBy === "year_desc") {
        const dy = projectYear(b) - projectYear(a);
        return dy !== 0 ? dy : a.name.localeCompare(b.name);
      }
      if (sortBy === "province") {
        const dp = a.province.localeCompare(b.province);
        if (dp !== 0) return dp;
        const dy = projectYear(a) - projectYear(b);
        return dy !== 0 ? dy : a.name.localeCompare(b.name);
      }
      if (sortBy === "status") {
        const ds = projectStatusLabel(a).localeCompare(projectStatusLabel(b));
        if (ds !== 0) return ds;
        const dy = projectYear(a) - projectYear(b);
        return dy !== 0 ? dy : a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });
  }, [
    scopedProjects,
    statusFilter,
    typeFilter,
    sectorFilter,
    yearFilter,
    cityFilter,
    districtFilter,
    search,
    sortBy,
  ]);

  const hasActiveFilters =
    (!provinceLocked && provinceFilter !== "all") ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    sectorFilter !== "all" ||
    yearFilter !== "all" ||
    cityFilter !== "all" ||
    districtFilter !== "all" ||
    sortBy !== "year_asc" ||
    search.trim().length > 0;

  const advancedFilterCount = useMemo(() => {
    let count = 0;
    if (typeFilter !== "all") count += 1;
    if (sectorFilter !== "all") count += 1;
    if (yearFilter !== "all") count += 1;
    if (cityFilter !== "all") count += 1;
    if (districtFilter !== "all") count += 1;
    if (sortBy !== "year_asc") count += 1;
    return count;
  }, [
    typeFilter,
    sectorFilter,
    yearFilter,
    cityFilter,
    districtFilter,
    sortBy,
  ]);

  const totals = useMemo(() => {
    let cost = 0;
    let due = 0;
    let refunded = 0;
    const cities = new Set<string>();
    for (const p of scopedProjects) {
      cost += p.budget || 0;
      due += p.amount_due ?? 0;
      refunded += p.refunded ?? 0;
      const city = (p.municipality ?? "").trim();
      if (city) cities.add(`${p.province}|${city}`);
    }
    return { cost, due, refunded, cities: cities.size };
  }, [scopedProjects]);

  const byStatus = useMemo(() => {
    const counts = new Map<string, number>();
    scopedProjects.forEach((p) => {
      const label = projectStatusLabel(p);
      counts.set(label, (counts.get(label) ?? 0) + 1);
    });
    const rows = [...counts.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [scopedProjects]);

  const byType = useMemo(() => {
    const counts = new Map<string, { count: number; budget: number }>();
    for (const p of scopedProjects) {
      const type = projectType(p);
      const prev = counts.get(type) ?? { count: 0, budget: 0 };
      counts.set(type, {
        count: prev.count + 1,
        budget: prev.budget + p.budget,
      });
    }
    const rows = [...counts.entries()]
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.count - a.count);
    return { rows };
  }, [scopedProjects]);

  const filteredCost = useMemo(
    () => filteredProjects.reduce((s, p) => s + (p.budget || 0), 0),
    [filteredProjects],
  );

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredProjects.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const setProvince = (next: Province | "all") => {
    if (provinceLocked) return;
    setProvinceFilter(next);
    setCityFilter("all");
    setDistrictFilter("all");
    resetPage();
  };

  const setStatus = (next: string | "all") => {
    setStatusFilter(next);
    resetPage();
  };

  const setType = (next: string | "all") => {
    setTypeFilter(next);
    resetPage();
  };

  const selectClass = `min-h-10 w-full rounded-lg border px-3 py-2 text-sm outline-none transition duration-[180ms] ${ui.input}`;

  const scopeLabel = provinceFilter === "all" ? "MIMAROPA" : provinceFilter;

  const refundPct =
    totals.due > 0 ? Math.round((totals.refunded / totals.due) * 100) : null;

  const kpis = [
    {
      label: "Projects",
      value: scopedProjects.length.toLocaleString(),
      icon: HiSquares2X2,
      hint: `${byType.rows.length} type${byType.rows.length === 1 ? "" : "s"} · ${byStatus.rows.length} status${byStatus.rows.length === 1 ? "" : "es"}`,
    },
    {
      label: "Total project cost",
      value: formatPeso(totals.cost),
      icon: HiBanknotes,
      hint: `${formatPeso(totals.due)} amount due`,
    },
    {
      label: "Refunded",
      value: formatPeso(totals.refunded),
      icon: HiArrowPath,
      hint:
        refundPct == null ? "No amount due recorded" : `${refundPct}% of amount due`,
    },
    {
      label: "Municipalities",
      value: totals.cities.toLocaleString(),
      icon: HiMapPin,
      hint: `covered in ${scopeLabel}`,
    },
  ];

  const ghostBtnClass = `inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 disabled:opacity-50 ${ui.ghostBtn}`;
  const primaryBtnClass =
    "inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-medium text-white transition duration-[180ms] hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 focus-visible:ring-offset-2";
  const hasExcelActions =
    allowImport || (allowExport && (exportUrl || exportTemplateUrl));

  return (
    <>
    <Head title={pageTitle} />
    <section className={`min-h-full px-4 py-5 pb-[calc(6.25rem+env(safe-area-inset-bottom))] transition-colors duration-[180ms] sm:px-6 sm:py-7 md:pb-7 ${ui.page}`}>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="min-w-0">
            <p className={`text-xs font-semibold uppercase tracking-wider ${ui.muted}`}>
              {provinceLocked ? "PSTO programs" : "Regional programs"}
            </p>
            <h1 className={`mt-1 text-2xl font-semibold tracking-tight sm:text-3xl ${ui.heading}`}>
              {scopeLabel} projects
            </h1>
            <p className={`mt-1.5 max-w-prose text-sm leading-relaxed ${ui.soft}`}>
              {provinceLocked
                ? "Add, import, and review projects for your province. Open a row for full details."
                : "Filter by province and status. Open a row for full details."}
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link
              href={homeHref}
              aria-label={homeLabel}
              title={homeLabel}
              className={ghostBtnClass}
            >
              <HiHome className="h-4 w-4" aria-hidden />
              <span className="hidden xl:inline">{homeLabel}</span>
            </Link>
            <button
              type="button"
              onClick={() => setSnapshotOpen(true)}
              className={ghostBtnClass}
            >
              <HiChartBar className="h-4 w-4" aria-hidden />
              Quick snapshot
            </button>
            {hasExcelActions ? (
              <>
                {allowImport ? (
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
                    className="hidden"
                    onChange={(e) => onImportFile(e.target.files?.[0])}
                  />
                ) : null}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      disabled={importing}
                      className={ghostBtnClass}
                    >
                      <HiTableCells className="h-4 w-4" aria-hidden />
                      {importing ? "Importing…" : "Excel"}
                      <HiChevronDown className="h-3.5 w-3.5 opacity-70" aria-hidden />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-52">
                    {allowImport ? (
                      <DropdownMenuItem onSelect={onPickImport}>
                        <HiArrowUpTray aria-hidden />
                        Import from Excel
                      </DropdownMenuItem>
                    ) : null}
                    {allowExport && exportUrl ? (
                      <DropdownMenuItem asChild>
                        <a href={exportUrl}>
                          <HiArrowDownTray aria-hidden />
                          Export to Excel
                        </a>
                      </DropdownMenuItem>
                    ) : null}
                    {allowExport && exportTemplateUrl ? (
                      <DropdownMenuItem asChild>
                        <a href={exportTemplateUrl}>
                          <HiDocumentArrowDown aria-hidden />
                          Download blank template
                        </a>
                      </DropdownMenuItem>
                    ) : null}
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : null}
            {summaryGraphsHref ? (
              <Link href={summaryGraphsHref} className={primaryBtnClass}>
                <HiPresentationChartLine className="h-4 w-4" aria-hidden />
                Summary graphs
              </Link>
            ) : null}
            {canMutate ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className={primaryBtnClass}
              >
                <HiPlus className="h-4 w-4" aria-hidden />
                Add project
              </button>
            ) : null}
          </div>
        </header>

        {!provinceLocked ? (
          <nav
            aria-label="Filter by province"
            className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {(["all", ...PROVINCES] as const).map((province) => {
              const active = provinceFilter === province;
              const count =
                province === "all"
                  ? projects.length
                  : projects.filter((p) => p.province === province).length;
              return (
                <button
                  key={province}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setProvince(province)}
                  className={[
                    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                    active ? "bg-blue-600 text-white" : ui.chipIdle,
                  ].join(" ")}
                >
                  {province === "all" ? "All provinces" : province}
                  <span className="text-xs tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </nav>
        ) : null}

        <section
          className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
          aria-label={`Overview for ${scopeLabel}`}
        >
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div key={kpi.label} className={`rounded-xl border p-4 ${ui.card}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium ${ui.soft}`}>{kpi.label}</p>
                  <Icon className={`h-4 w-4 shrink-0 ${ui.muted}`} aria-hidden />
                </div>
                <p
                  title={kpi.value}
                  className={`mt-2 truncate text-xl font-semibold tabular-nums sm:text-2xl ${ui.value}`}
                >
                  {kpi.value}
                </p>
                <p className={`mt-1 truncate text-xs ${ui.muted}`}>{kpi.hint}</p>
              </div>
            );
          })}
        </section>

        {byType.rows.length > 0 ? (
          <section className="mt-8" aria-labelledby="programs-type-heading">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2
                id="programs-type-heading"
                className={`text-base font-semibold ${ui.heading}`}
              >
                Programs by type
              </h2>
              <p className={`text-xs ${ui.muted}`}>Select a type to view its projects</p>
            </div>
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4"
              role="group"
              aria-label="Filter by program type"
            >
              {[
                { key: "all", label: "All types", count: scopedProjects.length, budget: totals.cost, color: null },
                ...byType.rows.map(({ type, count, budget }) => ({
                  key: type,
                  label: projectTypeMeta(type).short,
                  count,
                  budget,
                  color: projectTypeMeta(type).color,
                })),
              ].map((card) => {
                const active = typeFilter === card.key;
                return (
                  <button
                    key={card.key}
                    type="button"
                    title={card.key === "all" ? undefined : card.key}
                    aria-pressed={active}
                    onClick={() => setType(active || card.key === "all" ? "all" : card.key)}
                    className={[
                      "flex min-h-[5.5rem] flex-col justify-between gap-2 rounded-xl border border-l-4 p-3 text-left transition duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                      active
                        ? card.color
                          ? "text-white"
                          : `${ui.statusAllOn} border-transparent`
                        : `${ui.card} ${ui.cardHover}`,
                    ].join(" ")}
                    style={
                      card.color
                        ? active
                          ? { backgroundColor: card.color, borderColor: card.color }
                          : { borderLeftColor: card.color }
                        : undefined
                    }
                  >
                    <span
                      className={`line-clamp-2 text-sm font-semibold leading-snug ${active ? "" : ui.heading}`}
                    >
                      {card.label}
                    </span>
                    <span className="flex items-end justify-between gap-2">
                      <span
                        className={`text-xl font-semibold leading-none tabular-nums ${active ? "" : ui.heading}`}
                      >
                        {card.count.toLocaleString()}
                      </span>
                      <span
                        className={`truncate text-xs tabular-nums ${active ? "opacity-85" : ui.muted}`}
                      >
                        {formatPeso(card.budget)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : null}

        <section className="mt-8" aria-labelledby="programs-list-heading">
          <h2
            id="programs-list-heading"
            className={`mb-3 flex flex-wrap items-center gap-2 text-base font-semibold ${ui.heading}`}
          >
            Project list
            {typeFilter !== "all" ? (
              <TypeBadge type={typeFilter} isDark={isDark} />
            ) : null}
          </h2>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative block min-w-0 flex-1">
              <span className="sr-only">Search projects</span>
              <HiMagnifyingGlass
                className={`pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 ${ui.muted}`}
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  resetPage();
                }}
                placeholder="Search name, code, beneficiary…"
                className={`min-h-10 w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition duration-[180ms] focus-visible:ring-2 focus-visible:ring-blue-500/40 ${ui.input}`}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFiltersOpen((open) => !open)}
                aria-expanded={filtersOpen}
                aria-controls="programs-more-filters"
                className={ghostBtnClass}
              >
                Filters
                {advancedFilterCount > 0 ? (
                  <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                    {advancedFilterCount}
                  </span>
                ) : null}
                {filtersOpen ? (
                  <HiChevronUp className="h-4 w-4" aria-hidden />
                ) : (
                  <HiChevronDown className="h-4 w-4" aria-hidden />
                )}
              </button>
              {hasActiveFilters ? (
                <button type="button" onClick={clearFilters} className={ghostBtnClass}>
                  <HiXMark className="h-4 w-4" aria-hidden />
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {filtersOpen ? (
            <div
              id="programs-more-filters"
              className={`mt-3 grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-2 lg:grid-cols-3 ${ui.card}`}
            >
              <FilterSelect
                label="Type"
                allLabel="All types"
                value={typeFilter}
                options={typeOptions}
                onChange={setType}
                labelClass={ui.soft}
                selectClass={selectClass}
              />
              <FilterSelect
                label="Sector"
                allLabel="All sectors"
                value={sectorFilter}
                options={sectorOptions}
                onChange={(next) => {
                  setSectorFilter(next);
                  resetPage();
                }}
                labelClass={ui.soft}
                selectClass={selectClass}
              />
              <FilterSelect
                label="Year approved"
                allLabel="All years"
                value={yearFilter}
                options={yearOptions.map(String)}
                onChange={(next) => {
                  setYearFilter(next);
                  resetPage();
                }}
                labelClass={ui.soft}
                selectClass={selectClass}
              />
              <FilterSelect
                label="City / Municipality"
                allLabel="All municipalities"
                value={cityFilter}
                options={cityOptions}
                onChange={(next) => {
                  setCityFilter(next);
                  resetPage();
                }}
                labelClass={ui.soft}
                selectClass={selectClass}
              />
              <FilterSelect
                label="District"
                allLabel="All districts"
                value={districtFilter}
                options={districtOptions}
                onChange={(next) => {
                  setDistrictFilter(next);
                  resetPage();
                }}
                labelClass={ui.soft}
                selectClass={selectClass}
              />
              <label className="block">
                <span className={`mb-1.5 block text-sm font-medium ${ui.soft}`}>
                  Sort by
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => {
                    setSortBy(e.target.value as SortKey);
                    resetPage();
                  }}
                  className={selectClass}
                >
                  <option value="year_asc">Year approved (oldest first)</option>
                  <option value="year_desc">Year approved (newest first)</option>
                  <option value="name">Project name A–Z</option>
                  {!provinceLocked ? (
                    <option value="province">Province A–Z</option>
                  ) : null}
                  <option value="status">Status A–Z</option>
                </select>
              </label>
            </div>
          ) : null}

          <div
            className="mt-3 flex flex-wrap gap-2"
            role="group"
            aria-label="Filter by status"
          >
            <button
              type="button"
              aria-pressed={statusFilter === "all"}
              onClick={() => setStatus("all")}
              className={[
                "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-medium transition duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                statusFilter === "all" ? ui.statusAllOn : ui.statusAllOff,
              ].join(" ")}
            >
              All status
              <span className="ml-1.5 tabular-nums opacity-70">
                {scopedProjects.length}
              </span>
            </button>
            {byStatus.rows.map(({ status, count }) => {
              const sample = scopedProjects.find(
                (p) => projectStatusLabel(p) === status,
              );
              const active = statusFilter === status;
              return (
                <button
                  key={status}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setStatus(active ? "all" : status)}
                  className={[
                    "inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold ring-1 transition duration-[180ms] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60",
                    active && sample
                      ? projectStatusClass(sample, statusMode)
                      : ui.statusIdle,
                  ].join(" ")}
                >
                  {status}
                  <span className="ml-1.5 tabular-nums opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <p className={`mt-4 text-sm ${ui.soft}`} aria-live="polite">
            <span className={`font-medium tabular-nums ${ui.heading}`}>
              {filteredProjects.length.toLocaleString()}
            </span>
            {filteredProjects.length !== scopedProjects.length
              ? ` of ${scopedProjects.length.toLocaleString()}`
              : ""}{" "}
            project{filteredProjects.length === 1 ? "" : "s"} ·{" "}
            <span className="tabular-nums">{formatPeso(filteredCost)}</span> total
            cost
          </p>

          <div
            className={`mt-2 overflow-x-auto rounded-xl border [-webkit-overflow-scrolling:touch] ${ui.card}`}
          >
            <table className="w-full min-w-[500px] border-collapse text-left text-sm">
              <thead>
                <tr className={`border-b text-xs ${ui.theadBorder} ${ui.muted}`}>
                  <th scope="col" className="hidden w-10 py-3 pr-2 pl-4 font-medium lg:table-cell">
                    #
                  </th>
                  <th scope="col" className="py-3 pr-3 pl-4 font-medium lg:pl-3">
                    Project
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                    Location
                  </th>
                  <th scope="col" className="hidden px-3 py-3 font-medium lg:table-cell">
                    Type
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-3 py-3 font-medium"
                    aria-sort={
                      sortBy === "year_asc"
                        ? "ascending"
                        : sortBy === "year_desc"
                          ? "descending"
                          : undefined
                    }
                  >
                    Year
                    {sortBy === "year_asc" ? " ↑" : sortBy === "year_desc" ? " ↓" : ""}
                  </th>
                  <th scope="col" className="px-3 py-3 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-3 py-3 text-right font-medium">
                    Cost
                  </th>
                  <th scope="col" className="hidden w-12 py-3 pr-3 pl-1 lg:table-cell">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-14">
                      <EmptyState
                        noProjects={scopedProjects.length === 0}
                        canMutate={canMutate}
                        allowImport={allowImport}
                        onAdd={() => setAddOpen(true)}
                        onImport={onPickImport}
                        onClear={clearFilters}
                        headingClass={ui.heading}
                        mutedClass={ui.soft}
                        ghostBtnClass={ghostBtnClass}
                        primaryBtnClass={primaryBtnClass}
                      />
                    </td>
                  </tr>
                ) : null}
                {pageRows.map((project, index) => {
                  const listNumber = (safePage - 1) * PAGE_SIZE + index + 1;
                  const place =
                    project.barangay?.trim() ||
                    (provinceLocked ? project.district?.trim() : project.province);
                  return (
                    <tr
                      key={project.db_id ?? project.id}
                      onClick={() => setViewing(project)}
                      className={`cursor-pointer border-b transition duration-[180ms] last:border-b-0 ${ui.rowBorder} ${ui.rowHover}`}
                    >
                      <td className={`hidden whitespace-nowrap py-3 pr-2 pl-4 text-xs tabular-nums lg:table-cell ${ui.muted}`}>
                        {listNumber}
                      </td>
                      <td className="min-w-[180px] py-3 pr-3 pl-4 lg:pl-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewing(project);
                          }}
                          aria-label={`View details for ${project.name}`}
                          className={`line-clamp-2 rounded text-left font-medium leading-snug focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${ui.heading}`}
                        >
                          {project.name}
                        </button>
                        <div className="mt-1 flex min-w-0 items-center gap-2">
                          <TypeBadge
                            type={projectType(project)}
                            isDark={isDark}
                            className="shrink-0 lg:hidden"
                          />
                          {project.code ? (
                            <span
                              title={project.code}
                              className={`min-w-0 truncate font-mono text-xs ${ui.muted}`}
                            >
                              {project.code}
                            </span>
                          ) : null}
                        </div>
                        <p className={`mt-0.5 line-clamp-1 text-xs lg:hidden ${ui.soft}`}>
                          {[project.municipality, place]
                            .map((part) => part?.trim())
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </td>
                      <td className={`hidden max-w-[180px] px-3 py-3 lg:table-cell ${ui.body}`}>
                        <p className="line-clamp-1">{dash(project.municipality)}</p>
                        {place ? (
                          <p className={`mt-0.5 line-clamp-1 text-xs ${ui.muted}`}>
                            {place}
                          </p>
                        ) : null}
                      </td>
                      <td className="hidden px-3 py-3 lg:table-cell">
                        <TypeBadge type={projectType(project)} isDark={isDark} className="whitespace-nowrap" />
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 tabular-nums ${ui.body}`}>
                        {projectYear(project)}
                      </td>
                      <td className="px-3 py-3">
                        <span
                          className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${projectStatusClass(project, statusMode)}`}
                        >
                          {projectStatusLabel(project)}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-3 py-3 text-right font-medium tabular-nums ${ui.heading}`}>
                        {formatMoneyOrDash(project.budget > 0 ? project.budget : null)}
                      </td>
                      <td className="hidden py-3 pr-3 pl-1 text-right lg:table-cell">
                        <span
                          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition duration-[180ms] ${ui.ghostBtn}`}
                          aria-hidden
                        >
                          <HiChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProjects.length > PAGE_SIZE ? (
            <nav
              aria-label="Pagination"
              className={`mt-3 flex flex-wrap items-center justify-between gap-3 text-sm ${ui.soft}`}
            >
              <p className="tabular-nums">
                {(safePage - 1) * PAGE_SIZE + 1}–
                {Math.min(safePage * PAGE_SIZE, filteredProjects.length)} of{" "}
                {filteredProjects.length.toLocaleString()}
              </p>
              <div className="flex items-center gap-2">
                <span className="hidden tabular-nums sm:inline">
                  Page {safePage} of {pageCount}
                </span>
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`min-h-9 rounded-lg border px-3 font-medium transition duration-[180ms] ${ui.pager}`}
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={safePage >= pageCount}
                  onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                  className={`min-h-9 rounded-lg border px-3 font-medium transition duration-[180ms] ${ui.pager}`}
                >
                  Next
                </button>
              </div>
            </nav>
          ) : null}
        </section>
      </div>

      <Dialog
        open={viewing != null}
        onOpenChange={(open) => {
          if (!open) setViewing(null);
        }}
      >
        {viewing ? (
          <DialogContent
            className={`flex max-h-[92vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-xl ${ui.modal}`}
          >
            <div className={`shrink-0 border-b px-5 pt-5 pr-12 pb-4 ${ui.theadBorder}`}>
              <div className="flex flex-wrap items-center gap-2">
                <TypeBadge type={projectType(viewing)} isDark={isDark} />
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${projectStatusClass(viewing, statusMode)}`}
                >
                  {projectStatusLabel(viewing)}
                </span>
                <span className={`text-xs tabular-nums ${ui.muted}`}>
                  Approved {projectYear(viewing)}
                </span>
              </div>
              <DialogTitle className={`mt-2 text-lg leading-snug ${ui.heading}`}>
                {viewing.name}
              </DialogTitle>
              <DialogDescription className={`mt-1 font-mono text-xs ${ui.muted}`}>
                {dash(viewing.code)}
              </DialogDescription>

              <div className={`mt-4 grid grid-cols-2 gap-3 rounded-xl border p-3 sm:grid-cols-3 ${ui.card}`}>
                <SummaryStat label="Cost" labelClass={ui.muted} valueClass={ui.heading}>
                  <span className="tabular-nums">
                    {formatMoneyOrDash(viewing.budget || null)}
                  </span>
                </SummaryStat>
                <SummaryStat label="Type" labelClass={ui.muted} valueClass={ui.heading}>
                  {projectType(viewing)}
                </SummaryStat>
                <SummaryStat
                  label="Location"
                  labelClass={ui.muted}
                  valueClass={ui.heading}
                  className="col-span-2 sm:col-span-1"
                >
                  {[viewing.barangay, viewing.municipality, viewing.province]
                    .map((part) => part?.trim())
                    .filter(Boolean)
                    .join(", ") || "—"}
                </SummaryStat>
              </div>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4 [overscroll-behavior:contain]">
              <DetailList
                title="People & sector"
                rows={[
                  { label: "Beneficiaries", value: dash(viewing.beneficiary) },
                  { label: "Collaborators", value: dash(viewing.collaborators) },
                  { label: "Sector", value: dash(viewing.sector) },
                ]}
                ui={ui}
              />
              <DetailList
                title="Place"
                rows={[
                  { label: "Province", value: dash(viewing.province) },
                  { label: "City / Municipality", value: dash(viewing.municipality) },
                  { label: "Barangay", value: dash(viewing.barangay) },
                  { label: "District", value: dash(viewing.district) },
                  {
                    label: "Coordinates",
                    value: viewing.has_coordinates
                      ? `${viewing.latitude.toFixed(6)}, ${viewing.longitude.toFixed(6)}`
                      : "Not pinned (approximate on map)",
                  },
                ]}
                ui={ui}
              />
              <DetailList
                title="Funding"
                rows={[
                  { label: "Project cost", value: formatMoneyOrDash(viewing.budget || null) },
                  { label: "Amount due", value: formatMoneyOrDash(viewing.amount_due) },
                  { label: "Refunded", value: formatMoneyOrDash(viewing.refunded) },
                  { label: "Refund rate", value: formatRateOrDash(viewing.refund_rate) },
                ]}
                ui={ui}
              />
            </div>

            <div className={`flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-3 sm:flex-row sm:justify-end ${ui.theadBorder}`}>
              <button type="button" onClick={() => setViewing(null)} className={ghostBtnClass}>
                Close
              </button>
              {canMutate && viewing.db_id ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(viewing);
                    setViewing(null);
                  }}
                  className={primaryBtnClass}
                >
                  <HiPencilSquare className="h-4 w-4" aria-hidden />
                  Edit project
                </button>
              ) : null}
            </div>
          </DialogContent>
        ) : null}
      </Dialog>

      <QuickSnapshotModal
        open={snapshotOpen}
        onOpenChange={setSnapshotOpen}
        projects={projects}
        provinceFilter={provinceFilter}
        statusFilter={statusFilter}
        onProvinceFilter={(next) => {
          if (provinceLocked) return;
          setProvince(next);
        }}
        onStatusFilter={setStatus}
      />

      {canMutate ? (
        <>
          <AddProjectsModal
            open={addOpen}
            onOpenChange={setAddOpen}
            lockedProvince={lockedProvince as Province}
            nextCodeSequence={nextCodeSequence}
          />
          <EditProjectsModal
            open={editing != null}
            onOpenChange={(next) => {
              if (!next) setEditing(null);
            }}
            lockedProvince={lockedProvince as Province}
            project={editing}
          />
        </>
      ) : null}
    </section>
    </>
  );
};

export default ProgramsWorkspace;
