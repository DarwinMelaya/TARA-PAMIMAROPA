import { Head, Link, usePage } from '@inertiajs/react';
import {
    useMemo,
    useState,
    type ChangeEvent,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { HiArrowLeft, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import {
    PROGRAM_META,
    PROJECT_STATUSES,
    PROVINCES,
    STATUS_META,
    formatCompact,
    formatPeso,
    projectYear,
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

type Row = { key: string; label: string; value: number; color: string };

type ChartTip = {
    label: string;
    value: string;
    detail?: string;
    color: string;
    x: number;
    y: number;
};

type ValueFormat = 'number' | 'peso' | 'compact';

type StackSeries = { key: string; label: string; color: string };

type StackRow = {
    key: string;
    label: string;
    values: Record<string, number>;
};

const BRAND = '#22d3ee';
const ALL = '';

const PROVINCE_COLORS: Record<Province, string> = {
    'Oriental Mindoro': '#22d3ee',
    'Occidental Mindoro': '#38bdf8',
    Marinduque: '#818cf8',
    Romblon: '#67e8f9',
    Palawan: '#2dd4bf',
};

/** Fixed status palette — same colors everywhere. */
const STATUS_COLORS: Record<ProjectStatus, string> = {
    planning: '#94a3b8',
    ongoing: '#3b82f6',
    completed: '#10b981',
    delayed: '#ef4444',
    on_hold: '#f59e0b',
    cancelled: '#f43f5e',
};

/** Dashboard program buckets (R&D / unknown → Other). */
const PROGRAM_BUCKETS: {
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

const bucketKey = (program: TaraProgram | string): string => {
    const hit = PROGRAM_BUCKETS.find((b) => b.match(program as TaraProgram));
    return hit?.key ?? 'Other';
};

const bucketMeta = (key: string) =>
    PROGRAM_BUCKETS.find((b) => b.key === key) ?? PROGRAM_BUCKETS[PROGRAM_BUCKETS.length - 1];

const formatValue = (n: number, fmt: ValueFormat = 'number') => {
    if (fmt === 'peso') return formatPeso(n);
    if (fmt === 'compact') return formatCompact(n);
    return String(n);
};

const tipFromEvent = (
    e: MouseEvent,
    payload: Omit<ChartTip, 'x' | 'y'>,
): ChartTip => ({
    ...payload,
    x: e.clientX,
    y: e.clientY,
});

const rowsFromMap = (
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

const statusRows = (list: TaraProject[]): Row[] => {
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

const programRows = (list: TaraProject[]): Row[] => {
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

const metricByKey = (
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

const ChartTooltip = ({ tip }: { tip: ChartTip | null }) => {
    if (!tip) return null;
    return (
        <div
            role="tooltip"
            className="pointer-events-none fixed z-[1100] max-w-[220px] rounded-lg border border-slate-600 bg-slate-950 px-2.5 py-1.5"
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
                <p className="truncate text-[11px] font-semibold text-white">
                    {tip.label}
                </p>
            </div>
            <p className="mt-0.5 text-xs font-bold tabular-nums text-cyan-200">
                {tip.value}
            </p>
            {tip.detail ? (
                <p className="mt-0.5 text-[10px] text-slate-400">{tip.detail}</p>
            ) : null}
        </div>
    );
};

const EmptyChart = ({
    label = 'No data for current filters.',
}: {
    label?: string;
}) => (
    <p className="flex h-36 items-center justify-center text-xs text-slate-500">
        {label}
    </p>
);

const Card = ({
    title,
    subtitle,
    children,
}: {
    title: string;
    subtitle?: string;
    children: ReactNode;
}) => (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-3 flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                {title}
            </h3>
            {subtitle ? (
                <span className="text-[11px] font-medium text-slate-500">
                    {subtitle}
                </span>
            ) : null}
        </div>
        {children}
    </div>
);

const SelectFilter = ({
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
    <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium text-slate-500">
        {label}
        <select
            value={value}
            disabled={disabled}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                onChange(e.target.value)
            }
            className="min-h-9 w-full rounded-lg border border-slate-300 bg-white px-2.5 text-sm text-slate-900 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
            {options.map((o) => (
                <option key={o.value || 'all'} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    </label>
);

const LoadingSkeleton = () => (
    <div className="space-y-4" aria-busy="true" aria-label="Loading charts">
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-20 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                />
            ))}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
                <div
                    key={i}
                    className="h-56 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
                />
            ))}
        </div>
    </div>
);

const StatusLegend = () => (
    <ul className="flex flex-wrap gap-x-3 gap-y-1">
        {PROJECT_STATUSES.map((s) => (
            <li
                key={s}
                className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"
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
const DonutChart = ({
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
                    className="stroke-slate-300 dark:stroke-slate-800"
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
                    className="fill-slate-800 dark:fill-slate-200"
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
                    className="fill-slate-500"
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
                                        ? 'bg-blue-50 text-blue-900 dark:bg-slate-800 dark:text-cyan-100'
                                        : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
                                ].join(' ')}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: row.color }}
                                    />
                                    <span className="truncate">{row.label}</span>
                                </span>
                                <span className="shrink-0 tabular-nums text-slate-500">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
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
const ColumnChart = ({
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
                        className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md outline-none transition duration-[180ms] hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                        <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200">
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
                        <span className="line-clamp-2 text-center text-[10px] leading-tight text-slate-400">
                            {row.label}
                        </span>
                    </button>
                );
            })}
        </div>
    );
};

/* ── Line (yearly) ──────────────────────────────────────────────── */
const YEAR_WINDOW = 6;

const AreaLineChart = ({ rows }: { rows: Row[] }) => {
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
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition duration-[180ms] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                        aria-label="Earlier years"
                    >
                        <HiChevronLeft className="h-5 w-5" aria-hidden />
                    </button>
                    <p className="text-[11px] font-medium tabular-nums text-slate-500">
                        {rangeLabel}
                    </p>
                    <button
                        type="button"
                        onClick={() =>
                            setStart((s) => Math.min(maxStart, s + 1))
                        }
                        disabled={!canNext}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-300 text-slate-600 transition duration-[180ms] hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-35 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
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
                        className="stroke-slate-200 dark:stroke-slate-700"
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
                                fill="#0f172a"
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
                                className="fill-black dark:fill-white"
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
                        className="absolute top-0 -translate-x-1/2 text-[10px] tabular-nums leading-none text-slate-500"
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
const BarChart = ({
    rows,
    format = 'number',
    badges,
}: {
    rows: Row[];
    format?: ValueFormat;
    badges?: string[];
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
                        className="group w-full rounded-md px-1 py-1 text-left transition duration-[180ms] hover:bg-slate-100 dark:hover:bg-slate-800 focus-visible:ring-2 focus-visible:ring-cyan-500"
                    >
                        <div className="mb-1 flex min-h-6 items-center justify-between gap-2 text-xs">
                            {badges?.[i] ? (
                                <span
                                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${badges[i]}`}
                                >
                                    {row.label}
                                </span>
                            ) : (
                                <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                    {row.label}
                                </span>
                            )}
                            <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {formatValue(row.value, format)}
                            </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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
const StackedBarChart = ({
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
                        className="inline-flex items-center gap-1.5 text-[10px] text-slate-500"
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
                            <span className="truncate font-semibold text-slate-800 dark:text-slate-200">
                                {row.label}
                            </span>
                            <span className="shrink-0 font-bold tabular-nums text-slate-900 dark:text-slate-100">
                                {total}
                            </span>
                        </div>
                        <div className="flex h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
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

/* ── Page ───────────────────────────────────────────────────────── */
type ViewTab = 'region' | 'province' | 'municipality' | 'program';

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

const Chip = ({
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
        className={[
            'rounded-lg border px-3 py-1.5 text-xs font-semibold transition',
            active && !color
                ? 'border-cyan-600 bg-cyan-600 text-white'
                : !active
                  ? 'border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
                  : 'border-transparent text-white',
        ].join(' ')}
        style={active && color ? { background: color, borderColor: color } : undefined}
    >
        {children}
    </button>
);

const StatTiles = ({
    items,
}: {
    items: { label: string; value: string; accent?: string }[];
}) => (
    <div
        className={`grid gap-2.5 ${items.length > 4 ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6' : 'grid-cols-2 sm:grid-cols-4'}`}
    >
        {items.map((t) => (
            <div
                key={t.label}
                className="rounded-xl border border-slate-200 bg-white p-3 text-center dark:border-slate-700 dark:bg-slate-900"
            >
                <p
                    className={`truncate text-base font-bold tabular-nums sm:text-lg ${t.accent ?? 'text-slate-900 dark:text-white'}`}
                >
                    {t.value}
                </p>
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                    {t.label}
                </p>
            </div>
        ))}
    </div>
);

const RegionSummaryGraphs = () => {
    const page = usePage<PageProps>();
    const projectsProp = page.props.projects;
    const loading = projectsProp === undefined;
    const projects = projectsProp ?? [];

    const [tab, setTab] = useState<ViewTab>('region');
    const [year, setYear] = useState(ALL);
    const [browseProvince, setBrowseProvince] = useState<Province>(PROVINCES[0]);
    const [focusProgram, setFocusProgram] = useState(PROGRAM_BUCKETS[0].key);

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

    return (
        <>
            <Head title="Summary graphs" />
            <section className="min-h-screen bg-background px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground transition-colors duration-[180ms] sm:px-6 sm:py-7 lg:pb-7">
                <div className="mx-auto max-w-6xl space-y-5">
                    <div>
                        <Link
                            href={programs.url()}
                            className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-slate-600 transition duration-[180ms] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                        >
                            <HiArrowLeft className="h-4 w-4" aria-hidden />
                            Back to Programs
                        </Link>

                        <header className="mt-4">
                            <p className="text-xs font-medium text-slate-500">
                                MIMAROPA · DOST
                            </p>
                            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                                Summary graphs
                            </h1>
                            <p className="mt-1.5 text-sm text-slate-500">
                                Pick a level below. One view at a time.
                            </p>
                        </header>
                    </div>

                    {/* Step tabs */}
                    <nav
                        className="sticky top-0 z-20 -mx-1 rounded-xl border border-slate-200 bg-white p-1.5 dark:border-slate-700 dark:bg-slate-900"
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
                                                ? 'bg-cyan-600 text-white'
                                                : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
                                        ].join(' ')}
                                    >
                                        <span className="block text-xs font-bold sm:text-sm">
                                            {t.label}
                                        </span>
                                        <span
                                            className={[
                                                'mt-0.5 hidden text-[10px] leading-snug sm:block',
                                                on
                                                    ? 'text-cyan-100'
                                                    : 'text-slate-500',
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
                    <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3.5 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-end sm:justify-between">
                        <div className="min-w-0">
                            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                                Now viewing
                            </p>
                            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {activeTab.label.replace(/^\d+\.\s*/, '')} ·{' '}
                                {contextLabel}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
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
                                    className="min-h-9 rounded-lg border border-slate-300 px-3 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
                                >
                                    Clear year
                                </button>
                            ) : null}
                        </div>
                    </div>

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
                                                accent: 'text-blue-700 dark:text-cyan-300',
                                            },
                                            {
                                                label: 'Total funding',
                                                value: formatPeso(
                                                    regional.summary.funding,
                                                ),
                                                accent: 'text-cyan-700 dark:text-cyan-200',
                                            },
                                            {
                                                label: 'Beneficiaries',
                                                value: formatCompact(
                                                    regional.summary
                                                        .beneficiaries,
                                                ),
                                                accent: 'text-emerald-700 dark:text-emerald-300',
                                            },
                                            {
                                                label: 'Ongoing',
                                                value: String(
                                                    regional.summary.active,
                                                ),
                                                accent: 'text-sky-700 dark:text-sky-300',
                                            },
                                            {
                                                label: 'Completed',
                                                value: String(
                                                    regional.summary.completed,
                                                ),
                                                accent: 'text-emerald-700 dark:text-emerald-300',
                                            },
                                            {
                                                label: 'On hold',
                                                value: String(
                                                    regional.summary.onHold,
                                                ),
                                                accent: 'text-amber-700 dark:text-amber-300',
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

                                    <div className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 dark:border-slate-700 dark:bg-slate-900">
                                        <p className="mb-1.5 text-[11px] font-medium text-slate-500">
                                            Status colors
                                        </p>
                                        <StatusLegend />
                                    </div>
                                </div>
                            ) : null}

                            {tab === 'province' ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium text-slate-500">
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
                                            />
                                        </Card>
                                        <Card
                                            title="Funding by municipality"
                                            subtitle="Top 8"
                                        >
                                            <BarChart
                                                rows={provincialFocus.funding}
                                                format="compact"
                                            />
                                        </Card>
                                    </div>
                                </div>
                            ) : null}

                            {tab === 'municipality' ? (
                                <div className="space-y-4">
                                    <div>
                                        <p className="mb-2 text-[11px] font-medium text-slate-500">
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
                                        <p className="mb-2 text-[11px] font-medium text-slate-500">
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

                    <p className="text-center text-xs text-slate-500">
                        Information &amp; Monitoring of Projects, Services and
                        S&amp;T Interventions · DOST-MIMAROPA
                    </p>
                </div>
            </section>
        </>
    );
};

export default RegionSummaryGraphs;
