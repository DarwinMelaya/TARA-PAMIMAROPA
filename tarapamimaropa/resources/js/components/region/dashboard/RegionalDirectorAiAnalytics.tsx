import { useEffect, useState } from 'react';
import {
    HiArrowPath,
    HiClipboardDocumentList,
    HiExclamationTriangle,
    HiLightBulb,
    HiMap,
    HiSparkles,
    HiXMark,
} from 'react-icons/hi2';
import { useTheme } from '@/theme/ThemeProvider';

export type PlanningBrief = {
    headline: string;
    situation: string;
    priorities: Array<{ title: string; why: string; action: string }>;
    equity: Array<{ province: string; signal: string; note: string }>;
    risks: Array<{ title: string; severity: string; mitigation: string }>;
    next_30_days: string[];
    generated_at: string;
    project_count: number;
};

type RegionalDirectorAiAnalyticsProps = {
    open: boolean;
    onClose: () => void;
    onAskChat?: (prompt: string) => void;
    className?: string;
    variant?: 'dock' | 'sheet';
};

const BRIEF_URL = '/region/analytics-planning-brief';

const readXsrfToken = (): string => {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));
    if (!match) return '';
    return decodeURIComponent(match.slice('XSRF-TOKEN='.length));
};

const signalClass = (signal: string, light: boolean): string => {
    const s = signal.toLowerCase();
    if (s.includes('under')) {
        return light
            ? 'border-amber-300 bg-amber-50 text-amber-900'
            : 'border-amber-500/40 bg-amber-500/15 text-amber-100';
    }
    if (s.includes('heavy')) {
        return light
            ? 'border-rose-300 bg-rose-50 text-rose-900'
            : 'border-rose-500/40 bg-rose-500/15 text-rose-100';
    }
    return light
        ? 'border-emerald-300 bg-emerald-50 text-emerald-900'
        : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100';
};

const severityClass = (severity: string, light: boolean): string => {
    const s = severity.toLowerCase();
    if (s.includes('high')) {
        return light ? 'text-rose-700' : 'text-rose-300';
    }
    if (s.includes('medium')) {
        return light ? 'text-amber-700' : 'text-amber-300';
    }
    return light ? 'text-slate-600' : 'text-slate-300';
};

