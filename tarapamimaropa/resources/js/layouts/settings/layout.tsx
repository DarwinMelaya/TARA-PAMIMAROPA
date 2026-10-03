import { Link } from '@inertiajs/react';
import type { PropsWithChildren } from 'react';
import { useCurrentUrl } from '@/hooks/use-current-url';
import { useSeiTheme } from '@/hooks/use-sei-theme';
import { cn, toUrl } from '@/lib/utils';
import { edit as editAppearance } from '@/routes/appearance';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { NavItem } from '@/types';

const sidebarNavItems: NavItem[] = [
    {
        title: 'Profile',
        href: edit(),
        icon: null,
    },
    {
        title: 'Security',
        href: editSecurity(),
        icon: null,
    },
    {
        title: 'Appearance',
        href: editAppearance(),
        icon: null,
    },
];

export default function SettingsLayout({ children }: PropsWithChildren) {
    const { isCurrentOrParentUrl } = useCurrentUrl();
    useSeiTheme();

    return (
        <div className="theme-sei bg-background text-foreground relative isolate min-h-full overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
            <div
                aria-hidden
                className="pointer-events-none absolute -top-64 -right-64 -z-10 hidden h-[44rem] w-[44rem] bg-[radial-gradient(circle,_#0B1E4A_0%,_transparent_60%)] opacity-80 dark:block"
            />

            <header className="mb-8">
                <p className="text-primary text-xs font-medium tracking-[0.22em] uppercase">
                    Account
                </p>
                <h2 className="font-sei-display mt-2 text-3xl leading-tight font-extrabold tracking-tight uppercase sm:text-4xl">
                    <span className="text-sei-gradient">Settings</span>
                </h2>
                <p className="text-muted-foreground mt-2 text-sm">
                    Manage your profile and account settings
                </p>
            </header>

            <div className="flex flex-col gap-6 lg:flex-row lg:gap-10">
                <aside className="w-full lg:w-52 lg:shrink-0">
                    <nav
                        className="bg-card flex gap-1 overflow-x-auto rounded-2xl border p-1.5 lg:flex-col"
                        aria-label="Settings"
                    >
                        {sidebarNavItems.map((item, index) => {
                            const active = isCurrentOrParentUrl(item.href);
                            return (
                                <Link
                                    key={`${toUrl(item.href)}-${index}`}
                                    href={item.href}
                                    aria-current={active ? 'page' : undefined}
                                    className={cn(
                                        'focus-visible:ring-ring/60 inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-medium transition-colors duration-150 focus-visible:ring-2 focus-visible:outline-none',
                                        active
                                            ? 'bg-primary text-primary-foreground font-semibold'
                                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                                    )}
                                >
                                    {item.icon && (
                                        <item.icon
                                            className="h-4 w-4"
                                            aria-hidden
                                        />
                                    )}
                                    {item.title}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <div className="min-w-0 flex-1 md:max-w-2xl">
                    <section className="space-y-8">{children}</section>
                </div>
            </div>
        </div>
    );
}
