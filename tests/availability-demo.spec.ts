import { expect, test, type Page } from '@playwright/test';
import { listings as samples } from '../src/data';

const listing = {
  ...samples[0],
  id: 'local-33333333-3333-4333-8333-333333333333',
  name: 'My Available Demo Studio',
  coordinates: { lat: 53.5175, lng: -113.4994 },
};
const weekdays = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

function dayIn(days: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

async function navigate(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!(await button.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await button.click();
}

test('demo availability persists and customer choices exclude breaks, buffers, blocked dates, and closed weekdays', async ({
  page,
}) => {
  await page.addInitScript((space) => {
    if (!sessionStorage.getItem('availability-demo-seeded')) {
      localStorage.setItem('airstethics:listings', JSON.stringify([space]));
      sessionStorage.setItem('availability-demo-seeded', 'yes');
    }
  }, listing);
  await page.route('https://tile.openstreetmap.org/**', (route) =>
    route.abort(),
  );
  await page.goto('/');
  await navigate(page, 'My business');
  await page
    .getByRole('button', { name: 'Manage availability', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  const date = dayIn(1);
  const day = weekdays[new Date(`${date}T12:00:00Z`).getUTCDay()];
  const dayOff = dayIn(3);
  const dayOffName = weekdays[new Date(`${dayOff}T12:00:00Z`).getUTCDay()];
  await dialog.getByLabel(`${day} opening time`, { exact: true }).fill('10:15');
  await dialog.getByLabel(`${day} closing time`, { exact: true }).fill('16:15');
  await dialog
    .getByRole('button', { name: `Add ${day} break`, exact: true })
    .click();
  await dialog
    .getByLabel(`${day} break 1 start`, { exact: true })
    .fill('12:15');
  await dialog.getByLabel(`${day} break 1 end`, { exact: true }).fill('13:15');
  await dialog.getByLabel(`${dayOffName} open`, { exact: true }).uncheck();
  await dialog
    .getByLabel('Time after each appointment', { exact: true })
    .fill('15');
  await dialog
    .getByLabel('Booking start intervals', { exact: true })
    .selectOption('30');
  const blockedDate = dayIn(2);
  await dialog.getByLabel('Block a date', { exact: true }).fill(blockedDate);
  await dialog
    .getByRole('button', { name: 'Add blocked date', exact: true })
    .click();
  await dialog
    .getByRole('button', { name: 'Save availability', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.reload();
  await navigate(page, 'My business');
  await page
    .getByRole('button', { name: 'Manage availability', exact: true })
    .click();
  await expect(
    dialog.getByLabel(`${day} opening time`, { exact: true }),
  ).toHaveValue('10:15');
  await expect(
    dialog.getByLabel(`${dayOffName} open`, { exact: true }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole('button', { name: `Unblock ${blockedDate}`, exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Close availability', exact: true })
    .click();
  await page.getByRole('button', { name: 'View listing', exact: true }).click();
  await page
    .getByTestId('listing-details')
    .getByRole('button', { name: 'Choose a service & time', exact: true })
    .click();
  const booking = page.getByRole('dialog');
  await booking.getByLabel('Your day', { exact: true }).fill(date);
  await expect(
    booking.getByRole('button', { name: '10:15 AM', exact: true }),
  ).toBeEnabled();
  await expect(
    booking.getByRole('button', { name: '9:00 AM', exact: true }),
  ).toHaveCount(0);
  await expect(
    booking.getByRole('button', { name: '12:15 PM', exact: true }),
  ).toHaveCount(0);
  await expect(
    booking.getByRole('button', { name: '3:15 PM', exact: true }),
  ).toHaveCount(0);
  await booking.getByLabel('Your day', { exact: true }).fill(blockedDate);
  await expect(
    booking.getByText(/No available times on this day/i),
  ).toBeVisible();
  await booking.getByLabel('Your day', { exact: true }).fill(dayOff);
  await expect(
    booking.getByText(/No available times on this day/i),
  ).toBeVisible();
  await expect(
    booking.getByRole('button', { name: 'Book my appointment', exact: true }),
  ).toBeDisabled();
  const size = await booking.evaluate((element) => ({
    viewport: innerWidth,
    content: element.scrollWidth,
  }));
  expect(size.content).toBeLessThanOrEqual(size.viewport);
});
