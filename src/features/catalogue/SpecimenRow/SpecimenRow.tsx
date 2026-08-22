import { Link } from 'react-router';

import { PlantIllustration } from '@/components/PlantIllustration';
import { useInViewOnce, usePrefersReducedMotion } from '@/hooks';
import { CONSERVATION_STATUS_LABELS, type Specimen } from '@/types';

import styles from './SpecimenRow.module.css';

export interface SpecimenRowProps {
  specimen: Specimen;
}

/**
 * One entry in the catalogue: a ruled row, not a card.
 *
 * The whole row is a single link. Splitting it into a linked name plus a linked
 * thumbnail would put two identical destinations next to each other in the tab
 * order and read them out twice, and it makes the row a smaller target than it
 * looks.
 *
 * The illustration is decorative here because the link's own text already names
 * the plant. Announcing the generated description as well would mean hearing a
 * paragraph about branching habit before reaching the next row.
 *
 * The drawing animates in as the row is scrolled to, once. Under
 * `prefers-reduced-motion` no observer is set up at all — there is nothing to
 * wait for, so the illustration is simply present.
 */
export function SpecimenRow({ specimen }: SpecimenRowProps) {
  const reducedMotion = usePrefersReducedMotion();
  const { ref, seen } = useInViewOnce<HTMLLIElement>(reducedMotion);

  return (
    <li ref={ref} className={styles.root}>
      <Link to={`/specimen/${specimen.id}`} className={styles.link}>
        <span className={styles.plate}>
          <PlantIllustration specimen={specimen} decorative animate={seen && !reducedMotion} />
        </span>

        <span className={styles.entry}>
          <span className={styles.scientific}>{specimen.scientificName}</span>
          <span className={styles.common}>{specimen.commonName}</span>
          <span className={styles.meta}>
            <span className={styles.accession}>{specimen.id}</span>
            <span aria-hidden="true"> · </span>
            {specimen.family}
            <span aria-hidden="true"> · </span>
            {CONSERVATION_STATUS_LABELS[specimen.conservationStatus]}
          </span>
        </span>
      </Link>
    </li>
  );
}
