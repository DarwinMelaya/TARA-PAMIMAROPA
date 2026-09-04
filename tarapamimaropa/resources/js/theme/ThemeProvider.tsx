import {
    useAppearance,
    type Appearance,
    type ResolvedAppearance,
} from '@/hooks/use-appearance';

export type ThemeMode = ResolvedAppearance;

export type UseThemeReturn = {
    theme: ThemeMode;
    isDark: boolean;
    appearance: Appearance;
    setTheme: (mode: Appearance) => void;
};

/** Thin adapter over Laravel starter `useAppearance` for public UI tokens. */
export function useTheme(): UseThemeReturn {
    const { appearance, resolvedAppearance, updateAppearance } =
        useAppearance();

    return {
        theme: resolvedAppearance,
        isDark: resolvedAppearance === 'dark',
        appearance,
        setTheme: updateAppearance,
    };
}
