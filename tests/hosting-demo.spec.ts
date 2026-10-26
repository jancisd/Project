import { expect, test, type Page } from '@playwright/test';
import { listings as samples } from '../src/data';

const space = {
  ...samples[0],
  id: 'local-33333333-3333-4333-8333-333333333333',
  name: 'My Browser Demo Studio',
  coordinates: { lat: 53.5175, lng: -113.4994 },
};

async function navigate(page: Page, name: string) {
  const button = page.getByRole('button', { name, exact: true });
  if (!(await button.isVisible()))
    await page
      .getByRole('button', { name: 'Open navigation', exact: true })
      .click();
  await button.click();
}

test('browser demo hosts manage only their local space and edits persist without creating another listing', async ({
  page,
}) => {
  await page.addInitScript((listing) => {
    if (!sessionStorage.getItem('hosting-demo-initialized')) {
      localStorage.setItem('airstethics:listings', JSON.stringify([listing]));
      sessionStorage.setItem('hosting-demo-initialized', 'yes');
    }
  }, space);
  await page.goto('/');
  await navigate(page, 'My business');
  await expect(page.getByTestId('host-listing-card')).toHaveCount(1);
  await expect(page.getByTestId('host-listing-card')).toContainText(space.name);
  await page
    .getByTestId('host-listing-card')
    .getByRole('button', { name: 'Edit space', exact: true })
    .click();
  const dialog = page.getByRole('dialog');
  await dialog
    .getByLabel('Your space’s name', { exact: true })
    .fill('Updated Browser Demo Studio');
  await dialog.getByLabel('Service 1 price (CAD)', { exact: true }).fill('110');
  await dialog
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId('host-listing-card')).toContainText(
    'Updated Browser Demo Studio',
  );
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('airstethics:listings') || '[]'),
  );
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(space.id);
  expect(saved[0].services[0].price).toBe(110);
  await page.reload();
  await navigate(page, 'My business');
  await expect(page.getByTestId('host-listing-card')).toHaveCount(1);
  await expect(page.getByTestId('host-listing-card')).toContainText(
    'Updated Browser Demo Studio',
  );
});
