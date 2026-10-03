import { Link } from '@inertiajs/react';
import { ChevronLeft, LogIn, Moon, Sun } from 'lucide-react';
import DostLogo from '@/components/dost-logo';
import { useSeiTheme } from '@/hooks/use-sei-theme';
import { home } from '@/routes';
import { useTheme, type ThemeMode } from '@/theme/ThemeProvider';
import type { AuthLayoutProps } from '@/types';
import artboard from '../../../pic/Artboard.jpg';

const UI = {
    light: {
        wash: 'bg-[linear-gradient(180deg,rgba(244,246,249,0.55)_0%,rgba(219,234,254,0.35)_45%,rgba(244,246,249,0.85)_100%)]',
        ring: 'border-white/70',
        divider: 'bg-[#030A17]/20',
        brand: 'text-[#030A17]',
        brandAccent: 'from-[#0284c7] via-[#2563eb] to-[#1e3a8a]',
        sub: 'text-[#4b5563]',
        chip: 'border-white/70 bg-white/60 text-[#1a1f29] hover:bg-white/85',
        card: 'border-white/80 bg-linear-to-b from-[#DBEAFE]/90 via-white/85 to-white/90 shadow-[0_24px_60px_-12px_rgba(15,31,61,0.28)]',
        iconTile:
            'border-white bg-white text-[#1D4ED8] shadow-[0_8px_20px_-6px_rgba(29,78,216,0.35)]',
        title: 'text-[#030A17]',
        footer: 'text-[#1a1f29]/70',
    },
    dark: {
        wash: 'bg-[linear-gradient(180deg,rgba(3,10,23,0.82)_0%,rgba(3,10,23,0.6)_45%,rgba(3,10,23,0.9)_100%)]',
        ring: 'border-[#60A5FA]/20',
        divider: 'bg-white/25',
        brand: 'text-white',
        brandAccent: 'from-[#BFDBFE] via-[#60A5FA] to-[#3B82F6]',
        sub: 'text-[#a3acbd]',
        chip: 'border-white/15 bg-[#030A17]/50 text-[#f1f1f1] hover:bg-[#030A17]/75',
        card: 'border-white/10 bg-linear-to-b from-[#0B1E4A]/85 via-[#070F1F]/85 to-[#070F1F]/90 shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]',
        iconTile:
            'border-white/10 bg-[#0B1E4A] text-[#93C5FD] shadow-[0_8px_20px_-6px_rgba(96,165,250,0.35)]',
        title: 'text-white',
        footer: 'text-[#cfcfcf]/80',
    },
} satisfies Record<ThemeMode, Record<string, string>>;

const FOCUS =
    'focus-visible:ring-2 focus-visible:ring-[#60A5FA]/70 focus-visible:outline-none';

export default function AuthGlassLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { theme, isDark, setTheme } = useTheme();
    const ui = UI[theme];
    useSeiTheme();

    return (
        <div className="theme-sei font-sei-body relative isolate flex min-h-svh flex-col overflow-hidden">
            <img
                src={artboard}
                alt=""
                aria-hidden
                decoding="async"
                className="absolute inset-0 -z-30 h-full w-full object-cover"
            />
            <div aria-hidden className={`absolute inset-0 -z-20 ${ui.wash}`} />
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 grid place-items-center"
            >
                {[44, 64, 84].map((size) => (
                    <span
                        key={size}
                        style={{ width: `${size}rem`, height: `${size}rem` }}
                        className={`absolute rounded-full border ${ui.ring}`}
                    />
                ))}
            </div>

            <header className="flex items-center justify-between gap-4 px-4 py-4 sm:px-8 sm:py-6">
                <Link
                    href={home()}
                    aria-label="TARA PAMIMAROPA home"
                    className={`flex min-w-0 items-center gap-2.5 rounded-md sm:gap-3.5 ${FOCUS}`}
                >
                    <DostLogo onLight={!isDark} className="h-6 sm:h-9" />
                    <span
                        aria-hidden
                        className={`hidden h-9 w-px shrink-0 sm:block ${ui.divider}`}
                    />
                    <span
                        className={`font-sei-display hidden text-lg leading-none font-extrabold tracking-wide whitespace-nowrap uppercase sm:inline ${ui.brand}`}
                    >
                        TARA{' '}
                        <span
                            className={`bg-linear-to-r bg-clip-text text-transparent ${ui.brandAccent}`}
                        >
                            PAMIMAROPA
                        </span>
                    </span>
                </Link>

                <div className="flex items-center gap-2">
                    <Link
                        href={home()}
                        className={`hidden min-h-10 items-center gap-1 rounded-full border px-3.5 text-sm font-medium backdrop-blur-md transition-colors duration-200 sm:inline-flex ${ui.chip} ${FOCUS}`}
                    >
                        <ChevronLeft className="size-4" aria-hidden />
                        Back to home
                    </Link>
                    <button
                        type="button"
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        aria-label={
                            isDark
                                ? 'Switch to light mode'
                                : 'Switch to dark mode'
                        }
                        className={`grid size-10 cursor-pointer place-items-center rounded-full border backdrop-blur-md transition-colors duration-200 ${ui.chip} ${FOCUS}`}
                    >
                        {isDark ? (
                            <Sun className="size-4" aria-hidden />
                        ) : (
                            <Moon className="size-4" aria-hidden />
                        )}
                    </button>
                </div>
            </header>

            <main className="flex flex-1 items-center justify-center px-4 py-8">
                <div
                    className={`w-full max-w-[26rem] rounded-3xl border p-6 backdrop-blur-xl sm:p-8 ${ui.card}`}
                >
                    <div className="flex flex-col items-center text-center">
                        <span
                            aria-hidden
                            className={`grid size-12 place-items-center rounded-2xl border ${ui.iconTile}`}
                        >
                            <LogIn className="size-5" />
                        </span>
                        <p
                            className={`font-sei-display mt-5 text-xs font-bold tracking-[0.2em] uppercase ${ui.sub}`}
                        >
                            {title}
                        </p>
                        <h1
                            className={`font-sei-display mt-1.5 text-2xl leading-tight font-extrabold tracking-tight uppercase sm:text-[1.75rem] ${ui.title}`}
                        >
                            TARA{' '}
                            <span
                                className={`bg-linear-to-r bg-clip-text text-transparent ${ui.brandAccent}`}
                            >
                                PAMIMAROPA
                            </span>
                        </h1>
                        <p
                            className={`mt-2 max-w-xs text-sm leading-relaxed ${ui.sub}`}
                        >
                            {description}
                        </p>
                    </div>

                    <div className="mt-7">{children}</div>
                </div>
            </main>

            <footer className={`px-4 pb-5 text-center text-xs ${ui.footer}`}>
                &copy; {new Date().getFullYear()} DOST-MIMAROPA · Department of
                Science and Technology
            </footer>
        </div>
    );
}
