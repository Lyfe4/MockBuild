import { Link } from 'react-router';

import styles from './SiteFooter.module.css';

/**
 * The colophon.
 *
 * Three ruled columns in mono, and a plain statement that none of this is real.
 * A fictional institution that does not say so is a different kind of object
 * from a portfolio piece, and the disclosure belongs somewhere permanent rather
 * than in an about page nobody opens.
 */
export function SiteFooter() {
  return (
    <footer className={styles.root}>
      <div className={styles.inner}>
        <div className={styles.columns}>
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
              <li>Reading room, Tuesday to Friday</li>
              <li>10.00 &ndash; 16.00</li>
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
        </div>

        <p className={styles.disclaimer}>
          Thornfield Botanical Archive is fictional. Every specimen, collector and locality on this
          site is invented, and each illustration is generated procedurally from the record beside
          it &mdash; no plant shown here has ever been drawn from life.
        </p>
      </div>
    </footer>
  );
}
