import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

const photo = (name = 'inside.webp', source = 'hair') => ({
  name,
  mimeType: 'image/webp',
  buffer: readFileSync(`public/images/${source}.webp`),
});

async function openPhotoForm(page: Page, name: string) {
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await page
    .getByRole('button', { name: 'Make yourself at home', exact: true })
    .click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Your space’s name', { exact: true }).fill(name);
  await form.getByLabel('Your name', { exact: true }).fill('Photo Demo');
  await form
    .getByLabel('Neighbourhood', { exact: true })
    .fill('Old Strathcona');
  await form
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill(
      'An independent beauty studio with a welcoming space and thoughtful services.',
    );
  await form
    .getByLabel('Service name', { exact: true })
    .fill('Signature styling');
  await form.getByLabel('Price (CAD)', { exact: true }).fill('85');
  return form;
}

test('demo photos and the chosen cover survive reload and appear in the listing gallery', async ({
  page,
}) => {
  const name = 'Browser photo gallery';
  const form = await openPhotoForm(page, name);
  await form
    .getByLabel('Listing photos', { exact: true })
    .setInputFiles([photo(), photo('nails.webp', 'nails')]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(2);
  await form
    .getByRole('button', { name: 'Make nails.webp cover', exact: true })
    .click();
  await expect(
    form.getByTestId('listing-photo-preview').first().getByRole('img'),
  ).toHaveAttribute('alt', 'Preview of nails.webp');
  await form
    .getByRole('button', { name: 'Create my demo space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  const listing = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('airstethics:listings') ?? '[]')[0] as {
        image: string;
        images: string[];
      },
  );
  expect(listing.images).toHaveLength(2);
  expect(listing.image).toBe(listing.images[0]);
  expect(
    listing.images.every((url) =>
      /^data:image\/(?:webp|jpeg|png);base64,/.test(url),
    ),
  ).toBe(true);
  expect(listing.images.some((url) => url.startsWith('blob:'))).toBe(false);
  await page.reload();
  const card = page.getByTestId('listing-card').filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card.locator('.listing-image')).toHaveAttribute(
    'src',
    listing.images[0],
  );
  await card.getByRole('button', { name: `View ${name}`, exact: true }).click();
  const details = page.getByTestId('listing-details');
  await details
    .getByRole('button', { name: `Show photo 2 of ${name}`, exact: true })
    .click();
  await expect(
    details.locator('.listing-details-main-photo img'),
  ).toHaveAttribute('src', listing.images[1]);
  await details
    .getByRole('button', { name: 'Choose a service & time', exact: true })
    .click();
  const booking = page.getByRole('dialog');
  await booking.getByRole('button', { name: '9:00 AM', exact: true }).click();
  await booking.getByLabel('Your name', { exact: true }).fill('Photo Guest');
  await booking
    .getByLabel('Email address', { exact: true })
    .fill('photo-guest@example.com');
  await booking
    .getByRole('button', { name: 'Book my appointment', exact: true })
    .click();
  await expect(
    booking.getByRole('heading', { name: /all booked in/ }),
  ).toBeVisible();
  await booking
    .getByRole('button', { name: 'Keep exploring', exact: true })
    .click();
  await page.reload();
  const appointments = page.getByRole('button', {
    name: /^My appointments(?:\s*\d+)?$/,
  });
  if (!(await appointments.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await appointments.click();
  await expect(page.getByTestId('appointment-card')).toHaveCount(1);
  await expect(page.getByTestId('appointment-card')).toContainText(name);
});

test('removing all selected photos creates a sample-photo listing without retaining file previews', async ({
  page,
}) => {
  const name = 'Removed photo demo';
  const form = await openPhotoForm(page, name);
  await form
    .getByLabel('Listing photos', { exact: true })
    .setInputFiles([photo()]);
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(1);
  await form
    .getByRole('button', { name: 'Remove inside.webp', exact: true })
    .click();
  await expect(form.getByTestId('listing-photo-preview')).toHaveCount(0);
  await form
    .getByRole('button', { name: 'Create my demo space', exact: true })
    .click();
  await expect(form).toHaveCount(0);
  const images = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('airstethics:listings') ?? '[]')[0]
        .images as string[],
  );
  expect(images.every((url) => url.startsWith('/images/'))).toBe(true);
  await page.reload();
  await expect(
    page.getByTestId('listing-card').filter({ hasText: name }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});
