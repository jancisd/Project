import { expect, test, type Page } from '@playwright/test';

async function openListing(page: Page, name = 'Muse Hair House') {
  await page
    .getByTestId('listing-card')
    .filter({ hasText: name })
    .getByRole('button', { name: `View ${name}`, exact: true })
    .click();
  const details = page.getByRole('region', {
    name: `Details for ${name}`,
    exact: true,
  });
  await expect(details).toBeVisible();
  return details;
}

async function expectMapCentre(
  page: Page,
  latitude: number,
  longitude: number,
) {
  await expect
    .poll(async () => {
      const centre = await page
        .getByTestId('map-canvas')
        .getAttribute('data-center');
      if (!centre) return false;
      const [lat, lng] = centre.split(',').map(Number);
      return (
        Math.abs(lat - latitude) < 0.0003 && Math.abs(lng - longitude) < 0.0003
      );
    })
    .toBe(true);
  await expect
    .poll(async () =>
      Number(await page.getByTestId('map-canvas').getAttribute('data-zoom')),
    )
    .toBeGreaterThanOrEqual(14);
}

async function navigateSaved(page: Page) {
  const saved = page.getByRole('button', { name: /^Saved(?:\s*\d+)?$/ });
  if (!(await saved.isVisible())) {
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  }
  await saved.click();
}

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await expect(page.getByTestId('listing-card').first()).toBeVisible();
});

test('clicking a listing shows its full details and focused map together', async ({
  page,
}) => {
  const details = await openListing(page);
  const map = page.getByTestId('discover-map');
  await expectMapCentre(page, 53.518, -113.496);
  await expect(map).toBeInViewport();
  await expect(
    details.getByRole('heading', { name: 'Muse Hair House', exact: true }),
  ).toBeInViewport();
  await expect(details).toContainText('Signature cut & style');
  await expect(details).toContainText('Wash & blowout');
  await expect(details).toContainText('Claire Martin');
  await expect(details).toContainText('Old Strathcona');
  await expect(details).toContainText('CAD');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    map.getByRole('region', {
      name: 'Map preview for Muse Hair House',
      exact: true,
    }),
  ).toHaveCount(0);
  await expect(
    map.getByRole('button', {
      name: 'View Muse Hair House on map',
      exact: true,
    }),
  ).toHaveClass(/map-pin-active/);

  const bookingAction = details.getByRole('button', {
    name: 'Choose a service & time',
    exact: true,
  });
  await bookingAction.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(details).toBeVisible();
  await expect(map).toBeVisible();
  await expectMapCentre(page, 53.518, -113.496);
  await expect(bookingAction).toBeFocused();
});

test('saving stays on the results and a keyboard-opened listing returns focus on back', async ({
  page,
}) => {
  const first = page.getByTestId('listing-card').first();
  await first
    .getByRole('button', { name: 'Save Muse Hair House', exact: true })
    .click();
  await expect(page.getByTestId('listing-details')).toHaveCount(0);
  await expect(
    first.getByRole('button', { name: 'Unsave Muse Hair House', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');

  const trigger = first.getByRole('button', {
    name: 'View Muse Hair House',
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press('Enter');
  const details = page.getByTestId('listing-details');
  await expect(details).toBeVisible();
  await details
    .getByRole('button', { name: 'Back to results', exact: true })
    .click();
  await expect(details).toHaveCount(0);
  await expect(first).toBeVisible();
  await expect(trigger).toBeFocused();
  await expect(
    first.getByRole('button', { name: 'Unsave Muse Hair House', exact: true }),
  ).toBeVisible();
});

test('selecting another map pin updates the open details without opening a booking', async ({
  page,
}) => {
  await openListing(page);
  const map = page.getByTestId('discover-map');
  await expectMapCentre(page, 53.518, -113.496);
  // One level wider keeps a nearby Ritchie studio in view on mobile too.
  await map.getByRole('button', { name: 'Zoom out', exact: true }).click();
  await expect(page.getByTestId('map-canvas')).toHaveAttribute(
    'data-zoom',
    '13',
  );
  await map
    .getByRole('button', {
      name: 'View Sunday Beauty Room on map',
      exact: true,
    })
    .click();
  const details = page.getByRole('region', {
    name: 'Details for Sunday Beauty Room',
    exact: true,
  });
  await expect(details).toBeVisible();
  await expect(details).toContainText('Soft glam makeup');
  await expectMapCentre(page, 53.51, -113.477);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(
    map.getByRole('region', {
      name: 'Map preview for Sunday Beauty Room',
      exact: true,
    }),
  ).toHaveCount(0);
});

test('a saved listing opens with its location even when the previous search excluded it', async ({
  page,
}) => {
  await page
    .getByTestId('listing-card')
    .first()
    .getByRole('button', { name: 'Save Muse Hair House', exact: true })
    .click();
  await page.getByLabel('Location', { exact: true }).selectOption('Canmore');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await navigateSaved(page);
  const details = await openListing(page);
  await expectMapCentre(page, 53.518, -113.496);
  await expect(
    page.getByTestId('discover-map').getByRole('button', {
      name: 'View Muse Hair House on map',
      exact: true,
    }),
  ).toBeVisible();
  await details
    .getByRole('button', { name: 'Back to results', exact: true })
    .click();
  await expect(
    page.getByRole('heading', { name: 'Your little black book.', exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card')).toContainText(
    'Muse Hair House',
  );
});

test('the listing title and arrow open map details with no horizontal overflow', async ({
  page,
}) => {
  const card = page.getByTestId('listing-card').first();
  await card
    .getByRole('button', { name: 'Muse Hair House', exact: true })
    .click();
  await expect(page.getByTestId('listing-details')).toBeVisible();
  await expectMapCentre(page, 53.518, -113.496);
  await page
    .getByTestId('listing-details')
    .getByRole('button', { name: 'Back to results', exact: true })
    .click();
  await card
    .getByRole('button', { name: 'Explore Muse Hair House', exact: true })
    .click();
  await expect(page.getByTestId('listing-details')).toBeVisible();
  await expect(page.getByTestId('discover-map')).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
});
