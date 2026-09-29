import { Link } from '@inertiajs/react';
import type { ReactNode } from 'react';
import AppearanceToggle from '@/components/appearance-toggle';
import AppLogoIcon from '@/components/app-logo-icon';
import { useCommandNav } from '@/components/layout/command-nav';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
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

type CommandSidebarProps = {
    footer?: ReactNode;
};

/**
 * Shared app sidebar chrome — desktop inset card + mobile bottom nav.
 * Structure mirrors command-style sidebars; colors stay on theme tokens.
 */
const CommandSidebar = ({ footer }: CommandSidebarProps) => {
    const {
        homeHref,
        roleLabel,
        roleIcon: RoleIcon,
        brandTitle,
        items,
        mobileItems,
    } = useCommandNav();

    return (
        <>
            <div className="hidden md:contents">
                <Sidebar collapsible="icon" variant="inset">
                    <SidebarHeader className="border-b border-sidebar-border/80 px-3 pt-3 pb-2">
                        <SidebarMenu>
                            <SidebarMenuItem>
                                <SidebarMenuButton
                                    size="lg"
                                    asChild
                                    className="h-12 rounded-xl px-2"
                                >
                                    <Link href={homeHref} prefetch>
                                        <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-9 shrink-0 items-center justify-center rounded-xl">
                                            <AppLogoIcon className="size-5 fill-current text-white dark:text-black" />
                                        </div>
                                        <div className="ml-1 grid min-w-0 flex-1 text-left group-data-[collapsible=icon]:hidden">
                                            <span className="text-sidebar-foreground truncate text-sm font-bold leading-tight">
                                                {brandTitle}
                                            </span>
                                            <span
                                                title={`DOST MIMAROPA · ${roleLabel}`}
                                                className="text-sidebar-foreground/60 flex min-w-0 items-center gap-1 text-[11px] leading-tight"
                                            >
                                                <RoleIcon
                                                    className="size-3 shrink-0"
                                                    aria-hidden
                                                />
                                                <span className="truncate">
                                                    DOST MIMAROPA · {roleLabel}
                                                </span>
                                            </span>
                                        </div>
                                    </Link>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        </SidebarMenu>
                    </SidebarHeader>

                    <SidebarContent className="px-2 pt-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sidebar-border">

                        <NavMain items={items} />
                    </SidebarContent>

                    <SidebarFooter className="gap-1.5 border-t border-sidebar-border/80 px-3 pt-2 pb-3">
                        <div className="group-data-[collapsible=icon]:hidden">
                            {footer ?? <AppearanceToggle />}
                        </div>
                        <div className="border-sidebar-border bg-sidebar-accent/50 rounded-xl border p-1">
                            <NavUser />
                        </div>
                    </SidebarFooter>
                </Sidebar>
            </div>

            <MobileBottomNav items={mobileItems} />
        </>
    );
};

export default CommandSidebar;
