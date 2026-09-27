import type { ReactNode } from 'react';

type ChatReplyBodyProps = {
    text: string;
    light?: boolean;
};

type ReplyBlock =
    | { kind: 'paragraph'; text: string }
    | { kind: 'callout'; text: string }
    | { kind: 'item'; index: number; title: string; body: string };

/** Strip leftover markdown markers before display. */
export const stripMarkdownNoise = (input: string): string => {
    let text = input.trim();
    text = text.replace(/```[\s\S]*?```/g, '');
    text = text.replace(/`([^`]+)`/g, '$1');
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');
    text = text.replace(/__(.+?)__/g, '$1');
    text = text.replace(/(?<!\w)\*(.+?)\*(?!\w)/g, '$1');
    text = text.replace(/(?<!\w)_(.+?)_(?!\w)/g, '$1');
    text = text.replace(/^#{1,6}\s*/gm, '');
    text = text.replace(/^\s*>\s?/gm, '');
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
    text = text.replace(/[*_`]/g, '');
    text = text.replace(/[ \t]+\n/g, '\n');
    text = text.replace(/\n{3,}/g, '\n\n');
    return text.trim();
};

const parseReplyBlocks = (raw: string): ReplyBlock[] => {
    const text = stripMarkdownNoise(raw);
    if (!text) return [];

    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const blocks: ReplyBlock[] = [];
    const itemRe = /^(\d+)[.)]\s+(.*)$/;
    const calloutRe = /^(insight|signal|risk|next step|recommendation)\s*[:\-–]\s*(.+)$/i;

    for (const line of lines) {
        const match = line.match(itemRe);
        if (match) {
            const index = Number(match[1]);
            const rest = match[2].trim();
            const titleSplit = rest.match(/^([^:]{2,80}):\s*(.+)$/);
            if (titleSplit) {
                blocks.push({
                    kind: 'item',
                    index,
                    title: titleSplit[1].trim(),
                    body: titleSplit[2].trim(),
                });
            } else {
                blocks.push({
                    kind: 'item',
                    index,
                    title: '',
                    body: rest,
                });
            }
            continue;
        }

        const callout = line.match(calloutRe);
        if (callout) {
            blocks.push({
                kind: 'callout',
                text: `${callout[1]}: ${callout[2]}`.replace(/^\w/, (c) => c.toUpperCase()),
            });
            continue;
        }

        const bullet = line.replace(/^[-•]\s+/, '').trim();
        blocks.push({ kind: 'paragraph', text: bullet });
    }

    return blocks;
};

const ChatReplyBody = ({ text, light = true }: ChatReplyBodyProps) => {
    const blocks = parseReplyBlocks(text);
    if (blocks.length === 0) return null;

    return (
        <div className="space-y-2.5">
            {blocks.map((block, i): ReactNode => {
                if (block.kind === 'paragraph') {
                    return (
                        <p key={`p-${i}`} className="text-sm leading-relaxed">
                            {block.text}
                        </p>
                    );
                }

                if (block.kind === 'callout') {
                    return (
                        <div
                            key={`c-${i}`}
                            className={[
                                'rounded-xl border-l-4 px-3 py-2 text-sm leading-relaxed',
                                light
                                    ? 'border-l-cyan-500 border border-cyan-100 bg-cyan-50/70 text-slate-800'
                                    : 'border-l-cyan-400 border border-cyan-500/20 bg-cyan-500/10 text-slate-100',
                            ].join(' ')}
                        >
                            {block.text}
                        </div>
                    );
                }

                return (
                    <article
                        key={`i-${block.index}-${i}`}
                        className={[
                            'rounded-xl border px-3 py-2.5',
                            light
                                ? 'border-slate-200 bg-slate-50/90'
                                : 'border-slate-700/70 bg-slate-950/50',
                        ].join(' ')}
                    >
                        <div className="flex gap-2.5">
                            <span
                                className={[
                                    'mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold',
                                    light
                                        ? 'bg-violet-100 text-violet-800'
                                        : 'bg-violet-500/25 text-violet-100',
                                ].join(' ')}
                            >
                                {block.index}
                            </span>
                            <div className="min-w-0 space-y-1">
                                {block.title ? (
                                    <p className="text-sm font-semibold leading-snug">
                                        {block.title}
                                    </p>
                                ) : null}
                                <p className="text-sm leading-relaxed opacity-90">
                                    {block.body}
                                </p>
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
};

export default ChatReplyBody;
