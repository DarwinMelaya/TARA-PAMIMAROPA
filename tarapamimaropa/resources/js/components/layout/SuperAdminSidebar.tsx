import { LayoutGrid, Shield, Users } from 'lucide-react';
import CommandSidebar from '@/components/layout/CommandSidebar';
import { dashboard, users } from '@/routes/superadmin';
import type { NavItem } from '@/types';

const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Users',
        href: users(),
        icon: Users,
    },
];

const SuperAdminSidebar = () => {
    return (
        <CommandSidebar
            homeHref={dashboard()}
            roleLabel="Super Admin"
            roleIcon={Shield}
            items={mainNavItems}
        />
    );
};

export default SuperAdminSidebar;
