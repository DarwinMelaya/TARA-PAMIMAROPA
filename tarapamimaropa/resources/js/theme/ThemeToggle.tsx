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
                'inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition duration-[180ms]',
                'border-slate-600/60 bg-slate-900/90 text-slate-200 backdrop-blur-md hover:border-amber-400/50 hover:text-amber-100',
                compact ? 'px-2.5' : '',
                className,
            ].join(' ')}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-pressed={isDark}
            title={isDark ? 'Light mode' : 'Dark mode'}
        >
            {isDark ? (
                <HiSun className="h-4 w-4 shrink-0 text-amber-200" aria-hidden />
            ) : (
                <HiMoon className="h-4 w-4 shrink-0 text-blue-100" aria-hidden />
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
