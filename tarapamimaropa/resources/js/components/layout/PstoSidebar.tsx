import { Link } from '@inertiajs/react';
import { FolderKanban, LayoutGrid, MapPin } from 'lucide-react';
import AppearanceToggle from '@/components/appearance-toggle';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
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
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="text-muted-foreground flex items-center gap-2 px-2 text-[11px] font-semibold uppercase tracking-wide">
                    <MapPin className="size-3.5" aria-hidden />
                    PSTO
                </div>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <AppearanceToggle />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
};

export default PstoSidebar;
