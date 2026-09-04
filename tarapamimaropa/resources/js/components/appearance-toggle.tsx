import { Moon, Sun } from 'lucide-react';
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useAppearance } from '@/hooks/use-appearance';

/**
 * Sidebar dark/light switch — updates document theme via useAppearance
 * so every page sharing the app shell follows the choice.
 */
export default function AppearanceToggle() {
    const { resolvedAppearance, updateAppearance } = useAppearance();
    const isDark = resolvedAppearance === 'dark';

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <SidebarMenuButton
                    type="button"
                    tooltip={isDark ? 'Light mode' : 'Dark mode'}
                    onClick={() =>
                        updateAppearance(isDark ? 'light' : 'dark')
                    }
                >
                    {isDark ? <Sun /> : <Moon />}
                    <span>{isDark ? 'Light mode' : 'Dark mode'}</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
        </SidebarMenu>
    );
}
