import { HiMoon, HiSun } from 'react-icons/hi2';
import { useTheme } from './ThemeProvider';

const ThemeToggle = () => {
    const { isDark, setTheme } = useTheme();

    return (
        <button
            type="button"
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-600/60 bg-slate-900/90 p-2 text-slate-200 backdrop-blur-md transition duration-[180ms] hover:border-blue-500/40"
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
            {isDark ? (
                <HiSun className="h-4 w-4 text-amber-200" aria-hidden />
            ) : (
                <HiMoon className="h-4 w-4 text-blue-100" aria-hidden />
            )}
        </button>
    );
};

export default ThemeToggle;
