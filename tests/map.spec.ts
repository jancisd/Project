import { expect, test, type Page } from '@playwright/test';
import { listings } from '../src/data';

async function openMap(page: Page) {
  if (
    await page
      .getByRole('button', { name: 'Show map', exact: true })
      .isVisible()
  ) {
    await page.getByRole('button', { name: 'Show map', exact: true }).click();
  }
  await expect(page.getByTestId('discover-map')).toBeVisible();
  await expect(page.getByTestId('map-canvas')).toHaveAttribute(
    'data-zoom',
    /\d+/,
  );
  return page.getByTestId('discover-map');
}

async function openDiscover(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('listing-card').first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  // External detail tiles may be unavailable. Keep requests deterministic while
  // still exercising the real Leaflet map and bundled geographic layers.
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
});

test('the world map remains usable when detailed map tiles are unavailable', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const countries = page.waitForResponse(
    (response) =>
      response.url().endsWith('/maps/world-countries.geojson') &&
      response.status() === 200,
  );
  await openDiscover(page);
  const map = await openMap(page);
  await countries;
  await expect(map.locator('.leaflet-pane svg').first()).toBeVisible();
  expect(await map.locator('.leaflet-pane svg path').count()).toBeGreaterThan(
    10,
  );
  await expect(
    map.getByText('Approximate demo locations', { exact: true }),
  ).toBeVisible();
  await expect(map.getByRole('link', { name: /OpenStreetMap/ })).toBeVisible();
  await expect(map.getByText(/Detailed map unavailable/)).toBeVisible();

  const canvas = page.getByTestId('map-canvas');
  const initialZoom = Number(await canvas.getAttribute('data-zoom'));
  await map.getByRole('button', { name: 'World view', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-zoom')))
    .toBeLessThan(initialZoom);
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-zoom')))
    .toBeLessThanOrEqual(3);
  await map.getByRole('button', { name: 'Show Alberta', exact: true }).click();
  await expect
    .poll(async () => Number(await canvas.getAttribute('data-zoom')))
    .toBeGreaterThan(3);
  await expect(map.getByTestId('map-cluster').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('a cluster opens real price pins and a keyboard-selected pin can be saved and booked', async ({
  page,
}) => {
  await openDiscover(page);
  const map = await openMap(page);
  await map
    .getByRole('button', { name: /Explore \d+ beauty places near Edmonton/ })
    .click();
  const pin = map.getByRole('button', {
    name: 'View Muse Hair House on map',
    exact: true,
  });
  await expect(pin).toBeVisible();
  await pin.focus();
  await page.keyboard.press('Enter');
  const preview = map.getByRole('region', {
    name: 'Map preview for Muse Hair House',
    exact: true,
  });
  await expect(preview).toBeVisible();
  await expect(preview).toContainText('CAD');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await preview
    .getByRole('button', { name: 'Save Muse Hair House', exact: true })
    .click();
  await expect(
    preview.getByRole('button', {
      name: 'Unsave Muse Hair House',
      exact: true,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await preview
    .getByRole('button', { name: 'View & book', exact: true })
    .click();
  const booking = page.getByRole('dialog');
  await expect(
    booking.getByRole('heading', { name: 'Muse Hair House', exact: true }),
  ).toBeVisible();
  await expect(
    booking.getByRole('button', { name: 'Book my appointment' }),
  ).toBeVisible();
  await booking.getByRole('button', { name: 'Close booking details' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem('airstethics:saved') || '[]'),
    ),
  ).toContain('muse-hair-house');
});

test('location and category filters keep list results and the map in sync', async ({
  page,
}) => {
  await openDiscover(page);
  await page.getByLabel('Location', { exact: true }).selectOption('Canmore');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  const cards = page.getByTestId('listing-card');
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toContainText('Canmore');
  const map = await openMap(page);
  await expect(map.getByTestId('map-price-marker')).toHaveCount(1);
  await expect(
    map.getByRole('button', {
      name: 'View Alpine Glow Studio on map',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    map.getByRole('button', {
      name: 'View Muse Hair House on map',
      exact: true,
    }),
  ).toHaveCount(0);

  await page.getByRole('button', { name: 'Hair', exact: true }).click();
  await expect(cards).toHaveCount(0);
  await expect(map.getByTestId('map-price-marker')).toHaveCount(0);
  await expect(map.getByTestId('map-cluster')).toHaveCount(0);
});

test('searching a map area narrows the cards and clearing the area restores results', async ({
  page,
}) => {
  await openDiscover(page);
  const cards = page.getByTestId('listing-card');
  const total = await cards.count();
  const map = await openMap(page);
  const initialZoom = Number(
    await page.getByTestId('map-canvas').getAttribute('data-zoom'),
  );
  await map
    .getByRole('button', { name: /Explore \d+ beauty places near Edmonton/ })
    .click();
  await expect
    .poll(async () =>
      Number(await page.getByTestId('map-canvas').getAttribute('data-zoom')),
    )
    .toBeGreaterThan(initialZoom);
  await map
    .getByRole('button', { name: 'Search this area', exact: true })
    .click();
  await expect.poll(async () => cards.count()).toBeGreaterThan(0);
  await expect.poll(async () => cards.count()).toBeLessThan(total);
  for (const card of await cards.all())
    await expect(card).toContainText('Edmonton');
  await map.getByRole('button', { name: /Clear (map )?area/i }).click();
  await expect(cards).toHaveCount(total);
});

test('list and map views switch without losing the active category or overflowing the viewport', async ({
  page,
}) => {
  await openDiscover(page);
  await page.getByRole('button', { name: 'Nails', exact: true }).click();
  const count = await page.getByTestId('listing-card').count();
  expect(count).toBeGreaterThan(0);
  await openMap(page);
  await page.getByRole('button', { name: 'Show list', exact: true }).click();
  await expect(page.getByTestId('discover-map')).not.toBeVisible();
  await expect(page.getByTestId('listing-card')).toHaveCount(count);
  await expect(
    page.getByRole('button', { name: 'Nails', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await openMap(page);
  const size = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.width);
});

test('a previously saved partner listing without coordinates still appears in its Alberta city', async ({
  page,
}) => {
  const legacyListing = {
    ...listings[0],
    id: 'legacy-beauty-room',
    name: 'Legacy Beauty Room',
    city: 'Calgary',
    neighborhood: 'Kensington',
  };
  await page.addInitScript((listing) => {
    localStorage.setItem('airstethics:listings', JSON.stringify([listing]));
  }, legacyListing);
  await openDiscover(page);
  const card = page
    .getByTestId('listing-card')
    .filter({ hasText: 'Legacy Beauty Room' });
  await expect(card).toBeVisible();
  await card
    .getByRole('button', {
      name: 'Locate Legacy Beauty Room on map',
      exact: true,
    })
    .click();
  const map = await openMap(page);
  await expect(
    map.getByRole('region', {
      name: 'Map preview for Legacy Beauty Room',
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const [latitude, longitude] = (await page
        .getByTestId('map-canvas')
        .getAttribute('data-center'))!
        .split(',')
        .map(Number);
      return (
        latitude > 50.9 &&
        latitude < 51.2 &&
        longitude > -114.3 &&
        longitude < -113.8
      );
    })
    .toBe(true);
});

test('studios at the same approximate location can each be selected without overlapping pins', async ({
  page,
}) => {
  const shared = ['One', 'Two'].map((suffix) => ({
    ...listings[0],
    id: `sharing-space-${suffix.toLowerCase()}`,
    name: `Sharing Space ${suffix}`,
    city: 'Edmonton',
    neighborhood: 'Downtown',
  }));
  await page.addInitScript((savedListings) => {
    localStorage.setItem('airstethics:listings', JSON.stringify(savedListings));
  }, shared);
  await openDiscover(page);
  await page.getByLabel('Search beauty experiences').fill('Sharing Space');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByTestId('listing-card')).toHaveCount(2);
  const map = await openMap(page);
  const cluster = map.getByRole('button', {
    name: 'Explore 2 beauty places near Edmonton',
    exact: true,
  });
  await cluster.click();
  const chooser = map.getByRole('region', {
    name: 'Studios at this location',
    exact: true,
  });
  await expect(chooser).toBeVisible();
  await expect(
    chooser.getByRole('button', {
      name: 'Preview Sharing Space One',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    chooser.getByRole('button', {
      name: 'Preview Sharing Space Two',
      exact: true,
    }),
  ).toBeVisible();
  await chooser
    .getByRole('button', { name: 'Preview Sharing Space Two', exact: true })
    .click();
  await expect(
    map.getByRole('region', {
      name: 'Map preview for Sharing Space Two',
      exact: true,
    }),
  ).toBeVisible();
  await map
    .getByRole('button', { name: 'Close map preview', exact: true })
    .click();
  await cluster.click();
  await chooser
    .getByRole('button', { name: 'Preview Sharing Space One', exact: true })
    .click();
  await expect(
    map.getByRole('region', {
      name: 'Map preview for Sharing Space One',
      exact: true,
    }),
  ).toBeVisible();
});
