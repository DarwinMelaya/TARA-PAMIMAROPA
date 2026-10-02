import {
    ChartBar,
    ChartColumn,
    ChartPie,
    Download,
    FileSpreadsheet,
    FileText,
    ListChecks,
    Table2,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ComponentType } from 'react';
import { toast } from 'sonner';
import {
    ALL,
    BRAND,
    PROVINCE_COLORS,
    SelectFilter,
    metricByKey,
    programRows,
    statusRows,
} from '@/components/graphs/SummaryCharts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Spinner } from '@/components/ui/spinner';
import {
    PROVINCES,
    projectYear,
    summarizeProjects,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { cn } from '@/lib/utils';
import {
    downloadSummaryExcel,
    downloadSummaryPdf,
    type ReportChart,
    type ReportSection,
    type ReportStat,
} from '@/lib/summary-report';

type ExportFormat = 'pdf' | 'excel';

type Props = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    /** Projects after the page's year filter. */
    projects: TaraProject[];
    year: string;
    defaultProvince: Province | typeof ALL;
};

const STATS_ID = 'stats';
const PROJECTS_ID = 'projects';

const CHART_ICONS: Record<ReportChart, ComponentType<{ className?: string }>> =
    {
        bar: ChartBar,
        column: ChartColumn,
        donut: ChartPie,
    };

const FORMATS: {
    id: ExportFormat;
    label: string;
    hint: string;
    icon: ComponentType<{ className?: string }>;
}[] = [
    {
        id: 'pdf',
        label: 'PDF document',
        hint: 'Ready-to-print A4 report with charts',
        icon: FileText,
    },
    {
        id: 'excel',
        label: 'Excel workbook',
        hint: 'Editable charts with the data behind them',
        icon: FileSpreadsheet,
    },
];

