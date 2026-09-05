import { useEffect, useMemo, useState } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    HiArrowRightOnRectangle,
    HiChevronLeft,
    HiChevronRight,
    HiMagnifyingGlass,
    HiMapPin,
    HiArrowDownTray,
    HiArrowTopRightOnSquare,
    HiPaperAirplane,
    HiXMark,
} from 'react-icons/hi2';
import CommandMapWorkspace from '@/components/dashboard/CommandMapWorkspace';
import type { UserLocation } from '@/components/maps/mapTypes';
import {
    PROGRAM_META,
    PROVINCES,
    describeProject,
    formatPeso,
    projectImage,
    projectStatusClass,
    projectStatusLabel,
    projectType,
    projectYear,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

type PageProps = {
    projects?: TaraProject[];
};

const UI = {
    light: {
        page: 'bg-[#f4f6f9] text-slate-800',
        card: 'border-[#c5cdd8] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.05)]',
        cardHeader: 'border-[#dce1e8] bg-[#f8fafc]',
        heading: 'text-slate-600',
        muted: 'text-slate-500',
        ghostBtn:
            'border-[#c5cdd8] bg-white text-slate-700 hover:border-[#0038a8] hover:text-[#0038a8]',
        select: 'border-[#c5cdd8] bg-white text-slate-700 focus:border-[#0038a8] focus:ring-[#0038a8]/20',
        sortLabel: 'text-slate-600',
        thead: 'border-[#dce1e8] bg-white text-slate-500',
        rowBorder: 'border-[#eef1f5]',
        rowActive: 'bg-[#e8eef8]',
        rowHover: 'hover:bg-[#f4f7fb]',
        name: 'text-slate-900',
        program: 'text-[#0038a8]',
        location: 'text-slate-600',
        cost: 'text-slate-700',
        mobileBase: 'bg-white active:bg-slate-50',
        pagerBtn: 'border-[#c5cdd8] bg-white text-slate-700 hover:bg-slate-50',
        footer: 'border-[#002d87] bg-[#0038a8]',
        footerMuted: 'text-blue-100',
        footerLabel: 'text-blue-200',
        footerBottom: 'border-[#002d87] bg-[#002d87] text-blue-200',
        modalPanel: 'border-[#c5cdd8] bg-white',
        modalAccent: 'text-[#0038a8]',
        modalTitle: 'text-slate-900',
        modalClose:
            'border-[#c5cdd8] text-slate-500 hover:bg-slate-50 hover:text-slate-800',
        modalImg: 'border-[#dce1e8]',
        modalBody: 'text-slate-600',
        modalDt: 'text-slate-500',
        modalDd: 'text-slate-900',
        directions:
            'border-[#0038a8] bg-[#0038a8] text-white hover:bg-[#002d87]',
        locateBtn:
            'border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
        browseCta: 'border-white/20 bg-white/95 text-slate-800 hover:bg-white',
    },
    dark: {
        page: 'bg-slate-950 text-slate-200',
        card: 'border-slate-700 bg-slate-900/90 shadow-[0_2px_8px_rgba(0,0,0,0.25)]',
        cardHeader: 'border-slate-800 bg-slate-950/80',
        heading: 'text-slate-300',
        muted: 'text-slate-500',
        ghostBtn:
            'border-slate-600 bg-slate-900 text-slate-200 hover:border-blue-400 hover:text-blue-200',
        select: 'border-slate-600 bg-slate-950 text-slate-200 focus:border-blue-500 focus:ring-blue-500/30',
        sortLabel: 'text-slate-400',
        thead: 'border-slate-800 bg-slate-950 text-slate-500',
        rowBorder: 'border-slate-800',
        rowActive: 'bg-blue-950/50',
        rowHover: 'hover:bg-slate-800/60',
        name: 'text-white',
        program: 'text-blue-300',
        location: 'text-slate-400',
        cost: 'text-slate-200',
        mobileBase: 'bg-slate-900 active:bg-slate-800',
        pagerBtn: 'border-slate-600 bg-slate-900 text-slate-200 hover:bg-slate-800',
        footer: 'border-slate-800 bg-slate-950',
        footerMuted: 'text-slate-400',
        footerLabel: 'text-slate-500',
        footerBottom: 'border-slate-800 bg-black/40 text-slate-500',
        modalPanel: 'border-slate-700 bg-slate-900',
        modalAccent: 'text-blue-300',
        modalTitle: 'text-white',
        modalClose:
            'border-slate-600 text-slate-400 hover:bg-slate-800 hover:text-white',
        modalImg: 'border-slate-700',
        modalBody: 'text-slate-300',
        modalDt: 'text-slate-500',
        modalDd: 'text-white',
        directions: 'border-blue-500 bg-blue-600 text-white hover:bg-blue-500',
        locateBtn:
            'border-emerald-500/40 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25',
        browseCta:
            'border-slate-600 bg-slate-900/95 text-slate-100 hover:bg-slate-800',
    },
} as const satisfies Record<ThemeMode, Record<string, string>>;

type SortKey = 'name' | 'progress' | 'budget' | 'province';

const PAGE_SIZE = 12;

const SORT_OPTIONS: { id: SortKey; label: string }[] = [
    { id: 'name', label: 'Name A–Z' },
    { id: 'progress', label: 'Progress' },
    { id: 'budget', label: 'Budget' },
    { id: 'province', label: 'Province' },
];

const sortProjects = (list: TaraProject[], key: SortKey) => {
    const next = [...list];
    next.sort((a, b) => {
        if (key === 'progress') return b.progress - a.progress;
        if (key === 'budget') return b.budget - a.budget;
        if (key === 'province') {
            const byProv = a.province.localeCompare(b.province);
            return byProv !== 0 ? byProv : a.name.localeCompare(b.name);
        }
        return a.name.localeCompare(b.name);
    });
    return next;
};

const matchesQuery = (project: TaraProject, query: string) => {
    if (!query) return true;
    const haystack = [
        project.name,
        project.description,
        project.beneficiary,
        project.program,
        project.sector,
        project.province,
        project.municipality,
        project.barangay,
        project.partner_agency,
        project.status,
        project.status_label,
        projectType(project),
    ]
        .join(' ')
        .toLowerCase();
    return query
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
        .every((token) => haystack.includes(token));
};

type ExportScope = {
    province: Province | 'all';
    status: string | 'all';
    search: string;
};

const EXPORT_COLUMNS: { key: keyof TaraProject; label: string }[] = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Project' },
    { key: 'program', label: 'Program' },
    { key: 'sector', label: 'Sector' },
    { key: 'province', label: 'Province' },
    { key: 'municipality', label: 'Municipality' },
    { key: 'barangay', label: 'Barangay' },
    { key: 'status', label: 'Status' },
    { key: 'progress', label: 'Progress %' },
    { key: 'budget', label: 'Budget (PHP)' },
    { key: 'funding_source', label: 'Funding source' },
    { key: 'beneficiaries', label: 'Beneficiaries' },
    { key: 'beneficiary', label: 'Beneficiary' },
    { key: 'partner_agency', label: 'Partner agency' },
    { key: 'start_date', label: 'Start' },
    { key: 'end_date', label: 'End' },
    { key: 'latest_accomplishment', label: 'Latest accomplishment' },
];

