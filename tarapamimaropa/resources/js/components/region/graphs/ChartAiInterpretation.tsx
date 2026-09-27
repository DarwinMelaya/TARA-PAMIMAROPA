import { useState } from 'react';
import {
    HiArrowPath,
    HiLightBulb,
    HiSparkles,
} from 'react-icons/hi2';

export type ChartSeriesPayload = {
    title: string;
    format?: 'number' | 'peso' | 'compact';
    rows: Array<{ label: string; value: number }>;
};

export type ChartInterpretContext = {
    view: 'region' | 'province' | 'municipality' | 'program';
    context_label: string;
    year?: string | null;
    stats?: Record<string, number>;
    charts: ChartSeriesPayload[];
};

export type ChartInterpretation = {
    headline: string;
    summary: string;
    findings: Array<{ title: string; detail: string }>;
    recommendations: string[];
    generated_at: string;
};

type ChartAiInterpretationProps = {
    context: ChartInterpretContext;
};

const INTERPRET_URL = '/region/analytics-chart-interpret';

const readXsrfToken = (): string => {
    const match = document.cookie
        .split('; ')
        .find((row) => row.startsWith('XSRF-TOKEN='));
    if (!match) return '';
    return decodeURIComponent(match.slice('XSRF-TOKEN='.length));
};

const ChartAiInterpretation = ({ context }: ChartAiInterpretationProps) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<ChartInterpretation | null>(null);

    const run = async () => {
        setLoading(true);
        setError('');
        try {
            const response = await fetch(INTERPRET_URL, {
                method: 'POST',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': readXsrfToken(),
                },
                body: JSON.stringify({
                    ...context,
                    year: context.year || null,
                }),
            });

            const data = (await response.json().catch(() => ({}))) as {
                interpretation?: ChartInterpretation;
                message?: string;
            };

            if (!response.ok) {
                throw new Error(
                    data.message || 'Something went wrong. Please try again.',
                );
            }

            if (!data.interpretation) {
                throw new Error('No explanation came back. Please try again.');
            }

            setResult(data.interpretation);
        } catch (err) {
            setError(
                err instanceof Error
                    ? err.message
                    : 'Could not explain the charts right now.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <header className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-cyan-50 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-200">
                            <HiSparkles className="h-4 w-4" aria-hidden />
                        </span>
                        Explain these charts
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-slate-500">
                        Plain-language notes for{' '}
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                            {context.context_label}
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={loading || context.charts.length === 0}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-cyan-600 px-4 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:opacity-50"
                >
                    <HiArrowPath
                        className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`}
                        aria-hidden
                    />
                    {loading
                        ? 'Writing notes…'
                        : result
                          ? 'Refresh notes'
                          : 'Explain charts'}
                </button>
            </header>

            <div className="space-y-4 px-5 py-4">
                {error ? (
                    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-100">
                        <p className="font-semibold">Couldn’t finish that</p>
                        <p className="mt-1 leading-relaxed opacity-90">{error}</p>
                    </div>
                ) : null}

                {loading && !result ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <span className="inline-flex gap-1.5">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:120ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-cyan-400 [animation-delay:240ms]" />
                        </span>
                        <p className="text-sm text-slate-500">
                            Reading your charts…
                        </p>
                    </div>
                ) : null}

                {!result && !loading && !error ? (
                    <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm leading-relaxed text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                        Press <span className="font-semibold">Explain charts</span>{' '}
                        for a short story of what you’re looking at — who’s ahead,
                        who’s light, and what to check next.
                    </div>
                ) : null}

                {result ? (
                    <>
                        <div className="rounded-2xl border border-cyan-100 bg-gradient-to-br from-cyan-50/80 via-white to-sky-50/60 px-4 py-4 dark:border-cyan-500/20 dark:from-cyan-950/30 dark:via-slate-950/40 dark:to-slate-900/50">
                            <h2 className="text-base font-semibold leading-snug text-slate-900 dark:text-white">
                                {result.headline}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                {result.summary}
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                <HiLightBulb className="h-3.5 w-3.5" aria-hidden />
                                Key takeaways
                            </p>
                            {result.findings.map((item, index) => (
                                <article
                                    key={`${item.title}-${index}`}
                                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-700/70 dark:bg-slate-950/40"
                                >
                                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                                        {item.detail}
                                    </p>
                                </article>
                            ))}
                        </div>

                        {result.recommendations.length > 0 ? (
                            <div className="rounded-xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-700/70 dark:bg-slate-950/40">
                                <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
                                    Suggested next steps
                                </p>
                                <ol className="mt-2 list-decimal space-y-2 pl-4">
                                    {result.recommendations.map((step, index) => (
                                        <li
                                            key={`${step}-${index}`}
                                            className="text-sm leading-relaxed text-slate-700 dark:text-slate-200"
                                        >
                                            {step}
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        ) : null}
                    </>
                ) : null}
            </div>
        </section>
    );
};

export default ChartAiInterpretation;