const RegionalDirectorAiAnalytics = ({
    open,
    onClose,
    onAskChat,
    className = '',
    variant = 'dock',
}: RegionalDirectorAiAnalyticsProps) => {
    const { theme } = useTheme();
    const light = theme === 'light';
    const [brief, setBrief] = useState<PlanningBrief | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const loadBrief = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(BRIEF_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({}),
            });

            const data = (await response.json().catch(() => ({}))) as {
                brief?: PlanningBrief;
                message?: string;
            };

            if (!response.ok) {
                throw new Error(
                    data.message || 'Could not generate planning brief.',
                );
            }

            if (!data.brief) {
                throw new Error('No planning brief returned.');
            }

            setBrief(data.brief);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not reach TARA AI planning.',
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open || brief || loading) return;
        void loadBrief();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    if (!open) return null;

    const shellClass =
        variant === 'sheet'
            ? light
                ? 'flex h-full max-h-[min(62vh,560px)] w-full flex-col overflow-hidden rounded-2xl border border-cyan-300/60 bg-white shadow-sm'
                : 'flex h-full max-h-[min(62vh,560px)] w-full flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-slate-900/96 shadow-[0_8px_48px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.12)] backdrop-blur-xl'
            : light
              ? 'pointer-events-auto flex h-[min(560px,70vh)] w-full max-w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-cyan-300/60 bg-white shadow-lg'
              : 'pointer-events-auto flex h-[min(560px,70vh)] w-full max-w-[min(440px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-cyan-400/35 bg-slate-900/96 shadow-[0_8px_48px_rgba(0,0,0,0.55),0_0_28px_rgba(34,211,238,0.15)] backdrop-blur-xl';

    const iconBtn = light
        ? 'rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:text-slate-900'
        : 'rounded-lg border border-slate-700/80 p-1.5 text-slate-400 hover:text-white';

    const card = light
        ? 'rounded-xl border border-slate-200 bg-slate-50/90 p-3'
        : 'rounded-xl border border-slate-700/70 bg-slate-950/55 p-3';

    return (
        <div
            className={[shellClass, className].join(' ')}
            role="dialog"
            aria-label="Regional Director AI planning analytics"
        >
            <header
                className={`flex items-start justify-between gap-2 border-b px-3 py-2.5 sm:px-4 ${
                    light ? 'border-cyan-200' : 'border-cyan-900/50'
                }`}
            >
                <div className="min-w-0">
                    <p
                        className={`flex items-center gap-1.5 text-[11px] font-bold tracking-[0.16em] uppercase ${
                            light ? 'text-cyan-800' : 'text-cyan-200'
                        }`}
                    >
                        <HiSparkles
                            className={`h-4 w-4 shrink-0 ${light ? 'text-cyan-600' : 'text-cyan-300'}`}
                            aria-hidden
                        />
                        RD AI Planning
                    </p>
                    <p
                        className={`mt-0.5 truncate text-[10px] ${
                            light ? 'text-slate-500' : 'text-slate-400'
                        }`}
                    >
                        Gemini brief · live MIMAROPA portfolio for the Regional
                        Director
                    </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                    <button
                        type="button"
                        onClick={() => void loadBrief()}
                        disabled={loading}
                        className={iconBtn}
                        title="Regenerate brief"
                    >
                        <HiArrowPath
                            className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`}
                            aria-hidden
                        />
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className={iconBtn}
                        aria-label="Close planning analytics"
                    >
                        <HiXMark className="h-4 w-4" aria-hidden />
                    </button>
                </div>
            </header>

            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
                {loading && !brief ? (
                    <div
                        className={`flex flex-col items-center justify-center gap-3 py-16 text-center ${
                            light ? 'text-cyan-800' : 'text-cyan-100'
                        }`}
                    >
                        <span className="inline-flex gap-1.5">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:120ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:240ms]" />
                        </span>
                        <p className="text-xs font-medium">
                            Building Regional Director planning brief…
                        </p>
                    </div>
                ) : null}

                {error ? (
                    <div
                        className={`rounded-xl border px-3 py-3 text-xs ${
                            light
                                ? 'border-red-300 bg-red-50 text-red-800'
                                : 'border-red-500/40 bg-red-500/10 text-red-200'
                        }`}
                    >
                        <p className="font-semibold">Could not load AI brief</p>
                        <p className="mt-1 opacity-90">{error}</p>
                        <button
                            type="button"
                            onClick={() => void loadBrief()}
                            className="mt-2 text-[11px] font-bold underline"
                        >
                            Try again
                        </button>
                    </div>
                ) : null}

                {brief ? (
                    <>
                        <section
                            className={
                                light
                                    ? 'rounded-xl border border-cyan-200 bg-gradient-to-br from-cyan-50 via-white to-sky-50 p-3.5'
                                    : 'rounded-xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/50 via-slate-950/40 to-slate-900/60 p-3.5'
                            }
                        >
                            <p
                                className={`text-[9px] font-bold tracking-[0.14em] uppercase ${
                                    light ? 'text-cyan-700/80' : 'text-cyan-300/80'
                                }`}
                            >
                                Situation · {brief.project_count} projects
                            </p>
                            <h2
                                className={`mt-1 text-sm font-semibold leading-snug ${
                                    light ? 'text-slate-900' : 'text-white'
                                }`}
                            >
                                {brief.headline}
                            </h2>
                            <p
                                className={`mt-2 text-xs leading-relaxed ${
                                    light ? 'text-slate-700' : 'text-slate-300'
                                }`}
                            >
                                {brief.situation}
                            </p>
                        </section>

                        <section>
                            <p
                                className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                                    light ? 'text-violet-800' : 'text-violet-200'
                                }`}
                            >
                                <HiLightBulb className="h-3.5 w-3.5" aria-hidden />
                                Planning priorities
                            </p>
                            <div className="space-y-2">
                                {brief.priorities.map((item, index) => (
                                    <article key={`${item.title}-${index}`} className={card}>
                                        <div className="flex items-start gap-2">
                                            <span
                                                className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                                    light
                                                        ? 'bg-violet-100 text-violet-800'
                                                        : 'bg-violet-500/25 text-violet-100'
                                                }`}
                                            >
                                                {index + 1}
                                            </span>
                                            <div className="min-w-0">
                                                <h3
                                                    className={`text-xs font-semibold ${
                                                        light
                                                            ? 'text-slate-900'
                                                            : 'text-white'
                                                    }`}
                                                >
                                                    {item.title}
                                                </h3>
                                                <p
                                                    className={`mt-1 text-[11px] leading-snug ${
                                                        light
                                                            ? 'text-slate-600'
                                                            : 'text-slate-300'
                                                    }`}
                                                >
                                                    {item.why}
                                                </p>
                                                <p
                                                    className={`mt-1.5 text-[11px] font-medium leading-snug ${
                                                        light
                                                            ? 'text-cyan-800'
                                                            : 'text-cyan-200'
                                                    }`}
                                                >
                                                    Next: {item.action}
                                                </p>
                                                {onAskChat ? (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            onAskChat(
                                                                `Help me execute this Regional Director priority: ${item.title}. Suggested action: ${item.action}`,
                                                            )
                                                        }
                                                        className={`mt-2 text-[10px] font-semibold ${
                                                            light
                                                                ? 'text-violet-700 hover:text-violet-900'
                                                                : 'text-violet-300 hover:text-violet-100'
                                                        }`}
                                                    >
                                                        Ask AI chat →
                                                    </button>
                                                ) : null}
                                            </div>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section>
                            <p
                                className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                                    light ? 'text-emerald-800' : 'text-emerald-200'
                                }`}
                            >
                                <HiMap className="h-3.5 w-3.5" aria-hidden />
                                Province equity
                            </p>
                            <div className="grid gap-2 sm:grid-cols-2">
                                {brief.equity.map((row, index) => (
                                    <article
                                        key={`${row.province}-${index}`}
                                        className={`rounded-xl border p-2.5 ${signalClass(row.signal, light)}`}
                                    >
                                        <p className="text-[11px] font-bold">
                                            {row.province}
                                        </p>
                                        <p className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide opacity-80">
                                            {row.signal}
                                        </p>
                                        <p className="mt-1 text-[11px] leading-snug opacity-90">
                                            {row.note}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section>
                            <p
                                className={`mb-2 flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                                    light ? 'text-rose-800' : 'text-rose-200'
                                }`}
                            >
                                <HiExclamationTriangle
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                />
                                Risk watchlist
                            </p>
                            <div className="space-y-2">
                                {brief.risks.map((risk, index) => (
                                    <article key={`${risk.title}-${index}`} className={card}>
                                        <div className="flex items-center justify-between gap-2">
                                            <h3
                                                className={`text-xs font-semibold ${
                                                    light
                                                        ? 'text-slate-900'
                                                        : 'text-white'
                                                }`}
                                            >
                                                {risk.title}
                                            </h3>
                                            <span
                                                className={`text-[9px] font-bold uppercase tracking-wide ${severityClass(risk.severity, light)}`}
                                            >
                                                {risk.severity}
                                            </span>
                                        </div>
                                        <p
                                            className={`mt-1 text-[11px] leading-snug ${
                                                light
                                                    ? 'text-slate-600'
                                                    : 'text-slate-300'
                                            }`}
                                        >
                                            {risk.mitigation}
                                        </p>
                                    </article>
                                ))}
                            </div>
                        </section>

                        <section className={card}>
                            <p
                                className={`flex items-center gap-1.5 text-[10px] font-bold tracking-[0.14em] uppercase ${
                                    light ? 'text-sky-800' : 'text-sky-200'
                                }`}
                            >
                                <HiClipboardDocumentList
                                    className="h-3.5 w-3.5"
                                    aria-hidden
                                />
                                Next 30 days
                            </p>
                            <ol className="mt-2 list-decimal space-y-1.5 pl-4">
                                {brief.next_30_days.map((step, index) => (
                                    <li
                                        key={`${step}-${index}`}
                                        className={`text-[11px] leading-snug ${
                                            light
                                                ? 'text-slate-700'
                                                : 'text-slate-200'
                                        }`}
                                    >
                                        {step}
                                    </li>
                                ))}
                            </ol>
                        </section>
                    </>
                ) : null}
            </div>
        </div>
    );
};

export default RegionalDirectorAiAnalytics;
