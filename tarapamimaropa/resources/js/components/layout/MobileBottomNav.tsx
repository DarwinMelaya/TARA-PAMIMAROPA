import { Link } from '@inertiajs/react';
import { useMemo } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl, cn } from '@/lib/utils';
import type { NavItem } from '@/types';

type MobileBottomNavProps = {
    items: NavItem[];
};

function hrefPath(href: NavItem['href']): string {
    const raw = toUrl(href);
    if (!raw.startsWith('http')) {
        return raw.split('?')[0] ?? raw;
    }
    try {
        return new URL(raw).pathname;
    } catch {
        return raw;
    }
}

/**
 * Pick the most specific matching item (longest path) so /region/programs
 * highlights Programs instead of Dashboard (/region).
 */
function findActiveIndex(items: NavItem[], currentPath: string): number {
    let best = -1;
    let bestLen = -1;

    items.forEach((item, index) => {
        const path = hrefPath(item.href);
        if (!path) return;

        const matched =
            currentPath === path ||
            currentPath.startsWith(`${path}/`) ||
            // Profile covers all settings pages
            (path.startsWith('/settings') &&
                currentPath.startsWith('/settings'));

        if (!matched) return;

        if (path.length > bestLen) {
            bestLen = path.length;
            best = index;
        }
    });

    return best;
}

/**
 * Simple mobile bottom nav — clear active mark, existing colors only.
 */
export default function MobileBottomNav({ items }: MobileBottomNavProps) {
    const { currentUrl } = useCurrentUrl();

    const activeIndex = useMemo(
        () => findActiveIndex(items, currentUrl),
        [items, currentUrl],
    );

    return (
        <nav
            aria-label="Primary"
            className="border-border bg-background/95 fixed inset-x-0 bottom-0 z-50 border-t backdrop-blur-md md:hidden"
            style={{
                paddingBottom: 'env(safe-area-inset-bottom)',
            }}
        >
            <ul className="mx-auto flex max-w-lg items-stretch gap-1 px-2 py-1.5">
                {items.map((item, index) => {
                    const active = index === activeIndex;
                    const Icon = item.icon;

                    return (
                        <li key={item.title} className="min-w-0 flex-1">
                            <Link
                                href={item.href}
                                prefetch
                                aria-current={active ? 'page' : undefined}
                                className={cn(
                                    'flex flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-center transition-colors',
                                    active
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                                )}
                            >
                                {Icon ? (
                                    <Icon
                                        className="size-5 stroke-[1.75]"
                                        aria-hidden
                                    />
                                ) : null}
                                <span
                                    className={cn(
                                        'max-w-full truncate text-[10px] leading-none',
                                        active
                                            ? 'font-semibold'
                                            : 'font-medium',
                                    )}
                                >
                                    {item.title}
                                </span>
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
