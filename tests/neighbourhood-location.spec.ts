import { expect, test, type Locator, type Page } from '@playwright/test';

type StoredStudio = {
  id: string;
  name: string;
  city: string;
  neighborhood: string;
  coordinates: { lat: number; lng: number };
};

async function partnerForm(page: Page, name: string) {
  await page
    .getByRole('button', { name: 'Make yourself at home', exact: true })
    .click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Your space’s name', { exact: true }).fill(name);
  await form.getByLabel('Your name', { exact: true }).fill('Jordan Demo');
  await form
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill('A fictional neighbourhood studio with thoughtful beauty services.');
  await form
    .getByLabel('Service name', { exact: true })
    .fill('Signature demo styling');
  await form.getByLabel('Price (CAD)', { exact: true }).fill('85');
  return form;
}

async function enterNeighbourhood(form: Locator, city: string, name: string) {
  await form.getByLabel(/^City/).selectOption(city);
  await form.getByLabel('Neighbourhood', { exact: true }).fill(name);
}

async function createStudio(page: Page, form: Locator, name: string) {
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toHaveCount(0);
  const studio = await page.evaluate((studioName) => {
    const listings = JSON.parse(
      localStorage.getItem('airstethics:listings') || '[]',
    );
    return listings.find(
      (listing: { name: string }) => listing.name === studioName,
    );
  }, name);
  expect(studio).toBeDefined();
  return studio as StoredStudio;
}

async function savedStudioCount(page: Page) {
  return page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('airstethics:listings') || '[]').length,
  );
}

async function setManualPoint(
  form: Locator,
  latitude: number,
  longitude: number,
) {
  await form.getByLabel('Pin latitude', { exact: true }).fill(String(latitude));
  await form
    .getByLabel('Pin longitude', { exact: true })
    .fill(String(longitude));
  await form.getByRole('button', { name: 'Move pin', exact: true }).click();
}

test.beforeEach(async ({ page }) => {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await expect(page.getByTestId('listing-card').first()).toBeVisible();
});

test('the same neighbourhood name is pinned in its selected city rather than the city centre', async ({
  page,
}) => {
  let form = await partnerForm(page, 'Edmonton Parkdale Demo');
  await enterNeighbourhood(form, 'Edmonton', '  pArKdAlE  ');
  const edmonton = await createStudio(page, form, 'Edmonton Parkdale Demo');
  expect(edmonton.city).toBe('Edmonton');
  expect(edmonton.neighborhood).toBe('Parkdale');
  // Parkdale lies northeast of central Edmonton; these are its interior-point bounds.
  expect(edmonton.coordinates.lat).toBeGreaterThan(53.56);
  expect(edmonton.coordinates.lat).toBeLessThan(53.58);
  expect(edmonton.coordinates.lng).toBeGreaterThan(-113.49);
  expect(edmonton.coordinates.lng).toBeLessThan(-113.45);

  form = await partnerForm(page, 'Calgary Parkdale Demo');
  await enterNeighbourhood(form, 'Calgary', 'Parkdale');
  const calgary = await createStudio(page, form, 'Calgary Parkdale Demo');
  expect(calgary.city).toBe('Calgary');
  expect(calgary.neighborhood).toBe('Parkdale');
  // Calgary's Parkdale is west of downtown, not at Edmonton's namesake or either city centre.
  expect(calgary.coordinates.lat).toBeGreaterThan(51.05);
  expect(calgary.coordinates.lat).toBeLessThan(51.07);
  expect(calgary.coordinates.lng).toBeGreaterThan(-114.15);
  expect(calgary.coordinates.lng).toBeLessThan(-114.12);
  expect(
    Math.abs(edmonton.coordinates.lat - calgary.coordinates.lat),
  ).toBeGreaterThan(2);
});

test('an ambiguous area asks which neighbourhood before saving its canonical location', async ({
  page,
}) => {
  const form = await partnerForm(page, 'Kensington Choice Demo');
  await enterNeighbourhood(form, 'Calgary', 'Kensington');
  const hillhurst = form.getByRole('button', {
    name: 'Use Hillhurst, Calgary',
    exact: true,
  });
  const sunnyside = form.getByRole('button', {
    name: 'Use Sunnyside, Calgary',
    exact: true,
  });
  await expect(hillhurst).toBeVisible();
  await expect(sunnyside).toBeVisible();
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);
  await sunnyside.click();
  const studio = await createStudio(page, form, 'Kensington Choice Demo');
  expect(studio.neighborhood).toBe('Sunnyside');
  expect(studio.coordinates.lat).toBeGreaterThan(51.05);
  expect(studio.coordinates.lat).toBeLessThan(51.065);
  expect(studio.coordinates.lng).toBeGreaterThan(-114.085);
  expect(studio.coordinates.lng).toBeLessThan(-114.07);
});

