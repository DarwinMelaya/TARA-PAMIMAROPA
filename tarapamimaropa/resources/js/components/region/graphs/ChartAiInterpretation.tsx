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
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-xs">
            <header className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                    <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted text-foreground">
                            <HiSparkles className="h-4 w-4" aria-hidden />
                        </span>
                        Explain these charts
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        Plain-language notes for{' '}
                        <span className="font-medium text-foreground/80">
                            {context.context_label}
                        </span>
                    </p>
                </div>
                <button
                    type="button"
                    onClick={() => void run()}
                    disabled={loading || context.charts.length === 0}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50"
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
                    <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                        <p className="font-semibold">Couldn’t finish that</p>
                        <p className="mt-1 leading-relaxed opacity-90">{error}</p>
                    </div>
                ) : null}

                {loading && !result ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
                        <span className="inline-flex gap-1.5">
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
                            <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
                        </span>
                        <p className="text-sm text-muted-foreground">
                            Reading your charts…
                        </p>
                    </div>
                ) : null}

                {!result && !loading && !error ? (
                    <div className="rounded-xl bg-muted/50 px-4 py-5 text-sm leading-relaxed text-foreground/80">
                        Press <span className="font-semibold">Explain charts</span>{' '}
                        for a short story of what you’re looking at — who’s ahead,
                        who’s light, and what to check next.
                    </div>
                ) : null}

                {result ? (
                    <>
                        <div className="rounded-2xl border border-border bg-muted/40 px-4 py-4">
                            <h2 className="text-base font-semibold leading-snug text-foreground">
                                {result.headline}
                            </h2>
                            <p className="mt-2 text-sm leading-relaxed text-foreground/80">
                                {result.summary}
                            </p>
                        </div>

                        <div className="space-y-2.5">
                            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                <HiLightBulb className="h-3.5 w-3.5" aria-hidden />
                                Key takeaways
                            </p>
                            {result.findings.map((item, index) => (
                                <article
                                    key={`${item.title}-${index}`}
                                    className="rounded-xl border border-border bg-muted/30 px-4 py-3"
                                >
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {item.title}
                                    </h3>
                                    <p className="mt-1 text-sm leading-relaxed text-foreground/80">
                                        {item.detail}
                                    </p>
                                </article>
                            ))}
                        </div>

                        {result.recommendations.length > 0 ? (
                            <div className="rounded-xl border border-border bg-card px-4 py-3">
                                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                    Suggested next steps
                                </p>
                                <ol className="mt-2 list-decimal space-y-2 pl-4">
                                    {result.recommendations.map((step, index) => (
                                        <li
                                            key={`${step}-${index}`}
                                            className="text-sm leading-relaxed text-foreground/80"
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
