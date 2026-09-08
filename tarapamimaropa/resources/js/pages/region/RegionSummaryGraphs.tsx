import { Head, Link, usePage } from '@inertiajs/react';
import {
    useId,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from 'react';
import { HiArrowLeft, HiChevronLeft, HiChevronRight } from 'react-icons/hi2';
import {
    PROVINCES,
    SECTORS,
    TARA_TYPES,
    formatCompact,
    formatPeso,
    projectStatusClass,
    projectStatusLabel,
    projectType,
    projectYear,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';
import { programs } from '@/routes/region';
import { useTheme } from '@/theme/ThemeProvider';

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

type ValueFormat = "number" | "peso" | "compact";

const BRAND = "#22d3ee";

const PROVINCE_COLORS: Record<Province, string> = {
    "Oriental Mindoro": "#22d3ee",
    "Occidental Mindoro": "#38bdf8",
    Marinduque: "#818cf8",
    Romblon: "#67e8f9",
    Palawan: "#2dd4bf",
};

/** Single brand-hue steps for non-semantic series (type / sector). */
const SERIES_COLORS = [
    "#22d3ee",
    "#38bdf8",
    "#67e8f9",
    "#2dd4bf",
    "#818cf8",
    "#94a3b8",
    "#a5f3fc",
    "#5eead4",
];

const formatValue = (n: number, fmt: ValueFormat = "number") => {
    if (fmt === "peso") return formatPeso(n);
    if (fmt === "compact") return formatCompact(n);
    return String(n);
};

const tipFromEvent = (
    e: MouseEvent,
    payload: Omit<ChartTip, "x" | "y">,
): ChartTip => ({
    ...payload,
    x: e.clientX,
    y: e.clientY,
});

const ChartTooltip = ({ tip }: { tip: ChartTip | null }) => {
    if (!tip) return null;
    return (
        <div
            role="tooltip"
            className="pointer-events-none fixed z-[1100] max-w-[220px] rounded-lg border border-slate-600 bg-slate-950/95 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
            style={{
                left: tip.x,
                top: tip.y,
                transform: "translate(-50%, calc(-100% - 10px))",
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
                <p className="mt-0.5 text-[10px] text-slate-400">
                    {tip.detail}
                </p>
            ) : null}
        </div>
    );
};

const EmptyChart = ({
    label = "No data for current filters.",
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
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition duration-[180ms] hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]">
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

/* ── Donut ──────────────────────────────────────────────────────── */
const DonutChart = ({
    rows,
    format = "number",
    centerLabel = "TOTAL",
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
                                    "flex w-full min-h-8 items-center justify-between gap-2 rounded-md px-1.5 py-1 text-left text-xs transition duration-[180ms]",
                                    active
                                        ? "bg-blue-50 text-blue-900 dark:bg-cyan-500/15 dark:text-cyan-100"
                                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/80",
                                ].join(" ")}
                            >
                                <span className="flex min-w-0 items-center gap-2">
                                    <span
                                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                                        style={{ background: row.color }}
                                    />
                                    <span className="truncate">
                                        {row.label}
                                    </span>
                                </span>
                                <span className="shrink-0 tabular-nums text-slate-500">
                                    <span className="font-bold text-slate-900 dark:text-slate-100">
                                        {formatValue(row.value, format)}
                                    </span>{" "}
                                    <span className="text-slate-500">
                                        ({pct}%)
                                    </span>
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
    format = "number",
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
                        className="group flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-md outline-none transition duration-[180ms] hover:bg-slate-100 dark:hover:bg-slate-800/40 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
                    >
                        <span className="text-[11px] font-bold tabular-nums text-slate-800 dark:text-slate-200">
                            {formatValue(row.value, format)}
                        </span>
                        <div className="flex h-36 w-full items-end justify-center">
                            <div
                                className="w-full max-w-[46px] rounded-t-md transition-[height,box-shadow] duration-500 ease-out group-hover:shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                                style={{
                                    height: `${Math.max(pct, row.value > 0 ? 4 : 0)}%`,
                                    background: `linear-gradient(to top, ${row.color}33, ${row.color})`,
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

/* ── Area / line ────────────────────────────────────────────────── */
const YEAR_WINDOW = 6;

const AreaLineChart = ({ rows }: { rows: Row[] }) => {
    const gradId = useId().replace(/:/g, "");
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
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    const area =
        n > 0
            ? `${line} L${x(n - 1)},${H - padBottom} L${x(0)},${H - padBottom} Z`
            : "";

    const canPrev = windowStart > 0;
    const canNext = windowStart < maxStart;
    const rangeLabel =
        n > 0
            ? visible[0].label === visible[n - 1].label
                ? visible[0].label
                : `${visible[0].label} – ${visible[n - 1].label}`
            : "";

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative">
            <ChartTooltip tip={tip} />
            {canSlide ? (
                <div className="mb-2 flex items-center justify-between gap-2">
                    <button
                        type="button"
                        onClick={() =>
                            setStart((s) => Math.max(0, s - 1))
                        }
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
                <defs>
                    <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={BRAND} stopOpacity="0.4" />
                        <stop offset="100%" stopColor={BRAND} stopOpacity="0" />
                    </linearGradient>
                </defs>
                {[0.25, 0.5, 0.75, 1].map((g) => (
                    <line
                        key={g}
                        x1={padX}
                        x2={W - padX}
                        y1={H - padBottom - g * (H - padTop - padBottom)}
                        y2={H - padBottom - g * (H - padTop - padBottom)}
                        stroke="#1e293b"
                        strokeWidth="1"
                    />
                ))}
                {area ? <path d={area} fill={`url(#${gradId})`} /> : null}
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
                                detail: "projects approved",
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
                                fill="#e2e8f0"
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
    format = "number",
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
                        className="group w-full rounded-md px-1 py-1 text-left transition duration-[180ms] hover:bg-slate-100 dark:hover:bg-slate-800/70 focus-visible:ring-2 focus-visible:ring-cyan-500/50"
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
                                    background: `linear-gradient(90deg, ${row.color}, ${row.color}cc)`,
                                }}
                            />
                        </div>
                    </button>
                );
            })}
        </div>
    );
};

