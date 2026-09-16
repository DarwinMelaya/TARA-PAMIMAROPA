import { Link } from '@inertiajs/react';
import { useMemo } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn } from '@/lib/utils';
import type { NavItem } from '@/types';

type MobileBottomNavProps = {
    items: NavItem[];
};

/**
 * Mobile bottom nav — raised active disc + curved notch bar.
 * Shape/layout only; colors use existing theme tokens.
 */
export default function MobileBottomNav({ items }: MobileBottomNavProps) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    const activeIndex = useMemo(() => {
        const idx = items.findIndex((item) => isCurrentOrParentUrl(item.href));
        return idx >= 0 ? idx : 0;
    }, [items, isCurrentOrParentUrl]);

    const count = Math.max(items.length, 1);
    const slot = 100 / count;
    const notchCenter = slot * activeIndex + slot / 2;

    return (
        <nav
            aria-label="Primary"
            className="pointer-events-none fixed inset-x-0 bottom-0 z-50 md:hidden"
        >
            <div
                className="pointer-events-auto px-3"
                style={{
                    paddingBottom: 'max(0.45rem, env(safe-area-inset-bottom))',
                }}
            >
                <div className="relative mx-auto h-[4.5rem] max-w-md">
                    <svg
                        className="text-background absolute inset-0 size-full drop-shadow-[0_10px_28px_rgba(0,0,0,0.22)]"
                        viewBox="0 0 100 72"
                        preserveAspectRatio="none"
                        aria-hidden
                    >
                        <path fill="currentColor" d={notchPath(notchCenter)} />
                    </svg>

                    {/* Raised white disc behind active icon */}
                    <div
                        className="border-background bg-background pointer-events-none absolute top-0 z-10 size-14 -translate-x-1/2 -translate-y-[48%] rounded-full border-[5px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] transition-[left] duration-300 ease-out"
                        style={{ left: `${notchCenter}%` }}
                    />

                    <ul className="relative z-20 flex h-full items-end px-0.5 pb-2.5">
                        {items.map((item, index) => {
                            const active = index === activeIndex;
                            const Icon = item.icon;

                            return (
                                <li
                                    key={item.title}
                                    className="flex min-w-0 flex-1 justify-center"
                                >
                                    <Link
                                        href={item.href}
                                        prefetch
                                        className={cn(
                                            'relative flex w-full flex-col items-center gap-0.5 px-0.5 pt-1 text-center transition-colors duration-200',
                                            active
                                                ? 'text-foreground'
                                                : 'text-muted-foreground',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'flex size-11 items-center justify-center transition-transform duration-300 ease-out',
                                                active &&
                                                    '-translate-y-[1.55rem]',
                                            )}
                                        >
                                            {Icon ? (
                                                <Icon
                                                    className={cn(
                                                        'size-5 stroke-[1.7]',
                                                        active &&
                                                            'text-primary size-[1.35rem] stroke-[2]',
                                                    )}
                                                    aria-hidden
                                                />
                                            ) : null}
                                        </span>
                                        <span
                                            className={cn(
                                                'max-w-full truncate text-[10px] leading-none',
                                                active
                                                    ? 'font-semibold'
                                                    : 'font-medium opacity-80',
                                            )}
                                        >
                                            {item.title}
                                        </span>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>

                    <div
                        className="bg-foreground/20 pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full"
                        aria-hidden
                    />
                </div>
            </div>
        </nav>
    );
}

/** viewBox 0 0 100 72 — notch center `cx` in % width units. */
function notchPath(cx: number): string {
    const top = 24;
    const bottom = 72;
    const r = 11.5;
    const flare = 7;
    const half = r + flare;

    const n0 = Math.max(2, cx - half);
    const n1 = Math.min(98, cx + half);

    return [
        `M 0 ${top}`,
        `H ${n0}`,
        `C ${n0 + flare * 0.65} ${top} ${cx - r} ${top + 1} ${cx - r} ${top + r * 0.7}`,
        `A ${r} ${r} 0 0 0 ${cx + r} ${top + r * 0.7}`,
        `C ${cx + r} ${top + 1} ${n1 - flare * 0.65} ${top} ${n1} ${top}`,
        `H 100`,
        `V ${bottom}`,
        `H 0`,
        'Z',
    ].join(' ');
}
