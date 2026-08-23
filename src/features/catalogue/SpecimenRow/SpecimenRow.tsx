import { Link } from 'react-router';

import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { catalogueNumberOf, findPlate } from '@/data';
import { useInViewOnce, usePrefersReducedMotion } from '@/hooks';
import { binomialOf } from '@/lib/catalogue';
import type { Species } from '@/types';

import styles from './SpecimenRow.module.css';

export interface SpecimenRowProps {
  species: Species;
}

/**
 * One species in the catalogue list: its plate, its name, its place.
 *
 * The plate is decorative here. The link already carries the binomial and the
 * common name as text, and a screen reader that read the plate's description as
 * well would hear the animal announced twice for one row.
 *
 * A species with no plate drawn yet renders the row without one rather than
 * with a placeholder. The collection is meant to grow record-first.
 */
export function SpecimenRow({ species }: SpecimenRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLLIElement>(reducedMotion);
  const plate = findPlate(species.id);

  return (
    <li ref={ref} className={styles.root}>
      <Link to={`/specimen/${species.id}`} className={styles.link}>
        <span className={styles.plate}>
          {plate !== undefined && (
            <SpeciesIllustration
              species={species}
              plate={plate}
              decorative
              animate={seen && !reducedMotion}
            />
          )}
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
