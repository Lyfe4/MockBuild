import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { Ledger } from '@/components/Ledger';
import { INSTITUTION, REFERENCE_SOURCES, SPECIES } from '@/data';
import { useRouteMeta } from '@/features/meta';
import { binomialOf, ordersOf } from '@/lib/catalogue';
import { routeMeta } from '@/lib/meta';

import styles from './AboutRoute.module.css';

/**
 * About the collection.
 *
 * Written as the institution and honest in content, which is the whole
 * difficulty of the page: the archive is invented, the sixteen animals are not,
 * and a visitor has to be able to tell which sentences are which. So the voice
 * is the archive's in the history and the plates, and drops in *Sources and
 * honesty* — the one section that talks about the site rather than from inside
 * it.
 *
 * Every number on the page is counted out of the collection rather than
 * written down. Sixteen species and six orders are facts about `SPECIES`, and a
 * seventeenth specimen should change this page without anyone editing it.
 */

/** The species record each reference was traced for, by slug. */
const SPECIES_BY_ID = new Map(SPECIES.map((species) => [species.id, species]));

/** Spelled out, because a count in running prose reads better as a word. */
const NUMBER_WORDS: Record<number, string> = {
  1: 'one',
  2: 'two',
  3: 'three',
  4: 'four',
  5: 'five',
  6: 'six',
  7: 'seven',
  8: 'eight',
  9: 'nine',
  10: 'ten',
  11: 'eleven',
  12: 'twelve',
  13: 'thirteen',
  14: 'fourteen',
  15: 'fifteen',
  16: 'sixteen',
};

/** `sixteen`, or `17` once the collection outgrows the words. */
function spell(count: number): string {
  return NUMBER_WORDS[count] ?? String(count);
}

interface FactProps {
  term: string;
  children: ReactNode;
}

function Fact({ term, children }: FactProps) {
  return (
    <div className={styles.fact}>
      <dt className={styles.factTerm}>{term}</dt>
      <dd className={styles.factValue}>{children}</dd>
    </div>
  );
}

