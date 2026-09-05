import {
    useId,
    useMemo,
    useState,
    type MouseEvent,
    type ReactNode,
} from "react";
import {
    PROVINCES,
    PROJECT_STATUSES,
    SECTORS,
    STATUS_META,
    TARA_TYPES,
    formatCompact,
    formatPeso,
    projectType,
    projectYear,
    type ProjectStatus,
    type Province,
    type TaraProject,
} from '@/constants/taraProjects';

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

const STATUS_COLORS: Record<ProjectStatus, string> = {
    planning: "#94a3b8",
    ongoing: "#22d3ee",
    completed: "#34d399",
    delayed: "#f87171",
    on_hold: "#fbbf24",
    cancelled: "#fb7185",
};

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
const AreaLineChart = ({ rows }: { rows: Row[] }) => {
    const gradId = useId().replace(/:/g, "");
    const [tip, setTip] = useState<ChartTip | null>(null);
    const W = 320;
    const H = 150;
    const pad = 26;
    const max = Math.max(1, ...rows.map((r) => r.value));
    const n = rows.length;
    const x = (i: number) =>
        n <= 1 ? W / 2 : pad + (i * (W - 2 * pad)) / (n - 1);
    const y = (v: number) => H - pad - (v / max) * (H - 2 * pad);
    const pts = rows.map((r, i) => [x(i), y(r.value)] as const);
    const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0]},${p[1]}`).join(" ");
    const area =
        n > 0 ? `${line} L${x(n - 1)},${H - pad} L${x(0)},${H - pad} Z` : "";

    if (rows.length === 0) return <EmptyChart />;

    return (
        <div className="relative">
            <ChartTooltip tip={tip} />
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
                        x1={pad}
                        x2={W - pad}
                        y1={H - pad - g * (H - 2 * pad)}
                        y2={H - pad - g * (H - 2 * pad)}
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
                    const row = rows[i];
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
                            <text
                                x={p[0]}
                                y={H - pad + 14}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#64748b"
                                pointerEvents="none"
                            >
                                {row.label}
                            </text>
                        </g>
                    );
                })}
            </svg>
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

const ProgramsGraphs = ({
    projects,
    scope = "MIMAROPA",
}: {
    projects: TaraProject[];
    scope?: string;
}) => {
    const aggregates = useMemo(() => {
        let totalCost = 0;
        let beneficiaries = 0;
        const provinceSet = new Set<Province>();
        const byYear = new Map<number, number>();
        const byStatus = new Map<ProjectStatus, number>();
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
            byStatus.set(p.status, (byStatus.get(p.status) ?? 0) + 1);
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
        for (const status of PROJECT_STATUSES) {
            const value = byStatus.get(status) ?? 0;
            if (value <= 0) continue;
            perStatusRows.push({
                key: status,
                label: STATUS_META[status].label,
                value,
                color: STATUS_COLORS[status],
            });
            perStatusBadges.push(STATUS_META[status].className);
        }

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
    }, [projects]);

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
        <div className="space-y-4">
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

            <p className="text-[11px] leading-relaxed text-slate-500">
                Live summary for{" "}
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {scope}
                </span>
                {" · "}
                computed from the current project list.
            </p>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card title="Projects per year approved" subtitle="Trend">
                    <AreaLineChart rows={aggregates.perYear} />
                </Card>

                <Card title="Projects by status" subtitle="Share">
                    <DonutChart
                        rows={aggregates.perStatus.rows}
                        centerLabel="PROJECTS"
                    />
                </Card>

                <Card title="Projects per province" subtitle="Per PSTO">
                    <ColumnChart rows={aggregates.perProvince} />
                </Card>

                <Card title="Project cost per province" subtitle="Share">
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

                <Card title="Project cost by sector" subtitle="Ranked (₱)">
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
    );
};

export default ProgramsGraphs;