const describeExportScope = (scope: ExportScope): string => {
    const parts: string[] = [];
    if (scope.province !== 'all') parts.push(`Province: ${scope.province}`);
    if (scope.status !== 'all') parts.push(`Status: ${scope.status}`);
    if (scope.search.trim()) parts.push(`Search: "${scope.search.trim()}"`);
    return parts.length ? parts.join(' · ') : 'All projects (no filters)';
};

const escapeCsv = (value: string | number): string => {
    const str = String(value ?? '');
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

const slugPart = (value: string) =>
    value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 40) || 'all';

const openGoogleDirections = (
    project: TaraProject,
    origin: UserLocation | null,
) => {
    const destination = `${project.latitude},${project.longitude}`;
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('destination', destination);
    url.searchParams.set('travelmode', 'driving');
    if (origin) {
        url.searchParams.set('origin', `${origin.lat},${origin.lng}`);
    }
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
};

/** Export currently filtered rows (search + province + status). */
const downloadFilteredCsv = (projects: TaraProject[], scope: ExportScope) => {
    const stamp = new Date();
    const meta = [
        'TARAMIMAROPA Public Project Export',
        `Generated: ${stamp.toLocaleString('en-PH')}`,
        `Scope: ${describeExportScope(scope)}`,
        `Projects: ${projects.length}`,
        '',
    ].map((line) => escapeCsv(line));

    const header = EXPORT_COLUMNS.map((c) => escapeCsv(c.label)).join(',');
    const rows = projects.map((p) =>
        EXPORT_COLUMNS.map((c) => {
            if (c.key === 'status') {
                return escapeCsv(projectStatusLabel(p));
            }
            return escapeCsv(p[c.key] as string | number);
        }).join(','),
    );

    const csv = [...meta, header, ...rows].join('\r\n');
    const blob = new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const provinceSlug =
        scope.province === 'all' ? 'mimaropa' : slugPart(scope.province);
    link.href = url;
    link.download = `tara-${provinceSlug}-${stamp.toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const LandingPage = () => {
    const { theme, isDark } = useTheme();
    const t = UI[theme];
    const { projects: serverProjects = [] } = usePage<PageProps>().props;
    const projects = serverProjects;

    const [query, setQuery] = useState('');
    const [provinceFilter, setProvinceFilter] = useState<Province | 'all'>(
        'all',
    );
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<TaraProject | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locating, setLocating] = useState(false);

    const statusMode = isDark ? 'dark' : 'light';

    const statusOptions = useMemo(() => {
        const labels = new Set<string>();
        for (const p of projects) {
            labels.add(projectStatusLabel(p));
        }
        return [...labels].sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const filtered = useMemo(
        () =>
            projects.filter(
                (p) =>
                    (provinceFilter === 'all' || p.province === provinceFilter) &&
                    (statusFilter === 'all' ||
                        projectStatusLabel(p) === statusFilter) &&
                    matchesQuery(p, query),
            ),
        [projects, provinceFilter, statusFilter, query],
    );

    const sorted = useMemo(
        () => sortProjects(filtered, sortKey),
        [filtered, sortKey],
    );

    const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const pageStart = sorted.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1;
    const pageEnd = Math.min(safePage * PAGE_SIZE, sorted.length);
    const pageItems = useMemo(
        () => sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
        [sorted, safePage],
    );

    useEffect(() => {
        setPage(1);
    }, [query, provinceFilter, statusFilter, sortKey]);

    const hasFilters =
        provinceFilter !== 'all' ||
        statusFilter !== 'all' ||
        query.trim().length > 0;

    const clearFilters = () => {
        setProvinceFilter('all');
        setStatusFilter('all');
        setQuery('');
    };

    const openProject = (project: TaraProject) => {
        setSelectedId(project.id);
        setViewing(project);
    };

    const locateMe = () => {
        if (!('geolocation' in navigator)) {
            return;
        }
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                setUserLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                });
                setLocating(false);
            },
            () => {
                setLocating(false);
            },
            { enableHighAccuracy: true, timeout: 10_000 },
        );
    };

    return (
        <div className={`min-h-svh ${t.page}`}>
            <div id="top" className="relative h-svh w-full">
                <CommandMapWorkspace
                    projects={projects}
                    variant="public"
                    loginHref="/login"
                    pageTitle="TARA PAMIMAROPA"
                    browseListHref="#project-results"
                />
            </div>

            <section
                id="project-results"
                className="mx-auto max-w-[96rem] scroll-mt-6 px-3 py-8 sm:px-5 lg:px-6"
            >
                <div className={`overflow-hidden rounded-2xl border ${t.card}`}>
                    <div
                        className={`flex flex-col gap-3 border-b px-3 py-4 sm:px-5 ${t.cardHeader}`}
                    >
                        <div className="flex flex-wrap items-end justify-between gap-3">
                            <div className="min-w-0">
                                <p className={`text-[11px] font-bold uppercase tracking-[0.14em] ${t.muted}`}>
                                    Full portfolio
                                </p>
                                <h2
                                    className={`mt-1 text-lg font-bold tracking-tight sm:text-xl ${t.name}`}
                                >
                                    Browse all projects
                                </h2>
                                <p className={`mt-1 text-[13px] ${t.muted}`}>
                                    {sorted.length === 0
                                        ? 'No projects match these filters.'
                                        : `Showing ${pageStart}–${pageEnd} of ${sorted.length.toLocaleString()}`}
                                    {hasFilters && sorted.length > 0
                                        ? ` · ${describeExportScope({
                                              province: provinceFilter,
                                              status: statusFilter,
                                              search: query,
                                          })}`
                                        : null}
                                </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <a
                                    href="#top"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        window.scrollTo({
                                            top: 0,
                                            behavior: 'smooth',
                                        });
                                    }}
                                    className={`inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[12px] font-semibold transition duration-[180ms] ${t.ghostBtn}`}
                                >
                                    <HiMapPin
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                    Back to map
                                </a>
                                <button
                                    type="button"
                                    disabled={sorted.length === 0}
                                    onClick={() =>
                                        downloadFilteredCsv(sorted, {
                                            province: provinceFilter,
                                            status: statusFilter,
                                            search: query,
                                        })
                                    }
                                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[#0038a8] bg-[#0038a8] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition duration-[180ms] hover:bg-[#002d87] disabled:cursor-not-allowed disabled:opacity-40"
                                    title={
                                        sorted.length === 0
                                            ? 'No rows to export'
                                            : `Export ${sorted.length} project${sorted.length === 1 ? '' : 's'} matching current filters`
                                    }
                                >
                                    <HiArrowDownTray
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                    Export CSV
                                    {sorted.length > 0 ? (
                                        <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] tabular-nums">
                                            {sorted.length}
                                        </span>
                                    ) : null}
                                </button>
                                <label
                                    className={`inline-flex items-center gap-2 text-[12px] ${t.sortLabel}`}
                                >
                                    <span className="font-semibold">Sort</span>
                                    <select
                                        value={sortKey}
                                        onChange={(e) =>
                                            setSortKey(
                                                e.target.value as SortKey,
                                            )
                                        }
                                        className={`min-h-9 rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold outline-none transition duration-[180ms] focus:ring-2 ${t.select}`}
                                    >
                                        {SORT_OPTIONS.map((opt) => (
                                            <option
                                                key={opt.id}
                                                value={opt.id}
                                            >
                                                {opt.label}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2.5 border-t border-dashed border-slate-200/80 pt-3 dark:border-slate-700/80">
                            <div className="relative max-w-md">
                                <HiMagnifyingGlass
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden
                                />
                                <input
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search project, LGU, sector…"
                                    className={`min-h-10 w-full rounded-lg border py-2 pl-9 pr-3 text-sm outline-none ${t.select}`}
                                />
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setProvinceFilter('all')}
                                    className={[
                                        'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                                        provinceFilter === 'all'
                                            ? 'bg-[#0038a8] text-white'
                                            : t.ghostBtn,
                                    ].join(' ')}
                                >
                                    All provinces
                                </button>
                                {PROVINCES.map((province) => (
                                    <button
                                        key={province}
                                        type="button"
                                        onClick={() =>
                                            setProvinceFilter(
                                                provinceFilter === province
                                                    ? 'all'
                                                    : province,
                                            )
                                        }
                                        className={[
                                            'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                                            provinceFilter === province
                                                ? 'bg-[#0038a8] text-white'
                                                : t.ghostBtn,
                                        ].join(' ')}
                                    >
                                        {province}
                                    </button>
                                ))}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                    type="button"
                                    onClick={() => setStatusFilter('all')}
                                    className={[
                                        'rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                                        statusFilter === 'all'
                                            ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                                            : t.ghostBtn,
                                    ].join(' ')}
                                >
                                    All status
                                </button>
                                {statusOptions.map((status) => {
                                    const sample = projects.find(
                                        (p) =>
                                            projectStatusLabel(p) === status,
                                    );
                                    const badgeClass = sample
                                        ? projectStatusClass(sample, statusMode)
                                        : t.ghostBtn;
                                    return (
                                    <button
                                        key={status}
                                        type="button"
                                        onClick={() =>
                                            setStatusFilter(
                                                statusFilter === status
                                                    ? 'all'
                                                    : status,
                                            )
                                        }
                                        className={[
                                            'rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 transition',
                                            statusFilter === status
                                                ? badgeClass
                                                : t.ghostBtn,
                                        ].join(' ')}
                                    >
                                        {status}
                                    </button>
                                    );
                                })}
                                {hasFilters ? (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className={`ml-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${t.muted} underline-offset-2 hover:underline`}
                                    >
                                        Clear filters
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {sorted.length === 0 ? (
                        <p className={`p-8 text-center text-sm ${t.muted}`}>
                            No projects match your search or filters.
                        </p>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                                    <thead>
                                        <tr
                                            className={`border-b text-[11px] uppercase tracking-wide ${t.thead}`}
                                        >
                                            <th className="px-4 py-2.5 font-semibold">
                                                Project
                                            </th>
                                            <th className="px-3 py-2.5 font-semibold">
                                                Program
                                            </th>
                                            <th className="px-3 py-2.5 font-semibold">
                                                Location
                                            </th>
                                            <th className="px-3 py-2.5 font-semibold">
                                                Status
                                            </th>
                                            <th className="px-4 py-2.5 font-semibold">
                                                Budget
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((project) => {
                                            const statusLabel =
                                                projectStatusLabel(project);
                                            const statusClass =
                                                projectStatusClass(
                                                    project,
                                                    statusMode,
                                                );
                                            const active =
                                                selectedId === project.id;
                                            return (
                                                <tr
                                                    key={project.id}
                                                    onClick={() =>
                                                        openProject(project)
                                                    }
                                                    onKeyDown={(e) => {
                                                        if (
                                                            e.key === 'Enter' ||
                                                            e.key === ' '
                                                        ) {
                                                            e.preventDefault();
                                                            openProject(
                                                                project,
                                                            );
                                                        }
                                                    }}
                                                    tabIndex={0}
                                                    role="button"
                                                    className={[
                                                        'cursor-pointer border-b transition duration-[180ms] last:border-b-0',
                                                        t.rowBorder,
                                                        active
                                                            ? t.rowActive
                                                            : t.rowHover,
                                                    ].join(' ')}
                                                >
                                                    <td className="max-w-[280px] px-4 py-3">
                                                        <p
                                                            className={`truncate font-semibold ${t.name}`}
                                                        >
                                                            {project.name}
                                                        </p>
                                                        <p
                                                            className={`mt-0.5 truncate text-[11px] ${t.muted}`}
                                                        >
                                                            {
                                                                project.beneficiary
                                                            }
                                                        </p>
                                                    </td>
                                                    <td
                                                        className={`px-3 py-3 font-medium ${t.program}`}
                                                    >
                                                        {project.program}
                                                    </td>
                                                    <td
                                                        className={`px-3 py-3 ${t.location}`}
                                                    >
                                                        <span className="block truncate">
                                                            {
                                                                project.municipality
                                                            }
                                                        </span>
                                                        <span
                                                            className={`block text-[11px] ${t.muted}`}
                                                        >
                                                            {project.province}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                                                        >
                                                            {statusLabel}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`whitespace-nowrap px-4 py-3 tabular-nums ${t.cost}`}
                                                    >
                                                        {formatPeso(
                                                            project.budget,
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <ul className={`divide-y md:hidden ${t.rowBorder}`}>
                                {pageItems.map((project) => {
                                    const statusLabel =
                                        projectStatusLabel(project);
                                    const statusClass = projectStatusClass(
                                        project,
                                        statusMode,
                                    );
                                    const active = selectedId === project.id;
                                    return (
                                        <li key={project.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openProject(project)
                                                }
                                                className={[
                                                    'flex w-full flex-col gap-1.5 px-3 py-3 text-left transition duration-[180ms]',
                                                    active
                                                        ? t.rowActive
                                                        : t.mobileBase,
                                                ].join(' ')}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <p
                                                        className={`min-w-0 text-[13px] font-semibold leading-snug ${t.name}`}
                                                    >
                                                        {project.name}
                                                    </p>
                                                    <span
                                                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                                                    >
                                                        {statusLabel}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`text-[11px] ${t.muted}`}
                                                >
                                                    <span
                                                        className={`font-medium ${t.program}`}
                                                    >
                                                        {project.program}
                                                    </span>{' '}
                                                    · {project.municipality},{' '}
                                                    {project.province}
                                                </p>
                                                <p
                                                    className={`text-[11px] tabular-nums ${t.muted}`}
                                                >
                                                    {formatPeso(project.budget)}
                                                </p>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            {totalPages > 1 && (
                                <div
                                    className={`flex flex-wrap items-center justify-between gap-2 border-t px-3 py-3 sm:px-4 ${t.cardHeader}`}
                                >
                                    <p className={`text-[12px] ${t.muted}`}>
                                        Page {safePage} of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-1.5">
                                        <button
                                            type="button"
                                            disabled={safePage <= 1}
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.max(1, p - 1),
                                                )
                                            }
                                            className={`inline-flex min-h-9 items-center gap-1 rounded-[6px] border px-3 py-1.5 text-[12px] font-semibold transition duration-[180ms] disabled:cursor-not-allowed disabled:opacity-40 ${t.pagerBtn}`}
                                        >
                                            <HiChevronLeft
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            Prev
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safePage >= totalPages}
                                            onClick={() =>
                                                setPage((p) =>
                                                    Math.min(totalPages, p + 1),
                                                )
                                            }
                                            className={`inline-flex min-h-9 items-center gap-1 rounded-[6px] border px-3 py-1.5 text-[12px] font-semibold transition duration-[180ms] disabled:cursor-not-allowed disabled:opacity-40 ${t.pagerBtn}`}
                                        >
                                            Next
                                            <HiChevronRight
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </section>

            <footer className={`border-t ${t.footer}`}>
                <div className="mx-auto grid max-w-6xl gap-6 px-4 py-10 sm:grid-cols-3 sm:px-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 place-items-center rounded-[8px] bg-white text-sm font-black text-[#0038a8]">
                                T
                            </span>
                            <p className="text-sm font-black text-white">
                                TARAMIMAROPA
                            </p>
                        </div>
                        <p
                            className={`mt-3 text-[12px] leading-relaxed ${t.footerMuted}`}
                        >
                            Tracking of Accomplishments and Results of
                            Activities and Programs across MIMAROPA. A
                            transparency initiative of DOST-MIMAROPA.
                        </p>
                    </div>
                    <div>
                        <p
                            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${t.footerLabel}`}
                        >
                            Provinces
                        </p>
                        <ul
                            className={`mt-3 space-y-1.5 text-[12px] ${t.footerMuted}`}
                        >
                            {PROVINCES.map((province) => (
                                <li key={province}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProvinceFilter(province);
                                            window.scrollTo({
                                                top: 0,
                                                behavior: 'smooth',
                                            });
                                        }}
                                        className="transition duration-[180ms] hover:text-white"
                                    >
                                        {province}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div>
                        <p
                            className={`text-[11px] font-bold uppercase tracking-[0.14em] ${t.footerLabel}`}
                        >
                            Agency
                        </p>
                        <p
                            className={`mt-3 text-[12px] leading-relaxed ${t.footerMuted}`}
                        >
                            Department of Science and Technology
                            <br />
                            MIMAROPA Regional Office
                            <br />
                            Republic of the Philippines
                        </p>
                        <Link
                            href="/login"
                            className="mt-3 inline-flex items-center gap-2 text-[12px] font-semibold text-white transition duration-[180ms] hover:text-amber-200"
                        >
                            <HiArrowRightOnRectangle
                                className="h-4 w-4"
                                aria-hidden
                            />
                            Staff login
                        </Link>
                    </div>
                </div>
                <div
                    className={`border-t py-4 text-center text-[11px] ${t.footerBottom}`}
                >
                    © {new Date().getFullYear()} DOST-MIMAROPA · All rights
                    reserved · Powered by TARAMIMAROPA
                </div>
            </footer>

            {viewing && (
                <div
                    className="fixed inset-0 z-[1000] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
                    onClick={() => setViewing(null)}
                >
                    <div
                        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[14px] border p-5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] sm:rounded-[14px] [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain] ${t.modalPanel}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p
                                    className={`text-[11px] font-bold uppercase tracking-[0.14em] ${t.modalAccent}`}
                                >
                                    {PROGRAM_META[viewing.program].short} ·{' '}
                                    {viewing.province}
                                </p>
                                <h2
                                    className={`mt-1 text-lg font-semibold leading-snug ${t.modalTitle}`}
                                >
                                    {viewing.name}
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={() => setViewing(null)}
                                className={`rounded-[6px] border p-2 transition duration-[180ms] ${t.modalClose}`}
                                aria-label="Close"
                            >
                                <HiXMark className="h-5 w-5" aria-hidden />
                            </button>
                        </div>

                        <img
                            src={viewing.photo_url || projectImage(viewing.id)}
                            alt={viewing.name}
                            loading="lazy"
                            className={`mt-3 h-44 w-full rounded-[10px] border object-cover ${t.modalImg}`}
                        />

                        <p
                            className={`mt-3 text-[10px] font-bold uppercase tracking-[0.14em] ${t.modalDt}`}
                        >
                            Project description
                        </p>
                        <p
                            className={`mt-1 text-sm leading-relaxed ${t.modalBody}`}
                        >
                            {describeProject(viewing)}
                        </p>

                        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Type
                                </dt>
                                <dd
                                    className={`mt-0.5 font-semibold ${t.modalDd}`}
                                >
                                    {projectType(viewing)}
                                </dd>
                            </div>
                            <div>
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Year
                                </dt>
                                <dd
                                    className={`mt-0.5 font-semibold ${t.modalDd}`}
                                >
                                    {projectYear(viewing)}
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Beneficiary
                                </dt>
                                <dd
                                    className={`mt-0.5 font-semibold ${t.modalDd}`}
                                >
                                    {viewing.beneficiary}
                                </dd>
                            </div>
                            <div>
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Municipality
                                </dt>
                                <dd
                                    className={`mt-0.5 font-semibold ${t.modalDd}`}
                                >
                                    {viewing.municipality}
                                </dd>
                            </div>
                            <div>
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Status
                                </dt>
                                <dd className="mt-0.5">
                                    <span
                                        className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${projectStatusClass(viewing, statusMode)}`}
                                    >
                                        {projectStatusLabel(viewing)} ·{' '}
                                        {viewing.progress}%
                                    </span>
                                </dd>
                            </div>
                            <div className="col-span-2">
                                <dt
                                    className={`text-[11px] uppercase tracking-wide ${t.modalDt}`}
                                >
                                    Beneficiaries reached
                                </dt>
                                <dd
                                    className={`mt-0.5 font-semibold ${t.modalDd}`}
                                >
                                    {viewing.beneficiaries.toLocaleString()}
                                </dd>
                            </div>
                        </dl>

                        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                            <button
                                type="button"
                                onClick={() =>
                                    openGoogleDirections(
                                        viewing,
                                        userLocation,
                                    )
                                }
                                className={`inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-semibold shadow-[0_2px_8px_rgba(0,56,168,0.2)] transition duration-[180ms] ${t.directions}`}
                            >
                                <HiPaperAirplane
                                    className="h-5 w-5"
                                    aria-hidden
                                />
                                Google Maps directions
                                <HiArrowTopRightOnSquare
                                    className="h-4 w-4 opacity-80"
                                    aria-hidden
                                />
                            </button>
                            {!userLocation ? (
                                <button
                                    type="button"
                                    onClick={locateMe}
                                    disabled={locating}
                                    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] border px-4 py-3 text-sm font-semibold transition duration-[180ms] disabled:opacity-50 ${t.locateBtn}`}
                                >
                                    <HiMapPin className="h-5 w-5" aria-hidden />
                                    {locating
                                        ? 'Locating…'
                                        : 'Use my location'}
                                </button>
                            ) : null}
                        </div>
                        <p
                            className={`mt-2 text-[11px] leading-relaxed ${t.muted}`}
                        >
                            {userLocation
                                ? 'Route starts from your current GPS position.'
                                : 'Opens Google Maps to this project. Tap Use my location first for a full driving route from where you are.'}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
