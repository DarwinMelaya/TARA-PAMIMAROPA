import { HiMoon, HiSun } from 'react-icons/hi2';
import { useTheme } from './ThemeProvider';

type ThemeToggleProps = {
    className?: string;
    /** Compact icon-only control for dense toolbars. */
    compact?: boolean;
};

const ThemeToggle = ({ className = '', compact = false }: ThemeToggleProps) => {
    const { isDark, setTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={[
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2',
                isDark
                    ? 'border-slate-700 bg-slate-900/95 text-slate-200 backdrop-blur-md hover:border-blue-400 hover:text-white focus-visible:ring-blue-400/60'
                    : 'border-[#c5cdd8] bg-white text-slate-700 shadow-sm hover:border-[#0038a8] hover:text-[#0038a8] focus-visible:ring-[#0038a8]/40',
                compact ? 'px-2.5' : 'px-3',
                className,
            ].join(' ')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            {isDark ? (
                <HiSun className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
                <HiMoon className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {!compact ? (
                <span className="hidden sm:inline">
                    {isDark ? 'Light' : 'Dark'}
                </span>
            ) : null}
        </button>
    );
};

export default ThemeToggle;
