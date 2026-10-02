import { Link } from '@inertiajs/react';
import { ArrowUpRight, ChevronLeft, Moon, Sun } from 'lucide-react';
import { useAppearance } from '@/hooks/use-appearance';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const BRAND = 'TARA PAMIMAROPA';

export default function AuthSplitLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <div className="bg-background relative flex min-h-svh">
            <div className="flex w-full flex-col px-6 py-8 sm:px-10 lg:w-1/2 lg:px-16 xl:px-24">
                <Link
                    href={home()}
                    className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 rounded-md text-sm transition-colors focus-visible:ring-2 focus-visible:ring-[#4318FF] focus-visible:outline-none"
                >
                    <ChevronLeft className="size-4" aria-hidden="true" />
                    Back to home
                </Link>

                <main className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-12">
                    <div className="mb-8 flex items-center gap-3 lg:hidden">
                        <span
                            className="grid size-10 place-items-center rounded-xl bg-[#4318FF] text-lg font-black text-white"
                            aria-hidden="true"
                        >
                            T
                        </span>
                        <span className="font-black tracking-tight text-[#1B2559] dark:text-white">
                            {BRAND}
                        </span>
                    </div>

                    <h1 className="text-3xl font-bold tracking-tight text-[#1B2559] sm:text-4xl dark:text-white">
                        {title}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                        {description}
                    </p>

                    <div className="mt-8">{children}</div>
                </main>

                <footer className="text-muted-foreground text-xs">
                    &copy; {new Date().getFullYear()} DOST-MIMAROPA · All
                    rights reserved · Powered by {BRAND}
                </footer>
            </div>

            <aside className="relative hidden overflow-hidden rounded-bl-[180px] bg-linear-to-br from-[#868CFF] via-[#4318FF] to-[#2111A5] lg:flex lg:w-1/2 lg:flex-col xl:rounded-bl-[220px]">
                <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                >
                    <div className="absolute -top-32 -left-24 size-[480px] rounded-full bg-fuchsia-300/50 blur-3xl" />
                    <div className="absolute top-1/3 -right-40 size-[520px] rounded-full bg-sky-400/40 blur-3xl" />
                    <div className="absolute -bottom-40 left-1/4 size-[420px] rounded-full bg-indigo-900/60 blur-3xl" />
                    <div className="absolute top-0 left-0 h-48 w-[140%] -translate-x-[10%] -rotate-12 bg-white/15 blur-2xl" />
                </div>

                <div className="relative z-10 flex flex-1 flex-col items-center justify-center gap-10 px-10 text-white">
                    <div className="flex flex-col items-center gap-6">
                        <div
                            className="grid size-40 place-items-center rounded-full bg-white text-7xl font-black text-[#4318FF] shadow-2xl shadow-indigo-950/30 xl:size-48 xl:text-8xl"
                            aria-hidden="true"
                        >
                            T
                        </div>
                        <div className="text-center">
                            <p className="text-4xl font-black tracking-tight xl:text-5xl">
                                {BRAND}
                            </p>
                            <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/85">
                                Tracking of Accomplishments and Results of
                                Activities and Programs across MIMAROPA
                            </p>
                        </div>
                    </div>

                    <Link
                        href={home()}
                        className="group w-full max-w-sm rounded-3xl border border-white/30 bg-white/10 px-8 py-6 text-center backdrop-blur-md transition-colors hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                    >
                        <p className="text-sm text-white/85">
                            A transparency initiative of DOST-MIMAROPA
                        </p>
                        <p className="mt-1 inline-flex items-center gap-1.5 text-2xl font-bold">
                            View public portal
                            <ArrowUpRight
                                className="size-5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                                aria-hidden="true"
                            />
                        </p>
                    </Link>
                </div>
            </aside>

            <button
                type="button"
                onClick={() => updateAppearance(isDark ? 'light' : 'dark')}
                aria-label={
                    isDark ? 'Switch to light mode' : 'Switch to dark mode'
                }
                className="fixed right-6 bottom-6 z-20 flex size-12 items-center justify-center rounded-full bg-linear-to-br from-[#868CFF] to-[#4318FF] text-white shadow-lg shadow-indigo-900/30 transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#4318FF] focus-visible:outline-none"
            >
                {isDark ? (
                    <Sun className="size-5" aria-hidden="true" />
                ) : (
                    <Moon className="size-5" aria-hidden="true" />
                )}
            </button>
        </div>
    );
}