export function AboutRoute() {
  useRouteMeta(
    routeMeta({
      title: 'About the collection',
      description:
        'What is real here and what is not: the institution is invented, the species, the ' +
        'records and the traced references are not. Every source is credited in full.',
      path: '/about',
    }),
  );

  const orders = ordersOf(SPECIES);
  const specimens = SPECIES.length;

  return (
    <Ledger
      // One short list of counts and hours: it fits any window, so it is a
      // margin that can honestly be pinned. See `LedgerProps.sticky`.
      sticky
      // The margin is labelled with `aria-label` and titled with a `<p>`, not
      // an `<h2>`. The ledger puts the margin ahead of the body in the DOM —
      // which is what makes the reading order and the visual order agree at
      // every width — so a heading here would be an h2 before the page's h1.
      // The region still has a name, which is what a screen reader navigates by.
      margin={
        <aside className={styles.facts} aria-label="At a glance">
          <p className={styles.factsHeading}>At a glance</p>
          <dl className={styles.factList}>
            <Fact term="Specimens">{specimens} catalogued</Fact>
            <Fact term="Orders">
              {orders.length} &mdash; {orders.join(', ')}
            </Fact>
            <Fact term="Founded">{INSTITUTION.founded}</Fact>
            <Fact term="Reading room">
              {INSTITUTION.readingRoom.days}
              <br />
              {INSTITUTION.readingRoom.hours}
              <br />
              <span className={styles.factNote}>{INSTITUTION.readingRoom.note}</span>
            </Fact>
            <Fact term="Enquiries">
              <Link to="/request">Request material</Link>
            </Fact>
          </dl>
        </aside>
      }
    >
      <article className={styles.sheet}>
        <header className={styles.header}>
          <p className={styles.eyebrow}>The archive</p>
          <h1 className={styles.title} tabIndex={-1}>
            About the collection
          </h1>
          <p className={styles.standfirst}>
            A small reference collection of {spell(specimens)} insects, drawn by hand and catalogued
            in the order it arrived.
          </p>
        </header>

        <section className={styles.section} aria-labelledby="history-heading">
          <h2 className={styles.sectionHeading} id="history-heading">
            A short history
          </h2>
          <p className={styles.paragraph}>
            Thornfield opened in {INSTITUTION.founded} as the reading room of a subscription society
            in {INSTITUTION.town}: two rooms above a seed merchant, a cabinet of local insects, and
            a house rule that nothing entered the collection without a written record of where it
            came from. The society kept the rule better than it kept the cabinet. When it wound up
            in 1931 the specimens were in poor order and the ledgers were immaculate, and it is the
            ledgers the archive is named for.
          </p>
          <p className={styles.paragraph}>
            The collection has been re-catalogued twice since, in 1954 and again in 2019. Both times
            the accession numbers were left exactly where they were: a number records when a thing
            arrived, and renumbering it to tidy the sequence would throw away the one fact it
            carries. So the catalogue reads in accession order by default, and a specimen&rsquo;s
            place in it has nothing to do with its name.
          </p>
          <p className={styles.paragraph}>
            It is a small collection on purpose. Every record is written from published sources and
            every plate is drawn by hand, so it grows at the speed of the drawing rather than the
            speed of the cabinet &mdash; {spell(specimens)} specimens across {spell(orders.length)}{' '}
            orders, and no plans for a seventeenth until the {spell(specimens)}th is right.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="plates-heading">
          <h2 className={styles.sectionHeading} id="plates-heading">
            The plates
          </h2>
          <p className={styles.paragraph}>
            Every illustration in the archive is a drawing rather than a photograph, and every one
            is traced by hand from a published figure whose copyright has expired &mdash; a
            lithograph from Calwer&rsquo;s <cite>K&auml;ferbuch</cite>, a plate from Lucas on the
            British dragonflies. What is taken from the reference is the silhouette, the proportions
            and the arrangement of the limbs. What is left behind is everything that makes a
            lithograph a lithograph: the stipple, the highlights, the colour.
          </p>
          <p className={styles.paragraph}>
            The measuring is the work. A draughtsman reads points off the reference &mdash; the
            margin of an elytron, the length of a femur, where a spot sits &mdash; and those points
            are what the archive keeps. The drawing is then built from them, so a plate can be
            rebuilt from the measurements at any time and no line exists that nobody measured. A
            plate that has been touched up by hand instead of remeasured fails a check before it can
            be filed.
          </p>
          <p className={styles.paragraph}>
            Only the right half of each animal is drawn. The other half is the same half reflected,
            which is both what the animal is and the reason a plate cannot come out lopsided. Once a
            drawing is filed it is checked against its order: a beetle with no antennae is a mistake
            every time, a spread-wing butterfly showing no legs is not, and an ant with no wings is
            simply an ant.
          </p>
          <p className={styles.paragraph}>
            Nothing is drawn in ink of a fixed colour. Each plate carries a pigment number rather
            than a pigment, and the season the archive is dressed in decides what that resolves to
            &mdash; so the same drawing is inked in four palettes across the year and the animal is
            never repainted. You can change the season at the top of any page.
          </p>
        </section>

        <section className={styles.section} aria-labelledby="honesty-heading">
          <h2 className={styles.sectionHeading} id="honesty-heading">
            Sources and honesty
          </h2>
          <p className={styles.paragraph}>
            <strong>The institution is fictional.</strong> There is no archive in {INSTITUTION.town}
            , no reading room, no cabinets and no staff. The founding date, the society, the two
            re-cataloguings and the hours in the margin are invented, and this site is a portfolio
            piece. Nothing is collected from a visitor: no accounts, no analytics, no trackers, and
            the one form here sends nothing anywhere.
          </p>
          <p className={styles.paragraph}>
            <strong>The animals are real.</strong> All {spell(specimens)} are described species, and
            every claim on a specimen sheet &mdash; the taxonomy, the size range, the distribution,
            the months adults are on the wing, and the characters the identification key filters on
            &mdash; is taken from published sources cited on that sheet. Where the record and the
            drawing disagree, the record is right and the drawing is the thing to fix.
          </p>
          <p className={styles.paragraph}>
            Two honest awkwardnesses, said out loud rather than smoothed over. The seasons here are
            Southern Hemisphere seasons and the records are not: every set of flight months was
            observed in Europe, so a stag beetle flying May to August comes out as autumn and winter
            in this catalogue. And one reference is a substitution &mdash; the blue mint beetle
            stands where an Australian Christmas beetle was meant to be, because no public-domain
            figure of one exists.
          </p>
          <p className={styles.paragraph}>
            The credits below are generated from the same records as{' '}
            <code>references/SOURCES.md</code> in the repository, which is where the long form of
            each entry lives &mdash; the file it was traced from, the licence tag the source page
            carries, and why that figure was chosen over a better photograph. A check fails if the
            two ever disagree.
          </p>

          <h3 className={styles.creditsHeading} id="credits-heading">
            What the plates were traced from
          </h3>
          <ul className={styles.credits} role="list" aria-labelledby="credits-heading">
            {REFERENCE_SOURCES.map((source) => {
              const species = SPECIES_BY_ID.get(source.species);

              return (
                <li key={source.species} className={styles.credit}>
                  <p className={styles.creditWork}>
                    <cite>{source.work}</cite>
                    {source.figure === undefined ? '' : `, ${source.figure.toLowerCase()}`}
                  </p>
                  <p className={styles.creditMeta}>
                    {source.artist}, {source.year} &middot; {source.licence}
                  </p>
                  <p className={styles.creditUse}>
                    {species === undefined ? (
                      source.heading
                    ) : (
                      <>
                        Traced for{' '}
                        <Link to={`/specimen/${species.id}`}>
                          <i>{binomialOf(species)}</i>
                        </Link>
                      </>
                    )}{' '}
                    &middot;{' '}
                    {/*
                      `rel="noopener noreferrer"` on every outbound link, as
                      everywhere else: noopener so a new tab gets no handle on
                      this window, noreferrer because which page somebody was
                      reading is nobody else's business.
                    */}
                    <a
                      className={styles.creditLink}
                      href={source.sourcePage}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Source page
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        </section>
      </article>
    </Ledger>
  );
}
