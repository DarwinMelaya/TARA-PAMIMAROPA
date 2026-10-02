import { Link } from '@inertiajs/react';
import {
    ArrowUpRight,
    BarChart3,
    ChevronLeft,
    FolderKanban,
    Globe2,
    Moon,
    Sun,
} from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const BRAND = 'TARA PAMIMAROPA';

const PROVINCES = [
    'Occidental Mindoro',
    'Oriental Mindoro',
    'Marinduque',
    'Romblon',
    'Palawan',
];

const HIGHLIGHTS = [
    {
        icon: FolderKanban,
        title: 'Project monitoring',
        text: 'Keep every provincial project, budget, and status in one record.',
    },
    {
        icon: BarChart3,
        title: 'Summary graphs',
        text: 'See results per province, municipality, and barangay.',
    },
    {
        icon: Globe2,
        title: 'Public transparency',
        text: 'Share accomplishments with the public through the portal.',
    },
];

const BrandMark = ({ className = '' }: { className?: string }) => (
    <span
        aria-hidden="true"
        className={`grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground text-sm font-bold ${className}`}
    >
        T
    </span>
);

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="bg-background text-foreground flex min-h-svh">
            <div className="flex w-full flex-col px-6 py-6 sm:px-10 lg:w-[52%] lg:px-14 xl:px-20">
                <header className="flex items-center justify-between gap-4">
                    <Link
                        href={home()}
                        className="flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                    >
                        <BrandMark />
                        <span className="leading-tight">
                            <span className="block text-sm font-semibold tracking-tight">
                                {BRAND}
                            </span>
                            <span className="text-muted-foreground block text-xs">
                                DOST-MIMAROPA
                            </span>
                        </span>
                    </Link>

                    <div className="flex items-center gap-1">
                        <Link
                            href={home()}
                            className="text-muted-foreground hover:text-foreground hover:bg-muted hidden min-h-9 items-center gap-1 rounded-md px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none sm:inline-flex"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                            Back to home
                        </Link>
                        <button
                            type="button"
                            onClick={() =>
                                updateAppearance(isDark ? 'light' : 'dark')
                            }
                            aria-label={
                                isDark
                                    ? 'Switch to light mode'
                                    : 'Switch to dark mode'
                            }
                            className="text-muted-foreground hover:text-foreground hover:bg-muted inline-flex size-9 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                            {isDark ? (
                                <Sun className="size-4" aria-hidden="true" />
                            ) : (
                                <Moon className="size-4" aria-hidden="true" />
                            )}
                        </button>
                    </div>
                </header>

                <main className="mx-auto flex w-full max-w-[400px] flex-1 flex-col justify-center py-12">
                    <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {description}
                    </p>

                    <div className="mt-8">{children}</div>
                </main>

                <footer className="text-muted-foreground flex flex-col gap-1 text-xs sm:flex-row sm:justify-between">
                    <span>
                        &copy; {new Date().getFullYear()} DOST-MIMAROPA. All
                        rights reserved.
                    </span>
                    <span>Department of Science and Technology</span>
                </footer>
            </div>

            <aside className="relative hidden overflow-hidden bg-neutral-950 text-white lg:flex lg:w-[48%] lg:flex-col dark:border-l dark:border-white/10 dark:bg-neutral-900">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 opacity-[0.05] [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px]"
                />

                <div className="relative flex flex-1 flex-col justify-between px-12 py-12 xl:px-16">
                    <p className="text-xs font-medium tracking-[0.14em] text-white/70 uppercase">
                        Department of Science and Technology · MIMAROPA
                    </p>

                    <div className="max-w-md">
                        <h2 className="text-3xl leading-tight font-semibold tracking-tight xl:text-4xl">
                            Tracking accomplishments across MIMAROPA.
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed text-white/80">
                            Tracking of Accomplishments and Results of
                            Activities and Programs. One workspace for PSTO and
                            regional teams.
                        </p>

                        <ul className="mt-10 space-y-5">
                            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                                <li key={title} className="flex gap-3.5">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10 ring-1 ring-white/15">
                                        <Icon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {title}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-white/75">
                                            {text}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            href={home()}
                            className="mt-10 inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-white px-4 text-sm font-semibold text-neutral-950 transition-colors hover:bg-white/90 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 focus-visible:outline-none"
                        >
                            View public portal
                            <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                    </div>

                    <p className="text-xs leading-relaxed text-white/60">
                        {PROVINCES.join(' · ')}
                    </p>
                </div>
            </aside>
        </div>
    );
}
