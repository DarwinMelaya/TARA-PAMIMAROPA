import { useEffect, useRef, useState } from 'react';
import type { TaraProject } from '@/constants/taraProjects';

export type ProjectStreamMeta = {
    next_cursor: string | null;
    per_page: number;
    province?: string | null;
    url: string;
};

type StreamPage = {
    data: TaraProject[];
    next_cursor: string | null;
};

/**
 * First page from Inertia; remaining pages via cursor stream (no giant first paint).
 */
export function useDashboardProjectStream(
    seed: TaraProject[],
    stream: ProjectStreamMeta | null | undefined,
) {
    const [projects, setProjects] = useState<TaraProject[]>(seed);
    const [streaming, setStreaming] = useState(Boolean(stream?.next_cursor));
    const seedRef = useRef(seed);
    seedRef.current = seed;

    useEffect(() => {
        setProjects(seed);
    }, [seed]);

    useEffect(() => {
        if (!stream?.url || !stream.next_cursor) {
            setStreaming(false);
            return;
        }

        let cancelled = false;
        let cursor: string | null = stream.next_cursor;

        const run = async () => {
            setStreaming(true);

            while (cursor && !cancelled) {
                const params = new URLSearchParams({
                    cursor,
                    per_page: String(stream.per_page),
                });
                if (stream.province) {
                    params.set('province', stream.province);
                }

                try {
                    const response = await fetch(`${stream.url}?${params}`, {
                        credentials: 'same-origin',
                        headers: {
                            Accept: 'application/json',
                            'X-Requested-With': 'XMLHttpRequest',
                        },
                    });

                    if (!response.ok) {
                        break;
                    }

                    const page = (await response.json()) as StreamPage;
                    if (cancelled) {
                        break;
                    }

                    if (page.data?.length) {
                        setProjects((prev) => {
                            const seen = new Set(prev.map((p) => p.id));
                            const extra = page.data.filter((p) => !seen.has(p.id));
                            return extra.length ? prev.concat(extra) : prev;
                        });
                    }

                    cursor = page.next_cursor ?? null;
                    // Yield so map/UI stay responsive while millions stream in.
                    await new Promise((resolve) => setTimeout(resolve, 0));
                } catch {
                    break;
                }
            }

            if (!cancelled) {
                setStreaming(false);
            }
        };

        void run();

        return () => {
            cancelled = true;
        };
    }, [stream?.url, stream?.next_cursor, stream?.per_page, stream?.province]);

    return { projects, streaming } as const;
}
