import { LayoutGrid } from 'lucide-react';
import CommandSidebar from '@/components/layout/CommandSidebar';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
];

export function AppSidebar() {
    return (
        <CommandSidebar
            homeHref={dashboard()}
            roleLabel="Platform"
            items={mainNavItems}
        />
    );
}
