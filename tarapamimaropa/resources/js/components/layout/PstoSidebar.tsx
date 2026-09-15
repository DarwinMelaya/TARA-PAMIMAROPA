import { FolderKanban, LayoutGrid, MapPin } from 'lucide-react';
import CommandSidebar from '@/components/layout/CommandSidebar';
import { dashboard, programs } from '@/routes/psto';
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

const PstoSidebar = () => {
    return (
        <CommandSidebar
            homeHref={dashboard()}
            roleLabel="PSTO"
            roleIcon={MapPin}
            items={mainNavItems}
        />
    );
};

export default PstoSidebar;
