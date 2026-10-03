import { useEffect } from 'react';

/** Applies the public-portal palette and fonts to body so portaled dialogs and menus match. */
export function useSeiTheme() {
    useEffect(() => {
        document.body.classList.add('theme-sei');

        return () => {
            document.body.classList.remove('theme-sei');
        };
    }, []);
}
