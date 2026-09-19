import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { cn, toUrl } from '@/lib/utils';
import type { NavItem } from '@/types';

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

function isBestMatch(
    item: NavItem,
    items: NavItem[],
    currentPath: string,
): boolean {
    const path = hrefPath(item.href);
    const matched =
        currentPath === path ||
        currentPath.startsWith(`${path}/`) ||
        (path.startsWith('/settings') && currentPath.startsWith('/settings'));

    if (!matched) return false;

    return !items.some((other) => {
        if (other === item) return false;
        const otherPath = hrefPath(other.href);
        const otherMatched =
            currentPath === otherPath ||
            currentPath.startsWith(`${otherPath}/`) ||
            (otherPath.startsWith('/settings') &&
                currentPath.startsWith('/settings'));
        return otherMatched && otherPath.length > path.length;
    });
}

function groupItems(items: NavItem[]): { label: string; items: NavItem[] }[] {
    const order: string[] = [];
    const map = new Map<string, NavItem[]>();

    for (const item of items) {
        const label = item.group?.trim() || 'Main';
        if (!map.has(label)) {
            map.set(label, []);
            order.push(label);
        }
        map.get(label)!.push(item);
    }

    return order.map((label) => ({ label, items: map.get(label)! }));
}

export function NavMain({ items }: { items: NavItem[] }) {
    const { currentUrl } = useCurrentUrl();
    const groups = groupItems(items);

    return (
        <>
            {groups.map((group) => (
                <SidebarGroup key={group.label} className="px-1 py-0">
                    <SidebarGroupLabel className="text-sidebar-foreground/45 mb-1 px-3 text-[10px] font-semibold tracking-[0.16em] uppercase">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        {group.items.map((item) => {
                            const active = isBestMatch(
                                item,
                                items,
                                currentUrl,
                            );
                            return (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={active}
                                        tooltip={{ children: item.title }}
                                        className={cn(
                                            'h-10 rounded-xl border px-3 text-sm transition-colors',
                                            active
                                                ? 'border-sidebar-border bg-sidebar-accent font-semibold text-sidebar-accent-foreground'
                                                : 'border-transparent hover:bg-sidebar-accent/70',
                                        )}
                                    >
                                        <Link href={item.href} prefetch>
                                            {item.icon ? (
                                                <item.icon className="size-[1.125rem]" />
                                            ) : null}
                                            <span className="truncate">
                                                {item.title}
                                            </span>
                                            {active ? (
                                                <span className="bg-sidebar-primary ml-auto size-1.5 shrink-0 rounded-full group-data-[collapsible=icon]:hidden" />
                                            ) : null}
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
