import { lazy, Suspense } from 'react';
import { Link } from 'react-router';

import { catalogueNumberOf } from '@/data';
import { useInViewOnce, usePrefersReducedMotion } from '@/hooks';
import { binomialOf } from '@/lib/catalogue';
import type { Species } from '@/types';

import styles from './SpecimenRow.module.css';

/**
 * The thumbnail, split out of the initial bundle.
 *
 * The catalogue is the landing route and is therefore eagerly imported, which
 * made the eighteen plates — 258 kB of path data — a dependency of the entry
 * chunk and put them on the critical path. Lighthouse measured a 4.4 s largest
 * contentful paint on that build, of which **90% was render delay**: the LCP
 * element is the heading paragraph, plain text, and it could not be painted
 * until every byte of every beetle had arrived and been parsed.
 *
 * So the drawings load after the page does. The row's own text — binomial,
 * common name, accession number, order, family, size — is in the entry chunk and
 * paints immediately; the plate arrives a moment later and fades in.
 *
 * Three things make that safe rather than merely faster:
 *
 *   · The frame is a box in its own right. `.plate` is a fixed 4.5rem column
 *     with `aspect-ratio: 3 / 4`, a border and a background, so it occupies its
 *     final size before the drawing exists. Measured CLS on this route is 0,
 *     before and after.
 *   · The plate is `decorative`. The link already carries the binomial and the
 *     common name as text, so nothing a screen reader needs is in the deferred
 *     chunk — this cannot degrade into content that arrives late.
 *   · `fallback={null}`, not a spinner. An empty ruled box for a few hundred
 *     milliseconds is what a plate that has not been drawn yet looks like
 *     anyway; a spinner in eighteen boxes would be worse than the wait.
 *
 * Only the catalogue does this. Every other route that draws a plate is itself
 * lazy, so its plate data already loads with the route rather than ahead of it.
 */
const RowPlate = lazy(() => import('./RowPlate'));

export interface SpecimenRowProps {
  species: Species;
}

/**
 * One species in the catalogue list: its plate, its name, its place.
 *
 * The plate is decorative here. The link already carries the binomial and the
 * common name as text, and a screen reader that read the plate's description as
 * well would hear the animal announced twice for one row.
 */
export function SpecimenRow({ species }: SpecimenRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLLIElement>(reducedMotion);

  return (
    <li ref={ref} className={styles.root}>
      <Link to={`/specimen/${species.id}`} className={styles.link}>
        <span className={styles.plate}>
          <Suspense fallback={null}>
            <RowPlate species={species} animate={seen && !reducedMotion} />
          </Suspense>
        </span>
        <span className={styles.entry}>
          <span className={styles.scientific}>{binomialOf(species)}</span>
          <span className={styles.common}>{species.commonName}</span>
          <span className={styles.meta}>
            <span className={styles.accession}>{catalogueNumberOf(species)}</span>
            <span aria-hidden="true"> · </span>
            {species.taxonomy.order}
            <span aria-hidden="true"> · </span>
            {species.taxonomy.family}
            <span aria-hidden="true"> · </span>
            {species.sizeMm.min}&ndash;{species.sizeMm.max} mm {species.sizeBasis}
          </span>
        </span>
      </Link>
    </li>
  );
}
