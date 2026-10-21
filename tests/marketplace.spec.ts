import { expect, test, type Page } from '@playwright/test';

async function navigate(page: Page, destination: 'Saved' | 'My appointments') {
  const pattern =
    destination === 'Saved'
      ? /^Saved(?:\s*\d+)?$/
      : /^My appointments(?:\s*\d+)?$/;
  const button = page.getByRole('button', { name: pattern });
  if (!(await button.isVisible())) {
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  }
  await button.click();
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByTestId('listing-card').first()).toBeVisible();
});

test('category tabs filter real listings and restore all experiences', async ({
  page,
}) => {
  const cards = page.getByTestId('listing-card');
  const allCount = await cards.count();
  expect(allCount).toBeGreaterThan(1);

  await page.getByRole('button', { name: 'Hair', exact: true }).click();
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThan(allCount);
  for (const card of await cards.all())
    await expect(card).toContainText('Hair');

  await page.getByRole('button', { name: 'Nails', exact: true }).click();
  await expect(cards.first()).toBeVisible();
  for (const card of await cards.all())
    await expect(card).toContainText('Nails');

  await page
    .getByRole('button', { name: 'All experiences', exact: true })
    .click();
  await expect(cards).toHaveCount(allCount);
});

test('location and service searches filter listings and recover from an empty result', async ({
  page,
}) => {
  const cards = page.getByTestId('listing-card');
  const allCount = await cards.count();
  await page.getByLabel('Location', { exact: true }).selectOption('Edmonton');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(cards.first()).toBeVisible();
  expect(await cards.count()).toBeLessThan(allCount);
  for (const card of await cards.all())
    await expect(card).toContainText('Edmonton');

  await page
    .getByLabel('Search beauty experiences')
    .fill('no-such-beauty-service-9927');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect(cards).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .first()
    .click();
  await expect(cards).toHaveCount(allCount);
});

test('saved places persist after a reload and can be removed', async ({
  page,
}) => {
  const firstCard = page.getByTestId('listing-card').first();
  const saveButton = firstCard.getByRole('button', { name: /^Save / });
  const listingName = (await saveButton.getAttribute('aria-label'))!.replace(
    /^Save /,
    '',
  );
  await saveButton.click();
  await navigate(page, 'Saved');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await expect(page.getByTestId('listing-card').first()).toContainText(
    listingName,
  );

  await page.reload();
  await navigate(page, 'Saved');
  await expect(page.getByTestId('listing-card')).toHaveCount(1);
  await page
    .getByRole('button', { name: `Unsave ${listingName}`, exact: true })
    .click();
  await expect(page.getByTestId('listing-card')).toHaveCount(0);
});

