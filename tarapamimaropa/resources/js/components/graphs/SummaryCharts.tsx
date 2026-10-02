import {
    useState,
    type ChangeEvent,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    PROGRAM_META,
    PROJECT_STATUSES,
    STATUS_META,
    formatCompact,
    formatPeso,
    projectYear,
    type ProjectStatus,
    type Province,
    type TaraProgram,
    type TaraProject,
} from '@/constants/taraProjects';

export type Row = { key: string; label: string; value: number; color: string };

export type ChartTip = {
    label: string;
    value: string;
    detail?: string;
    color: string;
    x: number;
    y: number;
};

export type ValueFormat = 'number' | 'peso' | 'compact';

export type StackSeries = { key: string; label: string; color: string };

export type StackRow = {
    key: string;
    label: string;
    values: Record<string, number>;
};

export const BRAND = '#22d3ee';
export const ALL = '';

export const PROVINCE_COLORS: Record<Province, string> = {
    'Oriental Mindoro': '#22d3ee',
    'Occidental Mindoro': '#38bdf8',
    Marinduque: '#818cf8',
    Romblon: '#67e8f9',
    Palawan: '#2dd4bf',
};

/** Fixed status palette — same colors everywhere. */
export const STATUS_COLORS: Record<ProjectStatus, string> = {
    planning: '#94a3b8',
    ongoing: '#3b82f6',
    completed: '#10b981',
    delayed: '#ef4444',
    on_hold: '#f59e0b',
    cancelled: '#f43f5e',
};

/** Dashboard program buckets (R&D / unknown → Other). */
export const PROGRAM_BUCKETS: {
    key: string;
    label: string;
    match: (p: TaraProgram) => boolean;
    color: string;
}[] = [
    {
        key: 'GIA',
        label: 'GIA',
        match: (p) => p === 'GIA',
        color: PROGRAM_META.GIA.color,
    },
    {
        key: 'CEST',
        label: 'CEST',
        match: (p) => p === 'CEST',
        color: PROGRAM_META.CEST.color,
    },
    {
        key: 'SETUP',
        label: 'SETUP',
        match: (p) => p === 'SETUP',
        color: PROGRAM_META.SETUP.color,
    },
    {
        key: 'STARBOOKS',
        label: 'STARBOOKS',
        match: (p) => p === 'STARBOOKS',
        color: PROGRAM_META.STARBOOKS.color,
    },
    {
        key: 'SSCP',
        label: 'SSCP',
        match: (p) => p === 'SSCP',
        color: PROGRAM_META.SSCP.color,
    },
    {
        key: 'iHub',
        label: 'iHub',
        match: (p) => p === 'Community',
        color: PROGRAM_META.Community.color,
    },
    {
        key: 'Other',
        label: 'Other Programs',
        match: (p) => p === 'Water' || p === 'Energy',
        color: '#64748b',
    },
];

export const bucketKey = (program: TaraProgram | string): string => {
    const hit = PROGRAM_BUCKETS.find((b) => b.match(program as TaraProgram));
    return hit?.key ?? 'Other';
};

export const bucketMeta = (key: string) =>
    PROGRAM_BUCKETS.find((b) => b.key === key) ?? PROGRAM_BUCKETS[PROGRAM_BUCKETS.length - 1];

export const formatValue = (n: number, fmt: ValueFormat = 'number') => {
    if (fmt === 'peso') return formatPeso(n);
    if (fmt === 'compact') return formatCompact(n);
    return String(n);
};

export const tipFromEvent = (
    e: MouseEvent,
    payload: Omit<ChartTip, 'x' | 'y'>,
): ChartTip => ({
    ...payload,
    x: e.clientX,
    y: e.clientY,
});

export const rowsFromMap = (
    map: Map<string, number>,
    colorFor: (key: string) => string,
    sort: 'value' | 'key' = 'value',
): Row[] => {
    const entries = [...map.entries()].filter(([, v]) => v > 0);
    if (sort === 'value') entries.sort((a, b) => b[1] - a[1]);
    else entries.sort((a, b) => a[0].localeCompare(b[0]));
    return entries.map(([key, value]) => ({
        key,
        label: key,
        value,
        color: colorFor(key),
    }));
};

