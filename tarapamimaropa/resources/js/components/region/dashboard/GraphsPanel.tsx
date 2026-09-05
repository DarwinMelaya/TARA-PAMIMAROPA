import { useMemo, useState, type MouseEvent } from "react";
import { HiChartBar, HiChevronDown, HiChevronUp } from "react-icons/hi2";
import {
  PROGRAM_META,
  STATUS_META,
  formatCompact,
  formatPeso,
  type ProjectStatus,
  type Province,
  type TaraProgram,
  type TaraProject,
} from '@/constants/taraProjects';

type ChartTip = {
  label: string;
  value: string;
  detail?: string;
  color: string;
  x: number;
  y: number;
};

const ChartTooltip = ({ tip }: { tip: ChartTip | null }) => {
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[1100] max-w-[220px] rounded-lg border border-slate-600/80 bg-slate-950/95 px-2.5 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.45)] backdrop-blur-md"
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
      <p className="mt-0.5 text-[12px] font-bold tabular-nums text-cyan-200">
        {tip.value}
      </p>
      {tip.detail ? (
        <p className="mt-0.5 text-[10px] text-slate-400">{tip.detail}</p>
      ) : null}
    </div>
  );
};

const tipFromEvent = (
  e: MouseEvent,
  payload: Omit<ChartTip, "x" | "y">,
): ChartTip => ({
  ...payload,
  x: e.clientX,
  y: e.clientY,
});

const formatSliceValue = (
  n: number,
  valueFormat: "number" | "peso" | "compact" | "percent",
) => {
  if (valueFormat === "peso") return formatPeso(n);
  if (valueFormat === "compact") return formatCompact(n);
  if (valueFormat === "percent") return `${n}%`;
  return String(n);
};

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
  Romblon: "#a78bfa",
  Palawan: "#2dd4bf",
};

const PALETTE = [
  "#22d3ee",
  "#38bdf8",
  "#818cf8",
  "#a78bfa",
  "#2dd4bf",
  "#fbbf24",
  "#f472b6",
  "#34d399",
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

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
    {children}
  </p>
);

const DonutChart = ({
  slices,
  centerLabel,
  centerValue,
  onSliceClick,
  activeKey,
  valueFormat = "number",
}: {
  slices: Slice[];
  centerLabel: string;
  centerValue: string;
  onSliceClick?: (key: string) => void;
  activeKey?: string | null;
  valueFormat?: "number" | "peso" | "compact";
}) => {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);
  const total = slices.reduce((sum, s) => sum + s.value, 0) || 1;
  let angle = 0;

  const hovered = hoverKey
    ? slices.find((s) => s.key === hoverKey)
    : null;

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

  return (
    <div className="relative flex items-center gap-3">
      <ChartTooltip tip={tip} />
      <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0">
        {slices.map((slice) => {
          const sweep = (slice.value / total) * 360;
          const start = angle;
          const end = angle + Math.max(sweep, slice.value > 0 ? 0.8 : 0);
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
                    : 0.35
                  : 0.92
              }
              className={[
                "transition-opacity",
                onSliceClick ? "cursor-pointer" : "cursor-default",
              ].join(" ")}
              onClick={() => onSliceClick?.(slice.key)}
              onMouseEnter={(e) => showSliceTip(e, slice)}
              onMouseMove={(e) => showSliceTip(e, slice)}
              onMouseLeave={() => {
                setHoverKey(null);
                setTip(null);
              }}
            />
          );
        })}
        <circle cx="60" cy="60" r="30" fill="#020617" />
        <text
          x="60"
          y="56"
          textAnchor="middle"
          className="fill-cyan-100"
          style={{ fontSize: hovered ? 11 : 14, fontWeight: 700 }}
        >
          {hovered
            ? formatSliceValue(hovered.value, valueFormat)
            : centerValue}
        </text>
        <text
          x="60"
          y="70"
          textAnchor="middle"
          className="fill-slate-400"
          style={{ fontSize: 7, fontWeight: 600, letterSpacing: "0.08em" }}
        >
          {hovered
            ? hovered.label.length > 12
              ? `${hovered.label.slice(0, 11)}…`
              : hovered.label
            : centerLabel}
        </text>
      </svg>
      <ul className="min-w-0 flex-1 space-y-1">
        {slices
          .filter((s) => s.value > 0)
          .map((slice) => (
            <li key={slice.key}>
              <button
                type="button"
                onClick={() => onSliceClick?.(slice.key)}
                onMouseEnter={(e) => showSliceTip(e, slice)}
                onMouseMove={(e) => showSliceTip(e, slice)}
                onMouseLeave={() => {
                  setHoverKey(null);
                  setTip(null);
                }}
                className={[
                  "flex w-full items-center gap-2 rounded-md px-1 py-0.5 text-left text-[10px] transition",
                  activeKey === slice.key || hoverKey === slice.key
                    ? "bg-cyan-500/15 text-cyan-100"
                    : "text-slate-300 hover:bg-slate-800/80",
                ].join(" ")}
              >
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: slice.color }}
                />
                <span className="min-w-0 flex-1 truncate">{slice.label}</span>
                <span className="tabular-nums text-slate-400">
                  {formatSliceValue(slice.value, valueFormat)}
                </span>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
};

