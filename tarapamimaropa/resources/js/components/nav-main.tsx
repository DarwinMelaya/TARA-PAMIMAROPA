import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { toUrl } from '@/lib/utils';
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
        currentPath === path || currentPath.startsWith(`${path}/`);

    if (!matched) return false;

    // Prefer longer paths so /region/programs wins over /region
    return !items.some((other) => {
        if (other === item) return false;
        const otherPath = hrefPath(other.href);
        const otherMatched =
            currentPath === otherPath ||
            currentPath.startsWith(`${otherPath}/`);
        return otherMatched && otherPath.length > path.length;
    });
}

export function NavMain({ items }: { items: NavItem[] }) {
    const { currentUrl } = useCurrentUrl();

    return (
        <SidebarGroup className="px-1 py-0">
            <SidebarMenu className="gap-2">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton
                            asChild
                            isActive={isBestMatch(item, items, currentUrl)}
                            tooltip={{ children: item.title }}
                            className="h-11 rounded-2xl px-3.5 text-[15px] data-[active=true]:bg-sidebar-accent data-[active=true]:font-semibold"
                        >
                            <Link href={item.href} prefetch>
                                {item.icon && <item.icon />}
                                <span>{item.title}</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
