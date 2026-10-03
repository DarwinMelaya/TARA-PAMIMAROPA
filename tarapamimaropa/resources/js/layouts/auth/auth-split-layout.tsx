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
import { useSeiTheme } from '@/hooks/use-sei-theme';
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
        className={`font-sei-display grid size-9 shrink-0 place-items-center rounded-lg bg-linear-to-br from-[#BFDBFE] via-[#60A5FA] to-[#1D4ED8] text-sm font-extrabold text-[#030A17] ${className}`}
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
    useSeiTheme();

    return (
        <div className="theme-sei bg-background text-foreground flex min-h-svh">
            <div className="flex w-full flex-col px-6 py-6 sm:px-10 lg:w-[52%] lg:px-14 xl:px-20">
                <header className="flex items-center justify-between gap-4">
                    <Link
                        href={home()}
                        className="focus-visible:ring-ring/50 flex items-center gap-2.5 rounded-md focus-visible:ring-2 focus-visible:outline-none"
                    >
                        <BrandMark />
                        <span className="leading-tight">
                            <span className="font-sei-display block text-sm font-extrabold tracking-wide uppercase">
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
                            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 hidden min-h-9 items-center gap-1 rounded-md px-2.5 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none sm:inline-flex"
                        >
                            <ChevronLeft
                                className="size-4"
                                aria-hidden="true"
                            />
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
                            className="text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-ring/50 inline-flex size-9 cursor-pointer items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none"
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
                    <h1 className="font-sei-display text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
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

            <aside className="relative isolate hidden overflow-hidden bg-[#030A17] text-[#f1f1f1] lg:flex lg:w-[48%] lg:flex-col dark:border-l dark:border-white/10">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -top-64 -right-64 -z-10 h-[48rem] w-[48rem] bg-[radial-gradient(circle,_#0B1E4A_0%,_transparent_60%)] opacity-90"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute -bottom-72 -left-72 -z-10 h-[48rem] w-[48rem] bg-[radial-gradient(circle,_#3D5D94_0%,_transparent_60%)] opacity-30"
                />
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,white_1px,transparent_1px),linear-gradient(to_bottom,white_1px,transparent_1px)] [background-size:48px_48px] opacity-[0.05]"
                />

                <div className="relative flex flex-1 flex-col justify-between px-12 py-12 xl:px-16">
                    <p className="text-xs font-medium tracking-[0.22em] text-[#93C5FD] uppercase">
                        Department of Science and Technology · MIMAROPA
                    </p>

                    <div className="max-w-md">
                        <h2 className="font-sei-display text-3xl leading-tight font-extrabold tracking-tight uppercase xl:text-5xl">
                            <span className="bg-linear-to-r from-[#BFDBFE] via-[#60A5FA] to-[#1D4ED8] bg-clip-text text-transparent">
                                Tracking
                            </span>{' '}
                            <span className="font-sei-title font-medium">
                                accomplishments across MIMAROPA
                            </span>
                        </h2>
                        <p className="mt-4 text-sm leading-relaxed tracking-wide text-[#cfcfcf] uppercase">
                            Tracking of Accomplishments and Results of
                            Activities and Programs. One workspace for PSTO and
                            regional teams.
                        </p>

                        <ul className="mt-10 space-y-5">
                            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
                                <li key={title} className="flex gap-3.5">
                                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#60A5FA]/15 text-[#93C5FD] ring-1 ring-[#60A5FA]/30">
                                        <Icon
                                            className="size-4"
                                            aria-hidden="true"
                                        />
                                    </span>
                                    <span>
                                        <span className="block text-sm font-semibold">
                                            {title}
                                        </span>
                                        <span className="mt-0.5 block text-sm text-[#cfcfcf]">
                                            {text}
                                        </span>
                                    </span>
                                </li>
                            ))}
                        </ul>

                        <Link
                            href={home()}
                            className="mt-10 inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#60A5FA]/40 bg-[#1D4ED8] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#2563EB] focus-visible:ring-2 focus-visible:ring-[#93C5FD] focus-visible:ring-offset-2 focus-visible:ring-offset-[#030A17] focus-visible:outline-none"
                        >
                            View public portal
                            <ArrowUpRight
                                className="size-4"
                                aria-hidden="true"
                            />
                        </Link>
                    </div>

                    <p className="text-xs leading-relaxed tracking-[0.2em] text-[#cfcfcf]/80 uppercase">
                        {PROVINCES.join(' · ')}
                    </p>
                </div>
            </aside>
        </div>
    );
}
