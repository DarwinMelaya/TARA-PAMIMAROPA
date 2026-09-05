import { Head, Link, router, usePage } from '@inertiajs/react';
import { useMemo, useRef, useState } from 'react';
import {
  HiArrowUpTray,
  HiBanknotes,
  HiChartBar,
  HiChevronDown,
  HiChevronUp,
  HiClipboardDocumentList,
  HiMagnifyingGlass,
  HiMapPin,
  HiPresentationChartLine,
  HiSquares2X2,
  HiUserGroup,
  HiXMark,
} from 'react-icons/hi2';
import ProgramsGraphs from '@/components/region/programs/ProgramsGraphs';
import {
  PROVINCES,
  formatCompact,
  formatMoneyOrDash,
  formatPeso,
  formatRateOrDash,
  projectStatusClass,
  projectStatusLabel,
  projectType,
  projectYear,
  summarizeProjects,
  type Province,
  type TaraProject,
} from '@/constants/taraProjects';
import { dashboard } from '@/routes/region';
import { importMethod } from '@/routes/region/programs';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

type PageProps = {
  projects?: TaraProject[];
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

const dash = (value: string | null | undefined) => {
  const text = (value ?? "").trim();
  return text === "" ? "—" : text;
};

const RegionPrograms = () => {
  const { theme } = useTheme();
  const ui = UI[theme];
  const { projects: serverProjects = [] } = usePage<PageProps>().props;
  const projects = serverProjects;
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [provinceFilter, setProvinceFilter] = useState<Province | "all">("all");
  const [statusFilter, setStatusFilter] = useState<string | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [chartsOpen, setChartsOpen] = useState(false);
  const [viewing, setViewing] = useState<TaraProject | null>(null);
  const [graphsOpen, setGraphsOpen] = useState(false);

  const onPickImport = () => fileInputRef.current?.click();

  const onImportFile = (file: File | undefined) => {
    if (!file) return;

    const data = new FormData();
    data.append('file', file);
    setImporting(true);

    router.post(importMethod.url(), data, {
      forceFormData: true,
      preserveScroll: true,
      onFinish: () => {
        setImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      },
    });
  };

  const scopedProjects = useMemo(
    () =>
      provinceFilter === "all"
        ? projects
        : projects.filter((p) => p.province === provinceFilter),
    [projects, provinceFilter],
  );

  const filteredProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return scopedProjects.filter((p) => {
      if (statusFilter !== "all" && projectStatusLabel(p) !== statusFilter) {
        return false;
      }
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        p.beneficiary.toLowerCase().includes(q) ||
        p.municipality.toLowerCase().includes(q) ||
        (p.code ?? "").toLowerCase().includes(q) ||
        (p.sector ?? "").toLowerCase().includes(q) ||
        projectType(p).toLowerCase().includes(q) ||
        projectStatusLabel(p).toLowerCase().includes(q)
      );
    });
  }, [scopedProjects, statusFilter, search]);

  const stats = useMemo(
    () => summarizeProjects(scopedProjects),
    [scopedProjects],
  );

  const totalCost = useMemo(
    () => scopedProjects.reduce((s, p) => s + p.budget, 0),
    [scopedProjects],
  );

  const byProvince = useMemo(() => {
    const rows = PROVINCES.map((province) => {
      const items = projects.filter((p) => p.province === province);
      return {
        province,
        count: items.length,
        budget: items.reduce((s, p) => s + p.budget, 0),
      };
    });
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [projects]);

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

  const statusOptions = useMemo(
    () => byStatus.rows.map((r) => r.status),
    [byStatus],
  );

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
    const max = Math.max(1, ...rows.map((r) => r.count));
    return { rows, max };
  }, [scopedProjects]);

  const pageCount = Math.max(1, Math.ceil(filteredProjects.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const pageRows = filteredProjects.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE,
  );

  const setProvince = (next: Province | "all") => {
    setProvinceFilter(next);
    setPage(1);
  };

  const setStatus = (next: string | "all") => {
    setStatusFilter(next);
    setPage(1);
  };

  const scopeLabel = provinceFilter === "all" ? "MIMAROPA" : provinceFilter;

  const kpis = [
    {
      label: "Projects",
      value: String(stats.total),
      icon: HiSquares2X2,
      hint: `${byType.rows.length} types`,
    },
    {
      label: "Funding",
      value: formatPeso(stats.funding),
      icon: HiBanknotes,
      hint: `${formatPeso(totalCost)} total cost`,
    },
    {
      label: "Beneficiaries",
      value: formatCompact(stats.beneficiaries),
      icon: HiUserGroup,
      hint: `${stats.utilized > 0 ? Math.round((stats.utilized / stats.funding) * 100) : 0}% utilized`,
    },
  ];

  return (
    <>
    <Head title="Programs" />
    <section className={`min-h-screen px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] transition-colors duration-[180ms] sm:px-6 sm:py-7 lg:pb-7 ${ui.page}`}>
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
          <h1 className={`text-2xl font-semibold tracking-tight sm:text-3xl ${ui.heading}`}>
            Projects Overview
          </h1>
          <p className={`mt-1.5 max-w-prose text-sm leading-relaxed ${ui.muted}`}>
            Pick a province, then scan the list. Deep charts stay behind
            Summary graphs.
          </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
              className="hidden"
              onChange={(e) => onImportFile(e.target.files?.[0])}
            />
            <button
              type="button"
              disabled={importing}
              onClick={onPickImport}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition duration-[180ms] disabled:opacity-50 ${ui.ghostBtn}`}
            >
              <HiArrowUpTray className="h-4 w-4" aria-hidden />
              {importing ? 'Importing…' : 'Import Excel'}
            </button>
            <button
              type="button"
              onClick={() => setGraphsOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition duration-[180ms] hover:bg-blue-500"
            >
              <HiPresentationChartLine className="h-4 w-4" aria-hidden />
              Summary graphs
            </button>
            <Link
              href={dashboard()}
              className={`inline-flex min-h-10 items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition duration-[180ms] ${ui.ghostBtn}`}
            >
              <HiMapPin className="h-4 w-4" aria-hidden />
              Command map
            </Link>
          </div>
        </header>

        {/* Province focus */}
        <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <HiMapPin className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
          <button
            type="button"
            onClick={() => setProvince("all")}
            className={[
              "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition duration-[180ms]",
              provinceFilter === "all"
                ? "bg-blue-600 text-white"
                : ui.chipIdle,
            ].join(" ")}
          >
            All provinces
          </button>
          {PROVINCES.map((province) => {
            const count = projects.filter((p) => p.province === province).length;
            return (
              <button
                key={province}
                type="button"
                onClick={() => setProvince(province)}
                className={[
                  "shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition duration-[180ms]",
                  provinceFilter === province
                    ? "bg-blue-600 text-white"
                    : ui.chipIdle,
                ].join(" ")}
              >
                {province}
                <span className="ml-1.5 opacity-70">{count}</span>
              </button>
            );
          })}
        </div>

        {/* 3 hero KPIs only */}
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {kpis.map((kpi) => {
            const Icon = kpi.icon;
            return (
              <div
                key={kpi.label}
                className={`rounded-xl border p-4 ${ui.card}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-xs font-medium ${ui.muted}`}>
                    {kpi.label}
                  </p>
                  <Icon className={`h-4 w-4 shrink-0 ${ui.muted}`} aria-hidden />
                </div>
                <p className={`mt-1.5 truncate text-xl font-semibold tabular-nums ${ui.value}`}>
                  {kpi.value}
                </p>
                <p className={`mt-1 text-[11px] ${ui.muted}`}>{kpi.hint}</p>
              </div>
            );
          })}
        </div>

        {/* Snapshot charts: collapsed by default */}
        <div className="mt-6">
          <button
            type="button"
            onClick={() => setChartsOpen((o) => !o)}
            className={`flex w-full min-h-11 items-center justify-between gap-3 rounded-xl border px-4 py-3 text-left transition duration-[180ms] ${ui.card} ${ui.cardHover}`}
            aria-expanded={chartsOpen}
          >
            <span className="flex items-center gap-2">
              <HiChartBar className={`h-4 w-4 ${ui.muted}`} aria-hidden />
              <span className={`text-sm font-semibold ${ui.heading}`}>
                Quick snapshot
              </span>
              <span className={`text-xs font-medium ${ui.muted}`}>
                PSTO · status · type
              </span>
            </span>
            {chartsOpen ? (
              <HiChevronUp className={`h-5 w-5 ${ui.soft}`} aria-hidden />
            ) : (
              <HiChevronDown className={`h-5 w-5 ${ui.soft}`} aria-hidden />
            )}
          </button>

          {chartsOpen ? (
            <div className="mt-3 space-y-3">
              <div className={`rounded-xl border p-4 ${ui.card}`}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className={`text-sm font-medium ${ui.heading}`}>
                    Projects per PSTO
                  </p>
                  <span className={`text-xs ${ui.muted}`}>Tap bar to focus</span>
                </div>
                <div className="space-y-2">
                  {byProvince.rows.map((row) => {
                    const active = provinceFilter === row.province;
                    const pct = Math.round((row.count / byProvince.max) * 100);
                    return (
                      <button
                        key={row.province}
                        type="button"
                        onClick={() =>
                          setProvince(active ? "all" : row.province)
                        }
                        className={[
                          "w-full rounded-lg border p-2.5 text-left transition duration-[180ms]",
                          active
                            ? "border-blue-500/50 bg-blue-600/10"
                            : `border-transparent ${ui.barHover}`,
                        ].join(" ")}
                      >
                        <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                          <span className={`font-medium ${ui.body}`}>
                            {row.province}
                          </span>
                          <span className={`shrink-0 ${ui.muted}`}>
                            <span className={`font-semibold ${ui.heading}`}>
                              {row.count}
                            </span>{" "}
                            · {formatCompact(row.budget)}
                          </span>
                        </div>
                        <div className={`h-2 overflow-hidden rounded-full ${ui.track}`}>
                          <div
                            className="h-full rounded-full bg-blue-500 transition-[width] duration-[320ms]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className={`rounded-xl border p-4 ${ui.card}`}>
                  <p className={`mb-3 text-sm font-medium ${ui.heading}`}>
                    By status
                    {provinceFilter === "all" ? "" : ` · ${provinceFilter}`}
                  </p>
                  <div className="space-y-2.5">
                    {byStatus.rows.length === 0 ? (
                      <p className="text-xs text-slate-500">No projects.</p>
                    ) : null}
                    {byStatus.rows.map((row) => {
                      const pct = Math.round((row.count / byStatus.max) * 100);
                      const sample = scopedProjects.find(
                        (p) => projectStatusLabel(p) === row.status,
                      );
                      const badgeClass = sample
                        ? projectStatusClass(sample)
                        : "bg-slate-800/80 text-slate-200 ring-slate-500/40";
                      return (
                        <button
                          key={row.status}
                          type="button"
                          onClick={() =>
                            setStatus(
                              statusFilter === row.status ? "all" : row.status,
                            )
                          }
                          className="w-full text-left"
                        >
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badgeClass}`}
                            >
                              {row.status}
                            </span>
                            <span className={`font-semibold ${ui.heading}`}>
                              {row.count}
                            </span>
                          </div>
                          <div className={`h-2 overflow-hidden rounded-full ${ui.track}`}>
                            <div
                              className="h-full rounded-full bg-blue-500/80"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className={`rounded-xl border p-4 ${ui.card}`}>
                  <p className={`mb-3 text-sm font-medium ${ui.heading}`}>
                    By type
                    {provinceFilter === "all" ? "" : ` · ${provinceFilter}`}
                  </p>
                  <div className="space-y-2.5">
                    {byType.rows.length === 0 ? (
                      <p className="text-xs text-slate-500">No projects.</p>
                    ) : null}
                    {byType.rows.map((row) => {
                      const pct = Math.round((row.count / byType.max) * 100);
                      return (
                        <div key={row.type}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className={`min-w-0 truncate font-medium ${ui.body}`}>
                              {row.type}
                            </span>
                            <span className={`shrink-0 ${ui.muted}`}>
                              <span className={`font-semibold ${ui.heading}`}>
                                {row.count}
                              </span>{" "}
                              · {formatCompact(row.budget)}
                            </span>
                          </div>
                          <div className={`h-2 overflow-hidden rounded-full ${ui.track}`}>
                            <div
                              className="h-full rounded-full bg-blue-500/80"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* List: filters + slim table */}
        <div className="mt-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <HiClipboardDocumentList
                  className={`h-4 w-4 ${ui.muted}`}
                  aria-hidden
                />
                <h2 className={`text-sm font-semibold ${ui.heading}`}>
                  Projects in {scopeLabel}
                </h2>
              </div>
              <p className={`mt-1 text-xs ${ui.muted}`}>
                {filteredProjects.length} shown
                {filteredProjects.length !== scopedProjects.length
                  ? ` of ${scopedProjects.length}`
                  : ""}{" "}
                · {formatPeso(totalCost)} total cost
              </p>
            </div>

            <label className="relative block w-full sm:max-w-xs">
              <span className="sr-only">Search projects</span>
              <HiMagnifyingGlass
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                aria-hidden
              />
              <input
                type="search"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search name, beneficiary…"
                className={`min-h-10 w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none transition duration-[180ms] ${ui.input}`}
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setStatus("all")}
              className={[
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition duration-[180ms]",
                statusFilter === "all"
                  ? ui.statusAllOn
                  : ui.statusAllOff,
              ].join(" ")}
            >
              All status
            </button>
            {statusOptions.map((status) => {
              const count = scopedProjects.filter(
                (p) => projectStatusLabel(p) === status,
              ).length;
              const sample = scopedProjects.find(
                (p) => projectStatusLabel(p) === status,
              );
              const badgeClass = sample
                ? projectStatusClass(sample)
                : ui.statusIdle;
              return (
                <button
                  key={status}
                  type="button"
                  onClick={() =>
                    setStatus(statusFilter === status ? "all" : status)
                  }
                  className={[
                    "rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition duration-[180ms]",
                    statusFilter === status ? badgeClass : ui.statusIdle,
                  ].join(" ")}
                >
                  {status}
                  <span className="ml-1 opacity-70">{count}</span>
                </button>
              );
            })}
          </div>

          <div className={`mt-3 overflow-x-auto rounded-xl border [-webkit-overflow-scrolling:touch] ${ui.card}`}>
            <table className="w-full min-w-[1400px] border-collapse text-left text-[12px]">
              <thead>
                <tr className={`border-b text-[11px] ${ui.theadBorder} ${ui.muted}`}>
                  <th className="px-2 py-3 font-medium">#</th>
                  <th className="px-2 py-3 font-medium">Code</th>
                  <th className="px-2 py-3 font-medium">Project</th>
                  <th className="px-2 py-3 font-medium">Type</th>
                  <th className="px-2 py-3 font-medium">Year Approved</th>
                  <th className="px-2 py-3 font-medium">Beneficiaries</th>
                  <th className="px-2 py-3 font-medium">Collaborators</th>
                  <th className="px-2 py-3 font-medium">Sector</th>
                  <th className="px-2 py-3 font-medium">Province</th>
                  <th className="px-2 py-3 font-medium">City</th>
                  <th className="px-2 py-3 font-medium">District</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 text-right font-medium">Project Cost</th>
                  <th className="px-2 py-3 text-right font-medium">Amount Due</th>
                  <th className="px-2 py-3 text-right font-medium">Refunded</th>
                  <th className="px-2 py-3 text-right font-medium">Refund Rate</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={16}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      No projects match these filters.
                    </td>
                  </tr>
                ) : null}
                {pageRows.map((project) => {
                  const statusLabel = projectStatusLabel(project);
                  const statusClass = projectStatusClass(project);
                  return (
                    <tr
                      key={project.id}
                      onClick={() => setViewing(project)}
                      className={`cursor-pointer border-b transition duration-[180ms] last:border-b-0 ${ui.rowBorder} ${ui.rowHover}`}
                    >
                      <td className={`whitespace-nowrap px-2 py-2 tabular-nums ${ui.muted}`}>
                        {project.row_number ?? "—"}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 font-mono text-[11px] ${ui.soft}`}>
                        {dash(project.code)}
                      </td>
                      <td className="max-w-[260px] px-2 py-2">
                        <p className={`font-medium line-clamp-2 ${ui.heading}`}>
                          {project.name}
                        </p>
                      </td>
                      <td className={`max-w-[140px] px-2 py-2 ${ui.soft}`}>
                        <span className="line-clamp-2">{projectType(project)}</span>
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 tabular-nums ${ui.body}`}>
                        {projectYear(project)}
                      </td>
                      <td className={`max-w-[160px] px-2 py-2 ${ui.body}`}>
                        <span className="line-clamp-2">{dash(project.beneficiary)}</span>
                      </td>
                      <td className={`max-w-[160px] px-2 py-2 ${ui.soft}`}>
                        <span className="line-clamp-2">
                          {dash(project.collaborators)}
                        </span>
                      </td>
                      <td className={`max-w-[140px] px-2 py-2 ${ui.soft}`}>
                        <span className="line-clamp-2">{dash(project.sector)}</span>
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 ${ui.body}`}>
                        {dash(project.province)}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 ${ui.body}`}>
                        {dash(project.municipality)}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 ${ui.soft}`}>
                        {dash(project.district)}
                      </td>
                      <td className="px-2 py-2">
                        <span
                          className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 text-right font-medium tabular-nums ${ui.heading}`}>
                        {formatMoneyOrDash(
                          project.budget > 0 ? project.budget : null,
                        )}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${ui.soft}`}>
                        {formatMoneyOrDash(project.amount_due)}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${ui.soft}`}>
                        {formatMoneyOrDash(project.refunded)}
                      </td>
                      <td className={`whitespace-nowrap px-2 py-2 text-right tabular-nums ${ui.soft}`}>
                        {formatRateOrDash(project.refund_rate)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredProjects.length > PAGE_SIZE ? (
            <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
              <p>
                Page {safePage} of {pageCount}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className={`min-h-9 rounded-lg border px-3 font-medium transition duration-[180ms] ${ui.pager}`}
                >
                  Prev
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
            </div>
          ) : null}
        </div>
      </div>

      {graphsOpen && (
        <div
          className="fixed inset-0 z-[1000] flex items-start justify-center bg-black/70 p-0 sm:p-4"
          onClick={() => setGraphsOpen(false)}
        >
          <div
            className={`max-h-[100vh] w-full max-w-5xl overflow-y-auto rounded-none border p-4 sm:max-h-[92vh] sm:rounded-xl sm:p-6 [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain] ${ui.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className={`text-xs font-medium ${ui.muted}`}>
                  Project summaries
                </p>
                <h2 className={`mt-1 text-lg font-semibold sm:text-xl ${ui.heading}`}>
                  Summary graphs · {scopeLabel}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setGraphsOpen(false)}
                className={`flex h-9 w-9 items-center justify-center rounded-lg transition duration-[180ms] ${ui.modalClose}`}
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <ProgramsGraphs
              projects={scopedProjects}
              scope={
                provinceFilter === "all"
                  ? "MIMAROPA (all provinces)"
                  : provinceFilter
              }
            />

            <p className={`mt-4 text-center text-xs ${ui.muted}`}>
              Information &amp; Monitoring of Projects, Services and S&amp;T
              Interventions · DOST-MIMAROPA
            </p>
          </div>
        </div>
      )}

      {viewing && (
        <div
          className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-xl border p-5 sm:rounded-xl [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain] ${ui.modal}`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className={`text-xs font-medium ${ui.muted}`}>
                  {dash(viewing.code)} · {viewing.province}
                </p>
                <h2 className={`mt-1 text-lg font-semibold leading-snug ${ui.heading}`}>
                  {viewing.name}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setViewing(null)}
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition duration-[180ms] ${ui.modalClose}`}
                aria-label="Close"
              >
                <HiXMark className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div>
                <dt className={`text-xs ${ui.muted}`}>Type</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {projectType(viewing)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>Year Approved</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {projectYear(viewing)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={`text-xs ${ui.muted}`}>Beneficiaries</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.beneficiary)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={`text-xs ${ui.muted}`}>Collaborators</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.collaborators)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={`text-xs ${ui.muted}`}>Sector</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.sector)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>Province</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.province)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>City</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.municipality)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>District</dt>
                <dd className={`mt-0.5 font-medium ${ui.heading}`}>
                  {dash(viewing.district)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${projectStatusClass(viewing)}`}
                  >
                    {projectStatusLabel(viewing)}
                  </span>
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={`text-xs ${ui.muted}`}>Project Cost</dt>
                <dd className={`mt-0.5 font-semibold tabular-nums ${ui.heading}`}>
                  {formatMoneyOrDash(viewing.budget || null)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>Amount Due</dt>
                <dd className={`mt-0.5 font-medium tabular-nums ${ui.heading}`}>
                  {formatMoneyOrDash(viewing.amount_due)}
                </dd>
              </div>
              <div>
                <dt className={`text-xs ${ui.muted}`}>Refunded</dt>
                <dd className={`mt-0.5 font-medium tabular-nums ${ui.heading}`}>
                  {formatMoneyOrDash(viewing.refunded)}
                </dd>
              </div>
              <div className="col-span-2">
                <dt className={`text-xs ${ui.muted}`}>Refund Rate</dt>
                <dd className={`mt-0.5 font-medium tabular-nums ${ui.heading}`}>
                  {formatRateOrDash(viewing.refund_rate)}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      )}
    </section>
    </>
  );
};

export default RegionPrograms;
