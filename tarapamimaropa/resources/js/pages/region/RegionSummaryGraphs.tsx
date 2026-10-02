import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { HiArrowDownTray, HiArrowLeft } from 'react-icons/hi2';
import {
    ALL,
    AreaLineChart,
    BRAND,
    BarChart,
    Card,
    Chip,
    ColumnChart,
    DonutChart,
    EmptyChart,
    LoadingSkeleton,
    PROGRAM_BUCKETS,
    PROVINCE_COLORS,
    ProjectListDialog,
    SelectFilter,
    StackedBarChart,
    StatTiles,
    StatusLegend,
    bucketKey,
    bucketMeta,
    metricByKey,
    programRows,
    statusRows,
    type Row,
    type StackSeries,
} from '@/components/graphs/SummaryCharts';
import ExportReportDialog from '@/components/region/graphs/ExportReportDialog';
import RegionGraphsAiPanel from '@/components/region/graphs/RegionGraphsAiPanel';
import type { ChartInterpretContext } from '@/components/region/graphs/ChartAiInterpretation';
import {
    PROVINCES,
    formatCompact,
    formatPeso,
    projectYear,
    summarizeProjects,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { programs } from '@/routes/region';

type PageProps = {
    projects?: TaraProject[];
};

/* ── Page ───────────────────────────────────────────────────────── */
type ViewTab = 'region' | 'province' | 'municipality' | 'program';

const rowsToChart = (
    title: string,
    rows: Row[],
    format: 'number' | 'peso' | 'compact' = 'number',
) => ({
    title,
    format,
    rows: rows.map((r) => ({ label: r.label, value: r.value })),
});

const VIEW_TABS: { id: ViewTab; label: string; hint: string }[] = [
    {
        id: 'region',
        label: '1. Region',
        hint: 'MIMAROPA totals and province comparison',
    },
    {
        id: 'province',
        label: '2. Province',
        hint: 'Drill into one province',
    },
    {
        id: 'municipality',
        label: '3. Municipality',
        hint: 'Rank LGUs inside a province',
    },
    {
        id: 'program',
        label: '4. Program',
        hint: 'GIA, CEST, SETUP, and others',
    },
];

const RegionSummaryGraphs = () => {
    const page = usePage<PageProps>();
    const projectsProp = page.props.projects;
    const loading = projectsProp === undefined;
    const projects = projectsProp ?? [];

    const [tab, setTab] = useState<ViewTab>('region');
    const [year, setYear] = useState(ALL);
    const [browseProvince, setBrowseProvince] = useState<Province>(PROVINCES[0]);
    const [focusProgram, setFocusProgram] = useState(PROGRAM_BUCKETS[0].key);
    const [focusMunicipality, setFocusMunicipality] = useState<string | null>(
        null,
    );
    const [exportOpen, setExportOpen] = useState(false);

    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        for (const p of projects) years.add(projectYear(p));
        return [...years].sort((a, b) => b - a);
    }, [projects]);

    /** Year filter applies everywhere. Tab picks the slice. */
    const yearFiltered = useMemo(() => {
        if (!year) return projects;
        return projects.filter((p) => String(projectYear(p)) === year);
    }, [projects, year]);

    const filtered = useMemo(() => {
        if (tab === 'province' || tab === 'municipality') {
            return yearFiltered.filter((p) => p.province === browseProvince);
        }
        if (tab === 'program') {
            return yearFiltered.filter(
                (p) => bucketKey(p.program) === focusProgram,
            );
        }
        return yearFiltered;
    }, [yearFiltered, tab, browseProvince, focusProgram]);

    const regional = useMemo(() => {
        const byYear = new Map<number, number>();
        for (const p of yearFiltered) {
            const y = projectYear(p);
            byYear.set(y, (byYear.get(y) ?? 0) + 1);
        }
        const perYear: Row[] = [...byYear.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([y, value]) => ({
                key: String(y),
                label: String(y),
                value,
                color: BRAND,
            }));

        return {
            perYear,
            projectsPerProvince: metricByKey(
                yearFiltered,
                (p) => p.province,
                'count',
                (k) => PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
            fundingPerProvince: metricByKey(
                yearFiltered,
                (p) => p.province,
                'budget',
                (k) => PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
            programsPerProvince: PROVINCES.map((prov) => {
                const values: Record<string, number> = {};
                for (const b of PROGRAM_BUCKETS) values[b.key] = 0;
                for (const p of yearFiltered) {
                    if (p.province !== prov) continue;
                    const key = bucketKey(p.program);
                    values[key] = (values[key] ?? 0) + 1;
                }
                return { key: prov, label: prov, values };
            }).filter((row) => Object.values(row.values).some((v) => v > 0)),
            byStatus: statusRows(yearFiltered),
            byProgram: programRows(yearFiltered),
            summary: summarizeProjects(yearFiltered),
        };
    }, [yearFiltered]);

    const provincialFocus = useMemo(() => {
        const list = yearFiltered.filter((p) => p.province === browseProvince);
        return {
            list,
            stats: summarizeProjects(list),
            byStatus: statusRows(list),
            byProgram: programRows(list),
            funding: metricByKey(
                list,
                (p) => p.municipality || '—',
                'budget',
                () => PROVINCE_COLORS[browseProvince],
                8,
            ),
            beneficiaries: metricByKey(
                list,
                (p) => p.municipality || '—',
                'beneficiaries',
                () => PROVINCE_COLORS[browseProvince],
                8,
            ),
            projects: metricByKey(
                list,
                (p) => p.municipality || '—',
                'count',
                () => PROVINCE_COLORS[browseProvince],
                8,
            ),
        };
    }, [yearFiltered, browseProvince]);

    const municipal = useMemo(() => {
        const list = yearFiltered.filter((p) => p.province === browseProvince);
        const color = () => PROVINCE_COLORS[browseProvince];
        return {
            projects: metricByKey(
                list,
                (p) => p.municipality || '—',
                'count',
                color,
                15,
            ),
            funding: metricByKey(
                list,
                (p) => p.municipality || '—',
                'budget',
                color,
                15,
            ),
            beneficiaries: metricByKey(
                list,
                (p) => p.municipality || '—',
                'beneficiaries',
                color,
                15,
            ),
            byStatus: statusRows(list),
        };
    }, [yearFiltered, browseProvince]);

    const programFocus = useMemo(() => {
        const list = yearFiltered.filter(
            (p) => bucketKey(p.program) === focusProgram,
        );
        return {
            stats: summarizeProjects(list),
            byStatus: statusRows(list),
            byProvince: metricByKey(
                list,
                (p) => p.province,
                'count',
                (k) => PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
            fundingByProvince: metricByKey(
                list,
                (p) => p.province,
                'budget',
                (k) => PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
        };
    }, [yearFiltered, focusProgram]);

    const stackSeries: StackSeries[] = PROGRAM_BUCKETS.map((b) => ({
        key: b.key,
        label: b.label,
        color: b.color,
    }));

    const activeTab = VIEW_TABS.find((t) => t.id === tab)!;

    const contextLabel =
        tab === 'region'
            ? `MIMAROPA${year ? ` · ${year}` : ''}`
            : tab === 'program'
              ? `${bucketMeta(focusProgram).label}${year ? ` · ${year}` : ''}`
              : `${browseProvince}${year ? ` · ${year}` : ''}`;

    const interpretContext = useMemo((): ChartInterpretContext => {
        if (tab === 'province') {
            return {
                view: 'province',
                context_label: contextLabel,
                year: year || null,
                stats: {
                    total: provincialFocus.stats.total,
                    funding: provincialFocus.stats.funding,
                    beneficiaries: provincialFocus.stats.beneficiaries,
                    active: provincialFocus.stats.active,
                },
                charts: [
                    rowsToChart('Status', provincialFocus.byStatus),
                    rowsToChart('Programs', provincialFocus.byProgram),
                    rowsToChart('Top municipalities', provincialFocus.projects),
                    rowsToChart(
                        'Funding by municipality',
                        provincialFocus.funding,
                        'compact',
                    ),
                ],
            };
        }

        if (tab === 'municipality') {
            return {
                view: 'municipality',
                context_label: contextLabel,
                year: year || null,
                charts: [
                    rowsToChart('Projects per municipality', municipal.projects),
                    rowsToChart(
                        'Funding per municipality',
                        municipal.funding,
                        'compact',
                    ),
                    rowsToChart(
                        'Beneficiaries per municipality',
                        municipal.beneficiaries,
                        'compact',
                    ),
                    rowsToChart('Status in province', municipal.byStatus),
                ],
            };
        }

        if (tab === 'program') {
            return {
                view: 'program',
                context_label: contextLabel,
                year: year || null,
                stats: {
                    total: programFocus.stats.total,
                    funding: programFocus.stats.funding,
                    beneficiaries: programFocus.stats.beneficiaries,
                    completed: programFocus.stats.completed,
                },
                charts: [
                    rowsToChart('By province', programFocus.byProvince),
                    rowsToChart(
                        'Funding by province',
                        programFocus.fundingByProvince,
                        'compact',
                    ),
                    rowsToChart('Status', programFocus.byStatus),
                ],
            };
        }

        return {
            view: 'region',
            context_label: contextLabel,
            year: year || null,
            stats: {
                total: regional.summary.total,
                funding: regional.summary.funding,
                beneficiaries: regional.summary.beneficiaries,
                active: regional.summary.active,
                completed: regional.summary.completed,
            },
            charts: [
                rowsToChart(
                    'Projects per province',
                    regional.projectsPerProvince,
                ),
                rowsToChart(
                    'Funding per province',
                    regional.fundingPerProvince,
                    'compact',
                ),
                rowsToChart('Implementation status', regional.byStatus),
                rowsToChart('Program mix', regional.byProgram),
                rowsToChart('Projects per year', regional.perYear),
            ],
        };
    }, [
        tab,
        contextLabel,
        year,
        regional,
        provincialFocus,
        municipal,
        programFocus,
    ]);

    return (
        <>
            <Head title="Summary graphs" />
            <section className="min-h-screen bg-background px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground transition-colors duration-[180ms] sm:px-6 sm:py-7 lg:pb-7">
                <div className="mx-auto max-w-6xl space-y-5">
                    <div>
                        <Link
                            href={programs.url()}
                            className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-muted-foreground transition duration-[180ms] hover:text-foreground"
                        >
                            <HiArrowLeft className="h-4 w-4" aria-hidden />
                            Back to Programs
                        </Link>

                        <header className="mt-4">
                            <p className="text-xs font-medium text-muted-foreground">
                                MIMAROPA · DOST
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                Summary graphs
                            </h1>
                            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                Browse one level at a time, then let TARA explain
                                what the charts are saying.
                            </p>
                        </header>
                    </div>

                    {/* Step tabs */}
                    <nav
                        className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-card p-1.5"
                        aria-label="Analytics level"
                    >
                        <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                            {VIEW_TABS.map((t) => {
                                const on = tab === t.id;
                                return (
                                    <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => setTab(t.id)}
                                        className={[
                                            'rounded-lg px-2.5 py-2.5 text-left transition',
                                            on
                                                ? 'bg-primary text-primary-foreground shadow-xs'
                                                : 'text-foreground/80 hover:bg-muted',
                                        ].join(' ')}
                                    >
                                        <span className="block text-xs font-bold sm:text-sm">
                                            {t.label}
                                        </span>
                                        <span
                                            className={[
                                                'mt-0.5 hidden text-[10px] leading-snug sm:block',
                                                on
                                                    ? 'text-primary-foreground/70'
                                                    : 'text-muted-foreground',
                                            ].join(' ')}
                                        >
                                            {t.hint}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </nav>

                    {/* Context + year only */}
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                Now viewing
                            </p>
                            <p className="truncate text-sm font-semibold text-foreground">
                                {activeTab.label.replace(/^\d+\.\s*/, '')} ·{' '}
                                {contextLabel}
                            </p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {filtered.length} project
                                {filtered.length === 1 ? '' : 's'} in this view
                                {year ? ` (year ${year})` : ''}
                            </p>
                        </div>
                        <div className="flex w-full flex-wrap items-end gap-2 sm:w-auto sm:min-w-[200px]">
                            <SelectFilter
                                label="Year approved"
                                value={year}
                                onChange={setYear}
                                options={[
                                    { value: ALL, label: 'All years' },
                                    ...yearOptions.map((y) => ({
                                        value: String(y),
                                        label: String(y),
                                    })),
                                ]}
                            />
                            {year ? (
                                <button
                                    type="button"
                                    onClick={() => setYear(ALL)}
                                    className="min-h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
                                >
                                    Clear year
                                </button>
                            ) : null}
                            <button
                                type="button"
                                onClick={() => setExportOpen(true)}
                                disabled={loading || yearFiltered.length === 0}
                                className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <HiArrowDownTray
                                    className="h-4 w-4"
                                    aria-hidden
                                />
                                Export
                            </button>
                        </div>
                    </div>

                    {!loading && yearFiltered.length > 0 ? (
                        <RegionGraphsAiPanel
                            context={interpretContext}
                            projects={filtered}
                        />
                    ) : null}

                    {loading ? (
                        <LoadingSkeleton />
                    ) : yearFiltered.length === 0 ? (
                        <EmptyChart label="No projects for this year. Clear year or import data on Programs." />
                    ) : (
                        <>
                            {tab === 'region' ? (
                                <div className="space-y-4">
                                    <StatTiles
                                        items={[
                                            {
                                                label: 'Total projects',
                                                value: String(
                                                    regional.summary.total,
                                                ),
                                            },
                                            {
                                                label: 'Total funding',
                                                value: formatPeso(
                                                    regional.summary.funding,
                                                ),
                                            },
                                            {
                                                label: 'Beneficiaries',
                                                value: formatCompact(
                                                    regional.summary
                                                        .beneficiaries,
                                                ),
                                            },
                                            {
                                                label: 'Ongoing',
                                                value: String(
                                                    regional.summary.active,
                                                ),
                                            },
                                            {
                                                label: 'Completed',
                                                value: String(
                                                    regional.summary.completed,
                                                ),
                                            },
                                            {
                                                label: 'On hold',
                                                value: String(
                                                    regional.summary.onHold,
                                                ),
                                            },
                                        ]}
                                    />

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <Card
                                            title="Projects per province"
                                            subtitle="Count"
                                        >
                                            <ColumnChart
                                                rows={
                                                    regional.projectsPerProvince
                                                }
                                            />
                                        </Card>
                                        <Card
                                            title="Funding per province"
                                            subtitle="₱"
                                        >
                                            <ColumnChart
                                                rows={
                                                    regional.fundingPerProvince
                                                }
                                                format="compact"
                                            />
                                        </Card>
                                        <Card
                                            title="Programs per province"
                                            subtitle="Stacked"
                                        >
                                            <StackedBarChart
                                                rows={
                                                    regional.programsPerProvince
                                                }
                                                series={stackSeries}
                                            />
                                        </Card>
                                        <Card
                                            title="Implementation status"
                                            subtitle="Region"
                                        >
                                            <DonutChart
                                                rows={regional.byStatus}
                                                centerLabel="STATUS"
                                            />
                                        </Card>
                                        <Card
                                            title="Program mix"
                                            subtitle="Region"
                                        >
                                            <DonutChart
                                                rows={regional.byProgram}
                                                centerLabel="PROGRAM"
                                            />
                                        </Card>
                                        <Card
                                            title="Projects per year"
                                            subtitle="Trend"
                                        >
                                            <AreaLineChart
                                                rows={regional.perYear}
                                            />
                                        </Card>
                                    </div>

                                    <div className="rounded-xl border border-border bg-card px-3.5 py-2.5">
                                        <p className="mb-1.5 text-[11px] font-medium text-muted-foreground">
                                            Status colors
                                        </p>
                                        <StatusLegend />
                                    </div>
                                </div>
                            ) : null}

                            {tab === 'province' ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                                            Choose province
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {PROVINCES.map((p) => (
                                                <Chip
                                                    key={p}
                                                    active={
                                                        browseProvince === p
                                                    }
                                                    onClick={() =>
                                                        setBrowseProvince(p)
                                                    }
                                                >
                                                    {p}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>

                                    <StatTiles
                                        items={[
                                            {
                                                label: 'Projects',
                                                value: String(
                                                    provincialFocus.stats.total,
                                                ),
                                            },
                                            {
                                                label: 'Funding',
                                                value: formatCompact(
                                                    provincialFocus.stats
                                                        .funding,
                                                ),
                                            },
                                            {
                                                label: 'Beneficiaries',
                                                value: formatCompact(
                                                    provincialFocus.stats
                                                        .beneficiaries,
                                                ),
                                            },
                                            {
                                                label: 'Ongoing',
                                                value: String(
                                                    provincialFocus.stats
                                                        .active,
                                                ),
                                            },
                                        ]}
                                    />

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <Card
                                            title="Status"
                                            subtitle={browseProvince}
                                        >
                                            <DonutChart
                                                rows={
                                                    provincialFocus.byStatus
                                                }
                                                centerLabel="STATUS"
                                            />
                                        </Card>
                                        <Card
                                            title="Programs"
                                            subtitle={browseProvince}
                                        >
                                            <DonutChart
                                                rows={
                                                    provincialFocus.byProgram
                                                }
                                                centerLabel="PROGRAM"
                                            />
                                        </Card>
                                        <Card
                                            title="Top municipalities"
                                            subtitle="By projects"
                                        >
                                            <BarChart
                                                rows={
                                                    provincialFocus.projects
                                                }
                                                onSelect={(row) =>
                                                    setFocusMunicipality(
                                                        row.key,
                                                    )
                                                }
                                            />
                                        </Card>
                                        <Card
                                            title="Funding by municipality"
                                            subtitle="Top 8"
                                        >
                                            <BarChart
                                                rows={provincialFocus.funding}
                                                format="compact"
                                                onSelect={(row) =>
                                                    setFocusMunicipality(
                                                        row.key,
                                                    )
                                                }
                                            />
                                        </Card>
                                    </div>

                                    <ProjectListDialog
                                        title={
                                            focusMunicipality === null
                                                ? null
                                                : `${focusMunicipality}, ${browseProvince}`
                                        }
                                        projects={provincialFocus.list.filter(
                                            (p) =>
                                                (p.municipality || '—') ===
                                                focusMunicipality,
                                        )}
                                        onClose={() =>
                                            setFocusMunicipality(null)
                                        }
                                    />
                                </div>
                            ) : null}

                            {tab === 'municipality' ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                                            First pick province, then see LGU
                                            ranks
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {PROVINCES.map((p) => (
                                                <Chip
                                                    key={p}
                                                    active={
                                                        browseProvince === p
                                                    }
                                                    onClick={() =>
                                                        setBrowseProvince(p)
                                                    }
                                                >
                                                    {p}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <Card
                                            title="Projects per municipality"
                                            subtitle={`Top 15 · ${browseProvince}`}
                                        >
                                            <BarChart
                                                rows={municipal.projects}
                                            />
                                        </Card>
                                        <Card
                                            title="Funding per municipality"
                                            subtitle="Top 15"
                                        >
                                            <BarChart
                                                rows={municipal.funding}
                                                format="compact"
                                            />
                                        </Card>
                                        <Card
                                            title="Beneficiaries per municipality"
                                            subtitle="Top 15"
                                        >
                                            <BarChart
                                                rows={
                                                    municipal.beneficiaries
                                                }
                                                format="compact"
                                            />
                                        </Card>
                                        <Card
                                            title="Status in province"
                                            subtitle={browseProvince}
                                        >
                                            <DonutChart
                                                rows={municipal.byStatus}
                                                centerLabel="STATUS"
                                            />
                                        </Card>
                                    </div>
                                </div>
                            ) : null}

                            {tab === 'program' ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium text-muted-foreground">
                                            Choose program
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {PROGRAM_BUCKETS.map((b) => (
                                                <Chip
                                                    key={b.key}
                                                    active={
                                                        focusProgram === b.key
                                                    }
                                                    onClick={() =>
                                                        setFocusProgram(b.key)
                                                    }
                                                    color={b.color}
                                                >
                                                    {b.label}
                                                </Chip>
                                            ))}
                                        </div>
                                    </div>

                                    <StatTiles
                                        items={[
                                            {
                                                label: 'Projects',
                                                value: String(
                                                    programFocus.stats.total,
                                                ),
                                            },
                                            {
                                                label: 'Funding',
                                                value: formatCompact(
                                                    programFocus.stats.funding,
                                                ),
                                            },
                                            {
                                                label: 'Beneficiaries',
                                                value: formatCompact(
                                                    programFocus.stats
                                                        .beneficiaries,
                                                ),
                                            },
                                            {
                                                label: 'Completed',
                                                value: String(
                                                    programFocus.stats
                                                        .completed,
                                                ),
                                            },
                                        ]}
                                    />

                                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                        <Card
                                            title="By province"
                                            subtitle="Count"
                                        >
                                            <ColumnChart
                                                rows={programFocus.byProvince}
                                            />
                                        </Card>
                                        <Card
                                            title="Funding by province"
                                            subtitle="₱"
                                        >
                                            <ColumnChart
                                                rows={
                                                    programFocus.fundingByProvince
                                                }
                                                format="compact"
                                            />
                                        </Card>
                                        <Card
                                            title="Status"
                                            subtitle={
                                                bucketMeta(focusProgram).label
                                            }
                                        >
                                            <DonutChart
                                                rows={programFocus.byStatus}
                                                centerLabel="STATUS"
                                            />
                                        </Card>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    )}

                    {exportOpen ? (
                        <ExportReportDialog
                            open
                            onOpenChange={setExportOpen}
                            projects={yearFiltered}
                            year={year}
                            defaultProvince={
                                tab === 'province' || tab === 'municipality'
                                    ? browseProvince
                                    : ALL
                            }
                        />
                    ) : null}

                    <p className="text-center text-xs text-muted-foreground">
                        Information &amp; Monitoring of Projects, Services and
                        S&amp;T Interventions · DOST-MIMAROPA
                    </p>
                </div>
            </section>
        </>
    );
};

export default RegionSummaryGraphs;
