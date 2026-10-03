import {
    useId,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { HiChartBar, HiChevronDown, HiChevronUp } from 'react-icons/hi2';
import {
    PROGRAM_META,
    formatCompact,
    formatPeso,
    projectStatusLabel,
    type ProjectStatus,
    type Province,
    type TaraProgram,
    type TaraProject,
} from '@/constants/taraProjects';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';

const TOKENS = {
    light: {
        shell: 'border-[#d5dce5] bg-white shadow-[0_4px_16px_rgba(3,10,23,0.08)]',
        divider: 'border-[#e8edf3]',
        title: 'text-[#030A17]',
        label: 'text-[#4b5563]',
        text: 'text-[#374151]',
        muted: 'text-[#4b5563]',
        accent: 'text-[#1D4ED8]',
        countPill: 'bg-[#eff4ff] text-[#1D4ED8]',
        toggle: 'text-[#374151] hover:bg-[#eff4ff] hover:text-[#1D4ED8]',
        cell: 'border-[#e8edf3] bg-[#f8fafc]',
        rowActive: 'bg-[#1D4ED8]/10 text-[#1E3A8A]',
        rowHover: 'hover:bg-[#eff4ff]',
        track: 'bg-[#e8edf3]',
        tooltip: 'border-[#d5dce5] bg-white/95 text-[#030A17]',
        tipValue: 'text-[#1D4ED8]',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]/60',
        kpiComplete: 'text-emerald-700',
        kpiRisk: 'text-amber-700',
        kpiPeople: 'text-[#1D4ED8]',
        utilValue: 'text-[#1D4ED8]',
        donutHole: '#ffffff',
        svgValue: '#030A17',
        svgLabel: '#4b5563',
        gridLine: 'rgba(3,10,23,0.08)',
    },
    dark: {
        shell: 'border-white/10 bg-[#070F1F]/95 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md',
        divider: 'border-white/10',
        title: 'text-[#f1f1f1]',
        label: 'text-[#a3acbd]',
        text: 'text-[#cfcfcf]',
        muted: 'text-[#a3acbd]',
        accent: 'text-[#93C5FD]',
        countPill: 'bg-[#60A5FA]/15 text-[#BFDBFE]',
        toggle: 'text-[#cfcfcf] hover:bg-white/[0.06] hover:text-white',
        cell: 'border-white/10 bg-[#030A17]/60',
        rowActive: 'bg-[#60A5FA]/15 text-[#DBEAFE]',
        rowHover: 'hover:bg-white/[0.05]',
        track: 'bg-white/10',
        tooltip: 'border-white/15 bg-[#030A17]/95 text-[#f1f1f1]',
        tipValue: 'text-[#93C5FD]',
        focus: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#93C5FD]/70',
        kpiComplete: 'text-emerald-300',
        kpiRisk: 'text-amber-300',
        kpiPeople: 'text-[#93C5FD]',
        utilValue: 'text-[#93C5FD]',
        donutHole: '#070F1F',
        svgValue: '#f1f1f1',
        svgLabel: '#a3acbd',
        gridLine: 'rgba(255,255,255,0.08)',
    },
} as const satisfies Record<ThemeMode, Record<string, string>>;

type Tokens = (typeof TOKENS)[ThemeMode];

const useTokens = (): Tokens => TOKENS[useTheme().theme];

type ChartTip = {
    label: string;
    value: string;
    detail?: string;
    color: string;
    x: number;
    y: number;
};

const ChartTooltip = ({ tip }: { tip: ChartTip | null }) => {
    const t = useTokens();
    if (!tip) return null;
    return (
        <div
            role="tooltip"
            className={`pointer-events-none fixed z-[1100] max-w-[240px] rounded-lg border px-3 py-2 shadow-lg backdrop-blur-md ${t.tooltip}`}
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
                    aria-hidden
                />
                <p className="truncate text-xs font-semibold">{tip.label}</p>
            </div>
            <p
                className={`mt-0.5 text-sm font-bold tabular-nums ${t.tipValue}`}
            >
                {tip.value}
            </p>
            {tip.detail ? (
                <p className={`mt-0.5 text-[11px] ${t.muted}`}>{tip.detail}</p>
            ) : null}
        </div>
    );
};

const tipFromEvent = (
    e: MouseEvent,
    payload: Omit<ChartTip, 'x' | 'y'>,
): ChartTip => ({
    ...payload,
    x: e.clientX,
    y: e.clientY,
});

type ValueFormat = 'number' | 'peso' | 'compact' | 'percent';

