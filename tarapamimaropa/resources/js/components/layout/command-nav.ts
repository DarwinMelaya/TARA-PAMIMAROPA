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
    brandTitle: string;
    items: NavItem[];
    mobileItems: NavItem[];
};

const profileItem: NavItem = {
    title: 'Profile',
    href: editProfile(),
    icon: UserRound,
    group: 'Account',
};

function withGroups(
    main: Omit<NavItem, 'group'>[],
): NavItem[] {
    return [
        ...main.map((item) => ({ ...item, group: 'Main' as const })),
        profileItem,
    ];
}

function configForRole(role: UserRole | undefined): CommandNavConfig {
    switch (role) {
        case 'regional_office': {
            const main = [
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
            ];
            const items = withGroups(main);
            return {
                homeHref: regionDashboard(),
                roleLabel: 'Regional Office',
                roleIcon: MapPinned,
                brandTitle: 'TARA MIMAROPA',
                items,
                mobileItems: [
                    ...main.map((i) => ({ ...i, group: 'Main' })),
                    profileItem,
                ],
            };
        }
        case 'psto': {
            const main = [
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
            ];
            const items = withGroups(main);
            return {
                homeHref: pstoDashboard(),
                roleLabel: 'PSTO',
                roleIcon: MapPin,
                brandTitle: 'TARA PSTO',
                items,
                mobileItems: [
                    ...main.map((i) => ({ ...i, group: 'Main' })),
                    profileItem,
                ],
            };
        }
        case 'super_admin': {
            const main = [
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
            ];
            const items = withGroups(main);
            return {
                homeHref: superAdminDashboard(),
                roleLabel: 'Super Admin',
                roleIcon: Shield,
                brandTitle: 'TARA Admin',
                items,
                mobileItems: [
                    ...main.map((i) => ({ ...i, group: 'Main' })),
                    profileItem,
                ],
            };
        }
        default: {
            const main = [
                {
                    title: 'Dashboard',
                    href: appDashboard(),
                    icon: LayoutGrid,
                },
            ];
            const items = withGroups(main);
            return {
                homeHref: appDashboard(),
                roleLabel: 'Platform',
                roleIcon: LayoutGrid,
                brandTitle: 'TARA',
                items,
                mobileItems: [
                    ...main.map((i) => ({ ...i, group: 'Main' })),
                    profileItem,
                ],
            };
        }
    }
}

/** Role-aware nav for sidebars + mobile bottom bar (survives settings pages). */
export function useCommandNav(): CommandNavConfig {
    const { auth } = usePage().props;
    return configForRole(auth.user?.role);
}