const BarChart = ({
  slices,
  onBarClick,
  activeKey,
  valueFormat = "number",
}: {
  slices: Slice[];
  onBarClick?: (key: string) => void;
  activeKey?: string | null;
  valueFormat?: "number" | "peso" | "compact";
}) => {
  const [tip, setTip] = useState<ChartTip | null>(null);
  const max = Math.max(...slices.map((s) => s.value), 1);
  const total = slices.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <div className="relative space-y-1.5">
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
            className={[
              "group w-full rounded-md px-1 py-0.5 text-left transition",
              isActive ? "bg-cyan-500/10" : "hover:bg-slate-800/70",
            ].join(" ")}
          >
            <div className="mb-0.5 flex items-center justify-between gap-2 text-[10px]">
              <span
                className={[
                  "truncate font-semibold",
                  isActive ? "text-cyan-100" : "text-slate-300",
                ].join(" ")}
              >
                {slice.label}
              </span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {formatSliceValue(slice.value, valueFormat)}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full transition-[width] duration-500 ease-out"
                style={{
                  width: `${width}%`,
                  background: `linear-gradient(90deg, ${slice.color}, ${slice.color}cc)`,
                  boxShadow: isActive ? `0 0 10px ${slice.color}66` : undefined,
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
  valueFormat = "number",
  onBarClick,
  activeKey,
  height = 96,
}: {
  slices: Slice[];
  valueFormat?: "number" | "peso" | "compact" | "percent";
  onBarClick?: (key: string) => void;
  activeKey?: string | null;
  height?: number;
}) => {
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
              stroke="rgba(148,163,184,0.12)"
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
                value: formatSliceValue(slice.value, valueFormat),
                detail:
                  valueFormat === "percent"
                    ? "Avg progress"
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
                className={onBarClick ? "cursor-pointer" : "cursor-default"}
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
                opacity={activeKey && !isActive ? 0.35 : 0.92}
                className="pointer-events-none"
              />
              <text
                x={x + barW / 2}
                y={height + 16}
                textAnchor="middle"
                className="fill-slate-400"
                style={{ fontSize: 7, fontWeight: 600 }}
              >
                {slice.label.length > 7
                  ? `${slice.label.slice(0, 6)}…`
                  : slice.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {slices.map((slice) => (
          <span
            key={slice.key}
            className="text-[9px] tabular-nums text-slate-500"
          >
            <span style={{ color: slice.color }}>●</span>{" "}
            {formatSliceValue(slice.value, valueFormat)}
          </span>
        ))}
      </div>
    </div>
  );
};

const AreaSpark = ({
  points,
  color = "#22d3ee",
}: {
  points: { label: string; value: number }[];
  color?: string;
}) => {
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
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");
  const area = `${line} L ${coords[coords.length - 1]?.x ?? 0} ${h} L 0 ${h} Z`;

  return (
    <div className="relative">
      <ChartTooltip tip={tip} />
      <svg viewBox={`0 0 ${w} ${h + 16}`} className="h-auto w-full">
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.45" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#sparkFill)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2" />
        {coords.map((c, i) => {
          const showTip = (e: MouseEvent) => {
            setHoverIdx(i);
            setTip(
              tipFromEvent(e, {
                label: `Year ${c.label}`,
                value: `${c.value} projects`,
                detail: "End-year pipeline",
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
                y={h + 12}
                textAnchor="middle"
                className="fill-slate-500"
                style={{ fontSize: 7 }}
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
  const [tip, setTip] = useState<ChartTip | null>(null);
  const max = Math.max(...rows.flatMap((r) => [r.left, r.right]), 1);
  return (
    <div className="relative space-y-2">
      <ChartTooltip tip={tip} />
      <div className="flex items-center justify-between text-[9px] font-semibold uppercase tracking-wide text-slate-500">
        <span>Budget</span>
        <span>Beneficiaries</span>
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
            className="rounded-md px-1 py-0.5 transition hover:bg-slate-800/60"
            onMouseEnter={showTip}
            onMouseMove={showTip}
            onMouseLeave={() => setTip(null)}
          >
            <p className="mb-0.5 truncate text-[10px] font-semibold text-slate-300">
              {row.label}
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(row.left / max) * 100}%`,
                    background: row.color,
                  }}
                />
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full bg-violet-400"
                  style={{ width: `${(row.right / max) * 100}%` }}
                />
              </div>
            </div>
            <div className="mt-0.5 flex justify-between text-[9px] tabular-nums text-slate-500">
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
  statusFilter?: ProjectStatus | "all";
  provinceFilter?: Province | "all";
  programFilter?: TaraProgram | "all";
  onStatusFilter?: (status: ProjectStatus | "all") => void;
  onProvinceFilter?: (province: Province | "all") => void;
  onProgramFilter?: (program: TaraProgram | "all") => void;
  className?: string;
};

const GraphsPanel = ({
  projects,
  expanded = true,
  onToggleExpand,
  statusFilter = "all",
  provinceFilter = "all",
  programFilter = "all",
  onStatusFilter,
  onProvinceFilter,
  onProgramFilter,
  className = "",
}: GraphsPanelProps) => {
  const chartData = useMemo(() => {
    if (!expanded) {
      return null;
    }

    const provinces = Object.keys(PROVINCE_COLORS) as Province[];

    const byStatus: Slice[] = (
      Object.keys(STATUS_META) as ProjectStatus[]
    ).map((status) => ({
      key: status,
      label: STATUS_META[status].label,
      value: projects.filter((p) => p.status === status).length,
      color: STATUS_COLORS[status],
    }));

    const byProvince: Slice[] = provinces.map((province) => ({
      key: province,
      label: province.replace(" Mindoro", " Min."),
      value: projects.filter((p) => p.province === province).length,
      color: PROVINCE_COLORS[province],
    }));

    const budgetByProvince: Slice[] = provinces.map((province) => ({
      key: province,
      label: province
        .replace("Oriental Mindoro", "OrMin")
        .replace("Occidental Mindoro", "OcMin")
        .replace("Marinduque", "Mar")
        .replace("Romblon", "Rom")
        .replace("Palawan", "Pal"),
      value: projects
        .filter((p) => p.province === province)
        .reduce((s, p) => s + p.budget, 0),
      color: PROVINCE_COLORS[province],
    }));

    const beneficiariesByProvince: Slice[] = provinces.map((province) => ({
      key: province,
      label: province.replace(" Mindoro", " Min."),
      value: projects
        .filter((p) => p.province === province)
        .reduce((s, p) => s + p.beneficiaries, 0),
      color: PROVINCE_COLORS[province],
    }));

    const avgProgressByProvince: Slice[] = provinces.map((province) => {
      const list = projects.filter((p) => p.province === province);
      const avg =
        list.length > 0
          ? Math.round(list.reduce((s, p) => s + p.progress, 0) / list.length)
          : 0;
      return {
        key: province,
        label: province
          .replace("Oriental Mindoro", "OrMin")
          .replace("Occidental Mindoro", "OcMin")
          .replace("Marinduque", "Mar")
          .replace("Romblon", "Rom")
          .replace("Palawan", "Pal"),
        value: avg,
        color: PROVINCE_COLORS[province],
      };
    });

    const programTotals = new Map<TaraProgram, number>();
    projects.forEach((p) => {
      programTotals.set(p.program, (programTotals.get(p.program) ?? 0) + p.budget);
    });

    const byProgram: Slice[] = [...programTotals.entries()]
      .map(([program, value]) => ({
        key: program,
        label: PROGRAM_META[program].short,
        value,
        color: "#22d3ee",
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)
      .map((slice, index) => ({
        ...slice,
        color: PALETTE[index % PALETTE.length],
      }));

    const progressBands: Slice[] = [
      { key: "0-25", label: "0–25%", value: 0, color: "#f87171" },
      { key: "26-50", label: "26–50%", value: 0, color: "#fbbf24" },
      { key: "51-75", label: "51–75%", value: 0, color: "#38bdf8" },
      { key: "76-100", label: "76–100%", value: 0, color: "#34d399" },
    ];
    projects.forEach((p) => {
      if (p.progress <= 25) progressBands[0].value += 1;
      else if (p.progress <= 50) progressBands[1].value += 1;
      else if (p.progress <= 75) progressBands[2].value += 1;
      else progressBands[3].value += 1;
    });

    const fundingSourceMap = new Map<string, number>();
    projects.forEach((p) => {
      const key = p.funding_source || "Other";
      fundingSourceMap.set(key, (fundingSourceMap.get(key) ?? 0) + p.budget);
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
      const year = (p.end_date || p.start_date || "").slice(0, 4) || "n/a";
      yearBuckets.set(year, (yearBuckets.get(year) ?? 0) + 1);
    });
    const timeline = [...yearBuckets.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, value]) => ({ label, value }));

    const dualProvince = provinces.map((province) => {
      const list = projects.filter((p) => p.province === province);
      return {
        key: province,
        label: province.replace(" Mindoro", " Min."),
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
            projects.reduce((s, p) => s + p.progress, 0) / projects.length,
          )
        : 0;
    const completionRate =
      projects.length > 0
        ? Math.round(
            (projects.filter((p) => p.status === "completed").length /
              projects.length) *
              100,
          )
        : 0;
    const atRisk = projects.filter(
      (p) => p.status === "delayed" || p.status === "on_hold",
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

  if (!expanded || !chartData) {
    return (
      <div
        className={[
          "pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_24px_rgba(34,211,238,0.1)] backdrop-blur-xl",
          className,
        ].join(" ")}
      >
        <div className="flex items-center justify-between gap-2 border-b border-cyan-900/50 px-3 py-2.5 sm:px-4">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
          >
            <HiChartBar className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
              Graphs
            </p>
            <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
              {projects.length}
            </span>
          </button>
          {onToggleExpand ? (
            <button
              type="button"
              onClick={onToggleExpand}
              className="rounded-lg border border-slate-700/80 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white"
              aria-expanded={expanded}
            >
              <span className="inline-flex items-center gap-1">
                Expand <HiChevronUp className="h-3 w-3" />
              </span>
            </button>
          ) : null}
        </div>
      </div>
    );
  }

  const utilPct =
    chartData.funding > 0
      ? Math.min(100, Math.round((chartData.utilized / chartData.funding) * 100))
      : 0;

  return (
    <div
      className={[
        "pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-cyan-400/25 bg-slate-900/95 shadow-[0_8px_48px_rgba(0,0,0,0.5),0_0_24px_rgba(34,211,238,0.1)] backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-cyan-900/50 px-3 py-2.5 sm:px-4">
        <button
          type="button"
          onClick={onToggleExpand}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <HiChartBar className="h-4 w-4 shrink-0 text-cyan-300" aria-hidden />
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-cyan-200/90">
            Graphs
          </p>
          <span className="rounded-full bg-cyan-500/20 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
            {projects.length}
          </span>
        </button>
        {onToggleExpand ? (
          <button
            type="button"
            onClick={onToggleExpand}
            className="rounded-lg border border-slate-700/80 px-2 py-1 text-[10px] font-semibold text-slate-400 hover:text-white"
            aria-expanded={expanded}
          >
            {expanded ? (
              <span className="inline-flex items-center gap-1">
                Collapse <HiChevronDown className="h-3 w-3" />
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                Expand <HiChevronUp className="h-3 w-3" />
              </span>
            )}
          </button>
        ) : null}
      </div>

      {expanded ? (
        <div className="space-y-4 overflow-y-auto p-3 sm:p-4">
          {empty ? (
            <p className="text-xs text-slate-500">No projects in current filter.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    Complete
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-emerald-300">
                    {chartData.completionRate}%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    At risk
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-amber-300">
                    {chartData.atRisk}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700/60 bg-slate-950/50 p-2 text-center">
                  <p className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                    People
                  </p>
                  <p className="mt-0.5 text-sm font-bold tabular-nums text-violet-300">
                    {formatCompact(chartData.beneficiaries)}
                  </p>
                </div>
              </div>

              <section>
                <SectionTitle>Status mix</SectionTitle>
                <DonutChart
                  slices={chartData.byStatus}
                  centerLabel="TOTAL"
                  centerValue={String(projects.length)}
                  activeKey={statusFilter === "all" ? null : statusFilter}
                  onSliceClick={(key) => {
                    if (!onStatusFilter) return;
                    onStatusFilter(
                      statusFilter === key ? "all" : (key as ProjectStatus),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Progress bands</SectionTitle>
                <ColumnChart slices={chartData.progressBands} />
              </section>

              <section>
                <SectionTitle>Projects by province</SectionTitle>
                <BarChart
                  slices={chartData.byProvince}
                  activeKey={provinceFilter === "all" ? null : provinceFilter}
                  onBarClick={(key) => {
                    if (!onProvinceFilter) return;
                    onProvinceFilter(
                      provinceFilter === key ? "all" : (key as Province),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Budget by province</SectionTitle>
                <ColumnChart
                  slices={chartData.budgetByProvince}
                  valueFormat="peso"
                  activeKey={provinceFilter === "all" ? null : provinceFilter}
                  onBarClick={(key) => {
                    if (!onProvinceFilter) return;
                    onProvinceFilter(
                      provinceFilter === key ? "all" : (key as Province),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Avg progress by province</SectionTitle>
                <ColumnChart
                  slices={chartData.avgProgressByProvince}
                  valueFormat="percent"
                  height={80}
                  activeKey={provinceFilter === "all" ? null : provinceFilter}
                  onBarClick={(key) => {
                    if (!onProvinceFilter) return;
                    onProvinceFilter(
                      provinceFilter === key ? "all" : (key as Province),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Beneficiaries by province</SectionTitle>
                <BarChart
                  slices={chartData.beneficiariesByProvince}
                  valueFormat="compact"
                  activeKey={provinceFilter === "all" ? null : provinceFilter}
                  onBarClick={(key) => {
                    if (!onProvinceFilter) return;
                    onProvinceFilter(
                      provinceFilter === key ? "all" : (key as Province),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Budget vs beneficiaries</SectionTitle>
                <DualMetric rows={chartData.dualProvince} />
              </section>

              <section>
                <SectionTitle>Top programs · budget</SectionTitle>
                <BarChart
                  slices={chartData.byProgram}
                  valueFormat="peso"
                  activeKey={programFilter === "all" ? null : programFilter}
                  onBarClick={(key) => {
                    if (!onProgramFilter) return;
                    onProgramFilter(
                      programFilter === key ? "all" : (key as TaraProgram),
                    );
                  }}
                />
              </section>

              <section>
                <SectionTitle>Funding source mix</SectionTitle>
                {chartData.byFundingSource.length === 0 ? (
                  <p className="text-xs text-slate-500">No funding data.</p>
                ) : (
                  <DonutChart
                    slices={chartData.byFundingSource}
                    centerLabel="PHP"
                    centerValue={formatCompact(chartData.funding)}
                    valueFormat="peso"
                  />
                )}
              </section>

              <section>
                <SectionTitle>End-year pipeline</SectionTitle>
                {chartData.timeline.length === 0 ? (
                  <p className="text-xs text-slate-500">No dates.</p>
                ) : (
                  <AreaSpark points={chartData.timeline} color="#a78bfa" />
                )}
              </section>

              <section
                className="rounded-xl border border-slate-700/70 bg-slate-950/55 p-3"
                title={`Utilization ${utilPct}% · Used ${formatPeso(chartData.utilized)} of ${formatPeso(chartData.funding)}`}
              >
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400">
                      Fund utilization
                    </p>
                    <p className="mt-1 text-xl font-bold tabular-nums text-teal-300">
                      {utilPct}%
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-slate-400">
                    <p>
                      Used{" "}
                      <span className="font-semibold text-teal-200/90">
                        {formatPeso(chartData.utilized)}
                      </span>
                    </p>
                    <p>
                      of{" "}
                      <span className="font-semibold text-slate-300">
                        {formatPeso(chartData.funding)}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 transition-[width] duration-500"
                    style={{ width: `${utilPct}%` }}
                  />
                </div>
                <p className="mt-2 text-[10px] text-slate-500">
                  Avg progress {chartData.avgProgress}% ·{" "}
                  {formatCompact(chartData.beneficiaries)} people reach
                </p>
              </section>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default GraphsPanel;