export const statusRows = (list: TaraProject[]): Row[] => {
    const counts = new Map<ProjectStatus, number>();
    for (const p of list) {
        counts.set(p.status, (counts.get(p.status) ?? 0) + 1);
    }
    return PROJECT_STATUSES.filter((s) => (counts.get(s) ?? 0) > 0).map(
        (status) => ({
            key: status,
            label: STATUS_META[status].label,
            value: counts.get(status) ?? 0,
            color: STATUS_COLORS[status],
        }),
    );
};

export const programRows = (list: TaraProject[]): Row[] => {
    const counts = new Map<string, number>();
    for (const p of list) {
        const key = bucketKey(p.program);
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return PROGRAM_BUCKETS.filter((b) => (counts.get(b.key) ?? 0) > 0).map(
        (b) => ({
            key: b.key,
            label: b.label,
            value: counts.get(b.key) ?? 0,
            color: b.color,
        }),
    );
};

export const metricByKey = (
    list: TaraProject[],
    keyOf: (p: TaraProject) => string,
    metric: 'count' | 'budget' | 'beneficiaries',
    colorFor: (key: string) => string,
    limit?: number,
): Row[] => {
    const map = new Map<string, number>();
    for (const p of list) {
        const key = keyOf(p);
        if (!key) continue;
        const add =
            metric === 'count'
                ? 1
                : metric === 'budget'
                  ? p.budget
                  : p.beneficiaries;
        map.set(key, (map.get(key) ?? 0) + add);
    }
    let rows = rowsFromMap(map, colorFor);
    if (limit) rows = rows.slice(0, limit);
    return rows;
};

/* ── UI chrome ──────────────────────────────────────────────────── */

export const ChartTooltip = ({ tip }: { tip: ChartTip | null }) => {
    if (!tip) return null;
    return (
        <div
            role="tooltip"
            className="pointer-events-none fixed z-[1100] max-w-[220px] rounded-lg border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md"
            style={{
                left: tip.x,
                top: tip.y,
                transform: 'translate(-50%, calc(-100% - 10px))',
            }}
        >
            <div className="flex items-center gap-1.5">
                <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: tip.color }}
                />
                <p className="truncate text-[11px] font-semibold">
                    {tip.label}
                </p>
            </div>
            <p className="mt-0.5 text-xs font-bold tabular-nums">
                {tip.value}
            </p>
            {tip.detail ? (
                <p className="mt-0.5 text-[10px] text-muted-foreground">{tip.detail}</p>
            ) : null}
        </div>
    );
};

export const EmptyChart = ({
    label = 'No data for current filters.',
}: {
    label?: string;
}) => (
    <p className="flex h-36 items-center justify-center text-xs text-muted-foreground">
        {label}
    </p>
);

export const Card = ({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) => (
    <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
        <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
                {title}
            </h3>
            {subtitle ? (
                <span className="text-[11px] font-medium text-muted-foreground">
                    {subtitle}
                </span>
            ) : null}
        </div>
        {children}
    </div>
);

export const SelectFilter = ({
    label,
    value,
    onChange,
    options,
    disabled = false,
}: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
    disabled?: boolean;
}) => (
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground">
        {label}
        <select
            value={value}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                onChange(e.target.value)
            }
            className="min-h-9 w-full rounded-lg border border-input bg-background px-2.5 text-sm text-foreground disabled:cursor-not-allowed disabled:opacity-70"
        >
            {options.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    </label>
);

export const LoadingSkeleton = () => (
    <div className="space-y-4" aria-busy="true" aria-label="Loading charts">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-border bg-muted"
                />
            ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-56 animate-pulse rounded-xl border border-border bg-muted"
                />
            ))}
        </div>
    </div>
);

export const StatusLegend = () => (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {PROJECT_STATUSES.map((s) => (
            <li
                key={s}
                className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
            >
                <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: STATUS_COLORS[s] }}
                />
                {STATUS_META[s].label}
            </li>
        ))}
    </ul>
);

