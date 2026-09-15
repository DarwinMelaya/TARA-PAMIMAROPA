import { Link } from '@inertiajs/react';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
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
import type { NavItem } from '@/types';

type CommandSidebarProps = {
    homeHref: NavItem['href'];
    roleLabel: string;
    roleIcon?: LucideIcon;
    items: NavItem[];
    footer?: ReactNode;
};

/**
 * Shared app sidebar chrome — nested-card shell (Foodaily-style structure).
 * Colors stay on existing --sidebar* tokens — layout/shape only.
 */
const CommandSidebar = ({
    homeHref,
    roleLabel,
    roleIcon: RoleIcon,
    items,
    footer,
}: CommandSidebarProps) => {
    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader className="gap-4 px-3 pt-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            size="lg"
                            asChild
                            className="h-12 rounded-2xl px-2"
                        >
                            <Link href={homeHref} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
                <div className="text-sidebar-foreground/50 flex items-center gap-2 px-2 text-[10px] font-semibold tracking-[0.16em] uppercase group-data-[collapsible=icon]:hidden">
                    {RoleIcon ? (
                        <RoleIcon className="size-3.5 shrink-0 opacity-80" aria-hidden />
                    ) : null}
                    {roleLabel}
                </div>
            </SidebarHeader>

            <SidebarContent className="px-2 pt-2">
                <NavMain items={items} />
            </SidebarContent>

            <SidebarFooter className="gap-2 px-3 pb-4">
                {footer ?? <AppearanceToggle />}
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
};

export default CommandSidebar;
