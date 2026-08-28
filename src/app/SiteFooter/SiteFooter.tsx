import { Link } from 'react-router';

import { INSTITUTION } from '@/data';
import { cx } from '@/lib/classNames';
import pageGrid from '@/styles/pageGrid.module.css';

import styles from './SiteFooter.module.css';

/**
 * The colophon.
 *
 * Three ruled columns in mono, and a plain statement that none of this is real.
 * A fictional institution that does not say so is a different kind of object
 * from a portfolio piece, and the disclosure belongs somewhere permanent rather
 * than in an about page nobody opens.
 *
 * The three sections are children of the page grid itself rather than of a
 * wrapper with a grid of its own. A wrapper would have had to be a subgrid to
 * stay on the shared lines, and a subgrid that spans every column and divides
 * it in three is the same thing as three items spanning four columns each —
 * with one more element in the way.
 */
export function SiteFooter() {
  return (
    <footer className={styles.root}>
      <div className={cx(pageGrid.page, styles.inner)}>
        <section className={styles.column}>
          <h2 className={styles.heading}>Archive</h2>
          <ul className={styles.list} role="list">
            <li>
              <Link className={styles.link} to="/catalogue">
                Catalogue
              </Link>
            </li>
            <li>
              <Link className={styles.link} to="/about">
                About the collection
              </Link>
            </li>
            <li>
              <Link className={styles.link} to="/journal">
                Journal
              </Link>
            </li>
          </ul>
        </section>

        <section className={styles.column}>
          <h2 className={styles.heading}>Visit</h2>
          <ul className={styles.list} role="list">
            <li>Reading room, {INSTITUTION.readingRoom.days}</li>
            <li>{INSTITUTION.readingRoom.hours}</li>
            <li>
              <Link className={styles.link} to="/request">
                Request material
              </Link>
            </li>
          </ul>
        </section>

        <section className={styles.column}>
          <h2 className={styles.heading}>Colophon</h2>
          <ul className={styles.list} role="list">
            <li>Fraunces &amp; JetBrains Mono</li>
            <li>Set in four seasonal palettes</li>
            <li>No trackers, no analytics</li>
          </ul>
        </section>

        <p className={styles.disclaimer}>
          Thornfield Entomological Archive is fictional and holds nothing. The species are real:
          each record is drawn from published sources and cited, and each plate is traced by hand
          from a public-domain reference &mdash; nothing here has been drawn from life.
        </p>
      </div>
    </footer>
  );
}
