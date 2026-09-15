import { FolderKanban, LayoutGrid, MapPinned } from 'lucide-react';
import CommandSidebar from '@/components/layout/CommandSidebar';
import { dashboard, programs } from '@/routes/region';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Programs',
        href: programs(),
        icon: FolderKanban,
    },
];

const RegionSidebar = () => {
    return (
        <CommandSidebar
            homeHref={dashboard()}
            roleLabel="Regional Office"
            roleIcon={MapPinned}
            items={mainNavItems}
        />
    );
};

export default RegionSidebar;
