import { useEffect, useMemo, useRef, useState } from 'react';
import { usePage } from '@inertiajs/react';
import {
    HiChevronLeft,
    HiChevronRight,
    HiMagnifyingGlass,
    HiMapPin,
    HiArrowDownTray,
    HiArrowTopRightOnSquare,
    HiDocumentText,
    HiPaperAirplane,
    HiXMark,
} from 'react-icons/hi2';
import CommandMapWorkspace from '@/components/dashboard/CommandMapWorkspace';
import type { UserLocation } from '@/components/maps/mapTypes';
import {
    PROGRAM_META,
    PROVINCES,
    describeProject,
    formatCompact,
    formatPeso,
    programColor,
    projectImage,
    projectStatusClass,
    projectStatusLabel,
    projectType,
    projectTypeLabel,
    projectTypeOptions,
    projectYear,
    summarizeProjects,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import {
    useDashboardProjectStream,
    type ProjectStreamMeta,
} from '@/hooks/use-dashboard-project-stream';
import { downloadProjectPdfReport } from '@/lib/project-print-report';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

type PageProps = {
    projects?: TaraProject[];
    projectStream?: ProjectStreamMeta | null;
};

const UI = {
    light: {
        page: 'bg-[#f4f6f9] text-slate-800',
        card: 'border-[#c5cdd8] bg-white',
        cardHeader: 'border-[#dce1e8] bg-[#f8fafc]',
        eyebrow: 'text-[#0038a8]',
        muted: 'text-slate-500',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0038a8]/40 focus-visible:ring-offset-1 focus-visible:ring-offset-white',
        ghostBtn:
            'border-[#c5cdd8] bg-white text-slate-700 hover:border-[#0038a8] hover:text-[#0038a8] active:bg-slate-50',
        primaryBtn:
            'border-[#0038a8] bg-[#0038a8] text-white hover:bg-[#002d87] active:bg-[#00246d]',
        groupDivider: 'border-[#c5cdd8]',
        chip: 'border-[#c5cdd8] bg-white text-slate-700 hover:border-[#0038a8] hover:text-[#0038a8]',
        chipActive: 'border-[#0038a8] bg-[#0038a8] text-white',
        field: 'border-[#c5cdd8] bg-white text-slate-800 placeholder:text-slate-400 focus:border-[#0038a8] focus:ring-2 focus:ring-[#0038a8]/20',
        laneLabel: 'text-slate-500',
        thead: 'border-[#dce1e8] bg-[#f8fafc] text-slate-500',
        rowBorder: 'border-[#eef1f5]',
        rowActive: 'bg-[#e8eef8]',
        rowHover: 'hover:bg-[#f4f7fb]',
        name: 'text-slate-900',
        location: 'text-slate-700',
        cost: 'text-slate-900',
        track: 'bg-slate-200',
        mobileBase: 'bg-white active:bg-slate-50',
        emptyIcon: 'bg-slate-100 text-slate-400',
        footer: 'border-[#002d87] bg-[#0038a8]',
        footerMuted: 'text-blue-100',
        footerLabel: 'text-blue-200',
        footerLink: 'text-blue-100 hover:text-white',
        footerBottom: 'border-[#002d87] bg-[#002d87] text-blue-200',
        scrim: 'bg-slate-900/50',
        modalPanel: 'border-[#c5cdd8] bg-white',
        modalTitle: 'text-slate-900',
        modalClose:
            'border-[#c5cdd8] text-slate-500 hover:bg-slate-50 hover:text-slate-800',
        modalImg: 'border-[#dce1e8] bg-slate-100',
        modalBody: 'text-slate-600',
        modalDt: 'text-slate-500',
        modalDd: 'text-slate-900',
        modalFacts: 'border-[#dce1e8] bg-[#f8fafc]',
        kpiCard: 'border-[#dce1e8] bg-white',
        kpiFeature: 'border-[#0038a8] bg-[#0038a8] text-white',
        kpiFeatureMuted: 'text-blue-100',
        bar: 'bg-[#0038a8]',
        rowBtn: 'hover:bg-[#f4f7fb]',
    },
    dark: {
        page: 'bg-slate-950 text-slate-200',
        card: 'border-slate-800 bg-slate-900',
        cardHeader: 'border-slate-800 bg-slate-950/60',
        eyebrow: 'text-blue-300',
        muted: 'text-slate-400',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 focus-visible:ring-offset-slate-900',
        ghostBtn:
            'border-slate-700 bg-slate-900 text-slate-200 hover:border-blue-400 hover:text-blue-200 active:bg-slate-800',
        primaryBtn:
            'border-blue-500 bg-blue-600 text-white hover:bg-blue-500 active:bg-blue-700',
        groupDivider: 'border-slate-700',
        chip: 'border-slate-700 bg-slate-900 text-slate-300 hover:border-blue-400 hover:text-blue-200',
        chipActive: 'border-blue-500 bg-blue-600 text-white',
        field: 'border-slate-700 bg-slate-950 text-slate-100 placeholder:text-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30',
        laneLabel: 'text-slate-500',
        thead: 'border-slate-800 bg-slate-950/60 text-slate-400',
        rowBorder: 'border-slate-800',
        rowActive: 'bg-blue-950/50',
        rowHover: 'hover:bg-slate-800/60',
        name: 'text-white',
        location: 'text-slate-300',
        cost: 'text-slate-100',
        track: 'bg-slate-800',
        mobileBase: 'bg-slate-900 active:bg-slate-800',
        emptyIcon: 'bg-slate-800 text-slate-500',
        footer: 'border-slate-800 bg-slate-950',
        footerMuted: 'text-slate-400',
        footerLabel: 'text-slate-500',
        footerLink: 'text-slate-400 hover:text-white',
        footerBottom: 'border-slate-800 bg-black/40 text-slate-500',
        scrim: 'bg-slate-950/70',
        modalPanel: 'border-slate-700 bg-slate-900',
        modalTitle: 'text-white',
        modalClose:
            'border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white',
        modalImg: 'border-slate-700 bg-slate-800',
        modalBody: 'text-slate-300',
        modalDt: 'text-slate-400',
        modalDd: 'text-white',
        modalFacts: 'border-slate-800 bg-slate-950/60',
        kpiCard: 'border-slate-800 bg-slate-900',
        kpiFeature: 'border-blue-500/50 bg-blue-600 text-white',
        kpiFeatureMuted: 'text-blue-100',
        bar: 'bg-blue-400',
        rowBtn: 'hover:bg-slate-800/60',
    },
} as const satisfies Record<ThemeMode, Record<string, string>>;

