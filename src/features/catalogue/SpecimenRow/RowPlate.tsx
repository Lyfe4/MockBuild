import { SpeciesIllustration } from '@/components/SpeciesIllustration';
import { findPlate } from '@/data/species/plates';
import type { Species } from '@/types';

export interface RowPlateProps {
  species: Species;
  animate: boolean;
}

/**
 * The thumbnail in one catalogue row, in a module of its own so it can be split
 * out of the initial bundle.
 *
 * `SpecimenRow` loads this lazily, and the whole reason is on the other side —
 * see the comment above the `lazy()` call there. This file exists to be the
 * dynamic-import boundary and holds no logic beyond resolving the plate for a
 * species and declining to draw a row for one that has none.
 */
/* eslint-disable-next-line no-restricted-syntax -- React.lazy resolves a
   module's default export, and this file exists only to be its target. */
export default function RowPlate({ species, animate }: RowPlateProps) {
  const plate = findPlate(species.id);

  // A species with no plate drawn yet renders the row without one rather than
  // with a placeholder. The collection is meant to grow record-first.
  if (plate === undefined) return null;

  return <SpeciesIllustration species={species} plate={plate} decorative animate={animate} />;
}