const formatSliceValue = (n: number, valueFormat: ValueFormat) => {
    if (valueFormat === 'peso') return formatPeso(n);
    if (valueFormat === 'compact') return formatCompact(n);
    if (valueFormat === 'percent') return `${n}%`;
    return String(n);
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
    planning: '#94a3b8',
    ongoing: '#3b82f6',
    completed: '#34d399',
    delayed: '#f87171',
    on_hold: '#fbbf24',
    cancelled: '#fb7185',
};

const PROVINCE_COLORS: Record<Province, string> = {
    'Oriental Mindoro': '#1d4ed8',
    'Occidental Mindoro': '#3b82f6',
    Marinduque: '#60a5fa',
    Romblon: '#818cf8',
    Palawan: '#0ea5e9',
};

const PALETTE = [
    '#1d4ed8',
    '#3b82f6',
    '#60a5fa',
    '#818cf8',
    '#0ea5e9',
    '#fbbf24',
    '#f472b6',
    '#34d399',
];

type Slice = { key: string; label: string; value: number; color: string };

const buildDonutPath = (
    cx: number,
    cy: number,
    r: number,
    startAngle: number,
    endAngle: number,
) => {
    const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
};

const Section = ({
    title,
    children,
}: {
    title: string;
    children: ReactNode;
}) => {
    const t = useTokens();
    return (
        <section>
            <h3
                className={`font-sei-display mb-2 text-[11px] font-bold tracking-[0.16em] uppercase ${t.label}`}
            >
                {title}
            </h3>
            {children}
        </section>
    );
};

const EmptyNote = ({ children }: { children: ReactNode }) => {
    const t = useTokens();
    return <p className={`text-xs ${t.muted}`}>{children}</p>;
};

const DonutChart = ({
    slices,
    centerLabel,
    centerValue,
    onSliceClick,
    activeKey,
    valueFormat = 'number',
    ariaLabel,
}: {
    slices: Slice[];
    centerLabel: string;
    centerValue: string;
    onSliceClick?: (key: string) => void;
    activeKey?: string | null;
    valueFormat?: ValueFormat;
    ariaLabel: string;
}) => {
    const t = useTokens();
    const [tip, setTip] = useState<ChartTip | null>(null);
    const [hoverKey, setHoverKey] = useState<string | null>(null);
    const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
    let angle = 0;

    const hovered = hoverKey ? slices.find((s) => s.key === hoverKey) : null;

    const showSliceTip = (e: MouseEvent, slice: Slice) => {
        const pct = Math.round((slice.value / total) * 100);
        setHoverKey(slice.key);
        setTip(
            tipFromEvent(e, {
                label: slice.label,
                value: formatSliceValue(slice.value, valueFormat),
                detail: `${pct}% of total`,
                color: slice.color,
            }),
        );
    };

    const clearTip = () => {
        setHoverKey(null);
        setTip(null);
    };

    return (
        <div className="relative flex items-center gap-3">
            <ChartTooltip tip={tip} />
            <svg
                viewBox="0 0 120 120"
                className="h-28 w-28 shrink-0"
                role="img"
                aria-label={ariaLabel}
            >
                {slices.map((slice) => {
                    const sweep = (slice.value / total) * 360;
                    const start = angle;
                    const end =
                        angle + Math.max(sweep, slice.value > 0 ? 0.8 : 0);
                    angle += sweep;
                    if (slice.value <= 0) return null;
                    const isActive = activeKey === slice.key;
                    const isHover = hoverKey === slice.key;
                    return (
                        <path
                            key={slice.key}
                            d={buildDonutPath(60, 60, 52, start, end)}
                            fill={slice.color}
                            opacity={
                                hoverKey || activeKey
                                    ? isHover || isActive
                                        ? 1
                                        : 0.3
                                    : 0.92
                            }
                            className={[
                                'transition-opacity duration-200 motion-reduce:transition-none',
                                onSliceClick
                                    ? 'cursor-pointer'
                                    : 'cursor-default',
                            ].join(' ')}
                            onClick={() => onSliceClick?.(slice.key)}
                            onMouseEnter={(e) => showSliceTip(e, slice)}
                            onMouseMove={(e) => showSliceTip(e, slice)}
                            onMouseLeave={clearTip}
                        />
                    );
                })}
                <circle cx="60" cy="60" r="31" fill={t.donutHole} />
                <text
                    x="60"
                    y="57"
                    textAnchor="middle"
                    fill={t.svgValue}
                    style={{ fontSize: hovered ? 11 : 15, fontWeight: 800 }}
                    className="font-sei-display tabular-nums"
                >
                    {hovered
                        ? formatSliceValue(hovered.value, valueFormat)
                        : centerValue}
                </text>
                <text
                    x="60"
                    y="72"
                    textAnchor="middle"
                    fill={t.svgLabel}
                    style={{
                        fontSize: 8,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                    }}
                >
                    {hovered
                        ? hovered.label.length > 12
                            ? `${hovered.label.slice(0, 11)}…`
                            : hovered.label
                        : centerLabel}
                </text>
            </svg>
            <ul className="min-w-0 flex-1 space-y-0.5">
                {slices
                    .filter((s) => s.value > 0)
                    .map((slice) => {
                        const on =
                            activeKey === slice.key || hoverKey === slice.key;
                        return (
                            <li key={slice.key}>
                                <button
                                    type="button"
                                    onClick={() => onSliceClick?.(slice.key)}
                                    onMouseEnter={(e) => showSliceTip(e, slice)}
                                    onMouseMove={(e) => showSliceTip(e, slice)}
                                    onMouseLeave={clearTip}
                                    aria-pressed={
                                        onSliceClick
                                            ? activeKey === slice.key
                                            : undefined
                                    }
                                    disabled={!onSliceClick}
                                    className={[
                                        'flex min-h-7 w-full items-center gap-2 rounded-md px-1.5 text-left text-xs transition-colors duration-150 disabled:cursor-default',
                                        onSliceClick ? 'cursor-pointer' : '',
                                        on
                                            ? t.rowActive
                                            : `${t.text} ${t.rowHover}`,
                                        t.focus,
                                    ].join(' ')}
                                >
                                    <span
                                        className="h-2 w-2 shrink-0 rounded-full"
                                        style={{ background: slice.color }}
                                        aria-hidden
                                    />
                                    <span className="min-w-0 flex-1 truncate">
                                        {slice.label}
                                    </span>
                                    <span className={`tabular-nums ${t.muted}`}>
                                        {formatSliceValue(
                                            slice.value,
                                            valueFormat,
                                        )}
                                    </span>
                                </button>
                            </li>
                        );
                    })}
            </ul>
        </div>
    );
};

