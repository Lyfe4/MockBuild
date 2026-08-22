import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/test/renderWithProviders';

import { InsectLabRoute } from './InsectLabRoute';

/**
 * The contact sheet is a dev-only instrument, but it is the instrument the
 * generators are judged with — so what it *reports* has to be right. A trait
 * line that silently stopped naming the pigment would make a whole layer of
 * variation invisible, and the sheet would read as working.
 */

function renderLab(route = '/lab/insects') {
  return renderWithProviders(<InsectLabRoute />, { route });
}

/** Every trait line on the page. */
const traitLines = (): string[] =>
  screen
    .getAllByRole('figure')
    .map((figure) => figure.querySelector('p')?.textContent ?? '')
    .filter((line) => line !== '');

/** The drawings' accessible descriptions, which change when the seeds do. */
const descriptions = (container: HTMLElement): string[] =>
  [...container.querySelectorAll('desc')].map((node) => node.textContent);

afterEach(() => {
  delete document.documentElement.dataset.season;
  delete document.documentElement.dataset.themeReady;
  localStorage.clear();
});

describe('InsectLabRoute', () => {
  it('draws four seeds of every preset, in both orders', () => {
    renderLab();

    // Four presets per order, four seeds each.
    expect(screen.getAllByRole('figure')).toHaveLength(32);
  });

  describe('the trait line', () => {
    it('names the pigment each specimen was painted in', () => {
      renderLab();

      const lines = traitLines();

      expect(lines.length).toBeGreaterThan(0);

      for (const line of lines) {
        expect(line).toMatch(/ochre|russet|olive|slate grey|warm umber|chalky bone/);
      }
    });

    it('reports more than one pigment across the sheet', () => {
      // One pigment everywhere would mean the seed never reaches the choice —
      // exactly the failure the line exists to make visible.
      renderLab();

      const named = new Set(
        traitLines().flatMap(
          (line) => line.match(/ochre|russet|olive|slate grey|warm umber|chalky bone/g) ?? [],
        ),
      );

      expect(named.size).toBeGreaterThan(1);
    });

    it('names the pattern layers each moth carries', () => {
      renderLab();

      const moths = within(screen.getByRole('region', { name: /lepidoptera/i }));
      const lines = moths
        .getAllByRole('figure')
        .map((figure) => figure.querySelector('p')?.textContent ?? '');

      expect(lines.length).toBeGreaterThan(0);

      for (const line of lines) {
        expect(line).toMatch(/dusting|marginalBand|apexPatch|discalSpot|eyespot|plain/);
      }
    });

    it('reports more than one set of pattern layers across the moths', () => {
      renderLab();

      const moths = within(screen.getByRole('region', { name: /lepidoptera/i }));
      const layers = new Set(
        moths.getAllByRole('figure').map((figure) => {
          const line = figure.querySelector('p')?.textContent ?? '';

          return line.match(/dusting|marginalBand|apexPatch|discalSpot|eyespot/g)?.join() ?? '';
        }),
      );

      expect(layers.size).toBeGreaterThan(1);
    });

    it('reports the beetle hatching density, which has no other tell', () => {
      renderLab();

      const beetles = within(screen.getByRole('region', { name: /coleoptera/i }));

      for (const figure of beetles.getAllByRole('figure')) {
        expect(figure.querySelector('p')?.textContent).toMatch(/hatch \d/);
      }
    });
  });

  describe('reroll', () => {
    it('offers a reroll for each order', () => {
      renderLab();

      expect(screen.getAllByRole('link', { name: /reroll/i })).toHaveLength(2);
    });

    it('bumps that order round to a fresh set of four specimens', async () => {
      const user = userEvent.setup();
      const { container } = renderLab();

      const beetles = within(screen.getByRole('region', { name: /coleoptera/i }));
      const before = descriptions(container);

      await user.click(beetles.getByRole('link', { name: /reroll/i }));

      const after = descriptions(container);

      expect(after).toHaveLength(before.length);
      expect(after).not.toStrictEqual(before);
    });

    it('leaves the other order alone', async () => {
      const user = userEvent.setup();
      renderLab();

      const mothsBefore = within(screen.getByRole('region', { name: /lepidoptera/i }))
        .getAllByRole('figure')
        .map((figure) => figure.querySelector('desc')?.textContent ?? '');

      await user.click(
        within(screen.getByRole('region', { name: /coleoptera/i })).getByRole('link', {
          name: /reroll/i,
        }),
      );

      const mothsAfter = within(screen.getByRole('region', { name: /lepidoptera/i }))
        .getAllByRole('figure')
        .map((figure) => figure.querySelector('desc')?.textContent ?? '');

      // Judging one order means scrolling past the other; rerolling both at
      // once loses the specimen you were in the middle of looking at.
      expect(mothsAfter).toStrictEqual(mothsBefore);
    });

    it('keeps rerolling to new specimens rather than cycling back', async () => {
      const user = userEvent.setup();
      const { container } = renderLab();

      const rerollBeetles = async (): Promise<void> => {
        const beetles = within(screen.getByRole('region', { name: /coleoptera/i }));

        await user.click(beetles.getByRole('link', { name: /reroll/i }));
      };

      const seen = new Set([descriptions(container).join('|')]);

      for (let i = 0; i < 3; i += 1) {
        await rerollBeetles();
        seen.add(descriptions(container).join('|'));
      }

      expect(seen.size).toBe(4);
    });

    it('reads the round from the URL, so a sheet can be linked to', () => {
      const { container: first } = renderLab('/lab/insects?beetles=7');
      const { container: second } = renderLab('/lab/insects?beetles=7');

      expect(descriptions(second)).toStrictEqual(descriptions(first));
      expect(descriptions(first)).not.toStrictEqual(descriptions(renderLab().container));
    });

    it('ignores a round that is not a positive number', () => {
      const { container: nonsense } = renderLab('/lab/insects?beetles=banana');
      const { container: plain } = renderLab();

      expect(descriptions(nonsense)).toStrictEqual(descriptions(plain));
    });

    it('keeps the size setting when rerolling', async () => {
      const user = userEvent.setup();

      renderLab('/lab/insects?size=large');

      await user.click(
        within(screen.getByRole('region', { name: /coleoptera/i })).getByRole('link', {
          name: /reroll/i,
        }),
      );

      // The link back to the small view is the tell that large is still on.
      expect(screen.getByRole('link', { name: /view small/i })).toBeInTheDocument();
    });
  });
});
