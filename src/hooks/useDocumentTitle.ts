import { useEffect } from 'react';

const SITE_NAME = 'Thornfield Entomological Archive';

/**
 * Sets the document title for the current route.
 *
 * A single-page app never reloads, so nothing updates `<title>` on its own.
 * That matters beyond the browser tab: the title is what a screen reader
 * announces after a navigation, and what a bookmark or a shared link is named.
 *
 * @param title The page's own name. The archive's name is appended.
 */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    document.title = title === '' ? SITE_NAME : `${title} · ${SITE_NAME}`;
  }, [title]);
}