const BarChart = ({
    slices,
    onBarClick,
    activeKey,
    valueFormat = 'number',
}: {
    slices: Slice[];
    onBarClick?: (key: string) => void;
    activeKey?: string | null;
    valueFormat?: ValueFormat;
}) => {
    const t = useTokens();
    const [tip, setTip] = useState<ChartTip | null>(null);
    const max = Math.max(...slices.map((s) => s.value), 1);
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;

    return (
        <div className="relative space-y-1">
            <ChartTooltip tip={tip} />
            {slices.map((slice) => {
                const width = Math.max(
                    (slice.value / max) * 100,
                    slice.value > 0 ? 4 : 0,
                );
                const isActive = activeKey === slice.key;
                const pct = Math.round((slice.value / total) * 100);
                const showTip = (e: MouseEvent) => {
                    setTip(
                        tipFromEvent(e, {
                            label: slice.label,
                            value: formatSliceValue(slice.value, valueFormat),
                            detail: `${pct}% of series · max ${formatSliceValue(max, valueFormat)}`,
                            color: slice.color,
                        }),
                    );
                };
                return (
                    <button
                        key={slice.key}
                        type="button"
                        onClick={() => onBarClick?.(slice.key)}
                        onMouseEnter={showTip}
                        onMouseMove={showTip}
                        onMouseLeave={() => setTip(null)}
                        aria-pressed={onBarClick ? isActive : undefined}
                        disabled={!onBarClick}
                        className={[
                            'w-full rounded-md px-1.5 py-1 text-left transition-colors duration-150 disabled:cursor-default',
                            onBarClick ? 'cursor-pointer' : '',
                            isActive ? t.rowActive : t.rowHover,
                            t.focus,
                        ].join(' ')}
                    >
                        <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                            <span
                                className={`truncate font-semibold ${isActive ? '' : t.text}`}
                            >
                                {slice.label}
                            </span>
                            <span
                                className={`shrink-0 tabular-nums ${t.muted}`}
                            >
                                {formatSliceValue(slice.value, valueFormat)}
                            </span>
                        </div>
                        <div
                            className={`h-1.5 overflow-hidden rounded-full ${t.track}`}
                        >
                            <div
                                className="h-full rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none"
                                style={{
                                    width: `${width}%`,
                                    background: slice.color,
                                    boxShadow: isActive
                                        ? `0 0 10px ${slice.color}66`
                                        : undefined,
                                }}
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

const ColumnChart = ({
    slices,
    valueFormat = 'number',
    onBarClick,
    activeKey,
    height = 96,
    ariaLabel,
}: {
    slices: Slice[];
    valueFormat?: ValueFormat;
    onBarClick?: (key: string) => void;
    activeKey?: string | null;
    height?: number;
    ariaLabel: string;
}) => {
    const t = useTokens();
    const [tip, setTip] = useState<ChartTip | null>(null);
    const max = Math.max(...slices.map((s) => s.value), 1);
    const total = slices.reduce((s, x) => s + x.value, 0) || 1;
    const gap = 8;
    const barW = Math.max(
        12,
        (180 - gap * (slices.length - 1)) / Math.max(slices.length, 1),
    );

    return (
        <div className="relative">
            <ChartTooltip tip={tip} />
            <svg
                viewBox={`0 0 200 ${height + 28}`}
                className="h-auto w-full"
                role="img"
                aria-label={ariaLabel}
            >
                {[0.25, 0.5, 0.75, 1].map((tick) => {
                    const y = height - tick * (height - 8) + 4;
                    return (
                        <line
                            key={tick}
                            x1="0"
                            x2="200"
                            y1={y}
                            y2={y}
                            stroke={t.gridLine}
                            strokeWidth="1"
                        />
                    );
                })}
                {slices.map((slice, index) => {
                    const h = Math.max(
                        (slice.value / max) * (height - 8),
                        slice.value > 0 ? 3 : 0,
                    );
                    const x = index * (barW + gap) + 10;
                    const y = height - h + 4;
                    const isActive = activeKey === slice.key;
                    const pct = Math.round((slice.value / total) * 100);
                    const showTip = (e: MouseEvent) => {
                        setTip(
                            tipFromEvent(e, {
                                label: slice.label,
                                value: formatSliceValue(
                                    slice.value,
                                    valueFormat,
                                ),
                                detail:
                                    valueFormat === 'percent'
                                        ? 'Avg progress'
                                        : `${pct}% of series`,
                                color: slice.color,
                            }),
                        );
                    };
                    return (
                        <g key={slice.key}>
                            <rect
                                x={x}
                                y={4}
                                width={barW}
                                height={height}
                                fill="transparent"
                                className={
                                    onBarClick
                                        ? 'cursor-pointer'
                                        : 'cursor-default'
                                }
                                onClick={() => onBarClick?.(slice.key)}
                                onMouseEnter={showTip}
                                onMouseMove={showTip}
                                onMouseLeave={() => setTip(null)}
                            />
                            <rect
                                x={x}
                                y={y}
                                width={barW}
                                height={h}
                                rx="3"
                                fill={slice.color}
                                opacity={activeKey && !isActive ? 0.3 : 0.92}
                                className="pointer-events-none transition-opacity duration-200 motion-reduce:transition-none"
                            />
                            <text
                                x={x + barW / 2}
                                y={height + 17}
                                textAnchor="middle"
                                fill={t.svgLabel}
                                style={{ fontSize: 8, fontWeight: 600 }}
                            >
                                {slice.label.length > 7
                                    ? `${slice.label.slice(0, 6)}…`
                                    : slice.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
            <ul className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
                {slices.map((slice) => (
                    <li
                        key={slice.key}
                        className={`inline-flex items-center gap-1 text-[11px] tabular-nums ${t.muted}`}
                    >
                        <span
                            className="h-1.5 w-1.5 shrink-0 rounded-full"
                            style={{ background: slice.color }}
                            aria-hidden
                        />
                        <span className="sr-only">{slice.label}: </span>
                        {formatSliceValue(slice.value, valueFormat)}
                    </li>
                ))}
            </ul>
        </div>
    );
};

const AreaSpark = ({
    points,
    color = '#60a5fa',
}: {
    points: { label: string; value: number }[];
    color?: string;
}) => {
    const t = useTokens();
    const gradientId = useId();
    const [tip, setTip] = useState<ChartTip | null>(null);
    const [hoverIdx, setHoverIdx] = useState<number | null>(null);
    const w = 200;
    const h = 72;
    const max = Math.max(...points.map((p) => p.value), 1);
    const step = points.length > 1 ? w / (points.length - 1) : w;
    const coords = points.map((p, i) => {
        const x = i * step;
        const y = h - 10 - (p.value / max) * (h - 22);
        return { x, y, ...p };
    });
    const line = coords
        .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`)
        .join(' ');
    const area = `${line} L ${coords[coords.length - 1]?.x ?? 0} ${h} L 0 ${h} Z`;

    return (
        <div className="relative">
            <ChartTooltip tip={tip} />
            <svg
                viewBox={`0 0 ${w} ${h + 16}`}
                className="h-auto w-full overflow-visible"
                role="img"
                aria-label="Projects per end year"
            >
                <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity="0.4" />
                        <stop
                            offset="100%"
                            stopColor={color}
                            stopOpacity="0.02"
                        />
                    </linearGradient>
                </defs>
                <path d={area} fill={`url(#${gradientId})`} />
                <path d={line} fill="none" stroke={color} strokeWidth="2" />
                {coords.map((c, i) => {
                    const showTip = (e: MouseEvent) => {
                        setHoverIdx(i);
                        setTip(
                            tipFromEvent(e, {
                                label: `Year ${c.label}`,
                                value: `${c.value} projects`,
                                detail: 'End-year pipeline',
                                color,
                            }),
                        );
                    };
                    return (
                        <g key={c.label}>
                            <circle
                                cx={c.x}
                                cy={c.y}
                                r={hoverIdx === i ? 4.5 : 2.5}
                                fill={color}
                                className="pointer-events-none"
                            />
                            <circle
                                cx={c.x}
                                cy={c.y}
                                r="12"
                                fill="transparent"
                                className="cursor-pointer"
                                onMouseEnter={showTip}
                                onMouseMove={showTip}
                                onMouseLeave={() => {
                                    setHoverIdx(null);
                                    setTip(null);
                                }}
                            />
                            <text
                                x={c.x}
                                y={h + 13}
                                textAnchor="middle"
                                fill={t.svgLabel}
                                style={{ fontSize: 8 }}
                            >
                                {c.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

const BENEFICIARY_COLOR = '#a78bfa';

const DualMetric = ({
    rows,
}: {
    rows: {
        key: string;
        label: string;
        left: number;
        right: number;
        color: string;
    }[];
}) => {
    const t = useTokens();
    const [tip, setTip] = useState<ChartTip | null>(null);
    const maxLeft = Math.max(...rows.map((r) => r.left), 1);
    const maxRight = Math.max(...rows.map((r) => r.right), 1);
    return (
        <div className="relative space-y-1.5">
            <ChartTooltip tip={tip} />
            <div
                className={`flex items-center justify-between text-[11px] font-semibold tracking-wide uppercase ${t.muted}`}
            >
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="h-1.5 w-3 rounded-full bg-[#3b82f6]"
                        aria-hidden
                    />
                    Budget
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span
                        className="h-1.5 w-3 rounded-full"
                        style={{ background: BENEFICIARY_COLOR }}
                        aria-hidden
                    />
                    Beneficiaries
                </span>
            </div>
            {rows.map((row) => {
                const showTip = (e: MouseEvent) => {
                    setTip(
                        tipFromEvent(e, {
                            label: row.label,
                            value: formatPeso(row.left),
                            detail: `${formatCompact(row.right)} beneficiaries`,
                            color: row.color,
                        }),
                    );
                };
                return (
                    <div
                        key={row.key}
                        className={`rounded-md px-1.5 py-1 transition-colors duration-150 ${t.rowHover}`}
                        onMouseEnter={showTip}
                        onMouseMove={showTip}
                        onMouseLeave={() => setTip(null)}
                    >
                        <p
                            className={`mb-1 truncate text-xs font-semibold ${t.text}`}
                        >
                            {row.label}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <div
                                className={`h-1.5 overflow-hidden rounded-full ${t.track}`}
                            >
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${(row.left / maxLeft) * 100}%`,
                                        background: row.color,
                                    }}
                                />
                            </div>
                            <div
                                className={`h-1.5 overflow-hidden rounded-full ${t.track}`}
                            >
                                <div
                                    className="h-full rounded-full"
                                    style={{
                                        width: `${(row.right / maxRight) * 100}%`,
                                        background: BENEFICIARY_COLOR,
                                    }}
                                />
                            </div>
                        </div>
                        <div
                            className={`mt-1 flex justify-between text-[11px] tabular-nums ${t.muted}`}
                        >
                            <span>{formatPeso(row.left)}</span>
                            <span>{formatCompact(row.right)}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

export type GraphsPanelProps = {
    projects: TaraProject[];
    expanded?: boolean;
    onToggleExpand?: () => void;
    statusFilter?: string | 'all';
    provinceFilter?: Province | 'all';
    programFilter?: TaraProgram | 'all';
    onStatusFilter?: (status: string | 'all') => void;
    onProvinceFilter?: (province: Province | 'all') => void;
    onProgramFilter?: (program: TaraProgram | 'all') => void;
    className?: string;
};

const shortProvince = (province: Province) =>
    province
        .replace('Oriental Mindoro', 'OrMin')
        .replace('Occidental Mindoro', 'OcMin')
        .replace('Marinduque', 'Mar')
        .replace('Romblon', 'Rom')
        .replace('Palawan', 'Pal');

const GraphsPanel = ({
    projects,
    expanded = true,
    onToggleExpand,
    statusFilter = 'all',
    provinceFilter = 'all',
    programFilter = 'all',
    onStatusFilter,
    onProvinceFilter,
    onProgramFilter,
    className = '',
}: GraphsPanelProps) => {
    const t = useTokens();

    const chartData = useMemo(() => {
        if (!expanded) {
            return null;
        }

        const provinces = Object.keys(PROVINCE_COLORS) as Province[];

        const statusTotals = new Map<
            string,
            { count: number; mapped: ProjectStatus }
        >();
        for (const p of projects) {
            const label = projectStatusLabel(p);
            const prev = statusTotals.get(label);
            if (prev) {
                prev.count += 1;
            } else {
                statusTotals.set(label, { count: 1, mapped: p.status });
            }
        }
        const byStatus: Slice[] = [...statusTotals.entries()]
            .map(([label, data]) => ({
                key: label,
                label,
                value: data.count,
                color: STATUS_COLORS[data.mapped] ?? '#94a3b8',
            }))
            .sort((a, b) => b.value - a.value);

        const byProvince: Slice[] = provinces.map((province) => ({
            key: province,
            label: province.replace(' Mindoro', ' Min.'),
            value: projects.filter((p) => p.province === province).length,
            color: PROVINCE_COLORS[province],
        }));

        const budgetByProvince: Slice[] = provinces.map((province) => ({
            key: province,
            label: shortProvince(province),
            value: projects
                .filter((p) => p.province === province)
                .reduce((s, p) => s + p.budget, 0),
            color: PROVINCE_COLORS[province],
        }));

        const beneficiariesByProvince: Slice[] = provinces.map((province) => ({
            key: province,
            label: province.replace(' Mindoro', ' Min.'),
            value: projects
                .filter((p) => p.province === province)
                .reduce((s, p) => s + p.beneficiaries, 0),
            color: PROVINCE_COLORS[province],
        }));

        const avgProgressByProvince: Slice[] = provinces.map((province) => {
            const list = projects.filter((p) => p.province === province);
            const avg =
                list.length > 0
                    ? Math.round(
                          list.reduce((s, p) => s + p.progress, 0) /
                              list.length,
                      )
                    : 0;
            return {
                key: province,
                label: shortProvince(province),
                value: avg,
                color: PROVINCE_COLORS[province],
            };
        });

        const programTotals = new Map<TaraProgram, number>();
        projects.forEach((p) => {
            programTotals.set(
                p.program,
                (programTotals.get(p.program) ?? 0) + p.budget,
            );
        });

        const byProgram: Slice[] = [...programTotals.entries()]
            .map(([program, value]) => ({
                key: program,
                label: PROGRAM_META[program].short,
                value,
                color: PROGRAM_META[program].color,
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const progressBands: Slice[] = [
            { key: '0-25', label: '0–25%', value: 0, color: '#f87171' },
            { key: '26-50', label: '26–50%', value: 0, color: '#fbbf24' },
            { key: '51-75', label: '51–75%', value: 0, color: '#60a5fa' },
            { key: '76-100', label: '76–100%', value: 0, color: '#34d399' },
        ];
        projects.forEach((p) => {
            if (p.progress <= 25) progressBands[0].value += 1;
            else if (p.progress <= 50) progressBands[1].value += 1;
            else if (p.progress <= 75) progressBands[2].value += 1;
            else progressBands[3].value += 1;
        });

        const fundingSourceMap = new Map<string, number>();
        projects.forEach((p) => {
            const key = p.funding_source || 'Other';
            fundingSourceMap.set(
                key,
                (fundingSourceMap.get(key) ?? 0) + p.budget,
            );
        });
        const byFundingSource: Slice[] = [...fundingSourceMap.entries()]
            .map(([key, value], index) => ({
                key,
                label: key.length > 14 ? `${key.slice(0, 12)}…` : key,
                value,
                color: PALETTE[index % PALETTE.length],
            }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 6);

        const yearBuckets = new Map<string, number>();
        projects.forEach((p) => {
            const year =
                (p.end_date || p.start_date || '').slice(0, 4) || 'n/a';
            yearBuckets.set(year, (yearBuckets.get(year) ?? 0) + 1);
        });
        const timeline = [...yearBuckets.entries()]
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([label, value]) => ({ label, value }));

        const dualProvince = provinces.map((province) => {
            const list = projects.filter((p) => p.province === province);
            return {
                key: province,
                label: province.replace(' Mindoro', ' Min.'),
                left: list.reduce((s, p) => s + p.budget, 0),
                right: list.reduce((s, p) => s + p.beneficiaries, 0),
                color: PROVINCE_COLORS[province],
            };
        });

        const funding = projects.reduce((s, p) => s + p.budget, 0);
        const utilized = projects.reduce(
            (s, p) => s + Math.round((p.budget * p.progress) / 100),
            0,
        );
        const beneficiaries = projects.reduce((s, p) => s + p.beneficiaries, 0);
        const avgProgress =
            projects.length > 0
                ? Math.round(
                      projects.reduce((s, p) => s + p.progress, 0) /
                          projects.length,
                  )
                : 0;
        const completionRate =
            projects.length > 0
                ? Math.round(
                      (projects.filter((p) => p.status === 'completed').length /
                          projects.length) *
                          100,
                  )
                : 0;
        const atRisk = projects.filter(
            (p) => p.status === 'delayed' || p.status === 'on_hold',
        ).length;

        return {
            byStatus,
            byProvince,
            budgetByProvince,
            beneficiariesByProvince,
            avgProgressByProvince,
            byProgram,
            progressBands,
            byFundingSource,
            timeline,
            dualProvince,
            funding,
            utilized,
            beneficiaries,
            avgProgress,
            completionRate,
            atRisk,
        };
    }, [projects, expanded]);

    const empty = projects.length === 0;
    const isOpen = expanded && chartData !== null;

    const toggleProvince = (key: string) => {
        if (!onProvinceFilter) return;
        onProvinceFilter(provinceFilter === key ? 'all' : (key as Province));
    };
    const provinceActive = provinceFilter === 'all' ? null : provinceFilter;

    const header = (
        <button
            type="button"
            onClick={onToggleExpand}
            disabled={!onToggleExpand}
            aria-expanded={isOpen}
            aria-controls="graphs-panel-body"
            className={[
                'flex min-h-12 w-full shrink-0 cursor-pointer items-center gap-2 px-3 text-left transition-colors duration-150 disabled:cursor-default sm:px-4',
                isOpen ? `border-b ${t.divider}` : '',
                t.toggle,
                t.focus,
            ].join(' ')}
        >
            <HiChartBar
                className={`h-4 w-4 shrink-0 ${t.accent}`}
                aria-hidden
            />
            <span
                className={`font-sei-display text-xs font-extrabold tracking-[0.16em] uppercase ${t.title}`}
            >
                Graphs
            </span>
            <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold tabular-nums ${t.countPill}`}
            >
                {projects.length}
                <span className="sr-only"> projects</span>
            </span>
            {onToggleExpand ? (
                <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold">
                    {isOpen ? 'Collapse' : 'Expand'}
                    {isOpen ? (
                        <HiChevronDown className="h-3.5 w-3.5" aria-hidden />
                    ) : (
                        <HiChevronUp className="h-3.5 w-3.5" aria-hidden />
                    )}
                </span>
            ) : null}
        </button>
    );

    if (!isOpen) {
        return (
            <div
                className={[
                    'font-sei-body pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border',
                    t.shell,
                    className,
                ].join(' ')}
            >
                {header}
            </div>
        );
    }

    const utilPct =
        chartData.funding > 0
            ? Math.min(
                  100,
                  Math.round((chartData.utilized / chartData.funding) * 100),
              )
            : 0;

    const kpis = [
        {
            label: 'Complete',
            value: `${chartData.completionRate}%`,
            tone: t.kpiComplete,
        },
        { label: 'At risk', value: String(chartData.atRisk), tone: t.kpiRisk },
        {
            label: 'People',
            value: formatCompact(chartData.beneficiaries),
            tone: t.kpiPeople,
        },
    ];

    return (
        <div
            className={[
                'font-sei-body pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border',
                t.shell,
                className,
            ].join(' ')}
        >
            {header}

            <div
                id="graphs-panel-body"
                className="[scrollbar-width:thin] space-y-5 overflow-y-auto overscroll-contain p-3 sm:p-4"
            >
                {empty ? (
                    <EmptyNote>No projects in current filter.</EmptyNote>
                ) : (
                    <>
                        <dl className="grid grid-cols-3 gap-2">
                            {kpis.map((kpi) => (
                                <div
                                    key={kpi.label}
                                    className={`rounded-xl border px-2 py-2.5 text-center ${t.cell}`}
                                >
                                    <dt
                                        className={`text-[11px] font-semibold tracking-wide uppercase ${t.muted}`}
                                    >
                                        {kpi.label}
                                    </dt>
                                    <dd
                                        className={`font-sei-display mt-1 text-base font-bold tabular-nums ${kpi.tone}`}
                                    >
                                        {kpi.value}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        <Section title="Status mix">
                            <DonutChart
                                slices={chartData.byStatus}
                                centerLabel="TOTAL"
                                centerValue={String(projects.length)}
                                ariaLabel="Projects by status"
                                activeKey={
                                    statusFilter === 'all' ? null : statusFilter
                                }
                                onSliceClick={
                                    onStatusFilter
                                        ? (key) =>
                                              onStatusFilter(
                                                  statusFilter === key
                                                      ? 'all'
                                                      : key,
                                              )
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Progress bands">
                            <ColumnChart
                                slices={chartData.progressBands}
                                ariaLabel="Projects by progress band"
                            />
                        </Section>

                        <Section title="Projects by province">
                            <BarChart
                                slices={chartData.byProvince}
                                activeKey={provinceActive}
                                onBarClick={
                                    onProvinceFilter
                                        ? toggleProvince
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Budget by province">
                            <ColumnChart
                                slices={chartData.budgetByProvince}
                                valueFormat="peso"
                                ariaLabel="Budget by province"
                                activeKey={provinceActive}
                                onBarClick={
                                    onProvinceFilter
                                        ? toggleProvince
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Avg progress by province">
                            <ColumnChart
                                slices={chartData.avgProgressByProvince}
                                valueFormat="percent"
                                height={80}
                                ariaLabel="Average progress by province"
                                activeKey={provinceActive}
                                onBarClick={
                                    onProvinceFilter
                                        ? toggleProvince
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Beneficiaries by province">
                            <BarChart
                                slices={chartData.beneficiariesByProvince}
                                valueFormat="compact"
                                activeKey={provinceActive}
                                onBarClick={
                                    onProvinceFilter
                                        ? toggleProvince
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Budget vs beneficiaries">
                            <DualMetric rows={chartData.dualProvince} />
                        </Section>

                        <Section title="Top programs · budget">
                            <BarChart
                                slices={chartData.byProgram}
                                valueFormat="peso"
                                activeKey={
                                    programFilter === 'all'
                                        ? null
                                        : programFilter
                                }
                                onBarClick={
                                    onProgramFilter
                                        ? (key) =>
                                              onProgramFilter(
                                                  programFilter === key
                                                      ? 'all'
                                                      : (key as TaraProgram),
                                              )
                                        : undefined
                                }
                            />
                        </Section>

                        <Section title="Funding source mix">
                            {chartData.byFundingSource.length === 0 ? (
                                <EmptyNote>No funding data.</EmptyNote>
                            ) : (
                                <DonutChart
                                    slices={chartData.byFundingSource}
                                    centerLabel="PHP"
                                    centerValue={formatCompact(
                                        chartData.funding,
                                    )}
                                    valueFormat="peso"
                                    ariaLabel="Budget by funding source"
                                />
                            )}
                        </Section>

                        <Section title="End-year pipeline">
                            {chartData.timeline.length === 0 ? (
                                <EmptyNote>No dates.</EmptyNote>
                            ) : (
                                <AreaSpark points={chartData.timeline} />
                            )}
                        </Section>

                        <section
                            className={`rounded-xl border p-3 ${t.cell}`}
                            aria-labelledby="graphs-fund-utilization"
                        >
                            <div className="flex items-end justify-between gap-2">
                                <div>
                                    <h3
                                        id="graphs-fund-utilization"
                                        className={`font-sei-display text-[11px] font-bold tracking-[0.16em] uppercase ${t.label}`}
                                    >
                                        Fund utilization
                                    </h3>
                                    <p
                                        className={`font-sei-display mt-1 text-2xl font-extrabold tabular-nums ${t.utilValue}`}
                                    >
                                        {utilPct}%
                                    </p>
                                </div>
                                <div
                                    className={`text-right text-[11px] ${t.muted}`}
                                >
                                    <p>
                                        Used{' '}
                                        <span
                                            className={`font-semibold ${t.title}`}
                                        >
                                            {formatPeso(chartData.utilized)}
                                        </span>
                                    </p>
                                    <p>
                                        of{' '}
                                        <span
                                            className={`font-semibold ${t.text}`}
                                        >
                                            {formatPeso(chartData.funding)}
                                        </span>
                                    </p>
                                </div>
                            </div>
                            <div
                                className={`mt-2.5 h-2 overflow-hidden rounded-full ${t.track}`}
                                role="progressbar"
                                aria-valuenow={utilPct}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                aria-label="Fund utilization"
                            >
                                <div
                                    className="h-full rounded-full bg-linear-to-r from-[#60A5FA] to-[#1D4ED8] transition-[width] duration-500 motion-reduce:transition-none"
                                    style={{ width: `${utilPct}%` }}
                                />
                            </div>
                            <p className={`mt-2 text-[11px] ${t.muted}`}>
                                Avg progress {chartData.avgProgress}% ·{' '}
                                {formatCompact(chartData.beneficiaries)} people
                                reached
                            </p>
                        </section>
                    </>
                )}
            </div>
        </div>
    );
};

export default GraphsPanel;