test('an appointment is saved, reserves its slot, and can be cancelled', async ({
  page,
}) => {
  const firstCard = page.getByTestId('listing-card').first();
  const listingName = (await firstCard
    .getByRole('button', { name: /^Save / })
    .getAttribute('aria-label'))!.replace(/^Save /, '');
  await firstCard.getByRole('button', { name: /^View / }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole('button', { name: 'Book my appointment' }),
  ).toBeDisabled();
  const bookingDate = await dialog.getByLabel('Your day').inputValue();
  await dialog.getByRole('button', { name: '9:00 AM', exact: true }).click();
  await dialog.getByLabel('Your name', { exact: true }).fill('Taylor Example');
  await dialog
    .getByLabel('Email address', { exact: true })
    .fill('taylor@example.com');
  await dialog.getByRole('button', { name: 'Book my appointment' }).click();
  await expect(
    dialog.getByRole('heading', { name: /all booked in/ }),
  ).toBeVisible();
  await dialog.getByRole('button', { name: 'Keep exploring' }).click();

  // The stored appointment must actually reserve its slot in subsequent visits.
  await page
    .getByTestId('listing-card')
    .filter({ hasText: listingName })
    .getByRole('button', { name: /^View / })
    .click();
  await expect(dialog.getByLabel('Your day')).toHaveValue(bookingDate);
  await expect(
    dialog.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toBeDisabled();
  await dialog.getByRole('button', { name: 'Close booking details' }).click();

  await navigate(page, 'My appointments');
  const appointment = page.getByTestId('appointment-card');
  await expect(appointment).toHaveCount(1);
  await expect(appointment).toContainText(listingName);
  await expect(appointment).toContainText('Confirmed');

  await page.reload();
  await navigate(page, 'My appointments');
  await expect(appointment).toHaveCount(1);
  await appointment
    .getByRole('button', { name: 'Cancel appointment', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Yes, cancel appointment', exact: true })
    .click();
  await expect(appointment).toContainText('Cancelled');
  await expect(
    appointment.getByRole('button', {
      name: 'Cancel appointment',
      exact: true,
    }),
  ).toHaveCount(0);
});

test('booking dialogs close with Escape and return focus to the listing', async ({
  page,
}) => {
  const open = page
    .getByTestId('listing-card')
    .first()
    .getByRole('button', { name: /^View / });
  await open.click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('header.site-header')).toHaveJSProperty(
    'inert',
    true,
  );
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('header.site-header')).toHaveJSProperty(
    'inert',
    false,
  );
  await expect(open).toBeFocused();
});

test('price filters and price sorting match the listed service prices', async ({
  page,
}) => {
  const cards = page.getByTestId('listing-card');
  await page.getByRole('button', { name: 'Filters', exact: true }).click();
  const filters = page.getByRole('dialog');
  const range = filters.getByLabel('Starting price', { exact: true });
  await range.focus();
  await page.keyboard.press('Home');
  for (let step = 0; step < 5; step += 1)
    await page.keyboard.press('ArrowRight');
  await expect(range).toHaveValue('50');
  await filters.getByRole('button', { name: 'Show experiences' }).click();
  await expect(cards.first()).toBeVisible();
  const prices = () =>
    cards.evaluateAll((elements) =>
      elements.map((card) => Number(card.getAttribute('data-starting-price'))),
    );
  expect((await prices()).every((price) => price > 0 && price <= 50)).toBe(
    true,
  );

  await page
    .getByLabel('Sort experiences', { exact: true })
    .selectOption('low');
  const ascending = await prices();
  expect(ascending).toEqual([...ascending].sort((left, right) => left - right));
  await page
    .getByLabel('Sort experiences', { exact: true })
    .selectOption('high');
  const descending = await prices();
  expect(descending).toEqual(
    [...descending].sort((left, right) => right - left),
  );
});

test('a partner can create a persistent demo studio and book its service', async ({
  page,
}) => {
  const studioName = 'Prairie Demo Studio';
  await page
    .getByRole('button', { name: 'Make yourself at home', exact: true })
    .click();
  const form = page.getByRole('dialog');
  await form.getByLabel('Your space’s name', { exact: true }).fill(studioName);
  await form.getByLabel('Your name', { exact: true }).fill('Jordan Demo');
  await form.getByLabel(/^Your specialty/).selectOption('Nails');
  await form.getByLabel(/^City/).selectOption('Canmore');
  await form.getByLabel('Neighbourhood', { exact: true }).fill('Town Centre');
  await form
    .getByLabel('Tell us a little about your space', { exact: true })
    .fill('A welcoming fictional studio for thoughtful, unhurried nail care.');
  await form
    .getByLabel('Service name', { exact: true })
    .fill('Signature demo manicure');
  // Any-price discovery must also include services above the filter slider's range.
  await form.getByLabel('Price (CAD)', { exact: true }).fill('350');
  await form.getByLabel(/^Duration/).selectOption('45');
  await form.getByRole('button', { name: 'Create my demo space' }).click();
  const studio = page
    .getByTestId('listing-card')
    .filter({ hasText: studioName });
  await expect(studio).toHaveCount(1);
  await expect(studio).toContainText('$350');

  await page.reload();
  await expect(studio).toHaveCount(1);
  await studio
    .getByRole('button', { name: `View ${studioName}`, exact: true })
    .click();
  const booking = page.getByRole('dialog');
  await expect(booking.getByRole('radio')).toHaveCount(1);
  await expect(booking).toContainText('Signature demo manicure');
  await booking.getByRole('button', { name: '9:00 AM', exact: true }).click();
  await booking.getByLabel('Your name', { exact: true }).fill('Taylor Example');
  await booking
    .getByLabel('Email address', { exact: true })
    .fill('taylor@example.com');
  await booking.getByRole('button', { name: 'Book my appointment' }).click();
  await expect(
    booking.getByRole('heading', { name: /all booked in/ }),
  ).toBeVisible();
  await booking.getByRole('button', { name: 'Keep exploring' }).click();
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toContainText(studioName);
  await expect(page.getByTestId('appointment-card')).toContainText('$350');
});

test('malformed saved listings and invalid appointment dates recover without a crash', async ({
  page,
}) => {
  const initialCount = await page.getByTestId('listing-card').count();
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.evaluate(() => {
    localStorage.setItem(
      'airstethics:listings',
      JSON.stringify([
        {
          id: 'corrupted-listing',
          name: 'Incomplete stored studio',
          image: '/images/hair.webp',
          category: 'Hair',
          city: 'Edmonton',
          neighborhood: 'Downtown',
          description:
            'This malformed record deliberately lacks a professional and rating.',
          services: [
            { id: 'test-cut', name: 'Haircut', price: 60, duration: 60 },
          ],
        },
      ]),
    );
    localStorage.setItem(
      'airstethics:bookings',
      JSON.stringify([
        {
          id: 'corrupted-booking',
          listingId: 'test',
          listingName: 'Invalid-date studio',
          listingImage: '/images/hair.webp',
          city: 'Edmonton',
          serviceName: 'Haircut',
          date: '2026-13-40',
          time: '09:00',
          duration: 60,
          price: 60,
          guestName: 'Demo Guest',
          guestEmail: 'demo@example.com',
          createdAt: new Date().toISOString(),
          status: 'confirmed',
        },
      ]),
    );
  });
  await page.reload();
  await expect(page.getByTestId('listing-card')).toHaveCount(initialCount);
  await navigate(page, 'My appointments');
  await expect(page.getByTestId('appointment-card')).toHaveCount(0);
  await expect(
    page.getByRole('heading', { name: 'Your next good day starts here.' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('the layout fits the viewport without horizontal scrolling', async ({
  page,
}) => {
  const sizes = await page.evaluate(() => ({
    content: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.viewport);
  await expect(
    page.getByRole('button', { name: 'Search', exact: true }),
  ).toBeVisible();
});