test('an unknown neighbourhood needs an explicitly confirmed pin which survives reload and focuses discovery', async ({
  page,
}) => {
  const studioName = 'Manually Located Demo';
  const form = await partnerForm(page, studioName);
  await enterNeighbourhood(form, 'Edmonton', 'My New Local Area');
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);

  await form
    .getByRole('button', { name: 'Set location on map', exact: true })
    .click();
  await expect(form.getByTestId('location-picker-map')).toBeVisible();
  await expect(form.getByTestId('location-pin')).toHaveCount(0);
  await setManualPoint(form, 53.52, -113.54);
  await expect(form.getByTestId('location-pin')).toHaveAttribute(
    'data-latitude',
    '53.52',
  );
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);
  await form.getByRole('button', { name: 'Use this pin', exact: true }).click();
  const studio = await createStudio(page, form, studioName);
  expect(studio.coordinates).toEqual({ lat: 53.52, lng: -113.54 });

  await page.reload();
  await page
    .getByTestId('listing-card')
    .filter({ hasText: studioName })
    .getByRole('button', { name: `View ${studioName}`, exact: true })
    .click();
  await expect(
    page.getByRole('region', {
      name: `Details for ${studioName}`,
      exact: true,
    }),
  ).toBeVisible();
  await expect
    .poll(async () => {
      const center = await page
        .getByTestId('map-canvas')
        .getAttribute('data-center');
      if (!center) return false;
      const [lat, lng] = center.split(',').map(Number);
      return Math.abs(lat - 53.52) < 0.0003 && Math.abs(lng + 113.54) < 0.0003;
    })
    .toBe(true);
});

test('changing city invalidates an earlier manual confirmation and resolves the new city afresh', async ({
  page,
}) => {
  const form = await partnerForm(page, 'Changed City Demo');
  await enterNeighbourhood(form, 'Edmonton', 'My Unlisted Local Area');
  await form
    .getByRole('button', { name: 'Set location on map', exact: true })
    .click();
  await setManualPoint(form, 53.52, -113.54);
  await form.getByRole('button', { name: 'Use this pin', exact: true }).click();
  await form.getByLabel(/^City/).selectOption('Calgary');
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);
  await form.getByLabel('Neighbourhood', { exact: true }).fill('Parkdale');
  const studio = await createStudio(page, form, 'Changed City Demo');
  expect(studio.city).toBe('Calgary');
  expect(studio.coordinates.lat).toBeLessThan(51.07);
  expect(studio.coordinates.lng).toBeLessThan(-114.12);
});

test('a manual pin outside the selected city is rejected and editing the neighbourhood invalidates a confirmed pin', async ({
  page,
}) => {
  const form = await partnerForm(page, 'Checked Manual Location Demo');
  await enterNeighbourhood(form, 'Edmonton', 'An Unlisted Neighbourhood');
  await form
    .getByRole('button', { name: 'Set location on map', exact: true })
    .click();
  await setManualPoint(form, 51.04, -114.07);
  await expect(form.getByTestId('location-pin')).toHaveCount(0);
  await expect(
    form.getByTestId('location-picker').getByRole('alert'),
  ).toContainText(/Edmonton|selected city/i);
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);

  await setManualPoint(form, 53.52, -113.54);
  await form.getByRole('button', { name: 'Use this pin', exact: true }).click();
  await form.getByLabel('Pin latitude', { exact: true }).fill('53.53');
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);
  await form.getByRole('button', { name: 'Move pin', exact: true }).click();
  await expect(form.getByTestId('location-pin')).toHaveAttribute(
    'data-latitude',
    '53.53',
  );
  await form.getByRole('button', { name: 'Use this pin', exact: true }).click();
  await form
    .getByLabel('Neighbourhood', { exact: true })
    .fill('A Different Unlisted Neighbourhood');
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  await expect(form).toBeVisible();
  expect(await savedStudioCount(page)).toBe(0);
});

test('a normalized Indigenous neighbourhood alias keeps its real neighbourhood pin', async ({
  page,
}) => {
  const form = await partnerForm(page, 'Alias Location Demo');
  await enterNeighbourhood(form, 'Edmonton', '  WÎHKWÊNTÔWIN  ');
  const studio = await createStudio(page, form, 'Alias Location Demo');
  expect(studio.city).toBe('Edmonton');
  expect(studio.coordinates.lat).toBeGreaterThan(53.53);
  expect(studio.coordinates.lat).toBeLessThan(53.555);
  expect(studio.coordinates.lng).toBeGreaterThan(-113.54);
  expect(studio.coordinates.lng).toBeLessThan(-113.51);
});