/* ── Donut ──────────────────────────────────────────────────────── */
export const DonutChart = ({
    rows,
    format = 'number',
    centerLabel = 'TOTAL',
}: {
    rows: Row[];
    format?: ValueFormat;
    centerLabel?: string;
}) => {
    const [tip, setTip] = useState<ChartTip | null>(null);
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const total = rows.reduce((s, r) => s + r.value, 0);
    const r = 42;
    const c = 2 * Math.PI * r;
    let offset = 0;

    if (rows.length === 0 || total === 0) return <EmptyChart />;

    const hovered = hoverKey ? rows.find((row) => row.key === hoverKey) : null;

    const showTip = (e: MouseEvent, row: Row) => {
        const pct = Math.round((row.value / total) * 100);
        setHoverKey(row.key);
        setTip(
            tipFromEvent(e, {
                label: row.label,
                value: formatValue(row.value, format),
                detail: `${pct}% of total`,
                color: row.color,
            }),
        );
    };

    return (
        <div className="relative flex flex-col items-center gap-4 sm:flex-row">
            <ChartTooltip tip={tip} />
            <svg
                viewBox="0 0 120 120"
                className="h-36 w-36 shrink-0 -rotate-90"
                role="img"
                aria-label={`${centerLabel}: ${formatValue(total, format)}`}
            >
                <circle
                    cx="60"
                    cy="60"
                    r={r}
                    fill="none"
                    className="stroke-muted"
                    strokeWidth="16"
                />
                {rows.map((row) => {
                    const frac = row.value / total;
                    const dash = frac * c;
                    const isDim = hoverKey !== null && hoverKey !== row.key;
                    const seg = (
                        <circle
                            key={row.key}
                            cx="60"
                            cy="60"
                            r={r}
                            fill="none"
                            stroke={row.color}
                            strokeWidth="16"
                            strokeDasharray={`${dash} ${c - dash}`}
                            strokeDashoffset={-offset}
                            strokeLinecap="butt"
                            opacity={isDim ? 0.35 : 1}
                            className="cursor-default transition-opacity duration-[180ms]"
                            onMouseEnter={(e) => showTip(e, row)}
                            onMouseMove={(e) => showTip(e, row)}
                            onMouseLeave={() => {
                                setHoverKey(null);
                                setTip(null);
                            }}
                        />
                    );
                    offset += dash;
                    return seg;
                })}
                <text
                    x="60"
                    y="58"
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="700"
                    className="fill-foreground"
                    transform="rotate(90 60 60)"
                >
                    {hovered
                        ? formatValue(hovered.value, format)
                        : formatValue(total, format)}
                </text>
                <text
                    x="60"
                    y="74"
                    textAnchor="middle"
                    fontSize="7"
                    fontWeight="600"
                    letterSpacing="0.08em"
                    className="fill-muted-foreground"
                    transform="rotate(90 60 60)"
                >
                    {hovered
                        ? hovered.label.length > 12
                            ? `${hovered.label.slice(0, 11)}…`
                            : hovered.label.toUpperCase()
                        : centerLabel}
                </text>
            </svg>
            <ul className="min-w-0 flex-1 space-y-1">
                {rows.map((row) => {
                    const pct = Math.round((row.value / total) * 100);
                    const active = hoverKey === row.key;
                    return (
                        <li key={row.key}>
                            <button
                                type="button"
                                onMouseEnter={(e) => showTip(e, row)}
                                onMouseMove={(e) => showTip(e, row)}
                                onMouseLeave={() => {
                                    setHoverKey(null);
                                    setTip(null);
                                }}
                                className={[
                                    'flex w-full min-h-8 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs transition duration-[180ms]',
                                    active
                                        ? 'bg-muted text-foreground'
                                        : 'text-foreground/80 hover:bg-muted',
                                ].join(' ')}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: row.color }}
                                    />
                                    <span className="truncate">{row.label}</span>
                                </span>
                                <span className="shrink-0 tabular-nums text-muted-foreground">
                                    <span className="font-bold text-foreground">
                                        {formatValue(row.value, format)}
                                    </span>{' '}
                                    <span>({pct}%)</span>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
};

/* ── Vertical columns ───────────────────────────────────────────── */
export const ColumnChart = ({
    rows,
    format = 'number',
}: {
    rows: Row[];
    format?: ValueFormat;
}) => {
    const [tip, setTip] = useState<ChartTip | null>(null);
    const max = Math.max(1, ...rows.map((r) => r.value));
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative flex h-52 items-end gap-2 sm:gap-3">
            <ChartTooltip tip={tip} />
            {rows.map((row) => {
                const pct = Math.round((row.value / max) * 100);
                const share = Math.round((row.value / total) * 100);
                const showTip = (e: MouseEvent) =>
                    setTip(
                        tipFromEvent(e, {
                            label: row.label,
                            value: formatValue(row.value, format),
                            detail: `${share}% of series`,
                            color: row.color,
                        }),
                    );
                return (
                    <button
                        key={row.key}
                        type="button"
                        onMouseEnter={showTip}
                        onMouseMove={showTip}
                        onMouseLeave={() => setTip(null)}
                        className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md outline-none transition duration-[180ms] hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30"
                    >
                        <span className="text-[11px] font-bold tabular-nums text-foreground">
                            {formatValue(row.value, format)}
                        </span>
                        <div className="flex h-36 w-full items-end justify-center">
                            <div
                                className="w-full max-w-[46px] rounded-t-md transition-[height] duration-500 ease-out"
                                style={{
                                    height: `${Math.max(pct, row.value > 0 ? 4 : 0)}%`,
                                    background: row.color,
                                }}
                            />
                        </div>
                        <span className="line-clamp-2 text-center text-[10px] leading-tight text-muted-foreground">
                            {row.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

/* ── Line (yearly) ──────────────────────────────────────────────── */
export const YEAR_WINDOW = 6;

export const AreaLineChart = ({ rows }: { rows: Row[] }) => {
    const [tip, setTip] = useState<ChartTip | null>(null);
    const [start, setStart] = useState(() =>
        Math.max(0, rows.length - YEAR_WINDOW),
    );
    const W = 320;
    const H = 150;
    const padX = 28;
    const padTop = 20;
    const padBottom = 12;
    const globalMax = Math.max(1, ...rows.map((r) => r.value));
    const nAll = rows.length;
    const canSlide = nAll > YEAR_WINDOW;
    const maxStart = Math.max(0, nAll - YEAR_WINDOW);
    const windowStart = Math.min(start, maxStart);
    const visible = rows.slice(windowStart, windowStart + YEAR_WINDOW);
    const n = visible.length;
    const x = (i: number) =>
        n <= 1 ? W / 2 : padX + (i * (W - 2 * padX)) / (n - 1);
    const y = (v: number) =>
        H - padBottom - (v / globalMax) * (H - padTop - padBottom);
    const pts = visible.map((r, i) => [x(i), y(r.value)] as const);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');

    const canPrev = windowStart > 0;
    const canNext = windowStart < maxStart;
    const rangeLabel =
        n > 0
            ? visible[0].label === visible[n - 1].label
                ? visible[0].label
                : `${visible[0].label} – ${visible[n - 1].label}`
            : '';

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative">
            <ChartTooltip tip={tip} />
            {canSlide ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() => setStart((s) => Math.max(0, s - 1))}
                        disabled={!canPrev}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition duration-[180ms] hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Earlier years"
                    >
                        <HiChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <p className="text-[11px] font-medium tabular-nums text-muted-foreground">
                        {rangeLabel}
                    </p>
                    <button
                        type="button"
                        onClick={() =>
                            setStart((s) => Math.min(maxStart, s + 1))
                        }
                        disabled={!canNext}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition duration-[180ms] hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                        aria-label="Later years"
                    >
                        <HiChevronRight className="h-5 w-5" aria-hidden />
                    </button>
                </div>
            ) : null}
            <svg
                viewBox={`0 0 ${W} ${H}`}
                className="w-full"
                role="img"
                aria-label="Projects per year"
            >
                {[0.25, 0.5, 0.75, 1].map((g) => (
                    <line
                        key={g}
                        x1={padX}
                        x2={W - padX}
                        y1={H - padBottom - g * (H - padTop - padBottom)}
                        y2={H - padBottom - g * (H - padTop - padBottom)}
                        className="stroke-border"
                        strokeWidth="1"
                    />
                ))}
                {line ? (
                    <path
                        d={line}
                        fill="none"
                        stroke={BRAND}
                        strokeWidth="2.5"
                        strokeLinejoin="round"
                        strokeLinecap="round"
                    />
                ) : null}
                {pts.map((p, i) => {
                    const row = visible[i];
                    const showTip = (e: MouseEvent) =>
                        setTip(
                            tipFromEvent(e, {
                                label: row.label,
                                value: String(row.value),
                                detail: 'projects approved',
                                color: BRAND,
                            }),
                        );
                    return (
                        <g key={row.key}>
                            <circle
                                cx={p[0]}
                                cy={p[1]}
                                r="10"
                                fill="transparent"
                                className="cursor-default"
                                onMouseEnter={showTip}
                                onMouseMove={showTip}
                                onMouseLeave={() => setTip(null)}
                            />
                            <circle
                                cx={p[0]}
                                cy={p[1]}
                                r="4"
                                className="fill-background"
                                stroke={BRAND}
                                strokeWidth="2.5"
                                pointerEvents="none"
                            />
                            <text
                                x={p[0]}
                                y={p[1] - 9}
                                textAnchor="middle"
                                fontSize="9"
                                fontWeight="700"
                                className="fill-foreground"
                                pointerEvents="none"
                            >
                                {row.value}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <div className="relative mt-1 h-4">
                {visible.map((row, i) => (
                    <span
                        key={row.key}
                        className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums leading-none text-muted-foreground"
                        style={{ left: `${(x(i) / W) * 100}%` }}
                    >
                        {row.label}
                    </span>
                ))}
            </div>
        </div>
    );
};

/* ── Horizontal bars ────────────────────────────────────────────── */
export const BarChart = ({
    rows,
    format = 'number',
    badges,
    onSelect,
}: {
    rows: Row[];
    format?: ValueFormat;
    badges?: string[];
    onSelect?: (row: Row) => void;
}) => {
    const [tip, setTip] = useState<ChartTip | null>(null);
    const max = Math.max(1, ...rows.map((r) => r.value));
    const total = rows.reduce((s, r) => s + r.value, 0) || 1;

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative space-y-2">
            <ChartTooltip tip={tip} />
            {rows.map((row, i) => {
                const pct = Math.round((row.value / max) * 100);
                const share = Math.round((row.value / total) * 100);
                const showTip = (e: MouseEvent) =>
                    setTip(
                        tipFromEvent(e, {
                            label: row.label,
                            value: formatValue(row.value, format),
                            detail: onSelect
                                ? `${share}% of series · Click to view projects`
                                : `${share}% of series`,
                            color: row.color,
                        }),
                    );
                return (
                    <button
                        key={row.key}
                        type="button"
                        onClick={
                            onSelect
                                ? () => {
                                      setTip(null);
                                      onSelect(row);
                                  }
                                : undefined
                        }
                        onMouseEnter={showTip}
                        onMouseMove={showTip}
                        onMouseLeave={() => setTip(null)}
                        className={`group w-full rounded-md px-1 py-1 text-left transition duration-[180ms] hover:bg-muted focus-visible:ring-2 focus-visible:ring-foreground/30${onSelect ? ' cursor-pointer' : ''}`}
                    >
                        <div className="mb-1 flex min-h-6 items-center justify-between gap-2 text-xs">
                            {badges?.[i] ? (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badges[i]}`}
                                >
                                    {row.label}
                                </span>
                            ) : (
                                <span className="truncate font-semibold text-foreground">
                                    {row.label}
                                </span>
                            )}
                            <span className="shrink-0 font-bold tabular-nums text-foreground">
                                {formatValue(row.value, format)}
                            </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full transition-[width] duration-500 ease-out"
                                style={{
                                    width: `${Math.max(pct, row.value > 0 ? 3 : 0)}%`,
                                    background: row.color,
                                }}
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

/* ── Stacked horizontal bars (program × province) ───────────────── */
export const StackedBarChart = ({
    rows,
    series,
}: {
    rows: StackRow[];
    series: StackSeries[];
}) => {
    const [tip, setTip] = useState<ChartTip | null>(null);
    const totals = rows.map((row) =>
        series.reduce((s, ser) => s + (row.values[ser.key] ?? 0), 0),
    );
    const max = Math.max(1, ...totals);

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative space-y-3">
            <ChartTooltip tip={tip} />
            <ul className="mb-2 flex flex-wrap gap-x-3 gap-y-1">
                {series.map((ser) => (
                    <li
                        key={ser.key}
                        className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"
                    >
                        <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: ser.color }}
                        />
                        {ser.label}
                    </li>
                ))}
            </ul>
            {rows.map((row, idx) => {
                const total = totals[idx];
                return (
                    <div key={row.key}>
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span className="truncate font-semibold text-foreground">
                                {row.label}
                            </span>
                            <span className="shrink-0 font-bold tabular-nums text-foreground">
                                {total}
                            </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                            {series.map((ser) => {
                                const v = row.values[ser.key] ?? 0;
                                if (v <= 0) return null;
                                const width = (v / max) * 100;
                                return (
                                    <button
                                        key={ser.key}
                                        type="button"
                                        className="h-full min-w-[2px] transition-opacity hover:opacity-80"
                                        style={{
                                            width: `${width}%`,
                                            background: ser.color,
                                        }}
                                        onMouseEnter={(e) =>
                                            setTip(
                                                tipFromEvent(e, {
                                                    label: `${row.label} · ${ser.label}`,
                                                    value: String(v),
                                                    detail: `${Math.round((v / (total || 1)) * 100)}% of row`,
                                                    color: ser.color,
                                                }),
                                            )
                                        }
                                        onMouseMove={(e) =>
                                            setTip(
                                                tipFromEvent(e, {
                                                    label: `${row.label} · ${ser.label}`,
                                                    value: String(v),
                                                    detail: `${Math.round((v / (total || 1)) * 100)}% of row`,
                                                    color: ser.color,
                                                }),
                                            )
                                        }
                                        onMouseLeave={() => setTip(null)}
                                        aria-label={`${ser.label}: ${v}`}
                                    />
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export const Chip = ({
    active,
    onClick,
    children,
    color,
}: {
    active: boolean;
    onClick: () => void;
    children: ReactNode;
    color?: string;
}) => (
    <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={[
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:outline-none',
            active
                ? 'border-transparent bg-primary text-primary-foreground'
                : 'border-border text-foreground/80 hover:bg-muted hover:text-foreground',
        ].join(' ')}
    >
        {color ? (
            <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ background: color }}
                aria-hidden
            />
        ) : null}
        {children}
    </button>
);

export const StatTiles = ({
    items,
}: {
    items: { label: string; value: string }[];
}) => (
    <div
        className={`grid gap-2.5 ${items.length > 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}
    >
        {items.map((t) => (
            <div
                key={t.label}
                className="rounded-xl border border-border bg-card p-3.5 shadow-xs"
            >
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                    {t.label}
                </p>
                <p
                    title={t.value}
                    className="mt-1 truncate text-lg font-semibold tracking-tight text-foreground tabular-nums sm:text-xl"
                >
                    {t.value}
                </p>
            </div>
        ))}
    </div>
);

/** Closed while `title` is null. */
export const ProjectListDialog = ({
    title,
    projects,
    onClose,
}: {
    title: string | null;
    projects: TaraProject[];
    onClose: () => void;
}) => {
    const sorted = [...projects].sort((a, b) => b.budget - a.budget);
    const funding = projects.reduce((s, p) => s + p.budget, 0);

    return (
        <Dialog
            open={title !== null}
            onOpenChange={(open) => {
                if (!open) onClose();
            }}
        >
            <DialogContent className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl">
                <DialogHeader className="border-b px-5 pt-5 pb-3 pr-12">
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {projects.length}{' '}
                        {projects.length === 1 ? 'project' : 'projects'} ·{' '}
                        {formatPeso(funding)} total funding
                    </DialogDescription>
                </DialogHeader>

                {sorted.length === 0 ? (
                    <EmptyChart label="No projects for current filters." />
                ) : (
                    <ul className="min-h-0 flex-1 divide-y overflow-y-auto">
                        {sorted.map((p) => (
                            <li key={p.id} className="px-5 py-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-foreground">
                                            {p.name}
                                        </p>
                                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                                            {[
                                                p.code,
                                                bucketMeta(bucketKey(p.program))
                                                    .label,
                                                p.barangay,
                                                projectYear(p),
                                            ]
                                                .filter(Boolean)
                                                .join(' · ')}
                                        </p>
                                    </div>
                                    <div className="shrink-0 text-right">
                                        <p className="text-sm font-bold text-foreground tabular-nums">
                                            {formatPeso(p.budget)}
                                        </p>
                                        <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                            <span
                                                className="h-2 w-2 rounded-full"
                                                style={{
                                                    background:
                                                        STATUS_COLORS[p.status],
                                                }}
                                            />
                                            {STATUS_META[p.status].label}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </DialogContent>
        </Dialog>
    );
};
