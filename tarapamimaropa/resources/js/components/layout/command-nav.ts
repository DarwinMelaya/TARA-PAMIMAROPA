import {
    FolderKanban,
    LayoutGrid,
    MapPin,
    MapPinned,
    Shield,
    Users,
    UserRound,
    type LucideIcon,
} from 'lucide-react';
import { usePage } from '@inertiajs/react';
import { dashboard as appDashboard } from '@/routes';
import { edit as editProfile } from '@/routes/profile';
import {
    dashboard as pstoDashboard,
    programs as pstoPrograms,
} from '@/routes/psto';
import {
    dashboard as regionDashboard,
    programs as regionPrograms,
} from '@/routes/region';
import {
    dashboard as superAdminDashboard,
    users as superAdminUsers,
} from '@/routes/superadmin';
import type { NavItem, UserRole } from '@/types';

export type CommandNavConfig = {
    homeHref: NavItem['href'];
    roleLabel: string;
    roleIcon: LucideIcon;
    items: NavItem[];
    mobileItems: NavItem[];
};

const profileItem: NavItem = {
    title: 'Profile',
    href: editProfile(),
    icon: UserRound,
};

function configForRole(role: UserRole | undefined): CommandNavConfig {
    switch (role) {
        case 'regional_office':
            return {
                homeHref: regionDashboard(),
                roleLabel: 'Regional Office',
                roleIcon: MapPinned,
                items: [
                    {
                        title: 'Dashboard',
                        href: regionDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Programs',
                        href: regionPrograms(),
                        icon: FolderKanban,
                    },
                ],
                mobileItems: [
                    {
                        title: 'Dashboard',
                        href: regionDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Programs',
                        href: regionPrograms(),
                        icon: FolderKanban,
                    },
                    profileItem,
                ],
            };
        case 'psto':
            return {
                homeHref: pstoDashboard(),
                roleLabel: 'PSTO',
                roleIcon: MapPin,
                items: [
                    {
                        title: 'Dashboard',
                        href: pstoDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Programs',
                        href: pstoPrograms(),
                        icon: FolderKanban,
                    },
                ],
                mobileItems: [
                    {
                        title: 'Dashboard',
                        href: pstoDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Programs',
                        href: pstoPrograms(),
                        icon: FolderKanban,
                    },
                    profileItem,
                ],
            };
        case 'super_admin':
            return {
                homeHref: superAdminDashboard(),
                roleLabel: 'Super Admin',
                roleIcon: Shield,
                items: [
                    {
                        title: 'Dashboard',
                        href: superAdminDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Users',
                        href: superAdminUsers(),
                        icon: Users,
                    },
                ],
                mobileItems: [
                    {
                        title: 'Dashboard',
                        href: superAdminDashboard(),
                        icon: LayoutGrid,
                    },
                    {
                        title: 'Users',
                        href: superAdminUsers(),
                        icon: Users,
                    },
                    profileItem,
                ],
            };
        default:
            return {
                homeHref: appDashboard(),
                roleLabel: 'Platform',
                roleIcon: LayoutGrid,
                items: [
                    {
                        title: 'Dashboard',
                        href: appDashboard(),
                        icon: LayoutGrid,
                    },
                ],
                mobileItems: [
                    {
                        title: 'Dashboard',
                        href: appDashboard(),
                        icon: LayoutGrid,
                    },
                    profileItem,
                ],
            };
    }
}

/** Role-aware nav for sidebars + mobile bottom bar (survives settings pages). */
export function useCommandNav(): CommandNavConfig {
    const { auth } = usePage().props;
    return configForRole(auth.user?.role);
}