const RegionSummaryGraphs = () => {
    const { projects = [] } = usePage<PageProps>().props;
    const scope = 'MIMAROPA (all provinces)';
    const { isDark } = useTheme();
    const statusMode = isDark ? 'dark' : 'light';

    const aggregates = useMemo(() => {
        let totalCost = 0;
        let beneficiaries = 0;
        const provinceSet = new Set<Province>();
        const byYear = new Map<number, number>();
        const byStatus = new Map<string, number>();
        const byProvince = new Map<Province, number>();
        const byType = new Map<string, number>();
        const bySector = new Map<string, number>();
        const costByProvince = new Map<Province, number>();
        const costBySector = new Map<string, number>();

        for (const p of projects) {
            totalCost += p.budget;
            beneficiaries += p.beneficiaries;
            provinceSet.add(p.province);

            const y = projectYear(p);
            byYear.set(y, (byYear.get(y) ?? 0) + 1);
            const statusLabel = projectStatusLabel(p);
            byStatus.set(statusLabel, (byStatus.get(statusLabel) ?? 0) + 1);
            byProvince.set(p.province, (byProvince.get(p.province) ?? 0) + 1);
            costByProvince.set(
                p.province,
                (costByProvince.get(p.province) ?? 0) + p.budget,
            );

            const type = projectType(p);
            byType.set(type, (byType.get(type) ?? 0) + 1);

            bySector.set(p.sector, (bySector.get(p.sector) ?? 0) + 1);
            costBySector.set(
                p.sector,
                (costBySector.get(p.sector) ?? 0) + p.budget,
            );
        }

        const perYear: Row[] = [...byYear.entries()]
            .sort((a, b) => a[0] - b[0])
            .map(([year, value]) => ({
                key: String(year),
                label: String(year),
                value,
                color: BRAND,
            }));

        const perStatusRows: Row[] = [];
        const perStatusBadges: string[] = [];
        const statusEntries = [...byStatus.entries()].sort(
            (a, b) => b[1] - a[1],
        );
        statusEntries.forEach(([status, value], i) => {
            if (value <= 0) return;
            const sample = projects.find(
                (p) => projectStatusLabel(p) === status,
            );
            perStatusRows.push({
                key: status,
                label: status,
                value,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
            });
            perStatusBadges.push(
                sample
                    ? projectStatusClass(sample, statusMode)
                    : statusMode === "light"
                      ? "border border-slate-400 bg-slate-200 text-slate-900 ring-0"
                      : "bg-slate-800/80 text-slate-200 ring-slate-500/40",
            );
        });

        const perProvince: Row[] = PROVINCES.filter(
            (p) => (byProvince.get(p) ?? 0) > 0,
        )
            .map((province) => ({
                key: province,
                label: province,
                value: byProvince.get(province) ?? 0,
                color: PROVINCE_COLORS[province],
            }))
            .sort((a, b) => b.value - a.value);

        const typeKeys =
            byType.size > 0
                ? [...byType.keys()]
                : TARA_TYPES.filter((t) => (byType.get(t) ?? 0) > 0);

        const perType: Row[] = typeKeys
            .map((type, i) => ({
                key: type,
                label: type,
                value: byType.get(type) ?? 0,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))
            .filter((r) => r.value > 0)
            .sort((a, b) => b.value - a.value);

        const sectorKeys =
            bySector.size > 0
                ? [...bySector.keys()]
                : SECTORS.filter((s) => (bySector.get(s) ?? 0) > 0);

        const perSector: Row[] = sectorKeys
            .map((sector, i) => ({
                key: sector,
                label: sector,
                value: bySector.get(sector) ?? 0,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))
            .filter((r) => r.value > 0)
            .sort((a, b) => b.value - a.value);

        const costPerProvince: Row[] = PROVINCES.filter(
            (p) => (costByProvince.get(p) ?? 0) > 0,
        )
            .map((province) => ({
                key: `cost-${province}`,
                label: province,
                value: costByProvince.get(province) ?? 0,
                color: PROVINCE_COLORS[province],
            }))
            .sort((a, b) => b.value - a.value);

        const costPerSector: Row[] = sectorKeys
            .map((sector, i) => ({
                key: `cost-${sector}`,
                label: sector,
                value: costBySector.get(sector) ?? 0,
                color: SERIES_COLORS[i % SERIES_COLORS.length],
            }))
            .filter((r) => r.value > 0)
            .sort((a, b) => b.value - a.value);

        return {
            summary: {
                count: projects.length,
                totalCost,
                beneficiaries,
                provinces: provinceSet.size,
            },
            perYear,
            perStatus: { rows: perStatusRows, badges: perStatusBadges },
            perProvince,
            perType,
            perSector,
            costPerProvince,
            costPerSector,
        };
    }, [projects, statusMode]);

    const { summary } = aggregates;

    const tiles = [
        {
            label: "Total projects",
            value: String(summary.count),
            accent: "text-blue-700 dark:text-cyan-300",
        },
        {
            label: "Total project cost",
            value: formatPeso(summary.totalCost),
            accent: "text-cyan-700 dark:text-cyan-200",
        },
        {
            label: "Total beneficiaries",
            value: formatCompact(summary.beneficiaries),
            accent: "text-emerald-700 dark:text-emerald-300",
        },
        {
            label: "Provinces covered",
            value: String(summary.provinces),
            accent: "text-sky-700 dark:text-sky-300",
        },
    ];

    return (
        <>
            <Head title="Summary graphs" />
            <section className="min-h-screen bg-background px-4 py-5 pb-[calc(5rem+env(safe-area-inset-bottom))] text-foreground transition-colors duration-[180ms] sm:px-6 sm:py-7 lg:pb-7">
                <div className="mx-auto max-w-6xl">
                    <Link
                        href={programs.url()}
                        className="inline-flex min-h-9 items-center gap-2 text-sm font-medium text-slate-600 transition duration-[180ms] hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    >
                        <HiArrowLeft className="h-4 w-4" aria-hidden />
                        Back to Programs
                    </Link>

                    <header className="mt-4">
                        <p className="text-xs font-medium text-slate-500">
                            Project summaries
                        </p>
                        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl dark:text-white">
                            Summary graphs
                        </h1>
                        <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-slate-500">
                            Live charts for{' '}
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {scope}
                            </span>
                            . Computed from the current project list.
                        </p>
                    </header>

                    <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                            {tiles.map((t) => (
                                <div
                                    key={t.label}
                                    className="rounded-xl border border-slate-200 bg-white p-3.5 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_2px_8px_rgba(0,0,0,0.05)]"
                                >
                                    <p
                                        className={`truncate text-lg font-bold tabular-nums sm:text-xl ${t.accent}`}
                                    >
                                        {t.value}
                                    </p>
                                    <p className="mt-1 text-[11px] font-medium text-slate-500">
                                        {t.label}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                            <Card
                                title="Projects per year approved"
                                subtitle="Trend"
                            >
                                <AreaLineChart rows={aggregates.perYear} />
                            </Card>

                            <Card title="Projects by status" subtitle="Share">
                                <DonutChart
                                    rows={aggregates.perStatus.rows}
                                    centerLabel="PROJECTS"
                                />
                            </Card>

                            <Card
                                title="Projects per province"
                                subtitle="Per PSTO"
                            >
                                <ColumnChart rows={aggregates.perProvince} />
                            </Card>

                            <Card
                                title="Project cost per province"
                                subtitle="Share"
                            >
                                <DonutChart
                                    rows={aggregates.costPerProvince}
                                    format="compact"
                                    centerLabel="COST"
                                />
                            </Card>

                            <Card title="Projects by type" subtitle="Ranked">
                                <BarChart rows={aggregates.perType} />
                            </Card>

                            <Card title="Projects by sector" subtitle="Ranked">
                                <BarChart rows={aggregates.perSector} />
                            </Card>

                            <Card
                                title="Project cost by sector"
                                subtitle="Ranked (₱)"
                            >
                                <BarChart
                                    rows={aggregates.costPerSector}
                                    format="compact"
                                />
                            </Card>

                            <Card title="Status counts" subtitle="Labeled">
                                <BarChart
                                    rows={aggregates.perStatus.rows}
                                    badges={aggregates.perStatus.badges}
                                />
                            </Card>
                        </div>
                    </div>

                    <p className="mt-6 text-center text-xs text-slate-500">
                        Information &amp; Monitoring of Projects, Services and
                        S&amp;T Interventions · DOST-MIMAROPA
                    </p>
                </div>
            </section>
        </>
    );
};

export default RegionSummaryGraphs;
