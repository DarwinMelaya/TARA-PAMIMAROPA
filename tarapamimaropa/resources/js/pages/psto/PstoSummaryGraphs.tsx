import { Head, Link, usePage } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import { HiArrowLeft } from 'react-icons/hi2';
import {
    ALL,
    BRAND,
    BarChart,
    Card,
    DonutChart,
    EmptyChart,
    LoadingSkeleton,
    PROVINCE_COLORS,
    ProjectListDialog,
    SelectFilter,
    StatTiles,
    StatusLegend,
    metricByKey,
    programRows,
    statusRows,
} from '@/components/graphs/SummaryCharts';
import {
    formatCompact,
    formatPeso,
    projectYear,
    summarizeProjects,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { programs } from '@/routes/psto';

type PageProps = {
    projects?: TaraProject[];
    lockedProvince?: string | null;
};

type ViewTab = 'municipality' | 'barangay';

type Focus = { municipality: string; barangay?: string } | null;

const VIEW_TABS: { id: ViewTab; label: string; hint: string }[] = [
    {
        id: 'municipality',
        label: '1. Municipality',
        hint: 'Rank cities and municipalities in the province',
    },
    {
        id: 'barangay',
        label: '2. Barangay',
        hint: 'Drill into barangays of one municipality',
    },
];

const NONE = '—';

const municipalityOf = (p: TaraProject) => p.municipality || NONE;
const barangayOf = (p: TaraProject) => p.barangay || NONE;

const PstoSummaryGraphs = () => {
    const page = usePage<PageProps>();
    const projectsProp = page.props.projects;
    const loading = projectsProp === undefined;
    const projects = projectsProp ?? [];
    const province = (page.props.lockedProvince ?? '') as Province;
    const color = PROVINCE_COLORS[province] ?? BRAND;

    const [tab, setTab] = useState<ViewTab>('municipality');
    const [year, setYear] = useState(ALL);
    const [pickedMunicipality, setPickedMunicipality] = useState(ALL);
    const [focus, setFocus] = useState<Focus>(null);

    const yearOptions = useMemo(() => {
        const years = new Set<number>();
        for (const p of projects) years.add(projectYear(p));
        return [...years].sort((a, b) => b - a);
    }, [projects]);

    const yearFiltered = useMemo(() => {
        if (!year) return projects;
        return projects.filter((p) => String(projectYear(p)) === year);
    }, [projects, year]);

    const byMunicipality = useMemo(
        () => ({
            stats: summarizeProjects(yearFiltered),
            byStatus: statusRows(yearFiltered),
            byProgram: programRows(yearFiltered),
            projects: metricByKey(
                yearFiltered,
                municipalityOf,
                'count',
                () => color,
            ),
            funding: metricByKey(
                yearFiltered,
                municipalityOf,
                'budget',
                () => color,
            ),
        }),
        [yearFiltered, color],
    );

    const municipalityOptions = byMunicipality.projects.map((r) => r.key);
    const municipality =
        pickedMunicipality && municipalityOptions.includes(pickedMunicipality)
            ? pickedMunicipality
            : (municipalityOptions[0] ?? ALL);

    const byBarangay = useMemo(() => {
        const list = yearFiltered.filter(
            (p) => municipalityOf(p) === municipality,
        );
        return {
            list,
            stats: summarizeProjects(list),
            byStatus: statusRows(list),
            projects: metricByKey(list, barangayOf, 'count', () => color, 15),
            funding: metricByKey(list, barangayOf, 'budget', () => color, 15),
        };
    }, [yearFiltered, municipality, color]);

    const filtered = tab === 'barangay' ? byBarangay.list : yearFiltered;

    const focusProjects = focus
        ? yearFiltered.filter(
              (p) =>
                  municipalityOf(p) === focus.municipality &&
                  (focus.barangay === undefined ||
                      barangayOf(p) === focus.barangay),
          )
        : [];

    const focusTitle = focus
        ? focus.barangay === undefined
            ? `${focus.municipality}, ${province}`
            : focus.barangay === NONE
              ? `No barangay, ${focus.municipality}`
              : `Brgy. ${focus.barangay}, ${focus.municipality}`
        : null;

    const activeTab = VIEW_TABS.find((t) => t.id === tab)!;
    const contextLabel = `${tab === 'barangay' ? `${municipality}, ` : ''}${province}${year ? ` · ${year}` : ''}`;

    if (!province) {
        return (
            <>
                <Head title="Summary graphs" />
                <div className="flex h-full flex-1 flex-col gap-4 p-4">
                    <h1 className="text-xl font-semibold tracking-tight">
                        Summary graphs
                    </h1>
                    <p className="mt-1 max-w-prose text-sm text-muted-foreground">
                        This PSTO account has no province assigned. Ask a super
                        admin to set the province so projects can load.
                    </p>
                </div>
            </>
        );
    }

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
                                {province} · DOST PSTO
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                                Summary graphs
                            </h1>
                            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                                See projects per municipality and barangay. Click
                                a bar to list its projects.
                            </p>
                        </header>
                    </div>

                    <nav
                        className="sticky top-0 z-20 -mx-1 rounded-xl border border-border bg-card p-1.5"
                        aria-label="Analytics level"
                    >
                        <div className="grid grid-cols-2 gap-1">
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

                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3.5 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
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
                            {tab === 'barangay' ? (
                                <SelectFilter
                                    label="Municipality"
                                    value={municipality}
                                    onChange={setPickedMunicipality}
                                    options={municipalityOptions.map((m) => ({
                                        value: m,
                                        label: m,
                                    }))}
                                    disabled={municipalityOptions.length === 0}
                                />
                            ) : null}
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
                        </div>
                    </div>

                    {loading ? (
                        <LoadingSkeleton />
                    ) : yearFiltered.length === 0 ? (
                        <EmptyChart label="No projects for this year. Clear year or add projects on Programs." />
                    ) : tab === 'municipality' ? (
                        <div className="space-y-4">
                            <StatTiles
                                items={[
                                    {
                                        label: 'Projects',
                                        value: String(
                                            byMunicipality.stats.total,
                                        ),
                                    },
                                    {
                                        label: 'Funding',
                                        value: formatPeso(
                                            byMunicipality.stats.funding,
                                        ),
                                    },
                                    {
                                        label: 'Beneficiaries',
                                        value: formatCompact(
                                            byMunicipality.stats.beneficiaries,
                                        ),
                                    },
                                    {
                                        label: 'Ongoing',
                                        value: String(
                                            byMunicipality.stats.active,
                                        ),
                                    },
                                ]}
                            />

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card
                                    title="Projects per municipality"
                                    subtitle={province}
                                >
                                    <BarChart
                                        rows={byMunicipality.projects}
                                        onSelect={(row) =>
                                            setFocus({ municipality: row.key })
                                        }
                                    />
                                </Card>
                                <Card
                                    title="Funding per municipality"
                                    subtitle="₱"
                                >
                                    <BarChart
                                        rows={byMunicipality.funding}
                                        format="compact"
                                        onSelect={(row) =>
                                            setFocus({ municipality: row.key })
                                        }
                                    />
                                </Card>
                                <Card title="Status" subtitle={province}>
                                    <DonutChart
                                        rows={byMunicipality.byStatus}
                                        centerLabel="STATUS"
                                    />
                                </Card>
                                <Card title="Programs" subtitle={province}>
                                    <DonutChart
                                        rows={byMunicipality.byProgram}
                                        centerLabel="PROGRAM"
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
                    ) : (
                        <div className="space-y-4">
                            <StatTiles
                                items={[
                                    {
                                        label: 'Projects',
                                        value: String(byBarangay.stats.total),
                                    },
                                    {
                                        label: 'Funding',
                                        value: formatPeso(
                                            byBarangay.stats.funding,
                                        ),
                                    },
                                    {
                                        label: 'Barangays',
                                        value: String(
                                            new Set(
                                                byBarangay.list.map(barangayOf),
                                            ).size,
                                        ),
                                    },
                                    {
                                        label: 'Ongoing',
                                        value: String(byBarangay.stats.active),
                                    },
                                ]}
                            />

                            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                                <Card
                                    title="Projects per barangay"
                                    subtitle={`Top 15 · ${municipality}`}
                                >
                                    <BarChart
                                        rows={byBarangay.projects}
                                        onSelect={(row) =>
                                            setFocus({
                                                municipality,
                                                barangay: row.key,
                                            })
                                        }
                                    />
                                </Card>
                                <Card
                                    title="Funding per barangay"
                                    subtitle="Top 15"
                                >
                                    <BarChart
                                        rows={byBarangay.funding}
                                        format="compact"
                                        onSelect={(row) =>
                                            setFocus({
                                                municipality,
                                                barangay: row.key,
                                            })
                                        }
                                    />
                                </Card>
                                <Card title="Status" subtitle={municipality}>
                                    <DonutChart
                                        rows={byBarangay.byStatus}
                                        centerLabel="STATUS"
                                    />
                                </Card>
                            </div>
                        </div>
                    )}

                    <ProjectListDialog
                        title={focusTitle}
                        projects={focusProjects}
                        onClose={() => setFocus(null)}
                    />

                    <p className="text-center text-xs text-muted-foreground">
                        Information &amp; Monitoring of Projects, Services and
                        S&amp;T Interventions · DOST-MIMAROPA
                    </p>
                </div>
            </section>
        </>
    );
};

export default PstoSummaryGraphs;