const BTN_BASE =
    'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border px-3.5 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-40';

const CHIP_BASE =
    'inline-flex min-h-9 items-center rounded-full border px-3 text-xs font-semibold transition-colors duration-150';

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
    type: string | 'all';
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
    if (scope.type !== 'all') parts.push(`Type: ${scope.type}`);
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

/** Export currently filtered rows (search + province + type + status). */
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

/** PDF download for currently filtered rows (no popup). */
const downloadFilteredPdf = (
    projects: TaraProject[],
    scope: ExportScope,
): void => {
    const provinceSlug =
        scope.province === 'all' ? 'mimaropa' : slugPart(scope.province);
    downloadProjectPdfReport(projects, {
        label: describeExportScope(scope),
        fileStem: `tara-${provinceSlug}-${new Date().toISOString().slice(0, 10)}`,
    });
};

const clampProgress = (value: number) =>
    Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));

const LandingPage = () => {
    const { theme, isDark } = useTheme();
    const t = UI[theme];
    const { projects: serverProjects = [], projectStream = null } =
        usePage<PageProps>().props;
    const { projects } = useDashboardProjectStream(
        serverProjects,
        projectStream,
    );

    const [query, setQuery] = useState('');
    const [provinceFilter, setProvinceFilter] = useState<Province | 'all'>(
        'all',
    );
    const [typeFilter, setTypeFilter] = useState<string | 'all'>('all');
    const [statusFilter, setStatusFilter] = useState<string | 'all'>('all');
    const [sortKey, setSortKey] = useState<SortKey>('name');
    const [page, setPage] = useState(1);
    const [viewing, setViewing] = useState<TaraProject | null>(null);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [locating, setLocating] = useState(false);
    const [exportError, setExportError] = useState('');

    const resultsRef = useRef<HTMLElement | null>(null);
    const closeBtnRef = useRef<HTMLButtonElement | null>(null);
    const returnFocusRef = useRef<HTMLElement | null>(null);

    const statusMode = isDark ? 'dark' : 'light';

    const overview = useMemo(() => summarizeProjects(projects), [projects]);

    const provinceStats = useMemo(() => {
        const rows = PROVINCES.map((province) => {
            const inProvince = projects.filter((p) => p.province === province);
            return {
                province,
                count: inProvince.length,
                budget: inProvince.reduce((sum, p) => sum + p.budget, 0),
            };
        });
        const maxCount = Math.max(1, ...rows.map((r) => r.count));
        return rows
            .map((r) => ({ ...r, share: r.count / maxCount }))
            .sort((a, b) => b.count - a.count);
    }, [projects]);

    const completionRate =
        overview.total > 0
            ? Math.round((overview.completed / overview.total) * 100)
            : 0;

    const statusOptions = useMemo(() => {
        const labels = new Set<string>();
        for (const p of projects) {
            labels.add(projectStatusLabel(p));
        }
        return [...labels].sort((a, b) => a.localeCompare(b));
    }, [projects]);

    const typeOptions = useMemo(() => projectTypeOptions(projects), [projects]);

    const filtered = useMemo(
        () =>
            projects.filter(
                (p) =>
                    (provinceFilter === 'all' || p.province === provinceFilter) &&
                    (typeFilter === 'all' ||
                        projectTypeLabel(p) === typeFilter) &&
                    (statusFilter === 'all' ||
                        projectStatusLabel(p) === statusFilter) &&
                    matchesQuery(p, query),
            ),
        [projects, provinceFilter, typeFilter, statusFilter, query],
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
    }, [query, provinceFilter, typeFilter, statusFilter, sortKey]);

    const isViewing = viewing !== null;

    useEffect(() => {
        if (!isViewing) return;
        returnFocusRef.current = document.activeElement as HTMLElement | null;
        closeBtnRef.current?.focus();
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setViewing(null);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            returnFocusRef.current?.focus();
        };
    }, [isViewing]);

    const hasFilters =
        provinceFilter !== 'all' ||
        typeFilter !== 'all' ||
        statusFilter !== 'all' ||
        query.trim().length > 0;

    const exportScope: ExportScope = {
        province: provinceFilter,
        type: typeFilter,
        status: statusFilter,
        search: query,
    };

    const clearFilters = () => {
        setProvinceFilter('all');
        setTypeFilter('all');
        setStatusFilter('all');
        setQuery('');
    };

    const scrollToResults = () => {
        resultsRef.current?.scrollIntoView({
            behavior: 'smooth',
            block: 'start',
        });
    };

    const goToPage = (next: number) => {
        setPage(Math.min(totalPages, Math.max(1, next)));
        scrollToResults();
    };

    const openProject = (project: TaraProject) => {
        setSelectedId(project.id);
        setViewing(project);
    };

    const exportPdf = () => {
        setExportError('');
        try {
            downloadFilteredPdf(sorted, exportScope);
        } catch {
            setExportError(
                'Could not generate the PDF. Try again or export CSV instead.',
            );
        }
    };

    const exportCsv = () => {
        setExportError('');
        downloadFilteredCsv(sorted, exportScope);
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

    const exportTitle =
        sorted.length === 0
            ? 'No projects to export'
            : `${sorted.length.toLocaleString()} project${sorted.length === 1 ? '' : 's'} matching current filters`;

    return (
        <div className={`min-h-svh ${t.page}`}>
            <div id="top" className="relative h-svh w-full">
                <CommandMapWorkspace
                    projects={projects}
                    variant="public"
                    pageTitle="TARA PAMIMAROPA"
                    browseListHref="#project-results"
                />
            </div>

            <section
                aria-labelledby="overview-title"
                className="mx-auto max-w-[96rem] px-3 pt-12 sm:px-6 lg:px-8"
            >
                <p
                    className={`text-xs font-bold uppercase tracking-[0.14em] ${t.eyebrow}`}
                >
                    Regional overview
                </p>
                <h2
                    id="overview-title"
                    className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${t.name}`}
                >
                    MIMAROPA at a glance
                </h2>
                <p className={`mt-1.5 max-w-2xl text-sm ${t.muted}`}>
                    DOST-MIMAROPA projects across five provinces, updated as
                    offices report progress.
                </p>

                <div className="mt-6 grid gap-4 lg:grid-cols-12">
                    <dl className="grid grid-cols-2 gap-4 lg:col-span-7">
                        <div
                            className={`col-span-2 rounded-2xl border p-5 sm:col-span-1 ${t.kpiFeature}`}
                        >
                            <dt
                                className={`text-sm font-medium ${t.kpiFeatureMuted}`}
                            >
                                Total investment
                            </dt>
                            <dd className="mt-2 text-3xl font-bold tracking-tight tabular-nums sm:text-4xl">
                                ₱{formatCompact(overview.funding)}
                            </dd>
                            <dd
                                className={`mt-1 text-xs ${t.kpiFeatureMuted}`}
                            >
                                {formatPeso(overview.funding)} in approved
                                project cost
                            </dd>
                        </div>
                        {(
                            [
                                [
                                    'Projects',
                                    overview.total.toLocaleString(),
                                    `${overview.active.toLocaleString()} currently active`,
                                ],
                                overview.beneficiaries > 0
                                    ? [
                                          'Beneficiaries reached',
                                          formatCompact(overview.beneficiaries),
                                          `${overview.partners.toLocaleString()} partner organizations`,
                                      ]
                                    : [
                                          'Municipalities reached',
                                          overview.municipalities.toLocaleString(),
                                          `${overview.partners.toLocaleString()} partner organizations`,
                                      ],
                                [
                                    'Completion rate',
                                    `${completionRate}%`,
                                    `${overview.completed.toLocaleString()} of ${overview.total.toLocaleString()} completed`,
                                ],
                            ] as const
                        ).map(([label, value, sub], index) => (
                            <div
                                key={label}
                                className={`rounded-2xl border p-5 ${index === 2 ? 'col-span-2 sm:col-span-1' : ''} ${t.kpiCard}`}
                            >
                                <dt className={`text-sm font-medium ${t.muted}`}>
                                    {label}
                                </dt>
                                <dd
                                    className={`mt-2 text-3xl font-bold tracking-tight tabular-nums ${t.name}`}
                                >
                                    {value}
                                </dd>
                                <dd className={`mt-1 text-xs ${t.muted}`}>
                                    {sub}
                                </dd>
                            </div>
                        ))}
                    </dl>

                    <div
                        className={`rounded-2xl border p-5 lg:col-span-5 ${t.kpiCard}`}
                    >
                        <div className="flex items-baseline justify-between gap-3">
                            <h3 className={`text-base font-semibold ${t.name}`}>
                                Projects by province
                            </h3>
                            <p className={`text-xs ${t.muted}`}>
                                Select to filter the list
                            </p>
                        </div>
                        <ul className="mt-4 space-y-1">
                            {provinceStats.map((row) => {
                                const active = provinceFilter === row.province;
                                return (
                                    <li key={row.province}>
                                        <button
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() => {
                                                setProvinceFilter(row.province);
                                                scrollToResults();
                                            }}
                                            className={`grid w-full grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150 ${active ? t.rowActive : t.rowBtn} ${t.focus}`}
                                        >
                                            <span
                                                className={`truncate text-sm font-semibold ${t.name}`}
                                            >
                                                {row.province}
                                            </span>
                                            <span
                                                className={`h-2 overflow-hidden rounded-full ${t.track}`}
                                                aria-hidden
                                            >
                                                <span
                                                    className={`block h-full rounded-full ${t.bar}`}
                                                    style={{
                                                        width: `${Math.max(4, row.share * 100)}%`,
                                                    }}
                                                />
                                            </span>
                                            <span className="text-right">
                                                <span
                                                    className={`block text-sm font-semibold tabular-nums ${t.name}`}
                                                >
                                                    {row.count.toLocaleString()}
                                                </span>
                                                <span
                                                    className={`block text-xs tabular-nums ${t.muted}`}
                                                >
                                                    ₱{formatCompact(row.budget)}
                                                </span>
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                </div>
            </section>

            <section
                id="project-results"
                ref={resultsRef}
                aria-labelledby="project-results-title"
                className="mx-auto max-w-[96rem] scroll-mt-6 px-3 py-10 sm:px-6 lg:px-8"
            >
                <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p
                            className={`text-xs font-bold uppercase tracking-[0.14em] ${t.eyebrow}`}
                        >
                            Full portfolio
                        </p>
                        <h2
                            id="project-results-title"
                            className={`mt-1 text-2xl font-bold tracking-tight sm:text-3xl ${t.name}`}
                        >
                            Browse all projects
                        </h2>
                        <p
                            className={`mt-1.5 text-sm ${t.muted}`}
                            aria-live="polite"
                        >
                            {sorted.length === 0
                                ? 'No projects match these filters.'
                                : `Showing ${pageStart}–${pageEnd} of ${sorted.length.toLocaleString()} projects`}
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <a
                            href="#top"
                            onClick={(e) => {
                                e.preventDefault();
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className={`${BTN_BASE} ${t.ghostBtn} ${t.focus}`}
                        >
                            <HiMapPin className="h-4 w-4" aria-hidden />
                            Back to map
                        </a>
                        <div
                            role="group"
                            aria-label="Export filtered projects"
                            className={`inline-flex overflow-hidden rounded-lg border ${t.groupDivider}`}
                        >
                            <button
                                type="button"
                                disabled={sorted.length === 0}
                                onClick={exportPdf}
                                title={exportTitle}
                                className={`${BTN_BASE} rounded-none border-0 ${t.ghostBtn} ${t.focus}`}
                            >
                                <HiDocumentText
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                                Export PDF
                            </button>
                            <button
                                type="button"
                                disabled={sorted.length === 0}
                                onClick={exportCsv}
                                title={exportTitle}
                                className={`${BTN_BASE} rounded-none border-0 border-l ${t.groupDivider} ${t.ghostBtn} ${t.focus}`}
                            >
                                <HiArrowDownTray
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                                Export CSV
                            </button>
                        </div>
                    </div>
                </div>

                {exportError ? (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-300"
                    >
                        {exportError}
                    </p>
                ) : null}

                <div className={`overflow-hidden rounded-2xl border ${t.card}`}>
                    <div
                        className={`flex flex-col gap-4 border-b p-4 sm:p-5 ${t.cardHeader}`}
                    >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                            <div className="relative min-w-0 flex-1 sm:max-w-md">
                                <label
                                    htmlFor="project-search"
                                    className="sr-only"
                                >
                                    Search projects
                                </label>
                                <HiMagnifyingGlass
                                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                                    aria-hidden
                                />
                                <input
                                    id="project-search"
                                    type="search"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Project, municipality, sector…"
                                    className={`min-h-10 w-full rounded-lg border py-2 pl-9 pr-9 text-sm outline-none transition-colors duration-150 [&::-webkit-search-cancel-button]:hidden ${t.field}`}
                                />
                                {query ? (
                                    <button
                                        type="button"
                                        onClick={() => setQuery('')}
                                        aria-label="Clear search"
                                        className={`absolute right-1.5 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md ${t.muted} hover:bg-slate-500/10 ${t.focus}`}
                                    >
                                        <HiXMark
                                            className="h-4 w-4"
                                            aria-hidden
                                        />
                                    </button>
                                ) : null}
                            </div>
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <label
                                    htmlFor="project-sort"
                                    className={`text-sm font-medium ${t.laneLabel}`}
                                >
                                    Sort by
                                </label>
                                <select
                                    id="project-sort"
                                    value={sortKey}
                                    onChange={(e) =>
                                        setSortKey(e.target.value as SortKey)
                                    }
                                    className={`min-h-10 rounded-lg border px-3 text-sm font-semibold outline-none transition-colors duration-150 ${t.field}`}
                                >
                                    {SORT_OPTIONS.map((opt) => (
                                        <option key={opt.id} value={opt.id}>
                                            {opt.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <p
                                id="province-filter-label"
                                className={`shrink-0 pt-2 text-xs font-bold uppercase tracking-[0.1em] sm:w-20 ${t.laneLabel}`}
                            >
                                Province
                            </p>
                            <div
                                role="group"
                                aria-labelledby="province-filter-label"
                                className="flex flex-wrap gap-2"
                            >
                                {(['all', ...PROVINCES] as const).map(
                                    (province) => {
                                        const active =
                                            provinceFilter === province;
                                        return (
                                            <button
                                                key={province}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() =>
                                                    setProvinceFilter(
                                                        active &&
                                                            province !== 'all'
                                                            ? 'all'
                                                            : province,
                                                    )
                                                }
                                                className={`${CHIP_BASE} ${active ? t.chipActive : t.chip} ${t.focus}`}
                                            >
                                                {province === 'all'
                                                    ? 'All'
                                                    : province}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <p
                                id="type-filter-label"
                                className={`shrink-0 pt-2 text-xs font-bold uppercase tracking-[0.1em] sm:w-20 ${t.laneLabel}`}
                            >
                                Type
                            </p>
                            <div
                                role="group"
                                aria-labelledby="type-filter-label"
                                className="flex flex-wrap gap-2"
                            >
                                {(['all', ...typeOptions] as const).map(
                                    (type) => {
                                        const active = typeFilter === type;
                                        return (
                                            <button
                                                key={type}
                                                type="button"
                                                aria-pressed={active}
                                                onClick={() =>
                                                    setTypeFilter(
                                                        active && type !== 'all'
                                                            ? 'all'
                                                            : type,
                                                    )
                                                }
                                                className={`${CHIP_BASE} ${active ? t.chipActive : t.chip} ${t.focus}`}
                                            >
                                                {type === 'all' ? 'All' : type}
                                            </button>
                                        );
                                    },
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
                            <p
                                id="status-filter-label"
                                className={`shrink-0 pt-2 text-xs font-bold uppercase tracking-[0.1em] sm:w-20 ${t.laneLabel}`}
                            >
                                Status
                            </p>
                            <div
                                role="group"
                                aria-labelledby="status-filter-label"
                                className="flex flex-1 flex-wrap items-center gap-2"
                            >
                                <button
                                    type="button"
                                    aria-pressed={statusFilter === 'all'}
                                    onClick={() => setStatusFilter('all')}
                                    className={`${CHIP_BASE} ${statusFilter === 'all' ? t.chipActive : t.chip} ${t.focus}`}
                                >
                                    All
                                </button>
                                {statusOptions.map((status) => {
                                    const active = statusFilter === status;
                                    const sample = active
                                        ? projects.find(
                                              (p) =>
                                                  projectStatusLabel(p) ===
                                                  status,
                                          )
                                        : undefined;
                                    return (
                                        <button
                                            key={status}
                                            type="button"
                                            aria-pressed={active}
                                            onClick={() =>
                                                setStatusFilter(
                                                    active ? 'all' : status,
                                                )
                                            }
                                            className={`${CHIP_BASE} ${
                                                sample
                                                    ? projectStatusClass(
                                                          sample,
                                                          statusMode,
                                                      )
                                                    : t.chip
                                            } ${t.focus}`}
                                        >
                                            {status}
                                        </button>
                                    );
                                })}
                                {hasFilters ? (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        className={`inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-semibold ${t.eyebrow} hover:underline underline-offset-2 sm:ml-auto ${t.focus}`}
                                    >
                                        <HiXMark
                                            className="h-3.5 w-3.5"
                                            aria-hidden
                                        />
                                        Clear all filters
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    {sorted.length === 0 ? (
                        <div className="flex flex-col items-center px-6 py-16 text-center">
                            <span
                                className={`grid h-12 w-12 place-items-center rounded-full ${t.emptyIcon}`}
                            >
                                <HiMagnifyingGlass
                                    className="h-6 w-6"
                                    aria-hidden
                                />
                            </span>
                            <h3
                                className={`mt-4 text-base font-semibold ${t.name}`}
                            >
                                No projects match these filters
                            </h3>
                            <p className={`mt-1 max-w-sm text-sm ${t.muted}`}>
                                Try a different keyword, or widen the province
                                and status filters.
                            </p>
                            {hasFilters ? (
                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className={`${BTN_BASE} mt-5 ${t.primaryBtn} ${t.focus}`}
                                >
                                    Clear all filters
                                </button>
                            ) : null}
                        </div>
                    ) : (
                        <>
                            <div className="hidden overflow-x-auto md:block">
                                <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                                    <thead>
                                        <tr
                                            className={`border-b text-xs uppercase tracking-wide ${t.thead}`}
                                        >
                                            <th
                                                scope="col"
                                                className="px-5 py-3 font-semibold"
                                            >
                                                Project
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 py-3 font-semibold"
                                            >
                                                Program
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 py-3 font-semibold"
                                            >
                                                Location
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-3 py-3 font-semibold"
                                            >
                                                Status
                                            </th>
                                            <th
                                                scope="col"
                                                className="px-5 py-3 text-right font-semibold"
                                            >
                                                Budget
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {pageItems.map((project) => {
                                            const active =
                                                selectedId === project.id;
                                            const progress = clampProgress(
                                                project.progress,
                                            );
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
                                                    aria-label={`View ${project.name}`}
                                                    className={[
                                                        'cursor-pointer border-b transition-colors duration-150 last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50',
                                                        t.rowBorder,
                                                        active
                                                            ? t.rowActive
                                                            : t.rowHover,
                                                    ].join(' ')}
                                                >
                                                    <td className="max-w-[340px] px-5 py-3.5">
                                                        <p
                                                            className={`truncate font-semibold ${t.name}`}
                                                        >
                                                            {project.name}
                                                        </p>
                                                        <p
                                                            className={`mt-0.5 truncate text-xs ${t.muted}`}
                                                        >
                                                            {
                                                                project.beneficiary
                                                            }
                                                        </p>
                                                    </td>
                                                    <td className="px-3 py-3.5">
                                                        <span
                                                            className={`inline-flex items-center gap-1.5 text-xs font-semibold ${t.location}`}
                                                        >
                                                            <span
                                                                className="h-2 w-2 shrink-0 rounded-full"
                                                                style={{
                                                                    backgroundColor:
                                                                        programColor(
                                                                            project.program,
                                                                        ),
                                                                }}
                                                                aria-hidden
                                                            />
                                                            {project.program}
                                                        </span>
                                                    </td>
                                                    <td
                                                        className={`px-3 py-3.5 ${t.location}`}
                                                    >
                                                        <span className="block truncate">
                                                            {
                                                                project.municipality
                                                            }
                                                        </span>
                                                        <span
                                                            className={`block text-xs ${t.muted}`}
                                                        >
                                                            {project.province}
                                                        </span>
                                                    </td>
                                                    <td className="px-3 py-3.5">
                                                        <span
                                                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${projectStatusClass(project, statusMode)}`}
                                                        >
                                                            {projectStatusLabel(
                                                                project,
                                                            )}
                                                        </span>
                                                        <div className="mt-1.5 flex items-center gap-2">
                                                            <div
                                                                className={`h-1.5 w-20 overflow-hidden rounded-full ${t.track}`}
                                                                role="progressbar"
                                                                aria-valuenow={
                                                                    progress
                                                                }
                                                                aria-valuemin={
                                                                    0
                                                                }
                                                                aria-valuemax={
                                                                    100
                                                                }
                                                                aria-label="Progress"
                                                            >
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${progress}%`,
                                                                        backgroundColor:
                                                                            programColor(
                                                                                project.program,
                                                                            ),
                                                                    }}
                                                                />
                                                            </div>
                                                            <span
                                                                className={`text-xs tabular-nums ${t.muted}`}
                                                            >
                                                                {progress}%
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td
                                                        className={`whitespace-nowrap px-5 py-3.5 text-right font-semibold tabular-nums ${t.cost}`}
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
                                    const active = selectedId === project.id;
                                    return (
                                        <li key={project.id}>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    openProject(project)
                                                }
                                                className={[
                                                    'flex w-full flex-col gap-2 px-4 py-4 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/50',
                                                    active
                                                        ? t.rowActive
                                                        : t.mobileBase,
                                                ].join(' ')}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <p
                                                        className={`min-w-0 text-sm font-semibold leading-snug ${t.name}`}
                                                    >
                                                        {project.name}
                                                    </p>
                                                    <span
                                                        className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${projectStatusClass(project, statusMode)}`}
                                                    >
                                                        {projectStatusLabel(
                                                            project,
                                                        )}
                                                    </span>
                                                </div>
                                                <p
                                                    className={`flex items-center gap-1.5 text-xs ${t.muted}`}
                                                >
                                                    <span
                                                        className="h-2 w-2 shrink-0 rounded-full"
                                                        style={{
                                                            backgroundColor:
                                                                programColor(
                                                                    project.program,
                                                                ),
                                                        }}
                                                        aria-hidden
                                                    />
                                                    <span className="font-semibold">
                                                        {project.program}
                                                    </span>
                                                    <span aria-hidden>·</span>
                                                    <span className="truncate">
                                                        {project.municipality},{' '}
                                                        {project.province}
                                                    </span>
                                                </p>
                                                <p
                                                    className={`text-sm font-semibold tabular-nums ${t.cost}`}
                                                >
                                                    {formatPeso(project.budget)}
                                                </p>
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>

                            {totalPages > 1 && (
                                <nav
                                    aria-label="Project list pages"
                                    className={`flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 sm:px-5 ${t.cardHeader}`}
                                >
                                    <p className={`text-sm ${t.muted}`}>
                                        Page{' '}
                                        <span
                                            className={`font-semibold ${t.name}`}
                                        >
                                            {safePage}
                                        </span>{' '}
                                        of {totalPages}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={safePage <= 1}
                                            onClick={() =>
                                                goToPage(safePage - 1)
                                            }
                                            className={`${BTN_BASE} ${t.ghostBtn} ${t.focus}`}
                                        >
                                            <HiChevronLeft
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                            Previous
                                        </button>
                                        <button
                                            type="button"
                                            disabled={safePage >= totalPages}
                                            onClick={() =>
                                                goToPage(safePage + 1)
                                            }
                                            className={`${BTN_BASE} ${t.ghostBtn} ${t.focus}`}
                                        >
                                            Next
                                            <HiChevronRight
                                                className="h-4 w-4"
                                                aria-hidden
                                            />
                                        </button>
                                    </div>
                                </nav>
                            )}
                        </>
                    )}
                </div>
            </section>

            <footer className={`border-t ${t.footer}`}>
                <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-[1.4fr_1fr_1fr] sm:px-6">
                    <div>
                        <div className="flex items-center gap-2.5">
                            <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-sm font-black text-[#0038a8]">
                                T
                            </span>
                            <p className="text-base font-black tracking-tight text-white">
                                TARAMIMAROPA
                            </p>
                        </div>
                        <p
                            className={`mt-3 max-w-sm text-sm leading-relaxed ${t.footerMuted}`}
                        >
                            Tracking of Accomplishments and Results of
                            Activities and Programs across MIMAROPA. A
                            transparency initiative of DOST-MIMAROPA.
                        </p>
                    </div>
                    <nav aria-labelledby="footer-provinces">
                        <p
                            id="footer-provinces"
                            className={`text-xs font-bold uppercase tracking-[0.14em] ${t.footerLabel}`}
                        >
                            Projects by province
                        </p>
                        <ul className="mt-3 space-y-1">
                            {PROVINCES.map((province) => (
                                <li key={province}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setProvinceFilter(province);
                                            scrollToResults();
                                        }}
                                        className={`inline-flex min-h-8 items-center rounded text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 ${t.footerLink}`}
                                    >
                                        {province}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div>
                        <p
                            className={`text-xs font-bold uppercase tracking-[0.14em] ${t.footerLabel}`}
                        >
                            Agency
                        </p>
                        <address
                            className={`mt-3 text-sm not-italic leading-relaxed ${t.footerMuted}`}
                        >
                            Department of Science and Technology
                            <br />
                            MIMAROPA Regional Office
                            <br />
                            Republic of the Philippines
                        </address>
                    </div>
                </div>
                <div
                    className={`border-t px-4 py-4 text-center text-xs ${t.footerBottom}`}
                >
                    © {new Date().getFullYear()} DOST-MIMAROPA · All rights
                    reserved · Powered by TARAMIMAROPA
                </div>
            </footer>

            {viewing && (
                <div
                    className={`fixed inset-0 z-[1000] flex items-end justify-center p-0 backdrop-blur-sm sm:items-center sm:p-4 ${t.scrim}`}
                    onClick={() => setViewing(null)}
                >
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="project-dialog-title"
                        className={`max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border shadow-[0_16px_40px_rgba(0,0,0,0.2)] sm:rounded-2xl [-webkit-overflow-scrolling:touch] [overscroll-behavior:contain] ${t.modalPanel}`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="relative">
                            <img
                                src={
                                    viewing.photo_url ||
                                    projectImage(viewing.id)
                                }
                                alt=""
                                loading="lazy"
                                className={`h-48 w-full border-b object-cover sm:rounded-t-2xl ${t.modalImg}`}
                            />
                            <button
                                ref={closeBtnRef}
                                type="button"
                                onClick={() => setViewing(null)}
                                className={`absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-lg border backdrop-blur-sm transition-colors duration-150 ${t.modalClose} ${t.modalPanel} ${t.focus}`}
                                aria-label="Close project details"
                            >
                                <HiXMark className="h-5 w-5" aria-hidden />
                            </button>
                        </div>

                        <div className="p-5">
                            <p
                                className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.14em]"
                                style={{
                                    color: programColor(viewing.program),
                                }}
                            >
                                <span
                                    className="h-2 w-2 rounded-full"
                                    style={{
                                        backgroundColor: programColor(
                                            viewing.program,
                                        ),
                                    }}
                                    aria-hidden
                                />
                                {PROGRAM_META[viewing.program].short} ·{' '}
                                {viewing.province}
                            </p>
                            <h2
                                id="project-dialog-title"
                                className={`mt-1.5 text-lg font-semibold leading-snug ${t.modalTitle}`}
                            >
                                {viewing.name}
                            </h2>

                            <div className="mt-3 flex items-center gap-3">
                                <span
                                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${projectStatusClass(viewing, statusMode)}`}
                                >
                                    {projectStatusLabel(viewing)}
                                </span>
                                <div
                                    className={`h-1.5 flex-1 overflow-hidden rounded-full ${t.track}`}
                                    role="progressbar"
                                    aria-valuenow={clampProgress(
                                        viewing.progress,
                                    )}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-label="Progress"
                                >
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${clampProgress(viewing.progress)}%`,
                                            backgroundColor: programColor(
                                                viewing.program,
                                            ),
                                        }}
                                    />
                                </div>
                                <span
                                    className={`text-sm font-semibold tabular-nums ${t.modalDd}`}
                                >
                                    {clampProgress(viewing.progress)}%
                                </span>
                            </div>

                            <p
                                className={`mt-4 text-sm leading-relaxed ${t.modalBody}`}
                            >
                                {describeProject(viewing)}
                            </p>

                            <dl
                                className={`mt-4 grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4 text-sm ${t.modalFacts}`}
                            >
                                {(
                                    [
                                        ['Type', projectType(viewing), false],
                                        ['Year', projectYear(viewing), false],
                                        [
                                            'Beneficiary',
                                            viewing.beneficiary,
                                            true,
                                        ],
                                        [
                                            'Municipality',
                                            viewing.municipality,
                                            false,
                                        ],
                                        [
                                            'Budget',
                                            formatPeso(viewing.budget),
                                            false,
                                        ],
                                        [
                                            'Beneficiaries reached',
                                            viewing.beneficiaries.toLocaleString(),
                                            true,
                                        ],
                                    ] as const
                                ).map(([label, value, wide]) => (
                                    <div
                                        key={label}
                                        className={wide ? 'col-span-2' : ''}
                                    >
                                        <dt className={`text-xs ${t.modalDt}`}>
                                            {label}
                                        </dt>
                                        <dd
                                            className={`mt-0.5 font-semibold ${t.modalDd}`}
                                        >
                                            {value}
                                        </dd>
                                    </div>
                                ))}
                            </dl>

                            <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                                <button
                                    type="button"
                                    onClick={() =>
                                        openGoogleDirections(
                                            viewing,
                                            userLocation,
                                        )
                                    }
                                    className={`${BTN_BASE} min-h-11 flex-1 ${t.primaryBtn} ${t.focus}`}
                                >
                                    <HiPaperAirplane
                                        className="h-4 w-4"
                                        aria-hidden
                                    />
                                    Get directions
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
                                        className={`${BTN_BASE} min-h-11 ${t.ghostBtn} ${t.focus}`}
                                    >
                                        <HiMapPin
                                            className="h-4 w-4"
                                            aria-hidden
                                        />
                                        {locating
                                            ? 'Locating…'
                                            : 'Use my location'}
                                    </button>
                                ) : null}
                            </div>
                            <p
                                className={`mt-2 text-xs leading-relaxed ${t.muted}`}
                            >
                                {userLocation
                                    ? 'Route starts from your current location.'
                                    : 'Opens Google Maps. Share your location first for a full driving route.'}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default LandingPage;