const buildSections = (
    list: TaraProject[],
    province: Province | typeof ALL,
): ReportSection[] => {
    const color = province ? PROVINCE_COLORS[province] : BRAND;
    const municipalityKey = (p: TaraProject) =>
        p.municipality
            ? province
                ? p.municipality
                : `${p.municipality}, ${p.province}`
            : '';

    const byYear = new Map<number, number>();
    for (const p of list) {
        const y = projectYear(p);
        byYear.set(y, (byYear.get(y) ?? 0) + 1);
    }
    const perYear = [...byYear.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([y, value]) => ({ key: String(y), label: String(y), value, color }));

    const sections: (ReportSection & { regionOnly?: boolean })[] = [
        {
            id: 'byProvince',
            title: 'Projects per province',
            chart: 'bar',
            format: 'number',
            regionOnly: true,
            rows: metricByKey(list, (p) => p.province, 'count', (k) =>
                PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
        },
        {
            id: 'fundingByProvince',
            title: 'Funding per province',
            chart: 'bar',
            format: 'peso',
            regionOnly: true,
            rows: metricByKey(list, (p) => p.province, 'budget', (k) =>
                PROVINCE_COLORS[k as Province] ?? BRAND,
            ),
        },
        {
            id: 'status',
            title: 'Implementation status',
            chart: 'donut',
            format: 'number',
            rows: statusRows(list),
        },
        {
            id: 'program',
            title: 'Program mix',
            chart: 'donut',
            format: 'number',
            rows: programRows(list),
        },
        {
            id: 'perYear',
            title: 'Projects per year approved',
            chart: 'column',
            format: 'number',
            rows: perYear,
        },
        {
            id: 'byMunicipality',
            title: 'Top municipalities by projects',
            chart: 'bar',
            format: 'number',
            rows: metricByKey(list, municipalityKey, 'count', () => color, 15),
        },
        {
            id: 'fundingByMunicipality',
            title: 'Top municipalities by funding',
            chart: 'bar',
            format: 'peso',
            rows: metricByKey(list, municipalityKey, 'budget', () => color, 15),
        },
    ];

    return sections
        .filter((s) => !(province && s.regionOnly) && s.rows.length > 0)
        .map(({ id, title, chart, format, rows }) => ({
            id,
            title,
            chart,
            format,
            rows: rows.map((r) => ({
                label: r.label,
                value: r.value,
                color: r.color,
            })),
        }));
};

const buildStats = (list: TaraProject[]): ReportStat[] => {
    const s = summarizeProjects(list);
    return [
        { label: 'Total projects', value: s.total, format: 'number' },
        { label: 'Total funding', value: s.funding, format: 'peso' },
        {
            label: 'Average project cost',
            value: s.total ? s.funding / s.total : 0,
            format: 'peso',
        },
        { label: 'Ongoing', value: s.active, format: 'number' },
        { label: 'Completed', value: s.completed, format: 'number' },
        {
            label: 'Municipalities covered',
            value: new Set(list.map((p) => p.municipality).filter(Boolean))
                .size,
            format: 'number',
        },
    ];
};

const ExportReportDialog = ({
    open,
    onOpenChange,
    projects,
    year,
    defaultProvince,
}: Props) => {
    const [format, setFormat] = useState<ExportFormat>('pdf');
    const [province, setProvince] = useState<Province | typeof ALL>(
        defaultProvince,
    );
    const [excluded, setExcluded] = useState<Set<string>>(
        () => new Set([PROJECTS_ID]),
    );
    const [busy, setBusy] = useState(false);

    const scoped = useMemo(
        () =>
            province
                ? projects.filter((p) => p.province === province)
                : projects,
        [projects, province],
    );
    const sections = useMemo(
        () => buildSections(scoped, province),
        [scoped, province],
    );

    const options = [
        { id: STATS_ID, title: 'Key figures', hint: '6 headline numbers' },
        ...sections.map((s) => ({
            id: s.id,
            title: s.title,
            hint: `${s.rows.length} ${s.rows.length === 1 ? 'item' : 'items'}`,
            chart: s.chart,
        })),
        {
            id: PROJECTS_ID,
            title: 'Project list',
            hint: `${scoped.length} projects as a table`,
        },
    ];

    const isOn = (id: string) => !excluded.has(id);
    const selectedCount = options.filter((o) => isOn(o.id)).length;

    const toggle = (id: string) =>
        setExcluded((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });

    const scopeLabel = `${province || 'MIMAROPA (all provinces)'} · ${year ? `Year ${year}` : 'All years'}`;

    const download = async () => {
        const report = {
            title: 'Summary graphs report',
            scopeLabel,
            stats: isOn(STATS_ID) ? buildStats(scoped) : [],
            sections: sections.filter((s) => isOn(s.id)),
            projects: isOn(PROJECTS_ID) ? scoped : null,
        };

        setBusy(true);
        try {
            if (format === 'pdf') downloadSummaryPdf(report);
            else await downloadSummaryExcel(report);
            toast.success(
                format === 'pdf' ? 'PDF report downloaded.' : 'Excel report downloaded.',
            );
            onOpenChange(false);
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : 'Could not build the report.',
            );
        } finally {
            setBusy(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
            <DialogContent className="flex max-h-[90vh] flex-col gap-0 p-0 sm:max-w-2xl">
                <DialogHeader className="border-b px-6 pt-6 pb-4 pr-12">
                    <DialogTitle>Export report</DialogTitle>
                    <DialogDescription>
                        Pick a format and what to include. The year filter on
                        the page applies.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid min-h-0 flex-1 gap-6 overflow-y-auto px-6 py-5">
                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Format
                        </legend>
                        <div className="grid gap-2 sm:grid-cols-2">
                            {FORMATS.map((f) => {
                                const on = format === f.id;
                                return (
                                    <button
                                        key={f.id}
                                        type="button"
                                        role="radio"
                                        aria-checked={on}
                                        onClick={() => setFormat(f.id)}
                                        className={cn(
                                            'flex cursor-pointer items-start gap-3 rounded-lg border p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none',
                                            on
                                                ? 'border-foreground bg-muted/60'
                                                : 'border-border hover:bg-muted/40',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'grid size-9 shrink-0 place-items-center rounded-md',
                                                on
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'bg-muted text-muted-foreground',
                                            )}
                                        >
                                            <f.icon
                                                className="size-4"
                                                aria-hidden="true"
                                            />
                                        </span>
                                        <span>
                                            <span className="block text-sm font-semibold">
                                                {f.label}
                                            </span>
                                            <span className="mt-0.5 block text-xs text-muted-foreground">
                                                {f.hint}
                                            </span>
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </fieldset>

                    <fieldset className="grid gap-2">
                        <legend className="mb-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                            Coverage
                        </legend>
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="min-w-[220px] flex-1">
                                <SelectFilter
                                    label="Province"
                                    value={province}
                                    onChange={(v) =>
                                        setProvince(v as Province | typeof ALL)
                                    }
                                    options={[
                                        {
                                            value: ALL,
                                            label: 'All provinces (MIMAROPA)',
                                        },
                                        ...PROVINCES.map((p) => ({
                                            value: p,
                                            label: p,
                                        })),
                                    ]}
                                />
                            </div>
                            <p className="min-h-9 rounded-lg border border-dashed px-3 py-2 text-sm text-muted-foreground">
                                {year ? `Year ${year}` : 'All years'} ·{' '}
                                {scoped.length} projects
                            </p>
                        </div>
                    </fieldset>

                    <fieldset className="grid gap-2">
                        <div className="mb-1 flex items-center justify-between gap-2">
                            <legend className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                                Include
                            </legend>
                            <div className="flex gap-1 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setExcluded(new Set())}
                                    className="cursor-pointer rounded px-2 py-1 font-medium hover:bg-muted"
                                >
                                    Select all
                                </button>
                                <button
                                    type="button"
                                    onClick={() =>
                                        setExcluded(
                                            new Set(options.map((o) => o.id)),
                                        )
                                    }
                                    className="cursor-pointer rounded px-2 py-1 font-medium hover:bg-muted"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                        <ul className="divide-y rounded-lg border">
                            {options.map((o) => {
                                const Icon =
                                    'chart' in o && o.chart
                                        ? CHART_ICONS[o.chart]
                                        : o.id === PROJECTS_ID
                                          ? Table2
                                          : ListChecks;
                                const id = `export-${o.id}`;
                                return (
                                    <li key={o.id}>
                                        <label
                                            htmlFor={id}
                                            className="flex cursor-pointer items-center gap-3 px-3.5 py-2.5 hover:bg-muted/40"
                                        >
                                            <Checkbox
                                                id={id}
                                                checked={isOn(o.id)}
                                                onCheckedChange={() =>
                                                    toggle(o.id)
                                                }
                                            />
                                            <Icon
                                                className="size-4 text-muted-foreground"
                                                aria-hidden="true"
                                            />
                                            <span className="min-w-0 flex-1 text-sm font-medium">
                                                {o.title}
                                            </span>
                                            <span className="shrink-0 text-xs text-muted-foreground">
                                                {o.hint}
                                            </span>
                                        </label>
                                    </li>
                                );
                            })}
                        </ul>
                    </fieldset>
                </div>

                <DialogFooter className="items-center border-t bg-muted/30 px-6 py-4 sm:justify-between">
                    <p className="text-xs text-muted-foreground">
                        {selectedCount} of {options.length} parts selected
                    </p>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row">
                        <Button
                            type="button"
                            variant="ghost"
                            disabled={busy}
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={busy || selectedCount === 0 || scoped.length === 0}
                            onClick={download}
                        >
                            {busy ? (
                                <Spinner />
                            ) : (
                                <Download className="size-4" aria-hidden="true" />
                            )}
                            Download {format === 'pdf' ? 'PDF' : 'Excel'}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ExportReportDialog;
