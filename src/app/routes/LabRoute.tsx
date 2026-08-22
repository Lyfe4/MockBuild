import { PlantIllustration } from '@/components/PlantIllustration';
import { SPECIMENS } from '@/data';
import { useDocumentTitle } from '@/hooks';

import styles from './LabRoute.module.css';

/**
 * TEMPORARY — generator contact sheet.
 *
 * Draws every specimen at once so the generator output can be eyeballed as a
 * set: whether the leaf shapes read as different, whether anything overflows
 * its frame, whether the whole sheet hangs together at a glance.
 *
 * Not linked from anywhere and only mounted when `import.meta.env.DEV` is true
 * (see `app/router.tsx`), so it never reaches a production bundle. Delete this
 * file, its stylesheet and the router branch once the catalogue view exists.
 */
export function LabRoute() {
  useDocumentTitle('Generator lab');

  return (
    <section>
      <h1>Generator lab</h1>
      <p>
        All {SPECIMENS.length} specimens, drawn from their stored form parameters and seeded from
        their catalogue numbers. Development only.
      </p>

      <ul className={styles.grid}>
        {SPECIMENS.map((specimen) => (
          <li key={specimen.id}>
            <figure className={styles.card}>
              <div className={styles.figure}>
                {/* Decorative here: the caption already names the plant, so
                    announcing it twice would only slow a screen reader down. */}
                <PlantIllustration specimen={specimen} className={styles.illustration} decorative />
              </div>

              <figcaption className={styles.caption}>
                <div className={styles.name}>{specimen.scientificName}</div>
                <div>{specimen.commonName}</div>
                <div className={styles.meta}>{specimen.id}</div>

                {/* The parameters that most decide what the drawing looks
                    like, so a shape on screen can be traced back to the form
                    that produced it. */}
                <dl className={styles.params}>
                  <dt>habit</dt>
                  <dd>{specimen.form.habit}</dd>
                  <dt>leaf</dt>
                  <dd>{specimen.form.leafShape}</dd>
                  <dt>flower</dt>
                  <dd>{specimen.form.flowerType}</dd>
                  <dt>roots</dt>
                  <dd>{specimen.form.roots ? 'yes' : 'no'}</dd>
                </dl>
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>
    </section>
  );
}
